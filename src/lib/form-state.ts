import { addDays, checkEventDate, epochDay } from "@/domain/dates";
import { fieldErrors } from "@/domain/field-errors";
import {
  briefSchema,
  type Currency,
  type DietaryNeed,
  type EventBrief,
  type EventType,
  type PriorityCategory,
  type VenueType,
} from "@/domain/schema";

/** Everything the form holds as the user typed it: strings for text and number inputs. */
export interface FormState {
  eventType: EventType | "";
  title: string;
  eventDate: string;
  guestCount: string;
  budget: string;
  currency: Currency;
  location: string;
  venueType: VenueType;
  priorities: PriorityCategory[];
  dietary: DietaryNeed[];
  hasChildren: boolean;
  needsAccessibility: boolean;
  notes: string;
}

export type FormErrors = Record<string, string>;

export const INITIAL_FORM: FormState = {
  eventType: "",
  title: "",
  eventDate: "",
  guestCount: "",
  budget: "",
  currency: "INR",
  location: "",
  venueType: "undecided",
  priorities: [],
  dietary: [],
  hasChildren: false,
  needsAccessibility: false,
  notes: "",
};

/** The user's local calendar date as YYYY-MM-DD. */
export function localTodayIso(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function parseNumber(text: string): number | undefined {
  const cleaned = text.replace(/[,\s_]/g, "");
  return cleaned === "" ? undefined : Number(cleaned);
}

export function toBriefInput(state: FormState): Record<string, unknown> {
  return {
    eventType: state.eventType || undefined,
    title: state.title,
    eventDate: state.eventDate,
    guestCount: parseNumber(state.guestCount),
    budget: parseNumber(state.budget),
    currency: state.currency,
    location: state.location,
    venueType: state.venueType,
    priorities: state.priorities,
    dietary: state.dietary,
    hasChildren: state.hasChildren,
    needsAccessibility: state.needsAccessibility,
    notes: state.notes,
  };
}

/** Same schema as the server, so the browser and the API can never disagree about validity. */
export function validateForm(state: FormState, todayIso: string): { brief: EventBrief } | { errors: FormErrors } {
  const parsed = briefSchema.safeParse(toBriefInput(state));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const dateProblem = checkEventDate(parsed.data.eventDate, epochDay(todayIso));
  if (dateProblem) return { errors: { eventDate: dateProblem } };
  return { brief: parsed.data };
}

/** One-click examples, each chosen to show a different planning decision. */
export function sampleForm(type: EventType, todayIso: string): FormState {
  const at = (days: number) => addDays(todayIso, days);
  switch (type) {
    case "wedding":
      return { ...INITIAL_FORM, eventType: "wedding", title: "Asha and Ravi's wedding", eventDate: at(200), guestCount: "250", budget: "1800000", currency: "INR", location: "Hyderabad", venueType: "outdoor", priorities: ["catering", "photography"], dietary: ["vegetarian", "jain"], needsAccessibility: true, notes: "Both families love classic Telugu film songs and want a relaxed evening reception." };
    case "birthday":
      return { ...INITIAL_FORM, eventType: "birthday", title: "Mira's 7th birthday", eventDate: at(12), guestCount: "30", budget: "25000", currency: "INR", location: "Ongole", venueType: "home", priorities: ["entertainment"], hasChildren: true, notes: "She loves space and astronauts." };
    case "community":
      return { ...INITIAL_FORM, eventType: "community", title: "Ward 12 harvest fair", eventDate: at(80), guestCount: "400", budget: "150000", currency: "INR", location: "Guntur", venueType: "outdoor", priorities: ["logistics"], hasChildren: true, needsAccessibility: true, dietary: ["vegetarian"], notes: "Local self-help groups will run food and craft stalls." };
  }
}
