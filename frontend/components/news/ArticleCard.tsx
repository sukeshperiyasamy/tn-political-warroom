"use client";

import React from "react";
import { ExternalLink, Sparkles, ArrowRight, Eye } from "lucide-react";
import { NewsArticle } from "../../types/political";

interface ArticleCardProps {
  article: NewsArticle;
  onOpenIntelligence: (article: NewsArticle) => void;
  onCreateCard: (article: NewsArticle) => void;
}

const SENTIMENT_STYLE: Record<string, { label: string; className: string; dot: string }> = {
  positive: { label: "Positive", className: "bg-positive-soft text-positive", dot: "bg-positive" },
  negative: { label: "Critical", className: "bg-negative-soft text-negative", dot: "bg-negative" },
  neutral: { label: "Neutral", className: "bg-neutral-soft text-ink-soft", dot: "bg-ink-muted" },
};

function cleanExcerpt(text: string): string {
  if (!text) return "";
  return text
    .replace(
      /(?:Watch Live|Click here to subscribe|Follow us on|For latest updates|Subscribe to our channel)[^.]*\.?/gi,
      "",
    )
    .trim();
}

function formatReach(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${n}`;
}

export function ArticleCard({ article, onOpenIntelligence, onCreateCard }: ArticleCardProps) {
  const {
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
    topics,
    engagement_estimated,
  } = article;

  const date = new Date(published_at).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const isInfluencer =
    source_type === "INFLUENCER" || source_category?.toLowerCase().includes("influencer");
  const isSocial = source_type === "SOCIAL_MEDIA";
  const channel = isInfluencer ? "Influencer" : isSocial ? "Social" : "News media";
  const displayPlatform = platform || (source_url?.includes("youtube.com") ? "youtube" : "web");
  const tone = SENTIMENT_STYLE[sentiment] ?? SENTIMENT_STYLE.neutral;

  const hasDistinctEnglish = Boolean(
    title && tamil_title && title.trim() !== tamil_title.trim() && !title.match(/[஀-௿]/),
  );
  const excerpt = cleanExcerpt(summary || "");
  const tags = [
    ...party_codes.map((c) => `#${c}`),
    ...leader_names.slice(0, 2),
    ...topics.slice(0, 1),
  ];

  return (
    <article className="group flex flex-col min-w-0 rounded-xl border border-line bg-surface shadow-card transition-shadow hover:shadow-pop">
      <div className="p-4 sm:p-5 flex-1">
        <div className="flex items-center gap-2 text-xs text-ink-muted min-w-0">
          <span className="font-semibold text-ink truncate" title={source}>
            {source}
          </span>
          <span aria-hidden="true">·</span>
          <time dateTime={published_at} className="whitespace-nowrap">
            {date}
          </time>
          <span
            className={`ml-auto shrink-0 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone.className}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} aria-hidden="true" />
            {tone.label}
          </span>
        </div>

        <h3 className="font-tamil mt-3 text-[17px] font-bold leading-snug text-ink line-clamp-3 break-words">
          {tamil_title || title}
        </h3>
        {hasDistinctEnglish && (
          <p className="mt-1.5 text-sm text-ink-soft line-clamp-2 break-words">{title}</p>
        )}
        {excerpt && (
          <p className="mt-2 text-sm text-ink-muted leading-relaxed line-clamp-3 break-words">
            {excerpt}
          </p>
        )}

        {tags.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Tags">
            {tags.map((t) => (
              <li
                key={t}
                className="rounded-md bg-subtle px-2 py-0.5 text-xs font-medium text-ink-soft max-w-[160px] truncate"
              >
                {t}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-line px-4 sm:px-5 py-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted min-w-0">
          <Eye className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">
            ~{formatReach(engagement_estimated.reach)} · {channel} · {displayPlatform}
          </span>
        </span>

        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onOpenIntelligence(article)}
            className="inline-flex items-center gap-1.5 h-9 rounded-lg px-2.5 text-xs font-semibold text-ink hover:bg-subtle"
            aria-label="Inspect AI insights"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent-strong" aria-hidden="true" />
            Insights
          </button>
          <button
            type="button"
            onClick={() => onCreateCard(article)}
            className="inline-flex items-center gap-1.5 h-9 rounded-lg bg-ink px-3 text-xs font-semibold text-white hover:bg-ink-soft"
            aria-label="Open in Card Studio"
          >
            Studio
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <a
            href={source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="grid place-items-center w-9 h-9 rounded-lg text-ink-muted hover:text-ink hover:bg-subtle"
            aria-label="Open original article"
          >
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </article>
  );
}
