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
 * Supports:
 * - Metered.ca TURN (METERED_API_KEY, METERED_APP_NAME)
 * - Twilio Network Traversal (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
 * - HMAC Ephemeral TURN (TURN_URLS, TURN_SECRET - e.g. Cloudflare Calls / Coturn)
 * - Static TURN (TURN_URLS, TURN_USERNAME, TURN_CREDENTIAL)
 * - Public STUN fallback
 */
export async function POST(req: NextRequest) {
  const { session } = getOrCreateGuestSession(req);

  const rl = await rateLimit(req, session.guestId);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many ICE requests" }, { status: 429 });
  }

  const now = Math.floor(Date.now() / 1000);
  const ttlSeconds = 3600; // 1 hour validity
  const expiresAt = (now + ttlSeconds) * 1000;

  // 1. Metered.ca Managed TURN Provider
  const meteredApiKey = process.env.METERED_API_KEY;
  if (meteredApiKey) {
    try {
      const appName = process.env.METERED_APP_NAME || "metered";
      const meteredRes = await fetch(
        `https://${appName}.metered.live/api/v1/turn/credentials?apiKey=${meteredApiKey}`,
        { signal: AbortSignal.timeout(3500) }
      );
      if (meteredRes.ok) {
        const meteredServers = await meteredRes.json();
        if (Array.isArray(meteredServers) && meteredServers.length > 0) {
          return NextResponse.json<IceServerResponse>({
            iceServers: [...DEFAULT_STUN_SERVERS, ...meteredServers],
            expiresAt,
          });
        }
      }
    } catch (err) {
      console.warn("[ICE API] Metered fetch failed, trying next provider:", err);
    }
  }

  // 2. Twilio Network Traversal Service
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
  if (twilioSid && twilioAuth) {
    try {
      const basicAuth = Buffer.from(`${twilioSid}:${twilioAuth}`).toString("base64");
      const twilioRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Tokens.json`,
        {
          method: "POST",
          headers: { Authorization: `Basic ${basicAuth}` },
          signal: AbortSignal.timeout(3500),
        }
      );
      if (twilioRes.ok) {
        const data = await twilioRes.json();
        if (Array.isArray(data.ice_servers) && data.ice_servers.length > 0) {
          return NextResponse.json<IceServerResponse>({
            iceServers: data.ice_servers,
            expiresAt,
          });
        }
      }
    } catch (err) {
      console.warn("[ICE API] Twilio fetch failed, trying next provider:", err);
    }
  }

  // 3. Time-limited ephemeral HMAC credentials (e.g. coturn / Cloudflare / Xirsys)
  const turnUrls = process.env.TURN_URLS || process.env.TURN_SERVER_URL;
  const turnSecret = process.env.TURN_SECRET;
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

  // 4. Static server-side TURN credentials
  const turnUsername = process.env.TURN_USERNAME;
  const turnCredential = process.env.TURN_CREDENTIAL;
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

  // 5. Fallback to Google Public STUN
  return NextResponse.json<IceServerResponse>({
    iceServers: DEFAULT_STUN_SERVERS,
    expiresAt,
  });
}
