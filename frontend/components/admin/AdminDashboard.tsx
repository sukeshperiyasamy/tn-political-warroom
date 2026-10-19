"use client";

import React, { useState } from "react";
import {
  LayoutDashboard,
  Radio,
  Tag,
  Database,
  TrendingUp,
  Sliders,
  LogOut,
  ArrowLeft,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { ClientConfig } from "../../types/political";
import { AdminOverviewSection } from "./AdminOverviewSection";
import { AdminKeywordsSection } from "./AdminKeywordsSection";
import { AdminIngestionSection } from "./AdminIngestionSection";
import { AdminTrendingSection } from "./AdminTrendingSection";
import { AdminSettingsSection } from "./AdminSettingsSection";
import { SourceManagementView } from "../SourceManagementView";

interface AdminDashboardProps {
  onLogout: () => void;
  onBackToWarroom?: () => void;
  clientConfig?: ClientConfig | null;
  onConfigUpdated?: (cfg: ClientConfig) => void;
  initialSubTab?: "overview" | "sources" | "keywords" | "ingestion" | "trending" | "settings";
}

export function AdminDashboard({
  onLogout,
  onBackToWarroom,
  clientConfig,
  onConfigUpdated,
  initialSubTab = "overview",
}: AdminDashboardProps) {
  const [activeAdminTab, setActiveAdminTab] = useState<
    "overview" | "sources" | "keywords" | "ingestion" | "trending" | "settings"
  >(initialSubTab);

  const tabs = [
    {
      id: "overview" as const,
      label: "Dashboard",
      tamilLabel: "முதன்மை மேற்பார்வை",
      icon: LayoutDashboard,
    },
    {
      id: "sources" as const,
      label: "Sources & Publishers",
      tamilLabel: "ஊடக மூலங்கள்",
      icon: Radio,
    },
    {
      id: "keywords" as const,
      label: "Keywords & Filters",
      tamilLabel: "முக்கியச் சொற்கள்",
      icon: Tag,
    },
    {
      id: "ingestion" as const,
      label: "Feed Ingestion",
      tamilLabel: "செய்தி உட்கிரகிப்பு",
      icon: Database,
    },
    {
      id: "trending" as const,
      label: "Trending Configuration",
      tamilLabel: "போக்குக் கணிப்பு முறை",
      icon: TrendingUp,
    },
    {
      id: "settings" as const,
      label: "Application Settings",
      tamilLabel: "அமைப்பு அமைப்புகள்",
      icon: Sliders,
    },
  ];

  const currentTabObj = tabs.find((t) => t.id === activeAdminTab) || tabs[0];

  return (
    <div className="w-full space-y-6">
      {/* Admin Masthead Bar */}
      <div className="p-4 sm:p-5 bg-white border border-[#E2E2DC] rounded-xl shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-zinc-900 text-amber-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
              <span className="font-semibold text-zinc-700">Admin</span>
              <ChevronRight className="w-3 h-3 text-zinc-400" />
              <span className="text-zinc-900 font-bold">{currentTabObj.label}</span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-zinc-900 font-serif truncate">
              TN War Room Central Administration
            </h1>
          </div>
        </div>

        {/* Action Controls & Session Badge */}
        <div className="flex items-center flex-wrap gap-2.5 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
            admin (Dev Demo)
          </span>

          {onBackToWarroom && (
            <button
              onClick={onBackToWarroom}
              className="px-3 py-1.5 rounded-lg border border-[#D5D5CE] hover:bg-zinc-100 text-xs font-semibold text-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Overview</span>
            </button>
          )}

          <button
            onClick={onLogout}
            className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-rose-50 text-zinc-700 hover:text-rose-700 border border-zinc-200 hover:border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="End admin session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Admin Secondary Navigation Tabs */}
      <div className="bg-white border border-[#E2E2DC] rounded-xl p-1.5 shadow-2xs overflow-x-auto">
        <nav className="flex items-center gap-1 min-w-max" aria-label="Admin Navigation Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeAdminTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveAdminTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-zinc-900 text-white shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-950 hover:bg-[#FAF9F6]"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-amber-400" : "text-zinc-500"}`} />
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-tamil font-normal hidden lg:inline ${
                    isActive ? "text-zinc-300" : "text-zinc-400"
                  }`}
                >
                  ({tab.tamilLabel})
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Admin Section Content */}
      <div className="min-w-0">
        {activeAdminTab === "overview" && (
          <AdminOverviewSection onNavigateTab={(tab) => setActiveAdminTab(tab)} />
        )}

        {activeAdminTab === "sources" && (
          <SourceManagementView
            clientConfig={clientConfig}
            onConfigUpdated={onConfigUpdated}
          />
        )}

        {activeAdminTab === "keywords" && <AdminKeywordsSection />}

        {activeAdminTab === "ingestion" && <AdminIngestionSection />}

        {activeAdminTab === "trending" && <AdminTrendingSection />}

        {activeAdminTab === "settings" && (
          <AdminSettingsSection
            clientConfig={clientConfig}
            onConfigUpdated={onConfigUpdated}
          />
        )}
      </div>
    </div>
  );
}
