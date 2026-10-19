import {
  NewsArticle,
  PoliticalParty,
  PoliticalLeader,
  CardTemplate,
  DashboardMetrics,
  CompareResponse,
  IntelligenceResponse,
  FilterState,
  SentimentDistribution,
  PartyMetric,
  LeaderMetric,
  DailyTrendItem,
  NewsSource,
  SourceTestResult,
  IngestionLog,
  IngestResponse,
  TopicTrendsResponse,
  PartyLeaderCoverageResponse,
  IntelligenceBriefResponse,
  SocialPost,
  TrendingPulseResponse,
  PlatformComparisonResponse,
  StoryCluster,
  ConnectorSummary,
  DemoScenario,
  ClusterTimelineResponse,
  TrendExplorerResponse,
  MethodologyPanel,
  ClientConfig,
  ScenarioBriefResponse,
  ArticleEditorialVersionsResponse,
  EditorialFinalizeRequest,
  KeywordItem,
  KeywordsResponse,
  KeywordCreatePayload,
  AdminSystemStatus,
  TrendingConfig,
  SafeSettingsResponse,
} from "../types/political";
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://tn-political-warroom.onrender.com"
    : "http://127.0.0.1:8000");

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 45000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

export async function fetchParties(): Promise<PoliticalParty[]> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/news/parties`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Failed to fetch live parties from API:", err);
  }
  return [];
}

export async function fetchLeaders(): Promise<PoliticalLeader[]> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/news/leaders`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Failed to fetch live leaders from API:", err);
  }
  return [];
}

export async function fetchTemplates(): Promise<CardTemplate[]> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/cards/templates`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Failed to fetch card templates from API:", err);
  }
  return [];
}

export async function fetchArticles(filters: FilterState): Promise<NewsArticle[]> {
  const params = new URLSearchParams();
  if (filters.search) params.append("q", filters.search);
  if (filters.party) params.append("party", filters.party);
  if (filters.leader) params.append("leader", filters.leader);
  if (filters.sentiment) params.append("sentiment", filters.sentiment);
  if (filters.topic) params.append("topic", filters.topic);
  if (filters.source) params.append("source", filters.source);
  params.append("mode", "live");

  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/news?${params.toString()}`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Failed to fetch live articles from API:", err);
  }

  return [];
}

export async function fetchMetrics(filters: FilterState): Promise<DashboardMetrics | null> {
  const params = new URLSearchParams();
  if (filters.search) params.append("q", filters.search);
  if (filters.party) params.append("party", filters.party);
  if (filters.leader) params.append("leader", filters.leader);
  if (filters.sentiment) params.append("sentiment", filters.sentiment);
  if (filters.topic) params.append("topic", filters.topic);
  if (filters.source) params.append("source", filters.source);
  params.append("mode", "live");

  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/metrics?${params.toString()}`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Failed to fetch live metrics from API:", err);
  }

  return null;
}

export async function compareEntities(entity_type: string, entity_ids: string[], mode: string = "live"): Promise<CompareResponse> {
  const res = await fetchWithTimeout(`${API_BASE}/api/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entity_type, entity_ids, mode }),
  });
  if (!res.ok) throw new Error("Failed to fetch comparison data from live API");
  return await res.json();
}

