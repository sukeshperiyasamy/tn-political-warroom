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

export interface NewsUpdatesResponse {
  server_time: string;
  cursor: string;
  count: number;
  articles: NewsArticle[];
}

export interface NewsArticle {
  id: string;
  title: string;
  tamil_title: string;
  summary: string;
  tamil_summary: string;
  tamil_variations: TamilVariation[];
  source: string;
  source_type?: string;
  source_category?: string;
  platform?: string;
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
  primary_subject?: string | null;
  is_opinion_or_allegation?: boolean;
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
  channel_name?: string;
  image_url?: string;
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
  primary_subject?: string | null;
  is_opinion_or_allegation?: boolean;
}

export interface NewsSource {
  id: string;
  name: string;
  tamil_name: string;
  category: string;
  source_type?: string;
  platform?: string;
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
  total_duplicates_skipped?: number;
  duration_ms?: number | null;
  results: Array<Record<string, any>>;
}

export interface IngestJobStatus {
  job_id: string;
  status: "queued" | "running" | "completed" | "failed";
  source_id?: string | null;
  sources_total: number;
  sources_processed: number;
  current_source?: string | null;
  total_items_found: number;
  total_new_items_added: number;
  total_duplicates_skipped: number;
  results: Array<Record<string, any>>;
  started_at: string;
  completed_at?: string | null;
  duration_ms?: number | null;
  error?: string | null;
}

