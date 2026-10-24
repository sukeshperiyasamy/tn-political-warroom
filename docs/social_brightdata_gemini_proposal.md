# Bright Data + Gemini Social Intelligence — Phase 1 Findings & Phase 2 Architecture Proposal

Status: **PROPOSAL ONLY.** No code, migrations, live API calls, database writes or commits were made.
Credentials were inspected for *structure only* (key names / lengths); no values were printed.

---

## 0. Credential and Git-safety findings (act on these first)

| Item | Finding |
|---|---|
| `brightdataapikey.txt` | Exists in repo root, 1 line, 36 chars, UUID/hex-shaped. **Not git-ignored, shows as untracked (`??`).** |
| `<gemini-service-account>.json` | Exists in repo root. **Not git-ignored, shows as untracked.** `.gitignore` has `*credentials*.json` but this filename does not match it. |
| JSON structure | `type: service_account`; has `private_key`, `client_email`, `project_id`, `token_uri`. It is a **Google Cloud service-account key, not a Gemini API key.** |
| Env vars | `GEMINI_API_KEY`, `GOOGLE_API_KEY`, `GOOGLE_APPLICATION_CREDENTIALS`, `BRIGHTDATA_API_KEY` are all unset. A root `.env` exists (765 B); I did not read it. |
| Risk | A single `git add -A` would stage both files. |

**Proposed `.gitignore` additions (not applied):**
```
# Local credential files
brightdata*.txt
*apikey*.txt
*service-account*.json
adcproject-*.json
.secrets/
```
**Recommended:** move both files out of the repo (e.g. a folder outside the repo (for example `~/.secrets/`)) and point to them with env vars
`BRIGHTDATA_API_KEY_FILE` and `GOOGLE_APPLICATION_CREDENTIALS`. The existing `python-dotenv` loader in `backend/app/data/db.py`
already reads the root `.env`, so no new mechanism is needed. The service-account key was sitting unprotected in the repo folder;
rotate it if the folder was ever shared, synced or zipped.

**Gemini auth compatibility (unverified until a live call is allowed):** a service-account key works with the
**Vertex AI** Gemini endpoint (`google-genai` with `vertexai=True`, project + location, ADC credentials). It does **not**
work with the public AI Studio endpoint, which needs an API key. Vertex requires the Vertex AI API enabled and billing on
the Google Cloud project named in the key file. `google-genai 2.32.0` and `google-auth` are already installed locally but not in `backend/requirements.txt`.

---

## 1. Phase 1 — Existing architecture discovered

- **Backend:** FastAPI (Python), `backend/app/{routers,services,connectors,data}`, ~13k lines. Raw SQL through a custom dual-engine layer
  (`data/db.py`: SQLite locally, Neon Postgres when `DATABASE_URL` is set; `?`→`%s` translation).
- **Frontend:** Next.js 16 / React 19 / Tailwind 4 (just refactored to routes + `WarRoomProvider`). Social views call `/api/social/*`; admin calls `/api/admin/*`.
- **Migrations:** hand-written. `data/migrations.py` (SQLite, `CREATE TABLE IF NOT EXISTS` + `ALTER` guards) and `data/neon_migrations.py` (Postgres `SCHEMA_SQL`), both run in the FastAPI `lifespan` at startup. No Alembic.
- **Articles:** `articles` table fed by `rss_ingestion.py` + `rss_scheduler.py` (5-minute background loop) + `deduplicator.py`.
- **Classification:** `entity_matcher.py` (994 lines) holds `PARTIES_CONFIG`, `LEADERS_CONFIG`, `SEED_TOPICS`, a DB-backed `topic_registry`/`discovered_keywords`, and `match_entities()` with word-boundary and disambiguation guards (e.g. திமுக vs அதிமுக, Annamalai vs Thiruvannamalai). `AIIntelligenceService` is **rule-based**; it reads `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` but never calls an LLM. **There is no existing Gemini/LLM integration.**
- **Social module already exists (Phase 3/4):**
  - `connectors/` — `BaseConnector` ABC, `NormalizedPost` dataclass, and connectors for YouTube, X (API v2), Instagram (Meta Graph), Facebook (Graph), Reddit, News, Google Trends. All are env-key driven and report `NOT_CONFIGURED` when keys are absent.
  - `social_posts`, `engagement_snapshots`, `story_clusters`, `social_connectors`, `social_fetch_runs` tables.
  - `SocialScheduler` (per-connector locks, bounded runs, fetch-run audit) and `routers/social_intelligence.py` (`/api/social/*`: posts, trending, connectors, `ingestion/run`, `fetch-runs`, demo scenarios).
  - `collection_mode` column (`LIVE`/`DEMO`) already isolates demo data from live views.
