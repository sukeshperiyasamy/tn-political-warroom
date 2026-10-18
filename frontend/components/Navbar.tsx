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
  Activity,
  FileText,
} from "lucide-react";

interface NavbarProps {
  activeTab: "dashboard" | "news" | "sources" | "comparison" | "studio" | "brief";
  onTabChange: (tab: "dashboard" | "news" | "sources" | "comparison" | "studio" | "brief") => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  articleCount: number;
  mode: "live" | "demo";
  onModeToggle: (mode: "live" | "demo") => void;
}

export function Navbar({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  articleCount,
  mode,
  onModeToggle,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      {/* Editorial Top Border Stripe */}
      <div className="h-0.5 w-full bg-gradient-to-r from-blue-700 via-amber-500 to-rose-600" />

      <div className="max-w-[1720px] w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex items-center justify-between h-18 gap-2 sm:gap-4 min-w-0">
          {/* Brand & Masthead */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold tracking-tighter text-sm sm:text-base font-mono shadow-sm shrink-0">
              TN
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 uppercase truncate">
                  TN Political War Room
                </span>
                {mode === "live" ? (
                  <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    LIVE RSS
                  </span>
                ) : (
                  <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300 shrink-0">
                    <FlaskConical className="w-3 h-3 text-slate-600" />
                    DEMO DATASET
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-tamil leading-none mt-1 truncate max-w-[170px] sm:max-w-none">
                தமிழ்நாடு அரசியல் ஊடக நுண்ணறிவு & வார் ரூம்
              </p>
            </div>
          </div>

          {/* Desktop Center Segmented Tabs — flex-1 so it fills space and can't be overlapped */}
          <nav
            role="tablist"
            aria-label="Main Navigation"
            className="hidden lg:flex flex-1 justify-center items-center min-w-0"
          >
            <div className="flex items-center bg-slate-100 p-1 xl:p-1.5 rounded-xl border border-slate-200/80 overflow-hidden">
            <button
              role="tab"
              aria-selected={activeTab === "dashboard"}
              onClick={() => onTabChange("dashboard")}
              className={`flex items-center gap-1.5 xl:gap-2 px-2.5 xl:px-3.5 py-1.5 xl:py-2 rounded-lg text-xs xl:text-sm transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "dashboard"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200 font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-slate-700" />
              <span>Overview</span>
            </button>

            <button
              role="tab"
              aria-selected={activeTab === "news"}
              onClick={() => onTabChange("news")}
              className={`flex items-center gap-1.5 xl:gap-2 px-2.5 xl:px-3.5 py-1.5 xl:py-2 rounded-lg text-xs xl:text-sm transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "news"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200 font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold"
              }`}
            >
              <Newspaper className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-slate-700" />
              <span>News Intelligence</span>
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[11px] xl:text-xs bg-slate-200/80 border border-slate-200 text-slate-800 font-mono font-bold">
                {articleCount}
              </span>
            </button>

            <button
              role="tab"
              aria-selected={activeTab === "sources"}
              onClick={() => onTabChange("sources")}
              className={`flex items-center gap-1.5 xl:gap-2 px-2.5 xl:px-3.5 py-1.5 xl:py-2 rounded-lg text-xs xl:text-sm transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "sources"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200 font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold"
              }`}
            >
              <Radio className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-slate-700" />
              <span>Sources & Ingestion</span>
            </button>

            <button
              role="tab"
              aria-label="Intelligence Brief"
              aria-selected={activeTab === "brief"}
              onClick={() => onTabChange("brief")}
              className={`flex items-center gap-1.5 xl:gap-2 px-2.5 xl:px-3.5 py-1.5 xl:py-2 rounded-lg text-xs xl:text-sm transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "brief"
                  ? "bg-white text-blue-900 shadow-sm border border-blue-200 font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold"
              }`}
            >
              <FileText className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-blue-600" />
              <span>Brief</span>
              <span className="px-1 py-0.2 text-[9px] xl:text-[10px] font-bold rounded bg-blue-100 text-blue-900 uppercase tracking-wider font-mono">
                v1
              </span>
            </button>

            <button
              role="tab"
              aria-selected={activeTab === "comparison"}
              onClick={() => onTabChange("comparison")}
              className={`flex items-center gap-1.5 xl:gap-2 px-2.5 xl:px-3.5 py-1.5 xl:py-2 rounded-lg text-xs xl:text-sm transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "comparison"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200 font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold"
              }`}
            >
              <GitCompare className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-slate-700" />
              <span>Party Comparison</span>
            </button>

            <button
              role="tab"
              aria-label="News Card Studio"
              aria-selected={activeTab === "studio"}
              onClick={() => onTabChange("studio")}
              className={`flex items-center gap-1.5 xl:gap-2 px-2.5 xl:px-3.5 py-1.5 xl:py-2 rounded-lg text-xs xl:text-sm transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "studio"
                  ? "bg-amber-50 text-amber-950 shadow-sm border border-amber-300 font-bold"
                  : "text-amber-800 hover:text-amber-950 hover:bg-amber-50/50 font-semibold"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-amber-600" />
              <span>Studio</span>
              <span className="px-1 py-0.2 text-[9px] xl:text-[10px] font-bold rounded bg-amber-100 text-amber-900 uppercase tracking-wider font-mono">
                1080p
              </span>
            </button>
            </div>
          </nav>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick Search — hidden at lg so it can't overlap the tab strip; visible at xl */}
            <div className="relative hidden xl:block w-44 2xl:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                aria-label="Search articles"
              />
            </div>

            {/* Explicit Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 sm:p-1 rounded-lg border border-slate-200 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => onModeToggle("live")}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md transition-all cursor-pointer ${
                  mode === "live"
                    ? "bg-emerald-600 text-white shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Live Mode: Real-time RSS feeds from verified Tamil publishers"
              >
                <span className={`w-2 h-2 rounded-full ${mode === "live" ? "bg-white animate-pulse" : "bg-emerald-500"}`} />
                <span className="inline text-[11px] sm:text-xs">LIVE</span>
              </button>

              <button
                type="button"
                onClick={() => onModeToggle("demo")}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md transition-all cursor-pointer ${
                  mode === "demo"
                    ? "bg-slate-900 text-white shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Demo Mode: Curated 2026 election scenario dataset"
              >
                <FlaskConical className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="inline text-[11px] sm:text-xs">DEMO</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Ribbon */}
        <div className="flex lg:hidden items-center justify-between py-2.5 border-t border-slate-100 overflow-x-auto gap-2 w-full min-w-0 scrollbar-none">
          <button
            onClick={() => onTabChange("dashboard")}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap cursor-pointer ${
              activeTab === "dashboard"
                ? "bg-slate-900 text-white font-bold shadow-xs"
                : "text-slate-600 hover:bg-slate-100 font-semibold"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => onTabChange("news")}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap cursor-pointer ${
              activeTab === "news"
                ? "bg-slate-900 text-white font-bold shadow-xs"
                : "text-slate-600 hover:bg-slate-100 font-semibold"
            }`}
          >
            News ({articleCount})
          </button>
          <button
            onClick={() => onTabChange("sources")}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap cursor-pointer ${
              activeTab === "sources"
                ? "bg-slate-900 text-white font-bold shadow-xs"
                : "text-slate-600 hover:bg-slate-100 font-semibold"
            }`}
          >
            Sources
          </button>
          <button
            onClick={() => onTabChange("brief")}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap cursor-pointer ${
              activeTab === "brief"
                ? "bg-blue-600 text-white font-bold shadow-xs"
                : "text-slate-600 hover:bg-slate-100 font-semibold"
            }`}
          >
            Brief
          </button>
          <button
            onClick={() => onTabChange("comparison")}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap cursor-pointer ${
              activeTab === "comparison"
                ? "bg-slate-900 text-white font-bold shadow-xs"
                : "text-slate-600 hover:bg-slate-100 font-semibold"
            }`}
          >
            Comparison
          </button>
          <button
            onClick={() => onTabChange("studio")}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap cursor-pointer ${
              activeTab === "studio"
                ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                : "text-amber-800 hover:bg-amber-50 font-semibold"
            }`}
          >
            Card Studio
          </button>
        </div>
      </div>
    </header>
  );
}
