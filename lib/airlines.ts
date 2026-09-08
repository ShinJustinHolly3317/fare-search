import type { Locale } from "./i18n";

type Airline = {
  iata: string;
  zh: string;
  /** Google 卡片上常見英文名 */
  names: string[];
  /** 預購一件 20kg 單程估價（TWD）。沒填 = 經濟艙通常已含，不加估價 */
  checkedBagTwd?: number;
};

/** 台港日韓東南亞為主，外加常見長程。找不到就原樣顯示。 */
const AIRLINES: Airline[] = [
  { iata: "CI", zh: "中華航空", names: ["China Airlines"] },
  { iata: "BR", zh: "長榮航空", names: ["EVA Air", "EVA"] },
  { iata: "JX", zh: "星宇航空", names: ["STARLUX", "Starlux", "Starlux Airlines"] },
  { iata: "IT", zh: "台灣虎航", names: ["Tigerair Taiwan", "Tigerair"], checkedBagTwd: 1200 },
  { iata: "B7", zh: "立榮航空", names: ["Uni Air"] },
  { iata: "AE", zh: "華信航空", names: ["Mandarin Airlines"] },
  { iata: "JL", zh: "日本航空", names: ["Japan Airlines", "JAL"] },
  { iata: "NH", zh: "全日空", names: ["All Nippon Airways", "ANA"] },
  { iata: "MM", zh: "樂桃航空", names: ["Peach", "Peach Aviation"], checkedBagTwd: 900 },
  { iata: "GK", zh: "捷星日本", names: ["Jetstar Japan"], checkedBagTwd: 900 },
  { iata: "JQ", zh: "捷星航空", names: ["Jetstar"], checkedBagTwd: 900 },
  { iata: "ZJ", zh: "春秋航空日本", names: ["Spring Japan"], checkedBagTwd: 900 },
  { iata: "KE", zh: "大韓航空", names: ["Korean Air"] },
  { iata: "OZ", zh: "韓亞航空", names: ["Asiana Airlines", "Asiana"] },
  { iata: "LJ", zh: "真航空", names: ["Jin Air"], checkedBagTwd: 900 },
  { iata: "7C", zh: "濟州航空", names: ["Jeju Air"], checkedBagTwd: 900 },
  { iata: "TW", zh: "德威航空", names: ["T'way", "T'way Air", "Tway"], checkedBagTwd: 1000 },
  { iata: "ZE", zh: "易斯達航空", names: ["Eastar Jet"], checkedBagTwd: 900 },
  { iata: "RS", zh: "首爾航空", names: ["Air Seoul"], checkedBagTwd: 900 },
  { iata: "CX", zh: "國泰航空", names: ["Cathay Pacific"] },
  { iata: "HX", zh: "香港航空", names: ["Hong Kong Airlines"] },
  { iata: "UO", zh: "香港快運", names: ["HK Express"], checkedBagTwd: 1000 },
  { iata: "SQ", zh: "新加坡航空", names: ["Singapore Airlines"] },
  { iata: "TR", zh: "酷航", names: ["Scoot"], checkedBagTwd: 1000 },
  { iata: "TG", zh: "泰國航空", names: ["Thai Airways", "Thai Airways International"] },
  { iata: "FD", zh: "亞洲航空", names: ["Thai AirAsia", "AirAsia"], checkedBagTwd: 1500 },
  { iata: "AK", zh: "亞洲航空", names: ["AirAsia"], checkedBagTwd: 1500 },
  { iata: "D7", zh: "亞航X", names: ["AirAsia X"] },
  { iata: "SL", zh: "泰國獅子航空", names: ["Thai Lion Air"], checkedBagTwd: 1100 },
  { iata: "VZ", zh: "越泰航空", names: ["Thai Vietjet"], checkedBagTwd: 900 },
  { iata: "VN", zh: "越南航空", names: ["Vietnam Airlines"] },
  { iata: "VJ", zh: "越捷航空", names: ["VietJet", "VietJet Air"], checkedBagTwd: 900 },
  { iata: "BL", zh: "太平洋航空", names: ["Pacific Airlines"], checkedBagTwd: 900 },
  { iata: "PR", zh: "菲律賓航空", names: ["Philippine Airlines"] },
  { iata: "5J", zh: "宿霧太平洋航空", names: ["Cebu Pacific"], checkedBagTwd: 1000 },
  { iata: "MH", zh: "馬來西亞航空", names: ["Malaysia Airlines"] },
  { iata: "OD", zh: "馬印航空", names: ["Batik Air Malaysia", "Malindo"] },
  { iata: "GA", zh: "嘉魯達印尼航空", names: ["Garuda Indonesia"] },
  { iata: "ID", zh: "巴澤航空", names: ["Batik Air"] },
  { iata: "QZ", zh: "印尼亞航", names: ["Indonesia AirAsia"], checkedBagTwd: 1500 },
  { iata: "CZ", zh: "中國南方航空", names: ["China Southern", "China Southern Airlines"] },
  { iata: "MU", zh: "中國東方航空", names: ["China Eastern", "China Eastern Airlines"] },
  { iata: "CA", zh: "中國國際航空", names: ["Air China"] },
  { iata: "MF", zh: "廈門航空", names: ["XiamenAir", "Xiamen Airlines"] },
  { iata: "HU", zh: "海南航空", names: ["Hainan Airlines"] },
  { iata: "HO", zh: "吉祥航空", names: ["Juneyao Air", "Juneyao Airlines"] },
  { iata: "ZH", zh: "深圳航空", names: ["Shenzhen Airlines"] },
  { iata: "3U", zh: "四川航空", names: ["Sichuan Airlines"] },
  { iata: "FM", zh: "上海航空", names: ["Shanghai Airlines"] },
  { iata: "9C", zh: "春秋航空", names: ["Spring Airlines"], checkedBagTwd: 800 },
  { iata: "SC", zh: "山東航空", names: ["Shandong Airlines"] },
  { iata: "QR", zh: "卡達航空", names: ["Qatar Airways"] },
  { iata: "EK", zh: "阿聯酋航空", names: ["Emirates"] },
  { iata: "EY", zh: "阿提哈德航空", names: ["Etihad Airways", "Etihad"] },
  { iata: "TK", zh: "土耳其航空", names: ["Turkish Airlines"] },
  { iata: "LH", zh: "漢莎航空", names: ["Lufthansa"] },
  { iata: "AF", zh: "法國航空", names: ["Air France"] },
  { iata: "KL", zh: "荷蘭皇家航空", names: ["KLM"] },
  { iata: "BA", zh: "英國航空", names: ["British Airways"] },
  { iata: "LX", zh: "瑞士國際航空", names: ["Swiss", "SWISS"] },
  { iata: "OS", zh: "奧地利航空", names: ["Austrian Airlines", "Austrian"] },
  { iata: "AY", zh: "芬蘭航空", names: ["Finnair"] },
  { iata: "UA", zh: "聯合航空", names: ["United", "United Airlines"] },
  { iata: "AA", zh: "美國航空", names: ["American Airlines"] },
  { iata: "DL", zh: "達美航空", names: ["Delta", "Delta Air Lines"] },
  { iata: "AC", zh: "加拿大航空", names: ["Air Canada"] },
  { iata: "QF", zh: "澳洲航空", names: ["Qantas"] },
  { iata: "NZ", zh: "紐西蘭航空", names: ["Air New Zealand"] },
];

