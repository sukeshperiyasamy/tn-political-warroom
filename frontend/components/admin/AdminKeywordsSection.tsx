"use client";

import React, { useState, useEffect } from "react";
import {
  Tag,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Hash,
  Filter,
  Check,
  AlertTriangle,
  Info,
  BarChart3,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldAlert,
  Play,
  CheckCheck,
} from "lucide-react";
import {
  KeywordItem,
  KeywordCreatePayload,
  KeywordsResponse,
  DiscoveredKeyword,
  KeywordAnalyticsResponse,
  ReclassificationResponse,
} from "../../types/political";
import {
  fetchKeywords,
  createKeyword,
  updateKeyword,
  toggleKeyword,
  deleteKeyword,
  fetchCandidateKeywords,
  approveCandidateKeyword,
  rejectCandidateKeyword,
  fetchKeywordAnalytics,
  runReclassification,
} from "../../lib/api";

const AVAILABLE_PARTIES = ["DMK", "AIADMK", "TVK", "BJP", "NTK", "VCK", "Congress", "PMK", "DMDK", "CPI", "CPM", "MDMK", "AMMK"];

const STANDARD_CATEGORIES = [
  "Elections & Alliances",
  "Welfare & Social Justice",
  "New Political Formations",
  "State Infrastructure & Economy",
  "Riparian Rights & Agriculture",
  "Economic Policy & Employment",
  "Urban Infrastructure & Governance",
  "Governance & Public Safety",
  "Education & Social Justice",
  "Federalism & National Politics",
  "Sports & Culture",
  "Civic & Environment",
  "Law & Judiciary",
  "National & Global",
  "Political Parties",
  "Political Leaders",
  "Constituencies",
];

type TabMode = "topics" | "analytics" | "candidates" | "reclassify";

