"use client";

import { useWarRoom } from "../../components/providers/WarRoomProvider";
import { FilterBar } from "../../components/news/FilterBar";
import { ArticleGrid } from "../../components/news/ArticleGrid";
import { PageHeader } from "../../components/ui/PageHeader";

export default function NewsPage() {
  const { articles, parties, leaders, filters, setFilters, resetFilters, loading } = useWarRoom();

  return (
    <>
      <PageHeader
        title="News Feed"
        tamilTitle="செய்தி ஓட்டம்"
        description="Live wire from monitored Tamil and national outlets. Narrow it down by party, leader, polarity, topic or publisher."
      />
      <FilterBar
        filters={filters}
        parties={parties}
        leaders={leaders}
        onFilterChange={setFilters}
        onReset={resetFilters}
        totalFilteredCount={articles.length}
      />
      <ArticleGrid articles={articles} loading={loading} />
    </>
  );
}
