"""Orchestrates a trial run: collect (Bright Data or fixture) -> validate/normalise -> dedupe -> store -> classify."""
import threading
from typing import Any, Callable, Dict, List, Optional

from backend.app.social_trial import brightdata, fixtures, store
from backend.app.social_trial.brightdata import BrightDataError, MAX_POSTS_PER_RUN
from backend.app.social_trial.classifier import classify
from backend.app.social_trial.credentials import redact

SOURCES = ("brightdata", "fixture")
_locks: Dict[str, threading.Lock] = {}
_locks_guard = threading.Lock()


def _lock(platform: str) -> threading.Lock:
    with _locks_guard:
        return _locks.setdefault(platform, threading.Lock())


def clamp_limit(limit: int) -> int:
    return max(1, min(int(limit or MAX_POSTS_PER_RUN), MAX_POSTS_PER_RUN))


def dry_run(platform: str, target_url: str, limit: int, source: str, classify_posts: bool) -> Dict[str, Any]:
    """Shows what would happen. Performs NO network calls to Bright Data/Gemini and NO database writes."""
    target_url = brightdata.validate_target_url(platform, target_url)
    limit = clamp_limit(limit)
    plan: Dict[str, Any] = {"dry_run": True, "source": source, "platform": platform, "limit": limit,
                            "gemini_called": False, "bright_data_called": False, "persisted": False}
    if source == "brightdata":
        plan["request"] = brightdata.build_request(platform, target_url, limit)
    else:
        raw = fixtures.fixture_records(platform, target_url)
        normalised = [brightdata.normalize(platform, r) for r in raw]
        valid = [p for p in normalised if p]
        plan["fixture_records"] = len(raw)
        plan["valid_records"] = len(valid)
        plan["would_skip"] = len(raw) - len(valid)
        plan["sample"] = [{k: p[k] for k in ("platform_post_id", "text", "published_at")} for p in valid[:3]]
    plan["would_classify"] = classify_posts
    return plan


def start_run(platform: str, target_url: str, limit: int, source: str, classify_posts: bool = True,
              background: bool = True) -> Dict[str, Any]:
    """Validate, create the run row, and execute. Raises ValueError for bad input, RuntimeError if already running."""
    if source not in SOURCES:
        raise ValueError(f"source must be one of {SOURCES}")
    target_url = brightdata.validate_target_url(platform, target_url)
    limit = clamp_limit(limit)
    store.ensure_schema()
    if store.active_run_for(platform):
        raise RuntimeError(f"A {platform} run is already in progress.")
    run_id = store.create_run(platform, target_url, source, classify_posts)
    args = (run_id, platform, target_url, limit, source, classify_posts)
    if background:
        threading.Thread(target=execute_run, args=args, daemon=True, name=f"social-trial-{run_id}").start()
    else:
        execute_run(*args)
    return store.get_run(run_id)


def execute_run(run_id: str, platform: str, target_url: str, limit: int, source: str, classify_posts: bool,
                session: Any = None, classify_fn: Callable[..., Dict[str, Any]] = classify) -> None:
    lock = _lock(platform)
    if not lock.acquire(blocking=False):
        store.update_run(run_id, status="failed", completed_at=store.now_iso(), error_message="Another run holds the platform lock.")
        return
    try:
        try:
            if source == "fixture":
                raw_records = fixtures.fixture_records(platform, target_url)[: limit + 2]
            else:
                kwargs = {"session": session} if session is not None else {}
                snapshot_id, raw_records = brightdata.collect(
                    platform, target_url, limit,
                    on_status=lambda k, v: store.update_run(run_id, **{k: v}), **kwargs)
        except BrightDataError as exc:
            store.update_run(run_id, status="failed", completed_at=store.now_iso(),
                             error_message=f"[{exc.category}] {exc}")
            return
        except Exception as exc:  # never leave a run stuck
            store.update_run(run_id, status="failed", completed_at=store.now_iso(),
                             error_message=redact(f"[provider] Unexpected {type(exc).__name__}: {str(exc)[:200]}"))
            return

        if not raw_records:
            store.update_run(run_id, status="failed", completed_at=store.now_iso(),
                             error_message="[empty] The provider returned no records for this target "
                                           "(private/unknown account, or nothing public to collect).")
            return

        inserted_ids: List[str] = []
        duplicates = skipped = 0
        stored = 0
        for raw in raw_records:
            post = brightdata.normalize(platform, raw)
            if not post:
                skipped += 1
                continue
            if stored >= limit:
                skipped += 1
                continue
            try:
                pid = store.insert_post(post, run_id, source)
            except Exception as exc:
                skipped += 1
                store.update_run(run_id, error_message=redact(f"Database error on one post: {type(exc).__name__}"))
                continue
            if pid is None:
                duplicates += 1
            else:
                inserted_ids.append(pid)
                stored += 1
        store.update_run(run_id, discovered=len(raw_records), inserted=len(inserted_ids),
                         duplicates=duplicates, skipped=skipped,
                         status="classifying" if classify_posts and inserted_ids else "completed")

        classified = errors = 0
        if classify_posts:
            for pid in inserted_ids:
                post_row = store.get_post(pid)
                result = classify_fn(post_row.get("text") or "")
                store.insert_classification(pid, result)
                if result["status"] == "ok":
                    classified += 1
                elif result["status"] == "error":
                    errors += 1
            final_error = None
            if errors and not classified:
                final_error = "All Gemini classifications failed; see each post for the error."
            store.update_run(run_id, status="completed", completed_at=store.now_iso(), classified=classified,
                             classify_errors=errors, **({"error_message": final_error} if final_error else {}))
        else:
            store.update_run(run_id, completed_at=store.now_iso())
    finally:
        lock.release()


