import type { Itinerary, Layover, Leg } from "./types";
import type { ScrapedOption } from "./parse-card";
import { formatIsoDate, parseIsoDate } from "./dates";
import {
  googleFlightsBookingUrl,
  googleFlightsSearchUrl,
  type FlightPin,
} from "./google-flights-url";
import { primaryAirlineName } from "./parse-card";

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function shiftDate(iso: string, days: number): string {
  const date = parseIsoDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return formatIsoDate(date);
}

/** 把刮下來的卡片摘要轉成 Leg */
export function scrapedToLeg(option: ScrapedOption): Leg {
  const departAt = `${option.date} ${option.departClock}`;
  const arriveAt = `${shiftDate(option.date, option.arriveDayOffset)} ${option.arriveClock}`;
  const airline = primaryAirlineName(option.airlines);
  const layovers: Layover[] =
    option.stops > 0
      ? [
          {
            airport: option.layoverAirport ?? "",
            durationMinutes: option.layoverMinutes ?? 0,
            overnight: option.overnight,
          },
        ]
      : [];

  const flights = option.flights ?? [];
  const segments =
    flights.length > 0
      ? flights.map((flight, index) => ({
          airline: flight.airline,
          flightNumber: `${flight.airline} ${flight.number}`,
          from:
            index === 0 ? option.from : (option.layoverAirport ?? option.from),
          to:
            index === flights.length - 1 ? option.to : (option.layoverAirport ?? option.to),
          departAt,
          arriveAt,
          durationMinutes: option.durationMinutes,
        }))
      : [
          {
            airline,
            flightNumber: "",
            from: option.from,
            to: option.to,
            departAt,
            arriveAt,
            durationMinutes: option.durationMinutes,
          },
        ];

  return {
    segments,
    layovers,
    durationMinutes: option.durationMinutes,
    departAt,
    arriveAt,
    from: option.from,
    to: option.to,
    stops: option.stops,
    airlines: unique([
      ...flights.map((flight) => flight.airline),
      airline,
    ]),
    airportChange: option.airportChange,
  };
}

export { googleFlightsSearchUrl } from "./google-flights-url";

function pinsFromLeg(leg: Leg, date: string): FlightPin[] | null {
  const pins: FlightPin[] = [];
  for (const segment of leg.segments) {
    const match = segment.flightNumber.match(/\b([A-Z]{2})\s*(\d{1,4})\b/);
    const airline = match?.[1] ?? (/^[A-Z]{2}$/.test(segment.airline) ? segment.airline : "");
    const number = match?.[2] ?? "";
    if (!airline || !number || !segment.from || !segment.to) return null;
    pins.push({
      origin: segment.from,
      dest: segment.to,
      depDate: date,
      airline,
      flightNumber: number,
    });
  }
  return pins.length > 0 ? pins : null;
}

/** 有航班號就進 booking 頁；沒有就用 Google 吃得下的日期搜尋，不要亂加航空／時刻 */
export function itineraryGoogleFlightsUrl(args: {
  outbound: Leg;
  inbound: Leg;
  outboundDate: string;
  returnDate: string;
  bookingUrl?: string | null;
}): string {
  if (args.bookingUrl?.includes("/travel/flights/booking")) {
    return args.bookingUrl;
  }
  const outboundPins = pinsFromLeg(args.outbound, args.outboundDate);
  const inboundPins = pinsFromLeg(args.inbound, args.returnDate);
  if (outboundPins && inboundPins) {
    return googleFlightsBookingUrl([outboundPins, inboundPins]);
  }
  return googleFlightsSearchUrl(
    args.outbound.from,
    args.outbound.to,
    args.outboundDate,
    args.returnDate,
  );
}

export function itineraryId(
  outbound: Leg,
  inbound: Leg,
  outboundDate: string,
  returnDate: string,
  price: number,
): string {
  return [
    outboundDate,
    returnDate,
    outbound.departAt,
    inbound.departAt,
    String(price),
  ].join("|");
}

export function mergeRoundTrip(args: {
  outbound: Leg;
  inbound: Leg;
  price: number;
  currency: string;
  outboundDate: string;
  returnDate: string;
  googleFlightsUrl: string | null;
}): Itinerary {
  return {
    id: itineraryId(
      args.outbound,
      args.inbound,
      args.outboundDate,
      args.returnDate,
      args.price,
    ),
    price: args.price,
    currency: args.currency,
    outbound: args.outbound,
    inbound: args.inbound,
    outboundDate: args.outboundDate,
    returnDate: args.returnDate,
    googleFlightsUrl: args.googleFlightsUrl,
    totalDurationMinutes: args.outbound.durationMinutes + args.inbound.durationMinutes,
  };
}
