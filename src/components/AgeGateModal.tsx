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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pure-black/70 backdrop-blur-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="agegate-title"
    >
      <div className="w-full max-w-md bg-bone-white border-2 border-pure-black rounded-[6px] p-[17px] space-y-4 text-ink-black select-none">
        {/* Header Block */}
        <div className="flex items-center gap-3 border-b-2 border-pure-black pb-3">
          <div className="w-11 h-11 rounded-[6px] bg-firecracker-red border-2 border-pure-black flex items-center justify-center text-bone-white shrink-0">
            <ShieldAlert className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h2 id="agegate-title" className="text-2xl font-black font-heading uppercase tracking-tight text-ink-black leading-tight">
              18+ Gate &amp; Confession
            </h2>
            <p className="text-xs font-mono font-semibold text-pure-black/70 tracking-wide uppercase">
              Adults Only • Live Video Matchmaking
            </p>
          </div>
        </div>

        {/* Safety Standards Block — Lilac Shadow card inside Bone White */}
        <div className="space-y-2.5 text-xs text-bone-white bg-lilac-shadow p-[14px] rounded-[6px] border-2 border-pure-black">
          <p className="font-bold font-mono text-hi-vis-yellow uppercase tracking-wider text-[11px]">
            Community Safety Standards:
          </p>
          <ul className="space-y-1.5 font-sans text-bone-white leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-hi-vis-yellow font-black text-sm leading-none">•</span>
              <span><strong className="text-hi-vis-yellow">Strictly 18+:</strong> Stranger duels are strictly reserved for adults 18+.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-hi-vis-yellow font-black text-sm leading-none">•</span>
              <span><strong className="text-hi-vis-yellow">Zero Nudity:</strong> Permanent hardware &amp; IP ban on explicit camera conduct.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-hi-vis-yellow font-black text-sm leading-none">•</span>
              <span><strong className="text-hi-vis-yellow">No Harassment:</strong> Zero tolerance for hate speech, abuse, or threats.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-hi-vis-yellow font-black text-sm leading-none">•</span>
              <span><strong className="text-hi-vis-yellow">Zero Cloud Video:</strong> Direct peer-to-peer WebRTC only. Never recorded.</span>
            </li>
          </ul>
        </div>

        {/* Checkbox Disclaimers */}
        <div className="space-y-2.5 pt-1 text-ink-black font-medium text-xs">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreedToAge}
              onChange={(e) => setAgreedToAge(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded-[3px] border-2 border-pure-black text-pure-black focus:ring-0 focus:outline-none cursor-pointer accent-pure-black"
            />
            <span>
              I solemnly confirm that I am <strong className="font-bold underline decoration-2 decoration-pure-black">18 years of age or older</strong>.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreedToRules}
              onChange={(e) => setAgreedToRules(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded-[3px] border-2 border-pure-black text-pure-black focus:ring-0 focus:outline-none cursor-pointer accent-pure-black"
            />
            <span>
              I accept the{" "}
              <Link href="/terms" target="_blank" rel="noopener noreferrer" className="font-bold underline text-ink-black hover:text-firecracker-red">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/guidelines" target="_blank" rel="noopener noreferrer" className="font-bold underline text-ink-black hover:text-firecracker-red">
                Safety Guidelines
              </Link>
              .
            </span>
          </label>
        </div>

        {/* Actions: Gate Pill Button & Underline Link */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onDecline}
            className="w-full sm:w-auto px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider text-pure-black/80 underline decoration-1 hover:text-firecracker-red hover:decoration-2 transition-all order-2 sm:order-1"
          >
            I Decline / Exit
          </button>
          <button
            type="button"
            disabled={!agreedToAge || !agreedToRules}
            onClick={handleConfirm}
            className="w-full sm:flex-1 py-3 px-5 rounded-[100px] border-2 border-pure-black bg-hi-vis-yellow text-pure-black font-heading font-black text-base uppercase tracking-wider hover:bg-buttery-yellow active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 order-1 sm:order-2"
          >
            <Check className="w-5 h-5 stroke-[3]" />
            I&apos;M OVER 18, LET ME IN
          </button>
        </div>
      </div>
    </div>
  );
}
