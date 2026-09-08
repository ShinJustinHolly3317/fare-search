"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  getLocale,
  hydrateLocale,
  monthLabel,
  weekdayLabel,
  setLocale,
  subscribeLocale,
  t,
  type Locale,
  type MessageKey,
} from "@/lib/i18n";

export function useI18n() {
  const locale = useSyncExternalStore(subscribeLocale, getLocale, () => "en" as Locale);

  useEffect(() => {
    hydrateLocale();
  }, []);

  return {
    locale,
    setLocale,
    t: (key: MessageKey, vars?: Record<string, string | number>) => t(locale, key, vars),
    month: (monthIndex: number) => monthLabel(locale, monthIndex),
    weekday: (weekday: number) => weekdayLabel(locale, weekday),
  };
}
