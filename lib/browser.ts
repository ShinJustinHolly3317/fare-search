import { existsSync } from "node:fs";
import path from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";

const PROFILE_DIR = path.join(process.cwd(), ".playwright-profile");

type BrowserStore = {
  context?: BrowserContext;
  page?: Page;
  queue: Promise<unknown>;
};

const globalStore = globalThis as typeof globalThis & { __farefitPw?: BrowserStore };

function store(): BrowserStore {
  if (!globalStore.__farefitPw) {
    globalStore.__farefitPw = { queue: Promise.resolve() };
  }
  return globalStore.__farefitPw;
}

async function getPage(): Promise<Page> {
  const current = store();
  if (current.page && current.context) {
    try {
      await current.page.evaluate(() => true);
      return current.page;
    } catch {
      current.page = undefined;
      current.context = undefined;
    }
  }

  const inDocker = existsSync("/.dockerenv");
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: process.env.PLAYWRIGHT_HEADLESS === "1",
    viewport: { width: 1400, height: 900 },
    locale: "en-US",
    timezoneId: "Asia/Taipei",
    // Docker 裡沒這兩個 flag，Chromium 會直接掛
    args: inDocker ? ["--no-sandbox", "--disable-dev-shm-usage"] : [],
  });
  const page = context.pages()[0] ?? (await context.newPage());
  current.context = context;
  current.page = page;
  return page;
}

/** 同一個 headed browser，操作必須排隊 */
export async function withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
  const current = store();
  const previous = current.queue;
  let release!: () => void;
  current.queue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await fn(await getPage());
  } finally {
    release();
  }
}

/** 強制停搜：關掉 headed Chromium，下一輪會重開 */
export async function killBrowser(): Promise<void> {
  const current = store();
  const context = current.context;
  current.page = undefined;
  current.context = undefined;
  await context?.close().catch(() => undefined);
}
