# Tamil Nadu Political War Room — Client Demo Delivery Report

**Project**: `tn-political-warroom`  
**Target Domain**: Tamil Nadu State Politics & 2026 Assembly Election Media Intelligence  
**Status**: Completed & Verified (100% Automated Test Pass Rate)

---

## 1. Executive Summary & Delivery Scope

We have implemented an editorial-grade political media intelligence platform tailored specifically for monitoring Tamil Nadu politics. The system delivers an authentic war room command center experience for tracking party shares of voice, monitoring media sentiment polarity, generating bilingual strategic summaries with 3 distinct Tamil social hooks, comparing parties and leaders side-by-side, and producing 1080×1080 branded social news cards with instant PNG export.

---

## 2. Core Functional Modules

```mermaid
flowchart TD
    subgraph Data Layer
        A[Verified Seed Media Feeds] --> B[FastAPI Backend / Offline Seed Engine]
    end

    subgraph Intelligence Engine
        B --> C[Entity Identification & Sentiment Scoring]
        B --> D[Bilingual Summaries & 3 Tamil Social Hooks]
        B --> E[Comparative Share-of-Voice Aggregation]
    end

    subgraph UI & War Room Workflows
        C --> F[Executive Overview & Metric Cards]
        C --> G[Granular Political Filter Bar]
        D --> H[AI Article Intelligence Drawer]
        E --> I[Party & Leader Comparison Matrix]
        H --> J[News Card Studio 1080x1080]
        J --> K[Authentic 1080p PNG Export]
    end
```

### Module 1: Executive Dashboard & Overview Metrics
- **Live Article Counter & Pipeline Health**: Real-time counter of monitored articles across 8 media portals (*The Hindu Tamil*, *Dinamalar*, *Puthiya Thalaimurai*, *Thanthi TV*, *Dinakaran*, *Polimer News*, *BBC Tamil*, *TOI Chennai*).
- **Sentiment Breakdown**: Stacked visual distribution bar calculating Positive, Neutral, and Critical/Opposition ratios.
- **Party Share of Voice**: Relative discussion volume across DMK, AIADMK, BJP, TVK, NTK, VCK, INC, and PMK.
- **Leader Rankings**: Real-time media mention rankings for M.K. Stalin, Edappadi K. Palaniswami, Thalapathy Vijay, K. Annamalai, Seeman, and Udhayanidhi Stalin.
- **Coverage Trend**: Cyclical 7-day volume tracking.

### Module 2: Granular Political Filter Bar
- Dropdowns for:
  - **Political Party (கட்சி)**
  - **Political Leader (தலைவர்)**
  - **Media Sentiment (மனநிலை)**
  - **Strategic Topic (கருப்பொருள்)**
  - **News Source (ஊடகம்)**
- Instant text search matching headlines, summaries, and party hashtags.
- Dynamic reset control displaying active filter count.

### Module 3: AI Article Intelligence Drawer
- Modal drawer (`role="dialog"`) with `Escape` key support.
- **Entity Identification**: Party badges and leader tags.
- **Sentiment Vector**: Polarity score (-1.0 to +1.0) and descriptive badge.
- **Dual Summaries**: Tamil Executive Summary (*தமிழ் சுருக்கம்*) and English Strategic Intelligence.
- **3 Distinct AI Tamil Social Variations**:
  1. **செய்தித் தலைப்பு (Direct)**: Fast, factual headline.
  2. **அரசியல் பார்வை (Impact)**: 2026 electoral impact analysis.
  3. **வார் ரூம் வைரல் பைட் (Viral Hook)**: Provocative, shareable quote hook.
- Integrated clipboard copy feedback and direct hand-off button to the News Card Studio.

### Module 4: Comparative Political Intelligence
- Multi-entity selector (2 to 4 parties or leaders).
- Side-by-side matrices:
  - Monitored article counts
  - Stacked sentiment percentage bars (Pos / Neu / Neg)
  - Average sentiment score
  - Estimated reader reach / impressions
  - Top strategic topics discussed
  - Related recent reports with quick drawer inspection
- Clear measurement methodology notice.

### Module 5: Branded Tamil News Card Studio
- **1080×1080 Canvas**: Native 1080×1080 resolution rendered at 50% scale for desktop screens.
- **6 Editorial Design Themes**:
  1. *War Room Command (Dark)*: High-contrast midnight aesthetic (`#090D16`).
  2. *Dravidian Horizon*: Movement aesthetic featuring rich crimson and dark accents (`#140608`).
  3. *Puratchi Green*: Heritage emerald and deep forest tones (`#05140A`).
  4. *Dharma Saffron*: Bold contrast saffron and deep umber styling (`#150A02`).
  5. *Vettri Gold*: Dynamic challenger palette in gold and maroon (`#1A1202`).
  6. *The Morning Dispatch*: Clean editorial light aesthetic (`#FAF8F5`).
