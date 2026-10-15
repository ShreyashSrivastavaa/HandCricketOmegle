import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getOrCreateGuestSession } from "@/lib/server/session";
import { rateLimit } from "@/lib/server/ratelimit";

export const runtime = "nodejs";

export interface IceServerResponse {
  iceServers: RTCIceServer[];
  expiresAt: number;
}

const DEFAULT_STUN_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

/**
 * Authenticated serverless handler returning short-lived ICE / TURN credentials.
 * Fixes SEC-01 by preventing credential exposure via client-side NEXT_PUBLIC_* bundles.
 */
export async function POST(req: NextRequest) {
  const { session } = getOrCreateGuestSession(req);

  const rl = await rateLimit(req, session.guestId);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many ICE requests" }, { status: 429 });
  }

  const turnUrls = process.env.TURN_URLS || process.env.TURN_SERVER_URL;
  const turnSecret = process.env.TURN_SECRET;
  const turnUsername = process.env.TURN_USERNAME;
  const turnCredential = process.env.TURN_CREDENTIAL;

  const now = Math.floor(Date.now() / 1000);
  const ttlSeconds = 3600; // 1 hour validity
  const expiresAt = (now + ttlSeconds) * 1000;

  // 1. Time-limited ephemeral HMAC credentials (e.g. coturn / Cloudflare / Xirsys)
  if (turnUrls && turnSecret) {
    const username = `${now + ttlSeconds}:${session.guestId}`;
    const credential = crypto
      .createHmac("sha1", turnSecret)
      .update(username)
      .digest("base64");

    const urls = turnUrls.split(",").map((u) => u.trim());

    return NextResponse.json<IceServerResponse>({
      iceServers: [
        ...DEFAULT_STUN_SERVERS,
        {
          urls,
          username,
          credential,
        },
      ],
      expiresAt,
    });
  }

  // 2. Static server-side TURN credentials (if configured in environment)
  if (turnUrls && turnUsername && turnCredential) {
    const urls = turnUrls.split(",").map((u) => u.trim());

    return NextResponse.json<IceServerResponse>({
      iceServers: [
        ...DEFAULT_STUN_SERVERS,
        {
          urls,
          username: turnUsername,
          credential: turnCredential,
        },
      ],
      expiresAt,
    });
  }

  // 3. Fallback to reliable public STUN servers
  return NextResponse.json<IceServerResponse>({
    iceServers: DEFAULT_STUN_SERVERS,
    expiresAt,
  });
}
