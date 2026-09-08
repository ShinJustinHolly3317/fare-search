import { MAX_DATE_PAIRS, type DatePair, type WeekendOverlap } from "./types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** 把 YYYY-MM-DD 轉成 UTC 午夜，方便加減天 */
export function parseIsoDate(iso: string): Date {
  if (!ISO_DATE.test(iso)) {
    throw new Error(`Invalid date: ${iso}`);
  }
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** 台灣今天的 YYYY-MM-DD，不要用瀏覽器當地時區亂飄 */
export function todayIsoTw(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
}

/** 月曆 6 週格子，週日開頭，含前後月的日子 */
export function calendarCells(year: number, monthIndex: number): string[] {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const startPad = first.getUTCDay();
  const prev = new Date(Date.UTC(year, monthIndex, 0));
  const prevDays = prev.getUTCDate();
  const cells: string[] = [];
  for (let i = startPad - 1; i >= 0; i--) {
    cells.push(formatIsoDate(new Date(Date.UTC(year, monthIndex - 1, prevDays - i))));
  }
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(formatIsoDate(new Date(Date.UTC(year, monthIndex, day))));
  }
  while (cells.length < 42) {
    const last = parseIsoDate(cells[cells.length - 1]);
    last.setUTCDate(last.getUTCDate() + 1);
    cells.push(formatIsoDate(last));
  }
  return cells;
}

/** 含頭含尾的日期清單 */
export function eachDate(from: string, to: string): string[] {
  const start = parseIsoDate(from);
  const end = parseIsoDate(to);
  if (start.getTime() > end.getTime()) {
    throw new Error(`Date range inverted: ${from} > ${to}`);
  }
  const out: string[] = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    out.push(formatIsoDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

/** 回程減去程的整天數。10 號走、14 號回 = 4 天 */
export function stayDays(outboundDate: string, returnDate: string): number {
  const ms =
    parseIsoDate(returnDate).getTime() - parseIsoDate(outboundDate).getTime();
  return Math.round(ms / 86_400_000);
}

export type StayFilter = {
  minDays?: number | null;
  maxDays?: number | null;
  weekendOverlap?: WeekendOverlap;
};

/**
 * 含出發日與回程日。只看有沒有碰到週六／週日，
 * 不是把跨兩週的週六加總成 2 天。
 */
export function weekendCoverage(
  outboundDate: string,
  returnDate: string,
): { saturday: boolean; sunday: boolean } {
  let saturday = false;
  let sunday = false;
  for (const iso of eachDate(outboundDate, returnDate)) {
    const day = parseIsoDate(iso).getUTCDay();
    if (day === 6) saturday = true;
    else if (day === 0) sunday = true;
    if (saturday && sunday) break;
  }
  return { saturday, sunday };
}

export function fitsWeekendOverlap(
  outboundDate: string,
  returnDate: string,
  overlap: WeekendOverlap = "any",
): boolean {
  if (overlap === "any") return true;
  const { saturday, sunday } = weekendCoverage(outboundDate, returnDate);
  if (overlap === "none") return !saturday && !sunday;
  if (overlap === "atLeastOne") return saturday || sunday;
  return saturday && sunday;
}

/**
 * 去程日期 × 回程日期。回程必須晚於去程。
 * stay 用來砍掉太短／太長的組合，避免白抓 7 天的票。
 * 不在這裡丟 cap error，方便表單先算數量。
 */
export function expandDatePairs(
  outboundFrom: string,
  outboundTo: string,
  returnFrom: string,
  returnTo: string,
  stay?: StayFilter,
): DatePair[] {
  const pairs: DatePair[] = [];
  const weekendOverlap = stay?.weekendOverlap ?? "any";
  for (const outboundDate of eachDate(outboundFrom, outboundTo)) {
    for (const returnDate of eachDate(returnFrom, returnTo)) {
      if (returnDate <= outboundDate) continue;
      const days = stayDays(outboundDate, returnDate);
      if (stay?.minDays != null && days < stay.minDays) continue;
      if (stay?.maxDays != null && days > stay.maxDays) continue;
      if (!fitsWeekendOverlap(outboundDate, returnDate, weekendOverlap)) continue;
      pairs.push({ outboundDate, returnDate });
    }
  }
  return pairs;
}

export function assertPairCap(pairCount: number): void {
  if (pairCount > MAX_DATE_PAIRS) {
    throw new PairCapError(pairCount);
  }
}

export class PairCapError extends Error {
  readonly pairCount: number;
  readonly maxPairs = MAX_DATE_PAIRS;

  constructor(pairCount: number) {
    super(
      `Search is ${pairCount} jobs. Cap is ${MAX_DATE_PAIRS}. Shrink dates or pick a city, not a whole country.`,
    );
    this.name = "PairCapError";
    this.pairCount = pairCount;
  }
}