export async function analyzeIntelligence(text: string, headline = "", source = ""): Promise<IntelligenceResponse> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/intelligence/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, headline, source }),
    });
    if (res.ok) return await res.json();
  } catch {
    // fallback intelligence analysis
  }

  // Local fallback entity logic
  const parties: string[] = [];
  if (text.includes("திமுக") || text.includes("DMK") || text.includes("ஸ்டாலின்")) parties.push("DMK");
  if (text.includes("அதிமுக") || text.includes("AIADMK") || text.includes("பழனிசாமி")) parties.push("AIADMK");
  if (text.includes("பாஜக") || text.includes("BJP") || text.includes("அண்ணாமலை")) parties.push("BJP");
  if (text.includes("விஜய்") || text.includes("தவெக") || text.includes("TVK")) parties.push("TVK");
  if (parties.length === 0) parties.push("DMK");

  return {
    identified_parties: parties,
    identified_leaders: parties.includes("TVK") ? ["Thalapathy Vijay"] : ["M.K. Stalin"],
    topics: ["2026 Assembly Election", "State Politics"],
    sentiment: "positive",
    sentiment_score: 0.65,
    english_summary: `Political intelligence breakdown for ${headline || "this development"}. Key focus on ${parties.join(", ")} messaging and voter reception.`,
    tamil_summary: `இச்செய்தி தமிழக அரசியல் களத்தில் ${parties.join(", ")} சார்ந்த முக்கிய நகர்வுகளை சுட்டிக்காட்டுகிறது. தேர்தல் வியூகம் மற்றும் மக்கள் ஆதரவு குறித்து பகுப்பாய்வு செய்யப்பட்டுள்ளது.`,
    tamil_variations: [
      {
        style: "செய்தித் தலைப்பு (Direct)",
        headline: headline || "தமிழக அரசியல் களம்: முக்கிய திருப்பம்!",
        caption: "உடனடி அரசியல் நிகழ்வு குறித்த சுருக்கமான பார்வை.",
      },
      {
        style: "அரசியல் பார்வை (Impact)",
        headline: `2026 களம்: ${parties[0]} முன்னெடுக்கும் புதிய அரசியல் அஸ்திரம்!`,
        caption: "கள நிலவரத்தை மாற்றியமைக்கும் தேர்தல் வியூகம்.",
      },
      {
        style: "வார் ரூம் வைரல் பைட் (Viral Hook)",
        headline: "‘மக்களின் குரலே இறுதித் தீர்ப்பு!’ — அனல் பறக்கும் தேர்தல் களம்!",
        caption: "சமூக ஊடகங்களில் பரவலாக பகிரப்படும் கருத்து.",
      },
    ],
    analysis_provider: "demo_rule_engine",
    is_live_ai: false,
  };
}

export async function fetchSources(): Promise<NewsSource[]> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/sources`, {}, 6000);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Failed to fetch live sources from API:", err);
  }
  return [];
}

export async function toggleSource(sourceId: string): Promise<NewsSource> {
  const res = await fetchWithTimeout(`${API_BASE}/api/sources/${sourceId}/toggle`, {
    method: "POST",
  }, 4000);
  if (!res.ok) throw new Error("Failed to toggle source");
  return await res.json();
}

export async function testSource(sourceId: string): Promise<SourceTestResult> {
  const res = await fetchWithTimeout(`${API_BASE}/api/sources/${sourceId}/test`, {
    method: "POST",
  }, 10000);
  if (!res.ok) throw new Error("Failed to test source");
  return await res.json();
}

export async function testCustomUrl(rss_url: string): Promise<SourceTestResult> {
  const res = await fetchWithTimeout(`${API_BASE}/api/sources/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rss_url }),
  }, 10000);
  if (!res.ok) throw new Error("Failed to test feed URL");
  return await res.json();
}

export async function createSource(data: Partial<NewsSource>): Promise<NewsSource> {
  const res = await fetchWithTimeout(`${API_BASE}/api/sources`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, 5000);
  if (!res.ok) throw new Error("Failed to add source");
  return await res.json();
}

export async function deleteSource(sourceId: string): Promise<{ status: string; id: string }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/sources/${sourceId}`, {
    method: "DELETE",
  }, 4000);
  if (!res.ok) throw new Error("Failed to delete source");
  return await res.json();
}

export async function triggerIngest(sourceId?: string): Promise<IngestResponse> {
  const url = sourceId ? `${API_BASE}/api/sources/ingest?source_id=${sourceId}` : `${API_BASE}/api/sources/ingest`;
  const res = await fetchWithTimeout(url, {
    method: "POST",
  }, 45000);
  if (!res.ok) throw new Error("Failed to trigger ingestion");
  return await res.json();
}

export async function fetchLogs(limit = 20): Promise<IngestionLog[]> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/sources/logs?limit=${limit}`, {}, 3000);
    if (res.ok) return await res.json();
  } catch {
    // fallback
  }
  return [];
}

