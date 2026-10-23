import { describe, expect, it } from "vitest";
import { addDays } from "@/domain/dates";
import { EVENT_TYPES } from "@/domain/schema";
import { INITIAL_FORM, localTodayIso, sampleForm, toBriefInput, validateForm } from "@/lib/form-state";
import { formatDate, formatStub, pluralise } from "@/lib/format";

const today = "2026-10-21";

describe("validateForm", () => {
  it("reports every missing required field at once", () => {
    const result = validateForm(INITIAL_FORM, today);
    expect("errors" in result && Object.keys(result.errors)).toEqual(
      expect.arrayContaining(["eventType", "eventDate", "guestCount", "budget"]),
    );
  });

  it("accepts commas and spaces in numbers, as people type them", () => {
    expect(toBriefInput({ ...INITIAL_FORM, budget: "15,00,000", guestCount: " 1 200 " })).toMatchObject({
      budget: 1_500_000,
      guestCount: 1200,
    });
  });

  it("rejects text and decimals with a plain message", () => {
    const result = validateForm({ ...sampleForm("wedding", today), guestCount: "abc", budget: "10.5" }, today);
    expect("errors" in result && result.errors).toMatchObject({
      guestCount: "Enter the number of guests",
      budget: "Use a whole number",
    });
  });

  it("rejects a past date using the user's own today", () => {
    const result = validateForm({ ...sampleForm("wedding", today), eventDate: "2026-09-01" }, today);
    expect("errors" in result && result.errors.eventDate).toMatch(/future/);
  });

  it.each(EVENT_TYPES)("the %s example is valid, so a first click always works", (type) => {
    expect("brief" in validateForm(sampleForm(type, today), today)).toBe(true);
  });
});

describe("helpers", () => {
  it("formats the local date and adds days across month ends", () => {
    expect(localTodayIso(new Date(2026, 9, 5))).toBe("2026-10-05");
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
  });

  it("formats dates and plurals", () => {
    expect(formatDate("2026-12-05")).toBe("5 Dec 2026");
    expect(formatStub("2026-12-05")).toBe("5 Dec");
    expect(pluralise(1, "guest")).toBe("1 guest");
    expect(pluralise(250, "guest")).toBe("250 guests");
  });
});
