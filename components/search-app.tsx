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
import { DateField } from "@/components/date-field";
import { GroupIcon, type GroupIconName } from "@/components/group-icon";
import { SearchPlane } from "@/components/search-plane";
import { estimateCheckedBagFee, formatAirlineList } from "@/lib/airlines";
import { destinationAirports } from "@/lib/airports";
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

function FieldGroup({
  label,
  icon,
  cols,
  children,
}: {
  label: string;
  icon: GroupIconName;
  cols?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="filter-block">
      <legend>
        <GroupIcon name={icon} />
        {label}
      </legend>
      <div className={cols ?? "grid grid-cols-2 gap-3"}>{children}</div>
    </fieldset>
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

  const dests = useMemo(
    () => destinationAirports(form.destination, form.origin),
    [form.destination, form.origin],
  );

  const pairInfo = useMemo(() => {
    if (
      form.minStayDays != null &&
      form.maxStayDays != null &&
      form.minStayDays > form.maxStayDays
    ) {
      return { count: 0, invalid: "stay" as const };
    }
    if (dests.length === 0) {
      return { count: 0, invalid: "dest" as const };
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
      return { count: pairs.length * dests.length, invalid: false as const };
    } catch {
      return { count: 0, invalid: "dates" as const };
    }
  }, [
    dests,
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
    <form onSubmit={onSearch} className="min-h-full">
      <header className="site-header sticky top-0 z-40 text-ink">
        <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-7">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-[1.65rem] font-semibold leading-none tracking-[-0.04em]">
                Farefit
              </h1>
              <p className="mt-1 hidden max-w-xl text-xs text-ink/70 sm:block">{t("tagline")}</p>
            </div>
            <div className="flex items-center gap-3">
              <p className="hidden font-mono text-[10px] text-ink/50 md:block">{t("stack")}</p>
              <div
                className="flex overflow-hidden rounded-[var(--radius)] border border-navy/30 font-sans text-xs font-medium"
                role="group"
                aria-label={t("language")}
              >
                <button
                  type="button"
                  className={`px-2.5 py-1 ${locale === "en" ? "bg-navy text-paper" : "text-ink/75"}`}
                  onClick={() => setLocale("en")}
                >
                  {t("langEn")}
                </button>
                <button
                  type="button"
                  className={`px-2.5 py-1 ${locale === "zh-TW" ? "bg-navy text-paper" : "text-ink/75"}`}
                  onClick={() => setLocale("zh-TW")}
                >
                  {t("langZh")}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 items-end gap-3 md:grid-cols-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_repeat(4,minmax(0,1fr))_8.75rem]">
            <AirportField
              id="origin"
              label={t("from")}
              placeholder={t("originPlaceholder")}
              value={form.origin}
              onChange={(iata) => patch("origin", iata)}
            />
            <AirportField
              id="destination"
              variant="place"
              label={t("to")}
              placeholder={t("airportPlaceholder")}
              value={form.destination}
              onChange={(value) => patch("destination", value)}
            />
            <DateField
              id="outboundFrom"
              label={t("leaveFrom")}
              value={form.outboundFrom}
              rangeEnd={form.outboundTo}
              onChange={(iso) => patch("outboundFrom", iso)}
            />
            <DateField
              id="outboundTo"
              label={t("leaveUntil")}
              value={form.outboundTo}
              rangeStart={form.outboundFrom}
              align="end"
              onChange={(iso) => patch("outboundTo", iso)}
            />
            <DateField
              id="returnFrom"
              label={t("backFrom")}
              value={form.returnFrom}
              rangeEnd={form.returnTo}
              onChange={(iso) => patch("returnFrom", iso)}
            />
            <DateField
              id="returnUntil"
              label={t("backUntil")}
              value={form.returnTo}
              rangeStart={form.returnFrom}
              align="end"
              onChange={(iso) => patch("returnTo", iso)}
            />
            <div className="col-span-2 flex items-end md:col-span-1">
              <button
                type="submit"
                disabled={searching || overCap || Boolean(pairInfo.invalid) || pairInfo.count === 0}
                className="search-submit w-full disabled:active:scale-100"
              >
                {searching ? t("searching") : t("search")}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-2 text-xs">
            {dests.length > 0 ? (
              <p className="font-mono text-ink/60">
                {t("destAirports", { codes: dests.map((airport) => airport.iata).join(", ") })}
              </p>
            ) : (
              <span />
            )}
            <p className={`font-mono ${overCap || pairInfo.invalid || pairInfo.count === 0 ? "text-price" : "text-ink/60"}`}>
              {pairInfo.invalid === "dates"
                ? t("invertedDates")
                : pairInfo.invalid === "stay"
                  ? t("invertedStay")
                  : pairInfo.invalid === "dest"
                    ? t("unknownDest")
                    : overCap
                      ? t("overCap", { count: pairInfo.count, max: MAX_DATE_PAIRS })
                      : pairInfo.count === 0
                        ? t("noStayPairs")
                        : t("creditEstimate", {
                            pairs: pairInfo.count,
                            returns: maxCredits - pairInfo.count,
                          })}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1180px] px-4 py-5 sm:px-6 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start lg:gap-5">
        <aside className="filter-rail mb-5 lg:mb-0">
          <FieldGroup
            icon="stay"
            label={t("groupStay")}
            cols="grid grid-cols-2 gap-3"
          >
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
            <div className="col-span-2">
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
          </FieldGroup>
          <FieldGroup icon="hops" label={t("groupHops")}>
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
          </FieldGroup>
          <FieldGroup
            icon="out"
            label={t("outbound")}
            cols="grid grid-cols-1 gap-3"
          >
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
          </FieldGroup>
          <FieldGroup
            icon="in"
            label={t("inbound")}
            cols="grid grid-cols-1 gap-3"
          >
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
          </FieldGroup>
          <label className="mt-4 !flex-row !items-center !normal-case tracking-normal text-sm text-ink">
            <input
              type="checkbox"
              className="mr-2 accent-price"
              checked={!form.allowAirportChange}
              onChange={(e) => patch("allowAirportChange", !e.target.checked)}
            />
            {t("noAirportChange")}
          </label>
        </aside>

        <section>
        {(searching || itineraries.length > 0 || dumped > 0 || error) && (
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
            <p className="text-sm">
              {searching
                ? t("datePairs", { done: progress.done, total: progress.total })
                : t("fitTimes", { count: itineraries.length })}
              {dumped > 0 ? t("dumped", { count: dumped }) : ""}
              {creditsUsed > 0 ? t("livePages", { count: creditsUsed }) : ""}
              {cachedHits > 0 ? t("cachedPairs", { count: cachedHits }) : ""}
            </p>
            <p className="text-xs text-muted">{t("rankedByTicket")}</p>
          </div>
        )}
        {reasonText ? <p className="mb-3 text-xs text-muted">{reasonText}</p> : null}

        {error ? <p className="text-sm text-price">{error}</p> : null}

        {!searching && !error && itineraries.length === 0 && dumped > 0 ? (
          <p className="rounded-[var(--radius)] border border-line bg-fill p-4 text-sm text-muted">
            {t("emptyDumped", {
              count: dumped,
              reasons: reasonText ? ` (${reasonText})` : "",
            })}
          </p>
        ) : null}

        {searching && itineraries.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <SearchPlane flying />
            <p className="mt-3 text-sm text-muted">{t("searching")}</p>
          </div>
        ) : null}

        {!searching && itineraries.length === 0 && dumped === 0 && !error ? (
          <div className="flex flex-col items-center py-16">
            <SearchPlane flying={false} />
            <p className="mt-3 text-sm text-muted">{t("emptyHint")}</p>
          </div>
        ) : null}

        {itineraries.length > 0 ? (
          <div className="grid gap-3">
            {itineraries.map((itinerary) => (
              <DealCard
                key={itinerary.id}
                itinerary={itinerary}
                open={expanded === itinerary.id}
                locale={locale}
                t={t}
                month={month}
                onToggle={() => setExpanded(expanded === itinerary.id ? null : itinerary.id)}
              />
            ))}
          </div>
        ) : null}
        {itineraries.some((itinerary) => estimateCheckedBagFee(itinerary).extraTwd > 0) ? (
          <p className="mt-3 max-w-2xl text-xs text-muted">{t("bagNote")}</p>
        ) : null}
        </section>
      </div>
    </form>
  );
}

