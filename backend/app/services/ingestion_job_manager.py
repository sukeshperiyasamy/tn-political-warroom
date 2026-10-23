import asyncio
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from pydantic import BaseModel

from .rss_ingestion import rss_engine
from .source_registry import source_registry

class IngestionJobStatus(BaseModel):
    job_id: str
    status: str  # "queued", "running", "completed", "failed"
    source_id: Optional[str] = None
    sources_total: int = 0
    sources_processed: int = 0
    current_source: Optional[str] = None
    total_items_found: int = 0
    total_new_items_added: int = 0
    total_duplicates_skipped: int = 0
    results: List[Dict[str, Any]] = []
    started_at: str
    completed_at: Optional[str] = None
    duration_ms: Optional[int] = None
    error: Optional[str] = None

class IngestionJobManager:
    """
    Manages in-process asynchronous RSS feed ingestion background jobs.
    Prevents duplicate simultaneous jobs and provides detailed status tracking.
    """
    def __init__(self):
        self._jobs: Dict[str, IngestionJobStatus] = {}
        self._active_job_id: Optional[str] = None
        self._latest_job_id: Optional[str] = None
        self._lock = asyncio.Lock()

    def get_job(self, job_id: str) -> Optional[IngestionJobStatus]:
        return self._jobs.get(job_id)

    def get_latest_job(self) -> Optional[IngestionJobStatus]:
        if self._active_job_id and self._active_job_id in self._jobs:
            return self._jobs[self._active_job_id]
        if self._latest_job_id and self._latest_job_id in self._jobs:
            return self._jobs[self._latest_job_id]
        return None

    def is_running(self) -> bool:
        if self._active_job_id:
            job = self._jobs.get(self._active_job_id)
            if job and job.status in ("queued", "running"):
                return True
        return False

    async def start_job(self, source_id: Optional[str] = None) -> Tuple[IngestionJobStatus, bool]:
        """
        Starts an ingestion background job.
        If an ingestion job is already running, returns the existing job and is_new=False.
        Otherwise creates a new job, starts the background task, and returns (job, True).
        """
        async with self._lock:
            if self.is_running():
                return self._jobs[self._active_job_id], False

            job_id = f"job_ingest_{int(time.time() * 1000)}"
            now_str = datetime.now(timezone.utc).isoformat()

            if source_id:
                sources_total = 1
            else:
                sources_total = len([s for s in source_registry.get_all_sources() if s.get("is_enabled")])

            job = IngestionJobStatus(
                job_id=job_id,
                status="queued",
                source_id=source_id,
                sources_total=sources_total,
                started_at=now_str
            )
            self._jobs[job_id] = job
            self._active_job_id = job_id
            self._latest_job_id = job_id

            asyncio.create_task(self._execute_job(job_id, source_id))
            return job, True

    async def _execute_job(self, job_id: str, source_id: Optional[str]):
        t0 = time.time()
        job = self._jobs[job_id]
        job.status = "running"
        try:
            if source_id:
                src = source_registry.get_source_by_id(source_id)
                if not src:
                    raise ValueError(f"Source '{source_id}' not found")
                job.current_source = src.get("name")
                res = await rss_engine.ingest_source(src)
                job.results.append(res)
                job.sources_processed = 1
                job.total_items_found = res.get("items_found", 0)
                job.total_new_items_added = res.get("new_items_added", 0)
                job.total_duplicates_skipped = res.get("skipped_duplicates", 0)
            else:
                async def on_progress(src, res):
                    job.sources_processed += 1
                    job.current_source = src.get("name")
                    job.total_items_found += res.get("items_found", 0)
                    job.total_new_items_added += res.get("new_items_added", 0)
                    job.total_duplicates_skipped += res.get("skipped_duplicates", 0)
                    job.results.append(res)

                results = await rss_engine.ingest_all_enabled(max_concurrency=4, on_progress=on_progress)
                job.total_items_found = sum(r.get("items_found", 0) for r in results)
                job.total_new_items_added = sum(r.get("new_items_added", 0) for r in results)
                job.total_duplicates_skipped = sum(r.get("skipped_duplicates", 0) for r in results)
                job.results = list(results)

            job.status = "completed"
            job.current_source = None
        except Exception as e:
            job.status = "failed"
            job.error = str(e)
            job.current_source = None
        finally:
            job.completed_at = datetime.now(timezone.utc).isoformat()
            job.duration_ms = int((time.time() - t0) * 1000)
            async with self._lock:
                if self._active_job_id == job_id:
                    self._active_job_id = None

ingestion_job_manager = IngestionJobManager()
