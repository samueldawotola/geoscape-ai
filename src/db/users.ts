import { db } from "@/index";
import { users, trips } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function syncUser(auth0Sub: string, email: string) {
  
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.auth0Sub, auth0Sub))
    .limit(1);

 
  if (existing.length > 0) {
    return existing[0];
  }

  
  const [created] = await db
    .insert(users)
    .values({ auth0Sub, email })
    .returning();

  return created;
}

export async function getUserTrips(userId: string) {
  return await db
    .select()
    .from(trips)
    .where(eq(trips.userId, userId))
    .orderBy(desc(trips.createdAt));
}