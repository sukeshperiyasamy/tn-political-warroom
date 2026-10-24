"""Tests for the Bright Data + Gemini social trial. All external calls are mocked; DB is a temp SQLite file."""
import json
import sqlite3
import time

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.social_trial import auth, brightdata, classifier, credentials, fixtures, service, store


@pytest.fixture()
def db(tmp_path, monkeypatch):
    path = str(tmp_path / "trial.db")
    monkeypatch.setattr(store, "DB_PATH", path)
    store._schema_ready_for.clear()
    store.ensure_schema()
    return path


@pytest.fixture()
def env(monkeypatch):
    monkeypatch.setenv("BRIGHTDATA_API_KEY", "bd-test-key-1234567890")
    monkeypatch.setenv("ADMIN_USERNAME", "admin")
    monkeypatch.setenv("ADMIN_PASSWORD", "pw-for-tests-123")
    monkeypatch.setenv("ADMIN_TOKEN_SECRET", "s" * 40)


class FakeResp:
    def __init__(self, status=200, payload=None, text=""):
        self.status_code, self._payload, self.text = status, payload, text or json.dumps(payload)

    def json(self):
        if self._payload is None:
            raise ValueError("no json")
        return self._payload


class FakeSession:
    def __init__(self, post=None, gets=None):
        self._post, self._gets, self.calls = post, list(gets or []), []

    def post(self, url, **kw):
        self.calls.append(("POST", url, kw))
        return self._post

    def get(self, url, **kw):
        self.calls.append(("GET", url, kw))
        return self._gets.pop(0)


class FakeGemini:
    def __init__(self, payload=None, exc=None, text=None):
        self.payload, self.exc, self.text, self.calls = payload, exc, text, 0
        self.models = self

    def generate_content(self, **kw):
        self.calls += 1
        if self.exc:
            raise self.exc
        body = self.text if self.text is not None else json.dumps(self.payload)
        return type("R", (), {"text": body})()


def gem(**over):
    base = {"is_political": True, "party_codes": ["DMK"], "leader_names": [], "topics": [], "primary_subject": "x",
            "confidence": 0.9, "rationale": "r"}
    return {**base, **over}


# ---- normalisation / validation -------------------------------------------
def test_normalize_valid_and_missing_fields():
    raw = {"id": "1", "url": "https://x.com/a/status/1", "user_posted": "a", "description": "hi #tag",
           "date_posted": "2026-01-02T03:04:05Z", "likes": "1,234", "replies": None}
    p = brightdata.normalize("x", raw)
    assert p["platform_post_id"] == "1" and p["likes"] == 1234 and p["comments"] is None
    assert p["hashtags"] == ["tag"] and p["published_at"].startswith("2026-01-02")
    assert brightdata.normalize("x", {"description": "no id and no url"}) is None
    assert brightdata.normalize("x", {"error": "dead_page"}) is None
    assert brightdata.normalize("tiktok", raw) is None


@pytest.mark.parametrize("bad", [None, "", "not a date", "2999-01-01T00:00:00Z"])
def test_invalid_or_future_timestamps_become_none(bad):
    assert brightdata.parse_timestamp(bad) is None


def test_facebook_like_dict_and_id_from_url():
    p = brightdata.normalize("facebook", {"url": "https://facebook.com/p/abc123", "content": "c",
                                         "num_likes_type": {"num": 7, "type": "Like"}})
    assert p["platform_post_id"] == "abc123" and p["likes"] == 7


def test_target_url_validation():
    assert brightdata.validate_target_url("instagram", "https://www.instagram.com/natgeo/")
    with pytest.raises(ValueError):
        brightdata.validate_target_url("instagram", "https://evil.com/natgeo")
    with pytest.raises(ValueError):
        brightdata.validate_target_url("instagram", "natgeo")
    with pytest.raises(ValueError):
        brightdata.validate_target_url("tiktok", "https://tiktok.com/@a")


# ---- Bright Data client -----------------------------------------------------
def test_request_never_exceeds_cap():
    req = brightdata.build_request("facebook", "https://facebook.com/a", 500)
    assert req["params"]["limit_per_input"] == 10 and req["body"]["input"][0]["num_of_posts"] == 10
    assert "Authorization" not in json.dumps(req)


def test_collect_happy_path_and_truncation(env):
    recs = [{"id": str(i), "description": "t"} for i in range(25)]
    s = FakeSession(post=FakeResp(200, {"snapshot_id": "snap1"}),
                    gets=[FakeResp(200, {"status": "running"}), FakeResp(200, {"status": "ready"}), FakeResp(200, recs)])
    brightdata.POLL_INTERVAL_S = 0
    snap, out = brightdata.collect("x", "https://x.com/a", 10, session=s)
    assert snap == "snap1" and len(out) == 10


