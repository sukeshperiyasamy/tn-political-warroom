# TN Political War Room — Multi-Platform Content Export Architecture & Roadmap

## 1. Executive Summary & Objective

In modern political campaigns and rapid-response war rooms, content must be disseminated instantaneously across multiple social and messaging channels. A single piece of political intelligence or breaking news statement produced in the **TN Political War Room Studio** needs to be distributed across **Instagram**, **WhatsApp**, **Facebook**, and **𝕏 (Twitter)** without requiring campaign designers to manually resize, reformat, re-align, or crop graphic cards in external software.

This document establishes the architectural foundation, UI workflow, platform publishing specifications, layout adaptation engine, and multi-file download packaging required to enable multi-platform export in the Studio.

---

## 2. Current Studio Architecture Assessment

### 2.1 Existing Implementation (`frontend/components/NewsCardStudio.tsx`)

The current Studio implementation provides a dual-mode workflow:
1. **Editorial Engine Tab**: Generates and finalizes three AI-assisted editorial angles:
   - **Summary (செய்திச் சுருக்கம்)**: Objective wire summary.
   - **Detailed Analysis (முழு விவரம் & பின்னணி)**: Strategic context.
   - **Social Viral Bite (வார் ரூம் வைரல் பைட்)**: High-engagement quote and hashtags.
2. **Graphic Card Studio Tab**: Generates a branded visual news card.

### 2.2 Current Limitations for Multi-Platform Publishing

| Dimension | Current Implementation | Multi-Platform Requirement | Gap / Risk |
| :--- | :--- | :--- | :--- |
| **Canvas Dimensions** | Hardcoded `1080 × 1080` (1:1 Square) | 1:1 (Square), 4:5 (Portrait), 9:16 (Story/Status), 16:9 (Landscape) | 1:1 on Stories/Status creates ugly black letterboxing; 1:1 on 𝕏 feed gets cropped in link cards. |
| **Layout Coordinates** | Fixed absolute pixel coordinates (`y=360` headline, `y=950` footer) | Dynamic responsive layout templates based on target aspect ratio | Elements float inappropriately or clip outside bounds on non-square dimensions. |
| **Safe Zone Awareness** | None (uniform 64px padding) | Instagram/WhatsApp Stories require top 250px and bottom 300px UI clearance | Profile headers, swipe-up bars, and messaging inputs occlude headlines and attributions. |
| **Export Action** | Single `toDataURL("image/png")` triggering immediate download of one file | Multi-variant generation, batch preview, and single-click ZIP archive | Browser blocks multiple concurrent downloads unless bundled into an organized ZIP archive. |
| **Caption & Copy** | Generic clipboard copy | Platform-length-optimized caption copies (𝕏 280-char limit, WhatsApp 1-line hook) | Exceeds 𝕏 free-tier limits or generates unwieldy text for WhatsApp groups. |
| **Quality Validation** | No truncation warning | Automated text bounding-box calculation and layout overflow alerts | Risk of text clipping or unreadable typography being exported to public channels. |

---

## 3. Official Platform Publishing & Media Specifications

All platform specifications must be treated as **configurable, versioned profiles** rather than hardcoded magic numbers.

```
+----------------------------------------------------------------------------------------------------+
|                                    PLATFORM SPECIFICATION MATRIX                                   |
+---------------+----------------+--------------+-------------+------------------+-------------------+
| Platform      | Placement      | Aspect Ratio | Dimensions  | Safe Margins     | Text / Caption    |
+---------------+----------------+--------------+-------------+------------------+-------------------+
| Instagram     | Feed Square    | 1:1          | 1080 × 1080 | 64px all sides   | 2,200 chars       |
|               | Feed Portrait  | 4:5          | 1080 × 1350 | 64px all sides   | (first 125 key)   |
|               | Story / Reel   | 9:16         | 1080 × 1920 | Top: 250px       | N/A (Visual)      |
|               |                |              |             | Bottom: 300px    |                   |
+---------------+----------------+--------------+-------------+------------------+-------------------+
| WhatsApp      | Status         | 9:16         | 1080 × 1920 | Top: 160px       | 700 chars status  |
|               |                |              |             | Bottom: 220px    |                   |
|               | Chat Share     | 1:1 or 4:3   | 1080 × 1080 | 48px all sides   | 1,024 chars       |
|               | (Media Card)   |              | (or 1200x900|                  | (< 2 MB rec.)     |
+---------------+----------------+--------------+-------------+------------------+-------------------+
| Facebook      | Feed Landscape | 1.91:1       | 1200 × 630  | 50px all sides   | 63,206 chars      |
|               | Feed Square    | 1:1          | 1080 × 1080 | 64px all sides   | (125 chars key)   |
|               | Story          | 9:16         | 1080 × 1920 | Top: 220px,      | N/A               |
|               |                |              |             | Bottom: 260px    |                   |
+---------------+----------------+--------------+-------------+------------------+-------------------+
| 𝕏 (Twitter)   | In-Feed Post   | 16:9         | 1200 × 675  | 48px all sides   | 280 chars         |
|               | In-Feed Card   | 1.91:1       | 1200 × 628  | 48px all sides   | (URLs take 23 ch) |
|               | In-Feed Square | 1:1          | 1080 × 1080 | 64px all sides   | Tamil = 2 weight  |
+---------------+----------------+--------------+-------------+------------------+-------------------+
```

