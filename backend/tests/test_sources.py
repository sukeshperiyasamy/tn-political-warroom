import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_get_sources_registry():
    res = client.get("/api/sources")
    assert res.status_code == 200
    sources = res.json()
    assert len(sources) >= 7
    # Verify expected default Tamil sources are registered
    source_ids = [s["id"] for s in sources]
    assert "news18_tamil" in source_ids
    assert "polimer_news" in source_ids
    assert "oneindia_tamil" in source_ids
    assert "bbc_tamil" in source_ids
    assert "the_hindu_tn" in source_ids

def test_toggle_source_status():
    # Toggle bbc_tamil
    res_before = client.get("/api/sources")
    bbc_before = next(s for s in res_before.json() if s["id"] == "bbc_tamil")
    initial_enabled = bbc_before["is_enabled"]

    res_toggle = client.post("/api/sources/bbc_tamil/toggle")
    assert res_toggle.status_code == 200
    bbc_after = res_toggle.json()
    assert bbc_after["is_enabled"] != initial_enabled

    # Toggle back to restore initial state
    res_restore = client.post("/api/sources/bbc_tamil/toggle")
    assert res_restore.status_code == 200
    assert res_restore.json()["is_enabled"] == initial_enabled

def test_test_registered_source():
    # Test polimer_news
    res = client.post("/api/sources/polimer_news/test")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["items_count"] > 0
    assert len(data["sample_items"]) > 0

def test_live_vs_demo_mode():
    # Live mode news
    res_live = client.get("/api/news?mode=live")
    assert res_live.status_code == 200
    live_arts = res_live.json()
    assert len(live_arts) > 0
    assert any(a["data_status"] == "live_rss" for a in live_arts)

    # Demo mode news
    res_demo = client.get("/api/news?mode=demo")
    assert res_demo.status_code == 200
    demo_arts = res_demo.json()
    assert len(demo_arts) == 8
    assert all(a["data_status"] == "seeded_demo" for a in demo_arts)

def test_live_metrics_disclaimer():
    res_live = client.get("/api/metrics?mode=live")
    assert res_live.status_code == 200
    m_live = res_live.json()
    assert "Tamil media intelligence stream" in m_live["disclaimer"]
    assert "Periodic 15-minute RSS polling" in m_live["disclaimer"]

    res_demo = client.get("/api/metrics?mode=demo")
    assert res_demo.status_code == 200
    m_demo = res_demo.json()
    assert "Curated benchmark dataset" in m_demo["disclaimer"]

def test_ingestion_logs():
    res = client.get("/api/sources/logs")
    assert res.status_code == 200
    logs = res.json()
    assert isinstance(logs, list)
    if len(logs) > 0:
        assert "source_name" in logs[0]
        assert "status" in logs[0]
