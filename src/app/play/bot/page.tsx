"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/lib/store/gameStore";
import { ScoreBar } from "@/components/ScoreBar";
import { BallStrip } from "@/components/BallStrip";
import { HandTile } from "@/components/HandTile";
import { NumberPad } from "@/components/NumberPad";
import { TimerRing } from "@/components/TimerRing";
import { TossScreen } from "@/components/TossScreen";
import { InningsBreakScreen } from "@/components/InningsBreakScreen";
import { ResultBanner } from "@/components/ResultBanner";
import { Button } from "@/components/Button";
import { Toast } from "@/components/Toast";
import { WicketsOption, OversOption } from "@/lib/game-core/types";
import { ArrowLeft, Play, ArrowRight } from "lucide-react";

export default function PlayBotPage() {
  const router = useRouter();
  const {
    gameState,
    format,
    setWickets,
    setOvers,
    startBotMatch,
    userPlayerId,
    userPick,
    isUserLocked,
    botPick,
    userTileState,
    botTileState,
    revealCountdown,
    outcomeText,
    isOutcomeWicket,
    screenShake,
    timerSeconds,
    tapToLock,
    toggleTapToLock,
    selectUserNumber,
    confirmUserLock,
    callToss,
    pickTossNumber,
    chooseTossDecision,
    startInnings2,
    rematch,
    resetToLobby,
    toasts,
    removeToast,
  } = useGameStore();

  const [inSetup, setInSetup] = useState<boolean>(!gameState);

  useEffect(() => {
    if (!gameState) {
      setInSetup(true);
    } else {
      setInSetup(false);
    }
  }, [gameState]);

  const handleStartMatch = () => {
    startBotMatch(format);
    setInSetup(false);
  };

  const handleBackHome = () => {
    resetToLobby();
    router.push("/");
  };

  // 1. SETUP SCREEN (Wickets 1/2/3, Overs 1/2/3) if match not started
  if (inSetup || !gameState) {
    return (
      <main className="min-h-screen bg-ink text-chalk flex flex-col justify-center items-center p-4 select-none">
        <div className="w-full max-w-sm bg-surface border border-line rounded-[12px] p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <button
              type="button"
              onClick={handleBackHome}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-chalk uppercase transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Lobby</span>
            </button>
            <span className="text-xs font-heading font-black text-turf uppercase tracking-wider">
              VS Bot Mode
            </span>
          </div>

          <div className="flex flex-col gap-1 text-center">
            <h1 className="font-heading font-black text-3xl uppercase tracking-tight text-chalk">
              Match Setup
            </h1>
            <p className="text-xs text-muted">
              Choose overs and wickets limit to enter the arena.
            </p>
          </div>

          {/* Wickets */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-muted uppercase tracking-wider">
              Wickets Limit
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([1, 2, 3] as WicketsOption[]).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWickets(w)}
                  className={`py-2 rounded-[12px] border text-sm font-heading font-bold tabular-nums transition-all ${
                    format.maxWickets === w
                      ? "bg-surface-2 border-turf text-turf"
                      : "bg-surface-2/40 border-line text-muted hover:text-chalk"
                  }`}
                >
                  {w} {w === 1 ? "Wkt" : "Wkts"}
                </button>
              ))}
            </div>
          </div>

          {/* Overs */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-muted uppercase tracking-wider">
              Overs Limit (6 balls/over)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([1, 2, 3] as OversOption[]).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOvers(o)}
                  className={`py-2 rounded-[12px] border text-sm font-heading font-bold tabular-nums transition-all ${
                    format.maxOvers === o
                      ? "bg-surface-2 border-turf text-turf"
                      : "bg-surface-2/40 border-line text-muted hover:text-chalk"
                  }`}
                >
                  {o} {o === 1 ? "Over" : "Overs"}
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleStartMatch}
            className="font-heading font-black text-xl uppercase tracking-wider flex items-center justify-center gap-2 mt-2"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>START MATCH &amp; TOSS</span>
          </Button>
        </div>
        <Toast toasts={toasts} onDismiss={removeToast} />
      </main>
    );
  }

  // 2. TOSS SCREEN
  if (
    gameState.phase === "toss_call" ||
    gameState.phase === "toss_pick" ||
    gameState.phase === "toss_decision"
  ) {
    return (
      <main className="min-h-screen bg-ink text-chalk flex flex-col p-4 sm:p-6 justify-between max-w-4xl mx-auto select-none">
        <header className="flex items-center justify-between pb-4 border-b border-line w-full">
          <button
            type="button"
            onClick={handleBackHome}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-chalk uppercase transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quit to Lobby</span>
          </button>
          <span className="text-xs font-heading font-black tracking-wider uppercase text-turf">
            Coin Toss
          </span>
        </header>

        <div className="flex-1 flex items-center justify-center my-6 w-full">
          <TossScreen
            gameState={gameState}
            onCall={callToss}
            onPick={pickTossNumber}
            onDecision={chooseTossDecision}
          />
        </div>

        <footer className="text-center text-xs text-muted">
          Hand Cricket Arena • Authoritative Coin Toss
        </footer>
        <Toast toasts={toasts} onDismiss={removeToast} />
      </main>
    );
  }

  // 3. INNINGS BREAK SCREEN
  if (gameState.phase === "innings_break" && gameState.innings2) {
    return (
      <main className="min-h-screen bg-ink text-chalk flex flex-col p-4 sm:p-6 justify-between max-w-4xl mx-auto select-none">
        <header className="flex items-center justify-between pb-4 border-b border-line w-full">
          <button
            type="button"
            onClick={handleBackHome}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-chalk uppercase transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Lobby</span>
          </button>
          <span className="text-xs font-heading font-black tracking-wider uppercase text-amber">
            Target Equation
          </span>
        </header>

        <div className="flex-1 flex items-center justify-center my-6 w-full">
          <InningsBreakScreen
            gameState={gameState}
            userPlayerId={userPlayerId}
            onStartInnings2={startInnings2}
          />
        </div>

        <footer className="text-center text-xs text-muted">
          Hand Cricket Arena • Target Set
        </footer>
        <Toast toasts={toasts} onDismiss={removeToast} />
      </main>
    );
  }

  // 4. MATCH ENDED RESULT SCREEN
  if (gameState.phase === "match_ended") {
    return (
      <main className="min-h-screen bg-ink text-chalk flex flex-col p-4 sm:p-6 justify-between max-w-4xl mx-auto select-none">
        <header className="flex items-center justify-between pb-4 border-b border-line w-full">
          <button
            type="button"
            onClick={handleBackHome}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-chalk uppercase transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Home</span>
          </button>
          <span className="text-xs font-heading font-black tracking-wider uppercase text-chalk">
            Final Result
          </span>
        </header>

        <div className="flex-1 flex items-center justify-center my-6 w-full">
          <ResultBanner
            state={gameState}
            userPlayerId={userPlayerId}
            onRematch={rematch}
            onBackToLobby={handleBackHome}
          />
        </div>

        <footer className="text-center text-xs text-muted">
          Hand Cricket Arena • Match Complete
        </footer>
        <Toast toasts={toasts} onDismiss={removeToast} />
      </main>
    );
  }

  // 5. ACTIVE GAME SCREEN
  const activeInnings =
    gameState.currentInnings === 1 ? gameState.innings1 : gameState.innings2!;
  const isUserBatting = activeInnings.battingPlayer === userPlayerId;
  const userRole = isUserBatting ? "batting" : "bowling";
  const botRole = isUserBatting ? "bowling" : "batting";

  const currentOverIndex = Math.floor(activeInnings.balls / 6);

  return (
    <main
      className={`min-h-screen bg-ink text-chalk flex flex-col justify-between max-w-4xl mx-auto p-3 sm:p-5 select-none transition-transform ${
        screenShake ? "animate-shake" : ""
      }`}
    >
      {/* TOP HEADER: Navigation, Role Banner, ScoreBar, BallStrip */}
      <header className="w-full flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs pb-1">
          <button
            type="button"
            onClick={handleBackHome}
            className="flex items-center gap-1.5 text-muted hover:text-chalk transition-colors font-medium py-1 px-2.5 rounded-full border border-line bg-surface"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Lobby</span>
          </button>

          {/* ROLE BANNER (Always visible) */}
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

          <div className="text-[11px] text-muted font-heading uppercase tracking-wider">
            VS BOT
          </div>
        </div>

        {/* ScoreBar */}
        <ScoreBar state={gameState} userPlayerId={userPlayerId} />

        {/* BallStrip */}
        <BallStrip
          currentOver={activeInnings.currentOver}
          overIndex={currentOverIndex}
          maxOvers={gameState.format.maxOvers}
        />
      </header>

      {/* CENTER: THE ARENA (Two HandTiles facing each other; stacked on mobile with opponent on top, side-by-side on desktop) */}
      <section
        className="w-full my-3 sm:my-5 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 relative"
        aria-label="Hand Cricket Arena Duel"
      >
        {/* Opponent Tile (Top on mobile, Right on desktop, mirrored) */}
        <div className="w-full sm:w-1/2 order-1 sm:order-2">
          <HandTile
            playerName={gameState.player2Name}
            isUser={false}
            role={botRole}
            state={botTileState}
            pick={botTileState !== "empty" && botTileState !== "locked" ? botPick : null}
            showUserPreview={false}
            countdownNumber={revealCountdown}
            mirrored={true}
          />
        </div>

        {/* Centerpiece: Timer / Countdown / Outcome Display */}
        <div className="order-2 sm:order-none z-10 flex flex-col items-center justify-center my-1 sm:my-0 px-2 sm:px-3">
          {outcomeText ? (
            <div
              className={`px-4 py-2 rounded-[12px] border font-heading font-black text-2xl sm:text-3xl uppercase tracking-wider tabular-nums ${
                isOutcomeWicket
                  ? "bg-ball text-white border-ball animate-shake shadow-lg"
                  : "bg-amber text-ink border-amber shadow-lg"
              }`}
            >
              {outcomeText}
            </div>
          ) : revealCountdown !== null ? (
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-amber bg-surface-2 flex items-center justify-center">
              <span className="font-heading font-black text-3xl sm:text-4xl text-amber tabular-nums">
                {revealCountdown}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <TimerRing
                remainingSeconds={timerSeconds}
                totalSeconds={8}
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
            role={userRole}
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
          selectedNumber={userPick}
          onSelectNumber={selectUserNumber}
          onConfirmLock={confirmUserLock}
          isLocked={isUserLocked}
          disabled={userTileState !== "empty"}
          tapToLock={tapToLock}
          onToggleTapToLock={toggleTapToLock}
        />
      </footer>

      <Toast toasts={toasts} onDismiss={removeToast} />
    </main>
  );
}
