import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findAirport, formatAirport, searchAirports } from "./airports";

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
