import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.connectors import get_all_connectors, get_connector
from backend.app.services.entity_matcher import entity_matcher
from backend.app.services.trend_engine import trend_engine
from backend.app.services.deduplicator import story_clustering_service
from backend.app.services.demo_data import seed_demo_social_data

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_social_demo_data():
    seed_demo_social_data()

def test_connector_registry():
    connectors = get_all_connectors()
    expected_platforms = ["youtube", "x", "instagram", "facebook", "reddit", "news", "google_trends"]
    for p in expected_platforms:
        assert p in connectors
        conn = get_connector(p)
        assert conn is not None
        assert conn.platform == p
        is_cfg, msg = conn.validate_configuration()
        assert isinstance(is_cfg, bool)
        assert isinstance(msg, str)
        inst = conn.get_setup_instructions()
        assert "steps" in inst
        assert "platform" in inst

def test_entity_matcher_tamil_and_english():
    # Test DMK and Stalin
    text_dmk = "முதல்வர் மு.க.ஸ்டாலின் தலைமையில் திமுக அரசு புதிய திட்டத்தை அறிவித்தது."
    matched_dmk = entity_matcher.match_entities(text_dmk)
    assert "DMK" in matched_dmk["party_codes"]
    assert "M.K. Stalin" in matched_dmk["leader_names"]

    # Test TVK Vijay
    text_tvk = "தமிழக வெற்றிக் கழகம் தலைவர் விஜய் விக்கிரவாண்டி மாநாட்டில் உரை நிகழ்த்தினார். #TVKVijay"
    matched_tvk = entity_matcher.match_entities(text_tvk)
    assert "TVK" in matched_tvk["party_codes"]
    assert "Thalapathy Vijay" in matched_tvk["leader_names"]
    assert any("TVK" in t for t in matched_tvk["topics"])
    assert "#tvkvijay" in [h.lower() for h in matched_tvk["hashtags"]]

    # Test AIADMK and EPS
    text_aiadmk = "எடப்பாடி கே.பழனிசாமி தலைமையில் அதிமுக கண்டன ஆர்ப்பாட்டம்"
    matched_aiadmk = entity_matcher.match_entities(text_aiadmk)
    assert "AIADMK" in matched_aiadmk["party_codes"]
    assert "Edappadi K. Palaniswami" in matched_aiadmk["leader_names"]

    # Test Sentiment
    pos_text = "திமுக அரசின் சாதனை திட்டம் பெரும் வெற்றி அடைந்துள்ளது"
    neg_text = "மின் கட்டண உயர்வு மிக மோசமானது, கடுமையான கண்டனம் தெரிவிக்கிறோம்"
    assert entity_matcher.detect_sentiment(pos_text)[0] == "positive"
    assert entity_matcher.detect_sentiment(neg_text)[0] == "negative"

def test_trend_engine_math_and_platform_weights():
    # Compare raw view weight vs comment weight
    yt_views_eng = trend_engine.calculate_standardized_engagement("youtube", views=1000)
    yt_comments_eng = trend_engine.calculate_standardized_engagement("youtube", comments=100)
    assert yt_views_eng == 20.0  # 1000 * 0.02
    assert yt_comments_eng == 250.0  # 100 * 2.5 (comments have higher intent weight)

    # Test post trend score calculation
    score, rate, vel_label = trend_engine.compute_post_trend_score(
        post_id="demo_yt_tvk_conf",
        published_at_iso="2026-10-18T00:00:00Z",
        platform="youtube",
        views=450000,
        likes=30000,
        comments=4000,
        shares=10000
    )
    assert score > 0.0
    assert isinstance(vel_label, str)

def test_story_clusters_discovery():
    clusters = story_clustering_service.get_clusters(limit=5)
    assert len(clusters) >= 1
    top_cluster = clusters[0]
    assert "title_en" in top_cluster
    assert "topic" in top_cluster
    assert "platforms_involved" in top_cluster
    assert len(top_cluster["platforms_involved"]) >= 1

def test_api_social_posts():
    resp = client.get("/api/social/posts?limit=10")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_count"] >= 5
    assert len(data["posts"]) <= 10
    first = data["posts"][0]
    assert "platform" in first
    assert "trend_score" in first
    assert "canonical_url" in first

def test_api_social_posts_filters():
    # Filter by platform
    resp = client.get("/api/social/posts?platform=youtube")
    assert resp.status_code == 200
    posts = resp.json()["posts"]
    assert all(p["platform"] == "youtube" for p in posts)

    # Filter by party
    resp_tvk = client.get("/api/social/posts?party=TVK")
    assert resp_tvk.status_code == 200
    assert any("TVK" in p["party_codes"] for p in resp_tvk.json()["posts"])

def test_api_social_post_detail_with_snapshots():
    resp = client.get("/api/social/posts/demo_yt_tvk_conf")
    assert resp.status_code == 200
    post = resp.json()
    assert post["id"] == "demo_yt_tvk_conf"
    assert "engagement_history" in post
    assert len(post["engagement_history"]) >= 2
    assert "likes" in post["engagement_history"][0]

