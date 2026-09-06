"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type ReactNode,
} from "react";
import { AirportField } from "@/components/airport-field";
import { expandDatePairs } from "@/lib/dates";
import { rankItineraries } from "@/lib/filter";
import { type Locale, type MessageKey } from "@/lib/i18n";
import { useI18n } from "@/lib/use-i18n";
import {
  MAX_DATE_PAIRS,
  MAX_RETURN_LOOKUPS_PER_PAIR,
  type Itinerary,
  type Leg,
  type RejectReason,
  type SearchEvent,
  type SearchQuery,
  isWeekendOverlap,
} from "@/lib/types";

const STORAGE_KEY = "farefit.form.v1";

const REASON_KEY: Record<RejectReason, MessageKey> = {
  outbound_depart_after: "reason_outbound_depart_after",
  outbound_depart_before: "reason_outbound_depart_before",
  outbound_arrive_before: "reason_outbound_arrive_before",
  inbound_depart_after: "reason_inbound_depart_after",
  inbound_depart_before: "reason_inbound_depart_before",
  inbound_arrive_before: "reason_inbound_arrive_before",
  max_stops: "reason_max_stops",
  max_layover: "reason_max_layover",
  airport_change: "reason_airport_change",
  missing_return: "reason_missing_return",
};

function addDays(n: number): string {
  const date = new Date();
  date.setDate(date.getDate() + n);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function defaultQuery(): SearchQuery {
  return {
    origin: "TPE",
    destination: "NRT",
    outboundFrom: addDays(21),
    outboundTo: addDays(23),
    returnFrom: addDays(28),
    returnTo: addDays(30),
    outbound: { departAfter: "09:00", departBefore: "18:00", arriveBefore: "22:00" },
    inbound: { departAfter: "09:00", departBefore: "18:00", arriveBefore: "21:00" },
    maxStops: 1,
    maxLayoverMinutes: 180,
    minStayDays: null,
    maxStayDays: null,
    weekendOverlap: "any",
    allowAirportChange: false,
  };
}

function loadQuery(): SearchQuery {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultQuery();
    const parsed = JSON.parse(raw) as Partial<SearchQuery>;
    return {
      ...defaultQuery(),
      ...parsed,
      weekendOverlap: isWeekendOverlap(parsed.weekendOverlap)
        ? parsed.weekendOverlap
        : "any",
    };
  } catch {
    return defaultQuery();
  }
}

const SERVER_FORM = defaultQuery();
let storedForm: SearchQuery | null = null;
const formListeners = new Set<() => void>();

function getStoredForm(): SearchQuery {
  if (!storedForm) storedForm = loadQuery();
  return storedForm;
}

function subscribeForm(listener: () => void) {
  formListeners.add(listener);
  return () => formListeners.delete(listener);
}

function writeForm(next: SearchQuery) {
  storedForm = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  for (const listener of formListeners) listener();
}

function clock(value: string): string {
  const match = value.match(/(\d{2}:\d{2})/);
  return match ? match[1] : value;
}

function shortDate(
  iso: string,
  locale: Locale,
  month: (index: number) => string,
): string {
  const [, m, d] = iso.split("-");
  const monthName = month(Number(m) - 1);
  const day = Number(d);
  return locale === "zh-TW" ? `${monthName}${day}日` : `${day} ${monthName}`;
}

function formatDuration(
  minutes: number,
  translate: (key: MessageKey, vars?: Record<string, string | number>) => string,
): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? translate("durationHm", { h, m }) : translate("durationH", { h });
}

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

function longestLayover(leg: Leg): number | null {
  if (leg.layovers.length === 0) return null;
  return Math.max(...leg.layovers.map((layover) => layover.durationMinutes));
}

function parseSseChunk(
  buffer: string,
  onEvent: (event: SearchEvent) => void,
): string {
  const blocks = buffer.split("\n\n");
  const rest = blocks.pop() ?? "";
  for (const block of blocks) {
    let name = "message";
    const data: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) name = line.slice(6).trim();
      if (line.startsWith("data:")) data.push(line.slice(5).trim());
    }
    if (!data.length) continue;
    try {
      onEvent(JSON.parse(data.join("\n")) as SearchEvent);
    } catch {
      onEvent({ type: "error", message: `Bad ${name} event` });
    }
  }
  return rest;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label>
      {label}
      {children}
    </label>
  );
}

