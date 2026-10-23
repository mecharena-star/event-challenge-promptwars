import { describe, expect, it } from "vitest";
import { buildPlan } from "@/domain/planner";
import { makeBrief, NOW } from "../helpers";

const plan = (overrides: Parameters<typeof makeBrief>[0] = {}) => buildPlan(makeBrief(overrides), NOW);
const ids = (p: ReturnType<typeof plan>) => p.advisories.map((a) => a.id);

describe("buildPlan", () => {
  it("is deterministic for the same brief and clock", () => {
    expect(plan()).toEqual(plan());
  });

  it("reports the days available and clamps a past date to zero", () => {
    expect(plan({ eventDate: "2026-11-20" }).summary.daysAvailable).toBe(30);
    expect(plan({ eventDate: "2026-10-20" }).summary.daysAvailable).toBe(0);
  });
});

describe("advisories", () => {
  it("flags a tight per-guest budget with the floor it is judged against", () => {
    const tight = plan({ budget: 100_000 }).advisories.find((a) => a.id === "budget-tight");
    expect(tight?.severity).toBe("warning");
    expect(tight?.detail).toContain("₹1,500");
  });

  it("praises a generous budget only when it is generous", () => {
    expect(ids(plan({ budget: 20_000_000 }))).toContain("budget-comfortable");
    expect(ids(plan({ budget: 600_000 }))).not.toContain("budget-comfortable");
  });

  it("escalates as lead time shrinks", () => {
    expect(ids(plan({ eventDate: "2026-10-25" }))).toContain("very-short-notice");
    expect(plan({ eventDate: "2026-12-15" }).advisories.find((a) => a.id === "compressed-timeline")?.severity).toBe(
      "critical",
    );
    expect(plan({ eventDate: "2027-07-01" }).advisories.find((a) => a.id === "compressed-timeline")?.severity).toBe(
      "warning",
    );
    expect(ids(plan({ eventDate: "2028-01-01" }))).not.toContain("compressed-timeline");
  });

  it("lists the most severe advisory first", () => {
    const order = plan({ eventDate: "2026-10-25", budget: 100_000 }).advisories.map((a) => a.severity);
    expect(order[0]).toBe("critical");
  });

  it("flags large gatherings, crowded homes and community permissions", () => {
    expect(ids(plan({ guestCount: 600 }))).toContain("large-gathering");
    expect(ids(plan({ venueType: "home", guestCount: 90 }))).toContain("home-capacity");
    expect(ids(plan({ eventType: "community" }))).toContain("local-rules");
  });
});

describe("vendor checklist", () => {
  it("replaces the venue with rentals when hosting at home", () => {
    const names = plan({ venueType: "home" }).vendors.map((v) => v.id);
    expect(names).not.toContain("venue");
    expect(names).toContain("rental");
  });

  it("adds shelter for outdoor events and a children's corner for non-birthday events with children", () => {
    expect(plan({ venueType: "outdoor" }).vendors.map((v) => v.id)).toContain("shelter");
    expect(plan({ hasChildren: true }).vendors.map((v) => v.id)).toContain("kids");
    expect(plan({ eventType: "birthday", hasChildren: true }).vendors.map((v) => v.id)).not.toContain("kids");
  });

  it("puts dietary and accessibility questions first, in the right vendor", () => {
    const p = plan({ dietary: ["jain", "vegan"], needsAccessibility: true });
    expect(p.vendors.find((v) => v.id === "caterer")?.questions[0]).toMatch(/jain, vegan/);
    expect(p.vendors.find((v) => v.id === "venue")?.questions[0]).toMatch(/step-free/);
  });

  it("never asks the user to book in the past and lists essentials first", () => {
    const p = plan({ eventDate: "2026-10-30" });
    expect(p.vendors.every((v) => v.bookBy >= "2026-10-21")).toBe(true);
    expect(p.vendors[0]?.priority).toBe("essential");
  });
});
