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
export const SHORT_STORY_PRICE = 8000;
export const ALL_IN_ONE_PRICE = 50000;

export const VALID_PAGE_COUNTS = [150, 200, 250, 300] as const;
export const PROJECT_TYPES = ["novel", "essay", "scenario", "short_story"] as const;
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

export const SHORT_STORY_GENRES = [
  "realistic", "symbolic", "psychological", "social", "fantasy",
  "horror", "romantic", "historical", "satirical", "philosophical",
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
  if (projectType === "short_story") return SHORT_STORY_PRICE;
  return getProjectPrice(pageCount || 150);
}

export const PLAN_TYPES = ["free", "essay", "scenario", "all_in_one"] as const;
export type PlanType = (typeof PLAN_TYPES)[number];

export const PLAN_PRICES: Record<string, number> = {
  essay: ESSAY_PRICE,
  scenario: SCENARIO_PRICE,
  short_story: SHORT_STORY_PRICE,
  all_in_one: ALL_IN_ONE_PRICE,
};

export function userPlanCoversType(plan: string | null | undefined, projectType: string): boolean {
  if (!plan || plan === "free") return false;
  if (plan === "all_in_one") return true;
  if (plan === "essay" && projectType === "essay") return true;
  if (plan === "scenario" && projectType === "scenario") return true;
  return false;
}

export function getPlanPrice(plan: string): number {
  return PLAN_PRICES[plan] || 0;
}

export function getPlanPriceUSD(plan: string): number {
  return getPlanPrice(plan) / 100;
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
  shareToken: varchar("share_token"),
  glossary: text("glossary"),
  flagged: boolean("flagged").default(false),
  flagReason: text("flag_reason"),
  subject: text("subject"),
  essayTone: text("essay_tone"),
  targetAudience: text("target_audience"),
  genre: text("genre"),
  episodeCount: integer("episode_count"),
  formatType: text("format_type"),
  narrativeTechnique: text("narrative_technique"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const characters = pgTable("characters", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => novelProjects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  background: text("background").notNull(),
  role: text("role").notNull(),
  motivation: text("motivation"),
  speechStyle: text("speech_style"),
  physicalDescription: text("physical_description"),
  psychologicalTraits: text("psychological_traits"),
  age: text("age"),
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

export const chapterVersions = pgTable("chapter_versions", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  source: text("source").notNull().default("ai_generated"),
  savedAt: timestamp("saved_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
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

export const chaptersRelations = relations(chapters, ({ one, many }) => ({
  project: one(novelProjects, {
    fields: [chapters.projectId],
    references: [novelProjects.id],
  }),
  versions: many(chapterVersions),
}));

export const chapterVersionsRelations = relations(chapterVersions, ({ one }) => ({
  chapter: one(chapters, {
    fields: [chapterVersions.chapterId],
    references: [chapters.id],
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

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  link: text("link"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const promoCodes = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code").unique().notNull(),
  discountPercent: integer("discount_percent").notNull(),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  validUntil: timestamp("valid_until"),
  applicableTo: text("applicable_to").notNull().default("all"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const readingProgress = pgTable("reading_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  projectId: integer("project_id").notNull().references(() => novelProjects.id, { onDelete: "cascade" }),
  lastChapterId: integer("last_chapter_id"),
  scrollPosition: integer("scroll_position").notNull().default(0),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const bookmarks = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  projectId: integer("project_id").notNull().references(() => novelProjects.id, { onDelete: "cascade" }),
  chapterId: integer("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  note: text("note"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const projectFavorites = pgTable("project_favorites", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  projectId: integer("project_id").notNull().references(() => novelProjects.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

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
export type ChapterVersion = typeof chapterVersions.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type PromoCode = typeof promoCodes.$inferSelect;
export type ReadingProgress = typeof readingProgress.$inferSelect;
export type Bookmark = typeof bookmarks.$inferSelect;
export const insertProjectFavoriteSchema = createInsertSchema(projectFavorites).omit({ id: true, createdAt: true });
export type InsertProjectFavorite = z.infer<typeof insertProjectFavoriteSchema>;
export type ProjectFavorite = typeof projectFavorites.$inferSelect;
