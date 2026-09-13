import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { airlineIata, estimateCheckedBagFee, formatAirline, formatAirlineList } from "./airlines";
import { makeItinerary, makeLeg } from "./test-helpers";

describe("formatAirline", () => {
  it("keeps English as scraped", () => {
    assert.equal(formatAirline("CI", "en"), "CI");
    assert.equal(formatAirline("EVA Air", "en"), "EVA Air");
  });

  it("translates IATA and English names in 繁中", () => {
    assert.equal(formatAirline("CI", "zh-TW"), "中華航空");
    assert.equal(formatAirline("China Airlines", "zh-TW"), "中華航空");
    assert.equal(formatAirline("EVA Air", "zh-TW"), "長榮航空");
    assert.equal(formatAirline("BR", "zh-TW"), "長榮航空");
    assert.equal(formatAirline("Scoot", "zh-TW"), "酷航");
    assert.equal(formatAirline("Jin Air", "zh-TW"), "真航空");
    assert.equal(formatAirline("Peach Aviation", "zh-TW"), "樂桃航空");
    assert.equal(formatAirline("STARLUX Airlines", "zh-TW"), "星宇航空");
  });

  it("leaves unknown carriers alone", () => {
    assert.equal(formatAirline("Mystery Air", "zh-TW"), "Mystery Air");
  });

  it("dedupes IATA plus English name after translate", () => {
    assert.equal(formatAirlineList(["BR", "EVA Air", "TR"], "zh-TW"), "長榮航空 · 酷航");
  });

  it("prefers IATA names in 繁中 so Jetstar Japan does not also show Jetstar", () => {
    assert.equal(formatAirlineList(["GK", "Jetstar"], "zh-TW"), "捷星日本");
  });

  it("resolves IATA for logos", () => {
    assert.equal(airlineIata("Greater Bay Airlines"), "HB");
    assert.equal(airlineIata("hb"), "HB");
    assert.equal(airlineIata("Mystery Air"), null);
  });
});

describe("estimateCheckedBagFee", () => {
  it("skips full-service economy", () => {
    assert.equal(estimateCheckedBagFee(makeItinerary()).extraTwd, 0);
  });

  it("adds one 20kg prepaid bag each way on a Scoot round trip", () => {
    const scoot = makeItinerary({
      outbound: makeLeg({
        departAt: "2026-08-20 10:00",
        arriveAt: "2026-08-20 14:00",
        airlines: ["TR"],
        segments: [
          {
            airline: "TR",
            flightNumber: "TR 875",
            from: "TPE",
            to: "NRT",
            departAt: "2026-08-20 10:00",
            arriveAt: "2026-08-20 14:00",
            durationMinutes: 180,
          },
        ],
      }),
      inbound: makeLeg({
        from: "NRT",
        to: "TPE",
        departAt: "2026-08-28 16:00",
        arriveAt: "2026-08-28 18:30",
        airlines: ["TR"],
        segments: [
          {
            airline: "TR",
            flightNumber: "TR 876",
            from: "NRT",
            to: "TPE",
            departAt: "2026-08-28 16:00",
            arriveAt: "2026-08-28 18:30",
            durationMinutes: 180,
          },
        ],
      }),
    });
    assert.equal(estimateCheckedBagFee(scoot).extraTwd, 2000);
  });

  it("only charges the unbundled direction on a mixed itinerary", () => {
    const mixed = makeItinerary({
      inbound: makeLeg({
        from: "ICN",
        to: "TPE",
        departAt: "2026-08-28 16:00",
        arriveAt: "2026-08-28 18:30",
        airlines: ["LJ", "Jin Air"],
        segments: [
          {
            airline: "LJ",
            flightNumber: "LJ 221",
            from: "ICN",
            to: "TPE",
            departAt: "2026-08-28 16:00",
            arriveAt: "2026-08-28 18:30",
            durationMinutes: 180,
          },
        ],
      }),
    });
    assert.equal(estimateCheckedBagFee(mixed).extraTwd, 900);
  });

  it("charges two LCCs on a connecting leg separately", () => {
    const hop = makeItinerary({
      outbound: makeLeg({
        departAt: "2026-08-20 10:00",
        arriveAt: "2026-08-20 18:00",
        stops: 1,
        airlines: ["TR", "5J"],
        segments: [
          {
            airline: "TR",
            flightNumber: "TR 1",
            from: "TPE",
            to: "SIN",
            departAt: "2026-08-20 10:00",
            arriveAt: "2026-08-20 14:00",
            durationMinutes: 240,
          },
          {
            airline: "5J",
            flightNumber: "5J 2",
            from: "SIN",
            to: "MNL",
            departAt: "2026-08-20 16:00",
            arriveAt: "2026-08-20 18:00",
            durationMinutes: 120,
          },
        ],
      }),
    });
    assert.equal(estimateCheckedBagFee(hop).extraTwd, 2000);
  });
});
