import { PROFILES } from "./profiles";
import type { BudgetCategory, EventBrief } from "./schema";
import type { BudgetLine, BudgetPlan, PerGuestStatus } from "./types";

const PRIORITY_BOOST = 1.3;
const MAX_CONTINGENCY_BP = 2000;
const RUSHED_WINDOW_DAYS = 30;

/**
 * Splits `total` whole units across `weights` so the parts sum to exactly
 * `total` (largest-remainder method). Ties break by position, so the result
 * is deterministic.
 */
export function apportion(total: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  const quotas = weights.map((w) => (total * w) / sum);
  const parts = quotas.map(Math.floor);
  let leftover = total - parts.reduce((a, b) => a + b, 0);
  const byRemainder = quotas
    .map((quota, index) => ({ index, remainder: quota - Math.floor(quota) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const { index } of byRemainder) {
    if (leftover <= 0) break;
    parts[index] = (parts[index] ?? 0) + 1;
    leftover -= 1;
  }
  return parts;
}

function classify(perGuest: number, floor: number): PerGuestStatus {
  if (perGuest < floor) return "tight";
  return perGuest < floor * 3 ? "balanced" : "comfortable";
}

/**
 * Turns the event profile's default split into a plan for this brief.
 * Every adjustment records a plain-language reason, so the user can see why
 * a line moved instead of trusting a black box.
 */
export function allocateBudget(brief: EventBrief, daysAvailable: number): BudgetPlan {
  const profile = PROFILES[brief.eventType];
  const notes = new Map<BudgetCategory, string[]>();
  const addNote = (category: BudgetCategory, text: string) =>
    notes.set(category, [...(notes.get(category) ?? []), text]);

  const weights = new Map<BudgetCategory, number>();
  for (const [category, weight] of Object.entries(profile.weights) as [BudgetCategory, number][]) {
    if (category !== "contingency") weights.set(category, weight);
  }
  const scale = (category: BudgetCategory, factor: number, reason: string) => {
    const current = weights.get(category);
    if (current === undefined) return;
    weights.set(category, current * factor);
    addNote(category, reason);
  };

  if (brief.venueType === "home") {
    scale("venue", 0.3, "Hosting at home cuts venue hire.");
    scale("logistics", 1.2, "Hosting at home means renting furniture and equipment.");
  }
  if (brief.venueType === "outdoor") {
    scale("logistics", 1.25, "Outdoor events need shelter, power and restrooms.");
  }
  if (brief.hasChildren && brief.eventType !== "birthday") {
    scale("entertainment", 1.15, "Includes a children's corner.");
  }
  if (brief.dietary.length >= 2) {
    scale("catering", 1.05, "Several dietary needs mean separate preparation.");
  }
  if (brief.needsAccessibility) {
    scale("logistics", 1.05, "Covers step-free access, seating and signage.");
  }
  for (const category of brief.priorities) {
    scale(category, PRIORITY_BOOST, "You marked this as a priority.");
  }

  let contingencyBp = profile.weights.contingency ?? 800;
  if (brief.venueType === "outdoor") {
    contingencyBp += 300;
    addNote("contingency", "Larger reserve for weather risk.");
  }
  if (daysAvailable < RUSHED_WINDOW_DAYS) {
    contingencyBp += 200;
    addNote("contingency", "Larger reserve because short notice raises prices.");
  }
  contingencyBp = Math.min(contingencyBp, MAX_CONTINGENCY_BP);

  // Rescale the other categories so the contingency share stays exactly as decided.
  const categories = [...weights.keys()];
  const weightSum = [...weights.values()].reduce((a, b) => a + b, 0);
  const scaled = categories.map((c) => ((weights.get(c) ?? 0) / weightSum) * (10_000 - contingencyBp));

  const allCategories: BudgetCategory[] = [...categories, "contingency"];
  const amounts = apportion(brief.budget, [...scaled, contingencyBp]);

  const lines: BudgetLine[] = allCategories.map((category, i) => {
    const amount = amounts[i] ?? 0;
    return {
      category,
      amount,
      sharePct: Math.round((amount / brief.budget) * 1000) / 10,
      notes: notes.get(category) ?? [],
    };
  });

  const perGuest = Math.floor(brief.budget / brief.guestCount);
  const catering = lines.find((l) => l.category === "catering")?.amount ?? 0;
  return {
    total: brief.budget,
    currency: brief.currency,
    perGuest,
    perGuestStatus: classify(brief.budget / brief.guestCount, profile.perGuestFloor[brief.currency]),
    cateringPerGuest: Math.floor(catering / brief.guestCount),
    lines,
  };
}