export async function fetchTopicTrends(
  mode: "live" | "demo" = "live",
  period: "24h" | "7d" = "24h",
  filters?: { party?: string; leader?: string; source?: string }
): Promise<TopicTrendsResponse> {
  const params = new URLSearchParams();
  params.append("mode", mode);
  params.append("period", period);
  if (filters?.party) params.append("party", filters.party);
  if (filters?.leader) params.append("leader", filters.leader);
  if (filters?.source) params.append("source", filters.source);

  const res = await fetchWithTimeout(`${API_BASE}/api/intelligence/trends?${params.toString()}`, {}, 5000);
  if (!res.ok) throw new Error("Failed to fetch topic trends");
  return await res.json();
}

export async function fetchPartyLeaderCoverage(
  mode: "live" | "demo" = "live",
  period: "24h" | "7d" = "24h"
): Promise<PartyLeaderCoverageResponse> {
  const params = new URLSearchParams();
  params.append("mode", mode);
  params.append("period", period);

  const res = await fetchWithTimeout(`${API_BASE}/api/intelligence/party-leader-coverage?${params.toString()}`, {}, 5000);
  if (!res.ok) throw new Error("Failed to fetch party and leader coverage");
  return await res.json();
}

export async function fetchIntelligenceBrief(
  mode: "live" | "demo" = "live",
  period: "24h" | "7d" = "24h",
  regenerate = false
): Promise<IntelligenceBriefResponse> {
  const params = new URLSearchParams();
  params.append("mode", mode);
  params.append("period", period);
  if (regenerate) params.append("regenerate", "true");

  const res = await fetchWithTimeout(`${API_BASE}/api/intelligence/brief?${params.toString()}`, {}, 8000);
  if (!res.ok) throw new Error("Failed to fetch intelligence brief");
  return await res.json();
}

export async function fetchEvidenceSearch(params: {
  mode: "live" | "demo";
  q?: string;
  party?: string;
  leader?: string;
  topic?: string;
  source?: string;
  date_from?: string;
  date_to?: string;
  sort_order?: "desc" | "asc";
  limit?: number;
}): Promise<{ total_matched: number; limit: number; mode: string; articles: any[] }> {
  const urlParams = new URLSearchParams();
  urlParams.append("mode", params.mode || "live");
  if (params.q) urlParams.append("q", params.q);
  if (params.party) urlParams.append("party", params.party);
  if (params.leader) urlParams.append("leader", params.leader);
  if (params.topic) urlParams.append("topic", params.topic);
  if (params.source) urlParams.append("source", params.source);
  if (params.date_from) urlParams.append("date_from", params.date_from);
  if (params.date_to) urlParams.append("date_to", params.date_to);
  if (params.sort_order) urlParams.append("sort_order", params.sort_order);
  if (params.limit) urlParams.append("limit", params.limit.toString());

  const res = await fetchWithTimeout(`${API_BASE}/api/intelligence/search?${urlParams.toString()}`, {}, 5000);
  if (!res.ok) throw new Error("Failed to search evidence");
  return await res.json();
}

// --- Social Intelligence API Methods ---

