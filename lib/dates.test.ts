import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PairCapError, assertPairCap, calendarCells, eachDate, expandDatePairs, stayDays, weekendCoverage } from "./dates";
import { MAX_DATE_PAIRS } from "./types";

describe("eachDate", () => {
  it("includes both ends", () => {
    assert.deepEqual(eachDate("2026-08-20", "2026-08-22"), [
      "2026-08-20",
      "2026-08-21",
      "2026-08-22",
    ]);
  });

  it("rejects inverted ranges", () => {
    assert.throws(() => eachDate("2026-08-22", "2026-08-20"), /inverted/);
  });
});

describe("expandDatePairs", () => {
  it("drops same-day and return-before-outbound pairs", () => {
    const pairs = expandDatePairs(
      "2026-08-20",
      "2026-08-21",
      "2026-08-21",
      "2026-08-22",
    );
    assert.deepEqual(pairs, [
      { outboundDate: "2026-08-20", returnDate: "2026-08-21" },
      { outboundDate: "2026-08-20", returnDate: "2026-08-22" },
      { outboundDate: "2026-08-21", returnDate: "2026-08-22" },
    ]);
  });

  it("5x5 window is exactly the cap", () => {
    const pairs = expandDatePairs(
      "2026-08-20",
      "2026-08-24",
      "2026-08-28",
      "2026-09-01",
    );
    assert.equal(pairs.length, 25);
  });

  it("drops pairs outside the stay range", () => {
    const pairs = expandDatePairs(
      "2026-08-20",
      "2026-08-21",
      "2026-08-21",
      "2026-08-27",
      { minDays: 4, maxDays: 5 },
    );
    assert.deepEqual(pairs, [
      { outboundDate: "2026-08-20", returnDate: "2026-08-24" },
      { outboundDate: "2026-08-20", returnDate: "2026-08-25" },
      { outboundDate: "2026-08-21", returnDate: "2026-08-25" },
      { outboundDate: "2026-08-21", returnDate: "2026-08-26" },
    ]);
  });

  it("keeps only weekday trips when weekend overlap is none", () => {
    const pairs = expandDatePairs(
      "2026-08-24",
      "2026-08-24",
      "2026-08-26",
      "2026-08-29",
      { weekendOverlap: "none" },
    );
    assert.deepEqual(pairs, [
      { outboundDate: "2026-08-24", returnDate: "2026-08-26" },
      { outboundDate: "2026-08-24", returnDate: "2026-08-27" },
      { outboundDate: "2026-08-24", returnDate: "2026-08-28" },
    ]);
  });

  it("requires Saturday and Sunday for both-weekend trips", () => {
    const pairs = expandDatePairs(
      "2026-08-21",
      "2026-08-21",
      "2026-08-22",
      "2026-08-24",
      { weekendOverlap: "both" },
    );
    assert.deepEqual(pairs, [
      { outboundDate: "2026-08-21", returnDate: "2026-08-23" },
      { outboundDate: "2026-08-21", returnDate: "2026-08-24" },
    ]);
  });
});

describe("weekendCoverage", () => {
  it("counts leave Friday return Saturday as one weekend day", () => {
    assert.deepEqual(weekendCoverage("2026-08-21", "2026-08-22"), {
      saturday: true,
      sunday: false,
    });
  });

  it("counts leave Friday return Sunday as both weekend days", () => {
    assert.deepEqual(weekendCoverage("2026-08-21", "2026-08-23"), {
      saturday: true,
      sunday: true,
    });
  });
});

describe("stayDays", () => {
  it("counts nights away, not inclusive calendar days", () => {
    assert.equal(stayDays("2026-08-20", "2026-08-24"), 4);
    assert.equal(stayDays("2026-08-20", "2026-08-27"), 7);
  });
});

describe("assertPairCap", () => {
  it("allows 25", () => {
    assertPairCap(MAX_DATE_PAIRS);
  });

  it("refuses 26", () => {
    assert.throws(() => assertPairCap(26), PairCapError);
  });
});

describe("calendarCells", () => {
  it("starts Sunday and pads September 2026 with August", () => {
    const cells = calendarCells(2026, 8);
    assert.equal(cells.length, 42);
    assert.equal(cells[0], "2026-08-30");
    assert.equal(cells[2], "2026-09-01");
    assert.equal(cells[31], "2026-09-30");
  });
});