---

## 4. Proposed Architecture

### 4.1 System Component Overview

```
                      +-----------------------------------------+
                      |       Studio Content State (Master)     |
                      |  (Article, Party, Theme, Headline, Sub) |
                      +-----------------------------------------+
                                           |
                                           v
                      +-----------------------------------------+
                      |      Platform Multi-Select Bar          |
                      |   [X] Instagram [X] WhatsApp [X] 𝕏      |
                      +-----------------------------------------+
                                           |
                    +----------------------+----------------------+
                    |                                             |
                    v                                             v
      +----------------------------+                +----------------------------+
      |  Layout Adaptation Engine  |                |   Caption Optimizer Engine |
      |  - Aspect Ratio Calculator |                |   - Char-budget formatter  |
      |  - Safe Zone Clearance     |                |   - Party hashtag injector |
      |  - Dynamic Font Autoscaler |                |   - WhatsApp link format   |
      +----------------------------+                +----------------------------+
                    |                                             |
                    v                                             v
      +----------------------------+                +----------------------------+
      |  Interactive Variant Tabs  |                |   Copy Caption Actions     |
      |  - Real-time Canvas Previews                |   - One-click copy per plat|
      |  - Quality Warning Banners |                +----------------------------+
      +----------------------------+                              |
                    |                                             |
                    v                                             |
      +-----------------------------------------------------------+
      |               Multi-File Export Packaging                 |
      |  - High-res PNG/JPG generation                            |
      |  - Standardized filename schema                           |
      |  - Single-file downloads OR Organized ZIP Archive         |
      +-----------------------------------------------------------+
```

### 4.2 Configurable Platform Profiles Schema

A dedicated TypeScript registry (`frontend/lib/platformExportProfiles.ts`) defines all export targets:

```typescript
export interface SafeZone {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export type LayoutArchetype = 
  | "square_balanced"     // 1080x1080: classic centered war room card
  | "story_vertical"      // 1080x1920: vertical flow, safe zones top/bottom, large visual quote
  | "landscape_split"     // 1200x675: 2-column layout (left: party & source, right: headline & quote)
  | "landscape_compact";  // 1200x628: compressed vertical stack with constrained line heights

export interface PlatformExportProfile {
  id: string;
  platform: "instagram" | "whatsapp" | "facebook" | "x";
  variantKey: string;
  label: string;
  aspectRatio: string;
  width: number;
  height: number;
  safeZone: SafeZone;
  layoutArchetype: LayoutArchetype;
  defaultFormat: "png" | "jpg";
  maxFileSizeBytes: number;
  maxCaptionChars: number;
  recommendedResolutionNotice: string;
  filenameTemplate: string;
}
```

### 4.3 Layout Adaptation & Typography Engine

Instead of drawing hardcoded pixel coordinates, the Canvas Rendering Engine evaluates the **Layout Archetype**:

1. **`square_balanced` (1:1 — 1080×1080)**:
   - Preserves the proven War Room card layout.
   - Central emphasis on large typography (44px – 56px).
   - Equal margins of 64px.
2. **`story_vertical` (9:16 — 1080×1920)**:
   - Header positioned at `y = safeZone.top + 30` (clearing Instagram story profile bar).
   - Generous vertical line-height for Tamil script readability.
   - Middle section includes a styled decorative pull-quote block or party symbol graphic.
   - Footer attribution anchored at `y = 1920 - safeZone.bottom - 40` (clearing reply/swipe-up controls).
3. **`landscape_split` (16:9 — 1200×675 & 1.91:1 — 1200×630)**:
   - **Split 2-Column Grid**:
     - *Left 38%*: Party badge, Tamil party name, category tag, and source verification badge.
     - *Right 62%*: Main headline (adjusted to 36px - 40px) and condensed 2-line summary.
   - Prevents headline and footer collision that occurs when stacking elements in a short 675px canvas.

### 4.4 Quality Guard & Truncation Auditor

Before rendering the canvas, the engine runs a dry-run layout measurement:
- Calculates `totalContentHeight = headerHeight + headlineHeight + subheadlineHeight + footerHeight + margins`.
- If `totalContentHeight > (profile.height - profile.safeZone.top - profile.safeZone.bottom)`:
  - **Auto-Correction**: Automatically drops subheadline font size by 15% and increases word compaction.
  - **Warning Flag**: If still overflowing, triggers a visual warning pill:
    `⚠️ Headline exceeds safe boundaries for 16:9 Landscape. Truncation or layout damage will occur. Adjust typography or edit headline.`

---

## 5. User Interface & Workflow

### 5.1 Studio Export Control Bar

