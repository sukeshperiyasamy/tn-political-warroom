# tn-political-warroom

> **Tamil Nadu Political War Room & Media Intelligence Platform**  
> An editorial-grade political media intelligence dashboard, narrative analyzer, and branded social card studio tailored for Tamil Nadu state politics and the 2026 Assembly election landscape.

---

## 🏛️ Executive Summary

`tn-political-warroom` is an end-to-end media intelligence platform engineered for political war rooms, campaign strategists, and editorial desks monitoring Tamil Nadu politics. The platform tracks media share of voice, detects coverage sentiment across major parties and leaders, generates AI-powered bilingual strategic intelligence, and empowers war room teams to export 1080×1080 branded Tamil social news cards in real time.

---

## 🚀 Key Platform Capabilities

### 1. Executive Intelligence Overview
- **Monitored Volume & Reach**: Real-time aggregation of articles across verified Tamil and national news outlets (*The Hindu Tamil*, *Dinamalar*, *Puthiya Thalaimurai*, *Thanthi TV*, *Dinakaran*, *Polimer News*, etc.).
- **Media Sentiment Polarity**: Automated 3-tier sentiment classification (Positive, Neutral, Critical/Opposition) with aggregated polarity ratios.
- **Party Share of Voice**: Relative volume of mentions across key parties: **DMK**, **AIADMK**, **BJP**, **TVK**, **NTK**, **VCK**, **INC**, and **PMK**.
- **Leader Mention Leaderboard**: Real-time rank tracking of key political figures including M.K. Stalin, Edappadi K. Palaniswami, Thalapathy Vijay, K. Annamalai, Seeman, and Udhayanidhi Stalin.
- **Coverage Trends Over Time**: 7-day cyclical tracking of media reporting volume.

### 2. Multi-Dimensional Political Filtering
- Granular filtering across **Political Party (கட்சி)**, **Political Leader (தலைவர்)**, **Media Sentiment (மனநிலை)**, **Strategic Topic (கருப்பொருள்)**, and **News Source (ஊடகம்)**.
- Real-time instant search across headlines, article summaries, and party hashtags.
- Single-click filter reset with active counter.

### 3. AI Article Intelligence & 3-Tier Tamil Hooks
- Click **AI Insights** on any news report to open the deep analysis drawer:
  - **Entity Attribution**: Automatically identifies referenced political parties and leaders.
  - **Sentiment Vector**: Visual polarity meter and score (-1.0 to +1.0).
  - **Bilingual Summaries**: English Strategic Intelligence alongside an authentic Tamil Executive Summary (*தமிழ் சுருக்கம்*).
  - **3 Distinct AI Tamil Social Variations**:
    1. **செய்தித் தலைப்பு (Direct)**: Objective, fast-breaking headline.
    2. **அரசியல் பார்வை (Impact)**: Strategic 2026 electoral implication angle.
    3. **வார் ரூம் வைரல் பைட் (Viral Hook)**: High-engagement quote and headline engineered for social reach.
  - **One-Click Hand-off**: Direct "Proceed to News Card Studio" button to pre-populate the card canvas.

### 4. Comparative Political Matrix
- Side-by-side benchmarking of up to 4 parties or leaders simultaneously.
- Compares:
  - Monitored article count
  - Stacked sentiment distribution (Positive / Neutral / Negative percentages)
  - Average sentiment score
  - Estimated audience impressions
  - Top strategic topics discussed
  - Recent significant reports

### 5. Branded Tamil News Card Studio (1080×1080 Social Export)
- **Live 1:1 Preview Canvas**: Authentic 1080×1080 square canvas scaled for responsive desktop preview.
- **6 Distinct Design Themes**:
  - *War Room Command (Dark)*: High-contrast midnight editorial aesthetic.
  - *Dravidian Horizon*: Movement aesthetic featuring rich crimson and dark accents.
  - *Puratchi Green*: Heritage emerald and deep forest tones.
  - *Dharma Saffron*: Bold contrast saffron and deep umber styling.
  - *Vettri Gold*: Dynamic challenger palette in gold and maroon.
  - *The Morning Dispatch*: Crisp, light editorial layout.
- **Customizable Controls**:
  - 4 Quick Preset breaking stories (CM announcement, EPS speech, TVK rally, BJP whitepaper).
  - Party badge and color accents.
  - Top category tag, main Tamil headline, subheadline/quote, typography slider (32px - 60px), and alignment toggle.
