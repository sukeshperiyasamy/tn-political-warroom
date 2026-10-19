"use client";

import React, { useState, useEffect } from "react";
import {
  Server,
  Radio,
  FileText,
  Tag,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  ArrowRight,
  Shield,
  Layers,
  Activity,
  Sliders,
} from "lucide-react";
import { AdminSystemStatus, IngestionLog } from "../../types/political";
import { fetchAdminSystemStatus, triggerIngest } from "../../lib/api";

interface AdminOverviewSectionProps {
  onNavigateTab: (tab: "sources" | "keywords" | "ingestion" | "trending" | "settings") => void;
}

export function AdminOverviewSection({ onNavigateTab }: AdminOverviewSectionProps) {
  const [status, setStatus] = useState<AdminSystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const [ingestSuccess, setIngestSuccess] = useState<string | null>(null);

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAdminSystemStatus();
      setStatus(data);
    } catch (err: any) {
      console.error("Failed to load admin system status:", err);
      setError(err?.message || "Failed to load admin system status. Please verify backend service connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleQuickIngest = async () => {
    try {
      setIngesting(true);
      setIngestSuccess(null);
      const res = await triggerIngest();
      setIngestSuccess(`Ingestion completed: ${res.total_items_found} items checked, ${res.total_new_items_added} fresh stories persisted.`);
      await loadStatus();
    } catch (err) {
      console.error("Ingest failed:", err);
    } finally {
      setIngesting(false);
    }
  };

  if (loading && !status) {
    return (
      <div className="p-16 text-center text-zinc-500 bg-white border border-[#E8E8E2] rounded-xl shadow-2xs">
        <RefreshCw className="w-6 h-6 border-2 border-zinc-800 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs font-medium">Gathering war room system diagnostics...</p>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="p-8 sm:p-12 text-center bg-white border border-rose-200 rounded-xl space-y-4 shadow-2xs">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="max-w-md mx-auto space-y-1">
          <h3 className="text-sm font-bold text-zinc-900 font-serif">
            Unable to Connect to Admin Backend
          </h3>
          <p className="text-xs text-zinc-600 font-mono break-words bg-zinc-50 p-2.5 rounded-md border border-zinc-200 text-left mt-2">
            {error}
          </p>
          <p className="text-xs text-zinc-500 mt-2">
            The war room backend service may be spinning up or restarting.
          </p>
        </div>
        <button
          onClick={loadStatus}
          className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  const pub = status?.publishers;
  const cnt = status?.content;

  return (
    <div className="space-y-6">
      {/* Overview Top Welcome & Quick Poller */}
      <div className="p-5 sm:p-6 bg-white border border-[#E2E2DC] rounded-xl shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
            <h2 className="text-sm sm:text-base font-bold text-zinc-900 font-serif">
              Political War Room Central Command & Operations
            </h2>
          </div>
          <p className="text-xs text-zinc-500 mt-1 font-tamil">
            தமிழ்நாடு தேர்தல் 2026 ஊடக உட்கிரகிப்பு, செய்தி மூலங்கள் மற்றும் வடிப்பான் மேலாண்மை
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={loadStatus}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg border border-[#D5D5CE] hover:bg-zinc-100 text-xs font-semibold text-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Refresh diagnostics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Stats</span>
          </button>

          <button
            onClick={handleQuickIngest}
            disabled={ingesting}
            className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${ingesting ? "animate-spin text-amber-400" : "text-amber-400"}`} />
            <span>{ingesting ? "Polling Active Feeds..." : "Trigger Full Ingest"}</span>
          </button>
        </div>
      </div>

      {ingestSuccess && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{ingestSuccess}</span>
          </div>
          <button onClick={() => setIngestSuccess(null)} className="text-emerald-700 hover:text-emerald-950 font-bold ml-2">×</button>
        </div>
      )}

      {/* Primary Diagnostic Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Publishers */}
        <div className="p-4 sm:p-5 rounded-xl bg-white border border-[#E2E2DC] shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Registered Publishers
            </span>
            <Radio className="w-4 h-4 text-zinc-700" />
          </div>
          <div>
            <div className="text-2xl font-black text-zinc-900 font-mono">
              {pub?.total ?? 0}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-1">
              <span className="text-emerald-700 font-semibold">{pub?.enabled ?? 0} Active</span>
              <span>•</span>
              <span className="text-zinc-500">{pub?.disabled ?? 0} Disabled</span>
            </div>
          </div>
          <div className="pt-2 border-t border-[#F0F0EB]">
            <button
              onClick={() => onNavigateTab("sources")}
              className="text-xs text-zinc-700 hover:text-zinc-950 font-semibold flex items-center gap-1 group cursor-pointer"
            >
              <span>Manage Publishers</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* Card 2: Feed Health */}
        <div className="p-4 sm:p-5 rounded-xl bg-white border border-[#E2E2DC] shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Ingestion Health
            </span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-700 font-mono">
              {pub?.healthy ?? 0}
              <span className="text-xs font-normal text-zinc-500 ml-1">healthy</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-1">
              {pub?.warning_or_error ? (
                <span className="text-amber-700 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {pub.warning_or_error} issues reported
                </span>
              ) : (
                <span className="text-emerald-700">All enabled feeds operational</span>
              )}
            </div>
          </div>
          <div className="pt-2 border-t border-[#F0F0EB]">
            <button
              onClick={() => onNavigateTab("ingestion")}
              className="text-xs text-zinc-700 hover:text-zinc-950 font-semibold flex items-center gap-1 group cursor-pointer"
            >
              <span>View Audit Logs</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* Card 3: Monitored Articles */}
        <div className="p-4 sm:p-5 rounded-xl bg-white border border-[#E2E2DC] shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Live Media Wire Reports
            </span>
            <FileText className="w-4 h-4 text-zinc-700" />
          </div>
          <div>
            <div className="text-2xl font-black text-zinc-900 font-mono">
              {cnt?.total_articles ?? 0}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Persisted in database
            </p>
          </div>
          <div className="pt-2 border-t border-[#F0F0EB]">
            <button
              onClick={() => onNavigateTab("ingestion")}
              className="text-xs text-zinc-700 hover:text-zinc-950 font-semibold flex items-center gap-1 group cursor-pointer"
            >
              <span>Ingestion Pipeline</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* Card 4: Political Topics & Keywords */}
        <div className="p-4 sm:p-5 rounded-xl bg-white border border-[#E2E2DC] shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Political Entities & Keywords
            </span>
            <Tag className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-zinc-900 font-mono">
              {cnt?.total_topics ?? 0}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              <span className="text-purple-700 font-semibold">{cnt?.active_topics ?? 0} active</span> filtering rules
            </p>
          </div>
          <div className="pt-2 border-t border-[#F0F0EB]">
            <button
              onClick={() => onNavigateTab("keywords")}
              className="text-xs text-zinc-700 hover:text-zinc-950 font-semibold flex items-center gap-1 group cursor-pointer"
            >
              <span>Manage Keywords</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Navigation Action Grid */}
      <div className="bg-white border border-[#E2E2DC] rounded-xl p-5 shadow-2xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 mb-3 pb-2 border-b border-[#F0F0EB]">
          Administrative Management Suites
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div
            onClick={() => onNavigateTab("sources")}
            className="p-3.5 rounded-lg border border-[#E8E8E2] hover:border-zinc-400 hover:bg-[#FAF9F6] transition-all cursor-pointer space-y-1.5"
          >
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-zinc-800" />
              <span className="text-xs font-bold text-zinc-900">Sources & Publishers</span>
            </div>
            <p className="text-[11px] text-zinc-500">
              Register news outlets, influencer feeds, test XML responses, and toggle ingestion.
            </p>
          </div>

          <div
            onClick={() => onNavigateTab("keywords")}
            className="p-3.5 rounded-lg border border-[#E8E8E2] hover:border-zinc-400 hover:bg-[#FAF9F6] transition-all cursor-pointer space-y-1.5"
          >
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-purple-700" />
              <span className="text-xs font-bold text-zinc-900">Keywords & Filters</span>
            </div>
            <p className="text-[11px] text-zinc-500">
              Manage Tamil & English political party keywords, hashtags, and exclusion rules.
            </p>
          </div>

          <div
            onClick={() => onNavigateTab("trending")}
            className="p-3.5 rounded-lg border border-[#E8E8E2] hover:border-zinc-400 hover:bg-[#FAF9F6] transition-all cursor-pointer space-y-1.5"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-zinc-900">Trending Configuration</span>
            </div>
            <p className="text-[11px] text-zinc-500">
              Calibrate momentum, volume growth, cross-source diversity, and recency weights.
            </p>
          </div>

          <div
            onClick={() => onNavigateTab("settings")}
            className="p-3.5 rounded-lg border border-[#E8E8E2] hover:border-zinc-400 hover:bg-[#FAF9F6] transition-all cursor-pointer space-y-1.5"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-zinc-800" />
              <span className="text-xs font-bold text-zinc-900">Application Settings</span>
            </div>
            <p className="text-[11px] text-zinc-500">
              Customize client agency branding, polling frequency, and workspace preferences.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Ingestion Snippet */}
      {status?.recent_logs && status.recent_logs.length > 0 && (
        <div className="bg-white border border-[#E2E2DC] rounded-xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#F0F0EB]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800">
              Recent Publisher Fetch Activity
            </h3>
            <button
              onClick={() => onNavigateTab("ingestion")}
              className="text-xs text-zinc-600 hover:text-zinc-900 font-semibold cursor-pointer"
            >
              View Full Logs →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F6] text-zinc-500 border-b border-[#E8E8E2]">
                <tr>
                  <th className="py-2 px-3 font-semibold">Source</th>
                  <th className="py-2 px-3 font-semibold">Timestamp</th>
                  <th className="py-2 px-3 font-semibold">Status</th>
                  <th className="py-2 px-3 font-semibold">New Added</th>
                  <th className="py-2 px-3 font-semibold">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0EB]">
                {status.recent_logs.map((log: IngestionLog, idx: number) => (
                  <tr key={idx} className="hover:bg-zinc-50">
                    <td className="py-2.5 px-3 font-medium text-zinc-900">{log.source_name || log.source_id}</td>
                    <td className="py-2.5 px-3 text-zinc-500 font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-800 border border-zinc-200">
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-zinc-900">+{log.new_items_added || 0}</td>
                    <td className="py-2.5 px-3 text-zinc-500 font-mono text-[11px]">{Math.round(log.duration_ms)}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
