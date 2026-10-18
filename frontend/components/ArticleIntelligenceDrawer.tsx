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
  Smile,
  Meh,
  Frown,
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
      className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/50 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer Container */}
      <div className="relative w-full max-w-2xl h-full bg-white border-l border-slate-200 shadow-2xl flex flex-col z-10 overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <div>
              <h2 id="drawer-title" className="text-sm font-bold uppercase tracking-wider text-slate-800">
                AI Article Intelligence & Tamil Summaries
              </h2>
              <p className="text-[11px] text-slate-500">
                Entity attribution, sentiment vector, and 3-tier Tamil narrative hooks
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            aria-label="Close intelligence drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Article Meta Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                {article.source}
              </span>
              <span className="flex items-center gap-1 text-[11px]">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {new Date(article.published_at).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>

            <a
              href={article.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 font-medium hover:underline"
            >
              <span>Original Source</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Primary Tamil Headline */}
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-700 font-bold">
              Primary Tamil Report Title (முக்கிய தலைப்பு)
            </span>
            <h3 className="text-xl font-bold text-slate-900 font-tamil mt-1 leading-snug">
              {article.tamil_title}
            </h3>
            <p className="text-xs text-slate-600 font-medium mt-1.5">{article.title}</p>
          </div>

          {/* Political Entity Attribution Matrix */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold block mb-1">
                Identified Parties
              </span>
              <div className="flex flex-wrap gap-1">
                {article.party_codes.map((code) => (
                  <span
                    key={code}
                    className="px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold block mb-1">
                Identified Leaders
              </span>
              <div className="flex flex-wrap gap-1">
                {article.leader_names.map((name) => (
                  <span
                    key={name}
                    className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-200/80 text-slate-800 border border-slate-300"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>

            <div className="col-span-2 pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">
                Media Sentiment
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold ${
                    article.sentiment === "positive"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : article.sentiment === "negative"
                      ? "bg-rose-50 text-rose-800 border border-rose-200"
                      : "bg-slate-200 text-slate-800 border border-slate-300"
                  }`}
                >
                  {article.sentiment === "positive" ? (
                    <Smile className="w-3.5 h-3.5" />
                  ) : article.sentiment === "negative" ? (
                    <Frown className="w-3.5 h-3.5" />
                  ) : (
                    <Meh className="w-3.5 h-3.5" />
                  )}
                  <span className="capitalize">{article.sentiment}</span>
                  <span className="font-mono">({article.sentiment_score > 0 ? `+${article.sentiment_score}` : article.sentiment_score})</span>
                </span>
              </div>
            </div>
          </div>

          {/* Dual Summaries */}
          <div className="space-y-4">
            {/* Tamil Summary */}
            <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-200/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider font-mono">
                  Tamil Executive Summary (தமிழ் சுருக்கம்)
                </span>
                <button
                  onClick={() => handleCopy(article.tamil_summary)}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <p className="text-sm font-tamil text-slate-800 leading-relaxed font-normal">
                {article.tamil_summary}
              </p>
            </div>

            {/* English Strategic Summary */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider font-mono block mb-2">
                English Strategic Intelligence
              </span>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {article.summary}
              </p>
            </div>
          </div>

          {/* 3 Alternative Tamil Variations Showcase */}
          <div className="p-4.5 rounded-xl bg-white border border-amber-300 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  3 AI Tamil Headline & Hook Variations
                </h4>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">Optimized for social reach</span>
            </div>

            {/* Variation Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-lg mb-4 border border-slate-200">
              {article.tamil_variations.map((v, idx) => (
                <button
                  key={v.style}
                  onClick={() => setSelectedVariationIndex(idx)}
                  className={`px-2 py-1.5 rounded-md text-[11px] font-semibold transition-all text-center truncate cursor-pointer ${
                    selectedVariationIndex === idx
                      ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {v.style.split(" ")[0]}
                </button>
              ))}
            </div>

            {/* Active Variation Display */}
            {currentVariation && (
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span className="font-semibold">Style: {currentVariation.style}</span>
                  <button
                    onClick={() => handleCopy(`${currentVariation.headline}\n${currentVariation.caption}`)}
                    className="flex items-center gap-1 text-blue-700 hover:text-blue-900 font-semibold cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? "Copied" : "Copy Hook"}</span>
                  </button>
                </div>

                <p className="text-base font-bold font-tamil text-slate-900 leading-snug">
                  {currentVariation.headline}
                </p>

                <p className="text-xs font-tamil text-slate-600 leading-relaxed font-normal">
                  {currentVariation.caption}
                </p>
              </div>
            )}
          </div>

          {/* Engine Disclaimer */}
          <div className="text-[11px] text-slate-500 italic p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
            <span>
              Engine: {article.analysis_provider}. Server-side API key configuration is protected.
            </span>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>

          <button
            onClick={() => onSelectForCard(article, currentVariation)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-xs cursor-pointer"
          >
            <span>Proceed to News Card Studio</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
