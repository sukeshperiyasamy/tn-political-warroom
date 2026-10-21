"use client";

import { useWarRoom } from "../../components/providers/WarRoomProvider";
import { PartyComparisonView } from "../../components/compare/PartyComparisonView";

export default function ComparePage() {
  const { parties, leaders, openInsights, openInStudio } = useWarRoom();
  return (
    <PartyComparisonView
      parties={parties}
      leaders={leaders}
      onOpenArticle={openInsights}
      onCreateCard={openInStudio}
      mode="live"
    />
  );
}
