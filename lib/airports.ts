import rawAirports from "../data/airports.json";

export type AirportSize = "large" | "medium" | "small";

export type Airport = {
  iata: string;
  name: string;
  city: string;
  country: string;
  size: AirportSize;
  keywords?: string;
};

const AIRPORTS = rawAirports as Airport[];
const BY_IATA = new Map(AIRPORTS.map((airport) => [airport.iata, airport]));

const SIZE_BONUS: Record<AirportSize, number> = {
  large: 40,
  medium: 15,
  small: 0,
};

/** 同國家搜尋時不要讓青森排在羽田前面 */
const POPULAR_IATA = [
  "TPE", "TSA", "KHH", "HND", "NRT", "KIX", "NGO", "FUK", "CTS", "OKA",
  "ICN", "GMP", "PUS", "HKG", "MFM", "PEK", "PKX", "PVG", "SHA", "CAN", "SZX",
  "SIN", "BKK", "SGN", "MNL", "CGK", "KUL", "DPS",
  "LHR", "LGW", "CDG", "AMS", "FRA", "FCO", "MAD",
  "JFK", "EWR", "LAX", "SFO", "ORD", "SEA",
  "SYD", "MEL", "AKL", "DXB", "DOH", "IST",
];

function popularity(iata: string): number {
  const index = POPULAR_IATA.indexOf(iata);
  return index === -1 ? 0 : POPULAR_IATA.length - index;
}

export function normalizeQuery(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export function findAirport(iata: string): Airport | undefined {
  return BY_IATA.get(iata.trim().toUpperCase());
}

export function formatAirport(airport: Airport): string {
  const place = airport.city || airport.name;
  return `${airport.iata} · ${place}, ${airport.country}`;
}

function haystack(airport: Airport): string {
  return normalizeQuery(
    [airport.iata, airport.name, airport.city, airport.country, airport.keywords ?? ""].join(" "),
  );
}

function tokens(value: string): string[] {
  return normalizeQuery(value).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

function scoreAirport(airport: Airport, q: string): number {
  const iata = airport.iata.toLowerCase();
  const name = normalizeQuery(airport.name);
  const city = normalizeQuery(airport.city);
  const country = normalizeQuery(airport.country);
  const keywordTokens = tokens(airport.keywords ?? "");
  const bonus = SIZE_BONUS[airport.size] + popularity(airport.iata);

  if (iata === q) return 1000;
  if (iata.startsWith(q)) return 850 + bonus;
  if (city === q || country === q || keywordTokens.includes(q)) return 720 + bonus;
  if (city.startsWith(q)) return 600 + bonus;
  if (name.startsWith(q)) return 520 + bonus;
  if (city.includes(q)) return 420 + bonus;
  if (name.includes(q)) return 340 + bonus;
  if (country.startsWith(q)) return 260 + bonus;
  if (country.includes(q)) return 180 + bonus;
  if (haystack(airport).includes(q)) return 140 + bonus;
  return 0;
}

/** 用 IATA / 城市 / 國家 / 機場名搜，大機場優先 */
export function searchAirports(query: string, limit = 12): Airport[] {
  const q = normalizeQuery(query);
  if (q.length < 1) return [];

  const ranked = AIRPORTS.map((airport) => ({
    airport,
    score: scoreAirport(airport, q),
  }))
    .filter((row) => row.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.airport.iata.localeCompare(b.airport.iata);
    });

  return ranked.slice(0, limit).map((row) => row.airport);
}
