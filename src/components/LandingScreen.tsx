import React, { useState } from "react";
import { useLiveMatchStore } from "@/lib/store/liveMatchStore";
import {
  Shuffle,
  Users,
  Bot,
  Play,
  HelpCircle,
  Dices,
  Edit2,
  Check,
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
  } = useLiveMatchStore();

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>(guestName);

  const handleRandomizeName = () => {
    playClickSound();
    const newName = generateGuestName();
    const newId = `guest_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36).substring(4)}`;
    setGuestName(newName);
    setNameInput(newName);
    useLiveMatchStore.setState({ guestId: newId });
    if (typeof window !== "undefined") {
      sessionStorage.setItem("hca_tab_guest_id", newId);
      sessionStorage.setItem("hca_tab_guest_name", newName);
    }
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    const trimmed = nameInput.trim() || generateGuestName();
    setGuestName(trimmed.slice(0, 16));
    setIsEditing(false);
  };

  return (
    <main className="w-full max-w-lg mx-auto flex flex-col items-center gap-6 px-4 py-8 select-none">
      {/* 1. Clean Title */}
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-heading font-black text-4xl sm:text-5xl uppercase tracking-tight text-chalk">
          HAND <span className="text-turf">CRICKET</span>
        </h1>
        <p className="text-sm text-muted">
          Classic schoolyard hand cricket, played live in browser.
        </p>
      </div>

      {/* 2. Compact Anonymous Identity */}
      <div className="w-full bg-surface border border-line rounded-xl px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xl shrink-0">🏏</span>
          {isEditing ? (
            <form onSubmit={handleSaveName} className="flex items-center gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={16}
                autoFocus
                className="px-2.5 py-1 rounded-lg bg-surface-2 border border-turf text-chalk text-sm font-semibold focus:outline-none w-36"
              />
              <button
                type="submit"
                className="px-2.5 py-1 rounded-lg bg-turf text-ink font-heading font-bold text-xs uppercase"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-chalk truncate">
                {guestName}
              </span>
              <span className="text-[11px] text-muted">
                Your Anonymous Identity • Ready to play
              </span>
            </div>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleRandomizeName}
              title="Randomize Moniker"
              aria-label="Randomize"
              className="p-1.5 rounded-lg text-muted hover:text-chalk hover:bg-surface-2 transition-colors"
            >
              <Dices className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setIsEditing(true);
              }}
              title="Edit Name"
              aria-label="Edit"
              className="p-1.5 rounded-lg text-muted hover:text-chalk hover:bg-surface-2 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 3. The 3 Game Modes (Clean, Distinct Action Cards) */}
      <div className="w-full flex flex-col gap-3">
        {/* OPTION 1: PLAY RANDOM */}
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onFindMatch();
          }}
          aria-label="FIND STRANGER MATCH"
          className="group w-full p-4 rounded-xl bg-surface border border-line hover:border-turf hover:bg-surface-2 transition-all flex items-center justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turf"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-turf/15 text-turf flex items-center justify-center shrink-0 group-hover:bg-turf group-hover:text-ink transition-colors">
              <Shuffle className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-black text-lg text-chalk group-hover:text-turf transition-colors">
                Play Random
              </span>
              <span className="text-xs text-muted">
                Match 1v1 with an online opponent
              </span>
            </div>
          </div>
          <span className="hidden sm:inline-block text-xs font-heading font-bold uppercase text-turf bg-turf/10 px-3 py-1.5 rounded-lg border border-turf/20 group-hover:bg-turf group-hover:text-ink transition-colors">
            FIND STRANGER MATCH
          </span>
        </button>

        {/* OPTION 2: PLAY WITH FRIEND */}
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onPlayWithFriend();
          }}
          aria-label="Play with friend in a private room"
          className="group w-full p-4 rounded-xl bg-surface border border-line hover:border-sky hover:bg-surface-2 transition-all flex items-center justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-sky/15 text-sky flex items-center justify-center shrink-0 group-hover:bg-sky group-hover:text-ink transition-colors">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-black text-lg text-chalk group-hover:text-sky transition-colors">
                Play with Friend
              </span>
              <span className="text-xs text-muted">
                Private room with invite code or link
              </span>
            </div>
          </div>
          <span className="hidden sm:inline-block text-xs font-heading font-bold uppercase text-sky bg-sky/10 px-3 py-1.5 rounded-lg border border-sky/20 group-hover:bg-sky group-hover:text-ink transition-colors">
            Play with Friend
          </span>
        </button>

        {/* OPTION 3: PLAY WITH COMPUTER */}
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onPlayVsBot();
          }}
          aria-label="Practice vs Server Bot"
          className="group w-full p-4 rounded-xl bg-surface border border-line hover:border-amber hover:bg-surface-2 transition-all flex items-center justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-amber/15 text-amber flex items-center justify-center shrink-0 group-hover:bg-amber group-hover:text-ink transition-colors">
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-black text-lg text-chalk group-hover:text-amber transition-colors">
                Play with Computer
              </span>
              <span className="text-xs text-muted">
                Instant match vs smart bot, zero wait
              </span>
            </div>
          </div>
          <span className="hidden sm:inline-block text-xs font-heading font-bold uppercase text-amber bg-amber/10 px-3 py-1.5 rounded-lg border border-amber/20 group-hover:bg-amber group-hover:text-ink transition-colors">
            Practice vs Server Bot
          </span>
        </button>
      </div>

      {/* 4. Compact Format Selector */}
      <div className="w-full flex flex-col gap-2 pt-2 border-t border-line">
        <span className="text-[11px] font-heading font-bold text-muted uppercase tracking-wider text-center">
          Match Format
        </span>

        <div className="grid grid-cols-3 gap-2 w-full">
          {/* Sudden Death */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setMode("sudden_death");
            }}
            aria-pressed={mode === "sudden_death"}
            className={`py-2 px-3 rounded-lg text-center transition-all ${
              mode === "sudden_death"
                ? "bg-surface-2 border border-turf text-turf font-bold text-xs"
                : "bg-surface border border-line text-muted hover:text-chalk text-xs"
            }`}
          >
            <div className="font-heading font-bold">Sudden Death</div>
            <div className="text-[10px] text-muted font-normal">1 WICKET</div>
          </button>

          {/* Classic */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setMode("classic");
            }}
            aria-pressed={mode === "classic"}
            className={`py-2 px-3 rounded-lg text-center transition-all ${
              mode === "classic"
                ? "bg-surface-2 border border-turf text-turf font-bold text-xs"
                : "bg-surface border border-line text-muted hover:text-chalk text-xs"
            }`}
          >
            <div className="font-heading font-bold">Classic Match</div>
            <div className="text-[10px] text-muted font-normal">2 WKTS • 2 OVERS</div>
          </button>

          {/* Endless */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setMode("endless");
            }}
            aria-pressed={mode === "endless"}
            className={`py-2 px-3 rounded-lg text-center transition-all ${
              mode === "endless"
                ? "bg-surface-2 border border-amber text-amber font-bold text-xs"
                : "bg-surface border border-line text-muted hover:text-chalk text-xs"
            }`}
          >
            <div className="font-heading font-bold">Endless</div>
            <div className="text-[10px] text-muted font-normal">NO LIMIT</div>
          </button>
        </div>
      </div>

      {/* 5. Simple Rules Link */}
      <button
        type="button"
        onClick={() => {
          playClickSound();
          onOpenRules();
        }}
        aria-label="View Hand Cricket rules"
        className="flex items-center gap-1.5 text-xs text-muted hover:text-chalk transition-colors py-1 focus-visible:outline-none focus-visible:underline"
      >
        <HelpCircle className="w-3.5 h-3.5 text-turf" />
        <span>View rules &amp; how to play</span>
      </button>
    </main>
  );
};
