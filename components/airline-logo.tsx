"use client";

import { useState } from "react";
import { airlineIata } from "@/lib/airlines";

type Props = {
  code: string;
  size?: number;
};

/** Google Flights 同一套 70px IATA 標誌 */
export function AirlineLogo({ code, size = 22 }: Props) {
  const iata = airlineIata(code);
  const [failed, setFailed] = useState(false);
  const label = (iata ?? code).slice(0, 2).toUpperCase();

  if (!iata || failed) {
    return (
      <span
        className="airline-logo-fallback"
        style={{ width: size, height: size, fontSize: size * 0.42 }}
        aria-hidden
      >
        {label}
      </span>
    );
  }

  return (
    <img
      className="airline-logo"
      src={`https://www.gstatic.com/flights/airline_logos/70px/${iata}.png`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
