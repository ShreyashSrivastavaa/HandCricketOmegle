"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/Button";
import { ShieldAlert, Check, X, Ban, AlertTriangle, RefreshCw, KeyRound } from "lucide-react";

interface ReportItem {
  id: string;
  reporterGuestId: string;
  reportedGuestId: string;
  roomId: string;
  reason: string;
  snapshotBase64?: string;
  hashedIp: string;
  createdAt: number;
  status: "pending" | "dismissed" | "actioned";
}

interface ReportStats {
  totalReports: number;
  activeBans: number;
}

export default function AdminReportsPage() {
  const [password, setPassword] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [stats, setStats] = useState<ReportStats>({ totalReports: 0, activeBans: 0 });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchReports = async (authPass: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/admin/reports", {
        headers: { "x-admin-password": authPass },
      });
      if (!res.ok) {
        throw new Error("Invalid admin password or access denied");
      }
      const data = await res.json();
      setReports(data.reports || []);
      setStats(data.stats || { totalReports: 0, activeBans: 0 });
      setIsAuthenticated(true);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load reports");
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReports(password);
  };

  const handleAction = async (reportId: string, action: "dismiss" | "warn" | "ban24h" | "banPermanent") => {
    try {
      const res = await fetch("/api/admin/reports/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ reportId, action }),
      });
      const data = await res.json();
      if (data.success) {
        // Refresh list
        fetchReports(password);
      } else {
        alert("Action failed: " + data.message);
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
              <p className="text-[11px] text-muted">Enter password to review moderation queue</p>
            </div>
          </div>

          {errorMessage && (
            <div className="p-2 bg-ball/10 border border-ball/30 rounded text-xs text-ball">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-xs text-muted mb-1 font-semibold uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter ADMIN_PASSWORD..."
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
            <p className="text-xs text-muted">Review reports with camera snapshots and take enforcement action.</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-surface px-3 py-1.5 rounded-lg border border-line text-xs font-mono">
              <span className="text-muted">Total: </span>
              <strong className="text-chalk">{stats.totalReports}</strong>
            </div>
            <div className="bg-surface px-3 py-1.5 rounded-lg border border-line text-xs font-mono">
              <span className="text-muted">Active Bans: </span>
              <strong className="text-ball">{stats.activeBans}</strong>
            </div>
            <button
              onClick={() => fetchReports(password)}
              className="p-2 bg-surface hover:bg-surface-2 border border-line rounded-lg text-turf transition-colors"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Reports List */}
        {reports.length === 0 ? (
          <div className="text-center py-16 bg-surface border border-line rounded-xl space-y-2">
            <ShieldAlert className="w-10 h-10 text-turf mx-auto opacity-70" />
            <h3 className="text-sm font-semibold text-chalk uppercase tracking-wide">Queue Empty</h3>
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
                <div className="flex flex-col md:flex-row gap-4 items-start">
                  {/* Snapshot Thumbnail */}
                  <div className="w-full md:w-56 aspect-video bg-ink rounded-lg border border-line overflow-hidden shrink-0 flex items-center justify-center">
                    {report.snapshotBase64 ? (
                      <img
                        src={report.snapshotBase64}
                        alt="Report snapshot"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[11px] text-muted">No snapshot frame</span>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="flex-1 space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-muted">Reason: </span>
                        <strong className="text-ball">{report.reason}</strong>
                      </div>
                      <div>
                        <span className="text-muted">Room: </span>
                        <span className="font-mono text-chalk">{report.roomId}</span>
                      </div>
                      <div>
                        <span className="text-muted">Reported Guest: </span>
                        <span className="font-mono text-chalk">{report.reportedGuestId}</span>
                      </div>
                      <div>
                        <span className="text-muted">Hashed IP: </span>
                        <span className="font-mono text-muted truncate max-w-[140px] inline-block align-bottom">
                          {report.hashedIp.substring(0, 16)}...
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        onClick={() => handleAction(report.id, "dismiss")}
                        disabled={report.status !== "pending"}
                        className="px-2.5 py-1 text-xs bg-surface-2 border border-line rounded text-muted hover:text-chalk disabled:opacity-40"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => handleAction(report.id, "warn")}
                        disabled={report.status !== "pending"}
                        className="px-2.5 py-1 text-xs bg-surface-2 border border-amber/40 rounded text-amber hover:brightness-110 disabled:opacity-40"
                      >
                        Warn
                      </button>
                      <button
                        onClick={() => handleAction(report.id, "ban24h")}
                        disabled={report.status !== "pending"}
                        className="px-2.5 py-1 text-xs bg-ball/20 border border-ball text-ball font-semibold rounded hover:brightness-110 disabled:opacity-40"
                      >
                        24h Ban
                      </button>
                      <button
                        onClick={() => handleAction(report.id, "banPermanent")}
                        disabled={report.status !== "pending"}
                        className="px-2.5 py-1 text-xs bg-ball text-chalk font-bold rounded hover:brightness-110 disabled:opacity-40"
                      >
                        Permanent Ban
                      </button>
                    </div>
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
