import { pgTable, varchar, text, timestamp, numeric, jsonb, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./auth";

export const trips = pgTable("trips", {
  id: varchar("id").primaryKey().default(sql`upper(substr(md5(random()::text), 1, 6))`),
  name: varchar("name").notNull(),
  destination: varchar("destination").notNull(),
  startDate: varchar("start_date").notNull(),
  endDate: varchar("end_date").notNull(),
  status: varchar("status").notNull().default("active"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
});

export const tripMembers = pgTable("trip_members", {
  id: varchar("id").primaryKey().default(sql`'m-' || substr(md5(random()::text), 1, 8)`),
  tripId: varchar("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role").notNull().default("viewer"),
});

export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`substr(md5(random()::text), 1, 9)`),
  tripId: varchar("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  payerId: varchar("payer_id").notNull().references(() => users.id),
  amount: numeric("amount").notNull(),
  description: varchar("description").notNull(),
  date: varchar("date").notNull(),
  category: varchar("category").notNull(),
  participants: jsonb("participants").notNull().default(sql`'[]'::jsonb`),
});

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`substr(md5(random()::text), 1, 9)`),
  tripId: varchar("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  fromId: varchar("from_id").notNull().references(() => users.id),
  toId: varchar("to_id").notNull().references(() => users.id),
  amount: numeric("amount").notNull(),
  date: varchar("date").notNull(),
});

export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`substr(md5(random()::text), 1, 9)`),
  tripId: varchar("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  description: text("description"),
  date: varchar("date").notNull(),
  time: varchar("time"),
  status: varchar("status").notNull().default("pending"),
  participants: jsonb("participants").default(sql`'[]'::jsonb`),
});

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`substr(md5(random()::text), 1, 9)`),
  tripId: varchar("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(),
  url: text("url").notNull(),
  fileData: text("file_data"),
  mimeType: varchar("mime_type"),
  visibility: varchar("visibility").notNull().default("all"),
  allowedUsers: jsonb("allowed_users").default(sql`'[]'::jsonb`),
  date: varchar("date").notNull(),
});

export const journalEntries = pgTable("journal_entries", {
  id: varchar("id").primaryKey().default(sql`substr(md5(random()::text), 1, 9)`),
  tripId: varchar("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  date: varchar("date").notNull(),
  content: text("content").notNull(),
  isShared: boolean("is_shared").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mapPins = pgTable("map_pins", {
  id: varchar("id").primaryKey().default(sql`substr(md5(random()::text), 1, 9)`),
  tripId: varchar("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  address: varchar("address").notNull(),
  category: varchar("category").notNull(),
});

export const invitationCodes = pgTable("invitation_codes", {
  id: varchar("id").primaryKey().default(sql`substr(md5(random()::text), 1, 9)`),
  tripId: varchar("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  code: varchar("code").notNull().unique(),
  role: varchar("role").notNull().default("viewer"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  maxUses: integer("max_uses"),
  uses: integer("uses").notNull().default(0),
});
