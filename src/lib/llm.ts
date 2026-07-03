import OpenAI from "openai";

const openai = new OpenAI();

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

export async function generateTripContent(
  destination: string,
  profile: TravelerProfile = {}
) {
  const preferences = buildPreferences(profile);

  const userMessage = preferences
    ? `Tell me about visiting ${destination}. Tailor it to this traveler:\n${preferences}`
    : `Tell me about visiting ${destination}.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.4-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a helpful travel assistant. Write a short, vivid description of a destination in 2-3 sentences. If traveler preferences are given, weave them in naturally rather than listing them.",
      },
      { role: "user", content: userMessage },
    ],
  });

  return response.choices[0].message.content;
}