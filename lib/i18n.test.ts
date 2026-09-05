import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { interpolate, monthLabel, t } from "./i18n";

describe("i18n", () => {
  it("interpolates placeholders", () => {
    assert.equal(interpolate("{count} pairs", { count: 9 }), "9 pairs");
  });

  it("returns Traditional Chinese copy", () => {
    assert.equal(t("zh-TW", "search"), "搜尋");
    assert.equal(t("zh-TW", "from"), "出發地");
    assert.equal(t("en", "search"), "Search");
  });

  it("localizes months and duration", () => {
    assert.equal(monthLabel("zh-TW", 8), "9月");
    assert.equal(monthLabel("en", 8), "Sep");
    assert.equal(t("zh-TW", "durationHm", { h: 2, m: 15 }), "2小時 15分");
  });
});