- **High-Performance PNG Exporter**:
  - Instant client-side canvas rendering at true native 1080×1080 resolution.
  - Download trigger for production social media distribution.

---

## 🛡️ Data Integrity & Transparency Notice

- **Demo Dataset**: Articles are explicitly tagged with `seeded_demo` and sourced from verified regional journalism.
- **Estimated Reach**: Audience impressions and social share estimates are clearly noted as `(est.)`.
- **API Security**: Third-party social media credentials are not fabricated; data pipelines are cleanly architected for plug-and-play production API keys.

---

## 🏗️ Architecture & Tech Stack

```text
tn-political-warroom/
├── backend/                  # FastAPI Python Backend Service
│   ├── app/
│   │   ├── data/             # Seeded political articles and party metadata
│   │   ├── models.py         # Pydantic v2 data models
│   │   ├── services/         # News aggregation & AI intelligence rules
│   │   ├── routers/          # REST API endpoints (/news, /metrics, /compare, /intelligence, /cards)
│   │   └── main.py           # FastAPI entry point with CORS middleware
│   └── tests/                # Pytest unit and integration test suite
├── frontend/                 # Next.js 16 + React 19 Frontend
│   ├── app/                  # App Router layout & unified page
│   ├── components/           # Reusable war room UI components
│   │   ├── Navbar.tsx
│   │   ├── FilterBar.tsx
│   │   ├── MetricsOverview.tsx
│   │   ├── ArticleCard.tsx
│   │   ├── ArticleIntelligenceDrawer.tsx
│   │   ├── PartyComparisonView.tsx
│   │   └── NewsCardStudio.tsx
│   ├── lib/                  # Resilient API client with automatic offline fallback
│   └── types/                # TypeScript interfaces
├── tests/                    # Playwright E2E Test Suite
│   ├── warroom-demo.spec.js  # Full end-to-end user journey tests
│   └── smoke.spec.js         # Environment sanity test
├── .claude/                  # Claude Code skill configs & MCP settings
├── playwright.config.js      # Dual-server automated test configuration
└── CLAUDE.md                 # Project conventions & instructions
```

---

## 💻 Getting Started

### Prerequisites
- **Node.js**: v20+ (tested on Node v22.12.0)
- **Python**: v3.11+ (tested on Python 3.13.7)

### 1. Run the FastAPI Backend
```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```
API Documentation will be live at `http://127.0.0.1:8000/docs`.

### 2. Run the Next.js Frontend
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

*(Note: The frontend has automatic offline fallback resilience — if the backend is offline, all metrics, filters, and studio features function seamlessly using the verified local dataset).*

---

## 🧪 Automated Testing

### Run All Playwright E2E Tests
Playwright automatically starts both backend and frontend servers, executes all workflows, and validates the UI in headless Chromium:

```bash
npm run test:e2e
```

**Test Coverage Highlights**:
- ✅ Dashboard overview rendering, stat cards, and trend charts.
- ✅ Dynamic political filters (party, leader, sentiment, keyword search) and reset.
- ✅ AI Article Intelligence Drawer with entity attribution and 3 Tamil headline variations.
- ✅ Party and Leader side-by-side comparison matrices with methodology disclaimer.
- ✅ News Card Studio 1080×1080 canvas rendering, theme switching, and instant PNG export.
- ✅ WCAG keyboard navigation and modal Escape key accessibility.

### Run Backend Unit Tests
```bash
python -m pytest backend/tests
```
Validates API health, party/leader endpoints, filtering logic, metrics calculation, and comparative analysis.

---

## ♿ Accessibility (WCAG 2.2 AA)

- Semantic HTML structure (`<header>`, `<main>`, `<nav>`, `<article>`, `<button>`, `<dialog>`).
- Full keyboard navigation with `Tab` index ordering and `Escape` key drawer dismissal.
- High color contrast ratio (> 10:1 on text elements) compliant with WCAG AAA standards.
- Form inputs have associated `<label>` elements via `htmlFor` attributes.
- Natively rendered Tamil typography using Google Fonts `Noto Sans Tamil`.

---

## 📜 License
ISC License. Built for Tamil Nadu Political Media Intelligence Demo.
