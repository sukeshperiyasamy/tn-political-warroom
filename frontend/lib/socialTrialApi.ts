/** Client for /api/social-trial. Uses a server-issued, expiring token; no API keys ever reach the browser. */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://tn-political-warroom.onrender.com"
    : "http://127.0.0.1:8000");

const TOKEN_KEY = "tn_social_trial_token";

export type TrialPlatform = "instagram" | "facebook" | "x";
export type TrialSource = "brightdata" | "fixture";

export interface TrialTarget {
  platform: TrialPlatform;
  target_url: string;
  display_name: string | null;
  post_limit: number;
  is_enabled: number;
}

export interface TrialRun {
  id: string;
  platform: TrialPlatform;
  target_url: string;
  source: TrialSource;
  status: "collecting" | "classifying" | "completed" | "failed";
  provider_job_id: string | null;
  started_at: string;
  completed_at: string | null;
  discovered: number;
  inserted: number;
  duplicates: number;
  skipped: number;
  classified: number;
  classify_errors: number;
  error_message: string | null;
  sources_json: SourceResult[] | string | null;
}

export interface SourceResult {
  source: string;
  found: number;
  inserted: number;
  duplicates: number;
  stage_a_dropped: number;
  error: string | null;
}

export interface DiscoveryItem {
  id: string;
  kind: "hashtag" | "profile";
  value: string;
  is_enabled: number;
}

export interface DiscoveryInfo {
  items: DiscoveryItem[];
  limits: { max_items: number; profiles_per_run: number; hashtags_per_run: number };
  stage_a: Record<string, number>;
}

export interface TrendRow {
  key: string;
  posts: number;
  accounts: number;
  latest: string;
}

export interface TopicTrends {
  days: number;
  political_posts: number;
  topics: TrendRow[];
  parties: TrendRow[];
  hashtags: TrendRow[];
}

export type DiscoveryMode = "profiles" | "hashtags" | "both";

export interface TrialPost {
  id: string;
  platform: TrialPlatform;
  source: TrialSource;
  post_url: string | null;
  author_handle: string | null;
  text: string | null;
  published_at: string | null;
  collected_at: string;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  views: number | null;
  hashtags: string[] | null;
  /** Provider-reported (Instagram only); stored in the raw payload, not a separate column. */
  content_type: string | null;
  /** Review status of the classification this one superseded, if any. */
  prev_review_status: string | null;
  cls_id: string | null;
  model: string | null;
  prompt_version: string | null;
  is_political: number | null;
  party_codes: string[] | null;
  leader_names: string[] | null;
  topics: string[] | null;
  primary_subject: string | null;
  confidence: number | null;
  rationale: string | null;
  rule_based: { party_codes: string[]; leader_names: string[]; topics: string[] } | null;
  agrees_with_rules: number | null;
  review_status: string | null;
  cls_status: "ok" | "error" | "skipped" | null;
  cls_error: string | null;
  discovery_source: string | null;
  stage_a: "pass" | "fail";
  category: "tamil_nadu_politics" | "other_state_politics" | "national_politics" | "tamil_nadu_news" | "non_political" | null;
  districts: string[] | null;
  topic_label: string | null;
  english_summary: string | null;
}

export interface TrialStatus {
  bright_data: { configured: boolean; message: string };
  gemini: { configured: boolean; message: string; model: string; location: string; prompt_version: string };
  platforms: Record<string, { label: string; dataset_id: string }>;
  max_posts_per_run: number;
}

export class TrialAuthError extends Error {}

export const getToken = (): string | null => {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
export const clearToken = () => {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
};

async function call<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (!token) throw new TrialAuthError("Sign in required.");
    headers.Authorization = `Bearer ${token}`;
  }
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/social-trial${path}`, { ...init, headers: { ...headers, ...(init.headers || {}) } });
  } catch {
    throw new Error("Cannot reach the backend. Is it running on port 8000?");
  }
  if (res.status === 401 && auth) {
    clearToken();
    throw new TrialAuthError("Session expired. Sign in again.");
  }
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      /* keep default */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export async function login(username: string, password: string): Promise<void> {
  const { token } = await call<{ token: string }>("/login", { method: "POST", body: JSON.stringify({ username, password }) }, false);
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export const fetchStatus = () => call<TrialStatus>("/status");
export const fetchTargets = () => call<{ targets: TrialTarget[] }>("/targets").then((r) => r.targets);
export const saveTarget = (platform: TrialPlatform, target_url: string, post_limit: number) =>
  call<TrialTarget>(`/targets/${platform}`, { method: "PUT", body: JSON.stringify({ target_url, post_limit }) });
export const startRun = (platform: TrialPlatform, source: TrialSource, dry_run: boolean) =>
  call<TrialRun | Record<string, unknown>>("/runs", { method: "POST", body: JSON.stringify({ platform, source, dry_run, classify: true }) });
export const fetchRuns = () => call<{ runs: TrialRun[] }>("/runs?limit=10").then((r) => r.runs);
export const fetchPosts = (platform?: TrialPlatform) =>
  call<{ posts: TrialPost[] }>(`/posts?limit=100${platform ? `&platform=${platform}` : ""}`).then((r) => r.posts);
export const reclassifyPost = (postId: string, force = false) =>
  call<unknown>(`/posts/${postId}/classify${force ? "?force=true" : ""}`, { method: "POST" });
export const reviewClassification = (id: string, review_status: "accepted" | "rejected" | "needs_review") =>
  call<unknown>(`/classifications/${id}/review`, { method: "POST", body: JSON.stringify({ review_status }) });

export const fetchDiscoveryItems = () => call<DiscoveryInfo>("/instagram/discovery-items");
export const addDiscoveryItem = (kind: "hashtag" | "profile", value: string) =>
  call<DiscoveryItem>("/instagram/discovery-items", { method: "POST", body: JSON.stringify({ kind, value }) });
export const toggleDiscoveryItem = (id: string, is_enabled: boolean) =>
  call<unknown>(`/instagram/discovery-items/${id}`, { method: "PATCH", body: JSON.stringify({ is_enabled }) });
export const deleteDiscoveryItem = (id: string) => call<unknown>(`/instagram/discovery-items/${id}`, { method: "DELETE" });
export const startDiscoveryRun = (sources: DiscoveryMode, source: TrialSource, dry_run: boolean) =>
  call<TrialRun | Record<string, unknown>>("/instagram/discovery-runs", {
    method: "POST",
    body: JSON.stringify({ sources, source, dry_run, classify: true }),
  });
export const fetchRecentPolitical = (days: number) =>
  call<{ posts: TrialPost[] }>(`/instagram/recent?days=${days}&limit=100`).then((r) => r.posts);
export const fetchTopicTrends = (days: number) => call<TopicTrends>(`/instagram/topics?days=${days}`);
