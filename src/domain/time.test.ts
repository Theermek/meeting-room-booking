import { describe, expect, it } from "vitest";

import {
  addDays,
  buildSlots,
  compareDates,
  currentDate,
  currentTime,
  durationMinutes,
  isDateString,
  isOnSlotGrid,
  isTimeString,
  slotIndex,
  toMinutes,
  toTimeString,
} from "./time";

// APP_TIMEZONE is Asia/Bishkek (UTC+6, no DST), so 04:00Z is 10:00 local.
const NOW = new Date("2026-10-07T04:00:00Z");

describe("toMinutes / toTimeString", () => {
  it("converts both ways", () => {
    expect(toMinutes("00:00")).toBe(0);
    expect(toMinutes("09:30")).toBe(570);
    expect(toMinutes("18:00")).toBe(1080);
    expect(toTimeString(570)).toBe("09:30");
    expect(toTimeString(0)).toBe("00:00");
  });

  it("round-trips every slot", () => {
    for (const slot of buildSlots()) {
      expect(toTimeString(toMinutes(slot))).toBe(slot);
    }
  });
});

describe("durationMinutes", () => {
  it("measures forwards and signals backwards ranges with a negative value", () => {
    expect(durationMinutes("09:00", "10:00")).toBe(60);
    expect(durationMinutes("10:00", "09:00")).toBe(-60);
    expect(durationMinutes("09:00", "09:00")).toBe(0);
  });
});

describe("buildSlots", () => {
  it("covers the workday in half-hour steps, excluding the closing time", () => {
    const slots = buildSlots();
    expect(slots).toHaveLength(18);
    expect(slots[0]).toBe("09:00");
    expect(slots.at(-1)).toBe("17:30");
    expect(slots).not.toContain("18:00");
  });
});

describe("isOnSlotGrid", () => {
  it("accepts :00 and :30 only", () => {
    expect(isOnSlotGrid("09:00")).toBe(true);
    expect(isOnSlotGrid("09:30")).toBe(true);
    expect(isOnSlotGrid("09:15")).toBe(false);
    expect(isOnSlotGrid("09:01")).toBe(false);
  });
});

describe("slotIndex", () => {
  it("indexes grid times inside the workday", () => {
    expect(slotIndex("09:00")).toBe(0);
    expect(slotIndex("09:30")).toBe(1);
    expect(slotIndex("17:30")).toBe(17);
  });

  it("returns -1 outside the grid or the day", () => {
    expect(slotIndex("08:30")).toBe(-1);
    expect(slotIndex("18:00")).toBe(-1);
    expect(slotIndex("09:15")).toBe(-1);
  });
});

describe("isTimeString / isDateString", () => {
  it("accepts well-formed values", () => {
    expect(isTimeString("00:00")).toBe(true);
    expect(isTimeString("23:59")).toBe(true);
    expect(isDateString("2026-10-07")).toBe(true);
  });

  it("rejects malformed values", () => {
    expect(isTimeString("24:00")).toBe(false);
    expect(isTimeString("9:00")).toBe(false);
    expect(isTimeString("09:60")).toBe(false);
    expect(isDateString("2026-10-7")).toBe(false);
    expect(isDateString("2026-13-01")).toBe(false);
  });

  it("rejects dates that look valid but do not exist", () => {
    expect(isDateString("2026-02-30")).toBe(false);
    expect(isDateString("2026-04-31")).toBe(false);
    // 2028 is a leap year, 2026 is not.
    expect(isDateString("2028-02-29")).toBe(true);
    expect(isDateString("2026-02-29")).toBe(false);
  });
});

describe("currentDate / currentTime", () => {
  it("reads the injected clock in the app timezone, not UTC", () => {
    expect(currentDate(NOW)).toBe("2026-10-07");
    expect(currentTime(NOW)).toBe("10:00");
  });

  it("rolls the date over at local rather than UTC midnight", () => {
    // 20:00Z on the 7th is already 02:00 on the 8th in Bishkek.
    const lateEvening = new Date("2026-10-07T20:00:00Z");
    expect(currentDate(lateEvening)).toBe("2026-10-08");
    expect(currentTime(lateEvening)).toBe("02:00");
  });
});

describe("compareDates", () => {
  it("orders date strings without parsing them", () => {
    expect(compareDates("2026-10-07", "2026-10-08")).toBe(-1);
    expect(compareDates("2026-10-08", "2026-10-07")).toBe(1);
    expect(compareDates("2026-10-07", "2026-10-07")).toBe(0);
    expect(compareDates("2026-09-30", "2026-10-01")).toBe(-1);
  });
});

describe("addDays", () => {
  it("crosses month and year boundaries", () => {
    expect(addDays("2026-10-07", 1)).toBe("2026-10-08");
    expect(addDays("2026-10-07", -1)).toBe("2026-10-06");
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });
});