@pytest.mark.parametrize("status,category", [(401, "auth"), (403, "auth"), (429, "rate_limit"), (400, "bad_request"), (500, "provider")])
def test_trigger_http_errors_are_categorised(env, status, category):
    s = FakeSession(post=FakeResp(status, text="nope"))
    with pytest.raises(brightdata.BrightDataError) as e:
        brightdata.trigger("x", "https://x.com/a", 5, session=s)
    assert e.value.category == category


def test_failed_snapshot_and_timeout(env):
    s = FakeSession(gets=[FakeResp(200, {"status": "failed"})])
    with pytest.raises(brightdata.BrightDataError):
        brightdata.wait_for_snapshot("s", session=s, sleep=lambda _: None)
    s = FakeSession(gets=[FakeResp(200, {"status": "running"})] * 5)
    with pytest.raises(brightdata.BrightDataError) as e:
        brightdata.wait_for_snapshot("s", session=s, sleep=lambda _: None, timeout_s=-1)
    assert e.value.category == "timeout"


def test_error_message_never_contains_key(env):
    s = FakeSession(post=FakeResp(401, text="bad key bd-test-key-1234567890"))
    with pytest.raises(brightdata.BrightDataError) as e:
        brightdata.trigger("x", "https://x.com/a", 5, session=s)
    assert "bd-test-key" not in str(e.value) and "REDACTED" in str(e.value)


# ---- credentials ------------------------------------------------------------
def test_credential_loading_from_file_and_redaction(tmp_path, monkeypatch):
    f = tmp_path / "k.txt"
    f.write_text("super-secret-key-9999\n")
    monkeypatch.delenv("BRIGHTDATA_API_KEY", raising=False)
    monkeypatch.setenv("BRIGHTDATA_API_KEY_FILE", str(f))
    assert credentials.brightdata_api_key() == "super-secret-key-9999"
    assert "super-secret" not in credentials.redact("oops super-secret-key-9999 leaked")


def test_missing_credentials_raise_clear_errors(tmp_path, monkeypatch):
    monkeypatch.delenv("BRIGHTDATA_API_KEY", raising=False)
    monkeypatch.setenv("BRIGHTDATA_API_KEY_FILE", str(tmp_path / "missing.txt"))
    with pytest.raises(credentials.CredentialError):
        credentials.brightdata_api_key()
    monkeypatch.delenv("GOOGLE_APPLICATION_CREDENTIALS", raising=False)
    with pytest.raises(credentials.CredentialError):
        credentials.google_service_account_path()


# ---- Gemini classifier ------------------------------------------------------
def test_malformed_gemini_output_is_recorded_not_raised():
    r = classifier.classify("DMK rally today", client=FakeGemini(text="not json {"), sleep=lambda _: None)
    assert r["status"] == "error" and "malformed" in r["error"]


def test_schema_violation_rejected():
    r = classifier.classify("DMK rally", client=FakeGemini(payload=gem(confidence=7)), sleep=lambda _: None)
    assert r["status"] == "error"


def test_unknown_registry_values_are_dropped():
    r = classifier.classify("DMK rally", client=FakeGemini(payload=gem(party_codes=["DMK", "FAKEPARTY"],
                                                                      leader_names=["Not A Leader"], topics=["Made Up"])),
                            sleep=lambda _: None)
    assert r["status"] == "ok" and r["party_codes"] == ["DMK"] and r["leader_names"] == [] and r["topics"] == []


def test_non_political_post_gets_empty_classification():
    # Model wrongly returns a party for a weather post but flags it non-political -> forced empty
    r = classifier.classify("Heavy rain expected in Chennai this weekend",
                            client=FakeGemini(payload=gem(is_political=False, party_codes=["DMK"])), sleep=lambda _: None)
    assert r["party_codes"] == [] and r["leader_names"] == [] and r["is_political"] is False


def test_rule_based_false_positive_guard_for_place_names():
    rules = classifier.rule_based("Thiruvannamalai Deepam festival preparations begin")
    assert "BJP" not in rules["party_codes"] and "K. Annamalai" not in rules["leader_names"]


def test_disagreement_with_rules_flags_review():
    r = classifier.classify("Weather update", client=FakeGemini(payload=gem(party_codes=["DMK"])), sleep=lambda _: None)
    assert r["status"] == "ok" and r["review_status"] == "needs_review" and r["agrees_with_rules"] is False


def test_rate_limit_retries_then_reports():
    class E(Exception):
        code = 429
    g = FakeGemini(exc=E("quota"))
    r = classifier.classify("DMK rally", client=g, sleep=lambda _: None)
    assert r["status"] == "error" and g.calls == classifier.MAX_ATTEMPTS


def test_empty_text_is_skipped_without_calling_gemini():
    g = FakeGemini(payload=gem())
    r = classifier.classify("   ", client=g)
    assert r["status"] == "skipped" and g.calls == 0