- **Auth:** `/api/admin/*` and `/api/social/*` have **no server-side authentication**. The admin login is a client-side `sessionStorage` flag with a hard-coded demo credential; CORS is `allow_origins=["*"]`.
- **Jobs:** threads/asyncio inside the API process (`SocialScheduler`, `rss_scheduler`, `ingestion_job_manager`). No queue or worker service.
- **Tests:** pytest in `backend/tests/` (13 files) plus Playwright e2e.
- **Deployment:** Dockerfile.backend, Dockerfile.frontend, docker-compose, DEPLOYMENT.md.

### Problems that affect this feature
1. **Social data is SQLite-only in practice.** The social router and scheduler call `sqlite3.connect(DB_PATH)` directly, bypassing the dual-engine layer. The Neon `social_posts` / `social_fetch_runs` definitions **differ** from the SQLite ones (`external_id` vs `platform_post_id`, `connector_id` vs `connector_platform`, different unique key). Today, social posts never reach Neon.
2. **`trigger_social_ingestion()` and the scheduler loop over every registered connector** and call `search("Tamil Nadu")`. Anything added to `_CONNECTORS` would be run by the existing "Sync" buttons.
3. **No auth on endpoints that would spend paid credits.**
4. **Uncommitted work by someone else is in the tree** (`entity_matcher.py`, `db.py`, `admin.py`, new tests in `backend/tests/` and `scripts/`, `scratch/`). I did not touch it. The Gemini classifier should wait for that taxonomy work to land.

---

## 2. Where should social posts live? Options

| Option | Pros | Cons |
|---|---|---|
| **A. Reuse `articles`** | One feed | Wrong shape: no handle, engagement, media type, URL-per-post identity; would pollute RSS metrics, brief generation and classification stats. |
| **B. Reuse existing `social_posts` + `NormalizedPost` (recommended)** | Already the social model; dashboards, trend engine, clustering and `collection_mode` isolation exist; minimal new schema. | Must resolve the SQLite/Neon drift first; schema lacks raw-payload ref, content hash and AI-status fields (add via additive columns). |
| **C. New parallel `social_media_posts` table** | Clean schema, no drift baggage. | Duplicates `social_posts` and every consumer; two social models to maintain. |
| **D. Link table `article_social_links`** | Useful later for "story appears in news and on X". | Not a storage choice; add only in a later phase. |

**Recommendation: B**, with AI output in a **separate** `social_post_classifications` table so the raw post and the AI judgement never mix, and `social_posts.party_codes/topics/...` (the rule-based result) stay untouched.

---

## 3. Proposed architecture

```
Admin UI (new "Social Collection" tab)  ──►  /api/social-collection/*  (token-protected, backend-only secrets)
                                                   │
                      ┌────────────────────────────┼──────────────────────────────┐
                      ▼                            ▼                              ▼
          providers/brightdata/              services/social_ingest.py      services/gemini_classifier.py
          (trigger → poll → download)        validate → normalise →         registry-grounded prompt,
          + providers/fixtures/ (mock)       dedupe (platform,id,hash) →    JSON-schema output, validation,
                      │                      upsert social_posts           stored in social_post_classifications
                      ▼                            │                              │
               Bright Data Web Scraper API         └──── social_fetch_runs (jobs) ┘
               (datasets/v3 trigger/progress/snapshot)
```

Design rules:
- **Providers are NOT registered in `_CONNECTORS`**, so the existing scheduler and "Sync" buttons can never call them. Manual trigger only.
- **Three explicit modes, never mixed in output:** `fixture` (local JSON), `brightdata` (live), and `dry_run` (builds the request, validates, shows proposed rows and proposed Gemini output, **zero DB writes**). Every response carries `collection_source`, `gemini_called`, `persisted` booleans.
- **Trial isolation:** new `collection_mode = 'TRIAL'`. Existing dashboards filter on `LIVE`, so trial rows stay invisible to them.
- **Credentials:** a small `core/secrets.py` that resolves `*_FILE` env vars, reads on demand, never logs, and returns redacted repr. Nothing in the DB, frontend bundle or API responses.
- **Gemini grounding:** the prompt receives the existing party codes, leader names and topic list from `entity_matcher`; output is JSON-schema constrained, then validated server-side (unknown codes are dropped, empties allowed). The deterministic `match_entities()` result is stored alongside as evidence; disagreement or low confidence → `review_status = needs_review`. AI output is labelled *AI-suggested, unverified*. Prompt version + model id stored per row.

