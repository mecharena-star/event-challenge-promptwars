import { isoFromEpochDay } from "./dates";
import { DIETARY_LABELS } from "./profiles";
import type { BudgetCategory, EventBrief, EventType } from "./schema";
import type { VendorItem, VendorPriority } from "./types";

interface Template {
  id: string;
  name: string;
  category: BudgetCategory;
  priority: VendorPriority;
  leadDays: number;
  questions: string[];
}

const COMMON_QUESTIONS = {
  contract: "What is covered in writing, and what is the cancellation and refund policy?",
  deposit: "How much deposit is needed, and when is the balance due?",
};

const BY_TYPE: Record<EventType, Template[]> = {
  wedding: [
    {
      id: "venue",
      name: "Venue",
      category: "venue",
      priority: "essential",
      leadDays: 300,
      questions: [
        "Is the price inclusive of setup hours, power and cleaning?",
        "What is the capacity for seating and for standing?",
        COMMON_QUESTIONS.contract,
      ],
    },
    {
      id: "caterer",
      name: "Caterer",
      category: "catering",
      priority: "essential",
      leadDays: 270,
      questions: [
        "What is the per-plate price at our guest count?",
        "Can we hold a tasting before signing?",
        COMMON_QUESTIONS.deposit,
      ],
    },
    {
      id: "ceremony",
      name: "Officiant or ceremony lead",
      category: "extras",
      priority: "essential",
      leadDays: 300,
      questions: ["Which dates and times are available?", "What do you need us to arrange for the ceremony?"],
    },
    {
      id: "photo",
      name: "Photographer and videographer",
      category: "photography",
      priority: "recommended",
      leadDays: 240,
      questions: ["Can we see two complete albums?", "When will we receive the final files?"],
    },
    {
      id: "attire",
      name: "Attire and beauty",
      category: "attire",
      priority: "recommended",
      leadDays: 180,
      questions: ["How many fittings are included?", "What happens if alterations run late?"],
    },
    {
      id: "music",
      name: "DJ, band or performers",
      category: "entertainment",
      priority: "recommended",
      leadDays: 150,
      questions: ["What equipment do you bring?", "Can you follow our must-play and do-not-play lists?"],
    },
    {
      id: "decor",
      name: "Decorator and florist",
      category: "decor",
      priority: "recommended",
      leadDays: 120,
      questions: ["What is the setup and teardown time?", "Which flowers are in season for our date?"],
    },
    {
      id: "print",
      name: "Invitations and stationery",
      category: "stationery",
      priority: "recommended",
      leadDays: 100,
      questions: ["What is the turnaround after proof approval?"],
    },
    {
      id: "transport",
      name: "Guest transport",
      category: "logistics",
      priority: "optional",
      leadDays: 45,
      questions: ["Can you provide a shuttle between stay and venue?"],
    },
  ],
  birthday: [
    {
      id: "venue",
      name: "Venue",
      category: "venue",
      priority: "essential",
      leadDays: 50,
      questions: ["Do the hire hours include setup and cleanup?", COMMON_QUESTIONS.contract],
    },
    {
      id: "cake",
      name: "Caterer and baker",
      category: "catering",
      priority: "essential",
      leadDays: 35,
      questions: ["Can you label allergens clearly?", "Is delivery and setup included?"],
    },
    {
      id: "entertainer",
      name: "Entertainer or activity host",
      category: "entertainment",
      priority: "recommended",
      leadDays: 30,
      questions: ["Which age range do you work best with?", "Do you bring your own equipment?"],
    },
    {
      id: "decor",
      name: "Decor and balloons",
      category: "decor",
      priority: "recommended",
      leadDays: 21,
      questions: ["What is the delivery window?"],
    },
    {
      id: "photo",
      name: "Photographer",
      category: "photography",
      priority: "optional",
      leadDays: 21,
      questions: ["Is a two-hour package available?"],
    },
    {
      id: "print",
      name: "Invitations",
      category: "stationery",
      priority: "optional",
      leadDays: 28,
      questions: ["Do you offer digital invitations?"],
    },
  ],
  community: [
    {
      id: "venue",
      name: "Venue or open space",
      category: "venue",
      priority: "essential",
      leadDays: 105,
      questions: ["What is the maximum capacity?", "Are there noise or finish-time limits?", COMMON_QUESTIONS.contract],
    },
    {
      id: "permit",
      name: "Permission from local authority",
      category: "logistics",
      priority: "essential",
      leadDays: 105,
      questions: ["Which permissions apply to this kind of gathering?", "How long do approvals usually take?"],
    },
    {
      id: "safety",
      name: "First aid and safety cover",
      category: "logistics",
      priority: "essential",
      leadDays: 60,
      questions: ["How many trained first-aiders are advised for our numbers?"],
    },
    {
      id: "av",
      name: "Sound and stage",
      category: "entertainment",
      priority: "essential",
      leadDays: 40,
      questions: ["Is backup power included?", "Who operates the sound on the day?"],
    },
    {
      id: "food",
      name: "Caterer or food stalls",
      category: "catering",
      priority: "essential",
      leadDays: 60,
      questions: ["Do you hold a current hygiene licence?", "Can stalls label common allergens?"],
    },
    {
      id: "rental",
      name: "Tables, chairs and signage",
      category: "logistics",
      priority: "recommended",
      leadDays: 40,
      questions: ["What is the delivery and collection window?"],
    },
    {
      id: "promo",
      name: "Printing and promotion",
      category: "stationery",
      priority: "recommended",
      leadDays: 45,
      questions: ["Can you print accessible large-format posters?"],
    },
    {
      id: "perform",
      name: "Performers or speakers",
      category: "entertainment",
      priority: "recommended",
      leadDays: 40,
      questions: ["What set length and technical needs do you have?"],
    },
    {
      id: "volunteer-kit",
      name: "Volunteer kit and wayfinding",
      category: "extras",
      priority: "optional",
      leadDays: 21,
      questions: ["Can badges and bibs be ready a week early?"],
    },
  ],
};

