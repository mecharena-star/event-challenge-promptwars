import "server-only";
import { z } from "zod";

const envSchema = z.object({
  GEMINI_API_KEY: z.string().trim().min(10).optional(),
  GEMINI_MODEL: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9.-]{1,60}$/i, "must be a model id such as gemini-3.8-flash")
    .default("gemini-3.8-flash"),
  AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30_000).default(12_000),
  RATE_LIMIT_PLAN_PER_MIN: z.coerce.number().int().min(1).max(1000).default(30),
  RATE_LIMIT_IDEAS_PER_MIN: z.coerce.number().int().min(1).max(1000).default(8),
});

export type ServerEnv = z.infer<typeof envSchema>;

/**
 * Parses and validates configuration once, failing fast on a bad value.
 * Empty strings count as unset, so `GEMINI_API_KEY=` in a copied .env file is safe.
 * Error text names the variables but never echoes their values.
 */
export function loadEnv(source: Record<string, string | undefined>): ServerEnv {
  const cleaned = Object.fromEntries(Object.entries(source).filter(([, v]) => v !== undefined && v !== ""));
  const result = envSchema.safeParse(cleaned);
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((i) => i.path.join(".")))].join(", ");
    throw new Error(`Invalid environment configuration: ${names}`);
  }
  return result.data;
}
