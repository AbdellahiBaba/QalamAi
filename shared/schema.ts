import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, jsonb, boolean, unique, index, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";
export * from "./models/chat";

export const NOVEL_PRICING: Record<number, number> = {
  150: 9999,
  200: 12999,
  250: 14999,
  300: 19999,
};

export const ESSAY_PRICE = 1999;
export const SCENARIO_PRICE = 7999;
export const SHORT_STORY_PRICE = 2999;
export const KHAWATER_PRICE = 499;
export const SOCIAL_MEDIA_PRICE = 799;
export const POETRY_PRICE = 1499;
export const MEMOIRE_PRICE = 4999;
export const ALL_IN_ONE_PRICE = 14999;

export const VALID_PAGE_COUNTS = [150, 200, 250, 300] as const;
export const PROJECT_TYPES = ["novel", "essay", "scenario", "short_story", "khawater", "social_media", "poetry", "memoire"] as const;
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

export const KHAWATER_STYLES = [
  "reflection", "thought", "wisdom", "meditation", "letter", "prose_poem",
] as const;

export const KHAWATER_MOODS = [
  "hopeful", "melancholic", "philosophical", "romantic", "nostalgic", "spiritual",
] as const;

export const SOCIAL_MEDIA_PLATFORMS = [
  "twitter", "instagram", "linkedin", "facebook", "youtube_script", "tiktok_script",
] as const;

export const SOCIAL_MEDIA_TONES = [
  "professional", "casual", "inspirational", "humorous", "educational", "promotional",
] as const;

export const ANALYSIS_UNLOCK_PRICE = 5999;
export const FREE_ANALYSIS_USES = 3;
export const PAID_ANALYSIS_USES = 3;

export const TRIAL_MAX_PROJECTS = 1;
export const TRIAL_MAX_CHAPTERS = 3;
export const TRIAL_MAX_COVERS = 1;
export const TRIAL_MAX_CONTINUITY = 1;
export const TRIAL_MAX_STYLE = 1;
export const TRIAL_DURATION_HOURS = 24;

export const FREE_MONTHLY_PROJECTS = 1;
export const FREE_MONTHLY_GENERATIONS = 2;
export const TRIAL_CHARGE_AMOUNT = 50000;

export function getRemainingAnalysisUses(usedCount: number, paidCount: number): number {
  return FREE_ANALYSIS_USES + (paidCount * PAID_ANALYSIS_USES) - usedCount;
}

export function isTrialExpired(trialEndsAt: Date | null | undefined): boolean {
  if (!trialEndsAt) return true;
  return new Date() > new Date(trialEndsAt);
}

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
  if (projectType === "khawater") return KHAWATER_PRICE;
  if (projectType === "social_media") return SOCIAL_MEDIA_PRICE;
  if (projectType === "poetry") return POETRY_PRICE;
  if (projectType === "memoire") return MEMOIRE_PRICE;
  return getProjectPrice(pageCount || 150);
}

export const PLAN_TYPES = ["free", "essay", "scenario", "all_in_one"] as const;
export type PlanType = (typeof PLAN_TYPES)[number];

export const PLAN_PRICES: Record<string, number> = {
  essay: ESSAY_PRICE,
  scenario: SCENARIO_PRICE,
  short_story: SHORT_STORY_PRICE,
  khawater: KHAWATER_PRICE,
  social_media: SOCIAL_MEDIA_PRICE,
  poetry: POETRY_PRICE,
  memoire: MEMOIRE_PRICE,
  all_in_one: ALL_IN_ONE_PRICE,
};

