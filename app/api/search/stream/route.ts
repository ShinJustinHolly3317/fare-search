import { PairCapError } from "@/lib/dates";
import { ScrapeError } from "@/lib/playwright-flights";
import { runSearch, searchOptionsFromBody, validateQuery } from "@/lib/search";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let query;
  try {
    query = validateQuery(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid search";
    return Response.json({ error: message }, { status: 400 });
  }

  const options = searchOptionsFromBody(body);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };
      try {
        for await (const payload of runSearch(query, request.signal, options)) {
          send(payload.type, payload);
          if (payload.type === "error") break;
        }
      } catch (error) {
        const message =
          error instanceof PairCapError || error instanceof ScrapeError || error instanceof Error
            ? error.message
            : "Search failed";
        send("error", { type: "error", message });
      } finally {
        controller.close();
      }
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
