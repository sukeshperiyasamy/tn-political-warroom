"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, FlaskConical, Loader2, LogIn, RefreshCw } from "lucide-react";
import { Chip, TrialPostCard, btn, btnPrimary, inputClass } from "./TrialPostCard";
import { InstagramDiscovery } from "./InstagramDiscovery";
import {
  TrialAuthError,
  TrialPlatform,
  TrialPost,
  TrialRun,
  TrialSource,
  TrialStatus,
  TrialTarget,
  clearToken,
  fetchPosts,
  fetchRuns,
  fetchStatus,
  fetchTargets,
  getToken,
  login,
  saveTarget,
  startRun,
} from "../../lib/socialTrialApi";

const PLATFORMS: { id: TrialPlatform; label: string; placeholder: string }[] = [
  { id: "instagram", label: "Instagram", placeholder: "https://www.instagram.com/<public_profile>/" },
  { id: "facebook", label: "Facebook", placeholder: "https://www.facebook.com/<public_page>" },
  { id: "x", label: "X (Twitter)", placeholder: "https://x.com/<public_profile>" },
];

const isActive = (r: TrialRun) => r.status === "collecting" || r.status === "classifying";

function SignIn({ onDone }: { onDone: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username, password);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-md rounded-xl border border-line bg-surface p-5 shadow-card space-y-3">
      <h2 className="font-serif text-lg font-semibold">Server sign-in required</h2>
      <p className="text-sm text-ink-muted">
        This tab spends paid API credits, so the backend requires its own login (separate from the browser-only admin screen).
      </p>
      <label className="block text-xs font-semibold text-ink-soft">
        Username
        <input className={`${inputClass} mt-1`} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
      </label>
      <label className="block text-xs font-semibold text-ink-soft">
        Password
        <input type="password" className={`${inputClass} mt-1`} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </label>
      {error && <p role="alert" className="text-sm text-negative">{error}</p>}
      <button type="submit" disabled={busy} className={btnPrimary}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
        Sign in
      </button>
    </form>
  );
}

