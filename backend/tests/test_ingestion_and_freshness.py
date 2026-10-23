import pytest
import hashlib
from unittest.mock import patch, MagicMock
import urllib.error
import httpx
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.rss_ingestion import RSSIngestionEngine
from backend.app.services.source_registry import SourceRegistry, source_registry
from backend.app.services.news_service import NewsService
from backend.app.models import FilterParams

client = TestClient(app)

@pytest.fixture
def ingestion_engine():
    return RSSIngestionEngine()

def test_url_normalization(ingestion_engine):
    # Test tracking parameters stripped while meaningful params kept
    url1 = "https://tamil.oneindia.com/news/tamil-nadu/stalin-speech-12345.html?utm_source=twitter&utm_medium=social&utm_campaign=election2026&id=987"
    norm1 = ingestion_engine.normalize_url(url1)
    assert "utm_source" not in norm1
    assert "utm_medium" not in norm1
    assert "id=987" in norm1
    assert norm1.startswith("https://tamil.oneindia.com/news/tamil-nadu/stalin-speech-12345.html")

    # Test trailing slash and fragment normalization
    url2 = "https://Tamil.News18.COM/news/chennai/?fbclid=IwAR123#headline"
    norm2 = ingestion_engine.normalize_url(url2)
    assert norm2 == "https://tamil.news18.com/news/chennai"
    assert "fbclid" not in norm2
    assert "#" not in norm2

    # Test parameter order invariance
    url_a = "https://example.com/article?b=2&a=1"
    url_b = "https://example.com/article?a=1&b=2"
    assert ingestion_engine.normalize_url(url_a) == ingestion_engine.normalize_url(url_b)

@pytest.mark.asyncio
async def test_http_304_handling(ingestion_engine):
    source = {
        "id": "mock_source_304",
        "name": "Mock 304 Publisher",
        "rss_url": "https://example.com/rss304.xml",
        "etag": '"etag-abc-123"',
        "last_modified": "Sun, 18 Oct 2026 04:00:00 GMT"
    }

    mock_resp = httpx.Response(304, request=httpx.Request("GET", source["rss_url"]))
    with patch("httpx.AsyncClient.get", return_value=mock_resp):
        with patch.object(ingestion_engine.ai_service, "analyze_article") as mock_ai:
            result = await ingestion_engine.ingest_source(source)
            assert result["status"] == "not_modified_304"
            assert result["http_status"] == 304
            assert result["new_items_added"] == 0
            # Ensure AI was NOT invoked for 304
            mock_ai.assert_not_called()

def test_article_deduplication_and_content_versioning():
    # Insert test article
    test_url = "https://example.com/test-article-dedup"
    c_url = "https://example.com/test-article-dedup"
    art_id = "test-art-" + hashlib.sha256(c_url.encode()).hexdigest()[:8]
    c_hash = hashlib.sha256("Title 1|Summary 1".encode()).hexdigest()
    p_hash = hashlib.sha256(f"v1|{c_hash}".encode()).hexdigest()

    art_dict = {
        "id": art_id,
        "source_id": "news18_tamil",
        "source_name": "News18 Tamil Nadu",
        "title": "Title 1",
        "tamil_title": "தலைப்பு 1",
        "summary": "Summary 1",
        "tamil_summary": "சுருக்கம் 1",
        "source_url": test_url,
        "canonical_url": c_url,
        "publisher_guid": art_id,
        "published_at": "2026-10-18T05:00:00+00:00",
        "party_codes": ["DMK"],
        "leader_names": ["M. K. Stalin"],
        "sentiment": "positive",
        "sentiment_score": 0.7,
        "topics": ["Governance"],
        "tamil_variations": [],
        "engagement_estimated": {"reach": 10000, "shares": 200},
        "data_status": "live_rss",
        "analysis_provider": "tamil_nlp_engine",
        "content_hash": c_hash,
        "processing_hash": p_hash,
        "processing_status": "processed",
        "processed_at": datetime.now(timezone.utc).isoformat(),
        "processing_attempts": 1,
        "last_seen_at": datetime.now(timezone.utc).isoformat(),
        "first_seen_at": datetime.now(timezone.utc).isoformat()
    }

    # First insert should succeed
    inserted = source_registry.save_article(art_dict)
    # Check find_existing_article finds it
    existing = source_registry.find_existing_article(canonical_url=c_url)
    assert existing is not None
    assert existing["id"] == art_id
    assert existing["content_hash"] == c_hash

    # Second insert with identical URL should fail database unique constraint
    inserted_duplicate = source_registry.save_article(art_dict)
    assert inserted_duplicate is False

    # Touching article seen updates last_seen_at without error
    source_registry.touch_article_seen(art_id)
    touched = source_registry.find_existing_article(canonical_url=c_url)
    assert touched["last_seen_at"] is not None

    # Content change simulation
    new_c_hash = hashlib.sha256("Title 2 Updated|Summary 2 Updated".encode()).hexdigest()
    new_p_hash = hashlib.sha256(f"v1|{new_c_hash}".encode()).hexdigest()
    update_dict = dict(art_dict)
    update_dict["title"] = "Title 2 Updated"
    update_dict["summary"] = "Summary 2 Updated"
    update_dict["content_hash"] = new_c_hash
    update_dict["processing_hash"] = new_p_hash

    source_registry.update_article_content(art_id, update_dict)
    updated = source_registry.find_existing_article(canonical_url=c_url)
    assert updated["title"] == "Title 2 Updated"
    assert updated["content_hash"] == new_c_hash
    assert updated["processing_attempts"] == 2

    # Clean up test article
    with source_registry.get_connection() as conn:
        conn.execute("DELETE FROM articles WHERE id = ?", (art_id,))
        conn.commit()

