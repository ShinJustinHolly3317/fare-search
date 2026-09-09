export type Locale = "en" | "zh-TW";

export const LOCALES: Locale[] = ["en", "zh-TW"];

export const messages = {
  en: {
    tagline: "Cheapest round-trip that actually fits your times. Localhost + a real Chromium window.",
    stack: "TWD · economy · headed Playwright · Google Flights",
    language: "Language",
    langEn: "EN",
    langZh: "繁中",
    groupRoute: "Route",
    groupLeave: "Leave window",
    groupBack: "Return window",
    groupStay: "Stay",
    groupHops: "Stops",
    from: "From",
    to: "To",
    originPlaceholder: "City, airport, or IATA",
    airportPlaceholder: "City, country, airport, or IATA",
    destAirports: "Airports: {codes}",
    unknownDest: "Unknown destination.",
    placeCity: "City",
    placeCountry: "Country",
    placeAirport: "Airport",
    leaveFrom: "Leave from",
    leaveUntil: "Leave until",
    backFrom: "Back from",
    backUntil: "Back until",
    datePrevMonth: "Previous month",
    dateNextMonth: "Next month",
    dateHolidayLegend: "TW holiday",
    holidayMakeup: "{name} (observed)",
    holidayNewYear: "New Year",
    holidayCnyEveEve: "Day before NY Eve",
    holidayCnyEve: "Lunar NY Eve",
    holidayCny: "Lunar New Year",
    holidayPeaceMemorial: "Peace Memorial",
    holidayChildrensDay: "Children's Day",
    holidayTombSweeping: "Tomb Sweeping",
    holidayLaborDay: "Labor Day",
    holidayDragonBoat: "Dragon Boat",
    holidayMidAutumn: "Mid-Autumn",
    holidayTeachersDay: "Teachers' Day",
    holidayNationalDay: "National Day",
    holidayRestorationDay: "Restoration Day",
    holidayConstitutionDay: "Constitution Day",
    maxStops: "Max stops",
    nonstop: "Nonstop",
    oneStop: "1 stop",
    twoStops: "2 stops",
    maxLayover: "Max layover (min)",
    stayMin: "Min stay (days)",
    stayMax: "Max stay (days)",
    invertedStay: "Stay range is inverted.",
    noStayPairs: "No date pairs fit those filters. Widen stay, weekend, or the date windows.",
    none: "none",
    weekendOverlap: "Weekend",
    weekendAny: "Don't care",
    weekendNone: "Weekdays only",
    weekendAtLeastOne: "At least 1 weekend day",
    weekendBoth: "Both Sat & Sun",
    outbound: "Outbound",
    inbound: "Return",
    departAfter: "Depart after",
    departBefore: "Depart before",
    arriveBefore: "Arrive before",
    noAirportChange: "No airport change",
    search: "Search",
    searching: "Searching…",
    invertedDates: "Date range is inverted.",
    overCap: "{count} searches, over the {max} cap. Shrink dates or pick a city, not a whole country.",
    creditEstimate:
      "This will open up to {pairs} Google Flights pages (plus up to {returns} return clicks). Sequential. Cache makes repeats free.",
    datePairs: "{done} / {total} searches",
    fitTimes: "{count} fit your times",
    dumped: ", dumped {count}",
    livePages: " · {count} live pages",
    cachedPairs: " · {count} cached pairs",
    emptyDumped: "0 fit your times, dumped {count}{reasons}. Loosen the windows and try again.",
    searchFailed: "Search failed",
    price: "Price",
    bagEst: "+ ~{amount} bag",
    bagNote: "Bag line is ~20kg prepaid each way on unbundled fares. Full-service economy usually already includes it.",
    dates: "Dates",
    stops: "Stops",
    layover: "Layover",
    airlines: "Airlines",
    legs: "Legs",
    hide: "Hide",
    viewDeal: "View deal",
    bagsIncluded: "Bags included",
    rankedByTicket: "ranked by ticket",
    emptyHint: "Set the window and search. Fits land here as deals.",
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
    weekdays: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const,
    durationHm: "{h}h {m}m",
    durationH: "{h}h",
  },
  "zh-TW": {
    tagline: "找出時間符合你習慣、價格最便宜的來回組合。本機 + Chromium 視窗。",
    stack: "TWD · 經濟艙 · Playwright · Google 航班",
    language: "語言",
    langEn: "EN",
    langZh: "繁中",
    groupRoute: "航線",
    groupLeave: "出發區間",
    groupBack: "回程區間",
    groupStay: "停留",
    groupHops: "轉機",
    from: "出發地",
    to: "目的地",
    originPlaceholder: "城市、機場名稱或 IATA",
    airportPlaceholder: "城市、國家、機場名稱或 IATA",
    destAirports: "機場：{codes}",
    unknownDest: "找不到這個目的地。",
    placeCity: "城市",
    placeCountry: "國家",
    placeAirport: "機場",
    leaveFrom: "最早出發",
    leaveUntil: "最晚出發",
    backFrom: "最早回程",
    backUntil: "最晚回程",
    datePrevMonth: "上個月",
    dateNextMonth: "下個月",
    dateHolidayLegend: "國定假日",
    holidayMakeup: "{name}補假",
    holidayNewYear: "開國紀念日",
    holidayCnyEveEve: "除夕前一日",
    holidayCnyEve: "除夕",
    holidayCny: "春節",
    holidayPeaceMemorial: "和平紀念日",
    holidayChildrensDay: "兒童節",
    holidayTombSweeping: "清明節",
    holidayLaborDay: "勞動節",
    holidayDragonBoat: "端午節",
    holidayMidAutumn: "中秋節",
    holidayTeachersDay: "教師節",
    holidayNationalDay: "國慶日",
    holidayRestorationDay: "光復節",
    holidayConstitutionDay: "行憲紀念日",
    maxStops: "最多轉機",
    nonstop: "直飛",
    oneStop: "1 次轉機",
    twoStops: "2 次轉機",
    maxLayover: "最長轉機（分）",
    stayMin: "最短停留（天）",
    stayMax: "最長停留（天）",
    invertedStay: "停留天數區間反了。",
    noStayPairs: "沒有日期組合符合停留／週末條件。放寬天數、週末或出發／回程區間。",
    none: "不限",
    weekendOverlap: "週末",
    weekendAny: "不限",
    weekendNone: "不碰週末（平日）",
    weekendAtLeastOne: "至少 1 天週末",
    weekendBoth: "週六日都要",
    outbound: "去程",
    inbound: "回程",
    departAfter: "起飛不早於",
    departBefore: "起飛不晚於",
    arriveBefore: "抵達不晚於",
    noAirportChange: "不可換機場",
    search: "搜尋",
    searching: "搜尋中…",
    invertedDates: "日期區間反了。",
    overCap: "{count} 組搜尋，超過上限 {max}。縮小日期，或改選城市而不是整個國家。",
    creditEstimate:
      "最多會開 {pairs} 個 Google 航班頁（外加最多 {returns} 次回程點擊）。依序執行，快取之後免費。",
    datePairs: "{done} / {total} 組搜尋",
    fitTimes: "{count} 筆符合你的時間",
    dumped: "，淘汰 {count}",
    livePages: " · {count} 次即時抓取",
    cachedPairs: " · {count} 組走快取",
    emptyDumped: "沒有符合時間的航班，淘汰 {count}{reasons}。放寬條件再試。",
    searchFailed: "搜尋失敗",
    price: "價格",
    bagEst: "+ 約 {amount} 行李",
    bagNote: "行李是來回各一件 20kg 預購估價，只加在廉航裸票上。傳統航空經濟艙通常已含。",
    dates: "日期",
    stops: "轉機",
    layover: "轉機時間",
    airlines: "航空公司",
    legs: "航段",
    hide: "收合",
    viewDeal: "看方案",
    bagsIncluded: "含托運行李",
    rankedByTicket: "依票價排序",
    emptyHint: "設好時間再搜尋，符合的來回會排在這裡。",
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
    weekdays: ["日", "一", "二", "三", "四", "五", "六"] as const,
    durationHm: "{h}小時 {m}分",
    durationH: "{h}小時",
  },
} as const;

export type MessageKey = Exclude<keyof (typeof messages)["en"], "months" | "weekdays">;

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

export function weekdayLabel(locale: Locale, weekday: number): string {
  return messages[locale].weekdays[weekday] ?? "";
}
