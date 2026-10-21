"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Sliders,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Info,
  RefreshCw,
} from "lucide-react";
import { TrendingConfig } from "../../types/political";
import {
  fetchTrendingConfig,
  updateTrendingConfig,
  resetTrendingConfig,
} from "../../lib/api";

export function AdminTrendingSection() {
  const [config, setConfig] = useState<TrendingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Local weight state
  const [momentumWeight, setMomentumWeight] = useState(0.40);
  const [volumeWeight, setVolumeWeight] = useState(0.30);
  const [crossSourceWeight, setCrossSourceWeight] = useState(0.20);
  const [recencyWeight, setRecencyWeight] = useState(0.10);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await fetchTrendingConfig();
      setConfig(data);
      setMomentumWeight(data.weights.momentum_weight);
      setVolumeWeight(data.weights.volume_growth_weight);
      setCrossSourceWeight(data.weights.cross_source_weight);
      setRecencyWeight(data.weights.recency_weight);
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to load trending configuration" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const totalSum = Number((momentumWeight + volumeWeight + crossSourceWeight + recencyWeight).toFixed(2));
  const isSumValid = Math.abs(totalSum - 1.0) <= 0.05;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSumValid) {
      setFeedback({
        type: "error",
        text: `Weights must sum to 1.00 (current total: ${totalSum.toFixed(2)}). Please adjust the sliders.`,
      });
      return;
    }

    try {
      setSaving(true);
      setFeedback(null);
      const res = await updateTrendingConfig({
        momentum_weight: momentumWeight,
        volume_growth_weight: volumeWeight,
        cross_source_weight: crossSourceWeight,
        recency_weight: recencyWeight,
      });
      setConfig(res);
      setFeedback({ type: "success", text: "Trending algorithm weights successfully updated and applied!" });
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to update trending configuration" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setSaving(true);
      setFeedback(null);
      const res = await resetTrendingConfig();
      setConfig(res);
      setMomentumWeight(res.weights.momentum_weight);
      setVolumeWeight(res.weights.volume_growth_weight);
      setCrossSourceWeight(res.weights.cross_source_weight);
      setRecencyWeight(res.weights.recency_weight);
      setFeedback({ type: "success", text: "Reset trending configuration back to system baseline defaults (40/30/20/10)." });
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to reset trending configuration" });
    } finally {
      setSaving(false);
    }
  };

  if (loading && !config) {
    return (
      <div className="p-16 text-center text-ink-muted bg-surface border border-line rounded-xl">
        <RefreshCw className="w-6 h-6 border-2 border-zinc-800 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs">Loading trending formula parameters...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="p-5 sm:p-6 bg-surface border border-line rounded-xl shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-600" />
            <h2 className="text-sm sm:text-base font-bold text-ink font-serif">
              Algorithmic Trending Configuration & Calibration
            </h2>
          </div>
          <p className="text-xs text-ink-muted mt-1 font-tamil">
            சமூக ஊடக மற்றும் செய்திப் போக்குகளின் மதிப்பீட்டுச் சூத்திரம் மற்றும் எடைகள்
          </p>
        </div>

        <button
          onClick={handleReset}
          disabled={saving}
          className="px-3 py-1.5 rounded-lg border border-line-strong hover:bg-subtle text-xs font-semibold text-ink-soft flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5 text-ink-muted" />
          <span>Reset Defaults</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-lg text-xs flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
              : "bg-rose-50 border border-rose-200 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-ink-muted hover:text-ink font-bold ml-2 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Formula Display Box */}
      <div className="p-5 bg-ink text-white rounded-xl shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
            Active Multi-Signal Ranking Formula
          </span>
          <span className="text-[11px] font-mono text-ink-muted">
            Dynamic Score: 0 to 100
          </span>
        </div>
        <div className="p-3 bg-zinc-950 rounded-lg font-mono text-xs text-zinc-200 border border-zinc-800 overflow-x-auto">
          trend_score = (
          <span className="text-amber-300">{(momentumWeight * 100).toFixed(0)}%</span> × momentum +{" "}
          <span className="text-emerald-300">{(volumeWeight * 100).toFixed(0)}%</span> × post_volume_growth +{" "}
          <span className="text-sky-300">{(crossSourceWeight * 100).toFixed(0)}%</span> × cross_source_presence +{" "}
          <span className="text-purple-300">{(recencyWeight * 100).toFixed(0)}%</span> × time_decay_recency
          )
        </div>
        <p className="text-[11px] text-ink-muted leading-relaxed">
          {config?.description}
        </p>
      </div>

      {/* Interactive Weight Sliders Form */}
      <form onSubmit={handleSave} className="p-6 bg-surface border border-line rounded-xl shadow-card space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
              Signal Weight Calibration
            </h3>
            <p className="text-[11px] text-ink-muted mt-0.5">
              Drag the sliders or enter decimal values. All 4 components must sum to 1.00 (100%).
            </p>
          </div>

          {/* Sum Badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-soft font-semibold">Total Allocation:</span>
            <span
              className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                isSumValid
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {(totalSum * 100).toFixed(0)}% {isSumValid ? "✓" : "⚠️ Must be 100%"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Signal 1: Momentum */}
          <div className="p-4 rounded-lg bg-canvas border border-line space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-ink">
                1. Engagement Momentum Weight (W_m)
              </label>
              <span className="text-xs font-mono font-bold text-amber-700">
                {(momentumWeight * 100).toFixed(0)}% ({momentumWeight.toFixed(2)})
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={momentumWeight}
              onChange={(e) => setMomentumWeight(parseFloat(e.target.value))}
              className="w-full accent-amber-600 cursor-pointer"
            />
            <p className="text-[11px] text-ink-muted">
              Measures hour-over-hour interaction acceleration across likes, comments, and shares.
            </p>
          </div>

          {/* Signal 2: Volume Growth */}
          <div className="p-4 rounded-lg bg-canvas border border-line space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-ink">
                2. Post Volume Growth Weight (W_v)
              </label>
              <span className="text-xs font-mono font-bold text-emerald-700">
                {(volumeWeight * 100).toFixed(0)}% ({volumeWeight.toFixed(2)})
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={volumeWeight}
              onChange={(e) => setVolumeWeight(parseFloat(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <p className="text-[11px] text-ink-muted">
              Rewards topics producing rapid surges in new dispatches and creator mentions.
            </p>
          </div>

          {/* Signal 3: Cross-Source Diversity */}
          <div className="p-4 rounded-lg bg-canvas border border-line space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-ink">
                3. Cross-Source Diversity Weight (W_c)
              </label>
              <span className="text-xs font-mono font-bold text-sky-700">
                {(crossSourceWeight * 100).toFixed(0)}% ({crossSourceWeight.toFixed(2)})
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={crossSourceWeight}
              onChange={(e) => setCrossSourceWeight(parseFloat(e.target.value))}
              className="w-full accent-sky-600 cursor-pointer"
            />
            <p className="text-[11px] text-ink-muted">
              Prioritizes topics that span multiple platforms (News Media, YouTube, X, Facebook, Reddit).
            </p>
          </div>

          {/* Signal 4: Recency Decay */}
          <div className="p-4 rounded-lg bg-canvas border border-line space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-ink">
                4. Time Decay Recency Weight (W_r)
              </label>
              <span className="text-xs font-mono font-bold text-purple-700">
                {(recencyWeight * 100).toFixed(0)}% ({recencyWeight.toFixed(2)})
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={recencyWeight}
              onChange={(e) => setRecencyWeight(parseFloat(e.target.value))}
              className="w-full accent-purple-600 cursor-pointer"
            />
            <p className="text-[11px] text-ink-muted">
              Applies exponential half-life decay to prevent legacy stories from dominating current trends.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-line">
          <span className="text-[11px] text-ink-muted font-tamil">
            மாற்றங்கள் சேமிக்கப்பட்டவுடன் நிகழ்நேரப் போக்குகள் தானாக மறுமதிப்பீடு செய்யப்படும்
          </span>

          <button
            type="submit"
            disabled={saving || !isSumValid}
            className="px-5 py-2 rounded-lg bg-ink hover:bg-ink-soft text-white text-xs font-bold flex items-center gap-2 shadow-card transition-colors cursor-pointer disabled:opacity-40"
          >
            <Save className="w-3.5 h-3.5 text-amber-400" />
            <span>{saving ? "Applying Weights..." : "Save Trending Configuration"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
