"use client";

import React, { useState } from "react";
import { Button } from "./Button";
import { Flag, AlertTriangle, CheckCircle, Shield } from "lucide-react";

interface ReportModalProps {
  isOpen: boolean;
  reporterGuestId: string;
  reportedGuestId: string;
  roomId: string;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  onClose: () => void;
  onReportSubmitted: (autoBanned: boolean) => void;
}

const REPORT_REASONS = [
  "Nudity or sexual content",
  "Harassment, abuse, or offensive behavior",
  "Underage user",
  "Impersonation, spam, or malicious behavior",
  "Other safety violation",
];

export function ReportModal({
  isOpen,
  reporterGuestId,
  reportedGuestId,
  roomId,
  remoteVideoRef,
  onClose,
  onReportSubmitted,
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>(REPORT_REASONS[0]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const captureFrame = (): string | undefined => {
    const video = remoteVideoRef.current;
    if (!video || video.videoWidth === 0) return undefined;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(video.videoWidth, 640);
      canvas.height = Math.min(video.videoHeight, 480);
      const ctx = canvas.getContext("2d");
      if (!ctx) return undefined;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.7);
    } catch (e) {
      console.warn("Failed to capture frame snapshot", e);
      return undefined;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSuccessMessage(null);

    const snapshotBase64 = captureFrame();

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporterGuestId,
          reportedGuestId,
          roomId,
          reason: selectedReason,
          snapshotBase64,
        }),
      });

      const data = await res.json();
      setIsSubmitting(false);

      if (data.success) {
        setSuccessMessage(data.message || "Report submitted successfully.");
        setTimeout(() => {
          onReportSubmitted(!!data.autoBanned);
        }, 1200);
      } else {
        alert("Failed to submit report: " + (data.error || "Unknown error"));
      }
    } catch (err: any) {
      setIsSubmitting(false);
      alert("Network error submitting report: " + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/90">
      <div className="w-full max-w-md bg-surface border border-line rounded-xl p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-line pb-3">
          <div className="w-8 h-8 rounded-lg bg-ball/10 border border-ball/30 flex items-center justify-center text-ball">
            <Flag className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold font-heading uppercase tracking-wide text-chalk">
              Report Opponent
            </h2>
            <p className="text-xs text-muted">ID: {reportedGuestId.substring(0, 8)}</p>
          </div>
        </div>

        {successMessage ? (
          <div className="py-6 text-center space-y-2">
            <CheckCircle className="w-10 h-10 text-turf mx-auto" />
            <p className="text-sm font-semibold text-chalk">{successMessage}</p>
            <p className="text-xs text-muted">Disconnecting and finding next match...</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-chalk uppercase tracking-wide">
                Select Reason:
              </label>
              <div className="space-y-1.5">
                {REPORT_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setSelectedReason(reason)}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg border transition-colors ${
                      selectedReason === reason
                        ? "bg-surface-2 border-turf text-chalk"
                        : "border-line bg-ink/50 text-muted hover:text-chalk"
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-surface-2 p-2.5 rounded-lg border border-line flex items-start gap-2 text-[11px] text-muted">
              <Shield className="w-4 h-4 text-amber shrink-0 mt-0.5" />
              <span>
                To protect our community, this report captures a single encrypted still frame snapshot of the opponent&apos;s camera for 30 days of moderation review.
              </span>
            </div>

            <div className="flex gap-2.5 pt-1">
              <Button variant="secondary" className="flex-1" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1 !bg-ball !border-ball text-chalk hover:brightness-110"
                onClick={handleSubmit}
                loading={isSubmitting}
              >
                Submit Report
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