export function userPlanCoversType(plan: string | null | undefined, projectType: string): boolean {
  if (!plan || plan === "free") return false;
  if (plan === "all_in_one") return true;
  if (plan === "trial") return true;
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
  allowDialect: boolean("allow_dialect").notNull().default(false),
  continuityCheckResult: text("continuity_check_result"),
  continuityCheckCount: integer("continuity_check_count").notNull().default(0),
  continuityCheckPaidCount: integer("continuity_check_paid_count").notNull().default(0),
  styleAnalysisResult: text("style_analysis_result"),
  styleAnalysisCount: integer("style_analysis_count").notNull().default(0),
  styleAnalysisPaidCount: integer("style_analysis_paid_count").notNull().default(0),
  targetWordCount: integer("target_word_count"),
  publishedToNews: boolean("published_to_news").default(false),
  publishedToGallery: boolean("published_to_gallery").default(false),
  poetryMeter: text("poetry_meter"),
  poetryRhyme: text("poetry_rhyme"),
  poetryEra: text("poetry_era"),
  poetryTone: text("poetry_tone"),
  poetryTheme: text("poetry_theme"),
  poetryVerseCount: integer("poetry_verse_count"),
  poetryImageryLevel: integer("poetry_imagery_level"),
  poetryEmotionLevel: integer("poetry_emotion_level"),
  poetryRawiHaraka: text("poetry_rawi_haraka"),
  poetryRidf: text("poetry_ridf"),
  poetryMuarada: text("poetry_muarada"),
  memoireUniversity: text("memoire_university"),
  memoireCountry: text("memoire_country"),
  memoireFaculty: text("memoire_faculty"),
  memoireDepartment: text("memoire_department"),
  memoireField: text("memoire_field"),
  memoireDegreeLevel: text("memoire_degree_level"),
  memoireMethodology: text("memoire_methodology"),
  memoireCitationStyle: text("memoire_citation_style"),
  memoireChapterCount: integer("memoire_chapter_count"),
  memoirePageTarget: integer("memoire_page_target"),
  memoireHypotheses: text("memoire_hypotheses"),
  memoireKeywords: text("memoire_keywords"),
  memoireUserData: text("memoire_user_data"),
  videoUrl: text("video_url"),
  tags: text("tags").array(),
  seekingBetaReaders: boolean("seeking_beta_readers").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_projects_user_id").on(table.userId),
  index("idx_projects_type_gallery").on(table.projectType, table.publishedToGallery),
  index("idx_projects_share_token").on(table.shareToken),
]);

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
}, (table) => [
  index("idx_character_relationships_project_id").on(table.projectId),
  index("idx_character_relationships_char1_id").on(table.character1Id),
  index("idx_character_relationships_char2_id").on(table.character2Id),
]);

export const chapters = pgTable("chapters", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => novelProjects.id, { onDelete: "cascade" }),
  chapterNumber: integer("chapter_number").notNull(),
  title: text("title").notNull(),
  content: text("content"),
  summary: text("summary"),
  status: text("status").notNull().default("pending"),
  isPaid: boolean("is_paid").notNull().default(false),
  priceCents: integer("price_cents").notNull().default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_chapters_project_id").on(table.projectId),
]);

export const chapterVersions = pgTable("chapter_versions", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  source: text("source").notNull().default("ai_generated"),
  savedAt: timestamp("saved_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_chapter_versions_chapter_id").on(table.chapterId),
]);

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
}, (table) => [
  index("idx_support_tickets_user_id").on(table.userId),
  index("idx_support_tickets_status").on(table.status),
]);

export const ticketReplies = pgTable("ticket_replies", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => supportTickets.id, { onDelete: "cascade" }),
  userId: varchar("user_id"),
  message: text("message").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_ticket_replies_ticket_id").on(table.ticketId),
]);

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
}, (table) => [
  index("idx_notifications_user_id").on(table.userId),
]);

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
}, (table) => [
  index("idx_reading_progress_user_project").on(table.userId, table.projectId),
  unique("unique_reading_progress_user_project").on(table.userId, table.projectId),
]);

export const bookmarks = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  projectId: integer("project_id").notNull().references(() => novelProjects.id, { onDelete: "cascade" }),
  chapterId: integer("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  note: text("note"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_bookmarks_user_project").on(table.userId, table.projectId),
]);

export const projectFavorites = pgTable("project_favorites", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  projectId: integer("project_id").notNull().references(() => novelProjects.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_project_favorites_user_project").on(table.userId, table.projectId),
  unique("unique_user_project_favorite").on(table.userId, table.projectId),
]);

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

export const apiUsageLogs = pgTable("api_usage_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  projectId: integer("project_id"),
  feature: varchar("feature").notNull(),
  model: varchar("model").notNull(),
  promptTokens: integer("prompt_tokens").default(0),
  completionTokens: integer("completion_tokens").default(0),
  totalTokens: integer("total_tokens").default(0),
  estimatedCostMicro: integer("estimated_cost_micro").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_api_usage_user_id").on(table.userId),
  index("idx_api_usage_created_at").on(table.createdAt),
]);

