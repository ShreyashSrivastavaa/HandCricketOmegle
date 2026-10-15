import React, { useState, useEffect } from "react";
import { Volume2, VolumeX, HelpCircle, Users } from "lucide-react";
import { isSoundMuted, toggleSoundMute, playClickSound } from "@/lib/client/audio";
import { subscribeToLobbyPresence } from "@/lib/client/ablyClient";

interface NavbarProps {
  guestName?: string;
  onOpenRules: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ guestName, onOpenRules }) => {
  const [muted, setMuted] = useState<boolean>(false);
  const [onlineCount, setOnlineCount] = useState<number>(1);

  useEffect(() => {
    setMuted(isSoundMuted());
    const unsubscribe = subscribeToLobbyPresence((count) => {
      setOnlineCount(count);
    });
    return () => unsubscribe();
  }, []);

  const handleToggleMute = () => {
    playClickSound();
    const next = toggleSoundMute();
    setMuted(next);
  };

  return (
    <nav className="w-full max-w-4xl mx-auto flex items-center justify-between py-3 px-4 border-b border-line bg-surface/40 backdrop-blur-md rounded-b-[16px]">
      {/* Brand */}
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-turf/20 border border-turf/40 flex items-center justify-center text-lg">
          🏏
        </span>
        <div className="flex flex-col">
          <span className="font-heading font-black text-lg sm:text-xl uppercase tracking-wider text-chalk leading-none">
            HAND CRICKET <span className="text-turf">OMEGLE</span>
          </span>
          <span className="text-[10px] text-muted tracking-widest uppercase font-semibold">
            1v1 Stranger Matchmaking
          </span>
        </div>
      </div>

      {/* Online Players Counter & Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live Online Badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-2 border border-line text-xs font-medium text-chalk/90"
          title="Live online players"
        >
          <span className="w-2 h-2 rounded-full bg-turf animate-pulse" />
          <Users className="w-3.5 h-3.5 text-muted hidden sm:inline" />
          <span className="font-tabular font-bold text-turf">{onlineCount}</span>
          <span className="text-[10px] text-muted uppercase hidden sm:inline">Online</span>
        </div>

        {/* Audio Mute Toggle */}
        <button
          type="button"
          onClick={handleToggleMute}
          aria-label={muted ? "Unmute audio" : "Mute audio"}
          className={`p-2 rounded-full border transition-colors ${
            muted
              ? "bg-surface-2 border-line text-muted hover:text-chalk"
              : "bg-turf/15 border-turf/30 text-turf hover:bg-turf/25"
          }`}
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* How to Play Rules Button */}
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onOpenRules();
          }}
          aria-label="How to play"
          className="p-2 rounded-full bg-surface-2 border border-line text-muted hover:text-chalk hover:border-turf/50 transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Guest Name pill */}
        {guestName && (
          <div className="hidden md:flex items-center gap-1 px-3 py-1 rounded-full bg-surface border border-line text-xs font-semibold text-chalk/90">
            <span className="text-muted">👤</span>
            <span className="truncate max-w-[110px]">{guestName}</span>
          </div>
        )}
      </div>
    </nav>
  );
};
