import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import news, metrics, intelligence, cards, sources, social_intelligence, client_config
from datetime import datetime, timezone
import sqlite3
from .data.migrations import DB_PATH
from .data.db import get_database_url

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Apply Neon PostgreSQL migrations if DATABASE_URL is configured
    db_url = get_database_url()
    if db_url:
        try:
            from .data.neon_migrations import migrate_neon
            migrate_neon()
            print("Startup: Neon PostgreSQL migrations applied successfully.")
        except Exception as e:
            print(f"Startup: Warning running Neon migrations: {e}")

    # 2. Ensure data directory and SQLite database tables exist
    try:
        from .data.migrations import run_migrations, DB_PATH
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        run_migrations(DB_PATH)
        print("Startup: SQLite database migrations applied successfully.")
    except Exception as e:
        print(f"Startup: Warning running SQLite migrations: {e}")

    # 3. Post-migration deterministic service initialization
    try:
        from .services.source_health import source_health_service
        source_health_service.ensure_initialized()
        print("Startup: SourceHealthService initialized successfully.")
    except Exception as e:
        print(f"Startup: Warning initializing SourceHealthService: {e}")

    try:
        from .services.entity_matcher import entity_matcher
        entity_matcher.ensure_initialized()
        print("Startup: EntityMatcher initialized successfully.")
    except Exception as e:
        print(f"Startup: Warning initializing EntityMatcher: {e}")

    try:
        from .services.source_registry import source_registry
        source_registry.ensure_initialized()
        print("Startup: SourceRegistry initialized successfully.")
    except Exception as e:
        print(f"Startup: Warning initializing SourceRegistry: {e}")

    yield

app = FastAPI(
    title="TN Political Warroom API",
    description="Political media intelligence, Tamil NLP summaries, multi-source social trending, and comparative war room analytics for Tamil Nadu politics.",
    version="1.2.0",
    lifespan=lifespan
)

# CORS configuration for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(news.router)
app.include_router(metrics.router)
app.include_router(intelligence.router)
app.include_router(cards.router)
app.include_router(sources.router)
app.include_router(social_intelligence.router)
app.include_router(client_config.router)

@app.get("/health")
@app.get("/api/health")
def health_check():
    db_healthy = False
    journal_mode = "unknown"
    neon_connected = False
    neon_error = None
    database_url = get_database_url()

    # 1. Check Neon PostgreSQL if DATABASE_URL configured
    if database_url:
        try:
            import psycopg
            with psycopg.connect(database_url, connect_timeout=10) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1;")
                    neon_connected = True
                    db_healthy = True
        except Exception as e:
            neon_connected = False
            neon_error = f"{type(e).__name__}: {str(e)}"

    # 2. Check local SQLite
    try:
        with sqlite3.connect(DB_PATH, timeout=2.0) as conn:
            conn.execute("SELECT 1")
            cursor = conn.cursor()
            cursor.execute("PRAGMA journal_mode;")
            row = cursor.fetchone()
            if row:
                journal_mode = str(row[0]).lower()
            if not neon_connected:
                db_healthy = True
    except Exception:
        if not neon_connected:
            db_healthy = False

    return {
        "status": "healthy" if db_healthy else "degraded",
        "service": "tn-political-warroom-backend",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database_connected": db_healthy,
        "database_engine": "neon_postgres" if neon_connected else "sqlite_wal",
        "journal_mode": journal_mode,
        "neon_connected": neon_connected,
        "neon_serverless": neon_connected,
        "neon_error": neon_error,
        "capabilities": [
            "neon_serverless_postgres" if neon_connected else "sqlite_wal_registry",
            "live_rss_ingestion",
            "tamil_nlp_engine",
            "multi_source_social_intelligence",
            "client_workspace_configuration",
            "deterministic_demo_scenarios"
        ],
        "live_ai_configured": bool(os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY"))
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