function stopsLabel(
  stops: number,
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
): string {
  if (stops === 0) return t("nonstop");
  if (stops === 1) return t("oneStop");
  return t("twoStops");
}

function LegStrip({
  title,
  leg,
  t,
}: {
  title: string;
  leg: Leg;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}) {
  const layover = longestLayover(leg);
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold text-muted">{title}</p>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
        <div>
          <p className="font-mono text-base font-semibold leading-none">{clock(leg.departAt)}</p>
          <p className="mt-1 text-xs text-muted">{leg.from}</p>
        </div>
        <div className="min-w-0 px-1 text-center">
          <p className="font-mono text-[11px] text-muted">{formatDuration(leg.durationMinutes, t)}</p>
          <div className="leg-bar" />
          <p className="text-[11px] text-muted">
            {stopsLabel(leg.stops, t)}
            {layover != null ? ` · ${formatDuration(layover, t)}` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-base font-semibold leading-none">{clock(leg.arriveAt)}</p>
          <p className="mt-1 text-xs text-muted">{leg.to}</p>
        </div>
      </div>
    </div>
  );
}

function DealCard({
  itinerary,
  open,
  locale,
  t,
  month,
  onToggle,
}: {
  itinerary: Itinerary;
  open: boolean;
  locale: Locale;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  month: (index: number) => string;
  onToggle: () => void;
}) {
  const airlines = formatAirlineList(
    [...itinerary.outbound.airlines, ...itinerary.inbound.airlines],
    locale,
  );
  const bag = estimateCheckedBagFee(itinerary);
  return (
    <article className="overflow-hidden rounded-[var(--radius)] border border-line border-l-4 border-l-navy bg-fill">
      <div className="deal-card">
        <div className="flex flex-col justify-center">
          <p className="text-sm font-semibold leading-snug">{airlines || "—"}</p>
          <p className="mt-1 font-mono text-xs text-muted">
            {shortDate(itinerary.outboundDate, locale, month)} – {shortDate(itinerary.returnDate, locale, month)}
          </p>
        </div>
        <div className="grid gap-3">
          <LegStrip title={t("outbound")} leg={itinerary.outbound} t={t} />
          <LegStrip title={t("inbound")} leg={itinerary.inbound} t={t} />
        </div>
        <div className="deal-price">
          <p className="font-mono text-2xl font-semibold leading-none text-price">
            {formatPrice(itinerary.price, itinerary.currency)}
          </p>
          <p className="text-[11px] text-muted">
            {bag.extraTwd > 0
              ? t("bagEst", { amount: formatPrice(bag.extraTwd, itinerary.currency) })
              : t("bagsIncluded")}
          </p>
          {itinerary.googleFlightsUrl ? (
            <a
              href={itinerary.googleFlightsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 w-full items-center justify-center bg-price text-sm font-semibold text-ink"
            >
              {t("viewDeal")}
            </a>
          ) : null}
          <button type="button" className="text-xs font-medium text-navy underline" onClick={onToggle}>
            {open ? t("hide") : t("legs")}
          </button>
        </div>
      </div>
      {open ? (
        <div className="border-t border-line bg-paper/80 px-4 py-4">
          <div className="grid gap-4 md:grid-cols-2">
            <LegDetails title={t("outbound")} leg={itinerary.outbound} locale={locale} t={t} />
            <LegDetails title={t("inbound")} leg={itinerary.inbound} locale={locale} t={t} />
          </div>
        </div>
      ) : null}
    </article>
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
