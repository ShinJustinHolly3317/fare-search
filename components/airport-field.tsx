"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "@/lib/use-i18n";
import {
  findAirport,
  formatAirport,
  formatPlace,
  parsePlaceId,
  searchAirports,
  searchPlaces,
  type Airport,
  type PlaceHit,
} from "@/lib/airports";

type Props = {
  id?: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  /** place：城市／國家會展開成多機場 */
  variant?: "airport" | "place";
};

export function AirportField({
  id,
  label,
  placeholder,
  value,
  onChange,
  variant = "airport",
}: Props) {
  const { t } = useI18n();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [highlight, setHighlight] = useState(0);

  const places = variant === "place" && open ? searchPlaces(query, 12) : [];
  const airports = variant === "airport" && open ? searchAirports(query, 12) : [];
  const resultCount = variant === "place" ? places.length : airports.length;

  const selectedAirport = variant === "airport" ? findAirport(value) : undefined;
  const display = open
    ? query
    : variant === "place"
      ? value
        ? formatPlace(value)
        : ""
      : selectedAirport
        ? formatAirport(selectedAirport)
        : value;

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pickAirport(airport: Airport) {
    onChange(airport.iata);
    setQuery(airport.iata);
    setOpen(false);
  }

  function pickPlace(place: PlaceHit) {
    onChange(place.id);
    setQuery(place.id);
    setOpen(false);
  }

  function commitTyped() {
    if (variant === "place") {
      const hit = searchPlaces(query, 1)[0];
      if (hit) onChange(hit.id);
      setOpen(false);
      return;
    }
    const exact = findAirport(query);
    if (exact) onChange(exact.iata);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative flex min-w-0 flex-col gap-2">
      <label htmlFor={id}>{label}</label>
      <input
        ref={inputRef}
        id={id}
        type="text"
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder={placeholder}
        className="normal-case tracking-normal"
        value={display}
        onFocus={() => {
          const parsed = parsePlaceId(value);
          setQuery(
            parsed?.kind === "city" || parsed?.kind === "country" ? parsed.name : value,
          );
          setOpen(true);
          setHighlight(0);
          requestAnimationFrame(() => inputRef.current?.select());
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onBlur={commitTyped}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setHighlight((current) =>
              Math.min(current + 1, Math.max(resultCount - 1, 0)),
            );
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlight((current) => Math.max(current - 1, 0));
          } else if (event.key === "Enter" && open) {
            event.preventDefault();
            if (variant === "place" && places[highlight]) pickPlace(places[highlight]);
            else if (airports[highlight]) pickAirport(airports[highlight]);
          } else if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
          }
        }}
      />
      {open && variant === "place" && places.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="suggest-list absolute top-[calc(100%+4px)] z-50 max-h-72 w-full overflow-auto border border-line bg-fill normal-case tracking-normal"
        >
          {places.map((place, index) => (
            <li
              id={`${listId}-${place.id}`}
              key={place.id}
              role="option"
              aria-selected={index === highlight}
              className={`cursor-pointer px-3 py-2 ${index === highlight ? "bg-paper" : ""}`}
              onMouseDown={(event) => {
                event.preventDefault();
                pickPlace(place);
              }}
              onMouseEnter={() => setHighlight(index)}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-sm">{place.title}</span>
                <span className="truncate text-[10px] text-muted">
                  {place.kind === "city"
                    ? t("placeCity")
                    : place.kind === "country"
                      ? t("placeCountry")
                      : t("placeAirport")}
                </span>
              </div>
              <div className="truncate text-xs text-muted">{place.subtitle}</div>
            </li>
          ))}
        </ul>
      ) : null}
      {open && variant === "airport" && airports.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="suggest-list absolute top-[calc(100%+4px)] z-50 max-h-72 w-full overflow-auto border border-line bg-fill normal-case tracking-normal"
        >
          {airports.map((airport, index) => (
            <li
              id={`${listId}-${airport.iata}`}
              key={airport.iata}
              role="option"
              aria-selected={index === highlight}
              className={`cursor-pointer px-3 py-2 ${index === highlight ? "bg-paper" : ""}`}
              onMouseDown={(event) => {
                event.preventDefault();
                pickAirport(airport);
              }}
              onMouseEnter={() => setHighlight(index)}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-sm">{airport.iata}</span>
                <span className="truncate text-xs text-muted">
                  {airport.city ? `${airport.city}, ${airport.country}` : airport.country}
                </span>
              </div>
              <div className="truncate text-xs text-muted">{airport.name}</div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
