import json
import re
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from backend.app.data.db import get_connection, DB_PATH, is_postgres
from backend.app.services.entity_matcher import SEED_TOPICS, entity_matcher
from backend.app.services.source_registry import source_registry
from backend.app.services.client_config import client_config_service
from backend.app.models import (
    DiscoveredKeyword,
    DiscoveredKeywordsResponse,
    KeywordAnalyticsResponse,
    ReclassificationRequest,
    ReclassificationSampleDiff,
    ReclassificationResponse
)

router = APIRouter(prefix="/api/admin", tags=["admin"])

# Default trending weights
DEFAULT_TRENDING_WEIGHTS = {
    "momentum_weight": 0.40,
    "volume_growth_weight": 0.30,
    "cross_source_weight": 0.20,
    "recency_weight": 0.10,
}

# --- Pydantic Models ---

class KeywordCreateRequest(BaseModel):
    id: Optional[str] = None
    name_en: str = Field(..., min_length=2, max_length=150)
    name_ta: str = Field(..., min_length=2, max_length=150)
    category: str = Field(default="Political General", max_length=100)
    keywords_en: List[str] = Field(default_factory=list)
    keywords_ta: List[str] = Field(default_factory=list)
    hashtags: List[str] = Field(default_factory=list)
    negative_keywords: List[str] = Field(default_factory=list)
    related_party_codes: List[str] = Field(default_factory=list)
    related_leader_names: List[str] = Field(default_factory=list)
    is_active: bool = True

class KeywordUpdateRequest(BaseModel):
    name_en: Optional[str] = None
    name_ta: Optional[str] = None
    category: Optional[str] = None
    keywords_en: Optional[List[str]] = None
    keywords_ta: Optional[List[str]] = None
    hashtags: Optional[List[str]] = None
    negative_keywords: Optional[List[str]] = None
    related_party_codes: Optional[List[str]] = None
    related_leader_names: Optional[List[str]] = None
    is_active: Optional[bool] = None

class TrendingConfigUpdate(BaseModel):
    momentum_weight: float = Field(..., ge=0.0, le=1.0)
    volume_growth_weight: float = Field(..., ge=0.0, le=1.0)
    cross_source_weight: float = Field(..., ge=0.0, le=1.0)
    recency_weight: float = Field(..., ge=0.0, le=1.0)

class SafeSettingsUpdate(BaseModel):
    client_name: Optional[str] = None
    client_tagline: Optional[str] = None
    logo_url: Optional[str] = None
    brand_color: Optional[str] = None
    accent_color: Optional[str] = None
    default_language: Optional[str] = None
    polling_interval_minutes: Optional[int] = Field(default=None, ge=5, le=1440)


# In-memory store for trending weights with fallback to defaults
_active_trending_weights = dict(DEFAULT_TRENDING_WEIGHTS)


def _slugify(text: str) -> str:
    cleaned = re.sub(r"[^\w\s-]", "", text.lower()).strip()
    return re.sub(r"[-\s]+", "_", cleaned)


def _clean_list(items: List[str]) -> List[str]:
    """Trims whitespace, drops empty tokens, removes duplicates while preserving order."""
    seen = set()
    res = []
    for it in items:
        cleaned = str(it).strip()
        if cleaned and cleaned.lower() not in seen:
            seen.add(cleaned.lower())
            res.append(cleaned)
    return res


# --- System Status Overview Endpoint ---

@router.get("/system-status")
def get_system_status():
    """Returns high-level statistics for the Admin dashboard."""
    sources = source_registry.get_all_sources()
    total_sources = len(sources)
    enabled_sources = sum(1 for s in sources if s.get("is_enabled"))
    disabled_sources = total_sources - enabled_sources
    healthy_sources = sum(1 for s in sources if s.get("health_status") == "healthy" and s.get("is_enabled"))
    error_sources = sum(1 for s in sources if s.get("health_status") in ("error", "warning") and s.get("is_enabled"))

    logs = source_registry.get_recent_logs(limit=10)
    last_log_at = logs[0].get("timestamp") if logs else None

    # Article count and topic count
    total_articles = 0
    total_topics = 0
    active_topics = 0
    db_engine = "sqlite_wal"

    try:
        with get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) FROM articles")
            r = cur.fetchone()
            total_articles = r[0] if r else 0

            cur.execute("SELECT COUNT(*), SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) FROM topic_registry")
            tr = cur.fetchone()
            if tr:
                total_topics = tr[0] or 0
                active_topics = tr[1] or 0
    except Exception as e:
        print("Error fetching admin counts:", e)

    return {
        "status": "operational",
        "service": "tn-political-warroom-admin",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "publishers": {
            "total": total_sources,
            "enabled": enabled_sources,
            "disabled": disabled_sources,
            "healthy": healthy_sources,
            "warning_or_error": error_sources,
        },
        "content": {
            "total_articles": total_articles,
            "total_topics": total_topics,
            "active_topics": active_topics,
            "last_ingestion_at": last_log_at,
        },
        "recent_logs": logs[:5],
    }


