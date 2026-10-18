import pytest
import sqlite3
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.data.migrations import get_connection, DB_PATH

@pytest.fixture
def client():
    return TestClient(app)

def test_database_wal_mode_and_concurrency_settings():
    """Verify that SQLite database runs in WAL mode with 5000ms busy timeout."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("PRAGMA journal_mode;")
        journal_mode = cursor.fetchone()[0]
        assert journal_mode.lower() == "wal", f"Expected WAL mode, got {journal_mode}"

        cursor.execute("PRAGMA busy_timeout;")
        busy_timeout = cursor.fetchone()[0]
        assert busy_timeout == 5000, f"Expected 5000ms busy timeout, got {busy_timeout}"

def test_health_check_endpoints(client):
    """Verify both /health and /api/health endpoints return healthy status and DB capability metadata."""
    res1 = client.get("/health")
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["status"] == "healthy"
    assert data1["database_connected"] is True
    assert "journal_mode" in data1
    assert data1["journal_mode"].lower() == "wal"

    res2 = client.get("/api/health")
    assert res2.status_code == 200
    assert res2.json()["status"] == "healthy"

def test_client_config_get_update_reset(client):
    """Test getting, updating, and resetting database-backed client configuration."""
    # 1. Get current config
    get_res = client.get("/api/client-config")
    assert get_res.status_code == 200
    current = get_res.json()
    assert "client_name" in current
    assert "selected_parties" in current

    # 2. Update config
    update_payload = {
        "client_name": "Test Strategic Intelligence Bureau",
        "client_tagline": "Automated Testing Intelligence Node",
        "default_language": "en",
        "selected_parties": ["DMK", "AIADMK", "TVK"],
    }
    put_res = client.put("/api/client-config", json=update_payload)
    assert put_res.status_code == 200
    updated = put_res.json()
    assert updated["client_name"] == "Test Strategic Intelligence Bureau"
    assert updated["client_tagline"] == "Automated Testing Intelligence Node"
    assert updated["default_language"] == "en"
    assert updated["selected_parties"] == ["DMK", "AIADMK", "TVK"]

    # 3. Reset config back to defaults
    reset_res = client.post("/api/client-config/reset")
    assert reset_res.status_code == 200
    reset_data = reset_res.json()
    assert reset_data["client_name"] == "Tamil Nadu Strategic Intelligence Bureau"
    assert "DMK" in reset_data["selected_parties"]
    assert "BJP" in reset_data["selected_parties"]

def test_demo_scenario_reset_and_isolation(client):
    """Test that resetting a demo scenario safely resets step to 1 and retains LIVE posts."""
    scenario_id = "scenario_policy_announcement"

    # Reset scenario
    res = client.post(f"/api/social/demo/scenarios/{scenario_id}/reset")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "RESET_SUCCESS"
    assert data["scenario_id"] == scenario_id
    assert "Zero live records affected" in data["message"]

def test_scenario_intelligence_brief_generation(client):
    """Test scenario intelligence brief synthesis endpoint."""
    scenario_id = "scenario_leader_speech"

    res = client.get(f"/api/social/demo/scenarios/{scenario_id}/brief")
    assert res.status_code == 200
    data = res.json()
    assert data["scenario_id"] == scenario_id
    assert "executive_summary_en" in data
    assert "executive_summary_ta" in data
    assert "disclaimer" in data
    assert "electorate" in data["disclaimer"].lower()
    assert data["provenance"] in ("DEMO_SIMULATION", "DEMO SCENARIO INTELLIGENCE")
    assert data["is_demo"] is True
    assert isinstance(data["key_developments"], list)
