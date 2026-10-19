# Phase 4: Social Media Discovery, Trending Intelligence & Demo Lab — Final Engineering & Verification Report

**Executive Summary**  
The **Tamil Nadu Political War Room** has been successfully elevated into a comprehensive, multi-source **Social Media Discovery & Trending Intelligence Lab**. Building upon the Phase 3.1 production data-integrity foundations (strict LIVE/DEMO isolation, immutable snapshot tracking, and time-aware momentum), Phase 4 delivers real-time public narrative tracking, cross-platform story propagation analysis, platform-aware normalization, and an interactive deterministic demonstration lab.

---

## 1. Architecture Overview & Core Capabilities

The Phase 4 architecture unites public web signals across 7 distinct media channels into a unified political intelligence pipeline:

```mermaid
flowchart TD
    subgraph Data Sources ["1. Multi-Source Public Ingestion (7 Channels)"]
        YT["YouTube Data API v3\n(Political Channels & Speeches)"]
        X["X (Twitter) v2 API\n(Official Handles & Partisans)"]
        IG["Instagram Graph API\n(Public Political Reels)"]
        FB["Facebook Graph API\n(Public Party Pages)"]
        RD["Reddit JSON API\n(r/tamilnadu & r/chennai)"]
        NW["Tamil News RSS Wires\n(Verified Regional Press)"]
        GT["Google Trends Daily/Hourly\n(Search Interest Velocity)"]
    end

    subgraph Pipeline ["2. Discovery & Processing Services"]
        SCH["SocialScheduler\nBounded Polling & Concurrency Lock"]
        EM["TamilEntityMatcher\nDisambiguation & Negative Guards"]
        TE["TrendEngine\nPlatform Normalization & Momentum"]
        DED["Deduplicator & Clustering\nProgression Timeline Reconstructor"]
        SCN["DemoScenarioEngine\n4 Deterministic Progressive Scenarios"]
    end

    subgraph Storage ["3. Isolated SQLite Storage Engine"]
        LIVE_DB[("social_posts (mode='LIVE')\nengagement_snapshots\nsocial_fetch_runs")]
        DEMO_DB[("social_posts (mode='DEMO')\ndemo_scenario_state")]
    end

    subgraph UI ["4. Editorial Discovery Lab Interface"]
        HEALTH["Source Health & Telemetry Strip (7 Connectors)"]
        SIMLAB["Interactive Political Scenario Lab (Stages 1-4)"]
        PULSE["Ranked Topic Momentum Badges (6 Dimensions)"]
        TIMELINE["Narrative Propagation Timeline Modal"]
        STREAM["Public Normalized Post Stream (Percentile Bins)"]
        DISCLAIMER["Methodology & Electorate Disclaimer Modal"]
    end

    Data Sources --> SCH
    SCH --> EM
    EM --> TE
    TE --> DED
    DED --> LIVE_DB
    SCN --> DEMO_DB

    LIVE_DB --> UI
    DEMO_DB --> UI
```

---

## 2. Ingestion Scheduler & Connector Reliability

