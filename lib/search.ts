import { destinationAirports } from "./airports";
import { cacheGet, cacheSet, outboundCacheKey, returnCacheKey } from "./cache";
import { PairCapError, assertPairCap, expandDatePairs } from "./dates";
import {
  itineraryReject,
  outboundLegReject,
  rankItineraries,
  tallyReasons,
} from "./filter";
import { itineraryGoogleFlightsUrl, mergeRoundTrip, scrapedToLeg } from "./normalize";
import { optionFingerprint, type ScrapedOption } from "./parse-card";
import { scrapeOutbound, scrapeReturns, type ScrapedPage } from "./playwright-flights";
import {
  MAX_DATE_PAIRS,
  MAX_RETURN_LOOKUPS_PER_PAIR,
  SEARCH_CONCURRENCY,
  isWeekendOverlap,
  type DatePair,
  type Dump,
  type Itinerary,
  type PairResult,
  type RejectReason,
  type SearchEvent,
  type SearchQuery,
} from "./types";

const IATA = /^[A-Z]{3}$/;

export function validateQuery(body: unknown): SearchQuery {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid search body");
  }
  const raw = body as Record<string, unknown>;
  const origin = String(raw.origin ?? "").trim().toUpperCase();
  const destination = String(raw.destination ?? "").trim();
  if (!IATA.test(origin)) {
    throw new Error("Origin must be a 3-letter IATA code");
  }
  if (!destination) {
    throw new Error("Destination is required");
  }
  const dests = destinationAirports(destination, origin);
  if (dests.length === 0) {
    throw new Error("Unknown destination, or it is the same as origin");
  }

  const maxStops = Number(raw.maxStops);
  if (!Number.isInteger(maxStops) || maxStops < 0 || maxStops > 2) {
    throw new Error("maxStops must be 0, 1, or 2");
  }

  let maxLayoverMinutes: number | null = null;
  if (raw.maxLayoverMinutes !== null && raw.maxLayoverMinutes !== "" && raw.maxLayoverMinutes != null) {
    const value = Number(raw.maxLayoverMinutes);
    if (!Number.isFinite(value) || value < 0) {
      throw new Error("maxLayoverMinutes must be a positive number or empty");
    }
    maxLayoverMinutes = value;
  }

  const minStayDays = optionalDays(raw.minStayDays, "minStayDays");
  const maxStayDays = optionalDays(raw.maxStayDays, "maxStayDays");
  if (minStayDays != null && maxStayDays != null && minStayDays > maxStayDays) {
    throw new Error("minStayDays cannot be greater than maxStayDays");
  }

  const weekendOverlap = isWeekendOverlap(raw.weekendOverlap)
    ? raw.weekendOverlap
    : "any";

  return {
    origin,
    destination,
    outboundFrom: String(raw.outboundFrom ?? ""),
    outboundTo: String(raw.outboundTo ?? ""),
    returnFrom: String(raw.returnFrom ?? ""),
    returnTo: String(raw.returnTo ?? ""),
    outbound: asWindow(raw.outbound),
    inbound: asWindow(raw.inbound),
    maxStops,
    maxLayoverMinutes,
    minStayDays,
    maxStayDays,
    weekendOverlap,
    allowAirportChange: Boolean(raw.allowAirportChange),
  };
}

function optionalDays(value: unknown, field: string): number | null {
  if (value === null || value === "" || value == null) return null;
  const days = Number(value);
  if (!Number.isInteger(days) || days < 1) {
    throw new Error(`${field} must be a positive integer or empty`);
  }
  return days;
}

function asWindow(value: unknown): SearchQuery["outbound"] {
  const raw = (value ?? {}) as Record<string, unknown>;
  return {
    departAfter: String(raw.departAfter ?? ""),
    departBefore: String(raw.departBefore ?? ""),
    arriveBefore: String(raw.arriveBefore ?? ""),
  };
}

async function poolEach<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index++;
      await fn(items[current]);
    }
  }
  const workers = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
}