def test_api_social_trending_and_methodology():
    resp = client.get("/api/social/trending?time_window=24h")
    assert resp.status_code == 200
    data = resp.json()
    assert "methodology" in data
    assert "weights" in data["methodology"]
    assert data["methodology"]["weights"]["engagement_growth"] == 0.40
    assert "trending_topics" in data
    assert len(data["trending_topics"]) >= 1
    top = data["trending_topics"][0]
    assert "trend_score" in top
    assert "distinct_platforms_count" in top
    assert "sub_scores" in top

def test_api_social_platform_comparison():
    resp = client.get("/api/social/platform-comparison?time_window=24h")
    assert resp.status_code == 200
    data = resp.json()
    assert "platforms" in data
    assert any(p["platform"] == "youtube" for p in data["platforms"])
    assert any(p["platform"] == "x" for p in data["platforms"])

def test_api_social_hashtags():
    resp = client.get("/api/social/hashtags?mode=demo")
    assert resp.status_code == 200
    data = resp.json()
    assert "hashtags" in data
    assert len(data["hashtags"]) >= 1

    resp_live = client.get("/api/social/hashtags?mode=live")
    assert resp_live.status_code == 200
    assert "hashtags" in resp_live.json()

def test_api_social_connectors_and_health_check():
    resp = client.get("/api/social/connectors")
    assert resp.status_code == 200
    connectors = resp.json()
    assert len(connectors) == 7

    # Test non-destructive health check trigger for News connector
    test_resp = client.post("/api/social/connectors/news/test")
    assert test_resp.status_code == 200
    assert test_resp.json()["status"] == "HEALTHY"

def test_strict_live_demo_isolation():
    # 1. LIVE posts only contain LIVE collection_mode
    resp_live = client.get("/api/social/posts?mode=live&limit=50")
    assert resp_live.status_code == 200
    live_posts = resp_live.json()["posts"]
    for p in live_posts:
        assert p["collection_mode"] == "LIVE", f"Found DEMO post {p['id']} in LIVE mode query"

    # 2. DEMO posts only contain DEMO collection_mode
    resp_demo = client.get("/api/social/posts?mode=demo&limit=50")
    assert resp_demo.status_code == 200
    demo_posts = resp_demo.json()["posts"]
    for p in demo_posts:
        assert p["collection_mode"] == "DEMO", f"Found LIVE post {p['id']} in DEMO mode query"

    # 3. LIVE trending topics never contain DEMO-exclusive topics
    trend_live = client.get("/api/social/trending?mode=live&time_window=24h")
    assert trend_live.status_code == 200
    live_topic_names = [t["topic"] for t in trend_live.json()["trending_topics"]]
    # TVK Vikravandi conference is exclusively seeded as DEMO
    assert "Vikravandi State Conference" not in live_topic_names

    # 4. Story clusters mode isolation
    clusters_live = client.get("/api/social/story-clusters?mode=live")
    assert clusters_live.status_code == 200
    for c in clusters_live.json()["clusters"]:
        assert c.get("collection_mode") == "LIVE"

    clusters_demo = client.get("/api/social/story-clusters?mode=demo")
    assert clusters_demo.status_code == 200
    for c in clusters_demo.json()["clusters"]:
        assert c.get("collection_mode") == "DEMO"

def test_live_ingestion_and_snapshot_recording():
    # Trigger ingestion
    resp = client.post("/api/social/ingestion/run")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "completed"

    # Verify that live posts in database have engagement snapshots
    posts_resp = client.get("/api/social/posts?mode=live&limit=5")
    assert posts_resp.status_code == 200
    posts = posts_resp.json()["posts"]
    if posts:
        first_post_id = posts[0]["id"]
        detail_resp = client.get(f"/api/social/posts/{first_post_id}")
        assert detail_resp.status_code == 200
        detail = detail_resp.json()
        assert "engagement_history" in detail
        assert len(detail["engagement_history"]) >= 1
        assert "observed_at" in detail["engagement_history"][0]
        # Trend score must be computed
        assert detail["trend_score"] > 0.0

def test_dynamic_topic_momentum_and_recency():
    resp = client.get("/api/social/trending?mode=demo&time_window=24h")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["trending_topics"]) >= 1
    top = data["trending_topics"][0]
    
    # Recency must not be a static 0.85
    assert "sub_scores" in top
    recency = top["sub_scores"]["recency"]
    assert recency != 0.85, f"Recency was still static scalar {recency}"
    assert 0.0 <= recency <= 1.0

    # Momentum state must be exposed
    assert "momentum_state" in top
    assert top["momentum_state"] in ("ACCELERATING", "STEADY", "DECELERATING", "EMERGING", "INSUFFICIENT_HISTORY")

def test_non_destructive_story_clustering():
    # Run clustering twice and verify cluster IDs remain stable
    c1 = story_clustering_service.run_clustering()
    c2 = story_clustering_service.run_clustering()
    ids1 = [c["id"] for c in c1]
    ids2 = [c["id"] for c in c2]
    assert ids1 == ids2, "Cluster IDs must remain stable across repeated clustering passes"
