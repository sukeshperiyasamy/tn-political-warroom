import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import news, metrics, intelligence, cards, sources, social_intelligence, client_config
from datetime import datetime, timezone
import sqlite3
from .data.migrations import DB_PATH

app = FastAPI(
    title="TN Political Warroom API",
    description="Political media intelligence, Tamil NLP summaries, multi-source social trending, and comparative war room analytics for Tamil Nadu politics.",
    version="1.2.0"
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
    try:
        with sqlite3.connect(DB_PATH, timeout=2.0) as conn:
            conn.execute("SELECT 1")
            cursor = conn.cursor()
            cursor.execute("PRAGMA journal_mode;")
            row = cursor.fetchone()
            if row:
                journal_mode = str(row[0]).lower()
            db_healthy = True
    except Exception:
        db_healthy = False

    return {
        "status": "healthy" if db_healthy else "degraded",
        "service": "tn-political-warroom-backend",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database_connected": db_healthy,
        "journal_mode": journal_mode,
        "capabilities": [
            "live_rss_ingestion",
            "sqlite_registry",
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
