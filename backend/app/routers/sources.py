from fastapi import APIRouter, HTTPException, Query, Response, status
from typing import List, Optional, Union
from ..models import (
    NewsSource, SourceCreate, SourceTestRequest, SourceTestResult,
    IngestResponse, IngestTriggerResponse, IngestionLog
)
from ..services.source_registry import source_registry
from ..services.rss_ingestion import rss_engine
from ..services.ingestion_job_manager import ingestion_job_manager, IngestionJobStatus

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

@router.post("/ingest", response_model=Union[IngestTriggerResponse, IngestResponse], status_code=status.HTTP_202_ACCEPTED)
async def trigger_ingestion(
    response: Response,
    source_id: Optional[str] = Query(None),
    sync: bool = Query(False, description="If True, blocks synchronously until ingestion completes and returns full IngestResponse")
):
    if sync:
        SUCCESS_STATUSES = {"success", "not_modified_304", "new_articles", "no_new_articles", "stale_feed"}
        response.status_code = status.HTTP_200_OK
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
                total_duplicates_skipped=result.get("skipped_duplicates", 0),
                results=[result]
            )
        else:
            results = await rss_engine.ingest_all_enabled()
            total_found = sum(r.get("items_found", 0) for r in results)
            total_added = sum(r.get("new_items_added", 0) for r in results)
            total_skipped = sum(r.get("skipped_duplicates", 0) for r in results)
            any_success = any(r.get("status") in SUCCESS_STATUSES for r in results)
            return IngestResponse(
                status="success" if any_success else "error",
                sources_processed=len(results),
                total_items_found=total_found,
                total_new_items_added=total_added,
                total_duplicates_skipped=total_skipped,
                results=results
            )

    # Asynchronous execution via IngestionJobManager
    if source_id:
        source = source_registry.get_source_by_id(source_id)
        if not source:
            raise HTTPException(status_code=404, detail="Source not found")

    job, is_new = await ingestion_job_manager.start_job(source_id=source_id)
    response.status_code = status.HTTP_202_ACCEPTED
    return IngestTriggerResponse(
        status="queued" if is_new else "already_running",
        job_id=job.job_id,
        message="Ingestion background job scheduled" if is_new else "Ingestion job is already running",
        source_id=source_id,
        poll_status_url=f"/api/sources/ingest/status/{job.job_id}"
    )

@router.get("/ingest/status/latest", response_model=Optional[IngestionJobStatus])
def get_latest_ingestion_status():
    latest = ingestion_job_manager.get_latest_job()
    if not latest:
        return None
    return latest

@router.get("/ingest/status/{job_id}", response_model=IngestionJobStatus)
def get_ingestion_status(job_id: str):
    job = ingestion_job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Ingestion job '{job_id}' not found")
    return job

@router.get("/logs", response_model=List[IngestionLog])
def get_logs(limit: int = Query(30, ge=1, le=100)):
    logs = source_registry.get_recent_logs(limit=limit)
    return logs
