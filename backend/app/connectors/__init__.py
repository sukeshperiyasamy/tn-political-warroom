from typing import Dict, List, Any, Optional
from backend.app.connectors.base import BaseConnector, ConnectorStatus, NormalizedPost
from backend.app.connectors.youtube import YouTubeConnector
from backend.app.connectors.x_api import XConnector
from backend.app.connectors.instagram import InstagramConnector
from backend.app.connectors.facebook import FacebookConnector
from backend.app.connectors.reddit import RedditConnector
from backend.app.connectors.news_rss import NewsRSSConnector
from backend.app.connectors.google_trends import GoogleTrendsConnector

_CONNECTORS: Dict[str, BaseConnector] = {
    "youtube": YouTubeConnector(),
    "x": XConnector(),
    "instagram": InstagramConnector(),
    "facebook": FacebookConnector(),
    "reddit": RedditConnector(),
    "news": NewsRSSConnector(),
    "google_trends": GoogleTrendsConnector(),
}

def get_connector(platform: str) -> Optional[BaseConnector]:
    return _CONNECTORS.get(platform.lower())

def get_all_connectors() -> Dict[str, BaseConnector]:
    return _CONNECTORS

def get_connector_statuses() -> List[Dict[str, Any]]:
    statuses: List[Dict[str, Any]] = []
    for platform, conn in _CONNECTORS.items():
        is_cfg, msg = conn.validate_configuration()
        instructions = conn.get_setup_instructions()
        quota = conn.get_quota_status()
        statuses.append({
            "platform": platform,
            "name": conn.name,
            "status": "CONFIGURED" if is_cfg else "NOT_CONFIGURED",
            "is_configured": is_cfg,
            "supported_metrics": conn.supported_metrics,
            "message": msg,
            "quota": quota,
            "setup_instructions": instructions
        })
    return statuses
