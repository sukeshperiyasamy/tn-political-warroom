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
  Settings,
  Sliders,
  Shield,
  Save,
  RotateCcw,
  Building,
  Palette,
  Sparkles,
  TrendingUp,
  Flame,
  Globe,
  UserCheck,
  Tv,
} from "lucide-react";
import {
  NewsSource,
  SourceTestResult,
  IngestionLog,
  IngestResponse,
  ClientConfig,
  TrendingTopic,
} from "../../types/political";
import {
  fetchSources,
  toggleSource,
  testSource,
  testCustomUrl,
  createSource,
  deleteSource,
  triggerIngest,
  fetchLogs,
  updateClientConfig,
  resetClientConfig,
  fetchTrendingPulse,
} from "../../lib/api";

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
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-subtle text-ink-soft border border-line">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
        Disabled
      </span>
    );
  }

  if (status === "not_modified_304") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-subtle text-ink border border-line-strong" title="HTTP 304 Not Modified: Feed XML unchanged on server">
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
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-subtle text-ink-soft border border-line" title="HTTP 200 OK: Items parsed but already persisted">
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

interface SourceManagementViewProps {
  clientConfig?: ClientConfig | null;
  onConfigUpdated?: (config: ClientConfig) => void;
}

export function SourceManagementView({ clientConfig, onConfigUpdated }: SourceManagementViewProps) {
  const [adminTab, setAdminTab] = useState<"sources" | "branding">("sources");

  // Client configuration local state
  const [configState, setConfigState] = useState<Partial<ClientConfig>>({
    client_name: "Tamil Nadu Strategic Intelligence Bureau",
    client_tagline: "Public Opinion & Media Analytics Command",
    logo_url: "",
    brand_color: "#0F172A",
    accent_color: "#2563EB",
    selected_parties: ["DMK", "AIADMK", "BJP", "INC", "TVK", "NTK", "PMK", "VCK"],
    selected_leaders: ["MK Stalin", "Edappadi Palaniswami", "K Annamalai", "Vijay", "Seeman", "Udhayanidhi Stalin"],
    topics_of_interest: ["Welfare Schemes", "Infrastructure", "Corruption & Governance", "Education & NEET", "Language & Federalism", "Law & Order", "Fishermen Rights"],
    authorized_sources: ["daily_thanthi", "dinamalar", "dinakaran", "puthiyathalaimurai", "bbc_tamil", "the_hindu_tamil"],
    authorized_connectors: ["news", "youtube", "x", "reddit", "instagram", "facebook", "google_trends"],
    default_language: "ta",
    default_demo_scenario: "scenario_policy_announcement",
  });
  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [configFeedback, setConfigFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (clientConfig) {
      setConfigState({
        client_name: clientConfig.client_name || "",
        client_tagline: clientConfig.client_tagline || "",
        logo_url: clientConfig.logo_url || "",
        brand_color: clientConfig.brand_color || "#0F172A",
        accent_color: clientConfig.accent_color || "#2563EB",
        selected_parties: clientConfig.selected_parties || [],
        selected_leaders: clientConfig.selected_leaders || [],
        topics_of_interest: clientConfig.topics_of_interest || [],
        authorized_sources: clientConfig.authorized_sources || [],
        authorized_connectors: clientConfig.authorized_connectors || [],
        default_language: clientConfig.default_language || "ta",
        default_demo_scenario: clientConfig.default_demo_scenario || "scenario_policy_announcement",
      });
    }
  }, [clientConfig]);

  const toggleArrayItem = (field: keyof ClientConfig, item: string) => {
    setConfigState((prev) => {
      const arr = (prev[field] as string[]) || [];
      const updated = arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
      return { ...prev, [field]: updated };
    });
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setConfigFeedback(null);
    try {
      const saved = await updateClientConfig(configState);
      setConfigFeedback({ type: "success", text: "Client configuration successfully updated and persisted." });
      if (onConfigUpdated) onConfigUpdated(saved);
    } catch (err: any) {
      setConfigFeedback({ type: "error", text: err.message || "Failed to update client configuration" });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleResetConfig = async () => {
    if (!confirm("Reset client workspace configuration to Bureau defaults?")) return;
    setSavingConfig(true);
    setConfigFeedback(null);
    try {
      const reset = await resetClientConfig();
      setConfigFeedback({ type: "success", text: "Configuration reset to default Bureau profile." });
      setConfigState(reset);
      if (onConfigUpdated) onConfigUpdated(reset);
    } catch (err: any) {
      setConfigFeedback({ type: "error", text: err.message || "Failed to reset configuration" });
    } finally {
      setSavingConfig(false);
    }
  };

  const [sources, setSources] = useState<NewsSource[]>([]);
  const [logs, setLogs] = useState<IngestionLog[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [sourceGroupTab, setSourceGroupTab] = useState<"all" | "news_media" | "influencers">("all");
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
  const [newSourceType, setNewSourceType] = useState<string>("NEWS_MEDIA");
  const [newPlatform, setNewPlatform] = useState<string>("web");
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
      const [srcList, logList, trendRes] = await Promise.all([
        fetchSources(),
        fetchLogs(30),
        fetchTrendingPulse("24h", "live", 12).catch(() => null),
      ]);
      setSources(srcList);
      setLogs(logList);
      if (trendRes && trendRes.trending_topics) {
        setTrendingTopics(trendRes.trending_topics);
      }
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
        source_type: newSourceType,
        platform: newPlatform,
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
      setNewSourceType("NEWS_MEDIA");
      setNewPlatform("web");
      setFormTestResult(null);
      setIngestStatus(`✓ Added ${created.name}. You can now run ingestion on it.`);
    } catch (err: any) {
      setFormError(err.message || "Failed to register new source");
    }
  };

  const isInfluencerSource = (source: NewsSource): boolean => {
    if (source.source_type === "INFLUENCER" || source.source_type === "SOCIAL_MEDIA") return true;
    const cat = (source.category || "").toLowerCase();
    return (
      cat.includes("influencer") ||
      cat.includes("commentator") ||
      cat.includes("commentary") ||
      cat.includes("investigative") ||
      source.id === "savukku_media" ||
      source.id === "maridhas_official" ||
      source.id === "redpix_24x7" ||
      source.id === "aadhan_tamil" ||
      source.id === "gunasekaran_news" ||
      source.id === "nakkheeran_tv"
    );
  };

  const newsMediaSources = sources.filter((s) => !isInfluencerSource(s));
  const influencerSources = sources.filter((s) => isInfluencerSource(s));

  const filteredSources =
    sourceGroupTab === "news_media"
      ? newsMediaSources
      : sourceGroupTab === "influencers"
      ? influencerSources
      : sources;

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
      <div className="bg-surface border border-line rounded-xl p-4 sm:p-5 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Radio className="w-4 h-4 text-ink-soft" />
              <h2 className="text-base sm:text-lg font-bold text-ink tracking-tight font-serif">
                {adminTab === "sources" ? "Source Management & Feed Freshness Hub" : "Client Workspace & Branding Administration"}
              </h2>
            </div>
            <p className="text-xs text-ink-muted font-medium">
              {adminTab === "sources"
                ? "Regional media syndication registry with conditional ETag validation, HTTP 304 caching, and canonical deduplication"
                : "Manage client organization profile, brand assets, targeted parties, monitored topics, and deployment defaults"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex p-1 bg-subtle rounded-md border border-line mr-1">
              <button
                type="button"
                onClick={() => setAdminTab("sources")}
                className={`px-3 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                  adminTab === "sources" ? "bg-surface text-ink shadow-card" : "text-ink-soft hover:text-ink"
                }`}
              >
                Media Feeds Hub
              </button>
              <button
                type="button"
                onClick={() => setAdminTab("branding")}
                className={`px-3 py-1 text-xs font-semibold rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
                  adminTab === "branding" ? "bg-surface text-ink shadow-card" : "text-ink-soft hover:text-ink"
                }`}
              >
                <Sliders className="w-3 h-3 text-ink-soft" />
                <span>Client Settings</span>
              </button>
            </div>

            {adminTab === "sources" ? (
              <>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-subtle hover:bg-line text-ink border border-line transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-ink-soft" />
                  <span>{showAddForm ? "Close Form" : "Add Publisher"}</span>
                </button>

                <button
                  onClick={handleIngestAll}
                  disabled={ingesting}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold bg-ink hover:bg-ink-soft text-white shadow-card transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 ${ingesting ? "animate-spin" : ""}`} />
                  <span>{ingesting ? "Ingesting Feeds..." : "Ingest All Feeds"}</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleResetConfig}
                  disabled={savingConfig}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-subtle hover:bg-line text-ink-soft border border-line transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-ink-muted" />
                  <span>Reset Defaults</span>
                </button>
                <button
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-bold bg-ink hover:bg-ink-soft text-white shadow-card transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5 text-zinc-100" />
                  <span>{savingConfig ? "Saving..." : "Save Configuration"}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Status banner */}
        {ingestStatus && (
          <div className="mt-3 p-2.5 rounded bg-canvas border border-line text-xs font-mono text-ink flex items-center justify-between">
            <span>{ingestStatus}</span>
            <button onClick={() => setIngestStatus(null)} className="text-ink-muted hover:text-ink-soft text-xs ml-2 cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* Operational Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-line">
          <div>
            <div className="text-[10px] font-mono uppercase text-ink-muted font-bold">Registered Publishers</div>
            <div className="text-xl font-bold font-mono text-ink mt-0.5">
              {activeSourcesCount} / {sources.length}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-ink-muted font-bold">Real Articles Ingested</div>
            <div className="text-xl font-bold font-mono text-ink mt-0.5">{totalArticles}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-ink-muted font-bold">Duplicates Prevented</div>
            <div className="text-xl font-bold font-mono text-ink-soft mt-0.5">{totalDuplicatesSkipped}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-ink-muted font-bold">Pipeline Freshness</div>
            <div className="text-xl font-bold font-mono text-emerald-800 mt-0.5">
              {healthyCount} / {sources.length}
            </div>
          </div>
        </div>
      </div>

      {adminTab === "branding" ? (
        <div className="space-y-6">
          {/* Feedback banner */}
          {configFeedback && (
            <div
              className={`p-3 rounded border text-xs font-medium flex items-center justify-between ${
                configFeedback.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-rose-50 border-rose-200 text-rose-900"
              }`}
            >
              <div className="flex items-center gap-2">
                {configFeedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                )}
                <span>{configFeedback.text}</span>
              </div>
              <button
                onClick={() => setConfigFeedback(null)}
                className="text-ink-muted hover:text-ink-soft text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Section 1: Client Organization & Brand Identity */}
          <div className="bg-surface border border-line rounded-xl p-5 shadow-card space-y-4">
            <div className="border-b border-line pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-2">
                  <Building className="w-4 h-4 text-ink-soft" />
                  <span>Organization & Visual Branding</span>
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Customizes the platform banner, report headers, and dashboard identity for the client.
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-subtle text-ink-soft border border-line">
                DB-Backed Profile
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Client / Bureau Display Name *
                </label>
                <input
                  type="text"
                  value={configState.client_name || ""}
                  onChange={(e) => setConfigState({ ...configState, client_name: e.target.value })}
                  placeholder="e.g. Tamil Nadu Strategic Intelligence Bureau"
                  className="w-full bg-canvas border border-line rounded px-3 py-2 text-xs text-ink font-medium focus:outline-hidden focus:border-zinc-500 focus:bg-surface"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Tagline / Operational Subtitle
                </label>
                <input
                  type="text"
                  value={configState.client_tagline || ""}
                  onChange={(e) => setConfigState({ ...configState, client_tagline: e.target.value })}
                  placeholder="e.g. Public Opinion & Media Analytics Command"
                  className="w-full bg-canvas border border-line rounded px-3 py-2 text-xs text-ink focus:outline-hidden focus:border-zinc-500 focus:bg-surface"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Logo Image URL (Optional)
                </label>
                <input
                  type="url"
                  value={configState.logo_url || ""}
                  onChange={(e) => setConfigState({ ...configState, logo_url: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="w-full bg-canvas border border-line rounded px-3 py-2 text-xs text-ink font-mono focus:outline-hidden focus:border-zinc-500 focus:bg-surface"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Primary Brand Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={configState.brand_color || "#0F172A"}
                      onChange={(e) => setConfigState({ ...configState, brand_color: e.target.value })}
                      className="w-8 h-8 rounded border border-line p-0.5 cursor-pointer bg-surface"
                    />
                    <input
                      type="text"
                      value={configState.brand_color || "#0F172A"}
                      onChange={(e) => setConfigState({ ...configState, brand_color: e.target.value })}
                      className="flex-1 bg-canvas border border-line rounded px-2.5 py-1.5 text-xs font-mono text-ink"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Accent Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={configState.accent_color || "#2563EB"}
                      onChange={(e) => setConfigState({ ...configState, accent_color: e.target.value })}
                      className="w-8 h-8 rounded border border-line p-0.5 cursor-pointer bg-surface"
                    />
                    <input
                      type="text"
                      value={configState.accent_color || "#2563EB"}
                      onChange={(e) => setConfigState({ ...configState, accent_color: e.target.value })}
                      className="flex-1 bg-canvas border border-line rounded px-2.5 py-1.5 text-xs font-mono text-ink"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Targeted Political Entities */}
          <div className="bg-surface border border-line rounded-xl p-5 shadow-card space-y-4">
            <div className="border-b border-line pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-2">
                <Tag className="w-4 h-4 text-ink-soft" />
                <span>Monitored Political Parties & Key Leaders</span>
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Toggle the parties and prominent leaders included in comparative analytics and brief synthesis.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-2">
                  Targeted Political Parties
                </label>
                <div className="flex flex-wrap gap-2">
                  {["DMK", "AIADMK", "BJP", "INC", "TVK", "NTK", "PMK", "VCK"].map((party) => {
                    const isSelected = (configState.selected_parties || []).includes(party);
                    return (
                      <button
                        key={party}
                        type="button"
                        onClick={() => toggleArrayItem("selected_parties", party)}
                        className={`px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer border ${
                          isSelected
                            ? "bg-ink text-white border-zinc-900 shadow-card"
                            : "bg-canvas text-ink-soft border-line hover:border-line-strong"
                        }`}
                      >
                        {isSelected ? "✓ " : "+ "}
                        {party}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-2">
                  Key Monitored Leaders
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    "MK Stalin",
                    "Edappadi Palaniswami",
                    "K Annamalai",
                    "Vijay",
                    "Seeman",
                    "Udhayanidhi Stalin",
                    "TR Baalu",
                    "O Panneerselvam",
                  ].map((leader) => {
                    const isSelected = (configState.selected_leaders || []).includes(leader);
                    return (
                      <button
                        key={leader}
                        type="button"
                        onClick={() => toggleArrayItem("selected_leaders", leader)}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer border ${
                          isSelected
                            ? "bg-blue-900 text-white border-blue-900 shadow-card"
                            : "bg-canvas text-ink-soft border-line hover:border-line-strong"
                        }`}
                      >
                        {isSelected ? "✓ " : "+ "}
                        {leader}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Topics & Channels Configuration */}
          <div className="bg-surface border border-line rounded-xl p-5 shadow-card space-y-4">
            <div className="border-b border-line pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-2">
                <Sliders className="w-4 h-4 text-ink-soft" />
                <span>Policy Topics & Authorized Channels</span>
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Select prioritized policy areas and specify which multi-source channels are activated for intelligence discovery.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-2">
                  Policy Topics of Interest
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Welfare Schemes",
                    "Infrastructure",
                    "Corruption & Governance",
                    "Education & NEET",
                    "Language & Federalism",
                    "Law & Order",
                    "Fishermen Rights",
                    "Temple Administration",
                    "Youth & Unemployment",
                    "State Financial Autonomy",
                  ].map((topic) => {
                    const isSelected = (configState.topics_of_interest || []).includes(topic);
                    return (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => toggleArrayItem("topics_of_interest", topic)}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer border ${
                          isSelected
                            ? "bg-emerald-900 text-white border-emerald-900 shadow-card"
                            : "bg-canvas text-ink-soft border-line hover:border-line-strong"
                        }`}
                      >
                        {isSelected ? "✓ " : "+ "}
                        {topic}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-2">
                  Authorized Multi-Source Connectors
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: "news", name: "Tamil News RSS", desc: "Regional press feeds" },
                    { id: "youtube", name: "YouTube Data API", desc: "Public political channels" },
                    { id: "x", name: "X / Twitter API", desc: "Public hashtag commentary" },
                    { id: "reddit", name: "Reddit Public", desc: "r/TamilNadu discussions" },
                    { id: "instagram", name: "Instagram Graph", desc: "Public political reels" },
                    { id: "facebook", name: "Facebook Pages", desc: "Verified party pages" },
                    { id: "google_trends", name: "Google Trends", desc: "Regional search momentum" },
                  ].map((conn) => {
                    const isAuth = (configState.authorized_connectors || []).includes(conn.id);
                    return (
                      <div
                        key={conn.id}
                        onClick={() => toggleArrayItem("authorized_connectors", conn.id)}
                        className={`p-3 rounded border text-xs cursor-pointer transition-all ${
                          isAuth
                            ? "bg-subtle border-zinc-800 text-ink shadow-card"
                            : "bg-canvas border-line text-ink-muted opacity-60"
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold mb-0.5">
                          <span>{conn.name}</span>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isAuth ? "bg-emerald-600" : "bg-zinc-300"
                            }`}
                          />
                        </div>
                        <p className="text-[11px] text-ink-muted">{conn.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Default Working Language
                  </label>
                  <select
                    value={configState.default_language || "ta"}
                    onChange={(e) => setConfigState({ ...configState, default_language: e.target.value })}
                    className="w-full bg-canvas border border-line rounded px-3 py-2 text-xs text-ink focus:outline-hidden focus:border-zinc-500 focus:bg-surface cursor-pointer"
                  >
                    <option value="ta">Tamil (தமிழ்) — Primary</option>
                    <option value="en">English — Primary</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Default Client Demo Scenario
                  </label>
                  <select
                    value={configState.default_demo_scenario || "scenario_policy_announcement"}
                    onChange={(e) =>
                      setConfigState({ ...configState, default_demo_scenario: e.target.value })
                    }
                    className="w-full bg-canvas border border-line rounded px-3 py-2 text-xs text-ink focus:outline-hidden focus:border-zinc-500 focus:bg-surface cursor-pointer"
                  >
                    <option value="scenario_policy_announcement">
                      Policy Announcement: Kalaignar Magalir Urimai Thogai Expansion
                    </option>
                    <option value="scenario_leader_speech">
                      Leader Speech: TVK Vijay Youth & Education Address
                    </option>
                    <option value="scenario_political_controversy">
                      Political Controversy: DMK vs BJP Budget & Fund Allocation
                    </option>
                    <option value="scenario_cross_party_debate">
                      Cross-Party Debate: NEET Exemption & State Autonomy
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-line">
              <button
                type="button"
                onClick={handleResetConfig}
                disabled={savingConfig}
                className="px-3.5 py-2 rounded text-xs font-medium text-ink-soft hover:text-ink hover:bg-subtle border border-line cursor-pointer"
              >
                Reset to Bureau Defaults
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={savingConfig}
                className="px-5 py-2 rounded text-xs font-bold bg-ink hover:bg-ink-soft text-white shadow-card cursor-pointer flex items-center gap-2"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingConfig ? "Saving Client Settings..." : "Save Client Configuration"}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Add Source Drawer / Collapsible Form */}
          {showAddForm && (
            <div className="bg-surface border border-line rounded-xl p-5 shadow-sm space-y-4">
              <div className="border-b border-line pb-2 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                  Register New Tamil Media Publisher
            </h3>
            <button onClick={() => setShowAddForm(false)} className="text-xs text-ink-muted hover:text-ink-soft cursor-pointer">
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreateSourceSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Publisher Name (English) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Daily Thanthi"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-canvas border border-line rounded px-3 py-1.5 text-xs text-ink focus:outline-hidden focus:border-zinc-500 focus:bg-surface"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Publisher Name (தமிழ்)
                </label>
                <input
                  type="text"
                  placeholder="e.g. தினத்தந்தி"
                  value={newTamilName}
                  onChange={(e) => setNewTamilName(e.target.value)}
                  className="w-full bg-canvas border border-line rounded px-3 py-1.5 text-xs font-tamil text-ink focus:outline-hidden focus:border-zinc-500 focus:bg-surface"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-canvas border border-line rounded px-3 py-1.5 text-xs text-ink focus:outline-hidden focus:border-zinc-500 focus:bg-surface cursor-pointer"
                >
                  <option value="Tamil News Portal">Tamil News Portal</option>
                  <option value="Television Broadcast">Television Broadcast</option>
                  <option value="Print Daily">Print Daily</option>
                  <option value="International Bureau">International Bureau</option>
                  <option value="Digital Independent">Digital Independent</option>
                  <option value="Political Influencer">Political Influencer</option>
                  <option value="Political Commentator">Political Commentator</option>
                  <option value="Investigative Journalism">Investigative Journalism</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Source Classification
                </label>
                <select
                  value={newSourceType}
                  onChange={(e) => setNewSourceType(e.target.value)}
                  className="w-full bg-canvas border border-line rounded px-3 py-1.5 text-xs text-ink focus:outline-hidden focus:border-zinc-500 focus:bg-surface cursor-pointer"
                >
                  <option value="NEWS_MEDIA">Group A: News Media (TV, Print, Portals)</option>
                  <option value="INFLUENCER">Group B: Influencer / Commentator</option>
                  <option value="SOCIAL_MEDIA">Group B: Social Media Channel</option>
                  <option value="OTHER">Other Intelligence Source</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Delivery Platform
                </label>
                <select
                  value={newPlatform}
                  onChange={(e) => setNewPlatform(e.target.value)}
                  className="w-full bg-canvas border border-line rounded px-3 py-1.5 text-xs text-ink focus:outline-hidden focus:border-zinc-500 focus:bg-surface cursor-pointer"
                >
                  <option value="web">Web (RSS / Atom XML)</option>
                  <option value="youtube">YouTube (Channel RSS)</option>
                  <option value="x">X / Twitter</option>
                  <option value="facebook">Facebook Public</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Main Website / Profile URL
                </label>
                <input
                  type="url"
                  placeholder="https://www.dailythanthi.com or channel link"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full bg-canvas border border-line rounded px-3 py-1.5 text-xs text-ink focus:outline-hidden focus:border-zinc-500 focus:bg-surface"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  RSS / Atom Feed URL *
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/rss.xml"
                    value={newRssUrl}
                    onChange={(e) => setNewRssUrl(e.target.value)}
                    className="flex-1 bg-canvas border border-line rounded px-3 py-1.5 text-xs text-ink font-mono focus:outline-hidden focus:border-zinc-500 focus:bg-surface"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleTestFormUrl}
                    disabled={formTesting || !newRssUrl}
                    className="px-3 py-1.5 rounded text-xs font-semibold bg-subtle text-ink border border-line hover:bg-line transition-colors cursor-pointer disabled:opacity-50"
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
                className="px-3 py-1.5 rounded text-xs text-ink-soft hover:bg-subtle cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded text-xs font-semibold bg-ink hover:bg-ink-soft text-white shadow-card cursor-pointer"
              >
                Save & Activate Publisher
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Source Classification Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 bg-subtle p-1.5 rounded-lg border border-line">
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setSourceGroupTab("all")}
            className={`flex-1 sm:flex-initial px-3 py-2 sm:py-1.5 rounded text-xs font-semibold transition-all cursor-pointer min-h-[40px] sm:min-h-[34px] text-center ${
              sourceGroupTab === "all"
                ? "bg-ink text-white shadow-card font-bold"
                : "text-ink-soft hover:text-ink hover:bg-line"
            }`}
          >
            All Sources ({sources.length})
          </button>
          <button
            onClick={() => setSourceGroupTab("news_media")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded text-xs font-semibold transition-all cursor-pointer min-h-[40px] sm:min-h-[34px] text-center ${
              sourceGroupTab === "news_media"
                ? "bg-blue-600 text-white shadow-card font-bold"
                : "text-ink-soft hover:text-ink hover:bg-line"
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Group A: News ({newsMediaSources.length})</span>
          </button>
          <button
            onClick={() => setSourceGroupTab("influencers")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded text-xs font-semibold transition-all cursor-pointer min-h-[40px] sm:min-h-[34px] text-center ${
              sourceGroupTab === "influencers"
                ? "bg-purple-600 text-white shadow-card font-bold"
                : "text-ink-soft hover:text-ink hover:bg-line"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Group B: Creators ({influencerSources.length})</span>
          </button>
        </div>

        <button
          onClick={loadData}
          className="flex items-center justify-center gap-1 px-3 py-2 sm:py-1 rounded text-xs font-medium bg-surface hover:bg-subtle border border-line text-ink-soft cursor-pointer shadow-card min-h-[40px] sm:min-h-[34px] w-full sm:w-auto"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Refresh All</span>
        </button>
      </div>

      {/* Main Grid: Left Sources (8 cols) + Right Trending Now (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Group A & Group B Tables */}
        <div className="lg:col-span-8 space-y-6 min-w-0">
          {/* GROUP A: News Media Publishers */}
          {(sourceGroupTab === "all" || sourceGroupTab === "news_media") && (
            <div className="bg-surface border border-line rounded-xl overflow-hidden shadow-card">
              <div className="p-4 sm:p-5 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-canvas">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-blue-100 text-blue-700">
                      <Tv className="w-3.5 h-3.5" />
                    </span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ink font-mono">
                      Group A: News Media Publishers ({newsMediaSources.length})
                    </h3>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200">
                      NEWS_MEDIA
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Television channels, newspaper websites, and verified Tamil digital news portals
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs min-w-[640px]">
                  <thead className="bg-subtle text-ink-soft font-mono border-b border-line uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4">Publisher & Feed URL</th>
                      <th className="py-2.5 px-3">Fetch Health</th>
                      <th className="py-2.5 px-3">Timestamps</th>
                      <th className="py-2.5 px-3">Articles</th>
                      <th className="py-2.5 px-3">Active</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line font-medium">
                    {newsMediaSources.map((source) => (
                      <tr key={source.id} className="hover:bg-canvas transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-start gap-2.5">
                            <div className="w-7 h-7 rounded bg-blue-50 text-blue-900 border border-blue-200 flex items-center justify-center font-bold text-[10px] font-mono shrink-0 mt-0.5">
                              {source.name.slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-ink flex items-center gap-1.5 flex-wrap">
                                <span>{source.name}</span>
                                <span className="px-1 py-0.2 rounded text-[9px] bg-blue-50 text-blue-700 font-mono border border-blue-100">
                                  {source.category || "News Media"}
                                </span>
                                <span className="px-1 py-0.2 rounded text-[9px] bg-subtle text-ink-soft font-mono uppercase">
                                  {source.platform || "web"}
                                </span>
                              </div>
                              <div className="text-[11px] text-ink-muted font-tamil">{source.tamil_name}</div>
                              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-ink-muted font-mono">
                                <span className="truncate max-w-[180px]" title={source.rss_url}>
                                  {source.rss_url}
                                </span>
                                <button
                                  onClick={() => handleCopyUrl(source.rss_url)}
                                  className="p-0.5 text-ink-muted hover:text-ink-soft cursor-pointer"
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
                                  className="p-0.5 text-ink-muted hover:text-ink"
                                  title="Open XML stream"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <div>{getFetchStatusBadge(source)}</div>
                          {source.last_fetch_error ? (
                            <div className="text-[10px] text-rose-700 max-w-[140px] truncate mt-1" title={source.last_fetch_error}>
                              {source.last_fetch_error}
                            </div>
                          ) : (
                            <div className="text-[10px] text-ink-muted mt-1 font-mono">15m interval</div>
                          )}
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap font-mono text-[10px]">
                          <div className="space-y-0.5 text-ink-soft">
                            <div><span className="text-ink-muted">Succ:</span> {formatTimestamp(source.last_successful_fetch_at || source.last_fetched_at)}</div>
                            <div><span className="text-ink-muted">Pub:</span> <span className="text-ink font-semibold">{formatTimestamp(source.last_publication_at)}</span></div>
                          </div>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px]">
                          <span className="font-bold text-ink">
                            {source.current_article_count || source.total_articles_fetched || 0}
                          </span>
                          <div className="text-ink-muted text-[10px]">
                            dup: {source.skipped_duplicates_count || 0}
                          </div>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <button
                            role="switch"
                            aria-checked={source.is_enabled}
                            onClick={() => handleToggle(source.id)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                              source.is_enabled ? "bg-ink" : "bg-zinc-300"
                            }`}
                            title={source.is_enabled ? "Active" : "Paused"}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-surface transition-transform ${
                                source.is_enabled ? "translate-x-4.5" : "translate-x-0.5"
                              }`}
                            />
                          </button>
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleTestSource(source)}
                              disabled={testingSourceId === source.id}
                              className="px-2 py-1 rounded text-xs font-semibold bg-subtle hover:bg-line text-ink-soft transition-colors cursor-pointer"
                            >
                              {testingSourceId === source.id ? "Probing..." : "Test"}
                            </button>
                            <button
                              onClick={() => handleIngestSingle(source)}
                              disabled={ingestingSourceId === source.id || !source.is_enabled}
                              className="px-2 py-1 rounded text-xs font-semibold bg-ink hover:bg-ink-soft text-white transition-colors cursor-pointer disabled:opacity-40"
                            >
                              {ingestingSourceId === source.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                "Ingest"
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(source.id, source.name)}
                              className="p-1 rounded text-ink-muted hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
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
          )}

          {/* GROUP B: Influencers & Social Media Creators */}
          {(sourceGroupTab === "all" || sourceGroupTab === "influencers") && (
            <div className="bg-surface border border-line rounded-xl overflow-hidden shadow-card">
              <div className="p-4 sm:p-5 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-canvas">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-purple-100 text-purple-700">
                      <UserCheck className="w-3.5 h-3.5" />
                    </span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ink font-mono">
                      Group B: Influencers & Political Creators ({influencerSources.length})
                    </h3>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-50 text-purple-800 border border-purple-200">
                      INFLUENCER / SOCIAL
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Political commentators, investigative analysts, and high-impact Tamil YouTube channels
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs min-w-[640px]">
                  <thead className="bg-subtle text-ink-soft font-mono border-b border-line uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4">Creator / Channel & Feed</th>
                      <th className="py-2.5 px-3">Fetch Health</th>
                      <th className="py-2.5 px-3">Timestamps</th>
                      <th className="py-2.5 px-3">Dispatches</th>
                      <th className="py-2.5 px-3">Active</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line font-medium">
                    {influencerSources.map((source) => (
                      <tr key={source.id} className="hover:bg-canvas transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-start gap-2.5">
                            <div className="w-7 h-7 rounded bg-purple-50 text-purple-900 border border-purple-200 flex items-center justify-center font-bold text-[10px] font-mono shrink-0 mt-0.5">
                              {source.name.slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-ink flex items-center gap-1.5 flex-wrap">
                                <span>{source.name}</span>
                                <span className="px-1 py-0.2 rounded text-[9px] bg-purple-50 text-purple-700 font-mono border border-purple-100">
                                  {source.category || "Political Influencer"}
                                </span>
                                <span className="px-1 py-0.2 rounded text-[9px] bg-red-50 text-red-700 font-mono border border-red-100 uppercase">
                                  {source.platform || "youtube"}
                                </span>
                              </div>
                              <div className="text-[11px] text-ink-muted font-tamil">{source.tamil_name}</div>
                              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-ink-muted font-mono">
                                <span className="truncate max-w-[180px]" title={source.rss_url}>
                                  {source.rss_url}
                                </span>
                                <button
                                  onClick={() => handleCopyUrl(source.rss_url)}
                                  className="p-0.5 text-ink-muted hover:text-ink-soft cursor-pointer"
                                  title="Copy Channel RSS URL"
                                >
                                  {copiedUrl === source.rss_url ? (
                                    <Check className="w-3 h-3 text-emerald-700" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                                <a
                                  href={source.url || source.rss_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-0.5 text-ink-muted hover:text-ink"
                                  title="Open Channel / Profile"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <div>{getFetchStatusBadge(source)}</div>
                          {source.last_fetch_error ? (
                            <div className="text-[10px] text-rose-700 max-w-[140px] truncate mt-1" title={source.last_fetch_error}>
                              {source.last_fetch_error}
                            </div>
                          ) : (
                            <div className="text-[10px] text-ink-muted mt-1 font-mono">15m interval</div>
                          )}
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap font-mono text-[10px]">
                          <div className="space-y-0.5 text-ink-soft">
                            <div><span className="text-ink-muted">Succ:</span> {formatTimestamp(source.last_successful_fetch_at || source.last_fetched_at)}</div>
                            <div><span className="text-ink-muted">Pub:</span> <span className="text-ink font-semibold">{formatTimestamp(source.last_publication_at)}</span></div>
                          </div>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px]">
                          <span className="font-bold text-ink">
                            {source.current_article_count || source.total_articles_fetched || 0}
                          </span>
                          <div className="text-ink-muted text-[10px]">
                            dup: {source.skipped_duplicates_count || 0}
                          </div>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <button
                            role="switch"
                            aria-checked={source.is_enabled}
                            onClick={() => handleToggle(source.id)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                              source.is_enabled ? "bg-ink" : "bg-zinc-300"
                            }`}
                            title={source.is_enabled ? "Active" : "Paused"}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-surface transition-transform ${
                                source.is_enabled ? "translate-x-4.5" : "translate-x-0.5"
                              }`}
                            />
                          </button>
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleTestSource(source)}
                              disabled={testingSourceId === source.id}
                              className="px-2 py-1 rounded text-xs font-semibold bg-subtle hover:bg-line text-ink-soft transition-colors cursor-pointer"
                            >
                              {testingSourceId === source.id ? "Probing..." : "Test"}
                            </button>
                            <button
                              onClick={() => handleIngestSingle(source)}
                              disabled={ingestingSourceId === source.id || !source.is_enabled}
                              className="px-2 py-1 rounded text-xs font-semibold bg-ink hover:bg-ink-soft text-white transition-colors cursor-pointer disabled:opacity-40"
                            >
                              {ingestingSourceId === source.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                "Ingest"
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(source.id, source.name)}
                              className="p-1 rounded text-ink-muted hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
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
          )}
        </div>

        {/* Right Column: Trending Now Panel */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-surface border border-line rounded-xl p-4 sm:p-5 shadow-card">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink font-mono">
                  Trending Now in TN Politics
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-200">
                24h Real-Time
              </span>
            </div>

            <p className="text-[11px] text-ink-muted mt-2 mb-3 leading-relaxed">
              Algorithmic momentum combining News Media wire dispatches, Influencer commentary, and verified Tamil Nadu Google Trends.
            </p>

            {trendingTopics.length === 0 ? (
              <div className="p-8 text-center bg-canvas rounded border border-dashed border-line text-ink-muted text-xs">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-ink-muted" />
                <span>Aggregating real-time political momentum...</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {trendingTopics.slice(0, 8).map((trend, idx) => {
                  const categories = trend.originating_categories || [trend.primary_origin || "News Media"];
                  return (
                    <div
                      key={trend.id || idx}
                      className="p-3 rounded-lg bg-canvas border border-line hover:border-line-strong transition-colors space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-ink text-white flex items-center justify-center font-mono text-[10px] font-bold shrink-0">
                            #{idx + 1}
                          </span>
                          <span className="font-tamil font-bold text-ink text-xs leading-snug line-clamp-1">
                            {trend.tamil_topic || trend.topic}
                          </span>
                        </div>
                        {trend.is_cross_category && (
                          <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-300">
                            ✨ Cross-Media
                          </span>
                        )}
                      </div>

                      {trend.tamil_topic && trend.topic && (
                        <div className="text-[11px] text-ink-soft font-medium pl-7 line-clamp-1">
                          {trend.topic}
                        </div>
                      )}

                      {/* Originating Categories Badges */}
                      <div className="flex flex-wrap items-center gap-1 pl-7 pt-0.5">
                        {categories.map((cat) => (
                          <span
                            key={cat}
                            className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                              cat === "Influencers" || cat === "INFLUENCER"
                                ? "bg-purple-50 text-purple-800 border border-purple-200"
                                : cat === "Google Trends"
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : cat === "Social Media"
                                ? "bg-sky-50 text-sky-800 border border-sky-200"
                                : "bg-blue-50 text-blue-800 border border-blue-200"
                            }`}
                          >
                            {cat}
                          </span>
                        ))}

                        {trend.search_volume_display ? (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-subtle text-ink-soft border border-line ml-auto">
                            {trend.search_volume_display}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-ink-muted ml-auto">
                            Score: {Math.round(trend.trend_score || 80)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-line text-[10px] text-ink-muted font-mono leading-relaxed">
              Standardized weighted formula (0.40 momentum + 0.30 volume + 0.20 cross-source presence + 0.10 recency). Filtered strictly for Tamil Nadu political entities.
            </div>
          </div>
        </div>
      </div>

      {/* Live Feed Test Details Modal */}
      {activeTestResult && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface rounded-lg max-w-lg w-full border border-line shadow-xl overflow-hidden">
            <div className="p-4 border-b border-line flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-ink">
                  Endpoint Inspection: {activeTestResult.sourceName}
                </h3>
                <p className="text-xs text-ink-muted">Live RSS/Atom XML response & conditional headers</p>
              </div>
              <button
                onClick={() => setActiveTestResult(null)}
                className="text-ink-muted hover:text-ink cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 bg-canvas rounded border border-line text-center">
                  <div className="text-[10px] text-ink-muted font-mono">Status</div>
                  <div className="text-sm font-mono font-bold text-ink mt-0.5">
                    HTTP {activeTestResult.result.status_code}
                  </div>
                </div>
                <div className="p-2.5 bg-canvas rounded border border-line text-center">
                  <div className="text-[10px] text-ink-muted font-mono">Latency</div>
                  <div className="text-sm font-mono font-bold text-ink mt-0.5">
                    {activeTestResult.result.latency_ms} ms
                  </div>
                </div>
                <div className="p-2.5 bg-canvas rounded border border-line text-center">
                  <div className="text-[10px] text-ink-muted font-mono">Parsed Items</div>
                  <div className="text-sm font-mono font-bold text-ink mt-0.5">
                    {activeTestResult.result.items_count}
                  </div>
                </div>
              </div>

              {(activeTestResult.result.etag || activeTestResult.result.last_modified) && (
                <div className="p-2.5 rounded bg-canvas border border-line text-[11px] font-mono space-y-1">
                  {activeTestResult.result.etag && (
                    <div>
                      <span className="text-ink-muted">ETag: </span>
                      <span className="text-ink">{activeTestResult.result.etag}</span>
                    </div>
                  )}
                  {activeTestResult.result.last_modified && (
                    <div>
                      <span className="text-ink-muted">Last-Modified: </span>
                      <span className="text-ink">{activeTestResult.result.last_modified}</span>
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
                <div className="mt-3 pt-3 border-t border-line">
                  <h4 className="text-xs font-bold text-ink uppercase tracking-wider mb-2">
                    Sample Articles from XML Stream
                  </h4>
                  <div className="space-y-2">
                    {activeTestResult.result.sample_items.slice(0, 4).map((item, idx) => (
                      <div key={idx} className="p-2.5 bg-canvas rounded border border-line text-xs">
                        <div className="font-bold text-ink font-tamil leading-snug">{item.title}</div>
                        {item.pub_date && (
                          <div className="text-[10px] text-ink-muted font-mono mt-0.5">{item.pub_date}</div>
                        )}
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-ink hover:underline flex items-center gap-1 mt-1 font-mono truncate"
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

            <div className="p-3 bg-canvas border-t border-line flex justify-end">
              <button
                onClick={() => setActiveTestResult(null)}
                className="px-3 py-1 rounded text-xs font-semibold bg-ink text-white cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ingestion Audit Trail Table */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden shadow-card">
        <div className="p-4 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-ink-soft" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
              Live Ingestion Audit Logs
            </h3>
          </div>
          <span className="text-[11px] text-ink-muted font-mono">Last 30 polling events</span>
        </div>

        <div className="overflow-x-auto max-h-72 overflow-y-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-subtle text-ink-soft border-b border-line uppercase text-[10px] sticky top-0">
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
            <tbody className="divide-y divide-line text-[11px]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-ink-muted">
                    No ingestion logs recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-canvas">
                    <td className="py-1.5 px-3 text-ink-muted whitespace-nowrap">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="py-1.5 px-3 font-bold text-ink whitespace-nowrap">
                      {log.source_name}
                    </td>
                    <td className="py-1.5 px-3 whitespace-nowrap">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] ${
                          log.status === "not_modified_304"
                            ? "bg-subtle text-ink-soft"
                            : log.status === "new_articles"
                            ? "bg-emerald-50 text-emerald-800"
                            : log.status === "error"
                            ? "bg-rose-50 text-rose-800"
                            : "bg-subtle text-ink-soft"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 text-ink-soft">{log.http_status}</td>
                    <td className="py-1.5 px-3 text-ink-soft">{log.items_found}</td>
                    <td className="py-1.5 px-3 text-emerald-800 font-bold">{log.new_items_added}</td>
                    <td className="py-1.5 px-3 text-ink-muted">{log.skipped_duplicates}</td>
                    <td className="py-1.5 px-3 text-ink-muted">{log.duration_ms}ms</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )}
</div>
);
}

