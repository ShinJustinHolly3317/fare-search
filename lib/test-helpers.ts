import type { Itinerary, Leg, SearchQuery, TimeWindow } from "./types";

const emptyWindow: TimeWindow = {
  departAfter: "",
  departBefore: "",
  arriveBefore: "",
};

export function makeLeg(overrides: Partial<Leg> & Pick<Leg, "departAt" | "arriveAt">): Leg {
  const from = overrides.from ?? "TPE";
  const to = overrides.to ?? "NRT";
  return {
    segments: overrides.segments ?? [
      {
        airline: "CI",
        flightNumber: "CI 100",
        from,
        to,
        departAt: overrides.departAt,
        arriveAt: overrides.arriveAt,
        durationMinutes: overrides.durationMinutes ?? 180,
      },
    ],
    layovers: overrides.layovers ?? [],
    durationMinutes: overrides.durationMinutes ?? 180,
    departAt: overrides.departAt,
    arriveAt: overrides.arriveAt,
    from,
    to,
    stops: overrides.stops ?? 0,
    airlines: overrides.airlines ?? ["CI"],
    airportChange: overrides.airportChange ?? false,
  };
}

export function makeQuery(overrides: Partial<SearchQuery> = {}): SearchQuery {
  return {
    origin: "TPE",
    destination: "NRT",
    outboundFrom: "2026-08-20",
    outboundTo: "2026-08-22",
    returnFrom: "2026-08-28",
    returnTo: "2026-08-30",
    outbound: { ...emptyWindow, ...overrides.outbound },
    inbound: { ...emptyWindow, ...overrides.inbound },
    maxStops: 1,
    maxLayoverMinutes: 180,
    minStayDays: null,
    maxStayDays: null,
    weekendOverlap: "any",
    allowAirportChange: false,
    ...overrides,
  };
}

export function makeItinerary(overrides: Partial<Itinerary> = {}): Itinerary {
  const outbound =
    overrides.outbound ??
    makeLeg({ departAt: "2026-08-20 10:00", arriveAt: "2026-08-20 14:00" });
  const inbound =
    overrides.inbound ??
    makeLeg({
      from: "NRT",
      to: "TPE",
      departAt: "2026-08-28 16:00",
      arriveAt: "2026-08-28 18:30",
    });
  return {
    id: overrides.id ?? "test",
    price: overrides.price ?? 12000,
    currency: overrides.currency ?? "TWD",
    outbound,
    inbound,
    outboundDate: overrides.outboundDate ?? "2026-08-20",
    returnDate: overrides.returnDate ?? "2026-08-28",
    googleFlightsUrl: overrides.googleFlightsUrl ?? null,
    totalDurationMinutes:
      overrides.totalDurationMinutes ??
      outbound.durationMinutes + inbound.durationMinutes,
  };
}