# --- Keywords & Filter Topics Management Endpoints ---

@router.get("/keywords")
def list_keywords(
    search: Optional[str] = None,
    category: Optional[str] = None,
    active_only: bool = False
):
    """
    Returns registered political topics, entities, and keywords with filtering.
    Preserves Tamil Unicode characters.
    """
    entity_matcher.ensure_initialized()

    with get_connection() as conn:
        cur = conn.cursor()
        query = "SELECT * FROM topic_registry"
        conditions = []
        params = []

        if active_only:
            conditions.append("is_active = 1")

        if category and category != "All":
            conditions.append("category = ?")
            params.append(category)

        if search:
            search_clean = f"%{search.strip().lower()}%"
            conditions.append("(LOWER(name_en) LIKE ? OR LOWER(name_ta) LIKE ? OR LOWER(keywords_en) LIKE ? OR LOWER(keywords_ta) LIKE ?)")
            params.extend([search_clean, search_clean, search_clean, search_clean])

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY category ASC, name_en ASC"
        cur.execute(query, params)
        rows = cur.fetchall()

    items = []
    for r in rows:
        row_dict = dict(r)
        items.append({
            "id": row_dict["id"],
            "name_en": row_dict["name_en"],
            "name_ta": row_dict["name_ta"],
            "category": row_dict["category"],
            "keywords_en": json.loads(row_dict.get("keywords_en") or "[]"),
            "keywords_ta": json.loads(row_dict.get("keywords_ta") or "[]"),
            "hashtags": json.loads(row_dict.get("hashtags") or "[]"),
            "negative_keywords": json.loads(row_dict.get("negative_keywords") or "[]"),
            "related_party_codes": json.loads(row_dict.get("related_party_codes") or "[]"),
            "related_leader_names": json.loads(row_dict.get("related_leader_names") or "[]"),
            "last_reviewed_at": row_dict.get("last_reviewed_at"),
            "is_active": bool(row_dict.get("is_active", 1)),
        })

    # Available categories for dropdown
    categories = sorted(list({it["category"] for it in items}))
    return {
        "count": len(items),
        "categories": categories,
        "keywords": items,
        "reprocessing_note": "Modifications update classification for incoming content. Historical articles are preserved.",
    }


