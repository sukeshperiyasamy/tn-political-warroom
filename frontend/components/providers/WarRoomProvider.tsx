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

export interface PollStatusInfo {
  state: "idle" | "polling" | "success" | "error";
  message?: string;
  newItems?: number;
  processedSources?: number;
  totalSources?: number;
}

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
  pollStatus: PollStatusInfo;
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
  const [pollStatus, setPollStatus] = useState<PollStatusInfo>({ state: "idle" });
  const pollStatusTimerRef = useRef<NodeJS.Timeout | null>(null);

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
    if (pollStatusTimerRef.current) clearTimeout(pollStatusTimerRef.current);
    setPolling(true);
    setPollStatus({ state: "polling", message: "Connecting to feed sources..." });
    try {
      const res = await triggerIngest(undefined, (jobStatus) => {
        const currentSrc = jobStatus.current_source ? ` (${jobStatus.current_source})` : "";
        setPollStatus({
          state: "polling",
          message: `Syncing ${jobStatus.sources_processed}/${jobStatus.sources_total} feeds${currentSrc}...`,
          processedSources: jobStatus.sources_processed,
          totalSources: jobStatus.sources_total,
          newItems: jobStatus.total_new_items_added,
        });
      });
      const [arts, mets] = await Promise.all([fetchArticles(filters), fetchMetrics(filters)]);
      setArticles(arts);
      setMetrics(mets);

      const added = res.total_new_items_added || 0;
      const msg = added > 0 ? `Synced! ${added} new stories` : "Feeds up to date (no new stories)";
      setPollStatus({ state: "success", message: msg, newItems: added });

      pollStatusTimerRef.current = setTimeout(() => {
        setPollStatus({ state: "idle" });
      }, 4000);
    } catch (err: any) {
      console.error("Feed poll failed:", err);
      setPollStatus({ state: "error", message: err.message || "Feed synchronization failed" });
      pollStatusTimerRef.current = setTimeout(() => {
        setPollStatus({ state: "idle" });
      }, 5000);
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
      pollStatus,
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
      pollStatus,
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
