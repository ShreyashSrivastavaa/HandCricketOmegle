"use client";

import React, { useState } from "react";
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

  const handleConfirm = () => {
    if (agreedToAge && agreedToRules) {
      const record = {
        confirmed: true,
        timestamp: Date.now(),
      };
      localStorage.setItem("hca_age_verified", JSON.stringify(record));
      onConfirm();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/90 backdrop-blur-none">
      <div className="w-full max-w-md bg-surface border border-line rounded-xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center gap-3 border-b border-line pb-4">
          <div className="w-10 h-10 rounded-lg bg-ball/10 border border-ball/30 flex items-center justify-center text-ball">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-heading uppercase tracking-wide text-chalk">
              Age Verification & Safety Rules
            </h2>
            <p className="text-xs text-muted">Required to enable 1-to-1 live video mode</p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-chalk/90 bg-surface-2 p-3.5 rounded-lg border border-line">
          <p className="font-semibold text-chalk text-xs uppercase tracking-wider">
            Community Safety Standards:
          </p>
          <ul className="space-y-2 text-xs text-muted leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-ball font-bold">•</span>
              <span><strong className="text-chalk">No Nudity:</strong> Strictly zero tolerance for explicit or sexual content.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-ball font-bold">•</span>
              <span><strong className="text-chalk">No Harassment:</strong> Zero tolerance for hate speech, bullying, or threats.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-ball font-bold">•</span>
              <span><strong className="text-chalk">No Recording:</strong> Recording, screenshotting, or streaming peers is prohibited.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-ball font-bold">•</span>
              <span><strong className="text-chalk">Reports include snapshots:</strong> Submitted reports transmit 1 still frame for moderation.</span>
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
              I accept the Safety Rules and Terms. I understand violations result in an immediate permanent ban.
            </span>
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onDecline}
          >
            Play Game Only
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            disabled={!agreedToAge || !agreedToRules}
            onClick={handleConfirm}
          >
            <Check className="w-4 h-4 mr-1.5" />
            Confirm & Enter
          </Button>
        </div>
      </div>
    </div>
  );
}
