import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { makeLeg } from "./test-helpers";
import { legTimeline } from "./timeline";

describe("legTimeline", () => {
  it("keeps a nonstop as one flight bar", () => {
    const parts = legTimeline(
      makeLeg({
        departAt: "2026-08-20 10:00",
        arriveAt: "2026-08-20 14:00",
        durationMinutes: 200,
      }),
    );
    assert.equal(parts.length, 1);
    assert.equal(parts[0]?.kind, "flight");
    if (parts[0]?.kind === "flight") {
      assert.equal(parts[0].from, "TPE");
      assert.equal(parts[0].to, "NRT");
      assert.equal(parts[0].minutes, 200);
    }
  });

  it("splits a one-stop into flight, layover, flight", () => {
    const parts = legTimeline(
      makeLeg({
        departAt: "2027-02-24 10:45",
        arriveAt: "2027-02-25 15:00",
        durationMinutes: 1635,
        stops: 1,
        airlines: ["HB"],
        layovers: [{ airport: "HKG", durationMinutes: 1330, overnight: true }],
      }),
    );
    assert.equal(parts.map((part) => part.kind).join(","), "flight,layover,flight");
    const layover = parts[1];
    assert.equal(layover?.kind, "layover");
    if (layover?.kind === "layover") {
      assert.equal(layover.airport, "HKG");
      assert.equal(layover.minutes, 1330);
    }
    if (parts[0]?.kind === "flight") assert.equal(parts[0].from, "TPE");
    if (parts[2]?.kind === "flight") assert.equal(parts[2].to, "NRT");
  });
});
