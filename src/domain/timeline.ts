import { isoFromEpochDay } from "./dates";
import { PROFILES } from "./profiles";
import type { EventBrief, EventType } from "./schema";
import type { Milestone, TimelinePlan } from "./types";

interface Template {
  id: string;
  title: string;
  detail: string;
  /** Days before the event when a calm, fully staged plan would do this. */
  daysBefore: number;
  critical?: boolean;
}

/** Tasks due this close to the event are never stretched or squeezed. */
const FINAL_WINDOW_DAYS = 14;
const URGENT_WITHIN_DAYS = 2;

const TEMPLATES: Record<EventType, Template[]> = {
  wedding: [
    { id: "budget", title: "Agree the budget and a first guest list", detail: "Decide who contributes what and draft the guest list; both drive every later choice.", daysBefore: 330, critical: true },
    { id: "venue", title: "Shortlist and book the venue", detail: "Visit at the same time of day as the event and get dates, capacity and costs in writing.", daysBefore: 300, critical: true },
    { id: "caterer", title: "Book the caterer after a tasting", detail: "Share dietary needs before the tasting and agree a per-plate price.", daysBefore: 270, critical: true },
    { id: "photo", title: "Book photographer and videographer", detail: "Good ones book out first. Review full albums, not highlight reels.", daysBefore: 240 },
    { id: "attire", title: "Choose attire and book fittings", detail: "Allow time for alterations and a second fitting.", daysBefore: 180 },
    { id: "music", title: "Book music, DJ or performers", detail: "Agree a playlist, must-play and do-not-play lists, and sound requirements.", daysBefore: 150 },
    { id: "invite-design", title: "Finalise invitation design", detail: "Proof the wording, dates and venue details twice before printing.", daysBefore: 120 },
    { id: "invite-send", title: "Send invitations", detail: "Ask for RSVPs by a clear date and say how to reply.", daysBefore: 75, critical: true },
    { id: "decor", title: "Confirm decor, flowers and lighting", detail: "Agree the setup and teardown windows with the venue.", daysBefore: 60 },
    { id: "travel", title: "Arrange guest transport and stays", detail: "Reserve room blocks and plan pick-ups for elders and out-of-town guests.", daysBefore: 45 },
    { id: "rsvp", title: "Close RSVPs and fix the final headcount", detail: "Chase late replies personally. Caterers bill from this number.", daysBefore: 21, critical: true },
    { id: "seating", title: "Lock the menu and seating plan", detail: "Seat elders near exits and restrooms.", daysBefore: 14 },
    { id: "runofshow", title: "Share a run-of-show with every vendor", detail: "One page: timings, contacts and who decides what on the day.", daysBefore: 7, critical: true },
    { id: "payments", title: "Settle final payments and prepare tips", detail: "Put balances and tips in labelled envelopes for a trusted person to hand over.", daysBefore: 3 },
    { id: "day", title: "Event day: check in with each vendor", detail: "Confirm arrival two hours before start and keep a printed contact list.", daysBefore: 0, critical: true },
  ],
  birthday: [
    { id: "plan", title: "Set the budget, theme and guest list", detail: "Ask the guest of honour what would make the day feel special.", daysBefore: 60, critical: true },
    { id: "venue", title: "Book the venue", detail: "Check hire hours include setup and cleanup.", daysBefore: 50, critical: true },
    { id: "cake", title: "Order the cake and food", detail: "Confirm allergies and dietary needs before ordering.", daysBefore: 35 },
    { id: "entertainer", title: "Book an entertainer or plan activities", detail: "Match the activity to the age range of most guests.", daysBefore: 30 },
    { id: "invite", title: "Send invitations", detail: "Include start and end time, address and an RSVP date.", daysBefore: 28, critical: true },
    { id: "decor", title: "Order decor and party favours", detail: "Order early, since delivery delays are common.", daysBefore: 21 },
    { id: "rsvp", title: "Close RSVPs and fix numbers", detail: "Confirm the final count with the caterer or baker.", daysBefore: 10, critical: true },
    { id: "confirm", title: "Confirm every booking", detail: "A quick call or message to each vendor avoids day-of surprises.", daysBefore: 5 },
    { id: "day", title: "Event day: set up two hours early", detail: "Keep a small kit: tape, scissors, bin bags, spare batteries.", daysBefore: 0, critical: true },
  ],
  community: [
    { id: "purpose", title: "Agree purpose, budget and a planning committee", detail: "Name one decision-maker and a treasurer; write the goal in a single sentence.", daysBefore: 120, critical: true },
    { id: "permit", title: "Secure the space and any permissions", detail: "Public gatherings often need local permission. Ask early, since approvals can take weeks.", daysBefore: 105, critical: true },
    { id: "safety", title: "Plan safety, first aid and insurance", detail: "Cover crowd flow, first aid, lost-child procedure and any insurance the venue requires.", daysBefore: 90, critical: true },
    { id: "volunteers", title: "Recruit volunteers and assign roles", detail: "Give each role a lead and a backup.", daysBefore: 75 },
    { id: "food", title: "Book caterers or food stalls", detail: "Check hygiene licences and dietary labelling.", daysBefore: 60 },
    { id: "promote", title: "Launch promotion", detail: "Use notice boards, group chats and local organisations; include accessibility details.", daysBefore: 45, critical: true },
    { id: "av", title: "Book sound, stage and performers", detail: "Agree set lengths and a hard finish time.", daysBefore: 40 },
    { id: "briefing", title: "Brief volunteers and publish the roster", detail: "Share the map, radio or phone channel and escalation contacts.", daysBefore: 14 },
    { id: "numbers", title: "Confirm expected numbers", detail: "Adjust food, seating and toilets to the realistic turnout.", daysBefore: 10, critical: true },
    { id: "runofshow", title: "Finalise run-of-show and wet-weather plan", detail: "Print the schedule and decision points for every lead.", daysBefore: 5, critical: true },
    { id: "day", title: "Event day: early briefing and site walk", detail: "Walk the site for hazards before opening.", daysBefore: 0, critical: true },
  ],
};

