import { briefSchema, type EventBrief, type EventBriefInput } from "@/domain/schema";

/** A fixed clock, so tests never depend on the day they run. */
export const NOW = new Date("2026-10-21T10:00:00Z");

export function makeBrief(overrides: Partial<EventBriefInput> = {}): EventBrief {
  return briefSchema.parse({
    eventType: "wedding",
    eventDate: "2027-05-10",
    guestCount: 200,
    budget: 1_500_000,
    currency: "INR",
    ...overrides,
  });
}

/** Small deterministic PRNG (mulberry32) for repeatable randomised tests. */
export function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function jsonRequest(body: unknown, init: { headers?: Record<string, string>; url?: string } = {}): Request {
  return new Request(init.url ?? "https://jashn.test/api/plan", {
    method: "POST",
    headers: { "content-type": "application/json", host: "jashn.test", ...init.headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
