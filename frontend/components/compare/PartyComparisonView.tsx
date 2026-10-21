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
} from "../../types/political";
import { compareEntities } from "../../lib/api";

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
      <div className="bg-surface border border-line rounded-xl p-4 sm:p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-line">
          <div>
            <div className="flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-ink-soft" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-ink">
                Comparative Political Intelligence
              </h2>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              Side-by-side media volume, sentiment polarity, and issue focus across Tamil publishers
            </p>
          </div>

          {/* Type Toggle: Party vs Leader */}
          <div className="flex items-center p-0.5 bg-subtle border border-line rounded-md">
            <button
              onClick={() => handleTypeChange("party")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                compareType === "party"
                  ? "bg-ink text-white font-bold shadow-card"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Parties</span>
            </button>
            <button
              onClick={() => handleTypeChange("leader")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                compareType === "leader"
                  ? "bg-ink text-white font-bold shadow-card"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Key Leaders</span>
            </button>
          </div>
        </div>

        {/* Multi-Select Entity Chips */}
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted block mb-2">
            Select entities to compare (Pick 2 to 4):
          </span>
          <div className="flex flex-wrap gap-2">
            {compareType === "party"
              ? parties.map((p) => {
                  const isSelected = selectedIds.includes(p.code);
                  return (
                    <button
                      key={p.code}
                      onClick={() => toggleEntity(p.code)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-ink text-white border-zinc-900 shadow-card"
                          : "bg-canvas text-ink-soft border-line hover:border-line-strong hover:text-ink"
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                      <span>{p.code}</span>
                      {isSelected && <Check className="w-3 h-3 text-white ml-0.5" />}
                    </button>
                  );
                })
              : leaders.map((l) => {
                  const isSelected = selectedIds.includes(l.id);
                  return (
                    <button
                      key={l.id}
                      onClick={() => toggleEntity(l.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-ink text-white border-zinc-900 shadow-card"
                          : "bg-canvas text-ink-soft border-line hover:border-line-strong hover:text-ink"
                      }`}
                    >
                      <span>{l.name}</span>
                      <span className="text-[10px] opacity-75">({l.party_code})</span>
                      {isSelected && <Check className="w-3 h-3 text-white ml-0.5" />}
                    </button>
                  );
                })}
          </div>
        </div>
      </div>

      {/* Comparison Grid */}
      {loading ? (
        <div className="p-16 text-center text-ink-muted bg-surface border border-line rounded-xl">
          <div className="w-6 h-6 border-2 border-zinc-800 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs font-medium">Computing comparative analytics...</p>
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
          {data.comparison.map((item) => (
            <div
              key={item.id}
              className="bg-surface border border-line rounded-xl p-4 sm:p-5 shadow-card space-y-4 flex flex-col justify-between transition-colors"
            >
              <div>
                {/* Entity Header */}
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-line">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <h3 className="text-sm font-bold text-ink tracking-tight">
                        {item.name}
                      </h3>
                    </div>
                    <p className="text-xs text-ink-muted font-tamil mt-0.5">
                      {item.tamil_name}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-subtle border border-line text-ink">
                    {item.article_count} reports
                  </span>
                </div>

                {/* Sentiment Breakdown */}
                <div className="mt-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-soft font-medium">Average Polarity</span>
                    <span
                      className={`font-mono font-bold ${
                        item.average_sentiment_score >= 0.15
                          ? "text-emerald-800"
                          : item.average_sentiment_score <= -0.15
                          ? "text-rose-800"
                          : "text-ink-soft"
                      }`}
                    >
                      {item.average_sentiment_score > 0
                        ? `+${item.average_sentiment_score}`
                        : item.average_sentiment_score}
                    </span>
                  </div>

                  {/* Stacked Sentiment Bar */}
                  <div className="w-full h-2 rounded-xs bg-subtle overflow-hidden flex border border-line">
                    <div
                      style={{ width: `${item.sentiment.positive_pct}%` }}
                      className="bg-emerald-700"
                      title={`Positive: ${item.sentiment.positive_pct}%`}
                    />
                    <div
                      style={{ width: `${item.sentiment.neutral_pct}%` }}
                      className="bg-zinc-400"
                      title={`Neutral: ${item.sentiment.neutral_pct}%`}
                    />
                    <div
                      style={{ width: `${item.sentiment.negative_pct}%` }}
                      className="bg-rose-700"
                      title={`Critical: ${item.sentiment.negative_pct}%`}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] font-mono text-ink-muted font-medium">
                    <span className="text-emerald-800">Pos: {item.sentiment.positive_pct}%</span>
                    <span>Neu: {item.sentiment.neutral_pct}%</span>
                    <span className="text-rose-800">Neg: {item.sentiment.negative_pct}%</span>
                  </div>
                </div>

                {/* Estimated Total Reach */}
                <div className="mt-3.5 p-2.5 rounded bg-canvas border border-line flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-ink-soft font-medium">
                    <Eye className="w-3.5 h-3.5 text-ink-muted" />
                    <span>Est. Total Impressions</span>
                  </div>
                  <span className="text-xs font-bold font-mono text-ink">
                    {(item.estimated_total_reach / 1000).toFixed(1)}k
                  </span>
                </div>

                {/* Top Strategic Issues */}
                <div className="mt-3.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-ink-muted font-bold block mb-1.5">
                    Top Discussion Topics
                  </span>
                  <div className="space-y-1.5">
                    {item.top_topics.map((t) => (
                      <div
                        key={t.topic}
                        className="flex items-center justify-between text-xs py-1 px-2.5 rounded bg-canvas border border-line"
                      >
                        <span className="text-ink truncate max-w-[210px]">{t.topic}</span>
                        <span className="text-ink font-mono font-bold text-xs">
                          {t.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Key Recent Articles */}
                <div className="mt-3.5 pt-3 border-t border-line">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-ink-muted font-bold block mb-1.5">
                    Recent Significant Reports
                  </span>
                  <div className="space-y-2">
                    {item.recent_articles.map((art) => (
                      <div
                        key={art.id}
                        className="p-2.5 rounded bg-canvas hover:bg-subtle border border-line cursor-pointer transition-colors"
                        onClick={() => onOpenArticle(art)}
                      >
                        <p className="text-xs font-tamil font-bold text-ink leading-snug line-clamp-2 hover:text-ink-soft">
                          {art.tamil_title}
                        </p>
                        <div className="flex items-center justify-between mt-1 text-[10px] text-ink-muted font-mono">
                          <span className="font-semibold uppercase">{art.source}</span>
                          <span className="capitalize">{art.sentiment}</span>
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

      {/* Methodology Note */}
      {data && (
        <div className="p-3.5 rounded-lg bg-canvas border border-line text-xs text-ink-soft flex items-start gap-2.5">
          <Info className="w-3.5 h-3.5 text-ink-soft shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-ink">Measurement Methodology: </span>
            <span>{data.methodology}</span>
          </div>
        </div>
      )}
    </div>
  );
}
