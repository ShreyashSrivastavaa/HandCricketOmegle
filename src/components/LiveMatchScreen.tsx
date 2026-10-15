import React, { useState } from "react";
import { useLiveMatchStore } from "@/lib/store/liveMatchStore";
import { ScoreBar } from "./ScoreBar";
import { BallStrip } from "./BallStrip";
import { HandTile } from "./HandTile";
import { NumberPad } from "./NumberPad";
import { TimerRing } from "./TimerRing";
import { EmojiReactions } from "./EmojiReactions";
import { Flag, LogOut, AlertTriangle, ShieldAlert } from "lucide-react";
import { playClickSound } from "@/lib/client/audio";

export const LiveMatchScreen: React.FC = () => {
  const {
    gameState,
    userRole,
    opponentName,
    isBotMatch,
    userPick,
    isUserLocked,
    opponentPick,
    userTileState,
    opponentTileState,
    revealCountdown,
    outcomeText,
    isOutcomeWicket,
    screenShake,
    timerSeconds,
    opponentDisconnectSeconds,
    activeReactions,
    submitBallPick,
    sendReaction,
    forfeitCurrentMatch,
    setIsReportOpen,
  } = useLiveMatchStore();

  const [tapToLock, setTapToLock] = useState<boolean>(true);
  const [selectedNum, setSelectedNum] = useState<number | null>(null);

  if (!gameState) return null;

  const activeInnings =
    gameState.currentInnings === 1 ? gameState.innings1 : gameState.innings2!;
  const isUserBatting = activeInnings.battingPlayer === userRole;
  const userRoleStr = isUserBatting ? "batting" : "bowling";
  const opponentRoleStr = isUserBatting ? "bowling" : "batting";

  const currentOverIndex = Math.floor(activeInnings.balls / 6);
  const opponentDisplayName = opponentName || "Opponent";

  const handleSelectNumber = (num: number) => {
    setSelectedNum(num);
  };

  const handleConfirmLock = () => {
    if (selectedNum && !isUserLocked) {
      submitBallPick(selectedNum);
    }
  };

  const handleSkipOrLeave = () => {
    playClickSound();
    if (window.confirm("Are you sure you want to forfeit this match?")) {
      forfeitCurrentMatch("Forfeited by player");
    }
  };

  return (
    <main
      className={`min-h-screen bg-ink text-chalk flex flex-col justify-between max-w-4xl mx-auto p-3 sm:p-5 select-none transition-transform ${
        screenShake ? "animate-shake" : ""
      }`}
    >
      {/* Disconnect Grace Timer Banner */}
      {opponentDisconnectSeconds !== null && (
        <div className="w-full bg-ball/20 border border-ball/50 rounded-xl px-4 py-2 flex items-center justify-between text-xs text-ball font-semibold mb-2 animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Opponent connection lost! Waiting for reconnect...</span>
          </div>
          <span className="font-heading font-black text-sm tabular-nums">
            {opponentDisconnectSeconds}s to forfeit
          </span>
        </div>
      )}

      {/* TOP HEADER: Navigation, Role Banner, ScoreBar, BallStrip */}
      <header className="w-full flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs pb-1">
          {/* Role Banner */}
          <div
            className={`flex items-center gap-2 px-3.5 py-1 rounded-full border font-heading font-black tracking-wider text-xs sm:text-sm uppercase ${
              isUserBatting
                ? "bg-turf/15 text-turf border-turf/40"
                : "bg-sky/15 text-sky border-sky/40"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isUserBatting ? "bg-turf" : "bg-sky"
              }`}
            />
            <span>{isUserBatting ? "YOU ARE BATTING" : "YOU ARE BOWLING"}</span>
          </div>

          {/* Action Tools: Emoji Reactions, Report, Forfeit */}
          <div className="flex items-center gap-2">
            <EmojiReactions
              onSendReaction={sendReaction}
              activeReactions={activeReactions}
            />

            {!isBotMatch && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setIsReportOpen(true);
                }}
                className="p-1.5 rounded-full border border-line bg-surface text-muted hover:text-ball hover:border-ball/40 transition-colors"
                title="Report Opponent"
                aria-label="Report Opponent"
              >
                <Flag className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={handleSkipOrLeave}
              className="flex items-center gap-1 py-1 px-2.5 rounded-full border border-line bg-surface text-muted hover:text-chalk transition-colors font-semibold text-[11px] uppercase"
              title="Skip / Forfeit Match"
            >
              <LogOut className="w-3 h-3" />
              <span className="hidden sm:inline">Skip</span>
            </button>
          </div>
        </div>

        {/* ScoreBar */}
        <ScoreBar state={gameState} userPlayerId={userRole} />

        {/* BallStrip */}
        <BallStrip
          currentOver={activeInnings.currentOver}
          overIndex={currentOverIndex}
          maxOvers={gameState.format.maxOvers}
        />
      </header>

      {/* CENTER: THE ARENA (Two HandTiles facing each other) */}
      <section
        className="w-full my-3 sm:my-5 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 relative"
        aria-label="Hand Cricket Duel Arena"
      >
        {/* Opponent Tile (Top on mobile, Right on desktop) */}
        <div className="w-full sm:w-1/2 order-1 sm:order-2">
          <HandTile
            playerName={opponentDisplayName}
            isUser={false}
            role={opponentRoleStr}
            state={opponentTileState}
            pick={opponentPick}
            showUserPreview={false}
            countdownNumber={revealCountdown}
            mirrored={true}
          />
        </div>

        {/* Centerpiece: Timer / Countdown / Outcome */}
        <div className="order-2 sm:order-none z-10 flex flex-col items-center justify-center my-1 sm:my-0 px-2 sm:px-3">
          {outcomeText ? (
            <div
              className={`px-5 py-2.5 rounded-[14px] border font-heading font-black text-2xl sm:text-3xl uppercase tracking-wider tabular-nums ${
                isOutcomeWicket
                  ? "bg-ball text-white border-ball animate-shake shadow-lg"
                  : "bg-amber text-ink border-amber shadow-lg"
              }`}
            >
              {outcomeText}
            </div>
          ) : revealCountdown !== null ? (
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-amber bg-surface-2 flex items-center justify-center shadow-lg">
              <span className="font-heading font-black text-3xl sm:text-4xl text-amber tabular-nums">
                {revealCountdown}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <TimerRing
                remainingSeconds={timerSeconds}
                totalSeconds={10}
                size={54}
                strokeWidth={4}
              />
              <span className="text-[10px] font-heading uppercase text-muted tracking-wider">
                Turn Limit
              </span>
            </div>
          )}
        </div>

        {/* You Hand Tile (Bottom on mobile, Left on desktop) */}
        <div className="w-full sm:w-1/2 order-3 sm:order-1">
          <HandTile
            playerName={gameState.player1Name}
            isUser={true}
            role={userRoleStr}
            state={userTileState}
            pick={userPick}
            showUserPreview={true}
            countdownNumber={revealCountdown}
            mirrored={false}
          />
        </div>
      </section>

      {/* BOTTOM: NumberPad */}
      <footer className="w-full pb-2 sm:pb-4 pt-1">
        <NumberPad
          selectedNumber={userPick || selectedNum}
          onSelectNumber={(num) => {
            handleSelectNumber(num);
            if (tapToLock) {
              submitBallPick(num);
            }
          }}
          onConfirmLock={handleConfirmLock}
          isLocked={isUserLocked}
          disabled={userTileState !== "empty"}
          tapToLock={tapToLock}
          onToggleTapToLock={() => setTapToLock(!tapToLock)}
        />
      </footer>
    </main>
  );
};
