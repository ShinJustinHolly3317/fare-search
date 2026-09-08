import type { MessageKey } from "./i18n";

/** 人事總處放假日／補假。週末本身不算，國定假日落在週末仍標名字。 */
export type HolidayId =
  | "newYear"
  | "cnyEveEve"
  | "cnyEve"
  | "cny"
  | "peaceMemorial"
  | "childrensDay"
  | "tombSweeping"
  | "laborDay"
  | "dragonBoat"
  | "midAutumn"
  | "teachersDay"
  | "nationalDay"
  | "restorationDay"
  | "constitutionDay";

export type TwHoliday = {
  date: string;
  id: HolidayId;
  makeup: boolean;
};

export const HOLIDAY_MESSAGE: Record<HolidayId, MessageKey> = {
  newYear: "holidayNewYear",
  cnyEveEve: "holidayCnyEveEve",
  cnyEve: "holidayCnyEve",
  cny: "holidayCny",
  peaceMemorial: "holidayPeaceMemorial",
  childrensDay: "holidayChildrensDay",
  tombSweeping: "holidayTombSweeping",
  laborDay: "holidayLaborDay",
  dragonBoat: "holidayDragonBoat",
  midAutumn: "holidayMidAutumn",
  teachersDay: "holidayTeachersDay",
  nationalDay: "holidayNationalDay",
  restorationDay: "holidayRestorationDay",
  constitutionDay: "holidayConstitutionDay",
};

function day(date: string, id: HolidayId, makeup = false): TwHoliday {
  return { date, id, makeup };
}

/**
 * 2026–2028 政府行政機關放假日。
 * 來源：人事總處 115、116 年辦公日曆表。
 */
const HOLIDAYS: TwHoliday[] = [
  // 2026
  day("2026-01-01", "newYear"),
  day("2026-02-15", "cnyEveEve"),
  day("2026-02-16", "cnyEve"),
  day("2026-02-17", "cny"),
  day("2026-02-18", "cny"),
  day("2026-02-19", "cny"),
  day("2026-02-20", "cnyEveEve", true),
  day("2026-02-27", "peaceMemorial", true),
  day("2026-02-28", "peaceMemorial"),
  day("2026-04-03", "childrensDay", true),
  day("2026-04-04", "childrensDay"),
  day("2026-04-05", "tombSweeping"),
  day("2026-04-06", "tombSweeping", true),
  day("2026-05-01", "laborDay"),
  day("2026-06-19", "dragonBoat"),
  day("2026-09-25", "midAutumn"),
  day("2026-09-28", "teachersDay"),
  day("2026-10-09", "nationalDay", true),
  day("2026-10-10", "nationalDay"),
  day("2026-10-25", "restorationDay"),
  day("2026-10-26", "restorationDay", true),
  day("2026-12-25", "constitutionDay"),
  // 2027
  day("2027-01-01", "newYear"),
  day("2027-02-04", "cnyEveEve"),
  day("2027-02-05", "cnyEve"),
  day("2027-02-06", "cny"),
  day("2027-02-07", "cny"),
  day("2027-02-08", "cny"),
  day("2027-02-09", "cny", true),
  day("2027-02-10", "cny", true),
  day("2027-02-28", "peaceMemorial"),
  day("2027-03-01", "peaceMemorial", true),
  day("2027-04-04", "childrensDay"),
  day("2027-04-05", "tombSweeping"),
  day("2027-04-06", "childrensDay", true),
  day("2027-04-30", "laborDay", true),
  day("2027-05-01", "laborDay"),
  day("2027-06-09", "dragonBoat"),
  day("2027-09-15", "midAutumn"),
  day("2027-09-28", "teachersDay"),
  day("2027-10-10", "nationalDay"),
  day("2027-10-11", "nationalDay", true),
  day("2027-10-25", "restorationDay"),
  day("2027-12-24", "constitutionDay", true),
  day("2027-12-25", "constitutionDay"),
  day("2027-12-31", "newYear", true),
  // 2028 元旦落在週六，補假已寫在 12/31
  day("2028-01-01", "newYear"),
];

const BY_DATE = new Map(HOLIDAYS.map((holiday) => [holiday.date, holiday]));

export function twHoliday(iso: string): TwHoliday | undefined {
  return BY_DATE.get(iso);
}

export function formatTwHoliday(
  holiday: TwHoliday,
  translate: (key: MessageKey, vars?: Record<string, string | number>) => string,
): string {
  const name = translate(HOLIDAY_MESSAGE[holiday.id]);
  return holiday.makeup ? translate("holidayMakeup", { name }) : name;
}
