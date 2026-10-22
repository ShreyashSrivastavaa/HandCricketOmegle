import * as Ably from "ably";
import { EventEmitter } from "events";
import { getEnv } from "../env";

declare global {
  // eslint-disable-next-line no-var
  var __hand_cricket_emitter__: EventEmitter | undefined;
}

export function getLocalEventEmitter(): EventEmitter {
  if (!globalThis.__hand_cricket_emitter__) {
    globalThis.__hand_cricket_emitter__ = new EventEmitter();
    globalThis.__hand_cricket_emitter__.setMaxListeners(200);
  }
  return globalThis.__hand_cricket_emitter__;
}

let ablyRestInstance: Ably.Rest | null = null;

export function getAblyRest(): Ably.Rest | null {
  if (ablyRestInstance) return ablyRestInstance;

  try {
    const env = getEnv();
    if (!env.ABLY_API_KEY || env.ABLY_API_KEY.includes("mock")) {
      return null;
    }
    ablyRestInstance = new Ably.Rest({ key: env.ABLY_API_KEY });
    return ablyRestInstance;
  } catch (err) {
    console.warn("[Hand Cricket Live] Ably REST init skipped:", err);
    return null;
  }
}

export async function createAblyTokenRequest(
  guestId: string,
  matchId?: string
): Promise<Ably.TokenRequest | { token: string; clientId: string; capability: string }> {
  const ably = getAblyRest();

  const capability: Record<string, string[]> = {
    [`user:${guestId}`]: ["subscribe", "publish"],
    lobby: ["subscribe", "presence"],
    "room:*": ["subscribe", "publish", "presence"],
  };

  if (matchId) {
    capability[`match:${matchId}`] = ["subscribe", "publish", "presence"];
  } else {
    capability["match:*"] = ["subscribe", "publish", "presence"];
  }

  if (!ably) {
    // Return mock token response for dev / offline testing
    return {
      token: `mock_token_${guestId}_${Date.now()}`,
      clientId: guestId,
      capability: JSON.stringify(capability),
    };
  }

  const tokenRequest = await ably.auth.createTokenRequest({
    clientId: guestId,
    capability: JSON.stringify(capability),
    ttl: 3600 * 1000, // 1 hour
  });

  return tokenRequest;
}

export async function publishToAbly(
  channelName: string,
  eventName: string,
  data: any
): Promise<void> {
  // Always broadcast on local server event bus (for local dev, offline fallback & SSE)
  const emitter = getLocalEventEmitter();
  emitter.emit(channelName, { event: eventName, data });
  emitter.emit(`${channelName}:${eventName}`, data);

  const ably = getAblyRest();
  if (!ably) {
    // Offline or mock mode
    console.log(`[Realtime Broadcast] [${channelName}] ${eventName}`);
    return;
  }

  try {
    const channel = ably.channels.get(channelName);
    await channel.publish(eventName, data);
  } catch (err) {
    console.error(`[Ably] Failed to publish to ${channelName}:`, err);
  }
}
