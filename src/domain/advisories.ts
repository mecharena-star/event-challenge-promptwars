import { formatMoney } from "./money";
import { PROFILES } from "./profiles";
import type { EventBrief } from "./schema";
import type { Advisory, BudgetPlan, Severity, TimelinePlan } from "./types";

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };

/**
 * Context-aware flags, each one a small readable rule. Rules never block the
 * plan; they tell the user what the plan assumes and where the risk is.
 */
export function deriveAdvisories(brief: EventBrief, budget: BudgetPlan, timeline: TimelinePlan): Advisory[] {
  const profile = PROFILES[brief.eventType];
  const out: Advisory[] = [];
  const money = (n: number) => formatMoney(n, brief.currency);

  if (budget.perGuestStatus === "tight") {
    out.push({
      id: "budget-tight",
      severity: "warning",
      title: "Budget per guest is tight",
      detail: `${money(budget.perGuest)} per guest is below the ${money(profile.perGuestFloor[brief.currency])} we use as a floor for a ${profile.label}. Consider a shorter guest list, a lower-cost venue, or a simpler menu.`,
    });
  } else if (budget.perGuestStatus === "comfortable") {
    out.push({
      id: "budget-comfortable",
      severity: "info",
      title: "There is room in this budget",
      detail:
        "Your per-guest budget is well above our planning floor. Spend the extra on your top priorities, or grow the contingency reserve.",
    });
  }

  if (timeline.daysAvailable <= 7) {
    out.push({
      id: "very-short-notice",
      severity: "critical",
      title: "The event is within a week",
      detail:
        "Book venue and food first, today if you can. Expect fewer choices and higher prices, and use the first items on the timeline as your to-do list.",
    });
  } else if (timeline.compressed) {
    const severe = timeline.daysAvailable < profile.maxLeadDays / 4;
    out.push({
      id: "compressed-timeline",
      severity: severe ? "critical" : "warning",
      title: severe ? "Very little lead time" : "Shorter than the ideal lead time",
      detail: `You have ${timeline.daysAvailable} days; a calm plan for a ${profile.label} takes about ${profile.maxLeadDays}. We compressed the timeline: do the earliest tasks first and book the essential vendors this week.`,
    });
  }

  if (brief.guestCount > profile.largeGathering) {
    out.push({
      id: "large-gathering",
      severity: "warning",
      title: "Large gathering",
      detail: "Confirm the venue's licensed capacity, fire exits, parking and a crowd-flow plan before you book.",
    });
  }
  if (brief.venueType === "home" && brief.guestCount > 60) {
    out.push({
      id: "home-capacity",
      severity: "warning",
      title: "A home may be tight for this many guests",
      detail: "Check seating, restrooms, parking and neighbours' noise limits, or consider a hired space.",
    });
  }
  if (brief.venueType === "outdoor") {
    out.push({
      id: "weather-plan",
      severity: "info",
      title: "Plan for the weather",
      detail: "We added an outdoor shelter vendor, a weather milestone and a larger contingency reserve.",
    });
  }
  if (brief.dietary.length > 0) {
    out.push({
      id: "dietary",
      severity: "info",
      title: "Dietary needs are built in",
      detail: "Caterer questions and a milestone for sharing exact counts were added to your checklist.",
    });
  }
  if (brief.eventType === "community") {
    out.push({
      id: "local-rules",
      severity: "info",
      title: "Check local rules",
      detail:
        "Public gatherings often need permission, noise approval or insurance. Rules vary by place, so confirm with your local authority.",
    });
  }

  return out.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
