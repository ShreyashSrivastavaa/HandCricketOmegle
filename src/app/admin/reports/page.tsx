"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/Button";
import { ShieldAlert, Check, X, Ban, AlertTriangle, RefreshCw, KeyRound, LogOut, ShieldCheck } from "lucide-react";

interface ReportItem {
  id: string;
  reporterGuestId: string;
  reportedGuestId: string;
  roomId: string;
  reason: string;
  hashedIp?: string;
  createdAt: number;
  status: "pending" | "dismissed" | "actioned";
}

interface ReportStats {
  totalReports: number;
  pendingReports?: number;
  activeBans: number;
}

export default function AdminReportsPage() {
  const [token, setToken] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [stats, setStats] = useState<ReportStats>({ totalReports: 0, pendingReports: 0, activeBans: 0 });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-restore admin token from sessionStorage if present
  useEffect(() => {
    document.title = "Moderation Queue | HandCricketOmegle Admin";
    const saved = sessionStorage.getItem("hc_admin_token");
    if (saved) {
      setToken(saved);
      fetchReports(saved);
    }
  }, []);

  const fetchReports = async (authToken: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/admin/reports", {
        headers: {
          Authorization: `Bearer ${authToken.trim()}`,
          "x-admin-key": authToken.trim(),
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Invalid admin token or unauthorized access");
      }
      const data = await res.json();
      setReports(data.reports || []);
      setStats(data.stats || { totalReports: 0, pendingReports: 0, activeBans: 0 });
      setIsAuthenticated(true);
      sessionStorage.setItem("hc_admin_token", authToken.trim());
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load reports");
      setIsAuthenticated(false);
      sessionStorage.removeItem("hc_admin_token");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    fetchReports(token);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("hc_admin_token");
    setToken("");
    setIsAuthenticated(false);
    setReports([]);
  };

  const handleAction = async (reportId: string, action: "dismiss" | "ban24h" | "banPermanent") => {
    try {
      const res = await fetch("/api/admin/reports/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.trim()}`,
          "x-admin-key": token.trim(),
        },
        body: JSON.stringify({ reportId, action }),
      });
      const data = await res.json();
      if (data.success) {
        fetchReports(token);
      } else {
        alert("Action failed: " + (data.message || data.error));
      }
    } catch (err: any) {
      alert("Error taking action: " + err.message);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center p-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm bg-surface border border-line rounded-xl p-6 space-y-4 shadow-2xl"
        >
          <div className="flex items-center gap-2.5 border-b border-line pb-3">
            <div className="w-8 h-8 rounded-lg bg-ball/10 border border-ball/30 flex items-center justify-center text-ball">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-bold font-heading uppercase text-chalk">Admin Reports</h1>
              <p className="text-[11px] text-muted">Supabase JWT or Admin Key Required</p>
            </div>
          </div>

          {errorMessage && (
            <div className="p-2 bg-ball/10 border border-ball/30 rounded text-xs text-ball">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-xs text-muted mb-1 font-semibold uppercase tracking-wider">
              Admin Token / Secret Key
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter Supabase Admin JWT or ADMIN_SECRET..."
              className="w-full bg-ink border border-line rounded-lg px-3 py-2 text-sm text-chalk focus:outline-none focus:border-turf"
              autoFocus
            />
          </div>

          <Button variant="primary" type="submit" className="w-full" loading={isLoading}>
            Unlock Review Queue
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink text-chalk p-6 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header and stats */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-line pb-4">
          <div>
            <h1 className="text-2xl font-bold font-heading uppercase tracking-wide text-chalk flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-ball" />
              Community Safety Queue
            </h1>
            <p className="text-xs text-muted flex items-center gap-1.5 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-turf" />
              <span>Strict Privacy Standard: Zero camera frames stored. Review metadata &amp; enforce suspensions.</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-surface px-3 py-1.5 rounded-lg border border-line text-xs font-mono">
              <span className="text-muted">Total: </span>
              <strong className="text-chalk">{stats.totalReports}</strong>
            </div>
            <div className="bg-surface px-3 py-1.5 rounded-lg border border-line text-xs font-mono">
              <span className="text-muted">Pending: </span>
              <strong className="text-ball">{stats.pendingReports ?? 0}</strong>
            </div>
            <button
              onClick={() => fetchReports(token)}
              className="p-2 bg-surface hover:bg-surface-2 border border-line rounded-lg text-turf transition-colors"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 bg-surface hover:bg-surface-2 border border-line rounded-lg text-muted hover:text-ball transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Reports List */}
        {reports.length === 0 ? (
          <div className="text-center py-16 bg-surface border border-line rounded-xl space-y-2">
            <ShieldAlert className="w-10 h-10 text-turf mx-auto opacity-70" />
            <h3 className="text-sm font-semibold text-chalk uppercase tracking-wide">Queue Clear</h3>
            <p className="text-xs text-muted">There are no reports requiring review at this time.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className={`bg-surface border rounded-xl p-4 transition-all ${
                  report.status === "dismissed"
                    ? "border-line/40 opacity-60"
                    : report.status === "actioned"
                    ? "border-turf/40"
                    : "border-ball/50"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-muted text-[11px]">{report.id}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          report.status === "pending"
                            ? "bg-ball/20 text-ball border border-ball/30"
                            : report.status === "dismissed"
                            ? "bg-surface-2 text-muted border border-line"
                            : "bg-turf/20 text-turf border border-turf/30"
                        }`}
                      >
                        {report.status}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted font-mono">
                      {new Date(report.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-surface-2/40 border border-line/60">
                      <span className="block text-[10px] text-muted uppercase tracking-wider mb-0.5">Violation Reason</span>
                      <strong className="text-ball font-semibold">{report.reason}</strong>
                    </div>
                    <div className="p-2.5 rounded-lg bg-surface-2/40 border border-line/60">
                      <span className="block text-[10px] text-muted uppercase tracking-wider mb-0.5">Reported Guest ID</span>
                      <span className="font-mono text-chalk font-semibold">{report.reportedGuestId}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-surface-2/40 border border-line/60">
                      <span className="block text-[10px] text-muted uppercase tracking-wider mb-0.5">Reporter Guest ID</span>
                      <span className="font-mono text-muted">{report.reporterGuestId}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-surface-2/40 border border-line/60">
                      <span className="block text-[10px] text-muted uppercase tracking-wider mb-0.5">Room / Match ID</span>
                      <span className="font-mono text-turf">{report.roomId}</span>
                    </div>
                  </div>

                  {report.hashedIp && (
                    <div className="text-[11px] text-muted">
                      <span>Salted Hashed IP: </span>
                      <span className="font-mono text-chalk/70">{report.hashedIp.substring(0, 24)}...</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-line/40">
                    <button
                      onClick={() => handleAction(report.id, "dismiss")}
                      disabled={report.status !== "pending"}
                      className="px-3 py-1.5 text-xs bg-surface-2 border border-line rounded-lg text-muted hover:text-chalk disabled:opacity-40"
                    >
                      Dismiss Report
                    </button>
                    <button
                      onClick={() => handleAction(report.id, "ban24h")}
                      disabled={report.status !== "pending"}
                      className="px-3 py-1.5 text-xs bg-ball/20 border border-ball text-ball font-semibold rounded-lg hover:brightness-110 disabled:opacity-40"
                    >
                      Apply 24h Suspension
                    </button>
                    <button
                      onClick={() => handleAction(report.id, "banPermanent")}
                      disabled={report.status !== "pending"}
                      className="px-3 py-1.5 text-xs bg-ball text-chalk font-bold rounded-lg hover:brightness-110 disabled:opacity-40"
                    >
                      Permanent Lockout
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
