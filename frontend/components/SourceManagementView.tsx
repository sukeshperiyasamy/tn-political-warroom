"use client";

import React, { useState, useEffect } from "react";
import {
  Radio,
  RefreshCw,
  Plus,
  Play,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ExternalLink,
  Globe,
  Database,
  Trash2,
  Check,
  Copy,
  Clock,
  Sparkles,
  Server,
  Layers,
  ShieldCheck,
  FileCheck,
  Tag,
  AlertTriangle,
} from "lucide-react";
import {
  NewsSource,
  SourceTestResult,
  IngestionLog,
  IngestResponse,
} from "../types/political";
import {
  fetchSources,
  toggleSource,
  testSource,
  testCustomUrl,
  createSource,
  deleteSource,
  triggerIngest,
  fetchLogs,
} from "../lib/api";

function formatTimestamp(isoString?: string | null): string {
  if (!isoString) return "Never";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString("en-IN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

function getFetchStatusBadge(source: NewsSource) {
  const status = source.last_fetch_status;
  if (!source.is_enabled) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
        Disabled
      </span>
    );
  }

  if (status === "not_modified_304") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200" title="HTTP 304 Not Modified: Feed syndication XML unchanged on publisher server">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
        HTTP 304 Unchanged
      </span>
    );
  }

  if (status === "new_articles") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200" title="New articles persisted from latest poll">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        Fresh Articles
      </span>
    );
  }

  if (status === "no_new_articles") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200" title="HTTP 200 OK: Items parsed but already persisted (duplicates skipped)">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
        No New Articles
      </span>
    );
  }

  if (status === "stale_feed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200" title="Feed endpoint active but newest published article is older than 72 hours">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        Stale Feed (&gt;72h)
      </span>
    );
  }

  if (source.health_status === "error" || status === "http_error" || status === "connection_error") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200" title={source.last_fetch_error || source.last_error || "Fetch failed"}>
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
        Fetch Error
      </span>
    );
  }

  if (source.health_status === "healthy") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        Healthy
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
      Pending Poll
    </span>
  );
}

