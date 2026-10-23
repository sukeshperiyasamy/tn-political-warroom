import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.rss_scheduler import RSSBackgroundScheduler

client = TestClient(app)

def test_news_updates_baseline():
    """Verify GET /api/news/updates returns server_time, cursor, count, and articles."""
    response = client.get("/api/news/updates")
    assert response.status_code == 200
    data = response.json()
    assert "server_time" in data
    assert "cursor" in data
    assert "count" in data
    assert "articles" in data
    assert isinstance(data["articles"], list)
    assert data["count"] == len(data["articles"])

def test_news_updates_future_timestamp_returns_empty():
    """Verify that querying with a future timestamp returns zero articles and a new cursor."""
    future_time = (datetime.now(timezone.utc) + timedelta(days=365)).isoformat()
    response = client.get(f"/api/news/updates?since={future_time}")
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 0
    assert data["articles"] == []
    assert data["cursor"] is not None

def test_news_updates_past_timestamp_returns_articles():
    """Verify that querying with a past timestamp returns articles created/processed since then."""
    past_time = "2020-01-01T00:00:00+00:00"
    response = client.get(f"/api/news/updates?since={past_time}&limit=10")
    assert response.status_code == 200
    data = response.json()
    assert data["count"] > 0
    assert len(data["articles"]) <= 10

def test_news_updates_with_party_filter():
    """Verify that party filtering works on incremental updates."""
    past_time = "2020-01-01T00:00:00+00:00"
    response = client.get(f"/api/news/updates?since={past_time}&party=DMK&limit=10")
    assert response.status_code == 200
    data = response.json()
    for art in data["articles"]:
        assert "DMK" in art["party_codes"]

def test_rss_scheduler_default_five_minutes():
    """Verify RSSBackgroundScheduler defaults to 5-minute interval."""
    scheduler = RSSBackgroundScheduler()
    assert scheduler.interval_seconds == 5 * 60
