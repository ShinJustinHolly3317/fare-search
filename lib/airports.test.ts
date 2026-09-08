import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findAirport,
  formatAirport,
  resolveDestination,
  searchAirports,
  searchPlaces,
} from "./airports";
import { MAX_DEST_AIRPORTS } from "./types";

describe("searchAirports", () => {
  it("finds by IATA", () => {
    const hits = searchAirports("TPE");
    assert.equal(hits[0]?.iata, "TPE");
  });

  it("finds Taipei even though OurAirports city is Taoyuan", () => {
    const codes = searchAirports("taipei").map((a) => a.iata);
    assert.ok(codes.includes("TPE"));
    assert.ok(codes.includes("TSA"));
    assert.equal(codes[0], "TPE");
  });

  it("finds Tokyo by city", () => {
    const codes = searchAirports("tokyo").map((a) => a.iata);
    assert.ok(codes.includes("HND"));
    assert.ok(codes.includes("NRT"));
  });

  it("finds by airport name", () => {
    assert.equal(searchAirports("narita")[0]?.iata, "NRT");
  });

  it("finds Japan and ranks large airports first", () => {
    const hits = searchAirports("japan");
    assert.ok(hits.length >= 5);
    assert.equal(hits[0]?.country, "Japan");
    assert.ok(["HND", "NRT", "KIX"].includes(hits[0]?.iata ?? ""));
  });

  it("finds CJK aliases", () => {
    assert.ok(searchAirports("成田").some((a) => a.iata === "NRT"));
    assert.ok(searchAirports("台北").some((a) => a.iata === "TPE"));
  });
});

describe("findAirport / formatAirport", () => {
  it("formats a known IATA", () => {
    const tpe = findAirport("tpe");
    assert.ok(tpe);
    assert.match(formatAirport(tpe), /TPE/);
    assert.match(formatAirport(tpe), /Taiwan/);
  });
});

describe("resolveDestination", () => {
  it("keeps a single IATA as one airport", () => {
    const hits = resolveDestination("NRT");
    assert.equal(hits.length, 1);
    assert.equal(hits[0]?.iata, "NRT");
  });

  it("expands Tokyo to Haneda and Narita", () => {
    for (const query of ["tokyo", "東京", "city:Tokyo"]) {
      const codes = resolveDestination(query).map((airport) => airport.iata);
      assert.ok(codes.includes("HND"), query);
      assert.ok(codes.includes("NRT"), query);
    }
  });

  it("expands Japan to a capped set of large airports", () => {
    for (const query of ["japan", "日本", "country:Japan"]) {
      const hits = resolveDestination(query);
      assert.equal(hits.length, MAX_DEST_AIRPORTS, query);
      assert.ok(hits.every((airport) => airport.country === "Japan" && airport.size === "large"));
      const codes = hits.map((airport) => airport.iata);
      assert.ok(codes.includes("HND"), query);
      assert.ok(codes.includes("NRT"), query);
      assert.ok(codes.includes("KIX"), query);
      assert.ok(["HND", "NRT", "KIX"].includes(codes[0] ?? ""));
    }
  });
});

describe("searchPlaces", () => {
  it("puts the Tokyo city group above individual airports", () => {
    const hits = searchPlaces("tokyo");
    assert.equal(hits[0]?.kind, "city");
    assert.equal(hits[0]?.id, "city:Tokyo");
    const codes = hits[0]?.airports.map((airport) => airport.iata) ?? [];
    assert.ok(codes.includes("HND"));
    assert.ok(codes.includes("NRT"));
  });

  it("puts a Japan country group first", () => {
    const hits = searchPlaces("japan");
    assert.equal(hits[0]?.kind, "country");
    assert.equal(hits[0]?.id, "country:Japan");
    assert.equal(hits[0]?.airports.length, MAX_DEST_AIRPORTS);
  });
});