export const insertApiUsageLogSchema = createInsertSchema(apiUsageLogs).omit({ id: true, createdAt: true });
export type InsertApiUsageLog = z.infer<typeof insertApiUsageLogSchema>;
export type ApiUsageLog = typeof apiUsageLogs.$inferSelect;

export const authorRatings = pgTable("author_ratings", {
  id: serial("id").primaryKey(),
  authorId: varchar("author_id").notNull(),
  visitorIp: varchar("visitor_ip").notNull(),
  rating: integer("rating").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique("author_visitor_unique").on(table.authorId, table.visitorIp),
]);

export const insertAuthorRatingSchema = createInsertSchema(authorRatings).omit({ id: true, createdAt: true });
export type InsertAuthorRating = z.infer<typeof insertAuthorRatingSchema>;
export type AuthorRating = typeof authorRatings.$inferSelect;

export const platformReviews = pgTable("platform_reviews", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  reviewerName: varchar("reviewer_name").notNull(),
  reviewerBio: varchar("reviewer_bio"),
  content: text("content").notNull(),
  rating: integer("rating").notNull(),
  approved: boolean("approved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_platform_reviews_approved").on(table.approved),
]);

export const insertPlatformReviewSchema = createInsertSchema(platformReviews).omit({ id: true, createdAt: true, approved: true });
export type InsertPlatformReview = z.infer<typeof insertPlatformReviewSchema>;
export type PlatformReview = typeof platformReviews.$inferSelect;

export const trackingPixels = pgTable("tracking_pixels", {
  id: serial("id").primaryKey(),
  platform: varchar("platform").notNull().unique(),
  pixelId: varchar("pixel_id").notNull(),
  accessToken: varchar("access_token"),
  enabled: boolean("enabled").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTrackingPixelSchema = createInsertSchema(trackingPixels).omit({ id: true, updatedAt: true });
export type InsertTrackingPixel = z.infer<typeof insertTrackingPixelSchema>;
export type TrackingPixel = typeof trackingPixels.$inferSelect;

export const essayViews = pgTable("essay_views", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => novelProjects.id, { onDelete: "cascade" }),
  visitorIp: varchar("visitor_ip").notNull(),
  viewedAt: timestamp("viewed_at").defaultNow(),
  referrer: text("referrer"),
  country: varchar("country", { length: 2 }),
}, (table) => [
  index("idx_essay_views_project_id").on(table.projectId),
]);

export type EssayView = typeof essayViews.$inferSelect;

export const essayClicks = pgTable("essay_clicks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => novelProjects.id, { onDelete: "cascade" }),
  visitorIp: varchar("visitor_ip").notNull(),
  clickedAt: timestamp("clicked_at").defaultNow(),
}, (table) => [
  index("idx_essay_clicks_project_id").on(table.projectId),
]);

export type EssayClick = typeof essayClicks.$inferSelect;

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_password_reset_tokens_user_id").on(table.userId),
]);

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

export const essayReactions = pgTable("essay_reactions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => novelProjects.id, { onDelete: "cascade" }),
  visitorIp: varchar("visitor_ip").notNull(),
  reactionType: varchar("reaction_type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_essay_reactions_project_id").on(table.projectId),
]);

export type EssayReaction = typeof essayReactions.$inferSelect;

