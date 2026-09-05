import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Page } from "playwright";
import { withPage } from "./browser";
import { googleFlightsSearchUrl } from "./normalize";
import {
  optionFingerprint,
  parseCardText,
  parseFlightIds,
  parsePrice,
  to24h,
  type FlightId,
  type ScrapedOption,
} from "./parse-card";

export class ScrapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScrapeError";
  }
}

export type ScrapedPage = {
  url: string;
  options: ScrapedOption[];
  selectedOutbound?: { flights: FlightId[] };
  error?: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function departHint(clock: string): string {
  const [hours, minutes] = clock.split(":").map(Number);
  const hour12 = ((hours + 11) % 12) + 1;
  return `${hour12}:${String(minutes).padStart(2, "0")}`;
}

async function dismissConsent(page: Page) {
  const button = page.getByRole("button", { name: /accept all|i agree|^accept$/i }).first();
  if (await button.isVisible().catch(() => false)) {
    await button.click({ timeout: 3000 }).catch(() => undefined);
    await sleep(500);
  }
}

async function assertNotBlocked(page: Page) {
  const body = ((await page.locator("body").innerText().catch(() => "")) ?? "").slice(0, 2000);
  if (/unusual traffic|are you a robot|detected automated/i.test(body)) {
    throw new ScrapeError(
      "Google showed a block/CAPTCHA. Complete it in the Chromium window, then search again.",
    );
  }
}

async function dumpError(page: Page) {
  try {
    await mkdir(path.join(process.cwd(), ".cache"), { recursive: true });
    await page.screenshot({ path: path.join(process.cwd(), ".cache", "last-error.png"), fullPage: true });
    const html = await page.content();
    await writeFile(path.join(process.cwd(), ".cache", "last-error.html"), html, "utf8");
  } catch {
    // 除錯檔失敗就略過
  }
}

async function waitForResults(page: Page) {
  await dismissConsent(page);
  await assertNotBlocked(page);
  try {
    await page.waitForFunction(
      () => {
        const text = document.body?.innerText ?? "";
        return (
          /\d{1,2}:\d{2}/.test(text) &&
          /(TWD|NT\$|Nonstop|\d+\s+stops?)/i.test(text)
        );
      },
      { timeout: 45000 },
    );
  } catch {
    await dumpError(page);
    await assertNotBlocked(page);
    throw new ScrapeError(
      `Timed out waiting for Google Flights results (${page.url()}). See .cache/last-error.png`,
    );
  }
  const more = page.getByRole("button", { name: /view more flights/i }).first();
  if (await more.isVisible().catch(() => false)) {
    await more.click().catch(() => undefined);
    await sleep(800);
  }
}

async function expandCardDetails(page: Page) {
  await page.evaluate(() => {
    for (const button of document.querySelectorAll("[role='listitem'] button[aria-expanded='false'], li button[aria-expanded='false']")) {
      if (!(button instanceof HTMLButtonElement)) continue;
      const label = (button.getAttribute("aria-label") ?? "").toLowerCase();
      if (!label.includes("flight details") && !label.includes("details")) continue;
      button.click();
    }
  });
  await sleep(1500);
}

async function collectCardRows(
  page: Page,
  maxLen = 1200,
): Promise<{ text: string; aria: string; href: string }[]> {
  return page.evaluate((limit) => {
    const found: { text: string; aria: string; href: string }[] = [];
    const nodes = document.querySelectorAll("[role='listitem'], li");
    for (const node of nodes) {
      if (!(node instanceof HTMLElement)) continue;
      const text = node.innerText?.trim() ?? "";
      if (text.length < 50 || text.length > limit) continue;
      if (!/\d{1,2}:\d{2}/.test(text)) continue;
      if (!/(TWD|NT\$|Nonstop|\d+\s+stops?)/i.test(text)) continue;
      const aria = [
        node.getAttribute("aria-label") ?? "",
        ...[...node.querySelectorAll("[aria-label]")].map((el) => el.getAttribute("aria-label") ?? ""),
      ].join("\n");
      const href =
        [...node.querySelectorAll("a[href]")].map((el) => (el as HTMLAnchorElement).href).find((value) =>
          value.includes("/travel/flights/booking"),
        ) ?? "";
      found.push({ text, aria, href });
    }
    return found;
  }, maxLen);
}

function parseRows(
  rows: { text: string; aria: string; href: string }[],
  args: { from: string; to: string; date: string },
): ScrapedOption[] {
  const byKey = new Map<string, ScrapedOption>();
  for (const row of rows) {
    const option = parseCardText(row.text, args);
    if (!option) continue;
    if (row.href) option.bookingUrl = row.href;
    if (option.flights.length === 0) option.flights = parseFlightIds(`${row.text}\n${row.aria}`);
    const key = optionFingerprint(option);
    const existing = byKey.get(key);
    const flights =
      !existing || option.flights.length >= existing.flights.length
        ? option.flights
        : existing.flights;
    const bookingUrl = option.bookingUrl || existing?.bookingUrl || null;
    if (
      !existing ||
      flights.length > existing.flights.length ||
      option.cardText.length < existing.cardText.length
    ) {
      byKey.set(key, { ...option, flights, bookingUrl });
    }
  }
  return [...byKey.values()];
}

function attachFlightsFromDetails(options: ScrapedOption[], details: string) {
  const flights = parseFlightIds(details);
  if (flights.length === 0) return;
  const price = parsePrice(details);
  const clocks = [...details.matchAll(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/gi)]
    .map((match) => to24h(match[1]))
    .filter((value): value is string => Boolean(value));
  for (const option of options) {
    if (option.flights.length >= flights.length) continue;
    if (price != null && option.price !== price) continue;
    if (clocks[0] && option.departClock !== clocks[0]) continue;
    option.flights = flights;
  }
}

async function extractCards(
  page: Page,
  args: { from: string; to: string; date: string },
): Promise<ScrapedOption[]> {
  const compact = parseRows(await collectCardRows(page), args);
  await expandCardDetails(page);
  const expandedRows = await collectCardRows(page, 5000);
  for (const row of expandedRows) {
    attachFlightsFromDetails(compact, `${row.text}\n${row.aria}`);
  }
  return compact.sort((a, b) => a.price - b.price);
}

async function extractSelectedOutbound(page: Page): Promise<FlightId[]> {
  const blob = await page.evaluate(() => {
    const chunks: string[] = [];
    const body = document.body?.innerText ?? "";
    const departing = body.match(/departing[\s\S]{0,400}/i);
    if (departing) chunks.push(departing[0]);
    for (const node of document.querySelectorAll("[aria-label]")) {
      const label = node.getAttribute("aria-label") ?? "";
      if (/depart|outbound|selected/i.test(label)) chunks.push(label);
    }
    return chunks.join("\n");
  });
  return parseFlightIds(blob);
}

async function openSearch(
  page: Page,
  origin: string,
  destination: string,
  outboundDate: string,
  returnDate: string,
) {
  const url = googleFlightsSearchUrl(origin, destination, outboundDate, returnDate);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await waitForResults(page);
  return url;
}

export async function scrapeOutbound(args: {
  origin: string;
  destination: string;
  outboundDate: string;
  returnDate: string;
}): Promise<ScrapedPage> {
  return withPage(async (page) => {
    try {
      const url = await openSearch(
        page,
        args.origin,
        args.destination,
        args.outboundDate,
        args.returnDate,
      );
      const options = await extractCards(page, {
        from: args.origin,
        to: args.destination,
        date: args.outboundDate,
      });
      if (options.length === 0) {
        await dumpError(page);
        return { url, options: [], error: "No outbound cards parsed. See .cache/last-error.png" };
      }
      return { url, options };
    } catch (error) {
      await dumpError(page);
      throw error;
    }
  });
}

export async function scrapeReturns(args: {
  origin: string;
  destination: string;
  outboundDate: string;
  returnDate: string;
  outbound: ScrapedOption;
}): Promise<ScrapedPage> {
  return withPage(async (page) => {
    try {
      const url = await openSearch(
        page,
        args.origin,
        args.destination,
        args.outboundDate,
        args.returnDate,
      );
      const hint = departHint(args.outbound.departClock);
      const price = args.outbound.price.toLocaleString("en-US");
      const card = page
        .locator("[role='listitem'], li")
        .filter({ hasText: hint })
        .filter({ hasText: price })
        .first();

      if ((await card.count()) === 0) {
        return { url, options: [], error: "Could not click matching outbound card" };
      }
      await card.click();
      await sleep(1200);
      await waitForResults(page);

      const selectedOutbound = { flights: await extractSelectedOutbound(page) };
      const options = await extractCards(page, {
        from: args.destination,
        to: args.origin,
        date: args.returnDate,
      });
      const back = page.getByRole("button", {
        name: /change departing|departing flight|^back$/i,
      }).first();
      if (await back.isVisible().catch(() => false)) {
        await back.click().catch(() => undefined);
        await sleep(600);
      }
      return { url: page.url(), options, selectedOutbound };
    } catch (error) {
      await dumpError(page);
      throw error;
    }
  });
}
