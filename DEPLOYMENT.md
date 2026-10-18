# TN Political War Room — Deployment & Operations Guide

## 1. System Architecture Overview

The **TN Political War Room** is an executive-grade political media intelligence platform built for monitoring, discovering, ranking, and analyzing public political content across Tamil Nadu.

```
                           ┌───────────────────────────┐
                           │   Client / Browser UI     │
                           │ Next.js 16 (React 19, TW) │
                           └─────────────┬─────────────┘
                                         │ HTTP (Port 3000 -> 8000)
                                         ▼
                           ┌───────────────────────────┐
                           │   FastAPI Python Backend  │
                           │   Async Router + Engine   │
                           └─────────────┬─────────────┘
                                         │ WAL Mode (5000ms timeout)
                                         ▼
                     ┌───────────────────────────────────────┐
                     │   SQLite Database (warroom.db)        │
                     │  - RSS Articles & Entity Matched Data │
                     │  - Multi-Source Social Posts & Trends │
                     │  - Engagement Snapshots & Clusters    │
                     │  - Client Workspace Configurations    │
                     └───────────────────────────────────────┘
```

---

## 2. Prerequisites

- **Docker & Docker Compose**: Docker Engine 24.0+ and Compose v2+.
- **Or Local Environment**:
  - Python 3.11+ with `pip`.
  - Node.js 20.x or 22.x with `npm`.
  - SQLite 3.37+.

---

## 3. Production Deployment with Docker Compose

### 3.1 Launch Services

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Build and start containers in detached mode:
   ```bash
   docker compose up -d --build
   ```

3. Verify health status:
   ```bash
   docker compose ps
   ```
   Both `tn_warroom_backend` and `tn_warroom_frontend` will report `healthy`.

4. Access the platform:
   - **Frontend UI**: [http://localhost:3000](http://localhost:3000)
   - **Backend API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - **Backend Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

### 3.2 Stop Services

```bash
docker compose down
```
To preserve persistent database records, do NOT use the `-v` flag. The volume mapping `./backend/app/data:/app/backend/app/data` ensures all collected articles, configuration, and snapshots remain persisted across container restarts.

---

## 4. Local Native Development Quickstart

### 4.1 Backend Service

```bash
# 1. Install dependencies
pip install -r backend/requirements.txt

# 2. Run database migrations
python -c "from backend.app.data.migrations import run_migrations; run_migrations()"

# 3. Launch Uvicorn server
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 4.2 Frontend Service

```bash
# 1. Install dependencies
cd frontend
npm install

# 2. Build and start production Next.js server
npm run build
npm run start -p 3000
```

---

## 5. SQLite Concurrency & WAL Mode Assessment

### 5.1 Architecture Decision: WAL Mode
In default SQLite `DELETE` journal mode, write operations place an exclusive lock on the entire database file, causing concurrent reader threads or frontend API requests to block with `sqlite3.OperationalError: database is locked`.

To resolve this for Phase 5 production readiness:
1. **Write-Ahead Logging (WAL)**: `PRAGMA journal_mode=WAL;` is activated on all connections in `backend/app/data/migrations.py`. In WAL mode:
   - **Readers do not block writers.**
   - **Writers do not block readers.**
   - Multiple reader processes can read simultaneously while a background ingestion job is recording engagement snapshots or syndicated news items.
2. **Busy Timeout**: `PRAGMA busy_timeout=5000;` is configured on all connections. If a write is momentarily serialized by another write, SQLite waits up to 5 seconds before failing.
3. **Synchronous Normal**: `PRAGMA synchronous=NORMAL;` balances safety and maximum I/O performance in WAL mode.

### 5.2 Scaling Assessment & Postgres Migration Path
- **Current Throughput**: SQLite in WAL mode comfortably handles **up to 1,000 read queries/sec** and **50–100 writes/sec** on SSD storage, which far exceeds the demands of regional political intelligence and periodic 5-minute background polling jobs.
- **When to migrate to PostgreSQL**:
  - If multi-server horizontal scaling with multiple backend replicas is required.
  - If high-frequency real-time stream ingestion exceeding 500 concurrent writes/second is introduced.
  - Migration path: The database uses standard ANSI SQL table schemas and parameter-binding; transitioning to PostgreSQL requires updating the connection URI in `backend/app/data/migrations.py` to `psycopg2`/`asyncpg`.

---

## 6. Operational Procedures & Runbooks

### 6.1 Database Backup Procedure

Perform safe, non-blocking backups while the application is live:

```bash
# Using SQLite online backup API via CLI
sqlite3 backend/app/data/warroom.db ".backup 'backend/app/data/warroom_backup_$(date +%Y%m%d_%H%M%S).db'"
```

*Note: Never copy `warroom.db` using standard `cp` while transactions are active without also copying `warroom.db-wal` and `warroom.db-shm`.*

### 6.2 Database Restore Procedure

1. Stop the application services (`docker compose down` or terminate Uvicorn).
2. Restore the backup file:
   ```bash
   cp backend/app/data/warroom_backup_TIMESTAMP.db backend/app/data/warroom.db
   rm -f backend/app/data/warroom.db-wal backend/app/data/warroom.db-shm
   ```
3. Restart application services (`docker compose up -d`).

### 6.3 Replaying & Resetting Demo Scenarios

The platform includes four deterministic demo scenarios for client presentations:
1. `scenario_policy_announcement` (Welfare Schemes)
2. `scenario_leader_speech` (Youth Politics & TVK Vijay)
3. `scenario_political_controversy` (Fund Allocation DMK vs BJP)
4. `scenario_cross_party_debate` (NEET Exemption & Federalism)

Operators can safely replay or reset demo scenarios without risk to live data:
- **Reset Scenario**: Calls `POST /api/social/demo/scenarios/{scenario_id}/reset`.
- **Safety Guarantee**: The reset handler executes `DELETE FROM social_posts WHERE id LIKE 'demo_{scenario_id}%' AND collection_mode = 'DEMO'`. It never alters or deletes records with `collection_mode = 'LIVE'`.

---

## 7. Security, Privacy & Compliance Audit

1. **Read-Only Intelligence**: The platform is strictly an intelligence, discovery, and analytics system. It possesses no capabilities for automated posting, following, liking, commenting, or user persuasion.
2. **Secrets Management**: No API keys or access tokens are hardcoded in git. All connectors check environment variables; missing keys gracefully place the connector in `NOT_CONFIGURED` status.
3. **Electorate Representation Disclaimer**: All exported briefs (PDF, Markdown, Screen) include the mandatory statutory notice stating that social media metrics and press articles reflect indexed public activity and journalistic coverage, not a statistically representative voting sample or election poll.
