import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";
export * from "./models/chat";

export const novelProjects = pgTable("novel_projects", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  mainIdea: text("main_idea").notNull(),
  timeSetting: text("time_setting").notNull(),
  placeSetting: text("place_setting").notNull(),
  narrativePov: text("narrative_pov").notNull(),
  status: text("status").notNull().default("draft"),
  outline: text("outline"),
  outlineApproved: integer("outline_approved").notNull().default(0),
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

export const insertNovelProjectSchema = createInsertSchema(novelProjects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  outline: true,
  outlineApproved: true,
  status: true,
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

export type NovelProject = typeof novelProjects.$inferSelect;
export type InsertNovelProject = z.infer<typeof insertNovelProjectSchema>;
export type Character = typeof characters.$inferSelect;
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;
export type CharacterRelationship = typeof characterRelationships.$inferSelect;
export type Chapter = typeof chapters.$inferSelect;
export type InsertChapter = z.infer<typeof insertChapterSchema>;
