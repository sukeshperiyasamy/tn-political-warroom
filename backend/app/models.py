from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime

class SentimentType(str, Enum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"

class DataStatus(str, Enum):
    SEEDED_DEMO = "seeded_demo"
    LIVE_RSS = "live_rss"
    LIVE_INGESTED = "live_ingested"
    SIMULATED = "simulated"

class NewsSource(BaseModel):
    id: str
    name: str
    tamil_name: str
    category: str
    url: str
    rss_url: str
    language: str = "ta"
    is_enabled: bool = True
    health_status: str = "healthy" # "healthy", "warning", "error"
    last_fetched_at: Optional[str] = None
    last_fetch_attempt_at: Optional[str] = None
    last_successful_fetch_at: Optional[str] = None
    last_publication_at: Optional[str] = None
    last_fetch_status: Optional[str] = None # "success", "not_modified_304", "no_new_articles", "empty_feed", "stale_feed", "failed"
    last_fetch_error: Optional[str] = None
    last_error: Optional[str] = None
    etag: Optional[str] = None
    last_modified: Optional[str] = None
    total_articles_fetched: int = 0
    current_article_count: Optional[int] = 0
    skipped_duplicates_count: Optional[int] = 0
    pending_articles_count: Optional[int] = 0
    processing_articles_count: Optional[int] = 0
    processed_articles_count: Optional[int] = 0
    failed_articles_count: Optional[int] = 0
    next_scheduled_fetch_at: Optional[str] = None
    created_at: Optional[str] = None

class SourceCreate(BaseModel):
    name: str
    tamil_name: Optional[str] = None
    category: Optional[str] = "Digital News"
    url: Optional[str] = ""
    rss_url: str
    language: Optional[str] = "ta"
    is_enabled: Optional[bool] = True

class SourceTestRequest(BaseModel):
    rss_url: str

class SourceTestResult(BaseModel):
    status: str
    status_code: int
    latency_ms: int
    items_count: int
    sample_items: List[Dict[str, Any]]
    etag: Optional[str] = None
    last_modified: Optional[str] = None
    error: Optional[str] = None

class IngestionLog(BaseModel):
    id: int
    source_id: str
    source_name: str
    timestamp: str
    status: str
    items_found: int
    new_items_added: int
    skipped_duplicates: Optional[int] = 0
    http_status: Optional[int] = 200
    duration_ms: int
    error_message: Optional[str] = None

class IngestResponse(BaseModel):
    status: str
    sources_processed: int
    total_items_found: int
    total_new_items_added: int
    total_duplicates_skipped: Optional[int] = 0
    results: List[Dict[str, Any]]

class PoliticalParty(BaseModel):
    code: str
    name: str
    tamil_name: str
    color: str
    symbol: str
    alliance: str

class PoliticalLeader(BaseModel):
    id: str
    name: str
    tamil_name: str
    party_code: str
    designation: str

class TamilVariation(BaseModel):
    style: str # e.g. "Direct News Headline", "Political Impact Hook", "Social Media Warroom Byte"
    headline: str
    caption: str

class NewsArticle(BaseModel):
    id: str
    title: str
    tamil_title: str
    summary: str
    tamil_summary: str
    tamil_variations: List[TamilVariation]
    source: str
    source_url: str
    canonical_url: Optional[str] = None
    publisher_guid: Optional[str] = None
    published_at: str
    party_codes: List[str]
    leader_names: List[str]
    sentiment: SentimentType
    sentiment_score: float = Field(ge=-1.0, le=1.0)
    topics: List[str]
    engagement_estimated: Dict[str, int] # e.g. {"reach": 12500, "shares": 340} - clearly marked estimated
    data_status: DataStatus
    analysis_provider: str # "demo_rule_engine" or "ai_llm" or "tamil_nlp_engine"
    content_hash: Optional[str] = None
    processing_hash: Optional[str] = None
    processing_status: Optional[str] = "processed" # "pending", "processing", "processed", "failed"
    processed_at: Optional[str] = None
    processing_attempts: Optional[int] = 1
    last_seen_at: Optional[str] = None

class FilterParams(BaseModel):
    q: Optional[str] = None
    party: Optional[str] = None
    leader: Optional[str] = None
    sentiment: Optional[SentimentType] = None
    topic: Optional[str] = None
    source: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    mode: Optional[str] = "live" # "live" | "demo" | "all"

class SentimentDistribution(BaseModel):
    positive: int
    neutral: int
    negative: int
    positive_pct: float
    neutral_pct: float
    negative_pct: float

class DailyTrendItem(BaseModel):
    date: str
    positive: int
    neutral: int
    negative: int
    total: int

class LeaderMetric(BaseModel):
    name: str
    tamil_name: str
    party_code: str
    article_count: int
    positive_count: int
    neutral_count: int
    negative_count: int
    sentiment_score: float

class PartyMetric(BaseModel):
    party_code: str
    name: str
    tamil_name: str
    color: str
    article_count: int
    positive_count: int
    neutral_count: int
    negative_count: int
    sentiment_score: float

class DashboardMetrics(BaseModel):
    total_articles: int
    filtered_articles: int
    sentiment_distribution: SentimentDistribution
    party_metrics: List[PartyMetric]
    leader_metrics: List[LeaderMetric]
    top_topics: List[Dict[str, Any]]
    daily_trends: List[DailyTrendItem]
    data_sources: List[Dict[str, Any]]
    disclaimer: str
    last_collection_at: Optional[str] = None
    latest_publication_at: Optional[str] = None
    polling_interval_desc: Optional[str] = None

class CompareRequest(BaseModel):
    entity_type: str # "party" or "leader"
    entity_ids: List[str]
    mode: Optional[str] = "live"

class EntityComparison(BaseModel):
    id: str
    name: str
    tamil_name: str
    party_code: Optional[str] = None
    color: str
    article_count: int
    sentiment: SentimentDistribution
    average_sentiment_score: float
    estimated_total_reach: int
    top_topics: List[Dict[str, Any]]
    recent_articles: List[NewsArticle]

class CompareResponse(BaseModel):
    entity_type: str
    comparison: List[EntityComparison]
    methodology: str

class IntelligenceRequest(BaseModel):
    text: str
    headline: Optional[str] = None
    source: Optional[str] = None

class IntelligenceResponse(BaseModel):
    identified_parties: List[str]
    identified_leaders: List[str]
    topics: List[str]
    sentiment: SentimentType
    sentiment_score: float
    english_summary: str
    tamil_summary: str
    tamil_variations: List[TamilVariation]
    analysis_provider: str
    is_live_ai: bool

class CardTemplate(BaseModel):
    id: str
    name: str
    style_category: str
    theme_bg: str
    theme_text: str
    accent_color: str
    border_style: str
    badge_style: str

# --- Political Intelligence Brief & Topic Trend Models ---

class SupportingArticleRef(BaseModel):
    id: str
    title: str
    tamil_title: str
    source: str
    source_url: str
    published_at: str
    sentiment: Optional[str] = "neutral"
    party_codes: List[str] = []

class TopicTrendItem(BaseModel):
    topic: str
    current_count: int
    prior_count: int
    net_change: int
    pct_change: Optional[float] = None
    status: str # "gaining", "losing", "stable", "emerging", "single_report"
    is_low_sample: bool = False
    distinct_publishers: List[str]
    supporting_articles: List[SupportingArticleRef]

class TopicTrendsResponse(BaseModel):
    period: str
    reporting_timezone: str = "Asia/Kolkata (IST)"
    current_window_start: str
    current_window_end: str
    prior_window_start: str
    prior_window_end: str
    total_articles_analyzed: int
    distinct_publishers_count: int
    topics: List[TopicTrendItem]
    methodology_note: str

class PartyCoverageItem(BaseModel):
    code: str
    name: str
    tamil_name: str
    current_count: int
    prior_count: int
    net_change: int
    distinct_publishers: List[str]
    top_topics: List[Dict[str, Any]]
    sentiment_distribution: Dict[str, int]
    average_sentiment_score: float
    supporting_articles: List[SupportingArticleRef]

class LeaderCoverageItem(BaseModel):
    id: str
    name: str
    tamil_name: str
    party_code: str
    current_count: int
    prior_count: int
    net_change: int
    distinct_publishers: List[str]
    top_topics: List[Dict[str, Any]]
    sentiment_distribution: Dict[str, int]
    average_sentiment_score: float
    supporting_articles: List[SupportingArticleRef]

class PartyLeaderCoverageResponse(BaseModel):
    period: str
    current_window_start: str
    current_window_end: str
    parties: List[PartyCoverageItem]
    leaders: List[LeaderCoverageItem]
    attribution_caveat: str

class KeyDevelopmentItem(BaseModel):
    headline_en: str
    headline_ta: str
    summary_en: str
    summary_ta: str
    impact_assessment: str
    supporting_article_ids: List[str]
    supporting_article_urls: List[str]

class IntelligenceBriefResponse(BaseModel):
    id: str
    data_status: str
    period: str
    window_start: str
    window_end: str
    generated_at: str
    sample_size: int
    publisher_count: int
    status: str = "sufficient_data"
    brief_english: str
    brief_tamil: str
    key_developments: List[KeyDevelopmentItem]
    emerging_topics: List[Dict[str, Any]]
    party_insights: List[Dict[str, Any]]
    supporting_article_ids: List[str]
    evidence_articles: List[Dict[str, Any]]
    caveat: str
    is_cached: bool = False

