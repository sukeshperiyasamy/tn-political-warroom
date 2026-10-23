from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from ..models import (
    NewsArticle, FilterParams, PoliticalParty, PoliticalLeader,
    ArticleEditorialVersionsResponse, EditorialFinalizeRequest,
    NewsUpdatesResponse
)
from ..services.news_service import news_service

router = APIRouter(prefix="/api/news", tags=["news"])

@router.get("", response_model=List[NewsArticle])
def get_news(
    q: Optional[str] = Query(None, description="Search keyword"),
    party: Optional[str] = Query(None, description="Filter by party code"),
    leader: Optional[str] = Query(None, description="Filter by leader name"),
    sentiment: Optional[str] = Query(None, description="Filter by sentiment (positive, neutral, negative)"),
    topic: Optional[str] = Query(None, description="Filter by topic"),
    source: Optional[str] = Query(None, description="Filter by media source"),
    date_from: Optional[str] = Query(None, description="From date (ISO string)"),
    date_to: Optional[str] = Query(None, description="To date (ISO string)"),
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
    return news_service.filter_articles(params)

@router.get("/updates", response_model=NewsUpdatesResponse)
def get_news_updates(
    since: Optional[str] = Query(None, description="ISO timestamp cursor to fetch articles added/processed since"),
    limit: Optional[int] = Query(50, ge=1, le=200, description="Max updates to return"),
    q: Optional[str] = Query(None, description="Search keyword"),
    party: Optional[str] = Query(None, description="Filter by party code"),
    leader: Optional[str] = Query(None, description="Filter by leader name"),
    sentiment: Optional[str] = Query(None, description="Filter by sentiment (positive, neutral, negative)"),
    topic: Optional[str] = Query(None, description="Filter by topic"),
    source: Optional[str] = Query(None, description="Filter by media source"),
    date_from: Optional[str] = Query(None, description="From date (ISO string)"),
    date_to: Optional[str] = Query(None, description="To date (ISO string)"),
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
    return news_service.get_news_updates(since=since, params=params, limit=limit or 50)

@router.get("/parties", response_model=List[PoliticalParty])
def get_parties():
    return news_service.get_parties()

@router.get("/leaders", response_model=List[PoliticalLeader])
def get_leaders():
    return news_service.get_leaders()

@router.get("/{article_id}")
def get_article(article_id: str):
    result = news_service.get_article_by_id(article_id)
    if not result:
        raise HTTPException(status_code=404, detail="Article not found")
    return result

@router.get("/{article_id}/editorial-versions", response_model=ArticleEditorialVersionsResponse)
def get_editorial_versions(article_id: str):
    result = news_service.get_editorial_versions(article_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Article {article_id} not found")
    return result

@router.post("/{article_id}/editorial-final", response_model=ArticleEditorialVersionsResponse)
def save_editorial_final(article_id: str, request: EditorialFinalizeRequest):
    result = news_service.save_editorial_final(article_id, request)
    if not result:
        raise HTTPException(status_code=404, detail=f"Article {article_id} not found")
    return result

