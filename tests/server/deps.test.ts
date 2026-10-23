import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("getDeps", () => {
  it("builds dependencies from the environment once and reuses them", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("RATE_LIMIT_PLAN_PER_MIN", "7");
    const { getDeps } = await import("@/server/deps");
    const deps = getDeps();
    expect(getDeps()).toBe(deps);
    expect(deps.env.RATE_LIMIT_PLAN_PER_MIN).toBe(7);
    expect(deps.generator).toBeNull();
  });

  it("refuses to start with an invalid configuration", async () => {
    vi.stubEnv("AI_TIMEOUT_MS", "1");
    const { getDeps } = await import("@/server/deps");
    expect(() => getDeps()).toThrow("Invalid environment configuration: AI_TIMEOUT_MS");
  });
});
