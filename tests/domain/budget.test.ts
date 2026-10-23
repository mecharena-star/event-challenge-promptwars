import { describe, expect, it } from "vitest";
import { allocateBudget, apportion } from "@/domain/budget";
import { PROFILES } from "@/domain/profiles";
import { DIETARY_NEEDS, EVENT_TYPES, PRIORITY_CATEGORIES, VENUE_TYPES, type BudgetCategory } from "@/domain/schema";
import { makeBrief, seeded } from "../helpers";

const line = (plan: ReturnType<typeof allocateBudget>, category: BudgetCategory) =>
  plan.lines.find((l) => l.category === category)?.amount ?? 0;

describe("profiles", () => {
  it.each(EVENT_TYPES)("%s default split sums to exactly 100%%", (type) => {
    const total = Object.values(PROFILES[type].weights).reduce((a, b) => a + (b ?? 0), 0);
    expect(total).toBe(10_000);
  });
});

describe("apportion", () => {
  it("always returns parts that sum to the total", () => {
    const rand = seeded(1);
    for (let i = 0; i < 500; i++) {
      const total = Math.floor(rand() * 1_000_000) + 1;
      const weights = Array.from({ length: 2 + Math.floor(rand() * 9) }, () => rand() * 100 + 0.1);
      const parts = apportion(total, weights);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
      expect(parts.every((p) => Number.isInteger(p) && p >= 0)).toBe(true);
    }
  });

  it("is deterministic and breaks ties by position", () => {
    expect(apportion(10, [1, 1, 1])).toEqual([4, 3, 3]);
    expect(apportion(10, [1, 1, 1])).toEqual(apportion(10, [1, 1, 1]));
  });
});

describe("allocateBudget invariants (randomised)", () => {
  it("never loses or invents money, whatever the brief", () => {
    const rand = seeded(42);
    const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)] as T;
    for (let i = 0; i < 400; i++) {
      const budget = Math.floor(rand() ** 3 * 1_000_000_000) + 1;
      const brief = makeBrief({
        eventType: pick(EVENT_TYPES),
        venueType: pick(VENUE_TYPES),
        budget,
        guestCount: 2 + Math.floor(rand() * 1998),
        priorities: [...PRIORITY_CATEGORIES].sort(() => rand() - 0.5).slice(0, Math.floor(rand() * 4)),
        dietary: [...DIETARY_NEEDS].sort(() => rand() - 0.5).slice(0, Math.floor(rand() * 4)),
        hasChildren: rand() > 0.5,
        needsAccessibility: rand() > 0.5,
      });
      const plan = allocateBudget(brief, Math.floor(rand() * 400));

      expect(plan.lines.reduce((a, l) => a + l.amount, 0)).toBe(budget);
      expect(plan.lines.every((l) => Number.isInteger(l.amount) && l.amount >= 0)).toBe(true);
      expect(line(plan, "contingency")).toBeLessThanOrEqual(Math.ceil(budget * 0.2) + 1);
      expect(Math.abs(plan.lines.reduce((a, l) => a + l.sharePct, 0) - 100)).toBeLessThan(1);
    }
  });
});

describe("allocateBudget decisions", () => {
  const base = allocateBudget(makeBrief(), 300);

  it("gives a priority category a larger share and explains why", () => {
    const plan = allocateBudget(makeBrief({ priorities: ["photography"] }), 300);
    expect(line(plan, "photography")).toBeGreaterThan(line(base, "photography"));
    expect(plan.lines.find((l) => l.category === "photography")?.notes).toContain("You marked this as a priority.");
  });

  it("cuts venue spend when hosting at home", () => {
    expect(line(allocateBudget(makeBrief({ venueType: "home" }), 300), "venue")).toBeLessThan(line(base, "venue") / 2);
  });

  it("raises the contingency reserve for outdoor events and for short notice", () => {
    const outdoor = allocateBudget(makeBrief({ venueType: "outdoor" }), 300);
    const rushed = allocateBudget(makeBrief(), 10);
    expect(line(outdoor, "contingency")).toBeGreaterThan(line(base, "contingency"));
    expect(line(rushed, "contingency")).toBeGreaterThan(line(base, "contingency"));
    expect(outdoor.lines.find((l) => l.category === "contingency")?.notes.join(" ")).toMatch(/weather/);
  });

  it("omits categories a profile does not use", () => {
    const plan = allocateBudget(makeBrief({ eventType: "community" }), 100);
    expect(plan.lines.map((l) => l.category)).not.toContain("attire");
  });

  it("ignores a priority the event type has no budget line for", () => {
    const plan = allocateBudget(makeBrief({ eventType: "community", priorities: ["attire"] }), 100);
    expect(plan.lines.reduce((a, l) => a + l.amount, 0)).toBe(1_500_000);
  });

  it.each([
    [10_000, "tight"],
    [600_000, "balanced"],
    [10_000_000, "comfortable"],
  ] as const)("classifies a budget of %i for 200 INR wedding guests as %s", (budget, status) => {
    expect(allocateBudget(makeBrief({ budget }), 300).perGuestStatus).toBe(status);
  });
});
