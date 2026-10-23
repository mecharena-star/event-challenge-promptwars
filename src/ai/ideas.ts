import { randomBytes } from "node:crypto";
import { curatedIdeas } from "@/domain/ideas-fallback";
import { ideasSchema } from "@/domain/schema";
import type { EventBrief } from "@/domain/schema";
import type { IdeasNotice, IdeasResult, Plan } from "@/domain/types";
import type { IdeaGenerator } from "./port";
import { buildIdeasPrompt, buildSystemInstruction, looksLikeInjection } from "./prompt";

export interface IdeasOptions {
  timeoutMs: number;
  /** The HTTP request's signal: if the user leaves or resubmits, the model call is cancelled. */
  signal?: AbortSignal;
  /** Themes the user has already seen; the model (or the curated bank) must offer others. */
  avoidThemes?: readonly string[];
  /** Injectable so tests can plant a known marker. */
  createCanary?: () => string;
}

const defaultCanary = () => `CANARY_${randomBytes(8).toString("hex")}`;

/**
 * Asks Gemini for personalised ideas, but never lets the AI be a single point
 * of failure: every failure path (no key, timeout, upstream error, malformed
 * JSON, schema violation, tripped tripwire) falls back to curated ideas and
 * reports why. This function does not throw.
 */
export async function generateIdeas(
  brief: EventBrief,
  plan: Plan,
  generator: IdeaGenerator | null,
  { timeoutMs, signal, avoidThemes = [], createCanary = defaultCanary }: IdeasOptions,
): Promise<IdeasResult> {
  const fallback = (notice: IdeasNotice): IdeasResult => ({
    source: "curated",
    ideas: curatedIdeas(brief, plan.budget.perGuestStatus, avoidThemes),
    notice,
  });
  if (!generator) return fallback("not_configured");

  const notesIgnored = looksLikeInjection(brief.notes) || looksLikeInjection(brief.location);
  const canary = createCanary();
  const timeout = AbortSignal.timeout(timeoutMs);
  const cancel = signal ? AbortSignal.any([timeout, signal]) : timeout;

  try {
    const text = await generator(
      {
        system: buildSystemInstruction(canary),
        prompt: buildIdeasPrompt(brief, plan, { avoidThemes, includeNotes: !notesIgnored }),
      },
      cancel,
    );
    if (text.includes(canary)) return fallback("blocked_output");

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return fallback("invalid_response");
    }
    const parsed = ideasSchema.safeParse(json);
    if (!parsed.success) return fallback("invalid_response");
    return { source: "gemini", ideas: parsed.data, ...(notesIgnored ? { notice: "notes_ignored" as const } : {}) };
  } catch {
    return fallback(timeout.aborted ? "timeout" : "upstream_error");
  }
}
