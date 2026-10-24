"""SQLite storage for the social trial. Separate tables: raw posts never mix with AI classifications or RSS articles."""
import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from backend.app.data.migrations import DB_PATH, get_connection

SCHEMA = """
CREATE TABLE IF NOT EXISTS social_trial_targets (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL UNIQUE,
    target_url TEXT NOT NULL,
    display_name TEXT,
    post_limit INTEGER NOT NULL DEFAULT 10,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS social_trial_runs (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL,
    target_url TEXT NOT NULL,
    source TEXT NOT NULL,
    classify INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL,
    provider_job_id TEXT,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    discovered INTEGER DEFAULT 0,
    inserted INTEGER DEFAULT 0,
    duplicates INTEGER DEFAULT 0,
    skipped INTEGER DEFAULT 0,
    classified INTEGER DEFAULT 0,
    classify_errors INTEGER DEFAULT 0,
    error_message TEXT
);
CREATE TABLE IF NOT EXISTS social_trial_posts (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL,
    platform_post_id TEXT NOT NULL,
    run_id TEXT NOT NULL,
    source TEXT NOT NULL,
    post_url TEXT,
    author_handle TEXT,
    author_name TEXT,
    text TEXT,
    published_at TEXT,
    collected_at TEXT NOT NULL,
    likes INTEGER, comments INTEGER, shares INTEGER, views INTEGER,
    hashtags TEXT NOT NULL DEFAULT '[]',
    content_hash TEXT NOT NULL,
    raw_json TEXT,
    UNIQUE(platform, platform_post_id)
);
CREATE INDEX IF NOT EXISTS idx_stp_platform ON social_trial_posts(platform, collected_at);
CREATE INDEX IF NOT EXISTS idx_stp_hash ON social_trial_posts(platform, content_hash);
CREATE TABLE IF NOT EXISTS social_trial_classifications (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    model TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    is_political INTEGER,
    party_codes TEXT NOT NULL DEFAULT '[]',
    leader_names TEXT NOT NULL DEFAULT '[]',
    topics TEXT NOT NULL DEFAULT '[]',
    primary_subject TEXT,
    confidence REAL,
    rationale TEXT,
    rule_based TEXT,
    agrees_with_rules INTEGER,
    review_status TEXT NOT NULL DEFAULT 'unreviewed',
    status TEXT NOT NULL,
    error TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_stc_post ON social_trial_classifications(post_id, created_at);
CREATE TABLE IF NOT EXISTS social_trial_discovery_items (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL DEFAULT 'instagram',
    kind TEXT NOT NULL,              -- 'hashtag' | 'profile'
    value TEXT NOT NULL,             -- hashtag without '#', or the public profile handle
    label TEXT,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    UNIQUE(platform, kind, value)
);
"""

# Additive columns (guarded), so existing databases upgrade in place without touching existing rows.
ADDITIVE_COLUMNS = {
    "social_trial_posts": [("discovery_source", "TEXT"), ("stage_a", "TEXT NOT NULL DEFAULT 'pass'")],
    "social_trial_classifications": [("category", "TEXT"), ("districts", "TEXT"), ("topic_label", "TEXT"),
                                     ("english_summary", "TEXT")],
    "social_trial_runs": [("sources_json", "TEXT")],
}

DEFAULT_HASHTAGS = ["TamilNaduPolitics", "DMK", "AIADMK", "TVK", "NTK", "BJP4TN", "TamilNadu"]

_schema_ready_for = set()


def _p(db_path: Optional[str]) -> str:
    """Resolve the DB path at call time so tests can point DB_PATH at a temp file."""
    return db_path or DB_PATH


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def ensure_schema(db_path: Optional[str] = None) -> None:
    db_path = _p(db_path)
    if db_path in _schema_ready_for:
        return
    with get_connection(_p(db_path)) as conn:
        conn.executescript(SCHEMA)
        for table, cols in ADDITIVE_COLUMNS.items():
            existing = {r[1] for r in conn.execute(f"PRAGMA table_info({table})")}
            for name, decl in cols:
                if name not in existing:
                    conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {decl}")
        if conn.execute("SELECT COUNT(*) FROM social_trial_discovery_items").fetchone()[0] == 0:
            for tag in DEFAULT_HASHTAGS:   # starter list; fully editable in the UI
                conn.execute("INSERT OR IGNORE INTO social_trial_discovery_items (id, platform, kind, value, label, is_enabled, created_at) VALUES (?,?,?,?,?,?,?)",
                             (new_id("sdi"), "instagram", "hashtag", tag, None, 1, now_iso()))
        conn.commit()
    _schema_ready_for.add(db_path)


