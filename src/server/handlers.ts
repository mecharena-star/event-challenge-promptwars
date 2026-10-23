import { generateIdeas } from "@/ai/ideas";
import type { IdeaGenerator } from "@/ai/gemini";
import { checkEventDate, todayEpochDay } from "@/domain/dates";
import { buildPlan } from "@/domain/planner";
import { briefSchema, type EventBrief } from "@/domain/schema";
import type { ServerEnv } from "./env";
import { fieldErrors } from "@/domain/field-errors";
import { clientKey, errorResponse, HttpError, isSameOrigin, jsonResponse, readJsonBody } from "./http";
import { log } from "./logger";
import type { RateLimiter } from "./rate-limit";

export interface Deps {
  env: ServerEnv;
  now: () => Date;
  generator: IdeaGenerator | null;
  planLimiter: RateLimiter;
  ideasLimiter: RateLimiter;
}

/**
 * The single, ordered gate every request passes: same-origin, rate limit,
 * bounded body, schema validation, then date feasibility. Cheap checks run
 * first so abusive requests cost as little as possible.
 */
async function readBrief(req: Request, limiter: RateLimiter, now: Date): Promise<EventBrief> {
  if (!isSameOrigin(req)) throw new HttpError(403, "forbidden_origin", "Cross-site requests are not allowed.");

  const verdict = limiter.check(clientKey(req));
  if (!verdict.allowed) {
    throw new HttpError(429, "rate_limited", "Too many requests. Please wait a moment and try again.", undefined, {
      "Retry-After": String(verdict.retryAfterSec),
    });
  }

  const parsed = briefSchema.safeParse(await readJsonBody(req));
  if (!parsed.success) {
    throw new HttpError(422, "invalid_brief", "Some details need fixing.", fieldErrors(parsed.error));
  }
  const dateProblem = checkEventDate(parsed.data.eventDate, todayEpochDay(now));
  if (dateProblem) throw new HttpError(422, "invalid_brief", "Some details need fixing.", { eventDate: dateProblem });
  return parsed.data;
}

async function respond(work: () => Promise<unknown>, route: string): Promise<Response> {
  const started = Date.now();
  try {
    const body = await work();
    log("info", "request_ok", { route, ms: Date.now() - started });
    return jsonResponse(body);
  } catch (error) {
    if (error instanceof HttpError) {
      log("warn", "request_rejected", { route, status: error.status, code: error.code });
      return errorResponse(error);
    }
    log("error", "request_failed", { route, name: error instanceof Error ? error.name : "unknown" });
    return errorResponse(new HttpError(500, "internal_error", "Something went wrong on our side. Please try again."));
  }
}

/** POST /api/plan: deterministic plan; instant, free and independent of any AI service. */
export function createPlanHandler(deps: Deps) {
  return (req: Request) =>
    respond(async () => {
      const now = deps.now();
      const brief = await readBrief(req, deps.planLimiter, now);
      return { plan: buildPlan(brief, now) };
    }, "plan");
}

/** POST /api/ideas: Gemini-written ideas with automatic fallback to curated ideas. */
export function createIdeasHandler(deps: Deps) {
  return (req: Request) =>
    respond(async () => {
      const now = deps.now();
      const brief = await readBrief(req, deps.ideasLimiter, now);
      const plan = buildPlan(brief, now);
      return { ideas: await generateIdeas(brief, plan, deps.generator, { timeoutMs: deps.env.AI_TIMEOUT_MS }) };
    }, "ideas");
}
