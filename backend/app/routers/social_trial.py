"""Admin-only API for the Bright Data + Gemini social trial. Every endpoint except /login requires a server-signed token."""
import json
import os
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from backend.app.social_trial import auth, brightdata, classifier, service, store
from backend.app.social_trial.credentials import CredentialError, brightdata_api_key, google_project_id, redact

router = APIRouter(prefix="/api/social-trial", tags=["Social Trial (admin)"])

_JSON_COLS = ("hashtags", "party_codes", "leader_names", "topics", "rule_based", "districts", "sources_json")


class LoginRequest(BaseModel):
    username: str
    password: str


class TargetRequest(BaseModel):
    target_url: str
    display_name: Optional[str] = None
    post_limit: int = Field(default=10, ge=1, le=brightdata.MAX_POSTS_PER_RUN)
    is_enabled: bool = True


class RunRequest(BaseModel):
    platform: str
    source: str = "brightdata"  # "brightdata" | "fixture"
    dry_run: bool = False
    classify: bool = True
    target_url: Optional[str] = None  # defaults to the saved target for the platform


class ReviewRequest(BaseModel):
    review_status: str = Field(pattern="^(accepted|rejected|needs_review)$")


def _decode(row: Dict[str, Any]) -> Dict[str, Any]:
    out = dict(row)
    for col in _JSON_COLS:
        if isinstance(out.get(col), str):
            try:
                out[col] = json.loads(out[col])
            except ValueError:
                pass
    return out


def _bad_platform(platform: str) -> None:
    if platform not in brightdata.PLATFORMS:
        raise HTTPException(status_code=400, detail=f"Unsupported platform '{platform}'. Supported: {', '.join(brightdata.PLATFORMS)}.")


@router.post("/login")
def login(req: LoginRequest):
    if not auth.check_credentials(req.username, req.password):
        raise HTTPException(status_code=401, detail="Invalid username or password.")
    return {"token": auth.issue_token(req.username), "expires_in": auth.TOKEN_TTL_SECONDS}


@router.get("/status")
def status(_: str = Depends(auth.require_admin)):
    """Non-secret configuration/health summary. Reports whether credentials are present, never their values."""
    def probe(fn):
        try:
            fn()
            return {"configured": True, "message": "Credential file found."}
        except CredentialError as exc:
            return {"configured": False, "message": str(exc)}
    return {
        "bright_data": probe(brightdata_api_key),
        "gemini": {**probe(google_project_id), "model": classifier.model_name(),
                   "location": os.getenv("GEMINI_LOCATION", classifier.DEFAULT_LOCATION),
                   "prompt_version": classifier.PROMPT_VERSION},
        "platforms": {k: {"label": v["label"], "dataset_id": v["dataset_id"]} for k, v in brightdata.PLATFORMS.items()},
        "max_posts_per_run": brightdata.MAX_POSTS_PER_RUN,
    }


@router.get("/targets")
def get_targets(_: str = Depends(auth.require_admin)):
    return {"targets": store.list_targets()}


@router.put("/targets/{platform}")
def put_target(platform: str, req: TargetRequest, _: str = Depends(auth.require_admin)):
    _bad_platform(platform)
    try:
        url = brightdata.validate_target_url(platform, req.target_url)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return store.upsert_target(platform, url, req.display_name, req.post_limit, req.is_enabled)


@router.post("/runs")
def create_run(req: RunRequest, _: str = Depends(auth.require_admin)):
    _bad_platform(req.platform)
    if req.source not in service.SOURCES:
        raise HTTPException(status_code=400, detail=f"source must be one of {service.SOURCES}.")
    target = store.get_target(req.platform)
    url = req.target_url or (target or {}).get("target_url")
    if not url:
        raise HTTPException(status_code=422, detail=f"No target configured for {req.platform}. Save a public profile URL first.")
    limit = (target or {}).get("post_limit", brightdata.MAX_POSTS_PER_RUN)
    try:
        if req.dry_run:
            return service.dry_run(req.platform, url, limit, req.source, req.classify)
        if req.source == "brightdata":
            try:  # fail fast with a clear message instead of creating a doomed run
                brightdata_api_key()
            except CredentialError as exc:
                raise HTTPException(status_code=503, detail=str(exc))
        return service.start_run(req.platform, url, limit, req.source, req.classify)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@router.get("/runs")
def get_runs(limit: int = Query(25, ge=1, le=100), _: str = Depends(auth.require_admin)):
    return {"runs": [_decode(r) for r in store.list_runs(limit)]}


