import json
import re
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from backend.app.data.db import get_connection, DB_PATH
from backend.app.services.entity_matcher import SEED_TOPICS, entity_matcher
from backend.app.services.source_registry import source_registry
from backend.app.services.client_config import client_config_service

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
                id, name_en, name_ta, category,
                keywords_en, keywords_ta, hashtags,
                negative_keywords, related_party_codes, related_leader_names,
                last_reviewed_at, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            target_id,
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