In the **Graphic Card Studio** sidebar:
1. **Multi-Select Platform Selector**:
   - Checkbox pills for: `[x] Instagram` `[x] WhatsApp` `[x] 𝕏 (Twitter)` `[x] Facebook`.
   - Helper badge displays count of selected variants (e.g., `4 variants selected`).
2. **Variant Review Tabs**:
   - Located directly above the live canvas:
     - `[Instagram Square 1:1]` `[Instagram/WhatsApp Story 9:16]` `[𝕏 In-Feed 16:9]` `[Facebook Post 1.91:1]`.
   - Clicking a tab renders that exact aspect ratio in the live interactive preview.
3. **Safe Zone Overlay Switch**:
   - A toggle: `Show Safe Zones (பயன்பாட்டு வரம்பு)`.
   - Draws translucent overlays over occluded regions so war room operators see exactly where Instagram and WhatsApp UI elements will sit on top of their card.
4. **Export Actions**:
   - Primary button: **`Download All Selected (ZIP Bundle)`**.
   - Secondary button: **`Download Current Preview (PNG)`**.
   - Copy button: **`Copy Platform Caption`** (copies character-budget-checked text for the active variant).

### 5.2 Structured Download Organization

When the user triggers **Download All Selected**, the system generates an organized ZIP file with clear naming:

```text
TN_WarRoom_Export_DMK_20261019_1430/
├── instagram/
│   ├── TN_DMK_green_corridor_instagram_square.png      (1080 × 1080)
│   └── TN_DMK_green_corridor_instagram_story.png       (1080 × 1920)
├── whatsapp/
│   ├── TN_DMK_green_corridor_whatsapp_status.png       (1080 × 1920)
│   └── TN_DMK_green_corridor_whatsapp_chat.png         (1080 × 1080)
├── x_twitter/
│   └── TN_DMK_green_corridor_x_feed.png                (1200 × 675)
├── facebook/
│   └── TN_DMK_green_corridor_facebook_post.png         (1200 × 630)
└── captions/
    ├── instagram_caption.txt
    ├── x_post_280char.txt
    └── whatsapp_share_text.txt
```

---

## 6. Implementation Technical Plan

### 6.1 Packaging Strategy

- **Client-Side Generation via JSZip**:
  - Each selected variant is drawn to an offscreen canvas at full native resolution (1080×1080, 1080×1920, 1200×675).
  - Canvas `.toBlob()` converts each to PNG/JPG.
  - Bundled directly in-memory using `jszip` and downloaded as a single `.zip` file via file-saver or dynamic anchor.
  - **Benefits**: Zero backend CPU/memory overhead, instantaneous client generation, works offline.
- **Backend Fallback API Endpoint (Optional Enhancement)**:
  - `POST /api/cards/export-bundle`
  - Accepts article ID, party code, theme, and selected platforms; generates variants using Python Pillow/Cairo and returns `application/zip`.
  - Useful for programmatic bulk syndication or automated bots.

### 6.2 Files Requiring Modification / Creation

| File | Change Type | Purpose |
| :--- | :--- | :--- |
| `frontend/lib/platformExportProfiles.ts` | **New File** | Registry of official platform specs, dimensions, aspect ratios, safe zones, and file naming templates. |
| `frontend/lib/canvasMultiRenderer.ts` | **New File** | Modular canvas rendering engine supporting `square_balanced`, `story_vertical`, and `landscape_split` archetypes. |
| `frontend/lib/captionFormatter.ts` | **New File** | Character-budgeted caption generator formatting Tamil text and hashtags for 𝕏 (280 chars), WhatsApp, and Instagram. |
| `frontend/components/NewsCardStudio.tsx` | **Modification** | Integrate multi-select platform selector, variant tabs, safe zone overlay toggle, and batch ZIP export handler. |
| `frontend/types/political.ts` | **Modification** | Add `PlatformExportProfile`, `ExportVariantConfig`, and related TypeScript definitions. |
| `frontend/package.json` | **Modification** | Add `jszip` (and `@types/jszip`) dependency for client-side archive packaging. |
| `backend/app/routers/cards.py` (optional) | **Enhancement** | Optional server-side bulk export endpoint for automated bot pipelines. |

---

## 7. Phased Rollout Roadmap

1. **Phase 1: Architecture & Platform Profile Definition** *(Current)*
   - Formalize platform specification matrix.
   - Define TypeScript interfaces and test typography calculations on Tamil script strings.
2. **Phase 2: Multi-Aspect Canvas Rendering Engine**
   - Implement `story_vertical` (9:16) and `landscape_split` (16:9) rendering pipelines.
   - Build automated safe zone clearance and font scaling calculation.
3. **Phase 3: Studio UI Multi-Select & Live Preview**
   - Add platform multi-select pills and aspect-ratio tabs.
   - Add interactive Safe Zone toggle and layout warning notifications.
4. **Phase 4: Client-Side ZIP Packaging & Quality Verification**
   - Integrate `jszip` for folder-structured multi-variant ZIP exports.
   - Add platform caption copy actions.
   - Run cross-device visual verification at 320px, 768px, and 1280px widths.