export function AdminKeywordsSection() {
  const [activeTab, setActiveTab] = useState<TabMode>("topics");
  const [keywords, setKeywords] = useState<KeywordItem[]>([]);
  const [categories, setCategories] = useState<string[]>(STANDARD_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeOnly, setActiveOnly] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KeywordItem | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form Fields
  const [formId, setFormId] = useState("");
  const [formNameEn, setFormNameEn] = useState("");
  const [formNameTa, setFormNameTa] = useState("");
  const [formCategory, setFormCategory] = useState(STANDARD_CATEGORIES[0]);
  const [formCustomCategory, setFormCustomCategory] = useState("");
  const [formKeywordsEn, setFormKeywordsEn] = useState("");
  const [formKeywordsTa, setFormKeywordsTa] = useState("");
  const [formHashtags, setFormHashtags] = useState("");
  const [formNegativeKw, setFormNegativeKw] = useState("");
  const [formParties, setFormParties] = useState<string[]>([]);
  const [formIsActive, setFormIsActive] = useState(true);

  // Delete Confirmation Modal
  const [deletingItem, setDeletingItem] = useState<KeywordItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Analytics State
  const [analytics, setAnalytics] = useState<KeywordAnalyticsResponse | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Candidates State
  const [candidates, setCandidates] = useState<DiscoveredKeyword[]>([]);
  const [candidateFilter, setCandidateFilter] = useState<string>("all");
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidateActionId, setCandidateActionId] = useState<string | null>(null);

  // Reclassification State
  const [reclassBatchSize, setReclassBatchSize] = useState<number>(50);
  const [reclassDryRun, setReclassDryRun] = useState<boolean>(true);
  const [reclassLoading, setReclassLoading] = useState<boolean>(false);
  const [reclassResult, setReclassResult] = useState<ReclassificationResponse | null>(null);

  const loadKeywords = async () => {
    try {
      setLoading(true);
      const res: KeywordsResponse = await fetchKeywords(search, selectedCategory, activeOnly);
      setKeywords(res.keywords);
      if (res.categories && res.categories.length > 0) {
        const merged = Array.from(new Set([...STANDARD_CATEGORIES, ...res.categories]));
        setCategories(merged);
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to load keywords" });
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const res = await fetchKeywordAnalytics();
      setAnalytics(res);
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to load keyword analytics" });
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const loadCandidates = async (status?: string) => {
    try {
      setCandidatesLoading(true);
      const filterStatus = status && status !== "all" ? status : undefined;
      const res = await fetchCandidateKeywords(filterStatus);
      setCandidates(res.candidates);
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to load candidate keywords" });
    } finally {
      setCandidatesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "topics") {
      const timer = setTimeout(() => {
        loadKeywords();
      }, 200);
      return () => clearTimeout(timer);
    } else if (activeTab === "analytics") {
      loadAnalytics();
    } else if (activeTab === "candidates") {
      loadCandidates(candidateFilter);
    }
  }, [search, selectedCategory, activeOnly, activeTab, candidateFilter]);

  const openAddModal = () => {
    setEditingItem(null);
    setFormId("");
    setFormNameEn("");
    setFormNameTa("");
    setFormCategory(STANDARD_CATEGORIES[0]);
    setFormCustomCategory("");
    setFormKeywordsEn("");
    setFormKeywordsTa("");
    setFormHashtags("");
    setFormNegativeKw("");
    setFormParties([]);
    setFormIsActive(true);
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: KeywordItem) => {
    setEditingItem(item);
    setFormId(item.id);
    setFormNameEn(item.name_en);
    setFormNameTa(item.name_ta);
    if (STANDARD_CATEGORIES.includes(item.category)) {
      setFormCategory(item.category);
      setFormCustomCategory("");
    } else {
      setFormCategory("Custom");
      setFormCustomCategory(item.category);
    }
    setFormKeywordsEn((item.keywords_en || []).join(", "));
    setFormKeywordsTa((item.keywords_ta || []).join(", "));
    setFormHashtags((item.hashtags || []).join(", "));
    setFormNegativeKw((item.negative_keywords || []).join(", "));
    setFormParties(item.related_party_codes || []);
    setFormIsActive(item.is_active);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleToggleParty = (pCode: string) => {
    setFormParties((prev) =>
      prev.includes(pCode) ? prev.filter((p) => p !== pCode) : [...prev, pCode]
    );
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const nameEn = formNameEn.trim();
    const nameTa = formNameTa.trim();

    if (!nameEn || !nameTa) {
      setModalError("Both English and Tamil names are required.");
      return;
    }

    const category = formCategory === "Custom" ? formCustomCategory.trim() || "General Political" : formCategory;

    const parseList = (str: string) =>
      str
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

    const kwEn = parseList(formKeywordsEn);
    const kwTa = parseList(formKeywordsTa);
    const hashtags = parseList(formHashtags).map((h) => (h.startsWith("#") ? h : `#${h}`));
    const negKw = parseList(formNegativeKw);

    const payload: KeywordCreatePayload = {
      name_en: nameEn,
      name_ta: nameTa,
      category,
      keywords_en: kwEn,
      keywords_ta: kwTa,
      hashtags,
      negative_keywords: negKw,
      related_party_codes: formParties,
      related_leader_names: [],
      is_active: formIsActive,
    };

    try {
      setModalLoading(true);
      if (editingItem) {
        await updateKeyword(editingItem.id, payload);
        setFeedback({ type: "success", text: `Updated keyword topic "${nameEn}".` });
      } else {
        if (formId.trim()) payload.id = formId.trim();
        await createKeyword(payload);
        setFeedback({ type: "success", text: `Created keyword topic "${nameEn}".` });
      }
      setIsModalOpen(false);
      await loadKeywords();
    } catch (err: any) {
      setModalError(err.message || "Failed to save keyword topic");
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggle = async (item: KeywordItem) => {
    try {
      await toggleKeyword(item.id);
      setKeywords((prev) =>
        prev.map((k) => (k.id === item.id ? { ...k, is_active: !k.is_active } : k))
      );
      setFeedback({
        type: "success",
        text: `Keyword topic "${item.name_en}" is now ${!item.is_active ? "active" : "disabled"}.`,
      });
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to toggle status" });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    try {
      setDeleteLoading(true);
      await deleteKeyword(deletingItem.id);
      setKeywords((prev) => prev.filter((k) => k.id !== deletingItem.id));
      setFeedback({
        type: "success",
        text: `Deleted keyword topic "${deletingItem.name_en}".`,
      });
      setDeletingItem(null);
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to delete keyword" });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleApproveCandidate = async (candidate: DiscoveredKeyword) => {
    try {
      setCandidateActionId(candidate.id);
      await approveCandidateKeyword(candidate.id);
      setFeedback({
        type: "success",
        text: `Approved candidate "${candidate.name_en}". Registered into active topic taxonomy.`,
      });
      await loadCandidates(candidateFilter);
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to approve candidate" });
    } finally {
      setCandidateActionId(null);
    }
  };

  const handleRejectCandidate = async (candidateId: string) => {
    try {
      setCandidateActionId(candidateId);
      await rejectCandidateKeyword(candidateId);
      setFeedback({
        type: "success",
        text: "Rejected candidate keyword.",
      });
      await loadCandidates(candidateFilter);
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to reject candidate" });
    } finally {
      setCandidateActionId(null);
    }
  };

  const handleRunReclassification = async () => {
    try {
      setReclassLoading(true);
      setReclassResult(null);
      const res = await runReclassification({
        dry_run: reclassDryRun,
        batch_size: reclassBatchSize,
        offset: 0,
      });
      setReclassResult(res);
      setFeedback({
        type: "success",
        text: res.summary_message,
      });
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to run reclassification" });
    } finally {
      setReclassLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Sub-Tabs Navigation */}
      <div className="p-5 sm:p-6 bg-surface border border-line rounded-xl shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-purple-700" />
            <h2 className="text-sm sm:text-base font-bold text-ink font-serif">
              Political Keywords, Discovery & Classification
            </h2>
          </div>
          <p className="text-xs text-ink-muted mt-1 font-tamil">
            தமிழ்நாடு அரசியல் வரிசைப்படுத்தல், கட்சி நடுநிலைமை பகுப்பாய்வு மற்றும் புதிய முக்கியச் சொல் தேடல்
          </p>
        </div>

        {activeTab === "topics" && (
          <button
            onClick={openAddModal}
            className="px-3.5 py-2 rounded-lg bg-ink hover:bg-ink-soft text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-card transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Add Keyword / Topic</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-line pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("topics")}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === "topics"
              ? "bg-ink text-white"
              : "bg-surface text-ink-soft hover:bg-subtle border border-line"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Taxonomy Topics ({keywords.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("analytics")}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === "analytics"
              ? "bg-ink text-white"
              : "bg-surface text-ink-soft hover:bg-subtle border border-line"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Bias & Share Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab("candidates")}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === "candidates"
              ? "bg-ink text-white"
              : "bg-surface text-ink-soft hover:bg-subtle border border-line"
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Discovery Queue ({candidates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("reclassify")}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === "reclassify"
              ? "bg-ink text-white"
              : "bg-surface text-ink-soft hover:bg-subtle border border-line"
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>Safe Reclassification</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-lg text-xs flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
              : "bg-rose-50 border border-rose-200 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-ink-muted hover:text-ink font-bold ml-2 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* VIEW 1: TAXONOMY TOPICS (ORIGINAL VIEW) */}
      {activeTab === "topics" && (
        <>
          <div className="p-3.5 rounded-lg bg-subtle border border-line text-ink-soft text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-ink-muted shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <span className="font-semibold text-ink">Dynamic Entity Engine:</span> Active topics configured here dynamically match across incoming RSS feeds and social posts. Unbiased matching assigns general and civic topics when political entities are absent.
            </p>
          </div>

          <div className="bg-surface border border-line rounded-xl p-4 shadow-card flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-ink-muted" />
              <input
                type="text"
                placeholder="Search topics, keywords in English or Tamil..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-subtle border border-line rounded-lg text-xs text-ink placeholder:text-ink-muted focus:outline-hidden focus:border-ink"
              />
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-ink-muted" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-subtle border border-line rounded-lg text-xs text-ink px-2.5 py-1.5 focus:outline-hidden"
                >
                  <option value="All">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-1.5 text-xs text-ink-soft cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={activeOnly}
                  onChange={(e) => setActiveOnly(e.target.checked)}
                  className="rounded border-line text-ink focus:ring-0 cursor-pointer"
                />
                <span>Active Only</span>
              </label>

              <button
                onClick={loadKeywords}
                title="Refresh Topics"
                className="p-1.5 rounded-lg border border-line hover:bg-subtle text-ink-muted hover:text-ink cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-ink-muted text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Loading registered keyword topics...</span>
            </div>
          ) : keywords.length === 0 ? (
            <div className="p-12 text-center text-ink-muted text-xs bg-surface border border-line rounded-xl">
              No keyword topics match your search or filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {keywords.map((kw) => (
                <div
                  key={kw.id}
                  className={`p-4 rounded-xl border bg-surface flex flex-col justify-between transition-all ${
                    kw.is_active ? "border-line shadow-card" : "border-line-strong/50 opacity-60 bg-subtle/50"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-ink">{kw.name_en}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono font-medium ${
                              kw.is_active
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-neutral-200 text-neutral-600"
                            }`}
                          >
                            {kw.is_active ? "Active" : "Disabled"}
                          </span>
                        </div>
                        <p className="text-xs text-ink-muted font-tamil mt-0.5">{kw.name_ta}</p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(kw)}
                          title="Edit Topic"
                          className="p-1.5 rounded-lg hover:bg-subtle text-ink-muted hover:text-ink cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingItem(kw)}
                          title="Delete Topic"
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-ink-muted hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-subtle border border-line text-ink-soft">
                        {kw.category}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1.5 text-[11px]">
                      {kw.keywords_en && kw.keywords_en.length > 0 && (
                        <div>
                          <span className="text-ink-muted font-mono text-[9px] uppercase">EN: </span>
                          <span className="text-ink-soft">{kw.keywords_en.slice(0, 4).join(", ")}{kw.keywords_en.length > 4 ? "..." : ""}</span>
                        </div>
                      )}
                      {kw.keywords_ta && kw.keywords_ta.length > 0 && (
                        <div>
                          <span className="text-ink-muted font-mono text-[9px] uppercase">TA: </span>
                          <span className="text-ink-soft font-tamil">{kw.keywords_ta.slice(0, 4).join(", ")}{kw.keywords_ta.length > 4 ? "..." : ""}</span>
                        </div>
                      )}
                      {kw.hashtags && kw.hashtags.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap pt-0.5">
                          {kw.hashtags.slice(0, 3).map((h) => (
                            <span key={h} className="text-[10px] text-purple-700 font-mono">
                              {h}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-line flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {(kw.related_party_codes || []).map((p) => (
                        <span
                          key={p}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold"
                        >
                          {p}
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={() => handleToggle(kw)}
                      className={`text-[10px] font-semibold px-2 py-1 rounded cursor-pointer ${
                        kw.is_active
                          ? "text-neutral-500 hover:bg-neutral-100"
                          : "text-emerald-700 hover:bg-emerald-50"
                      }`}
                    >
                      {kw.is_active ? "Disable" : "Enable"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* VIEW 2: BIAS & KEYWORD ANALYTICS */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-ink">Keyword & Political Bias Diagnostics</h3>
              <p className="text-xs text-ink-muted">Real-time party distribution and taxonomy health audit</p>
            </div>
            <button
              onClick={loadAnalytics}
              className="px-3 py-1.5 rounded-lg border border-line hover:bg-subtle text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${analyticsLoading ? "animate-spin" : ""}`} />
              <span>Refresh Analytics</span>
            </button>
          </div>

          {analyticsLoading ? (
            <div className="p-12 text-center text-ink-muted text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Auditing database article distribution...</span>
            </div>
          ) : analytics ? (
            <>
              {analytics.anomaly_flags && analytics.anomaly_flags.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-950">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>Audit Finding & Anomaly Alert</span>
                  </div>
                  {analytics.anomaly_flags.map((flag, idx) => (
                    <p key={idx} className="leading-relaxed">
                      • {flag}
                    </p>
                  ))}
                  <div className="pt-2">
                    <button
                      onClick={() => setActiveTab("reclassify")}
                      className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Open Safe Reclassification Tool</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-surface border border-line shadow-card">
                  <span className="text-xs text-ink-muted font-mono uppercase">Total Indexed Articles</span>
                  <div className="text-2xl font-bold text-ink mt-1">{analytics.total_articles.toLocaleString()}</div>
                  <span className="text-[11px] text-emerald-700">Live Dual-Engine Database</span>
                </div>

                <div className="p-4 rounded-xl bg-surface border border-line shadow-card">
                  <span className="text-xs text-ink-muted font-mono uppercase">Top Political Party</span>
                  <div className="text-xl font-bold text-ink mt-1">
                    {analytics.party_distribution[0]?.party_code || "None"} ({analytics.party_distribution[0]?.percentage || 0}%)
                  </div>
                  <span className="text-[11px] text-ink-muted">{analytics.party_distribution[0]?.count || 0} matching articles</span>
                </div>

                <div className="p-4 rounded-xl bg-surface border border-line shadow-card">
                  <span className="text-xs text-ink-muted font-mono uppercase">Discovered Parties</span>
                  <div className="text-2xl font-bold text-ink mt-1">{analytics.party_distribution.length}</div>
                  <span className="text-[11px] text-ink-muted">Across all political alliances</span>
                </div>
              </div>

              {/* Party Distribution */}
              <div className="p-5 rounded-xl bg-surface border border-line shadow-card space-y-4">
                <h4 className="text-xs font-bold text-ink font-mono uppercase">Party Mentions & Share Breakdown</h4>
                <div className="space-y-3">
                  {analytics.party_distribution.map((p) => (
                    <div key={p.party_code} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-ink">{p.party_code}</span>
                        <span className="text-ink-soft">
                          {p.count} articles ({p.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-subtle h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-600 h-full rounded-full transition-all"
                          style={{ width: `${Math.min(p.percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Leaders Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl bg-surface border border-line shadow-card space-y-3">
                  <h4 className="text-xs font-bold text-ink font-mono uppercase">Top Mentioned Political Leaders</h4>
                  <div className="space-y-2">
                    {analytics.leader_distribution.slice(0, 8).map((l) => (
                      <div key={l.leader_name} className="flex items-center justify-between text-xs py-1 border-b border-line/50">
                        <span className="text-ink font-medium">{l.leader_name}</span>
                        <span className="text-ink-muted font-mono text-[11px]">
                          {l.count} ({l.percentage}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-surface border border-line shadow-card space-y-3">
                  <h4 className="text-xs font-bold text-ink font-mono uppercase">Top Domain Topics</h4>
                  <div className="space-y-2">
                    {analytics.topic_distribution.slice(0, 8).map((t) => (
                      <div key={t.topic} className="flex items-center justify-between text-xs py-1 border-b border-line/50">
                        <span className="text-ink font-medium">{t.topic}</span>
                        <span className="text-ink-muted font-mono text-[11px]">
                          {t.count} ({t.percentage}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-ink-muted text-xs">No analytics data available.</div>
          )}
        </div>
      )}

      {/* VIEW 3: DISCOVERY QUEUE */}
      {activeTab === "candidates" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-ink">Emerging Candidate Keywords Queue</h3>
              <p className="text-xs text-ink-muted">Entities passively discovered during live RSS and social feed ingestion</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={candidateFilter}
                onChange={(e) => setCandidateFilter(e.target.value)}
                className="bg-subtle border border-line rounded-lg text-xs text-ink px-2.5 py-1.5 focus:outline-hidden"
              >
                <option value="all">All Candidates</option>
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>

              <button
                onClick={() => loadCandidates(candidateFilter)}
                className="p-1.5 rounded-lg border border-line hover:bg-subtle text-ink-muted hover:text-ink cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${candidatesLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {candidatesLoading ? (
            <div className="p-12 text-center text-ink-muted text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Loading candidate keywords...</span>
            </div>
          ) : candidates.length === 0 ? (
            <div className="p-12 text-center text-ink-muted text-xs bg-surface border border-line rounded-xl">
              No discovered keywords in the queue for this filter. Candidates appear here automatically as new feeds are ingested.
            </div>
          ) : (
            <div className="space-y-3">
              {candidates.map((cand) => (
                <div
                  key={cand.id}
                  className="p-4 rounded-xl bg-surface border border-line shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink">{cand.name_en}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-subtle border border-line text-ink-soft">
                        {cand.category}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono font-medium ${
                          cand.status === "approved"
                            ? "bg-emerald-100 text-emerald-800"
                            : cand.status === "rejected"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {cand.status.toUpperCase()}
                      </span>
                    </div>
                    {cand.sample_headline && (
                      <p className="text-[11px] text-ink-muted italic">
                        Sample Headline: "{cand.sample_headline}"
                      </p>
                    )}
                    <div className="text-[10px] text-ink-muted font-mono">
                      Seen {cand.frequency} times • Discovered: {new Date(cand.discovered_at).toLocaleDateString()}
                    </div>
                  </div>

                  {cand.status === "pending" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleApproveCandidate(cand)}
                        disabled={candidateActionId === cand.id}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve into Taxonomy</span>
                      </button>

                      <button
                        onClick={() => handleRejectCandidate(cand.id)}
                        disabled={candidateActionId === cand.id}
                        className="px-2.5 py-1.5 border border-line hover:bg-rose-50 text-rose-700 rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: SAFE RECLASSIFICATION TOOL */}
      {activeTab === "reclassify" && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-surface border border-line shadow-card space-y-4">
            <div>
              <h3 className="text-sm font-bold text-ink">Safe Historical Reclassification Engine</h3>
              <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                Applies the unbiased taxonomy to existing articles. Non-partisan news items (cricket, crime, weather, health, etc.) that were previously forced into DMK/Stalin will have their party tags cleanly stripped, restoring political neutrality across the dashboard.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-subtle border border-line text-xs space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ink">Batch Evaluation Size:</span>
                  <select
                    value={reclassBatchSize}
                    onChange={(e) => setReclassBatchSize(Number(e.target.value))}
                    className="bg-surface border border-line rounded px-2 py-1 text-xs"
                  >
                    <option value={25}>25 articles</option>
                    <option value={50}>50 articles</option>
                    <option value={100}>100 articles</option>
                    <option value={250}>250 articles</option>
                    <option value={500}>500 articles</option>
                    <option value={1200}>All database articles (~1,107)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={reclassDryRun}
                      onChange={(e) => setReclassDryRun(e.target.checked)}
                      className="rounded border-line text-ink cursor-pointer"
                    />
                    <span className="font-bold text-ink">
                      Dry Run Preview Only (Zero Database Writes)
                    </span>
                  </label>
                </div>
              </div>

              {!reclassDryRun && (
                <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-900 text-[11px] font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    Warning: Live update mode active. Changes will be committed directly to database article records.
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={handleRunReclassification}
              disabled={reclassLoading}
              className={`px-4 py-2 rounded-lg text-xs font-bold text-white flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                reclassDryRun ? "bg-purple-700 hover:bg-purple-800" : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              <Play className={`w-3.5 h-3.5 ${reclassLoading ? "animate-spin" : ""}`} />
              <span>
                {reclassLoading
                  ? "Evaluating Taxonomy..."
                  : reclassDryRun
                  ? `Run Safe Preview (${reclassBatchSize} articles)`
                  : `Apply Reclassification to Database (${reclassBatchSize} articles)`}
              </span>
            </button>
          </div>

          {/* Reclassification Results Display */}
          {reclassResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-surface border border-line shadow-card">
                  <span className="text-xs text-ink-muted font-mono uppercase">Articles Examined</span>
                  <div className="text-2xl font-bold text-ink mt-1">{reclassResult.examined}</div>
                  <span className="text-[11px] text-ink-muted">Out of {reclassResult.total_articles} in DB</span>
                </div>

                <div className="p-4 rounded-xl bg-surface border border-line shadow-card">
                  <span className="text-xs text-ink-muted font-mono uppercase">Classification Changes</span>
                  <div className="text-2xl font-bold text-purple-700 mt-1">{reclassResult.changed_count}</div>
                  <span className="text-[11px] text-ink-soft">
                    {Math.round((reclassResult.changed_count / Math.max(reclassResult.examined, 1)) * 100)}% of examined articles
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-surface border border-line shadow-card">
                  <span className="text-xs text-ink-muted font-mono uppercase">Execution Mode</span>
                  <div className="text-xl font-bold text-ink mt-1">
                    {reclassResult.dry_run ? "Preview (Dry Run)" : "Committed to DB"}
                  </div>
                  <span className="text-[11px] text-emerald-700">Verified & Safe</span>
                </div>
              </div>

              {/* Sample Diffs */}
              <div className="p-5 rounded-xl bg-surface border border-line shadow-card space-y-4">
                <h4 className="text-xs font-bold text-ink font-mono uppercase">Sample Classification Diffs</h4>
                <div className="space-y-3">
                  {reclassResult.sample_diffs.map((diff, idx) => (
                    <div
                      key={diff.article_id}
                      className="p-3.5 rounded-lg border border-line bg-subtle/50 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-ink">#{idx + 1}: {diff.title}</span>
                        <span className="text-[10px] font-mono text-ink-muted">{diff.article_id}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-line/50 text-[11px]">
                        <div>
                          <span className="text-rose-700 font-semibold">Previous Classification:</span>
                          <div className="text-ink-soft mt-0.5">
                            Parties: {diff.old_parties.length ? diff.old_parties.join(", ") : "None"} | Leaders: {diff.old_leaders.length ? diff.old_leaders.join(", ") : "None"}
                          </div>
                        </div>

                        <div>
                          <span className="text-emerald-700 font-semibold">New Unbiased Classification:</span>
                          <div className="text-ink font-medium mt-0.5">
                            Parties: {diff.new_parties.length ? diff.new_parties.join(", ") : "None (Non-partisan)"} | Topics: {diff.new_topics.join(", ")}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-line rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink">
                {editingItem ? "Edit Keyword Topic" : "Add New Political Topic"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-ink-muted hover:text-ink cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveModal} className="space-y-3.5">
              {!editingItem && (
                <div>
                  <label className="block text-[11px] font-semibold text-ink-soft mb-1">
                    Topic ID (Slug - optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. cauvery_water"
                    value={formId}
                    onChange={(e) => setFormId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-subtle border border-line rounded-lg text-xs text-ink focus:outline-hidden"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-ink-soft mb-1">
                    English Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2026 Assembly Election"
                    value={formNameEn}
                    onChange={(e) => setFormNameEn(e.target.value)}
                    className="w-full px-3 py-1.5 bg-subtle border border-line rounded-lg text-xs text-ink focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-ink-soft mb-1">
                    Tamil Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="எ.கா. 2026 சட்டமன்ற தேர்தல்"
                    value={formNameTa}
                    onChange={(e) => setFormNameTa(e.target.value)}
                    className="w-full px-3 py-1.5 bg-subtle border border-line rounded-lg text-xs text-ink font-tamil focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-ink-soft mb-1">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-1.5 bg-subtle border border-line rounded-lg text-xs text-ink focus:outline-hidden"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="Custom">+ Custom Category</option>
                </select>
              </div>

              {formCategory === "Custom" && (
                <div>
                  <input
                    type="text"
                    placeholder="Enter custom category name..."
                    value={formCustomCategory}
                    onChange={(e) => setFormCustomCategory(e.target.value)}
                    className="w-full px-3 py-1.5 bg-subtle border border-line rounded-lg text-xs text-ink focus:outline-hidden"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-ink-soft mb-1">
                  English Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. election, alliance, vote share"
                  value={formKeywordsEn}
                  onChange={(e) => setFormKeywordsEn(e.target.value)}
                  className="w-full px-3 py-1.5 bg-subtle border border-line rounded-lg text-xs text-ink focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-ink-soft mb-1">
                  Tamil Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="எ.கா. தேர்தல், கூட்டணி, வாக்கு"
                  value={formKeywordsTa}
                  onChange={(e) => setFormKeywordsTa(e.target.value)}
                  className="w-full px-3 py-1.5 bg-subtle border border-line rounded-lg text-xs text-ink font-tamil focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-ink-soft mb-1">
                    Hashtags (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="#TNElection, #Election2026"
                    value={formHashtags}
                    onChange={(e) => setFormHashtags(e.target.value)}
                    className="w-full px-3 py-1.5 bg-subtle border border-line rounded-lg text-xs text-ink focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-ink-soft mb-1">
                    Negative Keywords (exclusions)
                  </label>
                  <input
                    type="text"
                    placeholder="2019, 2024 parliament"
                    value={formNegativeKw}
                    onChange={(e) => setFormNegativeKw(e.target.value)}
                    className="w-full px-3 py-1.5 bg-subtle border border-line rounded-lg text-xs text-ink focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-ink-soft mb-1.5">
                  Related Political Parties
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {AVAILABLE_PARTIES.map((p) => {
                    const isSelected = formParties.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleToggleParty(p)}
                        className={`text-[11px] font-bold px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-ink text-white border-ink"
                            : "bg-subtle text-ink-soft border-line hover:border-ink-soft"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="rounded border-line text-ink cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-ink">Active for Entity Matching</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-line-strong hover:bg-subtle text-xs font-semibold text-ink-soft cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-4 py-1.5 rounded-lg bg-ink hover:bg-ink-soft text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {modalLoading ? "Saving..." : editingItem ? "Update Keyword" : "Create Keyword"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-line rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-700">
              <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="text-sm font-bold text-ink">
                Confirm Keyword Topic Deletion
              </h3>
            </div>
            <p className="text-xs text-ink-soft leading-relaxed">
              Are you sure you want to permanently delete the political keyword topic{" "}
              <strong className="text-ink">"{deletingItem.name_en}"</strong> ({deletingItem.name_ta})?
              This will remove its entity matching rules from incoming intelligence feeds.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="px-3.5 py-1.5 rounded-lg border border-line-strong text-xs font-semibold text-ink-soft hover:bg-subtle cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {deleteLoading ? "Deleting..." : "Yes, Delete Topic"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
