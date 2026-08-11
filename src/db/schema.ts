import { pgTable, uuid, text, timestamp, integer, boolean, date, jsonb } from "drizzle-orm/pg-core";

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

export type TripPlan = {
  destinationOverview: string;
  itinerary: { day: number; title: string; morning: string; afternoon: string; evening: string }[];
  packingList: { category: string; items: string[] }[];
  budgetBreakdown: {
    currency: string;
    lodging: number;
    food: number;
    activities: number;
    transport: number;
    misc: number;
    total: number;
    notes: string;
  };
  localTips: string[];
  grounded: {
    riskFactors: { label: string; body: string; sourceUrl: string; sourceName: string }[];
    onlineContent: {
      officialSources: { name: string; url: string; note: string }[];
      communitySources: { name: string; url: string; note: string }[];
      creatorTypes: string[];
      searchTerms: string[];
    };
    housingPlan: {
      recommendation: string;
      reasoning: string;
      alternatives: { option: string; note: string }[];
      budgetPick: string;
    };
  };
};

export const trips = pgTable("trips", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  destination: text("destination").notNull(),
  content: text("content"),
  data: jsonb("data").$type<TripPlan>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});