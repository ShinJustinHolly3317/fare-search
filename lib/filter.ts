import type {
  Itinerary,
  Leg,
  RejectReason,
  SearchQuery,
  TimeWindow,
} from "./types";

/** 從 "2026-03-03 10:10" 或 "10:10" 取出當天分鐘數 */
export function clockMinutes(value: string): number | null {
  const match = value.trim().match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function timeToMinutes(hhmm: string): number | null {
  if (!hhmm || !hhmm.trim()) return null;
  return clockMinutes(hhmm);
}

/**
 * after/before 都有且 after > before 時，當成跨夜區間（例如 22:00–06:00）。
 */
export function inTimeRange(
  valueMinutes: number,
  after: number | null,
  before: number | null,
): boolean {
  if (after != null && before != null && after > before) {
    return valueMinutes >= after || valueMinutes <= before;
  }
  if (after != null && valueMinutes < after) return false;
  if (before != null && valueMinutes > before) return false;
  return true;
}

function longestLayover(leg: Leg): number {
  if (leg.layovers.length === 0) return 0;
  return Math.max(...leg.layovers.map((layover) => layover.durationMinutes));
}

export function legTimeReject(
  leg: Leg,
  window: TimeWindow,
  prefix: "outbound" | "inbound",
): RejectReason | null {
  const depart = clockMinutes(leg.departAt);
  const arrive = clockMinutes(leg.arriveAt);
  const after = timeToMinutes(window.departAfter);
  const before = timeToMinutes(window.departBefore);
  const arriveBefore = timeToMinutes(window.arriveBefore);

  if (depart == null || arrive == null) return null;

  if (after != null && before != null && after > before) {
    if (!inTimeRange(depart, after, before)) {
      return `${prefix}_depart_after`;
    }
  } else {
    if (after != null && depart < after) return `${prefix}_depart_after`;
    if (before != null && depart > before) return `${prefix}_depart_before`;
  }

  if (arriveBefore != null && arrive > arriveBefore) {
    return `${prefix}_arrive_before`;
  }
  return null;
}

export function legConstraintReject(
  leg: Leg,
  query: Pick<SearchQuery, "maxStops" | "maxLayoverMinutes" | "allowAirportChange">,
): RejectReason | null {
  if (leg.stops > query.maxStops) return "max_stops";
  if (
    query.maxLayoverMinutes != null &&
    longestLayover(leg) > query.maxLayoverMinutes
  ) {
    return "max_layover";
  }
  if (!query.allowAirportChange && leg.airportChange) return "airport_change";
  return null;
}

export function outboundLegReject(
  leg: Leg,
  query: SearchQuery,
): RejectReason | null {
  return (
    legTimeReject(leg, query.outbound, "outbound") ??
    legConstraintReject(leg, query)
  );
}

export function itineraryReject(
  itinerary: Itinerary,
  query: SearchQuery,
): RejectReason | null {
  return (
    outboundLegReject(itinerary.outbound, query) ??
    legTimeReject(itinerary.inbound, query.inbound, "inbound") ??
    legConstraintReject(itinerary.inbound, query)
  );
}

export function filterItineraries(
  itineraries: Itinerary[],
  query: SearchQuery,
): { kept: Itinerary[]; dumped: { reason: RejectReason }[] } {
  const kept: Itinerary[] = [];
  const dumped: { reason: RejectReason }[] = [];
  for (const itinerary of itineraries) {
    const reason = itineraryReject(itinerary, query);
    if (reason) dumped.push({ reason });
    else kept.push(itinerary);
  }
  return { kept, dumped };
}

export function rankItineraries(itineraries: Itinerary[]): Itinerary[] {
  return [...itineraries].sort((a, b) => {
    if (a.price !== b.price) return a.price - b.price;
    return a.totalDurationMinutes - b.totalDurationMinutes;
  });
}

export function tallyReasons(
  dumped: { reason: RejectReason }[],
): Partial<Record<RejectReason, number>> {
  const counts: Partial<Record<RejectReason, number>> = {};
  for (const { reason } of dumped) {
    counts[reason] = (counts[reason] ?? 0) + 1;
  }
  return counts;
}