function norm(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const BY_IATA = new Map(AIRLINES.map((airline) => [airline.iata, airline]));
const BY_NAME = new Map<string, Airline>();
for (const airline of AIRLINES) {
  BY_NAME.set(norm(airline.iata), airline);
  BY_NAME.set(norm(airline.zh), airline);
  for (const name of airline.names) BY_NAME.set(norm(name), airline);
}

export function lookupAirline(value: string): Airline | undefined {
  const raw = value.trim();
  if (!raw) return undefined;
  if (/^[A-Z0-9]{2}$/i.test(raw)) return BY_IATA.get(raw.toUpperCase());
  return BY_NAME.get(norm(raw));
}

/** 繁中顯示中文名；英文維持刮下來的字。找不到就原樣。 */
export function formatAirline(value: string, locale: Locale): string {
  const raw = value.trim();
  if (!raw || locale !== "zh-TW") return raw;
  return lookupAirline(raw)?.zh ?? raw;
}

/** 繁中有 IATA 就只翻代碼，避免 GK + Jetstar 變成兩家。 */
export function formatAirlineList(values: string[], locale: Locale): string {
  const cleaned = values.map((value) => value.trim()).filter(Boolean);
  const iatas = cleaned.filter((value) => /^[A-Z0-9]{2}$/i.test(value));
  const source = locale === "zh-TW" && iatas.length > 0 ? iatas : cleaned;
  return [...new Set(source.map((value) => formatAirline(value, locale)).filter(Boolean))].join(" · ");
}

type LegAirlines = {
  airlines: string[];
  segments: { airline: string }[];
};

function airlineKeysOnLeg(leg: LegAirlines): string[] {
  const raw = leg.segments.map((segment) => segment.airline).filter(Boolean);
  const source = raw.length > 0 ? raw : leg.airlines;
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const value of source) {
    const airline = lookupAirline(value);
    const key = airline?.iata ?? value.trim().toUpperCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
  }
  return keys;
}

/** 來回各一件 20kg 預購。同一航段同一家只收一次；轉機兩家廉航就各算一次。 */
export function estimateCheckedBagFee(itinerary: { outbound: LegAirlines; inbound: LegAirlines }): {
  extraTwd: number;
  carriers: string[];
} {
  const carriers = new Set<string>();
  let extraTwd = 0;
  for (const leg of [itinerary.outbound, itinerary.inbound]) {
    const seenOnLeg = new Set<string>();
    for (const key of airlineKeysOnLeg(leg)) {
      const airline = lookupAirline(key);
      if (!airline?.checkedBagTwd || seenOnLeg.has(airline.iata)) continue;
      seenOnLeg.add(airline.iata);
      extraTwd += airline.checkedBagTwd;
      carriers.add(airline.iata);
    }
  }
  return { extraTwd, carriers: [...carriers] };
}
