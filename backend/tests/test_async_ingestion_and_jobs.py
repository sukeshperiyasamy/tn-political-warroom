import pytest
import asyncio
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.ingestion_job_manager import IngestionJobManager, IngestionJobStatus
from backend.app.services.source_registry import source_registry
from backend.app.services.rss_ingestion import RSSIngestionEngine, rss_engine
from backend.app.services.rss_scheduler import RSSBackgroundScheduler

client = TestClient(app)

def test_async_ingest_trigger_endpoint():
    # 1. Trigger async ingestion via API (default sync=False)
    resp = client.post("/api/sources/ingest")
    assert resp.status_code == 202
    data = resp.json()
    assert "job_id" in data
    assert data["status"] in ("queued", "already_running")
    assert "poll_status_url" in data

    job_id = data["job_id"]

    # 2. Check job status endpoint by job_id
    status_resp = client.get(f"/api/sources/ingest/status/{job_id}")
    assert status_resp.status_code == 200
    st_data = status_resp.json()
    assert st_data["job_id"] == job_id
    assert st_data["status"] in ("queued", "running", "completed")
    assert "sources_total" in st_data

    # 3. Check latest job status endpoint
    latest_resp = client.get("/api/sources/ingest/status/latest")
    assert latest_resp.status_code == 200
    latest_data = latest_resp.json()
    assert latest_data["job_id"] == job_id

def test_sync_ingest_endpoint_fallback():
    # Trigger synchronous ingestion with sync=True on a single registered source
    # We choose bbc_tamil (or mock)
    source = source_registry.get_source_by_id("bbc_tamil")
    if source:
        resp = client.post("/api/sources/ingest?source_id=bbc_tamil&sync=true")
        assert resp.status_code == 200
        data = resp.json()
        assert data["sources_processed"] == 1
        assert "total_items_found" in data
        assert "total_new_items_added" in data
        assert isinstance(data["results"], list)

@pytest.mark.asyncio
async def test_job_manager_duplicate_protection():
    mgr = IngestionJobManager()
    # Mock execute job to be slow
    async def mock_execute(job_id, source_id):
        await asyncio.sleep(0.2)

    with patch.object(mgr, "_execute_job", side_effect=mock_execute):
        job1, is_new1 = await mgr.start_job()
        assert is_new1 is True
        assert mgr.is_running() is True

        # Second attempt while running should NOT start a new job
        job2, is_new2 = await mgr.start_job()
        assert is_new2 is False
        assert job2.job_id == job1.job_id

        # Allow background task to complete cleanly
        await asyncio.sleep(0.3)

def test_source_registry_batch_dedup():
    # Verify batch operations work without throwing exceptions
    existing = source_registry.find_existing_articles_batch(
        canonical_urls=["https://tamil.oneindia.com/fake-1", "https://dailythanthi.com/fake-2"],
        source_urls=["https://tamil.oneindia.com/fake-1"],
        publisher_guids=["fake-guid-123"]
    )
    assert isinstance(existing, dict)

    # Touch empty list
    source_registry.touch_articles_seen_batch([])

@pytest.mark.asyncio
async def test_scheduler_lifecycle():
    sched = RSSBackgroundScheduler(interval_seconds=60)
    with patch.dict("os.environ", {"ENABLE_RSS_SCHEDULER": "true", "RSS_POLL_INTERVAL_MINUTES": "15"}):
        await sched.start()
        assert sched._task is not None
        assert not sched._stop_event.is_set()
        await sched.stop()
        assert sched._stop_event.is_set()

@pytest.mark.asyncio
async def test_failed_feed_isolation():
    engine = RSSIngestionEngine()
    fake_sources = [
        {"id": "src_ok", "name": "Source OK", "is_enabled": 1},
        {"id": "src_fail", "name": "Source Fail", "is_enabled": 1},
    ]

    async def mock_ingest(src):
        if src["id"] == "src_fail":
            raise RuntimeError("Connection dropped by remote server")
        return {
            "source_id": src["id"],
            "source_name": src["name"],
            "status": "success",
            "items_found": 5,
            "new_items_added": 2,
            "skipped_duplicates": 3,
            "duration_ms": 100,
            "error": None
        }

    with patch.object(source_registry, "get_all_sources", return_value=fake_sources):
        with patch.object(engine, "ingest_source", side_effect=mock_ingest):
            results = await engine.ingest_all_enabled()
            assert len(results) == 2
            ok_res = next(r for r in results if r["source_id"] == "src_ok")
            fail_res = next(r for r in results if r["source_id"] == "src_fail")
            assert ok_res["status"] == "success"
            assert ok_res["new_items_added"] == 2
            assert fail_res["status"] == "error"
            assert "Connection dropped" in fail_res["error"]

@pytest.mark.asyncio
async def test_job_failure_state_handling():
    mgr = IngestionJobManager()
    with patch.object(rss_engine, "ingest_all_enabled", side_effect=Exception("Database cluster unreachable")):
        job, is_new = await mgr.start_job()
        assert is_new is True
        # Await briefly for background execution to complete
        await asyncio.sleep(0.3)
        updated_job = mgr.get_job(job.job_id)
        assert updated_job is not None
        assert updated_job.status == "failed"
        assert "Database cluster unreachable" in updated_job.error
        assert updated_job.completed_at is not None
        assert not mgr.is_running()

def test_save_articles_batch_duplicate_safety():
    # Insert dummy article and verify duplicate is skipped cleanly
    test_article = {
        "id": "art-test-dup-safety-001",
        "source_id": "news18_tamil",
        "source_name": "News18 Tamil Nadu",
        "title": "Dup Safety Test",
        "tamil_title": "தலைப்பு",
        "summary": "Summary text",
        "tamil_summary": "சுருக்கம்",
        "source_url": "https://example.com/dup-safety-test",
        "canonical_url": "https://example.com/dup-safety-test",
        "publisher_guid": "guid-dup-001",
        "published_at": "2026-10-23T04:00:00+00:00",
        "party_codes": ["DMK"],
        "leader_names": ["M. K. Stalin"],
        "sentiment": "neutral",
        "sentiment_score": 0.0,
        "topics": ["Governance"],
        "tamil_variations": [],
        "engagement_estimated": {"reach": 100},
    }

    # First insert
    inserted1, skipped1 = source_registry.save_articles_batch([test_article])
    assert inserted1 + skipped1 == 1

    # Second insert with same ID and URL
    inserted2, skipped2 = source_registry.save_articles_batch([test_article])
    assert inserted2 == 0
    assert skipped2 == 1

