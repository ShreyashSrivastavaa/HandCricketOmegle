import { NextRequest } from "next/server";
import { getLocalEventEmitter } from "@/lib/server/ably";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const channel = req.nextUrl.searchParams.get("channel");
  if (!channel) {
    return new Response("Missing channel parameter", { status: 400 });
  }

  const emitter = getLocalEventEmitter();

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Initial connection ping
      controller.enqueue(
        encoder.encode(`event: ping\ndata: {"status":"connected","channel":"${channel}"}\n\n`)
      );

      const listener = (msg: { event: string; data: any }) => {
        try {
          const payload = `event: ${msg.event}\ndata: ${JSON.stringify(msg.data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Closed stream
        }
      };

      emitter.on(channel, listener);

      // Keepalive comment every 15s
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(pingInterval);
        }
      }, 15000);

      req.signal.addEventListener("abort", () => {
        clearInterval(pingInterval);
        emitter.off(channel, listener);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
