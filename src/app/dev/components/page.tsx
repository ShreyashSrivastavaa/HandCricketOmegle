"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Hand } from "@/components/Hand";
import { Button } from "@/components/Button";
import { PlayerChip } from "@/components/PlayerChip";
import { ScoreBar } from "@/components/ScoreBar";
import { BallStrip } from "@/components/BallStrip";
import { HandTile } from "@/components/HandTile";
import { NumberPad } from "@/components/NumberPad";
import { TimerRing } from "@/components/TimerRing";
import { ResultBanner } from "@/components/ResultBanner";
import { Toast, ToastMessage } from "@/components/Toast";
import type { GameState, BallOutcome } from "@/lib/game-core/types";
import { ArrowLeft } from "lucide-react";

export default function DevComponentsPage() {
  const [selectedNum, setSelectedNum] = useState<number | null>(4);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [tapToLock, setTapToLock] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([
    { id: "1", message: "Dev Preview active", type: "success" },
    { id: "2", message: "8s timer auto-pick notice", type: "warning" },
  ]);

  // Mock game state for ScoreBar
  const mockGameState: GameState = {
    format: { maxWickets: 2, maxOvers: 2 },
    phase: "innings_2",
    player1Name: "You",
    player2Name: "Bot Arena",
    tossCaller: "p1",
    tossCall: "odd",
    tossPicks: { p1: 3, p2: 2 },
    tossWinner: "p1",
    tossDecision: "bowl",
    currentInnings: 2,
    innings1: {
      battingPlayer: "p2",
      bowlingPlayer: "p1",
      score: 22,
      wickets: 2,
      balls: 11,
      overHistory: [],
      currentOver: [],
    },
    innings2: {
      battingPlayer: "p1",
      bowlingPlayer: "p2",
      score: 11,
      wickets: 0,
      balls: 3,
      target: 23,
      overHistory: [],
      currentOver: [
        {
          innings: 2,
          overIndex: 0,
          ballInOver: 1,
          totalBallsInInnings: 1,
          batterPick: 4,
          bowlerPick: 2,
          isWicket: false,
          runsScored: 4,
          isOverComplete: false,
          isInningsComplete: false,
          isMatchComplete: false,
          commentary: "Four runs",
        },
        {
          innings: 2,
          overIndex: 0,
          ballInOver: 2,
          totalBallsInInnings: 2,
          batterPick: 1,
          bowlerPick: 6,
          isWicket: false,
          runsScored: 1,
          isOverComplete: false,
          isInningsComplete: false,
          isMatchComplete: false,
          commentary: "Single",
        },
        {
          innings: 2,
          overIndex: 0,
          ballInOver: 3,
          totalBallsInInnings: 3,
          batterPick: 6,
          bowlerPick: 1,
          isWicket: false,
          runsScored: 6,
          isOverComplete: false,
          isInningsComplete: false,
          isMatchComplete: false,
          commentary: "Sixer",
        },
      ],
    },
    lastOutcome: null,
    winner: null,
    resultSummary: null,
  };

  const mockBalls: BallOutcome[] = [
    {
      innings: 1,
      overIndex: 0,
      ballInOver: 1,
      totalBallsInInnings: 1,
      batterPick: 1,
      bowlerPick: 2,
      isWicket: false,
      runsScored: 1,
      isOverComplete: false,
      isInningsComplete: false,
      isMatchComplete: false,
      commentary: "",
    },
    {
      innings: 1,
      overIndex: 0,
      ballInOver: 2,
      totalBallsInInnings: 2,
      batterPick: 4,
      bowlerPick: 5,
      isWicket: false,
      runsScored: 4,
      isOverComplete: false,
      isInningsComplete: false,
      isMatchComplete: false,
      commentary: "",
    },
    {
      innings: 1,
      overIndex: 0,
      ballInOver: 3,
      totalBallsInInnings: 3,
      batterPick: 3,
      bowlerPick: 3,
      isWicket: true,
      runsScored: 0,
      isOverComplete: false,
      isInningsComplete: false,
      isMatchComplete: false,
      commentary: "",
    },
    {
      innings: 1,
      overIndex: 0,
      ballInOver: 4,
      totalBallsInInnings: 4,
      batterPick: 6,
      bowlerPick: 2,
      isWicket: false,
      runsScored: 6,
      isOverComplete: false,
      isInningsComplete: false,
      isMatchComplete: false,
      commentary: "",
    },
  ];

  return (
    <div className="min-h-screen bg-ink text-chalk p-6 max-w-5xl mx-auto flex flex-col gap-10">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line pb-4">
        <div>
          <span className="text-xs font-heading font-black text-turf tracking-wider uppercase">
            Design System Preview
          </span>
          <h1 className="text-3xl font-heading font-black uppercase tracking-tight">
            Component Library Gallery (/dev/components)
          </h1>
        </div>
        <Link
          href="/"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line bg-surface text-xs font-semibold text-muted hover:text-chalk uppercase transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Lobby</span>
        </Link>
      </div>

      {/* 1. Hand Gestures */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-heading font-black uppercase text-turf border-b border-line pb-1">
          1. &lt;Hand /&gt; (6 Gestures + Mirrored Opponent Variant)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((v) => (
            <div
              key={v}
              className="p-4 bg-surface border border-line rounded-[12px] flex flex-col items-center gap-2"
            >
              <div className="flex items-center gap-3">
                <div className="text-turf">
                  <Hand value={v} size={48} />
                </div>
                <div className="text-sky">
                  <Hand value={v} size={48} mirrored />
                </div>
              </div>
              <span className="font-heading font-bold text-lg tabular-nums">
                Number {v}
              </span>
              <span className="text-[10px] text-muted uppercase">
                Turf (You) vs Sky (Opponent)
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Buttons */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-heading font-black uppercase text-turf border-b border-line pb-1">
          2. &lt;Button /&gt; (Variants &amp; States)
        </h2>
        <div className="flex flex-wrap gap-3 items-center">
          <Button variant="primary" size="sm">Primary Sm</Button>
          <Button variant="primary" size="md">Primary Md</Button>
          <Button variant="primary" size="lg">Primary Lg</Button>
          <Button variant="secondary" size="md">Secondary</Button>
          <Button variant="ghost" size="md">Ghost Link</Button>
          <Button variant="danger" size="md">Danger Out</Button>
          <Button variant="primary" size="md" loading>Loading</Button>
          <Button variant="primary" size="md" disabled>Disabled</Button>
        </div>
      </section>

      {/* 3. PlayerChip */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-heading font-black uppercase text-turf border-b border-line pb-1">
          3. &lt;PlayerChip /&gt; (Geometric Initials Avatar + Roles)
        </h2>
        <div className="flex flex-wrap gap-4 items-center">
          <PlayerChip name="You" isUser={true} role="batting" isLocked={true} />
          <PlayerChip name="Bot Arena" isUser={false} role="bowling" isLocked={false} />
          <PlayerChip name="Player 2" isUser={false} role="batting" isLocked={true} />
        </div>
      </section>

      {/* 4. ScoreBar */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-heading font-black uppercase text-turf border-b border-line pb-1">
          4. &lt;ScoreBar /&gt; (Innings 2 Chase equation)
        </h2>
        <ScoreBar state={mockGameState} userPlayerId="p1" />
      </section>

      {/* 5. BallStrip */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-heading font-black uppercase text-turf border-b border-line pb-1">
          5. &lt;BallStrip /&gt; (Over Deliveries: Runs, W, Pending)
        </h2>
        <BallStrip currentOver={mockBalls} overIndex={0} maxOvers={2} />
      </section>

      {/* 6. HandTile States */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-heading font-black uppercase text-turf border-b border-line pb-1">
          6. &lt;HandTile /&gt; (All 6 States: empty, locked, revealing, revealed, out, scored)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <HandTile playerName="You" isUser={true} role="batting" state="empty" pick={null} />
          <HandTile playerName="Bot Arena" isUser={false} role="bowling" state="locked" pick={null} />
          <HandTile playerName="You" isUser={true} role="batting" state="revealing" pick={null} countdownNumber={2} />
          <HandTile playerName="You" isUser={true} role="batting" state="revealed" pick={4} />
          <HandTile playerName="You" isUser={true} role="batting" state="out" pick={5} />
          <HandTile playerName="You" isUser={true} role="batting" state="scored" pick={6} />
        </div>
      </section>

      {/* 7. NumberPad */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-heading font-black uppercase text-turf border-b border-line pb-1">
          7. &lt;NumberPad /&gt; (Interactive Tap Targets 1-6)
        </h2>
        <div className="max-w-xl mx-auto w-full p-4 bg-surface border border-line rounded-[12px]">
          <NumberPad
            selectedNumber={selectedNum}
            onSelectNumber={(n) => setSelectedNum(n)}
            onConfirmLock={() => setIsLocked(!isLocked)}
            isLocked={isLocked}
            tapToLock={tapToLock}
            onToggleTapToLock={() => setTapToLock(!tapToLock)}
          />
        </div>
      </section>

      {/* 8. TimerRing */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-heading font-black uppercase text-turf border-b border-line pb-1">
          8. &lt;TimerRing /&gt; (Green &gt;3s, Amber at 3s, Red at 1s)
        </h2>
        <div className="flex items-center gap-6 p-4 bg-surface border border-line rounded-[12px]">
          <div className="flex flex-col items-center gap-1">
            <TimerRing remainingSeconds={7} totalSeconds={8} size={64} />
            <span className="text-xs text-muted">7s (Turf Green)</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <TimerRing remainingSeconds={3} totalSeconds={8} size={64} />
            <span className="text-xs text-amber font-bold">3s (Amber Warning)</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <TimerRing remainingSeconds={1} totalSeconds={8} size={64} />
            <span className="text-xs text-ball font-bold">1s (Red Urgent)</span>
          </div>
        </div>
      </section>

      {/* 9. ResultBanner */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-heading font-black uppercase text-turf border-b border-line pb-1">
          9. &lt;ResultBanner /&gt; (Win / Lose / Tie)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ResultBanner
            result="win"
            summaryText="You won by 14 runs!"
            state={mockGameState}
            onRematch={() => {}}
            onBackToLobby={() => {}}
          />
          <ResultBanner
            result="lose"
            summaryText="Bot won by 1 wicket!"
            state={mockGameState}
            onRematch={() => {}}
            onBackToLobby={() => {}}
          />
          <ResultBanner
            result="tie"
            summaryText="Match Tied! Scores level."
            state={mockGameState}
            onRematch={() => {}}
            onBackToLobby={() => {}}
          />
        </div>
      </section>

      {/* 10. Toast */}
      <section className="flex flex-col gap-3 mb-10">
        <h2 className="text-lg font-heading font-black uppercase text-turf border-b border-line pb-1">
          10. &lt;Toast /&gt; (Notifications)
        </h2>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              setToasts((prev) => [
                ...prev,
                { id: `${Date.now()}`, message: "New wicket fallen!", type: "error" },
              ])
            }
          >
            Trigger Wicket Toast
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              setToasts((prev) => [
                ...prev,
                { id: `${Date.now()}`, message: "Boundary hit! +4", type: "info" },
              ])
            }
          >
            Trigger Boundary Toast
          </Button>
        </div>
      </section>

      <Toast toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}
