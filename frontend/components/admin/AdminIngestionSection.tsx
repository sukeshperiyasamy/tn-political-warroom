"use client";

import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Database,
  ArrowRight,
  ShieldAlert,
  Play,
  RotateCw,
  Filter,
} from "lucide-react";
import { IngestionLog, IngestResponse, NewsSource } from "../../types/political";
import { fetchLogs, fetchSources, triggerIngest } from "../../lib/api";

export function AdminIngestionSection() {
  const [logs, setLogs] = useState<IngestionLog[]>([]);
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [ingestingAll, setIngestingAll] = useState(false);
  const [ingestingSourceId, setIngestingSourceId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [resultAlert, setResultAlert] = useState<IngestResponse | null>(null);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allLogs, allSources] = await Promise.all([
        fetchLogs(50),
        fetchSources(),
      ]);
      setLogs(allLogs);
      setSources(allSources);
    } catch (err: any) {
      setErrorAlert(err.message || "Failed to load ingestion audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTriggerAll = async () => {
    setShowConfirmModal(false);
    setIngestingAll(true);
    setResultAlert(null);
    setErrorAlert(null);
    try {
      const res = await triggerIngest();
      setResultAlert(res);
      await loadData();
    } catch (err: any) {
      setErrorAlert(err.message || "Ingestion run encountered an error");
    } finally {
      setIngestingAll(false);
    }
  };

  const handleRetrySingle = async (sourceId: string) => {
    setIngestingSourceId(sourceId);
    setErrorAlert(null);
    try {
      const res = await triggerIngest(sourceId);
      setResultAlert(res);
      await loadData();
    } catch (err: any) {
      setErrorAlert(err.message || `Failed to poll source ${sourceId}`);
    } finally {
      setIngestingSourceId(null);
    }
  };

  const enabledCount = sources.filter((s) => s.is_enabled).length;
  const healthyCount = sources.filter((s) => s.is_enabled && s.health_status === "healthy").length;
  const errorCount = sources.filter((s) => s.is_enabled && s.health_status !== "healthy").length;

  return (
    <div className="space-y-6">
      {/* Top Controller Header */}
      <div className="p-5 sm:p-6 bg-surface border border-line rounded-xl shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-ink" />
            <h2 className="text-sm sm:text-base font-bold text-ink font-serif">
              Feed Ingestion Engine & Audit Telemetry
            </h2>
          </div>
          <p className="text-xs text-ink-muted mt-1 font-tamil">
            நேரலை செய்தி ஊடக உட்கிரகிப்புப் பதிவுகள் மற்றும் உடனடி மறுமுயற்சி கட்டுப்பாடுகள்
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg border border-line-strong hover:bg-subtle text-xs font-semibold text-ink-soft flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Logs</span>
          </button>

          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={ingestingAll}
            className="px-4 py-2 rounded-lg bg-ink hover:bg-ink-soft text-white text-xs font-bold flex items-center gap-2 shadow-card transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 text-amber-400 ${ingestingAll ? "animate-spin" : ""}`} />
            <span>{ingestingAll ? "Polling All Feeds..." : "Trigger Full Ingestion Run"}</span>
          </button>
        </div>
      </div>

      {/* Operational Feedback */}
      {resultAlert && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs shadow-card space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Ingestion Operation Confirmed Successful</span>
            </div>
            <button
              onClick={() => setResultAlert(null)}
              className="text-emerald-700 hover:text-emerald-950 font-bold ml-2 cursor-pointer"
            >
              ×
            </button>
          </div>
          <div className="flex flex-wrap gap-4 text-emerald-800 pt-1 font-mono text-[11px]">
            <span>Sources Polled: <strong>{resultAlert.sources_processed}</strong></span>
            <span>Items Found: <strong>{resultAlert.total_items_found}</strong></span>
            <span>New Articles Persisted: <strong>{resultAlert.total_new_items_added}</strong></span>
          </div>
        </div>
      )}

      {errorAlert && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorAlert}</span>
          </div>
          <button
            onClick={() => setErrorAlert(null)}
            className="text-rose-700 hover:text-rose-950 font-bold ml-2 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Publisher Health Telemetry Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-surface border border-line shadow-card">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted block mb-1">
            Active Feed Listeners
          </span>
          <div className="text-xl font-bold font-mono text-ink">
            {enabledCount} <span className="text-xs font-normal text-ink-muted">/ {sources.length} registered</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-line shadow-card">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted block mb-1">
            Operational (Healthy)
          </span>
          <div className="text-xl font-bold font-mono text-emerald-700">
            {healthyCount} feeds
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-line shadow-card">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted block mb-1">
            Degraded / Attention Required
          </span>
          <div className="text-xl font-bold font-mono text-amber-700">
            {errorCount} feeds
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-surface border border-line rounded-xl shadow-card overflow-hidden">
        <div className="p-4 border-b border-line flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
            Recent Ingestion Audit Trail ({logs.length} entries)
          </h3>
          <span className="text-[11px] text-ink-muted font-mono">Real-time HTTP & deduplication telemetry</span>
        </div>

        {loading ? (
          <div className="p-16 text-center text-ink-muted">
            <RefreshCw className="w-6 h-6 border-2 border-zinc-800 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs">Fetching audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-ink-muted text-xs">
            No ingestion logs recorded yet. Trigger an ingestion pass above to verify.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-canvas text-ink-muted border-b border-line">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Source Publisher</th>
                  <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                  <th className="py-2.5 px-3 font-semibold">HTTP Code</th>
                  <th className="py-2.5 px-3 font-semibold">Result Status</th>
                  <th className="py-2.5 px-3 font-semibold">Items Found</th>
                  <th className="py-2.5 px-3 font-semibold">New Added</th>
                  <th className="py-2.5 px-3 font-semibold">Duplicates Skipped</th>
                  <th className="py-2.5 px-3 font-semibold">Latency</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {logs.map((log, idx) => {
                  const isRetrying = ingestingSourceId === log.source_id;
                  const is304 = log.status === "not_modified_304" || log.http_status === 304;
                  const isError = log.status === "error" || log.status === "fetch_error";

                  return (
                    <tr key={idx} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="py-3 px-3 font-semibold text-ink">
                        {log.source_name || log.source_id}
                      </td>
                      <td className="py-3 px-3 text-ink-muted font-mono text-[11px] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString("en-IN", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-3 font-mono">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            is304
                              ? "bg-subtle text-ink-soft"
                              : isError
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          }`}
                        >
                          {log.http_status || (is304 ? "304" : "200")}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            is304
                              ? "bg-subtle text-ink-soft"
                              : isError
                              ? "bg-rose-100 text-rose-800"
                              : log.new_items_added > 0
                              ? "bg-emerald-100 text-emerald-900"
                              : "bg-subtle text-ink"
                          }`}
                        >
                          {log.status}
                        </span>
                        {log.error_message && (
                          <span className="block text-[10px] text-rose-600 mt-0.5 max-w-xs truncate" title={log.error_message}>
                            {log.error_message}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-ink-soft">{log.items_found}</td>
                      <td className="py-3 px-3 font-mono font-bold text-ink">
                        {log.new_items_added > 0 ? `+${log.new_items_added}` : "0"}
                      </td>
                      <td className="py-3 px-3 font-mono text-ink-muted">
                        {log.skipped_duplicates || 0}
                      </td>
                      <td className="py-3 px-3 font-mono text-ink-muted text-[11px]">
                        {Math.round(log.duration_ms)}ms
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleRetrySingle(log.source_id)}
                          disabled={isRetrying}
                          className="px-2.5 py-1 rounded border border-line hover:bg-subtle text-[11px] font-semibold text-ink-soft transition-colors cursor-pointer disabled:opacity-50"
                          title="Trigger immediate feed poll"
                        >
                          {isRetrying ? "Retrying..." : "Retry Feed"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Triggering Full Ingestion */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-line rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-ink">
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <RotateCw className="w-5 h-5 text-amber-700" />
              </div>
              <h3 className="text-sm font-bold text-ink font-serif">
                Confirm Full Ingestion Execution
              </h3>
            </div>
            <p className="text-xs text-ink-soft leading-relaxed">
              This will initiate network fetch requests across all <strong>{enabledCount} active Tamil regional publishers</strong>.
              Conditional HTTP headers (ETag, If-Modified-Since) will be applied to prevent bandwidth waste, and canonical deduplication will prevent redundant story entries.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-3.5 py-1.5 rounded-lg border border-line-strong text-xs font-semibold text-ink-soft hover:bg-subtle cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTriggerAll}
                className="px-4 py-1.5 rounded-lg bg-ink hover:bg-ink-soft text-white text-xs font-bold cursor-pointer"
              >
                Start Ingestion Run
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
