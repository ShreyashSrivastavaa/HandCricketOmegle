import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleRematch } from "@/lib/server/match";
import { getOrCreateGuestSession, attachSessionCookies } from "@/lib/server/session";

const rematchSchema = z.object({
  guestId: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params;
    const { session } = getOrCreateGuestSession(req);
    const body = await req.json().catch(() => ({}));
    const parsed = rematchSchema.safeParse(body);

    const effectiveGuestId = (parsed.success && parsed.data.guestId) ? parsed.data.guestId : session.guestId;

    if (!effectiveGuestId) {
      return NextResponse.json(
        { error: "Guest ID required" },
        { status: 400 }
      );
    }

    const result = await handleRematch(matchId, effectiveGuestId);
    const res = NextResponse.json(result);
    attachSessionCookies(res, session);
    return res;
  } catch (err: any) {
    console.error("[Rematch API Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process rematch" },
      { status: 500 }
    );
  }
}
