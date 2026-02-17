import { sql } from "drizzle-orm";
import { pgTable, text, varchar, doublePrecision, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const outages = pgTable("outages", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 20 }).notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  quartier: text("quartier").notNull().default('N/A'),
  ville: text("ville").notNull().default('N/A'),
  region: text("region").notNull().default('N/A'),
  confirmations: integer("confirmations").notNull().default(1),
  photoUri: text("photo_uri"),
  estRetablie: boolean("est_retablie").notNull().default(false),
  dateRetablissement: timestamp("date_retablissement"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOutageSchema = createInsertSchema(outages).omit({
  id: true,
  confirmations: true,
  estRetablie: true,
  dateRetablissement: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Outage = typeof outages.$inferSelect;
export type InsertOutage = z.infer<typeof insertOutageSchema>;
