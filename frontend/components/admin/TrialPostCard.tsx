"use client";

import React, { useState } from "react";
import { CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import { TrialPost, reclassifyPost, reviewClassification } from "../../lib/socialTrialApi";

export const inputClass =
  "w-full h-10 rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-muted outline-none focus-visible:border-ink";
export const btn =
  "inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold border border-line bg-surface text-ink hover:bg-subtle disabled:opacity-50";
export const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold bg-ink text-white hover:bg-ink-soft disabled:opacity-50";

export function Chip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "bad" | "warn" }) {
  const tones = {
    neutral: "bg-subtle text-ink-soft",
    good: "bg-positive-soft text-positive",
    bad: "bg-negative-soft text-negative",
    warn: "bg-accent-soft text-accent-strong",
  };
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

const CATEGORY_LABEL: Record<string, string> = {
  tamil_nadu_politics: "Tamil Nadu politics",
  other_state_politics: "Other-state politics",
  national_politics: "National politics",
  tamil_nadu_news: "Tamil Nadu news (non-political)",
  non_political: "Not political",
};

function ClassificationBlock({ post, onChanged }: { post: TrialPost; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      onChanged();
    } finally {
      setBusy(false);
    }
  };
  const reviewed = post.review_status === "accepted" || post.review_status === "rejected";
  const rerun = () => {
    if (
      reviewed &&
      !window.confirm(
        `This classification is already ${post.review_status}. Re-running Gemini will replace it on screen with a new suggestion marked "needs review". The earlier decision is kept in history. Continue?`,
      )
    )
      return;
    return act(() => reclassifyPost(post.id, reviewed));
  };

  if (post.stage_a === "fail") {
    return (
      <p className="mt-3 rounded-lg bg-canvas p-2.5 text-xs text-ink-muted">
        Filtered out before Gemini: no Tamil Nadu or political signal in the caption.{" "}
        <button className="underline font-semibold" disabled={busy} onClick={() => act(() => reclassifyPost(post.id))}>
          Classify anyway
        </button>
      </p>
    );
  }
  if (!post.cls_status) {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-ink-muted">
        Not classified yet.
        <button className={btn} disabled={busy} onClick={() => act(() => reclassifyPost(post.id))}>Classify with Gemini</button>
      </div>
    );
  }
  if (post.cls_status !== "ok") {
    return (
      <div className="mt-3 rounded-lg bg-negative-soft p-3 text-xs text-negative">
        <p className="font-semibold">{post.cls_status === "skipped" ? "Skipped" : "Gemini classification failed"}</p>
        <p className="mt-0.5 break-words">{post.cls_error}</p>
        <button className={`${btn} mt-2`} disabled={busy} onClick={() => act(() => reclassifyPost(post.id))}>Retry</button>
      </div>
    );
  }
  const none = !post.party_codes?.length && !post.leader_names?.length && !post.topics?.length;
  return (
    <div className="mt-3 rounded-lg border border-line bg-canvas p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Gemini suggestion (unverified)</span>
        <Chip tone={post.is_political ? "warn" : "neutral"}>
          {post.category ? CATEGORY_LABEL[post.category] ?? post.category : post.is_political ? "Political" : "Not political"}
        </Chip>
        {post.confidence != null && <Chip>conf {Math.round(post.confidence * 100)}%</Chip>}
        {post.agrees_with_rules === 0 && <Chip tone="bad">differs from rule-based</Chip>}
        {post.review_status === "needs_review" && <Chip tone="warn">needs review</Chip>}
        {post.review_status === "accepted" && <Chip tone="good">accepted</Chip>}
        {post.review_status === "rejected" && <Chip tone="bad">rejected</Chip>}
        {(post.prev_review_status === "accepted" || post.prev_review_status === "rejected") &&
          post.review_status !== post.prev_review_status && <Chip>previous result was {post.prev_review_status}</Chip>}
      </div>
      {none ? (
        <p className="text-xs text-ink-muted">No party, leader or topic assigned.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {post.party_codes?.map((p) => <Chip key={`p${p}`} tone="warn">#{p}</Chip>)}
          {post.leader_names?.map((l) => <Chip key={`l${l}`}>{l}</Chip>)}
          {post.topics?.map((t) => <Chip key={`t${t}`}>{t}</Chip>)}
        </div>
      )}
      {(post.districts?.length || post.topic_label) && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
          {post.topic_label && <span>Issue: <strong>{post.topic_label}</strong></span>}
          {post.districts?.map((d) => <Chip key={`d${d}`}>{d}</Chip>)}
        </div>
      )}
      {post.primary_subject && <p className="text-xs text-ink-soft">Primary subject: {post.primary_subject}</p>}
      {post.english_summary && (
        <p className="text-xs text-ink-soft"><span className="font-semibold">AI interpretation (English):</span> {post.english_summary}</p>
      )}
      {post.rationale && <p className="text-xs text-ink-muted">{post.rationale}</p>}
      {post.rule_based && (
        <p className="text-[11px] text-ink-muted">
          Rule-based matcher: {[...post.rule_based.party_codes, ...post.rule_based.leader_names].join(", ") || "no party/leader"}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <button className={btn} disabled={busy || !post.cls_id} onClick={() => act(() => reviewClassification(post.cls_id!, "accepted"))}>
          <CheckCircle2 className="w-3.5 h-3.5" /> Accept
        </button>
        <button className={btn} disabled={busy || !post.cls_id} onClick={() => act(() => reviewClassification(post.cls_id!, "rejected"))}>
          <XCircle className="w-3.5 h-3.5" /> Reject
        </button>
        <button className={btn} disabled={busy} onClick={rerun}>Re-run Gemini</button>
        <span className="text-[11px] text-ink-muted ml-auto">{post.model} · {post.prompt_version}</span>
      </div>
    </div>
  );
}

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-IN") : "—");

export function TrialPostCard({ post: p, onChanged }: { post: TrialPost; onChanged: () => void }) {
  return (
    <article className="rounded-xl border border-line bg-surface p-4 shadow-card min-w-0">
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
        <Chip>{p.platform}</Chip>
        <Chip tone={p.source === "fixture" ? "warn" : "good"}>{p.source === "fixture" ? "MOCK DATA" : "Bright Data"}</Chip>
        {p.author_handle && <span className="font-semibold text-ink">@{p.author_handle}</span>}
        {p.published_at && <time dateTime={p.published_at}>posted {fmt(p.published_at)}</time>}
        {p.post_url && p.source !== "fixture" && (
          <a href={p.post_url} target="_blank" rel="noopener noreferrer" className="ml-auto text-ink-muted hover:text-ink" aria-label="Open original post">
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
      <p className="mt-1 text-[11px] text-ink-muted">
        collected {fmt(p.collected_at)}
        {p.discovery_source && <> · found via <strong>{p.discovery_source}</strong></>}
      </p>
      <p className="font-tamil mt-2 text-sm text-ink whitespace-pre-wrap break-words">{p.text || <em className="text-ink-muted">No text</em>}</p>
      {(p.content_type || (p.hashtags && p.hashtags.length > 0)) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5" aria-label="Post details">
          {p.content_type && (
            <span title="Content type as reported by Bright Data">
              <Chip tone="neutral">Type: {p.content_type}</Chip>
            </span>
          )}
          {p.hashtags?.map((h) => <Chip key={h} tone="warn">#{h}</Chip>)}
        </div>
      )}
      <p className="mt-2 text-xs text-ink-muted tabular-nums">
        {[["likes", p.likes], ["comments", p.comments], ["shares", p.shares], ["views", p.views]]
          .filter(([, v]) => v != null).map(([k, v]) => `${v} ${k}`).join(" · ") || "No engagement data"}
      </p>
      <ClassificationBlock post={p} onChanged={onChanged} />
    </article>
  );
}
