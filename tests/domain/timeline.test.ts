import { describe, expect, it } from "vitest";
import { epochDay, todayEpochDay } from "@/domain/dates";
import { buildTimeline, scaleLead } from "@/domain/timeline";
import { makeBrief, NOW } from "../helpers";

function timelineFor(overrides: Parameters<typeof makeBrief>[0], eventDate: string) {
  const brief = makeBrief({ ...overrides, eventDate });
  const eventDay = epochDay(eventDate);
  return buildTimeline(brief, eventDay, Math.max(0, eventDay - todayEpochDay(NOW)));
}

describe("scaleLead", () => {
  it("keeps the ideal schedule when there is enough time", () => {
    expect(scaleLead(300, 330, 330)).toBe(300);
    expect(scaleLead(300, 900, 330)).toBe(300);
  });

  it("compresses long-lead tasks proportionally and never beyond the time available", () => {
    const scaled = scaleLead(300, 120, 330);
    expect(scaled).toBeLessThan(300);
    expect(scaled).toBeLessThanOrEqual(120);
    expect(scaleLead(330, 120, 330)).toBeGreaterThanOrEqual(scaleLead(150, 120, 330));
  });

  it("keeps final-window tasks relative to the event, and clamps them to today", () => {
    expect(scaleLead(7, 100, 330)).toBe(7);
    expect(scaleLead(14, 5, 330)).toBe(5);
    expect(scaleLead(0, 5, 330)).toBe(0);
  });
});

describe("buildTimeline", () => {
  it("never schedules anything in the past, even with three days to go", () => {
    const today = NOW.toISOString().slice(0, 10);
    const { milestones, compressed } = timelineFor({}, "2026-10-24");
    expect(compressed).toBe(true);
    expect(milestones.every((m) => m.dueDate >= today)).toBe(true);
  });

  it("orders milestones by due date and ends on the event day", () => {
    const { milestones } = timelineFor({ eventType: "birthday" }, "2026-12-20");
    const dates = milestones.map((m) => m.dueDate);
    expect(dates).toEqual([...dates].sort());
    expect(milestones.at(-1)?.dueDate).toBe("2026-12-20");
  });

  it("is not compressed when the full horizon is available", () => {
    expect(timelineFor({}, "2027-10-01").compressed).toBe(false);
  });

  it("adds context milestones for dietary needs, accessibility and outdoor venues", () => {
    const ids = timelineFor({ dietary: ["vegan"], needsAccessibility: true, venueType: "outdoor" }, "2027-05-10").milestones.map((m) => m.id);
    expect(ids).toEqual(expect.arrayContaining(["dietary", "access", "weather"]));
    expect(timelineFor({}, "2027-05-10").milestones.map((m) => m.id)).not.toContain("weather");
  });

  it("marks the first tasks urgent when time is short", () => {
    expect(timelineFor({ eventType: "birthday" }, "2026-11-01").milestones.some((m) => m.urgent)).toBe(true);
  });
});
