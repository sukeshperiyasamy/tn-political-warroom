"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Flame,
  Radio,
  Share2,
  Heart,
  MessageSquare,
  Eye,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Layers,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  HelpCircle,
  Play,
  X as CloseIcon,
  Activity,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  SocialPost,
  TrendingTopic,
  StoryCluster,
  PlatformStat,
  ConnectorSummary,
  EngagementSnapshot,
} from "../types/political";
import {
  fetchSocialPosts,
  fetchSocialPostDetail,
  fetchTrendingPulse,
  fetchPlatformComparison,
  fetchStoryClusters,
  fetchTopHashtags,
  fetchConnectors,
  testConnector,
  triggerSocialIngestion,
  seedDemoSocialData,
} from "../lib/api";

interface SocialIntelligenceViewProps {
  mode: "live" | "demo";
}

// Custom clean SVG Platform Badges
export function PlatformBadge({ platform, size = "md" }: { platform: string; size?: "sm" | "md" | "lg" }) {
  const p = platform.toLowerCase();
  const sizeClasses = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : size === "lg" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]";

  if (p === "youtube") {
    return (
      <span className={`inline-flex items-center gap-1 font-semibold rounded bg-red-50 text-red-700 border border-red-200/80 ${sizeClasses}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
        YouTube
      </span>
    );
  } else if (p === "x" || p === "twitter") {
    return (
      <span className={`inline-flex items-center gap-1 font-semibold rounded bg-zinc-100 text-zinc-900 border border-zinc-300 ${sizeClasses}`}>
        <span className="font-mono font-black text-[10px]">𝕏</span>
        X
      </span>
    );
  } else if (p === "instagram") {
    return (
      <span className={`inline-flex items-center gap-1 font-semibold rounded bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200 ${sizeClasses}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-600"></span>
        Instagram
      </span>
    );
  } else if (p === "facebook") {
    return (
      <span className={`inline-flex items-center gap-1 font-semibold rounded bg-blue-50 text-blue-700 border border-blue-200 ${sizeClasses}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
        Facebook
      </span>
    );
  } else if (p === "reddit") {
    return (
      <span className={`inline-flex items-center gap-1 font-semibold rounded bg-amber-50 text-amber-800 border border-amber-200 ${sizeClasses}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
        Reddit
      </span>
    );
  } else if (p === "google_trends") {
    return (
      <span className={`inline-flex items-center gap-1 font-semibold rounded bg-emerald-50 text-emerald-800 border border-emerald-200 ${sizeClasses}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
        Google Trends
      </span>
    );
  } else {
    return (
      <span className={`inline-flex items-center gap-1 font-semibold rounded bg-slate-100 text-slate-800 border border-slate-200 ${sizeClasses}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
        News Wire
      </span>
    );
  }
}

export function SocialIntelligenceView({ mode }: SocialIntelligenceViewProps) {
  // Navigation / Filter States
  const [timeWindow, setTimeWindow] = useState<"1h" | "24h" | "7d" | "30d">("24h");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"trending" | "engagement" | "recent">("trending");
  const [activeSection, setActiveSection] = useState<"feed" | "clusters" | "matrix" | "connectors">("feed");

  // Data States
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [clusters, setClusters] = useState<StoryCluster[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStat[]>([]);
  const [hashtags, setHashtags] = useState<Array<{ tag: string; count: number; platforms: string[]; parties: string[] }>>([]);
  const [connectors, setConnectors] = useState<ConnectorSummary[]>([]);
  const [totalPostsCount, setTotalPostsCount] = useState<number>(0);

  // Loading & Action States
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isTestingConnector, setIsTestingConnector] = useState<string | null>(null);
  const [connectorTestResult, setConnectorTestResult] = useState<Record<string, any>>({});
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Modals
  const [selectedPostDetail, setSelectedPostDetail] = useState<SocialPost | null>(null);
  const [showMethodologyModal, setShowMethodologyModal] = useState<boolean>(false);
  const [expandedConnector, setExpandedConnector] = useState<string | null>(null);

  // Load Main Data
  const loadData = async () => {
    setLoading(true);
    try {
      const modeParam = mode; // Strict isolation: LIVE requests LIVE, DEMO requests DEMO
      const [pRes, tRes, cRes, mRes, hRes, connRes] = await Promise.all([
        fetchSocialPosts({
          platform: platformFilter,
          mode: modeParam,
          sort: sortOrder,
          limit: 30,
        }),
        fetchTrendingPulse(timeWindow, modeParam, 10),
        fetchStoryClusters(10, modeParam),
        fetchPlatformComparison(timeWindow, modeParam),
        fetchTopHashtags(12, modeParam),
        fetchConnectors(),
      ]);

      // Deduplicate posts defensively by ID and normalized platform+title to guarantee no duplicate alerts render
      const uniquePosts: SocialPost[] = [];
      const seenKeys = new Set<string>();
      for (const p of pRes.posts || []) {
        const titleKey = (p.title || "").trim().toLowerCase();
        const key = titleKey ? `${p.platform}_${titleKey}` : p.id;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          uniquePosts.push(p);
        }
      }
      setPosts(uniquePosts);
      setTotalPostsCount(uniquePosts.length);
      setTrendingTopics(tRes.trending_topics || []);
      setClusters(cRes.clusters || []);
      setPlatformStats(mRes.platforms || []);
      setHashtags(hRes.hashtags || []);
      setConnectors(connRes || []);
    } catch (err) {
      console.error("Failed to load social intelligence data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeWindow, platformFilter, sortOrder, mode]);

  // Trigger Connector Test
  const handleTestConnector = async (platform: string) => {
    setIsTestingConnector(platform);
    try {
      const res = await testConnector(platform);
      setConnectorTestResult((prev) => ({ ...prev, [platform]: res }));
      setActionMessage(`Test for ${platform.toUpperCase()}: ${res.status} (${res.message})`);
      // Refresh connectors summary
      const updated = await fetchConnectors();
      setConnectors(updated);
    } catch (err: any) {
      setConnectorTestResult((prev) => ({
        ...prev,
        [platform]: { status: "ERROR", message: err.message },
      }));
    } finally {
      setIsTestingConnector(null);
    }
  };

  // Trigger Ingestion Pass
  const handleRunIngestion = async () => {
    setIsRefreshing(true);
    setActionMessage("Executing multi-source ingestion pass across configured connectors...");
    try {
      const res = await triggerSocialIngestion();
      setActionMessage(`Ingestion pass finished: ${res.total_new_items} new items ingested.`);
      await loadData();
    } catch (err: any) {
      setActionMessage(`Ingestion failed: ${err.message}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Re-seed Demo Data
  const handleSeedDemoData = async () => {
    setIsRefreshing(true);
    try {
      await seedDemoSocialData();
      setActionMessage("Seeded realistic 2026 Tamil Nadu political social dataset with time-series snapshots.");
      await loadData();
    } catch (err: any) {
      setActionMessage(`Failed to seed demo data: ${err.message}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Open Post Detail Modal with Snapshots
  const handleOpenPostDetail = async (postId: string) => {
    try {
      const detail = await fetchSocialPostDetail(postId);
      setSelectedPostDetail(detail);
    } catch (err) {
      console.error("Failed to fetch post detail:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Live Telemetry Pulse */}
      <div className="bg-white border border-[#E8E8E2] rounded-lg p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8E8E2] pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-mono font-bold tracking-wider text-emerald-800 uppercase">
                Multi-Source Intelligence Wire
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200">
                Phase 3 Engine
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 mt-1">
              Social Media Trending & Political Pulse
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 font-tamil mt-1">
              யூடியூப், எக்ஸ், ரெட்டிட், இன்ஸ்டாகிராம் மற்றும் செய்தி ஊடகங்களின் 2026 தமிழ்நாடு அரசியல் போக்குகள்
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={() => setShowMethodologyModal(true)}
              className="px-3 py-1.5 rounded-md text-xs font-semibold bg-[#F4F4F0] text-zinc-800 hover:bg-zinc-200 border border-[#E2E2DC] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Info className="w-3.5 h-3.5 text-zinc-600" />
              <span>Methodology & Formula</span>
            </button>

            <button
              onClick={handleRunIngestion}
              disabled={isRefreshing}
              className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Sync Connectors</span>
            </button>

            <button
              onClick={handleSeedDemoData}
              disabled={isRefreshing}
              className="px-3 py-1.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer flex items-center gap-1.5"
              title="Reseed synthetic 2026 political scenarios with engagement history"
            >
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>Reset 2026 Demo Data</span>
            </button>
          </div>
        </div>

        {/* Action feedback toast */}
        {actionMessage && (
          <div className="mt-4 p-2.5 rounded bg-zinc-50 border border-zinc-200 text-xs text-zinc-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionMessage}</span>
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
            >
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 4 Telemetry Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-5">
          <div className="p-3.5 rounded-md bg-[#FBFBFA] border border-[#E8E8E2]">
            <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider flex items-center justify-between">
              <span>Tracked Platforms</span>
              <Layers className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-serif text-2xl font-bold text-zinc-900">
                {connectors.filter((c) => c.status === "HEALTHY" || c.status === "CONFIGURED").length} / {connectors.length || 7}
              </span>
              <span className="text-[11px] text-emerald-700 font-medium">Active</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5 truncate">YouTube, 𝕏, Reddit, IG, FB, News, Trends</p>
          </div>

          <div className="p-3.5 rounded-md bg-[#FBFBFA] border border-[#E8E8E2]">
            <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider flex items-center justify-between">
              <span>#1 Trending Issue</span>
              <Flame className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-serif text-lg font-bold text-zinc-900 truncate">
                {trendingTopics[0]?.topic || "TVK Vijay Movement"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs font-mono font-bold text-emerald-700">
                {trendingTopics[0]?.trend_score ? `${trendingTopics[0].trend_score}/100` : "88.4/100"}
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">
                ({trendingTopics[0]?.distinct_platforms_count || 4} platforms)
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-md bg-[#FBFBFA] border border-[#E8E8E2]">
            <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider flex items-center justify-between">
              <span>Indexed Posts</span>
              <Activity className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-serif text-2xl font-bold text-zinc-900">{totalPostsCount}</span>
              <span className="text-[11px] text-zinc-500 font-mono">records</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">With time-series velocity snapshots</p>
          </div>

          <div className="p-3.5 rounded-md bg-[#FBFBFA] border border-[#E8E8E2]">
            <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider flex items-center justify-between">
              <span>Story Clusters</span>
              <Radio className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-serif text-2xl font-bold text-zinc-900">{clusters.length}</span>
              <span className="text-[11px] text-blue-700 font-medium">Cross-Platform</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">Multi-source narrative propagation</p>
          </div>
        </div>
      </div>

      {/* 2. Navigation Tabs (Feed / Clusters / Matrix / Connectors) & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#E8E8E2] pb-3">
        {/* Section View Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveSection("feed")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              activeSection === "feed"
                ? "bg-zinc-900 text-white shadow-2xs"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
            }`}
          >
            Live Social Feed & Rankings
          </button>
          <button
            onClick={() => setActiveSection("clusters")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeSection === "clusters"
                ? "bg-zinc-900 text-white shadow-2xs"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-blue-500" />
            <span>Cross-Platform Narratives</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-zinc-200 text-zinc-800">
              {clusters.length}
            </span>
          </button>
          <button
            onClick={() => setActiveSection("matrix")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              activeSection === "matrix"
                ? "bg-zinc-900 text-white shadow-2xs"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
            }`}
          >
            Platform Comparison Matrix
          </button>
          <button
            onClick={() => setActiveSection("connectors")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeSection === "connectors"
                ? "bg-zinc-900 text-white shadow-2xs"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Connectors & Quotas</span>
          </button>
        </div>

        {/* Filter Controls (Time Window & Sort) */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Time Window Pills */}
          <div className="flex items-center bg-[#F4F4F0] p-0.5 rounded-md border border-[#E2E2DC]">
            {(["1h", "24h", "7d", "30d"] as const).map((tw) => (
              <button
                key={tw}
                onClick={() => setTimeWindow(tw)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all cursor-pointer ${
                  timeWindow === tw ? "bg-white text-zinc-900 shadow-2xs" : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                {tw.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="px-2.5 py-1 text-xs font-semibold bg-white border border-[#E8E8E2] rounded-md text-zinc-800 cursor-pointer"
          >
            <option value="trending">Sort: Trending Formula</option>
            <option value="engagement">Sort: Standardized Engagement</option>
            <option value="recent">Sort: Most Recent</option>
          </select>
        </div>
      </div>

      {/* 3. Main Body Sections */}

      {/* SECTION A: Social Feed & Trending Leaderboard */}
      {activeSection === "feed" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (4 cols): Trending Topics Leaderboard */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white border border-[#E8E8E2] rounded-lg p-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-[#E8E8E2] pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <h2 className="font-serif text-base font-bold text-zinc-900">Trending Now</h2>
                  {mode === "live" ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      LIVE
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      DEMO
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-mono text-zinc-500">Past {timeWindow}</span>
              </div>

              {loading ? (
                <div className="py-8 text-center text-xs text-zinc-500">Computing trending formula...</div>
              ) : trendingTopics.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-500">
                  <p className="font-medium text-zinc-700 mb-1">No relevant political trends currently available</p>
                  <p className="text-[11px] text-zinc-400">Trends require verified Tamil Nadu political entities or policy debates.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {trendingTopics.map((item, idx) => (
                    <div
                      key={item.topic}
                      className="p-3 rounded-md bg-[#FBFBFA] border border-[#E8E8E2] hover:border-zinc-300 transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-zinc-200 text-zinc-700 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-zinc-900 truncate">{item.topic}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-200/80 shrink-0">
                          {item.trend_score}/100
                        </span>
                      </div>

                      {/* Platforms involved & Momentum Badge */}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {item.momentum_state && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                            item.momentum_state === "ACCELERATING"
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : item.momentum_state === "EMERGING"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : item.momentum_state === "DECELERATING"
                              ? "bg-zinc-100 text-zinc-600 border border-zinc-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}>
                            {item.momentum_state}
                          </span>
                        )}
                        {item.platforms.map((plat) => (
                          <PlatformBadge key={plat} platform={plat} size="sm" />
                        ))}
                      </div>

                      {/* Sub-scores decomposition */}
                      <div className="grid grid-cols-4 gap-1 mt-2.5 pt-2 border-t border-[#EAEAE4] text-[10px] text-zinc-500 font-mono text-center">
                        <div>
                          <div className="text-[9px] text-zinc-400">Engage</div>
                          <div className="font-semibold text-zinc-700">{item.sub_scores.engagement_growth}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-zinc-400">Volume</div>
                          <div className="font-semibold text-zinc-700">{item.sub_scores.volume_growth}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-zinc-400">Cross</div>
                          <div className="font-semibold text-zinc-700">{item.sub_scores.cross_source}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-zinc-400">Recency</div>
                          <div className="font-semibold text-zinc-700">{item.sub_scores.recency}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Trending Hashtags Card */}
            <div className="bg-white border border-[#E8E8E2] rounded-lg p-4 shadow-2xs">
              <h3 className="font-serif text-sm font-bold text-zinc-900 mb-3 flex items-center gap-2">
                <span>Political Hashtags & Tags</span>
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {hashtags.map((h) => (
                  <span
                    key={h.tag}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-[#F4F4F0] text-zinc-800 border border-[#E2E2DC] hover:border-zinc-400 cursor-pointer"
                  >
                    <span>{h.tag}</span>
                    <span className="text-[10px] text-zinc-500 font-semibold">{h.count}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column (8 cols): Platform Filter Chips & Post Cards */}
          <div className="lg:col-span-8 space-y-4">
            {/* Platform Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
              {[
                { id: "all", label: "All Sources" },
                { id: "youtube", label: "YouTube" },
                { id: "x", label: "𝕏 (Twitter)" },
                { id: "reddit", label: "Reddit" },
                { id: "instagram", label: "Instagram" },
                { id: "facebook", label: "Facebook" },
                { id: "news", label: "News Wire" },
                { id: "google_trends", label: "Google Trends" },
              ].map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => setPlatformFilter(chip.id)}
                  className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                    platformFilter === chip.id
                      ? "bg-zinc-900 text-white font-semibold shadow-2xs"
                      : "bg-white text-zinc-700 border border-[#E8E8E2] hover:bg-zinc-50"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Posts Grid */}
            {loading ? (
              <div className="p-12 text-center text-xs text-zinc-500 bg-white border border-[#E8E8E2] rounded-lg">
                <RefreshCw className="w-5 h-5 border-2 border-zinc-800 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span>Loading normalized political streams...</span>
              </div>
            ) : posts.length === 0 ? (
              <div className="p-8 sm:p-12 text-center bg-white border border-[#E8E8E2] rounded-lg">
                <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-3">
                  <Activity className="w-6 h-6 text-zinc-400" />
                </div>
                <h3 className="font-serif text-base font-bold text-zinc-900 mb-1">
                  {platformFilter === "google_trends"
                    ? "No relevant political trends currently available"
                    : mode === "live"
                    ? "No Live Social Posts Matching Filter"
                    : "No Demo Posts Matching Filter"}
                </h3>
                <p className="text-xs text-zinc-500 max-w-md mx-auto mb-4">
                  {platformFilter === "google_trends"
                    ? "Google Trends regional search wire is filtered for verified Tamil Nadu political entities, electoral movements, and governance topics. Unrelated sports, lotteries, and general queries are excluded."
                    : mode === "live"
                    ? "Tamil News Wire is active. External social connectors (YouTube, 𝕏, Meta) require API credentials in backend/.env to stream live social posts."
                    : "Try selecting 'All Sources' or switching the active time window."}
                </p>
                {mode === "live" && (
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <button
                      onClick={handleRunIngestion}
                      className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 cursor-pointer transition-colors flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Sync News Wire Now</span>
                    </button>
                    <button
                      onClick={() => setActiveSection("connectors")}
                      className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-[#F4F4F0] text-zinc-800 hover:bg-zinc-200 border border-[#E2E2DC] cursor-pointer transition-colors flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Configure API Credentials</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="bg-white border border-[#E8E8E2] rounded-lg p-4 shadow-2xs flex flex-col justify-between hover:border-zinc-300 transition-all"
                  >
                    <div>
                      {/* Top Bar: Platform & Author */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <PlatformBadge platform={post.platform} size="sm" />
                          <span className="text-xs font-bold text-zinc-900 truncate">{post.author_name}</span>
                          <span className="text-[11px] text-zinc-400 font-mono truncate">{post.author_handle}</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                          {new Date(post.published_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      {/* Video Thumbnail (if present) */}
                      {post.thumbnail_url && (
                        <div className="relative mb-3 rounded overflow-hidden aspect-video bg-zinc-100 border border-[#E8E8E2]">
                          <img
                            src={post.thumbnail_url}
                            alt={post.title || "Social media preview"}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Hide broken image placeholder
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                          {post.media_type === "video" && (
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <span className="w-9 h-9 rounded-full bg-white/90 text-zinc-900 flex items-center justify-center shadow-md">
                                <Play className="w-4 h-4 fill-zinc-900 ml-0.5" />
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Title & Body */}
                      {post.title && (
                        <h4 className="text-xs font-bold text-zinc-900 mb-1 line-clamp-2 leading-snug">
                          {post.title}
                        </h4>
                      )}
                      <p className="text-xs text-zinc-600 line-clamp-3 leading-relaxed font-tamil">
                        {post.content}
                      </p>

                      {/* Entity Badges */}
                      <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                        {post.party_codes.map((p) => (
                          <span
                            key={p}
                            className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-zinc-100 text-zinc-800 border border-zinc-200"
                          >
                            {p}
                          </span>
                        ))}
                        {post.leader_names.map((l) => (
                          <span
                            key={l}
                            className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#F4F4F0] text-zinc-700 border border-[#E2E2DC]"
                          >
                            {l}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Metrics Bar */}
                    <div className="mt-4 pt-3 border-t border-[#E8E8E2] flex items-center justify-between text-xs text-zinc-500">
                      <div className="flex items-center gap-3">
                        {post.views_count !== null && post.views_count !== undefined && (
                          <span className="flex items-center gap-1 font-mono text-[11px]" title="Views">
                            <Eye className="w-3.5 h-3.5 text-zinc-400" />
                            {post.views_count.toLocaleString()}
                          </span>
                        )}
                        {post.likes_count !== null && post.likes_count !== undefined && (
                          <span className="flex items-center gap-1 font-mono text-[11px]" title="Likes / Upvotes">
                            <Heart className="w-3.5 h-3.5 text-zinc-400" />
                            {post.likes_count.toLocaleString()}
                          </span>
                        )}
                        {post.comments_count !== null && post.comments_count !== undefined && (
                          <span className="flex items-center gap-1 font-mono text-[11px]" title="Comments">
                            <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                            {post.comments_count.toLocaleString()}
                          </span>
                        )}
                        {post.shares_count !== null && post.shares_count !== undefined && (
                          <span className="flex items-center gap-1 font-mono text-[11px]" title="Shares / Reposts">
                            <Share2 className="w-3.5 h-3.5 text-zinc-400" />
                            {post.shares_count.toLocaleString()}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Velocity Pill */}
                        <button
                          onClick={() => handleOpenPostDetail(post.id)}
                          className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                          title="Click to view observation timeline & velocity snapshots"
                        >
                          {post.growth_rate_per_hour ? `+${Math.round(post.growth_rate_per_hour)}/hr` : "Velocity"}
                        </button>

                        <a
                          href={post.canonical_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
                          title="Open original post on platform"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION B: Cross-Platform Story Clusters */}
      {activeSection === "clusters" && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E8E8E2] rounded-lg p-5 shadow-2xs">
            <h2 className="font-serif text-lg font-bold text-zinc-900 mb-1">
              Cross-Platform Story Clusters & Narrative Echo
            </h2>
            <p className="text-xs text-zinc-500 mb-4 font-tamil">
              ஒரே அரசியல் நிகழ்வு செய்தி ஊடகங்கள், எக்ஸ் தளம், யூடியூப் விவாதங்களில் பரவிய காலவரிசை மற்றும் தாக்க ஆய்வு
            </p>

            <div className="space-y-4">
              {clusters.map((cluster) => (
                <div
                  key={cluster.id}
                  className="p-4 rounded-lg bg-[#FBFBFA] border border-[#E8E8E2] hover:border-zinc-300 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EAEAE4] pb-3 mb-3">
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200">
                        {cluster.topic}
                      </span>
                      <h3 className="font-serif text-base font-bold text-zinc-900 mt-1">{cluster.title_en}</h3>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-1 rounded text-xs font-mono font-bold bg-zinc-900 text-white shadow-2xs">
                        {cluster.total_engagement.toLocaleString()} Engagement Points
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-600">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono text-zinc-500">Cross-Platform Propagation:</span>
                      {cluster.platforms_involved.map((plat) => (
                        <PlatformBadge key={plat} platform={plat} size="sm" />
                      ))}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-500 shrink-0">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        First to Viral Reaction Lag: ~{cluster.time_lag_minutes} mins
                      </span>
                      <span>•</span>
                      <span>{cluster.post_ids.length} Linked Items</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION C: Platform Comparison Matrix */}
      {activeSection === "matrix" && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E8E8E2] rounded-lg p-5 shadow-2xs">
            <h2 className="font-serif text-lg font-bold text-zinc-900 mb-1">
              Platform Distribution & Party Share of Voice
            </h2>
            <p className="text-xs text-zinc-500 mb-4 font-tamil">
              சமூக ஊடகங்கள் vs வழக்கமான செய்தி ஊடகங்களில் அரசியல் கட்சிகளின் கவனப்பரவல் ஒப்பீடு
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E8E8E2] bg-[#F4F4F0] text-zinc-700 font-mono text-[11px]">
                    <th className="py-2.5 px-3">Platform</th>
                    <th className="py-2.5 px-3">Post Count</th>
                    <th className="py-2.5 px-3">Raw Views</th>
                    <th className="py-2.5 px-3">Likes / Upvotes</th>
                    <th className="py-2.5 px-3">Comments</th>
                    <th className="py-2.5 px-3">Shares / Reposts</th>
                    <th className="py-2.5 px-3">Normalized Engagement</th>
                    <th className="py-2.5 px-3">Top Party Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E8E2]">
                  {platformStats.map((stat) => (
                    <tr key={stat.platform} className="hover:bg-zinc-50/50">
                      <td className="py-3 px-3">
                        <PlatformBadge platform={stat.platform} size="sm" />
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-zinc-900">{stat.post_count}</td>
                      <td className="py-3 px-3 font-mono text-zinc-600">
                        {stat.total_raw_views > 0 ? stat.total_raw_views.toLocaleString() : "—"}
                      </td>
                      <td className="py-3 px-3 font-mono text-zinc-600">
                        {stat.total_raw_likes > 0 ? stat.total_raw_likes.toLocaleString() : "—"}
                      </td>
                      <td className="py-3 px-3 font-mono text-zinc-600">
                        {stat.total_raw_comments > 0 ? stat.total_raw_comments.toLocaleString() : "—"}
                      </td>
                      <td className="py-3 px-3 font-mono text-zinc-600">
                        {stat.total_raw_shares > 0 ? stat.total_raw_shares.toLocaleString() : "—"}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-800">
                        {stat.total_standardized_engagement.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 font-mono">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {Object.entries(stat.party_breakdown || {}).map(([pCode, pCount]) => (
                            <span key={pCode} className="px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-700 text-[10px]">
                              {pCode}: {pCount}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION D: Connectors & Quota Hub */}
      {activeSection === "connectors" && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E8E8E2] rounded-lg p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E8E2] pb-4 mb-4">
              <div>
                <h2 className="font-serif text-lg font-bold text-zinc-900">
                  Data Connectors & API Quota Hub
                </h2>
                <p className="text-xs text-zinc-500 font-tamil mt-0.5">
                  அனைத்து தளங்களின் இணைப்பு நிலை, API ஒதுக்கீடு மற்றும் நேரலை சோதனை மையம்
                </p>
              </div>
              <span className="text-xs font-mono text-zinc-500">Read-Only Analytics Engine</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {connectors.map((c) => (
                <div
                  key={c.platform}
                  className="p-4 rounded-lg bg-[#FBFBFA] border border-[#E8E8E2] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <PlatformBadge platform={c.platform} size="sm" />
                        <span className="text-xs font-bold text-zinc-900">{c.name}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          c.status === "HEALTHY" || c.status === "CONFIGURED"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : c.status === "NOT_CONFIGURED"
                            ? "bg-zinc-100 text-zinc-600 border border-zinc-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>

                    {/* Supported Metrics */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[11px] text-zinc-500 font-mono">
                      <span>Supported:</span>
                      {c.supported_metrics.map((m) => (
                        <span key={m} className="px-1.5 py-0.2 rounded bg-white border border-zinc-200 text-zinc-700">
                          {m}
                        </span>
                      ))}
                    </div>

                    {/* Quota Gauge */}
                    <div className="mt-3 p-2.5 rounded bg-white border border-[#E8E8E2] text-xs">
                      <div className="flex justify-between text-[11px] font-mono text-zinc-500 mb-1">
                        <span>API Quota Consumption</span>
                        <span>
                          {c.quota_used} / {c.quota_limit}
                        </span>
                      </div>
                      <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-zinc-900 h-full rounded-full"
                          style={{ width: `${Math.min(100, (c.quota_used / Math.max(1, c.quota_limit)) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Test result message if just tested */}
                    {connectorTestResult[c.platform] && (
                      <div className="mt-2 p-2 rounded bg-zinc-100 text-[11px] text-zinc-700 font-mono">
                        {connectorTestResult[c.platform].message || connectorTestResult[c.platform].status}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-[#E8E8E2] flex items-center justify-between">
                    <button
                      onClick={() => setExpandedConnector(expandedConnector === c.platform ? null : c.platform)}
                      className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Setup Guide</span>
                      {expandedConnector === c.platform ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      onClick={() => handleTestConnector(c.platform)}
                      disabled={isTestingConnector === c.platform}
                      className="px-3 py-1 rounded text-xs font-semibold bg-white border border-[#E8E8E2] hover:bg-zinc-50 text-zinc-800 transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isTestingConnector === c.platform ? "animate-spin" : ""}`} />
                      <span>Test Liveness</span>
                    </button>
                  </div>

                  {/* Accordion Setup Steps */}
                  {expandedConnector === c.platform && c.setup_instructions && (
                    <div className="mt-3 p-3 rounded bg-zinc-100/80 border border-zinc-200 text-xs text-zinc-700 space-y-2">
                      <div className="font-mono text-[11px] text-zinc-500 font-bold">
                        ENV: {c.setup_instructions.env_variable}
                      </div>
                      <div className="space-y-1 text-[11px]">
                        {c.setup_instructions.steps.map((step, i) => (
                          <div key={i}>{step}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Post Engagement Snapshot History */}
      {selectedPostDetail && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-300 rounded-lg max-w-xl w-full p-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E8E8E2] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <PlatformBadge platform={selectedPostDetail.platform} size="sm" />
                <h3 className="font-serif text-base font-bold text-zinc-900">
                  Engagement Velocity & Observation History
                </h3>
              </div>
              <button
                onClick={() => setSelectedPostDetail(null)}
                className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-xs text-zinc-600 font-medium">{selectedPostDetail.content}</div>

              <div className="p-3 rounded bg-[#FBFBFA] border border-[#E8E8E2] text-xs">
                <div className="font-mono text-zinc-500 text-[11px] uppercase">Trend Velocity Rating</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-serif text-xl font-bold text-emerald-800">
                    +{Math.round(selectedPostDetail.growth_rate_per_hour || 0)} / hour
                  </span>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    Score: {selectedPostDetail.trend_score}/100
                  </span>
                </div>
              </div>

              {/* Snapshot Timeline Table */}
              <div className="border border-[#E8E8E2] rounded overflow-hidden mt-3">
                <div className="bg-[#F4F4F0] px-3 py-2 text-[11px] font-mono text-zinc-700 font-bold border-b border-[#E8E8E2]">
                  Time-Series Observations ({selectedPostDetail.engagement_history?.length || 0} Snapshots)
                </div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E8E8E2] text-[10px] font-mono text-zinc-500 bg-zinc-50">
                      <th className="py-2 px-3">Timestamp</th>
                      <th className="py-2 px-3">Views</th>
                      <th className="py-2 px-3">Likes</th>
                      <th className="py-2 px-3">Comments</th>
                      <th className="py-2 px-3">Shares</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E8E2]">
                    {selectedPostDetail.engagement_history?.map((s, i) => (
                      <tr key={i} className="hover:bg-zinc-50/50">
                        <td className="py-2 px-3 font-mono text-[11px] text-zinc-600">
                          {new Date(s.observed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="py-2 px-3 font-mono text-zinc-800">{s.views ? s.views.toLocaleString() : "—"}</td>
                        <td className="py-2 px-3 font-mono text-zinc-800">{s.likes ? s.likes.toLocaleString() : "—"}</td>
                        <td className="py-2 px-3 font-mono text-zinc-800">{s.comments ? s.comments.toLocaleString() : "—"}</td>
                        <td className="py-2 px-3 font-mono text-zinc-800">{s.shares ? s.shares.toLocaleString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#E8E8E2] flex justify-end">
              <button
                onClick={() => setSelectedPostDetail(null)}
                className="px-4 py-1.5 rounded text-xs font-semibold bg-zinc-900 text-white cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Methodology Explainer */}
      {showMethodologyModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-300 rounded-lg max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E8E8E2] pb-3 mb-4">
              <h3 className="font-serif text-lg font-bold text-zinc-900">
                Transparent Trend Ranking Methodology
              </h3>
              <button
                onClick={() => setShowMethodologyModal(false)}
                className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-600 leading-relaxed">
              <p>
                To provide unbiased political intelligence and prevent sensationalized viral video outliers from
                distorting the statewide pulse, our trending algorithm combines 4 transparent parameters:
              </p>

              <div className="p-3 rounded bg-zinc-900 text-amber-300 font-mono text-[11px] border border-zinc-800 leading-normal">
                trend_score = 0.40 * engagement_growth + 0.30 * post_volume_growth + 0.20 * cross_source_presence + 0.10 * recency
              </div>

              <div className="space-y-2 pt-2">
                <div>
                  <span className="font-bold text-zinc-900">1. Engagement Growth (40%): </span>
                  Calculated from verified historical observation snapshots. Normalized so that high-intent actions (comments, shares) carry higher weights than passive views.
                </div>
                <div>
                  <span className="font-bold text-zinc-900">2. Post Volume Growth (30%): </span>
                  Compares active post count in the current window (1h, 24h, 7d, 30d) against the prior window.
                </div>
                <div>
                  <span className="font-bold text-zinc-900">3. Cross-Source Presence (20%): </span>
                  Measures whether an event is validated across multiple independent platforms (YouTube, X, Reddit, News). A story appearing on 4 platforms scores higher than a single-platform claim.
                </div>
                <div>
                  <span className="font-bold text-zinc-900">4. Recency (10%): </span>
                  Applies exponential decay over a 36-hour window so breaking developments naturally peak.
                </div>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-[#E8E8E2] flex justify-end">
              <button
                onClick={() => setShowMethodologyModal(false)}
                className="px-4 py-1.5 rounded text-xs font-semibold bg-zinc-900 text-white cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
