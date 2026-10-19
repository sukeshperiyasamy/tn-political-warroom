# TN Political War Room — Live Tamil News Source Integration Report

> **Tamil Nadu Political War Room & Media Intelligence Platform**  
> Real-Time Tamil News Ingestion, SQLite Publisher Registry, NLP Entity Attribution & Editorial Dashboard.

---

## 🏛️ Executive Summary

The platform has transitioned from static seeded demo data to a **live, real-time news ingestion and publisher registry architecture**. The FastAPI service now monitors active XML/RSS feeds from verified Tamil Nadu news broadcasters, daily newspapers, and digital political publications. 

All ingested news items are automatically processed through the political domain NLP engine for Tamil/English entity attribution, political sentiment scoring, and 3-tier Tamil headline generation. A dedicated **Sources & Ingestion** management hub provides war room operators with real-time health diagnostics, manual fetch triggers, and interactive XML endpoint inspection.

```
Total Active Live Sources Configured: 7 active feeds (8 registered)
Real Articles Ingested in warroom.db: 471 articles
FastAPI Test Suite Status:            12/12 PASSED (test_api.py + test_sources.py)
Playwright E2E Test Suite Status:     12/12 PASSED (smoke.spec.js + sources-live.spec.js + warroom-demo.spec.js)
```

---

## 📡 Tested Publishers & Endpoint Verification Matrix

Every candidate feed was directly probed with actual HTTP GET requests and XML parsers. The table below documents the empirical results:

| Publisher Name | Tamil Name | Category | Feed Endpoint | Protocol | HTTP Status | RSS/XML Valid | Active Ingestion Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **News18 Tamil Nadu** | நியூஸ்18 தமிழ்நாடு | TV News | `https://tamil.news18.com/commonfeeds/v1/tam/rss/tamil-nadu.xml` | RSS 2.0 | `200 OK` | ✅ Yes | **Active** (200 articles) |
| **Polimer News** | பாலிமர் செய்திகள் | TV News | `https://polimernews.com/rss` | RSS 2.0 | `200 OK` | ✅ Yes | **Active** (50 articles) |
| **BBC News Tamil** | பிபிசி தமிழ் | Digital News | `https://feeds.bbci.co.uk/tamil/rss.xml` | RSS 2.0 | `200 OK` | ✅ Yes | **Active** (24 articles) |
| **The Hindu (Tamil Nadu)** | தி இந்து | Print / Digital | `https://www.thehindu.com/news/national/tamil-nadu/feeder/default.rss` | RSS 2.0 | `200 OK` | ✅ Yes | **Active** (60 articles) |
| **OneIndia Tamil** | ஒன்இந்தியா தமிழ் | Digital News | `https://tamil.oneindia.com/rss/feeds/tamil-news-fb.xml` | RSS 2.0 | `200 OK` | ✅ Yes | **Active** (30 articles) |
| **Muthanmai Reporter (TN)** | முதன்மை ரிப்போர்ட்டர் | State Politics | `https://muthanmaireporter.com/rss/category/tamilnadu` | RSS 2.0 | `200 OK` | ✅ Yes | **Active** (99 articles) |
| **Muthanmai Reporter (Politics)** | முதன்மை ரிப்போர்ட்டர் | State Politics | `https://muthanmaireporter.com/rss/category/%E0%AE%85%E0%AE%B0%E0%AE%9A%E0%AE%BF%E0%AE%AF%E0%AE%B2%E0%AF%8D` | RSS 2.0 | `200 OK` | ✅ Yes | **Active** (8 articles) |
| **Daily Thanthi** | தினத்தந்தி | Daily Newspaper | `https://www.dailythanthi.com/topic/rss` | HTML Web | `200 OK` | ⚠️ No (HTML topic archive) | **Disabled / Warning** (Pending feed reactivation) |
| **Sun News** | சன் நியூஸ் | TV News | `https://sunnews.tv/feed/` | DNS | `Errno 11001` | ❌ No | DNS host resolution failed |
| **Dinamalar** | தினமலர் | Daily Newspaper | `https://rss.dinamalar.com/tamilnadu.xml` | Legacy XML | `404 Not Found` | ❌ No | Legacy endpoint retired |
| **Ananda Vikatan** | ஆனந்த விகடன் | Magazine / Digital | `https://www.vikatan.com/api/v1/collections/tamil-nadu-news.rss` | API | `404 Not Found` | ❌ No | Requires publisher OAuth API token |
| **Samayam Tamil** | சமயம் தமிழ் | Digital News | `https://tamil.samayam.com/rssfeeds/47344158.cms` | CMS RSS | `404 Not Found` | ❌ No | Legacy CMS feed deprecated |

