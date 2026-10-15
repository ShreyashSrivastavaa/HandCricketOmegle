"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/lib/store/gameStore";
import { ScoreBar } from "./ScoreBar";
import { BallStrip } from "./BallStrip";
import { HandTile } from "./HandTile";
import { NumberPad } from "./NumberPad";
import { TimerRing } from "./TimerRing";
import { TossScreen } from "./TossScreen";
import { InningsBreakScreen } from "./InningsBreakScreen";
import { ResultBanner } from "./ResultBanner";
import { ArrowLeft } from "lucide-react";

export const GameScreen: React.FC = () => {
  const router = useRouter();
  const {
    gameState,
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
  } = useGameStore();

  if (!gameState) return null;

  const handleBackHome = () => {
    resetToLobby();
    router.push("/");
  };

  // 1. TOSS SCREEN
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
          HandCricketOmegle • Authoritative Coin Toss
        </footer>
      </main>
    );
  }

  // 2. INNINGS BREAK SCREEN
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
          HandCricketOmegle • Target Set
        </footer>
      </main>
    );
  }

  // 3. MATCH ENDED RESULT SCREEN
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
          HandCricketOmegle • Match Complete
        </footer>
      </main>
    );
  }

  // 4. ACTIVE GAMEPLAY
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
      {/* 1. TOP HEADER & SCOREBAR */}
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

      {/* 2. CENTER: THE ARENA (Two HandTiles facing each other) */}
      <section
        className="w-full my-3 sm:my-5 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 relative"
        aria-label="Hand Cricket Duel Arena"
      >
        {/* Opponent tile (Top on mobile, Right on desktop) */}
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

        {/* Arena Centerpiece: Timer / Countdown / Outcome */}
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

        {/* You tile (Bottom on mobile, Left on desktop) */}
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

      {/* 3. BOTTOM: NumberPad */}
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
    </main>
  );
};
