# TN Political War Room — Phase 3: Multi-Source Social Media Intelligence & Trending Engine

**Implementation & Verification Report**  
*Date: October 18, 2026 | Environment: Windows / Node 20 / Python 3.13 / Next.js 16.4.2 / FastAPI*

---

## Executive Summary

Phase 3 extends the **TN Political War Room** from a news/RSS aggregator into an integrated, multi-source political intelligence platform. The platform discovers, ingests, normalizes, ranks, and visualizes public political content across **YouTube**, **𝕏 (Twitter)**, **Meta Instagram**, **Meta Facebook Pages**, **Reddit**, **Tamil News Wires**, and **Google Trends**.

All implementations adhere strictly to the read-only public data mandate (zero automated posting, liking, scraping private accounts, or targeting). All 37 backend tests and 38 Playwright E2E browser tests pass with a **100% success rate**. All modifications remain reviewable in the Git working tree without unapproved commits or pushes.

---

## 1. Modular Source Connector Architecture

A common abstract interface was established in [`backend/app/connectors/base.py`](file:///S:/tn-political-warroom/backend/app/connectors/base.py) enforcing a contract for configuration validation, non-destructive health checks, rate-limit and quota monitoring, error isolation, search querying, and payload normalization into standardized `NormalizedPost` objects.

```
                            ┌────────────────────────────────────────┐
                            │          BaseConnector (ABC)           │
                            │  validate_configuration()              │
                            │  health_check()                        │
                            │  search() / fetch_item()               │
                            │  normalize() -> NormalizedPost         │
                            │  get_quota_status()                    │
                            └───────────────────┬────────────────────┘
                                                │
       ┌──────────────┬──────────────┬──────────┴───┬──────────────┬──────────────┬──────────────┐
       ▼              ▼              ▼              ▼              ▼              ▼              ▼
┌─────────────┐┌─────────────┐┌─────────────┐┌─────────────┐┌─────────────┐┌─────────────┐┌─────────────┐
│   YouTube   ││      𝕏      ││  Instagram  ││  Facebook   ││   Reddit    ││  News RSS   ││Google Trends│
│ Data API v3 ││   API v2    ││  Graph API  ││  Graph API  ││ Community   ││ Wire Adapter││Search Wire  │
└─────────────┘└─────────────┘└─────────────┘└─────────────┘└─────────────┘└─────────────┘└─────────────┘
```

### Connector Specifications & Status Handling

| Platform | Connector Class | Primary Credentials / Auth | Supported Metrics | Quota / Rate Limit | Status Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **YouTube** | [`YouTubeConnector`](file:///S:/tn-political-warroom/backend/app/connectors/youtube.py) | `YOUTUBE_API_KEY` | Views, Likes, Comments | 10,000 units/day | Graceful `NOT_CONFIGURED` when key missing; batch fetches snippet + statistics |
| **𝕏 (Twitter)** | [`XConnector`](file:///S:/tn-political-warroom/backend/app/connectors/x_api.py) | `X_BEARER_TOKEN` | Likes, Reposts, Replies, Quotes, Impressions | 10,000 reads/mo | Returns `NOT_CONFIGURED` with Developer Portal setup instructions |
| **Instagram** | [`InstagramConnector`](file:///S:/tn-political-warroom/backend/app/connectors/instagram.py) | `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_ACCOUNT_ID` | Likes, Comments, Impressions, Reach | 200 calls/hr | Connects to authorized Professional / Creator accounts |
| **Facebook** | [`FacebookConnector`](file:///S:/tn-political-warroom/backend/app/connectors/facebook.py) | `FACEBOOK_PAGE_ACCESS_TOKEN`, `FACEBOOK_PAGE_ID` | Likes, Comments, Shares, Reactions | 200 calls/hr | Reads public page posts with engagement breakdown |
| **Reddit** | [`RedditConnector`](file:///S:/tn-political-warroom/backend/app/connectors/reddit.py) | Compliant User-Agent / OAuth | Upvotes, Comments, Awards | 60 req/min | Actively monitors `r/tamilnadu` and `r/chennai` |
| **News Wire** | [`NewsRSSConnector`](file:///S:/tn-political-warroom/backend/app/connectors/news_rss.py) | Internal SQLite `sources` | Article count, Publishers | Unlimited | Bridges 8 configured Tamil regional wire sources |
| **Google Trends** | [`GoogleTrendsConnector`](file:///S:/tn-political-warroom/backend/app/connectors/google_trends.py) | Public regional search RSS | Search Traffic, Approx Volume | 120 req/hr | Reads live search surge data for India / Tamil Nadu |

---

## 2. Database Schema & Idempotent Migrations

Implemented in [`backend/app/data/migrations.py`](file:///S:/tn-political-warroom/backend/app/data/migrations.py) to preserve existing tables (`sources`, `articles`, `ingestion_logs`, `intelligence_briefs`) while introducing relational structures for time-series velocity tracking and story clustering.

1. **`social_posts`**: Stores unified posts with unique constraint `(platform, platform_post_id)`. Tracks `views_count`, `likes_count`, `comments_count`, `shares_count`, `quotes_count`, `trend_score`, `growth_rate_per_hour`, and `collection_mode` (`LIVE` vs `DEMO`).
2. **`engagement_snapshots`**: Stores timestamped observation points (`post_id`, `observed_at`, `likes`, `comments`, `shares`, `views`, `growth_rate_per_hour`) enabling authentic growth curves and hourly velocity calculations.
3. **`story_clusters`**: Aggregates multi-source narratives with `lead_story`, `platforms_involved`, `time_lag_minutes`, and `total_engagement`.
4. **`social_connectors`**: Tracks runtime operational status (`HEALTHY`, `CONFIGURED`, `NOT_CONFIGURED`, `RATE_LIMITED`), daily quota consumption, and setup instructions.
5. **`topic_registry`**: Normalizes Tamil Nadu political issues with bilingual keywords, hashtags, negative exclusion rules, and entity associations.

---

## 3. Entity Matcher & Sentiment Engine

Built in [`backend/app/services/entity_matcher.py`](file:///S:/tn-political-warroom/backend/app/services/entity_matcher.py):

- **Parties Tracked**: DMK, AIADMK, BJP, TVK, NTK, VCK, INC, PMK.
- **Leaders Tracked**: M.K. Stalin, Udhayanidhi Stalin, Edappadi K. Palaniswami, Thalapathy Vijay, K. Annamalai, Seeman, Thol. Thirumavalavan, Dr. Anbumani Ramadoss.
- **Core Topics**: 2026 Assembly Election, Kalaignar Magalir Urimai Thogai, TVK Political Entry, Power Tariffs & TANGEDCO, Cauvery Riparian Rights, Industrial Investment & Sipcot, Chennai Infrastructure & Monsoon Drainage, Law & Order.
- **Stemmed Tamil Sentiment**: Distinguishes editorial praise (`வெற்றி`, `சாதனை`, `முன்னேற்றம்`) from public criticism and protest (`கண்டனம்`, `மோச`, `எதிர்ப்பு`, `நெருக்கடி`).

---

## 4. Transparent Multi-Source Trending Engine

Implemented in [`backend/app/services/trend_engine.py`](file:///S:/tn-political-warroom/backend/app/services/trend_engine.py):

$$\text{trend\_score} = 0.40 \cdot \text{engagement\_growth} + 0.30 \cdot \text{post\_volume\_growth} + 0.20 \cdot \text{cross\_source\_presence} + 0.10 \cdot \text{recency}$$

### Platform Weight Normalization
To prevent millions of passive video views from drowning out intense multi-platform discussions, standardized engagement points are computed:
- **YouTube**: $0.02 \times \text{views} + 1.0 \times \text{likes} + 2.5 \times \text{comments}$
- **𝕏 (Twitter)**: $1.0 \times \text{likes} + 2.0 \times \text{replies} + 3.0 \times \text{reposts} + 3.0 \times \text{quotes} + 0.005 \times \text{impressions}$
- **Reddit**: $1.5 \times \text{upvotes} + 3.0 \times \text{comments}$
- **Facebook**: $1.0 \times \text{likes} + 2.0 \times \text{comments} + 3.5 \times \text{shares}$
- **Instagram**: $1.0 \times \text{likes} + 2.5 \times \text{comments}$
- **News Wire**: Baseline $25.0$ editorial credit per verified publisher article.

### Hourly Velocity & Cold-Start Guardrails
- Compares sequential observations in `engagement_snapshots`.
- If insufficient observation points exist, velocity displays `INSUFFICIENT_HISTORY` or baseline without inventing false percentages.
- Recency applies exponential decay with a 36-hour half-life ($\exp(-t / 36)$).

---

## 5. Editorial Frontend Architecture

Built in [`frontend/components/SocialIntelligenceView.tsx`](file:///S:/tn-political-warroom/frontend/components/SocialIntelligenceView.tsx) and wired through [`frontend/components/Navbar.tsx`](file:///S:/tn-political-warroom/frontend/components/Navbar.tsx):

- **Live Political Pulse Telemetry**: 4 top cards displaying active connectors, #1 trending issue with score, total indexed records, and active story clusters.
- **Trending Now Leaderboard**: Ranked issues with real-time score pills (e.g. `85.8/100`), platform presence badges, and sub-score decomposition (`Engage`, `Volume`, `Cross`, `Recency`).
- **Normalized Social Posts Grid**: Post cards featuring custom SVG platform badges, publisher/author details, video thumbnails with play overlays, verified Tamil text, engagement counters, entity pills, and live velocity pills.
- **Observation History Modal**: Displays timestamped snapshot records over time (`views`, `likes`, `comments`, `shares`) for any post.
- **Methodology Modal**: Explains formula weights and anti-bias principles.
- **Story Clusters Panel**: Visualizes multi-source spread (e.g., News wire broke at 10:00 AM $\rightarrow$ 𝕏 erupted at 10:42 AM $\rightarrow$ 42 min reaction lag).
- **Platform Comparison Matrix**: Tabular breakdown of volume, engagement points, and party voice distribution.
- **Connectors Hub**: Live status badges, quota consumption meters, liveness test buttons, and accordion setup guides.

---

## 6. Test Verification & Visual Evidence

### Backend Pytest Results
```
collected 37 items
backend/tests/test_api.py ......                                         [ 16%]
backend/tests/test_ingestion_and_freshness.py .......                    [ 35%]
backend/tests/test_intelligence_brief.py .......                         [ 54%]
backend/tests/test_social_intelligence.py ...........                    [ 83%]
backend/tests/test_sources.py ......                                     [100%]

============================= 37 passed in 2.40s ==============================
```

### Playwright E2E Suite Results
```
Running 38 tests using 1 worker
  ok brief-intelligence.spec.js (4 tests)
  ok capture-live-screenshots.spec.js (1 test)
  ok chart-layout.spec.js (7 tests)
  ok smoke.spec.js (1 test)
  ok sources-live.spec.js (6 tests)
  ok visual-inspection.spec.js (5 tests)
  ok warroom-demo.spec.js (6 tests)
  ok social-intelligence.spec.js (8 tests)

============================= 38 passed in 46.8s ==============================
```

---

## Visual Gallery of Phase 3 Screenshots

### 1. Live Political Pulse & Trending Feed (Desktop)
![Social Intelligence Pulse Desktop](file:///C:/Users/sukes/.gemini/antigravity-cli/brain/a0656d56-f77b-45d1-9ff2-9d4dfe1c6b28/screenshots/11_social_intelligence_pulse_desktop.png)

### 2. Time-Series Engagement Observation Modal
![Observation History Modal](file:///C:/Users/sukes/.gemini/antigravity-cli/brain/a0656d56-f77b-45d1-9ff2-9d4dfe1c6b28/screenshots/12_social_post_snapshot_history_modal.png)

### 3. Transparent Trend Methodology Modal
![Methodology Modal](file:///C:/Users/sukes/.gemini/antigravity-cli/brain/a0656d56-f77b-45d1-9ff2-9d4dfe1c6b28/screenshots/13_trending_methodology_modal.png)

### 4. Cross-Platform Story Clusters & Narrative Echo
![Cross-Platform Story Clusters](file:///C:/Users/sukes/.gemini/antigravity-cli/brain/a0656d56-f77b-45d1-9ff2-9d4dfe1c6b28/screenshots/14_cross_platform_story_clusters.png)

### 5. Platform Comparison Matrix
![Platform Comparison Matrix](file:///C:/Users/sukes/.gemini/antigravity-cli/brain/a0656d56-f77b-45d1-9ff2-9d4dfe1c6b28/screenshots/15_platform_comparison_matrix.png)

### 6. Data Connectors & Quota Hub
![Data Connectors Hub](file:///C:/Users/sukes/.gemini/antigravity-cli/brain/a0656d56-f77b-45d1-9ff2-9d4dfe1c6b28/screenshots/16_social_connectors_hub.png)

### 7. Mobile Responsive Layout (390×844)
![Social Intelligence Mobile](file:///C:/Users/sukes/.gemini/antigravity-cli/brain/a0656d56-f77b-45d1-9ff2-9d4dfe1c6b28/screenshots/17_social_intelligence_mobile.png)

---

## 7. Operational Readiness & Next Steps

1. **Connector Credentials**: Provide `YOUTUBE_API_KEY` or `X_BEARER_TOKEN` in `backend/.env` whenever ready for live social collection. The system operates autonomously in `DEMO` mode with realistic 2026 scenarios when unconfigured.
2. **Background Cron Polling**: Connectors can be scheduled using `/schedule` or backend cron for periodic ingestion.
3. **Repository Working Tree**: All code modifications remain in the local working tree ready for review.