def content_hash(text: str) -> str:
    norm = " ".join((text or "").lower().split())
    return hashlib.sha256(norm.encode("utf-8")).hexdigest()[:32]


def _rows(cur) -> List[Dict[str, Any]]:
    return [dict(r) for r in cur.fetchall()]


# ---- targets -------------------------------------------------------------
def list_targets(db_path: Optional[str] = None) -> List[Dict[str, Any]]:
    ensure_schema(_p(db_path))
    with get_connection(_p(db_path)) as conn:
        return _rows(conn.execute("SELECT * FROM social_trial_targets ORDER BY platform"))


def upsert_target(platform: str, target_url: str, display_name: Optional[str], post_limit: int,
                  is_enabled: bool = True, db_path: Optional[str] = None) -> Dict[str, Any]:
    ensure_schema(_p(db_path))
    ts = now_iso()
    with get_connection(_p(db_path)) as conn:
        existing = conn.execute("SELECT id FROM social_trial_targets WHERE platform=?", (platform,)).fetchone()
        if existing:
            conn.execute(
                "UPDATE social_trial_targets SET target_url=?, display_name=?, post_limit=?, is_enabled=?, updated_at=? WHERE platform=?",
                (target_url, display_name, post_limit, int(is_enabled), ts, platform))
        else:
            conn.execute(
                "INSERT INTO social_trial_targets (id, platform, target_url, display_name, post_limit, is_enabled, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)",
                (new_id("stt"), platform, target_url, display_name, post_limit, int(is_enabled), ts, ts))
        conn.commit()
        return dict(conn.execute("SELECT * FROM social_trial_targets WHERE platform=?", (platform,)).fetchone())


def get_target(platform: str, db_path: Optional[str] = None) -> Optional[Dict[str, Any]]:
    ensure_schema(_p(db_path))
    with get_connection(_p(db_path)) as conn:
        row = conn.execute("SELECT * FROM social_trial_targets WHERE platform=?", (platform,)).fetchone()
        return dict(row) if row else None


# ---- runs ----------------------------------------------------------------
def create_run(platform: str, target_url: str, source: str, classify: bool, db_path: Optional[str] = None) -> str:
    ensure_schema(_p(db_path))
    run_id = new_id("str")
    with get_connection(_p(db_path)) as conn:
        conn.execute(
            "INSERT INTO social_trial_runs (id, platform, target_url, source, classify, status, started_at) VALUES (?,?,?,?,?,?,?)",
            (run_id, platform, target_url, source, int(classify), "collecting", now_iso()))
        conn.commit()
    return run_id


def update_run(run_id: str, db_path: Optional[str] = None, **fields: Any) -> None:
    if not fields:
        return
    cols = ", ".join(f"{k}=?" for k in fields)
    with get_connection(_p(db_path)) as conn:
        conn.execute(f"UPDATE social_trial_runs SET {cols} WHERE id=?", (*fields.values(), run_id))
        conn.commit()


def get_run(run_id: str, db_path: Optional[str] = None) -> Optional[Dict[str, Any]]:
    ensure_schema(_p(db_path))
    with get_connection(_p(db_path)) as conn:
        row = conn.execute("SELECT * FROM social_trial_runs WHERE id=?", (run_id,)).fetchone()
        return dict(row) if row else None


def list_runs(limit: int = 25, db_path: Optional[str] = None) -> List[Dict[str, Any]]:
    ensure_schema(_p(db_path))
    with get_connection(_p(db_path)) as conn:
        return _rows(conn.execute("SELECT * FROM social_trial_runs ORDER BY started_at DESC LIMIT ?", (limit,)))


