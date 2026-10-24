"""Golden-output parity + egress regression tests for the article / metrics / compare read paths.

Runs ONLY against a temporary SQLite database (never Neon). The golden file was generated from the code as it was BEFORE
the query-projection change, so these tests prove the optimised queries return identical API results while reading far
fewer bytes. Regenerate deliberately with:  UPDATE_GOLDEN=1 python -m pytest backend/tests/test_query_egress.py
"""
import json
import os
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from backend.app.data import db as db_layer
from backend.app.models import FilterParams
from backend.app.services.news_service import news_service
from backend.app.services.source_registry import source_registry

GOLDEN = Path(__file__).parent / "golden" / "query_egress_golden.json"

LEADER_NAMES = ["M.K. Stalin", "Edappadi K. Palaniswami", "Thalapathy Vijay", "K. Annamalai", "Seeman"]
PARTY_SETS = [["DMK"], ["AIADMK"], ["TVK"], ["BJP"], ["DMK", "INC"], [], ["NTK"], ["TVK", "BJP"]]
TOPICS = ["Power Tariffs & TANGEDCO", "2026 Assembly Election", "Governance", "Chennai Infrastructure", "Youth Politics"]
SOURCES = ["Daily Thanthi", "Polimer News", "News18 Tamil Nadu", "Dinamalar"]
SENTIMENTS = [("positive", 0.6), ("neutral", 0.0), ("negative", -0.55), ("neutral", 0.1), ("negative", -0.2)]
N_ARTICLES = 64


