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

export default function HomePage() {
  const {
    screen,
    matchId,
    guestId,
    guestName,
    mode,
    opponentName,
    userRole,
    gameState,
    isRulesOpen,
    setIsRulesOpen,
    isReportOpen,
    setIsReportOpen,
    initGuestSession,
    startMatchmaking,
    cancelMatchmaking,
    submitTossCall,
    submitTossPick,
    submitTossDecision,
    startSecondInnings,
    resetToLanding,
  } = useLiveMatchStore();

  const [isFriendModalOpen, setIsFriendModalOpen] = useState<boolean>(false);

  useEffect(() => {
    initGuestSession();
  }, [initGuestSession]);

  return (
    <div className="min-h-screen bg-ink text-chalk flex flex-col justify-between selection:bg-turf selection:text-ink">
      {/* Navigation Bar (visible during landing, result, and toss) */}
      {screen !== "match" && (
        <header className="w-full px-2 pt-2">
          <Navbar onOpenRules={() => setIsRulesOpen(true)} />
        </header>
      )}

      {/* Main Dynamic Viewport */}
      <div className="flex-1 flex flex-col justify-center w-full">
        {screen === "landing" && (
          <LandingScreen
            onFindMatch={() => startMatchmaking(false)}
            onPlayVsBot={() => startMatchmaking(true)}
            onPlayWithFriend={() => setIsFriendModalOpen(true)}
            onOpenRules={() => setIsRulesOpen(true)}
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
              onPlayAgain={() => startMatchmaking(false)}
              onFindNewOpponent={() => startMatchmaking(false)}
              onBackToLobby={resetToLanding}
            />
          </main>
        )}
      </div>

      {/* Responsive Branded Footer */}
      {screen === "landing" && (
        <Footer onOpenRules={() => setIsRulesOpen(true)} />
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
    </div>
  );
}
