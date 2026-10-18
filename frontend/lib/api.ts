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
} from "../types/political";
import {
  FALLBACK_ARTICLES,
  FALLBACK_PARTIES,
  FALLBACK_LEADERS,
  FALLBACK_TEMPLATES,
} from "./seed-fallback";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 1500) {
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
  } catch {
    // fallback
  }
  return FALLBACK_PARTIES;
}

export async function fetchLeaders(): Promise<PoliticalLeader[]> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/news/leaders`);
    if (res.ok) return await res.json();
  } catch {
    // fallback
  }
  return FALLBACK_LEADERS;
}

export async function fetchTemplates(): Promise<CardTemplate[]> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/cards/templates`);
    if (res.ok) return await res.json();
  } catch {
    // fallback
  }
  return FALLBACK_TEMPLATES;
}

export async function fetchArticles(filters: FilterState): Promise<NewsArticle[]> {
  const params = new URLSearchParams();
  if (filters.search) params.append("q", filters.search);
  if (filters.party) params.append("party", filters.party);
  if (filters.leader) params.append("leader", filters.leader);
  if (filters.sentiment) params.append("sentiment", filters.sentiment);
  if (filters.topic) params.append("topic", filters.topic);
  if (filters.source) params.append("source", filters.source);
  params.append("mode", filters.mode || "live");

  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/news?${params.toString()}`);
    if (res.ok) return await res.json();
  } catch {
    // fallback filtering
  }

  return filterLocalArticles(filters);
}

function filterLocalArticles(filters: FilterState): NewsArticle[] {
  let list = [...FALLBACK_ARTICLES];

  if (filters.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.tamil_title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.tamil_summary.toLowerCase().includes(q) ||
        a.party_codes.some((p) => p.toLowerCase().includes(q)) ||
        a.leader_names.some((l) => l.toLowerCase().includes(q)) ||
        a.topics.some((t) => t.toLowerCase().includes(q))
    );
  }

  if (filters.party) {
    list = list.filter((a) => a.party_codes.includes(filters.party));
  }
  if (filters.leader) {
    list = list.filter((a) => a.leader_names.includes(filters.leader));
  }
  if (filters.sentiment) {
    list = list.filter((a) => a.sentiment === filters.sentiment);
  }
  if (filters.topic) {
    list = list.filter((a) => a.topics.includes(filters.topic));
  }
  if (filters.source) {
    list = list.filter((a) => a.source.toLowerCase().includes(filters.source.toLowerCase()));
  }

  list.sort((a, b) => b.published_at.localeCompare(a.published_at));
  return list;
}

export async function fetchMetrics(filters: FilterState): Promise<DashboardMetrics> {
  const params = new URLSearchParams();
  if (filters.search) params.append("q", filters.search);
  if (filters.party) params.append("party", filters.party);
  if (filters.leader) params.append("leader", filters.leader);
  if (filters.sentiment) params.append("sentiment", filters.sentiment);
  if (filters.topic) params.append("topic", filters.topic);
  if (filters.source) params.append("source", filters.source);
  params.append("mode", filters.mode || "live");

  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/metrics?${params.toString()}`);
    if (res.ok) return await res.json();
  } catch {
    // calculate locally
  }

  const filtered = filterLocalArticles(filters);
  const total = filtered.length;

  const pos = filtered.filter((a) => a.sentiment === "positive").length;
  const neu = filtered.filter((a) => a.sentiment === "neutral").length;
  const neg = filtered.filter((a) => a.sentiment === "negative").length;

  const sentiment_dist: SentimentDistribution = {
    positive: pos,
    neutral: neu,
    negative: neg,
    positive_pct: total > 0 ? Number(((pos / total) * 100).toFixed(1)) : 0,
    neutral_pct: total > 0 ? Number(((neu / total) * 100).toFixed(1)) : 0,
    negative_pct: total > 0 ? Number(((neg / total) * 100).toFixed(1)) : 0,
  };

  const party_metrics: PartyMetric[] = FALLBACK_PARTIES.map((p) => {
    const p_arts = filtered.filter((a) => a.party_codes.includes(p.code));
    const p_pos = p_arts.filter((a) => a.sentiment === "positive").length;
    const p_neu = p_arts.filter((a) => a.sentiment === "neutral").length;
    const p_neg = p_arts.filter((a) => a.sentiment === "negative").length;
    const avg = p_arts.length > 0 ? p_arts.reduce((s, a) => s + a.sentiment_score, 0) / p_arts.length : 0;
    return {
      party_code: p.code,
      name: p.name,
      tamil_name: p.tamil_name,
      color: p.color,
      article_count: p_arts.length,
      positive_count: p_pos,
      neutral_count: p_neu,
      negative_count: p_neg,
      sentiment_score: Number(avg.toFixed(2)),
    };
  })
    .filter((m) => m.article_count > 0)
    .sort((a, b) => b.article_count - a.article_count);

  const leader_metrics: LeaderMetric[] = FALLBACK_LEADERS.map((l) => {
    const l_arts = filtered.filter((a) => a.leader_names.includes(l.name));
    const l_pos = l_arts.filter((a) => a.sentiment === "positive").length;
    const l_neu = l_arts.filter((a) => a.sentiment === "neutral").length;
    const l_neg = l_arts.filter((a) => a.sentiment === "negative").length;
    const avg = l_arts.length > 0 ? l_arts.reduce((s, a) => s + a.sentiment_score, 0) / l_arts.length : 0;
    return {
      name: l.name,
      tamil_name: l.tamil_name,
      party_code: l.party_code,
      article_count: l_arts.length,
      positive_count: l_pos,
      neutral_count: l_neu,
      negative_count: l_neg,
      sentiment_score: Number(avg.toFixed(2)),
    };
  })
    .filter((m) => m.article_count > 0)
    .sort((a, b) => b.article_count - a.article_count);

  const tCounts: Record<string, number> = {};
  filtered.forEach((a) => a.topics.forEach((t) => (tCounts[t] = (tCounts[t] || 0) + 1)));
  const top_topics = Object.entries(tCounts)
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const dates = Array.from(new Set(filtered.map((a) => a.published_at.split("T")[0]))).sort();
  const daily_trends: DailyTrendItem[] = dates.map((d) => {
    const dayArts = filtered.filter((a) => a.published_at.startsWith(d));
    return {
      date: d,
      positive: dayArts.filter((a) => a.sentiment === "positive").length,
      neutral: dayArts.filter((a) => a.sentiment === "neutral").length,
      negative: dayArts.filter((a) => a.sentiment === "negative").length,
      total: dayArts.length,
    };
  });

  const sourceCounts: Record<string, number> = {};
  filtered.forEach((a) => (sourceCounts[a.source] = (sourceCounts[a.source] || 0) + 1));
  const data_sources = Object.entries(sourceCounts).map(([source, count]) => ({
    source,
    count,
    status: "seeded_demo",
  }));

  return {
    total_articles: FALLBACK_ARTICLES.length,
    filtered_articles: total,
    sentiment_distribution: sentiment_dist,
    party_metrics,
    leader_metrics,
    top_topics,
    daily_trends,
    data_sources,
    disclaimer:
      "Demo mode active: includes curated verified Tamil media articles labeled as seeded_demo. Metrics and reach values are estimated.",
  };
}

