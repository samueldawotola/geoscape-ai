import OpenAI from "openai";
import type { TripPlan } from "@/db/schema";

const openai = new OpenAI();

const MODEL = "gpt-5.4-mini";

type TravelerProfile = {
  displayName?: string | null;
  dateOfBirth?: string | null;
  nationality?: string | null;
  travelStyle?: string | null;
  fitness?: string | null;
  budget?: string | null;
  accessibility?: string | null;
  familyPets?: string | null;
  hasPassport?: boolean | null;
};

function ageFromDob(dob?: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

function buildPreferences(p: TravelerProfile): string {
  const lines: string[] = [];
  const age = ageFromDob(p.dateOfBirth);

  if (age !== null) lines.push(`Age: ${age}`);
  if (p.nationality) lines.push(`Nationality: ${p.nationality}`);
  if (p.travelStyle) lines.push(`Preferred style: ${p.travelStyle}`);
  if (p.fitness) lines.push(`Fitness level: ${p.fitness}`);
  if (p.budget) lines.push(`Budget: ${p.budget}`);
  if (p.accessibility) lines.push(`Accessibility needs: ${p.accessibility}`);
  if (p.familyPets) lines.push(`Traveling with: ${p.familyPets}`);
  if (p.hasPassport === true) lines.push("Has a valid passport.");
  if (p.hasPassport === false) lines.push("Has no passport — prefer domestic options or note one is needed.");

  return lines.join("\n");
}

// ---------- Lane A: schema for the "pure generation" sections ----------
const itinerarySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    destinationOverview: { type: "string" },
    itinerary: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          day: { type: "integer" },
          title: { type: "string" },
          morning: { type: "string" },
          afternoon: { type: "string" },
          evening: { type: "string" },
        },
        required: ["day", "title", "morning", "afternoon", "evening"],
      },
    },
    packingList: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          category: { type: "string" },
          items: { type: "array", items: { type: "string" } },
        },
        required: ["category", "items"],
      },
    },
    budgetBreakdown: {
      type: "object",
      additionalProperties: false,
      properties: {
        currency: { type: "string" },
        lodging: { type: "number" },
        food: { type: "number" },
        activities: { type: "number" },
        transport: { type: "number" },
        misc: { type: "number" },
        total: { type: "number" },
        notes: { type: "string" },
      },
      required: ["currency", "lodging", "food", "activities", "transport", "misc", "total", "notes"],
    },
    localTips: { type: "array", items: { type: "string" } },
  },
  required: ["destinationOverview", "itinerary", "packingList", "budgetBreakdown", "localTips"],
} as const;

type CoreSections = Omit<TripPlan, "groundedMarkdown">;

// ---------- Lane A call: structured, no tools ----------
async function generateCoreSections(destination: string, preferences: string): Promise<CoreSections> {
  const ctx = preferences
    ? `Destination: ${destination}\nTrip length: 5 days\n\nTraveler profile:\n${preferences}`
    : `Destination: ${destination}\nTrip length: 5 days`;

  const response = await openai.responses.create({
    model: MODEL,
    input: [
      {
        role: "system",
        content:
          "You are Geospace AI's travel planner. Tailor everything to the traveler's " +
          "profile. Budget numbers are realistic estimates for the destination in a " +
          "typical home currency (default USD if unclear). Be specific and practical.",
      },
      { role: "user", content: `Plan a trip using this profile:\n\n${ctx}` },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "itinerary",
        schema: itinerarySchema,
        strict: true,
      },
    },
  });

  return JSON.parse(response.output_text) as CoreSections;
}

// ---------- Lane B call: web-search grounded, keeps citations ----------
async function generateGroundedSections(destination: string, preferences: string): Promise<string> {
  const ctx = preferences
    ? `Destination: ${destination}\n\nTraveler profile:\n${preferences}`
    : `Destination: ${destination}`;

  const response = await openai.responses.create({
    model: MODEL,
    tools: [{ type: "web_search" }],
    input: [
      {
        role: "system",
        content:
          "You research current, factual travel info. NEVER invent safety statistics or " +
          "advisories — search and cite official sources (e.g. State Dept travel advisories) " +
          "for anything about crime, disasters, or discrimination. If data is unavailable, " +
          "say so rather than guessing.",
      },
      {
        role: "user",
        content:
          `For this trip, produce three sections with markdown headings:\n` +
          `## Risk Factors (crime, travel safety, discrimination risk, natural disasters)\n` +
          `## Online Content (region-specific creators, guides, communities worth checking)\n` +
          `## Housing Plan (hotel vs Airbnb vs hostel — recommend based on the profile)\n\n${ctx}`,
      },
    ],
  });

  return response.output_text;
}

export async function generateTripContent(
  destination: string,
  profile: TravelerProfile = {}
): Promise<{ summary: string; data: TripPlan }> {
  const preferences = buildPreferences(profile);

  const [core, groundedMarkdown] = await Promise.all([
    generateCoreSections(destination, preferences),
    generateGroundedSections(destination, preferences),
  ]);

  return {
    summary: core.destinationOverview,
    data: { ...core, groundedMarkdown },
  };
}
