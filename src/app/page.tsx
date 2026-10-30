"use client";

import React, { useEffect, useState } from "react";
import { useLiveMatchStore } from "@/lib/store/liveMatchStore";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { LandingScreen } from "@/components/LandingScreen";
import { SearchingOverlay } from "@/components/SearchingOverlay";
import { TossScreen } from "@/components/TossScreen";
import { LiveMatchScreen } from "@/components/LiveMatchScreen";
import { InningsBreakScreen } from "@/components/InningsBreakScreen";
import { ResultBanner } from "@/components/ResultBanner";
import { HowToPlayModal } from "@/components/HowToPlayModal";
import { ReportModal } from "@/components/ReportModal";
import { PlayWithFriendModal } from "@/components/PlayWithFriendModal";
import { CameraCheckModal } from "@/components/CameraCheckModal";

export default function HomePage() {
  const {
    screen,
    matchId,
    guestId,
    guestName,
    mode,
    opponentName,
    userRole,
    isBotMatch,
    isGestureMode,
    setIsGestureMode,
    gameState,
    isRulesOpen,
    setIsRulesOpen,
    isReportOpen,
    setIsReportOpen,
    playAgainWaiting,
    seriesScore,
    gameNumber,
    initGuestSession,
    startMatchmaking,
    cancelMatchmaking,
    requestPlayAgain,
    submitTossCall,
    submitTossPick,
    submitTossDecision,
    startSecondInnings,
    resetToLanding,
    forfeitCurrentMatch,
  } = useLiveMatchStore();

  // Logo / Home click: drop whatever is on screen (search, toss, result...) and show the landing page
  const goHome = async () => {
    if (screen === "searching") {
      await cancelMatchmaking();
    } else if (screen === "toss" || screen === "innings_break") {
      await forfeitCurrentMatch("Opponent left the match");
    }
    resetToLanding();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const [isFriendModalOpen, setIsFriendModalOpen] = useState<boolean>(false);
  const [isCameraCheckOpen, setIsCameraCheckOpen] = useState<boolean>(false);

  useEffect(() => {
    initGuestSession();
  }, [initGuestSession]);

  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden bg-ink text-chalk selection:bg-turf selection:text-ink ${
        screen === "match" ? "h-[100dvh] max-h-[100dvh]" : "min-h-screen"
      }`}
    >
      {/* Navigation Bar (visible during landing, result, and toss) */}
      {screen !== "match" && (
        <Navbar
          guestName={guestName}
          onOpenRules={() => setIsRulesOpen(true)}
          onOpenHardwareCheck={() => setIsCameraCheckOpen(true)}
          onGoHome={goHome}
        />
      )}

      {/* Main Dynamic Viewport */}
      <div className={`flex w-full flex-1 flex-col justify-center ${screen === "match" ? "h-full min-h-0 overflow-hidden" : ""}`}>
        {screen === "landing" && (
          <LandingScreen
            onFindMatch={() => startMatchmaking(false)}
            onPlayVsBot={() => startMatchmaking(true)}
            onPlayWithFriend={() => setIsFriendModalOpen(true)}
            onOpenRules={() => setIsRulesOpen(true)}
            onOpenHardwareCheck={() => setIsCameraCheckOpen(true)}
          />
        )}

        {screen === "searching" && (
          <SearchingOverlay
            mode={useLiveMatchStore.getState().mode}
            onCancel={cancelMatchmaking}
            onPlayVsBot={() => startMatchmaking(true)}
          />
        )}

        {screen === "toss" && gameState && (
          <main className="p-4 flex items-center justify-center">
            <TossScreen
              gameState={gameState}
              userPlayerId={userRole}
              onCall={submitTossCall}
              onPick={submitTossPick}
              onDecision={submitTossDecision}
            />
          </main>
        )}

        {screen === "match" && <LiveMatchScreen />}

        {screen === "innings_break" && gameState && (
          <main className="p-4 flex items-center justify-center">
            <InningsBreakScreen
              gameState={gameState}
              userPlayerId={userRole}
              onStartInnings2={startSecondInnings}
            />
          </main>
        )}

        {screen === "result" && gameState && (
          <main className="p-4 flex items-center justify-center">
            <ResultBanner
              state={gameState}
              userPlayerId={userRole}
              onPlayAgain={requestPlayAgain}
              onFindNewOpponent={() => {
                resetToLanding();
                startMatchmaking(false);
              }}
              onBackToLobby={resetToLanding}
              playAgainWaiting={playAgainWaiting}
              seriesScoreText={
                gameNumber > 1 || Object.keys(seriesScore || {}).length > 0
                  ? `Series: You ${guestId ? seriesScore[guestId] || 0 : 0} – ${
                      Object.entries(seriesScore || {}).find(([id]) => id !== guestId)?.[1] || 0
                    } ${opponentName || "Opponent"} (Game ${gameNumber})`
                  : undefined
              }
            />
          </main>
        )}
      </div>

      {/* Responsive Branded Footer */}
      {screen === "landing" && (
        <Footer variant="minimal" onOpenRules={() => setIsRulesOpen(true)} />
      )}

      {/* Modals */}
      <HowToPlayModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />

      {matchId && (
        <ReportModal
          isOpen={isReportOpen}
          matchId={matchId}
          opponentName={opponentName}
          onClose={() => setIsReportOpen(false)}
        />
      )}

      <PlayWithFriendModal
        isOpen={isFriendModalOpen}
        onClose={() => setIsFriendModalOpen(false)}
        guestId={guestId}
        guestName={guestName}
        defaultMode={mode}
      />

      <CameraCheckModal
        isOpen={isCameraCheckOpen}
        initialMode={isGestureMode ? "video" : "game_only"}
        onReady={(selectedMode) => {
          setIsCameraCheckOpen(false);
          setIsGestureMode(selectedMode === "video");
          startMatchmaking(false);
        }}
        onCancel={() => setIsCameraCheckOpen(false)}
      />
    </div>
  );
}
