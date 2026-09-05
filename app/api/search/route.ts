import { PairCapError } from "@/lib/dates";
import { ScrapeError } from "@/lib/playwright-flights";
import { runSearchAll, validateQuery } from "@/lib/search";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const query = validateQuery(body);
    const result = await runSearchAll(query, request.signal);
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 400 });
    }
    return Response.json(result);
  } catch (error) {
    if (error instanceof PairCapError) {
      return Response.json({ error: error.message, pairCount: error.pairCount }, { status: 400 });
    }
    if (error instanceof ScrapeError) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    const message = error instanceof Error ? error.message : "Search failed";
    const status = message.includes("must") || message.includes("Invalid") ? 400 : 500;
    return Response.json({ error: message }, { status });
  }
}