class ReviewedPostError(RuntimeError):
    """Raised when a re-run would supersede a human Accept/Reject decision and `force` was not given."""


def classify_existing(post_id: str, classify_fn: Callable[..., Dict[str, Any]] = classify, force: bool = False) -> Dict[str, Any]:
    """Re-run Gemini on one stored post. Adds a NEW classification row; earlier ones (and their review decisions) are kept.

    A post whose latest classification was Accepted/Rejected is protected: the re-run only happens with force=True,
    and the new suggestion starts as 'needs_review' (a human decision is never silently carried onto a different result).
    """
    post = store.get_post(post_id)
    if not post:
        raise LookupError("Post not found.")
    latest = store.latest_classification(post_id)
    was_reviewed = bool(latest) and latest["review_status"] in ("accepted", "rejected")
    if was_reviewed and not force:
        raise ReviewedPostError(f"This post's classification was already {latest['review_status']}. "
                                "Re-running Gemini will replace it on screen (the earlier decision stays in history).")
    result = classify_fn(post.get("text") or "")
    if was_reviewed and result.get("status") == "ok":
        result = {**result, "review_status": "needs_review"}
    store.insert_classification(post_id, result)
    return result


# ---- Instagram discovery (profiles + hashtags) ---------------------------------------------------------------
import json as _json

from backend.app.social_trial import relevance

MAX_PROFILES_PER_RUN = 5
MAX_HASHTAGS_PER_RUN = 3
DISCOVERY_MODES = ("profiles", "hashtags", "both")


def _pick_sources(mode: str) -> List[Dict[str, Any]]:
    if mode not in DISCOVERY_MODES:
        raise ValueError(f"sources must be one of {DISCOVERY_MODES}")
    items = [i for i in store.list_discovery_items() if i["is_enabled"] and i["platform"] == "instagram"]
    out: List[Dict[str, Any]] = []
    if mode in ("profiles", "both"):
        out += [i for i in items if i["kind"] == "profile"][:MAX_PROFILES_PER_RUN]
    if mode in ("hashtags", "both"):
        out += [i for i in items if i["kind"] == "hashtag"][:MAX_HASHTAGS_PER_RUN]
    return out


def discovery_dry_run(mode: str, source: str, classify_posts: bool = True) -> Dict[str, Any]:
    """Shows exactly what a discovery run would do. No Bright Data/Gemini calls and no database writes."""
    picked = _pick_sources(mode)
    plan: Dict[str, Any] = {"dry_run": True, "source": source, "mode": mode, "gemini_called": False,
                            "bright_data_called": False, "persisted": False, "would_classify": classify_posts, "sources": []}
    for it in picked:
        entry: Dict[str, Any] = {"kind": it["kind"], "value": it["value"]}
        if source == "brightdata":
            entry["request"] = (brightdata.build_request("instagram", f"https://www.instagram.com/{it['value']}/", 10)
                                if it["kind"] == "profile" else brightdata.build_hashtag_request(it["value"], 10))
            entry["estimated_credits_max"] = 1 if it["kind"] == "profile" else 10
        else:
            raw = fixtures.fixture_discovery_records(it["kind"], it["value"])
            posts = [brightdata.normalize("instagram", r) for r in raw]
            entry["fixture_records"] = len(raw)
            entry["stage_a_pass"] = sum(1 for p in posts if p and relevance.candidate_filter(p["text"], p["hashtags"])[0])
        plan["sources"].append(entry)
    plan["limits"] = {"max_profiles": MAX_PROFILES_PER_RUN, "max_hashtags": MAX_HASHTAGS_PER_RUN, "posts_per_source": 10}
    return plan


def start_discovery_run(mode: str, source: str, classify_posts: bool = True, background: bool = True) -> Dict[str, Any]:
    if source not in SOURCES:
        raise ValueError(f"source must be one of {SOURCES}")
    picked = _pick_sources(mode)
    if not picked:
        raise ValueError("No enabled discovery items for this mode. Add a hashtag or profile first.")
    store.ensure_schema()
    if store.active_run_for("instagram"):
        raise RuntimeError("An instagram run is already in progress.")
    run_id = store.create_run("instagram", f"discovery:{mode}", source, classify_posts)
    args = (run_id, picked, source, classify_posts)
    if background:
        threading.Thread(target=execute_discovery, args=args, daemon=True, name=f"social-discovery-{run_id}").start()
    else:
        execute_discovery(*args)
    return store.get_run(run_id)


