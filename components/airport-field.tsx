"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  findAirport,
  formatAirport,
  searchAirports,
  type Airport,
} from "@/lib/airports";

type Props = {
  id?: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (iata: string) => void;
};

export function AirportField({ id, label, placeholder, value, onChange }: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [highlight, setHighlight] = useState(0);

  const selected = findAirport(value);
  const results = open ? searchAirports(query, 12) : [];
  const display = open ? query : selected ? formatAirport(selected) : value;

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(airport: Airport) {
    onChange(airport.iata);
    setQuery(airport.iata);
    setOpen(false);
  }

  function commitTyped() {
    const exact = findAirport(query);
    if (exact) onChange(exact.iata);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative flex flex-col">
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
        aria-activedescendant={
          open && results[highlight] ? `${listId}-${results[highlight].iata}` : undefined
        }
        placeholder={placeholder}
        className="normal-case tracking-normal"
        value={display}
        onFocus={() => {
          setQuery(value);
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
              Math.min(current + 1, Math.max(results.length - 1, 0)),
            );
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlight((current) => Math.max(current - 1, 0));
          } else if (event.key === "Enter" && open && results[highlight]) {
            event.preventDefault();
            pick(results[highlight]);
          } else if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
          }
        }}
      />
      {open && results.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-[calc(100%+2px)] z-20 max-h-72 w-full overflow-auto border border-line bg-paper normal-case tracking-normal"
        >
          {results.map((airport, index) => (
            <li
              id={`${listId}-${airport.iata}`}
              key={airport.iata}
              role="option"
              aria-selected={index === highlight}
              className={`cursor-pointer px-3 py-2 ${index === highlight ? "bg-fill" : ""}`}
              onMouseDown={(event) => {
                event.preventDefault();
                pick(airport);
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
