import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";
export * from "./models/chat";

export const NOVEL_PRICING: Record<number, number> = {
  150: 30000,
  200: 35000,
  250: 45000,
  300: 60000,
};

export const ESSAY_PRICE = 5000;
export const SCENARIO_PRICE = 20000;
export const ALL_IN_ONE_PRICE = 50000;

export const VALID_PAGE_COUNTS = [150, 200, 250, 300] as const;
export const PROJECT_TYPES = ["novel", "essay", "scenario"] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const ESSAY_SUBJECTS = [
  "news", "politics", "science", "technology", "economics", "sports",
  "weather", "culture", "health", "education", "environment", "opinion",
  "travel", "food", "fashion", "entertainment", "history", "philosophy",
] as const;

export const SCENARIO_GENRES = [
  "drama", "thriller", "comedy", "romance", "historical", "action",
  "sci-fi", "horror", "family", "social", "crime", "war",
] as const;

export function getProjectPrice(pageCount: number): number {
  return NOVEL_PRICING[pageCount] || 0;
}

export function getProjectPriceUSD(pageCount: number): number {
  return getProjectPrice(pageCount) / 100;
}

export function getProjectPriceByType(projectType: string, pageCount?: number): number {
  if (projectType === "essay") return ESSAY_PRICE;
  if (projectType === "scenario") return SCENARIO_PRICE;
  return getProjectPrice(pageCount || 150);
}

export const novelProjects = pgTable("novel_projects", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  projectType: text("project_type").notNull().default("novel"),
  title: text("title").notNull(),
  mainIdea: text("main_idea").notNull(),
  timeSetting: text("time_setting").notNull(),
  placeSetting: text("place_setting").notNull(),
  narrativePov: text("narrative_pov").notNull(),
  pageCount: integer("page_count").notNull().default(150),
  status: text("status").notNull().default("locked"),
  outline: text("outline"),
  outlineApproved: integer("outline_approved").notNull().default(0),
  paid: boolean("paid").notNull().default(false),
  allowedWords: integer("allowed_words").notNull().default(0),
  usedWords: integer("used_words").notNull().default(0),
  price: integer("price").notNull().default(0),
  coverImageUrl: text("cover_image_url"),
  subject: text("subject"),
  essayTone: text("essay_tone"),
  targetAudience: text("target_audience"),
  genre: text("genre"),
  episodeCount: integer("episode_count"),
  formatType: text("format_type"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const characters = pgTable("characters", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => novelProjects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  background: text("background").notNull(),
  role: text("role").notNull(),
});

export const characterRelationships = pgTable("character_relationships", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => novelProjects.id, { onDelete: "cascade" }),
  character1Id: integer("character1_id").notNull().references(() => characters.id, { onDelete: "cascade" }),
  character2Id: integer("character2_id").notNull().references(() => characters.id, { onDelete: "cascade" }),
  relationship: text("relationship").notNull(),
});

export const chapters = pgTable("chapters", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => novelProjects.id, { onDelete: "cascade" }),
  chapterNumber: integer("chapter_number").notNull(),
  title: text("title").notNull(),
  content: text("content"),
  summary: text("summary"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const novelProjectsRelations = relations(novelProjects, ({ many }) => ({
  characters: many(characters),
  chapters: many(chapters),
  characterRelationships: many(characterRelationships),
}));

export const charactersRelations = relations(characters, ({ one }) => ({
  project: one(novelProjects, {
    fields: [characters.projectId],
    references: [novelProjects.id],
  }),
}));

export const chaptersRelations = relations(chapters, ({ one }) => ({
  project: one(novelProjects, {
    fields: [chapters.projectId],
    references: [novelProjects.id],
  }),
}));

export const characterRelationshipsRelations = relations(characterRelationships, ({ one }) => ({
  project: one(novelProjects, {
    fields: [characterRelationships.projectId],
    references: [novelProjects.id],
  }),
  character1: one(characters, {
    fields: [characterRelationships.character1Id],
    references: [characters.id],
    relationName: "character1",
  }),
  character2: one(characters, {
    fields: [characterRelationships.character2Id],
    references: [characters.id],
    relationName: "character2",
  }),
}));

export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("open"),
  priority: text("priority").notNull().default("normal"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const ticketReplies = pgTable("ticket_replies", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => supportTickets.id, { onDelete: "cascade" }),
  userId: varchar("user_id"),
  message: text("message").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const supportTicketsRelations = relations(supportTickets, ({ many }) => ({
  replies: many(ticketReplies),
}));

export const ticketRepliesRelations = relations(ticketReplies, ({ one }) => ({
  ticket: one(supportTickets, {
    fields: [ticketReplies.ticketId],
    references: [supportTickets.id],
  }),
}));

export const insertNovelProjectSchema = createInsertSchema(novelProjects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  outline: true,
  outlineApproved: true,
  status: true,
  paid: true,
  allowedWords: true,
  usedWords: true,
  price: true,
});

export const insertCharacterSchema = createInsertSchema(characters).omit({
  id: true,
});

export const insertChapterSchema = createInsertSchema(chapters).omit({
  id: true,
  createdAt: true,
  content: true,
  status: true,
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  priority: true,
});

export const insertTicketReplySchema = createInsertSchema(ticketReplies).omit({
  id: true,
  createdAt: true,
});

export type NovelProject = typeof novelProjects.$inferSelect;
export type InsertNovelProject = z.infer<typeof insertNovelProjectSchema>;
export type Character = typeof characters.$inferSelect;
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;
export type CharacterRelationship = typeof characterRelationships.$inferSelect;
export type Chapter = typeof chapters.$inferSelect;
export type InsertChapter = z.infer<typeof insertChapterSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type TicketReply = typeof ticketReplies.$inferSelect;
export type InsertTicketReply = z.infer<typeof insertTicketReplySchema>;
