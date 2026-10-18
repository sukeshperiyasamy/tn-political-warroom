from fastapi import APIRouter
from typing import List
from ..models import CardTemplate
from ..services.news_service import news_service

router = APIRouter(prefix="/api/cards", tags=["cards"])

@router.get("/templates", response_model=List[CardTemplate])
def get_card_templates():
    return news_service.get_templates()
