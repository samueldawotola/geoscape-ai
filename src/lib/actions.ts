"use server";

import { auth0 } from "@/lib/auth0";
import { generateTripContent } from "@/lib/llm";
import { syncUser } from "@/db/users";
import { db } from "@/index";
import { eq } from "drizzle-orm";
import { trips, users } from "@/db/schema";
import { revalidatePath } from "next/cache";

export async function generateTrip(destination: string) {
  
  const session = await auth0.getSession();
  if (!session) {
    throw new Error("Not authenticated");
  }
  if (!session.user.email) {
    throw new Error("No email associated with this account");
  }

  if (!destination || destination.trim().length === 0) {
    return { error: "Please enter a destination." };
  }

  try {
    const dbUser = await syncUser(session.user.sub, session.user.email);
    const content = await generateTripContent(destination, {
      displayName: dbUser.displayName,
      dateOfBirth: dbUser.dateOfBirth,
      nationality: dbUser.nationality,
      travelStyle: dbUser.travelStyle,
      fitness: dbUser.fitness,
      budget: dbUser.budget,
      accessibility: dbUser.accessibility,
      familyPets: dbUser.familyPets,
      hasPassport: dbUser.hasPassport,
    });

    const [savedTrip] = await db
      .insert(trips)
      .values({
        userId: dbUser.id,
        destination: destination.trim(),
        content,
      })
      .returning();

    revalidatePath("/dashboard");
    return { trip: savedTrip };
  } catch (err) {
    
    console.error("generateTrip failed:", err);
    return { error: "Couldn't generate your trip right now. Please try again." };
  }
}

export async function updateProfile(formData: FormData) {
  const session = await auth0.getSession();
  if (!session) {
    throw new Error("Not authenticated");
  }
  if (!session.user.email) {
    throw new Error("No email associated with this account");
  }

  const dbUser = await syncUser(session.user.sub, session.user.email);

  const clean = (key: string) => {
    const value = formData.get(key) as string | null;
    return value && value.trim().length > 0 ? value.trim() : null;
  };

  await db
    .update(users)
    .set({
      displayName: clean("display_name"),
      dateOfBirth: clean("date_of_birth"),
      nationality: clean("nationality"),
      travelStyle: clean("travel_style"),
      fitness: clean("fitness"),
      budget: clean("budget"),
      accessibility: clean("accessibility"),
      familyPets: clean("family_pets"),
      hasPassport: formData.get("has_passport") === "on",
    })
    .where(eq(users.id, dbUser.id));

  revalidatePath("/profile");
}