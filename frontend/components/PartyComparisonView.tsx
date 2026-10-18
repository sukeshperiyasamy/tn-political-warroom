"use client";

import React, { useState, useEffect } from "react";
import {
  GitCompare,
  Eye,
  Info,
  Check,
  Layers,
  Users,
} from "lucide-react";
import {
  PoliticalParty,
  PoliticalLeader,
  CompareResponse,
  NewsArticle,
} from "../types/political";
import { compareEntities } from "../lib/api";

interface PartyComparisonViewProps {
  parties: PoliticalParty[];
  leaders: PoliticalLeader[];
  onOpenArticle: (article: NewsArticle) => void;
  onCreateCard: (article: NewsArticle) => void;
  mode?: "live" | "demo";
}

export function PartyComparisonView({
  parties,
  leaders,
  onOpenArticle,
  onCreateCard,
  mode = "live",
}: PartyComparisonViewProps) {
  const [compareType, setCompareType] = useState<"party" | "leader">("party");
  const [selectedIds, setSelectedIds] = useState<string[]>(["DMK", "AIADMK", "TVK"]);
  const [data, setData] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Switch comparison type
  const handleTypeChange = (type: "party" | "leader") => {
    setCompareType(type);
    if (type === "party") {
      setSelectedIds(["DMK", "AIADMK", "TVK"]);
    } else {
      setSelectedIds(["mk_stalin", "eps", "vijay"]);
    }
  };

  // Toggle entity selection
  const toggleEntity = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 1) {
        setSelectedIds(selectedIds.filter((item) => item !== id));
      }
    } else {
      if (selectedIds.length < 4) {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    compareEntities(compareType, selectedIds, mode)
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [compareType, selectedIds, mode]);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                <GitCompare className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-slate-900">
                Comparative Political Intelligence
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Side-by-side media share of voice, sentiment polarity, and issue focus
            </p>
          </div>

          {/* Type Toggle: Party vs Leader */}
          <div className="flex items-center p-1.5 bg-slate-100 border border-slate-200 rounded-xl">
            <button
              onClick={() => handleTypeChange("party")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                compareType === "party"
                  ? "bg-slate-900 text-white shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Political Parties</span>
            </button>
            <button
              onClick={() => handleTypeChange("leader")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                compareType === "leader"
                  ? "bg-slate-900 text-white shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Key Leaders</span>
            </button>
          </div>
        </div>

        {/* Multi-Select Entity Chips */}
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold block mb-2.5">
            Select entities to compare (Pick 2 to 4):
          </span>
          <div className="flex flex-wrap gap-2.5">
            {compareType === "party"
              ? parties.map((p) => {
                  const isSelected = selectedIds.includes(p.code);
                  return (
                    <button
                      key={p.code}
                      onClick={() => toggleEntity(p.code)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-blue-50 text-blue-900 border-blue-500 shadow-2xs font-bold"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:text-slate-900"
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: p.color }}
                      />
                      <span>{p.code}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-700 ml-1" />}
                    </button>
                  );
                })
              : leaders.map((l) => {
                  const isSelected = selectedIds.includes(l.id);
                  return (
                    <button
                      key={l.id}
                      onClick={() => toggleEntity(l.id)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-blue-50 text-blue-900 border-blue-500 shadow-2xs font-bold"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:text-slate-900"
                      }`}
                    >
                      <span>{l.name}</span>
                      <span className="text-xs text-slate-500 font-normal">({l.party_code})</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-700 ml-1" />}
                    </button>
                  );
                })}
          </div>
        </div>
      </div>

      {/* Comparison Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-500 bg-white border border-slate-200 rounded-xl">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs sm:text-sm font-medium">Computing comparative analytics...</p>
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
          {data.comparison.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-4 flex flex-col justify-between hover:shadow-md transition-all"
            >
              <div>
                {/* Entity Header */}
                <div className="flex items-start justify-between gap-2 pb-3.5 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: item.color }}
                      />
                      <h3 className="text-base font-bold text-slate-900 tracking-tight">
                        {item.name}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 font-tamil mt-1">
                      {item.tamil_name}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-slate-100 border border-slate-200 text-slate-800">
                    {item.article_count} items
                  </span>
                </div>

                {/* Sentiment Breakdown */}
                <div className="mt-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-slate-600 font-medium">Average Polarity</span>
                    <span
                      className={`font-mono font-bold ${
                        item.average_sentiment_score >= 0.2
                          ? "text-emerald-700"
                          : item.average_sentiment_score <= -0.2
                          ? "text-rose-700"
                          : "text-slate-700"
                      }`}
                    >
                      {item.average_sentiment_score > 0
                        ? `+${item.average_sentiment_score}`
                        : item.average_sentiment_score}
                    </span>
                  </div>

                  {/* Stacked Sentiment Bar */}
                  <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex border border-slate-200/80 shadow-inner">
                    <div
                      style={{ width: `${item.sentiment.positive_pct}%` }}
                      className="bg-emerald-500"
                      title={`Positive: ${item.sentiment.positive_pct}%`}
                    />
                    <div
                      style={{ width: `${item.sentiment.neutral_pct}%` }}
                      className="bg-slate-300"
                      title={`Neutral: ${item.sentiment.neutral_pct}%`}
                    />
                    <div
                      style={{ width: `${item.sentiment.negative_pct}%` }}
                      className="bg-rose-500"
                      title={`Negative: ${item.sentiment.negative_pct}%`}
                    />
                  </div>

                  <div className="flex justify-between text-xs font-mono text-slate-500 font-medium">
                    <span className="text-emerald-700 font-semibold">Pos: {item.sentiment.positive_pct}%</span>
                    <span className="text-slate-500">Neu: {item.sentiment.neutral_pct}%</span>
                    <span className="text-rose-700 font-semibold">Neg: {item.sentiment.negative_pct}%</span>
                  </div>
                </div>

                {/* Estimated Total Reach */}
                <div className="mt-4 p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-700 font-medium">
                    <Eye className="w-4 h-4 text-blue-600" />
                    <span>Est. Total Impressions</span>
                  </div>
                  <span className="text-sm sm:text-base font-bold font-mono text-slate-900">
                    {(item.estimated_total_reach / 1000).toFixed(1)}k
                  </span>
                </div>

                {/* Top Strategic Issues */}
                <div className="mt-4">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold block mb-2">
                    Top Discussion Topics
                  </span>
                  <div className="space-y-2">
                    {item.top_topics.map((t) => (
                      <div
                        key={t.topic}
                        className="flex items-center justify-between text-xs sm:text-sm py-1.5 px-3 rounded-lg bg-slate-50 border border-slate-200"
                      >
                        <span className="text-slate-800 font-medium truncate max-w-[210px]">{t.topic}</span>
                        <span className="text-slate-900 font-mono font-bold text-xs">
                          {t.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Key Recent Articles */}
                <div className="mt-4 pt-3.5 border-t border-slate-100">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold block mb-2">
                    Recent Significant Reports
                  </span>
                  <div className="space-y-2.5">
                    {item.recent_articles.map((art) => (
                      <div
                        key={art.id}
                        className="p-3 rounded-lg bg-slate-50 hover:bg-slate-100/90 border border-slate-200 cursor-pointer transition-colors"
                        onClick={() => onOpenArticle(art)}
                      >
                        <p className="text-xs sm:text-sm font-tamil font-bold text-slate-900 leading-snug line-clamp-2 hover:text-blue-700">
                          {art.tamil_title}
                        </p>
                        <div className="flex items-center justify-between mt-1.5 text-xs text-slate-500">
                          <span className="font-semibold">{art.source}</span>
                          <span className="capitalize font-bold">{art.sentiment}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Methodology Card */}
      {data && (
        <div className="p-4 rounded-xl bg-slate-100/70 border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-900">Measurement Methodology: </span>
            <span>{data.methodology}</span>
          </div>
        </div>
      )}
    </div>
  );
}
