"use client";

import React from "react";
import { Filter, RotateCcw } from "lucide-react";
import { PoliticalParty, PoliticalLeader, FilterState } from "../types/political";

interface FilterBarProps {
  filters: FilterState;
  parties: PoliticalParty[];
  leaders: PoliticalLeader[];
  onFilterChange: (filters: FilterState) => void;
  onReset: () => void;
  totalFilteredCount: number;
}

export function FilterBar({
  filters,
  parties,
  leaders,
  onFilterChange,
  onReset,
  totalFilteredCount,
}: FilterBarProps) {
  const activeCount = Object.entries(filters).filter(([k, v]) => k !== "search" && k !== "mode" && Boolean(v)).length;

  const topics = [
    "2026 Assembly Election",
    "Industrial Development",
    "Kalaignar Magalir Urimai Thogai",
    "Power Tariffs",
    "Youth Politics",
    "Central Schemes",
    "Cauvery Water Dispute",
    "Delimitation",
    "Chennai Infrastructure",
  ];

  const sources = [
    "News18 Tamil Nadu",
    "Polimer News",
    "BBC News Tamil",
    "The Hindu (Tamil Nadu)",
    "OneIndia Tamil",
    "Muthanmai Reporter (Tamil Nadu)",
    "Daily Thanthi",
    "Dinamalar",
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-8 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900">
              Political Intelligence Filters
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing <span className="text-blue-700 font-bold font-mono text-sm">{totalFilteredCount}</span> articles matching selected criteria
            </p>
          </div>
        </div>

        {activeCount > 0 && (
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg font-semibold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset {activeCount} {activeCount === 1 ? "filter" : "filters"}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Party Filter */}
        <div>
          <label htmlFor="party-filter" className="block text-xs font-bold text-slate-700 mb-1.5">
            Political Party (கட்சி)
          </label>
          <select
            id="party-filter"
            value={filters.party}
            onChange={(e) => onFilterChange({ ...filters, party: e.target.value })}
            className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
          >
            <option value="">All Parties (அனைத்தும்)</option>
            {parties.map((p) => (
              <option key={p.code} value={p.code}>
                {p.code} — {p.name} ({p.tamil_name})
              </option>
            ))}
          </select>
        </div>

        {/* Leader Filter */}
        <div>
          <label htmlFor="leader-filter" className="block text-xs font-bold text-slate-700 mb-1.5">
            Political Leader (தலைவர்)
          </label>
          <select
            id="leader-filter"
            value={filters.leader}
            onChange={(e) => onFilterChange({ ...filters, leader: e.target.value })}
            className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
          >
            <option value="">All Leaders (அனைத்தும்)</option>
            {leaders.map((l) => (
              <option key={l.id} value={l.name}>
                {l.name} ({l.tamil_name}) - {l.party_code}
              </option>
            ))}
          </select>
        </div>

        {/* Sentiment Filter */}
        <div>
          <label htmlFor="sentiment-filter" className="block text-xs font-bold text-slate-700 mb-1.5">
            Media Sentiment (மனநிலை)
          </label>
          <select
            id="sentiment-filter"
            value={filters.sentiment}
            onChange={(e) => onFilterChange({ ...filters, sentiment: e.target.value })}
            className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
          >
            <option value="">All Sentiments</option>
            <option value="positive">Positive (நேர்மறை)</option>
            <option value="neutral">Neutral (நடுநிலை)</option>
            <option value="negative">Negative (எதிர்மறை)</option>
          </select>
        </div>

        {/* Topic Filter */}
        <div>
          <label htmlFor="topic-filter" className="block text-xs font-bold text-slate-700 mb-1.5">
            Strategic Topic (கருப்பொருள்)
          </label>
          <select
            id="topic-filter"
            value={filters.topic}
            onChange={(e) => onFilterChange({ ...filters, topic: e.target.value })}
            className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
          >
            <option value="">All Topics (அனைத்தும்)</option>
            {topics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Media Source Filter */}
        <div>
          <label htmlFor="source-filter" className="block text-xs font-bold text-slate-700 mb-1.5">
            News Source (ஊடகம்)
          </label>
          <select
            id="source-filter"
            value={filters.source}
            onChange={(e) => onFilterChange({ ...filters, source: e.target.value })}
            className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
          >
            <option value="">All Sources (அனைத்தும்)</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