export const socialMediaLinks = pgTable("social_media_links", {
  id: serial("id").primaryKey(),
  platform: varchar("platform").notNull().unique(),
  url: text("url").notNull(),
  enabled: boolean("enabled").default(false),
  displayOrder: integer("display_order").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSocialMediaLinkSchema = createInsertSchema(socialMediaLinks).omit({ id: true, updatedAt: true });
export type InsertSocialMediaLink = z.infer<typeof insertSocialMediaLinkSchema>;
export type SocialMediaLink = typeof socialMediaLinks.$inferSelect;

export const platformFeatures = pgTable("platform_features", {
  id: serial("id").primaryKey(),
  featureKey: varchar("feature_key").notNull().unique(),
  name: varchar("name").notNull(),
  description: text("description"),
  enabled: boolean("enabled").default(true).notNull(),
  betaOnly: boolean("beta_only").default(false).notNull(),
  betaUserIds: text("beta_user_ids").array().default([]),
  disabledMessage: text("disabled_message").default("هذه الميزة قيد التطوير وستكون متاحة قريباً"),
});

export const insertPlatformFeatureSchema = createInsertSchema(platformFeatures).omit({ id: true });
export type InsertPlatformFeature = z.infer<typeof insertPlatformFeatureSchema>;
export type PlatformFeature = typeof platformFeatures.$inferSelect;

export const contentReports = pgTable("content_reports", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => novelProjects.id),
  reporterIp: varchar("reporter_ip"),
  reporterUserId: varchar("reporter_user_id"),
  reason: varchar("reason").notNull(),
  subReason: varchar("sub_reason"),
  severity: varchar("severity"),
  details: text("details"),
  reportNumber: varchar("report_number"),
  reporterEmail: varchar("reporter_email"),
  status: varchar("status").default("pending").notNull(),
  priority: varchar("priority").default("normal"),
  adminNote: text("admin_note"),
  actionTaken: varchar("action_taken"),
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  resolvedAt: timestamp("resolved_at"),
  reporterUserAgent: text("reporter_user_agent"),
  reporterDeviceType: varchar("reporter_device_type"),
  reporterDeviceName: varchar("reporter_device_name"),
  reporterCountry: varchar("reporter_country"),
  reporterCity: varchar("reporter_city"),
  reporterIsp: varchar("reporter_isp"),
  reporterGeoData: text("reporter_geo_data"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_content_reports_status").on(table.status),
  index("idx_content_reports_project_id").on(table.projectId),
]);

export const insertContentReportSchema = createInsertSchema(contentReports).omit({ id: true, createdAt: true, status: true, priority: true, adminNote: true, actionTaken: true, reviewedBy: true, reviewedAt: true, resolvedAt: true });
export type InsertContentReport = z.infer<typeof insertContentReportSchema>;
export type ContentReport = typeof contentReports.$inferSelect;

export const knowledgeEntries = pgTable("knowledge_entries", {
  id: serial("id").primaryKey(),
  category: varchar("category").notNull(),
  contentType: varchar("content_type").notNull(),
  knowledge: text("knowledge").notNull(),
  source: varchar("source").notNull(),
  confidence: real("confidence").default(0.5).notNull(),
  usageCount: integer("usage_count").default(0).notNull(),
  validated: boolean("validated").default(false).notNull(),
  rejected: boolean("rejected").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_knowledge_content_type").on(table.contentType),
  index("idx_knowledge_category").on(table.category),
  index("idx_knowledge_validated").on(table.validated, table.rejected),
]);

export const insertKnowledgeEntrySchema = createInsertSchema(knowledgeEntries).omit({ id: true, usageCount: true, createdAt: true, updatedAt: true });
export type InsertKnowledgeEntry = z.infer<typeof insertKnowledgeEntrySchema>;
export type KnowledgeEntry = typeof knowledgeEntries.$inferSelect;

export const learningSessions = pgTable("learning_sessions", {
  id: serial("id").primaryKey(),
  triggeredBy: varchar("triggered_by").notNull(),
  status: varchar("status").default("running").notNull(),
  dataSourcesProcessed: integer("data_sources_processed").default(0).notNull(),
  entriesGenerated: integer("entries_generated").default(0).notNull(),
  entriesValidated: integer("entries_validated").default(0).notNull(),
  entriesRejected: integer("entries_rejected").default(0).notNull(),
  summary: text("summary"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertLearningSessionSchema = createInsertSchema(learningSessions).omit({ id: true, startedAt: true, completedAt: true });
export type InsertLearningSession = z.infer<typeof insertLearningSessionSchema>;
export type LearningSession = typeof learningSessions.$inferSelect;

export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: serial("id").primaryKey(),
  payload: jsonb("payload").notNull(),
  status: varchar("status").notNull().default("pending"),
  statusCode: integer("status_code"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").notNull().default(0),
  nextRetryAt: timestamp("next_retry_at"),
  createdAt: timestamp("created_at").defaultNow(),
  deliveredAt: timestamp("delivered_at"),
});

export const insertWebhookDeliverySchema = createInsertSchema(webhookDeliveries).omit({ id: true, createdAt: true, deliveredAt: true });
export type InsertWebhookDelivery = z.infer<typeof insertWebhookDeliverySchema>;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;

export const essayComments = pgTable("essay_comments", {
  id: serial("id").primaryKey(),
  essayId: integer("essay_id").notNull(),
  authorName: varchar("author_name").notNull(),
  content: text("content").notNull(),
  approved: boolean("approved").default(false).notNull(),
  ipHash: varchar("ip_hash"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_essay_comments_essay_id").on(table.essayId),
  index("idx_essay_comments_approved").on(table.approved),
]);

export const insertEssayCommentSchema = createInsertSchema(essayComments).omit({ id: true, approved: true, ipHash: true, createdAt: true });
export type InsertEssayComment = z.infer<typeof insertEssayCommentSchema>;
export type EssayComment = typeof essayComments.$inferSelect;

export const collections = pgTable("collections", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: varchar("name").notNull(),
  slug: varchar("slug").notNull(),
  description: text("description"),
  isPublic: boolean("is_public").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique("uq_collections_user_slug").on(table.userId, table.slug),
  index("idx_collections_user_id").on(table.userId),
  index("idx_collections_slug").on(table.slug),
]);

export const insertCollectionSchema = createInsertSchema(collections).omit({ id: true, createdAt: true });
export type InsertCollection = z.infer<typeof insertCollectionSchema>;
export type Collection = typeof collections.$inferSelect;

export const collectionItems = pgTable("collection_items", {
  id: serial("id").primaryKey(),
  collectionId: integer("collection_id").notNull(),
  essayId: integer("essay_id"),
  projectId: integer("project_id"),
  addedAt: timestamp("added_at").defaultNow(),
}, (table) => [
  index("idx_collection_items_collection_id").on(table.collectionId),
]);

export type CollectionItem = typeof collectionItems.$inferSelect;

export const verifiedApplications = pgTable("verified_applications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  bio: text("bio").notNull(),
  writingSamples: text("writing_samples"),
  socialLinks: text("social_links"),
  status: varchar("status").default("pending").notNull(),
  adminNote: text("admin_note"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_verified_apps_user_id").on(table.userId),
  index("idx_verified_apps_status").on(table.status),
]);

export const insertVerifiedApplicationSchema = createInsertSchema(verifiedApplications).omit({ id: true, status: true, adminNote: true, reviewedAt: true, createdAt: true });
export type InsertVerifiedApplication = z.infer<typeof insertVerifiedApplicationSchema>;
export type VerifiedApplication = typeof verifiedApplications.$inferSelect;

export const authorFollows = pgTable("author_follows", {
  id: serial("id").primaryKey(),
  followerId: varchar("follower_id").notNull(),
  followingId: varchar("following_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique("uq_author_follows").on(table.followerId, table.followingId),
  index("idx_author_follows_follower").on(table.followerId),
  index("idx_author_follows_following").on(table.followingId),
]);

export type AuthorFollow = typeof authorFollows.$inferSelect;

// ── Daily Writing Prompts ────────────────────────────────────────────────────
export const dailyPrompts = pgTable("daily_prompts", {
  id: serial("id").primaryKey(),
  promptText: text("prompt_text").notNull(),
  promptDate: varchar("prompt_date", { length: 10 }).notNull().unique(), // YYYY-MM-DD
  active: boolean("active").notNull().default(true),
  winnerId: varchar("winner_id"),
  winnerEntryId: integer("winner_entry_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_daily_prompts_date").on(table.promptDate),
]);

export const insertDailyPromptSchema = createInsertSchema(dailyPrompts).omit({ id: true, winnerId: true, winnerEntryId: true, createdAt: true });
export type InsertDailyPrompt = z.infer<typeof insertDailyPromptSchema>;
export type DailyPrompt = typeof dailyPrompts.$inferSelect;

export const dailyPromptEntries = pgTable("daily_prompt_entries", {
  id: serial("id").primaryKey(),
  promptId: integer("prompt_id").notNull().references(() => dailyPrompts.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique("uq_prompt_user").on(table.promptId, table.userId),
  index("idx_prompt_entries_prompt").on(table.promptId),
  index("idx_prompt_entries_user").on(table.userId),
]);

export const insertDailyPromptEntrySchema = createInsertSchema(dailyPromptEntries).omit({ id: true, createdAt: true });
export type InsertDailyPromptEntry = z.infer<typeof insertDailyPromptEntrySchema>;
export type DailyPromptEntry = typeof dailyPromptEntries.$inferSelect;

// ── Author Tips ──────────────────────────────────────────────────────────────
export const authorTips = pgTable("author_tips", {
  id: serial("id").primaryKey(),
  fromUserId: varchar("from_user_id"),
  toAuthorId: varchar("to_author_id").notNull(),
  projectId: integer("project_id"),
  amountCents: integer("amount_cents").notNull(),
  stripeSessionId: varchar("stripe_session_id"),
  status: varchar("status").notNull().default("pending"), // pending | completed | failed
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_author_tips_to").on(table.toAuthorId),
  index("idx_author_tips_session").on(table.stripeSessionId),
]);

export type AuthorTip = typeof authorTips.$inferSelect;

// ── Content Series ───────────────────────────────────────────────────────────
export const contentSeries = pgTable("content_series", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_content_series_user").on(table.userId),
]);

export const insertContentSeriesSchema = createInsertSchema(contentSeries).omit({ id: true, createdAt: true });
export type InsertContentSeries = z.infer<typeof insertContentSeriesSchema>;
export type ContentSeries = typeof contentSeries.$inferSelect;

export const seriesItems = pgTable("series_items", {
  id: serial("id").primaryKey(),
  seriesId: integer("series_id").notNull().references(() => contentSeries.id, { onDelete: "cascade" }),
  projectId: integer("project_id").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique("uq_series_project").on(table.seriesId, table.projectId),
  index("idx_series_items_series").on(table.seriesId),
]);

export type SeriesItem = typeof seriesItems.$inferSelect;

// ── Email Subscriptions (non-platform followers) ─────────────────────────────
export const emailSubscriptions = pgTable("email_subscriptions", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  authorId: varchar("author_id", { length: 255 }).notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique("uq_email_author").on(table.email, table.authorId),
  index("idx_email_subs_author").on(table.authorId),
  index("idx_email_subs_token").on(table.token),
]);

export type EmailSubscription = typeof emailSubscriptions.$inferSelect;

// ── Social Media Hub (Abu Hashim) ─────────────────────────────────────────────
export const socialPosts = pgTable("social_posts", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  platforms: text("platforms").array().notNull(),
  scheduledAt: timestamp("scheduled_at"),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  postType: varchar("post_type", { length: 30 }).notNull().default("marketing"),
  coverImageUrl: text("cover_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_social_posts_status").on(table.status),
  index("idx_social_posts_scheduled").on(table.scheduledAt),
]);

export const insertSocialPostSchema = createInsertSchema(socialPosts).omit({ id: true, createdAt: true });
export type InsertSocialPost = z.infer<typeof insertSocialPostSchema>;
export type SocialPost = typeof socialPosts.$inferSelect;

export const socialPostInsights = pgTable("social_post_insights", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => socialPosts.id, { onDelete: "cascade" }),
  likes: integer("likes").notNull().default(0),
  shares: integer("shares").notNull().default(0),
  reach: integer("reach").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  comments: integer("comments").notNull().default(0),
  loggedAt: timestamp("logged_at").defaultNow(),
}, (table) => [
  index("idx_social_insights_post").on(table.postId),
]);

