from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from pydantic import BaseModel, Field
from typing import List, Optional
from backend.app.services.client_config import client_config_service

router = APIRouter(prefix="/api/client-config", tags=["client-config"])

class ClientConfigUpdateRequest(BaseModel):
    client_name: Optional[str] = None
    client_tagline: Optional[str] = None
    logo_url: Optional[str] = None
    brand_color: Optional[str] = None
    accent_color: Optional[str] = None
    selected_parties: Optional[List[str]] = None
    selected_leaders: Optional[List[str]] = None
    topics_of_interest: Optional[List[str]] = None
    authorized_sources: Optional[List[str]] = None
    authorized_connectors: Optional[List[str]] = None
    default_language: Optional[str] = None
    default_demo_scenario: Optional[str] = None
    is_active: Optional[bool] = None

@router.get("")
def get_client_config():
    """Retrieve the current active client profile and workspace configuration."""
    return client_config_service.get_config()

@router.put("")
def update_client_config(req: ClientConfigUpdateRequest):
    """Update client configuration parameters (name, brand colors, monitored parties, leaders, topics)."""
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    return client_config_service.update_config(updates)

@router.post("/reset")
def reset_client_config():
    """Reset client profile and workspace parameters back to default values."""
    return client_config_service.reset_to_default()
