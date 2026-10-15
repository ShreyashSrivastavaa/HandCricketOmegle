import React, { useEffect, useState } from "react";
import { Bot, X, Loader2, Sparkles, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { playClickSound } from "@/lib/client/audio";

interface SearchingOverlayProps {
  mode: "sudden_death" | "classic";
  onCancel: () => void;
  onPlayVsBot: () => void;
}

export const SearchingOverlay: React.FC<SearchingOverlayProps> = ({
  mode,
  onCancel,
  onPlayVsBot,
}) => {
  const [elapsed, setElapsed] = useState<number>(0);
  const [showBotFallback, setShowBotFallback] = useState<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= 12) {
          setShowBotFallback(true);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Keyboard accessibility: Escape key cancels search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-ink/95 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Searching for opponent"
    >
      <div className="w-full max-w-md bg-surface border border-line rounded-[20px] p-6 sm:p-8 flex flex-col items-center text-center gap-6 shadow-2xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-turf/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-sky/10 rounded-full blur-3xl pointer-events-none" />

        {/* Radar Pulse Animation */}
        <div className="relative flex items-center justify-center my-4">
          <motion.div
            className="absolute w-36 h-36 rounded-full border border-turf/20 bg-turf/5"
            animate={{ scale: [1, 1.4, 1.8], opacity: [0.6, 0.3, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.div
            className="absolute w-24 h-24 rounded-full border border-turf/40 bg-turf/10"
            animate={{ scale: [1, 1.3, 1.6], opacity: [0.8, 0.4, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, delay: 0.6, ease: "easeOut" }}
          />
          <div className="w-20 h-20 rounded-full bg-surface-2 border-2 border-turf flex items-center justify-center text-3xl shadow-[0_0_24px_rgba(61,220,132,0.3)] z-10">
            🏏
          </div>
        </div>

        {/* Status text */}
        <div className="flex flex-col gap-1.5 z-10">
          <span className="font-heading font-black text-2xl sm:text-3xl uppercase tracking-wider text-chalk">
            Searching for Opponent...
          </span>
          <p className="text-xs text-muted">
            Pairing with a live player for{" "}
            <span className="text-turf font-bold uppercase">
              {mode === "classic" ? "Classic Mode (2 Wkts)" : "Sudden Death (1 Wkt)"}
            </span>
          </p>
          <span className="font-tabular text-sm font-semibold text-muted/80 mt-1">
            Elapsed: {elapsed}s
          </span>
        </div>

        {/* 12-second Bot Fallback Offer */}
        {showBotFallback ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full p-4 rounded-xl bg-surface-2 border border-turf/40 flex flex-col gap-2.5 z-10 text-left"
          >
            <div className="flex items-center gap-2 text-turf">
              <Bot className="w-4 h-4" />
              <span className="text-xs font-heading font-bold uppercase tracking-wider">
                Taking longer than usual?
              </span>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">
              No human matched in 12s. You can jump in instantly against our intelligent server-side bot!
            </p>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onPlayVsBot();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-turf text-ink font-heading font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-md"
            >
              <Bot className="w-4 h-4 fill-current" />
              <span>PLAY VS BOT ARENA</span>
            </button>
          </motion.div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted/70 z-10">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-turf" />
            <span>Authoritative matching in progress...</span>
          </div>
        )}

        {/* Action button */}
        <div className="w-full pt-2 border-t border-line flex items-center justify-between z-10">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onCancel();
            }}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-chalk uppercase font-medium transition-colors py-2 px-3 rounded-lg hover:bg-surface-2"
          >
            <X className="w-4 h-4" />
            <span>Cancel Search</span>
          </button>

          {!showBotFallback && (
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onPlayVsBot();
              }}
              className="flex items-center gap-1.5 text-xs text-turf hover:text-turf/80 uppercase font-semibold transition-colors py-2 px-3 rounded-lg hover:bg-turf/10"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Play vs Bot</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
