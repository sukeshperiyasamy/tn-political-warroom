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
                    "https://neon.tech",
                    "https://neon.tech/feed.xml",
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
