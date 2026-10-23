import "server-only";
import { createGeminiGenerator } from "@/ai/gemini";
import type { Deps } from "./handlers";
import { loadEnv } from "./env";
import { createRateLimiter } from "./rate-limit";

let cached: Deps | undefined;

/** Builds the production dependencies once per server instance. */
export function getDeps(): Deps {
  if (cached) return cached;
  const env = loadEnv(process.env);
  cached = {
    env,
    now: () => new Date(),
    generator: createGeminiGenerator(env),
    planLimiter: createRateLimiter({ limit: env.RATE_LIMIT_PLAN_PER_MIN, windowMs: 60_000 }),
    ideasLimiter: createRateLimiter({ limit: env.RATE_LIMIT_IDEAS_PER_MIN, windowMs: 60_000 }),
  };
  return cached;
}
