"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  TrendingUp,
  Smile,
  Frown,
  Activity,
  Layers,
  Users,
  Award,
  Calendar,
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
}

export function MetricsOverview({
  metrics,
  onSelectParty,
  onSelectLeader,
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

  // Auto-scroll to the latest date on mount or when range changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [visibleTrends, timeRange]);

  const maxTotal = useMemo(() => {
    if (!visibleTrends || visibleTrends.length === 0) return 1;
    return Math.max(...visibleTrends.map((d) => d.total), 1);
  }, [visibleTrends]);

  return (
    <div className="space-y-7 mb-10">
      {/* Editorial Intelligence Stat Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Articles */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs relative overflow-hidden transition-all hover:border-slate-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Articles Monitored
            </span>
            <span className="p-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 font-mono">
              {filtered_articles}
            </span>
            <span className="text-xs sm:text-sm text-slate-500 font-medium">political reports</span>
          </div>
          <div className="mt-3.5 flex items-center gap-2 text-xs text-emerald-800 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Real-time pipeline active across 8 media portals</span>
          </div>
        </div>

        {/* Positive Sentiment */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs relative overflow-hidden transition-all hover:border-slate-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Positive Sentiment
            </span>
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
              <Smile className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-emerald-700 font-mono">
              {sentiment_distribution.positive_pct}%
            </span>
            <span className="text-xs sm:text-sm text-slate-500 font-medium">({sentiment_distribution.positive} articles)</span>
          </div>
          <p className="mt-3.5 text-xs text-slate-500 leading-snug">
            Favorable policy announcements and welfare rollouts
          </p>
        </div>

        {/* Negative / Critical Sentiment */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs relative overflow-hidden transition-all hover:border-slate-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Critical / Opposition Tone
            </span>
            <span className="p-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-100">
              <Frown className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-rose-700 font-mono">
              {sentiment_distribution.negative_pct}%
            </span>
            <span className="text-xs sm:text-sm text-slate-500 font-medium">({sentiment_distribution.negative} articles)</span>
          </div>
          <p className="mt-3.5 text-xs text-slate-500 leading-snug">
            Opposition rallies, tariff critique, and whitepaper releases
          </p>
        </div>

        {/* Leading Share of Voice */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs relative overflow-hidden transition-all hover:border-slate-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Leading Share of Voice
            </span>
            <span className="p-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 truncate">
              {party_metrics[0]?.name.split(" ")[0] || "DMK"}
            </span>
            <span className="text-xs sm:text-sm text-slate-500 font-mono font-medium">
              ({party_metrics[0]?.article_count || 0} items)
            </span>
          </div>
          <p className="mt-3.5 text-xs text-slate-500 font-tamil truncate">
            {party_metrics[0]?.tamil_name || "திராவிட முன்னேற்றக் கழகம்"}
          </p>
        </div>
      </div>

      {/* Sentiment Distribution Spectrum */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900">
              Tamil Nadu Media Sentiment Distribution
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Aggregated editorial polarity across published political reports
            </p>
          </div>
          <div className="flex items-center gap-5 text-xs sm:text-sm font-mono">
            <span className="flex items-center gap-2 text-emerald-800 font-bold">
              <span className="w-3 h-3 rounded-xs bg-emerald-600"></span>
              Positive: {sentiment_distribution.positive_pct}%
            </span>
            <span className="flex items-center gap-2 text-slate-700 font-bold">
              <span className="w-3 h-3 rounded-xs bg-slate-400"></span>
              Neutral: {sentiment_distribution.neutral_pct}%
            </span>
            <span className="flex items-center gap-2 text-rose-800 font-bold">
              <span className="w-3 h-3 rounded-xs bg-rose-600"></span>
              Negative: {sentiment_distribution.negative_pct}%
            </span>
          </div>
        </div>

        {/* Stacked Sentiment Spectrum Bar */}
        <div className="w-full h-3.5 rounded-full bg-slate-100 overflow-hidden flex border border-slate-200/80 shadow-inner">
          <div
            style={{ width: `${sentiment_distribution.positive_pct}%` }}
            className="bg-emerald-500 transition-all duration-500 relative group"
            title={`Positive: ${sentiment_distribution.positive} articles`}
          />
          <div
            style={{ width: `${sentiment_distribution.neutral_pct}%` }}
            className="bg-slate-300 transition-all duration-500 relative group"
            title={`Neutral: ${sentiment_distribution.neutral} articles`}
          />
          <div
            style={{ width: `${sentiment_distribution.negative_pct}%` }}
            className="bg-rose-500 transition-all duration-500 relative group"
            title={`Negative: ${sentiment_distribution.negative} articles`}
          />
        </div>
      </div>

      {/* Grid: Parties Breakdown & Leaders Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Parties Monitored */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-blue-700" />
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900">
                Party Share of Voice & Sentiment
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">Click party to filter</span>
          </div>

          <div className="space-y-3">
            {party_metrics.map((pm) => (
              <div
                key={pm.party_code}
                onClick={() => onSelectParty(pm.party_code)}
                className="group p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200 hover:border-slate-300 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: pm.color }}
                    />
                    <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                      {pm.party_code}
                    </span>
                    <span className="text-xs text-slate-500 font-tamil truncate max-w-[220px]">
                      {pm.tamil_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 font-mono text-xs sm:text-sm">
                    <span className="text-slate-600 font-medium">{pm.article_count} items</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        pm.sentiment_score >= 0.2
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : pm.sentiment_score <= -0.2
                          ? "bg-rose-50 text-rose-800 border border-rose-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      Score: {pm.sentiment_score > 0 ? `+${pm.sentiment_score}` : pm.sentiment_score}
                    </span>
                  </div>
                </div>

                {/* Micro sentiment bar */}
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${(pm.positive_count / pm.article_count) * 100}%` }}
                    className="bg-emerald-500"
                  />
                  <div
                    style={{ width: `${(pm.neutral_count / pm.article_count) * 100}%` }}
                    className="bg-slate-300"
                  />
                  <div
                    style={{ width: `${(pm.negative_count / pm.article_count) * 100}%` }}
                    className="bg-rose-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Leaders Monitored */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-blue-700" />
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900">
                Key Leaders in the News
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">Click leader to filter</span>
          </div>

          <div className="space-y-3">
            {leader_metrics.map((lm) => (
              <div
                key={lm.name}
                onClick={() => onSelectLeader(lm.name)}
                className="group p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200 hover:border-slate-300 cursor-pointer transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center text-xs font-bold font-mono">
                    {lm.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                        {lm.name}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs bg-slate-200/90 text-slate-700 font-mono font-bold">
                        {lm.party_code}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 font-tamil">
                      {lm.tamil_name}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
                    {lm.article_count} articles
                  </span>
                  <div className="flex items-center gap-1.5 justify-end text-xs font-mono font-bold">
                    <span className="text-emerald-700">+{lm.positive_count}</span>
                    <span className="text-slate-400">/</span>
                    <span className="text-rose-700">-{lm.negative_count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Publishing Trend & Strategic Topics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Graph (2 cols) */}
        <div className="lg:col-span-2 min-w-0 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900">
                  Media Coverage Trend Over Time
                </h3>
              </div>

              {/* Time Range Selector */}
              {daily_trends.length > 7 && (
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold text-slate-600">
                  <button
                    type="button"
                    onClick={() => setTimeRange("7d")}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      timeRange === "7d"
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "hover:text-slate-900"
                    }`}
                  >
                    7D
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeRange("14d")}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      timeRange === "14d"
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "hover:text-slate-900"
                    }`}
                  >
                    14D
                  </button>
                  {daily_trends.length > 14 && (
                    <button
                      type="button"
                      onClick={() => setTimeRange("30d")}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        timeRange === "30d"
                          ? "bg-white text-slate-900 shadow-2xs font-bold"
                          : "hover:text-slate-900"
                      }`}
                    >
                      30D
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setTimeRange("all")}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      timeRange === "all"
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "hover:text-slate-900"
                    }`}
                  >
                    All ({daily_trends.length})
                  </button>
                </div>
              )}
            </div>

            {/* Sub-header Inspection State */}
            <div className="flex items-center justify-between text-xs text-slate-500 font-mono mb-4 px-1 min-h-[22px]">
              {hoveredItem ? (
                <div className="flex items-center gap-2 text-slate-800 font-semibold animate-fadeIn">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <span>{formatFullDate(hoveredItem.date)}:</span>
                  <span className="font-bold text-slate-900 font-mono">{hoveredItem.total} articles</span>
                  <span className="text-emerald-700">+{hoveredItem.positive} pos</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600">{hoveredItem.neutral} neu</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-rose-700">-{hoveredItem.negative} neg</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Showing {visibleTrends.length} cycles (hover bar for metrics breakdown)</span>
                </div>
              )}
              <span className="text-slate-400 hidden sm:inline">
                Peak: {maxTotal} items/day
              </span>
            </div>
          </div>

          {/* Chart Canvas Area */}
          {visibleTrends.length === 0 ? (
            <div className="h-52 flex flex-col items-center justify-center text-slate-400 gap-2 border border-dashed border-slate-200 rounded-lg">
              <TrendingUp className="w-8 h-8 text-slate-300" />
              <span className="text-xs font-semibold">No media coverage trend data available</span>
            </div>
          ) : (
            <div
              ref={scrollContainerRef}
              className="w-full min-w-0 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200"
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
                  
                  // Label cadence: if <= 14 items, show all; otherwise show every Nth and the last item
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
                          className={`absolute -top-14 z-30 pointer-events-none bg-slate-900 text-white text-[11px] rounded-lg px-2.5 py-1.5 shadow-xl whitespace-nowrap transition-all duration-150 ${
                            idx < 2 ? "left-0" : idx > visibleTrends.length - 3 ? "right-0" : "left-1/2 -translate-x-1/2"
                          }`}
                        >
                          <div className="font-bold flex items-center gap-1.5">
                            <span>{formatFullDate(item.date)}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono font-normal">
                              {item.total} {item.total === 1 ? "report" : "reports"}
                            </span>
                          </div>
                          <div className="text-slate-300 font-mono flex items-center gap-2 mt-0.5 text-[10px]">
                            <span className="text-emerald-400">+{item.positive} Pos</span>
                            <span className="text-slate-400">{item.neutral} Neu</span>
                            <span className="text-rose-400">-{item.negative} Neg</span>
                          </div>
                        </div>
                      )}

                      {/* Bar Value on Hover */}
                      <div className={`text-[10px] text-slate-700 font-mono font-bold transition-opacity ${isHovered ? "opacity-100" : "opacity-0"}`}>
                        {item.total}
                      </div>

                      {/* Dynamic Bar Element */}
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full max-w-[38px] min-w-[8px] bg-gradient-to-t from-blue-700 to-indigo-600 rounded-t-md relative flex flex-col justify-end overflow-hidden transition-all shadow-xs ${
                          isHovered ? "brightness-125 ring-2 ring-blue-500 ring-offset-1" : "group-hover:brightness-110"
                        }`}
                      >
                        {negPct > 0 && (
                          <div
                            style={{ height: `${negPct}%` }}
                            className="w-full bg-rose-500/95"
                            title={`${item.negative} critical reports`}
                          />
                        )}
                      </div>

                      {/* Date Tick Label */}
                      <div className="h-5 flex items-center justify-center">
                        {showLabel ? (
                          <span className="text-[11px] font-mono text-slate-600 font-semibold whitespace-nowrap">
                            {formatDateLabel(item.date)}
                          </span>
                        ) : (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-slate-300 my-1 group-hover:bg-blue-500 transition-colors"
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

        {/* Hot Political Topics (1 col) */}
        <div className="lg:col-span-1 min-w-0 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-slate-100">
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900">
              Hot Political Topics
            </h3>
            <span className="text-xs text-slate-400 font-medium">Ranked by volume</span>
          </div>

          {top_topics.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400 py-6">
              No topics recorded for current filter
            </div>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {top_topics.map((t) => (
                <div
                  key={t.topic}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 hover:border-slate-300 hover:text-blue-700 transition-colors"
                >
                  <span className="font-semibold">{t.topic}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-200 text-slate-800">
                    {t.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Data Integrity Notice */}
      <div className="p-4 sm:p-5 rounded-xl bg-slate-100/70 border border-slate-200 text-xs text-slate-600 leading-relaxed space-y-2">
        <div>
          <span className="font-bold text-slate-900">Data Integrity Notice: </span>
          {disclaimer}
        </div>
        {metrics.polling_interval_desc && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200/80 text-[11px] text-slate-500 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{metrics.polling_interval_desc}</span>
            </span>
            {metrics.last_collection_at && (
              <span>
                • Last Feed Poll:{" "}
                <strong className="text-slate-700">
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
                <strong className="text-blue-700">
                  {new Date(metrics.latest_publication_at).toLocaleString("en-IN", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </strong>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
