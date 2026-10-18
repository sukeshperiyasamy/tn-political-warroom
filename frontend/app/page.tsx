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
  Layers,
  FlaskConical,
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col w-full overflow-x-hidden min-w-0">
      {/* Top Navigation */}
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
      <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-7">
        {/* Sub-header Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-7 pb-5 border-b border-slate-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
              <span>TN 2026 Assembly War Room Intelligence</span>
              {isLive ? (
                <span className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-300 font-mono font-bold flex items-center gap-1.5 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Real Tamil Media Stream ({articles.length} reports)
                </span>
              ) : (
                <span className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-300 font-mono font-bold flex items-center gap-1.5 shadow-2xs">
                  <FlaskConical className="w-3.5 h-3.5 text-slate-600" />
                  Curated Demo Mode (8 reports)
                </span>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-tamil mt-1.5">
              {isLive
                ? "நேரடி தமிழ் செய்தி ஊடகங்களின் அரசியல் பகுப்பாய்வு, கட்சி மனநிலை தரவுகள் & 1080p செய்தி அட்டை ஸ்டுடியோ"
                : "2026 தமிழ்நாடு சட்டமன்ற தேர்தல் காட்சி மாதிரி தரவுத்தொகுப்பு"}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {isLive && (
              <button
                onClick={handleTriggerQuickIngest}
                disabled={isQuickIngesting}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                title="Trigger immediate RSS poll for new articles"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isQuickIngesting ? "animate-spin text-blue-600" : ""}`} />
                <span>{isQuickIngesting ? "Polling Feeds..." : "Poll Feeds Now"}</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab("studio")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch Card Studio (1080p)</span>
            </button>
          </div>
        </div>

        {/* Global Filter Bar (shown on Dashboard and News tabs) */}
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
              />
            ) : (
              <div className="p-16 text-center text-slate-500 bg-white border border-slate-200 rounded-xl">
                <RefreshCw className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <span className="text-sm font-medium">Loading war room intelligence...</span>
              </div>
            )}

            {/* Recent Key Reports Snippet */}
            <div className="mt-10">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900">
                  {isLive ? "Latest Ingested Media Reports" : "Top Monitored Political Reports"} ({articles.length})
                </h3>
                <button
                  onClick={() => setActiveTab("news")}
                  className="text-xs sm:text-sm text-blue-700 hover:text-blue-900 font-bold cursor-pointer"
                >
                  View Full Feed & Intelligence →
                </button>
              </div>

              {articles.length === 0 ? (
                <div className="p-12 text-center bg-white border border-slate-200 rounded-xl">
                  <FileQuestion className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700">No reports match your current filter.</p>
                  <button
                    onClick={handleResetFilters}
                    className="mt-3 px-4 py-2 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
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
              <div className="p-16 text-center text-slate-500 bg-white border border-slate-200 rounded-xl">
                <RefreshCw className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs sm:text-sm font-medium">Updating political news stream...</p>
              </div>
            ) : articles.length === 0 ? (
              <div className="p-16 text-center bg-white border border-slate-200 rounded-xl space-y-4 shadow-xs max-w-2xl mx-auto">
                <FileQuestion className="w-12 h-12 text-slate-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">No articles match your filter criteria</h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  {isLive
                    ? "No live articles collected under this filter yet. You can clear filters, check the Sources & Ingestion tab, or poll active feeds."
                    : "Try clearing the party, leader, or search filters to restore the demo media stream."}
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={handleResetFilters}
                    className="px-5 py-2.5 rounded-lg text-xs sm:text-sm font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors shadow-xs cursor-pointer"
                  >
                    Reset All Filters
                  </button>
                  {isLive && (
                    <button
                      onClick={() => setActiveTab("sources")}
                      className="px-5 py-2.5 rounded-lg text-xs sm:text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs cursor-pointer flex items-center gap-2"
                    >
                      <Radio className="w-4 h-4" />
                      <span>Manage News Sources</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
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

      {/* War Room Global Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-14 text-center text-xs text-slate-500">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="font-mono text-slate-700 font-semibold">
              TN Political War Room Media Intelligence Platform ({isLive ? "Live RSS Ingestion Active" : "Demo Mode"})
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>Verified Feeds: News18 Tamil, Polimer News, BBC Tamil, The Hindu TN, OneIndia Tamil, Muthanmai Reporter</span>
            <span>•</span>
            <span className="text-amber-800 font-mono font-bold">1080×1080 PNG Studio Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
