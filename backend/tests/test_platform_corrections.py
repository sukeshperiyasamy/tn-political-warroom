import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.source_registry import source_registry
from backend.app.connectors.google_trends import (
    GoogleTrendsConnector,
    TN_POLITICAL_KEYWORDS,
    NATIONAL_POLITICAL_RELEVANT_KEYWORDS,
    NON_POLITICAL_DISQUALIFIERS
)

client = TestClient(app)

def test_source_categorization_and_attribution():
    """Verify sources include NEWS_MEDIA and INFLUENCER categories with required attribution."""
    sources = source_registry.get_all_sources()
    assert len(sources) >= 10
    
    # Check categories exist
    news_media_sources = [s for s in sources if s.get("source_type") == "NEWS_MEDIA"]
    influencer_sources = [s for s in sources if s.get("source_type") == "INFLUENCER"]
    
    assert len(news_media_sources) >= 5, "Must have verified news media sources"
    assert len(influencer_sources) >= 4, "Must have political influencer sources"
    
    # Check influencer sources have proper attribution fields
    for inf in influencer_sources:
        assert inf["platform"] in ["youtube", "x", "web", "instagram"]
        assert inf["url"].startswith("http")
        assert inf["category"] is not None

def test_articles_have_source_categorization_and_attribution():
    """Verify that articles returned from API include source_type, source_category, and platform."""
    res = client.get("/api/news?mode=all")
    assert res.status_code == 200
    articles = res.json()
    assert len(articles) > 0
    
    sample = articles[0]
    assert "source" in sample
    assert "source_type" in sample
    assert "source_category" in sample
    assert "platform" in sample
    assert "source_url" in sample
    assert "published_at" in sample

def test_google_trends_political_filtering():
    """Verify Google Trends connector strictly whitelists political topics and drops sports/entertainment."""
    connector = GoogleTrendsConnector()
    
    # Verify keyword sets
    assert "dmk" in TN_POLITICAL_KEYWORDS
    assert "stalin" in TN_POLITICAL_KEYWORDS
    assert "vijay" in TN_POLITICAL_KEYWORDS
    assert "ipl" in NON_POLITICAL_DISQUALIFIERS
    assert "movie review" in NON_POLITICAL_DISQUALIFIERS
    
    # Test strict qualification logic
    # Political headline
    pol_headline = "Tamil Nadu CM M.K. Stalin chairs assembly election strategy committee"
    is_pol, scope = connector._is_tn_politically_relevant(pol_headline, "")
    assert is_pol is True
    assert scope == "Tamil Nadu State Political Trend"
    
    # Non-political headline
    ent_headline = "IPL 2026 match highlights and box office trailer launch"
    is_ent, _ = connector._is_tn_politically_relevant(ent_headline, "cinema")
    assert is_ent is False

def test_editorial_versions_generation_and_finalization():
    """Verify 3 distinct versions generated and finalization persists across requests."""
    # 1. Fetch news articles to pick an article id
    res = client.get("/api/news?mode=all")
    assert res.status_code == 200
    articles = res.json()
    article_id = articles[0]["id"]
    
    # 2. Get editorial versions
    res_versions = client.get(f"/api/news/{article_id}/editorial-versions")
    assert res_versions.status_code == 200
    data = res_versions.json()
    
    assert data["article_id"] == article_id
    assert data["version_1_summary"]["version_type"] == "summary"
    assert "Brief" in data["version_1_summary"]["title"] or len(data["version_1_summary"]["content"]) > 10
    assert data["version_2_detailed"]["version_type"] == "detailed"
    assert data["version_3_social"]["version_type"] == "social"
    assert data["version_3_social"]["hook"] is not None
    
    # 3. Finalize one version (e.g. social version)
    finalize_payload = {
        "final_version_type": "social",
        "final_version_content": data["version_3_social"]["content"] + "\n\n[Approved by Chief Political Strategist]",
        "version_3_social_content": data["version_3_social"]["content"] + "\n\n[Approved by Chief Political Strategist]"
    }
    
    res_finalize = client.post(f"/api/news/{article_id}/editorial-final", json=finalize_payload)
    assert res_finalize.status_code == 200
    fin_data = res_finalize.json()
    assert fin_data["is_finalized"] is True
    assert fin_data["final_version_type"] == "social"
    assert "[Approved by Chief Political Strategist]" in fin_data["final_version_content"]
    
    # 4. Re-fetch editorial versions to verify persistence
    res_reload = client.get(f"/api/news/{article_id}/editorial-versions")
    assert res_reload.status_code == 200
    reloaded_data = res_reload.json()
    assert reloaded_data["is_finalized"] is True
    assert reloaded_data["final_version_type"] == "social"
    assert "[Approved by Chief Political Strategist]" in reloaded_data["final_version_content"]