### 2.1 Bounded Scheduling & Diagnostics
- **Scheduler Architecture** ([`SocialScheduler`](file:///S:/tn-political-warroom/backend/app/services/social_scheduler.py)): Background threads execute with per-connector `threading.Lock` primitives to prevent overlapping polls or rate-limit exhaustion.
- **Diagnostic Run Logging** (`social_fetch_runs` table): Records run start/finish timestamps, HTTP response statuses, quota consumption, records discovered, inserted, updated, and rejected.
- **Rate-Limit Budgets & Graceful Backoff**: If a connector encounters an authentication requirement or quota cap (`AUTH_REQUIRED`), the scheduler gracefully flags the connector health without impacting active news or demo pipelines.

### 2.2 Connector Platform Matrix

| Platform | Ingestion Strategy | Authenticated Capability | Fallback & Public Discovery |
| :--- | :--- | :--- | :--- |
| **YouTube** | Official Data API v3 (`search().list`, `videos().list`) | Channel video discovery, view counts, comment counts | Bounded RSS feed discovery for regional news broadcasters |
| **X (Twitter)** | Twitter API v2 (`tweets/search/recent`) | Public search queries, retweets, replies, quote counts | Direct syndication feeds & public wire discovery |
| **Instagram** | Instagram Graph API / Public Embed API | Reel/post discovery, like counts, public caption NLP | Verified party Instagram channel tracking |
| **Facebook** | Meta Graph API (`/feed` endpoint) | Public political party pages (`arivalayam`, `aiadmk`) | Public political announcement feeds |
| **Reddit** | Public Reddit JSON API (`r/tamilnadu`, `r/chennai`) | Discussion score, upvote ratio, comment count | Read-only public subreddit JSON without OAuth requirement |
| **Tamil News RSS** | Feedparser with ETag & Last-Modified caching | Verified regional reporting, full article text | Native War Room RSS pipeline (News18, Polimer, BBC, Hindu) |
| **Google Trends** | Pytrends / Google Trends Public Feeds | Search interest index (0-100), regional geo-breakdown | Tamil Nadu regional query momentum tracking |

---

## 3. Bilingual Entity Matching & NLP Disambiguation

A critical innovation in Phase 4 is strict disambiguation for Tamil political parties, leaders, and policy topics to eliminate false positive noise in media analysis:

### 3.1 Negative Lookbehind for Tamil Party Acronyms
In the Tamil script, `"திமுக"` (DMK) is an exact substring within `"அதிமுக"` (AIADMK) and `"மதிமுக"` (MDMK). In naive substring search, any mention of AIADMK falsely flagged a DMK match.
- **Solution**: Implemented regex boundary lookbehind `(?<![அம])திமுக`.
- **Result**: Matches genuine DMK references while strictly preventing false positive AIADMK/MDMK captures.

### 3.2 Negative Context Exclusions
- **Thalapathy Vijay (TVK)**: Distinguishes between film/entertainment reporting and political movement coverage. Keywords such as `"box office"`, `"theatre"`, `"collections"`, `"boxoffice"`, `"first day first show"`, or `"audio launch"` (in the absence of TVK political terms) are filtered from political leader metrics.
- **Edappadi K. Palaniswami (EPS)**: Distinguishes between political mentions and financial reporting (where `"EPS"` denotes *Earnings Per Share* alongside `"quarter"`, `"net profit"`, or `"revenue"`).

### 3.3 Match Evidence & Confidence Scores
Each normalized record persists an auditable `matched_entities` payload:
```json
[
  {
    "entity_name": "Tamizhaga Vettri Kazhagam",
    "tamil_name": "தமிழக வெற்றிக் கழகம்",
    "entity_type": "party",
    "party_code": "TVK",
    "confidence": 0.95,
    "evidence": "தமிழக வெற்றிக் கழகம் தலைவர் விஜய் விக்கிரவாண்டி மாநாட்டில்...",
    "matched_keyword": "தவெக"
  }
]
```

---

## 4. Platform-Aware Normalization & Ranking Dimensions

### 4.1 Solving the Cross-Platform Metric Dilemma
Directly comparing raw numbers between platforms (e.g. comparing 500,000 YouTube video views against 500 Reddit upvotes or 5,000 X reposts) creates severe distortion.
Phase 4 solves this through **Within-Platform Percentile Normalization**:
$$\text{Percentile} = \left( 1 - \frac{\text{Rank within Platform}}{\text{Total Platform Posts}} \right) \times 100$$
The UI displays badges such as `TOP 5% IN YOUTUBE` or `TOP 1% IN X`, allowing direct cross-platform comparison of cultural impact without scale bias.

### 4.2 Multi-Dimensional Ranking Modes
Users can filter and rank posts across 6 distinct analytical dimensions:
1. **Composite Momentum (`trending`)**: Balances recent engagement velocity with source cross-pollination.
2. **Fastest Growing (`fastest_growing`)**: Ranks by instantaneous acceleration ($\frac{\Delta \text{Engagement}}{\Delta t}$) from time-series snapshots.
3. **Most Discussed (`most_discussed`)**: Prioritizes comment and reply volume (signaling active controversy or debate).
4. **Most Liked (`most_liked`)**: Prioritizes total affirmative public reactions.
5. **Most Shared (`most_shared`)**: Prioritizes retweets, shares, and reposts (viral reach).
6. **Cross-Platform (`most_cross_platform`)**: Highlights posts belonging to stories that have broken out across multiple media networks.
7. **Latest (`recent`)**: Chronological publication stream.

### 4.3 Observation History Confidence
To prevent newly ingested items with only 1 observation from displaying misleading momentum values, the system explicitly computes history confidence:
- $\ge 2$ snapshots: Displays exact velocity and acceleration state.
- $< 2$ snapshots: Labeled `"Not enough observations"` until subsequent background polling cycles occur.

---

## 5. Interactive Political Demo Scenario Lab

To empower high-impact executive demonstrations without reliance on third-party live API quotas, Phase 4 includes 4 deterministic political scenarios with progressive step execution:

### 5.1 The 4 Scenarios

| Scenario ID | Name & Focus | Key Parties & Leaders | Progression Stages (1 to 4) |
| :--- | :--- | :--- | :--- |
| **`scenario_policy_announcement`** | **Magalir Urimai Expansion**<br>Major government welfare policy announcement | DMK, AIADMK<br>M.K. Stalin, EPS | **Stage 1**: Verified news wires break announcement.<br>**Stage 2**: Ministers post on X; public eligibility queries surge.<br>**Stage 3**: AIADMK raises budgetary allocation critique.<br>**Stage 4**: Full cross-platform narrative consolidation across 5 channels. |
| **`scenario_leader_speech`** | **TVK Vikravandi Rally**<br>High-velocity party rally & address | TVK, DMK, AIADMK<br>Thalapathy Vijay | **Stage 1**: Conference begins with live Tamil TV streams.<br>**Stage 2**: Vijay delivers address; YouTube live views spike.<br>**Stage 3**: Key clips go viral on Instagram Reels & X clips.<br>**Stage 4**: In-depth Reddit and media debates on vote-share dynamics. |
| **`scenario_political_controversy`** | **Power Tariffs & TANGEDCO**<br>Opposition controversy surge and dissipation | AIADMK, BJP, DMK<br>K. Annamalai, EPS | **Stage 1**: Opposition agitations announced in Coimbatore/Tiruppur.<br>**Stage 2**: High social acceleration; hashtag enters `#1 Trending`.<br>**Stage 3**: Electricity Minister issues clarification and subsidy scheme.<br>**Stage 4**: Controversy momentum decelerates and stabilizes. |
| **`scenario_cross_party_debate`** | **Cauvery Water Rights**<br>Inter-state riparian dispute | DMK, AIADMK, BJP, NTK<br>M.K. Stalin, Seeman | **Stage 1**: Farmer protests break out across Thanjavur & Delta.<br>**Stage 2**: All major regional parties issue statements.<br>**Stage 3**: Regional hashtags dominate social media trends.<br>**Stage 4**: Multi-source national debate coverage. |

### 5.2 Deterministic Replay Engine
- State is tracked in the `demo_scenario_state` database table.
- When an analyst clicks any stage (e.g., **Stage 2**), the system deterministically purges previous stage posts for that scenario, inserts the precise stage posts with `collection_mode = 'DEMO'`, inserts realistic time-offset engagement snapshots, and recalculates cluster linkages.
- **Zero Live Data Pollution**: All demo scenario records carry `collection_mode = 'DEMO'` and are strictly isolated from production queries.

---

## 6. Narrative Progression Timeline & Lag Calculation

When a story cluster is formed, the **Narrative Timeline Reconstructor** ([`deduplicator.py`](file:///S:/tn-political-warroom/backend/app/services/deduplicator.py)) traces the lifecycle of the story:
1. **Origin Detection**: Identifies the earliest verified record (typically a regional news wire or press release).
2. **Propagation Lag**: Computes the exact latency (in minutes) between the initial news report and viral breakout on social networks.
3. **Modal Visualization**: Provides a visual progression tree showing the transmission path:  
   *Verified Press Wire* $\rightarrow$ *Official Leader Post (X)* $\rightarrow$ *Short-Form Video (Instagram/YouTube)* $\rightarrow$ *Community Debate (Reddit)*.

---

## 7. Mandatory Electorate Representation Disclaimer

To uphold the highest editorial and methodological integrity standards, both the backend methodology endpoint and the frontend UI prominently display the mandatory research disclaimer:

> [!IMPORTANT]
> **Mandatory Electorate Representation Disclaimer**  
> *This system is a media discovery, narrative tracking, and public engagement analytics tool. Social media activity and online publisher volume reflect public web discussion, platform virality, and media reporting. They do NOT represent the voting intentions or political sentiment of the entire electorate of Tamil Nadu.*

---

## 8. Visual Verification & Screenshot Gallery

The complete interface was verified across desktop and mobile viewports using Playwright:

````carousel
![Desktop Overview](file:///C:/Users/sukes/.gemini/antigravity-cli/brain/a0656d56-f77b-45d1-9ff2-9d4dfe1c6b28/screenshots/18_social_discovery_lab_desktop.png)
<!-- slide -->
![Demo Scenario Replay](file:///C:/Users/sukes/.gemini/antigravity-cli/brain/a0656d56-f77b-45d1-9ff2-9d4dfe1c6b28/screenshots/19_demo_scenario_lab_replay.png)
<!-- slide -->
![Platform-Aware Percentile Ranking](file:///C:/Users/sukes/.gemini/antigravity-cli/brain/a0656d56-f77b-45d1-9ff2-9d4dfe1c6b28/screenshots/20_platform_percentile_ranking.png)
<!-- slide -->
![Narrative Propagation Timeline Modal](file:///C:/Users/sukes/.gemini/antigravity-cli/brain/a0656d56-f77b-45d1-9ff2-9d4dfe1c6b28/screenshots/21_narrative_timeline_modal.png)
<!-- slide -->
![Methodology & Electorate Disclaimer Modal](file:///C:/Users/sukes/.gemini/antigravity-cli/brain/a0656d56-f77b-45d1-9ff2-9d4dfe1c6b28/screenshots/22_methodology_disclaimer_modal.png)
<!-- slide -->
![Mobile Responsive Discovery Lab](file:///C:/Users/sukes/.gemini/antigravity-cli/brain/a0656d56-f77b-45d1-9ff2-9d4dfe1c6b28/screenshots/23_social_discovery_lab_mobile.png)
````

### Detailed Captions
- **Figure 18 (`18_social_discovery_lab_desktop.png`)**: Master Social Discovery Lab dashboard showing 7 connector health badges, interactive scenario lab, ranked topic momentum badges, cross-media clusters, and public posts feed.
- **Figure 19 (`19_demo_scenario_lab_replay.png`)**: Interactive Scenario Simulation Lab showing 4 political scenario options, active Stage 2 selection, and stage progression visualizer.
- **Figure 20 (`20_platform_percentile_ranking.png`)**: Normalized post stream highlighting within-platform percentile badges (`TOP 0% IN X`, `TOP 17% IN YOUTUBE`), engagement rate percentages, and entity match chips.
- **Figure 21 (`21_narrative_timeline_modal.png`)**: Narrative Propagation Timeline modal showing 4 platforms involved, 120-minute transmission lag, and chronologically ordered post stages with individual step latencies.
- **Figure 22 (`22_methodology_disclaimer_modal.png`)**: Transparent methodology panel displaying the 4-component momentum formula, clustering thresholds, within-platform percentile normalization, and the prominent Electorate Disclaimer.
- **Figure 23 (`23_social_discovery_lab_mobile.png`)**: Mobile responsive layout (390×844) with mobile navigation strip, stacked scenario cards, and mobile-optimized feed view.

---

## 9. Verification & Test Suite Summary

### 9.1 Backend Test Suite (`pytest`)
- **Total Tests**: **54 / 54 PASSED** (0 failures, 0 regressions).
- **Phase 4 Specific Suite** ([`test_social_discovery_lab.py`](file:///S:/tn-political-warroom/backend/tests/test_social_discovery_lab.py)): **13 dedicated tests**:
  - `test_social_scheduler_lock_and_diagnostics`: Validates single-worker concurrency lock and execution logging.
  - `test_entity_matcher_disambiguation_dmk_aiadmk`: Verifies `(?<![அம])திமுக` lookbehind rejects false positives.
  - `test_entity_matcher_negative_context_cinema_and_finance`: Verifies exclusion of box office and corporate EPS articles.
  - `test_entity_matcher_rich_metadata`: Validates `matched_entities` schema and evidence snippets.
  - `test_demo_scenario_engine_stages`: Verifies deterministic Stage 1 through Stage 4 state transitions.
  - `test_platform_aware_percentile_normalization`: Verifies within-platform percentile ranks.
  - `test_ranking_dimensions_fastest_growing`: Verifies ranking by time-series acceleration.
  - `test_ranking_dimensions_most_discussed_and_shared`: Verifies comment and share dimension sorting.
  - `test_cluster_timeline_reconstruction`: Verifies chronological progression and lag calculation.
  - `test_methodology_endpoint_and_disclaimer`: Verifies presence of the mandatory electorate disclaimer.
  - `test_api_trend_explorer`: Verifies aggregated time-series buckets.
  - `test_api_demo_scenarios_list_and_detail`: Verifies scenario metadata endpoints.
  - `test_api_replay_scenario_endpoint`: Verifies HTTP POST replay triggering.

### 9.2 Frontend Playwright E2E Suite
- **Total Tests**: **6 / 6 PASSED** in 9.2s ([`social-discovery-lab.spec.js`](file:///S:/tn-political-warroom/tests/social-discovery-lab.spec.js)).
  - Test 1: Navigation to Discovery Lab tab, masthead rendering, 7 connector health items.
  - Test 2: Scenario card switching and deterministic Stage 2 replay.
  - Test 3: Platform-aware ranking dimensions (`fastest_growing`, `most_cross_platform`, `most_discussed`) and percentile badges.
  - Test 4: Narrative progression timeline modal opening and stage latency inspection.
  - Test 5: Methodology and Electorate Disclaimer modal verification.
  - Test 6: Mobile viewport responsive layout verification.

### 9.3 Build & Type Integrity
- **Next.js Turbopack Build**: `npm --prefix frontend run build` completed with **0 errors**, **0 warnings**, and fully type-checked TypeScript definitions.
- **Git State**: Clean working directory. **0 commits, 0 pushes, 0 tags created**, strictly adhering to operational guidelines.

---

## 10. Conclusion & Production Readiness Assessment

Phase 4 successfully delivers a production-grade **Social Media Discovery & Trending Intelligence Lab**. The system provides unmatched visibility into public political conversations across Tamil Nadu while maintaining strict mathematical transparency, reliable data isolation, and robust bilingual NLP precision.