# ---- service: storage, dedupe, idempotency, dry run ---------------------------
def ok_classifier(text):
    return {"model": "fake", "prompt_version": "t", "status": "ok", "is_political": True, "party_codes": [],
            "leader_names": [], "topics": [], "confidence": 0.9, "review_status": "unreviewed"}


def run_fixture(platform="x", classify_fn=ok_classifier, limit=10):
    run_id = store.create_run(platform, f"https://{platform}.com/acct", "fixture", True)
    service.execute_run(run_id, platform, f"https://{platform}.com/acct", limit, "fixture", True, classify_fn=classify_fn)
    return store.get_run(run_id)


def test_fixture_run_dedupes_skips_and_classifies(db):
    run = run_fixture()
    assert run["status"] == "completed"
    assert run["inserted"] == 8 and run["duplicates"] == 1 and run["skipped"] == 1 and run["classified"] == 8
    assert len(store.list_posts("x")) == 8


def test_rerun_is_idempotent(db):
    run_fixture()
    second = run_fixture()
    assert second["inserted"] == 0 and second["duplicates"] >= 8
    assert len(store.list_posts("x")) == 8


def test_cap_of_ten_is_enforced(db, monkeypatch):
    monkeypatch.setattr(fixtures, "fixture_records",
                        lambda p, u: [{"id": str(i), "description": f"post {i}"} for i in range(30)])
    run = run_fixture(limit=10)
    assert run["inserted"] == 10
    assert service.clamp_limit(500) == 10 and service.clamp_limit(1) == 1


def test_same_content_different_id_is_duplicate(db):
    a = {"platform": "x", "platform_post_id": "1", "text": "Same words here"}
    b = {"platform": "x", "platform_post_id": "2", "text": "same   WORDS here"}
    rid = store.create_run("x", "u", "fixture", False)
    assert store.insert_post(a, rid, "fixture") and store.insert_post(b, rid, "fixture") is None


def test_dry_run_writes_nothing(db):
    before = store.list_runs()
    plan = service.dry_run("instagram", "https://instagram.com/a", 10, "brightdata", True)
    plan2 = service.dry_run("instagram", "https://instagram.com/a", 10, "fixture", True)
    assert plan["persisted"] is False and plan["bright_data_called"] is False and plan["gemini_called"] is False
    assert "request" in plan and plan2["valid_records"] > 0
    assert store.list_runs() == before and store.list_posts() == []


def test_provider_failure_marks_run_failed_with_message(db, env):
    s = FakeSession(post=FakeResp(403, text="forbidden"))
    rid = store.create_run("instagram", "https://instagram.com/a", "brightdata", True)
    service.execute_run(rid, "instagram", "https://instagram.com/a", 10, "brightdata", True, session=s)
    run = store.get_run(rid)
    assert run["status"] == "failed" and "[auth]" in run["error_message"]


def test_empty_provider_result_reported(db, env):
    s = FakeSession(post=FakeResp(200, {"snapshot_id": "s"}), gets=[FakeResp(200, {"status": "ready"}), FakeResp(200, [])])
    rid = store.create_run("x", "https://x.com/a", "brightdata", True)
    service.execute_run(rid, "x", "https://x.com/a", 10, "brightdata", True, session=s)
    assert "[empty]" in store.get_run(rid)["error_message"]


def test_db_failure_mid_batch_does_not_abort_run(db, monkeypatch):
    real = store.insert_post
    calls = {"n": 0}

    def flaky(post, run_id, source, db_path=None):
        calls["n"] += 1
        if calls["n"] == 2:
            raise sqlite3.OperationalError("disk I/O error")
        return real(post, run_id, source, db_path)
    monkeypatch.setattr(store, "insert_post", flaky)
    run = run_fixture()
    assert run["status"] == "completed" and run["inserted"] == 7


def test_one_active_run_per_platform(db):
    store.create_run("x", "https://x.com/a", "fixture", False)
    with pytest.raises(RuntimeError):
        service.start_run("x", "https://x.com/a", 10, "fixture", False, background=False)


def test_stale_runs_failed_on_restart(db):
    rid = store.create_run("x", "u", "fixture", False)
    store.fail_stale_runs()
    assert store.get_run(rid)["status"] == "failed"


def test_classification_history_is_kept(db):
    run_fixture()
    pid = store.list_posts("x")[0]["id"]
    service.classify_existing(pid, classify_fn=ok_classifier)
    with store.get_connection(store.DB_PATH) as conn:
        assert conn.execute("SELECT COUNT(*) FROM social_trial_classifications WHERE post_id=?", (pid,)).fetchone()[0] == 2


# ---- API auth ---------------------------------------------------------------
def test_endpoints_require_server_side_token(db, env):
    c = TestClient(app)
    for method, path in [("get", "/api/social-trial/status"), ("get", "/api/social-trial/posts"),
                         ("post", "/api/social-trial/runs"), ("put", "/api/social-trial/targets/x")]:
        r = getattr(c, method)(path, **({"json": {}} if method in ("post", "put") else {}))
        assert r.status_code == 401, path
    assert c.get("/api/social-trial/status", headers={"Authorization": "Bearer forged.token"}).status_code == 401


