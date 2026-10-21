"use client";

import React from "react";
import { Radio } from "lucide-react";
import Link from "next/link";
import { NewsArticle } from "../../types/political";
import { useWarRoom } from "../providers/WarRoomProvider";
import { ArticleCard } from "./ArticleCard";
import { EmptyState, LoadingState } from "../ui/States";

interface ArticleGridProps {
  articles: NewsArticle[];
  loading?: boolean;
}

export function ArticleGrid({ articles, loading }: ArticleGridProps) {
  const { openInsights, openInStudio, resetFilters, activeFilterCount } = useWarRoom();

  if (loading && articles.length === 0) return <LoadingState label="Refreshing media wire…" />;

  if (articles.length === 0) {
    return (
      <EmptyState
        title="No articles match these filters"
        description="Clear the filters, or check the source registry to confirm feeds are being collected."
      >
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={resetFilters}
            className="h-10 px-4 rounded-lg bg-ink text-white text-sm font-semibold hover:bg-ink-soft"
          >
            Reset filters
          </button>
        )}
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-line bg-surface text-sm font-semibold text-ink hover:bg-subtle"
        >
          <Radio className="w-4 h-4" aria-hidden="true" />
          Source registry
        </Link>
      </EmptyState>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 sm:gap-5">
      {articles.map((a) => (
        <ArticleCard key={a.id} article={a} onOpenIntelligence={openInsights} onCreateCard={openInStudio} />
      ))}
    </div>
  );
}
