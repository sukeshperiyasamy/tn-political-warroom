"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Search,
  Building2,
  Users,
  Compass,
  Clock,
  Layers,
  ArrowRight,
  Info,
} from "lucide-react";
import {
  IntelligenceBriefResponse,
  TopicTrendsResponse,
  PartyLeaderCoverageResponse,
  SupportingArticleRef,
} from "../types/political";
import {
  fetchIntelligenceBrief,
  fetchTopicTrends,
  fetchPartyLeaderCoverage,
  fetchEvidenceSearch,
} from "../lib/api";

interface IntelligenceBriefViewProps {
  mode: "live" | "demo";
}

export function IntelligenceBriefView({ mode }: IntelligenceBriefViewProps) {
  const [period, setPeriod] = useState<"24h" | "7d">("24h");
  const [language, setLanguage] = useState<"en" | "ta">("en");
  const [loading, setLoading] = useState<boolean>(true);
  const [regenerating, setRegenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Core Data States
  const [brief, setBrief] = useState<IntelligenceBriefResponse | null>(null);
  const [trends, setTrends] = useState<TopicTrendsResponse | null>(null);
  const [coverage, setCoverage] = useState<PartyLeaderCoverageResponse | null>(null);

  // Evidence Explorer / Search States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedPartyFilter, setSelectedPartyFilter] = useState<string>("");
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchTotal, setSearchTotal] = useState<number>(0);
  const [searching, setSearching] = useState<boolean>(false);

  // Active Supporting Article modal/drawer preview
  const [activeArticleModal, setActiveArticleModal] = useState<SupportingArticleRef | null>(null);

  const loadData = useCallback(async (isRegen = false) => {
    if (isRegen) setRegenerating(true);
    else setLoading(true);
    setError(null);

    try {
      const [briefData, trendsData, coverageData] = await Promise.all([
        fetchIntelligenceBrief(mode, period, isRegen),
        fetchTopicTrends(mode, period),
        fetchPartyLeaderCoverage(mode, period),
      ]);

      setBrief(briefData);
      setTrends(trendsData);
      setCoverage(coverageData);
    } catch (err: any) {
      setError(err?.message || "Failed to load intelligence brief data");
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  }, [mode, period]);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // Execute evidence search
  const handleSearch = useCallback(async () => {
    setSearching(true);
    try {
      const res = await fetchEvidenceSearch({
        mode,
        q: searchQuery,
        party: selectedPartyFilter || undefined,
        topic: selectedTopicFilter || undefined,
        limit: 25,
      });
      setSearchResults(res.articles || []);
      setSearchTotal(res.total_matched || 0);
    } catch {
      setSearchResults([]);
      setSearchTotal(0);
    } finally {
      setSearching(false);
    }
  }, [mode, searchQuery, selectedPartyFilter, selectedTopicFilter]);

  useEffect(() => {
    handleSearch();
  }, [handleSearch]);

  const formatDate = (isoString?: string) => {
    if (!isoString) return "-";
    try {
      const d = new Date(isoString);
      return d.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header Banner & Controls */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
                    Political Intelligence Brief
                  </h1>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-900 border border-blue-200">
                    v1.0 Synthesis
                  </span>
                  {brief?.is_cached ? (
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" /> Cached Evidence
                    </span>
                  ) : (
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-600" /> Freshly Generated
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-tamil mt-1">
                  தமிழ்நாடு அரசியல் ஊடக நுண்ணறிவுச் சுருக்கம் & உண்மைச் சான்றுகள்
                </p>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Period Selector */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setPeriod("24h")}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  period === "24h" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                24 Hours (24 மணி)
              </button>
              <button
                onClick={() => setPeriod("7d")}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  period === "7d" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                7 Days (7 நாட்கள்)
              </button>
            </div>

            {/* Language Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setLanguage("en")}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  language === "en" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLanguage("ta")}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  language === "ta" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                தமிழ்
              </button>
            </div>

            {/* Regenerate Button */}
            <button
              onClick={() => loadData(true)}
              disabled={loading || regenerating}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? "animate-spin" : ""}`} />
              <span>{regenerating ? "Synthesizing..." : "Regenerate Brief"}</span>
            </button>
          </div>
        </div>

        {/* Telemetry & Reporting Window Badge */}
        {brief && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-700">Reporting Window (IST):</span>
              <span className="font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                {formatDate(brief.window_start)} → {formatDate(brief.window_end)}
              </span>
              <span className="text-slate-400">•</span>
              <span>
                Evidence Base: <strong className="text-slate-900">{brief.sample_size}</strong> verified reports across{" "}
                <strong className="text-slate-900">{brief.publisher_count}</strong> Tamil newsrooms
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Generated: {formatDate(brief.generated_at)}
            </div>
          </div>
        )}
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Error loading intelligence brief</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Insufficient Data Banner */}
      {brief?.status === "insufficient_data" && (
        <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-base">Insufficient Article Evidence</h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed">
                {language === "ta" ? brief.brief_tamil : brief.brief_english}
              </p>
              <p className="mt-2 text-xs text-amber-700">
                Tip: Switch reporting period to <strong>7 Days</strong> or trigger a live RSS ingestion to accumulate sufficient verified reports.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-sm">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-800">Synthesizing Political Intelligence Brief...</p>
          <p className="text-xs text-slate-500 mt-1">Aggregating topic trends, party sentiment, and article evidence</p>
        </div>
      )}

      {!loading && brief && brief.status === "sufficient_data" && (
        <>
          {/* SECTION A: EXECUTIVE BRIEF & LANDMARK DEVELOPMENTS */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-blue-600" />
                <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-tight">
                  {language === "ta" ? "முதன்மை அரசியல் சுருக்கம்" : "Executive Intelligence Brief"}
                </h2>
              </div>
              <span className="text-xs text-slate-500">
                Attribution: Verified Tamil Media Feeds
              </span>
            </div>

            {/* Narrative Summary */}
            <div className="p-4 sm:p-5 rounded-lg bg-slate-50 border border-slate-200/80">
              <div className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed whitespace-pre-line text-slate-800 font-medium">
                {language === "ta" ? brief.brief_tamil : brief.brief_english}
              </div>
            </div>

            {/* Landmark Key Developments */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-700" />
                <span>
                  {language === "ta" ? "முக்கிய அரசியல் நகர்வுகள் & உண்மைச் சான்றுகள்" : "Key Developments & Verified Claims"}
                </span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {brief.key_developments.map((kd, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-bold">
                          Item #{idx + 1}
                        </span>
                        <span className="text-[10px] font-medium text-slate-500">
                          {kd.supporting_article_ids.length} citations
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-2 leading-snug">
                        {language === "ta" ? kd.headline_ta : kd.headline_en}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                        {language === "ta" ? kd.summary_ta : kd.summary_en}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-medium italic">
                        {kd.impact_assessment}
                      </span>
                      {kd.supporting_article_urls[0] && (
                        <a
                          href={kd.supporting_article_urls[0]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 font-bold hover:underline shrink-0"
                        >
                          <span>Original</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION B: TOPIC TRENDS & MEDIA ACCELERATION */}
          {trends && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-tight">
                    Topic Trends & Coverage Acceleration
                  </h2>
                </div>
                <div className="text-xs text-slate-500">
                  Compared against prior {period === "24h" ? "24 hours" : "7 days"}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trends.topics.map((item) => {
                  const isGaining = item.status === "gaining";
                  const isLosing = item.status === "losing";
                  const isEmerging = item.status === "emerging";
                  const isSingle = item.status === "single_report";

                  return (
                    <div
                      key={item.topic}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-xs font-bold text-slate-900 uppercase tracking-tight">
                            {item.topic}
                          </span>
                          {isGaining && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              <TrendingUp className="w-3 h-3" /> Gaining
                            </span>
                          )}
                          {isLosing && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                              <TrendingDown className="w-3 h-3" /> Losing
                            </span>
                          )}
                          {isEmerging && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                              New Emerging
                            </span>
                          )}
                          {isSingle && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                              Single Report
                            </span>
                          )}
                        </div>

                        <div className="flex items-baseline gap-2 mt-2">
                          <span className="text-2xl font-black text-slate-900">{item.current_count}</span>
                          <span className="text-xs text-slate-500 font-medium">reports (prior: {item.prior_count})</span>
                        </div>

                        <div className="text-xs font-semibold mt-1">
                          {item.net_change > 0 ? (
                            <span className="text-emerald-700">+{item.net_change} reports</span>
                          ) : item.net_change < 0 ? (
                            <span className="text-rose-700">{item.net_change} reports</span>
                          ) : (
                            <span className="text-slate-500">No net change</span>
                          )}
                          {item.pct_change !== null && (
                            <span className="text-slate-500 ml-1.5 font-normal">
                              ({item.pct_change > 0 ? "+" : ""}
                              {item.pct_change}%)
                              {item.is_low_sample && " *"}
                            </span>
                          )}
                        </div>

                        {/* Distinct Publishers */}
                        <div className="mt-3 text-[11px] text-slate-600">
                          <span className="font-semibold text-slate-700">Covered by: </span>
                          <span>{item.distinct_publishers.join(", ") || "None"}</span>
                        </div>
                      </div>

                      {/* Supporting Articles Links */}
                      {item.supporting_articles.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-slate-500">
                            {item.supporting_articles.length} verified evidence articles
                          </span>
                          <button
                            onClick={() => setActiveArticleModal(item.supporting_articles[0])}
                            className="text-blue-700 hover:text-blue-900 font-bold hover:underline flex items-center gap-1"
                          >
                            <span>Inspect</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-2">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  * Asterisk indicates low historical sample size (prior window &lt; 3 articles). Single report tags indicate isolated stories not yet reflective of a statewide trend.
                </span>
              </div>
            </div>
          )}

          {/* SECTION C: PARTY & LEADER MEDIA COVERAGE */}
          {coverage && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-tight">
                    Party & Leader Media Presence vs Editorial Sentiment
                  </h2>
                </div>
                {/* Mandatory Disclaimer */}
                <div className="mt-2 p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-950 text-xs flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <strong>Data Integrity Notice:</strong> {coverage.attribution_caveat}
                  </div>
                </div>
              </div>

              {/* Parties Grid */}
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-600" />
                  <span>Political Parties in Tamil Nadu Newsrooms</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {coverage.parties.map((p) => (
                    <div
                      key={p.code}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-extrabold text-sm text-slate-900">{p.code}</span>
                          <span className="text-[11px] text-slate-500 font-tamil truncate max-w-[120px]">
                            {p.tamil_name}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-slate-900">{p.current_count}</span>
                          <span className="text-xs text-slate-500">
                            reports ({p.net_change > 0 ? `+${p.net_change}` : p.net_change})
                          </span>
                        </div>

                        {/* Sentiment Tone Breakdown */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-[11px] text-slate-600 font-semibold mb-1">
                            <span>Media Sentiment:</span>
                            <span className="font-mono">Avg: {p.average_sentiment_score > 0 ? `+${p.average_sentiment_score}` : p.average_sentiment_score}</span>
                          </div>
                          <div className="flex h-2 rounded-full overflow-hidden bg-slate-100 gap-0.5">
                            <div
                              style={{ width: `${(p.sentiment_distribution.positive / Math.max(1, p.current_count)) * 100}%` }}
                              className="bg-emerald-500"
                              title={`Positive: ${p.sentiment_distribution.positive}`}
                            />
                            <div
                              style={{ width: `${(p.sentiment_distribution.neutral / Math.max(1, p.current_count)) * 100}%` }}
                              className="bg-slate-300"
                              title={`Neutral: ${p.sentiment_distribution.neutral}`}
                            />
                            <div
                              style={{ width: `${(p.sentiment_distribution.negative / Math.max(1, p.current_count)) * 100}%` }}
                              className="bg-rose-500"
                              title={`Negative: ${p.sentiment_distribution.negative}`}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                            <span className="text-emerald-700">+{p.sentiment_distribution.positive}</span>
                            <span className="text-slate-500">{p.sentiment_distribution.neutral} neu</span>
                            <span className="text-rose-700">-{p.sentiment_distribution.negative}</span>
                          </div>
                        </div>

                        {/* Top Topics */}
                        {p.top_topics.length > 0 && (
                          <div className="mt-3 text-[11px] text-slate-600">
                            <span className="font-semibold text-slate-700">Top topic: </span>
                            <span>{p.top_topics[0].topic}</span>
                          </div>
                        )}
                      </div>

                      {p.supporting_articles.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] text-slate-500">{p.distinct_publishers.length} outlets</span>
                          {p.supporting_articles[0].source_url && (
                            <a
                              href={p.supporting_articles[0].source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-700 hover:text-blue-900 font-bold hover:underline flex items-center gap-1"
                            >
                              <span>Sample</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SECTION D: EVIDENCE & SEARCH EXPLORER */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-600" />
                <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-tight">
                  Search & Evidence Explorer
                </h2>
              </div>
              <div className="text-xs text-slate-500">
                {searchTotal} verified articles matching filter
              </div>
            </div>

            {/* Search and Filters Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Tamil or English query..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:bg-white transition-all font-medium"
                />
              </div>

              <select
                value={selectedPartyFilter}
                onChange={(e) => setSelectedPartyFilter(e.target.value)}
                className="py-2 px-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 font-medium text-slate-700"
              >
                <option value="">All Political Parties (அனைத்தும்)</option>
                <option value="DMK">DMK (திமுக)</option>
                <option value="AIADMK">AIADMK (அதிமுக)</option>
                <option value="BJP">BJP (பாஜக)</option>
                <option value="TVK">TVK (தவெக)</option>
                <option value="NTK">NTK (நாதக)</option>
                <option value="VCK">VCK (விசிக)</option>
                <option value="INC">Congress (காங்கிரஸ்)</option>
              </select>

              <select
                value={selectedTopicFilter}
                onChange={(e) => setSelectedTopicFilter(e.target.value)}
                className="py-2 px-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 font-medium text-slate-700"
              >
                <option value="">All Topics (அனைத்து தலைப்புகள்)</option>
                <option value="2026 Assembly Election">2026 Assembly Election</option>
                <option value="Governance">Governance</option>
                <option value="Tamil Nadu State Politics">Tamil Nadu State Politics</option>
                <option value="Welfare & Social Justice">Welfare & Social Justice</option>
                <option value="Industrial & Economic Policy">Industrial & Economic Policy</option>
                <option value="Riparian Rights & Agriculture">Riparian Rights & Agriculture</option>
              </select>
            </div>

            {/* Results Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-4">Article Headline</th>
                    <th className="py-2.5 px-3">Publisher</th>
                    <th className="py-2.5 px-3">Parties</th>
                    <th className="py-2.5 px-3">Tone</th>
                    <th className="py-2.5 px-3">Published At</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {searching ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400 font-medium">
                        Searching articles...
                      </td>
                    </tr>
                  ) : searchResults.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400 font-medium">
                        No articles match the current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    searchResults.map((art) => (
                      <tr key={art.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-4 max-w-sm">
                          <p className="font-bold text-slate-900 truncate">{art.title}</p>
                          {art.tamil_title && art.tamil_title !== art.title && (
                            <p className="text-[11px] text-slate-500 font-tamil truncate mt-0.5">{art.tamil_title}</p>
                          )}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-700 font-medium">
                          {art.source_name || art.source || "News"}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {art.party_codes?.map((p: string) => (
                            <span key={p} className="inline-block mr-1 px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-mono font-bold text-[10px]">
                              {p}
                            </span>
                          )) || "-"}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              art.sentiment === "positive"
                                ? "bg-emerald-100 text-emerald-800"
                                : art.sentiment === "negative"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {art.sentiment}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                          {formatDate(art.published_at)}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-right">
                          <a
                            href={art.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-bold hover:underline"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Article Detail Inspection Modal */}
      {activeArticleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Supporting Article Citation
              </span>
              <button
                onClick={() => setActiveArticleModal(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-mono">
                {activeArticleModal.id}
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-2">
                {activeArticleModal.title}
              </h3>
              {activeArticleModal.tamil_title && activeArticleModal.tamil_title !== activeArticleModal.title && (
                <p className="text-sm font-tamil text-slate-600 mt-1">
                  {activeArticleModal.tamil_title}
                </p>
              )}
            </div>

            <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <p><strong>Publisher:</strong> {activeArticleModal.source}</p>
              <p><strong>Published At:</strong> {formatDate(activeArticleModal.published_at)}</p>
              <p><strong>Sentiment Tone:</strong> {activeArticleModal.sentiment}</p>
              <p><strong>Parties Identified:</strong> {activeArticleModal.party_codes?.join(", ") || "General"}</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveArticleModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Close
              </button>
              <a
                href={activeArticleModal.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-sm"
              >
                <span>Read Original Article</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
