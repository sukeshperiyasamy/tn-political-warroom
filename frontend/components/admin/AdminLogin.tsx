"use client";

import React, { useState } from "react";
import { ShieldAlert, Lock, User, ArrowRight, AlertCircle, Info, Sparkles } from "lucide-react";

interface AdminLoginProps {
  onLoginSuccess: () => void;
  onCancel?: () => void;
}

export function AdminLogin({ onLoginSuccess, onCancel }: AdminLoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Development Dummy Authentication check
    setTimeout(() => {
      if (username.trim() === "admin" && password === "admin123") {
        sessionStorage.setItem("tn_warroom_admin_auth", "true");
        setLoading(false);
        onLoginSuccess();
      } else {
        setLoading(false);
        setError("Invalid credentials. Please enter the predefined development demo credentials.");
      }
    }, 400);
  };

  const fillDemoCredentials = () => {
    setUsername("admin");
    setPassword("admin123");
    setError(null);
  };

  return (
    <div className="max-w-md mx-auto my-12 px-4">
      {/* Dev Security Disclaimer Banner */}
      <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed space-y-1.5 shadow-xs">
        <div className="flex items-center gap-1.5 font-bold text-amber-950">
          <Info className="w-4 h-4 shrink-0 text-amber-700" />
          <span>Development Demo Access Only</span>
        </div>
        <p className="text-amber-800">
          This dummy login is provided solely for local demonstration and administrative UI testing.
          It does not provide enterprise-grade access control. Real backend authentication & authorization
          are required before production exposure.
        </p>
      </div>

      <div className="bg-white border border-[#E2E2DC] rounded-xl shadow-sm p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#F0F0EB]">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center text-white shrink-0">
            <Lock className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900 font-serif">
              War Room Administration Login
            </h2>
            <p className="text-xs text-zinc-500 font-tamil">
              நிர்வாகிகள் மற்றும் மேற்பார்வையாளர்கள் நுழைவு
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Username / பயனர் பெயர்
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#D5D5CE] focus:outline-none focus:ring-2 focus:ring-zinc-800 focus:border-zinc-800 bg-[#FAF9F6]"
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Password / கடவுச்சொல்
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#D5D5CE] focus:outline-none focus:ring-2 focus:ring-zinc-800 focus:border-zinc-800 bg-[#FAF9F6]"
                required
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? "Authenticating..." : "Sign In to Admin Panel"}</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
            </button>

            <button
              type="button"
              onClick={fillDemoCredentials}
              className="w-full py-2 px-3 rounded-lg border border-dashed border-zinc-300 hover:bg-zinc-50 text-zinc-600 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Fill Predefined Demo Credentials (admin / admin123)</span>
            </button>

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="w-full py-2 px-3 text-xs text-zinc-500 hover:text-zinc-800 font-medium transition-colors cursor-pointer"
              >
                Return to Overview
              </button>
            )}
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-[#F0F0EB] text-center">
          <p className="text-[11px] text-zinc-400 font-mono">
            Demo Account: <span className="font-semibold text-zinc-600">admin</span> • Password: <span className="font-semibold text-zinc-600">admin123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
