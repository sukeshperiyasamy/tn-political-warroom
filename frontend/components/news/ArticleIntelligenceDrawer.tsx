"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  Copy,
  Check,
  ArrowRight,
  ExternalLink,
  Calendar,
  BrainCircuit,
} from "lucide-react";
import { NewsArticle, TamilVariation } from "../../types/political";

interface ArticleIntelligenceDrawerProps {
  article: NewsArticle | null;
  onClose: () => void;
  onSelectForCard: (article: NewsArticle, chosenVariation?: TamilVariation) => void;
}

export function ArticleIntelligenceDrawer({
  article,
  onClose,
  onSelectForCard,
}: ArticleIntelligenceDrawerProps) {
  const [selectedVariationIndex, setSelectedVariationIndex] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!article) return null;

  // The list view omits tamil_variations; they arrive a moment later when the full article loads.
  const variations = article.tamil_variations ?? [];
  const currentVariation = variations[selectedVariationIndex] || variations[0];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer Container */}
      <div className="relative w-full max-w-2xl h-full bg-surface border-l border-line shadow-2xl flex flex-col z-10 overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between bg-canvas">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-ink-soft" />
            <div>
              <h2 id="drawer-title" className="text-xs sm:text-sm font-bold uppercase tracking-wider text-ink">
                AI Article Intelligence & Tamil Summaries
              </h2>
              <p className="text-[11px] text-ink-muted">
                Entity attribution, sentiment polarity, and 3-tier Tamil narrative variations
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-ink-muted hover:text-ink-soft hover:bg-zinc-200/60 transition-colors cursor-pointer"
            aria-label="Close intelligence drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
          {/* Article Meta Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-line">
            <div className="flex items-center gap-2 text-ink-muted">
              <span className="font-bold text-ink font-mono uppercase">
                {article.source}
              </span>
              <span className="text-zinc-300">•</span>
              <span className="flex items-center gap-1 font-mono text-[11px]">
                <Calendar className="w-3 h-3 text-ink-muted" />
                {new Date(article.published_at).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>

            <div className="flex items-center gap-1.5 font-mono">
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  article.sentiment === "positive"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : article.sentiment === "negative"
                    ? "bg-rose-50 text-rose-800 border border-rose-200"
                    : "bg-subtle text-ink-soft border border-line"
                }`}
              >
                {article.sentiment.toUpperCase()} ({article.sentiment_score > 0 ? `+${article.sentiment_score}` : article.sentiment_score})
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-subtle border border-line text-ink-soft">
                {article.data_status === "live_rss" ? "LIVE RSS" : "DEMO"}
              </span>
            </div>
          </div>

          {/* Primary Tamil Headline */}
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-soft block mb-1">
              Tamil Wire Headline
            </span>
            <h3 className="text-base sm:text-lg font-bold font-tamil text-ink leading-snug">
              {article.tamil_title}
            </h3>
            {article.title && article.title !== article.tamil_title && (
              <p className="text-xs text-ink-soft mt-1 font-medium">
                {article.title}
              </p>
            )}
          </div>

          {/* Identified Entities & Sentiment Grid */}
          <div className="p-3.5 rounded bg-canvas border border-line grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-ink-muted font-bold block mb-1.5">
                Identified Parties
              </span>
              <div className="flex flex-wrap gap-1">
                {article.party_codes.map((code) => (
                  <span
                    key={code}
                    className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-surface text-ink border border-line"
                  >
                    #{code}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-ink-muted font-bold block mb-1.5">
                Identified Leaders
              </span>
              <div className="flex flex-wrap gap-1">
                {article.leader_names.map((name) => (
                  <span
                    key={name}
                    className="px-2 py-0.5 rounded text-xs font-medium bg-surface text-ink border border-line"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>

            <div className="col-span-2 pt-2 border-t border-line flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono tracking-wider text-ink-muted font-bold">
                Media Sentiment
              </span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-mono font-bold capitalize ${
                  article.sentiment === "positive"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : article.sentiment === "negative"
                    ? "bg-rose-50 text-rose-800 border border-rose-200"
                    : "bg-subtle text-ink-soft border border-line"
                }`}
              >
                {article.sentiment} ({article.sentiment_score > 0 ? `+${article.sentiment_score}` : article.sentiment_score})
              </span>
            </div>
          </div>

          {/* Dual Summaries */}
          <div className="space-y-3">
            {/* Tamil Summary */}
            <div className="p-3.5 rounded bg-canvas border border-line">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-soft">
                  Tamil Executive Summary (தமிழ் சுருக்கம்)
                </span>
                <button
                  onClick={() => handleCopy(article.tamil_summary || article.summary)}
                  className="flex items-center gap-1 text-[11px] text-ink-muted hover:text-ink font-medium cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-ink-muted" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <p className="font-tamil text-xs text-ink leading-relaxed">
                {article.tamil_summary || article.summary}
              </p>
            </div>

            {/* English Strategic Summary */}
            <div className="p-3.5 rounded bg-canvas border border-line">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-soft block mb-1.5">
                English Strategic Intelligence
              </span>
              <p className="text-xs text-ink-soft leading-relaxed font-medium">
                {article.summary}
              </p>
            </div>
          </div>

          {/* 3 Distinct Tamil Social Variations */}
          {article.tamil_variations && article.tamil_variations.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-ink-soft" />
                  <span>3 AI Tamil Headline & Hook Variations</span>
                </span>
                <span className="text-[10px] text-ink-soft font-mono">
                  Pick hook for 1080p card
                </span>
              </div>

              {/* Angle Tabs */}
              <div className="grid grid-cols-3 gap-1.5">
                {article.tamil_variations.map((v, idx) => (
                  <button
                    key={v.style}
                    onClick={() => setSelectedVariationIndex(idx)}
                    className={`p-2 rounded border text-left transition-all cursor-pointer ${
                      selectedVariationIndex === idx
                        ? "bg-ink text-white border-zinc-900 font-bold"
                        : "bg-canvas text-ink-soft border-line hover:border-line-strong font-medium"
                    }`}
                  >
                    <div className="text-[10px] font-mono uppercase truncate opacity-80">{v.style}</div>
                    <div className="text-xs font-tamil truncate mt-0.5">{v.headline}</div>
                  </button>
                ))}
              </div>

              {/* Selected Variation Preview Box */}
              {currentVariation && (
                <div className="p-3.5 rounded bg-canvas border border-line space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase font-bold text-ink-soft">
                      Active: {currentVariation.style}
                    </span>
                    <button
                      onClick={() => handleCopy(`${currentVariation.headline}\n\n${currentVariation.caption}`)}
                      className="flex items-center gap-1 text-[11px] text-ink-soft hover:text-ink cursor-pointer font-medium"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-700" />
                          <span className="text-emerald-800 font-semibold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <h4 className="font-tamil text-sm font-bold text-ink leading-snug">
                    {currentVariation.headline}
                  </h4>
                  <p className="font-tamil text-xs text-ink-soft leading-relaxed">
                    {currentVariation.caption}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Action Footer */}
        <div className="p-4 border-t border-line bg-canvas flex items-center justify-between gap-3">
          <a
            href={article.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink font-medium"
          >
            <span>Original Story</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={() => onSelectForCard(article, currentVariation)}
            className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold bg-ink hover:bg-ink-soft text-white shadow-card transition-colors cursor-pointer"
          >
            <span>Proceed to News Card Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
