import { NextRequest } from "next/server";
import { getRun } from "@/lib/store";
import { SSEEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const run = getRun(id);

  if (!run) {
    return new Response(
      `data: ${JSON.stringify({ type: "error", message: "Run not found" })}\n\n`,
      {
        status: 404,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
        },
      }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      const send = (ev: SSEEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
        } catch {
          closed = true;
        }
      };

      // Replay all historical events so late connections or reconnects never miss anything
      for (const pastEvent of run.events) {
        send(pastEvent);
      }

      run.listeners.add(send);

      const heartbeat = setInterval(() => {
        if (closed) {
          clearInterval(heartbeat);
          return;
        }
        try {
          controller.enqueue(encoder.encode(`: keepalive ${Date.now()}\n\n`));
        } catch {
          closed = true;
          clearInterval(heartbeat);
        }
      }, 5000);

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(heartbeat);
        run.listeners.delete(send);
        try {
          controller.close();
        } catch {
          // ignore
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
