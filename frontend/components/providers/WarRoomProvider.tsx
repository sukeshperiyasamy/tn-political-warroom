"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  ClientConfig,
  CardTemplate,
  DashboardMetrics,
  FilterState,
  NewsArticle,
  PoliticalLeader,
  PoliticalParty,
} from "../../types/political";
import {
  fetchArticles,
  fetchClientConfig,
  fetchLeaders,
  fetchMetrics,
  fetchParties,
  fetchTemplates,
  triggerIngest,
} from "../../lib/api";
import { ArticleIntelligenceDrawer } from "../news/ArticleIntelligenceDrawer";

const EMPTY_FILTERS: FilterState = {
  search: "",
  party: "",
  leader: "",
  sentiment: "",
  topic: "",
  source: "",
  dateRange: "",
  mode: "live",
};

interface WarRoomContextValue {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;
  activeFilterCount: number;

  articles: NewsArticle[];
  metrics: DashboardMetrics | null;
  parties: PoliticalParty[];
  leaders: PoliticalLeader[];
  templates: CardTemplate[];
  clientConfig: ClientConfig | null;
  setClientConfig: (cfg: ClientConfig | null) => void;
  loading: boolean;

  polling: boolean;
  pollFeeds: () => Promise<void>;

  openInsights: (article: NewsArticle) => void;
  openInStudio: (article: NewsArticle) => void;
  studioArticle: NewsArticle | null;

  /** Apply a single-dimension filter from a chart and jump to the feed. */
  drillInto: (dimension: "party" | "leader" | "topic", value: string) => void;
}

const WarRoomContext = createContext<WarRoomContextValue | null>(null);

export function useWarRoom(): WarRoomContextValue {
  const ctx = useContext(WarRoomContext);
  if (!ctx) throw new Error("useWarRoom must be used inside <WarRoomProvider>");
  return ctx;
}

export function WarRoomProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [parties, setParties] = useState<PoliticalParty[]>([]);
  const [leaders, setLeaders] = useState<PoliticalLeader[]>([]);
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [clientConfig, setClientConfig] = useState<ClientConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);

  const [drawerArticle, setDrawerArticle] = useState<NewsArticle | null>(null);
  const [studioArticle, setStudioArticle] = useState<NewsArticle | null>(null);
  const studioSeeded = useRef(false);

  useEffect(() => {
    Promise.all([fetchParties(), fetchLeaders(), fetchTemplates(), fetchClientConfig()])
      .then(([p, l, t, c]) => {
        setParties(p);
        setLeaders(l);
        setTemplates(t);
        setClientConfig(c);
      })
      .catch((err) => console.error("Failed to load initial metadata:", err));
  }, []);

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchArticles(filters), fetchMetrics(filters)])
      .then(([arts, mets]) => {
        if (!mounted) return;
        setArticles(arts);
        setMetrics(mets);
        if (!studioSeeded.current && arts.length > 0) {
          studioSeeded.current = true;
          setStudioArticle(arts[0]);
        }
      })
      .catch((err) => console.error("Failed to load articles:", err))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [filters]);

  const resetFilters = useCallback(
    () => setFilters((prev) => ({ ...EMPTY_FILTERS, mode: prev.mode })),
    [],
  );

  const activeFilterCount = useMemo(
    () =>
      Object.entries(filters).filter(([k, v]) => k !== "mode" && Boolean(v)).length,
    [filters],
  );

  const pollFeeds = useCallback(async () => {
    setPolling(true);
    try {
      await triggerIngest();
      const [arts, mets] = await Promise.all([fetchArticles(filters), fetchMetrics(filters)]);
      setArticles(arts);
      setMetrics(mets);
    } catch (err) {
      console.error("Feed poll failed:", err);
    } finally {
      setPolling(false);
    }
  }, [filters]);

  const openInStudio = useCallback(
    (article: NewsArticle) => {
      setStudioArticle(article);
      setDrawerArticle(null);
      router.push("/studio");
    },
    [router],
  );

  const drillInto = useCallback(
    (dimension: "party" | "leader" | "topic", value: string) => {
      setFilters((prev) => ({ ...prev, [dimension]: prev[dimension] === value ? "" : value }));
      router.push("/news");
    },
    [router],
  );

  const value = useMemo<WarRoomContextValue>(
    () => ({
      filters,
      setFilters,
      resetFilters,
      activeFilterCount,
      articles,
      metrics,
      parties,
      leaders,
      templates,
      clientConfig,
      setClientConfig,
      loading,
      polling,
      pollFeeds,
      openInsights: setDrawerArticle,
      openInStudio,
      studioArticle,
      drillInto,
    }),
    [
      filters,
      resetFilters,
      activeFilterCount,
      articles,
      metrics,
      parties,
      leaders,
      templates,
      clientConfig,
      loading,
      polling,
      pollFeeds,
      openInStudio,
      studioArticle,
      drillInto,
    ],
  );

  return (
    <WarRoomContext.Provider value={value}>
      {children}
      <ArticleIntelligenceDrawer
        article={drawerArticle}
        onClose={() => setDrawerArticle(null)}
        onSelectForCard={openInStudio}
      />
    </WarRoomContext.Provider>
  );
}
