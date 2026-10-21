"use client";

import React, { useState, useEffect } from "react";
import {
  Sliders,
  Building,
  Save,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Palette,
  Globe,
  Clock,
  RefreshCw,
} from "lucide-react";
import { ClientConfig, SafeSettingsResponse } from "../../types/political";
import { fetchSafeSettings, updateSafeSettings } from "../../lib/api";

interface AdminSettingsSectionProps {
  clientConfig?: ClientConfig | null;
  onConfigUpdated?: (cfg: ClientConfig) => void;
}

export function AdminSettingsSection({
  clientConfig,
  onConfigUpdated,
}: AdminSettingsSectionProps) {
  const [settings, setSettings] = useState<SafeSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form Fields
  const [clientName, setClientName] = useState("");
  const [clientTagline, setClientTagline] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [brandColor, setBrandColor] = useState("#18181B");
  const [accentColor, setAccentColor] = useState("#D97706");
  const [defaultLanguage, setDefaultLanguage] = useState("ta");

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await fetchSafeSettings();
      setSettings(data);
      if (data.branding) {
        setClientName(data.branding.client_name || "");
        setClientTagline(data.branding.client_tagline || "");
        setLogoUrl(data.branding.logo_url || "");
        setBrandColor(data.branding.brand_color || "#18181B");
        setAccentColor(data.branding.accent_color || "#D97706");
      }
      if (data.preferences) {
        setDefaultLanguage(data.preferences.default_language || "ta");
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to load application settings" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setFeedback(null);
      const updated = await updateSafeSettings({
        client_name: clientName,
        client_tagline: clientTagline,
        logo_url: logoUrl,
        brand_color: brandColor,
        accent_color: accentColor,
      });
      setFeedback({ type: "success", text: "Application workspace settings saved successfully!" });
      if (onConfigUpdated && clientConfig) {
        onConfigUpdated({
          ...clientConfig,
          client_name: clientName,
          client_tagline: clientTagline,
          logo_url: logoUrl,
          brand_color: brandColor,
          accent_color: accentColor,
        });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to save settings" });
    } finally {
      setSaving(false);
    }
  };

  if (loading && !settings) {
    return (
      <div className="p-16 text-center text-ink-muted bg-surface border border-line rounded-xl">
        <RefreshCw className="w-6 h-6 border-2 border-zinc-800 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs">Loading application configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="p-5 sm:p-6 bg-surface border border-line rounded-xl shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-ink" />
            <h2 className="text-sm sm:text-base font-bold text-ink font-serif">
              Application & Workspace Settings
            </h2>
          </div>
          <p className="text-xs text-ink-muted mt-1 font-tamil">
            நிறுவன அடையாளம், பிராண்டிங் நிறங்கள் மற்றும் இடைமுக விருப்பங்கள்
          </p>
        </div>
      </div>

      {/* Security Compliance Banner */}
      <div className="p-4 rounded-xl bg-ink text-white text-xs shadow-sm flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-zinc-100 block">
            Production Security Compliance Boundary
          </span>
          <p className="text-ink-muted leading-relaxed text-[11px]">
            {settings?.security_notice ||
              "Deployment credentials, database passwords, and API keys are stored securely in environment variables and are inaccessible from this interface."}
          </p>
        </div>
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

      {/* Settings Form */}
      <form onSubmit={handleSave} className="p-6 bg-surface border border-line rounded-xl shadow-card space-y-6">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink pb-2 border-b border-line flex items-center gap-2">
            <Building className="w-4 h-4 text-ink-soft" />
            <span>Organization Masthead & Identity</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs">
            <div>
              <label className="block font-semibold text-ink-soft mb-1">
                Organization / Bureau Name
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Tamil Nadu Strategic Intelligence Bureau"
                className="w-full px-3 py-2 rounded-lg border border-line-strong focus:outline-none focus:ring-2 focus:ring-zinc-800 bg-canvas"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-ink-soft mb-1 font-tamil">
                Tamil Tagline / வாசகம்
              </label>
              <input
                type="text"
                value={clientTagline}
                onChange={(e) => setClientTagline(e.target.value)}
                placeholder="அரசியல் பொது ஊடக நுண்ணறிவு & பகுப்பாய்வு மையம்"
                className="w-full px-3 py-2 rounded-lg border border-line-strong focus:outline-none focus:ring-2 focus:ring-zinc-800 bg-canvas font-tamil"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-ink-soft mb-1">
                Bureau Logo URL (PNG/SVG, optional)
              </label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full px-3 py-2 rounded-lg border border-line-strong focus:outline-none focus:ring-2 focus:ring-zinc-800 bg-canvas"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink pb-2 border-b border-line flex items-center gap-2">
            <Palette className="w-4 h-4 text-ink-soft" />
            <span>Theme Colors</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-xs">
            <div>
              <label className="block font-semibold text-ink-soft mb-1">
                Primary Brand Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-9 h-9 rounded border border-line-strong cursor-pointer"
                />
                <input
                  type="text"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-line-strong font-mono text-xs uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-ink-soft mb-1">
                Accent Gold / Highlight Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-9 h-9 rounded border border-line-strong cursor-pointer"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-line-strong font-mono text-xs uppercase"
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink pb-2 border-b border-line flex items-center gap-2">
            <Clock className="w-4 h-4 text-ink-soft" />
            <span>Feed Scheduling & Language</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-xs">
            <div>
              <label className="block font-semibold text-ink-soft mb-1">
                Automated Ingestion Polling Cycle
              </label>
              <select
                disabled
                value={15}
                className="w-full px-3 py-2 rounded-lg border border-line-strong bg-subtle text-ink-soft focus:outline-none"
              >
                <option value={15}>Every 15 minutes (Active Schedule)</option>
                <option value={30}>Every 30 minutes</option>
                <option value={60}>Hourly</option>
              </select>
              <span className="text-[10px] text-ink-muted mt-1 block">
                Managed by background scheduler service
              </span>
            </div>

            <div>
              <label className="block font-semibold text-ink-soft mb-1">
                Default Editorial Language
              </label>
              <select
                value={defaultLanguage}
                onChange={(e) => setDefaultLanguage(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-line-strong bg-surface text-ink focus:outline-none"
              >
                <option value="ta">Tamil (தமிழ்) - Primary</option>
                <option value="en">English (ஆங்கிலம்)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end pt-4 border-t border-line">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-ink hover:bg-ink-soft text-white text-xs font-bold flex items-center gap-2 shadow-card transition-colors cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5 text-amber-400" />
            <span>{saving ? "Saving Preferences..." : "Save Workspace Settings"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