export async function fetchSocialPosts(filters: {
  platform?: string;
  topic?: string;
  party?: string;
  leader?: string;
  mode?: "live" | "demo" | "all";
  sort?: "trending" | "fastest_growing" | "most_discussed" | "most_liked" | "most_shared" | "most_cross_platform" | "engagement" | "recent" | string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ total_count: number; limit: number; offset: number; posts: SocialPost[] }> {
  const params = new URLSearchParams();
  if (filters.platform && filters.platform !== "all") params.append("platform", filters.platform);
  if (filters.topic && filters.topic !== "all") params.append("topic", filters.topic);
  if (filters.party && filters.party !== "all") params.append("party", filters.party);
  if (filters.leader && filters.leader !== "all") params.append("leader", filters.leader);
  if (filters.mode) params.append("mode", filters.mode);
  if (filters.sort) params.append("sort", filters.sort);
  if (filters.limit) params.append("limit", filters.limit.toString());
  if (filters.offset) params.append("offset", filters.offset.toString());

  const res = await fetchWithTimeout(`${API_BASE}/api/social/posts?${params.toString()}`, {}, 5000);
  if (!res.ok) throw new Error("Failed to fetch social posts");
  return await res.json();
}

export async function fetchSocialPostDetail(postId: string): Promise<SocialPost> {
  const res = await fetchWithTimeout(`${API_BASE}/api/social/posts/${postId}`, {}, 4000);
  if (!res.ok) throw new Error("Failed to fetch social post detail");
  return await res.json();
}

export async function fetchTrendingPulse(
  timeWindow: "1h" | "24h" | "7d" | "30d" = "24h",
  mode: "live" | "demo" | "all" = "live",
  limit = 10
): Promise<TrendingPulseResponse> {
  const params = new URLSearchParams({
    time_window: timeWindow,
    mode: mode,
    limit: limit.toString(),
  });
  const res = await fetchWithTimeout(`${API_BASE}/api/social/trending?${params.toString()}`, {}, 5000);
  if (!res.ok) throw new Error("Failed to fetch trending pulse");
  return await res.json();
}

export async function fetchPlatformComparison(
  timeWindow: "1h" | "24h" | "7d" | "30d" = "24h",
  mode: "live" | "demo" | "all" = "live"
): Promise<PlatformComparisonResponse> {
  const params = new URLSearchParams({
    time_window: timeWindow,
    mode: mode,
  });
  const res = await fetchWithTimeout(`${API_BASE}/api/social/platform-comparison?${params.toString()}`, {}, 5000);
  if (!res.ok) throw new Error("Failed to fetch platform comparison");
  return await res.json();
}

export async function fetchStoryClusters(
  limit = 10,
  mode: "live" | "demo" | "all" = "live"
): Promise<{ count: number; clusters: StoryCluster[] }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/social/story-clusters?limit=${limit}&mode=${mode}`, {}, 5000);
  if (!res.ok) throw new Error("Failed to fetch story clusters");
  return await res.json();
}

export async function fetchTopHashtags(
  limit = 15,
  mode: "live" | "demo" | "all" = "live"
): Promise<{ hashtags: Array<{ tag: string; count: number; platforms: string[]; parties: string[] }> }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/social/hashtags?limit=${limit}&mode=${mode}`, {}, 4000);
  if (!res.ok) throw new Error("Failed to fetch hashtags");
  return await res.json();
}

export async function fetchConnectors(): Promise<ConnectorSummary[]> {
  const res = await fetchWithTimeout(`${API_BASE}/api/social/connectors`, {}, 4000);
  if (!res.ok) throw new Error("Failed to fetch connectors");
  return await res.json();
}

export async function testConnector(platform: string): Promise<any> {
  const res = await fetchWithTimeout(`${API_BASE}/api/social/connectors/${platform}/test`, {
    method: "POST",
  }, 10000);
  if (!res.ok) throw new Error(`Failed to test connector ${platform}`);
  return await res.json();
}

export async function triggerSocialIngestion(): Promise<any> {
  const res = await fetchWithTimeout(`${API_BASE}/api/social/ingestion/run`, {
    method: "POST",
  }, 30000);
  if (!res.ok) throw new Error("Failed to trigger social ingestion");
  return await res.json();
}

export async function seedDemoSocialData(): Promise<any> {
  const res = await fetchWithTimeout(`${API_BASE}/api/social/demo/seed`, {
    method: "POST",
  }, 10000);
  if (!res.ok) throw new Error("Failed to seed demo social data");
  return await res.json();
}

export async function fetchTrendExplorer(params: {
  party?: string;
  leader?: string;
  topic?: string;
  platform?: string;
  timeWindow?: "1h" | "24h" | "7d" | "30d";
  mode?: "live" | "demo" | "all";
}): Promise<TrendExplorerResponse> {
  const q = new URLSearchParams();
  if (params.party && params.party !== "all") q.append("party", params.party);
  if (params.leader && params.leader !== "all") q.append("leader", params.leader);
  if (params.topic && params.topic !== "all") q.append("topic", params.topic);
  if (params.platform && params.platform !== "all") q.append("platform", params.platform);
  if (params.timeWindow) q.append("time_window", params.timeWindow);
  if (params.mode) q.append("mode", params.mode);

  const res = await fetchWithTimeout(`${API_BASE}/api/social/trend-explorer?${q.toString()}`, {}, 5000);
  if (!res.ok) throw new Error("Failed to fetch trend explorer data");
  return await res.json();
}

