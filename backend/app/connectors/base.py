from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from enum import Enum

class ConnectorStatus(str, Enum):
    HEALTHY = "HEALTHY"
    LIVE = "LIVE"
    WARNING = "WARNING"
    ERROR = "ERROR"
    NOT_CONFIGURED = "NOT_CONFIGURED"
    AUTH_REQUIRED = "AUTH_REQUIRED"
    RATE_LIMITED = "RATE_LIMITED"
    DEMO = "DEMO"
    DISABLED = "DISABLED"

@dataclass
class NormalizedPost:
    id: str
    platform: str
    platform_post_id: str
    canonical_url: str
    author_name: str
    author_handle: str
    title: Optional[str]
    content: str
    language: str
    media_type: str  # "video", "text", "image", "carousel", "article"
    thumbnail_url: Optional[str]
    published_at: str  # ISO 8601 UTC
    first_seen_at: str  # ISO 8601 UTC
    last_seen_at: str  # ISO 8601 UTC
    likes_count: Optional[int] = None
    comments_count: Optional[int] = None
    shares_count: Optional[int] = None
    views_count: Optional[int] = None
    quotes_count: Optional[int] = None
    party_codes: List[str] = field(default_factory=list)
    leader_names: List[str] = field(default_factory=list)
    topics: List[str] = field(default_factory=list)
    hashtags: List[str] = field(default_factory=list)
    sentiment: str = "neutral"  # "positive", "neutral", "negative"
    sentiment_score: float = 0.0  # -1.0 to 1.0
    trend_score: float = 0.0
    growth_rate_per_hour: Optional[float] = None
    collection_mode: str = "LIVE"  # "LIVE" or "DEMO"
    raw_metrics_available: List[str] = field(default_factory=list)
    story_cluster_id: Optional[str] = None
    acquisition_method: str = "api"  # "api", "rss", "web_public", "demo_simulation"
    source_reliability: float = 0.85  # 0.0 to 1.0
    data_provenance: Dict[str, Any] = field(default_factory=dict)
    matched_entities: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class ConnectorHealth:
    platform: str
    status: ConnectorStatus
    is_configured: bool
    last_checked_at: str
    message: str
    quota_used: int = 0
    quota_limit: int = 0
    quota_reset_at: Optional[str] = None
    error_count: int = 0
    latency_ms: Optional[int] = None
    last_attempted_fetch: Optional[str] = None
    last_successful_fetch: Optional[str] = None
    records_discovered: int = 0
    records_inserted: int = 0
    records_updated: int = 0
    records_rejected: int = 0
    error_category: Optional[str] = None

class BaseConnector(ABC):
    """
    Abstract base class for all public political content connectors.
    Enforces unified ingestion, status monitoring, normalization, and error isolation.
    """
    platform: str
    name: str
    supported_metrics: List[str]

    def __init__(self):
        self.last_error: Optional[str] = None
        self.error_count: int = 0

    @abstractmethod
    def validate_configuration(self) -> Tuple[bool, str]:
        """
        Validates environment variables / API tokens required for this platform.
        Returns (is_valid, human_readable_status_message).
        """
        pass

    @abstractmethod
    def health_check(self) -> ConnectorHealth:
        """
        Performs non-destructive liveness/auth check against the provider API.
        """
        pass

    @abstractmethod
    def search(
        self,
        query: str,
        limit: int = 25,
        since: Optional[datetime] = None
    ) -> List[NormalizedPost]:
        """
        Fetches matching public posts for a given political query or topic.
        """
        pass

    @abstractmethod
    def fetch_item(self, platform_post_id: str) -> Optional[NormalizedPost]:
        """
        Fetches an individual post by its platform ID to refresh metrics.
        """
        pass

    @abstractmethod
    def normalize(self, raw_item: Dict[str, Any]) -> NormalizedPost:
        """
        Converts platform-specific raw payload into a standardized NormalizedPost.
        """
        pass

    @abstractmethod
    def get_quota_status(self) -> Dict[str, Any]:
        """
        Returns quota consumption, daily/monthly limits, and reset window.
        """
        pass

    @abstractmethod
    def get_setup_instructions(self) -> Dict[str, Any]:
        """
        Returns step-by-step developer instructions for obtaining credentials.
        """
        pass
