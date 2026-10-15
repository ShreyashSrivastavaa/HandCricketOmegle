import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateGuestSession } from "@/lib/server/session";
import {
  handleBallMove,
  handleTossAction,
  handleStartSecondInnings,
  getMatch,
} from "@/lib/server/match";
import { rateLimit } from "@/lib/server/ratelimit";

export const runtime = "nodejs";

const moveSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("ball"),
    ballIndex: z.number().int().nonnegative(),
    pick: z.number().int().min(1).max(6),
    seq: z.number().int().nonnegative().optional(),
  }),
  z.object({
    kind: z.literal("toss"),
    action: z.discriminatedUnion("type", [
      z.object({
        type: z.literal("call"),
        value: z.enum(["odd", "even"]),
      }),
      z.object({
        type: z.literal("pick"),
        value: z.number().int().min(1).max(6),
      }),
      z.object({
        type: z.literal("decision"),
        value: z.enum(["bat", "bowl"]),
      }),
    ]),
    seq: z.number().int().nonnegative().optional(),
  }),
  z.object({
    kind: z.literal("start_innings_2"),
    seq: z.number().int().nonnegative().optional(),
  }),
]);

// Fallback schema if kind is omitted
const simpleBallSchema = z.object({
  ballIndex: z.number().int().nonnegative(),
  pick: z.number().int().min(1).max(6),
  seq: z.number().int().nonnegative().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session } = getOrCreateGuestSession(req);
  const { id: matchId } = await params;

  const rl = await rateLimit(req, session.guestId);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many moves submitted. Slow down." }, { status: 429 });
  }

  const json = await req.json().catch(() => ({}));
  let parsedMove = moveSchema.safeParse(json);

  // If not discriminated by kind, check if it's a simple ball move
  if (!parsedMove.success) {
    const simple = simpleBallSchema.safeParse(json);
    if (simple.success) {
      parsedMove = {
        success: true,
        data: {
          kind: "ball",
          ballIndex: simple.data.ballIndex,
          pick: simple.data.pick,
          seq: simple.data.seq,
        },
      } as any;
    }
  }

  if (!parsedMove.success) {
    return NextResponse.json(
      { error: "Invalid move payload", details: parsedMove.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const data = parsedMove.data;

    if (data.kind === "ball") {
      const result = await handleBallMove(
        matchId,
        session.guestId,
        data.ballIndex,
        data.pick,
        data.seq
      );
      return NextResponse.json(result);
    }

    if (data.kind === "toss") {
      const result = await handleTossAction(
        matchId,
        session.guestId,
        data.action,
        data.seq
      );
      return NextResponse.json(result);
    }

    if (data.kind === "start_innings_2") {
      const result = await handleStartSecondInnings(matchId, session.guestId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unknown action kind" }, { status: 400 });
  } catch (err: any) {
    console.error(`[Match Move API] Match ${matchId} error:`, err);
    return NextResponse.json(
      { error: err.message || "Failed to process move" },
      { status: 400 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session } = getOrCreateGuestSession(req);
  const { id: matchId } = await params;

  const match = await getMatch(matchId);
  if (!match) {
    return NextResponse.json({ error: "Match not found or expired" }, { status: 404 });
  }

  const isP1 = match.player1.guestId === session.guestId;
  const isP2 = match.player2.guestId === session.guestId;

  return NextResponse.json({
    id: match.id,
    format: match.format,
    player1Name: match.player1.name,
    player2Name: match.player2.name,
    isUserP1: isP1,
    role: isP1 ? "p1" : isP2 ? "p2" : null,
    isBot: match.isBot,
    gameState: match.gameState,
    currentBallIndex: match.currentBallIndex,
  });
}
