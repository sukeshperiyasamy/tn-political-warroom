import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_check():
    # Verify GET
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "tn-political-warroom-backend"

    # Verify HEAD (used by uptime monitors like Better Stack, Pingdom, StatusCake)
    head_resp = client.head("/api/health")
    assert head_resp.status_code == 200

def test_get_news_all():
    response = client.get("/api/news")
    assert response.status_code == 200
    articles = response.json()
    assert len(articles) > 0
    assert "tamil_title" in articles[0]
    assert "tamil_variations" in articles[0]

def test_news_filtering_by_party():
    response = client.get("/api/news?party=DMK")
    assert response.status_code == 200
    articles = response.json()
    assert len(articles) > 0
    for a in articles:
        assert "DMK" in a["party_codes"]

def test_dashboard_metrics():
    response = client.get("/api/metrics")
    assert response.status_code == 200
    metrics = response.json()
    assert metrics["total_articles"] > 0
    assert "sentiment_distribution" in metrics
    sentiment = metrics["sentiment_distribution"]
    assert sentiment["positive"] + sentiment["neutral"] + sentiment["negative"] == metrics["filtered_articles"]

def test_entity_comparison():
    payload = {
        "entity_type": "party",
        "entity_ids": ["DMK", "AIADMK"]
    }
    response = client.post("/api/compare", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["comparison"]) == 2
    assert data["comparison"][0]["id"] == "DMK"
    assert data["comparison"][1]["id"] == "AIADMK"

def test_ai_intelligence_analysis():
    payload = {
        "headline": "களத்தில் இறங்கும் விஜய்: 2026 தேர்தல் பிரச்சார தொடக்கம்",
        "text": "தமிழக வெற்றிக் கழக தலைவர் விஜய் இளைஞர்களை திரட்டி பிரம்மாண்ட கூட்டத்தை நடத்தினார்."
    }
    response = client.post("/api/intelligence/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "TVK" in data["identified_parties"]
    assert len(data["tamil_variations"]) == 3
    assert data["tamil_summary"] != ""
