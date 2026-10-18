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
    <div className="bg-white border border-[#E8E8E2] rounded-lg p-3 sm:p-4 mb-6 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3 pb-2.5 border-b border-[#F0F0EB]">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">
            Intelligence Filters
          </span>
          <span className="text-zinc-300">•</span>
          <span className="text-xs text-zinc-500">
            Matching selected criteria: <strong className="text-zinc-900 font-mono font-semibold">{totalFilteredCount}</strong> articles
          </span>
        </div>

        {activeCount > 0 && (
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3 text-zinc-500" />
            <span>Reset All Filters</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {/* Party Filter */}
        <div>
          <label htmlFor="party-filter" className="block text-[11px] font-semibold text-zinc-600 mb-1">
            Party (கட்சி)
          </label>
          <select
            id="party-filter"
            value={filters.party}
            onChange={(e) => onFilterChange({ ...filters, party: e.target.value })}
            className="w-full min-h-[42px] sm:min-h-[36px] bg-[#F9F9F7] hover:bg-white border border-[#E2E2DC] focus:border-zinc-500 rounded px-2.5 text-xs text-zinc-800 font-medium focus:outline-hidden transition-all cursor-pointer"
          >
            <option value="">All Parties</option>
            {parties.map((p) => (
              <option key={p.code} value={p.code}>
                {p.code} — {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Leader Filter */}
        <div>
          <label htmlFor="leader-filter" className="block text-[11px] font-semibold text-zinc-600 mb-1">
            Leader (தலைவர்)
          </label>
          <select
            id="leader-filter"
            value={filters.leader}
            onChange={(e) => onFilterChange({ ...filters, leader: e.target.value })}
            className="w-full min-h-[42px] sm:min-h-[36px] bg-[#F9F9F7] hover:bg-white border border-[#E2E2DC] focus:border-zinc-500 rounded px-2.5 text-xs text-zinc-800 font-medium focus:outline-hidden transition-all cursor-pointer"
          >
            <option value="">All Leaders</option>
            {leaders.map((l) => (
              <option key={l.id} value={l.name}>
                {l.name} ({l.party_code})
              </option>
            ))}
          </select>
        </div>

        {/* Sentiment Filter */}
        <div>
          <label htmlFor="sentiment-filter" className="block text-[11px] font-semibold text-zinc-600 mb-1">
            Polarity (மனநிலை)
          </label>
          <select
            id="sentiment-filter"
            value={filters.sentiment}
            onChange={(e) => onFilterChange({ ...filters, sentiment: e.target.value })}
            className="w-full min-h-[42px] sm:min-h-[36px] bg-[#F9F9F7] hover:bg-white border border-[#E2E2DC] focus:border-zinc-500 rounded px-2.5 text-xs text-zinc-800 font-medium focus:outline-hidden transition-all cursor-pointer"
          >
            <option value="">All Polarity</option>
            <option value="positive">Positive (நேர்மறை)</option>
            <option value="neutral">Neutral (நடுநிலை)</option>
            <option value="negative">Critical / Negative (எதிர்மறை)</option>
          </select>
        </div>

        {/* Topic Filter */}
        <div>
          <label htmlFor="topic-filter" className="block text-[11px] font-semibold text-zinc-600 mb-1">
            Topic (கருப்பொருள்)
          </label>
          <select
            id="topic-filter"
            value={filters.topic}
            onChange={(e) => onFilterChange({ ...filters, topic: e.target.value })}
            className="w-full min-h-[42px] sm:min-h-[36px] bg-[#F9F9F7] hover:bg-white border border-[#E2E2DC] focus:border-zinc-500 rounded px-2.5 text-xs text-zinc-800 font-medium focus:outline-hidden transition-all cursor-pointer"
          >
            <option value="">All Topics</option>
            {topics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Media Source Filter */}
        <div>
          <label htmlFor="source-filter" className="block text-[11px] font-semibold text-zinc-600 mb-1">
            Publisher (ஊடகம்)
          </label>
          <select
            id="source-filter"
            value={filters.source}
            onChange={(e) => onFilterChange({ ...filters, source: e.target.value })}
            className="w-full min-h-[42px] sm:min-h-[36px] bg-[#F9F9F7] hover:bg-white border border-[#E2E2DC] focus:border-zinc-500 rounded px-2.5 text-xs text-zinc-800 font-medium focus:outline-hidden transition-all cursor-pointer"
          >
            <option value="">All Publishers</option>
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