def _ingest(run_id: str, raw_records: List[Dict[str, Any]], discovery_source: str, source: str, cap: int) -> Dict[str, Any]:
    """Normalise, Stage-A filter, dedupe and store one source's records. Returns counts and ids needing Gemini."""
    counts: Dict[str, Any] = {"found": len(raw_records), "inserted": 0, "duplicates": 0, "skipped": 0, "stage_a_dropped": 0}
    to_classify: List[str] = []
    dropped_ids: List[str] = []
    for raw in raw_records:
        post = brightdata.normalize("instagram", raw)
        if not post or counts["inserted"] >= cap:
            counts["skipped"] += 1
            continue
        passed, _reasons = relevance.candidate_filter(post["text"], post["hashtags"])
        post["discovery_source"] = discovery_source
        post["stage_a"] = "pass" if passed else "fail"
        try:
            pid = store.insert_post(post, run_id, source)
        except Exception:
            counts["skipped"] += 1
            continue
        if pid is None:
            counts["duplicates"] += 1
            continue
        counts["inserted"] += 1
        if passed:
            to_classify.append(pid)
        else:
            counts["stage_a_dropped"] += 1
            dropped_ids.append(pid)
    for pid in dropped_ids:
        store.insert_classification(pid, {"model": "stage-a-filter", "prompt_version": "stage-a-v1", "status": "skipped",
                                          "error": "Filtered out before Gemini: no Tamil Nadu or political signal.",
                                          "review_status": "unreviewed"})
    counts["_to_classify"] = to_classify
    return counts


def execute_discovery(run_id: str, picked: List[Dict[str, Any]], source: str, classify_posts: bool,
                      session: Any = None, classify_fn: Callable[..., Dict[str, Any]] = classify) -> None:
    lock = _lock("instagram")
    if not lock.acquire(blocking=False):
        store.update_run(run_id, status="failed", completed_at=store.now_iso(), error_message="Another run holds the platform lock.")
        return
    try:
        results: List[Dict[str, Any]] = []
        totals = {"discovered": 0, "inserted": 0, "duplicates": 0, "skipped": 0}
        all_ids: List[str] = []
        kw = {"session": session} if session is not None else {}
        for it in picked:
            label = f"{it['kind']}:{it['value']}"
            entry: Dict[str, Any] = {"source": label, "found": 0, "inserted": 0, "duplicates": 0, "stage_a_dropped": 0, "error": None}
            try:
                if source == "fixture":
                    raw = fixtures.fixture_discovery_records(it["kind"], it["value"])
                elif it["kind"] == "profile":
                    _, raw = brightdata.collect("instagram", f"https://www.instagram.com/{it['value']}/", 10, **kw)
                else:
                    raw = brightdata.discover_hashtag(it["value"], 10, **kw)
                if not raw:
                    entry["error"] = "[empty] No records returned for this source."
                else:
                    c = _ingest(run_id, raw, label, source, 10)
                    all_ids += c.pop("_to_classify")
                    for k in ("found", "inserted", "duplicates", "stage_a_dropped"):
                        entry[k] = c[k]
                    totals["discovered"] += c["found"]
                    totals["inserted"] += c["inserted"]
                    totals["duplicates"] += c["duplicates"]
                    totals["skipped"] += c["skipped"]
            except BrightDataError as exc:
                entry["error"] = f"[{exc.category}] {exc}"
            except Exception as exc:
                entry["error"] = redact(f"[provider] Unexpected {type(exc).__name__}: {str(exc)[:200]}")
            results.append(entry)
            store.update_run(run_id, sources_json=_json.dumps(results, ensure_ascii=False), **totals)

        if all(r["error"] for r in results):
            store.update_run(run_id, status="failed", completed_at=store.now_iso(),
                             error_message="; ".join(f"{r['source']} {r['error']}" for r in results)[:900])
            return
        classified = errors = 0
        if classify_posts and all_ids:
            store.update_run(run_id, status="classifying")
            for pid in all_ids:
                result = classify_fn(store.get_post(pid).get("text") or "")
                store.insert_classification(pid, result)
                classified += result["status"] == "ok"
                errors += result["status"] == "error"
        partial = [r for r in results if r["error"]]
        note = ("Some sources failed: " + "; ".join(f"{r['source']} {r['error']}" for r in partial))[:900] if partial else None
        store.update_run(run_id, status="completed", completed_at=store.now_iso(), classified=classified,
                         classify_errors=errors, error_message=note)
    finally:
        lock.release()