def test_login_and_token_flow(db, env):
    c = TestClient(app)
    assert c.post("/api/social-trial/login", json={"username": "admin", "password": "wrong"}).status_code == 401
    tok = c.post("/api/social-trial/login", json={"username": "admin", "password": "pw-for-tests-123"}).json()["token"]
    h = {"Authorization": f"Bearer {tok}"}
    st = c.get("/api/social-trial/status", headers=h)
    assert st.status_code == 200
    assert "bd-test-key" not in st.text and "private_key" not in st.text


def test_expired_token_rejected(env):
    tok = auth.issue_token("admin", now=time.time() - 10 * 3600)
    with pytest.raises(Exception):
        auth.verify_token(tok)


def test_api_target_run_and_posts(db, env):
    c = TestClient(app)
    tok = c.post("/api/social-trial/login", json={"username": "admin", "password": "pw-for-tests-123"}).json()["token"]
    h = {"Authorization": f"Bearer {tok}"}
    assert c.put("/api/social-trial/targets/tiktok", headers=h, json={"target_url": "https://tiktok.com/a"}).status_code == 400
    assert c.put("/api/social-trial/targets/x", headers=h, json={"target_url": "https://example.com/a"}).status_code == 422
    assert c.put("/api/social-trial/targets/x", headers=h, json={"target_url": "https://x.com/acct", "post_limit": 50}).status_code == 422
    assert c.put("/api/social-trial/targets/x", headers=h, json={"target_url": "https://x.com/acct", "post_limit": 5}).status_code == 200
    dry = c.post("/api/social-trial/runs", headers=h, json={"platform": "x", "dry_run": True}).json()
    assert dry["dry_run"] is True and dry["persisted"] is False
    assert c.get("/api/social-trial/posts", headers=h).json()["posts"] == []


def test_inactive_account_error_is_explicit(env):
    s = FakeSession(post=FakeResp(400, text="Customer is not active"))
    with pytest.raises(brightdata.BrightDataError) as e:
        brightdata.trigger("x", "https://x.com/a", 5, session=s)
    assert e.value.category == "account_inactive" and "not active" in str(e.value)


def test_instagram_profile_expansion_skips_private_and_errors():
    rows = [{"account": "acct", "is_private": False, "posts": [
                {"id": "1", "url": "https://www.instagram.com/p/AAA", "caption": "hi #a", "datetime": "2026-10-21T00:00:00.000Z",
                 "post_hashtags": ["a"]}, "junk"]},
            {"account": "priv", "is_private": True, "posts": [{"id": "9", "caption": "x"}]},
            {"error": "dead_page"}]
    out = brightdata.expand_instagram_profiles(rows)
    assert len(out) == 1
    post = brightdata.normalize("instagram", out[0])
    assert post["platform_post_id"] == "1" and post["author_handle"] == "acct" and post["hashtags"] == ["a"]


def test_instagram_collect_expands_and_caps(env):
    posts = [{"id": str(i), "caption": f"c{i}", "datetime": "2026-10-01T00:00:00Z"} for i in range(12)]
    s = FakeSession(post=FakeResp(200, {"snapshot_id": "s"}),
                    gets=[FakeResp(200, {"status": "ready"}), FakeResp(200, [{"account": "a", "posts": posts}])])
    _, out = brightdata.collect("instagram", "https://www.instagram.com/a/", 10, session=s)
    assert len(out) == 10


# ---- re-run protection for reviewed posts / extra card fields -------------------
def _first_post_and_cls(platform="x"):
    run_fixture(platform)
    post = store.list_posts(platform)[0]
    return post["id"], post["cls_id"]


def test_rerun_of_reviewed_post_is_blocked_without_force(db):
    pid, cid = _first_post_and_cls()
    store.set_review_status(cid, "accepted")
    with pytest.raises(service.ReviewedPostError):
        service.classify_existing(pid, classify_fn=ok_classifier)
    shown = [p for p in store.list_posts("x") if p["id"] == pid][0]
    assert shown["cls_id"] == cid and shown["review_status"] == "accepted"   # nothing changed
    with store.get_connection(store.DB_PATH) as conn:
        assert conn.execute("SELECT COUNT(*) FROM social_trial_classifications WHERE post_id=?", (pid,)).fetchone()[0] == 1


@pytest.mark.parametrize("decision", ["accepted", "rejected"])
def test_forced_rerun_keeps_history_and_marks_needs_review(db, decision):
    pid, cid = _first_post_and_cls()
    store.set_review_status(cid, decision)
    service.classify_existing(pid, classify_fn=ok_classifier, force=True)
    shown = [p for p in store.list_posts("x") if p["id"] == pid][0]
    assert shown["cls_id"] != cid and shown["review_status"] == "needs_review"
    assert shown["prev_review_status"] == decision            # earlier decision still visible
    with store.get_connection(store.DB_PATH) as conn:
        assert conn.execute("SELECT review_status FROM social_trial_classifications WHERE id=?", (cid,)).fetchone()[0] == decision


