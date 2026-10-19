"use client";

import React, { useState, useEffect } from "react";
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
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

import { ClientConfig } from "../types/political";

interface NavbarProps {
  activeTab: "dashboard" | "news" | "social" | "lab" | "sources" | "comparison" | "studio" | "brief" | "admin";
  onTabChange: (tab: "dashboard" | "news" | "social" | "lab" | "sources" | "comparison" | "studio" | "brief" | "admin") => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  articleCount: number;
  mode?: "live" | "demo";
  onModeToggle?: (mode: "live" | "demo") => void;
  clientConfig?: ClientConfig | null;
}

export function Navbar({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  articleCount,
  mode = "live",
  onModeToggle,
  clientConfig,
}: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile drawer when active tab changes or on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const clientName = clientConfig?.client_name || "Tamil Nadu Strategic Intelligence Bureau";
  const clientTagline = clientConfig?.client_tagline || "Public Opinion & Media Analytics Command";
  const initials = clientName.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "TN";

  const handleMobileNavClick = (tab: "dashboard" | "news" | "social" | "lab" | "sources" | "comparison" | "studio" | "brief" | "admin") => {
    onTabChange(tab);
    setIsMobileMenuOpen(false);
  };

  const navItems = [
    {
      id: "dashboard" as const,
      label: "Overview",
      tamilLabel: "முதன்மை சுருக்கம்",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: "news" as const,
      label: "News Feed",
      tamilLabel: "செய்தி ஓட்டம்",
      icon: Newspaper,
      badge: articleCount > 0 ? `${articleCount}` : null,
      badgeColor: "bg-zinc-200 text-zinc-800",
    },
    {
      id: "social" as const,
      label: "Trending Now",
      tamilLabel: "சமூக ஊடகப் போக்குகள்",
      icon: TrendingUp,
      badge: "LIVE",
      badgeColor: "bg-amber-100 text-amber-900",
    },
    {
      id: "lab" as const,
      label: "Discovery Lab",
      tamilLabel: "கதைப்பரவல் ஆய்வுக்கூடம்",
      icon: FlaskConical,
      badge: "LAB",
      badgeColor: "bg-purple-100 text-purple-900",
    },
    {
      id: "brief" as const,
      label: "Intelligence Brief",
      tamilLabel: "அரசியல் அறிக்கை",
      icon: FileText,
      badge: null,
    },
    {
      id: "comparison" as const,
      label: "Party Compare",
      tamilLabel: "கட்சி ஒப்பீடு",
      icon: GitCompare,
      badge: null,
    },
    {
      id: "studio" as const,
      label: "Card Studio",
      tamilLabel: "1080p அட்டை ஸ்டுடியோ",
      icon: Sparkles,
      badge: "1080p",
      badgeColor: "bg-zinc-900 text-amber-300",
    },
    {
      id: "admin" as const,
      label: "Admin",
      tamilLabel: "நிர்வாகம்",
      icon: ShieldCheck,
      badge: "ADMIN",
      badgeColor: "bg-amber-100 text-amber-900",
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E8E8E2] bg-white shadow-xs">
      {/* Top Editorial Hairline Indicator */}
      <div className="h-[2px] w-full bg-zinc-900" />

      <div className="max-w-[1720px] w-full mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 lg:gap-4 min-w-0">
          {/* Masthead Brand Block */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0 max-w-[calc(100%-48px)] sm:max-w-[280px] xl:max-w-[260px] 2xl:max-w-none">
            {clientConfig?.logo_url ? (
              <img
                src={clientConfig.logo_url}
                alt={clientName}
                className="w-7 h-7 sm:w-9 sm:h-9 rounded-md object-contain shrink-0 border border-zinc-200"
              />
            ) : (
              <div
                style={{ backgroundColor: clientConfig?.brand_color || "#18181B" }}
                className="w-7 h-7 sm:w-9 sm:h-9 rounded-md text-white flex items-center justify-center font-bold tracking-tighter text-[11px] sm:text-sm font-mono shrink-0 shadow-2xs"
              >
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-xs sm:text-sm font-bold tracking-wider text-zinc-900 uppercase truncate">
                  {clientName}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  LIVE WIRE
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-zinc-500 font-tamil leading-none mt-0.5 truncate">
                {clientTagline}
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs (Hidden on mobile/tablet) */}
          <nav
            role="tablist"
            aria-label="Main Navigation"
            className="hidden xl:flex items-center justify-center flex-1 min-w-0 px-2"
          >
            <div className="flex items-center bg-[#F4F4F0] p-0.5 rounded-lg border border-[#E4E4DE] shrink-0">
              <button
                role="tab"
                aria-label="Dashboard Overview"
                aria-selected={activeTab === "dashboard"}
                onClick={() => onTabChange("dashboard")}
                className={`flex items-center gap-1 px-1.5 2xl:px-2 py-1 rounded-md text-[11px] 2xl:text-xs transition-all cursor-pointer whitespace-nowrap ${
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
                className={`flex items-center gap-1 px-1.5 2xl:px-2 py-1 rounded-md text-[11px] 2xl:text-xs transition-all cursor-pointer whitespace-nowrap ${
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
                className={`flex items-center gap-1 px-1.5 2xl:px-2 py-1 rounded-md text-[11px] 2xl:text-xs transition-all cursor-pointer whitespace-nowrap ${
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
                className={`flex items-center gap-1 px-1.5 2xl:px-2 py-1 rounded-md text-[11px] 2xl:text-xs transition-all cursor-pointer whitespace-nowrap ${
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
                className={`flex items-center gap-1 px-1.5 2xl:px-2 py-1 rounded-md text-[11px] 2xl:text-xs transition-all cursor-pointer whitespace-nowrap ${
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
                className={`flex items-center gap-1 px-1.5 2xl:px-2 py-1 rounded-md text-[11px] 2xl:text-xs transition-all cursor-pointer whitespace-nowrap ${
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
                aria-label="News Card Studio"
                aria-selected={activeTab === "studio"}
                onClick={() => onTabChange("studio")}
                className={`flex items-center gap-1 px-1.5 2xl:px-2 py-1 rounded-md text-[11px] 2xl:text-xs transition-all cursor-pointer whitespace-nowrap ${
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

              <button
                role="tab"
                aria-label="Admin Panel"
                aria-selected={activeTab === "admin"}
                onClick={() => onTabChange("admin")}
                className={`flex items-center gap-1 px-1.5 2xl:px-2 py-1 rounded-md text-[11px] 2xl:text-xs transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "admin"
                    ? "bg-zinc-900 text-white shadow-2xs font-bold"
                    : "text-zinc-700 hover:text-zinc-900 hover:bg-white/50 font-medium"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                <span>Admin</span>
                <span className="px-1 py-0.2 text-[9px] font-mono font-bold rounded bg-amber-100 text-amber-900 uppercase">
                  ADMIN
                </span>
              </button>
            </div>
          </nav>

          {/* Right Controls: Desktop/Tablet Search & Mobile Hamburger */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Quick Keyword Search on Tablet & Desktop */}
            <div className="relative hidden md:block w-36 lg:w-44 xl:w-48 shrink-0">
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

            {/* Mobile/Tablet Hamburger Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="xl:hidden flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#F4F4F0] hover:bg-zinc-200 border border-[#E2E2DC] text-zinc-800 transition-colors cursor-pointer shrink-0"
              aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-zinc-900" />
              ) : (
                <Menu className="w-5 h-5 text-zinc-900" />
              )}
            </button>
          </div>
        </div>

        {/* Quick Tap Pill Bar (Smooth horizontal swipe with zero document blowout) */}
        <div className="flex xl:hidden items-center py-2 border-t border-[#E8E8E2] overflow-x-auto gap-1.5 w-full min-w-0 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleMobileNavClick(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap cursor-pointer transition-colors shrink-0 min-h-[36px] ${
                  isActive
                    ? "bg-zinc-900 text-white font-bold shadow-xs"
                    : "bg-[#F4F4F0] text-zinc-700 hover:bg-zinc-200 font-medium"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-zinc-600"}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                      isActive ? "bg-white/20 text-white" : item.badgeColor || "bg-zinc-200 text-zinc-800"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Slide-Down Navigation Drawer / Modal */}
      {isMobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Menu"
          className="xl:hidden fixed inset-x-0 top-[112px] sm:top-[120px] bottom-0 z-50 bg-black/50 backdrop-blur-xs flex flex-col"
        >
          <div className="bg-white border-b border-[#E8E8E2] shadow-2xl p-4 sm:p-5 max-h-[85vh] overflow-y-auto space-y-4 animate-in slide-in-from-top-2 duration-150">
            {/* Mobile Wire Search Bar */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search Tamil / English news..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full bg-[#F6F6F3] border border-[#E2E2DC] rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-hidden focus:border-zinc-500 focus:bg-white transition-all font-medium"
                aria-label="Search articles mobile"
              />
            </div>

            {/* Navigation Grid of All 8 Sections */}
            <div className="space-y-1">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 px-2 py-1">
                Navigation Sections
              </div>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleMobileNavClick(item.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors cursor-pointer min-h-[48px] ${
                      isActive
                        ? "bg-zinc-900 text-white font-bold shadow-2xs"
                        : "bg-[#FAFBFD] hover:bg-zinc-100 text-zinc-800 border border-[#F0F0EB]"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
                          isActive ? "bg-white/20 text-white" : "bg-white border border-[#E8E8E2] text-zinc-700"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate flex items-center gap-1.5">
                          <span>{item.label}</span>
                          {item.badge && (
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                                isActive ? "bg-white/20 text-white" : item.badgeColor || "bg-zinc-200 text-zinc-800"
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <div
                          className={`text-xs font-tamil truncate ${
                            isActive ? "text-zinc-300" : "text-zinc-500"
                          }`}
                        >
                          {item.tamilLabel}
                        </div>
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-zinc-400"}`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Status & Drawer Close */}
            <div className="pt-3 border-t border-[#F0F0EB] flex items-center justify-between text-xs text-zinc-500">
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>System: <strong className="text-zinc-800 uppercase">Live Intelligence Wire</strong></span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-1.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold cursor-pointer"
              >
                Close Menu
              </button>
            </div>
          </div>
          {/* Bottom dismiss area */}
          <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)} />
        </div>
      )}
    </header>
  );
}
