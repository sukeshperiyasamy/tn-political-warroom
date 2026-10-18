"use client";

import React from "react";
import {
  ExternalLink,
  Sparkles,
  ArrowRight,
  Eye,
  Calendar,
  Globe,
  Tv,
  Video,
  UserCheck,
} from "lucide-react";
import { NewsArticle } from "../types/political";

interface ArticleCardProps {
  article: NewsArticle;
  onOpenIntelligence: (article: NewsArticle) => void;
  onCreateCard: (article: NewsArticle) => void;
}

function cleanExcerpt(text: string): string {
  if (!text) return "";
  // Strip promotional RSS noise
  return text
    .replace(/(?:Watch Live|Click here to subscribe|Follow us on|For latest updates|Subscribe to our channel)[^.]*\.?/gi, "")
    .trim();
}

export function ArticleCard({
  article,
  onOpenIntelligence,
  onCreateCard,
}: ArticleCardProps) {
  const {
    id,
    tamil_title,
    title,
    summary,
    source,
    source_url,
    source_type,
    source_category,
    platform,
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
    hour: "2-digit",
    minute: "2-digit",
  });

  const isInfluencer = source_type === "INFLUENCER" || source_category?.toLowerCase().includes("influencer");
  const isSocial = source_type === "SOCIAL_MEDIA";
  const displayPlatform = platform || (source_url?.includes("youtube.com") ? "youtube" : "web");

  const cleanedSummary = cleanExcerpt(summary || "");
  const hasDistinctEnglish = Boolean(
    title &&
    tamil_title &&
    title.trim() !== tamil_title.trim() &&
    !title.match(/[\u0B80-\u0BFF]/)
  );

  return (
    <article className="group bg-white border border-[#E8E8E2] hover:border-zinc-400 rounded-lg p-3.5 sm:p-5 transition-colors flex flex-col justify-between shadow-2xs min-w-0 max-w-full overflow-hidden">
      <div>
        {/* Masthead / Source Row with Category Classification */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2 pb-2 border-b border-[#F0F0EB] text-[11px] min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            {/* Category Badge: News Media vs Influencer */}
            {isInfluencer ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-50 text-purple-800 border border-purple-200 shrink-0">
                <UserCheck className="w-2.5 h-2.5 text-purple-700" />
                INFLUENCER
              </span>
            ) : isSocial ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-50 text-sky-800 border border-sky-200 shrink-0">
                SOCIAL MEDIA
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200 shrink-0">
                <Tv className="w-2.5 h-2.5 text-blue-700" />
                NEWS MEDIA
              </span>
            )}

            {/* Platform Badge */}
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200 uppercase shrink-0">
              {displayPlatform}
            </span>

            <span className="font-bold tracking-tight text-zinc-900 font-mono truncate max-w-[120px] sm:max-w-[150px]" title={source}>
              {source}
            </span>
            <span className="text-zinc-300">•</span>
            <span className="text-zinc-500 font-mono text-[10px] whitespace-nowrap">
              {dateFormatted}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {/* Polarity Indicator */}
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap ${
                sentiment === "positive"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : sentiment === "negative"
                  ? "bg-rose-50 text-rose-800 border border-rose-200"
                  : "bg-zinc-100 text-zinc-700 border border-zinc-200"
              }`}
            >
              {sentiment.toUpperCase()} ({sentiment_score > 0 ? `+${sentiment_score}` : sentiment_score})
            </span>

            {data_status === "live_rss" ? (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 whitespace-nowrap">
                LIVE
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-zinc-100 text-zinc-600 font-bold border border-zinc-200 whitespace-nowrap">
                DEMO
              </span>
            )}
          </div>
        </div>

        {/* Primary Tamil Headline */}
        <h3 className="font-tamil text-base sm:text-lg font-bold text-zinc-900 leading-[1.5] group-hover:text-zinc-700 transition-colors mb-2 line-clamp-3 break-words">
          {tamil_title || title}
        </h3>

        {/* Secondary English Headline only when distinct and helpful */}
        {hasDistinctEnglish && (
          <p className="text-xs font-semibold text-zinc-600 mb-2 line-clamp-2 break-words">
            {title}
          </p>
        )}

        {/* Editorial Summary */}
        <p className="text-xs text-zinc-600 leading-relaxed mb-3.5 line-clamp-3 break-words">
          {cleanedSummary}
        </p>

        {/* Metadata Entity Strip */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {party_codes.map((code) => (
            <span
              key={code}
              className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#F4F4F0] text-zinc-800 border border-[#E4E4DE]"
            >
              #{code}
            </span>
          ))}

          {leader_names.slice(0, 2).map((name) => (
            <span
              key={name}
              className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#F4F4F0] text-zinc-700 border border-[#E4E4DE] truncate max-w-[140px]"
            >
              {name}
            </span>
          ))}

          {topics.slice(0, 1).map((t) => (
            <span
              key={t}
              className="px-2 py-0.5 rounded text-[11px] text-zinc-500 bg-[#F9F9F7] border border-[#EAEAE5] truncate max-w-[140px]"
            >
              {t}
            </span>
          ))}
        </div>

        {/* Full Attribution Strip */}
        <div className="text-[10px] text-zinc-500 font-mono mb-2 flex flex-wrap items-center justify-between gap-1 border-t border-dashed border-[#EAEAE5] pt-1.5 min-w-0">
          <span className="truncate max-w-full">Source: <strong className="text-zinc-700">{source}</strong> ({isInfluencer ? "Influencer" : "News Media"})</span>
          <span className="text-zinc-400 shrink-0">{displayPlatform.toUpperCase()}</span>
        </div>
      </div>

      {/* Footer Metrics & Actions (Flex-wrap with accessible tap targets) */}
      <div className="pt-3 border-t border-[#F0F0EB] flex flex-wrap items-center justify-between gap-2 mt-auto min-w-0">
        {/* Estimated Reach */}
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono shrink-0">
          <Eye className="w-3.5 h-3.5 text-zinc-400" />
          <span>{(engagement_estimated.reach / 1000).toFixed(1)}k views (est.)</span>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => onOpenIntelligence(article)}
            className="flex items-center gap-1 px-2.5 py-1.5 sm:py-1 rounded text-xs font-semibold bg-[#F4F4F0] hover:bg-zinc-200 text-zinc-800 transition-colors cursor-pointer min-h-[36px] sm:min-h-[30px]"
            title="Inspect AI Tamil summaries and variations"
            aria-label="Inspect AI insights"
          >
            <Sparkles className="w-3 h-3 text-zinc-600" />
            <span>AI Insights</span>
          </button>

          <button
            onClick={() => onCreateCard(article)}
            className="flex items-center gap-1 px-3 py-1.5 sm:py-1 rounded text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white transition-colors cursor-pointer min-h-[36px] sm:min-h-[30px]"
            title="Open in 1080x1080 Tamil News Card Studio"
            aria-label="Open in Card Studio"
          >
            <span>Studio</span>
            <ArrowRight className="w-3 h-3" />
          </button>

          <a
            href={source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 sm:p-1 rounded text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
            title="Open original article"
            aria-label="Open original article"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
}
