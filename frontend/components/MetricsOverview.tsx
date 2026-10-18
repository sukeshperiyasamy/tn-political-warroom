"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  TrendingUp,
  Layers,
  Users,
  Compass,
  ChevronRight,
  Info,
} from "lucide-react";
import { DashboardMetrics, DailyTrendItem } from "../types/political";

function formatDateLabel(dateStr: string): string {
  try {
    const parts = dateStr.split("T")[0].split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(Date.UTC(year, month, day));
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
    }
  } catch {
    // fallback
  }
  return dateStr.slice(5);
}

function formatFullDate(dateStr: string): string {
  try {
    const parts = dateStr.split("T")[0].split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(Date.UTC(year, month, day));
      return d.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
    }
  } catch {
    // fallback
  }
  return dateStr;
}

interface MetricsOverviewProps {
  metrics: DashboardMetrics;
  onSelectParty: (code: string) => void;
  onSelectLeader: (name: string) => void;
  onSelectTopic?: (topic: string) => void;
}

export function MetricsOverview({
  metrics,
  onSelectParty,
  onSelectLeader,
  onSelectTopic,
}: MetricsOverviewProps) {
  const {
    filtered_articles,
    sentiment_distribution,
    party_metrics,
    leader_metrics,
    top_topics,
    daily_trends = [],
    disclaimer,
  } = metrics;

  const [timeRange, setTimeRange] = useState<"7d" | "14d" | "30d" | "all">("14d");
  const [hoveredItem, setHoveredItem] = useState<DailyTrendItem | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Filter visible trends based on selected timeRange
  const visibleTrends = useMemo(() => {
    if (!daily_trends || daily_trends.length === 0) return [];
    if (timeRange === "7d") return daily_trends.slice(-7);
    if (timeRange === "14d") return daily_trends.slice(-14);
    if (timeRange === "30d") return daily_trends.slice(-30);
    return daily_trends;
  }, [daily_trends, timeRange]);

  // Leading party by article volume
  const leadingParty = useMemo(() => {
    if (!party_metrics || party_metrics.length === 0) return null;
    return [...party_metrics].sort((a, b) => b.article_count - a.article_count)[0];
  }, [party_metrics]);

  const maxTotal = useMemo(() => {
    if (!visibleTrends || visibleTrends.length === 0) return 1;
    return Math.max(...visibleTrends.map((d) => d.total), 1);
  }, [visibleTrends]);

  return (
    <div className="space-y-6 mb-10">
      {/* 1. Restrained Editorial Metrics Strip */}
      <div className="bg-white border border-[#E8E8E2] rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-[#E8E8E2] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 shadow-2xs">
        {/* Metric 1: Articles Monitored */}
        <div className="p-4 sm:p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
            Articles Monitored
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-zinc-900 font-mono">
              {filtered_articles}
            </span>
            <span className="text-xs text-zinc-500">wire reports</span>
          </div>
          <span className="text-[11px] text-zinc-500 block mt-1">
            Across registered regional Tamil publishers
          </span>
        </div>

        {/* Metric 2: Leading Coverage Voice */}
        <div className="p-4 sm:p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
            Top Mention Volume
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-zinc-900 font-mono">
              {leadingParty ? leadingParty.party_code : "—"}
            </span>
            {leadingParty && (
              <span className="text-xs text-zinc-500 font-mono">
                {leadingParty.article_count} reports ({filtered_articles > 0 ? Math.round((leadingParty.article_count / filtered_articles) * 100) : 0}%)
              </span>
            )}
          </div>
          <span className="text-[11px] text-zinc-500 block mt-1 truncate">
            {leadingParty ? leadingParty.tamil_name : "Coverage benchmark"}
          </span>
        </div>

        {/* Metric 3: Media Polarity Balance */}
        <div className="p-4 sm:p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
            Automated Polarity
          </span>
          <div className="flex items-baseline gap-3">
            <div className="flex items-baseline gap-1 text-emerald-800 font-mono">
              <span className="text-2xl font-bold">{sentiment_distribution.positive_pct}%</span>
              <span className="text-[10px] text-zinc-500 uppercase">Pos</span>
            </div>
            <span className="text-zinc-300">/</span>
            <div className="flex items-baseline gap-1 text-rose-800 font-mono">
              <span className="text-2xl font-bold">{sentiment_distribution.negative_pct}%</span>
              <span className="text-[10px] text-zinc-500 uppercase">Crit</span>
            </div>
          </div>
          <span className="text-[11px] text-zinc-500 block mt-1 font-mono">
            Neutral share: {sentiment_distribution.neutral_pct}%
          </span>
        </div>

        {/* Metric 4: Methodological Scope */}
        <div className="p-4 sm:p-5 flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
            Analytical Disclaimer
          </span>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Media frequency reflects published journalistic coverage, not electoral vote share or popularity.
          </p>
          <span className="text-[10px] text-zinc-600 font-mono mt-1">
            Sample size: N = {filtered_articles}
          </span>
        </div>
      </div>

      {/* 2. Sentiment Spectrum Visualization */}
      <div className="bg-white border border-[#E8E8E2] rounded-lg p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-800">
              Tamil Nadu Media Sentiment Distribution
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Automated NLP tone categorization across published news reports (N = {filtered_articles})
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-emerald-800 font-medium">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-700"></span>
              Positive: {sentiment_distribution.positive_pct}% ({sentiment_distribution.positive})
            </span>
            <span className="flex items-center gap-1.5 text-zinc-600 font-medium">
              <span className="w-2.5 h-2.5 rounded-xs bg-zinc-400"></span>
              Neutral: {sentiment_distribution.neutral_pct}% ({sentiment_distribution.neutral})
            </span>
            <span className="flex items-center gap-1.5 text-rose-800 font-medium">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-700"></span>
              Critical: {sentiment_distribution.negative_pct}% ({sentiment_distribution.negative})
            </span>
          </div>
        </div>

        {/* Quiet Stacked Bar */}
        <div className="w-full h-2.5 rounded-sm bg-zinc-100 overflow-hidden flex border border-[#E2E2DC]">
          <div
            style={{ width: `${sentiment_distribution.positive_pct}%` }}
            className="bg-emerald-700 transition-all duration-300"
            title={`Positive: ${sentiment_distribution.positive} reports (${sentiment_distribution.positive_pct}%)`}
          />
          <div
            style={{ width: `${sentiment_distribution.neutral_pct}%` }}
            className="bg-zinc-400 transition-all duration-300"
            title={`Neutral: ${sentiment_distribution.neutral} reports (${sentiment_distribution.neutral_pct}%)`}
          />
          <div
            style={{ width: `${sentiment_distribution.negative_pct}%` }}
            className="bg-rose-700 transition-all duration-300"
            title={`Critical: ${sentiment_distribution.negative} reports (${sentiment_distribution.negative_pct}%)`}
          />
        </div>
      </div>

      {/* 3. Grid: Parties Share of Voice & Key Leaders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Parties Editorial Table */}
        <div className="bg-white border border-[#E8E8E2] rounded-lg p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#F0F0EB]">
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-zinc-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                Party Share of Voice & Sentiment
              </h2>
            </div>
            <span className="text-[11px] text-zinc-600">Click to filter news</span>
          </div>

          <div className="divide-y divide-[#F2F2ED]">
            {party_metrics.map((pm) => {
              const pct = filtered_articles > 0 ? Math.round((pm.article_count / filtered_articles) * 100) : 0;
              return (
                <div
                  key={pm.party_code}
                  onClick={() => onSelectParty(pm.party_code)}
                  className="py-2.5 px-1.5 hover:bg-[#F9F9F7] rounded cursor-pointer transition-colors flex items-center justify-between gap-2 sm:gap-3 group"
                >
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: pm.color }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="text-xs font-bold text-zinc-900 group-hover:text-zinc-600">
                          {pm.party_code}
                        </span>
                        <span className="text-[11px] text-zinc-500 font-tamil truncate max-w-[100px] sm:max-w-[240px]">
                          {pm.tamil_name}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-4 shrink-0 font-mono text-xs">
                    <span className="text-zinc-500 font-medium hidden sm:inline">
                      {pm.article_count} reports
                    </span>
                    <span className="text-zinc-500 font-medium sm:hidden text-[11px]">
                      {pm.article_count}
                    </span>
                    <span className="w-8 sm:w-10 text-right font-bold text-zinc-800">
                      {pct}%
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        pm.sentiment_score >= 0.15
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : pm.sentiment_score <= -0.15
                          ? "bg-rose-50 text-rose-800 border border-rose-200"
                          : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                      }`}
                    >
                      {pm.sentiment_score > 0 ? `+${pm.sentiment_score}` : pm.sentiment_score}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Leaders Editorial Table */}
        <div className="bg-white border border-[#E8E8E2] rounded-lg p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#F0F0EB]">
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-zinc-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                Key Leaders in the News
              </h2>
            </div>
            <span className="text-[11px] text-zinc-600">Click to filter news</span>
          </div>

          <div className="divide-y divide-[#F2F2ED]">
            {leader_metrics.map((lm) => (
              <div
                key={lm.name}
                onClick={() => onSelectLeader(lm.name)}
                className="py-2.5 px-1.5 hover:bg-[#F9F9F7] rounded cursor-pointer transition-colors flex items-center justify-between gap-2 sm:gap-3 group"
              >
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded bg-zinc-100 text-zinc-700 flex items-center justify-center text-[10px] font-bold font-mono shrink-0 border border-zinc-200">
                    {lm.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="text-xs font-bold text-zinc-900 group-hover:text-zinc-600 truncate max-w-[100px] sm:max-w-none">
                        {lm.name}
                      </span>
                      <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-zinc-100 text-zinc-600 border border-zinc-200">
                        {lm.party_code}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-500 font-tamil block leading-tight truncate max-w-[120px] sm:max-w-none">
                      {lm.tamil_name}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 shrink-0 font-mono text-xs">
                  <span className="text-zinc-900 font-bold hidden sm:inline">
                    {lm.article_count} reports
                  </span>
                  <span className="text-zinc-900 font-bold sm:hidden text-[11px]">
                    {lm.article_count}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] font-bold">
                    <span className="text-emerald-800">+{lm.positive_count}</span>
                    <span className="text-zinc-400">/</span>
                    <span className="text-rose-800">-{lm.negative_count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Publishing Trend & Hot Topics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coverage Trend Chart (2 cols) */}
        <div className="lg:col-span-2 min-w-0 bg-white border border-[#E8E8E2] rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-2.5 border-b border-[#F0F0EB]">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-zinc-600" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                    Media Coverage Trend Over Time
                  </h2>
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-2">
                  <span>Showing {visibleTrends.length} cycles (hover bar for metrics breakdown)</span>
                  <span className="text-zinc-400 hidden sm:inline">• Peak: {maxTotal} items/day</span>
                </p>
              </div>

              {/* Time Range Selector */}
              <div className="flex items-center bg-[#F4F4F0] p-0.5 rounded border border-[#E2E2DC] text-xs">
                {[
                  { label: "7 Days", value: "7d" },
                  { label: "14 Days", value: "14d" },
                  { label: "30 Days", value: "30d" },
                  { label: `All (${daily_trends.length})`, value: "all" },
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setTimeRange(item.value as any)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                      timeRange === item.value
                        ? "bg-zinc-900 text-white shadow-2xs font-bold"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Responsive Chart */}
            {visibleTrends.length === 0 ? (
              <div className="h-52 flex flex-col items-center justify-center text-zinc-400 gap-2 border border-dashed border-[#E8E8E2] rounded-lg">
                <TrendingUp className="w-8 h-8 text-zinc-300" />
                <span className="text-xs font-semibold">No media coverage trend data available</span>
              </div>
            ) : (
              <div
                ref={scrollContainerRef}
                className="w-full min-w-0 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-200"
              >
                <div
                  className="h-52 flex items-end gap-2 sm:gap-2.5 pt-8 pb-1 px-2"
                  style={{
                    minWidth: visibleTrends.length > 14 ? `${visibleTrends.length * 36}px` : "100%",
                  }}
                >
                  {visibleTrends.map((item, idx) => {
                    const heightPct = Math.max(12, Math.min(100, Math.round((item.total / maxTotal) * 100)));
                    const negPct = item.total > 0 ? Math.min(100, Math.round((item.negative / item.total) * 100)) : 0;

                    const step = Math.ceil(visibleTrends.length / 10);
                    const showLabel = visibleTrends.length <= 14 || idx % step === 0 || idx === visibleTrends.length - 1;
                    const isHovered = hoveredItem?.date === item.date;

                    return (
                      <div
                        key={item.date}
                        onMouseEnter={() => setHoveredItem(item)}
                        onMouseLeave={() => setHoveredItem(null)}
                        className="flex-1 flex flex-col items-center gap-2 relative group h-full justify-end cursor-pointer"
                      >
                        {/* Clamped Hover Tooltip directly above bar */}
                        {isHovered && (
                          <div
                            className={`absolute -top-14 z-30 pointer-events-none bg-zinc-900 text-white text-[11px] rounded px-2.5 py-1.5 shadow-xl whitespace-nowrap transition-all duration-150 border border-zinc-700 ${
                              idx < 2 ? "left-0" : idx > visibleTrends.length - 3 ? "right-0" : "left-1/2 -translate-x-1/2"
                            }`}
                          >
                            <div className="font-bold flex items-center gap-1.5">
                              <span>{formatFullDate(item.date)}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono font-normal">
                                {item.total} {item.total === 1 ? "report" : "reports"}
                              </span>
                            </div>
                            <div className="text-zinc-300 font-mono flex items-center gap-2 mt-0.5 text-[10px]">
                              <span className="text-emerald-400">+{item.positive} Pos</span>
                              <span className="text-zinc-400">{item.neutral} Neu</span>
                              <span className="text-rose-400">-{item.negative} Neg</span>
                            </div>
                          </div>
                        )}

                        {/* Bar Value on Hover */}
                        <div className={`text-[10px] text-zinc-700 font-mono font-bold transition-opacity ${isHovered ? "opacity-100" : "opacity-0"}`}>
                          {item.total}
                        </div>

                        {/* Dynamic Editorial Bar */}
                        <div
                          style={{ height: `${heightPct}%` }}
                          className={`w-full max-w-[38px] min-w-[8px] bg-zinc-800 rounded-t-sm relative flex flex-col justify-end overflow-hidden transition-all shadow-2xs ${
                            isHovered ? "bg-zinc-950 ring-2 ring-zinc-400" : "group-hover:bg-zinc-700"
                          }`}
                        >
                          {negPct > 0 && (
                            <div
                              style={{ height: `${negPct}%` }}
                              className="w-full bg-rose-700"
                              title={`${item.negative} critical reports`}
                            />
                          )}
                        </div>

                        {/* Date Tick Label */}
                        <div className="h-5 flex items-center justify-center">
                          {showLabel ? (
                            <span className="text-[11px] font-mono text-zinc-600 font-semibold whitespace-nowrap">
                              {formatDateLabel(item.date)}
                            </span>
                          ) : (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-zinc-300 my-1 group-hover:bg-zinc-700 transition-colors"
                              title={formatDateLabel(item.date)}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hot Topics (1 col) */}
        <div className="bg-white border border-[#E8E8E2] rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#F0F0EB]">
            <div className="flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-zinc-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                Hot Political Topics
              </h2>
            </div>
            <span className="text-[11px] text-zinc-600">Ranking</span>
          </div>

          {top_topics.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-zinc-400 py-6">
              No topics recorded for current filter
            </div>
          ) : (
            <div className="space-y-2">
              {top_topics.slice(0, 6).map((item, idx) => {
                const topicPct = filtered_articles > 0 ? Math.round((item.count / filtered_articles) * 100) : 0;
                return (
                  <div
                    key={item.topic}
                    onClick={() => onSelectTopic && onSelectTopic(item.topic)}
                    className="p-2.5 rounded hover:bg-[#F9F9F7] border border-transparent hover:border-[#E8E8E2] transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[11px] font-mono font-bold text-zinc-500 w-5 shrink-0">
                        0{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-zinc-800 group-hover:text-zinc-900 truncate">
                        {item.topic}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                      <span className="font-bold text-zinc-900">{item.count}</span>
                      <span className="text-[10px] text-zinc-500">({topicPct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Data Integrity Notice */}
      <div className="p-4 sm:p-5 rounded-xl bg-zinc-100/70 border border-[#E8E8E2] text-xs text-zinc-600 leading-relaxed space-y-2">
        <div>
          <span className="font-bold text-zinc-900">Data Integrity Notice: </span>
          {disclaimer}
        </div>
        {metrics.polling_interval_desc && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#E8E8E2] text-[11px] text-zinc-500 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              <span>{metrics.polling_interval_desc}</span>
            </span>
            {metrics.last_collection_at && (
              <span>
                • Last Feed Poll:{" "}
                <strong className="text-zinc-800">
                  {new Date(metrics.last_collection_at).toLocaleString("en-IN", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </strong>
              </span>
            )}
            {metrics.latest_publication_at && (
              <span>
                • Latest Article Pub:{" "}
                <strong className="text-zinc-800">
                  {new Date(metrics.latest_publication_at).toLocaleString("en-IN", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </strong>
              </span>
            )}
            {metrics.data_sources && metrics.data_sources.length > 0 && (
              <span>
                • Sources: <strong className="text-zinc-800">{metrics.data_sources.length}</strong>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
