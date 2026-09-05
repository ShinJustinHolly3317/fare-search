export type FlightId = {
  airline: string;
  number: string;
};

export type ScrapedOption = {
  price: number;
  from: string;
  to: string;
  date: string;
  departClock: string;
  arriveClock: string;
  arriveDayOffset: number;
  durationMinutes: number;
  stops: number;
  airlines: string[];
  flights: FlightId[];
  bookingUrl: string | null;
  layoverAirport: string | null;
  layoverMinutes: number | null;
  overnight: boolean;
  airportChange: boolean;
  cardText: string;
};

const SKIP_FLIGHT_PREFIX = new Set(["AM", "PM", "NT", "KG", "HR", "CO", "TV", "US", "EU"]);

/** 從卡片／aria 抽出 BR 192 這種航班號（Google 常用 nbsp，且會黏在 787TR 872） */
export function parseFlightIds(text: string): FlightId[] {
  const normalized = text.replace(/\u00a0|\u202f/g, " ");
  const found: FlightId[] = [];
  const seen = new Set<string>();
  for (const match of normalized.matchAll(/(?<![A-Z])([A-Z]{2})\s+(\d{1,4})\b/g)) {
    const airline = match[1];
    const number = match[2];
    if (SKIP_FLIGHT_PREFIX.has(airline)) continue;
    const key = `${airline}${number}`;
    if (seen.has(key)) continue;
    seen.add(key);
    found.push({ airline, number });
  }
  return found;
}

const SKIP_LINE =
  /^(best|other|flights?|from|to|price|emissions|selected|departing|returning)$/i;

export function to24h(raw: string): string | null {
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const ampm = match[3]?.toUpperCase();
  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function parsePrice(text: string): number | null {
  const match = text.match(/(?:TWD|NT\$|USD|\$)\s*([\d,]+)/i) ?? text.match(/([\d,]+)\s*(?:TWD|NT\$)/i);
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
}

export function parseDurationMinutes(text: string): number | null {
  const match = text.match(/(\d+)\s*h(?:r|ours?)?(?:\s*(\d+)\s*m(?:in)?)?/i);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2] ?? 0);
}

function parseStops(text: string): number {
  if (/nonstop|direct/i.test(text)) return 0;
  const match = text.match(/(\d+)\s*stops?/i);
  return match ? Number(match[1]) : 0;
}

function parseLayover(text: string): {
  airport: string | null;
  minutes: number | null;
  overnight: boolean;
} {
  const overnight = /overnight/i.test(text);
  const iata = text.match(/stop(?:s)? in ([A-Z]{3})\b/);
  const city = text.match(/stop(?:s)? in ([A-Z][A-Za-z .'-]{2,30})/i);
  const durationMatch = text.match(
    /(\d+)\s*h(?:r|ours?)?(?:\s*(\d+)\s*m(?:in)?)?\s*(?:layover|stop)/i,
  );
  return {
    airport: iata?.[1] ?? city?.[1]?.trim() ?? null,
    minutes: durationMatch ? Number(durationMatch[1]) * 60 + Number(durationMatch[2] ?? 0) : null,
    overnight,
  };
}

/** 從 Google Flights 卡片文字抽出一筆去程／回程摘要 */
export function parseCardText(
  text: string,
  args: { from: string; to: string; date: string },
): ScrapedOption | null {
  const compact = text.replace(/\u202f|\u00a0/g, " ").replace(/\s+/g, " ").trim();
  const price = parsePrice(compact);
  const durationMinutes = parseDurationMinutes(compact);
  const timeMatch = compact.match(
    /(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*[–\-—]\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)(\+\d)?/i,
  );
  if (price == null || durationMinutes == null || !timeMatch) return null;

  const departClock = to24h(timeMatch[1]);
  const arriveClock = to24h(timeMatch[2]);
  if (!departClock || !arriveClock) return null;

  const arriveDayOffset = timeMatch[3] ? Number(timeMatch[3]) : arriveClock < departClock ? 1 : 0;
  const layover = parseLayover(compact);
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const airlines = lines.filter((line) => {
    if (SKIP_LINE.test(line)) return false;
    if (/\d/.test(line) && /:/.test(line)) return false;
    if (/twd|nt\$|nonstop|stop|hr|min|operated/i.test(line)) return false;
    if (line.length < 3 || line.length > 40) return false;
    return /[A-Za-z]/.test(line);
  });

  const flights = parseFlightIds(compact);
  return {
    price,
    from: args.from,
    to: args.to,
    date: args.date,
    departClock,
    arriveClock,
    arriveDayOffset,
    durationMinutes,
    stops: parseStops(compact),
    airlines: [...new Set(airlines)].slice(0, 3),
    flights,
    bookingUrl: null,
    layoverAirport: layover.airport,
    layoverMinutes: layover.minutes,
    overnight: layover.overnight,
    airportChange: /change airports?|airport change/i.test(compact),
    cardText: compact.slice(0, 400),
  };
}

export function optionFingerprint(option: ScrapedOption): string {
  return [option.departClock, option.arriveClock, String(option.price), option.airlines.join(",")].join("|");
}

const JUNK_AIRLINE = /separate tickets|co2|emissions|operated|round trip/i;
const CITY_PAIR = /^[A-Z]{3}[–-][A-Z]{3}$/;

export function primaryAirlineName(names: string[]): string {
  return (
    names.find((name) => name && !JUNK_AIRLINE.test(name) && !CITY_PAIR.test(name)) ??
    ""
  );
}
