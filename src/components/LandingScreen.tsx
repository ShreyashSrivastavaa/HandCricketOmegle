import React, { useState } from "react";
import { useLiveMatchStore } from "@/lib/store/liveMatchStore";
import {
  Play,
  Bot,
  Shuffle,
  HelpCircle,
  Flame,
  Shield,
  Swords,
  Sparkles,
  Trophy,
  Users,
  Infinity as InfinityIcon,
  Camera,
} from "lucide-react";
import { generateGuestName } from "@/lib/server/session";
import { playClickSound } from "@/lib/client/audio";

interface LandingScreenProps {
  onFindMatch: () => void;
  onPlayVsBot: () => void;
  onPlayWithFriend: () => void;
  onOpenRules: () => void;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({
  onFindMatch,
  onPlayVsBot,
  onPlayWithFriend,
  onOpenRules,
}) => {
  const {
    guestName,
    setGuestName,
    mode,
    setMode,
    endlessVariant,
    setEndlessVariant,
    personalBest,
  } = useLiveMatchStore();
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 w-full">
          {/* Sudden Death Card */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setMode("sudden_death");
            }}
            aria-pressed={mode === "sudden_death"}
            className={`p-3.5 rounded-[14px] border text-left flex flex-col justify-between gap-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turf ${
              mode === "sudden_death"
                ? "bg-surface-2 border-turf shadow-[0_0_16px_rgba(61,220,132,0.15)] ring-1 ring-turf"
                : "bg-surface/50 border-line hover:border-line/80 opacity-70"
            }`}
          >
            <div className="flex flex-col gap-1">
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
            </div>
          </button>

          {/* Classic Mode Card */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setMode("classic");
            }}
            aria-pressed={mode === "classic"}
            className={`p-3.5 rounded-[14px] border text-left flex flex-col justify-between gap-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turf ${
              mode === "classic"
                ? "bg-surface-2 border-turf shadow-[0_0_16px_rgba(61,220,132,0.15)] ring-1 ring-turf"
                : "bg-surface/50 border-line hover:border-line/80 opacity-70"
            }`}
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-heading font-black uppercase tracking-wider text-sky flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5" /> Classic Match
                </span>
              </div>
              <span className="text-sm font-black font-heading text-chalk">2 WKTS • 2 OVERS</span>
              <span className="text-[11px] text-muted leading-tight">
                12 balls total with 2 wickets. Strategic chase pacing.
              </span>
            </div>
          </button>

          {/* Endless Mode Card */}
          <div
            className={`p-3.5 rounded-[14px] border text-left flex flex-col justify-between gap-1.5 transition-all ${
              mode === "endless"
                ? "bg-surface-2 border-amber shadow-[0_0_16px_rgba(245,158,11,0.18)] ring-1 ring-amber"
                : "bg-surface/50 border-line hover:border-line/80 opacity-70"
            }`}
          >
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setMode("endless");
              }}
              aria-pressed={mode === "endless"}
              className="w-full text-left flex flex-col gap-1 focus:outline-none"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-heading font-black uppercase tracking-wider text-amber flex items-center gap-1">
                  <InfinityIcon className="w-3.5 h-3.5" /> Endless
                </span>
                <span className="text-[10px] font-bold text-amber bg-amber/10 border border-amber/30 px-1.5 py-0.5 rounded">
                  NEW
                </span>
              </div>
              <span className="text-sm font-black font-heading text-chalk">
                {endlessVariant === "pro" ? "3 WKTS • NO LIMIT" : "1 WKT • NO LIMIT"}
              </span>
              <span className="text-[11px] text-muted leading-tight">
                Bat until out! Higher total wins; tie triggers Super-Over.
              </span>
            </button>

            {/* Config: 1 Wicket vs 3 Wickets (Endless Pro) */}
            <div className="pt-2 border-t border-line/60 flex items-center justify-between gap-1 mt-1">
              <span className="text-[10px] font-bold text-muted uppercase">Wickets:</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    playClickSound();
                    setMode("endless");
                    setEndlessVariant("standard");
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                    endlessVariant === "standard"
                      ? "bg-amber text-ink"
                      : "bg-surface border border-line text-muted hover:text-chalk"
                  }`}
                >
                  1 (Def)
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    playClickSound();
                    setMode("endless");
                    setEndlessVariant("pro");
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                    endlessVariant === "pro"
                      ? "bg-amber text-ink"
                      : "bg-surface border border-line text-muted hover:text-chalk"
                  }`}
                >
                  3 (Pro)
                </button>
              </div>
            </div>

            {/* Personal Best Pill */}
            {personalBest > 0 && (
              <div className="mt-1 flex items-center justify-between text-[10px] bg-ink/70 px-2 py-0.5 rounded border border-line text-muted">
                <span>Personal Best:</span>
                <span className="text-amber font-mono font-bold">{personalBest} runs</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main CTAs */}
      <div className="w-full flex flex-col gap-2.5 sm:gap-3 pt-2">
        {/* 1. Find Stranger Match */}
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onFindMatch();
          }}
          aria-label="Find stranger match"
          className="w-full min-h-[52px] py-3.5 sm:py-4 px-4 sm:px-6 rounded-2xl bg-turf text-ink font-heading font-black text-lg sm:text-2xl uppercase tracking-wider flex items-center justify-center gap-2.5 sm:gap-3 shadow-[0_0_24px_rgba(61,220,132,0.35)] hover:bg-turf-hover active:scale-[0.99] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turf focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
        >
          <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current shrink-0" />
          <span className="truncate">FIND STRANGER MATCH</span>
        </button>

        {/* 2. Play with Friend */}
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onPlayWithFriend();
          }}
          aria-label="Play with friend in a private room"
          className="w-full min-h-[48px] py-3 px-4 sm:px-5 rounded-xl bg-surface border border-turf/40 text-turf font-heading font-bold text-sm sm:text-base uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-turf/10 hover:border-turf transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turf shadow-[0_0_12px_rgba(61,220,132,0.1)]"
        >
          <Users className="w-4 h-4 text-turf shrink-0" />
          <span>Play with Friend (Private Room)</span>
        </button>

        {/* 3. Practice vs Server Bot */}
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onPlayVsBot();
          }}
          aria-label="Practice vs Server Bot"
          className="w-full min-h-[46px] py-3 px-4 sm:px-5 rounded-xl bg-surface border border-line text-chalk font-heading font-bold text-sm sm:text-base uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-surface-2 hover:border-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turf"
        >
          <Bot className="w-4 h-4 text-turf shrink-0" />
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
        aria-label="How does Hand Cricket work? View rules"
        className="flex items-center gap-1.5 text-xs text-muted hover:text-chalk transition-colors py-1 focus-visible:outline-none focus-visible:underline"
      >
        <HelpCircle className="w-4 h-4 text-turf shrink-0" />
        <span>How does Hand Cricket work? View rules</span>
      </button>

      {/* Feature Footnotes */}
      <div className="w-full grid grid-cols-3 gap-1 sm:gap-2 pt-4 border-t border-line text-center text-[9px] sm:text-[10px] text-muted uppercase font-semibold">
        <div className="flex flex-col items-center gap-1">
          <Shield className="w-4 h-4 text-turf shrink-0" />
          <span className="truncate w-full">Server Authoritative</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Flame className="w-4 h-4 text-amber shrink-0" />
          <span className="truncate w-full">10s Turn Clock</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Swords className="w-4 h-4 text-sky shrink-0" />
          <span className="truncate w-full">Zero-Text Safe</span>
        </div>
      </div>
    </main>
  );
};
