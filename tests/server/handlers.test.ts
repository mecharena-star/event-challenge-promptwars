import { describe, expect, it, vi } from "vitest";
import { curatedIdeas } from "@/domain/ideas-fallback";
import { createIdeasHandler, createPlanHandler, type Deps } from "@/server/handlers";
import { loadEnv } from "@/server/env";
import { createRateLimiter } from "@/server/rate-limit";
import { jsonRequest, makeBrief, NOW } from "../helpers";

const body = { eventType: "wedding", eventDate: "2027-05-10", guestCount: 200, budget: 1_500_000, currency: "INR" };

function makeDeps(overrides: Partial<Deps> = {}): Deps {
  return {
    env: loadEnv({}),
    now: () => NOW,
    generator: null,
    planLimiter: createRateLimiter({ limit: 100, windowMs: 60_000 }),
    ideasLimiter: createRateLimiter({ limit: 100, windowMs: 60_000 }),
    ...overrides,
  };
}

describe("POST /api/plan", () => {
  const handler = createPlanHandler(makeDeps());

  it("returns a complete plan with safe response headers", async () => {
    const response = await handler(jsonRequest(body));
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(json.plan.budget.lines.reduce((a: number, l: { amount: number }) => a + l.amount, 0)).toBe(1_500_000);
    expect(json.plan.timeline.milestones.length).toBeGreaterThan(5);
  });

  it("returns field-level errors for an invalid brief", async () => {
    const response = await handler(jsonRequest({ ...body, guestCount: 1, budget: "lots" }));
    const json = await response.json();
    expect(response.status).toBe(422);
    expect(json.error.code).toBe("invalid_brief");
    expect(Object.keys(json.error.fields)).toEqual(expect.arrayContaining(["guestCount", "budget"]));
  });

  it("rejects dates in the past and unknown fields", async () => {
    const past = await handler(jsonRequest({ ...body, eventDate: "2026-01-01" }));
    expect((await past.json()).error.fields.eventDate).toMatch(/future/);
    const extra = await handler(jsonRequest({ ...body, admin: true }));
    expect((await extra.json()).error.fields._form).toBe("Unknown field");
  });

  it("blocks cross-site requests before doing any work", async () => {
    const response = await handler(jsonRequest(body, { headers: { origin: "https://evil.example" } }));
    expect(response.status).toBe(403);
  });

  it("rate limits per client and says when to retry", async () => {
    const limited = createPlanHandler(makeDeps({ planLimiter: createRateLimiter({ limit: 1, windowMs: 60_000 }) }));
    const headers = { "x-forwarded-for": "9.9.9.9" };
    expect((await limited(jsonRequest(body, { headers }))).status).toBe(200);
    const blocked = await limited(jsonRequest(body, { headers }));
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
    expect((await limited(jsonRequest(body, { headers: { "x-forwarded-for": "8.8.8.8" } }))).status).toBe(200);
  });

  it("never leaks internals on an unexpected failure", async () => {
    const logged: string[] = [];
    const write = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      logged.push(String(chunk));
      return true;
    });
    const broken = createPlanHandler(makeDeps({ now: () => { throw new Error("db password is hunter2"); } }));
    const response = await broken(jsonRequest(body));
    const text = await response.text();
    write.mockRestore();

    expect(response.status).toBe(500);
    expect(text).not.toContain("hunter2");
    expect(JSON.parse(text).error.code).toBe("internal_error");
    // The log records what failed, but not the error message, which could hold secrets.
    expect(logged.join("")).toContain("request_failed");
    expect(logged.join("")).not.toContain("hunter2");
  });
});

describe("POST /api/ideas", () => {
  it("serves curated ideas when Gemini is not configured", async () => {
    const response = await createIdeasHandler(makeDeps())(jsonRequest(body));
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.ideas).toMatchObject({ source: "curated", notice: "not_configured" });
  });

  it("serves Gemini ideas when the model returns valid output", async () => {
    const ideas = curatedIdeas(makeBrief(), "balanced");
    const generator = vi.fn(async () => JSON.stringify(ideas));
    const response = await createIdeasHandler(makeDeps({ generator }))(jsonRequest(body));
    expect((await response.json()).ideas.source).toBe("gemini");
    expect(generator).toHaveBeenCalledOnce();
  });

  it("uses its own, stricter limiter", async () => {
    const handler = createIdeasHandler(makeDeps({ ideasLimiter: createRateLimiter({ limit: 1, windowMs: 60_000 }) }));
    await handler(jsonRequest(body));
    expect((await handler(jsonRequest(body))).status).toBe(429);
  });
});
