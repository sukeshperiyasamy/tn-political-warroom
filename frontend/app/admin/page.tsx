"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "../../components/Navbar";
import { AdminPanel } from "../../components/admin/AdminPanel";
import { ClientConfig } from "../../types/political";
import { fetchClientConfig } from "../../lib/api";

export default function AdminRoutePage() {
  const router = useRouter();
  const [clientConfig, setClientConfig] = useState<ClientConfig | null>(null);

  useEffect(() => {
    fetchClientConfig()
      .then((cfg) => setClientConfig(cfg))
      .catch((err) => console.error("Failed to load client config in /admin:", err));
  }, []);

  const handleTabChange = (tab: string) => {
    if (tab === "admin") return;
    router.push(`/?tab=${tab}`);
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-zinc-900 flex flex-col w-full overflow-x-hidden min-w-0">
      {/* Navigation */}
      <Navbar
        activeTab="admin"
        onTabChange={handleTabChange as any}
        searchQuery=""
        onSearchChange={() => {}}
        articleCount={0}
        clientConfig={clientConfig}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-7 pb-12 min-w-0">
        <AdminPanel
          onBackToWarroom={() => router.push("/")}
          clientConfig={clientConfig}
          onConfigUpdated={setClientConfig}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E8E8E2] bg-white py-5 mt-12 text-xs text-zinc-500">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            <span className="font-mono text-zinc-700 font-medium">
              TN Political Media Intelligence Wire • Administration Mode
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-zinc-400">
            <span>Development Demonstrator Access</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
