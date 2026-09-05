import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterItineraries,
  inTimeRange,
  itineraryReject,
  rankItineraries,
} from "./filter";
import { makeItinerary, makeLeg, makeQuery } from "./test-helpers";

describe("inTimeRange", () => {
  it("handles a normal window", () => {
    assert.equal(inTimeRange(10 * 60, 9 * 60, 18 * 60), true);
    assert.equal(inTimeRange(8 * 60, 9 * 60, 18 * 60), false);
    assert.equal(inTimeRange(19 * 60, 9 * 60, 18 * 60), false);
  });

  it("handles overnight windows", () => {
    assert.equal(inTimeRange(23 * 60, 22 * 60, 6 * 60), true);
    assert.equal(inTimeRange(5 * 60, 22 * 60, 6 * 60), true);
    assert.equal(inTimeRange(12 * 60, 22 * 60, 6 * 60), false);
  });
});

describe("itineraryReject", () => {
  it("keeps a daytime nonstop that fits", () => {
    const reason = itineraryReject(makeItinerary(), makeQuery({
      outbound: { departAfter: "09:00", departBefore: "18:00", arriveBefore: "22:00" },
      inbound: { departAfter: "09:00", departBefore: "18:00", arriveBefore: "21:00" },
    }));
    assert.equal(reason, null);
  });

  it("dumps red-eye outbound", () => {
    const itinerary = makeItinerary({
      outbound: makeLeg({
        departAt: "2026-08-20 23:40",
        arriveAt: "2026-08-21 04:10",
      }),
    });
    const reason = itineraryReject(
      itinerary,
      makeQuery({
        outbound: { departAfter: "09:00", departBefore: "18:00", arriveBefore: "" },
      }),
    );
    assert.equal(reason, "outbound_depart_before");
  });

  it("dumps late arrival", () => {
    const itinerary = makeItinerary({
      inbound: makeLeg({
        from: "NRT",
        to: "TPE",
        departAt: "2026-08-28 19:00",
        arriveAt: "2026-08-28 22:30",
      }),
    });
    const reason = itineraryReject(
      itinerary,
      makeQuery({
        inbound: { departAfter: "", departBefore: "", arriveBefore: "21:00" },
      }),
    );
    assert.equal(reason, "inbound_arrive_before");
  });

  it("dumps too many stops", () => {
    const itinerary = makeItinerary({
      outbound: makeLeg({
        departAt: "2026-08-20 10:00",
        arriveAt: "2026-08-20 18:00",
        stops: 2,
      }),
    });
    assert.equal(itineraryReject(itinerary, makeQuery({ maxStops: 1 })), "max_stops");
  });

  it("dumps long layover", () => {
    const itinerary = makeItinerary({
      outbound: makeLeg({
        departAt: "2026-08-20 10:00",
        arriveAt: "2026-08-20 22:00",
        stops: 1,
        layovers: [{ airport: "HKG", durationMinutes: 400, overnight: false }],
      }),
    });
    assert.equal(
      itineraryReject(itinerary, makeQuery({ maxLayoverMinutes: 180 })),
      "max_layover",
    );
  });

  it("dumps airport change unless allowed", () => {
    const itinerary = makeItinerary({
      outbound: makeLeg({
        departAt: "2026-08-20 10:00",
        arriveAt: "2026-08-20 16:00",
        stops: 1,
        airportChange: true,
      }),
    });
    assert.equal(
      itineraryReject(itinerary, makeQuery({ allowAirportChange: false })),
      "airport_change",
    );
    assert.equal(
      itineraryReject(itinerary, makeQuery({ allowAirportChange: true })),
      null,
    );
  });

  it("skips empty time constraints", () => {
    const itinerary = makeItinerary({
      outbound: makeLeg({
        departAt: "2026-08-20 01:00",
        arriveAt: "2026-08-20 05:00",
      }),
    });
    assert.equal(itineraryReject(itinerary, makeQuery({ maxLayoverMinutes: null })), null);
  });
});

describe("filterItineraries + rankItineraries", () => {
  it("keeps survivors and ranks by price then duration", () => {
    const query = makeQuery({
      outbound: { departAfter: "09:00", departBefore: "18:00", arriveBefore: "" },
      inbound: { departAfter: "", departBefore: "", arriveBefore: "" },
      maxLayoverMinutes: null,
    });
    const cheapLong = makeItinerary({
      id: "cheap-long",
      price: 8000,
      totalDurationMinutes: 900,
    });
    const cheapShort = makeItinerary({
      id: "cheap-short",
      price: 8000,
      totalDurationMinutes: 400,
    });
    const expensive = makeItinerary({ id: "exp", price: 20000 });
    const redeye = makeItinerary({
      id: "redeye",
      price: 5000,
      outbound: makeLeg({
        departAt: "2026-08-20 23:00",
        arriveAt: "2026-08-21 03:00",
      }),
    });

    const { kept, dumped } = filterItineraries(
      [expensive, redeye, cheapLong, cheapShort],
      query,
    );
    assert.equal(dumped.length, 1);
    assert.deepEqual(
      rankItineraries(kept).map((item) => item.id),
      ["cheap-short", "cheap-long", "exp"],
    );
  });
});
