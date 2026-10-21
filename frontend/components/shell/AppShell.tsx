"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <aside className="hidden lg:block sticky top-0 h-screen" aria-label="Sidebar">
        <Sidebar />
      </aside>

      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div
            className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]"
            onClick={() => setMenuOpen(false)}
          />
          <div className="relative h-full w-[288px] max-w-[85vw] shadow-pop">
            <Sidebar onNavigate={() => setMenuOpen(false)} />
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="absolute top-3 -right-12 grid place-items-center w-10 h-10 rounded-lg bg-surface text-ink shadow-pop"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <div className="min-w-0 flex flex-col min-h-screen">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />
        <main id="main" className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1560px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