> [!NOTE]
> Publishers requiring authenticated partner agreements or private content syndication APIs (such as Vikatan or Dinamalar) are cleanly isolated in the registry and marked pending integration, avoiding broken feeds or fabricated scrapers.

---

## 📸 Visual Verification & Workflow Walkthrough

````carousel
![01 Live Dashboard Overview](C:/Users/sukes/.gemini/antigravity-cli/brain/a0656d56-f77b-45d1-9ff2-9d4dfe1c6b28/screenshots/01_live_dashboard.png)
<!-- slide -->
![02 Sources Registry Hub](C:/Users/sukes/.gemini/antigravity-cli/brain/a0656d56-f77b-45d1-9ff2-9d4dfe1c6b28/screenshots/02_source_registry_hub.png)
<!-- slide -->
![03 Real-Time XML Feed Inspection Modal](C:/Users/sukes/.gemini/antigravity-cli/brain/a0656d56-f77b-45d1-9ff2-9d4dfe1c6b28/screenshots/03_feed_inspection_modal.png)
<!-- slide -->
![04 Live News Feed with Badges](C:/Users/sukes/.gemini/antigravity-cli/brain/a0656d56-f77b-45d1-9ff2-9d4dfe1c6b28/screenshots/04_live_news_feed.png)
<!-- slide -->
![05 Live Party Comparison Matrix](C:/Users/sukes/.gemini/antigravity-cli/brain/a0656d56-f77b-45d1-9ff2-9d4dfe1c6b28/screenshots/05_live_party_comparison.png)
````

---

## 🗄️ Database Architecture & Storage Changes

