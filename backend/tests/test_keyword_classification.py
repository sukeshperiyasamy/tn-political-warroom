import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.entity_matcher import entity_matcher
from backend.app.services.ai_intelligence import ai_service
from backend.app.data.db import get_connection

client = TestClient(app)

def test_unbiased_entity_matching_no_forced_defaults():
    """
    Verifies that non-partisan news articles (e.g. sports, weather, health, international)
    are NEVER falsely tagged with DMK, M.K. Stalin, or State Politics.
    """
    # 1. Cricket / Sports
    res_cricket = entity_matcher.match_entities(
        text="India secured a historic victory in the cricket match at Bengaluru stadium yesterday with sensational batting performance.",
        title="Cricket Match Highlights & Tournament Scorecard"
    )
    assert res_cricket["party_codes"] == [], f"Expected empty party_codes, got: {res_cricket['party_codes']}"
    assert res_cricket["leader_names"] == [], f"Expected empty leader_names, got: {res_cricket['leader_names']}"
    assert "Sports & Youth Affairs" in res_cricket["topics"]

    # 2. Weather / Civic
    res_weather = entity_matcher.match_entities(
        text="வானிலை ஆய்வு மையம் தகவல்: புதுச்சேரி மற்றும் காரைக்காலில் கனமழை காரணமாக பள்ளிகளுக்கு விடுமுறை அறிவிப்பு.",
        title="கனமழை எச்சரிக்கை: பள்ளி விடுமுறை அறிவிப்பு"
    )
    assert res_weather["party_codes"] == []
    assert res_weather["leader_names"] == []
    assert "Civic Affairs & Weather" in res_weather["topics"]

    # 3. Health & Science
    res_health = entity_matcher.match_entities(
        text="மார்பக புற்றுநோய் விழிப்புணர்வு மற்றும் பரிசோதனை முகாம் சென்னையில் நடைபெற்றது.",
        title="மருத்துவ விழிப்புணர்வு முகாம்"
    )
    assert res_weather["party_codes"] == []
    assert "DMK" not in res_health["party_codes"]
    assert "M.K. Stalin" not in res_health["leader_names"]


def test_multilingual_party_disambiguation():
    """
    Verifies that all Tamil Nadu political parties are matched accurately
    and acronym lookbehinds prevent false collisions (e.g. திமுக inside அதிமுக or மதிமுக).
    """
    # AIADMK should match AIADMK and NOT DMK
    res_aiadmk = entity_matcher.match_entities("அதிமுக பொதுச்செயலாளர் இபிஎஸ் ஆலோசனை கூட்டம் நடத்தினார்.")
    assert "AIADMK" in res_aiadmk["party_codes"]
    assert "DMK" not in res_aiadmk["party_codes"]
    assert "Edappadi K. Palaniswami" in res_aiadmk["leader_names"]

    # MDMK should match MDMK and NOT DMK
    res_mdmk = entity_matcher.match_entities("மதிமுக பொதுச்செயலாளர் வைகோ அறிக்கை வெளியிட்டுள்ளார்.")
    assert "MDMK" in res_mdmk["party_codes"]
    assert "DMK" not in res_mdmk["party_codes"]
    assert "Vaiko" in res_mdmk["leader_names"]

    # TVK Vijay
    res_tvk = entity_matcher.match_entities("விக்கிரவாண்டி தவெக மாநாட்டில் தளபதி விஜய் உரை நிகழ்த்தினார்.")
    assert "TVK" in res_tvk["party_codes"]
    assert "Thalapathy Vijay" in res_tvk["leader_names"]

    # NTK Seeman
    res_ntk = entity_matcher.match_entities("நாம் தமிழர் கட்சி ஒருங்கிணைப்பாளர் சீமான் செய்தியாளர் சந்திப்பு.")
    assert "NTK" in res_ntk["party_codes"]
    assert "Seeman" in res_ntk["leader_names"]

    # VCK Thirumavalavan
    res_vck = entity_matcher.match_entities("விடுதலைச் சிறுத்தைகள் கட்சி தலைவர் தொல். திருமாவளவன் பொதுக்கூட்டம்.")
    assert "VCK" in res_vck["party_codes"]
    assert "Thol. Thirumavalavan" in res_vck["leader_names"]

    # BJP Annamalai
    res_bjp = entity_matcher.match_entities("பாரதிய ஜனதா கட்சி தலைவர் அண்ணாமலை பிரச்சாரம் மேற்கொண்டார்.")
    assert "BJP" in res_bjp["party_codes"]
    assert "K. Annamalai" in res_bjp["leader_names"]

    # PMK Ramadoss
    res_pmk = entity_matcher.match_entities("பாமக தலைவர் மருத்துவர் அன்புமணி ராமதாஸ் அறிக்கை.")
    assert "PMK" in res_pmk["party_codes"]
    assert "Dr. Anbumani Ramadoss" in res_pmk["leader_names"]

    # DMDK
    res_dmdk = entity_matcher.match_entities("தேமுதிக பொதுச்செயலாளர் பிரேமலதா விஜயகாந்த் ஆலோசனை.")
    assert "DMDK" in res_dmdk["party_codes"]
    assert "Premallatha Vijayakant" in res_dmdk["leader_names"]

    # CPM
    res_cpm = entity_matcher.match_entities("மார்க்சிஸ்ட் கம்யூனிஸ்ட் கட்சி சிபிஎம் மாநில செயலாளர் பாலகிருஷ்ணன் அறிக்கை.")
    assert "CPM" in res_cpm["party_codes"]
    assert "K. Balakrishnan" in res_cpm["leader_names"]


