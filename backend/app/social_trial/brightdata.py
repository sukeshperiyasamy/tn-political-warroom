"""Bright Data Web Scraper API client (async trigger -> progress -> snapshot) and per-platform normalisation."""
import json
import re
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Dict, List, Optional, Tuple

import requests
from dateutil import parser as dateparser

from backend.app.social_trial.credentials import brightdata_api_key, redact

BASE = "https://api.brightdata.com"
MAX_POSTS_PER_RUN = 10
POLL_INTERVAL_S = 6
POLL_TIMEOUT_S = 600

def expand_instagram_profiles(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Turn Instagram profile records into post-shaped records. Private profiles and error rows yield nothing."""
    out: List[Dict[str, Any]] = []
    for row in rows:
        if not isinstance(row, dict) or row.get("error") or row.get("is_private"):
            continue
        handle = row.get("account") or row.get("profile_name")
        for post in row.get("posts") or []:
            if not isinstance(post, dict):
                continue
            out.append({"post_id": post.get("id"), "url": post.get("url"), "user_posted": handle,
                        "description": post.get("caption") or "", "date_posted": post.get("datetime"),
                        "hashtags": post.get("post_hashtags"), "content_type": post.get("content_type")})
    return out


# Dataset ids were discovered from this account's GET /datasets/list.
PLATFORMS: Dict[str, Dict[str, Any]] = {
    "instagram": {
        # The "Instagram - Posts" discovery scraper returned zero records for every public profile we tried, and
        # "Instagram - Reels" hit Instagram rate limits. The Profiles scraper reliably returns the ~12 most recent
        # public posts embedded in the profile record, so we collect the profile and expand its posts.
        "dataset_id": "gd_l1vikfch901nx3by4",
        "label": "Instagram - Profiles (recent posts embedded in profile)",
        "params": {},
        "host": r"(^|\.)instagram\.com$",
        "input": lambda url, n: {"url": url},
        "expand": lambda rows: expand_instagram_profiles(rows),
    },
    "facebook": {
        "dataset_id": "gd_lkaxegm826bjpoo9m5",
        "label": "Facebook - Pages Posts by Profile URL",
        "params": {},
        "host": r"(^|\.)facebook\.com$",
        "input": lambda url, n: {"url": url, "num_of_posts": n},
    },
    "x": {
        "dataset_id": "gd_lwxkxvnf1cynvib9co",
        "label": "X (formerly Twitter) - Posts (by profile URL)",
        "params": {"type": "discover_new", "discover_by": "profile_url"},
        "host": r"(^|\.)(x|twitter)\.com$",
        "input": lambda url, n: {"url": url},
    },
}


class BrightDataError(RuntimeError):
    """Provider failure. `category` is one of: auth, rate_limit, unsupported, bad_request, provider, timeout, empty."""

    def __init__(self, message: str, category: str = "provider", status_code: Optional[int] = None):
        super().__init__(redact(message))
        self.category = category
        self.status_code = status_code


def validate_target_url(platform: str, url: str) -> str:
    if platform not in PLATFORMS:
        raise ValueError(f"Unsupported platform '{platform}'. Supported: {', '.join(PLATFORMS)}.")
    from urllib.parse import urlparse
    parsed = urlparse(url.strip())
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise ValueError("Target must be a full public profile URL starting with https://")
    if not re.search(PLATFORMS[platform]["host"], parsed.hostname or ""):
        raise ValueError(f"URL host '{parsed.hostname}' is not a {platform} domain.")
    return url.strip()


def build_request(platform: str, target_url: str, limit: int) -> Dict[str, Any]:
    """The exact request (without credentials) that would be sent. Used for dry-run display and for the real call."""
    cfg = PLATFORMS[platform]
    n = max(1, min(int(limit), MAX_POSTS_PER_RUN))
    return {
        "method": "POST",
        "url": f"{BASE}/datasets/v3/trigger",
        "params": {"dataset_id": cfg["dataset_id"], "format": "json", "include_errors": "true",
                   "limit_per_input": n, **cfg["params"]},
        "body": {"input": [cfg["input"](target_url, n)]},
    }


def _headers() -> Dict[str, str]:
    return {"Authorization": f"Bearer {brightdata_api_key()}", "Content-Type": "application/json"}


def _raise_for(resp: requests.Response, what: str) -> None:
    if resp.status_code < 400:
        return
    detail = redact(resp.text[:300].replace("\n", " "))
    if resp.status_code in (401, 403):
        raise BrightDataError(f"{what}: access denied (HTTP {resp.status_code}). {detail}", "auth", resp.status_code)
    if resp.status_code == 429:
        raise BrightDataError(f"{what}: rate limited (HTTP 429). {detail}", "rate_limit", resp.status_code)
    if "not active" in detail.lower() or "suspended" in detail.lower():
        raise BrightDataError(f"{what}: Bright Data account is not active (HTTP {resp.status_code}). {detail} "
                              "Activate the account / add billing or a payment method in the Bright Data control panel.",
                              "account_inactive", resp.status_code)
    if resp.status_code in (400, 404, 422):
        raise BrightDataError(f"{what}: rejected (HTTP {resp.status_code}). {detail}", "bad_request", resp.status_code)
    raise BrightDataError(f"{what}: provider error (HTTP {resp.status_code}). {detail}", "provider", resp.status_code)


def trigger(platform: str, target_url: str, limit: int, session: Any = requests) -> str:
    req = build_request(platform, target_url, limit)
    try:
        resp = session.post(req["url"], params=req["params"], json=req["body"], headers=_headers(), timeout=60)
    except requests.RequestException as exc:
        raise BrightDataError(f"Trigger request failed: {type(exc).__name__}", "provider")
    _raise_for(resp, "Trigger")
    try:
        snapshot_id = resp.json().get("snapshot_id")
    except ValueError:
        snapshot_id = None
    if not snapshot_id:
        raise BrightDataError("Trigger returned no snapshot_id (unexpected response).", "provider")
    return snapshot_id


def wait_for_snapshot(snapshot_id: str, session: Any = requests, sleep: Callable[[float], None] = time.sleep,
                      timeout_s: int = POLL_TIMEOUT_S, interval_s: float = POLL_INTERVAL_S) -> None:
    deadline = time.monotonic() + timeout_s
    while True:
        try:
            resp = session.get(f"{BASE}/datasets/v3/progress/{snapshot_id}", headers=_headers(), timeout=30)
        except requests.RequestException as exc:
            raise BrightDataError(f"Progress request failed: {type(exc).__name__}", "provider")
        _raise_for(resp, "Progress")
        status = (resp.json() or {}).get("status")
        if status == "ready":
            return
        if status == "failed":
            raise BrightDataError("Bright Data reported the collection job as failed.", "provider")
        if time.monotonic() > deadline:
            raise BrightDataError(f"Timed out after {timeout_s}s waiting for snapshot (last status: {status}).", "timeout")
        sleep(interval_s)


def download(snapshot_id: str, session: Any = requests) -> List[Dict[str, Any]]:
    try:
        resp = session.get(f"{BASE}/datasets/v3/snapshot/{snapshot_id}", params={"format": "json"},
                           headers=_headers(), timeout=120)
    except requests.RequestException as exc:
        raise BrightDataError(f"Snapshot download failed: {type(exc).__name__}", "provider")
    if resp.status_code == 202:
        raise BrightDataError("Snapshot not ready yet (HTTP 202).", "provider", 202)
    _raise_for(resp, "Snapshot")
    try:
        data = resp.json()
    except ValueError:
        # some deliveries come back as NDJSON
        try:
            data = [json.loads(line) for line in resp.text.splitlines() if line.strip()]
        except ValueError:
            raise BrightDataError("Snapshot was not valid JSON.", "provider")
    if isinstance(data, dict):
        data = [data]
    if not isinstance(data, list):
        raise BrightDataError("Snapshot has an unexpected shape.", "provider")
    return data


# ---- normalisation -------------------------------------------------------
def _int(v: Any) -> Optional[int]:
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return int(v)
    if isinstance(v, str) and v.strip().replace(",", "").isdigit():
        return int(v.replace(",", ""))
    if isinstance(v, dict):  # e.g. {"num": 12, "type": "Like"}
        return _int(v.get("num") or v.get("count"))
    return None


def parse_timestamp(value: Any) -> Optional[str]:
    """ISO-8601 UTC string, or None if missing/unparseable/implausible (future-dated)."""
    if not value:
        return None
    try:
        dt = dateparser.parse(str(value))
    except (ValueError, OverflowError, TypeError):
        return None
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    dt = dt.astimezone(timezone.utc)
    if dt > datetime.now(timezone.utc).replace(microsecond=0) + timedelta(days=1):
        return None
    return dt.isoformat()


def _tags(value: Any, text: str) -> List[str]:
    tags = [str(t).lstrip("#") for t in value] if isinstance(value, list) else []
    if not tags:
        tags = [t for t in re.findall(r"#(\w+)", text or "", flags=re.UNICODE)]
    seen, out = set(), []
    for t in tags:
        if t and t.lower() not in seen:
            seen.add(t.lower())
            out.append(t)
    return out


def normalize(platform: str, raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Map a provider record to the common post shape. Returns None for error rows / records with no usable identity."""
    if not isinstance(raw, dict) or raw.get("error") or raw.get("error_code"):
        return None
    if platform == "instagram":
        pid, text = raw.get("post_id") or raw.get("shortcode") or raw.get("pk"), raw.get("description") or ""
        post = {"author_handle": raw.get("user_posted"), "author_name": raw.get("user_posted"),
                "likes": _int(raw.get("likes")), "comments": _int(raw.get("num_comments")), "shares": None,
                "views": _int(raw.get("video_view_count") or raw.get("video_play_count")), "ts": raw.get("date_posted")}
    elif platform == "facebook":
        pid, text = raw.get("post_id"), raw.get("content") or ""
        post = {"author_handle": raw.get("profile_handle") or raw.get("user_username_raw"),
                "author_name": raw.get("page_name") or raw.get("user_username_raw"),
                "likes": _int(raw.get("num_likes_type") or raw.get("likes")), "comments": _int(raw.get("num_comments")),
                "shares": _int(raw.get("num_shares")), "views": _int(raw.get("video_view_count")), "ts": raw.get("date_posted")}
    elif platform == "x":
        pid, text = raw.get("id"), raw.get("description") or ""
        post = {"author_handle": raw.get("user_posted"), "author_name": raw.get("name") or raw.get("user_posted"),
                "likes": _int(raw.get("likes")), "comments": _int(raw.get("replies")), "shares": _int(raw.get("reposts")),
                "views": _int(raw.get("views")), "ts": raw.get("date_posted")}
    else:
        return None
    url = raw.get("url")
    if not pid and url:
        pid = url.rstrip("/").rsplit("/", 1)[-1]
    if not pid:
        return None
    text = str(text)
    return {
        "platform": platform, "platform_post_id": str(pid), "post_url": url, "text": text,
        "author_handle": post["author_handle"], "author_name": post["author_name"],
        "published_at": parse_timestamp(post["ts"]),
        "likes": post["likes"], "comments": post["comments"], "shares": post["shares"], "views": post["views"],
        "hashtags": _tags(raw.get("hashtags"), text),
        "raw_json": json.dumps(raw, ensure_ascii=False, default=str)[:20000],
    }


def collect(platform: str, target_url: str, limit: int, on_status: Optional[Callable[[str, str], None]] = None,
            session: Any = requests) -> Tuple[str, List[Dict[str, Any]]]:
    """Trigger, wait and download. Returns (snapshot_id, raw_records), truncated to the per-run cap."""
    snapshot_id = trigger(platform, target_url, limit, session)
    if on_status:
        on_status("provider_job_id", snapshot_id)
    wait_for_snapshot(snapshot_id, session)
    records = download(snapshot_id, session)
    expand = PLATFORMS[platform].get("expand")
    if expand:
        records = expand(records)
    cap = max(1, min(int(limit), MAX_POSTS_PER_RUN))
    return snapshot_id, records[:cap]


# ---- hashtag discovery (EXPERIMENTAL) -----------------------------------------------------------------------
# Uses Bright Data's dataset "filter" API over the pre-collected Instagram Posts dataset. Unlike the scrapers, snapshots
# can take many minutes to build. This route was accepted by the API on this account but had NOT returned data when it
# was first probed, so it is reported as experimental in the UI and failures are surfaced per source.
IG_POSTS_DATASET = "gd_lk5ns7kz21pck8jpis"
HASHTAG_TIMEOUT_S = 1200
HASHTAG_POLL_S = 20


def build_hashtag_request(tag: str, limit: int) -> Dict[str, Any]:
    n = max(1, min(int(limit), MAX_POSTS_PER_RUN))
    return {"method": "POST", "url": f"{BASE}/datasets/filter",
            "body": {"dataset_id": IG_POSTS_DATASET, "records_limit": n,
                     "filter": {"name": "hashtags", "operator": "includes", "value": tag}}}


def discover_hashtag(tag: str, limit: int, session: Any = requests, sleep: Callable[[float], None] = time.sleep,
                     timeout_s: int = HASHTAG_TIMEOUT_S, interval_s: float = HASHTAG_POLL_S) -> List[Dict[str, Any]]:
    """Returns raw Instagram post records whose hashtags include `tag` (capped). Raises BrightDataError on any failure."""
    req = build_hashtag_request(tag, limit)
    try:
        resp = session.post(req["url"], json=req["body"], headers=_headers(), timeout=60)
    except requests.RequestException as exc:
        raise BrightDataError(f"Hashtag filter request failed: {type(exc).__name__}", "provider")
    _raise_for(resp, "Hashtag filter")
    try:
        snap = resp.json().get("snapshot_id")
    except ValueError:
        snap = None
    if not snap:
        raise BrightDataError("Hashtag filter returned no snapshot_id (unexpected response).", "provider")
    deadline = time.monotonic() + timeout_s
    while True:
        try:
            r = session.get(f"{BASE}/datasets/snapshots/{snap}", headers=_headers(), timeout=30)
        except requests.RequestException as exc:
            raise BrightDataError(f"Hashtag snapshot status failed: {type(exc).__name__}", "provider")
        _raise_for(r, "Hashtag snapshot status")
        status = (r.json() or {}).get("status")
        if status == "ready":
            break
        if status == "failed":
            raise BrightDataError(f"Hashtag snapshot {snap} failed.", "provider")
        if time.monotonic() > deadline:
            raise BrightDataError(f"Hashtag snapshot {snap} was still '{status}' after {timeout_s // 60} min; try again later.", "timeout")
        sleep(interval_s)
    try:
        d = session.get(f"{BASE}/datasets/snapshots/{snap}/download", params={"format": "json"}, headers=_headers(), timeout=120)
    except requests.RequestException as exc:
        raise BrightDataError(f"Hashtag snapshot download failed: {type(exc).__name__}", "provider")
    _raise_for(d, "Hashtag snapshot download")
    try:
        rows = d.json()
    except ValueError:
        raise BrightDataError("Hashtag snapshot was not valid JSON.", "provider")
    if isinstance(rows, dict):
        rows = [rows]
    if not isinstance(rows, list):
        raise BrightDataError("Hashtag snapshot has an unexpected shape.", "provider")
    return rows[: max(1, min(int(limit), MAX_POSTS_PER_RUN))]
