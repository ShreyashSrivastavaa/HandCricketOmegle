import React, { useState } from "react";
import { Flag, CheckCircle, X, ShieldAlert } from "lucide-react";
import { playClickSound } from "@/lib/client/audio";

export interface ReportModalProps {
  isOpen: boolean;
  matchId?: string;
  opponentName?: string;
  onClose: () => void;
  onSubmitted?: () => void;
  // Legacy compatibility props
  reporterGuestId?: string;
  reportedGuestId?: string;
  roomId?: string;
  remoteVideoRef?: any;
  onReportSubmitted?: (autoBanned?: any) => void;
}

const REPORT_REASONS = [
  "Stalling or intentionally waiting out timer",
  "Suspicious bot / automated play",
  "Inappropriate or offensive player name",
  "Griefing or unsportsmanlike conduct",
  "Other abuse violation",
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
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    playClickSound();
    setIsSubmitting(true);

    try {
      await fetch(`/api/match/${effectiveMatchId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: selectedReason }),
      });
      setIsSubmitting(false);
      setSubmitted(true);
      setTimeout(() => {
        onClose();
        if (onSubmitted) onSubmitted();
        if (onReportSubmitted) onReportSubmitted(false);
      }, 1400);
    } catch {
      setIsSubmitting(false);
      setSubmitted(true);
      setTimeout(() => {
        onClose();
        if (onReportSubmitted) onReportSubmitted(false);
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
              Report Logged
            </span>
            <span className="text-xs text-muted">
              Thank you for keeping HandCricketOmegle fair and enjoyable.
            </span>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted">
              Reporting opponent <strong className="text-chalk">{opponentName}</strong> for violation of fair-play guidelines:
            </p>

            <div className="flex flex-col gap-2">
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
