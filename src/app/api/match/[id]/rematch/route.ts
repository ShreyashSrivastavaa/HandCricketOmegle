import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleRematch } from "@/lib/server/match";

const rematchSchema = z.object({
  guestId: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params;
    const body = await req.json();
    const parsed = rematchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await handleRematch(matchId, parsed.data.guestId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[Rematch API Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process rematch" },
      { status: 500 }
    );
  }
}