function emptySubscribe() {
  return () => {};
}

export function SearchApp() {
  const { locale, setLocale, t, month } = useI18n();
  const hydrated = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const stored = useSyncExternalStore(subscribeForm, getStoredForm, () => SERVER_FORM);
  const form = hydrated ? stored : SERVER_FORM;

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const [searching, setSearching] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [dumped, setDumped] = useState(0);
  const [dumpedReasons, setDumpedReasons] = useState<Partial<Record<RejectReason, number>>>({});
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [cachedHits, setCachedHits] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const pairInfo = useMemo(() => {
    if (
      form.minStayDays != null &&
      form.maxStayDays != null &&
      form.minStayDays > form.maxStayDays
    ) {
      return { count: 0, invalid: "stay" as const };
    }
    try {
      const pairs = expandDatePairs(
        form.outboundFrom,
        form.outboundTo,
        form.returnFrom,
        form.returnTo,
        {
          minDays: form.minStayDays,
          maxDays: form.maxStayDays,
          weekendOverlap: form.weekendOverlap,
        },
      );
      return { count: pairs.length, invalid: false as const };
    } catch {
      return { count: 0, invalid: "dates" as const };
    }
  }, [
    form.outboundFrom,
    form.outboundTo,
    form.returnFrom,
    form.returnTo,
    form.minStayDays,
    form.maxStayDays,
    form.weekendOverlap,
  ]);

  const overCap = pairInfo.count > MAX_DATE_PAIRS;
  const maxCredits = pairInfo.count * (1 + MAX_RETURN_LOOKUPS_PER_PAIR);

  function patch<K extends keyof SearchQuery>(key: K, value: SearchQuery[K]) {
    writeForm({ ...form, [key]: value });
  }

  async function onSearch(event: FormEvent) {
    event.preventDefault();
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSearching(true);
    setError(null);
    setItineraries([]);
    setDumped(0);
    setDumpedReasons({});
    setCreditsUsed(0);
    setCachedHits(0);
    setProgress({ done: 0, total: pairInfo.count });
    setExpanded(null);

    try {
      const response = await fetch("/api/search/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? `HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const collected: Itinerary[] = [];
      const reasons: Partial<Record<RejectReason, number>> = {};
      let dumpedCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        buffer = parseSseChunk(buffer, (payload) => {
          if (payload.type === "error") {
            setError(payload.message);
            return;
          }
          if (payload.type === "start") {
            setProgress({ done: 0, total: payload.pairCount });
            return;
          }
          if (payload.type === "pair") {
            collected.push(...payload.pair.itineraries);
            dumpedCount += payload.pair.dumped.length;
            for (const item of payload.pair.dumped) {
              reasons[item.reason] = (reasons[item.reason] ?? 0) + 1;
            }
            setItineraries(rankItineraries(collected));
            setDumped(dumpedCount);
            setDumpedReasons({ ...reasons });
            setCreditsUsed((current) => current + payload.pair.creditsUsed);
            setProgress((current) => ({
              ...current,
              done: current.done + 1,
            }));
            return;
          }
          if (payload.type === "done") {
            setCreditsUsed(payload.creditsUsed);
            setCachedHits(payload.cachedHits);
            setDumped(payload.dumped);
            setDumpedReasons(payload.dumpedReasons);
            setItineraries(rankItineraries(collected));
          }
        });
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : t("searchFailed"));
    } finally {
      setSearching(false);
    }
  }

  const reasonText = Object.entries(dumpedReasons)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .map(([reason, count]) => `${t(REASON_KEY[reason as RejectReason])} ${count}`)
    .join(", ");

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex items-end justify-between gap-6 border-b border-line pb-6">
        <div>
          <p className="font-display text-4xl italic tracking-tight">Farefit</p>
          <p className="mt-1 text-sm text-muted">{t("tagline")}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex border border-line font-mono text-xs" role="group" aria-label={t("language")}>
            <button
              type="button"
              className={`px-2 py-1 ${locale === "en" ? "bg-ink text-paper" : "text-muted"}`}
              onClick={() => setLocale("en")}
            >
              {t("langEn")}
            </button>
            <button
              type="button"
              className={`px-2 py-1 ${locale === "zh-TW" ? "bg-ink text-paper" : "text-muted"}`}
              onClick={() => setLocale("zh-TW")}
            >
              {t("langZh")}
            </button>
          </div>
          <p className="font-mono text-xs text-muted">{t("stack")}</p>
        </div>
      </header>

      <form onSubmit={onSearch} className="grid gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AirportField
            id="origin"
            label={t("from")}
            placeholder={t("airportPlaceholder")}
            value={form.origin}
            onChange={(iata) => patch("origin", iata)}
          />
          <AirportField
            id="destination"
            label={t("to")}
            placeholder={t("airportPlaceholder")}
            value={form.destination}
            onChange={(iata) => patch("destination", iata)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label={t("leaveFrom")}>
            <input
              type="date"
              value={form.outboundFrom}
              onChange={(e) => patch("outboundFrom", e.target.value)}
            />
          </Field>
          <Field label={t("leaveUntil")}>
            <input
              type="date"
              value={form.outboundTo}
              onChange={(e) => patch("outboundTo", e.target.value)}
            />
          </Field>
          <Field label={t("backFrom")}>
            <input
              type="date"
              value={form.returnFrom}
              onChange={(e) => patch("returnFrom", e.target.value)}
            />
          </Field>
          <Field label={t("backUntil")}>
            <input
              type="date"
              value={form.returnTo}
              onChange={(e) => patch("returnTo", e.target.value)}
            />
          </Field>
          <Field label={t("maxStops")}>
            <select
              value={form.maxStops}
              onChange={(e) => patch("maxStops", Number(e.target.value))}
            >
              <option value={0}>{t("nonstop")}</option>
              <option value={1}>{t("oneStop")}</option>
              <option value={2}>{t("twoStops")}</option>
            </select>
          </Field>
          <Field label={t("maxLayover")}>
            <input
              type="number"
              min={0}
              placeholder={t("none")}
              value={form.maxLayoverMinutes ?? ""}
              onChange={(e) =>
                patch(
                  "maxLayoverMinutes",
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
            />
          </Field>
          <Field label={t("stayMin")}>
            <input
              type="number"
              min={1}
              placeholder={t("none")}
              value={form.minStayDays ?? ""}
              onChange={(e) =>
                patch(
                  "minStayDays",
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
            />
          </Field>
          <Field label={t("stayMax")}>
            <input
              type="number"
              min={1}
              placeholder={t("none")}
              value={form.maxStayDays ?? ""}
              onChange={(e) =>
                patch(
                  "maxStayDays",
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
            />
          </Field>
          <Field label={t("weekendOverlap")}>
            <select
              value={form.weekendOverlap}
              onChange={(e) =>
                patch(
                  "weekendOverlap",
                  isWeekendOverlap(e.target.value) ? e.target.value : "any",
                )
              }
            >
              <option value="any">{t("weekendAny")}</option>
              <option value="none">{t("weekendNone")}</option>
              <option value="atLeastOne">{t("weekendAtLeastOne")}</option>
              <option value="both">{t("weekendBoth")}</option>
            </select>
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <fieldset className="grid grid-cols-3 gap-3 border border-line p-4">
            <legend className={`px-1 font-mono text-xs text-muted ${locale === "zh-TW" ? "tracking-normal" : "uppercase tracking-widest"}`}>
              {t("outbound")}
            </legend>
            <Field label={t("departAfter")}>
              <input
                type="time"
                value={form.outbound.departAfter}
                onChange={(e) =>
                  patch("outbound", { ...form.outbound, departAfter: e.target.value })
                }
              />
            </Field>
            <Field label={t("departBefore")}>
              <input
                type="time"
                value={form.outbound.departBefore}
                onChange={(e) =>
                  patch("outbound", { ...form.outbound, departBefore: e.target.value })
                }
              />
            </Field>
            <Field label={t("arriveBefore")}>
              <input
                type="time"
                value={form.outbound.arriveBefore}
                onChange={(e) =>
                  patch("outbound", { ...form.outbound, arriveBefore: e.target.value })
                }
              />
            </Field>
          </fieldset>
          <fieldset className="grid grid-cols-3 gap-3 border border-line p-4">
            <legend className={`px-1 font-mono text-xs text-muted ${locale === "zh-TW" ? "tracking-normal" : "uppercase tracking-widest"}`}>
              {t("inbound")}
            </legend>
            <Field label={t("departAfter")}>
              <input
                type="time"
                value={form.inbound.departAfter}
                onChange={(e) =>
                  patch("inbound", { ...form.inbound, departAfter: e.target.value })
                }
              />
            </Field>
            <Field label={t("departBefore")}>
              <input
                type="time"
                value={form.inbound.departBefore}
                onChange={(e) =>
                  patch("inbound", { ...form.inbound, departBefore: e.target.value })
                }
              />
            </Field>
            <Field label={t("arriveBefore")}>
              <input
                type="time"
                value={form.inbound.arriveBefore}
                onChange={(e) =>
                  patch("inbound", { ...form.inbound, arriveBefore: e.target.value })
                }
              />
            </Field>
          </fieldset>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <label className="!flex-row !items-center !normal-case tracking-normal">
            <input
              type="checkbox"
              className="mr-2"
              checked={!form.allowAirportChange}
              onChange={(e) => patch("allowAirportChange", !e.target.checked)}
            />
            {t("noAirportChange")}
          </label>

          <div className="flex flex-wrap items-center gap-4">
            <p className={`font-mono text-xs ${overCap || pairInfo.invalid || pairInfo.count === 0 ? "text-price" : "text-muted"}`}>
              {pairInfo.invalid === "dates"
                ? t("invertedDates")
                : pairInfo.invalid === "stay"
                  ? t("invertedStay")
                  : overCap
                    ? t("overCap", { count: pairInfo.count, max: MAX_DATE_PAIRS })
                    : pairInfo.count === 0
                      ? t("noStayPairs")
                      : t("creditEstimate", {
                          pairs: pairInfo.count,
                          returns: maxCredits - pairInfo.count,
                        })}
            </p>
            <button
              type="submit"
              disabled={searching || overCap || Boolean(pairInfo.invalid) || pairInfo.count === 0}
              className="bg-ink px-5 py-2 font-mono text-sm text-paper"
            >
              {searching ? t("searching") : t("search")}
            </button>
          </div>
        </div>
      </form>

      <section className="mt-10">
        {(searching || itineraries.length > 0 || dumped > 0 || error) && (
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-3">
            <p className="font-mono text-sm">
              {searching
                ? t("datePairs", { done: progress.done, total: progress.total })
                : t("fitTimes", { count: itineraries.length })}
              {dumped > 0 ? t("dumped", { count: dumped }) : ""}
              {creditsUsed > 0 ? t("livePages", { count: creditsUsed }) : ""}
              {cachedHits > 0 ? t("cachedPairs", { count: cachedHits }) : ""}
            </p>
            {reasonText ? <p className="max-w-xl text-right text-xs text-muted">{reasonText}</p> : null}
          </div>
        )}

        {error ? <p className="text-sm text-price">{error}</p> : null}

        {!searching && !error && itineraries.length === 0 && dumped > 0 ? (
          <p className="text-sm text-muted">
            {t("emptyDumped", {
              count: dumped,
              reasons: reasonText ? ` (${reasonText})` : "",
            })}
          </p>
        ) : null}

        {itineraries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className={`border-b border-line text-left font-mono text-[11px] text-muted ${locale === "zh-TW" ? "tracking-normal" : "uppercase tracking-widest"}`}>
                  <th className="py-2 pr-3">{t("price")}</th>
                  <th className="py-2 pr-3">{t("dates")}</th>
                  <th className="py-2 pr-3">{t("outbound")}</th>
                  <th className="py-2 pr-3">{t("inbound")}</th>
                  <th className="py-2 pr-3">{t("stops")}</th>
                  <th className="py-2 pr-3">{t("layover")}</th>
                  <th className="py-2 pr-3">{t("airlines")}</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {itineraries.map((itinerary) => {
                  const open = expanded === itinerary.id;
                  const outLay = longestLayover(itinerary.outbound);
                  const inLay = longestLayover(itinerary.inbound);
                  const layover = [outLay, inLay]
                    .filter((value): value is number => value != null)
                    .map((value) => formatDuration(value, t))
                    .join(" / ") || "—";
                  return (
                    <FragmentRow
                      key={itinerary.id}
                      itinerary={itinerary}
                      open={open}
                      layover={layover}
                      locale={locale}
                      t={t}
                      month={month}
                      onToggle={() => setExpanded(open ? null : itinerary.id)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function FragmentRow({
  itinerary,
  open,
  layover,
  locale,
  t,
  month,
  onToggle,
}: {
  itinerary: Itinerary;
  open: boolean;
  layover: string;
  locale: Locale;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  month: (index: number) => string;
  onToggle: () => void;
}) {
  const airlines = [...new Set([...itinerary.outbound.airlines, ...itinerary.inbound.airlines])].join(" · ");
  return (
    <>
      <tr className="border-b border-line/80 align-top hover:bg-fill/60">
        <td className="py-3 pr-3 font-mono text-base font-medium text-price">
          {formatPrice(itinerary.price, itinerary.currency)}
        </td>
        <td className="py-3 pr-3 font-mono">
          {shortDate(itinerary.outboundDate, locale, month)} – {shortDate(itinerary.returnDate, locale, month)}
        </td>
        <td className="py-3 pr-3 font-mono">
          {clock(itinerary.outbound.departAt)} → {clock(itinerary.outbound.arriveAt)}
          <span className="ml-2 text-muted">{formatDuration(itinerary.outbound.durationMinutes, t)}</span>
        </td>
        <td className="py-3 pr-3 font-mono">
          {clock(itinerary.inbound.departAt)} → {clock(itinerary.inbound.arriveAt)}
          <span className="ml-2 text-muted">{formatDuration(itinerary.inbound.durationMinutes, t)}</span>
        </td>
        <td className="py-3 pr-3 font-mono">
          {itinerary.outbound.stops}/{itinerary.inbound.stops}
        </td>
        <td className="py-3 pr-3 font-mono">{layover}</td>
        <td className="py-3 pr-3">{airlines || "—"}</td>
        <td className="py-3 text-right">
          <button type="button" className="mr-3 font-mono text-xs underline" onClick={onToggle}>
            {open ? t("hide") : t("legs")}
          </button>
          {itinerary.googleFlightsUrl ? (
            <a
              href={itinerary.googleFlightsUrl}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs underline"
            >
              {t("googleFlights")}
            </a>
          ) : null}
        </td>
      </tr>
      {open ? (
        <tr className="border-b border-line bg-fill/40">
          <td colSpan={8} className="px-3 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <LegDetails title={t("outbound")} leg={itinerary.outbound} locale={locale} t={t} />
              <LegDetails title={t("inbound")} leg={itinerary.inbound} locale={locale} t={t} />
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function LegDetails({
  title,
  leg,
  locale,
  t,
}: {
  title: string;
  leg: Leg;
  locale: Locale;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}) {
  return (
    <div>
      <p className={`mb-2 font-mono text-[11px] text-muted ${locale === "zh-TW" ? "tracking-normal" : "uppercase tracking-widest"}`}>{title}</p>
      <ol className="space-y-2 font-mono text-sm">
        {leg.segments.map((segment, index) => (
          <li key={`${segment.flightNumber}-${index}`}>
            <span className="text-muted">{segment.flightNumber || "—"}</span>{" "}
            {segment.from} {clock(segment.departAt)} → {segment.to} {clock(segment.arriveAt)}
            {leg.layovers[index] ? (
              <div className="pl-4 text-xs text-muted">
                {t("layoverAt", {
                  airport: leg.layovers[index].airport,
                  duration: formatDuration(leg.layovers[index].durationMinutes, t),
                })}
                {leg.layovers[index].overnight ? t("overnight") : ""}
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
