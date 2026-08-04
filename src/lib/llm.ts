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

// ---------- Lane B: schema for the researched sections ----------
const groundedSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    riskFactors: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          label: { type: "string" },
          body: { type: "string" },
          // Bare URL, or empty string when the point needs no citation.
          sourceUrl: { type: "string" },
          sourceName: { type: "string" },
        },
        required: ["label", "body", "sourceUrl", "sourceName"],
      },
    },
    onlineContent: {
      type: "object",
      additionalProperties: false,
      properties: {
        officialSources: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              url: { type: "string" },
              note: { type: "string" },
            },
            required: ["name", "url", "note"],
          },
        },
        communitySources: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              url: { type: "string" },
              note: { type: "string" },
            },
            required: ["name", "url", "note"],
          },
        },
        creatorTypes: { type: "array", items: { type: "string" } },
        searchTerms: { type: "array", items: { type: "string" } },
      },
      required: ["officialSources", "communitySources", "creatorTypes", "searchTerms"],
    },
    housingPlan: {
      type: "object",
      additionalProperties: false,
      properties: {
        recommendation: { type: "string" },
        reasoning: { type: "string" },
        alternatives: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              option: { type: "string" },
              note: { type: "string" },
            },
            required: ["option", "note"],
          },
        },
        budgetPick: { type: "string" },
      },
      required: ["recommendation", "reasoning", "alternatives", "budgetPick"],
    },
  },
  required: ["riskFactors", "onlineContent", "housingPlan"],
} as const;

type CoreSections = Omit<TripPlan, "grounded">;
type GroundedSections = TripPlan["grounded"];

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

// ---------- Lane B call: web-search grounded, structured ----------
const GROUNDED_SYSTEM = `
You research current, factual travel info for Geospace AI. Your output is data
that a product renders — never conversational text, and never markdown. Do not
use asterisks, hash marks, or any other formatting characters. The app applies
all styling.

Sourcing:
- NEVER invent safety statistics, advisory levels, or alerts. Search and cite
  official sources (State Dept advisories, CDC, WHO, local civil protection) for
  anything about crime, disease, disasters, or discrimination.
- Put the bare URL in sourceUrl and the publisher in sourceName. For practical
  guidance that follows from a sourced finding, leave both as empty strings.
- If you cannot source a risk factor, omit that entry from the array entirely.
  Never write a sentence about what you did or did not find.

Voice:
- No first person. Never write "I", "we", "my", "let me", "I'd recommend",
  "in the sources I checked", "I did not find".
- No offers of further work and no closing questions.
- Do not restate the traveler profile back ("Given the traveler is 17...").
  Apply it silently and state conclusions directly.

Field notes:
- riskFactors: label is 2-4 words, body is 2-4 sentences.
- creatorTypes: describe what creators cover, never name individuals.
- searchTerms: literal strings a user could paste into a search box.
- housingPlan.recommendation is one line naming lodging type and area.
- housingPlan.alternatives covers the options not recommended.
`.trim();

async function generateGroundedSections(
  destination: string,
  preferences: string
): Promise<GroundedSections> {
  const ctx = preferences
    ? `Destination: ${destination}\n\nTraveler profile:\n${preferences}`
    : `Destination: ${destination}`;

  const response = await openai.responses.create({
    model: MODEL,
    tools: [{ type: "web_search" }],
    input: [
      { role: "system", content: GROUNDED_SYSTEM },
      {
        role: "user",
        content:
          `Research this destination and return risk factors, online content, and a ` +
          `housing recommendation.\n\nRisk factors should cover crime and travel ` +
          `safety, age-related safety, discrimination risk, natural disasters and ` +
          `weather, and health risks — dropping any you cannot source.\n\n${ctx}`,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "grounded",
        schema: groundedSchema,
        strict: true,
      },
    },
  });

  return JSON.parse(response.output_text) as GroundedSections;
}

export async function generateTripContent(
  destination: string,
  profile: TravelerProfile = {}
): Promise<{ summary: string; data: TripPlan }> {
  const preferences = buildPreferences(profile);

  const [core, grounded] = await Promise.all([
    generateCoreSections(destination, preferences),
    generateGroundedSections(destination, preferences),
  ]);

  return {
    summary: core.destinationOverview,
    data: { ...core, grounded },
  };
}