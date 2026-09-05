/** Google Flights booking 頁的 tfs token（跟 fli 抓到的 live fixture 對齊） */

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function varint(value: number): Uint8Array {
  const bytes: number[] = [];
  let current = value;
  while (true) {
    const byte = current & 0x7f;
    current >>>= 7;
    if (current > 0) bytes.push(byte | 0x80);
    else {
      bytes.push(byte);
      break;
    }
  }
  return new Uint8Array(bytes);
}

function tag(field: number, wire: number): Uint8Array {
  return varint((field << 3) | wire);
}

function lengthDelim(field: number, payload: Uint8Array): Uint8Array {
  return concatBytes(tag(field, 2), varint(payload.length), payload);
}

function varintField(field: number, value: number): Uint8Array {
  return concatBytes(tag(field, 0), varint(value));
}

const utf8 = new TextEncoder();

export type FlightPin = {
  origin: string;
  dest: string;
  depDate: string;
  airline: string;
  flightNumber: string;
};

/** 組出 /booking?tfs= 用的 urlsafe base64 */
export function buildTfsToken(segments: FlightPin[][], isRoundTrip: boolean): string {
  if (segments.length === 0 || segments.some((segment) => segment.length === 0)) {
    throw new Error("tfs segments must be non-empty");
  }

  const segmentParts: Uint8Array[] = [];
  for (const segment of segments) {
    const legParts: Uint8Array[] = [];
    for (const leg of segment) {
      const legProto = concatBytes(
        lengthDelim(1, utf8.encode(leg.origin)),
        lengthDelim(2, utf8.encode(leg.depDate)),
        lengthDelim(3, utf8.encode(leg.dest)),
        lengthDelim(5, utf8.encode(leg.airline)),
        lengthDelim(6, utf8.encode(leg.flightNumber)),
      );
      legParts.push(lengthDelim(4, legProto));
    }
    const first = segment[0];
    const last = segment[segment.length - 1];
    const segProto = concatBytes(
      lengthDelim(2, utf8.encode(first.depDate)),
      ...legParts,
      lengthDelim(13, concatBytes(varintField(1, 1), lengthDelim(2, utf8.encode(first.origin)))),
      lengthDelim(14, concatBytes(varintField(1, 1), lengthDelim(2, utf8.encode(last.dest)))),
    );
    segmentParts.push(lengthDelim(3, segProto));
  }

  const maxU64 = new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x01]);
  const payload = concatBytes(
    varintField(1, 28),
    varintField(2, 2),
    ...segmentParts,
    varintField(8, 1),
    varintField(9, 1),
    varintField(14, 1),
    lengthDelim(16, concatBytes(tag(1, 0), maxU64)),
    varintField(19, isRoundTrip ? 1 : 2),
  );
  return Buffer.from(payload).toString("base64url");
}

export function googleFlightsBookingUrl(segments: FlightPin[][]): string {
  const token = buildTfsToken(segments, segments.length === 2);
  const params = new URLSearchParams({
    tfs: token,
    hl: "en",
    gl: "tw",
    curr: "TWD",
  });
  return `https://www.google.com/travel/flights/booking?${params.toString()}`;
}

export function googleFlightsSearchUrl(
  origin: string,
  destination: string,
  outboundDate: string,
  returnDate: string,
): string {
  const params = new URLSearchParams({
    hl: "en",
    gl: "tw",
    curr: "TWD",
    q: `Flights from ${origin} to ${destination} on ${outboundDate} through ${returnDate}`,
  });
  return `https://www.google.com/travel/flights?${params.toString()}`;
}
