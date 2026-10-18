from typing import Optional
from fastapi import APIRouter, Query
from ..models import (
    IntelligenceRequest, IntelligenceResponse,
    TopicTrendsResponse, PartyLeaderCoverageResponse,
    IntelligenceBriefResponse
)
from ..services.ai_intelligence import ai_service
from ..services.brief_service import brief_service

router = APIRouter(prefix="/api/intelligence", tags=["intelligence"])

@router.post("/analyze", response_model=IntelligenceResponse)
async def analyze_text(req: IntelligenceRequest):
    return await ai_service.analyze_article(
        text=req.text,
        headline=req.headline or "",
        source=req.source or ""
    )

@router.get("/trends", response_model=TopicTrendsResponse)
def get_topic_trends(
    mode: str = Query("live", pattern="^(live|demo)$"),
    period: str = Query("24h", pattern="^(24h|7d)$"),
    party: Optional[str] = Query(None),
    leader: Optional[str] = Query(None),
    source: Optional[str] = Query(None)
):
    """
    Returns topic trends comparing current period with prior period.
    Identifies gaining, losing, emerging, and single report topics with supporting evidence links.
    """
    return brief_service.get_topic_trends(
        mode=mode,
        period=period,
        party=party,
        leader=leader,
        source=source
    )

@router.get("/party-leader-coverage", response_model=PartyLeaderCoverageResponse)
def get_party_leader_coverage(
    mode: str = Query("live", pattern="^(live|demo)$"),
    period: str = Query("24h", pattern="^(24h|7d)$")
):
    """
    Returns party and leader media presence matrices, sentiment breakdown, and supporting citations.
    Explicitly distinguishes media mentions from public opinion or vote share.
    """
    return brief_service.get_party_leader_coverage(
        mode=mode,
        period=period
    )

@router.get("/brief", response_model=IntelligenceBriefResponse)
def get_intelligence_brief(
    mode: str = Query("live", pattern="^(live|demo)$"),
    period: str = Query("24h", pattern="^(24h|7d)$"),
    regenerate: bool = Query(False)
):
    """
    Returns the daily political intelligence brief.
    Idempotent and persistent: returns cached brief if evidence hash matches,
    re-generating only upon explicit user request or evidence update.
    """
    return brief_service.get_or_generate_brief(
        mode=mode,
        period=period,
        force_regenerate=regenerate
    )

@router.get("/search")
def search_evidence(
    mode: str = Query("live", pattern="^(live|demo)$"),
    q: Optional[str] = Query(None),
    party: Optional[str] = Query(None),
    leader: Optional[str] = Query(None),
    topic: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    sort_order: str = Query("desc", pattern="^(desc|asc)$"),
    limit: int = Query(50, ge=1, le=200)
):
    """
    Bilingual search & evidence explorer with filtering and date-sorting.
    """
    return brief_service.search_articles(
        mode=mode,
        q=q,
        party=party,
        leader=leader,
        topic=topic,
        source=source,
        date_from=date_from,
        date_to=date_to,
        sort_order=sort_order,
        limit=limit
    )
