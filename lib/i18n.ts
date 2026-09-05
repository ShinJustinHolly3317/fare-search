export type Locale = "en" | "zh-TW";

export const LOCALES: Locale[] = ["en", "zh-TW"];

export const messages = {
  en: {
    tagline: "Cheapest round-trip that actually fits your times. Localhost + a real Chromium window.",
    stack: "TWD · economy · headed Playwright · Google Flights",
    language: "Language",
    langEn: "EN",
    langZh: "繁中",
    from: "From",
    to: "To",
    airportPlaceholder: "City, country, airport, or IATA",
    leaveFrom: "Leave from",
    leaveUntil: "Leave until",
    backFrom: "Back from",
    backUntil: "Back until",
    maxStops: "Max stops",
    nonstop: "Nonstop",
    oneStop: "1 stop",
    twoStops: "2 stops",
    maxLayover: "Max layover (min)",
    none: "none",
    outbound: "Outbound",
    inbound: "Return",
    departAfter: "Depart after",
    departBefore: "Depart before",
    arriveBefore: "Arrive before",
    noAirportChange: "No airport change",
    search: "Search",
    searching: "Searching…",
    invertedDates: "Date range is inverted.",
    overCap: "{count} pairs — over the {max} cap. Shrink the window.",
    creditEstimate:
      "This will open up to {pairs} Google Flights pages (plus up to {returns} return clicks). Sequential. Cache makes repeats free.",
    datePairs: "{done} / {total} date pairs",
    fitTimes: "{count} fit your times",
    dumped: ", dumped {count}",
    livePages: " · {count} live pages",
    cachedPairs: " · {count} cached pairs",
    emptyDumped: "0 fit your times, dumped {count}{reasons}. Loosen the windows and try again.",
    searchFailed: "Search failed",
    price: "Price",
    dates: "Dates",
    stops: "Stops",
    layover: "Layover",
    airlines: "Airlines",
    legs: "Legs",
    hide: "Hide",
    googleFlights: "Google Flights",
    layoverAt: "layover {airport} {duration}",
    overnight: " · overnight",
    reason_outbound_depart_after: "outbound too early",
    reason_outbound_depart_before: "outbound too late",
    reason_outbound_arrive_before: "outbound arrives too late",
    reason_inbound_depart_after: "return too early",
    reason_inbound_depart_before: "return too late",
    reason_inbound_arrive_before: "return arrives too late",
    reason_max_stops: "too many stops",
    reason_max_layover: "layover too long",
    reason_airport_change: "airport change",
    reason_missing_return: "no matching return",
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const,
    durationHm: "{h}h {m}m",
    durationH: "{h}h",
  },
  "zh-TW": {
    tagline: "找出時間符合你習慣、價格最便宜的來回組合。本機 + Chromium 視窗。",
    stack: "TWD · 經濟艙 · Playwright · Google 航班",
    language: "語言",
    langEn: "EN",
    langZh: "繁中",
    from: "出發地",
    to: "目的地",
    airportPlaceholder: "城市、國家、機場名稱或 IATA",
    leaveFrom: "最早出發",
    leaveUntil: "最晚出發",
    backFrom: "最早回程",
    backUntil: "最晚回程",
    maxStops: "最多轉機",
    nonstop: "直飛",
    oneStop: "1 次轉機",
    twoStops: "2 次轉機",
    maxLayover: "最長轉機（分）",
    none: "不限",
    outbound: "去程",
    inbound: "回程",
    departAfter: "起飛不早於",
    departBefore: "起飛不晚於",
    arriveBefore: "抵達不晚於",
    noAirportChange: "不可換機場",
    search: "搜尋",
    searching: "搜尋中…",
    invertedDates: "日期區間反了。",
    overCap: "{count} 組日期，超過上限 {max}。請縮小區間。",
    creditEstimate:
      "最多會開 {pairs} 個 Google 航班頁（外加最多 {returns} 次回程點擊）。依序執行，快取之後免費。",
    datePairs: "{done} / {total} 組日期",
    fitTimes: "{count} 筆符合你的時間",
    dumped: "，淘汰 {count}",
    livePages: " · {count} 次即時抓取",
    cachedPairs: " · {count} 組走快取",
    emptyDumped: "沒有符合時間的航班，淘汰 {count}{reasons}。放寬條件再試。",
    searchFailed: "搜尋失敗",
    price: "價格",
    dates: "日期",
    stops: "轉機",
    layover: "轉機時間",
    airlines: "航空公司",
    legs: "航段",
    hide: "收合",
    googleFlights: "Google 航班",
    layoverAt: "轉機 {airport} {duration}",
    overnight: " · 過夜",
    reason_outbound_depart_after: "去程太早",
    reason_outbound_depart_before: "去程太晚",
    reason_outbound_arrive_before: "去程抵達太晚",
    reason_inbound_depart_after: "回程太早",
    reason_inbound_depart_before: "回程太晚",
    reason_inbound_arrive_before: "回程抵達太晚",
    reason_max_stops: "轉機太多",
    reason_max_layover: "轉機太久",
    reason_airport_change: "換機場",
    reason_missing_return: "沒有符合的回程",
    months: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"] as const,
    durationHm: "{h}小時 {m}分",
    durationH: "{h}小時",
  },
} as const;

export type MessageKey = Exclude<keyof (typeof messages)["en"], "months">;

const STORAGE_KEY = "farefit.locale";

export function interpolate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}

export function isLocale(value: string | null): value is Locale {
  return value === "en" || value === "zh-TW";
}

export function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) return stored;
    if (typeof navigator !== "undefined" && /^zh/i.test(navigator.language)) {
      return "zh-TW";
    }
  } catch {
    // 讀不到 storage 就用英文
  }
  return "en";
}

let currentLocale: Locale | null = null;
const listeners = new Set<() => void>();

export function getLocale(): Locale {
  return currentLocale ?? "en";
}

/** 等 hydration 結束再讀 storage / navigator，避免 SSR 對不上 */
export function hydrateLocale() {
  if (currentLocale) return;
  setLocale(detectLocale());
}

export function subscribeLocale(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setLocale(next: Locale) {
  currentLocale = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // 寫不進去就算了
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = next;
  }
  for (const listener of listeners) listener();
}

export function t(
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const template = messages[locale][key];
  return vars ? interpolate(template, vars) : template;
}

export function monthLabel(locale: Locale, monthIndex: number): string {
  return messages[locale].months[monthIndex] ?? "";
}
