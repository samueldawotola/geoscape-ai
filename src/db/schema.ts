import { pgTable, uuid, text, timestamp, integer, boolean, date } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  auth0Sub: text("auth0_sub").unique().notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  displayName: text("display_name"),
  dateOfBirth: date("date_of_birth"),
  nationality: text("nationality"),
  travelStyle: text("travel_style"),
  fitness: text("fitness"),
  budget: text("budget"),
  accessibility: text("accessibility"),
  familyPets: text("family_pets"),
  hasPassport: boolean("has_passport"),
});

export const trips = pgTable("trips", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  destination: text("destination").notNull(),
  content: text("content"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});