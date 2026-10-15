import React, { useState } from "react";
import Link from "next/link";
import { Button } from "./Button";
import { ShieldAlert, Check } from "lucide-react";

interface AgeGateModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onDecline: () => void;
}

export function AgeGateModal({ isOpen, onConfirm, onDecline }: AgeGateModalProps) {
  const [agreedToAge, setAgreedToAge] = useState(false);
  const [agreedToRules, setAgreedToRules] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (agreedToAge && agreedToRules) {
      const record = {
        confirmed: true,
        timestamp: Date.now(),
      };
      localStorage.setItem("hca_age_verified", JSON.stringify(record));
      try {
        await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ageConfirmed: true }),
        });
      } catch {}
      onConfirm();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/90 backdrop-blur-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="agegate-title"
    >
      <div className="w-full max-w-md bg-surface border border-line rounded-xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center gap-3 border-b border-line pb-4">
          <div className="w-10 h-10 rounded-lg bg-ball/10 border border-ball/30 flex items-center justify-center text-ball">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 id="agegate-title" className="text-xl font-bold font-heading uppercase tracking-wide text-chalk">
              18+ Verification &amp; Safety
            </h2>
            <p className="text-xs text-muted">Required for stranger matchmaking</p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-chalk/90 bg-surface-2 p-3.5 rounded-lg border border-line">
          <p className="font-semibold text-chalk text-xs uppercase tracking-wider">
            Community Safety Standards:
          </p>
          <ul className="space-y-2 text-xs text-muted leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-ball font-bold">•</span>
              <span><strong className="text-chalk">Strictly 18+:</strong> Stranger mode is restricted to adults 18 years and older.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-ball font-bold">•</span>
              <span><strong className="text-chalk">No Nudity:</strong> Zero tolerance for explicit or sexual content on camera.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-ball font-bold">•</span>
              <span><strong className="text-chalk">No Harassment:</strong> Zero tolerance for hate speech, bullying, or threats.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-ball font-bold">•</span>
              <span><strong className="text-chalk">Strict Privacy:</strong> Live video is strictly peer-to-peer. Zero video is ever recorded or stored.</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3 pt-1">
          <label className="flex items-start gap-3 cursor-pointer select-none text-xs text-chalk">
            <input
              type="checkbox"
              checked={agreedToAge}
              onChange={(e) => setAgreedToAge(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-line bg-surface-2 text-turf focus:ring-0 focus:outline-none cursor-pointer"
            />
            <span>
              I confirm that I am <strong>18 years of age or older</strong>.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer select-none text-xs text-chalk">
            <input
              type="checkbox"
              checked={agreedToRules}
              onChange={(e) => setAgreedToRules(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-line bg-surface-2 text-turf focus:ring-0 focus:outline-none cursor-pointer"
            />
            <span>
              I accept the{" "}
              <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-turf underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/guidelines" target="_blank" rel="noopener noreferrer" className="text-turf underline">
                Community Guidelines
              </Link>
              . I understand violations result in an immediate ban.
            </span>
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onDecline}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            disabled={!agreedToAge || !agreedToRules}
            onClick={handleConfirm}
          >
            <Check className="w-4 h-4 mr-1.5" />
            Confirm &amp; Enter
          </Button>
        </div>
      </div>
    </div>
  );
}
