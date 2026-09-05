import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PairCapError, assertPairCap, eachDate, expandDatePairs } from "./dates";
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
});

describe("assertPairCap", () => {
  it("allows 25", () => {
    assertPairCap(MAX_DATE_PAIRS);
  });

  it("refuses 26", () => {
    assert.throws(() => assertPairCap(26), PairCapError);
  });
});
