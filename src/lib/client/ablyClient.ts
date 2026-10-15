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

function createMockChannel(name: string) {
  return {
    name,
    subscribe: () => {},
    unsubscribe: () => {},
    publish: async () => {},
    presence: {
      enter: async () => {},
      leave: async () => {},
      get: async () => [{ clientId: "self" }],
      subscribe: () => {},
      unsubscribe: () => {},
    },
  };
}

export function getClientAbly(): any {
  if (typeof window === "undefined") {
    return {
      channels: { get: createMockChannel },
      close: () => {},
    };
  }

  if (ablyClient) return ablyClient;

  const AblyGlobal = (window as any).Ably;
  if (AblyGlobal && AblyGlobal.Realtime) {
    try {
      ablyClient = new AblyGlobal.Realtime({
        authUrl: "/api/ably-token",
        autoConnect: true,
      });
      return ablyClient;
    } catch (err) {
      console.warn("[Ably] Error creating Realtime instance:", err);
    }
  }

  // Pre-instantiate mock client so synchronous calls don't crash
  const mockClient = {
    channels: { get: createMockChannel },
    close: () => {},
  };
  ablyClient = mockClient;

  // Asynchronously initialize when script is ready
  loadAblyScript().then((AblyLib) => {
    if (AblyLib && AblyLib.Realtime) {
      try {
        ablyClient = new AblyLib.Realtime({
          authUrl: "/api/ably-token",
          autoConnect: true,
        });
      } catch {}
    }
  });

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
