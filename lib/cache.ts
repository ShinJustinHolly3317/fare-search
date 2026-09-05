import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const CACHE_DIR = path.join(process.cwd(), ".cache");

function fileFor(key: string): string {
  const hash = createHash("sha256").update(key).digest("hex");
  return path.join(CACHE_DIR, `${hash}.json`);
}

export function outboundCacheKey(args: {
  origin: string;
  destination: string;
  outboundDate: string;
  returnDate: string;
}): string {
  return [
    "flights",
    args.origin,
    args.destination,
    args.outboundDate,
    args.returnDate,
    "economy",
    "TWD",
  ].join("|");
}

export function returnCacheKey(departureToken: string): string {
  return `returns|${departureToken}`;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await readFile(fileFor(key), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(fileFor(key), JSON.stringify(value), "utf8");
}
