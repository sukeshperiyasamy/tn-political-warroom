"use client";

import React, { useState, useEffect } from "react";
import { AdminLogin } from "./AdminLogin";
import { AdminDashboard } from "./AdminDashboard";
import { ClientConfig } from "../../types/political";

interface AdminPanelProps {
  onBackToWarroom?: () => void;
  clientConfig?: ClientConfig | null;
  onConfigUpdated?: (cfg: ClientConfig) => void;
  initialSubTab?: "overview" | "sources" | "keywords" | "ingestion" | "trending" | "settings";
}

export function AdminPanel({
  onBackToWarroom,
  clientConfig,
  onConfigUpdated,
  initialSubTab = "overview",
}: AdminPanelProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    // Check session storage for development demo auth
    const stored = sessionStorage.getItem("tn_warroom_admin_auth");
    if (stored === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLoginSuccess = () => {
    sessionStorage.setItem("tn_warroom_admin_auth", "true");
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("tn_warroom_admin_auth");
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <AdminLogin
        onLoginSuccess={handleLoginSuccess}
        onCancel={onBackToWarroom}
      />
    );
  }

  return (
    <AdminDashboard
      onLogout={handleLogout}
      onBackToWarroom={onBackToWarroom}
      clientConfig={clientConfig}
      onConfigUpdated={onConfigUpdated}
      initialSubTab={initialSubTab}
    />
  );
}