def test_unreviewed_and_failed_posts_can_be_rerun_freely(db):
    pid, cid = _first_post_and_cls()
    service.classify_existing(pid, classify_fn=ok_classifier)              # unreviewed -> no force needed
    store.set_review_status(store.latest_classification(pid)["id"], "needs_review")
    service.classify_existing(pid, classify_fn=ok_classifier)              # needs_review -> no force needed


def test_failed_forced_rerun_does_not_flag_review_status(db):
    pid, cid = _first_post_and_cls()
    store.set_review_status(cid, "accepted")
    bad = lambda t: {"model": "m", "prompt_version": "t", "status": "error", "error": "boom", "review_status": "unreviewed"}
    service.classify_existing(pid, classify_fn=bad, force=True)
    shown = [p for p in store.list_posts("x") if p["id"] == pid][0]
    assert shown["cls_status"] == "error" and shown["prev_review_status"] == "accepted"


def test_api_rerun_returns_409_then_force_succeeds(db, env, monkeypatch):
    monkeypatch.setattr(service, "classify", ok_classifier)
    monkeypatch.setattr(service.classify_existing, "__defaults__", (ok_classifier, False))
    c = TestClient(app)
    h = {"Authorization": "Bearer " + c.post("/api/social-trial/login", json={"username": "admin", "password": "pw-for-tests-123"}).json()["token"]}
    pid, cid = _first_post_and_cls()
    assert c.post(f"/api/social-trial/classifications/{cid}/review", headers=h, json={"review_status": "rejected"}).status_code == 200
    r = c.post(f"/api/social-trial/posts/{pid}/classify", headers=h)
    assert r.status_code == 409 and "already rejected" in r.json()["detail"]
    assert c.post(f"/api/social-trial/posts/{pid}/classify?force=true", headers=h).status_code == 200


def test_instagram_card_fields_exposed_without_invented_metrics(db):
    raw = {"post_id": "ig1", "url": "https://www.instagram.com/p/ABC", "user_posted": "acct", "description": "cap #one #two",
           "date_posted": "2026-10-01T00:00:00Z", "hashtags": ["one", "two"], "content_type": "Carousel"}
    post = brightdata.normalize("instagram", raw)
    rid = store.create_run("instagram", "u", "brightdata", False)
    store.insert_post(post, rid, "brightdata")
    row = store.list_posts("instagram")[0]
    assert row["content_type"] == "Carousel" and json.loads(row["hashtags"]) == ["one", "two"]
    assert row["post_url"].endswith("/p/ABC") and row["published_at"].startswith("2026-10-01")
    assert row["likes"] is None and row["comments"] is None and row["shares"] is None and row["views"] is None
    # a platform without content_type in its payload yields None, not a made-up value
    assert store.list_posts("x") == []


# =====================================================================================================
# Instagram discovery: Stage A filter, v2 classification, discovery runs, recent posts, topic frequency
# =====================================================================================================
from backend.app.social_trial import relevance


@pytest.mark.parametrize("text,tags,expect", [
    ("", [], False),
    ("Good vibes only ✨", [], False),
    ("Sunday biryani special at our outlet 🍗", ["foodie"], False),
    ("Chief Minister inaugurates new bridge", [], True),                      # political keyword
    ("TVK rally in Madurai", [], True),                                       # registry + place
    ("வணக்கம் நண்பர்களே இன்று நல்ல நாள் வாழ்த்துக்கள் அனைவருக்கும்", [], True),   # Tamil text is never dropped
    ("no words here", ["DMK"], True),                                         # party hashtag
])
def test_stage_a_is_permissive_but_drops_pure_noise(text, tags, expect):
    assert relevance.candidate_filter(text, tags)[0] is expect


def test_classifier_v2_other_state_politics_gets_no_tn_tags():
    r = classifier.classify("Delhi CM announces metro", sleep=lambda _: None,
                            client=FakeGemini(payload=gem(category="other_state_politics", is_political=True,
                                                          party_codes=["DMK"], leader_names=["M.K. Stalin"], topics=["x"])))
    assert r["status"] == "ok" and r["category"] == "other_state_politics" and r["is_political"] is False
    assert r["party_codes"] == [] and r["leader_names"] == [] and r["topic_label"] is None


def test_classifier_v2_districts_validated_and_summary_kept_separate():
    r = classifier.classify("Madurai rally", sleep=lambda _: None,
                            client=FakeGemini(payload=gem(category="tamil_nadu_politics", is_political=True, party_codes=["TVK"],
                                                          districts=["Madurai", "Atlantis"], topic_label="Election campaign",
                                                          english_summary="A rally in Madurai.")))
    assert r["districts"] == ["Madurai"] and r["topic_label"] == "Election campaign"
    assert r["english_summary"] == "A rally in Madurai."            # interpretation only; caption is stored untouched in the post row


