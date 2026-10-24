"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, FlaskConical, Loader2, Plus, Trash2 } from "lucide-react";
import {
  DiscoveryInfo,
  DiscoveryMode,
  SourceResult,
  TopicTrends,
  TrendRow,
  TrialPost,
  TrialRun,
  TrialSource,
  addDiscoveryItem,
  deleteDiscoveryItem,
  fetchDiscoveryItems,
  fetchRecentPolitical,
  fetchRuns,
  fetchTopicTrends,
  startDiscoveryRun,
  toggleDiscoveryItem,
} from "../../lib/socialTrialApi";
import { Chip, TrialPostCard, btn, btnPrimary, inputClass } from "./TrialPostCard";

const WINDOWS = [
  { days: 1, label: "24 hours" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
];

const isActive = (r: TrialRun) => r.status === "collecting" || r.status === "classifying";
const parseSources = (r?: TrialRun): SourceResult[] => {
  if (!r?.sources_json) return [];
  if (Array.isArray(r.sources_json)) return r.sources_json;
  try {
    return JSON.parse(r.sources_json);
  } catch {
    return [];
  }
};

function TrendTable({ title, rows, empty }: { title: string; rows: TrendRow[]; empty: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface shadow-card overflow-hidden">
      <h4 className="px-4 py-3 text-sm font-semibold border-b border-line">{title}</h4>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-xs text-ink-muted text-center">{empty}</p>
      ) : (
        <table className="w-full text-xs">
          <thead className="text-left text-ink-muted">
            <tr><th className="px-4 py-2 font-semibold">Name</th><th className="px-2 py-2 font-semibold">Posts</th><th className="px-2 py-2 font-semibold">Accounts</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-line">
                <td className="px-4 py-2 break-words">{r.key}</td>
                <td className="px-2 py-2 tabular-nums font-semibold">{r.posts}</td>
                <td className="px-2 py-2 tabular-nums">{r.accounts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function InstagramDiscovery() {
  const [info, setInfo] = useState<DiscoveryInfo | null>(null);
  const [kind, setKind] = useState<"hashtag" | "profile">("hashtag");
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<DiscoveryMode>("both");
  const [view, setView] = useState<"recent" | "topics">("recent");
  const [days, setDays] = useState(7);
  const [posts, setPosts] = useState<TrialPost[]>([]);
  const [trends, setTrends] = useState<TopicTrends | null>(null);
  const [run, setRun] = useState<TrialRun | undefined>();
  const [dry, setDry] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fail = (e: unknown) => setError(e instanceof Error ? e.message : "Request failed.");

  const loadItems = useCallback(() => fetchDiscoveryItems().then(setInfo).catch(fail), []);
  const loadRun = useCallback(
    () => fetchRuns().then((rs) => setRun(rs.find((r) => r.platform === "instagram" && r.target_url.startsWith("discovery:")))).catch(fail),
    [],
  );
  const loadView = useCallback(async () => {
    try {
      if (view === "recent") setPosts(await fetchRecentPolitical(days));
      else setTrends(await fetchTopicTrends(days));
    } catch (e) {
      fail(e);
    }
  }, [view, days]);

  useEffect(() => {
    loadItems();
    loadRun();
  }, [loadItems, loadRun]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch; state is set after the await
    loadView();
  }, [loadView]);

  const active = !!run && isActive(run);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      loadRun();
      loadView();
    }, 4000);
    return () => clearInterval(id);
  }, [active, loadRun, loadView]);

  // Refresh the views once when a run finishes.
  const status = run?.status;
  useEffect(() => {
    if (status === "completed") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch; state is set after the await
      loadView();
    }
  }, [status, loadView]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await addDiscoveryItem(kind, value);
      setValue("");
      loadItems();
    } catch (err) {
      fail(err);
    }
  };

  const launch = async (source: TrialSource, dryRun: boolean) => {
    setBusy(true);
    setError(null);
    setDry(null);
    try {
      const out = await startDiscoveryRun(mode, source, dryRun);
      if (dryRun) setDry(out);
      await loadRun();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const items = info?.items ?? [];
  const results = parseSources(run);

  return (
    <section aria-label="Instagram political discovery" className="rounded-xl border border-line bg-surface p-4 sm:p-5 shadow-card space-y-5">
      <div>
        <h3 className="font-serif text-xl font-semibold">Instagram political discovery</h3>
        <p className="mt-1 text-sm text-ink-muted max-w-3xl">
          Finds Tamil Nadu political posts from the hashtags and public profiles below, filters and classifies them, and lists them for review.
          Results are posts discovered through <strong>these selected sources</strong>, not a complete ranking of Instagram.
          Likes and comments are not available from the profile route, so nothing here is ranked by engagement.
        </p>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg bg-negative-soft p-3 text-sm text-negative">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="break-words">{error}</span>
        </div>
      )}

      {/* ---- discovery list ---- */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold">Discovery list</h4>
        <div className="flex flex-wrap gap-2" aria-label="Discovery items">
          {items.length === 0 && <p className="text-xs text-ink-muted">Nothing configured yet.</p>}
          {items.map((it) => (
            <span key={it.id} className={`inline-flex items-center gap-1 rounded-full border pl-3 pr-1 py-1 text-xs ${it.is_enabled ? "border-line bg-canvas" : "border-dashed border-line-strong text-ink-muted"}`}>
              <button
                type="button"
                className="font-semibold"
                onClick={() => toggleDiscoveryItem(it.id, !it.is_enabled).then(loadItems).catch(fail)}
                aria-pressed={!!it.is_enabled}
                title={it.is_enabled ? "Enabled - click to disable" : "Disabled - click to enable"}
              >
                {it.kind === "hashtag" ? `#${it.value}` : `@${it.value}`}
              </button>
              <button
                type="button"
                className="grid place-items-center w-6 h-6 rounded-full hover:bg-subtle"
                aria-label={`Remove ${it.value}`}
                onClick={() => deleteDiscoveryItem(it.id).then(loadItems).catch(fail)}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <form onSubmit={add} className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-semibold text-ink-soft">
            Type
            <select className={`${inputClass} mt-1 w-36`} value={kind} onChange={(e) => setKind(e.target.value as "hashtag" | "profile")}>
              <option value="hashtag">Hashtag</option>
              <option value="profile">Public profile</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-ink-soft flex-1 min-w-[12rem]">
            {kind === "hashtag" ? "Hashtag (without spaces)" : "Instagram handle or profile URL"}
            <input className={`${inputClass} mt-1`} value={value} onChange={(e) => setValue(e.target.value)} required
              placeholder={kind === "hashtag" ? "#TamilNaduPolitics" : "https://www.instagram.com/<handle>/"} />
          </label>
          <button type="submit" className={btn}><Plus className="w-3.5 h-3.5" /> Add</button>
        </form>
        {info && (
          <p className="text-[11px] text-ink-muted">
            Each run uses at most {info.limits.profiles_per_run} enabled profiles and {info.limits.hashtags_per_run} enabled hashtags, 10 posts per source.
            Stage A keyword filter: {info.stage_a.political_words} political words, {info.stage_a.place_words} place names, {info.stage_a.party_hashtags} party hashtags;
            Tamil-script captions always pass to Gemini.
          </p>
        )}
      </div>

      {/* ---- run controls ---- */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-semibold text-ink-soft">
            Sources
            <select className={`${inputClass} mt-1 w-56`} value={mode} onChange={(e) => setMode(e.target.value as DiscoveryMode)}>
              <option value="both">Hashtags + profiles</option>
              <option value="profiles">Profiles only (verified route)</option>
              <option value="hashtags">Hashtags only (experimental)</option>
            </select>
          </label>
          <button className={btn} disabled={busy || active} onClick={() => launch("brightdata", true)}>Dry run</button>
          <button className={btn} disabled={busy || active} onClick={() => launch("fixture", false)}>Mock run</button>
          <button className={btnPrimary} disabled={busy || active} onClick={() => launch("brightdata", false)}>
            {active ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
            Discover (Bright Data)
          </button>
        </div>
        <p className="text-[11px] text-ink-muted">
          Profiles use the Profiles scraper (about 1 credit each). Hashtag discovery uses Bright Data&apos;s dataset filter, which is <strong>experimental</strong>:
          it can take many minutes and may return nothing. A failing source never stops the others.
        </p>

        {run && (
          <div className={`rounded-lg p-3 text-xs ${run.status === "failed" ? "bg-negative-soft text-negative" : "bg-subtle text-ink-soft"}`}>
            <p className="font-semibold">
              Last discovery run: {run.status} ({run.source === "fixture" ? "mock" : "Bright Data"}) · {new Date(run.started_at).toLocaleString("en-IN")} ·
              found {run.discovered}, new {run.inserted}, duplicates {run.duplicates}, classified {run.classified}
            </p>
            {run.error_message && <p className="mt-1 break-words">{run.error_message}</p>}
            {results.length > 0 && (
              <ul className="mt-2 space-y-0.5">
                {results.map((r) => (
                  <li key={r.source} className="break-words">
                    <strong>{r.source}</strong>: {r.error ? <span className="text-negative">{r.error}</span> : `${r.found} found, ${r.inserted} new, ${r.duplicates} duplicate, ${r.stage_a_dropped} filtered before Gemini`}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {dry !== null && (
          <details open className="rounded-lg bg-canvas p-3">
            <summary className="text-xs font-semibold cursor-pointer">Dry run — nothing was sent, saved or classified</summary>
            <pre className="mt-2 max-h-64 overflow-auto text-xs">{JSON.stringify(dry, null, 2)}</pre>
          </details>
        )}
      </div>

      {/* ---- views ---- */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {([["recent", "Recent political posts"], ["topics", "Trending topics in our collected posts"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setView(id)} aria-pressed={view === id}
              className={`h-9 px-3 rounded-full text-xs font-semibold ${view === id ? "bg-ink text-white" : "border border-line bg-surface hover:bg-subtle"}`}>
              {label}
            </button>
          ))}
          <span className="ml-auto flex items-center gap-1" role="group" aria-label="Time window">
            {WINDOWS.map((w) => (
              <button key={w.days} onClick={() => setDays(w.days)} aria-pressed={days === w.days}
                className={`h-8 px-2.5 rounded-lg text-xs font-semibold ${days === w.days ? "bg-accent-soft text-accent-strong" : "hover:bg-subtle"}`}>
                {w.label}
              </button>
            ))}
          </span>
        </div>

        {view === "recent" ? (
          <>
            <p className="text-xs text-ink-muted">
              Tamil Nadu political posts among collected posts, newest first (post time). Sorted by recency only. Rejected posts are hidden.
            </p>
            {posts.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line-strong p-8 text-center text-sm text-ink-muted">
                No Tamil Nadu political posts in this window yet. Run discovery, or widen the time window.
              </p>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {posts.map((p) => <TrialPostCard key={p.id} post={p} onChanged={() => { loadView(); }} />)}
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-xs text-ink-muted">
              How often issues appear in the political posts we have collected ({trends?.political_posts ?? 0} posts in this window). Each post counts once;
              accounts are counted distinctly. This is <strong>not</strong> an Instagram-wide trending list.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <TrendTable title="Topics" rows={trends?.topics ?? []} empty="No topics in this window." />
              <TrendTable title="Parties" rows={trends?.parties ?? []} empty="No parties in this window." />
              <TrendTable title="Hashtags" rows={trends?.hashtags ?? []} empty="No hashtags in this window." />
            </div>
          </>
        )}
        <div className="flex flex-wrap gap-2 text-[11px] text-ink-muted">
          <Chip>Engagement ranking: not available</Chip>
        </div>
      </div>
    </section>
  );
}
