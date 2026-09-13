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
  const pattern =
    /(\d+)\s*(?:h(?:r|ours?)?|小時)(?:\s*(\d+)\s*(?:m(?:in|inutes?)?|分鐘)?)?/gi;
  let total: number | null = null;
  for (const match of text.matchAll(pattern)) {
    const minutes = Number(match[1]) * 60 + Number(match[2] ?? 0);
    const after = text.slice(
      (match.index ?? 0) + match[0].length,
      (match.index ?? 0) + match[0].length + 24,
    );
    /* 不要把 "22 hr layover" 當成總飛行時間 */
    if (/^\s*(layover|stop(?:over)?|轉機)/i.test(after)) continue;
    if (total == null || minutes > total) total = minutes;
  }
  return total;
}

function parseStops(text: string): number {
  if (/nonstop|direct|直飛/i.test(text)) return 0;
  const zh = text.match(/(\d+)\s*次轉機/);
  if (zh) return Number(zh[1]);
  const match = text.match(/(\d+)\s*stops?/i);
  return match ? Number(match[1]) : 0;
}

function parseDurationToken(match: RegExpMatchArray): number {
  return Number(match[1]) * 60 + Number(match[2] ?? 0);
}

function parseLayover(text: string): {
  airport: string | null;
  minutes: number | null;
  overnight: boolean;
} {
  const overnight = /overnight|過夜/i.test(text);
  const iata =
    text.match(/(?:stop(?:s)?|layover|轉機)[\s\S]{0,48}?\bin\s+([A-Z]{3})\b/i)?.[1] ??
    text.match(/\b([A-Z]{3})\s*(?:layover|轉機)/i)?.[1] ??
    null;
  const city =
    text.match(/(?:stop(?:s)?|layover)\s+in\s+([A-Z][A-Za-z .'-]{2,40})/i)?.[1]?.trim() ??
    null;
  const durationMatch =
    text.match(
      /(\d+)\s*(?:h(?:r|ours?)?|小時)(?:\s*(\d+)\s*(?:m(?:in|inutes?)?|分鐘)?)?\s*(?:layover|stop(?:over)?|轉機)/i,
    ) ??
    text.match(
      /(?:layover|stop(?:over)?|轉機)\s*(?:of\s*)?(\d+)\s*(?:h(?:r|ours?)?|小時)(?:\s*(\d+)\s*(?:m(?:in|inutes?)?|分鐘)?)?/i,
    ) ??
    text.match(/(\d+)\s*m(?:in|inutes?)?\s*layover/i);
  return {
    airport: iata ?? city,
    minutes: durationMatch ? parseDurationToken(durationMatch) : null,
    overnight,
  };
}

/** Google 摺疊卡常只寫 1 stop。用總時長扣每段最低空中時間，避免 27h  overnight 被當成 0 分鐘轉機 */
export function impliedLayoverMinutes(args: {
  stops: number;
  durationMinutes: number;
  layoverMinutes: number | null;
}): number | null {
  if (args.stops <= 0) return args.layoverMinutes ?? 0;
  if (args.layoverMinutes != null && args.layoverMinutes > 0) return args.layoverMinutes;
  const minAirborne = 90 * (args.stops + 1);
  return Math.max(0, args.durationMinutes - minAirborne);
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
  const flights = parseFlightIds(compact);
  const stops = Math.max(parseStops(compact), Math.max(0, flights.length - 1));
  const layoverMinutes = impliedLayoverMinutes({
    stops,
    durationMinutes,
    layoverMinutes: layover.minutes,
  });
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

  return {
    price,
    from: args.from,
    to: args.to,
    date: args.date,
    departClock,
    arriveClock,
    arriveDayOffset,
    durationMinutes,
    stops,
    airlines: [...new Set(airlines)].slice(0, 3),
    flights,
    bookingUrl: null,
    layoverAirport: layover.airport,
    layoverMinutes,
    overnight: layover.overnight,
    airportChange: /change airports?|airport change|換機場/i.test(compact),
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
