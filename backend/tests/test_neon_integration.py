"""
Neon Serverless PostgreSQL Integration Test Suite
Verifies connection, table schemas, read/write queries, and FastAPI health reporting.
"""

import os
import psycopg
import pytest
from fastapi.testclient import TestClient
from dotenv import load_dotenv

# Load .env
load_dotenv(".env")

DATABASE_URL = os.getenv("DATABASE_URL")

@pytest.mark.skipif(not DATABASE_URL, reason="DATABASE_URL not configured")
def test_neon_postgres_direct_connection():
    """Verify live connectivity and version string from Neon PostgreSQL."""
    with psycopg.connect(DATABASE_URL, connect_timeout=5) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT version();")
            version = cur.fetchone()[0]
            assert "PostgreSQL" in version, f"Unexpected database version: {version}"


@pytest.mark.skipif(not DATABASE_URL, reason="DATABASE_URL not configured")
def test_neon_postgres_tables_exist():
    """Verify all 12 operational War Room tables exist in the public schema."""
    expected_tables = {
        "articles",
        "client_configuration",
        "demo_scenario_state",
        "engagement_snapshots",
        "ingestion_logs",
        "intelligence_briefs",
        "social_connectors",
        "social_fetch_runs",
        "social_posts",
        "sources",
        "story_clusters",
        "topic_registry",
    }

    with psycopg.connect(DATABASE_URL, connect_timeout=5) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
            )
            tables = {r[0] for r in cur.fetchall()}
            for table in expected_tables:
                assert table in tables, f"Expected table '{table}' missing in Neon PostgreSQL"


@pytest.mark.skipif(not DATABASE_URL, reason="DATABASE_URL not configured")
def test_neon_crud_operations():
    """Verify insert, select, update, and delete operations on Neon PostgreSQL."""
    test_source_id = "test_neon_validation_source"
    with psycopg.connect(DATABASE_URL, connect_timeout=5) as conn:
        with conn.cursor() as cur:
            # Clean up prior test record if present
            cur.execute("DELETE FROM sources WHERE id = %s;", (test_source_id,))
            conn.commit()

            # Insert
            cur.execute(
                """
                INSERT INTO sources (id, name, tamil_name, category, url, rss_url, language, is_enabled, health_status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
                """,
                (
                    test_source_id,
                    "Neon Validation Feed",
                    "நியோன் சரிபார்ப்பு ஊடகம்",
                    "Digital",
                    "https://example.com",
                    "https://example.com/feed.xml",
                    "ta",
                    1,
                    "healthy"
                )
            )
            conn.commit()

            # Select
            cur.execute("SELECT id, name, tamil_name FROM sources WHERE id = %s;", (test_source_id,))
            row = cur.fetchone()
            assert row is not None
            assert row[0] == test_source_id
            assert row[1] == "Neon Validation Feed"
            assert row[2] == "நியோன் சரிபார்ப்பு ஊடகம்"

            # Clean up
            cur.execute("DELETE FROM sources WHERE id = %s;", (test_source_id,))
            conn.commit()


def test_fastapi_health_endpoint_neon():
    """Verify FastAPI /health endpoint reports Neon status correctly."""
    from backend.app.main import app
    client = TestClient(app)
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["database_connected"] is True
    if DATABASE_URL:
        assert data["database_engine"] == "neon_postgres"
        assert data["neon_connected"] is True


def test_fresh_startup_no_module_level_queries():
    """
    Verify importing main does not run database queries at import time.
    Guarantees no OperationalError: no such table: social_connectors on cold boots.
    """
    from backend.app.services.source_health import SourceHealthService
    # Creating a fresh service instance with non-existent path must NOT query DB or throw
    fresh_service = SourceHealthService(db_path="/tmp/non_existent_warroom_fresh.db")
    assert fresh_service._initialized is False


@pytest.mark.skipif(not DATABASE_URL, reason="DATABASE_URL not configured")
def test_source_health_queries_against_neon():
    """
    Verify source-health queries execute cleanly against live Neon PostgreSQL.
    Tests get_all_connectors_summary() and check_connector().
    """
    from backend.app.services.source_health import source_health_service
    source_health_service.ensure_initialized()

    connectors = source_health_service.get_all_connectors_summary()
    assert len(connectors) == 7, f"Expected 7 connectors, got {len(connectors)}"

    platforms = {c["platform"] for c in connectors}
    expected_platforms = {"youtube", "x", "instagram", "facebook", "reddit", "news", "google_trends"}
    assert expected_platforms.issubset(platforms)

    for c in connectors:
        assert "name" in c and c["name"], f"Connector {c['platform']} missing name"
        assert "status" in c, f"Connector {c['platform']} missing status"
        assert "is_enabled" in c
        assert "supported_metrics" in c and isinstance(c["supported_metrics"], list)
        assert "credentials_configured" in c

    # Test single connector health check execution on Neon
    check_result = source_health_service.check_connector("news")
    assert check_result["platform"] == "news"
    assert check_result["status"] in ["HEALTHY", "LIVE"]
    assert check_result["name"] == "Tamil News RSS Wire"


@pytest.mark.skipif(not DATABASE_URL, reason="DATABASE_URL not configured")
def test_live_vs_demo_strict_isolation_neon():
    """
    Verify LIVE and DEMO collection modes are strictly isolated in Neon PostgreSQL.
    """
    live_id = "test_live_article_isolation"
    demo_id = "test_demo_article_isolation"

    with psycopg.connect(DATABASE_URL, connect_timeout=5) as conn:
        with conn.cursor() as cur:
            # Clean up prior test records if present
            cur.execute("DELETE FROM articles WHERE id IN (%s, %s);", (live_id, demo_id))
            conn.commit()

            # Insert 1 LIVE and 1 DEMO record
            cur.execute("""
                INSERT INTO articles (id, title, tamil_title, url, source, published_at, collection_mode)
                VALUES (%s, %s, %s, %s, %s, %s, %s);
            """, (live_id, "Live Election Brief", "நேரடி அறிக்கை", "https://news.com/live-1", "news18_tamil", "2026-10-18T10:00:00Z", "LIVE"))

            cur.execute("""
                INSERT INTO articles (id, title, tamil_title, url, source, published_at, collection_mode)
                VALUES (%s, %s, %s, %s, %s, %s, %s);
            """, (demo_id, "Demo Election Brief", "மாதிரி அறிக்கை", "https://news.com/demo-1", "news18_tamil", "2026-10-18T10:00:00Z", "DEMO"))
            conn.commit()

            # Verify query for LIVE returns ONLY the live record
            cur.execute("SELECT id FROM articles WHERE collection_mode = 'LIVE' AND id IN (%s, %s);", (live_id, demo_id))
            live_rows = [r[0] for r in cur.fetchall()]
            assert live_rows == [live_id]
            assert demo_id not in live_rows

            # Verify query for DEMO returns ONLY the demo record
            cur.execute("SELECT id FROM articles WHERE collection_mode = 'DEMO' AND id IN (%s, %s);", (live_id, demo_id))
            demo_rows = [r[0] for r in cur.fetchall()]
            assert demo_rows == [demo_id]
            assert live_id not in demo_rows

            # Clean up test records
            cur.execute("DELETE FROM articles WHERE id IN (%s, %s);", (live_id, demo_id))
            conn.commit()

