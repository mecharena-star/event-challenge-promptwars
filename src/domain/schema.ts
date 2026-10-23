import { z } from "zod";

export const EVENT_TYPES = ["wedding", "birthday", "community"] as const;
export const CURRENCIES = ["INR", "USD", "EUR", "GBP"] as const;
export const VENUE_TYPES = ["indoor", "outdoor", "home", "undecided"] as const;
export const BUDGET_CATEGORIES = [
  "venue",
  "catering",
  "decor",
  "entertainment",
  "photography",
  "attire",
  "stationery",
  "logistics",
  "extras",
  "contingency",
] as const;
export const DIETARY_NEEDS = ["vegetarian", "vegan", "jain", "halal", "kosher", "gluten-free"] as const;

export type EventType = (typeof EVENT_TYPES)[number];
export type Currency = (typeof CURRENCIES)[number];
export type VenueType = (typeof VENUE_TYPES)[number];
export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number];
export type DietaryNeed = (typeof DIETARY_NEEDS)[number];
export type PriorityCategory = Exclude<BudgetCategory, "contingency">;

/** Categories a user may mark as a priority. The contingency reserve is never a priority. */
export const PRIORITY_CATEGORIES = BUDGET_CATEGORIES.filter((c): c is PriorityCategory => c !== "contingency");

/** Hard limits live here once, so the form, the API and the tests can never drift apart. */
export const LIMITS = {
  guests: { min: 2, max: 2000 },
  budget: { min: 1, max: 1_000_000_000 },
  title: 80,
  location: 80,
  notes: 400,
  maxPriorities: 3,
} as const;

const uniqueList = <T extends z.ZodType>(item: T, max: number) =>
  z
    .array(item)
    .max(max, `Choose at most ${max}`)
    .refine((list) => new Set(list).size === list.length, "Remove duplicate choices");

export const briefSchema = z.strictObject({
  eventType: z.enum(EVENT_TYPES, { error: "Choose an event type" }),
  title: z.string().trim().max(LIMITS.title, `Use ${LIMITS.title} characters or fewer`).default(""),
  eventDate: z.iso.date({ error: "Enter a valid date" }),
  guestCount: z
    .number({ error: "Enter the number of guests" })
    .int("Use a whole number")
    .min(LIMITS.guests.min, `At least ${LIMITS.guests.min} guests`)
    .max(LIMITS.guests.max, `At most ${LIMITS.guests.max} guests`),
  budget: z
    .number({ error: "Enter your total budget" })
    .int("Use a whole number")
    .min(LIMITS.budget.min, "Budget must be above zero")
    .max(LIMITS.budget.max, "Budget is too large"),
  currency: z.enum(CURRENCIES, { error: "Choose a currency" }),
  location: z.string().trim().max(LIMITS.location, `Use ${LIMITS.location} characters or fewer`).default(""),
  venueType: z.enum(VENUE_TYPES).default("undecided"),
  priorities: uniqueList(z.enum(PRIORITY_CATEGORIES), LIMITS.maxPriorities).default([]),
  dietary: uniqueList(z.enum(DIETARY_NEEDS), DIETARY_NEEDS.length).default([]),
  hasChildren: z.boolean().default(false),
  needsAccessibility: z.boolean().default(false),
  notes: z.string().trim().max(LIMITS.notes, `Use ${LIMITS.notes} characters or fewer`).default(""),
});

export type EventBrief = z.output<typeof briefSchema>;
export type EventBriefInput = z.input<typeof briefSchema>;

/** Length caps for model-written text. Also quoted to the model in its instructions. */
export const IDEA_LIMITS = { name: 60, description: 220, whyItFits: 160, item: 140 } as const;

/** Model output is rendered as plain text, but we still refuse anything that looks like markup. */
const noMarkup = (text: string) => !/[<>]/.test(text) && !/javascript:/i.test(text);
const idea = (max: number) => z.string().trim().min(2).max(max).refine(noMarkup, "Markup is not allowed");

/**
 * Shape of the AI-written ideas. The same schema constrains Gemini's output
 * (via responseJsonSchema) and validates it on return, so a malformed or
 * oversized model reply can never reach the UI.
 */
export const ideasSchema = z.object({
  themes: z
    .array(
      z.object({
        name: idea(IDEA_LIMITS.name),
        description: idea(IDEA_LIMITS.description),
        whyItFits: idea(IDEA_LIMITS.whyItFits),
      }),
    )
    .min(2)
    .max(3),
  menuIdeas: z.array(idea(IDEA_LIMITS.item)).min(3).max(5),
  activities: z.array(idea(IDEA_LIMITS.item)).min(3).max(5),
  decorTips: z.array(idea(IDEA_LIMITS.item)).min(2).max(4),
  savingTips: z.array(idea(IDEA_LIMITS.item)).min(2).max(4),
});
export type Ideas = z.infer<typeof ideasSchema>;

/** The ideas endpoint takes the brief plus the themes the user has already seen, so "show different ideas" works. */
export const ideasRequestSchema = briefSchema.extend({
  avoidThemes: z.array(z.string().trim().min(1).max(IDEA_LIMITS.name)).max(6).default([]),
});
export type IdeasRequest = z.output<typeof ideasRequestSchema>;
