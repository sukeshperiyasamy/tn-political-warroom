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
  fetchNewsUpdates,
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

function mergeArticles(existing: NewsArticle[], incoming: NewsArticle[]): NewsArticle[] {
  if (!incoming || incoming.length === 0) return existing;
  const map = new Map<string, NewsArticle>();
  for (const a of existing) {
    map.set(a.id, a);
  }
  for (const a of incoming) {
    map.set(a.id, a);
  }
  const merged = Array.from(map.values());
  merged.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
  return merged;
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
  const lastCursorRef = useRef<string | null>(null);

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
    if (articles.length === 0) {
      setLoading(true);
    }

    Promise.all([fetchArticles(filters), fetchMetrics(filters)])
      .then(([arts, mets]) => {
        if (!mounted) return;
        if (arts) {
          setArticles(arts);
          if (!lastCursorRef.current) {
            lastCursorRef.current = new Date().toISOString();
          }
        }
        if (mets) {
          setMetrics(mets);
        }
        if (!studioSeeded.current && arts && arts.length > 0) {
          studioSeeded.current = true;
          setStudioArticle(arts[0]);
        }
      })
      .catch((err) => {
        console.warn("Failed to load articles/metrics (retaining existing view):", err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [filters]);

  // Background non-disruptive update loop (every 25 seconds)
  useEffect(() => {
    let mounted = true;
    let inFlight = false;

    const checkBackgroundUpdates = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      if (inFlight || polling) return;

      const cursor = lastCursorRef.current;
      if (!cursor) return;

      inFlight = true;
      try {
        const updates = await fetchNewsUpdates(cursor, filters);
        if (!mounted) return;

        lastCursorRef.current = updates.cursor || updates.server_time;

        if (updates.articles && updates.articles.length > 0) {
          setArticles((prev) => mergeArticles(prev, updates.articles));
          fetchMetrics(filters)
            .then((freshMets) => {
              if (mounted && freshMets) {
                setMetrics(freshMets);
              }
            })
            .catch(() => {});
        }
      } catch (err) {
        console.debug("Background news updates check failed (retaining existing view):", err);
      } finally {
        inFlight = false;
      }
    };

    const intervalId = setInterval(checkBackgroundUpdates, 25000);

    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        checkBackgroundUpdates();
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      mounted = false;
      clearInterval(intervalId);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [filters, polling]);

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

      const cursor = lastCursorRef.current;
      if (cursor) {
        try {
          const updates = await fetchNewsUpdates(cursor, filters);
          lastCursorRef.current = updates.cursor || updates.server_time;
          if (updates.articles && updates.articles.length > 0) {
            setArticles((prev) => mergeArticles(prev, updates.articles));
          }
        } catch (err) {
          console.warn("Failed to fetch incremental updates post-poll, refreshing full feed:", err);
          const arts = await fetchArticles(filters);
          if (arts && arts.length > 0) {
            setArticles(arts);
          }
        }
      } else {
        const arts = await fetchArticles(filters);
        if (arts && arts.length > 0) {
          setArticles(arts);
          lastCursorRef.current = new Date().toISOString();
        }
      }

      // Refresh metrics silently
      try {
        const mets = await fetchMetrics(filters);
        if (mets) {
          setMetrics(mets);
        }
      } catch (err) {
        console.warn("Failed to refresh metrics post-poll:", err);
      }

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
