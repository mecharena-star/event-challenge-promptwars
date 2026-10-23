import type { Plan } from "./types";

/** Escapes text per RFC 5545 section 3.3.11. Newlines become \n, so no field can inject new lines. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** Folds a content line at 75 octets with CRLF + space, as RFC 5545 requires. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

function compactDate(iso: string): string {
  return iso.replaceAll("-", "");
}

function nextDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return compactDate(d.toISOString().slice(0, 10));
}

/** Builds an all-day calendar entry for every milestone plus the event itself. */
export function buildCalendar(plan: Plan, now: Date): string {
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const name = plan.summary.title || "Celebration";
  const events = [
    ...plan.timeline.milestones.map((m) => ({ uid: m.id, date: m.dueDate, summary: m.title, description: m.detail })),
    { uid: "event-day", date: plan.summary.eventDate, summary: name, description: "Event day." },
  ];

  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Jashn//Celebration Planner//EN", "CALSCALE:GREGORIAN"];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}-${plan.summary.eventDate}@jashn.invalid`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compactDate(e.date)}`,
      `DTEND;VALUE=DATE:${nextDay(e.date)}`,
      `SUMMARY:${escapeIcsText(`${name}: ${e.summary}`)}`,
      `DESCRIPTION:${escapeIcsText(e.description)}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
