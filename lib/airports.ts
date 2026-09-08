import rawAirports from "../data/airports.json";
import { MAX_DEST_AIRPORTS } from "./types";

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
  "TPE", "TSA", "KHH", "HND", "NRT", "KIX", "ITM", "NGO", "FUK", "CTS", "OKA",
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

export type PlaceKind = "airport" | "city" | "country";

export type PlaceHit = {
  id: string;
  kind: PlaceKind;
  title: string;
  subtitle: string;
  airports: Airport[];
};

const COUNTRY_ALIASES: Record<string, string> = {
  japan: "Japan",
  "日本": "Japan",
  nippon: "Japan",
  nihon: "Japan",
  korea: "South Korea",
  "south korea": "South Korea",
  "韓國": "South Korea",
  "韩国": "South Korea",
  "南韓": "South Korea",
  taiwan: "Taiwan",
  "台灣": "Taiwan",
  "台湾": "Taiwan",
  china: "China",
  "中國": "China",
  "中国": "China",
  usa: "United States",
  us: "United States",
  "united states": "United States",
  "美國": "United States",
  "美国": "United States",
  uk: "United Kingdom",
  britain: "United Kingdom",
  "united kingdom": "United Kingdom",
  "英國": "United Kingdom",
  "英国": "United Kingdom",
  thailand: "Thailand",
  "泰國": "Thailand",
  "泰国": "Thailand",
  vietnam: "Vietnam",
  "越南": "Vietnam",
  singapore: "Singapore",
  "新加坡": "Singapore",
  malaysia: "Malaysia",
  "馬來西亞": "Malaysia",
  "马来西亚": "Malaysia",
  philippines: "Philippines",
  "菲律賓": "Philippines",
  "菲律宾": "Philippines",
  indonesia: "Indonesia",
  "印尼": "Indonesia",
  france: "France",
  "法國": "France",
  "法国": "France",
  germany: "Germany",
  "德國": "Germany",
  "德国": "Germany",
  italy: "Italy",
  "義大利": "Italy",
  "意大利": "Italy",
  spain: "Spain",
  "西班牙": "Spain",
  australia: "Australia",
  "澳洲": "Australia",
  canada: "Canada",
  "加拿大": "Canada",
  "hong kong": "Hong Kong",
  "香港": "Hong Kong",
  macau: "Macau",
  "澳門": "Macau",
  "澳门": "Macau",
};

const CITY_ALIASES: Record<string, string> = {
  tokyo: "Tokyo",
  "東京": "Tokyo",
  osaka: "Osaka",
  "大阪": "Osaka",
  nagoya: "Nagoya",
  "名古屋": "Nagoya",
  fukuoka: "Fukuoka",
  "福岡": "Fukuoka",
  sapporo: "Sapporo",
  "札幌": "Sapporo",
  okinawa: "Okinawa",
  "沖繩": "Okinawa",
  "冲绳": "Okinawa",
  seoul: "Seoul",
  "首爾": "Seoul",
  "首尔": "Seoul",
  taipei: "Taipei",
  "台北": "Taipei",
  "臺北": "Taipei",
};

function rankAirports(list: Airport[]): Airport[] {
  return [...list].sort((a, b) => {
    const scoreA = SIZE_BONUS[a.size] + popularity(a.iata);
    const scoreB = SIZE_BONUS[b.size] + popularity(b.iata);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.iata.localeCompare(b.iata);
  });
}

function uniqueCountries(): string[] {
  return [...new Set(AIRPORTS.map((airport) => airport.country))];
}

export function canonicalCountry(query: string): string | null {
  const q = normalizeQuery(query);
  if (!q) return null;
  if (COUNTRY_ALIASES[q]) return COUNTRY_ALIASES[q];
  return uniqueCountries().find((country) => normalizeQuery(country) === q) ?? null;
}

function canonicalCityLabel(query: string): string {
  const q = normalizeQuery(query);
  return CITY_ALIASES[q] ?? query.trim();
}

/** 國家只展開 large，再截前幾名熱門機場 */
export function airportsInCountry(country: string): Airport[] {
  const canonical = canonicalCountry(country) ?? country;
  const hits = AIRPORTS.filter(
    (airport) => airport.country === canonical && airport.size === "large",
  );
  return rankAirports(hits).slice(0, MAX_DEST_AIRPORTS);
}

/**
 * 城市／都會區。Narita 的 city 是 Narita，但 keywords 有 Tokyo，
 * 所以打 Tokyo 要把 NRT 跟 HND 收在一起。
 */
