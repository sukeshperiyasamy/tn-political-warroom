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
import { NewsArticle, TamilVariation } from "../types/political";

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

  const currentVariation = article.tamil_variations[selectedVariationIndex] || article.tamil_variations[0];

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
      <div className="relative w-full max-w-2xl h-full bg-white border-l border-[#E8E8E2] shadow-2xl flex flex-col z-10 overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-[#F0F0EB] flex items-center justify-between bg-[#F9F9F7]">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-zinc-700" />
            <div>
              <h2 id="drawer-title" className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-900">
                AI Article Intelligence & Tamil Summaries
              </h2>
              <p className="text-[11px] text-zinc-500">
                Entity attribution, sentiment polarity, and 3-tier Tamil narrative variations
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors cursor-pointer"
            aria-label="Close intelligence drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
          {/* Article Meta Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#F0F0EB]">
            <div className="flex items-center gap-2 text-zinc-500">
              <span className="font-bold text-zinc-900 font-mono uppercase">
                {article.source}
              </span>
              <span className="text-zinc-300">•</span>
              <span className="flex items-center gap-1 font-mono text-[11px]">
                <Calendar className="w-3 h-3 text-zinc-400" />
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
                    : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                }`}
              >
                {article.sentiment.toUpperCase()} ({article.sentiment_score > 0 ? `+${article.sentiment_score}` : article.sentiment_score})
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#F4F4F0] border border-[#E2E2DC] text-zinc-700">
                {article.data_status === "live_rss" ? "LIVE RSS" : "DEMO"}
              </span>
            </div>
          </div>

          {/* Primary Tamil Headline */}
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-600 block mb-1">
              Tamil Wire Headline
            </span>
            <h3 className="text-base sm:text-lg font-bold font-tamil text-zinc-900 leading-snug">
              {article.tamil_title}
            </h3>
            {article.title && article.title !== article.tamil_title && (
              <p className="text-xs text-zinc-600 mt-1 font-medium">
                {article.title}
              </p>
            )}
          </div>

          {/* Identified Entities & Sentiment Grid */}
          <div className="p-3.5 rounded bg-[#F9F9F7] border border-[#E8E8E2] grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-bold block mb-1.5">
                Identified Parties
              </span>
              <div className="flex flex-wrap gap-1">
                {article.party_codes.map((code) => (
                  <span
                    key={code}
                    className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-white text-zinc-900 border border-[#E2E2DC]"
                  >
                    #{code}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-bold block mb-1.5">
                Identified Leaders
              </span>
              <div className="flex flex-wrap gap-1">
                {article.leader_names.map((name) => (
                  <span
                    key={name}
                    className="px-2 py-0.5 rounded text-xs font-medium bg-white text-zinc-800 border border-[#E2E2DC]"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>

            <div className="col-span-2 pt-2 border-t border-[#E8E8E2] flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-bold">
                Media Sentiment
              </span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-mono font-bold capitalize ${
                  article.sentiment === "positive"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : article.sentiment === "negative"
                    ? "bg-rose-50 text-rose-800 border border-rose-200"
                    : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                }`}
              >
                {article.sentiment} ({article.sentiment_score > 0 ? `+${article.sentiment_score}` : article.sentiment_score})
              </span>
            </div>
          </div>

          {/* Dual Summaries */}
          <div className="space-y-3">
            {/* Tamil Summary */}
            <div className="p-3.5 rounded bg-[#F9F9F7] border border-[#E8E8E2]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-700">
                  Tamil Executive Summary (தமிழ் சுருக்கம்)
                </span>
                <button
                  onClick={() => handleCopy(article.tamil_summary || article.summary)}
                  className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-900 font-medium cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-zinc-400" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <p className="font-tamil text-xs text-zinc-800 leading-relaxed">
                {article.tamil_summary || article.summary}
              </p>
            </div>

            {/* English Strategic Summary */}
            <div className="p-3.5 rounded bg-[#F9F9F7] border border-[#E8E8E2]">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-700 block mb-1.5">
                English Strategic Intelligence
              </span>
              <p className="text-xs text-zinc-700 leading-relaxed font-medium">
                {article.summary}
              </p>
            </div>
          </div>

          {/* 3 Distinct Tamil Social Variations */}
          {article.tamil_variations && article.tamil_variations.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#F0F0EB] pb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-zinc-600" />
                  <span>3 AI Tamil Headline & Hook Variations</span>
                </span>
                <span className="text-[10px] text-zinc-600 font-mono">
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
                        ? "bg-zinc-900 text-white border-zinc-900 font-bold"
                        : "bg-[#F9F9F7] text-zinc-700 border-[#E8E8E2] hover:border-zinc-300 font-medium"
                    }`}
                  >
                    <div className="text-[10px] font-mono uppercase truncate opacity-80">{v.style}</div>
                    <div className="text-xs font-tamil truncate mt-0.5">{v.headline}</div>
                  </button>
                ))}
              </div>

              {/* Selected Variation Preview Box */}
              {currentVariation && (
                <div className="p-3.5 rounded bg-[#F9F9F7] border border-[#E8E8E2] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase font-bold text-zinc-600">
                      Active: {currentVariation.style}
                    </span>
                    <button
                      onClick={() => handleCopy(`${currentVariation.headline}\n\n${currentVariation.caption}`)}
                      className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-900 cursor-pointer font-medium"
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
                  <h4 className="font-tamil text-sm font-bold text-zinc-900 leading-snug">
                    {currentVariation.headline}
                  </h4>
                  <p className="font-tamil text-xs text-zinc-600 leading-relaxed">
                    {currentVariation.caption}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Action Footer */}
        <div className="p-4 border-t border-[#F0F0EB] bg-[#F9F9F7] flex items-center justify-between gap-3">
          <a
            href={article.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-900 font-medium"
          >
            <span>Original Story</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={() => onSelectForCard(article, currentVariation)}
            className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white shadow-2xs transition-colors cursor-pointer"
          >
            <span>Proceed to News Card Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