function adapt(brief: EventBrief, templates: Template[]): Template[] {
  let items = templates.map((t) => ({ ...t, questions: [...t.questions] }));
  const find = (id: string) => items.find((t) => t.id === id);

  if (brief.venueType === "home") {
    items = items.filter((t) => t.id !== "venue");
    items.push({
      id: "rental",
      name: "Furniture and equipment rental",
      category: "logistics",
      priority: "recommended",
      leadDays: 30,
      questions: ["What is the delivery, setup and pick-up window?", "What damage terms apply?"],
    });
  }
  if (brief.venueType === "outdoor") {
    items.push({
      id: "shelter",
      name: "Tent or shelter rental",
      category: "logistics",
      priority: "essential",
      leadDays: 30,
      questions: ["Is it rated for wind and rain?", "Is flooring and lighting included?"],
    });
  }
  if (brief.hasChildren && brief.eventType !== "birthday") {
    items.push({
      id: "kids",
      name: "Children's corner and supervisor",
      category: "entertainment",
      priority: "recommended",
      leadDays: 30,
      questions: ["What ratio of supervisors to children do you provide?"],
    });
  }
  if (brief.dietary.length > 0) {
    const needs = brief.dietary.map((d) => DIETARY_LABELS[d].toLowerCase()).join(", ");
    find("caterer")?.questions.unshift(
      `Can you prepare ${needs} meals separately, and how do you avoid cross-contact?`,
    );
    find("cake")?.questions.unshift(`Can you meet ${needs} needs and label ingredients?`);
    find("food")?.questions.unshift(`Which stalls can serve ${needs} options?`);
  }
  if (brief.needsAccessibility) {
    find("venue")?.questions.unshift("Is there a step-free entrance, accessible restroom and reserved seating?");
  }
  return items;
}

const PRIORITY_ORDER: Record<VendorPriority, number> = { essential: 0, recommended: 1, optional: 2 };

export function buildVendorChecklist(brief: EventBrief, eventDay: number, daysAvailable: number): VendorItem[] {
  return adapt(brief, BY_TYPE[brief.eventType])
    .map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      priority: t.priority,
      bookBy: isoFromEpochDay(eventDay - Math.min(t.leadDays, daysAvailable)),
      questions: t.questions,
    }))
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.bookBy.localeCompare(b.bookBy));
}