export const insertSocialPostInsightSchema = createInsertSchema(socialPostInsights).omit({ id: true, loggedAt: true });
export type InsertSocialPostInsight = z.infer<typeof insertSocialPostInsightSchema>;
export type SocialPostInsight = typeof socialPostInsights.$inferSelect;

export const writingChallenges = pgTable("writing_challenges", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  theme: text("theme"),
  projectType: varchar("project_type", { length: 50 }).default("essay"),
  prizeDescription: text("prize_description"),
  startDate: timestamp("start_date").default(sql`CURRENT_TIMESTAMP`).notNull(),
  endDate: timestamp("end_date").notNull(),
  winnerId: varchar("winner_id"),
  winnerEntryId: integer("winner_entry_id"),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_challenges_end_date").on(table.endDate),
]);

export const insertWritingChallengeSchema = createInsertSchema(writingChallenges).omit({ id: true, createdAt: true, winnerId: true, winnerEntryId: true });
export type InsertWritingChallenge = z.infer<typeof insertWritingChallengeSchema>;
export type WritingChallenge = typeof writingChallenges.$inferSelect;

export const challengeEntries = pgTable("challenge_entries", {
  id: serial("id").primaryKey(),
  challengeId: integer("challenge_id").notNull().references(() => writingChallenges.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_challenge_entries_challenge").on(table.challengeId),
  unique("unique_challenge_user").on(table.challengeId, table.userId),
]);

export const insertChallengeEntrySchema = createInsertSchema(challengeEntries).omit({ id: true, createdAt: true });
export type InsertChallengeEntry = z.infer<typeof insertChallengeEntrySchema>;
export type ChallengeEntry = typeof challengeEntries.$inferSelect;

export const betaReaderRequests = pgTable("beta_reader_requests", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => novelProjects.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull(),
  message: text("message"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_beta_reader_project").on(table.projectId),
  unique("unique_beta_reader_project_user").on(table.projectId, table.userId),
]);

export const insertBetaReaderRequestSchema = createInsertSchema(betaReaderRequests).omit({ id: true, createdAt: true });
export type InsertBetaReaderRequest = z.infer<typeof insertBetaReaderRequestSchema>;
export type BetaReaderRequest = typeof betaReaderRequests.$inferSelect;

export const chapterUnlocks = pgTable("chapter_unlocks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  chapterId: integer("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  stripeSessionId: text("stripe_session_id"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  unique("unique_chapter_unlock_user").on(table.userId, table.chapterId),
  index("idx_chapter_unlocks_user").on(table.userId),
]);

export const insertChapterUnlockSchema = createInsertSchema(chapterUnlocks).omit({ id: true, createdAt: true });
export type InsertChapterUnlock = z.infer<typeof insertChapterUnlockSchema>;
export type ChapterUnlock = typeof chapterUnlocks.$inferSelect;

export const giftSubscriptions = pgTable("gift_subscriptions", {
  id: serial("id").primaryKey(),
  gifterUserId: varchar("gifter_user_id").notNull(),
  gifterEmail: varchar("gifter_email").notNull(),
  recipientEmail: varchar("recipient_email").notNull(),
  plan: varchar("plan").notNull(),
  token: varchar("token").notNull(),
  redeemed: boolean("redeemed").notNull().default(false),
  redeemedBy: varchar("redeemed_by"),
  stripeSessionId: text("stripe_session_id"),
  paid: boolean("paid").notNull().default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  redeemedAt: timestamp("redeemed_at"),
}, (table) => [
  unique("unique_gift_token").on(table.token),
  index("idx_gifts_gifter").on(table.gifterUserId),
]);

export const insertGiftSubscriptionSchema = createInsertSchema(giftSubscriptions).omit({ id: true, createdAt: true, redeemed: true, redeemedBy: true, redeemedAt: true, paid: true });
export type InsertGiftSubscription = z.infer<typeof insertGiftSubscriptionSchema>;
export type GiftSubscription = typeof giftSubscriptions.$inferSelect;

export const userPoints = pgTable("user_points", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  balance: integer("balance").notNull().default(0),
}, (table) => [
  unique("unique_user_points").on(table.userId),
]);

