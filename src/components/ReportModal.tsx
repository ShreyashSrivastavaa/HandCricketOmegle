import React, { useState } from "react";
import { Flag, CheckCircle, X, ShieldAlert, UserX, ShieldCheck } from "lucide-react";
import { playClickSound } from "@/lib/client/audio";

export interface ReportModalProps {
  isOpen: boolean;
  matchId?: string;
  opponentName?: string;
  onClose: () => void;
  onSubmitted?: () => void;
  // Legacy / Direct compatibility props
  reporterGuestId?: string;
  reportedGuestId?: string;
  roomId?: string;
  remoteVideoRef?: any;
  onReportSubmitted?: (autoBanned?: boolean) => void;
}

const REPORT_REASONS = [
  "Stalling or intentionally waiting out timer",
  "Suspicious bot / automated play",
  "Inappropriate or offensive player name",
  "Griefing or unsportsmanlike conduct",
  "Camera misconduct or abusive behavior",
  "Other fair-play violation",
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  matchId = "active",
  opponentName = "Opponent",
  onClose,
  onSubmitted,
  roomId,
  reportedGuestId,
  onReportSubmitted,
}) => {
  const effectiveMatchId = matchId !== "active" ? matchId : (roomId || "active");
  const effectiveOpponentName = opponentName !== "Opponent" ? opponentName : (reportedGuestId || "Opponent");
  const [selectedReason, setSelectedReason] = useState<string>(REPORT_REASONS[0]);
  const [blockOpponent, setBlockOpponent] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [wasAutoBanned, setWasAutoBanned] = useState<boolean>(false);

  // Escape key listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    playClickSound();
    setIsSubmitting(true);

    let autoBanned = false;

    try {
      // 1. Try match-specific report endpoint
      const res = await fetch(`/api/match/${effectiveMatchId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: selectedReason,
          blockOpponent,
          reportedGuestId,
        }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.autoBanned) autoBanned = true;
      } else {
        // Fallback to general reports route if match route not found
        const fallbackRes = await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportedGuestId: reportedGuestId || effectiveOpponentName,
            roomId: effectiveMatchId,
            reason: selectedReason,
            blockOpponent,
          }),
        });
        if (fallbackRes.ok) {
          const fbData = await fallbackRes.json().catch(() => ({}));
          if (fbData.autoBanned) autoBanned = true;
        }
      }
    } catch {
      // Offline / network fallback: still register local block if requested
      if (blockOpponent && reportedGuestId) {
        try {
          const saved = JSON.parse(sessionStorage.getItem("hca_blocked_guests") || "[]");
          if (!saved.includes(reportedGuestId)) {
            sessionStorage.setItem("hca_blocked_guests", JSON.stringify([...saved, reportedGuestId]));
          }
        } catch {}
      }
    } finally {
      setIsSubmitting(false);
      setWasAutoBanned(autoBanned);
      setSubmitted(true);
      setTimeout(() => {
        onClose();
        if (onSubmitted) onSubmitted();
        if (onReportSubmitted) onReportSubmitted(autoBanned);
      }, 1400);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-title"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-[26px] border border-line bg-surface shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_75%_100%_at_50%_0%,rgba(255,91,110,0.12),transparent_72%)]"
          aria-hidden="true"
        />

        <div className="relative z-10 flex items-center justify-between gap-3 border-b border-line px-5 pb-4 pt-5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-ball/30 bg-ball/10 text-ball">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <div>
              <p className="font-heading text-[10px] font-bold uppercase tracking-[0.18em] text-ball">
                Safety &amp; fair play
              </p>
              <h3
                id="report-title"
                className="font-heading text-lg font-black uppercase leading-none tracking-tight text-chalk sm:text-xl"
              >
                Report Opponent
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface-2 text-muted transition-colors hover:text-chalk"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative z-10 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {submitted ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-turf/30 bg-turf/10">
                <CheckCircle className="h-8 w-8 text-turf" />
              </span>
              <span className="font-heading text-lg font-black uppercase tracking-wide text-chalk">
                {wasAutoBanned ? "Action Enforced" : "Report Logged"}
              </span>
              <span className="max-w-sm text-xs leading-relaxed text-muted">
                {wasAutoBanned
                  ? "Multiple community reports triggered an automatic suspension for this player."
                  : "Thank you for keeping HandCricketOmegle fair and safe."}
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-muted">
                Reporting opponent{" "}
                <strong className="font-semibold text-chalk">{effectiveOpponentName}</strong>. Pick the
                option that best describes the issue.
              </p>

              <div className="flex flex-col gap-2">
                {REPORT_REASONS.map((reason) => {
                  const selected = selectedReason === reason;
                  return (
                    <label
                      key={reason}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-xs transition-colors ${
                        selected
                          ? "cursor-pointer border-ball/60 bg-ball/[0.08] font-medium text-chalk"
                          : "cursor-pointer border-line bg-surface-2/30 text-muted hover:border-line hover:bg-surface-2/60 hover:text-chalk"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                          selected ? "border-ball bg-ball" : "border-muted/50 bg-transparent"
                        }`}
                        aria-hidden="true"
                      >
                        {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </span>
                      <input
                        type="radio"
                        name="report_reason"
                        value={reason}
                        checked={selected}
                        onChange={() => setSelectedReason(reason)}
                        className="sr-only"
                      />
                      <span>{reason}</span>
                    </label>
                  );
                })}
              </div>

              {/* Block Opponent Toggle */}
              <div className="rounded-xl border border-line bg-surface-2/60 p-3">
                <label className="flex cursor-pointer select-none items-start gap-2.5 text-xs text-chalk">
                  <input
                    type="checkbox"
                    checked={blockOpponent}
                    onChange={(e) => setBlockOpponent(e.target.checked)}
                    className="mt-0.5 cursor-pointer accent-turf"
                  />
                  <span className="flex items-start gap-1.5 leading-tight">
                    <UserX className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ball" />
                    <span>
                      <strong>Block opponent:</strong> Never match me with this player again.
                    </span>
                  </span>
                </label>
              </div>

              {/* Zero Video Storage Disclosure */}
              <div className="flex items-start gap-1.5 rounded-xl border border-turf/20 bg-turf/[0.05] px-3 py-2 text-[11px] text-muted">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-turf" />
                <span>Strict privacy: Zero camera frames or recordings are ever stored.</span>
              </div>
            </div>
          )}
        </div>

        {!submitted && (
          <div className="relative z-10 flex items-center justify-end gap-2 border-t border-line px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-muted transition-colors hover:text-chalk"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="rounded-xl bg-ball px-5 py-2.5 font-heading text-sm font-black uppercase tracking-wider text-white shadow-glow-ball transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
