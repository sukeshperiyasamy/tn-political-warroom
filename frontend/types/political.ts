export type SentimentType = "positive" | "neutral" | "negative";
export type DataStatus = "seeded_demo" | "live_rss" | "simulated";

export interface PoliticalParty {
  code: string;
  name: string;
  tamil_name: string;
  color: string;
  symbol: string;
  alliance: string;
}

export interface PoliticalLeader {
  id: string;
  name: string;
  tamil_name: string;
  party_code: string;
  designation: string;
}

export interface TamilVariation {
  style: string;
  headline: string;
  caption: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  tamil_title: string;
  summary: string;
  tamil_summary: string;
  tamil_variations: TamilVariation[];
  source: string;
  source_url: string;
  published_at: string;
  party_codes: string[];
  leader_names: string[];
  sentiment: SentimentType;
  sentiment_score: number;
  topics: string[];
  engagement_estimated: {
    reach: number;
    shares: number;
  };
  data_status: DataStatus;
  analysis_provider: string;
}

export interface SentimentDistribution {
  positive: number;
  neutral: number;
  negative: number;
  positive_pct: number;
  neutral_pct: number;
  negative_pct: number;
}

export interface PartyMetric {
  party_code: string;
  name: string;
  tamil_name: string;
  color: string;
  article_count: number;
  positive_count: number;
  neutral_count: number;
  negative_count: number;
  sentiment_score: number;
}

export interface LeaderMetric {
  name: string;
  tamil_name: string;
  party_code: string;
  article_count: number;
  positive_count: number;
  neutral_count: number;
  negative_count: number;
  sentiment_score: number;
}

export interface DailyTrendItem {
  date: string;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
}

export interface DashboardMetrics {
  total_articles: number;
  filtered_articles: number;
  sentiment_distribution: SentimentDistribution;
  party_metrics: PartyMetric[];
  leader_metrics: LeaderMetric[];
  top_topics: { topic: string; count: number }[];
  daily_trends: DailyTrendItem[];
  data_sources: { source: string; count: number; status: string }[];
  disclaimer: string;
  last_collection_at?: string | null;
  latest_publication_at?: string | null;
  polling_interval_desc?: string | null;
}

export interface EntityComparison {
  id: string;
  name: string;
  tamil_name: string;
  party_code?: string;
  color: string;
  article_count: number;
  sentiment: SentimentDistribution;
  average_sentiment_score: number;
  estimated_total_reach: number;
  top_topics: { topic: string; count: number }[];
  recent_articles: NewsArticle[];
}

export interface CompareResponse {
  entity_type: string;
  comparison: EntityComparison[];
  methodology: string;
}

export interface CardTemplate {
  id: string;
  name: string;
  style_category: string;
  theme_bg: string;
  theme_text: string;
  accent_color: string;
  border_style: string;
  badge_style: string;
}

export interface IntelligenceResponse {
  identified_parties: string[];
  identified_leaders: string[];
  topics: string[];
  sentiment: SentimentType;
  sentiment_score: number;
  english_summary: string;
  tamil_summary: string;
  tamil_variations: TamilVariation[];
  analysis_provider: string;
  is_live_ai: boolean;
}

export interface NewsSource {
  id: string;
  name: string;
  tamil_name: string;
  category: string;
  url: string;
  rss_url: string;
  language: string;
  is_enabled: boolean;
  health_status: "healthy" | "warning" | "error";
  last_fetched_at: string | null;
  last_fetch_attempt_at?: string | null;
  last_successful_fetch_at?: string | null;
  last_publication_at?: string | null;
  last_fetch_status?: string | null;
  last_fetch_error?: string | null;
  last_error: string | null;
  etag?: string | null;
  last_modified?: string | null;
  skipped_duplicates_count?: number;
  next_scheduled_fetch_at?: string | null;
  total_articles_fetched: number;
  current_article_count?: number;
  processed_articles_count?: number;
  pending_articles_count?: number;
  processing_articles_count?: number;
  failed_articles_count?: number;
  created_at?: string;
}

