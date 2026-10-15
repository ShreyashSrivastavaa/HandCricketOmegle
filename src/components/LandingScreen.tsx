import React, { useState } from "react";
import { useLiveMatchStore } from "@/lib/store/liveMatchStore";
import { Play, Bot, Shuffle, HelpCircle, Flame, Shield, Swords, Sparkles, Trophy } from "lucide-react";
import { generateGuestName } from "@/lib/server/session";
import { playClickSound } from "@/lib/client/audio";

interface LandingScreenProps {
  onFindMatch: () => void;
  onPlayVsBot: () => void;
  onOpenRules: () => void;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({
  onFindMatch,
  onPlayVsBot,
  onOpenRules,
}) => {
  const { guestName, setGuestName, mode, setMode } = useLiveMatchStore();
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>(guestName);

  const handleRandomizeName = () => {
    playClickSound();
    const newName = generateGuestName();
    setGuestName(newName);
    setNameInput(newName);
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    const trimmed = nameInput.trim() || generateGuestName();
    setGuestName(trimmed.slice(0, 16));
    setIsEditing(false);
  };

  return (
    <main className="w-full max-w-xl mx-auto flex flex-col items-center gap-6 px-4 py-6 sm:py-10 select-none">
      {/* Hero Badge & Headline */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-turf/10 border border-turf/30 text-xs font-heading font-black tracking-wider uppercase text-turf shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-turf" />
          <span>Real-time Stranger Matchmaking</span>
        </div>

        <h1 className="font-heading font-black text-4xl sm:text-5xl uppercase tracking-tight text-chalk leading-none">
          OUTSMART STRANGERS IN <span className="text-turf">HAND CRICKET</span>
        </h1>

        <p className="text-xs sm:text-sm text-muted max-w-md leading-relaxed">
          The nostalgic Indian schoolyard game, now online! Anonymous 1v1 duels, instant reveal animations, and zero servers to configure.
        </p>
      </div>

      {/* Guest Identity Card */}
      <div className="w-full bg-surface border border-line rounded-[16px] p-4 sm:p-5 flex flex-col gap-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-line pb-2.5">
          <span className="text-[11px] font-heading font-bold text-muted uppercase tracking-wider">
            Your Anonymous Identity
          </span>
          <button
            type="button"
            onClick={handleRandomizeName}
            className="flex items-center gap-1 text-[11px] font-medium text-turf hover:text-turf/80 uppercase transition-colors"
          >
            <Shuffle className="w-3 h-3" />
            <span>Randomize</span>
          </button>
        </div>

        <div className="flex items-center justify-between gap-3">
          {isEditing ? (
            <form onSubmit={handleSaveName} className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={16}
                autoFocus
                className="w-full px-3 py-1.5 rounded-lg bg-surface-2 border border-turf text-chalk text-sm font-semibold focus:outline-none"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-turf text-ink font-heading font-black text-xs uppercase"
              >
                Save
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-surface-2 border border-line flex items-center justify-center text-lg">
                🏏
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-chalk">{guestName}</span>
                <span className="text-[10px] text-muted">Ready to play</span>
              </div>
            </div>
          )}

          {!isEditing && (
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setIsEditing(true);
              }}
              className="px-3 py-1.5 rounded-lg border border-line bg-surface-2 text-xs font-semibold text-muted hover:text-chalk transition-colors"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Mode Selector */}
      <div className="w-full flex flex-col gap-2">
        <label className="text-xs font-heading font-bold text-muted uppercase tracking-wider px-1">
          Select Match Mode
        </label>
        <div className="grid grid-cols-2 gap-3 w-full">
          {/* Sudden Death Card */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setMode("sudden_death");
            }}
            className={`p-3.5 rounded-[14px] border text-left flex flex-col gap-1.5 transition-all ${
              mode === "sudden_death"
                ? "bg-surface-2 border-turf shadow-[0_0_16px_rgba(61,220,132,0.15)] ring-1 ring-turf"
                : "bg-surface/50 border-line hover:border-line/80 opacity-70"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-heading font-black uppercase tracking-wider text-turf flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-current" /> Sudden Death
              </span>
              <span className="text-[10px] font-bold text-muted bg-surface px-1.5 py-0.5 rounded border border-line">
                DEFAULT
              </span>
            </div>
            <span className="text-sm font-black font-heading text-chalk">1 WICKET</span>
            <span className="text-[11px] text-muted leading-tight">
              Instant knockout. Innings ends on the very first wicket!
            </span>
          </button>

          {/* Classic Mode Card */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setMode("classic");
            }}
            className={`p-3.5 rounded-[14px] border text-left flex flex-col gap-1.5 transition-all ${
              mode === "classic"
                ? "bg-surface-2 border-turf shadow-[0_0_16px_rgba(61,220,132,0.15)] ring-1 ring-turf"
                : "bg-surface/50 border-line hover:border-line/80 opacity-70"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-heading font-black uppercase tracking-wider text-sky flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5" /> Classic Match
              </span>
            </div>
            <span className="text-sm font-black font-heading text-chalk">2 WKTS • 2 OVERS</span>
            <span className="text-[11px] text-muted leading-tight">
              12 balls total with 2 wickets. Strategic chase pacing.
            </span>
          </button>
        </div>
      </div>

      {/* Main CTAs */}
      <div className="w-full flex flex-col gap-3 pt-2">
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onFindMatch();
          }}
          className="w-full py-4 px-6 rounded-2xl bg-turf text-ink font-heading font-black text-2xl uppercase tracking-wider flex items-center justify-center gap-3 shadow-[0_0_24px_rgba(61,220,132,0.35)] hover:bg-turf-hover active:scale-[0.99] transition-all"
        >
          <Play className="w-6 h-6 fill-current" />
          <span>FIND STRANGER MATCH</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playClickSound();
            onPlayVsBot();
          }}
          className="w-full py-3 px-5 rounded-xl bg-surface border border-line text-chalk font-heading font-bold text-base uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-surface-2 hover:border-muted transition-colors"
        >
          <Bot className="w-4 h-4 text-turf" />
          <span>Practice vs Server Bot</span>
        </button>
      </div>

      {/* Quick Rules Link */}
      <button
        type="button"
        onClick={() => {
          playClickSound();
          onOpenRules();
        }}
        className="flex items-center gap-1.5 text-xs text-muted hover:text-chalk transition-colors py-1"
      >
        <HelpCircle className="w-4 h-4 text-turf" />
        <span>How does Hand Cricket work? View rules</span>
      </button>

      {/* Feature Footnotes */}
      <div className="w-full grid grid-cols-3 gap-2 pt-4 border-t border-line text-center text-[10px] text-muted uppercase font-semibold">
        <div className="flex flex-col items-center gap-1">
          <Shield className="w-4 h-4 text-turf" />
          <span>Server Authoritative</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Flame className="w-4 h-4 text-amber" />
          <span>10s Turn Clock</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Swords className="w-4 h-4 text-sky" />
          <span>Zero Free-Text Safe</span>
        </div>
      </div>
    </main>
  );
};