def test_classifier_v2_inconsistent_category_cannot_make_post_political():
    r = classifier.classify("x", sleep=lambda _: None,
                            client=FakeGemini(payload=gem(category="tamil_nadu_news", is_political=True, party_codes=["DMK"])))
    assert r["is_political"] is False and r["party_codes"] == []


def test_discovery_item_validation(db):
    assert store.add_discovery_item("hashtag", "#DMK")["value"] == "DMK"
    assert store.add_discovery_item("hashtag", "திமுக")["value"] == "திமுக"
    assert store.add_discovery_item("profile", "https://www.instagram.com/mkstalin/?hl=en")["value"] == "mkstalin"
    assert store.add_discovery_item("profile", "@some.user")["value"] == "some.user"
    for kind, bad in [("hashtag", "two words"), ("hashtag", "#"), ("profile", "https://www.instagram.com/p/ABC123/"),
                      ("profile", "not a handle!"), ("bogus", "x")]:
        with pytest.raises(ValueError):
            store.add_discovery_item(kind, bad)
    before = len(store.list_discovery_items())
    store.add_discovery_item("hashtag", "DMK")                      # duplicate is ignored, not duplicated
    assert len(store.list_discovery_items()) == before


def test_default_hashtags_seeded_once(db):
    items = store.list_discovery_items()
    assert {i["value"] for i in items if i["kind"] == "hashtag"} >= {"DMK", "TVK"}
    n = len(items)
    store._schema_ready_for.clear(); store.ensure_schema()
    assert len(store.list_discovery_items()) == n


def _classify_by_text(text):
    low = text.lower()
    political = any(w in low for w in ("dmk", "tvk", "madurai", "மின் கட்டண", "சென்னை"))
    return {"model": "fake", "prompt_version": "t", "status": "ok", "is_political": political,
            "category": "tamil_nadu_politics" if political else "non_political", "districts": [],
            "party_codes": ["DMK"] if "dmk" in low else (["TVK"] if "tvk" in low else []), "leader_names": [],
            "topics": ["Power Tariffs & TANGEDCO"] if "மின் கட்டண" in text else [], "confidence": 0.9,
            "review_status": "unreviewed"}


def _discovery(mode="both", fn=_classify_by_text):
    picked = service._pick_sources(mode)
    rid = store.create_run("instagram", f"discovery:{mode}", "fixture", True)
    service.execute_discovery(rid, picked, "fixture", True, classify_fn=fn)
    return store.get_run(rid)


def test_fixture_discovery_filters_dedupes_and_classifies(db):
    store.add_discovery_item("profile", "mkstalin")
    run = _discovery("both")
    assert run["status"] == "completed"
    srcs = json.loads(run["sources_json"])
    assert len(srcs) == 4 and all(s["error"] is None for s in srcs)    # 3 hashtags + 1 profile
    posts = store.list_posts("instagram", 500)
    assert sum(1 for p in posts if p["id"]) == run["inserted"]
    shared = [p for p in posts if p["platform_post_id"] == "fx_ig_shared_1"]
    assert len(shared) == 1 and run["duplicates"] >= 3               # same post seen via every source -> stored once
    dropped = [p for p in posts if p["stage_a"] == "fail"]
    assert dropped and all(p["cls_status"] == "skipped" for p in dropped)           # never sent to Gemini
    assert all(p["discovery_source"] for p in posts)
    assert run["classified"] == sum(1 for p in posts if p["cls_status"] == "ok")


def test_discovery_is_idempotent(db):
    _discovery("hashtags")
    n = len(store.list_posts("instagram", 500))
    second = _discovery("hashtags")
    assert second["inserted"] == 0 and len(store.list_posts("instagram", 500)) == n


def test_discovery_partial_failure_is_reported_per_source(db, env):
    store.add_discovery_item("profile", "mkstalin")
    for it in store.list_discovery_items():
        if it["kind"] == "hashtag":
            store.set_discovery_item(it["id"], False)

    class S(FakeSession):
        pass
    s = S(post=FakeResp(400, text="Customer is not active"))
    picked = service._pick_sources("profiles")
    rid = store.create_run("instagram", "discovery:profiles", "brightdata", True)
    service.execute_discovery(rid, picked, "brightdata", True, session=s, classify_fn=_classify_by_text)
    run = store.get_run(rid)
    assert run["status"] == "failed" and "account_inactive" in run["error_message"]