async function loadPage(args: {
  key: string;
  fetch: () => Promise<ScrapedPage>;
}): Promise<{ page: ScrapedPage; cached: boolean; credited: boolean }> {
  const hit = await cacheGet<ScrapedPage>(args.key);
  if (hit) {
    return { page: hit, cached: true, credited: false };
  }
  const page = await args.fetch();
  if (page.options.length > 0) {
    await cacheSet(args.key, page);
  }
  return { page, cached: false, credited: true };
}

function dump(reason: RejectReason): Dump {
  return { reason };
}

type PairQueue = {
  push: (item: PairResult) => void;
  next: () => Promise<PairResult>;
};

function createPairQueue(): PairQueue {
  const items: PairResult[] = [];
  const waiters: Array<(value: PairResult) => void> = [];
  return {
    push(item) {
      const waiter = waiters.shift();
      if (waiter) waiter(item);
      else items.push(item);
    },
    next() {
      const item = items.shift();
      if (item) return Promise.resolve(item);
      return new Promise((resolve) => waiters.push(resolve));
    },
  };
}

async function searchPair(
  query: SearchQuery,
  pair: DatePair,
  signal?: AbortSignal,
): Promise<PairResult> {
  let creditsUsed = 0;
  let cached = true;
  const dumped: Dump[] = [];

  const outboundSearch = await loadPage({
    key: outboundCacheKey({
      origin: query.origin,
      destination: query.destination,
      outboundDate: pair.outboundDate,
      returnDate: pair.returnDate,
    }),
    fetch: () =>
      scrapeOutbound({
        origin: query.origin,
        destination: query.destination,
        outboundDate: pair.outboundDate,
        returnDate: pair.returnDate,
      }),
  });
  if (outboundSearch.credited) creditsUsed += 1;
  if (!outboundSearch.cached) cached = false;

  if (outboundSearch.page.error && outboundSearch.page.options.length === 0) {
    return {
      ...pair,
      destination: query.destination,
      cached: outboundSearch.cached,
      creditsUsed,
      itineraries: [],
      dumped,
      error: outboundSearch.page.error,
    };
  }

  type OutboundCandidate = { option: ScrapedOption };

  const candidates: OutboundCandidate[] = [];
  for (const option of outboundSearch.page.options) {
    const leg = scrapedToLeg(option);
    const reason = outboundLegReject(leg, query);
    if (reason) {
      dumped.push(dump(reason));
      continue;
    }
    candidates.push({ option });
  }

  candidates.sort((a, b) => a.option.price - b.option.price);
  const toExpand = candidates.slice(0, MAX_RETURN_LOOKUPS_PER_PAIR);
  for (let i = 0; i < candidates.length - toExpand.length; i++) {
    dumped.push(dump("missing_return"));
  }

  const itineraries: Itinerary[] = [];

  for (const candidate of toExpand) {
    if (signal?.aborted) break;
    const fingerprint = [
      pair.outboundDate,
      pair.returnDate,
      optionFingerprint(candidate.option),
    ].join("|");

    const returnSearch = await loadPage({
      key: returnCacheKey(fingerprint),
      fetch: () =>
        scrapeReturns({
          origin: query.origin,
          destination: query.destination,
          outboundDate: pair.outboundDate,
          returnDate: pair.returnDate,
          outbound: candidate.option,
        }),
    });
    if (returnSearch.credited) creditsUsed += 1;
    if (!returnSearch.cached) cached = false;

    if (returnSearch.page.options.length === 0) {
      dumped.push(dump("missing_return"));
      continue;
    }

    const outboundLeg = scrapedToLeg({
      ...candidate.option,
      flights:
        returnSearch.page.selectedOutbound?.flights?.length
          ? returnSearch.page.selectedOutbound.flights
          : candidate.option.flights,
    });
    for (const option of returnSearch.page.options) {
      const inbound = scrapedToLeg(option);
      const itinerary = mergeRoundTrip({
        outbound: outboundLeg,
        inbound,
        price: option.price,
        currency: "TWD",
        outboundDate: pair.outboundDate,
        returnDate: pair.returnDate,
        googleFlightsUrl: itineraryGoogleFlightsUrl({
          outbound: outboundLeg,
          inbound,
          outboundDate: pair.outboundDate,
          returnDate: pair.returnDate,
          bookingUrl: option.bookingUrl,
        }),
      });
      const reason = itineraryReject(itinerary, query);
      if (reason) {
        dumped.push(dump(reason));
        continue;
      }
      itineraries.push(itinerary);
    }
  }

  return {
    ...pair,
    destination: query.destination,
    cached,
    creditsUsed,
    itineraries: rankItineraries(itineraries),
    dumped,
  };
}

