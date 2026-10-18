from fastapi import APIRouter, Query
from typing import Optional, List
from ..models import DashboardMetrics, FilterParams, CompareResponse, CompareRequest
from ..services.news_service import news_service

router = APIRouter(prefix="/api", tags=["metrics"])

@router.get("/metrics", response_model=DashboardMetrics)
def get_metrics(
    q: Optional[str] = Query(None),
    party: Optional[str] = Query(None),
    leader: Optional[str] = Query(None),
    sentiment: Optional[str] = Query(None),
    topic: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    mode: Optional[str] = Query("live", description="Mode: 'live', 'demo', or 'all'")
):
    params = FilterParams(
        q=q,
        party=party,
        leader=leader,
        sentiment=sentiment,
        topic=topic,
        source=source,
        date_from=date_from,
        date_to=date_to,
        mode=mode
    )
    return news_service.calculate_metrics(params)

@router.post("/compare", response_model=CompareResponse)
def compare_entities(req: CompareRequest):
    return news_service.compare_entities(req.entity_type, req.entity_ids, mode=req.mode or "live")
