export const MAX_DATE_PAIRS = 25;
/** Playwright 共用一個 headed browser，必須串行 */
export const SEARCH_CONCURRENCY = 1;
/** 每個日期組合最多再點幾筆去程看回程 */
export const MAX_RETURN_LOOKUPS_PER_PAIR = 3;

export type TimeWindow = {
  departAfter: string;
  departBefore: string;
  arriveBefore: string;
};

/** 旅程要不要碰到週末：不限 / 全平日 / 至少 1 天 / 週六日都要 */
export const WEEKEND_OVERLAPS = ["any", "none", "atLeastOne", "both"] as const;
export type WeekendOverlap = (typeof WEEKEND_OVERLAPS)[number];

export function isWeekendOverlap(value: unknown): value is WeekendOverlap {
  return WEEKEND_OVERLAPS.includes(value as WeekendOverlap);
}

export type SearchQuery = {
  origin: string;
  destination: string;
  outboundFrom: string;
  outboundTo: string;
  returnFrom: string;
  returnTo: string;
  outbound: TimeWindow;
  inbound: TimeWindow;
  maxStops: number;
  maxLayoverMinutes: number | null;
  /** 來回間隔天數下限（回程減去程）。空 = 不限 */
  minStayDays: number | null;
  /** 來回間隔天數上限。空 = 不限 */
  maxStayDays: number | null;
  weekendOverlap: WeekendOverlap;
  allowAirportChange: boolean;
};

export type DatePair = {
  outboundDate: string;
  returnDate: string;
};

export type FlightSegment = {
  airline: string;
  flightNumber: string;
  from: string;
  to: string;
  departAt: string;
  arriveAt: string;
  durationMinutes: number;
};

export type Layover = {
  airport: string;
  durationMinutes: number;
  overnight: boolean;
};

export type Leg = {
  segments: FlightSegment[];
  layovers: Layover[];
  durationMinutes: number;
  departAt: string;
  arriveAt: string;
  from: string;
  to: string;
  stops: number;
  airlines: string[];
  airportChange: boolean;
};

export type Itinerary = {
  id: string;
  price: number;
  currency: string;
  outbound: Leg;
  inbound: Leg;
  outboundDate: string;
  returnDate: string;
  googleFlightsUrl: string | null;
  totalDurationMinutes: number;
};

export type RejectReason =
  | "outbound_depart_after"
  | "outbound_depart_before"
  | "outbound_arrive_before"
  | "inbound_depart_after"
  | "inbound_depart_before"
  | "inbound_arrive_before"
  | "max_stops"
  | "max_layover"
  | "airport_change"
  | "missing_return";

export type Dump = {
  reason: RejectReason;
};

export type PairResult = {
  outboundDate: string;
  returnDate: string;
  cached: boolean;
  creditsUsed: number;
  itineraries: Itinerary[];
  dumped: Dump[];
  error?: string;
};

export type SearchEvent =
  | { type: "start"; pairCount: number; maxPairs: number }
  | { type: "pair"; pair: PairResult }
  | {
      type: "done";
      creditsUsed: number;
      cachedHits: number;
      kept: number;
      dumped: number;
      dumpedReasons: Partial<Record<RejectReason, number>>;
    }
  | { type: "error"; message: string };