function conditionalTemplates(brief: EventBrief): Template[] {
  const extra: Template[] = [];
  if (brief.dietary.length > 0) {
    extra.push({ id: "dietary", title: "Send dietary needs to the caterer", detail: "Share exact counts per need and ask how food is kept separate.", daysBefore: 28 });
  }
  if (brief.needsAccessibility) {
    extra.push({ id: "access", title: "Confirm step-free access, seating and restrooms", detail: "Walk the route from entrance to seating to restrooms, or ask the venue for a floor plan.", daysBefore: 21 });
  }
  if (brief.venueType === "outdoor") {
    extra.push({ id: "weather", title: "Confirm a weather plan with a decision time", detail: "Agree the fallback (tent or indoor space) and the hour you will choose it.", daysBefore: 14, critical: true });
  }
  return extra;
}

/**
 * Maps a template's ideal lead time onto the time actually left.
 * Long-lead tasks are compressed proportionally into the remaining window;
 * final-window tasks keep their position relative to the event. Nothing is
 * ever scheduled in the past.
 */
export function scaleLead(daysBefore: number, daysAvailable: number, maxLeadDays: number): number {
  if (daysAvailable >= maxLeadDays) return daysBefore;
  if (daysBefore <= FINAL_WINDOW_DAYS) return Math.min(daysBefore, daysAvailable);
  const room = Math.max(0, daysAvailable - FINAL_WINDOW_DAYS);
  const ratio = room / (maxLeadDays - FINAL_WINDOW_DAYS);
  const scaled = FINAL_WINDOW_DAYS + Math.floor((daysBefore - FINAL_WINDOW_DAYS) * ratio);
  return Math.min(scaled, daysAvailable);
}

export function buildTimeline(brief: EventBrief, eventDay: number, daysAvailable: number): TimelinePlan {
  const maxLead = PROFILES[brief.eventType].maxLeadDays;
  const milestones: Milestone[] = [...TEMPLATES[brief.eventType], ...conditionalTemplates(brief)]
    .map((t) => {
      const lead = scaleLead(t.daysBefore, daysAvailable, maxLead);
      return {
        id: t.id,
        title: t.title,
        detail: t.detail,
        dueDate: isoFromEpochDay(eventDay - lead),
        critical: t.critical ?? false,
        urgent: daysAvailable - lead <= URGENT_WITHIN_DAYS && lead > 0,
        sortKey: lead,
      };
    })
    .sort((a, b) => b.sortKey - a.sortKey || Number(b.critical) - Number(a.critical))
    .map(({ sortKey: _sortKey, ...milestone }) => milestone);

  return { daysAvailable, compressed: daysAvailable < maxLead, milestones };
}