- **Customizable Controls**:
  - Quick Preset Stories (CM announcement, EPS speech, TVK rally, BJP whitepaper).
  - One-click load of article variations from the intelligence drawer.
  - Party badge branding, category tag, headline, and subheadline inputs.
  - Font size slider (32px - 60px) and alignment toggles.
- **High-Performance Canvas Exporter**:
  - Direct canvas pixel rendering at true 1080×1080 resolution.
  - Native word-wrapping and typography rendering.
  - Download trigger for PNG files (`tn-warroom-card-[timestamp].png`).

---

## 3. Architecture & Code Structure

| Layer | Path | Technology & Responsibilities |
|---|---|---|
| **Backend** | `backend/app/main.py` | FastAPI, Pydantic v2, CORS, REST routers |
| **Data Models** | `backend/app/models.py` | Typed schemas for articles, metrics, comparisons, and card templates |
| **Intelligence Engine** | `backend/app/services/` | Entity attribution, sentiment scoring, English/Tamil summarization |
| **Seed Dataset** | `backend/app/data/seed_data.py` | Curated authentic Tamil political reports across major TN parties |
| **Frontend Framework** | `frontend/app/` | Next.js 16.4.2 App Router, Turbopack, React 19, TypeScript |
| **Styling & Design System** | `frontend/app/globals.css` | Tailwind CSS v4, Lucide React, Google Fonts `Noto Sans Tamil` |
| **UI Components** | `frontend/components/` | Modular war room components with WCAG 2.2 AA accessibility |
| **API Client** | `frontend/lib/api.ts` | Resilient fetch layer with seamless local fallback |
| **E2E Testing** | `tests/warroom-demo.spec.js` | Automated Playwright test suite with dual server orchestration |
| **Unit Testing** | `backend/tests/test_api.py` | Pytest suite validating backend endpoints and aggregation |

---

## 4. Verification & Test Results

### Playwright End-to-End Suite (`tests/`)
All 7 browser tests passed cleanly in **6.2 seconds**:
1. `smoke test - verify environment and browser navigation` — **PASSED** (438ms)
2. `Dashboard Overview renders metrics, charts, and top reports` — **PASSED** (326ms)
3. `Political filters update the news stream and metrics` — **PASSED** (364ms)
4. `Article Intelligence Drawer provides dual summaries and 3 Tamil variations` — **PASSED** (664ms)
5. `Party and Leader Comparison displays side-by-side matrices` — **PASSED** (397ms)
6. `Tamil News Card Studio renders 1080x1080 canvas and triggers PNG export` — **PASSED** (482ms)
7. `Keyboard accessibility & WCAG modal behavior` — **PASSED** (343ms)

### Pytest Backend Suite (`backend/tests/`)
All 6 API unit tests passed cleanly in **0.58 seconds**:
- `test_health_check` — **PASSED**
- `test_get_parties` — **PASSED**
- `test_get_leaders` — **PASSED**
- `test_get_news_filtered` — **PASSED**
- `test_get_metrics` — **PASSED**
- `test_compare_parties` — **PASSED**

---

## 5. Accessibility (WCAG 2.2 AA) Audit Highlights

- **Semantic Landmark Structure**: Document organized with `<header>`, `<main>`, `<nav>`, `<article>`, and `<contentinfo>`.
- **Keyboard Navigation**: Interactive controls are focusable and navigable via standard keyboard `Tab` flow.
- **Modal Accessibility**: Article intelligence drawer uses `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, and closes upon pressing `Escape`.
- **Form Controls**: All filter dropdowns and text controls have associated `<label>` elements linked via `htmlFor` and `id`.
- **Contrast Ratios**: Body text and headlines provide contrast ratios exceeding 10:1 against dark backgrounds, surpassing WCAG AAA criteria.
- **Tamil Typography**: Font rendering powered by Google Fonts `Noto Sans Tamil` to ensure crisp glyph rendering across all operating systems.

---

## 6. How to Run Locally

### Start Backend Service
```powershell
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```
Interactive OpenAPI documentation will be accessible at: `http://127.0.0.1:8000/docs`

### Start Frontend Application
```powershell
npm run dev --prefix frontend
```
The application will be live at: `http://localhost:3000`

### Run All Automated Tests
```powershell
npm test
```
