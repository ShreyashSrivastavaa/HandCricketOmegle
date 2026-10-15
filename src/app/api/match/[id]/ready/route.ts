import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleReadyConfirm } from "@/lib/server/match";

const readySchema = z.object({
  guestId: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params;
    const body = await req.json();
    const parsed = readySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await handleReadyConfirm(matchId, parsed.data.guestId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[Ready API Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to confirm ready state" },
      { status: 500 }
    );
  }
}