@pytest.fixture()
def sqlite_only(tmp_path, monkeypatch):
    """Force SQLite and point the shared source_registry at a throw-away database seeded with deterministic articles."""
    monkeypatch.setenv("DATABASE_URL", "")
    monkeypatch.setenv("DIRECT_URL", "")
    assert db_layer.get_database_url() is None and not db_layer.is_postgres()
    path = str(tmp_path / "egress.db")
    monkeypatch.setattr(source_registry, "db_path", path)
    source_registry.init_db()
    base = datetime(2026, 10, 1, 6, 0, tzinfo=timezone.utc)
    big_variations = [
        {"style": f"Style {k}", "headline": f"தலைப்பு {k} " + "செய்தி " * 8, "caption": "விரிவான விளக்கம் " * 20}
        for k in range(3)
    ]
    with source_registry.get_connection() as conn:
        cur = conn.cursor()
        for i in range(N_ARTICLES):
            sent, score = SENTIMENTS[i % len(SENTIMENTS)]
            when = (base + timedelta(hours=i * 7)).isoformat()
            en = i % 3 == 0
            title = f"Rally update {i} in Madurai" if en else f"மின் கட்டணம் குறித்த செய்தி {i}"
            cur.execute(
                """INSERT INTO articles (id, source_id, source_name, title, tamil_title, summary, tamil_summary, source_url,
                   canonical_url, publisher_guid, published_at, party_codes, leader_names, sentiment, sentiment_score, topics,
                   tamil_variations, engagement_estimated, data_status, analysis_provider, content_hash, processing_hash,
                   processing_status, processed_at, processing_attempts, last_seen_at, first_seen_at, source_type, platform)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (f"art-{i:03d}", f"src-{i % 4}", SOURCES[i % 4], title, f"தமிழ் தலைப்பு {i}", f"Summary {i} " * 10,
                 f"சுருக்கம் {i} " * 10, f"https://example.test/a/{i}", f"https://example.test/c/{i}", f"guid-{i}", when,
                 json.dumps(PARTY_SETS[i % len(PARTY_SETS)]), json.dumps([LEADER_NAMES[i % 5]] if i % 4 else []), sent, score,
                 json.dumps([TOPICS[i % 5], TOPICS[(i + 2) % 5]] if i % 2 else [TOPICS[i % 5]]),
                 json.dumps(big_variations, ensure_ascii=False), json.dumps({"reach": 1000 + i * 37, "shares": i}),
                 "live_rss", "tamil_nlp_engine", f"ch-{i}", f"ph-{i}", "processed", when, 1, when, when,
                 "NEWS_MEDIA" if i % 5 else "INFLUENCER", "web"))
        conn.commit()
    return path


def _dump(model) -> dict:
    return model.model_dump(mode="json")


FILTER_CASES = {
    "default": {},
    "party_dmk": {"party": "DMK"},
    "leader_stalin": {"leader": "stalin"},
    "sentiment_negative": {"sentiment": "negative"},
    "topic_power": {"topic": "power"},
    "source_thanthi": {"source": "thanthi"},
    "q_tamil": {"q": "மின்"},
    "q_english": {"q": "rally"},
    "q_party_code": {"q": "tvk"},
    "date_window": {"date_from": "2026-10-03T00:00:00+00:00", "date_to": "2026-10-07T00:00:00+00:00"},
    "combined": {"party": "DMK", "sentiment": "negative", "date_from": "2026-10-02T00:00:00+00:00"},
    "no_match": {"party": "ZZZ"},
    "mode_all": {"mode": "all"},
    "mode_demo": {"mode": "demo"},
    "mode_all_q": {"mode": "all", "q": "rally"},
}

COMPARE_CASES = {
    "parties_live": ("party", ["DMK", "AIADMK", "TVK"], "live"),
    "parties_all": ("party", ["DMK", "BJP"], "all"),
    "parties_demo": ("party", ["DMK", "TVK"], "demo"),
    "parties_unknown": ("party", ["DMK", "NOPE"], "live"),
    "leaders_live": ("leader", ["M.K. Stalin", "Thalapathy Vijay", "Seeman"], "live"),
    "leaders_all": ("leader", ["K. Annamalai"], "all"),
    "leaders_unknown": ("leader", ["Nobody"], "live"),
}


def _compute_all() -> dict:
    out = {"metrics": {}, "list": {}, "compare": {}}
    for name, kw in FILTER_CASES.items():
        params = FilterParams(**kw)
        out["metrics"][name] = _dump(news_service.calculate_metrics(params))
        out["list"][name] = [a.id for a in news_service.filter_articles(params)]
    for name, (etype, ids, mode) in COMPARE_CASES.items():
        out["compare"][name] = _dump(news_service.compare_entities(etype, ids, mode=mode))
    return out


def test_golden_parity_for_metrics_list_and_compare(sqlite_only):
    got = _compute_all()
    if os.getenv("UPDATE_GOLDEN") == "1":
        GOLDEN.parent.mkdir(parents=True, exist_ok=True)
        GOLDEN.write_text(json.dumps(got, ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8")
        pytest.skip("golden file regenerated")
    assert GOLDEN.exists(), "golden file missing: run with UPDATE_GOLDEN=1 on the known-good code first"
    want = json.loads(GOLDEN.read_text(encoding="utf-8"))
    got = json.loads(json.dumps(got, ensure_ascii=False, sort_keys=True))   # same JSON round-trip as the stored file
    for section in ("metrics", "list", "compare"):
        assert set(got[section]) == set(want[section])
        for name in want[section]:
            assert got[section][name] == want[section][name], f"{section}/{name} differs from golden output"


def test_golden_fixture_is_meaningful(sqlite_only):
    """Guard against a vacuous golden: filters must actually select different, non-trivial subsets."""
    want = json.loads(GOLDEN.read_text(encoding="utf-8")) if GOLDEN.exists() else _compute_all()
    sizes = {k: len(v) for k, v in want["list"].items()}
    assert sizes["default"] == N_ARTICLES and sizes["no_match"] == 0
    assert 0 < sizes["party_dmk"] < N_ARTICLES and 0 < sizes["q_tamil"] < N_ARTICLES and 0 < sizes["date_window"] < N_ARTICLES
    assert sizes["mode_all"] > sizes["default"] and sizes["mode_demo"] > 0
    assert want["metrics"]["default"]["party_metrics"] and want["metrics"]["default"]["daily_trends"]
    comp = {c["id"]: c for c in want["compare"]["parties_live"]["comparison"]}
    assert comp["DMK"]["article_count"] > 0 and len(comp["DMK"]["recent_articles"]) == 3
    assert comp["DMK"]["recent_articles"][0]["tamil_variations"]            # recent articles still carry full variations


# ----------------------------------------------------------------------------------------------------------------------
# Egress regression: which SQL runs and how many bytes come back
# ----------------------------------------------------------------------------------------------------------------------
class Recorder:
    def __init__(self):
        self.statements = []
        self.bytes = 0


@pytest.fixture()
def recorder(monkeypatch):
    rec = Recorder()
    orig_exec, orig_all, orig_one = db_layer.CursorWrapper.execute, db_layer.CursorWrapper.fetchall, db_layer.CursorWrapper.fetchone

    def row_bytes(row):
        return sum(len(str(v)) for v in row.values()) if row is not None else 0

    def execute(self, query, params=None):
        rec.statements.append(" ".join(query.split()))
        return orig_exec(self, query, params)

    def fetchall(self):
        rows = orig_all(self)
        rec.bytes += sum(row_bytes(r) for r in rows)
        return rows

    def fetchone(self):
        row = orig_one(self)
        rec.bytes += row_bytes(row)
        return row

    monkeypatch.setattr(db_layer.CursorWrapper, "execute", execute)
    monkeypatch.setattr(db_layer.CursorWrapper, "fetchall", fetchall)
    monkeypatch.setattr(db_layer.CursorWrapper, "fetchone", fetchone)
    return rec


def _article_selects(rec):
    return [s for s in rec.statements if s.upper().startswith("SELECT") and re.search(r"FROM articles\b", s) and "MAX(" not in s.upper()]


def _select_list(stmt):
    return stmt[len("SELECT"):stmt.upper().index(" FROM ")].strip()


def _full_table_bytes(rec_factory=None):
    with source_registry.get_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM articles")
        return sum(sum(len(str(v)) for v in r.values()) for r in cur.fetchall())


def test_metrics_reads_articles_once_with_a_narrow_projection(sqlite_only, recorder):
    full = _full_table_bytes()
    recorder.statements.clear(); recorder.bytes = 0
    news_service.calculate_metrics(FilterParams())
    selects = _article_selects(recorder)
    assert len(selects) == 1, f"metrics must read the articles table once, ran: {selects}"
    cols = _select_list(selects[0])
    assert "*" not in cols
    for heavy in ("tamil_variations", "summary", "tamil_summary", "source_url", "canonical_url", "content_hash", "processing_hash"):
        assert heavy not in cols, f"metrics must not select {heavy}"
    assert recorder.bytes < full * 0.15, f"metrics fetched {recorder.bytes} of {full} bytes"


def test_metrics_with_text_search_adds_only_text_columns(sqlite_only, recorder):
    recorder.statements.clear(); recorder.bytes = 0
    news_service.calculate_metrics(FilterParams(q="rally"))
    selects = _article_selects(recorder)
    assert len(selects) == 1
    cols = _select_list(selects[0])
    assert "tamil_variations" not in cols and "*" not in cols
    assert "title" in cols and "summary" in cols                           # needed by the q filter
    assert recorder.bytes < _full_table_bytes() * 0.45


def test_compare_uses_narrow_read_plus_a_few_id_lookups(sqlite_only, recorder):
    full = _full_table_bytes()
    recorder.statements.clear(); recorder.bytes = 0
    result = news_service.compare_entities("party", ["DMK", "AIADMK", "TVK"], mode="live")
    selects = _article_selects(recorder)
    bulk = [s for s in selects if "WHERE" not in s.upper()]
    assert len(bulk) == 1 and "tamil_variations" not in _select_list(bulk[0]) and "*" not in _select_list(bulk[0])
    assert len(selects) - len(bulk) <= 3, "recent-article lookups must be per entity / id-bounded"
    assert all("WHERE" in s.upper() and ("id =" in s or "id IN" in s) for s in selects if s not in bulk)
    assert recorder.bytes < full * 0.25
    assert all(len(c.recent_articles) == 3 and c.recent_articles[0].tamil_variations for c in result.comparison)


def test_ingestion_duplicate_lookup_selects_only_the_fields_ingestion_uses(sqlite_only, recorder):
    urls = [f"https://example.test/c/{i}" for i in range(40)]
    full_rows = 40 * (_full_table_bytes() // N_ARTICLES)
    recorder.statements.clear(); recorder.bytes = 0
    found = source_registry.find_existing_articles_batch(canonical_urls=urls, source_urls=[], publisher_guids=[f"guid-{i}" for i in range(40)])
    selects = _article_selects(recorder)
    assert selects and all("*" not in _select_list(s) for s in selects)
    allowed = {"id", "canonical_url", "source_url", "publisher_guid", "content_hash", "processing_hash", "processing_status"}
    for s in selects:
        assert {c.strip() for c in _select_list(s).split(",")} <= allowed
    assert len(found) >= 40
    for rec_dict in found.values():
        assert {"id", "content_hash", "processing_hash", "processing_status"} <= set(rec_dict)
    assert recorder.bytes < full_rows * 0.15


def test_ingestion_lookup_returns_same_matches_and_decisions_as_before(sqlite_only):
    """Same keys map to the same article ids and the values ingestion compares are unchanged."""
    urls = [f"https://example.test/c/{i}" for i in (0, 5, 63)] + ["https://example.test/missing"]
    found = source_registry.find_existing_articles_batch(canonical_urls=urls, source_urls=[], publisher_guids=["guid-7", "nope"])
    assert found["https://example.test/c/5"]["id"] == "art-005"
    assert found["https://example.test/c/5"]["content_hash"] == "ch-5" and found["https://example.test/c/5"]["processing_hash"] == "ph-5"
    assert found["https://example.test/c/5"]["processing_status"] == "processed"
    assert found["guid-7"]["id"] == "art-007"
    assert "https://example.test/missing" not in found and "nope" not in found
    assert found["https://example.test/a/5"]["id"] == "art-005"             # source_url is also a lookup key


# ======================================================================================================================
# Step 4 + brief: the article LIST, /updates, related articles and the brief service no longer download tamil_variations
# ======================================================================================================================
from backend.app.services.brief_service import brief_service  # noqa: E402

BIG_VARIATION_STYLES = ["Style 0", "Style 1", "Style 2"]


def _no_variations(model_dict: dict) -> dict:
    d = dict(model_dict)
    d.pop("tamil_variations", None)
    return d


def test_list_items_equal_detail_items_except_tamil_variations(sqlite_only):
    items = news_service.filter_articles(FilterParams())
    assert len(items) == N_ARTICLES
    for a in items[:: 7]:
        assert a.tamil_variations == []                                           # not downloaded for the list
        detail = news_service.get_article_by_id(a.id)["article"]
        assert [v.style for v in detail.tamil_variations] == BIG_VARIATION_STYLES  # detail still has them
        assert _no_variations(_dump(a)) == _no_variations(_dump(detail)), a.id


def test_list_order_and_filters_unchanged(sqlite_only):
    want = json.loads(GOLDEN.read_text(encoding="utf-8"))["list"]
    for name, kw in FILTER_CASES.items():
        assert [a.id for a in news_service.filter_articles(FilterParams(**kw))] == want[name], name


def test_list_query_is_narrow(sqlite_only, recorder):
    full = _full_table_bytes()
    recorder.statements.clear(); recorder.bytes = 0
    news_service.filter_articles(FilterParams())
    selects = _article_selects(recorder)
    assert len(selects) == 1 and "*" not in _select_list(selects[0]) and "tamil_variations" not in _select_list(selects[0])
    for heavy in ("canonical_url", "content_hash", "processing_hash", "publisher_guid"):
        assert heavy not in _select_list(selects[0])
    assert recorder.bytes < full * 0.40, f"list fetched {recorder.bytes} of {full}"


def test_updates_match_old_semantics_without_variations(sqlite_only, recorder):
    with source_registry.get_connection() as conn:                                  # baseline = full rows, filtered in Python
        cur = conn.cursor()
        cur.execute("SELECT * FROM articles ORDER BY published_at DESC")
        baseline_all = [source_registry._row_to_article_dict(r) for r in cur.fetchall()]
    recorder.statements.clear(); recorder.bytes = 0
    first = news_service.get_news_updates(since=None, limit=50)
    assert [a.id for a in first.articles] == [d["id"] for d in baseline_all[:50]]
    since = "2026-10-10T00:00:00+00:00"
    newer = news_service.get_news_updates(since=since, limit=50)
    want = [d["id"] for d in baseline_all if d["first_seen_at"] > since or (d["processed_at"] or "") > since][:50]
    assert [a.id for a in newer.articles] == want and want
    selects = _article_selects(recorder)
    assert selects and all("*" not in _select_list(s) and "tamil_variations" not in _select_list(s) for s in selects)


def test_related_articles_same_as_before_and_one_narrow_read(sqlite_only, recorder):
    pool = [news_service._dict_to_article(d) for d in source_registry.get_live_articles()]
    target = pool[10]
    want = [a for a in pool if a.id != target.id and (any(p in a.party_codes for p in target.party_codes)
                                                       or any(t in a.topics for t in target.topics))][:4]
    recorder.statements.clear(); recorder.bytes = 0
    got = news_service.get_article_by_id(target.id)
    assert [a.id for a in got["related_articles"]] == [a.id for a in want] and want
    assert [_dump(a) for a in got["related_articles"]] == [_dump(a) for a in want]   # related carry full variations like before
    bulk = [s for s in _article_selects(recorder) if "WHERE" not in s.upper()]
    assert len(bulk) == 1 and "tamil_variations" not in _select_list(bulk[0]) and "*" not in _select_list(bulk[0])


def _frozen_windows(articles, period="24h"):
    anchor = datetime(2026, 10, 19, 12, 0, tzinfo=timezone.utc)
    delta = timedelta(days=7) if period == "7d" else timedelta(hours=24)
    return {"current_end": anchor, "current_start": anchor - delta, "prior_end": anchor - delta, "prior_start": anchor - 2 * delta}


def _brief_outputs():
    out = {}
    for period in ("24h", "7d"):
        out[f"trends_{period}"] = _dump(brief_service.get_topic_trends(mode="live", period=period))
        out[f"trends_party_{period}"] = _dump(brief_service.get_topic_trends(mode="live", period=period, party="DMK"))
        out[f"coverage_{period}"] = _dump(brief_service.get_party_leader_coverage(mode="live", period=period))
        b = _dump(brief_service.get_or_generate_brief(mode="live", period=period, force_regenerate=True))
        b.pop("id", None); b.pop("generated_at", None)                              # volatile by design
        out[f"brief_{period}"] = b
    out["search"] = brief_service.search_articles(mode="live", q="rally", limit=20)
    out["search_party"] = brief_service.search_articles(mode="live", party="DMK", limit=20)
    return json.loads(json.dumps(out, default=str, sort_keys=True))


def test_brief_outputs_identical_with_narrow_loader(sqlite_only, monkeypatch):
    monkeypatch.setattr(brief_service, "_get_reporting_windows", _frozen_windows)
    narrow = _brief_outputs()
    # Baseline: the original behaviour (full rows) for exactly the same data.
    monkeypatch.setattr(source_registry, "get_live_articles_for_brief", source_registry.get_live_articles)
    baseline = _brief_outputs()
    assert set(narrow) == set(baseline)
    for k in baseline:
        if k.startswith("search"):
            continue
        assert narrow[k] == baseline[k], f"brief/{k} differs"
    # /api/intelligence/search returns raw article dicts. Same matches, same order, same totals; each narrow article keeps
    # every field the narrow projection provides with identical values (only unused heavy columns are no longer sent).
    for k in ("search", "search_party"):
        assert narrow[k]["total_matched"] == baseline[k]["total_matched"] and narrow[k]["total_matched"] > 0
        assert [a["id"] for a in narrow[k]["articles"]] == [a["id"] for a in baseline[k]["articles"]]
        for n, b in zip(narrow[k]["articles"], baseline[k]["articles"]):
            assert n == {f: b[f] for f in n}, n["id"]
            assert "tamil_variations" not in n and "tamil_variations" in b
            for field in ("id", "published_at", "source_name", "title", "tamil_title", "sentiment", "party_codes", "source_url"):
                assert field in n                                           # everything the brief UI reads is still present
    assert narrow["brief_7d"]["sample_size"] > 0


def test_brief_loader_is_narrow(sqlite_only, recorder, monkeypatch):
    monkeypatch.setattr(brief_service, "_get_reporting_windows", _frozen_windows)
    full = _full_table_bytes()
    recorder.statements.clear(); recorder.bytes = 0
    brief_service.get_topic_trends(mode="live", period="7d")
    selects = _article_selects(recorder)
    assert len(selects) == 1 and "*" not in _select_list(selects[0]) and "tamil_variations" not in _select_list(selects[0])
    for needed in ("content_hash", "source_id", "tamil_summary", "canonical_url"):
        assert needed in _select_list(selects[0])
    assert recorder.bytes < full * 0.40
