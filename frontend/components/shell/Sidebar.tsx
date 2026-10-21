"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS, isActive } from "../../lib/nav";
import { useWarRoom } from "../providers/WarRoomProvider";

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { clientConfig, articles } = useWarRoom();

  const clientName = clientConfig?.client_name || "TN War Room";
  const tagline = clientConfig?.client_tagline || "Political media intelligence";
  const initials =
    clientName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "TN";

  return (
    <div className="flex h-full flex-col bg-rail text-rail-text">
      <div className="flex items-center gap-3 px-5 h-16 border-b border-rail-line shrink-0">
        {clientConfig?.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={clientConfig.logo_url}
            alt=""
            className="w-9 h-9 rounded-lg object-contain bg-white/5 shrink-0"
          />
        ) : (
          <div
            style={{ backgroundColor: clientConfig?.brand_color || "#d97706" }}
            className="w-9 h-9 rounded-lg grid place-items-center text-sm font-extrabold text-white shrink-0"
            aria-hidden="true"
          >
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate leading-tight">{clientName}</p>
          <p className="text-[11px] text-rail-text truncate leading-tight mt-0.5">{tagline}</p>
        </div>
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-rail-text/80">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        active
                          ? "bg-rail-raised text-white font-semibold"
                          : "hover:bg-rail-raised/60 hover:text-white font-medium"
                      }`}
                    >
                      {active && (
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-accent"
                        />
                      )}
                      <Icon
                        className={`w-[18px] h-[18px] shrink-0 ${active ? "text-accent" : ""}`}
                        aria-hidden="true"
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.href === "/news" && articles.length > 0 && (
                        <span className="text-[11px] font-semibold tabular-nums rounded-md bg-white/10 text-white px-1.5 py-0.5">
                          {articles.length}
                        </span>
                      )}
                      {item.badge && (
                        <span className="text-[10px] font-bold uppercase tracking-wide rounded bg-accent/20 text-amber-300 px-1.5 py-0.5">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-rail-line px-5 py-4 text-[11px] leading-relaxed">
        <p className="flex items-center gap-2 text-white font-semibold">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Live RSS ingestion active
        </p>
        <p className="mt-1">Tamil Nadu 2026 Assembly cycle</p>
      </div>
    </div>
  );
}