export function AdminSocialTrialSection() {
  const [authed, setAuthed] = useState<boolean>(() => !!getToken());
  const [status, setStatus] = useState<TrialStatus | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, TrialTarget | undefined>>({});
  const [runs, setRuns] = useState<TrialRun[]>([]);
  const [posts, setPosts] = useState<TrialPost[]>([]);
  const [filter, setFilter] = useState<TrialPlatform | "all">("all");
  const [notice, setNotice] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const [dryRun, setDryRun] = useState<unknown>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const handleError = useCallback((err: unknown) => {
    if (err instanceof TrialAuthError) {
      clearToken();
      setAuthed(false);
    }
    setNotice({ tone: "error", text: err instanceof Error ? err.message : "Request failed." });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [r, p] = await Promise.all([fetchRuns(), fetchPosts(filter === "all" ? undefined : filter)]);
      setRuns(r);
      setPosts(p);
    } catch (err) {
      handleError(err);
    }
  }, [handleError, filter]);

  useEffect(() => {
    if (!authed) return;
    Promise.all([fetchStatus(), fetchTargets()])
      .then(([s, t]) => {
        setStatus(s);
        const map: Record<string, TrialTarget> = {};
        t.forEach((x) => (map[x.platform] = x));
        setSaved(map);
        setUrls(Object.fromEntries(t.map((x) => [x.platform, x.target_url])));
      })
      .catch(handleError);
  }, [authed, handleError]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch; state is set after the await
    if (authed) refresh();
  }, [authed, refresh]);

  const anyActive = runs.some(isActive);
  useEffect(() => {
    if (!authed || !anyActive) return;
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, [authed, anyActive, refresh]);

  const save = async (platform: TrialPlatform) => {
    setBusy(`save-${platform}`);
    setNotice(null);
    try {
      const t = await saveTarget(platform, (urls[platform] || "").trim(), 10);
      setSaved((s) => ({ ...s, [platform]: t }));
      setNotice({ tone: "info", text: `${platform} target saved.` });
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(null);
    }
  };

  const run = async (platform: TrialPlatform, source: TrialSource, dry: boolean) => {
    setBusy(`${platform}-${source}-${dry}`);
    setNotice(null);
    setDryRun(null);
    try {
      if ((urls[platform] || "").trim() !== saved[platform]?.target_url) await save(platform);
      const out = await startRun(platform, source, dry);
      if (dry) setDryRun(out);
      else setNotice({ tone: "info", text: `${platform} ${source === "fixture" ? "mock" : "Bright Data"} run started.` });
      await refresh();
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(null);
    }
  };

  if (!authed) {
    return (
      <div className="space-y-4">
        <Header />
        <SignIn onDone={() => setAuthed(true)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header
        right={
          <button className={btn} onClick={() => { clearToken(); setAuthed(false); }}>
            Sign out
          </button>
        }
      />

      {status && (
        <div className="flex flex-wrap gap-2 text-xs" aria-label="Integration status">
          <Chip tone={status.bright_data.configured ? "good" : "bad"}>Bright Data key: {status.bright_data.configured ? "found" : "missing"}</Chip>
          <Chip tone={status.gemini.configured ? "good" : "bad"}>Gemini: {status.gemini.configured ? `${status.gemini.model} (${status.gemini.location})` : "missing"}</Chip>
          <Chip>Max {status.max_posts_per_run} posts per platform per run</Chip>
          <Chip tone="warn">Trial data is stored separately from RSS articles</Chip>
        </div>
      )}

      {notice && (
        <div role={notice.tone === "error" ? "alert" : "status"} className={`flex items-start gap-2 rounded-lg p-3 text-sm ${notice.tone === "error" ? "bg-negative-soft text-negative" : "bg-positive-soft text-positive"}`}>
          {notice.tone === "error" && <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
          <span className="break-words">{notice.text}</span>
        </div>
      )}

      <section aria-label="Targets" className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {PLATFORMS.map((p) => {
          const latest = runs.find((r) => r.platform === p.id);
          const active = runs.some((r) => r.platform === p.id && isActive(r));
          return (
            <div key={p.id} className="rounded-xl border border-line bg-surface p-4 shadow-card space-y-3">
              <h3 className="font-serif text-lg font-semibold">{p.label}</h3>
              <label className="block text-xs font-semibold text-ink-soft">
                Public target URL
                <input className={`${inputClass} mt-1`} value={urls[p.id] || ""} placeholder={p.placeholder}
                  onChange={(e) => setUrls((u) => ({ ...u, [p.id]: e.target.value }))} />
              </label>
              <div className="flex flex-wrap gap-2">
                <button className={btn} disabled={!!busy || !urls[p.id]} onClick={() => save(p.id)}>Save</button>
                <button className={btn} disabled={!!busy || !urls[p.id]} onClick={() => run(p.id, "brightdata", true)}>Dry run</button>
                <button className={btn} disabled={!!busy || active || !urls[p.id]} onClick={() => run(p.id, "fixture", false)}>Mock run</button>
                <button className={btnPrimary} disabled={!!busy || active || !urls[p.id]} onClick={() => run(p.id, "brightdata", false)}>
                  {active ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
                  Collect (Bright Data)
                </button>
              </div>
              {latest && (
                <div className={`rounded-lg p-2.5 text-xs ${latest.status === "failed" ? "bg-negative-soft text-negative" : "bg-subtle text-ink-soft"}`}>
                  <p className="font-semibold">Last run: {latest.status} ({latest.source === "fixture" ? "mock" : "Bright Data"})</p>
                  {latest.error_message && <p className="mt-1 break-words">{latest.error_message}</p>}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <InstagramDiscovery />

      {dryRun !== null && (
        <section aria-label="Dry run result" className="rounded-xl border border-line bg-surface p-4 shadow-card">
          <h3 className="text-sm font-semibold mb-2">Dry run — nothing was sent, saved or classified</h3>
          <pre className="max-h-72 overflow-auto rounded-lg bg-canvas p-3 text-xs">{JSON.stringify(dryRun, null, 2)}</pre>
        </section>
      )}

      <section aria-label="Runs" className="rounded-xl border border-line bg-surface shadow-card overflow-x-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <h3 className="text-sm font-semibold">Recent runs</h3>
          <button className={btn} onClick={refresh}><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
        </div>
        <table className="w-full text-xs">
          <thead className="text-left text-ink-muted">
            <tr>{["Started", "Platform", "Source", "Status", "Found", "New", "Dupes", "Skipped", "Classified", "Errors"].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {runs.length === 0 && <tr><td colSpan={10} className="px-3 py-6 text-center text-ink-muted">No runs yet.</td></tr>}
            {runs.map((r) => (
              <tr key={r.id} className="border-t border-line align-top">
                <td className="px-3 py-2 whitespace-nowrap">{new Date(r.started_at).toLocaleString("en-IN")}</td>
                <td className="px-3 py-2">{r.platform}</td>
                <td className="px-3 py-2">{r.source === "fixture" ? "mock" : "Bright Data"}</td>
                <td className="px-3 py-2"><Chip tone={r.status === "completed" ? "good" : r.status === "failed" ? "bad" : "warn"}>{r.status}</Chip></td>
                <td className="px-3 py-2 tabular-nums">{r.discovered}</td>
                <td className="px-3 py-2 tabular-nums">{r.inserted}</td>
                <td className="px-3 py-2 tabular-nums">{r.duplicates}</td>
                <td className="px-3 py-2 tabular-nums">{r.skipped}</td>
                <td className="px-3 py-2 tabular-nums">{r.classified}</td>
                <td className="px-3 py-2 tabular-nums">{r.classify_errors}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-label="Collected posts">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <h3 className="font-serif text-xl font-semibold mr-2">Collected posts &amp; classifications</h3>
          {(["all", ...PLATFORMS.map((p) => p.id)] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}
              className={`h-8 px-3 rounded-full text-xs font-semibold ${filter === f ? "bg-ink text-white" : "bg-surface border border-line text-ink hover:bg-subtle"}`}>
              {f === "all" ? "All" : PLATFORMS.find((p) => p.id === f)!.label}
            </button>
          ))}
        </div>
        {posts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line-strong bg-surface p-8 text-center text-sm text-ink-muted">
            No posts yet. Save a target and use “Mock run” or “Collect”.
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {posts.map((p) => (
              <TrialPostCard key={p.id} post={p} onChanged={refresh} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Header({ right }: { right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="font-serif text-2xl font-semibold">Social Trial — Bright Data + Gemini</h2>
        <p className="mt-1 text-sm text-ink-muted max-w-2xl">
          Manual, capped collection of public Instagram, Facebook and X posts, classified by Gemini against the existing party, leader and topic registries.
          Results are AI suggestions and are kept apart from RSS articles.
        </p>
      </div>
      {right}
    </div>
  );
}
