import { describe, expect, it } from "vitest";
import { loadEnv } from "@/server/env";

describe("loadEnv", () => {
  it("applies safe defaults and treats blank values as unset", () => {
    expect(loadEnv({ GEMINI_API_KEY: "", GEMINI_MODEL: "" })).toEqual({
      GEMINI_MODEL: "gemini-3.8-flash",
      AI_TIMEOUT_MS: 12_000,
      RATE_LIMIT_PLAN_PER_MIN: 30,
      RATE_LIMIT_IDEAS_PER_MIN: 8,
    });
  });

  it("coerces numbers from strings", () => {
    expect(loadEnv({ AI_TIMEOUT_MS: "5000" }).AI_TIMEOUT_MS).toBe(5000);
  });

  it("fails fast on bad values and never echoes them", () => {
    const secret = "super-secret-not-a-model!";
    try {
      loadEnv({ GEMINI_MODEL: secret, AI_TIMEOUT_MS: "5" });
      expect.unreachable();
    } catch (error) {
      expect((error as Error).message).toBe("Invalid environment configuration: GEMINI_MODEL, AI_TIMEOUT_MS");
      expect((error as Error).message).not.toContain(secret);
    }
  });
});
