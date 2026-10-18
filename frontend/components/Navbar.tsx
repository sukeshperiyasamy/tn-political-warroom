"use client";

import React from "react";
import {
  LayoutDashboard,
  Newspaper,
  GitCompare,
  Sparkles,
  Search,
  Radio,
  FlaskConical,
  FileText,
  TrendingUp,
} from "lucide-react";

import { ClientConfig } from "../types/political";

interface NavbarProps {
  activeTab: "dashboard" | "news" | "social" | "lab" | "sources" | "comparison" | "studio" | "brief";
  onTabChange: (tab: "dashboard" | "news" | "social" | "lab" | "sources" | "comparison" | "studio" | "brief") => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  articleCount: number;
  mode: "live" | "demo";
  onModeToggle: (mode: "live" | "demo") => void;
  clientConfig?: ClientConfig | null;
}

export function Navbar({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  articleCount,
  mode,
  onModeToggle,
  clientConfig,
}: NavbarProps) {
  const clientName = clientConfig?.client_name || "Tamil Nadu Strategic Intelligence Bureau";
  const clientTagline = clientConfig?.client_tagline || "Public Opinion & Media Analytics Command";
  const initials = clientName.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "TN";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E8E8E2] bg-white/98 backdrop-blur-xs">
      {/* Top Editorial Hairline Indicator */}
      <div className="h-[2px] w-full bg-zinc-900" />

      <div className="max-w-[1720px] w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-17 gap-2 lg:gap-4 min-w-0">
          {/* Masthead Brand Block */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 min-w-0">
            {clientConfig?.logo_url ? (
              <img
                src={clientConfig.logo_url}
                alt={clientName}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-md object-contain shrink-0 border border-zinc-200"
              />
            ) : (
              <div
                style={{ backgroundColor: clientConfig?.brand_color || "#18181B" }}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-md text-white flex items-center justify-center font-bold tracking-tighter text-xs sm:text-sm font-mono shrink-0 shadow-2xs"
              >
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold tracking-wider text-zinc-900 uppercase truncate">
                  {clientName}
                </span>
                {mode === "live" ? (
                  <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    LIVE RSS
                  </span>
                ) : (
                  <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200 shrink-0">
                    <FlaskConical className="w-3 h-3 text-zinc-500" />
                    DEMO
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-500 font-tamil leading-none mt-0.5 truncate max-w-[170px] sm:max-w-none">
                {clientTagline}
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav
            role="tablist"
            aria-label="Main Navigation"
            className="hidden lg:flex items-center justify-center flex-1 min-w-0 px-1"
          >
            <div className="flex items-center bg-[#F4F4F0] p-0.5 rounded-lg border border-[#E4E4DE] shrink-0">
              <button
                role="tab"
                aria-label="Dashboard Overview"
                aria-selected={activeTab === "dashboard"}
                onClick={() => onTabChange("dashboard")}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "dashboard"
                    ? "bg-white text-zinc-900 shadow-2xs border border-zinc-200/80 font-bold"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-white/50 font-medium"
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-zinc-600" />
                <span>Overview</span>
              </button>

              <button
                role="tab"
                aria-label="News Intelligence"
                aria-selected={activeTab === "news"}
                onClick={() => onTabChange("news")}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "news"
                    ? "bg-white text-zinc-900 shadow-2xs border border-zinc-200/80 font-bold"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-white/50 font-medium"
                }`}
              >
                <Newspaper className="w-3.5 h-3.5 text-zinc-600" />
                <span>News</span>
                <span className="ml-0.5 px-1 py-0.2 rounded text-[10px] bg-zinc-200/70 text-zinc-700 font-mono font-semibold">
                  {articleCount}
                </span>
              </button>

              <button
                role="tab"
                aria-label="Social Intelligence"
                aria-selected={activeTab === "social"}
                onClick={() => onTabChange("social")}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "social"
                    ? "bg-white text-zinc-900 shadow-2xs border border-zinc-200/80 font-bold"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-white/50 font-medium"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                <span>Trending</span>
                <span className="px-1 py-0.2 text-[9px] font-mono font-bold rounded bg-amber-100 text-amber-800 uppercase">
                  LIVE
                </span>
              </button>

              <button
                role="tab"
                aria-label="Social Discovery Lab"
                aria-selected={activeTab === "lab"}
                onClick={() => onTabChange("lab")}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "lab"
                    ? "bg-white text-zinc-900 shadow-2xs border border-zinc-200/80 font-bold"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-white/50 font-medium"
                }`}
              >
                <FlaskConical className="w-3.5 h-3.5 text-purple-600" />
                <span>Discovery Lab</span>
                <span className="px-1 py-0.2 text-[9px] font-mono font-bold rounded bg-purple-100 text-purple-800 uppercase">
                  LAB
                </span>
              </button>

              <button
                role="tab"
                aria-label="Intelligence Brief"
                aria-selected={activeTab === "brief"}
                onClick={() => onTabChange("brief")}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "brief"
                    ? "bg-white text-zinc-900 shadow-2xs border border-zinc-200/80 font-bold"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-white/50 font-medium"
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-zinc-600" />
                <span>Brief</span>
              </button>

              <button
                role="tab"
                aria-label="Party Comparison"
                aria-selected={activeTab === "comparison"}
                onClick={() => onTabChange("comparison")}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "comparison"
                    ? "bg-white text-zinc-900 shadow-2xs border border-zinc-200/80 font-bold"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-white/50 font-medium"
                }`}
              >
                <GitCompare className="w-3.5 h-3.5 text-zinc-600" />
                <span>Compare</span>
              </button>

              <button
                role="tab"
                aria-label="Sources & Ingestion"
                aria-selected={activeTab === "sources"}
                onClick={() => onTabChange("sources")}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "sources"
                    ? "bg-white text-zinc-900 shadow-2xs border border-zinc-200/80 font-bold"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-white/50 font-medium"
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-zinc-600" />
                <span>Sources</span>
              </button>

              <button
                role="tab"
                aria-label="News Card Studio"
                aria-selected={activeTab === "studio"}
                onClick={() => onTabChange("studio")}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "studio"
                    ? "bg-zinc-900 text-white shadow-2xs font-bold"
                    : "text-zinc-700 hover:text-zinc-900 hover:bg-white/50 font-medium"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Studio</span>
                <span className="px-1 py-0.2 text-[9px] font-mono font-bold rounded bg-zinc-800 text-amber-300 uppercase">
                  1080p
                </span>
              </button>
            </div>
          </nav>

          {/* Right Controls: Search & Live/Demo Mode */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Quick Keyword Search */}
            <div className="relative hidden xl:block w-36 2xl:w-48 shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search wire..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full bg-[#F6F6F3] border border-[#E2E2DC] rounded-md pl-8 pr-2.5 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-hidden focus:border-zinc-500 focus:bg-white transition-all font-medium"
                aria-label="Search articles"
              />
            </div>

            {/* Segmented Mode Selector */}
            <div className="flex items-center bg-[#F4F4F0] p-0.5 rounded-md border border-[#E2E2DC] text-xs font-semibold shrink-0">
              <button
                type="button"
                onClick={() => onModeToggle("live")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all cursor-pointer ${
                  mode === "live"
                    ? "bg-zinc-900 text-white font-bold shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
                title="Live RSS Ingestion Mode: Real regional Tamil media feeds"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${mode === "live" ? "bg-emerald-400 animate-pulse" : "bg-zinc-400"}`} />
                <span className="font-mono text-[11px]">LIVE</span>
              </button>

              <button
                type="button"
                onClick={() => onModeToggle("demo")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-all cursor-pointer ${
                  mode === "demo"
                    ? "bg-zinc-900 text-white font-bold shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
                title="Demo Mode: Curated baseline dataset"
              >
                <FlaskConical className="w-3 h-3" />
                <span className="font-mono text-[11px]">DEMO</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Strip */}
        <div className="flex lg:hidden items-center py-2 border-t border-[#E8E8E2] overflow-x-auto gap-1.5 w-full min-w-0 scrollbar-none">
          <button
            onClick={() => onTabChange("dashboard")}
            className={`px-2.5 py-1 rounded text-xs whitespace-nowrap cursor-pointer ${
              activeTab === "dashboard"
                ? "bg-zinc-900 text-white font-semibold shadow-2xs"
                : "text-zinc-600 hover:bg-zinc-100 font-medium"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => onTabChange("news")}
            className={`px-2.5 py-1 rounded text-xs whitespace-nowrap cursor-pointer ${
              activeTab === "news"
                ? "bg-zinc-900 text-white font-semibold shadow-2xs"
                : "text-zinc-600 hover:bg-zinc-100 font-medium"
            }`}
          >
            News ({articleCount})
          </button>
          <button
            onClick={() => onTabChange("social")}
            className={`px-2.5 py-1 rounded text-xs whitespace-nowrap cursor-pointer ${
              activeTab === "social"
                ? "bg-zinc-900 text-white font-semibold shadow-2xs"
                : "text-zinc-600 hover:bg-zinc-100 font-medium"
            }`}
          >
            Trending
          </button>
          <button
            onClick={() => onTabChange("lab")}
            className={`px-2.5 py-1 rounded text-xs whitespace-nowrap cursor-pointer ${
              activeTab === "lab"
                ? "bg-zinc-900 text-white font-semibold shadow-2xs"
                : "text-zinc-600 hover:bg-zinc-100 font-medium"
            }`}
          >
            Discovery Lab
          </button>
          <button
            onClick={() => onTabChange("brief")}
            className={`px-2.5 py-1 rounded text-xs whitespace-nowrap cursor-pointer ${
              activeTab === "brief"
                ? "bg-zinc-900 text-white font-semibold shadow-2xs"
                : "text-zinc-600 hover:bg-zinc-100 font-medium"
            }`}
          >
            Brief
          </button>
          <button
            onClick={() => onTabChange("comparison")}
            className={`px-2.5 py-1 rounded text-xs whitespace-nowrap cursor-pointer ${
              activeTab === "comparison"
                ? "bg-zinc-900 text-white font-semibold shadow-2xs"
                : "text-zinc-600 hover:bg-zinc-100 font-medium"
            }`}
          >
            Comparison
          </button>
          <button
            onClick={() => onTabChange("sources")}
            className={`px-2.5 py-1 rounded text-xs whitespace-nowrap cursor-pointer ${
              activeTab === "sources"
                ? "bg-zinc-900 text-white font-semibold shadow-2xs"
                : "text-zinc-600 hover:bg-zinc-100 font-medium"
            }`}
          >
            Sources
          </button>
          <button
            onClick={() => onTabChange("studio")}
            className={`px-2.5 py-1 rounded text-xs whitespace-nowrap cursor-pointer ${
              activeTab === "studio"
                ? "bg-zinc-900 text-amber-400 font-semibold shadow-2xs"
                : "text-zinc-700 hover:bg-zinc-100 font-medium"
            }`}
          >
            Studio
          </button>
        </div>
      </div>
    </header>
  );
}