def test_discovery_one_source_fails_others_succeed(db, env, monkeypatch):
    store.add_discovery_item("profile", "mkstalin")
    real = brightdata.discover_hashtag

    def flaky(tag, limit, **kw):
        if tag == "DMK":
            raise brightdata.BrightDataError("snapshot still building", "timeout")
        return fixtures.fixture_discovery_records("hashtag", tag)
    monkeypatch.setattr(brightdata, "discover_hashtag", flaky)
    monkeypatch.setattr(brightdata, "collect", lambda *a, **k: ("snap", fixtures.fixture_discovery_records("profile", "mkstalin")))
    picked = service._pick_sources("both")
    rid = store.create_run("instagram", "discovery:both", "brightdata", True)
    service.execute_discovery(rid, picked, "brightdata", True, classify_fn=_classify_by_text)
    run = store.get_run(rid)
    srcs = {s["source"]: s for s in json.loads(run["sources_json"])}
    assert run["status"] == "completed" and "[timeout]" in srcs["hashtag:DMK"]["error"] and srcs["profile:mkstalin"]["inserted"] > 0
    assert "Some sources failed" in run["error_message"]


def test_discovery_dry_run_writes_nothing_and_calls_nothing(db):
    before_runs, before_posts = store.list_runs(), store.list_posts(limit=500)
    plan = service.discovery_dry_run("both", "brightdata")
    fx = service.discovery_dry_run("hashtags", "fixture")
    assert plan["persisted"] is False and plan["bright_data_called"] is False and plan["gemini_called"] is False
    assert all("request" in s and s["estimated_credits_max"] for s in plan["sources"])
    assert all(s["fixture_records"] > 0 for s in fx["sources"])
    assert store.list_runs() == before_runs and store.list_posts(limit=500) == before_posts


def test_discovery_requires_enabled_items_and_valid_mode(db):
    for it in store.list_discovery_items():
        store.set_discovery_item(it["id"], False)
    with pytest.raises(ValueError):
        service.start_discovery_run("both", "fixture", background=False)
    with pytest.raises(ValueError):
        service.start_discovery_run("everything", "fixture", background=False)


def test_per_run_source_caps(db):
    for i in range(10):
        store.add_discovery_item("hashtag", f"Tag{i}")
        store.add_discovery_item("profile", f"user{i}")
    picked = service._pick_sources("both")
    assert sum(1 for p in picked if p["kind"] == "profile") == service.MAX_PROFILES_PER_RUN
    assert sum(1 for p in picked if p["kind"] == "hashtag") == service.MAX_HASHTAGS_PER_RUN


def test_hashtag_discovery_client_happy_path_and_errors(env):
    rows = [{"post_id": str(i), "description": "x", "hashtags": ["dmk"]} for i in range(25)]
    s = FakeSession(post=FakeResp(200, {"snapshot_id": "snap_1"}),
                    gets=[FakeResp(200, {"status": "building"}), FakeResp(200, {"status": "ready"}), FakeResp(200, rows)])
    out = brightdata.discover_hashtag("dmk", 10, session=s, sleep=lambda _: None)
    assert len(out) == 10
    body = s.calls[0][2]["json"]
    assert body["records_limit"] == 10 and body["filter"]["value"] == "dmk" and "Authorization" not in json.dumps(body)
    with pytest.raises(brightdata.BrightDataError) as e:
        brightdata.discover_hashtag("dmk", 10, session=FakeSession(post=FakeResp(403, text="denied")))
    assert e.value.category == "auth"
    stuck = FakeSession(post=FakeResp(200, {"snapshot_id": "s"}), gets=[FakeResp(200, {"status": "building"})] * 5)
    with pytest.raises(brightdata.BrightDataError) as e:
        brightdata.discover_hashtag("dmk", 10, session=stuck, sleep=lambda _: None, timeout_s=-1)
    assert e.value.category == "timeout" and "try again later" in str(e.value)


def _seed_posts_for_views():
    """Three political posts, one rejected, one old, one other-state, one non-political."""
    from datetime import datetime, timedelta, timezone
    now = datetime.now(timezone.utc)
    rid = store.create_run("instagram", "t", "fixture", True)

    def add(pid, text, hours_ago, handle, cls, review="unreviewed", tags=None):
        p = {"platform": "instagram", "platform_post_id": pid, "text": text, "author_handle": handle,
             "published_at": (now - timedelta(hours=hours_ago)).isoformat(), "hashtags": tags or [], "discovery_source": "hashtag:DMK"}
        post_id = store.insert_post(p, rid, "fixture")
        cid = store.insert_classification(post_id, {"model": "m", "prompt_version": "t", "status": "ok", "review_status": review, **cls})
        return post_id, cid
    pol = {"is_political": True, "category": "tamil_nadu_politics", "party_codes": ["DMK"], "leader_names": [],
           "topics": ["Power Tariffs & TANGEDCO"], "confidence": 0.9}
    add("a", "alpha post", 2, "acct1", pol, tags=["Tariff"])
    add("b", "bravo post", 5, "acct2", pol, tags=["tariff", "DMK"])
    add("c", "charlie rejected", 6, "acct3", pol, review="rejected")
    add("d", "delta old", 24 * 30, "acct4", pol)
    add("e", "echo other state", 3, "acct5", {"is_political": False, "category": "other_state_politics", "confidence": 0.9})
    add("f", "foxtrot non political", 4, "acct6", {"is_political": False, "category": "non_political", "confidence": 0.9})


