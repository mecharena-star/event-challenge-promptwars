import type { BudgetCategory, Currency, EventType, Ideas } from "./schema";

export type Severity = "info" | "warning" | "critical";

export interface Advisory {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
}

export interface BudgetLine {
  category: BudgetCategory;
  /** Whole currency units. All lines sum exactly to the total. */
  amount: number;
  sharePct: number;
  /** Plain-language reasons this line differs from the default split. */
  notes: string[];
}

export type PerGuestStatus = "tight" | "balanced" | "comfortable";

export interface BudgetPlan {
  total: number;
  currency: Currency;
  perGuest: number;
  perGuestStatus: PerGuestStatus;
  cateringPerGuest: number;
  lines: BudgetLine[];
}

export interface Milestone {
  id: string;
  title: string;
  detail: string;
  /** ISO date (YYYY-MM-DD). */
  dueDate: string;
  critical: boolean;
  /** Due within two days of today. */
  urgent: boolean;
}

export interface TimelinePlan {
  daysAvailable: number;
  /** True when there is less lead time than the full planning horizon. */
  compressed: boolean;
  milestones: Milestone[];
}

export type VendorPriority = "essential" | "recommended" | "optional";

export interface VendorItem {
  id: string;
  name: string;
  category: BudgetCategory;
  priority: VendorPriority;
  /** ISO date; never earlier than today. */
  bookBy: string;
  questions: string[];
}

export interface Plan {
  summary: {
    eventType: EventType;
    title: string;
    eventDate: string;
    daysAvailable: number;
    guestCount: number;
  };
  budget: BudgetPlan;
  timeline: TimelinePlan;
  vendors: VendorItem[];
  advisories: Advisory[];
}

export type IdeasNotice = "not_configured" | "timeout" | "invalid_response" | "upstream_error";

export interface IdeasResult {
  source: "gemini" | "curated";
  ideas: Ideas;
  /** Why curated ideas were used instead of Gemini, when that happened. */
  notice?: IdeasNotice;
}