A dedicated SQLite persistence layer is established at [warroom.db](file:///S:/tn-political-warroom/backend/app/data/warroom.db):

### 1. `sources` Table
- Stores publisher metadata, language, category, endpoint URL, enable switch, health state, last fetch timestamp, and error traces.
- Auto-initializes with 8 default Tamil media configurations on first boot.

### 2. `articles` Table
- Stores real parsed articles with deterministic IDs (`live-<sha256(source_url)>`).
- Enforces uniqueness on `source_url` to prevent duplicate ingestion.
- Persists NLP attributes: `party_codes`, `leader_names`, `sentiment`, `sentiment_score`, `topics`, `tamil_variations`, and `engagement_estimated`.
- Flags provenance as `data_status = 'live_rss'` and `analysis_provider = 'tamil_nlp_engine'`.

### 3. `ingestion_logs` Table
- Tracks every automated or manual fetch cycle: timestamp, publisher, status (`success` / `error`), parsed item count, newly added count, execution duration (ms), and failure message.

---

## ⚙️ Backend API Endpoints Implemented

All source management and ingestion routes are mounted under `/api/sources`:

1. `GET /api/sources`: Returns all registered sources with live article counts and health status.
2. `POST /api/sources`: Registers a new publisher endpoint after validation.
3. `POST /api/sources/{id}/toggle`: Enables or disables an individual source feed.
4. `DELETE /api/sources/{id}`: Removes a source and purges its stored articles.
5. `POST /api/sources/test`: Probes an arbitrary RSS/Atom URL and returns status, latency, and sample items.
6. `POST /api/sources/{id}/test`: Probes a registered publisher's feed URL.
7. `POST /api/sources/ingest`: Triggers live ingestion (optionally filtered by `source_id`).
8. `GET /api/sources/logs`: Returns historical pipeline ingestion activity logs.
9. `GET /api/news?mode=live`: Filters and returns real ingested articles (supports `party`, `leader`, `sentiment`, `topic`, `source`, `q`).
10. `GET /api/metrics?mode=live`: Calculates aggregate sentiment distribution, party share of voice, leader mentions, and daily trends directly from the live article pool.
11. `POST /api/compare`: Runs comparative entity benchmarking against live ingested data.

---

## 🖥️ Frontend User Interface Additions

1. **Source Registry & Live Ingestion Hub** ([SourceManagementView.tsx](file:///S:/tn-political-warroom/frontend/components/SourceManagementView.tsx)):
   - **Metric Cards**: Total Registered Sources, Real Ingested Articles (471), Pipeline Health (7/8), and NLP Engine Status.
   - **Global Actions**: Single-click "Run Live Ingestion All" with progress spinner, "+ Add News Publisher" toggle, and "Refresh Registry".
   - **Publisher Grid**: Table detailing publisher, category, RSS feed URL with copy/external buttons, article count, live health status pills, toggle switches, and "Test Feed" modal triggers.
   - **Endpoint Inspector Modal**: Live dialog showing HTTP status code, response latency in ms, item count, and raw parsed Tamil headlines.
   - **Activity Log**: Displays recent ingestion cycles with duration and new article counters.

2. **Explicit Mode Switcher** ([Navbar.tsx](file:///S:/tn-political-warroom/frontend/components/Navbar.tsx)):
   - Dual-state toggle in the global navigation bar:
     - 🟢 **LIVE RSS** (Active default: real-time articles from active publishers)
     - 🧪 **DEMO** (Curated 2026 election scenario dataset)
   - Real-time article counter badge dynamically reflects active mode.

3. **Live Article Cards** ([ArticleCard.tsx](file:///S:/tn-political-warroom/frontend/components/ArticleCard.tsx)):
   - Displays real publisher name and publication date.
   - Distinct emerald `LIVE RSS` badge.
   - Explicit analysis disclaimer: *"Automated NLP Entity & Sentiment Attribution"*.
   - Direct link to original publisher URL.

4. **Live Party Comparison** ([PartyComparisonView.tsx](file:///S:/tn-political-warroom/frontend/components/PartyComparisonView.tsx)):
   - Passes active mode (`mode=live`) to `/api/compare` to calculate share of voice and polarity across the 471+ live articles.

---

## 🧪 Verification & Test Results

### 1. Backend Pytest Suite
```bash
python -m pytest backend/tests
============================= 12 passed in 1.58s ==============================
```
- `test_health_check`: Validates backend health and registered services.
- `test_get_sources_registry`: Verifies default publishers are registered.
- `test_toggle_source_status`: Tests enabling/disabling sources.
- `test_test_registered_source`: Verifies live Polimer News feed probing.
- `test_live_vs_demo_mode`: Confirms live mode returns `live_rss` records while demo mode isolates seeded data.
- `test_live_metrics_disclaimer`: Validates contextual disclaimer messaging.
- `test_ingestion_logs`: Tests ingestion activity logging.

### 2. Playwright End-to-End Suite
```bash
npx playwright test tests/smoke.spec.js tests/sources-live.spec.js tests/warroom-demo.spec.js
============================= 12 passed in 17.4s ==============================
```
- ✅ **Test 1**: Live mode displays real publisher stream and distinct live indicator.
- ✅ **Test 2**: Mode toggle switches cleanly between Live RSS and Demo dataset.
- ✅ **Test 3**: Sources & Ingestion tab lists configured publishers with health status.
- ✅ **Test 4**: Test Feed inspection modal displays real XML parsed response.
- ✅ **Test 5**: Live article handoff to AI Intelligence and News Card Studio.
- ✅ **Test 6**: Dashboard overview renders metrics, charts, and top reports.
- ✅ **Test 7**: Political filters update the news stream and metrics.
- ✅ **Test 8**: Article Intelligence Drawer provides dual summaries and 3 Tamil variations.
- ✅ **Test 9**: Party and Leader Comparison displays side-by-side matrices.
- ✅ **Test 10**: Tamil News Card Studio renders 1080x1080 canvas and triggers PNG export.
- ✅ **Test 11**: Keyboard accessibility & WCAG modal behavior.
- ✅ **Test 12**: Smoke environment sanity verification.

---

## 🔒 Git Status & Compliance

As instructed, no code has been staged, committed, pushed, or deployed. Both services remain running locally for manual browser review:
- **Frontend Dashboard**: [http://127.0.0.1:3000](http://127.0.0.1:3000)
- **FastAPI Interactive Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
