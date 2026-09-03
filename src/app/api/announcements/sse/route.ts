import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

let clients: ReadableStreamDefaultController[] = [];

export async function GET(req: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      clients.push(controller);
      const heartbeat = setInterval(() => {
        controller.enqueue(`data: ${JSON.stringify({ type: "heartbeat" })}\n\n`);
      }, 30000);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        clients = clients.filter((c) => c !== controller);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export function emitAnnouncementChanged() {
  const message = `data: ${JSON.stringify({ type: "announcement_changed" })}\n\n`;
  clients.forEach((client) => {
    try {
      client.enqueue(message);
    } catch {
      // ignorar clientes cerrados
    }
  });
}