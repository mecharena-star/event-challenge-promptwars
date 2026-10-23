import { curatedIdeas } from "@/domain/ideas-fallback";
import { ideasSchema } from "@/domain/schema";
import type { EventBrief } from "@/domain/schema";
import type { IdeasNotice, IdeasResult, Plan } from "@/domain/types";
import type { IdeaGenerator } from "./gemini";
import { buildIdeasPrompt } from "./prompt";

export interface IdeasOptions {
  timeoutMs: number;
}

/**
 * Asks Gemini for personalised ideas, but never lets the AI be a single point
 * of failure: every failure path (no key, timeout, upstream error, malformed
 * JSON, schema violation) falls back to curated ideas and reports why.
 * This function does not throw.
 */
export async function generateIdeas(
  brief: EventBrief,
  plan: Plan,
  generator: IdeaGenerator | null,
  { timeoutMs }: IdeasOptions,
): Promise<IdeasResult> {
  const fallback = (notice: IdeasNotice): IdeasResult => ({
    source: "curated",
    ideas: curatedIdeas(brief, plan.budget.perGuestStatus),
    notice,
  });
  if (!generator) return fallback("not_configured");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const text = await generator(buildIdeasPrompt(brief, plan), controller.signal);
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return fallback("invalid_response");
    }
    const parsed = ideasSchema.safeParse(json);
    return parsed.success ? { source: "gemini", ideas: parsed.data } : fallback("invalid_response");
  } catch {
    return fallback(controller.signal.aborted ? "timeout" : "upstream_error");
  } finally {
    clearTimeout(timer);
  }
}
