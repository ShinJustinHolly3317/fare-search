import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { t } from "./i18n";
import { formatTwHoliday, twHoliday } from "./tw-holidays";

describe("twHoliday", () => {
  it("marks 2026 National Day and its Friday makeup", () => {
    const day = twHoliday("2026-10-10");
    const makeup = twHoliday("2026-10-09");
    assert.equal(day?.id, "nationalDay");
    assert.equal(day?.makeup, false);
    assert.equal(makeup?.id, "nationalDay");
    assert.equal(makeup?.makeup, true);
  });

  it("keeps 2026 Lunar New Year eve through day three", () => {
    assert.equal(twHoliday("2026-02-16")?.id, "cnyEve");
    assert.equal(twHoliday("2026-02-17")?.id, "cny");
    assert.equal(twHoliday("2026-02-20")?.makeup, true);
  });

  it("places 2027 Children's Day makeup after Tomb Sweeping", () => {
    assert.equal(twHoliday("2027-04-05")?.id, "tombSweeping");
    assert.equal(twHoliday("2027-04-06")?.id, "childrensDay");
    assert.equal(twHoliday("2027-04-06")?.makeup, true);
  });

  it("does not treat a random weekday as a holiday", () => {
    assert.equal(twHoliday("2026-09-08"), undefined);
  });

  it("formats observed days in both locales", () => {
    const makeup = twHoliday("2026-10-09");
    assert.ok(makeup);
    assert.equal(
      formatTwHoliday(makeup, (key, vars) => t("en", key, vars)),
      "National Day (observed)",
    );
    assert.equal(
      formatTwHoliday(makeup, (key, vars) => t("zh-TW", key, vars)),
      "國慶日補假",
    );
  });
});