### Bright Data capability (what is known vs unknown)
- **Known from Bright Data's own docs:** the Web Scraper API (`POST /datasets/v3/trigger`, `GET /datasets/v3/progress/{id}`, `GET /datasets/v3/snapshot/{id}`; sync `/scrape` for ≤20 inputs) has pre-built scrapers for Instagram (profiles, posts, reels, comments), Facebook (posts, reviews) and X (posts, profiles). Collection is **asynchronous** for anything non-trivial: `starting → running → ready | failed`; snapshots retained 30 days; billed **per delivered record**, and failed input URLs can still be billed. Scrapers take **URLs** (profile/post), not free keyword search; discovery by keyword uses separate "discover" methods.
- **Unknown until a live call is approved:** whether your account/free tier includes these dataset IDs, remaining credit, rate limits, and exact field names. I cannot determine this from the key file. The `bdata` CLI is not installed here. **Do not assume all three platforms work.** The plan below handles that by falling back to fixtures per platform and reporting the limitation.
- Only **public** profiles/posts; no logins, private content or DMs.

---

## 4. Proposed schema (additive only — NOT to be run yet)

1. **Fix drift first (decision #1):** declare the canonical social store, then align the Neon definitions of `social_posts` and `social_fetch_runs` to the SQLite ones (or route social code through `db.py`).
2. `ALTER TABLE social_posts ADD COLUMN` (nullable): `source_target_id`, `content_hash`, `raw_payload_ref`, `acquisition_provider`, `processing_status`, `processing_error`.
   Existing `UNIQUE(platform, platform_post_id)` is reused as the dedup key; `content_hash` catches reposts/duplicates across ids.
3. **`social_collection_targets`**: `id, platform, target_type(profile|post_url|keyword), display_name, public_identifier, config_json, is_enabled, created_at, updated_at` (no personal data beyond the public handle).
4. **`social_post_classifications`**: `id, post_id FK, provider, model_id, prompt_version, party_codes, leader_names, topics, primary_subject, stance(nullable), confidence(nullable), evidence_json, rule_based_agreement, review_status(pending|needs_review|accepted|rejected), status, error, created_at`. Many rows per post (history kept, never overwritten).
5. **Jobs:** reuse `social_fetch_runs`; add `provider`, `provider_job_id`, `mode`, `target_id`, `records_skipped`, `dry_run`.
6. Indexes: `(platform, content_hash)`, `post_id` on classifications, `(status)` on classifications.
7. Rollback: all changes are additive; rollback = drop the two new tables and ignore the new nullable columns. Historical article rows and existing `social_posts` classification columns are never altered.

---

## 5. Files expected to change / be added

New: `backend/app/core/secrets.py`, `backend/app/providers/brightdata/{client,instagram,facebook,x}.py`, `backend/app/providers/fixtures/*.json`, `backend/app/services/{social_ingest,gemini_classifier}.py`, `backend/app/routers/social_collection.py`, `backend/tests/test_social_{ingest,gemini,secrets,brightdata}.py`, `frontend/components/admin/AdminSocialCollection.tsx`.
Modified: `data/migrations.py`, `data/neon_migrations.py`, `main.py` (router), `requirements.txt` (`google-genai`, `google-auth`), `.gitignore`, `.env.example`, `AdminDashboard.tsx` (new sub-tab), `frontend/lib/api.ts`, `types/political.ts`, docs.

---

## 6. Test plan (all external calls mocked)
Duplicates (same id; same content different id) · missing fields · invalid/naive/future timestamps · unsupported platform · Bright Data 4xx/5xx/timeout/`failed` snapshot/partial snapshot · Gemini malformed JSON, schema violation, 429, timeout, unknown party code · false positives (weather, cinema, sports, health, "Thiruvannamalai", "congressional") must yield empty classifications · DB failure mid-batch rolls back · re-running the same collection inserts 0 · secret loading from file, missing/invalid file, and redaction in logs/responses/exceptions · dry-run performs zero writes · scheduler/`ingestion/run` never invoke trial providers.

## 7. Implementation stages
1. Secrets/gitignore hardening + endpoint token auth.
2. Schema drift fix + additive migrations (reviewed first, run on local SQLite only).
3. Fixture provider + ingest/dedupe + dry-run + job rows.
4. Gemini classifier (mocked tests, then one approved live call).
5. Bright Data adapter; one approved live capability probe (account/datasets/credits) → then ≤10-post trial per supported platform.
6. API + admin UI (targets, trial run, jobs, post browser, review queue, usage).
7. Docs and report.

## 8. Outstanding decisions (need your call)
1. **Canonical social store:** keep SQLite-only, or move social tables onto the dual-engine layer / Neon? (Blocks schema work.)
2. **Auth for credit-spending endpoints:** add a backend-only `ADMIN_API_TOKEN` header check on the new router (recommended) and/or all `/api/admin/*`?
3. **Gemini route:** Vertex AI with the service account (needs Vertex enabled + billing on that project), or supply a separate AI Studio API key?
4. **Approve one live Bright Data capability probe** (lists datasets/zone/balance only, no collection) to learn what your free tier covers.
5. **Trial targets:** which single public account/page/post URL per platform?
6. Wait for the uncommitted taxonomy/entity-matcher work to be committed before building on it?
7. Move credential files out of the repo and apply the `.gitignore` additions?