def test_recent_view_filters_sorts_and_excludes_rejected(db):
    _seed_posts_for_views()
    recent = store.recent_political_posts(days=7)
    assert [p["platform_post_id"] for p in recent] == ["a", "b"]          # newest first; rejected/old/other-state/non-political excluded
    assert [p["platform_post_id"] for p in store.recent_political_posts(days=90)] == ["a", "b", "d"]


def test_topic_trends_count_each_post_once_with_distinct_accounts(db):
    _seed_posts_for_views()
    t = store.topic_trends(days=7)
    assert t["political_posts"] == 2
    topic = {r["key"]: r for r in t["topics"]}["Power Tariffs & TANGEDCO"]
    assert topic["posts"] == 2 and topic["accounts"] == 2
    tags = {r["key"]: r["posts"] for r in t["hashtags"]}
    assert tags["tariff"] == 2 and tags["dmk"] == 1                        # case-folded; post b not double-counted
    assert {r["key"]: r["posts"] for r in t["parties"]} == {"DMK": 2}


def test_trend_views_never_claim_engagement(db, env):
    _seed_posts_for_views()
    c = TestClient(app)
    h = {"Authorization": "Bearer " + c.post("/api/social-trial/login", json={"username": "admin", "password": "pw-for-tests-123"}).json()["token"]}
    r = c.get("/api/social-trial/instagram/recent?days=7", headers=h).json()
    assert r["ranking"] == "recent" and len(r["posts"]) == 2
    assert all(p["likes"] is None and p["comments"] is None for p in r["posts"])
    assert c.get("/api/social-trial/instagram/topics?days=7", headers=h).json()["political_posts"] == 2


def test_discovery_endpoints_require_auth_and_validate(db, env):
    c = TestClient(app)
    for method, path in [("get", "/api/social-trial/instagram/discovery-items"), ("post", "/api/social-trial/instagram/discovery-runs"),
                         ("get", "/api/social-trial/instagram/recent"), ("get", "/api/social-trial/instagram/topics"),
                         ("delete", "/api/social-trial/instagram/discovery-items/x")]:
        r = getattr(c, method)(path, **({"json": {}} if method == "post" else {}))
        assert r.status_code == 401, path
    h = {"Authorization": "Bearer " + c.post("/api/social-trial/login", json={"username": "admin", "password": "pw-for-tests-123"}).json()["token"]}
    assert c.post("/api/social-trial/instagram/discovery-items", headers=h, json={"kind": "hashtag", "value": "bad tag"}).status_code == 422
    item = c.post("/api/social-trial/instagram/discovery-items", headers=h, json={"kind": "hashtag", "value": "#NewTag"}).json()
    assert item["value"] == "NewTag"
    assert c.patch(f"/api/social-trial/instagram/discovery-items/{item['id']}", headers=h, json={"is_enabled": False}).status_code == 200
    assert c.delete(f"/api/social-trial/instagram/discovery-items/{item['id']}", headers=h).status_code == 200
    assert c.delete(f"/api/social-trial/instagram/discovery-items/{item['id']}", headers=h).status_code == 404
    dry = c.post("/api/social-trial/instagram/discovery-runs", headers=h, json={"dry_run": True, "source": "fixture", "sources": "hashtags"}).json()
    assert dry["persisted"] is False and dry["sources"]
    assert c.post("/api/social-trial/instagram/discovery-runs", headers=h, json={"dry_run": True, "sources": "nope"}).status_code == 422


def test_existing_x_facebook_flow_unchanged_by_discovery_columns(db):
    run = run_fixture("facebook")
    assert run["status"] == "completed" and run["inserted"] == 8
    assert all(p["stage_a"] == "pass" and p["discovery_source"] is None for p in store.list_posts("facebook"))


def test_schema_upgrade_is_additive_on_existing_database(tmp_path):
    path = str(tmp_path / "old.db")
    conn = sqlite3.connect(path)
    conn.executescript(store.SCHEMA.split("CREATE TABLE IF NOT EXISTS social_trial_discovery_items")[0])  # pre-feature tables only
    conn.execute("INSERT INTO social_trial_posts (id, platform, platform_post_id, run_id, source, collected_at, content_hash) VALUES ('p1','x','1','r','fixture','2026-01-01','h')")
    conn.commit(); conn.close()
    store.ensure_schema(path)
    conn = sqlite3.connect(path)
    cols = {r[1] for r in conn.execute("PRAGMA table_info(social_trial_posts)")}
    assert {"discovery_source", "stage_a"} <= cols
    assert conn.execute("SELECT stage_a FROM social_trial_posts WHERE id='p1'").fetchone()[0] == "pass"      # old rows keep working
    conn.close()
