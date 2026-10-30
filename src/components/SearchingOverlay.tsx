import React, { useEffect, useState } from "react";
import { Bot, X, Loader2, Radar, Camera, ShieldCheck, Timer } from "lucide-react";
import { motion } from "framer-motion";
import { playClickSound } from "@/lib/client/audio";
import { Hand } from "./Hand";

import type { MatchMode } from "@/lib/game/types";

interface SearchingOverlayProps {
  mode: MatchMode;
  onCancel: () => void;
  onPlayVsBot: () => void;
}

export const SearchingOverlay: React.FC<SearchingOverlayProps> = ({
  mode,
  onCancel,
  onPlayVsBot,
}) => {
  const [elapsed, setElapsed] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const modeLabel =
    mode === "endless"
      ? "Endless mode · no over limit"
      : mode === "classic"
      ? "Classic mode · 2 wickets, 2 overs"
      : "Fast format · 1 wicket";

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/92 p-4 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-label="Searching for opponent"
    >
      <div className="pitch-grid pointer-events-none absolute inset-0 opacity-35" aria-hidden="true" />
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-turf/10 blur-[110px]"
        aria-hidden="true"
      />

      <div className="animate-fade-up relative w-full max-w-lg overflow-hidden rounded-[28px] border border-line bg-surface/90 p-5 shadow-panel backdrop-blur-xl sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-sky/10 blur-3xl" aria-hidden="true" />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2 rounded-full border border-turf/25 bg-turf/[0.06] px-3 py-1.5">
            <Radar className="h-3.5 w-3.5 text-turf" />
            <span className="font-heading text-[10px] font-black uppercase tracking-[0.18em] text-turf">
              Matchmaking live
            </span>
          </div>
          <span className="font-heading text-[11px] font-bold tabular-nums text-muted">
            {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, "0")}
          </span>
        </div>

        <div className="relative z-10 mt-6 flex flex-col items-center text-center">
          <div className="relative flex h-40 w-40 items-center justify-center">
            <motion.div
              className="absolute h-40 w-40 rounded-full border border-turf/20 bg-turf/[0.04]"
              animate={{ scale: [1, 1.45, 1.9], opacity: [0.6, 0.25, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.div
              className="absolute h-28 w-28 rounded-full border border-turf/40 bg-turf/[0.07]"
              animate={{ scale: [1, 1.3, 1.6], opacity: [0.8, 0.35, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: 0.55, ease: "easeOut" }}
            />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-turf/40 bg-surface-2 text-turf shadow-glow">
              <Hand value={6} size={38} />
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-turf text-surface">
                <Camera className="h-3 w-3" />
              </span>
            </div>
          </div>

          <h2 className="mt-5 font-heading text-2xl font-black uppercase tracking-tight text-chalk sm:text-3xl">
            Searching for an opponent
          </h2>
          <p className="mt-1.5 text-xs text-muted">
            Pairing you for <span className="font-semibold text-turf">{modeLabel}</span>
          </p>
        </div>

        <div className="relative z-10 mt-5 grid grid-cols-3 gap-2">
          {[
            { icon: Camera, label: "Camera check", value: "Ready" },
            { icon: ShieldCheck, label: "Privacy", value: "P2P" },
            { icon: Timer, label: "Queue time", value: `${elapsed}s` },
          ].map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="rounded-xl border border-line/70 bg-surface-2/40 px-2 py-2.5 text-center"
            >
              <Icon className="mx-auto h-3.5 w-3.5 text-turf" />
              <p className="mt-1 text-[8px] uppercase tracking-[0.12em] text-muted">{label}</p>
              <p className="font-heading text-[11px] font-black uppercase text-chalk">{value}</p>
            </div>
          ))}
        </div>

        <div className="relative z-10 mt-4 flex items-center justify-center gap-2 rounded-2xl border border-line/60 bg-ink/30 px-4 py-3 text-[11px] text-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-turf" />
          <span>Scanning the queue for a live stranger...</span>
        </div>

        <div className="relative z-10 mt-4 flex items-center justify-between border-t border-line/60 pt-3">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onCancel();
            }}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted transition-colors hover:bg-surface-2 hover:text-chalk"
          >
            <X className="h-4 w-4" />
            <span>Cancel search</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              onPlayVsBot();
            }}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-turf transition-colors hover:bg-turf/10"
          >
            <Bot className="h-3.5 w-3.5" />
            <span>Play vs bot</span>
          </button>
        </div>
      </div>
    </div>
  );
};