export interface IngestTriggerResponse {
  status: string;
  job_id: string;
  message: string;
  source_id?: string | null;
  poll_status_url: string;
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

// --- Multi-Source Social Media Intelligence & Trending Types ---

export interface EngagementSnapshot {
  observed_at: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  growth_rate_per_hour: number;
}

export interface SocialPost {
  id: string;
  platform: "youtube" | "x" | "instagram" | "facebook" | "reddit" | "news" | "google_trends" | string;
  platform_post_id: string;
  canonical_url: string;
  author_name: string;
  author_handle: string;
  title?: string | null;
  content: string;
  language: string;
  media_type: string;
  thumbnail_url?: string | null;
  published_at: string;
  first_seen_at?: string;
  last_seen_at?: string;
  views_count?: number | null;
  likes_count?: number | null;
  comments_count?: number | null;
  shares_count?: number | null;
  quotes_count?: number | null;
  party_codes: string[];
  leader_names: string[];
  topics: string[];
  hashtags: string[];
  sentiment: string;
  sentiment_score: number;
  trend_score: number;
  growth_rate_per_hour?: number | null;
  collection_mode: "LIVE" | "DEMO";
  story_cluster_id?: string | null;
  raw_metrics_available: string[];
  engagement_history?: EngagementSnapshot[];
  cluster?: StoryCluster;
  platform_percentile?: number;
  has_sufficient_history?: boolean;
  history_status?: string;
  engagement_rate_percent?: number | null;
  acquisition_method?: string;
  source_reliability?: number;
  data_provenance?: Record<string, any>;
  matched_entities?: Array<{
    entity_name: string;
    tamil_name?: string;
    entity_type: string;
    party_code?: string;
    confidence: number;
    evidence: string;
    matched_keyword: string;
  }>;
}

export interface DemoScenarioStep {
  step: number;
  title: string;
  description: string;
}

export interface DemoScenario {
  id: string;
  name: string;
  scenario_type: string;
  description: string;
  parties_involved: string[];
  leaders_involved: string[];
  topic: string;
  total_steps: number;
  current_step: number;
  last_replayed_at?: string | null;
  steps_meta: DemoScenarioStep[];
}

export interface ClusterTimelineNode {
  id: string;
  node_type: "news_article" | "social_post";
  platform: string;
  publisher?: string;
  author?: string;
  title: string;
  content?: string;
  url: string;
  media_type?: string;
  published_at: string;
  engagement?: number;
  time_lag_mins: number;
}

export interface ClusterTimelineResponse {
  cluster: StoryCluster;
  narrative_origin: ClusterTimelineNode | null;
  latest_update: ClusterTimelineNode | null;
  propagation_lag_minutes: number;
  platforms_count: number;
  timeline: ClusterTimelineNode[];
  confidence_score: number;
}

export interface TrendExplorerResponse {
  query: {
    party?: string;
    leader?: string;
    topic?: string;
    platform?: string;
    time_window: string;
    mode: string;
  };
  summary: {
    total_posts: number;
    total_standardized_engagement: number;
    average_trend_score: number;
    platform_diversity: number;
    platforms: Record<string, number>;
  };
  timeline: {
    timestamp: string;
    post_count: number;
    engagement: number;
    avg_trend_score: number;
  }[];
  has_sufficient_data: boolean;
}

export interface MethodologyPanel {
  disclaimer: string;
  normalization_strategy: string;
  rankings: Record<string, string>;
  confidence_rules: Record<string, string>;
}

export interface TrendingTopic {
  id?: string;
  topic: string;
  tamil_topic?: string;
  search_volume_display?: string;
  post_count?: number;
  article_count?: number;
  current_volume: number;
  prior_volume: number;
  volume_change: number;
  current_standardized_engagement?: number;
  prior_standardized_engagement?: number;
  engagement_change?: number;
  is_emerging: boolean;
  momentum_state?: "ACCELERATING" | "STEADY" | "DECELERATING" | "EMERGING" | "INSUFFICIENT_HISTORY";
  latest_activity_at?: string;
  trend_score: number;
  platforms: string[];
  distinct_platforms_count: number;
  total_standardized_engagement: number;
  related_parties: string[];
  related_leaders: string[];
  sample_titles: string[];
  originating_categories?: string[];
  primary_origin?: string;
  is_cross_category?: boolean;
  sub_scores: {
    engagement_growth: number;
    volume_growth: number;
    cross_source: number;
    recency: number;
  };
}

export interface TrendingPulseResponse {
  time_window: "1h" | "24h" | "7d" | "30d";
  mode: "live" | "demo" | "all";
  methodology: {
    formula: string;
    weights: {
      engagement_growth: number;
      post_volume_growth: number;
      cross_source_presence: number;
      recency: number;
    };
    description: string;
  };
  trending_topics: TrendingTopic[];
}

export interface StoryCluster {
  id: string;
  title_en: string;
  title_ta: string;
  lead_story?: string;
  topic: string;
  first_observed_at: string;
  latest_observed_at: string;
  distinct_sources_count: number;
  platforms_involved: string[];
  total_engagement: number;
  post_ids: string[];
  news_article_ids?: string[];
  time_lag_minutes: number;
  cluster_status: string;
  post_count?: number;
  collection_mode?: "LIVE" | "DEMO";
}

export interface PlatformStat {
  platform: string;
  post_count: number;
  total_raw_views: number;
  total_raw_likes: number;
  total_raw_comments: number;
  total_raw_shares: number;
  total_standardized_engagement: number;
  party_breakdown: Record<string, number>;
}

export interface PlatformComparisonResponse {
  time_window: string;
  reporting_period: string;
  platforms: PlatformStat[];
  total_posts_across_platforms: number;
  methodology_note: string;
}

export interface ConnectorSetupInstructions {
  platform: string;
  env_variable: string;
  documentation_url: string;
  steps: string[];
}

export interface ConnectorSummary {
  platform: string;
  name: string;
  status: "HEALTHY" | "CONFIGURED" | "NOT_CONFIGURED" | "WARNING" | "ERROR" | "RATE_LIMITED";
  is_enabled: number;
  credentials_configured: number;
  last_successful_fetch?: string | null;
  last_fetch_attempt?: string | null;
  last_error?: string | null;
  error_count: number;
  records_collected: number;
  supported_metrics: string[];
  quota_used: number;
  quota_limit: number;
  setup_instructions?: ConnectorSetupInstructions;
  quota_info?: Record<string, any>;
  latency_ms?: number;
}

export interface ClientConfig {
  id: string;
  client_name: string;
  client_tagline?: string;
  logo_url?: string;
  brand_color?: string;
  accent_color?: string;
  selected_parties: string[];
  selected_leaders: string[];
  topics_of_interest: string[];
  authorized_sources: string[];
  authorized_connectors: string[];
  default_language: string;
  default_demo_scenario?: string;
  updated_at?: string;
  is_active?: boolean;
}

export interface ScenarioBriefResponse {
  scenario_id: string;
  scenario_name: string;
  scenario_type: string;
  current_stage: number;
  total_stages: number;
  stage_title: string;
  stage_description: string;
  topic: string;
  parties_involved: string[];
  leaders_involved: string[];
  provenance: string;
  is_demo: boolean;
  generated_at: string;
  reporting_period: string;
  data_freshness: {
    posts_count: number;
    simulated_views: number;
    simulated_likes: number;
    simulated_comments: number;
    simulated_shares: number;
  };
  executive_summary_en: string;
  executive_summary_ta: string;
  key_developments: Array<{
    platform: string;
    author: string;
    title: string;
    content: string;
    published_at: string;
    url?: string;
    likes?: number;
    comments?: number;
    shares?: number;
  }>;
  narrative_cluster?: any;
  disclaimer: string;
}

export interface EditorialVersionItem {
  version_type: "summary" | "detailed" | "social" | string;
  version_label: string;
  title: string;
  content: string;
  hook?: string | null;
  attribution: string;
  word_count: number;
  tags: string[];
  status_label?: string;
}

export interface ArticleEditorialVersionsResponse {
  article_id: string;
  original_title: string;
  original_tamil_title?: string | null;
  original_summary: string;
  source_name: string;
  source_type: string;
  source_category: string;
  platform: string;
  source_url: string;
  published_at: string;
  party_codes: string[];
  leader_names: string[];
  topics: string[];
  version_1_summary: EditorialVersionItem;
  version_2_detailed: EditorialVersionItem;
  version_3_social: EditorialVersionItem;
  final_version_type?: "summary" | "detailed" | "social" | null;
  final_version_content?: string | null;
  is_finalized: boolean;
  updated_at?: string | null;
}

export interface EditorialFinalizeRequest {
  final_version_type: "summary" | "detailed" | "social";
  final_version_content: string;
  version_1_summary_content?: string;
  version_2_detailed_content?: string;
  version_3_social_content?: string;
}

export interface KeywordItem {
  id: string;
  name_en: string;
  name_ta: string;
  category: string;
  keywords_en: string[];
  keywords_ta: string[];
  hashtags: string[];
  negative_keywords: string[];
  related_party_codes: string[];
  related_leader_names: string[];
  last_reviewed_at?: string | null;
  is_active: boolean;
}

export interface KeywordsResponse {
  count: number;
  categories: string[];
  keywords: KeywordItem[];
  reprocessing_note: string;
}

export interface KeywordCreatePayload {
  id?: string;
  name_en: string;
  name_ta: string;
  category: string;
  keywords_en: string[];
  keywords_ta: string[];
  hashtags: string[];
  negative_keywords: string[];
  related_party_codes: string[];
  related_leader_names: string[];
  is_active?: boolean;
}

export interface AdminSystemStatus {
  status: string;
  service: string;
  timestamp: string;
  publishers: {
    total: number;
    enabled: number;
    disabled: number;
    healthy: number;
    warning_or_error: number;
  };
  content: {
    total_articles: number;
    total_topics: number;
    active_topics: number;
    last_ingestion_at?: string | null;
  };
  recent_logs: IngestionLog[];
}

export interface TrendingConfig {
  weights: {
    momentum_weight: number;
    volume_growth_weight: number;
    cross_source_weight: number;
    recency_weight: number;
  };
  default_weights: {
    momentum_weight: number;
    volume_growth_weight: number;
    cross_source_weight: number;
    recency_weight: number;
  };
  formula: string;
  description: string;
  is_customized: boolean;
}

export interface SafeSettingsResponse {
  branding: {
    client_name?: string;
    client_tagline?: string;
    logo_url?: string;
    brand_color?: string;
    accent_color?: string;
  };
  preferences: {
    default_language?: string;
    polling_interval_minutes: number;
    default_demo_scenario?: string;
  };
  security_notice: string;
}



export interface DiscoveredKeyword {
  id: string;
  name_en: string;
  name_ta: string;
  category: string;
  suggested_party_code?: string | null;
  suggested_leader_name?: string | null;
  frequency: number;
  relevance_score: number;
  sample_article_id?: string | null;
  sample_headline?: string | null;
  status: "pending" | "approved" | "rejected";
  discovered_at: string;
  reviewed_at?: string | null;
}

export interface DiscoveredKeywordsResponse {
  count: number;
  candidates: DiscoveredKeyword[];
}

export interface DistributionItem {
  party_code?: string;
  leader_name?: string;
  topic?: string;
  source_name?: string;
  subject?: string;
  count: number;
  percentage: number;
}

export interface KeywordAnalyticsResponse {
  total_articles: number;
  party_distribution: DistributionItem[];
  leader_distribution: DistributionItem[];
  topic_distribution: DistributionItem[];
  source_distribution: DistributionItem[];
  primary_subject_distribution: DistributionItem[];
  high_frequency_keywords: DistributionItem[];
  anomaly_flags: string[];
}

export interface ReclassificationRequest {
  dry_run: boolean;
  batch_size: number;
  offset: number;
}

export interface ReclassificationSampleDiff {
  article_id: string;
  title: string;
  old_parties: string[];
  new_parties: string[];
  old_leaders: string[];
  new_leaders: string[];
  old_topics: string[];
  new_topics: string[];
  primary_subject?: string | null;
}

export interface ReclassificationResponse {
  dry_run: boolean;
  total_articles: number;
  examined: number;
  changed_count: number;
  sample_diffs: ReclassificationSampleDiff[];
  summary_message: string;
}