export function SourceManagementView() {
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [logs, setLogs] = useState<IngestionLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [ingesting, setIngesting] = useState<boolean>(false);
  const [ingestStatus, setIngestStatus] = useState<string | null>(null);

  // New source form state
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newName, setNewName] = useState("");
  const [newTamilName, setNewTamilName] = useState("");
  const [newCategory, setNewCategory] = useState("Digital News");
  const [newUrl, setNewUrl] = useState("");
  const [newRssUrl, setNewRssUrl] = useState("");
  const [newLanguage, setNewLanguage] = useState("ta");
  const [formTesting, setFormTesting] = useState(false);
  const [formTestResult, setFormTestResult] = useState<SourceTestResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Individual test modal
  const [activeTestResult, setActiveTestResult] = useState<{
    sourceName: string;
    result: SourceTestResult;
  } | null>(null);
  const [testingSourceId, setTestingSourceId] = useState<string | null>(null);

  // Single ingest loading state
  const [ingestingSourceId, setIngestingSourceId] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [srcList, logList] = await Promise.all([fetchSources(), fetchLogs(30)]);
      setSources(srcList);
      setLogs(logList);
    } catch (err) {
      console.error("Failed to load source management data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggle = async (sourceId: string) => {
    try {
      const updated = await toggleSource(sourceId);
      setSources((prev) =>
        prev.map((s) => (s.id === sourceId ? { ...s, is_enabled: updated.is_enabled } : s))
      );
    } catch (err) {
      console.error("Toggle error:", err);
    }
  };

  const handleTestSource = async (source: NewsSource) => {
    setTestingSourceId(source.id);
    try {
      const res = await testSource(source.id);
      setActiveTestResult({ sourceName: source.name, result: res });
    } catch (err: any) {
      setActiveTestResult({
        sourceName: source.name,
        result: {
          status: "error",
          status_code: 500,
          latency_ms: 0,
          items_count: 0,
          sample_items: [],
          error: err.message || "Failed to contact source endpoint",
        },
      });
    } finally {
      setTestingSourceId(null);
    }
  };

  const handleIngestSingle = async (source: NewsSource) => {
    setIngestingSourceId(source.id);
    setIngestStatus(`Ingesting articles from ${source.name}...`);
    try {
      const res: IngestResponse = await triggerIngest(source.id);
      const singleRes = res.results?.[0] || {};
      const statusText = singleRes.status === "not_modified_304"
        ? "HTTP 304 Not Modified (feed unchanged)"
        : `Found ${res.total_items_found} items, added ${res.total_new_items_added} new articles (${singleRes.skipped_duplicates || 0} duplicates skipped)`;
      setIngestStatus(`✓ ${source.name}: ${statusText}`);
      await loadData();
    } catch (err: any) {
      setIngestStatus(`✗ Failed to ingest ${source.name}: ${err.message}`);
    } finally {
      setIngestingSourceId(null);
    }
  };

  const handleIngestAll = async () => {
    setIngesting(true);
    setIngestStatus("Running live ingestion across all enabled Tamil news feeds...");
    try {
      const res: IngestResponse = await triggerIngest();
      const count304 = res.results?.filter((r: any) => r.status === "not_modified_304").length || 0;
      setIngestStatus(
        `✓ Ingestion completed: Processed ${res.sources_processed} sources. Added ${res.total_new_items_added} new articles (${count304} returned HTTP 304 unchanged).`
      );
      await loadData();
    } catch (err: any) {
      setIngestStatus(`✗ Ingestion error: ${err.message}`);
    } finally {
      setIngesting(false);
    }
  };

  const handleDelete = async (sourceId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} and its associated articles from the registry?`)) {
      return;
    }
    try {
      await deleteSource(sourceId);
      setSources((prev) => prev.filter((s) => s.id !== sourceId));
      setIngestStatus(`Source ${name} deleted successfully.`);
    } catch (err: any) {
      alert(`Failed to delete source: ${err.message}`);
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleTestFormUrl = async () => {
    if (!newRssUrl) return;
    setFormTesting(true);
    setFormError(null);
    setFormTestResult(null);
    try {
      const result = await testCustomUrl(newRssUrl);
      setFormTestResult(result);
    } catch (err: any) {
      setFormError(err.message || "Endpoint probe failed");
    } finally {
      setFormTesting(false);
    }
  };

  const handleCreateSourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newRssUrl.trim()) return;

    try {
      const created = await createSource({
        name: newName.trim(),
        tamil_name: newTamilName.trim() || newName.trim(),
        category: newCategory,
        url: newUrl.trim(),
        rss_url: newRssUrl.trim(),
        language: newLanguage,
        is_enabled: true,
      });

      setSources((prev) => [created, ...prev]);
      setShowAddForm(false);
      setNewName("");
      setNewTamilName("");
      setNewUrl("");
      setNewRssUrl("");
      setFormTestResult(null);
      setIngestStatus(`✓ Added ${created.name}. You can now run ingestion on it.`);
    } catch (err: any) {
      setFormError(err.message || "Failed to register new source");
    }
  };

  const activeSourcesCount = sources.filter((s) => s.is_enabled).length;
  const totalArticles = sources.reduce(
    (acc, s) => acc + (s.current_article_count || s.total_articles_fetched || 0),
    0
  );
  const totalDuplicatesSkipped = sources.reduce(
    (acc, s) => acc + (s.skipped_duplicates_count || 0),
    0
  );
  const healthyCount = sources.filter((s) => s.health_status === "healthy").length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="p-2 rounded-lg bg-blue-50 text-blue-800 border border-blue-200">
                <Radio className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Source Management & Feed Freshness Hub
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Tamil Nadu media syndication registry with conditional ETag & HTTP 304 validation, canonical deduplication, and domain AI monitoring
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-all cursor-pointer shadow-2xs"
            >
              <Plus className="w-4 h-4 text-slate-700" />
              <span>{showAddForm ? "Close Form" : "+ Add News Publisher"}</span>
            </button>

            <button
              onClick={handleIngestAll}
              disabled={ingesting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${ingesting ? "animate-spin" : ""}`} />
              <span>{ingesting ? "Ingesting All Feeds..." : "Run Live Ingestion All"}</span>
            </button>
          </div>
        </div>

        {/* Global Ingest Feedback Notification */}
        {ingestStatus && (
          <div className="mt-4 p-3.5 rounded-lg bg-slate-900 text-white text-xs sm:text-sm font-mono flex items-center justify-between gap-3 animate-fade-in">
            <span className="truncate">{ingestStatus}</span>
            <button
              onClick={() => setIngestStatus(null)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Key Health & Capacity Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
              <Server className="w-3.5 h-3.5 text-blue-600" />
              <span>Registered Publishers</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
              {sources.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{activeSourcesCount} feeds active</div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>Real Articles Ingested</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
              {totalArticles}
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">SQLite warroom.db live</div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Duplicates Prevented</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
              {totalDuplicatesSkipped}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Canonical URL & content hash</div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Pipeline Freshness</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
              {healthyCount}/{sources.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">HTTP 304 conditional cache</div>
          </div>
        </div>
      </div>

      {/* Add New Source Expandable Form */}
      {showAddForm && (
        <div className="bg-white border-2 border-amber-300 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-600" />
              <span>Register New Tamil News Publisher</span>
            </h3>
            <span className="text-xs text-slate-500">Live endpoint validation required before activation</span>
          </div>

          <form onSubmit={handleCreateSourceSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Publisher Name (English) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Puthiya Thalaimurai"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tamil Name (தமிழ் பெயர்)
                </label>
                <input
                  type="text"
                  placeholder="e.g. புதிய தலைமுறை"
                  value={newTamilName}
                  onChange={(e) => setNewTamilName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-slate-900 font-tamil focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Publisher Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                >
                  <option value="TV News">TV News (தொலைக்காட்சி)</option>
                  <option value="Digital News">Digital News (டிஜிட்டல் ஊடகம்)</option>
                  <option value="Daily Newspaper">Daily Newspaper (நாளிதழ்)</option>
                  <option value="State Politics">State Politics (அரசியல் இதழ்)</option>
                  <option value="Print / Digital">Print / Digital (அச்சு / இணையம்)</option>
                  <option value="Govt & Party Press">Govt & Party Press (அறிக்கைகள்)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Language & Script
                </label>
                <select
                  value={newLanguage}
                  onChange={(e) => setNewLanguage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                >
                  <option value="ta">Tamil (தமிழ்)</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Publisher Website URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  RSS / Atom Feed URL *
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/rss.xml"
                    value={newRssUrl}
                    onChange={(e) => setNewRssUrl(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-slate-900 font-mono focus:outline-none focus:border-blue-600 focus:bg-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleTestFormUrl}
                    disabled={formTesting || !newRssUrl}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {formTesting ? "Probing..." : "Test Endpoint"}
                  </button>
                </div>
              </div>
            </div>

            {/* Test result box */}
            {formTestResult && (
              <div
                className={`p-3.5 rounded-lg border text-xs ${
                  formTestResult.status === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-rose-50 border-rose-200 text-rose-900"
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1">
                  {formTestResult.status === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                  )}
                  <span>
                    Endpoint Probe Result: {formTestResult.status.toUpperCase()} (HTTP{" "}
                    {formTestResult.status_code}, {formTestResult.latency_ms}ms)
                  </span>
                </div>
                {formTestResult.status === "success" ? (
                  <p className="text-emerald-700">
                    Feed parsed successfully. Discovered {formTestResult.items_count} syndicated articles.
                  </p>
                ) : (
                  <p className="text-rose-700">{formTestResult.error}</p>
                )}
              </div>
            )}

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
                {formError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xs cursor-pointer"
              >
                Save & Activate Publisher
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Primary Sources Management Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-slate-700" />
              <span>Registered Tamil News Feed Registry</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Distinguishing feed fetch health from NLP processing status, with HTTP 304 and publication timestamp tracking
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Registry</span>
            </button>
          </div>
        </div>

        {/* Sources List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3.5 px-5">Publisher & Endpoint</th>
                <th className="py-3.5 px-4">Fetch Health & Status</th>
                <th className="py-3.5 px-4">Collection Timestamps</th>
                <th className="py-3.5 px-4">Article Processing Health</th>
                <th className="py-3.5 px-4">Active</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {sources.map((source) => (
                <tr key={source.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Publisher & Endpoint */}
                  <td className="py-4 px-5">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 flex items-center justify-center font-bold text-xs uppercase font-mono shrink-0 mt-0.5">
                        {source.name.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span>{source.name}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-600 font-mono">
                            {source.language.toUpperCase()}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            {source.category}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 font-tamil mt-0.5">{source.tamil_name}</div>
                        
                        {/* URL + ETag info */}
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 font-mono">
                          <span className="truncate max-w-[240px] text-[11px] text-slate-600" title={source.rss_url}>
                            {source.rss_url}
                          </span>
                          <button
                            onClick={() => handleCopyUrl(source.rss_url)}
                            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                            title="Copy RSS URL"
                          >
                            {copiedUrl === source.rss_url ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                          <a
                            href={source.rss_url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-slate-400 hover:text-blue-600"
                            title="Open XML stream"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        {source.etag && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-indigo-700 font-mono">
                            <Tag className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[220px]" title={`ETag: ${source.etag}`}>ETag: {source.etag}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Fetch Health & Status Badge */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div>
                      {getFetchStatusBadge(source)}
                    </div>
                    {source.last_fetch_error ? (
                      <div className="text-[11px] text-rose-600 max-w-[180px] truncate mt-1.5" title={source.last_fetch_error}>
                        {source.last_fetch_error}
                      </div>
                    ) : source.last_error ? (
                      <div className="text-[11px] text-slate-500 max-w-[180px] truncate mt-1.5" title={source.last_error}>
                        {source.last_error}
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 mt-1">Polling interval: 15 min</div>
                    )}
                  </td>

                  {/* Collection Timestamps */}
                  <td className="py-4 px-4 whitespace-nowrap text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <span className="text-slate-400 font-medium">Last Attempt:</span>
                        <span className="font-mono">{formatTimestamp(source.last_fetch_attempt_at || source.last_fetched_at)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <span className="text-slate-400 font-medium">Last Success:</span>
                        <span className="font-mono text-emerald-700 font-semibold">{formatTimestamp(source.last_successful_fetch_at || source.last_fetched_at)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <span className="text-slate-400 font-medium">Latest Article Pub:</span>
                        <span className="font-mono text-blue-700 font-semibold">{formatTimestamp(source.last_publication_at)}</span>
                      </div>
                    </div>
                  </td>

                  {/* Article Processing Health */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 font-mono">
                          {source.current_article_count || source.total_articles_fetched || 0} total
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {source.processed_articles_count ?? source.current_article_count ?? 0} analyzed
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                        <span>Skipped: <strong className="text-slate-700">{source.skipped_duplicates_count || 0}</strong></span>
                        {Number(source.failed_articles_count) > 0 && (
                          <span className="text-rose-600 font-bold">Failed: {source.failed_articles_count}</span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Enabled Toggle Switch */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <button
                      role="switch"
                      aria-checked={source.is_enabled}
                      onClick={() => handleToggle(source.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                        source.is_enabled ? "bg-emerald-600" : "bg-slate-300"
                      }`}
                      title={source.is_enabled ? "Feed active - click to pause" : "Feed paused - click to resume"}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          source.is_enabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </td>

                  {/* Action Buttons */}
                  <td className="py-4 px-5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleTestSource(source)}
                        disabled={testingSourceId === source.id}
                        className="px-2.5 py-1.5 rounded-md text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                        title="Probe feed headers and XML response"
                      >
                        {testingSourceId === source.id ? "Probing..." : "Test"}
                      </button>

                      <button
                        onClick={() => handleIngestSingle(source)}
                        disabled={ingestingSourceId === source.id || !source.is_enabled}
                        className="px-2.5 py-1.5 rounded-md text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors cursor-pointer disabled:opacity-40"
                        title="Fetch latest articles immediately with conditional validation"
                      >
                        {ingestingSourceId === source.id ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          "Ingest"
                        )}
                      </button>

                      <button
                        onClick={() => handleDelete(source.id, source.name)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete source from registry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Feed Test Details Modal / Drawer */}
      {activeTestResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-xl w-full border border-slate-200 shadow-xl overflow-hidden animate-scale-up">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Endpoint Inspection: {activeTestResult.sourceName}
                </h3>
                <p className="text-xs text-slate-500">Live RSS/Atom XML response & conditional headers</p>
              </div>
              <button
                onClick={() => setActiveTestResult(null)}
                className="text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                  <div className="text-xs text-slate-500">Status Code</div>
                  <div className="text-lg font-mono font-bold text-slate-900">
                    HTTP {activeTestResult.result.status_code}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                  <div className="text-xs text-slate-500">Latency</div>
                  <div className="text-lg font-mono font-bold text-blue-600">
                    {activeTestResult.result.latency_ms} ms
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                  <div className="text-xs text-slate-500">Parsed Articles</div>
                  <div className="text-lg font-mono font-bold text-emerald-600">
                    {activeTestResult.result.items_count}
                  </div>
                </div>
              </div>

              {(activeTestResult.result.etag || activeTestResult.result.last_modified) && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono space-y-1">
                  {activeTestResult.result.etag && (
                    <div className="text-slate-700">
                      <span className="font-semibold text-slate-500">ETag: </span>
                      {activeTestResult.result.etag}
                    </div>
                  )}
                  {activeTestResult.result.last_modified && (
                    <div className="text-slate-700">
                      <span className="font-semibold text-slate-500">Last-Modified: </span>
                      {activeTestResult.result.last_modified}
                    </div>
                  )}
                </div>
              )}

              {activeTestResult.result.error && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono">
                  {activeTestResult.result.error}
                </div>
              )}

              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Sample Articles from XML Stream
                </h4>
                <div className="space-y-2">
                  {activeTestResult.result.sample_items.slice(0, 4).map((item, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                      <div className="font-bold text-slate-900 font-tamil">{item.title}</div>
                      {item.pub_date && (
                        <div className="text-[11px] text-slate-400 mt-0.5">{item.pub_date}</div>
                      )}
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 mt-1 font-mono truncate"
                      >
                        <span>{item.link}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setActiveTestResult(null)}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Ingestion Activity Log */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-700" />
              <span>Recent Ingestion Pipeline Activity Logs</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">HTTP status, items found, duplicates skipped, and duration per cycle</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-5">Timestamp</th>
                <th className="py-2.5 px-4">Publisher</th>
                <th className="py-2.5 px-4">HTTP Status</th>
                <th className="py-2.5 px-4">Result</th>
                <th className="py-2.5 px-4">Items Found</th>
                <th className="py-2.5 px-4">Saved</th>
                <th className="py-2.5 px-4">Duplicates Skipped</th>
                <th className="py-2.5 px-4">Duration</th>
                <th className="py-2.5 px-5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-slate-400">
                    No ingestion logs recorded yet. Run a live ingestion cycle to populate activity.
                  </td>
                </tr>
              ) : (
                logs.slice(0, 20).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-5 font-mono text-slate-500">
                      {new Date(log.timestamp).toLocaleString("en-IN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-800">{log.source_name}</td>
                    <td className="py-2.5 px-4 font-mono font-semibold">
                      {log.http_status === 304 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          304
                        </span>
                      ) : log.http_status === 200 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          200
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          {log.http_status || "ERR"}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      {log.status === "not_modified_304" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                          NOT MODIFIED
                        </span>
                      ) : log.status === "new_articles" || log.status === "success" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {log.new_items_added > 0 ? "NEW ARTICLES" : "OK"}
                        </span>
                      ) : log.status === "no_new_articles" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          NO NEW
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                          ERROR
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-mono">{log.items_found}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-emerald-700">
                      +{log.new_items_added}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-500">
                      {log.skipped_duplicates ?? 0}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-500">{log.duration_ms} ms</td>
                    <td className="py-2.5 px-5 text-slate-500 truncate max-w-xs">
                      {log.error_message || (log.status === "not_modified_304" ? "Feed 304 unchanged" : "Completed successfully")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
