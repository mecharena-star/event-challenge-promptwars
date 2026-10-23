import { describe, expect, it } from "vitest";
import { checkEventDate, epochDay, isoFromEpochDay, todayEpochDay } from "@/domain/dates";
import { fieldErrors } from "@/domain/field-errors";
import { briefSchema, ideasSchema } from "@/domain/schema";
import { formatMoney } from "@/domain/money";
import { curatedIdeas } from "@/domain/ideas-fallback";
import { makeBrief, NOW } from "../helpers";

const valid = { eventType: "wedding", eventDate: "2027-01-01", guestCount: 100, budget: 500000, currency: "INR" };

describe("briefSchema", () => {
  it("applies defaults for optional fields", () => {
    const brief = briefSchema.parse(valid);
    expect(brief).toMatchObject({ title: "", venueType: "undecided", priorities: [], dietary: [], hasChildren: false, notes: "" });
  });

  it.each([
    ["unknown keys", { ...valid, isAdmin: true }],
    ["fractional guests", { ...valid, guestCount: 10.5 }],
    ["one guest", { ...valid, guestCount: 1 }],
    ["too many guests", { ...valid, guestCount: 2001 }],
    ["negative budget", { ...valid, budget: -5 }],
    ["string budget", { ...valid, budget: "5000" }],
    ["impossible date", { ...valid, eventDate: "2027-02-30" }],
    ["unsupported currency", { ...valid, currency: "XYZ" }],
    ["four priorities", { ...valid, priorities: ["venue", "catering", "decor", "attire"] }],
    ["duplicate priorities", { ...valid, priorities: ["venue", "venue"] }],
    ["contingency as priority", { ...valid, priorities: ["contingency"] }],
    ["notes over the limit", { ...valid, notes: "x".repeat(401) }],
    ["__proto__ injection", JSON.parse('{"__proto__": {"x": 1}, "eventType": "wedding"}')],
  ])("rejects %s", (_name, input) => {
    expect(briefSchema.safeParse(input).success).toBe(false);
  });

  it("produces one readable message per field", () => {
    const result = briefSchema.safeParse({ ...valid, guestCount: 1, extra: 1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error)).toEqual({ guestCount: "At least 2 guests", _form: "Unknown field" });
    }
  });
});

describe("ideasSchema", () => {
  it("accepts the curated bank for every event type, so the fallback is always valid", () => {
    for (const eventType of ["wedding", "birthday", "community"] as const) {
      const ideas = curatedIdeas(makeBrief({ eventType, dietary: ["vegan"], hasChildren: true, venueType: "outdoor" }), "tight");
      expect(ideasSchema.safeParse(ideas).success).toBe(true);
    }
  });

  it("rejects oversized or empty model output", () => {
    const ideas = curatedIdeas(makeBrief(), "balanced");
    expect(ideasSchema.safeParse({ ...ideas, menuIdeas: ["x".repeat(500), "a", "b"] }).success).toBe(false);
    expect(ideasSchema.safeParse({ ...ideas, themes: [] }).success).toBe(false);
  });
});

describe("dates", () => {
  it("round-trips epoch days", () => {
    expect(isoFromEpochDay(epochDay("2028-02-29"))).toBe("2028-02-29");
  });

  it("allows today (with a day of timezone slack) but not older dates", () => {
    const today = todayEpochDay(NOW);
    expect(checkEventDate("2026-10-21", today)).toBeNull();
    expect(checkEventDate("2026-10-20", today)).toBeNull();
    expect(checkEventDate("2026-10-19", today)).toMatch(/future/);
  });

  it("limits planning to three years ahead", () => {
    const today = todayEpochDay(NOW);
    expect(checkEventDate("2029-10-01", today)).toBeNull();
    expect(checkEventDate("2030-01-01", today)).toMatch(/three years/);
  });
});

describe("formatMoney", () => {
  it("uses local digit grouping per currency", () => {
    expect(formatMoney(1500000, "INR")).toBe("₹15,00,000");
    expect(formatMoney(1500000, "USD")).toBe("$1,500,000");
  });
});
