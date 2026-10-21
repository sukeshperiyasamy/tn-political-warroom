"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, RefreshCw, Search } from "lucide-react";
import { findNavItem } from "../../lib/nav";
import { useWarRoom } from "../providers/WarRoomProvider";

interface TopbarProps {
  onOpenMenu: () => void;
}

export function Topbar({ onOpenMenu }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { filters, setFilters, polling, pollFeeds } = useWarRoom();
  const current = findNavItem(pathname);
  const [draft, setDraft] = useState(filters.search);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, search: draft.trim() }));
    if (pathname !== "/news") router.push("/news");
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-surface/90 backdrop-blur border-b border-line flex items-center gap-3 px-4 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onOpenMenu}
        className="lg:hidden grid place-items-center w-10 h-10 -ml-2 rounded-lg text-ink hover:bg-subtle"
        aria-label="Open navigation menu"
      >
        <Menu className="w-5 h-5" aria-hidden="true" />
      </button>

      <p className="hidden sm:block text-sm font-semibold text-ink truncate lg:hidden">
        {current.label}
      </p>

      <form
        role="search"
        onSubmit={submitSearch}
        className="relative flex-1 max-w-xl"
      >
        <label htmlFor="global-search" className="sr-only">
          Search articles
        </label>
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted"
          aria-hidden="true"
        />
        <input
          id="global-search"
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Search headlines, parties, leaders…"
          className="w-full h-10 rounded-lg bg-subtle border border-transparent focus:bg-surface focus:border-line-strong pl-9 pr-3 text-sm placeholder:text-ink-muted outline-none focus-visible:ring-2 focus-visible:ring-accent-strong"
        />
      </form>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={pollFeeds}
          disabled={polling}
          className="inline-flex items-center gap-2 h-10 px-3.5 rounded-lg border border-line bg-surface text-sm font-semibold text-ink hover:bg-subtle disabled:opacity-60 transition-colors"
          title="Poll registered RSS feeds for new stories"
        >
          <RefreshCw
            className={`w-4 h-4 ${polling ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          <span className="hidden sm:inline">{polling ? "Polling…" : "Poll feeds"}</span>
          <span className="sr-only sm:hidden">Poll feeds</span>
        </button>
      </div>
    </header>
  );
}
