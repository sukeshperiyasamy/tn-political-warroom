"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Radio,
  Share2,
  MessageSquare,
  ThumbsUp,
  Eye,
  ExternalLink,
  Flame,
  Globe,
  RefreshCw,
  Clock,
  Layers,
  Sparkles,
  BarChart2,
  FileText,
  Activity,
  SlidersHorizontal,
  ChevronRight,
  Info,
  Calendar,
  AlertCircle,
  Play,
  History,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ShieldAlert,
  Search,
  Printer,
  RotateCcw,
} from "lucide-react";
import {
  SocialPost,
  TrendingTopic,
  StoryCluster,
  ConnectorSummary,
  DemoScenario,
  ClusterTimelineResponse,
  TrendExplorerResponse,
  MethodologyPanel,
  ScenarioBriefResponse,
} from "@/types/political";
import {
  fetchSocialPosts,
  fetchTrendingPulse,
  fetchStoryClusters,
  fetchConnectors,
  triggerSocialIngestion,
  seedDemoSocialData,
  fetchTrendExplorer,
  fetchClusterTimeline,
  fetchMethodology,
  fetchDemoScenarios,
  replayDemoScenario,
  resetDemoScenario,
  fetchScenarioBrief,
} from "@/lib/api";

interface SocialDiscoveryLabProps {
  mode: "live" | "demo";
  onModeToggle?: (mode: "live" | "demo") => void;
}

