import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { searchOptionsFromBody, validateQuery } from "./search";
import { makeQuery } from "./test-helpers";

describe("validateQuery destination", () => {
  it("accepts a city place id", () => {
    const query = validateQuery(makeQuery({ destination: "city:Tokyo" }));
    assert.equal(query.destination, "city:Tokyo");
  });

  it("accepts a country name", () => {
    const query = validateQuery(makeQuery({ destination: "Japan" }));
    assert.equal(query.destination, "Japan");
  });

  it("rejects the same airport as origin", () => {
    assert.throws(
      () => validateQuery(makeQuery({ origin: "NRT", destination: "NRT" })),
      /same as origin/,
    );
  });

  it("still accepts a single IATA", () => {
    const query = validateQuery(makeQuery({ destination: "icn" }));
    assert.equal(query.destination, "icn");
  });
});

describe("searchOptionsFromBody", () => {
  it("defaults to cache", () => {
    assert.equal(searchOptionsFromBody({}).bypassCache, false);
    assert.equal(searchOptionsFromBody({ bypassCache: true }).bypassCache, true);
    assert.equal(searchOptionsFromBody({ bypassCache: "yes" }).bypassCache, false);
  });
});