export async function* runSearch(
  query: SearchQuery,
  signal?: AbortSignal,
): AsyncGenerator<SearchEvent> {
  let pairs: DatePair[];
  try {
    pairs = expandDatePairs(
      query.outboundFrom,
      query.outboundTo,
      query.returnFrom,
      query.returnTo,
      {
        minDays: query.minStayDays,
        maxDays: query.maxStayDays,
        weekendOverlap: query.weekendOverlap,
      },
    );
    assertPairCap(pairs.length);
  } catch (error) {
    const message =
      error instanceof PairCapError || error instanceof Error
        ? error.message
        : "Invalid date window";
    yield { type: "error", message };
    return;
  }

  if (pairs.length === 0) {
    yield {
      type: "error",
      message:
        "No valid date pairs. Return must be after outbound, and stay / weekend filters must fit.",
    };
    return;
  }

  const dests = destinationAirports(query.destination, query.origin);
  if (dests.length === 0) {
    yield { type: "error", message: "Unknown destination, or it is the same as origin" };
    return;
  }

  const jobs = pairs.flatMap((pair) =>
    dests.map((dest) => ({ pair, destIata: dest.iata })),
  );
  try {
    assertPairCap(jobs.length);
  } catch (error) {
    const message =
      error instanceof PairCapError || error instanceof Error
        ? error.message
        : "Too many searches";
    yield { type: "error", message };
    return;
  }

  yield { type: "start", pairCount: jobs.length, maxPairs: MAX_DATE_PAIRS };

  const queue = createPairQueue();
  let finished = 0;
  let creditsUsed = 0;
  let cachedHits = 0;
  let kept = 0;
  const dumped: Dump[] = [];

  const running = poolEach(jobs, SEARCH_CONCURRENCY, async (job) => {
    const { pair, destIata } = job;
    const pairQuery = { ...query, destination: destIata };
    if (signal?.aborted) {
      queue.push({
        ...pair,
        destination: destIata,
        cached: false,
        creditsUsed: 0,
        itineraries: [],
        dumped: [],
        error: "aborted",
      });
      return;
    }
    try {
      queue.push(await searchPair(pairQuery, pair, signal));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Search failed";
      queue.push({
        ...pair,
        destination: destIata,
        cached: false,
        creditsUsed: 0,
        itineraries: [],
        dumped: [],
        error: message,
      });
    }
  });

  while (finished < jobs.length) {
    const result = await queue.next();
    finished += 1;
    creditsUsed += result.creditsUsed;
    if (result.cached) cachedHits += 1;
    kept += result.itineraries.length;
    dumped.push(...result.dumped);
    yield { type: "pair", pair: result };
  }

  await running;

  yield {
    type: "done",
    creditsUsed,
    cachedHits,
    kept,
    dumped: dumped.length,
    dumpedReasons: tallyReasons(dumped),
  };
}

export async function runSearchAll(query: SearchQuery, signal?: AbortSignal) {
  const itineraries: Itinerary[] = [];
  let summary: Extract<SearchEvent, { type: "done" }> | null = null;
  let error: string | null = null;

  for await (const event of runSearch(query, signal)) {
    if (event.type === "error") error = event.message;
    if (event.type === "pair") itineraries.push(...event.pair.itineraries);
    if (event.type === "done") summary = event;
  }

  if (error) {
    return { ok: false as const, error };
  }

  return {
    ok: true as const,
    itineraries: rankItineraries(itineraries),
    summary,
  };
}
