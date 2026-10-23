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
      {
        name: "Golden hour garden",
        description: "Warm light, seasonal flowers and long shared tables with a relaxed, outdoor feel.",
        whyItFits: "Works for outdoor and open venues and keeps decor costs modest.",
      },
      {
        name: "Heritage and family",
        description: "Fabrics, music and dishes from both families woven through the day.",
        whyItFits: "Puts personal meaning ahead of spend.",
      },
      {
        name: "Modern minimal",
        description: "A neutral palette, strong lighting and one statement installation.",
        whyItFits: "Fewer decor items, so the budget goes further.",
      },
      {
        name: "Monsoon romance",
        description: "Deep greens, canopies and lanterns that make the most of a rainy-season date.",
        whyItFits: "Turns a weather risk into the theme.",
      },
      {
        name: "Music and mehendi",
        description: "An evening built around live music, henna artists and family dancing.",
        whyItFits: "Gives a long guest list something to do.",
      },
      {
        name: "Vintage postcard",
        description: "Travel-postcard stationery, brass details and a photo corner from the couple's story.",
        whyItFits: "Personal without needing a large decor budget.",
      },
    ],
    menuIdeas: [
      "Regional thali-style sharing platters",
      "A live station for one signature dish",
      "Seasonal desserts instead of a long dessert table",
      "A late-night snack counter for dancers",
    ],
    activities: [
      "A welcome moment with a handwritten note from each family",
      "A memory wall with photos of both families",
      "A quiet corner for elders with seating and tea",
      "A surprise performance from friends",
    ],
    decorTips: [
      "Reuse ceremony flowers at the reception",
      "Spend on lighting rather than many small props",
      "Choose seasonal local flowers",
    ],
    savingTips: [
      "Choose a weekday or an off-peak month",
      "Use a smaller guest list for the dinner than for the ceremony",
      "Print fewer cards and send digital invitations",
    ],
  },
  birthday: {
    themes: [
      {
        name: "Favourite things",
        description: "Build the day around the guest of honour's current favourite hobby or story.",
        whyItFits: "Easy to personalise at any budget.",
      },
      {
        name: "Backyard carnival",
        description: "Simple games, a snack stand and bunting.",
        whyItFits: "Fun for mixed ages with low setup cost.",
      },
      {
        name: "Colour burst",
        description: "Two bold colours across balloons, tableware and cake.",
        whyItFits: "A cohesive look from inexpensive items.",
      },
      {
        name: "Little explorers",
        description: "Maps, compasses and a treasure hunt that sends guests around the venue.",
        whyItFits: "Keeps children busy with almost no equipment.",
      },
      {
        name: "Bake-off party",
        description: "Guests decorate their own cupcakes and vote on the best one.",
        whyItFits: "The activity doubles as the dessert.",
      },
      {
        name: "Movie under the stars",
        description: "A projector, blankets and a short film with popcorn and snacks.",
        whyItFits: "Easy to run at home with a small group.",
      },
    ],
    menuIdeas: [
      "Build-your-own wraps or sliders",
      "A fruit and dip platter next to the cake",
      "Mini portions so guests can try everything",
      "One hot drink and one cold drink, both with a non-sugary option",
    ],
    activities: [
      "A treasure hunt with clues around the venue",
      "A photo booth with simple props",
      "Team games with small prizes",
      "A short video of messages from friends",
    ],
    decorTips: [
      "Use balloon garlands in two colours",
      "Print one large banner instead of many small signs",
      "Light with fairy lights, not extra decor",
    ],
    savingTips: [
      "Host in the morning or afternoon, when menus cost less",
      "Bake or order one large cake rather than many",
      "Use paper plates and compostable cutlery to cut cleanup",
    ],
  },
  community: {
    themes: [
      {
        name: "Neighbours' fair",
        description: "Stalls, music and games run by local groups.",
        whyItFits: "Spreads cost and effort across the community.",
      },
      {
        name: "Lantern evening",
        description: "A dusk gathering lit by handmade lanterns and a shared meal.",
        whyItFits: "Low-cost decor with a memorable moment.",
      },
      {
        name: "Story and song night",
        description: "Open stage for elders, children and local performers.",
        whyItFits: "Inclusive, and needs little equipment.",
      },
      {
        name: "Clean-up and cook-out",
        description: "A morning neighbourhood clean-up followed by a shared meal.",
        whyItFits: "Gives volunteers a purpose and a reward.",
      },
      {
        name: "Traditional games day",
        description: "Kabaddi, kho-kho, carrom and board-game tables for every age.",
        whyItFits: "Familiar games need little explanation or cost.",
      },
      {
        name: "Skills showcase",
        description: "Local craftspeople and cooks demonstrate their work and take orders.",
        whyItFits: "Supports local livelihoods and fills the schedule.",
      },
    ],
    menuIdeas: [
      "A potluck with a label for common allergens",
      "Two or three local food stalls with set prices",
      "Free water and tea points for everyone",
      "A bake sale to fund the next event",
    ],
    activities: [
      "A children's craft corner with volunteers",
      "A seating area for elders near the stage",
      "A skills swap table",
      "A group photo at the end",
    ],
    decorTips: [
      "Ask local schools for banners and art",
      "Use clear signs with large print and icons",
      "Mark quiet and accessible areas on a map",
    ],
    savingTips: [
      "Borrow chairs and tables from local groups",
      "Ask local businesses for in-kind sponsorship",
      "Recruit volunteers early to avoid paid staff",
    ],
  },
};

export function curatedIdeas(brief: EventBrief, status: PerGuestStatus, avoidThemes: readonly string[] = []): Ideas {
  const base = BANK[brief.eventType];
  // Offer themes the user has not seen yet; once they have seen them all, start the cycle again.
  const unseen = base.themes.filter((theme) => !avoidThemes.includes(theme.name));
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
    themes: (unseen.length >= 2 ? unseen : base.themes).slice(0, 3),
    menuIdeas: menu.slice(0, 5),
    activities: activities.slice(0, 5),
    decorTips: decor.slice(0, 4),
    savingTips: saving,
  };
}
