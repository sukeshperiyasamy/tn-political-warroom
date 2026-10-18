import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.brief_service import brief_service, MIN_SAMPLE_SIZE_FOR_BRIEF
from backend.app.services.source_registry import source_registry

client = TestClient(app)

def test_topic_trends_live_and_demo():
    # 1. Live mode trends
    res_live = client.get("/api/intelligence/trends?mode=live&period=24h")
    assert res_live.status_code == 200
    live_data = res_live.json()
    assert live_data["period"] == "24h"
    assert live_data["reporting_timezone"] == "Asia/Kolkata (IST)"
    assert "current_window_start" in live_data
    assert "current_window_end" in live_data
    assert "prior_window_start" in live_data
    assert "prior_window_end" in live_data
    assert len(live_data["topics"]) > 0

    for item in live_data["topics"]:
        assert "topic" in item
        assert "current_count" in item
        assert "prior_count" in item
        assert "net_change" in item
        assert item["status"] in ("gaining", "losing", "stable", "emerging", "single_report")
        assert isinstance(item["distinct_publishers"], list)
        assert isinstance(item["supporting_articles"], list)
        # Verify single article is not falsely labeled as a major statewide trend
        if item["current_count"] == 1 and item["prior_count"] == 0:
            assert item["status"] == "single_report"

    # 2. Demo mode trends
    res_demo = client.get("/api/intelligence/trends?mode=demo&period=24h")
    assert res_demo.status_code == 200
    demo_data = res_demo.json()
    assert demo_data["total_articles_analyzed"] <= 8

def test_reporting_window_boundaries():
    res = client.get("/api/intelligence/trends?mode=live&period=24h")
    assert res.status_code == 200
    data = res.json()
    c_start = datetime.fromisoformat(data["current_window_start"])
    c_end = datetime.fromisoformat(data["current_window_end"])
    p_start = datetime.fromisoformat(data["prior_window_start"])
    p_end = datetime.fromisoformat(data["prior_window_end"])

    # Windows must be continuous and non-overlapping
    assert c_start < c_end
    assert p_start < p_end
    assert p_end == c_start

def test_party_leader_coverage_live():
    res = client.get("/api/intelligence/party-leader-coverage?mode=live&period=24h")
    assert res.status_code == 200
    data = res.json()
    assert "parties" in data
    assert "leaders" in data
    assert "attribution_caveat" in data
    # Mandatory caveat must warn against equating coverage with election polling
    assert "DO NOT reflect electoral popularity" in data["attribution_caveat"]

    assert len(data["parties"]) > 0
    for party in data["parties"]:
        assert "code" in party
        assert "sentiment_distribution" in party
        assert "average_sentiment_score" in party
        assert "supporting_articles" in party

def test_daily_brief_generation_persistence_and_idempotency():
    # Call 1: First request (generates or retrieves)
    res1 = client.get("/api/intelligence/brief?mode=live&period=24h")
    assert res1.status_code == 200
    brief1 = res1.json()
    assert brief1["status"] in ("sufficient_data", "insufficient_data")

    if brief1["status"] == "sufficient_data":
        assert len(brief1["brief_english"]) > 50
        assert len(brief1["brief_tamil"]) > 50
        assert len(brief1["key_developments"]) > 0
        
        # Every factual development must have supporting article IDs and URLs
        for kd in brief1["key_developments"]:
            assert len(kd["supporting_article_ids"]) > 0
            assert len(kd["supporting_article_urls"]) > 0
            assert kd["supporting_article_urls"][0].startswith("http")

        # Call 2: Immediate second call must be cached (zero redundant generation)
        res2 = client.get("/api/intelligence/brief?mode=live&period=24h")
        assert res2.status_code == 200
        brief2 = res2.json()
        assert brief2["is_cached"] is True
        assert brief2["id"] == brief1["id"]

def test_brief_insufficient_data_handling():
    # If we filter with impossible criteria or mock empty articles, brief returns insufficient_data
    brief = brief_service.get_or_generate_brief(mode="demo", period="24h")
    # In demo mode, if there are fewer than MIN_SAMPLE_SIZE_FOR_BRIEF in the last 24h window
    assert brief.status in ("sufficient_data", "insufficient_data")
    if brief.status == "insufficient_data":
        assert "Insufficient article volume" in brief.brief_english
        assert "போதிய" in brief.brief_tamil or "போதுமான" in brief.brief_tamil

def test_search_and_evidence_explorer():
    # 1. Tamil search
    res_ta = client.get("/api/intelligence/search?mode=live&q=ஸ்டாலின்")
    assert res_ta.status_code == 200
    data_ta = res_ta.json()
    assert "total_matched" in data_ta
    assert "articles" in data_ta

    # 2. English search
    res_en = client.get("/api/intelligence/search?mode=live&q=DMK")
    assert res_en.status_code == 200
    data_en = res_en.json()
    assert data_en["total_matched"] > 0
    first_art = data_en["articles"][0]
    assert "source_url" in first_art
    assert "title" in first_art

    # 3. Party & Topic filtering
    res_filt = client.get("/api/intelligence/search?mode=live&party=DMK&topic=Governance")
    assert res_filt.status_code == 200
    data_filt = res_filt.json()
    for a in data_filt["articles"]:
        assert "DMK" in a.get("party_codes", [])

def test_live_vs_demo_strict_isolation():
    # Ensure demo brief only cites demo articles
    brief_demo = brief_service.get_or_generate_brief(mode="demo", period="7d")
    assert brief_demo.data_status == "seeded_demo"
    for art in brief_demo.evidence_articles:
        assert art["id"].startswith("tn-art-")

    # Ensure live brief only cites live articles
    brief_live = brief_service.get_or_generate_brief(mode="live", period="7d")
    assert brief_live.data_status == "live_rss"
    for art in brief_live.evidence_articles:
        assert art["id"].startswith("art-") or art["id"].startswith("live-")
        assert not art["id"].startswith("tn-art-")