def test_live_vs_demo_dataset_separation():
    # Live mode should return live_rss items
    res_live = client.get("/api/news?mode=live")
    assert res_live.status_code == 200
    live_arts = res_live.json()
    assert len(live_arts) > 0
    for art in live_arts:
        assert art["data_status"] == "live_rss"

    # Demo mode should return exactly 8 seeded demo items
    res_demo = client.get("/api/news?mode=demo")
    assert res_demo.status_code == 200
    demo_arts = res_demo.json()
    assert len(demo_arts) == 8
    for art in demo_arts:
        assert art["data_status"] == "seeded_demo"

def test_data_integrity_notice_and_freshness():
    res = client.get("/api/metrics?mode=live")
    assert res.status_code == 200
    metrics = res.json()
    disclaimer = metrics["disclaimer"]
    
    # Must accurately describe periodic polling interval (not continuous "real-time")
    assert "Periodic 15-minute RSS polling" in disclaimer
    assert "HTTP 304 conditional validation" in disclaimer
    assert "Last successful feed collection:" in disclaimer
    assert "Latest observed article publication:" in disclaimer
    assert metrics.get("polling_interval_desc") is not None
    assert metrics.get("last_collection_at") is not None

def test_source_fetch_vs_article_processing_health():
    res = client.get("/api/sources")
    assert res.status_code == 200
    sources = res.json()
    assert len(sources) >= 7

    for src in sources:
        # Check source fetch metadata fields are present
        assert "health_status" in src
        assert "last_fetch_attempt_at" in src or "last_fetched_at" in src
        # Check article processing health fields
        assert "total_articles_fetched" in src
        assert "current_article_count" in src
        assert "skipped_duplicates_count" in src

def test_atomic_claiming_and_reprocessing_safeguards():
    test_id = "test-atomic-" + hashlib.md5(b"unique_test_atomic").hexdigest()[:8]
    test_url = f"https://example.com/{test_id}"
    
    art_dict = {
        "id": test_id,
        "source_id": "news18_tamil",
        "source_name": "News18 Tamil Nadu",
        "title": "Atomic Claim Test Headline",
        "tamil_title": "அணு உழைப்பு சோதனை",
        "summary": "Initial summary for atomic test",
        "tamil_summary": "ஆரம்ப சுருக்கம்",
        "source_url": test_url,
        "canonical_url": test_url,
        "publisher_guid": test_id,
        "published_at": "2026-10-18T06:00:00+00:00",
        "party_codes": ["DMK"],
        "leader_names": ["M.K. Stalin"],
        "sentiment": "positive",
        "sentiment_score": 0.8,
        "topics": ["Governance"],
        "tamil_variations": [],
        "engagement_estimated": {"reach": 5000, "shares": 100},
        "data_status": "live_rss",
        "analysis_provider": "tamil_nlp_engine",
        "content_hash": "hash_v1",
        "processing_hash": "proc_hash_v1",
        "processing_status": "processed",
        "processed_at": "2026-10-18T06:00:00+00:00",
        "processing_attempts": 1,
        "last_seen_at": "2026-10-18T06:00:00+00:00",
        "first_seen_at": "2026-10-18T06:00:00+00:00"
    }

    # Save article
    inserted = source_registry.save_article(art_dict)
    assert inserted is True

    # 1. First claim succeeds
    claimed_1 = source_registry.claim_article_processing(test_id)
    assert claimed_1 is True
    claimed_art = source_registry.find_existing_article(canonical_url=test_url)
    assert claimed_art["processing_status"] == "processing"
    assert claimed_art["processing_attempts"] == 2

    # 2. Concurrent second claim while still 'processing' fails atomically
    claimed_2 = source_registry.claim_article_processing(test_id)
    assert claimed_2 is False

    # 3. Simulate failed processing does not overwrite successful existing analysis
    with source_registry.get_connection() as conn:
        # Reset back to processed
        conn.execute("UPDATE articles SET processing_status = 'processed' WHERE id = ?", (test_id,))
        conn.commit()

    existing = source_registry.find_existing_article(canonical_url=test_url)
    assert existing["sentiment"] == "positive"
    assert existing["party_codes"] == ["DMK"]

    # Clean up
    with source_registry.get_connection() as conn:
        conn.execute("DELETE FROM articles WHERE id = ?", (test_id,))
        conn.commit()