def active_run_for(platform: str, db_path: Optional[str] = None) -> Optional[Dict[str, Any]]:
    ensure_schema(_p(db_path))
    with get_connection(_p(db_path)) as conn:
        row = conn.execute(
            "SELECT * FROM social_trial_runs WHERE platform=? AND status IN ('collecting','classifying') ORDER BY started_at DESC LIMIT 1",
            (platform,)).fetchone()
        return dict(row) if row else None


def fail_stale_runs(db_path: Optional[str] = None) -> None:
    """Runs left active by a crashed/restarted server can never finish; mark them failed."""
    ensure_schema(_p(db_path))
    with get_connection(_p(db_path)) as conn:
        conn.execute(
            "UPDATE social_trial_runs SET status='failed', completed_at=?, error_message='Interrupted by server restart.' WHERE status IN ('collecting','classifying')",
            (now_iso(),))
        conn.commit()


# ---- posts ---------------------------------------------------------------
def insert_post(post: Dict[str, Any], run_id: str, source: str, db_path: Optional[str] = None) -> Optional[str]:
    """Insert a normalised post. Returns the new id, or None if it is a duplicate (id or identical content)."""
    ensure_schema(_p(db_path))
    text = post.get("text") or ""
    chash = content_hash(text)
    with get_connection(_p(db_path)) as conn:
        dup = conn.execute(
            "SELECT id FROM social_trial_posts WHERE platform=? AND (platform_post_id=? OR (content_hash=? AND ?<>''))",
            (post["platform"], post["platform_post_id"], chash, text)).fetchone()
        if dup:
            return None
        pid = new_id("stp")
        conn.execute(
            """INSERT INTO social_trial_posts (id, platform, platform_post_id, run_id, source, post_url, author_handle,
               author_name, text, published_at, collected_at, likes, comments, shares, views, hashtags, content_hash, raw_json,
               discovery_source, stage_a)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (pid, post["platform"], post["platform_post_id"], run_id, source, post.get("post_url"),
             post.get("author_handle"), post.get("author_name"), text, post.get("published_at"),
             now_iso(), post.get("likes"), post.get("comments"), post.get("shares"), post.get("views"),
             json.dumps(post.get("hashtags") or [], ensure_ascii=False), chash, post.get("raw_json"),
             post.get("discovery_source"), post.get("stage_a", "pass")))
        conn.commit()
        return pid


def get_post(post_id: str, db_path: Optional[str] = None) -> Optional[Dict[str, Any]]:
    ensure_schema(_p(db_path))
    with get_connection(_p(db_path)) as conn:
        row = conn.execute("SELECT * FROM social_trial_posts WHERE id=?", (post_id,)).fetchone()
        return dict(row) if row else None


def list_posts(platform: Optional[str] = None, limit: int = 50, db_path: Optional[str] = None) -> List[Dict[str, Any]]:
    """Posts with their LATEST classification joined in (raw_json omitted)."""
    ensure_schema(_p(db_path))
    where, params = ("WHERE p.platform=?", [platform]) if platform else ("", [])
    sql = f"""
        SELECT p.id, p.platform, p.platform_post_id, p.run_id, p.source, p.post_url, p.author_handle, p.author_name,
               p.text, p.published_at, p.collected_at, p.likes, p.comments, p.shares, p.views, p.hashtags,
               c.id AS cls_id, c.model, c.prompt_version, c.is_political, c.party_codes, c.leader_names, c.topics,
               c.primary_subject, c.confidence, c.rationale, c.rule_based, c.agrees_with_rules, c.review_status,
               c.status AS cls_status, c.error AS cls_error, c.created_at AS cls_created_at,
               p.discovery_source, p.stage_a, c.category, c.districts, c.topic_label, c.english_summary,
               json_extract(p.raw_json, '$.content_type') AS content_type,
               (SELECT review_status FROM social_trial_classifications o
                 WHERE o.post_id = p.id AND o.id <> c.id ORDER BY o.created_at DESC LIMIT 1) AS prev_review_status
        FROM social_trial_posts p
        LEFT JOIN social_trial_classifications c ON c.id = (
            SELECT id FROM social_trial_classifications WHERE post_id = p.id ORDER BY created_at DESC LIMIT 1)
        {where} ORDER BY p.collected_at DESC LIMIT ?"""
    with get_connection(_p(db_path)) as conn:
        return _rows(conn.execute(sql, (*params, limit)))


# ---- classifications -----------------------------------------------------
def insert_classification(post_id: str, result: Dict[str, Any], db_path: Optional[str] = None) -> str:
    ensure_schema(_p(db_path))
    cid = new_id("stc")
    with get_connection(_p(db_path)) as conn:
        conn.execute(
            """INSERT INTO social_trial_classifications (id, post_id, model, prompt_version, is_political, party_codes,
               leader_names, topics, primary_subject, confidence, rationale, rule_based, agrees_with_rules,
               review_status, status, error, created_at, category, districts, topic_label, english_summary)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (cid, post_id, result["model"], result["prompt_version"],
             None if result.get("is_political") is None else int(result["is_political"]),
             json.dumps(result.get("party_codes", []), ensure_ascii=False),
             json.dumps(result.get("leader_names", []), ensure_ascii=False),
             json.dumps(result.get("topics", []), ensure_ascii=False),
             result.get("primary_subject"), result.get("confidence"), result.get("rationale"),
             json.dumps(result.get("rule_based", {}), ensure_ascii=False),
             None if result.get("agrees_with_rules") is None else int(result["agrees_with_rules"]),
             result.get("review_status", "unreviewed"), result["status"], result.get("error"), now_iso(),
             result.get("category"), json.dumps(result.get("districts", []), ensure_ascii=False),
             result.get("topic_label"), result.get("english_summary")))
        conn.commit()
    return cid