@router.post("/keywords", status_code=status.HTTP_201_CREATED)
def create_keyword(req: KeywordCreateRequest):
    """Adds a new political entity / keyword filter topic to the registry."""
    name_en = req.name_en.strip()
    name_ta = req.name_ta.strip()
    category = req.category.strip() or "General Political"

    if not name_en or not name_ta:
        raise HTTPException(status_code=400, detail="English and Tamil names are required and cannot be empty.")

    target_id = req.id.strip() if req.id else _slugify(name_en)
    if not target_id:
        target_id = f"topic_{int(datetime.now(timezone.utc).timestamp())}"

    # Clean lists
    kw_en = _clean_list(req.keywords_en)
    kw_ta = _clean_list(req.keywords_ta)
    hashtags = [h if h.startswith("#") else f"#{h}" for h in _clean_list(req.hashtags)]
    neg_kw = _clean_list(req.negative_keywords)
    parties = _clean_list(req.related_party_codes)
    leaders = _clean_list(req.related_leader_names)

    now_iso = datetime.now(timezone.utc).isoformat()

    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM topic_registry WHERE id = ?", (target_id,))
        if cur.fetchone():
            raise HTTPException(status_code=409, detail=f"A topic or keyword with ID '{target_id}' already exists.")

        cur.execute("""
            INSERT INTO topic_registry (
                id, name, tamil_name, name_en, name_ta, category,
                keywords_en, keywords_ta, hashtags,
                negative_keywords, related_party_codes, related_leader_names,
                last_reviewed_at, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            target_id,
            name_en,
            name_ta,
            name_en,
            name_ta,
            category,
            json.dumps(kw_en, ensure_ascii=False),
            json.dumps(kw_ta, ensure_ascii=False),
            json.dumps(hashtags, ensure_ascii=False),
            json.dumps(neg_kw, ensure_ascii=False),
            json.dumps(parties),
            json.dumps(leaders),
            now_iso,
            1 if req.is_active else 0
        ))
        conn.commit()

    return {
        "status": "created",
        "id": target_id,
        "name_en": name_en,
        "name_ta": name_ta,
        "category": category,
        "keywords_en": kw_en,
        "keywords_ta": kw_ta,
        "hashtags": hashtags,
        "negative_keywords": neg_kw,
        "related_party_codes": parties,
        "related_leader_names": leaders,
        "is_active": req.is_active,
        "last_reviewed_at": now_iso,
    }


@router.put("/keywords/{keyword_id}")
def update_keyword(keyword_id: str, req: KeywordUpdateRequest):
    """Updates an existing keyword topic in the registry."""
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM topic_registry WHERE id = ?", (keyword_id,))
        existing = cur.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail=f"Keyword topic '{keyword_id}' not found.")

        current = dict(existing)
        name_en = req.name_en.strip() if req.name_en is not None else current["name_en"]
        name_ta = req.name_ta.strip() if req.name_ta is not None else current["name_ta"]
        category = req.category.strip() if req.category is not None else current["category"]

        kw_en = _clean_list(req.keywords_en) if req.keywords_en is not None else json.loads(current["keywords_en"])
        kw_ta = _clean_list(req.keywords_ta) if req.keywords_ta is not None else json.loads(current["keywords_ta"])
        raw_tags = req.hashtags if req.hashtags is not None else json.loads(current["hashtags"])
        hashtags = [h if h.startswith("#") else f"#{h}" for h in _clean_list(raw_tags)]
        neg_kw = _clean_list(req.negative_keywords) if req.negative_keywords is not None else json.loads(current["negative_keywords"])
        parties = _clean_list(req.related_party_codes) if req.related_party_codes is not None else json.loads(current["related_party_codes"])
        leaders = _clean_list(req.related_leader_names) if req.related_leader_names is not None else json.loads(current["related_leader_names"])
        is_active = (1 if req.is_active else 0) if req.is_active is not None else current["is_active"]

        now_iso = datetime.now(timezone.utc).isoformat()

        cur.execute("""
            UPDATE topic_registry SET
                name = ?,
                tamil_name = ?,
                name_en = ?,
                name_ta = ?,
                category = ?,
                keywords_en = ?,
                keywords_ta = ?,
                hashtags = ?,
                negative_keywords = ?,
                related_party_codes = ?,
                related_leader_names = ?,
                last_reviewed_at = ?,
                is_active = ?
            WHERE id = ?
        """, (
            name_en,
            name_ta,
            name_en,
            name_ta,
            category,
            json.dumps(kw_en, ensure_ascii=False),
            json.dumps(kw_ta, ensure_ascii=False),
            json.dumps(hashtags, ensure_ascii=False),
            json.dumps(neg_kw, ensure_ascii=False),
            json.dumps(parties),
            json.dumps(leaders),
            now_iso,
            is_active,
            keyword_id
        ))
        conn.commit()

    return {
        "status": "updated",
        "id": keyword_id,
        "name_en": name_en,
        "name_ta": name_ta,
        "category": category,
        "keywords_en": kw_en,
        "keywords_ta": kw_ta,
        "hashtags": hashtags,
        "negative_keywords": neg_kw,
        "related_party_codes": parties,
        "related_leader_names": leaders,
        "is_active": bool(is_active),
        "last_reviewed_at": now_iso,
    }


@router.post("/keywords/{keyword_id}/toggle")
def toggle_keyword_status(keyword_id: str):
    """Toggles active/inactive state of a keyword topic."""
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, is_active FROM topic_registry WHERE id = ?", (keyword_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Keyword topic not found.")

        new_status = 0 if row["is_active"] == 1 else 1
        now_iso = datetime.now(timezone.utc).isoformat()
        cur.execute("UPDATE topic_registry SET is_active = ?, last_reviewed_at = ? WHERE id = ?", (new_status, now_iso, keyword_id))
        conn.commit()

    return {"id": keyword_id, "is_active": bool(new_status)}


@router.delete("/keywords/{keyword_id}")
def delete_keyword(keyword_id: str):
    """Deletes a keyword topic from the registry."""
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, name_en FROM topic_registry WHERE id = ?", (keyword_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Keyword topic not found.")

        cur.execute("DELETE FROM topic_registry WHERE id = ?", (keyword_id,))
        conn.commit()

    return {"status": "deleted", "id": keyword_id, "name_en": row["name_en"]}

class CandidateApproveRequest(BaseModel):
    category: Optional[str] = None
    related_party_code: Optional[str] = None
    related_leader_name: Optional[str] = None


# --- Discovered Candidate Keywords Review Queue ---

@router.get("/keywords/candidates", response_model=DiscoveredKeywordsResponse)
def get_candidate_keywords(candidate_status: Optional[str] = Query(default=None, alias="status")):
    """Returns discovered candidate keywords from the ingestion discovery queue."""
    entity_matcher.ensure_initialized()
    with get_connection() as conn:
        cur = conn.cursor()
        if candidate_status:
            cur.execute("""
                SELECT * FROM discovered_keywords
                WHERE status = ?
                ORDER BY frequency DESC, discovered_at DESC
                LIMIT 100
            """, (candidate_status.lower(),))
        else:
            cur.execute("""
                SELECT * FROM discovered_keywords
                ORDER BY CASE WHEN status = 'pending' THEN 0 ELSE 1 END, frequency DESC, discovered_at DESC
                LIMIT 100
            """)
        rows = cur.fetchall()
        candidates = []
        for r in rows:
            d = dict(r)
            candidates.append(DiscoveredKeyword(
                id=d["id"],
                name_en=d["name_en"],
                name_ta=d["name_ta"],
                category=d.get("category") or "Emerging Entity",
                suggested_party_code=d.get("suggested_party_code"),
                suggested_leader_name=d.get("suggested_leader_name"),
                frequency=d.get("frequency") or 1,
                relevance_score=d.get("relevance_score") or 0.5,
                sample_article_id=d.get("sample_article_id"),
                sample_headline=d.get("sample_headline"),
                status=d.get("status") or "pending",
                discovered_at=d["discovered_at"],
                reviewed_at=d.get("reviewed_at")
            ))
    return DiscoveredKeywordsResponse(count=len(candidates), candidates=candidates)


@router.post("/keywords/candidates/{candidate_id}/approve")
def approve_candidate_keyword(candidate_id: str, req: Optional[CandidateApproveRequest] = None):
    """Approves a candidate keyword and registers it into active topic taxonomy."""
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM discovered_keywords WHERE id = ?", (candidate_id,))
        cand = cur.fetchone()
        if not cand:
            raise HTTPException(status_code=404, detail="Candidate keyword not found.")

        cand_dict = dict(cand)
        topic_id = _slugify(cand_dict["name_en"])
        if not topic_id:
            topic_id = f"cand_{candidate_id}"

        category = (req.category.strip() if req and req.category else None) or cand_dict.get("category") or "Emerging Topic"
        parties = [req.related_party_code] if (req and req.related_party_code) else ([cand_dict["suggested_party_code"]] if cand_dict.get("suggested_party_code") else [])
        leaders = [req.related_leader_name] if (req and req.related_leader_name) else ([cand_dict["suggested_leader_name"]] if cand_dict.get("suggested_leader_name") else [])

        kw_en = [cand_dict["name_en"].lower().strip()]
        kw_ta = [cand_dict["name_ta"].strip()]
        hashtags = [cand_dict["name_en"]] if cand_dict["name_en"].startswith("#") else [f"#{cand_dict['name_en'].replace(' ', '')}"]

        use_pg = is_postgres()
        if use_pg:
            cur.execute("""
                INSERT INTO topic_registry (
                    id, name, tamil_name, name_en, name_ta, category,
                    keywords_en, keywords_ta, hashtags,
                    negative_keywords, related_party_codes, related_leader_names,
                    last_reviewed_at, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, 1)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    category = EXCLUDED.category,
                    keywords_en = EXCLUDED.keywords_en,
                    keywords_ta = EXCLUDED.keywords_ta,
                    is_active = 1
            """, (
                topic_id, cand_dict["name_en"], cand_dict["name_ta"], cand_dict["name_en"], cand_dict["name_ta"], category,
                json.dumps(kw_en, ensure_ascii=False), json.dumps(kw_ta, ensure_ascii=False),
                json.dumps(hashtags, ensure_ascii=False), json.dumps(parties), json.dumps(leaders), now_iso
            ))
        else:
            cur.execute("""
                INSERT OR REPLACE INTO topic_registry (
                    id, name, tamil_name, name_en, name_ta, category,
                    keywords_en, keywords_ta, hashtags,
                    negative_keywords, related_party_codes, related_leader_names,
                    last_reviewed_at, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, 1)
            """, (
                topic_id, cand_dict["name_en"], cand_dict["name_ta"], cand_dict["name_en"], cand_dict["name_ta"], category,
                json.dumps(kw_en, ensure_ascii=False), json.dumps(kw_ta, ensure_ascii=False),
                json.dumps(hashtags, ensure_ascii=False), json.dumps(parties), json.dumps(leaders), now_iso
            ))

        # Mark candidate approved
        cur.execute("UPDATE discovered_keywords SET status = 'approved', reviewed_at = ? WHERE id = ?", (now_iso, candidate_id))
        conn.commit()

    return {"status": "approved", "id": candidate_id, "topic_id": topic_id}


@router.post("/keywords/candidates/{candidate_id}/reject")
def reject_candidate_keyword(candidate_id: str):
    """Rejects a candidate keyword so it is not added to taxonomy."""
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM discovered_keywords WHERE id = ?", (candidate_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Candidate keyword not found.")

        cur.execute("UPDATE discovered_keywords SET status = 'rejected', reviewed_at = ? WHERE id = ?", (now_iso, candidate_id))
        conn.commit()

    return {"status": "rejected", "id": candidate_id}


# --- Keyword Pipeline Analytics & Diagnostics ---

@router.get("/keywords/analytics", response_model=KeywordAnalyticsResponse)
def get_keyword_analytics():
    """Returns comprehensive analytics on keyword distributions, party mentions, and bias anomalies."""
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM articles")
        total_articles = cur.fetchone()[0]

        cur.execute("""
            SELECT party_codes, leader_names, topics, source_name, primary_subject, is_opinion_or_allegation
            FROM articles
        """)
        rows = cur.fetchall()

    party_counts = {}
    leader_counts = {}
    topic_counts = {}
    source_counts = {}
    subject_counts = {}
    opinion_count = 0

    for r in rows:
        d = dict(r)
        parties = json.loads(d["party_codes"]) if isinstance(d["party_codes"], str) else (d["party_codes"] or [])
        leaders = json.loads(d["leader_names"]) if isinstance(d["leader_names"], str) else (d["leader_names"] or [])
        topics = json.loads(d["topics"]) if isinstance(d["topics"], str) else (d["topics"] or [])
        src = d.get("source_name") or "Unknown"
        subject = d.get("primary_subject") or "General News"
        if d.get("is_opinion_or_allegation"):
            opinion_count += 1

        for p in parties:
            party_counts[p] = party_counts.get(p, 0) + 1
        for l in leaders:
            leader_counts[l] = leader_counts.get(l, 0) + 1
        for t in topics:
            topic_counts[t] = topic_counts.get(t, 0) + 1
        source_counts[src] = source_counts.get(src, 0) + 1
        subject_counts[subject] = subject_counts.get(subject, 0) + 1

    total_safe = max(total_articles, 1)

    party_dist = [
        {"party_code": p, "count": c, "percentage": round((c / total_safe) * 100, 1)}
        for p, c in sorted(party_counts.items(), key=lambda kv: kv[1], reverse=True)
    ]
    leader_dist = [
        {"leader_name": l, "count": c, "percentage": round((c / total_safe) * 100, 1)}
        for l, c in sorted(leader_counts.items(), key=lambda kv: kv[1], reverse=True)
    ]
    topic_dist = [
        {"topic": t, "count": c, "percentage": round((c / total_safe) * 100, 1)}
        for t, c in sorted(topic_counts.items(), key=lambda kv: kv[1], reverse=True)
    ]
    source_dist = [
        {"source_name": s, "count": c, "percentage": round((c / total_safe) * 100, 1)}
        for s, c in sorted(source_counts.items(), key=lambda kv: kv[1], reverse=True)
    ]
    subject_dist = [
        {"subject": s, "count": c, "percentage": round((c / total_safe) * 100, 1)}
        for s, c in sorted(subject_counts.items(), key=lambda kv: kv[1], reverse=True)[:15]
    ]

    # Bias diagnostics
    anomaly_flags = []
    if party_dist and party_dist[0]["percentage"] > 50:
        anomaly_flags.append(f"Imbalance Detected: {party_dist[0]['party_code']} is tagged in {party_dist[0]['percentage']}% of articles. Run reclassification preview to audit.")
    unassigned_count = total_articles - sum(1 for r in rows if (json.loads(dict(r)["party_codes"]) if isinstance(dict(r)["party_codes"], str) else dict(r)["party_codes"]))
    unassigned_pct = round((unassigned_count / total_safe) * 100, 1)
    if unassigned_pct > 80:
        anomaly_flags.append(f"Notice: {unassigned_pct}% of articles are general/non-partisan state news.")

    return KeywordAnalyticsResponse(
        total_articles=total_articles,
        party_distribution=party_dist,
        leader_distribution=leader_dist,
        topic_distribution=topic_dist,
        source_distribution=source_dist,
        primary_subject_distribution=subject_dist,
        high_frequency_keywords=party_dist[:10],
        anomaly_flags=anomaly_flags
    )


# --- Safe Batch Reclassification Tooling ---

@router.post("/reclassify", response_model=ReclassificationResponse)
def reclassify_articles(req: ReclassificationRequest):
    """
    Safely audits and reclassifies existing articles using the unbiased taxonomy engine.
    When `dry_run=True` (default), returns preview diffs and impact analysis without modifying database.
    When `dry_run=False`, applies updates in safe batches.
    """
    entity_matcher.ensure_initialized()
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM articles")
        total_articles = cur.fetchone()[0]

        cur.execute("""
            SELECT id, title, summary, party_codes, leader_names, topics, primary_subject
            FROM articles
            ORDER BY published_at DESC
            LIMIT ? OFFSET ?
        """, (req.batch_size, req.offset))
        rows = cur.fetchall()

    examined = len(rows)
    changed_count = 0
    sample_diffs = []
    updates = []

    for r in rows:
        d = dict(r)
        old_parties = json.loads(d["party_codes"]) if isinstance(d["party_codes"], str) else (d["party_codes"] or [])
        old_leaders = json.loads(d["leader_names"]) if isinstance(d["leader_names"], str) else (d["leader_names"] or [])
        old_topics = json.loads(d["topics"]) if isinstance(d["topics"], str) else (d["topics"] or [])

        match_res = entity_matcher.match_entities(text=d.get("summary") or "", title=d.get("title") or "")
        new_parties = match_res["party_codes"]
        new_leaders = match_res["leader_names"]
        new_topics = match_res["topics"]
        new_primary_subject = match_res.get("primary_subject")
        new_is_opinion = 1 if match_res.get("is_opinion_or_allegation") else 0

        has_changed = (
            set(old_parties) != set(new_parties) or
            set(old_leaders) != set(new_leaders) or
            set(old_topics) != set(new_topics) or
            d.get("primary_subject") != new_primary_subject
        )

        if has_changed:
            changed_count += 1
            if len(sample_diffs) < 15:
                sample_diffs.append(ReclassificationSampleDiff(
                    article_id=d["id"],
                    title=d.get("title") or "",
                    old_parties=old_parties,
                    new_parties=new_parties,
                    old_leaders=old_leaders,
                    new_leaders=new_leaders,
                    old_topics=old_topics,
                    new_topics=new_topics,
                    primary_subject=new_primary_subject
                ))

            if not req.dry_run:
                updates.append((
                    json.dumps(new_parties),
                    json.dumps(new_leaders),
                    json.dumps(new_topics),
                    new_primary_subject,
                    new_is_opinion,
                    d["id"]
                ))

    if not req.dry_run and updates:
        with get_connection() as conn:
            cur = conn.cursor()
            cur.executemany("""
                UPDATE articles SET
                    party_codes = ?,
                    leader_names = ?,
                    topics = ?,
                    primary_subject = ?,
                    is_opinion_or_allegation = ?
                WHERE id = ?
            """, updates)
            conn.commit()

    if req.dry_run:
        summary_msg = f"Dry Run Preview: {changed_count} of {examined} evaluated articles would be updated. Zero database changes made."
    else:
        summary_msg = f"Reclassification Applied: Successfully updated {changed_count} of {examined} articles in the database."

    return ReclassificationResponse(
        dry_run=req.dry_run,
        total_articles=total_articles,
        examined=examined,
        changed_count=changed_count,
        sample_diffs=sample_diffs,
        summary_message=summary_msg
    )



# --- Trending Algorithm Configuration Endpoints ---

@router.get("/trending-config")
def get_trending_config():
    """Returns current active trending weights and formula breakdown."""
    return {
        "weights": dict(_active_trending_weights),
        "default_weights": dict(DEFAULT_TRENDING_WEIGHTS),
        "formula": "trend_score = (momentum * W_m + volume_growth * W_v + cross_source * W_c + recency * W_r) * 100",
        "description": "Multi-signal trending calculation combining comparative velocity, post volume growth, cross-source diversity, and time decay recency.",
        "is_customized": _active_trending_weights != DEFAULT_TRENDING_WEIGHTS
    }


@router.put("/trending-config")
def update_trending_config(req: TrendingConfigUpdate):
    """Updates trending algorithm weights after ensuring weights sum to 1.0 (±0.05)."""
    total = round(req.momentum_weight + req.volume_growth_weight + req.cross_source_weight + req.recency_weight, 3)
    if not (0.95 <= total <= 1.05):
        raise HTTPException(
            status_code=400,
            detail=f"Trending weights must sum to 1.0 (current sum: {total}). Please adjust weights."
        )

    _active_trending_weights["momentum_weight"] = round(req.momentum_weight, 3)
    _active_trending_weights["volume_growth_weight"] = round(req.volume_growth_weight, 3)
    _active_trending_weights["cross_source_weight"] = round(req.cross_source_weight, 3)
    _active_trending_weights["recency_weight"] = round(req.recency_weight, 3)

    return {
        "status": "updated",
        "weights": dict(_active_trending_weights),
        "is_customized": _active_trending_weights != DEFAULT_TRENDING_WEIGHTS
    }


@router.post("/trending-config/reset")
def reset_trending_config():
    """Resets trending algorithm weights to system defaults."""
    global _active_trending_weights
    _active_trending_weights = dict(DEFAULT_TRENDING_WEIGHTS)
    return {
        "status": "reset_to_default",
        "weights": dict(_active_trending_weights),
        "is_customized": False
    }


# --- Safe Application Settings Endpoints ---

@router.get("/settings")
def get_safe_settings():
    """
    Returns only safe application configuration parameters.
    Deployment secrets, database passwords, and API keys are explicitly excluded.
    """
    cfg = client_config_service.get_config()
    return {
        "branding": {
            "client_name": cfg.get("client_name"),
            "client_tagline": cfg.get("client_tagline"),
            "logo_url": cfg.get("logo_url"),
            "brand_color": cfg.get("brand_color"),
            "accent_color": cfg.get("accent_color"),
        },
        "preferences": {
            "default_language": cfg.get("default_language", "ta"),
            "polling_interval_minutes": 15,
            "default_demo_scenario": cfg.get("default_demo_scenario"),
        },
        "security_notice": "Deployment credentials, database passwords, and external API keys are managed securely in server environment variables and cannot be modified via this interface."
    }


@router.put("/settings")
def update_safe_settings(req: SafeSettingsUpdate):
    """Updates safe branding and display settings."""
    updates = {}
    if req.client_name is not None:
        updates["client_name"] = req.client_name.strip()
    if req.client_tagline is not None:
        updates["client_tagline"] = req.client_tagline.strip()
    if req.logo_url is not None:
        updates["logo_url"] = req.logo_url.strip()
    if req.brand_color is not None:
        updates["brand_color"] = req.brand_color.strip()
    if req.accent_color is not None:
        updates["accent_color"] = req.accent_color.strip()
    if req.default_language is not None:
        updates["default_language"] = req.default_language.strip()

    updated_cfg = client_config_service.update_config(updates)
    return {
        "status": "updated",
        "branding": {
            "client_name": updated_cfg.get("client_name"),
            "client_tagline": updated_cfg.get("client_tagline"),
            "logo_url": updated_cfg.get("logo_url"),
            "brand_color": updated_cfg.get("brand_color"),
            "accent_color": updated_cfg.get("accent_color"),
        },
        "preferences": {
            "default_language": updated_cfg.get("default_language"),
            "polling_interval_minutes": 15,
        }
    }