export async function fetchClusterTimeline(clusterId: string): Promise<ClusterTimelineResponse> {
  const res = await fetchWithTimeout(`${API_BASE}/api/social/story-clusters/${clusterId}/timeline`, {}, 5000);
  if (!res.ok) throw new Error("Failed to fetch story cluster timeline");
  return await res.json();
}

export async function fetchMethodology(): Promise<MethodologyPanel> {
  const res = await fetchWithTimeout(`${API_BASE}/api/social/methodology`, {}, 4000);
  if (!res.ok) throw new Error("Failed to fetch methodology");
  return await res.json();
}

export async function fetchDemoScenarios(): Promise<{ scenarios: DemoScenario[] }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/social/demo/scenarios`, {}, 4000);
  if (!res.ok) throw new Error("Failed to fetch demo scenarios");
  return await res.json();
}

export async function fetchDemoScenarioDetail(scenarioId: string): Promise<DemoScenario> {
  const res = await fetchWithTimeout(`${API_BASE}/api/social/demo/scenarios/${scenarioId}`, {}, 4000);
  if (!res.ok) throw new Error("Failed to fetch scenario detail");
  return await res.json();
}

export async function replayDemoScenario(scenarioId: string, step: number = 1): Promise<any> {
  const res = await fetchWithTimeout(`${API_BASE}/api/social/demo/scenarios/${scenarioId}/replay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ step }),
  }, 10000);
  if (!res.ok) throw new Error("Failed to replay demo scenario");
  return await res.json();
}

export async function fetchFetchRuns(limit = 25): Promise<{ fetch_runs: any[] }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/social/fetch-runs?limit=${limit}`, {}, 4000);
  if (!res.ok) throw new Error("Failed to fetch fetch runs diagnostics");
  return await res.json();
}

export async function runConnectorManually(platform: string): Promise<any> {
  const res = await fetchWithTimeout(`${API_BASE}/api/social/scheduler/run-connector/${platform}`, {
    method: "POST",
  }, 15000);
  if (!res.ok) throw new Error(`Failed to execute connector ${platform}`);
  return await res.json();
}

export async function fetchClientConfig(): Promise<ClientConfig> {
  const res = await fetchWithTimeout(`${API_BASE}/api/client-config`, {}, 4000);
  if (!res.ok) throw new Error("Failed to fetch client configuration");
  return await res.json();
}

export async function updateClientConfig(updates: Partial<ClientConfig>): Promise<ClientConfig> {
  const res = await fetchWithTimeout(`${API_BASE}/api/client-config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  }, 5000);
  if (!res.ok) throw new Error("Failed to update client configuration");
  return await res.json();
}

export async function resetClientConfig(): Promise<ClientConfig> {
  const res = await fetchWithTimeout(`${API_BASE}/api/client-config/reset`, {
    method: "POST",
  }, 5000);
  if (!res.ok) throw new Error("Failed to reset client configuration");
  return await res.json();
}

export async function resetDemoScenario(scenarioId?: string): Promise<{ status: string; message: string }> {
  const url = scenarioId
    ? `${API_BASE}/api/social/demo/scenarios/${scenarioId}/reset`
    : `${API_BASE}/api/social/demo/scenarios/reset`;
  const res = await fetchWithTimeout(url, { method: "POST" }, 8000);
  if (!res.ok) throw new Error("Failed to reset demo scenario");
  return await res.json();
}

export async function fetchScenarioBrief(scenarioId: string): Promise<ScenarioBriefResponse> {
  const res = await fetchWithTimeout(`${API_BASE}/api/social/demo/scenarios/${scenarioId}/brief`, {}, 5000);
  if (!res.ok) throw new Error("Failed to fetch scenario intelligence brief");
  return await res.json();
}

export async function fetchEditorialVersions(articleId: string): Promise<ArticleEditorialVersionsResponse> {
  const res = await fetchWithTimeout(`${API_BASE}/api/news/${articleId}/editorial-versions`, {}, 6000);
  if (!res.ok) throw new Error(`Failed to fetch editorial versions for article ${articleId}`);
  return await res.json();
}

