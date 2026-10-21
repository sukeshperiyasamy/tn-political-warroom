"use client";

import { useWarRoom } from "../../components/providers/WarRoomProvider";
import { NewsCardStudio } from "../../components/studio/NewsCardStudio";

export default function StudioPage() {
  const { studioArticle, parties, templates } = useWarRoom();
  return <NewsCardStudio article={studioArticle} parties={parties} templates={templates} />;
}
