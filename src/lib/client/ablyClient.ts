// Browser Ably Realtime client loader
// Loads the battle-tested, pre-compiled browser bundle to avoid SWC class inheritance bundling bugs in Next.js 15.

let ablyClient: any = null;

export function loadAblyScript(): Promise<any> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if ((window as any).Ably) return Promise.resolve((window as any).Ably);

  return new Promise((resolve) => {
    const existing = document.querySelector('script[src="/ably.min.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve((window as any).Ably));
      return;
    }
    const script = document.createElement("script");
    script.src = "/ably.min.js";
    script.async = true;
    script.onload = () => resolve((window as any).Ably);
    script.onerror = () => {
      console.warn("[Ably] /ably.min.js could not be loaded, using fallback.");
      resolve(null);
    };
    document.head.appendChild(script);
  });
}

const activeSseChannels = new Map<string, any>();

function createMockChannel(name: string) {
  if (activeSseChannels.has(name)) {
    return activeSseChannels.get(name);
  }

  const listeners = new Map<string, Set<(msg: any) => void>>();
  let eventSource: EventSource | null = null;

  const ensureEventSource = () => {
    if (typeof window === "undefined" || eventSource) return;
    try {
      eventSource = new EventSource(`/api/realtime?channel=${encodeURIComponent(name)}`);

      const forwardEvent = (eventName: string, data: any) => {
        const cbs = listeners.get(eventName);
        if (cbs) {
          cbs.forEach((cb) => {
            try {
              cb({ name: eventName, data });
            } catch (err) {
              console.error(`[SSE ${name}] Handler error:`, err);
            }
          });
        }
      };

      const knownEvents = [
        "match-found",
        "toss-call-submitted",
        "toss-pick-submitted",
        "toss-decision-submitted",
        "player-locked",
        "ball-resolved",
        "second-innings-started",
        "match-forfeited",
        "reaction",
      ];

      for (const ev of knownEvents) {
        eventSource.addEventListener(ev, (e: MessageEvent) => {
          try {
            const parsed = JSON.parse(e.data);
            forwardEvent(ev, parsed);
          } catch {
            forwardEvent(ev, e.data);
          }
        });
      }

      eventSource.onerror = () => {
        // Native EventSource automatically handles reconnect
      };
    } catch (err) {
      console.warn(`[Realtime Channel ${name}] EventSource connection error:`, err);
    }
  };

  const channelObj = {
    name,
    subscribe: (eventName: string, callback: (msg: any) => void) => {
      ensureEventSource();
      if (!listeners.has(eventName)) {
        listeners.set(eventName, new Set());
      }
      listeners.get(eventName)!.add(callback);

      if (eventSource) {
        eventSource.addEventListener(eventName, (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            callback({ name: eventName, data });
          } catch {
            callback({ name: eventName, data: e.data });
          }
        });
      }
    },
    unsubscribe: (eventName?: string) => {
      if (eventName) {
        listeners.delete(eventName);
      } else {
        listeners.clear();
        if (eventSource) {
          try {
            eventSource.close();
          } catch {}
          eventSource = null;
        }
        activeSseChannels.delete(name);
      }
    },
    publish: async (_eventName: string, _data: any) => {
      // Moves and actions are submitted via API endpoints directly
    },
    presence: {
      enter: async () => {},
      leave: async () => {},
      get: async () => [{ clientId: "self" }],
      subscribe: () => {},
      unsubscribe: () => {},
    },
  };

  activeSseChannels.set(name, channelObj);
  return channelObj;
}

export function getClientAbly(): any {
  if (typeof window === "undefined") {
    return {
      channels: { get: createMockChannel },
      close: () => {},
    };
  }

  if (ablyClient) return ablyClient;

  // If real Ably library is available on window, connect with token auth
  const AblyGlobal = (window as any).Ably;
  if (AblyGlobal && typeof AblyGlobal.Realtime === "function") {
    try {
      ablyClient = new AblyGlobal.Realtime({
        authUrl: "/api/ably-token",
        authMethod: "GET",
      });
      return ablyClient;
    } catch (e) {
      console.warn("[Ably Client] Realtime init error, using fallback:", e);
    }
  }

  // Pre-load script if not yet loaded so it connects soon
  loadAblyScript().then((AblyLib) => {
    if (AblyLib && typeof AblyLib.Realtime === "function" && (!ablyClient || !ablyClient.connection)) {
      try {
        ablyClient = new AblyLib.Realtime({
          authUrl: "/api/ably-token",
          authMethod: "GET",
        });
      } catch (err) {
        console.warn("[Ably Client] Async Realtime upgrade error:", err);
      }
    }
  });

  // Use the native SSE realtime channel fallback while Ably script is loading
  const sseClient = {
    channels: { get: createMockChannel },
    close: () => {
      for (const ch of activeSseChannels.values()) {
        ch.unsubscribe();
      }
      activeSseChannels.clear();
    },
  };
  ablyClient = sseClient;

  return ablyClient;
}

export function closeClientAbly(): void {
  if (ablyClient && typeof ablyClient.close === "function") {
    try {
      ablyClient.close();
    } catch {}
  }
  ablyClient = null;
}

/**
 * Subscribes to the lobby presence to track online players in real time.
 */
export function subscribeToLobbyPresence(
  onCountChange: (count: number) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  loadAblyScript().then((AblyLib) => {
    if (!AblyLib || !AblyLib.Realtime) {
      onCountChange(1);
      return;
    }

    try {
      const client = getClientAbly();
      if (!client || !client.channels) {
        onCountChange(1);
        return;
      }

      const lobby = client.channels.get("lobby");
      const updateCount = async () => {
        try {
          const members = await lobby.presence.get();
          onCountChange(Math.max(1, members ? members.length : 1));
        } catch {
          onCountChange(1);
        }
      };

      lobby.presence?.enter?.({ clientTime: Date.now() })?.catch?.(() => {});
      lobby.presence?.subscribe?.("enter", updateCount);
      lobby.presence?.subscribe?.("leave", updateCount);
      updateCount();
    } catch {
      onCountChange(1);
    }
  });

  return () => {
    try {
      const client = getClientAbly();
      const lobby = client?.channels?.get?.("lobby");
      lobby?.presence?.unsubscribe?.();
      lobby?.presence?.leave?.()?.catch?.(() => {});
    } catch {}
  };
}
