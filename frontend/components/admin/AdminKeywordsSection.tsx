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
} from "lucide-react";
import { KeywordItem, KeywordCreatePayload, KeywordsResponse } from "../../types/political";
import {
  fetchKeywords,
  createKeyword,
  updateKeyword,
  toggleKeyword,
  deleteKeyword,
} from "../../lib/api";

const AVAILABLE_PARTIES = ["DMK", "AIADMK", "TVK", "BJP", "NTK", "VCK", "Congress", "PMK"];

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
  "Political Parties",
  "Political Leaders",
  "Constituencies",
];

export function AdminKeywordsSection() {
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

  useEffect(() => {
    const timer = setTimeout(() => {
      loadKeywords();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, selectedCategory, activeOnly]);

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

  return (
    <div className="space-y-6">
      {/* Header & Notice */}
      <div className="p-5 sm:p-6 bg-white border border-[#E2E2DC] rounded-xl shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-purple-700" />
            <h2 className="text-sm sm:text-base font-bold text-zinc-900 font-serif">
              Political Keywords & Entity Filters
            </h2>
          </div>
          <p className="text-xs text-zinc-500 mt-1 font-tamil">
            தமிழ் மற்றும் ஆங்கில முக்கியச் சொற்கள், ஹேஷ்டேக்குகள் மற்றும் அரசியல் கட்சி அமைப்புகள்
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>Add Keyword / Topic</span>
        </button>
      </div>

      {/* Reprocessing Limitation Notice */}
      <div className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-700 text-xs flex items-start gap-2.5">
        <Info className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <span className="font-semibold text-zinc-900">Ingestion Behavior Note:</span> Newly added or edited
          keywords automatically apply to future RSS polls and live social ingestion passes. Historical articles
          are preserved with their original classification.
        </p>
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
            className="text-zinc-500 hover:text-zinc-800 font-bold ml-2 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E2E2DC] rounded-xl p-4 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search keywords, English terms, or Tamil சொற்கள்..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#D5D5CE] focus:outline-none focus:ring-2 focus:ring-zinc-800 bg-[#FAF9F6]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-zinc-600 font-medium shrink-0">
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
            <span>Category:</span>
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-[#D5D5CE] bg-white focus:outline-none text-zinc-800"
          >
            <option value="All">All Categories ({keywords.length})</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-1.5 text-xs text-zinc-700 cursor-pointer ml-1 select-none">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="rounded text-zinc-900 focus:ring-0"
            />
            <span>Active only</span>
          </label>
        </div>
      </div>

      {/* Keywords List / Table */}
      {loading ? (
        <div className="p-16 text-center text-zinc-500 bg-white border border-[#E8E8E2] rounded-xl">
          <RefreshCw className="w-6 h-6 border-2 border-zinc-800 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs font-medium">Loading keyword registry...</p>
        </div>
      ) : keywords.length === 0 ? (
        <div className="p-12 text-center bg-white border border-[#E8E8E2] rounded-xl space-y-2">
          <Tag className="w-8 h-8 text-zinc-400 mx-auto mb-1" />
          <h4 className="text-xs font-bold text-zinc-800">No keywords match your filter</h4>
          <p className="text-[11px] text-zinc-500">
            Try adjusting your search query or category filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {keywords.map((item) => (
            <div
              key={item.id}
              className={`p-4 sm:p-5 rounded-xl bg-white border transition-all ${
                item.is_active ? "border-[#E2E2DC] shadow-2xs" : "border-zinc-200 bg-zinc-50/60 opacity-75"
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 mb-3 pb-2.5 border-b border-[#F0F0EB]">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-bold text-zinc-900 font-serif">
                      {item.name_en}
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.is_active
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-zinc-100 text-zinc-500 border border-zinc-200"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          item.is_active ? "bg-emerald-600" : "bg-zinc-400"
                        }`}
                      ></span>
                      {item.is_active ? "Active" : "Disabled"}
                    </span>
                  </div>
                  <p className="text-xs font-tamil text-zinc-600 mt-0.5">{item.name_ta}</p>
                  <span className="inline-block mt-1 text-[10px] font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
                    {item.category}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggle(item)}
                    className={`px-2 py-1 text-[11px] font-semibold rounded border transition-colors cursor-pointer ${
                      item.is_active
                        ? "bg-zinc-100 text-zinc-700 border-zinc-300 hover:bg-zinc-200"
                        : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                    }`}
                  >
                    {item.is_active ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-1.5 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 rounded transition-colors cursor-pointer"
                    title="Edit keyword topic"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingItem(item)}
                    className="p-1.5 text-rose-600 hover:text-rose-900 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                    title="Delete keyword topic"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Keywords chips */}
              <div className="space-y-2 text-xs">
                {item.keywords_en && item.keywords_en.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                      English Keywords:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {item.keywords_en.map((kw, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-zinc-100 text-zinc-800 rounded text-[11px] font-mono"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {item.keywords_ta && item.keywords_ta.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1 font-tamil">
                      தமிழ் சொற்கள்:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {item.keywords_ta.map((kw, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-purple-50 text-purple-900 border border-purple-200 rounded text-[11px] font-tamil"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {item.hashtags && item.hashtags.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                      Tracked Hashtags:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {item.hashtags.map((h, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded text-[10px] font-mono font-medium"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {item.negative_keywords && item.negative_keywords.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-rose-500 block mb-1">
                      Exclusion Keywords (Negatives):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {item.negative_keywords.map((neg, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 rounded text-[10px] line-through"
                        >
                          {neg}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {item.related_party_codes && item.related_party_codes.length > 0 && (
                  <div className="pt-2 border-t border-[#F0F0EB] flex items-center gap-1.5 text-[11px] text-zinc-500">
                    <span className="font-semibold text-zinc-700">Parties:</span>
                    <div className="flex flex-wrap gap-1">
                      {item.related_party_codes.map((pc, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-800 text-[10px] font-bold">
                          {pc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-[#E2E2DC] rounded-xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 my-8">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#F0F0EB]">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-purple-700" />
                <h3 className="text-sm font-bold text-zinc-900 font-serif">
                  {editingItem ? "Edit Keyword / Topic" : "Add New Political Keyword Topic"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveModal} className="space-y-4 text-xs">
              {!editingItem && (
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Topic ID (Slug, optional auto-generated)
                  </label>
                  <input
                    type="text"
                    value={formId}
                    onChange={(e) => setFormId(e.target.value)}
                    placeholder="e.g. state_education_policy"
                    className="w-full px-3 py-2 rounded-lg border border-[#D5D5CE] focus:outline-none focus:ring-2 focus:ring-zinc-800 font-mono text-xs"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Name (English) *
                  </label>
                  <input
                    type="text"
                    value={formNameEn}
                    onChange={(e) => setFormNameEn(e.target.value)}
                    placeholder="e.g. 2026 Assembly Election"
                    required
                    className="w-full px-3 py-2 rounded-lg border border-[#D5D5CE] focus:outline-none focus:ring-2 focus:ring-zinc-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1 font-tamil">
                    Name (Tamil / தமிழ் பெயர்) *
                  </label>
                  <input
                    type="text"
                    value={formNameTa}
                    onChange={(e) => setFormNameTa(e.target.value)}
                    placeholder="e.g. 2026 சட்டமன்ற தேர்தல்"
                    required
                    className="w-full px-3 py-2 rounded-lg border border-[#D5D5CE] focus:outline-none focus:ring-2 focus:ring-zinc-800 font-tamil"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#D5D5CE] bg-white focus:outline-none focus:ring-2 focus:ring-zinc-800"
                >
                  {STANDARD_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="Custom">+ Custom Category...</option>
                </select>
                {formCategory === "Custom" && (
                  <input
                    type="text"
                    value={formCustomCategory}
                    onChange={(e) => setFormCustomCategory(e.target.value)}
                    placeholder="Enter custom category name"
                    className="w-full mt-2 px-3 py-2 rounded-lg border border-[#D5D5CE] focus:outline-none focus:ring-2 focus:ring-zinc-800"
                    required
                  />
                )}
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  English Keywords (comma-separated)
                </label>
                <textarea
                  rows={2}
                  value={formKeywordsEn}
                  onChange={(e) => setFormKeywordsEn(e.target.value)}
                  placeholder="e.g. assembly election, vote share, alliance, seat sharing"
                  className="w-full px-3 py-2 rounded-lg border border-[#D5D5CE] focus:outline-none focus:ring-2 focus:ring-zinc-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1 font-tamil">
                  தமிழ் சொற்கள் (comma-separated, Unicode preserved)
                </label>
                <textarea
                  rows={2}
                  value={formKeywordsTa}
                  onChange={(e) => setFormKeywordsTa(e.target.value)}
                  placeholder="e.g. சட்டமன்ற தேர்தல், கூட்டணி, தொகுதி பங்கீடு, வாக்கு வங்கி"
                  className="w-full px-3 py-2 rounded-lg border border-[#D5D5CE] focus:outline-none focus:ring-2 focus:ring-zinc-800 font-tamil"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Tracked Hashtags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formHashtags}
                    onChange={(e) => setFormHashtags(e.target.value)}
                    placeholder="#TN2026, #Election2026"
                    className="w-full px-3 py-2 rounded-lg border border-[#D5D5CE] focus:outline-none focus:ring-2 focus:ring-zinc-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-rose-700 mb-1">
                    Exclusion / Negative Keywords
                  </label>
                  <input
                    type="text"
                    value={formNegativeKw}
                    onChange={(e) => setFormNegativeKw(e.target.value)}
                    placeholder="e.g. cinema news, movie trailer"
                    className="w-full px-3 py-2 rounded-lg border border-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1.5">
                  Related Political Parties
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_PARTIES.map((party) => {
                    const isSelected = formParties.includes(party);
                    return (
                      <button
                        type="button"
                        key={party}
                        onClick={() => handleToggleParty(party)}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer border ${
                          isSelected
                            ? "bg-zinc-900 text-white border-zinc-900"
                            : "bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50"
                        }`}
                      >
                        {party} {isSelected ? "✓" : ""}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[#F0F0EB]">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="rounded text-zinc-900"
                  />
                  <span className="font-semibold text-zinc-800">Topic is Active for live filtering</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-300 hover:bg-zinc-50 text-xs font-semibold text-zinc-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-4 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
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
          <div className="bg-white border border-[#E2E2DC] rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-700">
              <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900">
                Confirm Keyword Topic Deletion
              </h3>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Are you sure you want to permanently delete the political keyword topic{" "}
              <strong className="text-zinc-900">"{deletingItem.name_en}"</strong> ({deletingItem.name_ta})?
              This will remove its entity matching rules from incoming intelligence feeds.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="px-3.5 py-1.5 rounded-lg border border-zinc-300 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
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
