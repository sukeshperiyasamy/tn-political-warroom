"use client";

import React from "react";
import { RotateCcw, X } from "lucide-react";
import { PoliticalParty, PoliticalLeader, FilterState } from "../../types/political";

interface FilterBarProps {
  filters: FilterState;
  parties: PoliticalParty[];
  leaders: PoliticalLeader[];
  onFilterChange: (filters: FilterState) => void;
  onReset: () => void;
  totalFilteredCount: number;
}

const TOPICS = [
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

const SOURCES = [
  "News18 Tamil Nadu",
  "Polimer News",
  "BBC News Tamil",
  "The Hindu (Tamil Nadu)",
  "OneIndia Tamil",
  "Muthanmai Reporter (Tamil Nadu)",
  "Daily Thanthi",
  "Dinamalar",
];

const selectClass =
  "w-full h-10 rounded-lg border border-line bg-surface px-3 text-sm text-ink hover:border-line-strong focus-visible:border-ink outline-none cursor-pointer";

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}

function Field({ id, label, value, onChange, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-ink-soft mb-1.5">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        {children}
      </select>
    </div>
  );
}

export function FilterBar({
  filters,
  parties,
  leaders,
  onFilterChange,
  onReset,
  totalFilteredCount,
}: FilterBarProps) {
  const set = (key: keyof FilterState) => (value: string) =>
    onFilterChange({ ...filters, [key]: value });

  const chips: { key: keyof FilterState; label: string }[] = (
    [
      ["search", "Search"],
      ["party", "Party"],
      ["leader", "Leader"],
      ["sentiment", "Polarity"],
      ["topic", "Topic"],
      ["source", "Publisher"],
    ] as [keyof FilterState, string][]
  )
    .filter(([k]) => Boolean(filters[k]))
    .map(([k, label]) => ({ key: k, label: `${label}: ${filters[k]}` }));

  return (
    <section
      aria-label="Filters"
      className="rounded-xl border border-line bg-surface p-4 sm:p-5 mb-6 shadow-card"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Field id="party-filter" label="Party" value={filters.party} onChange={set("party")}>
          <option value="">All parties</option>
          {parties.map((p) => (
            <option key={p.code} value={p.code}>
              {p.code} — {p.name}
            </option>
          ))}
        </Field>
        <Field id="leader-filter" label="Leader" value={filters.leader} onChange={set("leader")}>
          <option value="">All leaders</option>
          {leaders.map((l) => (
            <option key={l.id} value={l.name}>
              {l.name} ({l.party_code})
            </option>
          ))}
        </Field>
        <Field id="sentiment-filter" label="Polarity" value={filters.sentiment} onChange={set("sentiment")}>
          <option value="">All polarity</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Critical / negative</option>
        </Field>
        <Field id="topic-filter" label="Topic" value={filters.topic} onChange={set("topic")}>
          <option value="">All topics</option>
          {TOPICS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Field>
        <Field id="source-filter" label="Publisher" value={filters.source} onChange={set("source")}>
          <option value="">All publishers</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Field>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <p className="text-ink-muted mr-1" aria-live="polite">
          <strong className="text-ink tabular-nums">{totalFilteredCount}</strong> articles match
        </p>
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => onFilterChange({ ...filters, [c.key]: "" })}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft text-accent-strong px-2.5 py-1 text-xs font-semibold hover:bg-amber-100"
            aria-label={`Remove filter ${c.label}`}
          >
            {c.label}
            <X className="w-3 h-3" aria-hidden="true" />
          </button>
        ))}
        {chips.length > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 h-8 text-xs font-semibold text-ink-soft hover:bg-subtle"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Reset all
          </button>
        )}
      </div>
    </section>
  );
}
