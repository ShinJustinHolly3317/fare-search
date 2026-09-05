import { MAX_DATE_PAIRS, type DatePair } from "./types";

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

/**
 * 去程日期 × 回程日期。回程必須晚於去程。
 * 不在這裡丟 cap error，方便表單先算數量。
 */
export function expandDatePairs(
  outboundFrom: string,
  outboundTo: string,
  returnFrom: string,
  returnTo: string,
): DatePair[] {
  const pairs: DatePair[] = [];
  for (const outboundDate of eachDate(outboundFrom, outboundTo)) {
    for (const returnDate of eachDate(returnFrom, returnTo)) {
      if (returnDate > outboundDate) {
        pairs.push({ outboundDate, returnDate });
      }
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
      `Date window is ${pairCount} pairs. Cap is ${MAX_DATE_PAIRS}. Shrink the ranges.`,
    );
    this.name = "PairCapError";
    this.pairCount = pairCount;
  }
}
