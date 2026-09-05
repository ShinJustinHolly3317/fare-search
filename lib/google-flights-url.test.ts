import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildTfsToken,
  googleFlightsBookingUrl,
} from "./google-flights-url";

/** fli 2026-05-28 抓到的 JFK→LAX AA171 / AA28 */
const LIVE_TFS_RT =
  "CBwQAho_EgoyMDI2LTA3LTE1Ih8KA0pGSxIKMjAyNi0wNy0xNRoDTEFYKgJBQTIDMTcxagcIAR" +
  "IDSkZLcgcIARIDTEFYGj4SCjIwMjYtMDctMTkiHgoDTEFYEgoyMDI2LTA3LTE5GgNKRksqAkFBMgIy" +
  "OGoHCAESA0xBWHIHCAESA0pGS0ABSAFwAYIBCwj___________8BmAEB";

describe("buildTfsToken", () => {
  it("matches the captured round-trip booking token", () => {
    const token = buildTfsToken(
      [
        [{ origin: "JFK", dest: "LAX", depDate: "2026-07-15", airline: "AA", flightNumber: "171" }],
        [{ origin: "LAX", dest: "JFK", depDate: "2026-07-19", airline: "AA", flightNumber: "28" }],
      ],
      true,
    );
    assert.equal(token, LIVE_TFS_RT);
  });

  it("builds a booking URL on /booking", () => {
    const url = googleFlightsBookingUrl([
      [{ origin: "TPE", dest: "NRT", depDate: "2026-09-28", airline: "BR", flightNumber: "192" }],
      [{ origin: "NRT", dest: "TPE", depDate: "2026-10-05", airline: "BR", flightNumber: "191" }],
    ]);
    assert.match(url, /^https:\/\/www\.google\.com\/travel\/flights\/booking\?/);
    assert.match(url, /tfs=/);
    assert.match(url, /curr=TWD/);
  });
});
