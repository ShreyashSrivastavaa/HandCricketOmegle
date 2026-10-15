import React from "react";
import { Button } from "@/components/Button";
import { Toast, ToastMessage } from "@/components/Toast";
import { Copy, Check, UserX } from "lucide-react";
import type { MatchFormat, WicketsOption, OversOption } from "@/lib/game-core/types";

export interface FriendLobbyViewProps {
  code: string;
  isHost: boolean;
  isReady: boolean;
  host: { guestId: string; name: string; ready: boolean; disconnected?: boolean };
  guest: { guestId: string; name: string; ready: boolean; disconnected?: boolean } | null;
  format: MatchFormat;
  canChangeFormat: boolean;
  onCopyCode: () => void;
  onToggleReady: () => void;
  onLeaveRoom: () => void;
  onHostKick: (guestId: string) => void;
  onFormatUpdate: (format: MatchFormat) => void;
  toasts: ToastMessage[];
  onDismissToast: (id: string) => void;
}

export function FriendLobbyView({
  code,
  isHost,
  isReady,
  host,
  guest,
  format,
  canChangeFormat,
  onCopyCode,
  onToggleReady,
  onLeaveRoom,
  onHostKick,
  onFormatUpdate,
  toasts,
  onDismissToast,
}: FriendLobbyViewProps) {
  return (
    <main className="min-h-screen bg-ink text-chalk flex flex-col justify-center items-center p-4 select-none">
      <div className="w-full max-w-lg bg-surface border border-line rounded-[12px] p-6 sm:p-8 flex flex-col gap-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-turf inline-block" />
            <h2 className="font-heading font-black text-xl uppercase tracking-wide">
              Room Lobby
            </h2>
          </div>
          <div className="flex items-center gap-1.5 bg-surface-2 border border-line rounded-full px-3 py-1 text-xs font-mono font-bold text-turf">
            <span>{code}</span>
            <button onClick={onCopyCode} title="Copy code" className="hover:text-chalk">
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* PLAYERS STATUS CARDS */}
        <div className="flex flex-col gap-3">
          <span className="text-[11px] font-heading font-bold uppercase tracking-wider text-muted">
            Players
          </span>

          {/* Host Card */}
          <div className="flex items-center justify-between bg-surface-2 border border-line rounded-[12px] p-3.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[8px] bg-turf/10 border border-turf text-turf flex items-center justify-center font-heading font-black text-xs">
                {host.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-heading font-bold text-chalk">
                  {host.name} {isHost ? "(You)" : ""}
                </span>
                <span className="text-[10px] text-muted uppercase font-semibold">
                  Host
                </span>
              </div>
            </div>

            <span
              className={`text-xs font-heading font-bold px-3 py-1 rounded-full border ${
                host.ready
                  ? "bg-turf/15 text-turf border-turf/40"
                  : "bg-surface text-muted border-line"
              }`}
            >
              {host.ready ? "READY" : "NOT READY"}
            </span>
          </div>

          {/* Guest Card */}
          {guest ? (
            <div className="flex items-center justify-between bg-surface-2 border border-line rounded-[12px] p-3.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[8px] bg-sky/10 border border-sky text-sky flex items-center justify-center font-heading font-black text-xs">
                  {guest.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-heading font-bold text-chalk">
                    {guest.name} {!isHost ? "(You)" : ""}
                  </span>
                  <span className="text-[10px] text-muted uppercase font-semibold">
                    Challenger
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-heading font-bold px-3 py-1 rounded-full border ${
                    guest.ready
                      ? "bg-turf/15 text-turf border-turf/40"
                      : "bg-surface text-muted border-line"
                  }`}
                >
                  {guest.ready ? "READY" : "NOT READY"}
                </span>

                {isHost && (
                  <button
                    type="button"
                    onClick={() => onHostKick(guest.guestId)}
                    title="Kick player"
                    className="p-1.5 text-muted hover:text-ball border border-transparent hover:border-line rounded transition-colors"
                  >
                    <UserX className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 text-center text-xs text-muted border border-dashed border-line rounded-[12px]">
              Waiting for friend to enter code...
            </div>
          )}
        </div>

        {/* FORMAT SELECTOR (Host editable until both ready) */}
        <div className="flex flex-col gap-2 bg-surface-2 border border-line rounded-[12px] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-heading font-bold uppercase tracking-wider text-muted">
              Match Format Rules
            </span>
            {!isHost && (
              <span className="text-[10px] text-muted italic">
                Host sets the rules
              </span>
            )}
          </div>

          {/* Wickets */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="font-semibold text-muted uppercase">Wickets:</span>
            <div className="flex gap-1.5">
              {([1, 2, 3] as WicketsOption[]).map((w) => (
                <button
                  key={w}
                  type="button"
                  disabled={!canChangeFormat}
                  onClick={() => onFormatUpdate({ ...format, maxWickets: w })}
                  className={`px-3 py-1 rounded-[8px] text-xs font-heading font-bold tabular-nums border transition-all ${
                    format.maxWickets === w
                      ? "bg-turf text-ink border-turf"
                      : "bg-surface text-muted border-line hover:text-chalk disabled:hover:text-muted"
                  }`}
                >
                  {w} {w === 1 ? "Wkt" : "Wkts"}
                </button>
              ))}
            </div>
          </div>

          {/* Overs */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="font-semibold text-muted uppercase">Overs:</span>
            <div className="flex gap-1.5">
              {([1, 2, 3] as OversOption[]).map((o) => (
                <button
                  key={o}
                  type="button"
                  disabled={!canChangeFormat}
                  onClick={() => onFormatUpdate({ ...format, maxOvers: o })}
                  className={`px-3 py-1 rounded-[8px] text-xs font-heading font-bold tabular-nums border transition-all ${
                    format.maxOvers === o
                      ? "bg-turf text-ink border-turf"
                      : "bg-surface text-muted border-line hover:text-chalk disabled:hover:text-muted"
                  }`}
                >
                  {o} {o === 1 ? "Over" : "Overs"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* READY BUTTON (Min 56px height) */}
        <Button
          variant={isReady ? "secondary" : "primary"}
          size="lg"
          fullWidth
          onClick={onToggleReady}
          className={`font-heading font-black text-xl uppercase tracking-wider min-h-[56px] flex items-center justify-center gap-2 ${
            isReady ? "border-turf text-turf bg-turf/10" : ""
          }`}
        >
          {isReady ? <Check className="w-6 h-6 stroke-[3]" /> : null}
          <span>{isReady ? "READY! (TAP TO CANCEL)" : "I'M READY"}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onLeaveRoom}
          className="text-xs text-muted hover:text-chalk uppercase -mt-2"
        >
          Leave Room
        </Button>
      </div>
      <Toast toasts={toasts} onDismiss={onDismissToast} />
    </main>
  );
}