export type UserPoints = typeof userPoints.$inferSelect;

export const pointTransactions = pgTable("point_transactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  points: integer("points").notNull(),
  reason: text("reason").notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_point_tx_user").on(table.userId),
]);

export const insertPointTransactionSchema = createInsertSchema(pointTransactions).omit({ id: true, createdAt: true });
export type InsertPointTransaction = z.infer<typeof insertPointTransactionSchema>;
export type PointTransaction = typeof pointTransactions.$inferSelect;

export const POINTS_PER_CHAPTER_READ = 10;
export const POINTS_PER_REFERRAL = 50;
export const POINTS_REDEMPTION_THRESHOLD = 500;
export const POINTS_DISCOUNT_PERCENT = 10;

export const newsletterSends = pgTable("newsletter_sends", {
  id: serial("id").primaryKey(),
  authorId: varchar("author_id").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  recipientCount: integer("recipient_count").notNull().default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_newsletter_sends_author").on(table.authorId),
]);

export const insertNewsletterSendSchema = createInsertSchema(newsletterSends).omit({ id: true, createdAt: true });
export type InsertNewsletterSend = z.infer<typeof insertNewsletterSendSchema>;
export type NewsletterSend = typeof newsletterSends.$inferSelect;

export const payoutSettings = pgTable("payout_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  method: varchar("method", { length: 30 }).notNull(),
  paypalEmail: text("paypal_email"),
  bankAccountName: text("bank_account_name"),
  bankIban: text("bank_iban"),
  bankSwift: text("bank_swift"),
  bankCountry: text("bank_country"),
  stripeConnectId: text("stripe_connect_id"),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertPayoutSettingsSchema = createInsertSchema(payoutSettings).omit({ id: true, updatedAt: true });
export type InsertPayoutSettings = z.infer<typeof insertPayoutSettingsSchema>;
export type PayoutSettings = typeof payoutSettings.$inferSelect;
