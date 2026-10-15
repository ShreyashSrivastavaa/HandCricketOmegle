import React, { useState } from "react";
import { Smile, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { playClickSound } from "@/lib/client/audio";

export const FIXED_EMOJIS = ["🏏", "🔥", "😮", "😂", "👏", "💔"] as const;

export interface FloatingReaction {
  id: string;
  emoji: string;
  isSelf: boolean;
  x: number;
}

interface EmojiReactionsProps {
  onSendReaction: (emoji: string) => void;
  activeReactions: FloatingReaction[];
}

export const EmojiReactions: React.FC<EmojiReactionsProps> = ({
  onSendReaction,
  activeReactions,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handleSelectEmoji = (emoji: string) => {
    playClickSound();
    onSendReaction(emoji);
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Animated Emojis in the Arena */}
      <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden">
        <AnimatePresence>
          {activeReactions.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: "80vh", x: `${r.x}%`, scale: 0.5 }}
              animate={{ opacity: [0, 1, 1, 0], y: "20vh", scale: 1.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.4, ease: "easeOut" }}
              className="absolute text-4xl sm:text-5xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
            >
              {r.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Emoji Trigger & Drawer */}
      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => {
            playClickSound();
            setIsOpen(!isOpen);
          }}
          aria-label="Send reaction emoji"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line bg-surface text-xs font-semibold text-muted hover:text-chalk hover:border-turf/40 transition-colors"
        >
          <Smile className="w-4 h-4 text-amber" />
          <span className="hidden sm:inline">React</span>
        </button>

        {isOpen && (
          <div className="absolute bottom-full mb-2 left-0 sm:left-auto sm:right-0 z-40 p-2 rounded-2xl bg-surface-2 border border-line shadow-2xl flex items-center gap-1.5 backdrop-blur-md">
            {FIXED_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleSelectEmoji(emoji)}
                className="w-10 h-10 rounded-xl hover:bg-surface flex items-center justify-center text-xl transition-transform hover:scale-125 active:scale-95"
                title={`Send ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
