import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseCardText, to24h } from "./parse-card";

describe("to24h", () => {
  it("parses 12-hour and 24-hour clocks", () => {
    assert.equal(to24h("8:00 AM"), "08:00");
    assert.equal(to24h("12:20 PM"), "12:20");
    assert.equal(to24h("12:05 AM"), "00:05");
    assert.equal(to24h("10:15 PM"), "22:15");
    assert.equal(to24h("08:00"), "08:00");
  });
});

describe("parseCardText", () => {
  it("parses a nonstop card", () => {
    const option = parseCardText(
      ["China Airlines", "8:00 AM – 12:20 PM", "TPE–NRT", "3 hr 20 min", "Nonstop", "TWD 9,888"].join("\n"),
      { from: "TPE", to: "NRT", date: "2026-09-10" },
    );
    assert.ok(option);
    assert.equal(option.price, 9888);
    assert.equal(option.departClock, "08:00");
    assert.equal(option.arriveClock, "12:20");
    assert.equal(option.stops, 0);
    assert.equal(option.durationMinutes, 200);
    assert.ok(option.airlines.includes("China Airlines"));
    assert.deepEqual(option.flights, []);
  });

  it("parses flight numbers from details text", () => {
    const option = parseCardText(
      "China Airlines\nCI 100\n8:00 AM – 12:20 PM\nNonstop\n3 hr 20 min\nTWD 9,888",
      { from: "TPE", to: "NRT", date: "2026-09-10" },
    );
    assert.ok(option);
    assert.deepEqual(option.flights, [{ airline: "CI", number: "100" }]);
  });

  it("parses flight numbers glued after aircraft type with nbsp", () => {
    const option = parseCardText(
      "Scoot\n6:10 PM – 9:45 PM\nNonstop\n2 hr 35 min\nBoeing 787TR\u00a0872\nTWD 5,805",
      { from: "TPE", to: "ICN", date: "2026-09-10" },
    );
    assert.ok(option);
    assert.deepEqual(option.flights, [{ airline: "TR", number: "872" }]);
  });

  it("does not treat an expanded details panel as a card", () => {
    const option = parseCardText(
      [
        "Departure",
        "Thu, Sep 10",
        "Select flight",
        "NT$5,805",
        "6:10 PM Taiwan Taoyuan International Airport (TPE)",
        "Travel time: 2 hr 35 min",
        "9:45 PM Incheon International Airport (ICN)",
        "Scoot Economy Boeing 787TR\u00a0872",
      ].join("\n"),
      { from: "TPE", to: "ICN", date: "2026-09-10" },
    );
    assert.equal(option, null);
  });

  it("parses a +1 arrival and a layover", () => {
    const option = parseCardText(
      "EVA Air\n10:15 PM – 6:45 AM+1\n1 stop in HKG\n8 hr 30 min\nTWD 7,200",
      { from: "TPE", to: "NRT", date: "2026-09-10" },
    );
    assert.ok(option);
    assert.equal(option.arriveDayOffset, 1);
    assert.equal(option.stops, 1);
    assert.equal(option.layoverAirport, "HKG");
    assert.equal(option.price, 7200);
  });
});
