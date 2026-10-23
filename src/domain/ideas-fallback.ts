import type { EventBrief, EventType, Ideas } from "./schema";
import type { PerGuestStatus } from "./types";

/**
 * Curated ideas used when Gemini is not configured or fails. The app is
 * therefore complete and useful offline; Gemini only makes ideas more
 * personal. Selection is deterministic and depends on the brief.
 */
const BANK: Record<EventType, Ideas> = {
  wedding: {
    themes: [
      { name: "Golden hour garden", description: "Warm light, seasonal flowers and long shared tables with a relaxed, outdoor feel.", whyItFits: "Works for outdoor and open venues and keeps decor costs modest." },
      { name: "Heritage and family", description: "Fabrics, music and dishes from both families woven through the day.", whyItFits: "Puts personal meaning ahead of spend." },
      { name: "Modern minimal", description: "A neutral palette, strong lighting and one statement installation.", whyItFits: "Fewer decor items, so the budget goes further." },
    ],
    menuIdeas: ["Regional thali-style sharing platters", "A live station for one signature dish", "Seasonal desserts instead of a long dessert table", "A late-night snack counter for dancers"],
    activities: ["A welcome moment with a handwritten note from each family", "A memory wall with photos of both families", "A quiet corner for elders with seating and tea", "A surprise performance from friends"],
    decorTips: ["Reuse ceremony flowers at the reception", "Spend on lighting rather than many small props", "Choose seasonal local flowers"],
    savingTips: ["Choose a weekday or an off-peak month", "Use a smaller guest list for the dinner than for the ceremony", "Print fewer cards and send digital invitations"],
  },
  birthday: {
    themes: [
      { name: "Favourite things", description: "Build the day around the guest of honour's current favourite hobby or story.", whyItFits: "Easy to personalise at any budget." },
      { name: "Backyard carnival", description: "Simple games, a snack stand and bunting.", whyItFits: "Fun for mixed ages with low setup cost." },
      { name: "Colour burst", description: "Two bold colours across balloons, tableware and cake.", whyItFits: "A cohesive look from inexpensive items." },
    ],
    menuIdeas: ["Build-your-own wraps or sliders", "A fruit and dip platter next to the cake", "Mini portions so guests can try everything", "One hot drink and one cold drink, both with a non-sugary option"],
    activities: ["A treasure hunt with clues around the venue", "A photo booth with simple props", "Team games with small prizes", "A short video of messages from friends"],
    decorTips: ["Use balloon garlands in two colours", "Print one large banner instead of many small signs", "Light with fairy lights, not extra decor"],
    savingTips: ["Host in the morning or afternoon, when menus cost less", "Bake or order one large cake rather than many", "Use paper plates and compostable cutlery to cut cleanup"],
  },
  community: {
    themes: [
      { name: "Neighbours' fair", description: "Stalls, music and games run by local groups.", whyItFits: "Spreads cost and effort across the community." },
      { name: "Lantern evening", description: "A dusk gathering lit by handmade lanterns and a shared meal.", whyItFits: "Low-cost decor with a memorable moment." },
      { name: "Story and song night", description: "Open stage for elders, children and local performers.", whyItFits: "Inclusive, and needs little equipment." },
    ],
    menuIdeas: ["A potluck with a label for common allergens", "Two or three local food stalls with set prices", "Free water and tea points for everyone", "A bake sale to fund the next event"],
    activities: ["A children's craft corner with volunteers", "A seating area for elders near the stage", "A skills swap table", "A group photo at the end"],
    decorTips: ["Ask local schools for banners and art", "Use clear signs with large print and icons", "Mark quiet and accessible areas on a map"],
    savingTips: ["Borrow chairs and tables from local groups", "Ask local businesses for in-kind sponsorship", "Recruit volunteers early to avoid paid staff"],
  },
};

export function curatedIdeas(brief: EventBrief, status: PerGuestStatus): Ideas {
  const base = BANK[brief.eventType];
  const activities = [...base.activities];
  if (brief.hasChildren && brief.eventType !== "birthday") {
    activities.unshift("A supervised children's corner with simple crafts");
  }
  const menu = [...base.menuIdeas];
  if (brief.dietary.length > 0) {
    menu.unshift(`A clearly labelled ${brief.dietary.join(", ")} option at every food station`);
  }
  const decor = [...base.decorTips];
  if (brief.venueType === "outdoor") decor.unshift("Use lanterns and string lights, and have a rain-safe backup");
  const saving = status === "tight" ? [...base.savingTips] : base.savingTips.slice(0, 2);

  return {
    themes: base.themes.slice(0, 3),
    menuIdeas: menu.slice(0, 5),
    activities: activities.slice(0, 5),
    decorTips: decor.slice(0, 4),
    savingTips: saving,
  };
}
