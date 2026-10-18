import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.entity_matcher import entity_matcher
from backend.app.services.demo_scenarios import demo_scenario_engine
from backend.app.services.social_scheduler import social_scheduler
from backend.app.services.trend_engine import trend_engine
from backend.app.services.deduplicator import story_clustering_service

client = TestClient(app)

def test_entity_matcher_tamil_acronym_disambiguation():
    # DMK should not falsely match in AIADMK or MDMK text
    res = entity_matcher.match_entities("அதிமுக பொதுச்செயலாளர் இபிஎஸ் தலைமையில் ஆலோசனை கூட்டம்")
    assert "AIADMK" in res["party_codes"]
    assert "DMK" not in res["party_codes"], "False positive: DMK matched inside அதிமுக!"
    assert "Edappadi K. Palaniswami" in res["leader_names"]

    # DMK should match when standalone or in coalition context
    res2 = entity_matcher.match_entities("திமுக தலைவர் முதல்வர் மு.க.ஸ்டாலின் உரை")
    assert "DMK" in res2["party_codes"]
    assert "M.K. Stalin" in res2["leader_names"]

def test_entity_matcher_negative_exclusions():
    # Thalapathy Vijay should not match on cinema/box-office only text
    res_cinema = entity_matcher.match_entities("New movie box office trailer release audio launch record")
    assert "Thalapathy Vijay" not in res_cinema["leader_names"]

    # Thalapathy Vijay SHOULD match when political keywords exist
    res_politics = entity_matcher.match_entities("விக்கிரவாண்டி தவெக மாநாட்டில் விஜய் 2026 சட்டமன்ற தேர்தல் நிலைப்பாடு அறிவிப்பு")
    assert "Thalapathy Vijay" in res_politics["leader_names"]
    assert "TVK" in res_politics["party_codes"]

def test_entity_matcher_word_boundaries_short_tokens():
    # "steps" should not match "eps"
    res_steps = entity_matcher.match_entities("The government is taking important steps for industrial expansion")
    assert "Edappadi K. Palaniswami" not in res_steps["leader_names"]
    assert "AIADMK" not in res_steps["party_codes"]

def test_entity_matcher_rich_matched_entities():
    res = entity_matcher.match_entities("மு.க.ஸ்டாலின் தலைமையில் மகளிர் உரிமைத் தொகை திட்டம்")
    assert "matched_entities" in res
    assert len(res["matched_entities"]) >= 2
    types = [e["entity_type"] for e in res["matched_entities"]]
    assert "leader" in types
    assert "topic" in types
    for e in res["matched_entities"]:
        assert "confidence" in e and e["confidence"] > 0.70
        assert "evidence" in e and len(e["evidence"]) > 0

def test_popular_posts_ranking_dimensions():
    # Verify all 6 ranking types execute cleanly and return valid payloads
    rankings = ["trending", "most_discussed", "most_liked", "most_shared", "fastest_growing", "recent"]
    for r in rankings:
        resp = client.get(f"/api/social/posts?sort={r}&mode=demo&limit=10")
        assert resp.status_code == 200, f"Ranking {r} failed: {resp.text}"
        data = resp.json()
        assert "posts" in data
        assert "ranking_type" in data
        assert data["ranking_type"] == r
        for p in data["posts"]:
            assert p["collection_mode"] == "DEMO"
            assert "platform_percentile" in p
            assert "has_sufficient_history" in p
            assert "history_status" in p

def test_insufficient_history_confidence():
    resp = client.get("/api/social/posts?mode=demo&limit=15")
    assert resp.status_code == 200
    posts = resp.json()["posts"]
    for p in posts:
        if p["observation_count"] < 2:
            assert p["has_sufficient_history"] is False
            assert p["history_status"] == "Not enough observations"

def test_platform_aware_normalization():
    # Verify percentile scores exist and are bounded [0, 100]
    resp = client.get("/api/social/posts?mode=demo&limit=10")
    assert resp.status_code == 200
    posts = resp.json()["posts"]
    for p in posts:
        pct = p.get("platform_percentile")
        assert pct is not None
        assert 0.0 <= pct <= 100.0

def test_trend_explorer_endpoint():
    resp = client.get("/api/social/trend-explorer?party=DMK&time_window=24h&mode=demo")
    assert resp.status_code == 200
    data = resp.json()
    assert "query" in data
    assert "summary" in data
    assert "timeline" in data
    assert data["query"]["party"] == "DMK"
    assert "total_posts" in data["summary"]
    assert "platforms" in data["summary"]

def test_cluster_timeline_reconstruction():
    clusters_resp = client.get("/api/social/story-clusters?mode=demo")
    assert clusters_resp.status_code == 200
    clusters = clusters_resp.json()["clusters"]
    assert len(clusters) > 0
    cid = clusters[0]["id"]

    timeline_resp = client.get(f"/api/social/story-clusters/{cid}/timeline")
    assert timeline_resp.status_code == 200
    t_data = timeline_resp.json()
    assert "cluster" in t_data
    assert "timeline" in t_data
    assert "confidence_score" in t_data
    assert len(t_data["timeline"]) >= 1
    # Nodes must be ordered chronologically
    timestamps = [n["published_at"] for n in t_data["timeline"]]
    assert timestamps == sorted(timestamps)

def test_methodology_panel_transparency():
    resp = client.get("/api/social/methodology")
    assert resp.status_code == 200
    m = resp.json()
    assert "disclaimer" in m
    assert "normalization_strategy" in m
    assert "rankings" in m
    assert "electorate" in m["disclaimer"].lower()
    assert "fastest_growing" in m["rankings"]
    assert "trending" in m["rankings"]

def test_demo_scenario_engine_determinism():
    # 1. List scenarios
    list_resp = client.get("/api/social/demo/scenarios")
    assert list_resp.status_code == 200
    scenarios = list_resp.json()["scenarios"]
    assert len(scenarios) == 4
    scenario_ids = [s["id"] for s in scenarios]
    assert "scenario_policy_announcement" in scenario_ids
    assert "scenario_leader_speech" in scenario_ids
    assert "scenario_political_controversy" in scenario_ids
    assert "scenario_cross_party_debate" in scenario_ids

    # 2. Replay step 1
    rep1 = client.post("/api/social/demo/scenarios/scenario_leader_speech/replay", json={"step": 1})
    assert rep1.status_code == 200
    d1 = rep1.json()
    assert d1["current_step"] == 1
    posts_s1 = d1["simulated_posts_created"]

    # 3. Replay step 3
    rep3 = client.post("/api/social/demo/scenarios/scenario_leader_speech/replay", json={"step": 3})
    assert rep3.status_code == 200
    d3 = rep3.json()
    assert d3["current_step"] == 3
    posts_s3 = d3["simulated_posts_created"]
    assert posts_s3 > posts_s1, "Progression to step 3 should add simulated posts"

def test_scheduler_overlap_prevention():
    # Acquire lock manually and verify duplicate run skips cleanly
    lock = social_scheduler._get_lock("test_platform")
    assert lock.acquire(blocking=False)
    try:
        res = social_scheduler.execute_connector("test_platform")
        assert res["status"] == "SKIPPED"
        assert "Overlapping run prevented" in res["message"]
    finally:
        lock.release()

def test_fetch_runs_audit_logging():
    resp = client.get("/api/social/fetch-runs?limit=10")
    assert resp.status_code == 200
    data = resp.json()
    assert "fetch_runs" in data
