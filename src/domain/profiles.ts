import type { BudgetCategory, Currency, DietaryNeed, EventType } from "./schema";

export interface EventProfile {
  label: string;
  /** Planning horizon in days: the lead time a calm, fully staged plan assumes. */
  maxLeadDays: number;
  /** Default budget split in basis points (1/100 of a percent). Sums to 10,000. */
  weights: Partial<Record<BudgetCategory, number>>;
  /**
   * Per-guest spend, in whole currency units, below which we call a budget
   * tight. A planning heuristic, not a market quote (see README assumptions).
   */
  perGuestFloor: Record<Currency, number>;
  /** Guest count above which we flag capacity and safety checks. */
  largeGathering: number;
}

export const PROFILES: Record<EventType, EventProfile> = {
  wedding: {
    label: "wedding",
    maxLeadDays: 330,
    weights: {
      venue: 2000,
      catering: 3000,
      decor: 1200,
      photography: 1000,
      attire: 900,
      entertainment: 600,
      stationery: 200,
      logistics: 300,
      contingency: 800,
    },
    perGuestFloor: { INR: 1500, USD: 60, EUR: 55, GBP: 50 },
    largeGathering: 400,
  },
  birthday: {
    label: "birthday party",
    maxLeadDays: 60,
    weights: {
      venue: 2000,
      catering: 3300,
      decor: 1300,
      entertainment: 1300,
      photography: 400,
      stationery: 300,
      logistics: 300,
      extras: 600,
      contingency: 500,
    },
    perGuestFloor: { INR: 500, USD: 20, EUR: 18, GBP: 17 },
    largeGathering: 80,
  },
  community: {
    label: "community event",
    maxLeadDays: 120,
    weights: {
      venue: 1500,
      catering: 3000,
      decor: 800,
      entertainment: 1500,
      photography: 200,
      stationery: 600,
      logistics: 1200,
      extras: 400,
      contingency: 800,
    },
    perGuestFloor: { INR: 150, USD: 6, EUR: 5, GBP: 5 },
    largeGathering: 500,
  },
};

export const CATEGORY_LABELS: Record<BudgetCategory, string> = {
  venue: "Venue",
  catering: "Food and drink",
  decor: "Decor and flowers",
  entertainment: "Entertainment",
  photography: "Photo and video",
  attire: "Attire and beauty",
  stationery: "Invitations and promotion",
  logistics: "Logistics and rentals",
  extras: "Extras and favours",
  contingency: "Contingency reserve",
};

export const DIETARY_LABELS: Record<DietaryNeed, string> = {
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  jain: "Jain",
  halal: "Halal",
  kosher: "Kosher",
  "gluten-free": "Gluten-free",
};
