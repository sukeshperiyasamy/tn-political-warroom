"use client";

import React, { useState, useEffect } from "react";
import {
  Navbar,
} from "../components/Navbar";
import {
  MetricsOverview,
} from "../components/MetricsOverview";
import {
  FilterBar,
} from "../components/FilterBar";
import {
  ArticleCard,
} from "../components/ArticleCard";
import {
  ArticleIntelligenceDrawer,
} from "../components/ArticleIntelligenceDrawer";
import {
  PartyComparisonView,
} from "../components/PartyComparisonView";
import {
  NewsCardStudio,
} from "../components/NewsCardStudio";
import {
  SourceManagementView,
} from "../components/SourceManagementView";
import {
  IntelligenceBriefView,
} from "../components/IntelligenceBriefView";
import {
  NewsArticle,
  PoliticalParty,
  PoliticalLeader,
  CardTemplate,
  DashboardMetrics,
  FilterState,
  TamilVariation,
} from "../types/political";
import {
  fetchArticles,
  fetchMetrics,
  fetchParties,
  fetchLeaders,
  fetchTemplates,
  triggerIngest,
} from "../lib/api";
import {
  FileQuestion,
  RefreshCw,
  Sparkles,
  Radio,
  FlaskConical,
  ExternalLink,
} from "lucide-react";

