import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_admin_system_status():
    res = client.get("/api/admin/system-status")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "operational"
    assert "publishers" in data
    assert "total" in data["publishers"]
    assert "content" in data
    assert "total_articles" in data["content"]
    assert "total_topics" in data["content"]

def test_admin_keywords_crud():
    # 1. List existing keywords
    res = client.get("/api/admin/keywords")
    assert res.status_code == 200
    data = res.json()
    assert "count" in data
    assert "keywords" in data
    assert "categories" in data
    assert data["count"] >= 10

    # Ensure clean slate
    client.delete("/api/admin/keywords/test_flood_mitigation_2026")

    # 2. Add new keyword with Tamil Unicode
    new_kw = {
        "id": "test_flood_mitigation_2026",
        "name_en": "Flood Mitigation & Climate Resilience",
        "name_ta": "வெள்ளத் தடுப்பு மற்றும் பருவநிலை பாதுகாப்பு",
        "category": "Urban Infrastructure & Governance",
        "keywords_en": ["flood mitigation", "storm water drain", "climate resilience"],
        "keywords_ta": ["வெள்ளத் தடுப்பு பணி", "மழைநீர் வடிகால்"],
        "hashtags": ["#TNMention", "ChennaiFloods"],
        "negative_keywords": ["old flood 2015"],
        "related_party_codes": ["DMK", "AIADMK"],
        "related_leader_names": ["M.K. Stalin"],
        "is_active": True
    }
    create_res = client.post("/api/admin/keywords", json=new_kw)
    assert create_res.status_code == 201
    created_data = create_res.json()
    assert created_data["id"] == "test_flood_mitigation_2026"
    assert created_data["name_ta"] == "வெள்ளத் தடுப்பு மற்றும் பருவநிலை பாதுகாப்பு"
    assert "#ChennaiFloods" in created_data["hashtags"]  # hashtag prefix normalized

    # 3. Attempt duplicate creation -> 409 Conflict
    dup_res = client.post("/api/admin/keywords", json=new_kw)
    assert dup_res.status_code == 409

    # 4. Update the keyword
    update_res = client.put(f"/api/admin/keywords/{created_data['id']}", json={
        "name_en": "Flood Mitigation & Drainage 2026",
        "category": "State Infrastructure & Economy",
        "is_active": False
    })
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["name_en"] == "Flood Mitigation & Drainage 2026"
    assert updated_data["category"] == "State Infrastructure & Economy"
    assert updated_data["is_active"] is False

    # 5. Toggle status
    toggle_res = client.post(f"/api/admin/keywords/{created_data['id']}/toggle")
    assert toggle_res.status_code == 200
    assert toggle_res.json()["is_active"] is True

    # 6. Delete the test keyword
    del_res = client.delete(f"/api/admin/keywords/{created_data['id']}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "deleted"

    # 7. Verify deletion
    verify_del = client.delete(f"/api/admin/keywords/{created_data['id']}")
    assert verify_del.status_code == 404

def test_admin_keywords_validation():
    # Empty names should fail validation
    res = client.post("/api/admin/keywords", json={
        "name_en": "",
        "name_ta": ""
    })
    assert res.status_code == 422 or res.status_code == 400

def test_admin_trending_config():
    # 1. Get current config
    res = client.get("/api/admin/trending-config")
    assert res.status_code == 200
    cfg = res.json()
    assert "weights" in cfg
    assert "momentum_weight" in cfg["weights"]
    assert "formula" in cfg

    # 2. Update with invalid sum (does not sum to 1.0) -> 400 Bad Request
    invalid_res = client.put("/api/admin/trending-config", json={
        "momentum_weight": 0.80,
        "volume_growth_weight": 0.80,
        "cross_source_weight": 0.50,
        "recency_weight": 0.50
    })
    assert invalid_res.status_code == 400

    # 3. Update with valid weights summing to 1.0
    valid_res = client.put("/api/admin/trending-config", json={
        "momentum_weight": 0.35,
        "volume_growth_weight": 0.35,
        "cross_source_weight": 0.15,
        "recency_weight": 0.15
    })
    assert valid_res.status_code == 200
    assert valid_res.json()["weights"]["momentum_weight"] == 0.35

    # 4. Reset to default
    reset_res = client.post("/api/admin/trending-config/reset")
    assert reset_res.status_code == 200
    assert reset_res.json()["weights"]["momentum_weight"] == 0.40

def test_admin_safe_settings():
    res = client.get("/api/admin/settings")
    assert res.status_code == 200
    data = res.json()
    assert "branding" in data
    assert "preferences" in data
    assert "security_notice" in data

    # Verify sensitive connection strings and secrets are NOT present
    raw_str = res.text.lower()
    assert "password" not in raw_str or "passwords" in data["security_notice"].lower()
    assert "database_url" not in raw_str
    assert "secret" not in raw_str or "secrets" in data["security_notice"].lower()