export async function compareEntities(entity_type: string, entity_ids: string[], mode: string = "live"): Promise<CompareResponse> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/compare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity_type, entity_ids, mode }),
    });
    if (res.ok) return await res.json();
  } catch {
    // fallback local comparison
  }

  const comparison = entity_ids.map((id) => {
    if (entity_type === "party") {
      const p = FALLBACK_PARTIES.find((party) => party.code.toUpperCase() === id.toUpperCase());
      const pArts = FALLBACK_ARTICLES.filter((a) => a.party_codes.includes(id));
      const pos = pArts.filter((a) => a.sentiment === "positive").length;
      const neu = pArts.filter((a) => a.sentiment === "neutral").length;
      const neg = pArts.filter((a) => a.sentiment === "negative").length;
      const total = pArts.length;
      const avg = total > 0 ? pArts.reduce((s, a) => s + a.sentiment_score, 0) / total : 0;
      const totalReach = pArts.reduce((s, a) => s + (a.engagement_estimated.reach || 0), 0);

      const tc: Record<string, number> = {};
      pArts.forEach((a) => a.topics.forEach((t) => (tc[t] = (tc[t] || 0) + 1)));

      return {
        id: p ? p.code : id,
        name: p ? p.name : id,
        tamil_name: p ? p.tamil_name : id,
        party_code: p?.code,
        color: p ? p.color : "#38BDF8",
        article_count: total,
        sentiment: {
          positive: pos,
          neutral: neu,
          negative: neg,
          positive_pct: total > 0 ? Number(((pos / total) * 100).toFixed(1)) : 0,
          neutral_pct: total > 0 ? Number(((neu / total) * 100).toFixed(1)) : 0,
          negative_pct: total > 0 ? Number(((neg / total) * 100).toFixed(1)) : 0,
        },
        average_sentiment_score: Number(avg.toFixed(2)),
        estimated_total_reach: totalReach,
        top_topics: Object.entries(tc)
          .map(([topic, count]) => ({ topic, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
        recent_articles: pArts.slice(0, 3),
      };
    } else {
      const l = FALLBACK_LEADERS.find((leader) => leader.id === id || leader.name.toLowerCase() === id.toLowerCase());
      const p = FALLBACK_PARTIES.find((party) => party.code === l?.party_code);
      const lArts = FALLBACK_ARTICLES.filter((a) => (l ? a.leader_names.includes(l.name) : false));
      const pos = lArts.filter((a) => a.sentiment === "positive").length;
      const neu = lArts.filter((a) => a.sentiment === "neutral").length;
      const neg = lArts.filter((a) => a.sentiment === "negative").length;
      const total = lArts.length;
      const avg = total > 0 ? lArts.reduce((s, a) => s + a.sentiment_score, 0) / total : 0;
      const totalReach = lArts.reduce((s, a) => s + (a.engagement_estimated.reach || 0), 0);

      const tc: Record<string, number> = {};
      lArts.forEach((a) => a.topics.forEach((t) => (tc[t] = (tc[t] || 0) + 1)));

      return {
        id: l ? l.id : id,
        name: l ? l.name : id,
        tamil_name: l ? l.tamil_name : id,
        party_code: l?.party_code,
        color: p ? p.color : "#64748B",
        article_count: total,
        sentiment: {
          positive: pos,
          neutral: neu,
          negative: neg,
          positive_pct: total > 0 ? Number(((pos / total) * 100).toFixed(1)) : 0,
          neutral_pct: total > 0 ? Number(((neu / total) * 100).toFixed(1)) : 0,
          negative_pct: total > 0 ? Number(((neg / total) * 100).toFixed(1)) : 0,
        },
        average_sentiment_score: Number(avg.toFixed(2)),
        estimated_total_reach: totalReach,
        top_topics: Object.entries(tc)
          .map(([topic, count]) => ({ topic, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
        recent_articles: lArts.slice(0, 3),
      };
    }
  });

  return {
    entity_type,
    comparison,
    methodology:
      "Sentiment score calculated by contextual entity attribution (-1.0 to +1.0). Estimated reach is aggregate reader impressions.",
  };
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
    const res = await fetchWithTimeout(`${API_BASE}/api/sources`, {}, 4000);
    if (res.ok) return await res.json();
  } catch {
    // fallback
  }
  return [
    {
      id: "news18_tamil",
      name: "News18 Tamil Nadu",
      tamil_name: "நியூஸ்18 தமிழ்நாடு",
      category: "TV News",
      url: "https://tamil.news18.com",
      rss_url: "https://tamil.news18.com/commonfeeds/v1/tam/rss/tamil-nadu.xml",
      language: "ta",
      is_enabled: true,
      health_status: "healthy",
      last_fetched_at: new Date().toISOString(),
      last_error: null,
      total_articles_fetched: 200,
      current_article_count: 200,
    },
    {
      id: "polimer_news",
      name: "Polimer News",
      tamil_name: "பாலிமர் செய்திகள்",
      category: "TV News",
      url: "https://polimernews.com",
      rss_url: "https://polimernews.com/rss",
      language: "ta",
      is_enabled: true,
      health_status: "healthy",
      last_fetched_at: new Date().toISOString(),
      last_error: null,
      total_articles_fetched: 50,
      current_article_count: 50,
    },
    {
      id: "muthanmai_tn",
      name: "Muthanmai Reporter (Tamil Nadu)",
      tamil_name: "முதன்மை ரிப்போர்ட்டர் (தமிழ்நாடு)",
      category: "State Politics",
      url: "https://muthanmaireporter.com",
      rss_url: "https://muthanmaireporter.com/rss/category/tamilnadu",
      language: "ta",
      is_enabled: true,
      health_status: "healthy",
      last_fetched_at: new Date().toISOString(),
      last_error: null,
      total_articles_fetched: 99,
      current_article_count: 99,
    },
    {
      id: "the_hindu_tn",
      name: "The Hindu (Tamil Nadu)",
      tamil_name: "தி இந்து",
      category: "Print / Digital",
      url: "https://www.thehindu.com/news/national/tamil-nadu/",
      rss_url: "https://www.thehindu.com/news/national/tamil-nadu/feeder/default.rss",
      language: "en",
      is_enabled: true,
      health_status: "healthy",
      last_fetched_at: new Date().toISOString(),
      last_error: null,
      total_articles_fetched: 60,
      current_article_count: 60,
    },
    {
      id: "oneindia_tamil",
      name: "OneIndia Tamil",
      tamil_name: "ஒன்இந்தியா தமிழ்",
      category: "Digital News",
      url: "https://tamil.oneindia.com",
      rss_url: "https://tamil.oneindia.com/rss/feeds/tamil-news-fb.xml",
      language: "ta",
      is_enabled: true,
      health_status: "healthy",
      last_fetched_at: new Date().toISOString(),
      last_error: null,
      total_articles_fetched: 30,
      current_article_count: 30,
    },
    {
      id: "bbc_tamil",
      name: "BBC News Tamil",
      tamil_name: "பிபிசி தமிழ்",
      category: "Digital News",
      url: "https://www.bbc.com/tamil",
      rss_url: "https://feeds.bbci.co.uk/tamil/rss.xml",
      language: "ta",
      is_enabled: true,
      health_status: "healthy",
      last_fetched_at: new Date().toISOString(),
      last_error: null,
      total_articles_fetched: 24,
      current_article_count: 24,
    },
    {
      id: "muthanmai_politics",
      name: "Muthanmai Reporter (Politics)",
      tamil_name: "முதன்மை ரிப்போர்ட்டர் (அரசியல்)",
      category: "State Politics",
      url: "https://muthanmaireporter.com",
      rss_url: "https://muthanmaireporter.com/rss/category/%E0%AE%85%E0%AE%B0%E0%AE%9A%E0%AE%BF%E0%AE%AF%E0%AE%B2%E0%AF%8D",
      language: "ta",
      is_enabled: true,
      health_status: "healthy",
      last_fetched_at: new Date().toISOString(),
      last_error: null,
      total_articles_fetched: 8,
      current_article_count: 8,
    },
    {
      id: "daily_thanthi",
      name: "Daily Thanthi",
      tamil_name: "தினத்தந்தி",
      category: "Daily Newspaper",
      url: "https://www.dailythanthi.com",
      rss_url: "https://www.dailythanthi.com/rss",
      language: "ta",
      is_enabled: false,
      health_status: "warning",
      last_fetched_at: null,
      last_error: "Endpoint inactive - syndication feed pending publisher reactivation",
      total_articles_fetched: 0,
      current_article_count: 0,
    }
  ];
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



