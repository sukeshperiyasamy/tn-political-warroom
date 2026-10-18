"use client";

import React, { useState, useEffect } from "react";
import {
  Radio,
  RefreshCw,
  Plus,
  Play,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Trash2,
  Check,
  Copy,
  Clock,
  Server,
  Layers,
  Tag,
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
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
        Disabled
      </span>
    );
  }

  if (status === "not_modified_304") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-zinc-100 text-zinc-800 border border-zinc-300" title="HTTP 304 Not Modified: Feed XML unchanged on server">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-600"></span>
        HTTP 304 Unchanged
      </span>
    );
  }

  if (status === "new_articles") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200" title="New articles persisted from latest poll">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
        Fresh Articles
      </span>
    );
  }

  if (status === "no_new_articles") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200" title="HTTP 200 OK: Items parsed but already persisted">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
        No New Articles
      </span>
    );
  }

  if (status === "stale_feed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200" title="Feed endpoint active but newest published article is older than 72 hours">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
        Stale Feed (&gt;72h)
      </span>
    );
  }

  if (source.health_status === "error" || status === "http_error" || status === "connection_error") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200" title={source.last_fetch_error || "Feed connection failed"}>
        <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
        Fetch Failed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
      Healthy
    </span>
  );
}

export function SourceManagementView() {
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [logs, setLogs] = useState<IngestionLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [ingesting, setIngesting] = useState<boolean>(false);
  const [ingestingSourceId, setIngestingSourceId] = useState<string | null>(null);
  const [testingSourceId, setTestingSourceId] = useState<string | null>(null);
  const [ingestStatus, setIngestStatus] = useState<string | null>(null);

  // Add Source Form State
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>("");
  const [newTamilName, setNewTamilName] = useState<string>("");
  const [newCategory, setNewCategory] = useState<string>("Tamil News Portal");
  const [newUrl, setNewUrl] = useState<string>("");
  const [newRssUrl, setNewRssUrl] = useState<string>("");
  const [newLanguage, setNewLanguage] = useState<string>("ta");
  const [formTesting, setFormTesting] = useState<boolean>(false);
  const [formTestResult, setFormTestResult] = useState<SourceTestResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Active Test Result Modal / Drawer
  const [activeTestResult, setActiveTestResult] = useState<{
    sourceName: string;
    result: SourceTestResult;
  } | null>(null);

  // Copy notification
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
      setSources((prev) => prev.map((s) => (s.id === sourceId ? updated : s)));
    } catch (err) {
      console.error("Toggle error:", err);
    }
  };

  const handleTestSource = async (source: NewsSource) => {
    setTestingSourceId(source.id);
    try {
      const result = await testSource(source.id);
      setActiveTestResult({ sourceName: source.name, result });
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
    if (!confirm(`Are you sure you want to remove ${name} from the registry?`)) {
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
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-[#E8E8E2] rounded-lg p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Radio className="w-4 h-4 text-zinc-700" />
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight font-serif">
                Source Management & Feed Freshness Hub
              </h2>
            </div>
            <p className="text-xs text-zinc-500 font-medium">
              Regional media syndication registry with conditional ETag validation, HTTP 304 caching, and canonical deduplication
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-[#F4F4F0] hover:bg-zinc-200 text-zinc-800 border border-[#E2E2DC] transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-zinc-600" />
              <span>{showAddForm ? "Close Form" : "Add Publisher"}</span>
            </button>

            <button
              onClick={handleIngestAll}
              disabled={ingesting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${ingesting ? "animate-spin" : ""}`} />
              <span>{ingesting ? "Ingesting Feeds..." : "Ingest All Feeds"}</span>
            </button>
          </div>
        </div>

        {/* Status banner */}
        {ingestStatus && (
          <div className="mt-3 p-2.5 rounded bg-[#F9F9F7] border border-[#E8E8E2] text-xs font-mono text-zinc-800 flex items-center justify-between">
            <span>{ingestStatus}</span>
            <button onClick={() => setIngestStatus(null)} className="text-zinc-400 hover:text-zinc-700 text-xs ml-2 cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* Operational Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#F0F0EB]">
          <div>
            <div className="text-[10px] font-mono uppercase text-zinc-500 font-bold">Registered Publishers</div>
            <div className="text-xl font-bold font-mono text-zinc-900 mt-0.5">
              {activeSourcesCount} / {sources.length}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-zinc-500 font-bold">Real Articles Ingested</div>
            <div className="text-xl font-bold font-mono text-zinc-900 mt-0.5">{totalArticles}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-zinc-500 font-bold">Duplicates Prevented</div>
            <div className="text-xl font-bold font-mono text-zinc-700 mt-0.5">{totalDuplicatesSkipped}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-zinc-500 font-bold">Pipeline Freshness</div>
            <div className="text-xl font-bold font-mono text-emerald-800 mt-0.5">
              {healthyCount} / {sources.length}
            </div>
          </div>
        </div>
      </div>

      {/* Add Source Drawer / Collapsible Form */}
      {showAddForm && (
        <div className="bg-white border border-[#E8E8E2] rounded-lg p-5 shadow-sm space-y-4">
          <div className="border-b border-[#F0F0EB] pb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
              Register New Tamil Media Publisher
            </h3>
            <button onClick={() => setShowAddForm(false)} className="text-xs text-zinc-400 hover:text-zinc-700 cursor-pointer">
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreateSourceSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Publisher Name (English) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Daily Thanthi"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[#F9F9F7] border border-[#E2E2DC] rounded px-3 py-1.5 text-xs text-zinc-900 focus:outline-hidden focus:border-zinc-500 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Publisher Name (தமிழ்)
                </label>
                <input
                  type="text"
                  placeholder="e.g. தினத்தந்தி"
                  value={newTamilName}
                  onChange={(e) => setNewTamilName(e.target.value)}
                  className="w-full bg-[#F9F9F7] border border-[#E2E2DC] rounded px-3 py-1.5 text-xs font-tamil text-zinc-900 focus:outline-hidden focus:border-zinc-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-[#F9F9F7] border border-[#E2E2DC] rounded px-3 py-1.5 text-xs text-zinc-900 focus:outline-hidden focus:border-zinc-500 focus:bg-white cursor-pointer"
                >
                  <option value="Tamil News Portal">Tamil News Portal</option>
                  <option value="Television Broadcast">Television Broadcast</option>
                  <option value="Print Daily">Print Daily</option>
                  <option value="International Bureau">International Bureau</option>
                  <option value="Digital Independent">Digital Independent</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Main Website URL
                </label>
                <input
                  type="url"
                  placeholder="https://www.dailythanthi.com"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full bg-[#F9F9F7] border border-[#E2E2DC] rounded px-3 py-1.5 text-xs text-zinc-900 focus:outline-hidden focus:border-zinc-500 focus:bg-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  RSS / Atom Feed URL *
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/rss.xml"
                    value={newRssUrl}
                    onChange={(e) => setNewRssUrl(e.target.value)}
                    className="flex-1 bg-[#F9F9F7] border border-[#E2E2DC] rounded px-3 py-1.5 text-xs text-zinc-900 font-mono focus:outline-hidden focus:border-zinc-500 focus:bg-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleTestFormUrl}
                    disabled={formTesting || !newRssUrl}
                    className="px-3 py-1.5 rounded text-xs font-semibold bg-[#F4F4F0] text-zinc-800 border border-[#E2E2DC] hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {formTesting ? "Probing..." : "Test Endpoint"}
                  </button>
                </div>
              </div>
            </div>

            {/* Test result box */}
            {formTestResult && (
              <div
                className={`p-3 rounded border text-xs ${
                  formTestResult.status === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-rose-50 border-rose-200 text-rose-900"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  {formTestResult.status === "success" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-700" />
                  )}
                  <span>
                    Endpoint Probe: {formTestResult.status.toUpperCase()} (HTTP{" "}
                    {formTestResult.status_code}, {formTestResult.latency_ms}ms)
                  </span>
                </div>
                {formTestResult.status === "success" ? (
                  <p className="text-emerald-800">
                    Feed parsed successfully. Discovered {formTestResult.items_count} syndicated articles.
                  </p>
                ) : (
                  <p className="text-rose-800">{formTestResult.error}</p>
                )}
              </div>
            )}

            {formError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800">
                {formError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 rounded text-xs text-zinc-600 hover:bg-zinc-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white shadow-2xs cursor-pointer"
              >
                Save & Activate Publisher
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Primary Sources Management Table */}
      <div className="bg-white border border-[#E8E8E2] rounded-lg overflow-hidden shadow-2xs">
        <div className="p-4 sm:p-5 border-b border-[#F0F0EB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-zinc-700" />
              <span>Registered Tamil Media Feeds</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Live status, HTTP 304 validation, timestamps, and deduplication statistics
            </p>
          </div>

          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-[#F9F9F7] hover:bg-zinc-100 border border-[#E2E2DC] text-zinc-700 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Sources List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F4F4F0] text-zinc-600 font-mono border-b border-[#E8E8E2] uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Publisher & Feed URL</th>
                <th className="py-2.5 px-3">Fetch Health</th>
                <th className="py-2.5 px-3">Collection Timestamps</th>
                <th className="py-2.5 px-3">Article Processing Health</th>
                <th className="py-2.5 px-3">Active</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0EB] font-medium">
              {sources.map((source) => (
                <tr key={source.id} className="hover:bg-[#F9F9F7] transition-colors">
                  {/* Publisher & Endpoint */}
                  <td className="py-3 px-4">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded bg-[#F4F4F0] text-zinc-800 border border-[#E2E2DC] flex items-center justify-center font-bold text-[10px] font-mono shrink-0 mt-0.5">
                        {source.name.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-zinc-900 flex items-center gap-1.5">
                          <span>{source.name}</span>
                          <span className="px-1 py-0.2 rounded text-[9px] bg-zinc-100 text-zinc-600 font-mono">
                            {source.language.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500 font-tamil">{source.tamil_name}</div>
                        
                        {/* URL info */}
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-zinc-500 font-mono">
                          <span className="truncate max-w-[220px]" title={source.rss_url}>
                            {source.rss_url}
                          </span>
                          <button
                            onClick={() => handleCopyUrl(source.rss_url)}
                            className="p-0.5 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                            title="Copy RSS URL"
                          >
                            {copiedUrl === source.rss_url ? (
                              <Check className="w-3 h-3 text-emerald-700" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                          <a
                            href={source.rss_url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-0.5 text-zinc-400 hover:text-zinc-800"
                            title="Open XML stream"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Fetch Health & Status Badge */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div>
                      {getFetchStatusBadge(source)}
                    </div>
                    {source.last_fetch_error ? (
                      <div className="text-[10px] text-rose-700 max-w-[170px] truncate mt-1" title={source.last_fetch_error}>
                        {source.last_fetch_error}
                      </div>
                    ) : (
                      <div className="text-[10px] text-zinc-600 mt-1 font-mono">15m interval</div>
                    )}
                  </td>

                  {/* Collection Timestamps */}
                  <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px]">
                    <div className="space-y-0.5 text-zinc-600">
                      <div>
                        <span className="text-zinc-600">Attempt: </span>
                        {formatTimestamp(source.last_fetch_attempt_at || source.last_fetched_at)}
                      </div>
                      <div>
                        <span className="text-zinc-600">Success: </span>
                        <span className="text-zinc-900 font-semibold">{formatTimestamp(source.last_successful_fetch_at || source.last_fetched_at)}</span>
                      </div>
                      <div>
                        <span className="text-zinc-600">Latest Pub: </span>
                        <span className="text-zinc-900 font-semibold">{formatTimestamp(source.last_publication_at)}</span>
                      </div>
                    </div>
                  </td>

                  {/* Article Processing Health */}
                  <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px]">
                    <div>
                      <span className="font-bold text-zinc-900">
                        {source.current_article_count || source.total_articles_fetched || 0}
                      </span>
                      <span className="text-zinc-500"> total</span>
                    </div>
                    <div className="text-zinc-500 text-[10px]">
                      <span>Skipped dupes: {source.skipped_duplicates_count || 0}</span>
                    </div>
                  </td>

                  {/* Enabled Toggle Switch */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <button
                      role="switch"
                      aria-checked={source.is_enabled}
                      onClick={() => handleToggle(source.id)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                        source.is_enabled ? "bg-zinc-900" : "bg-zinc-300"
                      }`}
                      title={source.is_enabled ? "Feed active - click to pause" : "Feed paused - click to resume"}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          source.is_enabled ? "translate-x-4.5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </td>

                  {/* Action Buttons */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleTestSource(source)}
                        disabled={testingSourceId === source.id}
                        className="px-2 py-1 rounded text-xs font-semibold bg-[#F4F4F0] hover:bg-zinc-200 text-zinc-700 transition-colors cursor-pointer"
                        title="Probe feed headers and XML response"
                      >
                        {testingSourceId === source.id ? "Probing..." : "Test"}
                      </button>

                      <button
                        onClick={() => handleIngestSingle(source)}
                        disabled={ingestingSourceId === source.id || !source.is_enabled}
                        className="px-2 py-1 rounded text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white transition-colors cursor-pointer disabled:opacity-40"
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
                        className="p-1 rounded text-zinc-400 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
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

      {/* Live Feed Test Details Modal */}
      {activeTestResult && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full border border-[#E8E8E2] shadow-xl overflow-hidden">
            <div className="p-4 border-b border-[#F0F0EB] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">
                  Endpoint Inspection: {activeTestResult.sourceName}
                </h3>
                <p className="text-xs text-zinc-500">Live RSS/Atom XML response & conditional headers</p>
              </div>
              <button
                onClick={() => setActiveTestResult(null)}
                className="text-zinc-400 hover:text-zinc-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 bg-[#F9F9F7] rounded border border-[#E8E8E2] text-center">
                  <div className="text-[10px] text-zinc-500 font-mono">Status</div>
                  <div className="text-sm font-mono font-bold text-zinc-900 mt-0.5">
                    HTTP {activeTestResult.result.status_code}
                  </div>
                </div>
                <div className="p-2.5 bg-[#F9F9F7] rounded border border-[#E8E8E2] text-center">
                  <div className="text-[10px] text-zinc-500 font-mono">Latency</div>
                  <div className="text-sm font-mono font-bold text-zinc-900 mt-0.5">
                    {activeTestResult.result.latency_ms} ms
                  </div>
                </div>
                <div className="p-2.5 bg-[#F9F9F7] rounded border border-[#E8E8E2] text-center">
                  <div className="text-[10px] text-zinc-500 font-mono">Parsed Items</div>
                  <div className="text-sm font-mono font-bold text-zinc-900 mt-0.5">
                    {activeTestResult.result.items_count}
                  </div>
                </div>
              </div>

              {(activeTestResult.result.etag || activeTestResult.result.last_modified) && (
                <div className="p-2.5 rounded bg-[#F9F9F7] border border-[#E8E8E2] text-[11px] font-mono space-y-1">
                  {activeTestResult.result.etag && (
                    <div>
                      <span className="text-zinc-500">ETag: </span>
                      <span className="text-zinc-800">{activeTestResult.result.etag}</span>
                    </div>
                  )}
                  {activeTestResult.result.last_modified && (
                    <div>
                      <span className="text-zinc-500">Last-Modified: </span>
                      <span className="text-zinc-800">{activeTestResult.result.last_modified}</span>
                    </div>
                  )}
                </div>
              )}

              {activeTestResult.result.error && (
                <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {activeTestResult.result.error}
                </div>
              )}

              {/* Sample Articles from XML Stream */}
              {activeTestResult.result.sample_items && activeTestResult.result.sample_items.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#F0F0EB]">
                  <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2">
                    Sample Articles from XML Stream
                  </h4>
                  <div className="space-y-2">
                    {activeTestResult.result.sample_items.slice(0, 4).map((item, idx) => (
                      <div key={idx} className="p-2.5 bg-[#F9F9F7] rounded border border-[#E8E8E2] text-xs">
                        <div className="font-bold text-zinc-900 font-tamil leading-snug">{item.title}</div>
                        {item.pub_date && (
                          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{item.pub_date}</div>
                        )}
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-zinc-800 hover:underline flex items-center gap-1 mt-1 font-mono truncate"
                        >
                          <span>{item.link}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-[#F9F9F7] border-t border-[#E8E8E2] flex justify-end">
              <button
                onClick={() => setActiveTestResult(null)}
                className="px-3 py-1 rounded text-xs font-semibold bg-zinc-900 text-white cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ingestion Audit Trail Table */}
      <div className="bg-white border border-[#E8E8E2] rounded-lg overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-[#F0F0EB] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-zinc-700" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
              Live Ingestion Audit Logs
            </h3>
          </div>
          <span className="text-[11px] text-zinc-500 font-mono">Last 30 polling events</span>
        </div>

        <div className="overflow-x-auto max-h-72 overflow-y-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#F4F4F0] text-zinc-600 border-b border-[#E8E8E2] uppercase text-[10px] sticky top-0">
              <tr>
                <th className="py-2 px-3">Timestamp</th>
                <th className="py-2 px-3">Publisher</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">HTTP</th>
                <th className="py-2 px-3">Found</th>
                <th className="py-2 px-3">New Added</th>
                <th className="py-2 px-3">Dupes</th>
                <th className="py-2 px-3">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0EB] text-[11px]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-zinc-400">
                    No ingestion logs recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F9F9F7]">
                    <td className="py-1.5 px-3 text-zinc-500 whitespace-nowrap">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="py-1.5 px-3 font-bold text-zinc-800 whitespace-nowrap">
                      {log.source_name}
                    </td>
                    <td className="py-1.5 px-3 whitespace-nowrap">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] ${
                          log.status === "not_modified_304"
                            ? "bg-zinc-100 text-zinc-700"
                            : log.status === "new_articles"
                            ? "bg-emerald-50 text-emerald-800"
                            : log.status === "error"
                            ? "bg-rose-50 text-rose-800"
                            : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 text-zinc-700">{log.http_status}</td>
                    <td className="py-1.5 px-3 text-zinc-700">{log.items_found}</td>
                    <td className="py-1.5 px-3 text-emerald-800 font-bold">{log.new_items_added}</td>
                    <td className="py-1.5 px-3 text-zinc-500">{log.skipped_duplicates}</td>
                    <td className="py-1.5 px-3 text-zinc-500">{log.duration_ms}ms</td>
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
