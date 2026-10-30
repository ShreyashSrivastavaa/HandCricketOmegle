import { NextRequest, NextResponse } from "next/server";
import { getOrCreateGuestSession } from "@/lib/server/session";
import { pollMatchmakingQueue } from "@/lib/server/match";

export const runtime = "nodejs";

const MODES = ["sudden_death", "classic", "endless"] as const;

export async function GET(req: NextRequest) {
  const { session } = getOrCreateGuestSession(req);
  const params = req.nextUrl.searchParams;
  const clientGuestId = params.get("guestId") || session.guestId;
  const guestName = params.get("guestName")?.trim() || session.guestName;
  const modeParam = params.get("mode");
  const mode = MODES.find((m) => m === modeParam) ?? "sudden_death";

  try {
    const result = await pollMatchmakingQueue(clientGuestId, guestName, mode);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[Queue Status API] Error:", err);
    return NextResponse.json({ status: "queued" });
  }
}