export function SocialDiscoveryLab({ mode, onModeToggle }: SocialDiscoveryLabProps) {
  const [timeWindow, setTimeWindow] = useState<"1h" | "24h" | "7d" | "30d">("24h");
  const [rankingType, setRankingType] = useState<string>("trending");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [selectedParty, setSelectedParty] = useState<string>("all");
  const [selectedLeader, setSelectedLeader] = useState<string>("all");
  const [selectedTopic, setSelectedTopic] = useState<string>("all");

  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [clusters, setClusters] = useState<StoryCluster[]>([]);
  const [connectors, setConnectors] = useState<ConnectorSummary[]>([]);
  const [scenarios, setScenarios] = useState<DemoScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<DemoScenario | null>(null);
  const [scenarioStep, setScenarioStep] = useState<number>(1);
  const [explorerData, setExplorerData] = useState<TrendExplorerResponse | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Modals
  const [showMethodologyModal, setShowMethodologyModal] = useState<boolean>(false);
  const [methodologyData, setMethodologyData] = useState<MethodologyPanel | null>(null);
  const [activeTimeline, setActiveTimeline] = useState<ClusterTimelineResponse | null>(null);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState<boolean>(false);
  const [showBriefModal, setShowBriefModal] = useState<boolean>(false);
  const [scenarioBrief, setScenarioBrief] = useState<ScenarioBriefResponse | null>(null);
  const [isLoadingBrief, setIsLoadingBrief] = useState<boolean>(false);
  const [isResettingScenario, setIsResettingScenario] = useState<boolean>(false);

  useEffect(() => {
    loadLabData();
  }, [mode, timeWindow, rankingType, selectedPlatform, selectedParty, selectedLeader, selectedTopic]);

  async function loadLabData() {
    setIsLoading(true);
    try {
      const modeParam = mode;
      const [postsRes, pulseRes, clustersRes, connRes, scenariosRes, explorerRes] = await Promise.all([
        fetchSocialPosts({
          platform: selectedPlatform,
          party: selectedParty,
          leader: selectedLeader,
          topic: selectedTopic,
          mode: modeParam,
          sort: rankingType,
          limit: 30
        }),
        fetchTrendingPulse(timeWindow, modeParam, 8),
        fetchStoryClusters(10, modeParam),
        fetchConnectors(),
        fetchDemoScenarios(),
        fetchTrendExplorer({
          party: selectedParty,
          leader: selectedLeader,
          topic: selectedTopic,
          platform: selectedPlatform,
          timeWindow: timeWindow,
          mode: modeParam
        })
      ]);

      setPosts(postsRes.posts || []);
      setTrendingTopics(pulseRes.trending_topics || []);
      setClusters(clustersRes.clusters || []);
      setConnectors(connRes || []);
      setScenarios(scenariosRes.scenarios || []);
      if (scenariosRes.scenarios && scenariosRes.scenarios.length > 0 && !selectedScenario) {
        setSelectedScenario(scenariosRes.scenarios[0]);
      }
      setExplorerData(explorerRes);
    } catch (err) {
      console.error("Failed to load Social Discovery Lab data:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRefreshIngestion() {
    setIsRefreshing(true);
    try {
      await triggerSocialIngestion();
      setNotification("Live discovery sync completed. Updated telemetry recorded.");
      await loadLabData();
    } catch (err: any) {
      setNotification(`Sync error: ${err.message}`);
    } finally {
      setIsRefreshing(false);
      setTimeout(() => setNotification(null), 4000);
    }
  }

  async function handleReplayScenario(stepToRun: number) {
    if (!selectedScenario) return;
    setIsReplaying(true);
    try {
      const res = await replayDemoScenario(selectedScenario.id, stepToRun);
      setScenarioStep(stepToRun);
      setNotification(`Replayed Step ${stepToRun}: ${res.step_title}`);
      await loadLabData();
    } catch (err: any) {
      setNotification(`Replay error: ${err.message}`);
    } finally {
      setIsReplaying(false);
      setTimeout(() => setNotification(null), 4000);
    }
  }

  async function handleResetScenario() {
    if (!selectedScenario) return;
    setIsResettingScenario(true);
    try {
      await resetDemoScenario(selectedScenario.id);
      setScenarioStep(1);
      setNotification(`✓ Scenario "${selectedScenario.name}" reset to Step 1. Simulated posts refreshed.`);
      await loadLabData();
    } catch (err: any) {
      setNotification(`Reset error: ${err.message}`);
    } finally {
      setIsResettingScenario(false);
      setTimeout(() => setNotification(null), 4000);
    }
  }

  async function handleOpenScenarioBrief() {
    if (!selectedScenario) return;
    setIsLoadingBrief(true);
    try {
      const brief = await fetchScenarioBrief(selectedScenario.id);
      setScenarioBrief(brief);
      setShowBriefModal(true);
    } catch (err: any) {
      setNotification(`Brief synthesis error: ${err.message}`);
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setIsLoadingBrief(false);
    }
  }

  async function handleOpenTimeline(clusterId: string) {
    setIsLoadingTimeline(true);
    try {
      const res = await fetchClusterTimeline(clusterId);
      setActiveTimeline(res);
    } catch (err) {
      console.error("Failed to load timeline:", err);
    } finally {
      setIsLoadingTimeline(false);
    }
  }

  async function handleOpenMethodology() {
    try {
      const res = await fetchMethodology();
      setMethodologyData(res);
      setShowMethodologyModal(true);
    } catch (err) {
      console.error("Failed to load methodology:", err);
    }
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "youtube":
        return (
          <svg className="w-3.5 h-3.5 text-red-600 inline-block" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
        );
      case "x":
      case "twitter":
        return (
          <svg className="w-3.5 h-3.5 text-zinc-900 inline-block" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        );
      case "instagram":
        return (
          <svg className="w-3.5 h-3.5 text-pink-600 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
            <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
          </svg>
        );
      case "facebook":
        return (
          <svg className="w-3.5 h-3.5 text-blue-600 inline-block" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        );
      case "reddit":
        return <MessageSquare className="w-3.5 h-3.5 text-orange-600 inline-block" />;
      case "google_trends":
        return <TrendingUp className="w-3.5 h-3.5 text-emerald-600 inline-block" />;
      default:
        return <Globe className="w-3.5 h-3.5 text-zinc-600 inline-block" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "HEALTHY":
      case "LIVE":
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> LIVE</span>;
      case "DEMO":
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200"><Sparkles className="w-2.5 h-2.5 text-purple-600" /> DEMO</span>;
      case "NOT_CONFIGURED":
      case "AUTH_REQUIRED":
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-50 text-amber-700 border border-amber-200"><AlertCircle className="w-2.5 h-2.5 text-amber-600" /> AUTH REQ</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Editorial Masthead & Navigation Bar */}
      <section className="bg-white border border-[#E8E8E2] rounded-xl p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-zinc-100 text-zinc-800 border border-zinc-300">
                Phase 4 Intelligence
              </span>
              {mode === "live" ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  LIVE MEDIA MONITORING
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-50 text-purple-800 border border-purple-300">
                  <Sparkles className="w-3 h-3 text-purple-600" />
                  DEMO SCENARIO LAB
                </span>
              )}
            </div>
            <h1 className="text-2xl font-serif font-bold text-zinc-900 tracking-tight">
              Social Media Discovery & Trending Intelligence Lab
            </h1>
            <p className="text-xs text-zinc-600 font-tamil mt-0.5">
              தமிழ்நாடு அரசியல் பொது ஊடகப் போக்குகள் & கதைப்பரவல் ஆய்வுக்கூடம்
            </p>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Time Window Buttons */}
            <div className="flex items-center bg-[#F4F4F0] p-0.5 rounded-lg border border-[#E4E4DE]">
              {(["1h", "24h", "7d", "30d"] as const).map((w) => (
                <button
                  key={w}
                  onClick={() => setTimeWindow(w)}
                  className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-md transition-all cursor-pointer ${
                    timeWindow === w
                      ? "bg-white text-zinc-900 shadow-2xs border border-zinc-200"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  {w.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Ingestion & Refresh Trigger */}
            <button
              onClick={handleRefreshIngestion}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-medium transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "Syncing..." : "Sync Live Wire"}</span>
            </button>

            {/* Methodology Modal Trigger */}
            <button
              onClick={handleOpenMethodology}
              className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-zinc-50 text-zinc-700 border border-[#D5D5CE] rounded-lg text-xs font-medium transition-all shadow-2xs cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-zinc-500" />
              <span>Methodology</span>
            </button>
          </div>
        </div>

        {notification && (
          <div className="mt-3 p-2.5 rounded-lg bg-zinc-900 text-white text-xs flex items-center justify-between animate-fadeIn">
            <span>{notification}</span>
            <button onClick={() => setNotification(null)} className="text-zinc-400 hover:text-white text-xs cursor-pointer">Dismiss</button>
          </div>
        )}
      </section>

      {/* SECTION A: Compact Source Health Strip */}
      <section className="bg-white border border-[#E8E8E2] rounded-xl p-4 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-700 font-mono">
              Source Discovery Connectors (7 Sources)
            </h2>
          </div>
          <span className="text-[11px] text-zinc-500 font-mono">
            Bounded Poll & Quota Meter
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {connectors.map((c) => (
            <div
              key={c.platform}
              className="p-2.5 rounded-lg border border-[#EBEBE6] bg-[#FAFAF8] flex flex-col justify-between hover:border-zinc-300 transition-all"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  {getPlatformIcon(c.platform)}
                  <span className="text-xs font-semibold text-zinc-900 capitalize truncate max-w-[70px]">
                    {c.platform === "google_trends" ? "G-Trends" : c.platform}
                  </span>
                </div>
                {getStatusBadge(c.status)}
              </div>
              <div className="text-[10px] text-zinc-500 font-mono truncate">
                {c.last_successful_fetch ? (
                  <span>Checked {new Date(c.last_successful_fetch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                ) : (
                  <span>Awaiting keys</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION B: Interactive Political Demo Scenario Lab */}
      <section className="bg-gradient-to-br from-purple-50/50 via-white to-amber-50/30 border border-purple-200/80 rounded-xl p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-3 border-b border-purple-100">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-700" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-purple-900 font-mono">
                Interactive Political Scenario Simulation Lab
              </h2>
              <span className="px-2 py-0.2 rounded text-[10px] font-mono font-bold bg-purple-100 text-purple-800 border border-purple-200">
                4 SCENARIOS
              </span>
            </div>
            <p className="text-xs text-zinc-600 mt-1">
              Select a scenario to simulate how political narratives emerge on news sites, explode on video platforms, or decelerate following government responses.
            </p>
          </div>

          {selectedScenario && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-medium text-purple-900 bg-purple-100/70 px-2 py-1 rounded">
                Stage {scenarioStep} of {selectedScenario.total_steps}
              </span>
              <button
                type="button"
                onClick={handleResetScenario}
                disabled={isResettingScenario || isReplaying}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-zinc-100 text-zinc-700 border border-purple-200 rounded-lg text-xs font-medium transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                title="Reset scenario to step 1 (deletes only demo posts, safe for live data)"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isResettingScenario ? "animate-spin text-purple-600" : "text-zinc-500"}`} />
                <span>{isResettingScenario ? "Resetting..." : "Reset Scenario"}</span>
              </button>
              <button
                type="button"
                onClick={handleOpenScenarioBrief}
                disabled={isLoadingBrief}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-purple-50 text-purple-900 border border-purple-300 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                title="Synthesize printable intelligence brief for this scenario stage"
              >
                <FileText className={`w-3.5 h-3.5 ${isLoadingBrief ? "animate-spin text-purple-700" : "text-purple-700"}`} />
                <span>{isLoadingBrief ? "Synthesizing..." : "Scenario Brief"}</span>
              </button>
              <button
                type="button"
                onClick={() => handleReplayScenario(scenarioStep >= selectedScenario.total_steps ? 1 : scenarioStep + 1)}
                disabled={isReplaying}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <Play className={`w-3.5 h-3.5 ${isReplaying ? "animate-spin" : ""}`} />
                <span>{isReplaying ? "Simulating..." : scenarioStep >= selectedScenario.total_steps ? "Restart Scenario" : "Advance Stage"}</span>
              </button>
            </div>
          )}
        </div>

        {/* Scenario Selection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {scenarios.map((sc) => {
            const isSelected = selectedScenario?.id === sc.id;
            return (
              <div
                key={sc.id}
                onClick={() => {
                  setSelectedScenario(sc);
                  setScenarioStep(sc.current_step || 1);
                }}
                className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                  isSelected
                    ? "bg-white border-purple-600 ring-2 ring-purple-600/20 shadow-xs"
                    : "bg-white/80 border-[#E8E8E2] hover:border-purple-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-purple-100/70 text-purple-800">
                    {sc.scenario_type.replace("_", " ")}
                  </span>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-purple-600" />}
                </div>
                <h3 className="text-xs font-bold text-zinc-900 line-clamp-1 mb-1">
                  {sc.name}
                </h3>
                <p className="text-[11px] text-zinc-500 line-clamp-2">
                  {sc.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Active Scenario Step Progression Visualizer */}
        {selectedScenario && (
          <div className="bg-white border border-purple-200/60 rounded-lg p-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              {selectedScenario.steps_meta.map((st) => {
                const isCurrent = scenarioStep === st.step;
                const isPassed = scenarioStep > st.step;
                return (
                  <div
                    key={st.step}
                    onClick={() => handleReplayScenario(st.step)}
                    className={`p-2.5 rounded-md border text-left cursor-pointer transition-all ${
                      isCurrent
                        ? "bg-purple-50/70 border-purple-500 ring-1 ring-purple-400"
                        : isPassed
                        ? "bg-zinc-50 border-emerald-300 text-zinc-700"
                        : "bg-white border-zinc-200 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono font-bold text-zinc-500">
                        STAGE {st.step}
                      </span>
                      {isPassed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : isCurrent ? (
                        <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping" />
                      ) : null}
                    </div>
                    <div className="text-xs font-bold text-zinc-900 truncate mb-0.5">
                      {st.title}
                    </div>
                    <p className="text-[10px] text-zinc-500 line-clamp-2 leading-tight">
                      {st.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* SECTION C: Ranked Political Pulse & Momentum */}
      <section className="bg-white border border-[#E8E8E2] rounded-xl p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#F0F0EB]">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-800 font-mono">
                Trending Political Issues & Topic Momentum
              </h2>
            </div>
            <p className="text-xs text-zinc-500 font-tamil mt-0.5">
              நிகழ்நேர அரசியல் போக்குகள் & செய்தி ஊடக விவாதங்கள்
            </p>
          </div>

          {/* Ranking Type Dimension Selector */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-zinc-500 font-mono mr-1">Rank By:</span>
            {[
              { id: "trending", label: "Composite Momentum" },
              { id: "fastest_growing", label: "Fastest Growing" },
              { id: "most_discussed", label: "Most Discussed" },
              { id: "most_liked", label: "Most Liked" },
              { id: "most_shared", label: "Most Shared" },
              { id: "most_cross_platform", label: "Cross-Platform" },
              { id: "recent", label: "Latest" }
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setRankingType(r.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  rankingType === r.id
                    ? "bg-zinc-900 text-white shadow-2xs font-bold"
                    : "bg-[#F4F4F0] text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Trending Topic Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {trendingTopics.map((top, idx) => (
            <div
              key={top.topic}
              className="p-3.5 rounded-lg border border-[#EBEBE6] bg-[#FAFAF8] flex flex-col justify-between hover:border-zinc-400 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono font-bold text-zinc-400">
                    #{idx + 1} RANK
                  </span>
                  {top.momentum_state && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      top.momentum_state === "ACCELERATING"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : top.momentum_state === "EMERGING"
                        ? "bg-purple-50 text-purple-800 border border-purple-200"
                        : top.momentum_state === "DECELERATING"
                        ? "bg-rose-50 text-rose-800 border border-rose-200"
                        : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                    }`}>
                      {top.momentum_state}
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-zinc-900 line-clamp-1 mb-1">
                  {top.topic}
                </h3>

                <div className="flex flex-wrap gap-1 mb-2">
                  {top.related_parties?.map((p) => (
                    <span key={p} className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-white border border-zinc-200 text-zinc-700">
                      {p}
                    </span>
                  ))}
                  {top.related_leaders?.slice(0, 1).map((l) => (
                    <span key={l} className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-zinc-100 text-zinc-700">
                      {l}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-[#E8E8E2] flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 font-mono text-zinc-600">
                  <Flame className="w-3.5 h-3.5 text-amber-600" />
                  <span className="font-bold text-zinc-900">{top.trend_score}</span>
                  <span className="text-[10px] text-zinc-400">score</span>
                </div>
                <div className="flex items-center gap-1">
                  {top.platforms?.slice(0, 4).map((plat) => (
                    <span key={plat} title={plat}>{getPlatformIcon(plat)}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION D: Cross-Media Narrative Clusters & Timeline */}
      <section className="bg-white border border-[#E8E8E2] rounded-xl p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F0F0EB]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-800 font-mono">
              Cross-Media Narrative Clusters & Timeline
            </h2>
          </div>
          <span className="text-xs text-zinc-500 font-mono">
            {clusters.length} Active Cross-Source Stories
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {clusters.map((c) => (
            <div
              key={c.id}
              className="p-4 rounded-lg border border-[#E8E8E2] bg-[#FCFCFA] flex flex-col justify-between hover:border-zinc-400 transition-all shadow-2xs"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    {c.platforms_involved?.map((p) => (
                      <span key={p} title={p}>{getPlatformIcon(p)}</span>
                    ))}
                  </div>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                    {c.platforms_involved?.length} Sources ({c.post_ids?.length || 0} items)
                  </span>
                </div>

                <h3 className="text-sm font-bold font-serif text-zinc-900 mb-1 leading-snug line-clamp-2">
                  {c.title_en}
                </h3>
                <p className="text-xs font-tamil text-zinc-600 line-clamp-2 mb-3">
                  {c.title_ta}
                </p>
              </div>

              <div className="pt-2.5 border-t border-[#EAEAE4] flex items-center justify-between">
                <div className="text-[11px] font-mono text-zinc-500">
                  Lag: <span className="font-bold text-zinc-700">{c.time_lag_minutes}m</span>
                </div>
                <button
                  onClick={() => handleOpenTimeline(c.id)}
                  className="flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900 cursor-pointer"
                >
                  <span>Progression Timeline</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION E: Filterable Popular Posts Feed */}
      <section className="bg-white border border-[#E8E8E2] rounded-xl p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#F0F0EB]">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-800 font-mono">
              Public Political Posts Stream ({posts.length} Items)
            </h2>
            <p className="text-xs text-zinc-500 font-tamil mt-0.5">
              சமூக வலைத்தள பதிவுகள் & பொது எதிர்வினைகள்
            </p>
          </div>

          {/* Platform Filters */}
          <div className="flex flex-wrap items-center gap-1">
            {["all", "youtube", "x", "instagram", "facebook", "reddit", "news", "google_trends"].map((plat) => (
              <button
                key={plat}
                onClick={() => setSelectedPlatform(plat)}
                className={`px-2 py-1 text-xs font-mono font-semibold rounded-md capitalize transition-all cursor-pointer ${
                  selectedPlatform === plat
                    ? "bg-zinc-900 text-white shadow-2xs"
                    : "bg-[#F4F4F0] text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60"
                }`}
              >
                {plat === "all" ? "All Platforms" : plat === "google_trends" ? "G-Trends" : plat}
              </button>
            ))}
          </div>
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {posts.map((post) => (
            <div
              key={post.id}
              className="p-4 rounded-lg border border-[#E8E8E2] bg-white flex flex-col justify-between hover:border-zinc-400 hover:shadow-xs transition-all"
            >
              <div>
                {/* Card Header: Platform, Author, Mode & Percentile */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    {getPlatformIcon(post.platform)}
                    <span className="text-xs font-bold text-zinc-900 truncate max-w-[130px]">
                      {post.author_name || post.author_handle}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {post.platform_percentile !== undefined && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        Top {100 - Math.floor(post.platform_percentile)}%
                      </span>
                    )}
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                      post.collection_mode === "LIVE" ? "bg-emerald-50 text-emerald-700" : "bg-purple-50 text-purple-700"
                    }`}>
                      {post.collection_mode}
                    </span>
                  </div>
                </div>

                {/* Content */}
                {post.title && (
                  <h4 className="text-xs font-bold text-zinc-900 line-clamp-2 mb-1">
                    {post.title}
                  </h4>
                )}
                <p className="text-xs text-zinc-700 font-tamil leading-relaxed line-clamp-3 mb-2.5">
                  {post.content}
                </p>

                {/* Matched Entities Pills */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {post.party_codes?.map((p) => (
                    <span key={p} className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-zinc-100 text-zinc-800 border border-zinc-200">
                      {p}
                    </span>
                  ))}
                  {post.leader_names?.slice(0, 1).map((l) => (
                    <span key={l} className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-zinc-50 text-zinc-700 border border-zinc-200">
                      {l}
                    </span>
                  ))}
                  {post.topics?.slice(0, 1).map((t) => (
                    <span key={t} className="px-1.5 py-0.2 rounded text-[10px] bg-blue-50 text-blue-800 border border-blue-200 truncate max-w-[150px]">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Footer: Metrics & Links */}
              <div className="pt-2.5 border-t border-[#F0F0EB] flex items-center justify-between text-xs text-zinc-500 font-mono">
                <div className="flex items-center gap-2.5">
                  {post.views_count !== null && post.views_count !== undefined && (
                    <span className="flex items-center gap-1" title="Views">
                      <Eye className="w-3 h-3 text-zinc-400" />
                      <span>{post.views_count >= 1000 ? `${(post.views_count / 1000).toFixed(1)}k` : post.views_count}</span>
                    </span>
                  )}
                  {post.likes_count !== null && post.likes_count !== undefined && (
                    <span className="flex items-center gap-1" title="Likes">
                      <ThumbsUp className="w-3 h-3 text-zinc-400" />
                      <span>{post.likes_count >= 1000 ? `${(post.likes_count / 1000).toFixed(1)}k` : post.likes_count}</span>
                    </span>
                  )}
                  {post.comments_count !== null && post.comments_count !== undefined && (
                    <span className="flex items-center gap-1" title="Comments">
                      <MessageSquare className="w-3 h-3 text-zinc-400" />
                      <span>{post.comments_count}</span>
                    </span>
                  )}
                </div>

                <a
                  href={post.canonical_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-zinc-600 hover:text-zinc-900 transition-colors"
                >
                  <span className="text-[11px]">Source</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* MODAL 1: Narrative Progression Timeline Modal */}
      {activeTimeline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4 animate-fadeIn">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-zinc-300 shadow-xl">
            <div className="p-4 border-b border-[#E8E8E2] flex items-center justify-between bg-[#FAFAF8]">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Narrative Propagation Timeline
                </span>
                <h3 className="text-base font-bold font-serif text-zinc-900 mt-1">
                  {activeTimeline.cluster.title_en}
                </h3>
              </div>
              <button
                onClick={() => setActiveTimeline(null)}
                className="text-zinc-400 hover:text-zinc-700 font-bold text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-500 bg-zinc-50 p-2.5 rounded-lg border border-zinc-200">
                <span>Total Sources: <strong>{activeTimeline.platforms_count} platforms</strong></span>
                <span>Propagation Lag: <strong>{activeTimeline.propagation_lag_minutes} minutes</strong></span>
                <span>Confidence: <strong>{activeTimeline.confidence_score * 100}%</strong></span>
              </div>

              <div className="relative border-l-2 border-zinc-200 pl-4 space-y-4 ml-2">
                {activeTimeline.timeline.map((node, i) => (
                  <div key={node.id} className="relative">
                    <span className="absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full bg-white border-2 border-zinc-700 flex items-center justify-center" />
                    <div className="bg-[#FAFAF8] p-3 rounded-lg border border-zinc-200">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          {getPlatformIcon(node.platform)}
                          <span className="text-xs font-bold text-zinc-800 capitalize">
                            {node.author || node.publisher || node.platform}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400">
                          +{node.time_lag_mins}m lag
                        </span>
                      </div>
                      <p className="text-xs text-zinc-700 font-tamil line-clamp-2">
                        {node.title || node.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 border-t border-[#E8E8E2] bg-[#FAFAF8] text-right">
              <button
                onClick={() => setActiveTimeline(null)}
                className="px-4 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-medium cursor-pointer"
              >
                Close Timeline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Transparent Methodology & Electorate Disclaimer Modal */}
      {showMethodologyModal && methodologyData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4 animate-fadeIn">
          <div className="bg-white rounded-xl max-w-xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-zinc-300 shadow-xl">
            <div className="p-4 border-b border-[#E8E8E2] flex items-center justify-between bg-[#FAFAF8]">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-zinc-500">
                  Data Science & Ranking Architecture
                </span>
                <h3 className="text-base font-bold text-zinc-900">
                  Trending Intelligence Methodology
                </h3>
              </div>
              <button
                onClick={() => setShowMethodologyModal(false)}
                className="text-zinc-400 hover:text-zinc-700 font-bold text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs leading-relaxed text-zinc-700">
              {/* Electorate Disclaimer Alert */}
              <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <ShieldAlert className="w-4 h-4 text-amber-700" />
                  <span>Important Analytics Disclaimer</span>
                </div>
                <p>{methodologyData.disclaimer}</p>
              </div>

              <div>
                <h4 className="font-bold text-zinc-900 uppercase tracking-wide font-mono mb-1">
                  Platform Normalization Strategy
                </h4>
                <p>{methodologyData.normalization_strategy}</p>
              </div>

              <div>
                <h4 className="font-bold text-zinc-900 uppercase tracking-wide font-mono mb-1">
                  Ranking Formulas
                </h4>
                <div className="space-y-1.5 font-mono text-[11px] bg-zinc-50 p-3 rounded-lg border border-zinc-200">
                  {Object.entries(methodologyData.rankings).map(([k, v]) => (
                    <div key={k}>
                      <span className="font-bold text-zinc-900 uppercase">{k}:</span> {v}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-zinc-900 uppercase tracking-wide font-mono mb-1">
                  Observation History & Recency
                </h4>
                <p>{methodologyData.confidence_rules?.sufficient_history}</p>
                <code className="block mt-1 p-2 rounded bg-zinc-100 font-mono text-[11px]">
                  {methodologyData.confidence_rules?.recency_formula}
                </code>
              </div>
            </div>

            <div className="p-3 border-t border-[#E8E8E2] bg-[#FAFAF8] text-right">
              <button
                onClick={() => setShowMethodologyModal(false)}
                className="px-4 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-medium cursor-pointer"
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Printable Scenario Intelligence Brief Modal */}
      {showBriefModal && scenarioBrief && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-3 sm:p-5 overflow-y-auto animate-fadeIn print:p-0 print:bg-white print:static">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col border border-zinc-300 shadow-2xl print:max-h-none print:border-none print:shadow-none">
            {/* Modal Actions Header */}
            <div className="p-4 border-b border-[#E8E8E2] flex items-center justify-between bg-[#FAFAF8] print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-700" />
                <span className="text-xs font-mono font-bold uppercase text-purple-900">
                  Scenario Intelligence Brief • Stage {scenarioBrief.current_stage}/{scenarioBrief.total_stages}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-zinc-700" />
                  <span>Print Brief</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowBriefModal(false)}
                  className="text-zinc-500 hover:text-zinc-800 font-bold text-sm px-2 py-1 rounded cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Brief Body */}
            <div className="p-6 sm:p-8 space-y-6 text-zinc-900 bg-white">
              {/* Document Header & Watermark */}
              <div className="border-b-2 border-zinc-900 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-purple-800 font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
                    <span>Tamil Nadu Strategic Intelligence Bureau • Special Briefing</span>
                  </div>
                  <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-300 self-start sm:self-auto">
                    {scenarioBrief.provenance}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-zinc-950">
                  {scenarioBrief.scenario_name}
                </h1>
                <p className="text-xs text-zinc-600 mt-1 font-mono">
                  Stage {scenarioBrief.current_stage} of {scenarioBrief.total_stages}: {scenarioBrief.stage_title}
                </p>
                <div className="mt-2 text-[11px] text-zinc-500 font-mono flex flex-wrap items-center gap-4">
                  <span>Generated: {new Date(scenarioBrief.generated_at).toLocaleString("en-IN")}</span>
                  <span>•</span>
                  <span>Reporting Period: {scenarioBrief.reporting_period}</span>
                </div>
              </div>

              {/* High-level Intelligence Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F9F9F7] border border-[#E8E8E2] rounded-lg p-3.5">
                <div>
                  <div className="text-[10px] font-mono uppercase text-zinc-500 font-bold">Policy Domain</div>
                  <div className="text-xs font-bold text-zinc-900 mt-0.5">{scenarioBrief.topic}</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase text-zinc-500 font-bold">Parties Involved</div>
                  <div className="text-xs font-bold text-zinc-900 mt-0.5">{scenarioBrief.parties_involved.join(", ")}</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase text-zinc-500 font-bold">Simulated Posts</div>
                  <div className="text-xs font-bold font-mono text-zinc-900 mt-0.5">{scenarioBrief.data_freshness.posts_count}</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase text-zinc-500 font-bold">Simulated Reach</div>
                  <div className="text-xs font-bold font-mono text-purple-900 mt-0.5">
                    {scenarioBrief.data_freshness.simulated_views.toLocaleString()} views
                  </div>
                </div>
              </div>

              {/* Executive Summary (English & Tamil) */}
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-white border border-[#E8E8E2] shadow-2xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 font-mono mb-2 flex items-center gap-1.5">
                    <span>Executive Intelligence Assessment</span>
                  </h3>
                  <p className="text-xs leading-relaxed text-zinc-800">
                    {scenarioBrief.executive_summary_en}
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-white border border-[#E8E8E2] shadow-2xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 font-mono mb-2 flex items-center gap-1.5">
                    <span className="font-tamil">செயல்முறை சுருக்கம் (தமிழ் வடிவம்)</span>
                  </h3>
                  <p className="text-xs leading-relaxed text-zinc-800 font-tamil">
                    {scenarioBrief.executive_summary_ta}
                  </p>
                </div>
              </div>

              {/* Key Developments in this Scenario Stage */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 font-mono flex items-center gap-1.5">
                  <span>Key Narrative Developments ({scenarioBrief.key_developments.length})</span>
                </h3>
                <div className="divide-y divide-[#F0F0EB] border border-[#E8E8E2] rounded-lg overflow-hidden bg-white text-xs">
                  {scenarioBrief.key_developments.map((dev, idx) => (
                    <div key={idx} className="p-3 hover:bg-[#FDFDFB]">
                      <div className="flex items-center justify-between text-[11px] mb-1 text-zinc-500">
                        <span className="font-bold text-zinc-900 capitalize">
                          {dev.platform} • {dev.author}
                        </span>
                        <span className="font-mono text-[10px]">{dev.published_at}</span>
                      </div>
                      <p className="font-tamil text-xs text-zinc-800">{dev.title || dev.content}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-zinc-500">
                        <span>{dev.likes || 0} likes</span>
                        <span>•</span>
                        <span>{dev.comments || 0} comments</span>
                        <span>•</span>
                        <span>{dev.shares || 0} shares</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Narrative Cluster Progression Snapshot */}
              {scenarioBrief.narrative_cluster && (
                <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[10px] uppercase text-zinc-600">
                      Cross-Platform Narrative Cluster
                    </span>
                    <span className="px-2 py-0.2 rounded text-[10px] font-mono font-bold uppercase bg-amber-100 text-amber-900">
                      {scenarioBrief.narrative_cluster.velocity_label || "Active"}
                    </span>
                  </div>
                  <div className="font-bold text-zinc-900">
                    {scenarioBrief.narrative_cluster.cluster_title}
                  </div>
                  <p className="text-[11px] text-zinc-600">
                    Velocity Score: {scenarioBrief.narrative_cluster.velocity_score} • Platforms Covered: {scenarioBrief.narrative_cluster.platforms_covered?.join(", ")}
                  </p>
                </div>
              )}

              {/* Mandatory Electorate Representation Disclaimer */}
              <div className="p-3.5 rounded-lg bg-amber-50/80 border border-amber-300 text-amber-950 text-xs">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <ShieldAlert className="w-4 h-4 text-amber-800" />
                  <span className="uppercase tracking-wider font-mono text-[11px]">Mandatory Analytics Disclaimer</span>
                </div>
                <p className="leading-relaxed text-[11px] text-amber-900">
                  {scenarioBrief.disclaimer}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-[#E8E8E2] bg-[#FAFAF8] flex items-center justify-between print:hidden">
              <span className="text-[11px] font-mono text-zinc-500">
                TN Political War Room — Client Demo Intelligence
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-medium cursor-pointer"
                >
                  Print / Export PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowBriefModal(false)}
                  className="px-3.5 py-1.5 bg-white border border-[#E2E2DC] text-zinc-700 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