def latest_classification(post_id: str, db_path: Optional[str] = None) -> Optional[Dict[str, Any]]:
    ensure_schema(_p(db_path))
    with get_connection(_p(db_path)) as conn:
        row = conn.execute(
            "SELECT * FROM social_trial_classifications WHERE post_id=? ORDER BY created_at DESC LIMIT 1", (post_id,)).fetchone()
        return dict(row) if row else None


def set_review_status(classification_id: str, review_status: str, db_path: Optional[str] = None) -> bool:
    ensure_schema(_p(db_path))
    with get_connection(_p(db_path)) as conn:
        cur = conn.execute("UPDATE social_trial_classifications SET review_status=? WHERE id=?", (review_status, classification_id))
        conn.commit()
        return cur.rowcount > 0


# ---- discovery list ------------------------------------------------------
import re as _re

MAX_DISCOVERY_ITEMS = 50
_HASHTAG_RE = _re.compile(r"^[\w஀-௿]{2,60}$")
_HANDLE_RE = _re.compile(r"^[A-Za-z0-9._]{1,30}$")


def normalize_discovery_value(kind: str, raw: str) -> str:
    """Validate/normalise a hashtag ('#DMK' -> 'DMK') or Instagram profile (handle or URL -> handle)."""
    raw = (raw or "").strip()
    if kind == "hashtag":
        value = raw.lstrip("#").strip()
        if not _HASHTAG_RE.match(value):
            raise ValueError("Hashtag must be 2-60 letters/digits/underscores (Tamil letters allowed), without spaces.")
        return value
    if kind == "profile":
        m = _re.match(r"^https?://(?:www\.)?instagram\.com/([A-Za-z0-9._]{1,30})/?(?:\?.*)?$", raw)
        value = m.group(1) if m else raw.lstrip("@")
        if not _HANDLE_RE.match(value) or value.lower() in ("p", "reel", "reels", "explore", "stories"):
            raise ValueError("Profile must be a public Instagram handle or profile URL (not a post link).")
        return value
    raise ValueError("kind must be 'hashtag' or 'profile'.")


def list_discovery_items(db_path: Optional[str] = None) -> List[Dict[str, Any]]:
    ensure_schema(_p(db_path))
    with get_connection(_p(db_path)) as conn:
        return _rows(conn.execute("SELECT * FROM social_trial_discovery_items ORDER BY kind, value COLLATE NOCASE"))


