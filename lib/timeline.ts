import { longestLayoverMinutes } from "./filter";
import type { Leg } from "./types";

export type TimelineFlight = {
  kind: "flight";
  airline: string;
  from: string;
  to: string;
  minutes: number;
};

export type TimelineLayover = {
  kind: "layover";
  airport: string;
  minutes: number;
  overnight: boolean;
};

export type TimelinePart = TimelineFlight | TimelineLayover;

/** 把一腿拆成飛行／轉機段落，給時間軸用。沒有真實分段時刻就均分空中時間。 */
export function legTimeline(leg: Leg): TimelinePart[] {
  const hops = Math.max(leg.stops + 1, leg.segments.length || 1, 1);
  if (hops <= 1) {
    return [
      {
        kind: "flight",
        airline: leg.segments[0]?.airline || leg.airlines[0] || "",
        from: leg.from,
        to: leg.to,
        minutes: Math.max(leg.durationMinutes, 1),
      },
    ];
  }

  const layoverTotal = longestLayoverMinutes(leg);
  const airTotal = Math.max(hops * 30, leg.durationMinutes - layoverTotal);
  const perFlight = Math.max(30, Math.round(airTotal / hops));
  const perLayover =
    leg.layovers.length >= hops - 1
      ? null
      : Math.max(1, Math.round(layoverTotal / (hops - 1)));

  const parts: TimelinePart[] = [];
  for (let index = 0; index < hops; index += 1) {
    const segment = leg.segments[index];
    const prevLayover = leg.layovers[index - 1];
    const nextLayover = leg.layovers[index];
    parts.push({
      kind: "flight",
      airline: segment?.airline || leg.airlines[index] || leg.airlines[0] || "",
      from: index === 0 ? leg.from : prevLayover?.airport || segment?.from || "",
      to: index === hops - 1 ? leg.to : nextLayover?.airport || segment?.to || "",
      minutes: perFlight,
    });
    if (index < hops - 1) {
      const layover = nextLayover;
      parts.push({
        kind: "layover",
        airport: layover?.airport || "",
        minutes: layover?.durationMinutes || perLayover || layoverTotal,
        overnight: layover?.overnight ?? layoverTotal >= 8 * 60,
      });
    }
  }
  return parts;
}
