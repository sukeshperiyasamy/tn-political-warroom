from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from ..models import (
    NewsSource, SourceCreate, SourceTestRequest, SourceTestResult,
    IngestResponse, IngestionLog
)
from ..services.source_registry import source_registry
from ..services.rss_ingestion import rss_engine

router = APIRouter(prefix="/api/sources", tags=["sources"])

@router.get("", response_model=List[NewsSource])
def get_sources():
    sources = source_registry.get_all_sources()
    return sources

@router.post("", response_model=NewsSource)
def create_source(req: SourceCreate):
    data = req.model_dump()
    created = source_registry.add_source(data)
    if not created:
        raise HTTPException(status_code=400, detail="Failed to create source")
    return created

@router.post("/test", response_model=SourceTestResult)
def test_external_feed(req: SourceTestRequest):
    result = rss_engine.test_feed(req.rss_url)
    return result

@router.post("/{source_id}/test", response_model=SourceTestResult)
def test_registered_source(source_id: str):
    source = source_registry.get_source_by_id(source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    result = rss_engine.test_feed(source["rss_url"])
    return result

@router.post("/{source_id}/toggle", response_model=NewsSource)
def toggle_source(source_id: str):
    updated = source_registry.toggle_source(source_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Source not found")
    return updated

@router.delete("/{source_id}")
def delete_source(source_id: str):
    source = source_registry.get_source_by_id(source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    deleted = source_registry.delete_source(source_id)
    return {"status": "deleted", "id": source_id}

@router.post("/ingest", response_model=IngestResponse)
async def trigger_ingestion(source_id: Optional[str] = Query(None)):
    SUCCESS_STATUSES = {"success", "not_modified_304", "new_articles", "no_new_articles", "stale_feed"}
    if source_id:
        source = source_registry.get_source_by_id(source_id)
        if not source:
            raise HTTPException(status_code=404, detail="Source not found")
        result = await rss_engine.ingest_source(source)
        is_succ = result.get("status") in SUCCESS_STATUSES
        return IngestResponse(
            status="success" if is_succ else "partial_error",
            sources_processed=1,
            total_items_found=result.get("items_found", 0),
            total_new_items_added=result.get("new_items_added", 0),
            results=[result]
        )
    else:
        results = await rss_engine.ingest_all_enabled()
        total_found = sum(r.get("items_found", 0) for r in results)
        total_added = sum(r.get("new_items_added", 0) for r in results)
        any_success = any(r.get("status") in SUCCESS_STATUSES for r in results)
        return IngestResponse(
            status="success" if any_success else "error",
            sources_processed=len(results),
            total_items_found=total_found,
            total_new_items_added=total_added,
            results=results
        )

@router.get("/logs", response_model=List[IngestionLog])
def get_logs(limit: int = Query(30, ge=1, le=100)):
    logs = source_registry.get_recent_logs(limit=limit)
    return logs
