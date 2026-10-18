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
    <div className="space-y-6">
      {/* Header Banner & Controls */}
      <div className="bg-white rounded-lg border border-[#E8E8E2] shadow-2xs p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#F0F0EB]">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 font-serif">
                Political Intelligence Brief
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-[#F4F4F0] text-zinc-700 border border-[#E2E2DC]">
                v1.0 Synthesis
              </span>
              {brief?.is_cached ? (
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-700" /> Cached Evidence
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-700" /> Fresh
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 font-tamil mt-1">
              தமிழ்நாடு அரசியல் ஊடக நுண்ணறிவுச் சுருக்கம் & உண்மைச் சான்றுகள்
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            {/* Period Selector */}
            <div className="flex items-center bg-[#F4F4F0] p-0.5 rounded border border-[#E2E2DC] text-xs">
              <button
                onClick={() => setPeriod("24h")}
                className={`px-2.5 py-1 rounded text-xs transition-all cursor-pointer font-semibold ${
                  period === "24h" ? "bg-zinc-900 text-white shadow-2xs" : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                24 Hours
              </button>
              <button
                onClick={() => setPeriod("7d")}
                className={`px-2.5 py-1 rounded text-xs transition-all cursor-pointer font-semibold ${
                  period === "7d" ? "bg-zinc-900 text-white shadow-2xs" : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                7 Days
              </button>
            </div>

            {/* Language Switcher */}
            <div className="flex items-center bg-[#F4F4F0] p-0.5 rounded border border-[#E2E2DC] text-xs">
              <button
                onClick={() => setLanguage("en")}
                className={`px-2.5 py-1 rounded text-xs transition-all cursor-pointer font-semibold ${
                  language === "en" ? "bg-zinc-900 text-white shadow-2xs" : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLanguage("ta")}
                className={`px-2.5 py-1 rounded text-xs font-tamil transition-all cursor-pointer font-semibold ${
                  language === "ta" ? "bg-zinc-900 text-white shadow-2xs" : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                தமிழ்
              </button>
            </div>

            {/* Regenerate Button */}
            <button
              onClick={() => loadData(true)}
              disabled={loading || regenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-semibold rounded shadow-2xs transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${regenerating ? "animate-spin" : ""}`} />
              <span>{regenerating ? "Synthesizing..." : "Regenerate Brief"}</span>
            </button>
          </div>
        </div>

        {/* Telemetry & Reporting Window Badge */}
        {brief && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-600">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-zinc-700">Reporting Window (IST):</span>
              <span className="font-mono bg-[#F9F9F7] px-2 py-0.5 rounded border border-[#E2E2DC]">
                {formatDate(brief.window_start)} → {formatDate(brief.window_end)}
              </span>
              <span className="text-zinc-300">•</span>
              <span>
                Evidence Base: <strong className="text-zinc-900 font-mono">{brief.sample_size}</strong> reports across{" "}
                <strong className="text-zinc-900 font-mono">{brief.publisher_count}</strong> media outlets
              </span>
            </div>
            <div className="text-[11px] text-zinc-600 font-mono">
              Generated: {formatDate(brief.generated_at)}
            </div>
          </div>
        )}
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Error loading intelligence brief</p>
            <p className="mt-0.5 text-xs">{error}</p>
          </div>
        </div>
      )}

      {/* Insufficient Data Banner */}
      {brief?.status === "insufficient_data" && (
        <div className="p-5 rounded-lg bg-[#FDFBF7] border border-[#E8E0D5] text-zinc-800 text-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm">Insufficient Article Evidence</h3>
              <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                {language === "ta" ? brief.brief_tamil : brief.brief_english}
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                Switch reporting period to <strong>7 Days</strong> or trigger a live RSS poll to gather more articles.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="p-12 text-center bg-white rounded-lg border border-[#E8E8E2] shadow-2xs">
          <RefreshCw className="w-6 h-6 animate-spin text-zinc-800 mx-auto mb-2" />
          <p className="text-xs font-bold text-zinc-800">Synthesizing Political Intelligence Brief...</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Aggregating topic trends, party sentiment, and article evidence</p>
        </div>
      )}

      {!loading && brief && brief.status === "sufficient_data" && (
        <>
          {/* SECTION A: EXECUTIVE BRIEF & KEY DEVELOPMENTS */}
          <div className="bg-white rounded-lg border border-[#E8E8E2] shadow-2xs p-4 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#F0F0EB] pb-3">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-zinc-700" />
                <h2 className="text-sm sm:text-base font-bold text-zinc-900 uppercase tracking-tight">
                  {language === "ta" ? "முதன்மை அரசியல் சுருக்கம்" : "Executive Intelligence Brief"}
                </h2>
              </div>
              <span className="text-xs text-zinc-600 font-mono">
                Source: Verified Regional Feeds
              </span>
            </div>

            {/* Narrative Summary */}
            <div className="p-4 rounded bg-[#F9F9F7] border border-[#E8E8E2]">
              <div className="prose prose-zinc max-w-none text-xs sm:text-sm leading-relaxed whitespace-pre-line text-zinc-800 font-normal">
                {language === "ta" ? brief.brief_tamil : brief.brief_english}
              </div>
            </div>

            {/* Key Developments */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-zinc-600" />
                <span>
                  {language === "ta" ? "முக்கிய அரசியல் நகர்வுகள் & உண்மைச் சான்றுகள்" : "Key Developments & Verified Claims"}
                </span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {brief.key_developments.map((kd, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg border border-[#E8E8E2] bg-white hover:border-zinc-400 transition-colors flex flex-col justify-between space-y-2.5"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#F4F4F0] text-zinc-800 border border-[#E2E2DC] font-bold">
                          Item #{idx + 1}
                        </span>
                        <span className="text-[10px] text-zinc-600 font-mono">
                          {kd.supporting_article_ids.length} citations
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-zinc-900 mt-1.5 leading-snug">
                        {language === "ta" ? kd.headline_ta : kd.headline_en}
                      </h4>
                      <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                        {language === "ta" ? kd.summary_ta : kd.summary_en}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#F0F0EB] flex items-center justify-between text-xs">
                      <span className="text-[11px] text-zinc-600 italic">
                        {kd.impact_assessment}
                      </span>
                      {kd.supporting_article_urls[0] && (
                        <a
                          href={kd.supporting_article_urls[0]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-zinc-800 hover:text-black font-semibold hover:underline shrink-0"
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

          {/* SECTION B: TOPIC TRENDS & COVERAGE ACCELERATION */}
          {trends && (
            <div className="bg-white rounded-lg border border-[#E8E8E2] shadow-2xs p-4 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F0F0EB] pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-zinc-700" />
                  <h2 className="text-sm sm:text-base font-bold text-zinc-900 uppercase tracking-tight">
                    Topic Trends & Coverage Acceleration
                  </h2>
                </div>
                <div className="text-xs text-zinc-600 font-mono">
                  Benchmark: Prior {period === "24h" ? "24 hours" : "7 days"}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {trends.topics.map((item) => {
                  const isGaining = item.status === "gaining";
                  const isLosing = item.status === "losing";
                  const isEmerging = item.status === "emerging";
                  const isSingle = item.status === "single_report";

                  return (
                    <div
                      key={item.topic}
                      className="p-3.5 rounded-lg border border-[#E8E8E2] bg-[#FBFBFA] hover:bg-white hover:border-zinc-400 transition-colors flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-xs font-bold text-zinc-900 uppercase tracking-tight truncate">
                            {item.topic}
                          </span>
                          {isGaining && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <TrendingUp className="w-3 h-3" /> Gaining
                            </span>
                          )}
                          {isLosing && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
                              <TrendingDown className="w-3 h-3" /> Losing
                            </span>
                          )}
                          {isEmerging && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                              Emerging
                            </span>
                          )}
                          {isSingle && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
                              Single Report
                            </span>
                          )}
                        </div>

                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-xl font-bold font-mono text-zinc-900">{item.current_count}</span>
                          <span className="text-xs text-zinc-500 font-mono">(prior: {item.prior_count})</span>
                        </div>

                        <div className="text-xs font-semibold mt-1">
                          {item.net_change > 0 ? (
                            <span className="text-emerald-800 font-mono">+{item.net_change} reports</span>
                          ) : item.net_change < 0 ? (
                            <span className="text-rose-800 font-mono">{item.net_change} reports</span>
                          ) : (
                            <span className="text-zinc-500 font-mono">0 net change</span>
                          )}
                          {item.pct_change !== null && (
                            <span className="text-zinc-500 ml-1.5 font-normal font-mono">
                              ({item.pct_change > 0 ? "+" : ""}{item.pct_change}%)
                              {item.is_low_sample && " *"}
                            </span>
                          )}
                        </div>

                        {/* Distinct Publishers */}
                        <div className="mt-2.5 text-[11px] text-zinc-600">
                          <span className="font-semibold text-zinc-700">Outlets: </span>
                          <span>{item.distinct_publishers.join(", ") || "None"}</span>
                        </div>
                      </div>

                      {/* Supporting Articles Links */}
                      {item.supporting_articles.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-[#E8E8E2] flex items-center justify-between text-xs">
                          <span className="text-[10px] text-zinc-600 font-mono">
                            {item.supporting_articles.length} evidence items
                          </span>
                          <button
                            onClick={() => setActiveArticleModal(item.supporting_articles[0])}
                            className="text-zinc-900 hover:text-black font-semibold flex items-center gap-1 cursor-pointer"
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

              <div className="text-[11px] text-zinc-600 flex items-center gap-1.5 mt-2">
                <Info className="w-3.5 h-3.5 text-zinc-600" />
                <span>
                  * Asterisk denotes low prior sample baseline (&lt; 3 articles). Single report tags indicate isolated reports not yet establishing a broad trend.
                </span>
              </div>
            </div>
          )}

          {/* SECTION C: PARTY MEDIA PRESENCE & EDITORIAL POLARITY */}
          {coverage && (
            <div className="bg-white rounded-lg border border-[#E8E8E2] shadow-2xs p-4 sm:p-6 space-y-5">
              <div className="border-b border-[#F0F0EB] pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-zinc-700" />
                  <h2 className="text-sm sm:text-base font-bold text-zinc-900 uppercase tracking-tight">
                    Party & Leader Media Presence vs Editorial Sentiment
                  </h2>
                </div>
                {/* Mandatory Disclaimer */}
                <div className="mt-2 p-2.5 bg-[#F9F9F7] rounded border border-[#E8E8E2] text-zinc-700 text-xs flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                  <div>
                    <strong>Data Integrity Notice:</strong> {coverage.attribution_caveat}
                  </div>
                </div>
              </div>

              {/* Parties Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {coverage.parties.map((p) => (
                  <div
                    key={p.code}
                    className="p-3.5 rounded-lg border border-[#E8E8E2] bg-white hover:border-zinc-400 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-sm text-zinc-900">{p.code}</span>
                        <span className="text-[11px] text-zinc-500 font-tamil truncate max-w-[120px]">
                          {p.tamil_name}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold font-mono text-zinc-900">{p.current_count}</span>
                        <span className="text-xs text-zinc-500 font-mono">
                          reports ({p.net_change > 0 ? `+${p.net_change}` : p.net_change})
                        </span>
                      </div>

                      {/* Polarity Breakdown */}
                      <div className="mt-2.5">
                        <div className="flex items-center justify-between text-[11px] text-zinc-600 mb-1 font-mono">
                          <span>Polarity:</span>
                          <span>Avg: {p.average_sentiment_score > 0 ? `+${p.average_sentiment_score}` : p.average_sentiment_score}</span>
                        </div>
                        <div className="flex h-1.5 rounded-xs overflow-hidden bg-zinc-100">
                          <div
                            style={{ width: `${(p.sentiment_distribution.positive / Math.max(1, p.current_count)) * 100}%` }}
                            className="bg-emerald-700"
                            title={`Positive: ${p.sentiment_distribution.positive}`}
                          />
                          <div
                            style={{ width: `${(p.sentiment_distribution.neutral / Math.max(1, p.current_count)) * 100}%` }}
                            className="bg-zinc-400"
                            title={`Neutral: ${p.sentiment_distribution.neutral}`}
                          />
                          <div
                            style={{ width: `${(p.sentiment_distribution.negative / Math.max(1, p.current_count)) * 100}%` }}
                            className="bg-rose-700"
                            title={`Critical: ${p.sentiment_distribution.negative}`}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-zinc-500 mt-1 font-mono">
                          <span className="text-emerald-800 font-bold">+{p.sentiment_distribution.positive}</span>
                          <span>{p.sentiment_distribution.neutral} neu</span>
                          <span className="text-rose-800 font-bold">-{p.sentiment_distribution.negative}</span>
                        </div>
                      </div>

                      {/* Top Topic */}
                      {p.top_topics.length > 0 && (
                        <div className="mt-2.5 text-[11px] text-zinc-600">
                          <span className="font-semibold text-zinc-700">Top topic: </span>
                          <span className="truncate">{p.top_topics[0].topic}</span>
                        </div>
                      )}
                    </div>

                    {p.supporting_articles.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-[#F0F0EB] flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                        <span>{p.distinct_publishers.length} outlets</span>
                        {p.supporting_articles[0].source_url && (
                          <a
                            href={p.supporting_articles[0].source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-800 hover:text-black font-semibold hover:underline flex items-center gap-1"
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
          )}

          {/* SECTION D: EVIDENCE & SEARCH EXPLORER */}
          <div className="bg-white rounded-lg border border-[#E8E8E2] shadow-2xs p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F0F0EB] pb-3">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-zinc-700" />
                <h2 className="text-sm sm:text-base font-bold text-zinc-900 uppercase tracking-tight">
                  Evidence Search Explorer
                </h2>
              </div>
              <div className="text-xs text-zinc-500 font-mono">
                {searchTotal} verified articles matching filter
              </div>
            </div>

            {/* Search and Filters Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search Tamil or English query..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-[#F9F9F7] border border-[#E2E2DC] rounded focus:outline-hidden focus:border-zinc-500 focus:bg-white transition-all font-medium"
                />
              </div>

              <select
                value={selectedPartyFilter}
                onChange={(e) => setSelectedPartyFilter(e.target.value)}
                className="py-1.5 px-2.5 text-xs bg-[#F9F9F7] border border-[#E2E2DC] rounded focus:outline-hidden focus:border-zinc-500 text-zinc-800 font-medium cursor-pointer"
              >
                <option value="">All Parties</option>
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
                className="py-1.5 px-2.5 text-xs bg-[#F9F9F7] border border-[#E2E2DC] rounded focus:outline-hidden focus:border-zinc-500 text-zinc-800 font-medium cursor-pointer"
              >
                <option value="">All Topics</option>
                <option value="2026 Assembly Election">2026 Assembly Election</option>
                <option value="Industrial Development">Industrial Development</option>
                <option value="Kalaignar Magalir Urimai Thogai">Kalaignar Magalir Urimai Thogai</option>
                <option value="Power Tariffs">Power Tariffs</option>
                <option value="Youth Politics">Youth Politics</option>
                <option value="Central Schemes">Central Schemes</option>
                <option value="Cauvery Water Dispute">Cauvery Water Dispute</option>
              </select>
            </div>

            {/* Results Table */}
            {searching ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                Searching evidence articles...
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500 bg-[#F9F9F7] rounded border border-[#E8E8E2]">
                No verified articles matched your query.
              </div>
            ) : (
              <div className="overflow-x-auto border border-[#E8E8E2] rounded">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F4F4F0] border-b border-[#E8E8E2] text-zinc-600 font-mono uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Outlet</th>
                      <th className="py-2 px-3">Headline</th>
                      <th className="py-2 px-3">Parties</th>
                      <th className="py-2 px-3">Tone</th>
                      <th className="py-2 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0EB]">
                    {searchResults.map((art) => (
                      <tr key={art.id} className="hover:bg-[#F9F9F7] transition-colors">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-500 whitespace-nowrap">
                          {formatDate(art.published_at)}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-zinc-800 whitespace-nowrap">
                          {art.source_name || art.source}
                        </td>
                        <td className="py-2.5 px-3 font-tamil font-medium text-zinc-900 max-w-md">
                          {art.tamil_title || art.title}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-600 whitespace-nowrap">
                          {Array.isArray(art.party_codes) ? art.party_codes.join(", ") : art.party_codes}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold capitalize ${
                              art.sentiment === "positive"
                                ? "text-emerald-700 bg-emerald-50"
                                : art.sentiment === "negative"
                                ? "text-rose-700 bg-rose-50"
                                : "text-zinc-600 bg-zinc-100"
                            }`}
                          >
                            {art.sentiment}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <a
                            href={art.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-zinc-700 hover:text-black font-semibold"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Supporting Article Modal */}
      {activeArticleModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-lg border border-[#E8E8E2] max-w-xl w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-[#F0F0EB] pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase">
                  Verified Evidence Citation #{activeArticleModal.id}
                </span>
                <h3 className="text-sm font-bold font-tamil text-zinc-900 mt-1 leading-snug">
                  {activeArticleModal.tamil_title || activeArticleModal.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveArticleModal(null)}
                className="text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs text-zinc-600 font-mono">
              <div>
                <strong className="text-zinc-800">Publisher:</strong> {activeArticleModal.source}
              </div>
              <div>
                <strong className="text-zinc-800">Published:</strong> {formatDate(activeArticleModal.published_at)}
              </div>
            </div>

            <div className="pt-3 border-t border-[#F0F0EB] flex items-center justify-end gap-2">
              <button
                onClick={() => setActiveArticleModal(null)}
                className="px-3 py-1.5 rounded text-xs text-zinc-600 hover:bg-zinc-100 cursor-pointer"
              >
                Close
              </button>
              {activeArticleModal.source_url && (
                <a
                  href={activeArticleModal.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 inline-flex items-center gap-1.5"
                >
                  <span>Open Original Story</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