@router.get("/runs/{run_id}")
def get_run(run_id: str, _: str = Depends(auth.require_admin)):
    run = store.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found.")
    return _decode(run)


@router.get("/posts")
def get_posts(platform: Optional[str] = None, limit: int = Query(50, ge=1, le=200), _: str = Depends(auth.require_admin)):
    if platform:
        _bad_platform(platform)
    return {"posts": [_decode(r) for r in store.list_posts(platform, limit)]}


@router.post("/posts/{post_id}/classify")
def reclassify(post_id: str, force: bool = Query(False), _: str = Depends(auth.require_admin)):
    try:
        return _decode(service.classify_existing(post_id, force=force))
    except LookupError:
        raise HTTPException(status_code=404, detail="Post not found.")
    except service.ReviewedPostError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@router.post("/classifications/{classification_id}/review")
def review(classification_id: str, req: ReviewRequest, _: str = Depends(auth.require_admin)):
    if not store.set_review_status(classification_id, req.review_status):
        raise HTTPException(status_code=404, detail="Classification not found.")
    return {"id": classification_id, "review_status": req.review_status}


# ---- Instagram discovery (profiles + hashtags), recent political posts, topic frequency ------------------------
from backend.app.social_trial import relevance


class DiscoveryItemRequest(BaseModel):
    kind: str = Field(pattern="^(hashtag|profile)$")
    value: str
    label: Optional[str] = None


class DiscoveryToggleRequest(BaseModel):
    is_enabled: bool


class DiscoveryRunRequest(BaseModel):
    sources: str = "both"  # "profiles" | "hashtags" | "both"
    source: str = "brightdata"  # "brightdata" | "fixture"
    dry_run: bool = False
    classify: bool = True


@router.get("/instagram/discovery-items")
def list_discovery_items(_: str = Depends(auth.require_admin)):
    return {"items": store.list_discovery_items(), "limits": {"max_items": store.MAX_DISCOVERY_ITEMS,
            "profiles_per_run": service.MAX_PROFILES_PER_RUN, "hashtags_per_run": service.MAX_HASHTAGS_PER_RUN},
            "stage_a": relevance.summary()}


@router.post("/instagram/discovery-items")
def add_discovery_item(req: DiscoveryItemRequest, _: str = Depends(auth.require_admin)):
    try:
        return store.add_discovery_item(req.kind, req.value, req.label)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.patch("/instagram/discovery-items/{item_id}")
def toggle_discovery_item(item_id: str, req: DiscoveryToggleRequest, _: str = Depends(auth.require_admin)):
    if not store.set_discovery_item(item_id, req.is_enabled):
        raise HTTPException(status_code=404, detail="Item not found.")
    return {"id": item_id, "is_enabled": req.is_enabled}


@router.delete("/instagram/discovery-items/{item_id}")
def remove_discovery_item(item_id: str, _: str = Depends(auth.require_admin)):
    if not store.delete_discovery_item(item_id):
        raise HTTPException(status_code=404, detail="Item not found.")
    return {"id": item_id, "deleted": True}


@router.post("/instagram/discovery-runs")
def create_discovery_run(req: DiscoveryRunRequest, _: str = Depends(auth.require_admin)):
    if req.source not in service.SOURCES:
        raise HTTPException(status_code=400, detail=f"source must be one of {service.SOURCES}.")
    try:
        if req.dry_run:
            return service.discovery_dry_run(req.sources, req.source, req.classify)
        if req.source == "brightdata":
            try:
                brightdata_api_key()
            except CredentialError as exc:
                raise HTTPException(status_code=503, detail=str(exc))
        return service.start_discovery_run(req.sources, req.source, req.classify)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@router.get("/instagram/recent")
def instagram_recent(days: int = Query(7, ge=1, le=90), limit: int = Query(50, ge=1, le=200), _: str = Depends(auth.require_admin)):
    """Recent Tamil Nadu political posts among COLLECTED posts (newest first). Recency only: no engagement ranking."""
    return {"days": days, "ranking": "recent", "posts": [_decode(r) for r in store.recent_political_posts(days, limit)]}


@router.get("/instagram/topics")
def instagram_topics(days: int = Query(7, ge=1, le=90), _: str = Depends(auth.require_admin)):
    """Topic / party / hashtag frequency across collected political posts. Not an Instagram-wide trending list."""
    return store.topic_trends(days)