export default function WarRoomDashboard() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "news" | "sources" | "comparison" | "studio" | "brief">("dashboard");
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    party: "",
    leader: "",
    sentiment: "",
    topic: "",
    source: "",
    dateRange: "",
    mode: "live",
  });

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [parties, setParties] = useState<PoliticalParty[]>([]);
  const [leaders, setLeaders] = useState<PoliticalLeader[]>([]);
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isQuickIngesting, setIsQuickIngesting] = useState<boolean>(false);

  // Drawer & Studio Active Item
  const [drawerArticle, setDrawerArticle] = useState<NewsArticle | null>(null);
  const [studioArticle, setStudioArticle] = useState<NewsArticle | null>(null);

  // Initial load
  useEffect(() => {
    Promise.all([fetchParties(), fetchLeaders(), fetchTemplates()]).then(
      ([pList, lList, tList]) => {
        setParties(pList);
        setLeaders(lList);
        setTemplates(tList);
      }
    );
  }, []);

  // Filter-dependent load
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([fetchArticles(filters), fetchMetrics(filters)]).then(
      ([arts, mets]) => {
        if (isMounted) {
          setArticles(arts);
          setMetrics(mets);
          setLoading(false);
          // Default studio article if none
          if (!studioArticle && arts.length > 0) {
            setStudioArticle(arts[0]);
          }
        }
      }
    );

    return () => {
      isMounted = false;
    };
  }, [filters]);

  const handleResetFilters = () => {
    setFilters((prev) => ({
      ...prev,
      search: "",
      party: "",
      leader: "",
      sentiment: "",
      topic: "",
      source: "",
      dateRange: "",
    }));
  };

  const handleModeToggle = (newMode: "live" | "demo") => {
    setFilters((prev) => ({ ...prev, mode: newMode }));
  };

  const handleSelectPartyFromMetrics = (partyCode: string) => {
    setFilters((prev) => ({ ...prev, party: prev.party === partyCode ? "" : partyCode }));
    setActiveTab("news");
  };

  const handleSelectLeaderFromMetrics = (leaderName: string) => {
    setFilters((prev) => ({ ...prev, leader: prev.leader === leaderName ? "" : leaderName }));
    setActiveTab("news");
  };

  const handleSelectTopicFromMetrics = (topic: string) => {
    setFilters((prev) => ({ ...prev, topic: prev.topic === topic ? "" : topic }));
    setActiveTab("news");
  };

  const handleOpenDrawer = (article: NewsArticle) => {
    setDrawerArticle(article);
  };

  const handleCreateCardFromArticle = (article: NewsArticle, chosenVariation?: TamilVariation) => {
    setStudioArticle(article);
    setDrawerArticle(null);
    setActiveTab("studio");
  };

  const handleTriggerQuickIngest = async () => {
    setIsQuickIngesting(true);
    try {
      await triggerIngest();
      // Reload current filter view
      const [arts, mets] = await Promise.all([fetchArticles(filters), fetchMetrics(filters)]);
      setArticles(arts);
      setMetrics(mets);
    } catch (err) {
      console.error("Quick ingest error:", err);
    } finally {
      setIsQuickIngesting(false);
    }
  };

  const isLive = (filters.mode || "live") === "live";

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-zinc-900 flex flex-col w-full overflow-x-hidden min-w-0">
      {/* Editorial Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchQuery={filters.search}
        onSearchChange={(q) => setFilters((prev) => ({ ...prev, search: q }))}
        articleCount={articles.length}
        mode={isLive ? "live" : "demo"}
        onModeToggle={handleModeToggle}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8">
        {/* Compact Editorial Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-[#E8E8E2]">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 font-serif">
                TN 2026 Assembly War Room Intelligence
              </h1>
              {isLive ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  Real Tamil Media Stream ({articles.length} reports)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
                  <FlaskConical className="w-3 h-3 text-zinc-500" />
                  Curated Demo Mode ({articles.length} reports)
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 font-tamil mt-1">
              {isLive
                ? "தமிழ்நாட்டு அரசியல் செய்திகள், கட்சி ஊடகப் பங்கீடு மற்றும் 1080p செய்தி அட்டை ஸ்டுடியோ"
                : "2026 தமிழ்நாடு சட்டமன்ற தேர்தல் காட்சி மாதிரி தரவுத்தொகுப்பு"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isLive && (
              <button
                onClick={handleTriggerQuickIngest}
                disabled={isQuickIngesting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-white hover:bg-[#F4F4F0] border border-[#E2E2DC] text-zinc-800 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                title="Poll registered RSS feeds for new stories"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isQuickIngesting ? "animate-spin text-zinc-600" : ""}`} />
                <span>{isQuickIngesting ? "Polling Feeds..." : "Poll Feeds"}</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab("studio")}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white shadow-2xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Card Studio</span>
            </button>
          </div>
        </div>

        {/* Global Filter Bar (Dashboard and News tabs) */}
        {(activeTab === "dashboard" || activeTab === "news") && (
          <FilterBar
            filters={filters}
            parties={parties}
            leaders={leaders}
            onFilterChange={setFilters}
            onReset={handleResetFilters}
            totalFilteredCount={articles.length}
          />
        )}

        {/* Tab 1: Overview Dashboard */}
        {activeTab === "dashboard" && (
          <>
            {metrics ? (
              <MetricsOverview
                metrics={metrics}
                onSelectParty={handleSelectPartyFromMetrics}
                onSelectLeader={handleSelectLeaderFromMetrics}
                onSelectTopic={handleSelectTopicFromMetrics}
              />
            ) : (
              <div className="p-16 text-center text-zinc-500 bg-white border border-[#E8E8E2] rounded-lg">
                <RefreshCw className="w-6 h-6 border-2 border-zinc-800 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span className="text-xs font-medium">Loading political intelligence...</span>
              </div>
            )}

            {/* Recent Key Reports Snippet */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#F0F0EB]">
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                  {isLive ? "Latest Wire Dispatches" : "Top Monitored Reports"} ({articles.length})
                </h2>
                <button
                  onClick={() => setActiveTab("news")}
                  className="text-xs text-zinc-600 hover:text-zinc-900 font-semibold cursor-pointer"
                >
                  View Full Wire →
                </button>
              </div>

              {articles.length === 0 ? (
                <div className="p-10 text-center bg-white border border-[#E8E8E2] rounded-lg">
                  <FileQuestion className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-zinc-700">No reports match your selected criteria.</p>
                  <button
                    onClick={handleResetFilters}
                    className="mt-2.5 px-3 py-1.5 rounded text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
                  {articles.slice(0, 8).map((art) => (
                    <ArticleCard
                      key={art.id}
                      article={art}
                      onOpenIntelligence={handleOpenDrawer}
                      onCreateCard={handleCreateCardFromArticle}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Tab 2: News Intelligence Feed */}
        {activeTab === "news" && (
          <div>
            {loading ? (
              <div className="p-16 text-center text-zinc-500 bg-white border border-[#E8E8E2] rounded-lg">
                <RefreshCw className="w-6 h-6 border-2 border-zinc-800 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs font-medium">Refreshing media wire...</p>
              </div>
            ) : articles.length === 0 ? (
              <div className="p-12 text-center bg-white border border-[#E8E8E2] rounded-lg space-y-3 max-w-xl mx-auto">
                <FileQuestion className="w-10 h-10 text-zinc-400 mx-auto" />
                <h3 className="text-sm font-bold text-zinc-800">No articles match your filter criteria</h3>
                <p className="text-xs text-zinc-500">
                  {isLive
                    ? "No live articles collected for this filter combination. Clear your filters or check the source registry."
                    : "Try clearing filters to display the demo scenario articles."}
                </p>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    onClick={handleResetFilters}
                    className="px-3.5 py-1.5 rounded text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    Reset All Filters
                  </button>
                  {isLive && (
                    <button
                      onClick={() => setActiveTab("sources")}
                      className="px-3.5 py-1.5 rounded text-xs font-semibold bg-[#F4F4F0] text-zinc-800 hover:bg-zinc-200 border border-[#E2E2DC] transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>Source Registry</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
                {articles.map((art) => (
                  <ArticleCard
                    key={art.id}
                    article={art}
                    onOpenIntelligence={handleOpenDrawer}
                    onCreateCard={handleCreateCardFromArticle}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Sources & Ingestion Hub */}
        {activeTab === "sources" && <SourceManagementView />}

        {/* Tab 4: Party & Leader Comparison */}
        {activeTab === "comparison" && (
          <PartyComparisonView
            parties={parties}
            leaders={leaders}
            onOpenArticle={handleOpenDrawer}
            onCreateCard={handleCreateCardFromArticle}
            mode={isLive ? "live" : "demo"}
          />
        )}

        {/* Tab 5: Political Intelligence Brief */}
        {activeTab === "brief" && <IntelligenceBriefView mode={isLive ? "live" : "demo"} />}

        {/* Tab 6: Tamil News Card Studio */}
        {activeTab === "studio" && (
          <NewsCardStudio
            article={studioArticle}
            parties={parties}
            templates={templates}
          />
        )}
      </main>

      {/* AI Intelligence Drawer Component */}
      <ArticleIntelligenceDrawer
        article={drawerArticle}
        onClose={() => setDrawerArticle(null)}
        onSelectForCard={handleCreateCardFromArticle}
      />

      {/* Editorial Footer */}
      <footer className="border-t border-[#E8E8E2] bg-white py-5 mt-12 text-xs text-zinc-500">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            <span className="font-mono text-zinc-700 font-medium">
              TN Political Media Intelligence Wire ({isLive ? "Live RSS Ingestion Active" : "Demo Mode"})
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-zinc-500">
            <span>News18 TN, Polimer News, BBC Tamil, The Hindu TN, OneIndia Tamil, Muthanmai</span>
            <span>•</span>
            <span className="font-mono">1080×1080 Social Studio Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