export function airportsInCity(query: string): Airport[] {
  const q = normalizeQuery(query);
  if (!q) return [];
  const alias = normalizeQuery(CITY_ALIASES[q] ?? q);
  const hits = AIRPORTS.filter((airport) => {
    if (airport.size === "small") return false;
    const city = normalizeQuery(airport.city);
    if (city === q || city === alias) return true;
    const keywordTokens = tokens(airport.keywords ?? "");
    return keywordTokens.includes(q) || keywordTokens.includes(alias);
  });
  const ranked = rankAirports(hits);
  if (ranked.length === 0) return [];
  const country = ranked[0].country;
  return ranked
    .filter((airport) => airport.country === country)
    .slice(0, MAX_DEST_AIRPORTS);
}

function codes(airports: Airport[]): string {
  return airports.map((airport) => airport.iata).join(", ");
}

export function countryPlaceId(country: string): string {
  return `country:${canonicalCountry(country) ?? country}`;
}

export function cityPlaceId(city: string): string {
  return `city:${canonicalCityLabel(city)}`;
}

export function parsePlaceId(id: string): { kind: PlaceKind; name: string } | null {
  const value = id.trim();
  if (!value) return null;
  const colon = value.indexOf(":");
  if (colon > 0) {
    const kind = value.slice(0, colon).toLowerCase();
    const name = value.slice(colon + 1).trim();
    if (kind === "country" && name) return { kind: "country", name };
    if (kind === "city" && name) return { kind: "city", name };
  }
  if (findAirport(value)) return { kind: "airport", name: value.toUpperCase() };
  return null;
}

/** 展開目的地，並拿掉跟出發地同一個機場 */
export function destinationAirports(destination: string, origin: string): Airport[] {
  const originCode = origin.trim().toUpperCase();
  return resolveDestination(destination).filter((airport) => airport.iata !== originCode);
}

/** 把表單字串展開成要抓的機場清單 */
export function resolveDestination(input: string): Airport[] {
  const raw = input.trim();
  if (!raw) return [];
  const parsed = parsePlaceId(raw);
  if (parsed?.kind === "airport") {
    const airport = findAirport(parsed.name);
    return airport ? [airport] : [];
  }
  if (parsed?.kind === "country") return airportsInCountry(parsed.name);
  if (parsed?.kind === "city") return airportsInCity(parsed.name);

  if (/^[A-Za-z]{3}$/.test(raw)) {
    const airport = findAirport(raw);
    if (airport) return [airport];
  }
  const country = canonicalCountry(raw);
  if (country) return airportsInCountry(country);
  const cityHits = airportsInCity(raw);
  if (cityHits.length >= 2) return cityHits;
  if (cityHits.length === 1) return cityHits;
  const fallback = searchAirports(raw, 1)[0];
  return fallback ? [fallback] : [];
}

export function formatPlace(id: string): string {
  const airports = resolveDestination(id);
  if (airports.length === 0) return id;
  if (airports.length === 1) return formatAirport(airports[0]);
  const parsed = parsePlaceId(id);
  const label =
    parsed?.kind === "country"
      ? parsed.name
      : parsed?.kind === "city"
        ? parsed.name
        : canonicalCityLabel(id);
  return `${label} · ${codes(airports)}`;
}

function cityGroups(query: string): PlaceHit[] {
  const q = normalizeQuery(query);
  if (q.length < 2) return [];
  const hits = airportsInCity(query);
  if (hits.length < 2) return [];
  const label = canonicalCityLabel(query);
  return [
    {
      id: cityPlaceId(label),
      kind: "city",
      title: `${label}, ${hits[0].country}`,
      subtitle: codes(hits),
      airports: hits,
    },
  ];
}

function countryGroups(query: string): PlaceHit[] {
  const q = normalizeQuery(query);
  if (!q) return [];
  const exact = canonicalCountry(query);
  const names = exact
    ? [exact]
    : uniqueCountries().filter((country) => normalizeQuery(country).startsWith(q));
  return names.slice(0, 3).map((country) => {
    const airports = airportsInCountry(country);
    return {
      id: countryPlaceId(country),
      kind: "country" as const,
      title: country,
      subtitle: codes(airports),
      airports,
    };
  }).filter((hit) => hit.airports.length > 0);
}

/** 目的地 combobox：國家／城市組合排在單一機場前面 */
export function searchPlaces(query: string, limit = 12): PlaceHit[] {
  const q = normalizeQuery(query);
  if (q.length < 1) return [];
  const out: PlaceHit[] = [...countryGroups(query), ...cityGroups(query)];
  const seen = new Set(out.map((hit) => hit.id));
  for (const airport of searchAirports(query, limit)) {
    if (seen.has(airport.iata)) continue;
    seen.add(airport.iata);
    out.push({
      id: airport.iata,
      kind: "airport",
      title: airport.iata,
      subtitle: `${airport.city || airport.name}, ${airport.country}`,
      airports: [airport],
    });
  }
  return out.slice(0, limit);
}