def test_primary_subject_salience():
    """
    Verifies that headline mentions carry higher weight in determining the primary subject.
    """
    res = entity_matcher.match_entities(
        title="எடப்பாடி பழனிசாமி தலைமையில் அதிமுக மாவட்ட செயலாளர்கள் கூட்டம்",
        text="கூட்டத்தில் திமுக அரசின் செயல்பாடுகள் குறித்து விவாதிக்கப்பட்டது."
    )
    assert res["primary_subject"] is not None
    assert "Edappadi K. Palaniswami" in res["primary_subject"] or "AIADMK" in res["primary_subject"]


def test_opinion_and_allegation_detection():
    """
    Verifies that political allegations and rhetoric are flagged as opinions,
    while neutral wire reports are flagged as factual.
    """
    # Political allegation
    is_allegation = entity_matcher.detect_opinion_or_allegation(
        title="அதிமுக மீது திமுக கடும் குற்றச்சாட்டு",
        text="தேர்தல் வாக்குறுதிகளை நிறைவேற்றவில்லை என எதிர்க்கட்சித் தலைவர் கண்டனம் தெரிவித்தார்."
    )
    assert is_allegation is True

    # Factual report
    is_factual = entity_matcher.detect_opinion_or_allegation(
        title="சென்னை மெட்ரோ ரயில் இரண்டாம் கட்ட பணிகள் தீவிரம்",
        text="மெட்ரோ ரயில் நிர்வாகம் புதிய வழித்தடங்களுக்கான கட்டுமான பணிகளை விரைவுபடுத்தியுள்ளது."
    )
    assert is_factual is False


def test_candidate_keywords_review_queue():
    """
    Verifies candidate keyword discovery, retrieval, and approval into topic taxonomy.
    """
    # 1. Queue a novel hashtag
    novel_tag = "#VetriVizha2026"
    entity_matcher.extract_and_queue_candidate_keywords(
        text=f"The campaign started with {novel_tag} across all southern districts.",
        headline="Campaign Launch Rally",
        article_id="art-test-cand-001"
    )

    # 2. Query candidates endpoint
    resp = client.get("/api/admin/keywords/candidates")
    assert resp.status_code == 200
    data = resp.json()
    assert "candidates" in data
    assert any(c["name_en"] == novel_tag for c in data["candidates"])

    cand = next(c for c in data["candidates"] if c["name_en"] == novel_tag)

    # 3. Approve candidate
    resp_app = client.post(f"/api/admin/keywords/candidates/{cand['id']}/approve", json={
        "category": "Elections & Alliances",
        "related_party_code": "TVK"
    })
    assert resp_app.status_code == 200
    assert resp_app.json()["status"] == "approved"

    # 4. Verify candidate is now in topic registry
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT name_en, category FROM topic_registry WHERE id = ?", (resp_app.json()["topic_id"],))
        row = cur.fetchone()
        assert row is not None
        assert row["name_en"] == novel_tag


def test_admin_analytics_endpoint():
    """
    Verifies that the keyword analytics endpoint returns distribution metrics and bias anomaly alerts.
    """
    resp = client.get("/api/admin/keywords/analytics")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_articles" in data
    assert data["total_articles"] > 0
    assert "party_distribution" in data
    assert "anomaly_flags" in data
    assert isinstance(data["anomaly_flags"], list)


def test_reclassification_preview_dry_run_safety():
    """
    Verifies that running reclassification with dry_run=True produces diffs
    without altering any database records.
    """
    # 1. Fetch count of articles before dry run
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, party_codes FROM articles LIMIT 1")
        sample_row = cur.fetchone()
        article_id = sample_row["id"]
        original_parties = sample_row["party_codes"]

    # 2. Run dry run
    resp = client.post("/api/admin/reclassify", json={
        "dry_run": True,
        "batch_size": 20
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["dry_run"] is True
    assert data["examined"] == 20
    assert data["changed_count"] >= 0
    assert "sample_diffs" in data

    # 3. Verify sample article in DB was NOT modified
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT party_codes FROM articles WHERE id = ?", (article_id,))
        after_row = cur.fetchone()
        assert after_row["party_codes"] == original_parties, "Dry run must NOT modify database records!"
