import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import news, metrics, intelligence, cards, sources

app = FastAPI(
    title="TN Political Warroom API",
    description="Political media intelligence, Tamil NLP summaries, and comparative war room analytics for Tamil Nadu politics.",
    version="1.0.0"
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

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "tn-political-warroom-backend",
        "capabilities": ["live_rss_ingestion", "sqlite_registry", "tamil_nlp_engine"],
        "live_ai_configured": bool(os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY"))
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
