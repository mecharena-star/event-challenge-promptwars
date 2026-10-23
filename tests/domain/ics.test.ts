import { describe, expect, it } from "vitest";
import { buildCalendar, escapeIcsText, foldLine } from "@/domain/ics";
import { buildPlan } from "@/domain/planner";
import { makeBrief, NOW } from "../helpers";

describe("escapeIcsText", () => {
  it("escapes the characters RFC 5545 reserves and flattens newlines", () => {
    expect(escapeIcsText("a;b,c\\d\ne")).toBe("a\\;b\\,c\\\\d\\ne");
  });
});

describe("foldLine", () => {
  it("folds at 75 octets without splitting multi-byte characters", () => {
    const folded = foldLine(`SUMMARY:${"₹".repeat(60)}`);
    for (const part of folded.split("\r\n")) expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    expect(folded.replace(/\r\n /g, "")).toBe(`SUMMARY:${"₹".repeat(60)}`);
  });
});

describe("buildCalendar", () => {
  const plan = buildPlan(makeBrief({ title: "Asha & Ravi\r\nEND:VCALENDAR\r\nBEGIN:VEVENT" }), NOW);
  const ics = buildCalendar(plan, NOW);
  /** Counts whole content lines, so text that merely contains a keyword (inside an escaped value) is not counted. */
  const countLines = (text: string) => ics.split("\r\n").filter((line) => line === text).length;

  it("has one all-day event per milestone plus the event itself, with CRLF endings", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(countLines("BEGIN:VEVENT")).toBe(plan.timeline.milestones.length + 1);
    expect(ics).toContain("DTSTART;VALUE=DATE:20270510");
    expect(ics).toContain("DTEND;VALUE=DATE:20270511");
  });

  it("cannot be hijacked by a malicious title", () => {
    expect(countLines("END:VCALENDAR")).toBe(1);
    expect(countLines("BEGIN:VEVENT")).toBe(plan.timeline.milestones.length + 1);
    expect(ics).toContain("\\nEND:VCALENDAR\\n");
  });
});