def add_discovery_item(kind: str, value: str, label: Optional[str] = None, db_path: Optional[str] = None) -> Dict[str, Any]:
    value = normalize_discovery_value(kind, value)
    ensure_schema(_p(db_path))
    with get_connection(_p(db_path)) as conn:
        if conn.execute("SELECT COUNT(*) FROM social_trial_discovery_items").fetchone()[0] >= MAX_DISCOVERY_ITEMS:
            raise ValueError(f"Discovery list is limited to {MAX_DISCOVERY_ITEMS} entries.")
        conn.execute("INSERT OR IGNORE INTO social_trial_discovery_items (id, platform, kind, value, label, is_enabled, created_at) VALUES (?,?,?,?,?,?,?)",
                     (new_id("sdi"), "instagram", kind, value, label, 1, now_iso()))
        conn.commit()
        return dict(conn.execute("SELECT * FROM social_trial_discovery_items WHERE platform='instagram' AND kind=? AND value=?",
                                 (kind, value)).fetchone())


def set_discovery_item(item_id: str, is_enabled: bool, db_path: Optional[str] = None) -> bool:
    ensure_schema(_p(db_path))
    with get_connection(_p(db_path)) as conn:
        cur = conn.execute("UPDATE social_trial_discovery_items SET is_enabled=? WHERE id=?", (int(is_enabled), item_id))
        conn.commit()
        return cur.rowcount > 0


def delete_discovery_item(item_id: str, db_path: Optional[str] = None) -> bool:
    ensure_schema(_p(db_path))
    with get_connection(_p(db_path)) as conn:
        cur = conn.execute("DELETE FROM social_trial_discovery_items WHERE id=?", (item_id,))
        conn.commit()
        return cur.rowcount > 0


# ---- views: recent political posts and topic frequency ---------------------
def _cutoff(days: int) -> str:
    from datetime import timedelta
    return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()


def recent_political_posts(days: int = 7, limit: int = 50, platform: str = "instagram",
                           db_path: Optional[str] = None) -> List[Dict[str, Any]]:
    """Posts Gemini judged Tamil Nadu politics (latest classification), not rejected, newest first.
    Sorted by post time (falling back to collection time). This is recency, NOT engagement."""
    rows = list_posts(platform, 500, db_path)
    cutoff = _cutoff(days)
    out = []
    for r in rows:
        if r["cls_status"] != "ok" or not r["is_political"] or r["review_status"] == "rejected":
            continue
        when = r["published_at"] or r["collected_at"]
        if when and when >= cutoff:
            out.append({**r, "_sort": when})
    out.sort(key=lambda r: r["_sort"], reverse=True)
    for r in out:
        r.pop("_sort", None)
    return out[:limit]


def topic_trends(days: int = 7, platform: str = "instagram", db_path: Optional[str] = None) -> Dict[str, Any]:
    """Frequency of registry topics / parties / hashtags across COLLECTED political posts. Each post counts once per key;
    accounts are counted distinctly. This measures how often an issue appears in our collected sources, not Instagram-wide trends."""
    posts = recent_political_posts(days, 500, platform, db_path)

    def loads(v):
        try:
            return json.loads(v) if isinstance(v, str) else (v or [])
        except ValueError:
            return []

    def tally(keys_of) -> List[Dict[str, Any]]:
        agg: Dict[str, Dict[str, Any]] = {}
        for p in posts:
            for k in set(keys_of(p)):
                e = agg.setdefault(k, {"key": k, "posts": 0, "accounts": set(), "latest": ""})
                e["posts"] += 1
                if p.get("author_handle"):
                    e["accounts"].add(p["author_handle"])
                e["latest"] = max(e["latest"], p["published_at"] or p["collected_at"] or "")
        rows = [{"key": e["key"], "posts": e["posts"], "accounts": len(e["accounts"]), "latest": e["latest"]} for e in agg.values()]
        return sorted(rows, key=lambda r: (-r["posts"], -r["accounts"], r["key"]))[:15]

    return {
        "days": days, "political_posts": len(posts),
        "topics": tally(lambda p: loads(p["topics"])),
        "parties": tally(lambda p: loads(p["party_codes"])),
        "hashtags": tally(lambda p: [h.lower() for h in loads(p["hashtags"])]),
    }