export interface SourceTestResult {
  status: "success" | "error";
  status_code: number;
  latency_ms: number;
  items_count: number;
  sample_items: Array<{
    title: string;
    link: string;
    pub_date?: string;
    description?: string;
  }>;
  etag?: string | null;
  last_modified?: string | null;
  error?: string | null;
}

export interface IngestionLog {
  id: number;
  source_id: string;
  source_name: string;
  timestamp: string;
  status: string;
  http_status?: number;
  items_found: number;
  new_items_added: number;
  skipped_duplicates?: number;
  duration_ms: number;
  error_message?: string | null;
}

export interface IngestResponse {
  status: string;
  sources_processed: number;
  total_items_found: number;
  total_new_items_added: number;
  results: Array<Record<string, any>>;
}

export interface FilterState {
  search: string;
  party: string;
  leader: string;
  sentiment: string;
  topic: string;
  source: string;
  dateRange: string;
  mode?: "live" | "demo" | "all";
}

export interface SupportingArticleRef {
  id: string;
  title: string;
  tamil_title: string;
  source: string;
  source_url: string;
  published_at: string;
  sentiment?: string;
  party_codes?: string[];
}

export interface TopicTrendItem {
  topic: string;
  current_count: number;
  prior_count: number;
  net_change: number;
  pct_change: number | null;
  status: "gaining" | "losing" | "stable" | "emerging" | "single_report";
  is_low_sample: boolean;
  distinct_publishers: string[];
  supporting_articles: SupportingArticleRef[];
}

export interface TopicTrendsResponse {
  period: "24h" | "7d";
  reporting_timezone: string;
  current_window_start: string;
  current_window_end: string;
  prior_window_start: string;
  prior_window_end: string;
  total_articles_analyzed: number;
  distinct_publishers_count: number;
  topics: TopicTrendItem[];
  methodology_note: string;
}

export interface PartyCoverageItem {
  code: string;
  name: string;
  tamil_name: string;
  current_count: number;
  prior_count: number;
  net_change: number;
  distinct_publishers: string[];
  top_topics: { topic: string; count: number }[];
  sentiment_distribution: { positive: number; neutral: number; negative: number };
  average_sentiment_score: number;
  supporting_articles: SupportingArticleRef[];
}

export interface LeaderCoverageItem {
  id: string;
  name: string;
  tamil_name: string;
  party_code: string;
  current_count: number;
  prior_count: number;
  net_change: number;
  distinct_publishers: string[];
  top_topics: { topic: string; count: number }[];
  sentiment_distribution: { positive: number; neutral: number; negative: number };
  average_sentiment_score: number;
  supporting_articles: SupportingArticleRef[];
}

export interface PartyLeaderCoverageResponse {
  period: "24h" | "7d";
  current_window_start: string;
  current_window_end: string;
  parties: PartyCoverageItem[];
  leaders: LeaderCoverageItem[];
  attribution_caveat: string;
}

export interface KeyDevelopmentItem {
  headline_en: string;
  headline_ta: string;
  summary_en: string;
  summary_ta: string;
  impact_assessment: string;
  supporting_article_ids: string[];
  supporting_article_urls: string[];
}

export interface IntelligenceBriefResponse {
  id: string;
  data_status: "live_rss" | "seeded_demo";
  period: "24h" | "7d";
  window_start: string;
  window_end: string;
  generated_at: string;
  sample_size: number;
  publisher_count: number;
  status: "sufficient_data" | "insufficient_data";
  brief_english: string;
  brief_tamil: string;
  key_developments: KeyDevelopmentItem[];
  emerging_topics: Array<{
    topic: string;
    article_count: number;
    publishers: string[];
    sample_article_ids: string[];
  }>;
  party_insights: Array<{
    party_code: string;
    coverage_count: number;
    media_tone: string;
    positive: number;
    neutral: number;
    negative: number;
    supporting_ids: string[];
  }>;
  supporting_article_ids: string[];
  evidence_articles: Array<{
    id: string;
    title: string;
    tamil_title: string;
    source: string;
    source_url: string;
    published_at: string;
    party_codes: string[];
    sentiment: string;
  }>;
  caveat: string;
  is_cached: boolean;
}
