"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { calendarCells, parseIsoDate, todayIsoTw } from "@/lib/dates";
import { formatTwHoliday, twHoliday } from "@/lib/tw-holidays";
import { useI18n } from "@/lib/use-i18n";

type Props = {
  id?: string;
  label: string;
  value: string;
  onChange: (iso: string) => void;
  /** 跟另一端組成視窗時，把區間刷淡 */
  rangeStart?: string;
  rangeEnd?: string;
  align?: "start" | "end";
};

function yearMonth(iso: string): { year: number; month: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [year, month] = iso.split("-").map(Number);
  return { year, month: month - 1 };
}

function inRange(iso: string, start?: string, end?: string): boolean {
  if (!start || !end || start > end) return false;
  return iso >= start && iso <= end;
}

export function DateField({
  id,
  label,
  value,
  onChange,
  rangeStart,
  rangeEnd,
  align = "start",
}: Props) {
  const { locale, t, month, weekday } = useI18n();
  const dialogId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = yearMonth(value);
  const [view, setView] = useState(
    () => selected ?? yearMonth(todayIsoTw()) ?? { year: 2026, month: 0 },
  );

  const cells = useMemo(
    () => calendarCells(view.year, view.month),
    [view.year, view.month],
  );
  const today = todayIsoTw();
  const selectedHoliday = value ? twHoliday(value) : undefined;
  const windowStart = rangeStart ?? value;
  const windowEnd = rangeEnd ?? value;

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function shiftMonth(delta: number) {
    setView((current) => {
      const date = new Date(Date.UTC(current.year, current.month + delta, 1));
      return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
    });
  }

  function openPicker() {
    setView(yearMonth(value) ?? yearMonth(today) ?? view);
    setOpen(true);
  }

  const display = (() => {
    const parts = yearMonth(value);
    if (!parts) return value;
    const day = Number(value.slice(8));
    return locale === "zh-TW"
      ? `${parts.year}年${month(parts.month)}${day}日`
      : `${day} ${month(parts.month)} ${parts.year}`;
  })();

  return (
    <div ref={rootRef} className="relative flex flex-col">
      <label htmlFor={id}>{label}</label>
      <button
        id={id}
        type="button"
        className="date-field-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        onClick={() => (open ? setOpen(false) : openPicker())}
      >
        {display}
      </button>
      {open ? (
        <div
          id={dialogId}
          role="dialog"
          className={`absolute top-[calc(100%+2px)] z-30 w-[17.75rem] border border-line bg-paper p-3 ${
            align === "end" ? "right-0" : "left-0"
          }`}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              className="grid h-7 w-7 place-items-center border-0 bg-transparent p-0 text-ink"
              aria-label={t("datePrevMonth")}
              onClick={() => shiftMonth(-1)}
            >
              <CaretLeft size={16} weight="regular" />
            </button>
            <p className="font-sans text-sm font-medium">
              {locale === "zh-TW"
                ? `${view.year}年${month(view.month)}`
                : `${month(view.month)} ${view.year}`}
            </p>
            <button
              type="button"
              className="grid h-7 w-7 place-items-center border-0 bg-transparent p-0 text-ink"
              aria-label={t("dateNextMonth")}
              onClick={() => shiftMonth(1)}
            >
              <CaretRight size={16} weight="regular" />
            </button>
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: 7 }, (_, index) => (
              <div
                key={index}
                className={`py-1 text-center font-mono text-[10px] text-muted ${
                  locale === "zh-TW" ? "tracking-normal" : "uppercase"
                }`}
              >
                {weekday(index)}
              </div>
            ))}
            {cells.map((iso) => {
              const outside = yearMonth(iso)?.month !== view.month;
              const holiday = twHoliday(iso);
              const selectedDay = iso === value;
              const todayDay = iso === today;
              const ranged = inRange(iso, windowStart, windowEnd);
              const weekend = [0, 6].includes(parseIsoDate(iso).getUTCDay());
              const name = holiday ? formatTwHoliday(holiday, t) : undefined;
              return (
                <button
                  key={iso}
                  type="button"
                  title={name}
                  aria-label={name ? `${iso} ${name}` : iso}
                  aria-current={todayDay ? "date" : undefined}
                  aria-pressed={selectedDay}
                  className={[
                    "relative flex h-9 flex-col items-center justify-center border-0 p-0 text-sm",
                    selectedDay ? "bg-ink text-paper" : ranged ? "bg-fill" : "bg-transparent",
                    todayDay && !selectedDay ? "outline outline-1 outline-ink -outline-offset-1" : "",
                    outside && !selectedDay ? "text-muted/45" : "",
                    !selectedDay && !outside && (holiday || weekend) ? "text-price" : "",
                    !selectedDay && !outside && !holiday && !weekend ? "text-ink" : "",
                  ].join(" ")}
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                >
                  <span className="font-mono text-[13px] leading-none">
                    {Number(iso.slice(8))}
                  </span>
                  {holiday ? (
                    <span
                      className={`mt-0.5 h-1 w-1 ${selectedDay ? "bg-paper" : "bg-price"}`}
                    />
                  ) : (
                    <span className="mt-0.5 h-1 w-1" />
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-2 flex items-center gap-2 font-mono text-[10px] text-muted">
            <span className="inline-block h-1.5 w-1.5 bg-price" />
            {selectedHoliday
              ? formatTwHoliday(selectedHoliday, t)
              : t("dateHolidayLegend")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
