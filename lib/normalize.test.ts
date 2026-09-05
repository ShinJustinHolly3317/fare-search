import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { itineraryGoogleFlightsUrl, scrapedToLeg } from "./normalize";
import { parseCardText } from "./parse-card";

describe("scrapedToLeg", () => {
  it("keeps stops and +1 arrival date", () => {
    const option = parseCardText(
      "EVA Air\n10:15 PM – 6:45 AM+1\n1 stop in HKG\n8 hr 30 min\nTWD 7,200",
      { from: "TPE", to: "NRT", date: "2026-09-10" },
    );
    assert.ok(option);
    const leg = scrapedToLeg(option);
    assert.equal(leg.stops, 1);
    assert.equal(leg.departAt, "2026-09-10 22:15");
    assert.equal(leg.arriveAt, "2026-09-11 06:45");
    assert.equal(leg.layovers[0]?.airport, "HKG");
  });
});

describe("itineraryGoogleFlightsUrl", () => {
  it("pins flight numbers on the booking page", () => {
    const outbound = parseCardText(
      "EVA Air\nBR 192\n8:00 AM – 12:20 PM\nNonstop\n3 hr 20 min\nTWD 9,888",
      { from: "TPE", to: "NRT", date: "2026-09-28" },
    );
    const inbound = parseCardText(
      "EVA Air\nBR 191\n2:00 PM – 5:00 PM\nNonstop\n3 hr 20 min\nTWD 9,888",
      { from: "NRT", to: "TPE", date: "2026-10-05" },
    );
    assert.ok(outbound);
    assert.ok(inbound);
    const url = itineraryGoogleFlightsUrl({
      outbound: scrapedToLeg(outbound),
      inbound: scrapedToLeg(inbound),
      outboundDate: "2026-09-28",
      returnDate: "2026-10-05",
    });
    assert.match(url, /\/travel\/flights\/booking\?/);
    assert.match(url, /tfs=/);
  });

  it("builds the TPE-ICN Scoot/Jin Air booking tfs the user captured", () => {
    const outbound = parseCardText(
      "Scoot\nTR\u00a0872\n6:10 PM – 9:45 PM\nNonstop\n2 hr 35 min\nTWD 5,805",
      { from: "TPE", to: "ICN", date: "2026-09-10" },
    );
    const inbound = parseCardText(
      "Jin Air\nLJ\u00a0733\n10:40 PM – 12:10 AM+1\nNonstop\n2 hr 30 min\nTWD 5,805",
      { from: "ICN", to: "TPE", date: "2026-09-19" },
    );
    assert.ok(outbound);
    assert.ok(inbound);
    const url = itineraryGoogleFlightsUrl({
      outbound: scrapedToLeg(outbound),
      inbound: scrapedToLeg(inbound),
      outboundDate: "2026-09-10",
      returnDate: "2026-09-19",
    });
    assert.match(url, /\/travel\/flights\/booking\?/);
    assert.match(
      url,
      /tfs=CBwQAho_EgoyMDI2LTA5LTEwIh8KA1RQRRIKMjAyNi0wOS0xMBoDSUNOKgJUUjIDODcy/,
    );
  });

  it("falls back to a date search Google actually parses", () => {
    const outbound = parseCardText(
      "EVA Air\n8:00 AM – 12:20 PM\nNonstop\n3 hr 20 min\nTWD 9,888",
      { from: "TPE", to: "NRT", date: "2026-09-28" },
    );
    const inbound = parseCardText(
      "EVA Air\n2:00 PM – 5:00 PM\nNonstop\n3 hr 20 min\nTWD 9,888",
      { from: "NRT", to: "TPE", date: "2026-10-05" },
    );
    assert.ok(outbound);
    assert.ok(inbound);
    const url = itineraryGoogleFlightsUrl({
      outbound: scrapedToLeg(outbound),
      inbound: scrapedToLeg(inbound),
      outboundDate: "2026-09-28",
      returnDate: "2026-10-05",
    });
    assert.match(url, /q=Flights/);
    assert.doesNotMatch(url, /departing/);
    assert.doesNotMatch(url, /booking/);
  });
});
