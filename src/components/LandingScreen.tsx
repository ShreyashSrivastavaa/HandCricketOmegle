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
    <main className="w-full max-w-xl mx-auto flex flex-col items-center gap-6 px-4 py-8 select-none">
      {/* 1. Flying Papers Hero Poster Display */}
      <div className="flex flex-col items-center gap-2 text-center pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[100px] bg-pure-black border-2 border-bone-white text-bone-white font-mono text-xs uppercase tracking-wider font-bold mb-1">
          <span>⚡</span>
          <span>Saturday Morning Confessional</span>
        </div>
        <h1 className="font-display-hero font-black text-6xl sm:text-7xl md:text-8xl uppercase tracking-tight leading-[0.82]">
          <span className="text-hi-vis-yellow drop-shadow-none">HAND</span>{" "}
          <span className="text-buttery-yellow drop-shadow-none">CRICKET</span>
        </h1>
        <p className="text-xs sm:text-sm font-mono text-bone-white max-w-md pt-1 uppercase tracking-wide">
          One hand • Six fingers • Pure skill duels live on the violet stage.
        </p>
      </div>

      {/* 2. Anonymous Identity Card (Bone White Card, 6px radius, 17px padding, 2px border) */}
      <div className="w-full bg-bone-white text-ink-black border-2 border-pure-black rounded-[6px] p-[17px] flex items-center justify-between gap-3 shadow-none">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-[6px] bg-hi-vis-yellow border-2 border-pure-black flex items-center justify-center text-xl shrink-0">
            🏏
          </div>
          {isEditing ? (
            <form onSubmit={handleSaveName} className="flex items-center gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={16}
                autoFocus
                className="px-3 py-1 rounded-[6px] bg-bone-white border-2 border-pure-black text-pure-black text-sm font-bold focus:outline-none w-36"
              />
              <button
                type="submit"
                className="px-3 py-1 rounded-[100px] bg-hi-vis-yellow text-pure-black font-heading font-black text-xs uppercase border-2 border-pure-black hover:bg-buttery-yellow"
              >
                <Check className="w-4 h-4 stroke-[3]" />
              </button>
            </form>
          ) : (
            <div className="flex flex-col min-w-0">
              <span className="text-base font-black font-heading uppercase text-pure-black truncate">
                {guestName}
              </span>
              <span className="text-[11px] font-mono text-pure-black/70 uppercase tracking-wider font-semibold">
                Anonymous Identity • Stage Ready
              </span>
            </div>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRandomizeName}
              title="Randomize Moniker"
              aria-label="Randomize"
              className="p-2 rounded-[100px] border-2 border-pure-black bg-bone-white text-pure-black hover:bg-hi-vis-yellow transition-all active:scale-95"
            >
              <Dices className="w-4 h-4 stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setIsEditing(true);
              }}
              title="Edit Name"
              aria-label="Edit"
              className="p-2 rounded-[100px] border-2 border-pure-black bg-bone-white text-pure-black hover:bg-hi-vis-yellow transition-all active:scale-95"
            >
              <Edit2 className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        )}
      </div>

      {/* 3. The 3 Game Modes (Confetti Cards: Hi-Vis Yellow, Bubblegum Pink, Matcha Cream) */}
      <div className="w-full flex flex-col gap-3.5">
        {/* OPTION 1: PLAY RANDOM (Hi-Vis Yellow Action Card) */}
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onFindMatch();
          }}
          aria-label="FIND STRANGER MATCH"
          className="group w-full p-[17px] rounded-[6px] bg-hi-vis-yellow border-2 border-pure-black hover:translate-x-0.5 hover:-translate-y-0.5 transition-transform flex items-center justify-between text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-pure-black"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-[6px] bg-bone-white border-2 border-pure-black text-pure-black flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Shuffle className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-black text-xl sm:text-2xl text-pure-black uppercase tracking-tight leading-tight">
                Play Random Stranger
              </span>
              <span className="text-xs font-mono font-semibold text-pure-black/80 uppercase tracking-wide">
                Live 1v1 Camera &amp; Gesture Arena
              </span>
            </div>
          </div>
          <span className="hidden sm:inline-block text-xs font-mono font-black uppercase text-pure-black bg-bone-white px-3.5 py-1.5 rounded-[100px] border-2 border-pure-black group-hover:bg-pure-black group-hover:text-bone-white transition-colors">
            ENTER QUEUE
          </span>
        </button>

        {/* OPTION 2: PLAY WITH FRIEND (Bubblegum Pink Confetti Card) */}
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onPlayWithFriend();
          }}
          aria-label="Play with friend in a private room"
          className="group w-full p-[17px] rounded-[6px] bg-bubblegum-pink border-2 border-pure-black hover:translate-x-0.5 hover:-translate-y-0.5 transition-transform flex items-center justify-between text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-pure-black"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-[6px] bg-bone-white border-2 border-pure-black text-pure-black flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Users className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-black text-xl sm:text-2xl text-pure-black uppercase tracking-tight leading-tight">
                Play With Friend
              </span>
              <span className="text-xs font-mono font-semibold text-pure-black/80 uppercase tracking-wide">
                Custom Private Room &amp; Share Link
              </span>
            </div>
          </div>
          <span className="hidden sm:inline-block text-xs font-mono font-black uppercase text-pure-black bg-bone-white px-3.5 py-1.5 rounded-[100px] border-2 border-pure-black group-hover:bg-pure-black group-hover:text-bone-white transition-colors">
            CREATE ROOM
          </span>
        </button>

        {/* OPTION 3: PLAY WITH COMPUTER (Matcha Cream Confetti Card) */}
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onPlayVsBot();
          }}
          aria-label="Practice vs Server Bot"
          className="group w-full p-[17px] rounded-[6px] bg-matcha-cream border-2 border-pure-black hover:translate-x-0.5 hover:-translate-y-0.5 transition-transform flex items-center justify-between text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-pure-black"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-[6px] bg-bone-white border-2 border-pure-black text-pure-black flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Bot className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-black text-xl sm:text-2xl text-pure-black uppercase tracking-tight leading-tight">
                Play With Bot
              </span>
              <span className="text-xs font-mono font-semibold text-pure-black/80 uppercase tracking-wide">
                Zero Wait Solo Endless Practice
              </span>
            </div>
          </div>
          <span className="hidden sm:inline-block text-xs font-mono font-black uppercase text-pure-black bg-bone-white px-3.5 py-1.5 rounded-[100px] border-2 border-pure-black group-hover:bg-pure-black group-hover:text-bone-white transition-colors">
            INSTANT PLAY
          </span>
        </button>
      </div>

      {/* 4. Match Format Selector (Pills, 100px radius, 2px borders) */}
      <div className="w-full flex flex-col gap-2.5 pt-2 border-t-2 border-pure-black">
        <span className="text-xs font-mono font-black text-hi-vis-yellow uppercase tracking-widest text-center">
          MATCH FORMAT SELECTOR
        </span>

        <div className="grid grid-cols-3 gap-2.5 w-full">
          {/* Sudden Death */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setMode("sudden_death");
            }}
            aria-pressed={mode === "sudden_death"}
            className={`py-2 px-3 rounded-[100px] border-2 border-pure-black text-center transition-all ${
              mode === "sudden_death"
                ? "bg-hi-vis-yellow text-pure-black font-black"
                : "bg-bone-white text-pure-black hover:bg-buttery-yellow font-bold"
            }`}
          >
            <div className="font-heading font-black text-xs uppercase leading-tight">Sudden Death</div>
            <div className="text-[10px] font-mono leading-tight">1 WKT</div>
          </button>

          {/* Classic */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setMode("classic");
            }}
            aria-pressed={mode === "classic"}
            className={`py-2 px-3 rounded-[100px] border-2 border-pure-black text-center transition-all ${
              mode === "classic"
                ? "bg-hi-vis-yellow text-pure-black font-black"
                : "bg-bone-white text-pure-black hover:bg-buttery-yellow font-bold"
            }`}
          >
            <div className="font-heading font-black text-xs uppercase leading-tight">Classic</div>
            <div className="text-[10px] font-mono leading-tight">2 OVERS</div>
          </button>

          {/* Endless */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setMode("endless");
            }}
            aria-pressed={mode === "endless"}
            className={`py-2 px-3 rounded-[100px] border-2 border-pure-black text-center transition-all ${
              mode === "endless"
                ? "bg-hi-vis-yellow text-pure-black font-black"
                : "bg-bone-white text-pure-black hover:bg-buttery-yellow font-bold"
            }`}
          >
            <div className="font-heading font-black text-xs uppercase leading-tight">Endless</div>
            <div className="text-[10px] font-mono leading-tight">NO LIMIT</div>
          </button>
        </div>
      </div>

      {/* 5. Underline Text Link for Rules */}
      <button
        type="button"
        onClick={() => {
          playClickSound();
          onOpenRules();
        }}
        aria-label="View Hand Cricket rules"
        className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-bone-white underline decoration-2 underline-offset-4 hover:text-hi-vis-yellow transition-colors py-1 focus-visible:outline-none"
      >
        <HelpCircle className="w-4 h-4 text-hi-vis-yellow stroke-[2.5]" />
        <span>View Rules &amp; Hand Gestures Guide</span>
      </button>
    </main>
  );
};
