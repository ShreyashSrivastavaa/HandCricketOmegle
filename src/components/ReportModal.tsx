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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-title"
    >
      <div className="w-full max-w-sm bg-surface border border-line rounded-[16px] p-5 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2 text-ball">
            <ShieldAlert className="w-5 h-5" />
            <h3 id="report-title" className="font-heading font-black text-lg uppercase tracking-wider text-chalk">
              Report Opponent
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-full text-muted hover:text-chalk"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="py-6 flex flex-col items-center justify-center gap-2 text-center">
            <CheckCircle className="w-10 h-10 text-turf" />
            <span className="font-heading font-bold text-base text-chalk">
              {wasAutoBanned ? "Action Enforced" : "Report Logged"}
            </span>
            <span className="text-xs text-muted">
              {wasAutoBanned
                ? "Multiple community reports triggered an automatic suspension for this player."
                : "Thank you for keeping HandCricketOmegle fair and safe."}
            </span>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted">
              Reporting opponent <strong className="text-chalk">{effectiveOpponentName}</strong>:
            </p>

            <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
              {REPORT_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                    selectedReason === reason
                      ? "bg-surface-2 border-ball/60 text-chalk font-medium"
                      : "bg-surface-2/30 border-line text-muted hover:text-chalk"
                  }`}
                >
                  <input
                    type="radio"
                    name="report_reason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={() => setSelectedReason(reason)}
                    className="accent-ball"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            {/* Block Opponent Toggle */}
            <div className="p-2.5 rounded-xl bg-surface-2/60 border border-line">
              <label className="flex items-start gap-2.5 cursor-pointer select-none text-xs text-chalk">
                <input
                  type="checkbox"
                  checked={blockOpponent}
                  onChange={(e) => setBlockOpponent(e.target.checked)}
                  className="mt-0.5 accent-turf cursor-pointer"
                />
                <span className="flex items-center gap-1.5 leading-tight">
                  <UserX className="w-3.5 h-3.5 text-ball shrink-0" />
                  <span>
                    <strong>Block Opponent:</strong> Never match me with this player again.
                  </span>
                </span>
              </label>
            </div>

            {/* Zero Video Storage Disclosure */}
            <div className="flex items-center gap-1.5 text-[11px] text-muted">
              <ShieldCheck className="w-3.5 h-3.5 text-turf shrink-0" />
              <span>Strict privacy: Zero camera frames or recordings are ever stored.</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-muted hover:text-chalk"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg bg-ball text-white font-heading font-black text-sm uppercase tracking-wider hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