export async function saveEditorialFinal(
  articleId: string,
  payload: EditorialFinalizeRequest
): Promise<ArticleEditorialVersionsResponse> {
  const res = await fetchWithTimeout(`${API_BASE}/api/news/${articleId}/editorial-final`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }, 8000);
  if (!res.ok) throw new Error(`Failed to save finalized editorial version for article ${articleId}`);
  return await res.json();
}

// ==========================================
// Admin Panel Intelligence & Config Services
// ==========================================

export async function fetchAdminSystemStatus(): Promise<AdminSystemStatus> {
  const res = await fetchWithTimeout(`${API_BASE}/api/admin/system-status`, {}, 6000);
  if (!res.ok) throw new Error("Failed to fetch admin system status");
  return await res.json();
}

export async function fetchKeywords(
  search?: string,
  category?: string,
  activeOnly?: boolean
): Promise<KeywordsResponse> {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (category && category !== "All") params.append("category", category);
  if (activeOnly) params.append("active_only", "true");

  const url = `${API_BASE}/api/admin/keywords${params.toString() ? `?${params.toString()}` : ""}`;
  const res = await fetchWithTimeout(url, {}, 6000);
  if (!res.ok) throw new Error("Failed to fetch registered keywords");
  return await res.json();
}

export async function createKeyword(payload: KeywordCreatePayload): Promise<KeywordItem> {
  const res = await fetchWithTimeout(`${API_BASE}/api/admin/keywords`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }, 8000);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to create keyword" }));
    throw new Error(err.detail || "Failed to create keyword");
  }
  return await res.json();
}

export async function updateKeyword(
  id: string,
  payload: Partial<KeywordCreatePayload>
): Promise<KeywordItem> {
  const res = await fetchWithTimeout(`${API_BASE}/api/admin/keywords/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }, 8000);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to update keyword" }));
    throw new Error(err.detail || "Failed to update keyword");
  }
  return await res.json();
}

export async function toggleKeyword(id: string): Promise<{ id: string; is_active: boolean }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/admin/keywords/${encodeURIComponent(id)}/toggle`, {
    method: "POST",
  }, 6000);
  if (!res.ok) throw new Error("Failed to toggle keyword status");
  return await res.json();
}

export async function deleteKeyword(id: string): Promise<{ status: string; id: string; name_en: string }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/admin/keywords/${encodeURIComponent(id)}`, {
    method: "DELETE",
  }, 6000);
  if (!res.ok) throw new Error("Failed to delete keyword");
  return await res.json();
}

export async function fetchTrendingConfig(): Promise<TrendingConfig> {
  const res = await fetchWithTimeout(`${API_BASE}/api/admin/trending-config`, {}, 6000);
  if (!res.ok) throw new Error("Failed to fetch trending configuration");
  return await res.json();
}

export async function updateTrendingConfig(weights: {
  momentum_weight: number;
  volume_growth_weight: number;
  cross_source_weight: number;
  recency_weight: number;
}): Promise<TrendingConfig> {
  const res = await fetchWithTimeout(`${API_BASE}/api/admin/trending-config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(weights),
  }, 8000);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to update trending configuration" }));
    throw new Error(err.detail || "Failed to update trending configuration");
  }
  return await res.json();
}

export async function resetTrendingConfig(): Promise<TrendingConfig> {
  const res = await fetchWithTimeout(`${API_BASE}/api/admin/trending-config/reset`, {
    method: "POST",
  }, 6000);
  if (!res.ok) throw new Error("Failed to reset trending configuration");
  return await res.json();
}

export async function fetchSafeSettings(): Promise<SafeSettingsResponse> {
  const res = await fetchWithTimeout(`${API_BASE}/api/admin/settings`, {}, 6000);
  if (!res.ok) throw new Error("Failed to fetch application settings");
  return await res.json();
}

export async function updateSafeSettings(
  settings: Partial<SafeSettingsResponse["branding"]>
): Promise<SafeSettingsResponse> {
  const res = await fetchWithTimeout(`${API_BASE}/api/admin/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  }, 8000);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to update application settings" }));
    throw new Error(err.detail || "Failed to update application settings");
  }
  return await res.json();
}



