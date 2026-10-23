import { deriveAdvisories } from "./advisories";
import { allocateBudget } from "./budget";
import { epochDay, todayEpochDay } from "./dates";
import { buildTimeline } from "./timeline";
import type { EventBrief } from "./schema";
import type { Plan } from "./types";
import { buildVendorChecklist } from "./vendors";

/**
 * Pure and deterministic: the same brief and clock always give the same plan.
 * No network, no randomness, so it is instant, free, and fully testable.
 * Gemini only adds creative ideas on top (see src/ai).
 */
export function buildPlan(brief: EventBrief, now: Date): Plan {
  const eventDay = epochDay(brief.eventDate);
  const daysAvailable = Math.max(0, eventDay - todayEpochDay(now));

  const budget = allocateBudget(brief, daysAvailable);
  const timeline = buildTimeline(brief, eventDay, daysAvailable);
  const vendors = buildVendorChecklist(brief, eventDay, daysAvailable);

  return {
    summary: {
      eventType: brief.eventType,
      title: brief.title,
      eventDate: brief.eventDate,
      daysAvailable,
      guestCount: brief.guestCount,
    },
    budget,
    timeline,
    vendors,
    advisories: deriveAdvisories(brief, budget, timeline),
  };
}
