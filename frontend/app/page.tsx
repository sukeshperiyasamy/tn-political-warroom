"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { useWarRoom } from "../components/providers/WarRoomProvider";
import { MetricsOverview } from "../components/overview/MetricsOverview";
import { ArticleGrid } from "../components/news/ArticleGrid";
import { PageHeader } from "../components/ui/PageHeader";
import { LoadingState } from "../components/ui/States";

export default function OverviewPage() {
  const { metrics, articles, loading, drillInto, activeFilterCount, resetFilters } = useWarRoom();

  return (
    <>
      <PageHeader
        title="Overview"
        tamilTitle="முதன்மை சுருக்கம்"
        description="Tamil Nadu 2026 Assembly cycle — coverage volume, party share of voice and media sentiment."
        actions={
          activeFilterCount > 0 ? (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-2 h-10 px-3.5 rounded-lg bg-accent-soft text-accent-strong text-sm font-semibold hover:bg-amber-100"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              Clear {activeFilterCount} active filter{activeFilterCount > 1 ? "s" : ""}
            </button>
          ) : null
        }
      />

      {metrics ? (
        <MetricsOverview
          metrics={metrics}
          onSelectParty={(v) => drillInto("party", v)}
          onSelectLeader={(v) => drillInto("leader", v)}
          onSelectTopic={(v) => drillInto("topic", v)}
        />
      ) : (
        <LoadingState label="Loading political intelligence…" />
      )}

      <section aria-labelledby="latest-heading" className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 id="latest-heading" className="font-serif text-xl font-semibold text-ink">
            Latest dispatches
          </h2>
          <Link href="/news" className="text-sm font-semibold text-accent-strong hover:underline">
            View full feed →
          </Link>
        </div>
        <ArticleGrid articles={articles.slice(0, 6)} loading={loading} />
      </section>
    </>
  );
}
