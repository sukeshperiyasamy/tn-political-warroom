"use client";

import React from "react";
import {
  ExternalLink,
  Sparkles,
  Share2,
  Eye,
  Calendar,
  Smile,
  Meh,
  Frown,
  ArrowRight,
} from "lucide-react";
import { NewsArticle } from "../types/political";

interface ArticleCardProps {
  article: NewsArticle;
  onOpenIntelligence: (article: NewsArticle) => void;
  onCreateCard: (article: NewsArticle) => void;
}

export function ArticleCard({
  article,
  onOpenIntelligence,
  onCreateCard,
}: ArticleCardProps) {
  const {
    tamil_title,
    title,
    summary,
    source,
    source_url,
    published_at,
    party_codes,
    leader_names,
    sentiment,
    sentiment_score,
    topics,
    engagement_estimated,
    data_status,
  } = article;

  const dateFormatted = new Date(published_at).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <article className="group bg-white hover:bg-slate-50/50 border border-slate-200/90 hover:border-slate-300 rounded-xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
      <div>
        {/* Header Metadata Bar: Source, Date, Sentiment, Status */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3.5 pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
              {source}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {dateFormatted}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Sentiment Pill */}
            <span
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                sentiment === "positive"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : sentiment === "negative"
                  ? "bg-rose-50 text-rose-800 border-rose-200"
                  : "bg-slate-100 text-slate-700 border-slate-200"
              }`}
            >
              {sentiment === "positive" ? (
                <Smile className="w-3.5 h-3.5" />
              ) : sentiment === "negative" ? (
                <Frown className="w-3.5 h-3.5" />
              ) : (
                <Meh className="w-3.5 h-3.5" />
              )}
              <span className="capitalize">{sentiment}</span>
              <span className="font-mono">({sentiment_score > 0 ? `+${sentiment_score}` : sentiment_score})</span>
            </span>

            {/* Data Status Indicator */}
            {data_status === "live_rss" ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-800 uppercase border border-emerald-200 font-bold flex items-center gap-1 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                LIVE RSS
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700 uppercase border border-slate-200 font-bold">
                SEEDED DEMO
              </span>
            )}
          </div>
        </div>

        {/* Primary Tamil Headline - Prominent Editorial Lead */}
        <h3 className="text-lg sm:text-xl font-bold text-slate-900 font-tamil leading-[1.45] tracking-tight group-hover:text-blue-700 transition-colors mb-2.5">
          {tamil_title}
        </h3>

        {/* English Context Headline */}
        <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-normal mb-2.5 line-clamp-2">
          {title}
        </p>

        {/* Clean Editorial Summary */}
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4.5 line-clamp-3">
          {summary}
        </p>

        {/* Focused Entity Tags Strip */}
        <div className="flex flex-wrap items-center gap-2 mb-4 pt-1">
          {party_codes.map((code) => (
            <span
              key={code}
              className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200"
            >
              #{code}
            </span>
          ))}

          {leader_names.slice(0, 2).map((name) => (
            <span
              key={name}
              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
            >
              {name}
            </span>
          ))}

          {topics.slice(0, 1).map((t) => (
            <span
              key={t}
              className="px-2.5 py-1 rounded-md text-xs text-slate-600 bg-slate-50 border border-slate-200 font-medium"
            >
              {t}
            </span>
          ))}
        </div>

        {/* NLP Attribution Notice */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 italic mb-2">
          <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
          <span>Automated NLP Entity & Sentiment Attribution</span>
        </div>
      </div>

      {/* Footer Metrics & Actions */}
      <div className="pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
        {/* Estimated Engagement */}
        <div className="flex items-center gap-3.5 text-xs text-slate-600 font-mono font-medium">
          <span className="flex items-center gap-1.5" title="Estimated Audience Reach">
            <Eye className="w-4 h-4 text-slate-400" />
            {(engagement_estimated.reach / 1000).toFixed(1)}k
          </span>
          <span className="flex items-center gap-1.5" title="Estimated Social Shares">
            <Share2 className="w-4 h-4 text-slate-400" />
            {engagement_estimated.shares}
          </span>
          <span className="text-[11px] text-slate-400 italic">(est.)</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Open AI Intelligence Drawer */}
          <button
            onClick={() => onOpenIntelligence(article)}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-all cursor-pointer"
            title="Inspect AI Tamil summaries and variations"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>AI Insights</span>
          </button>

          {/* Open in News Card Studio */}
          <button
            onClick={() => onCreateCard(article)}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-2xs cursor-pointer"
            title="Create 1080x1080 Tamil News Card"
          >
            <span>Create Card</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Original Source Link */}
          <a
            href={source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors"
            title="Open original media article"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </article>
  );
}
