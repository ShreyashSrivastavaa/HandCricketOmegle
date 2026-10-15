import React from "react";
import { Button } from "@/components/Button";
import { Toast, ToastMessage } from "@/components/Toast";
import { Copy, Share2, Check, Clock, Loader2, LogOut } from "lucide-react";
import type { MatchFormat } from "@/lib/game-core/types";

export interface FriendWaitingViewProps {
  code: string;
  format: MatchFormat;
  mode: "video" | "game_only";
  copiedCode: boolean;
  copiedLink: boolean;
  onCopyCode: () => void;
  onShareLink: () => void;
  onLeaveRoom: () => void;
  toasts: ToastMessage[];
  onDismissToast: (id: string) => void;
}

export function FriendWaitingView({
  code,
  format,
  mode,
  copiedCode,
  copiedLink,
  onCopyCode,
  onShareLink,
  onLeaveRoom,
  toasts,
  onDismissToast,
}: FriendWaitingViewProps) {
  return (
    <main className="min-h-screen bg-ink text-chalk flex flex-col justify-center items-center p-4 select-none">
      <div className="w-full max-w-md bg-surface border border-line rounded-[12px] p-6 sm:p-8 flex flex-col items-center gap-6 text-center">
        {/* Title */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-heading font-bold uppercase tracking-widest text-turf bg-turf/10 px-2.5 py-0.5 rounded-full border border-turf/30">
            Friend Match Arena
          </span>
          <h2 className="font-heading font-black text-2xl sm:text-3xl uppercase tracking-tight text-chalk mt-1">
            Invite Your Friend
          </h2>
          <p className="text-xs text-muted">
            Share the 6-character room code or link below.
          </p>
        </div>

        {/* BIG ROOM CODE WITH COPY BUTTON */}
        <div className="w-full bg-surface-2 border border-line rounded-[14px] p-4 sm:p-5 flex flex-col items-center gap-3">
          <span className="text-[11px] font-heading font-bold uppercase tracking-widest text-muted">
            Your Private Room Code
          </span>
          <div className="font-heading font-black text-3xl sm:text-4xl tracking-[0.2em] text-turf select-all py-1 px-4 bg-ink/40 border border-turf/30 rounded-xl">
            {code.startsWith("HC-") ? code : `HC-${code}`}
          </div>
          <p className="text-[11px] text-muted">
            Share this code with your friend to invite them to the match.
          </p>

          <div className="grid grid-cols-2 gap-2 w-full mt-1">
            <Button
              variant="primary"
              size="md"
              onClick={onCopyCode}
              className="flex items-center justify-center gap-1.5 font-heading font-bold text-xs uppercase"
            >
              {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode ? "COPIED!" : "COPY ROOM CODE"}</span>
            </Button>

            <Button
              variant="secondary"
              size="md"
              onClick={onShareLink}
              className="flex items-center justify-center gap-1.5 font-heading font-bold text-xs uppercase"
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              <span>{copiedLink ? "COPIED!" : "SHARE INVITE"}</span>
            </Button>
          </div>
        </div>

        {/* WAITING INDICATOR */}
        <div className="flex items-center gap-2.5 text-xs text-muted py-1">
          <Loader2 className="w-4 h-4 text-turf animate-spin" />
          <span className="font-medium animate-pulse">Waiting for friend to join...</span>
        </div>

        {/* FORMAT INFO & EXPIRY */}
        <div className="w-full flex items-center justify-between text-xs text-muted border-t border-line pt-3">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Expires in 10 mins</span>
          </div>
          <span>
            {format.maxOvers} Overs • {format.maxWickets} Wkts •{" "}
            {mode === "video" ? "Video Duel" : "Game Only"}
          </span>
        </div>

        <Button
          variant="secondary"
          size="md"
          fullWidth
          onClick={onLeaveRoom}
          className="flex items-center justify-center gap-2 text-xs uppercase"
        >
          <LogOut className="w-4 h-4" />
          <span>Cancel &amp; Leave Room</span>
        </Button>
      </div>
      <Toast toasts={toasts} onDismiss={onDismissToast} />
    </main>
  );
}
