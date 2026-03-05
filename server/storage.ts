import {
  novelProjects, characters, characterRelationships, chapters, chapterVersions,
  users, supportTickets, ticketReplies, notifications, promoCodes, readingProgress, bookmarks, projectFavorites, apiUsageLogs,
  authorRatings, platformReviews, trackingPixels, essayViews, essayClicks, passwordResetTokens,
  type NovelProject, type InsertNovelProject,
  type Character, type InsertCharacter,
  type CharacterRelationship,
  type Chapter, type InsertChapter,
  type ChapterVersion,
  type User, type UpsertUser,
  type SupportTicket, type InsertSupportTicket,
  type TicketReply, type InsertTicketReply,
  type Notification, type PromoCode, type ReadingProgress, type Bookmark, type ProjectFavorite,
  type InsertApiUsageLog, type ApiUsageLog,
  type InsertPlatformReview, type PlatformReview, type AuthorRating,
  type InsertTrackingPixel, type TrackingPixel,
  type EssayView, type EssayClick, type PasswordResetToken,
  essayReactions, type EssayReaction,
  socialMediaLinks, type SocialMediaLink, type InsertSocialMediaLink,
  platformFeatures, type PlatformFeature,
  contentReports, type ContentReport, type InsertContentReport,
  knowledgeEntries, type KnowledgeEntry, type InsertKnowledgeEntry,
  learningSessions, type LearningSession, type InsertLearningSession,
  webhookDeliveries, type WebhookDelivery, type InsertWebhookDelivery,
  PLAN_PRICES,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, asc, desc, sql, count, isNotNull, avg, lt, inArray, like, or } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserStripeCustomerId(userId: string, stripeCustomerId: string): Promise<User>;
  getProjectsByUser(userId: string): Promise<NovelProject[]>;
  getProject(id: number): Promise<NovelProject | undefined>;
  getProjectWithDetails(id: number): Promise<(NovelProject & { characters: Character[]; chapters: Chapter[]; relationships: CharacterRelationship[] }) | undefined>;
  createProject(project: InsertNovelProject & { allowedWords: number; price: number }): Promise<NovelProject>;
  updateProject(id: number, data: Partial<NovelProject>): Promise<NovelProject>;
  updateProjectPayment(projectId: number, paid: boolean): Promise<NovelProject>;
  incrementUsedWords(projectId: number, words: number): Promise<NovelProject>;
  createCharacter(character: InsertCharacter): Promise<Character>;
  getCharactersByProject(projectId: number): Promise<Character[]>;
  createRelationship(data: { projectId: number; character1Id: number; character2Id: number; relationship: string }): Promise<CharacterRelationship>;
  createChapter(chapter: InsertChapter): Promise<Chapter>;
  getChaptersByProject(projectId: number): Promise<Chapter[]>;
  getChapter(id: number): Promise<Chapter | undefined>;
  updateChapter(id: number, data: Partial<Chapter>): Promise<Chapter>;
  deleteChapter(id: number): Promise<void>;
  updateUserPlan(userId: string, plan: string): Promise<User>;
  updateUserProfile(userId: string, data: { firstName?: string; lastName?: string }): Promise<User>;
  createTicket(ticket: InsertSupportTicket): Promise<SupportTicket>;
  getTicketsByUser(userId: string): Promise<SupportTicket[]>;
  getTicket(id: number): Promise<SupportTicket | undefined>;
  getAllTickets(status?: string): Promise<SupportTicket[]>;
  updateTicketStatus(id: number, status: string): Promise<SupportTicket>;
  updateTicketPriority(id: number, priority: string): Promise<SupportTicket>;
  createTicketReply(reply: InsertTicketReply): Promise<TicketReply>;
  getTicketReplies(ticketId: number): Promise<TicketReply[]>;
  getTicketStats(): Promise<{ status: string; count: number }[]>;
  getAllUsers(): Promise<User[]>;
  getExpiredTrialUsers(): Promise<User[]>;
  getUserProjectCount(userId: string): Promise<number>;
  toggleFavorite(userId: string, projectId: number): Promise<{ favorited: boolean }>;
  getFavoritesByUser(userId: string): Promise<number[]>;
  createApiUsageLog(data: InsertApiUsageLog): Promise<ApiUsageLog>;
  getAggregatedApiUsage(): Promise<Array<{ userId: string; email: string | null; displayName: string | null; totalCalls: number; totalTokens: number; totalCostMicro: number; apiSuspended: boolean }>>;
  getUserApiUsageLogs(userId: string): Promise<ApiUsageLog[]>;
  setUserApiSuspended(userId: string, suspended: boolean): Promise<User>;
  rateAuthor(authorId: string, visitorIp: string, rating: number): Promise<void>;
  getAuthorAverageRating(authorId: string): Promise<{ average: number; count: number }>;
  createPlatformReview(data: InsertPlatformReview): Promise<PlatformReview>;
  getApprovedReviews(): Promise<PlatformReview[]>;
  getPendingReviews(): Promise<PlatformReview[]>;
  approvePlatformReview(id: number): Promise<PlatformReview>;
  deletePlatformReview(id: number): Promise<void>;
  getTrackingPixels(): Promise<TrackingPixel[]>;
  upsertTrackingPixel(data: InsertTrackingPixel): Promise<TrackingPixel>;
  updateUserTrial(userId: string, data: Partial<User>): Promise<User>;
  grantAnalysisUses(projectId: number, continuityUses: number, styleUses: number): Promise<void>;
  grantAnalysisUsesForAllProjects(userId: string, continuityUses: number, styleUses: number): Promise<void>;
  recordEssayView(projectId: number, visitorIp: string, referrer?: string): Promise<void>;
  recordEssayClick(projectId: number, visitorIp: string): Promise<void>;
  getEssayViewCount(projectId: number): Promise<number>;
  getEssayClickCount(projectId: number): Promise<number>;
  getEssayAnalytics(): Promise<Array<{ projectId: number; title: string; views: number; clicks: number }>>;
  getMemoireAnalytics(): Promise<Array<{ projectId: number; title: string; university: string | null; memoireField: string | null; memoireMethodology: string | null; memoireCountry: string | null; views: number; clicks: number }>>;
  getAllReviews(): Promise<PlatformReview[]>;
  updatePromoCode(id: number, data: Partial<{ discountPercent: number; maxUses: number | null; validUntil: Date | null; applicableTo: string; active: boolean }>): Promise<PromoCode>;
  deletePromoCode(id: number): Promise<void>;
  createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(token: string): Promise<void>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<void>;
  upsertEssayReaction(projectId: number, visitorIp: string, reactionType: string): Promise<void>;
  getEssayReactionCounts(projectId: number): Promise<Record<string, number>>;
  getPublishedEssays(): Promise<NovelProject[]>;
  getSocialMediaLinks(): Promise<SocialMediaLink[]>;
  getEnabledSocialMediaLinks(): Promise<SocialMediaLink[]>;
  upsertSocialMediaLink(data: InsertSocialMediaLink): Promise<SocialMediaLink>;
  deleteSocialMediaLink(id: number): Promise<void>;
  getAllFeatures(): Promise<PlatformFeature[]>;
  getFeature(key: string): Promise<PlatformFeature | undefined>;
  updateFeature(key: string, data: Partial<PlatformFeature>): Promise<PlatformFeature>;
  isFeatureEnabled(key: string, userId?: string): Promise<boolean>;
  seedDefaultFeatures(): Promise<void>;
  deleteProject(id: number): Promise<void>;
  createContentReport(report: InsertContentReport): Promise<ContentReport>;
  getContentReports(status?: string): Promise<(ContentReport & { projectTitle?: string })[]>;
  getContentReport(id: number): Promise<ContentReport | undefined>;
  updateContentReport(id: number, updates: Partial<ContentReport>): Promise<ContentReport>;
  getReportCountForProject(projectId: number): Promise<number>;
  getRecentReportCountByIp(ip: string, windowMs: number): Promise<number>;
  getReportsForProject(projectId: number): Promise<ContentReport[]>;
  getReportStats(): Promise<{
    total: number;
    pending: number;
    bySeverity: Record<string, number>;
    byReason: Record<string, number>;
    resolvedThisWeek: number;
  }>;
  checkAndResetFreeMonthly(userId: string): Promise<{ projectsUsed: number; generationsUsed: number }>;
  incrementFreeMonthlyUsage(userId: string, type: "project" | "generation"): Promise<void>;
  createKnowledgeEntry(data: InsertKnowledgeEntry): Promise<KnowledgeEntry>;
  getKnowledgeEntries(filters: { category?: string; contentType?: string; validated?: boolean; rejected?: boolean; search?: string; limit?: number; offset?: number }): Promise<KnowledgeEntry[]>;
  updateKnowledgeEntry(id: number, data: Partial<KnowledgeEntry>): Promise<KnowledgeEntry>;
  deleteKnowledgeEntry(id: number): Promise<void>;
  createLearningSession(data: InsertLearningSession): Promise<LearningSession>;
  updateLearningSession(id: number, data: Partial<LearningSession>): Promise<LearningSession>;
  getLearningSessions(limit?: number): Promise<LearningSession[]>;
  getLearningStats(): Promise<{ totalEntries: number; validatedEntries: number; rejectedEntries: number; pendingEntries: number; totalSessions: number; lastSessionDate: string | null }>;
  createWebhookDelivery(data: InsertWebhookDelivery): Promise<WebhookDelivery>;
  updateWebhookDelivery(id: number, data: Partial<WebhookDelivery>): Promise<WebhookDelivery>;
  getWebhookDeliveries(limit?: number): Promise<WebhookDelivery[]>;
  getPendingWebhookRetries(): Promise<WebhookDelivery[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    const ADMIN_USER_IDS = ["39706084", "e482facd-d157-4e97-ad91-af96b8ec8f49"];
    const [existing] = await db.select().from(users).where(eq(users.id, user.id!));
    if (existing) {
      const updateData: any = { ...user, updatedAt: new Date() };
      if (ADMIN_USER_IDS.includes(user.id!) && existing.role !== "admin") {
        updateData.role = "admin";
      }
      const [updated] = await db.update(users).set(updateData).where(eq(users.id, user.id!)).returning();
      return updated;
    }
    const insertData: any = { ...user };
    if (ADMIN_USER_IDS.includes(user.id!)) {
      insertData.role = "admin";
    }
    const [created] = await db.insert(users).values(insertData).returning();
    return created;
  }

  async updateUserStripeCustomerId(userId: string, stripeCustomerId: string): Promise<User> {
    const [updated] = await db.update(users).set({
      stripeCustomerId,
      updatedAt: new Date(),
    }).where(eq(users.id, userId)).returning();
    return updated;
  }

  async getProjectsByUser(userId: string): Promise<NovelProject[]> {
    return db.select().from(novelProjects).where(eq(novelProjects.userId, userId)).orderBy(asc(novelProjects.createdAt));
  }

  async getProject(id: number): Promise<NovelProject | undefined> {
    const [project] = await db.select().from(novelProjects).where(eq(novelProjects.id, id));
    return project;
  }

  async getProjectWithDetails(id: number) {
    const project = await this.getProject(id);
    if (!project) return undefined;

    const [chars, chaps, rels] = await Promise.all([
      this.getCharactersByProject(id),
      this.getChaptersByProject(id),
      db.select().from(characterRelationships).where(eq(characterRelationships.projectId, id)),
    ]);

    return { ...project, characters: chars, chapters: chaps, relationships: rels };
  }

  async createProject(project: InsertNovelProject): Promise<NovelProject> {
    const [created] = await db.insert(novelProjects).values(project).returning();
    return created;
  }

  async updateProject(id: number, data: Partial<NovelProject>): Promise<NovelProject> {
    const [updated] = await db.update(novelProjects).set({ ...data, updatedAt: new Date() }).where(eq(novelProjects.id, id)).returning();
    return updated;
  }

  async updateProjectPayment(projectId: number, paid: boolean): Promise<NovelProject> {
    const [updated] = await db.update(novelProjects).set({
      paid,
      status: paid ? "draft" : "locked",
      updatedAt: new Date(),
    }).where(eq(novelProjects.id, projectId)).returning();
    return updated;
  }

  async incrementUsedWords(projectId: number, words: number): Promise<NovelProject> {
    const [updated] = await db.update(novelProjects).set({
      usedWords: sql`${novelProjects.usedWords} + ${words}`,
      updatedAt: new Date(),
    }).where(eq(novelProjects.id, projectId)).returning();
    return updated;
  }

  async createCharacter(character: InsertCharacter): Promise<Character> {
    const [created] = await db.insert(characters).values(character).returning();
    return created;
  }

  async getCharactersByProject(projectId: number): Promise<Character[]> {
    return db.select().from(characters).where(eq(characters.projectId, projectId));
  }

  async createRelationship(data: { projectId: number; character1Id: number; character2Id: number; relationship: string }): Promise<CharacterRelationship> {
    const [created] = await db.insert(characterRelationships).values(data).returning();
    return created;
  }

  async createChapter(chapter: InsertChapter): Promise<Chapter> {
    const [created] = await db.insert(chapters).values(chapter).returning();
    return created;
  }

  async getChaptersByProject(projectId: number): Promise<Chapter[]> {
    return db.select().from(chapters).where(eq(chapters.projectId, projectId)).orderBy(asc(chapters.chapterNumber));
  }

  async getChapter(id: number): Promise<Chapter | undefined> {
    const [chapter] = await db.select().from(chapters).where(eq(chapters.id, id));
    return chapter;
  }

  async updateChapter(id: number, data: Partial<Chapter>): Promise<Chapter> {
    const [updated] = await db.update(chapters).set(data).where(eq(chapters.id, id)).returning();
    return updated;
  }

  async deleteChapter(id: number): Promise<void> {
    await db.delete(chapters).where(eq(chapters.id, id));
  }

  async updateUserPlan(userId: string, plan: string): Promise<User> {
    const [updated] = await db.update(users).set({
      plan,
      planPurchasedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(users.id, userId)).returning();
    return updated;
  }

  async updateUserProfile(userId: string, data: { firstName?: string; lastName?: string }): Promise<User> {
    const [updated] = await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, userId)).returning();
    return updated;
  }

  async createTicket(ticket: InsertSupportTicket): Promise<SupportTicket> {
    const [created] = await db.insert(supportTickets).values(ticket).returning();
    return created;
  }

  async getTicketsByUser(userId: string): Promise<SupportTicket[]> {
    return db.select().from(supportTickets).where(eq(supportTickets.userId, userId)).orderBy(desc(supportTickets.createdAt));
  }

  async getTicket(id: number): Promise<SupportTicket | undefined> {
    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, id));
    return ticket;
  }

  async getAllTickets(status?: string): Promise<SupportTicket[]> {
    if (status) {
      return db.select().from(supportTickets).where(eq(supportTickets.status, status)).orderBy(desc(supportTickets.createdAt));
    }
    return db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt));
  }

  async updateTicketStatus(id: number, status: string): Promise<SupportTicket> {
    const [updated] = await db.update(supportTickets).set({ status, updatedAt: new Date() }).where(eq(supportTickets.id, id)).returning();
    return updated;
  }

  async updateTicketPriority(id: number, priority: string): Promise<SupportTicket> {
    const [updated] = await db.update(supportTickets).set({ priority, updatedAt: new Date() }).where(eq(supportTickets.id, id)).returning();
    return updated;
  }

  async createTicketReply(reply: InsertTicketReply): Promise<TicketReply> {
    const [created] = await db.insert(ticketReplies).values(reply).returning();
    await db.update(supportTickets).set({ updatedAt: new Date() }).where(eq(supportTickets.id, reply.ticketId));
    return created;
  }

  async getTicketReplies(ticketId: number): Promise<TicketReply[]> {
    return db.select().from(ticketReplies).where(eq(ticketReplies.ticketId, ticketId)).orderBy(asc(ticketReplies.createdAt));
  }

  async getTicketStats(): Promise<{ status: string; count: number }[]> {
    const result = await db.execute(
      sql`SELECT status, COUNT(*)::int as count FROM support_tickets GROUP BY status`
    );
    return result.rows as { status: string; count: number }[];
  }

  async saveChapterVersion(chapterId: number, content: string, source: string): Promise<ChapterVersion> {
    const [created] = await db.insert(chapterVersions).values({ chapterId, content, source }).returning();
    const existing = await db.select().from(chapterVersions)
      .where(eq(chapterVersions.chapterId, chapterId))
      .orderBy(desc(chapterVersions.savedAt));
    if (existing.length > 5) {
      const toDelete = existing.slice(5);
      for (const v of toDelete) {
        await db.delete(chapterVersions).where(eq(chapterVersions.id, v.id));
      }
    }
    return created;
  }

  async getChapterVersions(chapterId: number): Promise<ChapterVersion[]> {
    return db.select().from(chapterVersions)
      .where(eq(chapterVersions.chapterId, chapterId))
      .orderBy(desc(chapterVersions.savedAt));
  }

  async restoreChapterVersion(chapterId: number, versionId: number): Promise<Chapter> {
    const [version] = await db.select().from(chapterVersions).where(eq(chapterVersions.id, versionId));
    if (!version || version.chapterId !== chapterId) throw new Error("Version not found");
    const chapter = await this.getChapter(chapterId);
    if (!chapter) throw new Error("Chapter not found");
    if (chapter.content) {
      await this.saveChapterVersion(chapterId, chapter.content, "before_restore");
    }
    const [updated] = await db.update(chapters).set({ content: version.content }).where(eq(chapters.id, chapterId)).returning();
    return updated;
  }

  async getProjectByShareToken(token: string): Promise<NovelProject | undefined> {
    const [project] = await db.select().from(novelProjects).where(eq(novelProjects.shareToken, token));
    return project;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getExpiredTrialUsers(): Promise<User[]> {
    return db.select().from(users).where(
      and(
        eq(users.plan, "trial"),
        eq(users.trialActive, true),
        lt(users.trialEndsAt, new Date())
      )
    );
  }

  async getUserProjectCount(userId: string): Promise<number> {
    const result = await db.select({ value: count() }).from(novelProjects).where(eq(novelProjects.userId, userId));
    return result[0]?.value || 0;
  }

  async getAnalytics(): Promise<{
    totalUsers: number;
    totalProjects: number;
    projectsByType: { type: string; count: number }[];
    planBreakdown: { plan: string; count: number }[];
    revenueData?: any;
  }> {
    const [totalUsersResult, totalProjectsResult, projectsByType, planBreakdown] = await Promise.all([
      db.select({ value: count() }).from(users),
      db.select({ value: count() }).from(novelProjects),
      db.execute(sql`SELECT COALESCE(project_type, 'novel') as type, COUNT(*)::int as count FROM novel_projects GROUP BY COALESCE(project_type, 'novel')`),
      db.execute(sql`SELECT COALESCE(plan, 'free') as plan, COUNT(*)::int as count FROM users GROUP BY COALESCE(plan, 'free')`),
    ]);

    let revenueData = null;
    try {
      const totalRevenue = await db.execute(
        sql`SELECT COALESCE(SUM(price), 0)::int as total FROM novel_projects WHERE paid = true`
      );
      const monthlyRevenue = await db.execute(
        sql`SELECT COALESCE(SUM(price), 0)::int as total FROM novel_projects WHERE paid = true AND updated_at >= date_trunc('month', CURRENT_DATE)`
      );
      const revenueByType = await db.execute(
        sql`SELECT COALESCE(project_type, 'novel') as type, COALESCE(SUM(price), 0)::int as amount, COUNT(*)::int as count FROM novel_projects WHERE paid = true GROUP BY COALESCE(project_type, 'novel')`
      );
      const paidPlans = await db.execute(
        sql`SELECT COALESCE(plan, 'free') as plan, COUNT(*)::int as count FROM users WHERE plan != 'free' AND plan IS NOT NULL AND plan_purchased_at IS NOT NULL GROUP BY plan`
      );
      const paidPlansWithRevenue = paidPlans.rows.map((row: any) => ({
        plan: row.plan,
        count: row.count,
        revenue: (row.count || 0) * (PLAN_PRICES[row.plan] || 0),
      }));
      revenueData = {
        totalRevenue: (totalRevenue.rows[0] as any)?.total || 0,
        monthlyRevenue: (monthlyRevenue.rows[0] as any)?.total || 0,
        revenueByType: revenueByType.rows,
        paidPlans: paidPlansWithRevenue,
      };
    } catch (e) {
      console.error("Error fetching revenue data:", e);
    }

    let totalWords = 0;
    let writingActivity: { date: string; words: number; projects: number }[] = [];
    let topWriters: { userId: string; name: string; words: number }[] = [];
    try {
      const [totalWordsResult, dailyActivity, topWritersResult] = await Promise.all([
        db.execute(sql`SELECT COALESCE(SUM(array_length(regexp_split_to_array(TRIM(content), '\s+'), 1)), 0)::int as total FROM chapters WHERE content IS NOT NULL AND TRIM(content) != ''`),
        db.execute(sql`
          SELECT c.created_at::date as day,
            SUM(array_length(regexp_split_to_array(TRIM(c.content), '\s+'), 1))::int as words,
            COUNT(DISTINCT c.project_id)::int as projects
          FROM chapters c
          WHERE c.content IS NOT NULL AND TRIM(c.content) != '' AND c.created_at >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY c.created_at::date ORDER BY day
        `),
        db.execute(sql`
          SELECT p.user_id as "userId",
            COALESCE(u.display_name, TRIM(CONCAT(u.first_name, ' ', u.last_name)), u.email, 'مجهول') as name,
            SUM(array_length(regexp_split_to_array(TRIM(c.content), '\s+'), 1))::int as words
          FROM chapters c
          INNER JOIN novel_projects p ON c.project_id = p.id
          INNER JOIN users u ON p.user_id = u.id
          WHERE c.content IS NOT NULL AND TRIM(c.content) != ''
          GROUP BY p.user_id, u.display_name, u.first_name, u.last_name, u.email
          ORDER BY words DESC LIMIT 5
        `),
      ]);

      totalWords = (totalWordsResult.rows[0] as any)?.total || 0;

      const dailyMap = new Map<string, { words: number; projects: number }>();
      for (const row of dailyActivity.rows as any[]) {
        dailyMap.set(new Date(row.day).toISOString().split("T")[0], { words: row.words || 0, projects: row.projects || 0 });
      }
      const today = new Date();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        const entry = dailyMap.get(key);
        writingActivity.push({ date: key, words: entry?.words || 0, projects: entry?.projects || 0 });
      }

      topWriters = (topWritersResult.rows as any[]).map((r: any) => ({
        userId: r.userId,
        name: r.name || 'مجهول',
        words: r.words || 0,
      }));
    } catch (e) {
      console.error("Error fetching extended analytics:", e);
    }

    return {
      totalUsers: totalUsersResult[0]?.value || 0,
      totalProjects: totalProjectsResult[0]?.value || 0,
      projectsByType: projectsByType.rows as { type: string; count: number }[],
      planBreakdown: planBreakdown.rows as { plan: string; count: number }[],
      revenueData,
      totalWords,
      writingActivity,
      topWriters,
    };
  }

  async createNotification(data: { userId: string; type: string; title: string; message: string; link?: string }): Promise<Notification> {
    const [created] = await db.insert(notifications).values(data).returning();
    return created;
  }

  async getNotificationsByUser(userId: string, limit = 50): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit);
  }

  async markNotificationRead(id: number): Promise<Notification> {
    const [updated] = await db.update(notifications).set({ read: true }).where(eq(notifications.id, id)).returning();
    return updated;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ read: true }).where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db.select({ value: count() }).from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
    return result[0]?.value || 0;
  }

  async createPromoCode(data: { code: string; discountPercent: number; maxUses?: number; validUntil?: Date; applicableTo?: string }): Promise<PromoCode> {
    const [created] = await db.insert(promoCodes).values(data).returning();
    return created;
  }

  async getPromoCode(code: string): Promise<PromoCode | undefined> {
    const [promo] = await db.select().from(promoCodes).where(eq(promoCodes.code, code.toUpperCase()));
    return promo;
  }

  async incrementPromoUsage(id: number): Promise<void> {
    await db.update(promoCodes).set({ usedCount: sql`${promoCodes.usedCount} + 1` }).where(eq(promoCodes.id, id));
  }

  async getAllPromoCodes(): Promise<PromoCode[]> {
    return db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
  }

  async upsertReadingProgress(userId: string, projectId: number, lastChapterId?: number, scrollPosition?: number): Promise<ReadingProgress> {
    const [existing] = await db.select().from(readingProgress).where(and(eq(readingProgress.userId, userId), eq(readingProgress.projectId, projectId)));
    if (existing) {
      const updateData: any = { updatedAt: new Date() };
      if (lastChapterId !== undefined) updateData.lastChapterId = lastChapterId;
      if (scrollPosition !== undefined) updateData.scrollPosition = scrollPosition;
      const [updated] = await db.update(readingProgress).set(updateData).where(eq(readingProgress.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(readingProgress).values({ userId, projectId, lastChapterId, scrollPosition: scrollPosition || 0 }).returning();
    return created;
  }

  async getReadingProgress(userId: string, projectId: number): Promise<ReadingProgress | undefined> {
    const [progress] = await db.select().from(readingProgress).where(and(eq(readingProgress.userId, userId), eq(readingProgress.projectId, projectId)));
    return progress;
  }

  async createBookmark(data: { userId: string; projectId: number; chapterId: number; note?: string }): Promise<Bookmark> {
    const [created] = await db.insert(bookmarks).values(data).returning();
    return created;
  }

  async getBookmarksByProject(userId: string, projectId: number): Promise<Bookmark[]> {
    return db.select().from(bookmarks).where(and(eq(bookmarks.userId, userId), eq(bookmarks.projectId, projectId))).orderBy(desc(bookmarks.createdAt));
  }

  async deleteBookmark(id: number): Promise<void> {
    await db.delete(bookmarks).where(eq(bookmarks.id, id));
  }

  async getPublicAuthor(userId: string): Promise<{ user: User; projects: NovelProject[] } | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || !user.publicProfile) return undefined;
    const sharedProjects = await db.select().from(novelProjects).where(and(eq(novelProjects.userId, userId), isNotNull(novelProjects.shareToken)));
    return { user, projects: sharedProjects };
  }

  async getGalleryProjects(): Promise<(NovelProject & { authorName: string; authorId: string; authorAverageRating: number })[]> {
    const projectsWithAuthors = await db.select({
      project: novelProjects,
      authorDisplayName: users.displayName,
      authorFirstName: users.firstName,
      authorLastName: users.lastName,
      authorId: users.id,
    }).from(novelProjects)
      .innerJoin(users, eq(novelProjects.userId, users.id))
      .where(and(isNotNull(novelProjects.shareToken), eq(novelProjects.publishedToGallery, true)))
      .orderBy(desc(novelProjects.updatedAt));

    const uniqueAuthorIds = [...new Set(projectsWithAuthors.map(r => r.authorId))];
    const ratingsMap = new Map<string, number>();
    if (uniqueAuthorIds.length > 0) {
      const ratingsResult = await db.select({
        authorId: authorRatings.authorId,
        average: sql<number>`coalesce(avg(${authorRatings.rating}), 0)::float`,
      }).from(authorRatings)
        .where(inArray(authorRatings.authorId, uniqueAuthorIds))
        .groupBy(authorRatings.authorId);
      for (const r of ratingsResult) {
        ratingsMap.set(r.authorId, Math.round((r.average || 0) * 10) / 10);
      }
    }

    const result = projectsWithAuthors.map(row => ({
      ...row.project,
      authorName: row.authorDisplayName || `${row.authorFirstName || ''} ${row.authorLastName || ''}`.trim() || 'كاتب مجهول',
      authorId: row.authorId,
      authorAverageRating: ratingsMap.get(row.authorId) || 0,
    }));
    result.sort((a, b) => b.authorAverageRating - a.authorAverageRating || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return result;
  }

  async updateUserProfileExtended(userId: string, data: { firstName?: string; lastName?: string; bio?: string; displayName?: string; publicProfile?: boolean; onboardingCompleted?: boolean; profileImageUrl?: string }): Promise<User> {
    const [updated] = await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, userId)).returning();
    return updated;
  }

  async toggleFavorite(userId: string, projectId: number): Promise<{ favorited: boolean }> {
    const [existing] = await db.select().from(projectFavorites).where(and(eq(projectFavorites.userId, userId), eq(projectFavorites.projectId, projectId)));
    if (existing) {
      await db.delete(projectFavorites).where(eq(projectFavorites.id, existing.id));
      return { favorited: false };
    }
    await db.insert(projectFavorites).values({ userId, projectId });
    return { favorited: true };
  }

  async getFavoritesByUser(userId: string): Promise<number[]> {
    const favs = await db.select({ projectId: projectFavorites.projectId }).from(projectFavorites).where(eq(projectFavorites.userId, userId)).orderBy(desc(projectFavorites.createdAt));
    return favs.map(f => f.projectId);
  }

  async createApiUsageLog(data: InsertApiUsageLog): Promise<ApiUsageLog> {
    const [log] = await db.insert(apiUsageLogs).values(data).returning();
    return log;
  }

  async getAggregatedApiUsage(): Promise<Array<{ userId: string; email: string | null; displayName: string | null; totalCalls: number; totalTokens: number; totalCostMicro: number; apiSuspended: boolean }>> {
    const rows = await db.select({
      userId: apiUsageLogs.userId,
      email: users.email,
      displayName: users.displayName,
      totalCalls: sql<number>`count(*)::int`,
      totalTokens: sql<number>`coalesce(sum(${apiUsageLogs.totalTokens}), 0)::int`,
      totalCostMicro: sql<number>`coalesce(sum(${apiUsageLogs.estimatedCostMicro}), 0)::int`,
      apiSuspended: users.apiSuspended,
    })
    .from(apiUsageLogs)
    .innerJoin(users, eq(apiUsageLogs.userId, users.id))
    .groupBy(apiUsageLogs.userId, users.email, users.displayName, users.apiSuspended)
    .orderBy(sql`sum(${apiUsageLogs.estimatedCostMicro}) desc`);
    return rows.map(r => ({ ...r, apiSuspended: r.apiSuspended ?? false }));
  }

  async getUserApiUsageLogs(userId: string): Promise<ApiUsageLog[]> {
    return db.select().from(apiUsageLogs).where(eq(apiUsageLogs.userId, userId)).orderBy(desc(apiUsageLogs.createdAt));
  }

  async setUserApiSuspended(userId: string, suspended: boolean): Promise<User> {
    const [updated] = await db.update(users).set({ apiSuspended: suspended, updatedAt: new Date() }).where(eq(users.id, userId)).returning();
    return updated;
  }

  async rateAuthor(authorId: string, visitorIp: string, rating: number): Promise<void> {
    await db.insert(authorRatings).values({ authorId, visitorIp, rating })
      .onConflictDoUpdate({
        target: [authorRatings.authorId, authorRatings.visitorIp],
        set: { rating },
      });
  }

  async getAuthorAverageRating(authorId: string): Promise<{ average: number; count: number }> {
    const [result] = await db.select({
      average: sql<number>`coalesce(avg(${authorRatings.rating}), 0)::float`,
      count: sql<number>`count(*)::int`,
    }).from(authorRatings).where(eq(authorRatings.authorId, authorId));
    return { average: Math.round((result?.average || 0) * 10) / 10, count: result?.count || 0 };
  }

  async createPlatformReview(data: InsertPlatformReview): Promise<PlatformReview> {
    const [review] = await db.insert(platformReviews).values(data).returning();
    return review;
  }

  async getApprovedReviews(): Promise<PlatformReview[]> {
    return db.select().from(platformReviews).where(eq(platformReviews.approved, true)).orderBy(desc(platformReviews.createdAt));
  }

  async getPendingReviews(): Promise<PlatformReview[]> {
    return db.select().from(platformReviews).where(eq(platformReviews.approved, false)).orderBy(desc(platformReviews.createdAt));
  }

  async approvePlatformReview(id: number): Promise<PlatformReview> {
    const [review] = await db.update(platformReviews).set({ approved: true }).where(eq(platformReviews.id, id)).returning();
    return review;
  }

  async deletePlatformReview(id: number): Promise<void> {
    await db.delete(platformReviews).where(eq(platformReviews.id, id));
  }

  async getTrackingPixels(): Promise<TrackingPixel[]> {
    return db.select().from(trackingPixels);
  }

  async upsertTrackingPixel(data: InsertTrackingPixel): Promise<TrackingPixel> {
    const [pixel] = await db.insert(trackingPixels)
      .values(data)
      .onConflictDoUpdate({
        target: trackingPixels.platform,
        set: {
          pixelId: data.pixelId,
          accessToken: data.accessToken,
          enabled: data.enabled,
          updatedAt: new Date(),
        },
      })
      .returning();
    return pixel;
  }

  async updateUserTrial(userId: string, data: Partial<User>): Promise<User> {
    const [updated] = await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, userId)).returning();
    return updated;
  }

  async grantAnalysisUses(projectId: number, continuityUses: number, styleUses: number): Promise<void> {
    await db.update(novelProjects).set({
      continuityCheckPaidCount: sql`COALESCE(${novelProjects.continuityCheckPaidCount}, 0) + ${continuityUses}`,
      styleAnalysisPaidCount: sql`COALESCE(${novelProjects.styleAnalysisPaidCount}, 0) + ${styleUses}`,
    }).where(eq(novelProjects.id, projectId));
  }

  async grantAnalysisUsesForAllProjects(userId: string, continuityUses: number, styleUses: number): Promise<void> {
    await db.update(novelProjects).set({
      continuityCheckPaidCount: sql`COALESCE(${novelProjects.continuityCheckPaidCount}, 0) + ${continuityUses}`,
      styleAnalysisPaidCount: sql`COALESCE(${novelProjects.styleAnalysisPaidCount}, 0) + ${styleUses}`,
    }).where(eq(novelProjects.userId, userId));
  }

  async recordEssayView(projectId: number, visitorIp: string, referrer?: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [existing] = await db.select().from(essayViews)
      .where(and(
        eq(essayViews.projectId, projectId),
        eq(essayViews.visitorIp, visitorIp),
        sql`${essayViews.viewedAt} >= ${today}`
      ));
    if (!existing) {
      await db.insert(essayViews).values({ projectId, visitorIp, referrer: referrer || null });
    }
  }

  async recordEssayClick(projectId: number, visitorIp: string): Promise<void> {
    await db.insert(essayClicks).values({ projectId, visitorIp });
  }

  async getEssayViewCount(projectId: number): Promise<number> {
    const [result] = await db.select({ count: count() }).from(essayViews).where(eq(essayViews.projectId, projectId));
    return result?.count || 0;
  }

  async getEssayClickCount(projectId: number): Promise<number> {
    const [result] = await db.select({ count: count() }).from(essayClicks).where(eq(essayClicks.projectId, projectId));
    return result?.count || 0;
  }

  async getEssayAnalytics(): Promise<Array<{ projectId: number; title: string; views: number; clicks: number }>> {
    const results = await db.execute(sql`
      SELECT p.id as "projectId", p.title,
        COALESCE(v.view_count, 0)::int as views,
        COALESCE(c.click_count, 0)::int as clicks
      FROM novel_projects p
      LEFT JOIN (SELECT project_id, COUNT(*)::int as view_count FROM essay_views GROUP BY project_id) v ON v.project_id = p.id
      LEFT JOIN (SELECT project_id, COUNT(*)::int as click_count FROM essay_clicks GROUP BY project_id) c ON c.project_id = p.id
      WHERE p.project_type = 'essay' AND p.share_token IS NOT NULL
      ORDER BY clicks DESC
    `);
    return results.rows as any[];
  }

  async getMemoireAnalytics(): Promise<Array<{ projectId: number; title: string; university: string | null; memoireField: string | null; memoireMethodology: string | null; memoireCountry: string | null; views: number; clicks: number }>> {
    const results = await db.execute(sql`
      SELECT p.id as "projectId", p.title,
        p.memoire_university as "university",
        p.memoire_field as "memoireField",
        p.memoire_methodology as "memoireMethodology",
        p.memoire_country as "memoireCountry",
        COALESCE(v.view_count, 0)::int as views,
        COALESCE(c.click_count, 0)::int as clicks
      FROM novel_projects p
      LEFT JOIN (SELECT project_id, COUNT(*)::int as view_count FROM essay_views GROUP BY project_id) v ON v.project_id = p.id
      LEFT JOIN (SELECT project_id, COUNT(*)::int as click_count FROM essay_clicks GROUP BY project_id) c ON c.project_id = p.id
      WHERE p.project_type = 'memoire' AND p.share_token IS NOT NULL
      ORDER BY clicks DESC
    `);
    return results.rows as any[];
  }

  async getAllReviews(): Promise<PlatformReview[]> {
    return db.select().from(platformReviews).orderBy(desc(platformReviews.createdAt));
  }

  async updatePromoCode(id: number, data: Partial<{ discountPercent: number; maxUses: number | null; validUntil: Date | null; applicableTo: string; active: boolean }>): Promise<PromoCode> {
    const [updated] = await db.update(promoCodes).set(data).where(eq(promoCodes.id, id)).returning();
    return updated;
  }

  async deletePromoCode(id: number): Promise<void> {
    await db.delete(promoCodes).where(eq(promoCodes.id, id));
  }

  async createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<PasswordResetToken> {
    const [created] = await db.insert(passwordResetTokens).values({ userId, token, expiresAt }).returning();
    return created;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [result] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
    return result;
  }

  async markPasswordResetTokenUsed(token: string): Promise<void> {
    await db.update(passwordResetTokens).set({ used: true }).where(eq(passwordResetTokens.token, token));
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    await db.update(users).set({ password: hashedPassword, updatedAt: new Date() }).where(eq(users.id, userId));
  }

  async upsertEssayReaction(projectId: number, visitorIp: string, reactionType: string): Promise<void> {
    const existing = await db.select().from(essayReactions).where(
      and(
        eq(essayReactions.projectId, projectId),
        eq(essayReactions.visitorIp, visitorIp),
        eq(essayReactions.reactionType, reactionType)
      )
    );
    if (existing.length > 0) {
      await db.delete(essayReactions).where(
        and(
          eq(essayReactions.projectId, projectId),
          eq(essayReactions.visitorIp, visitorIp),
          eq(essayReactions.reactionType, reactionType)
        )
      );
    } else {
      await db.insert(essayReactions).values({ projectId, visitorIp, reactionType });
    }
  }

  async getEssayReactionCounts(projectId: number): Promise<Record<string, number>> {
    const rows = await db.select({
      reactionType: essayReactions.reactionType,
      count: count(),
    }).from(essayReactions).where(eq(essayReactions.projectId, projectId)).groupBy(essayReactions.reactionType);
    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.reactionType] = row.count;
    }
    return result;
  }

  async getPublishedEssays(): Promise<NovelProject[]> {
    return db.select().from(novelProjects).where(
      and(
        eq(novelProjects.projectType, "essay"),
        eq(novelProjects.publishedToNews, true),
        isNotNull(novelProjects.shareToken)
      )
    ).orderBy(desc(novelProjects.updatedAt));
  }

  async getSocialMediaLinks(): Promise<SocialMediaLink[]> {
    return db.select().from(socialMediaLinks).orderBy(asc(socialMediaLinks.displayOrder));
  }

  async getEnabledSocialMediaLinks(): Promise<SocialMediaLink[]> {
    return db.select().from(socialMediaLinks).where(eq(socialMediaLinks.enabled, true)).orderBy(asc(socialMediaLinks.displayOrder));
  }

  async upsertSocialMediaLink(data: InsertSocialMediaLink): Promise<SocialMediaLink> {
    const existing = await db.select().from(socialMediaLinks).where(eq(socialMediaLinks.platform, data.platform));
    if (existing.length > 0) {
      const [updated] = await db.update(socialMediaLinks).set({ ...data, updatedAt: new Date() }).where(eq(socialMediaLinks.platform, data.platform)).returning();
      return updated;
    }
    const [created] = await db.insert(socialMediaLinks).values(data).returning();
    return created;
  }

  async deleteSocialMediaLink(id: number): Promise<void> {
    await db.delete(socialMediaLinks).where(eq(socialMediaLinks.id, id));
  }

  async getAllFeatures(): Promise<PlatformFeature[]> {
    return db.select().from(platformFeatures).orderBy(asc(platformFeatures.id));
  }

  async getFeature(key: string): Promise<PlatformFeature | undefined> {
    const [feature] = await db.select().from(platformFeatures).where(eq(platformFeatures.featureKey, key));
    return feature;
  }

  async updateFeature(key: string, data: Partial<PlatformFeature>): Promise<PlatformFeature> {
    const [updated] = await db.update(platformFeatures).set(data).where(eq(platformFeatures.featureKey, key)).returning();
    return updated;
  }

  async isFeatureEnabled(key: string, userId?: string): Promise<boolean> {
    const feature = await this.getFeature(key);
    if (!feature) return true;
    if (feature.enabled) {
      if (feature.betaOnly) {
        return !!(userId && feature.betaUserIds && feature.betaUserIds.includes(userId));
      }
      return true;
    }
    if (userId && feature.betaUserIds && feature.betaUserIds.includes(userId)) return true;
    return false;
  }

  async seedDefaultFeatures(): Promise<void> {
    const existing = await this.getAllFeatures();
    const existingKeys = new Set(existing.map(f => f.featureKey));

    const defaults = [
      { featureKey: "novel", name: "رواية", description: "كتابة الروايات بالذكاء الاصطناعي" },
      { featureKey: "essay", name: "مقال", description: "كتابة المقالات الأدبية والسياسية" },
      { featureKey: "scenario", name: "سيناريو", description: "كتابة السيناريوهات الدرامية" },
      { featureKey: "short_story", name: "قصة قصيرة", description: "كتابة القصص القصيرة" },
      { featureKey: "khawater", name: "خواطر", description: "كتابة الخواطر الأدبية" },
      { featureKey: "social_media", name: "محتوى تواصل اجتماعي", description: "إنشاء محتوى لمنصات التواصل الاجتماعي" },
      { featureKey: "poetry", name: "شعر", description: "كتابة الشعر العربي بأوزانه وبحوره" },
      { featureKey: "memoire", name: "مذكرة تخرج", description: "كتابة مذكرات التخرج الأكاديمية بالذكاء الاصطناعي" },
      { featureKey: "ai_analysis", name: "التحليل بالذكاء الاصطناعي", description: "تحليل النصوص وتقييمها" },
      { featureKey: "cover_generation", name: "تصميم الغلاف", description: "إنشاء أغلفة الكتب بالذكاء الاصطناعي" },
      { featureKey: "export_pdf", name: "تصدير PDF", description: "تصدير المشاريع بصيغة PDF" },
      { featureKey: "export_epub", name: "تصدير EPUB", description: "تصدير المشاريع بصيغة EPUB" },
      { featureKey: "export_docx", name: "تصدير DOCX", description: "تصدير المشاريع بصيغة DOCX" },
      { featureKey: "auto_learning", name: "التعلم التلقائي", description: "تشغيل جلسات تعلم ذاتي تلقائية كل 24 ساعة" },
      { featureKey: "training_webhook", name: "Webhook التدريب", description: "إرسال بيانات التفاعلات إلى خادم التدريب الخارجي تلقائياً" },
    ];

    for (const feat of defaults) {
      if (existingKeys.has(feat.featureKey)) continue;
      await db.insert(platformFeatures).values({
        ...feat,
        enabled: true,
        betaUserIds: [],
        disabledMessage: "هذه الميزة قيد التطوير وستكون متاحة قريباً",
      });
    }
  }

  async createContentReport(report: InsertContentReport): Promise<ContentReport> {
    const [created] = await db.insert(contentReports).values(report).returning();
    return created;
  }

  async getContentReports(status?: string): Promise<(ContentReport & { projectTitle?: string; projectType?: string; projectUserId?: string; reportCountForProject?: number })[]> {
    const conditions = status ? [eq(contentReports.status, status)] : [];
    const reports = await db
      .select({
        id: contentReports.id,
        projectId: contentReports.projectId,
        reporterIp: contentReports.reporterIp,
        reporterUserId: contentReports.reporterUserId,
        reason: contentReports.reason,
        subReason: contentReports.subReason,
        severity: contentReports.severity,
        details: contentReports.details,
        reportNumber: contentReports.reportNumber,
        reporterEmail: contentReports.reporterEmail,
        status: contentReports.status,
        priority: contentReports.priority,
        adminNote: contentReports.adminNote,
        actionTaken: contentReports.actionTaken,
        reviewedBy: contentReports.reviewedBy,
        reviewedAt: contentReports.reviewedAt,
        resolvedAt: contentReports.resolvedAt,
        reporterUserAgent: contentReports.reporterUserAgent,
        reporterDeviceType: contentReports.reporterDeviceType,
        reporterDeviceName: contentReports.reporterDeviceName,
        reporterCountry: contentReports.reporterCountry,
        reporterCity: contentReports.reporterCity,
        reporterIsp: contentReports.reporterIsp,
        reporterGeoData: contentReports.reporterGeoData,
        createdAt: contentReports.createdAt,
        projectTitle: novelProjects.title,
        projectType: novelProjects.projectType,
        projectUserId: novelProjects.userId,
      })
      .from(contentReports)
      .leftJoin(novelProjects, eq(contentReports.projectId, novelProjects.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(contentReports.createdAt));
    return reports;
  }

  async getContentReport(id: number): Promise<ContentReport | undefined> {
    const [report] = await db.select().from(contentReports).where(eq(contentReports.id, id));
    return report;
  }

  async updateContentReport(id: number, updates: Partial<ContentReport>): Promise<ContentReport> {
    const [updated] = await db.update(contentReports).set(updates).where(eq(contentReports.id, id)).returning();
    return updated;
  }

  async getReportCountForProject(projectId: number): Promise<number> {
    const [result] = await db.select({ count: count() }).from(contentReports).where(eq(contentReports.projectId, projectId));
    return result?.count || 0;
  }

  async getRecentReportCountByIp(ip: string, windowMs: number): Promise<number> {
    const cutoff = new Date(Date.now() - windowMs);
    const [result] = await db
      .select({ count: count() })
      .from(contentReports)
      .where(and(
        eq(contentReports.reporterIp, ip),
        sql`${contentReports.createdAt} > ${cutoff}`
      ));
    return result?.count || 0;
  }

  async getReportsForProject(projectId: number): Promise<ContentReport[]> {
    return db.select().from(contentReports).where(eq(contentReports.projectId, projectId)).orderBy(desc(contentReports.createdAt));
  }

  async getReportStats(): Promise<{
    total: number;
    pending: number;
    bySeverity: Record<string, number>;
    byReason: Record<string, number>;
    resolvedThisWeek: number;
  }> {
    const allReports = await db.select({
      status: contentReports.status,
      severity: contentReports.severity,
      reason: contentReports.reason,
      resolvedAt: contentReports.resolvedAt,
    }).from(contentReports);

    const total = allReports.length;
    const pending = allReports.filter(r => r.status === "pending").length;

    const bySeverity: Record<string, number> = {};
    const byReason: Record<string, number> = {};
    for (const r of allReports) {
      const sev = r.severity || "unset";
      bySeverity[sev] = (bySeverity[sev] || 0) + 1;
      byReason[r.reason] = (byReason[r.reason] || 0) + 1;
    }

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const resolvedThisWeek = allReports.filter(r => r.resolvedAt && r.resolvedAt > weekAgo).length;

    return { total, pending, bySeverity, byReason, resolvedThisWeek };
  }

  async checkAndResetFreeMonthly(userId: string): Promise<{ projectsUsed: number; generationsUsed: number }> {
    const user = await this.getUser(userId);
    if (!user) return { projectsUsed: 0, generationsUsed: 0 };

    const now = new Date();
    const resetAt = user.freeMonthlyResetAt;
    const needsReset = !resetAt || resetAt.getMonth() !== now.getMonth() || resetAt.getFullYear() !== now.getFullYear();

    if (needsReset) {
      await db.update(users).set({
        freeMonthlyProjectsUsed: 0,
        freeMonthlyGenerationsUsed: 0,
        freeMonthlyResetAt: now,
      }).where(eq(users.id, userId));
      return { projectsUsed: 0, generationsUsed: 0 };
    }

    return {
      projectsUsed: user.freeMonthlyProjectsUsed || 0,
      generationsUsed: user.freeMonthlyGenerationsUsed || 0,
    };
  }

  async incrementFreeMonthlyUsage(userId: string, type: "project" | "generation"): Promise<void> {
    if (type === "project") {
      await db.update(users).set({
        freeMonthlyProjectsUsed: sql`COALESCE(${users.freeMonthlyProjectsUsed}, 0) + 1`,
      }).where(eq(users.id, userId));
    } else {
      await db.update(users).set({
        freeMonthlyGenerationsUsed: sql`COALESCE(${users.freeMonthlyGenerationsUsed}, 0) + 1`,
      }).where(eq(users.id, userId));
    }
  }

  async deleteProject(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      const chapterList = await tx.select({ id: chapters.id }).from(chapters).where(eq(chapters.projectId, id));
      const chapterIds = chapterList.map(c => c.id);

      if (chapterIds.length > 0) {
        for (const chapterId of chapterIds) {
          await tx.delete(chapterVersions).where(eq(chapterVersions.chapterId, chapterId));
        }
        await tx.delete(chapters).where(eq(chapters.projectId, id));
      }

      await tx.delete(characterRelationships).where(eq(characterRelationships.projectId, id));
      await tx.delete(characters).where(eq(characters.projectId, id));
      await tx.delete(bookmarks).where(eq(bookmarks.projectId, id));
      await tx.delete(readingProgress).where(eq(readingProgress.projectId, id));
      await tx.delete(projectFavorites).where(eq(projectFavorites.projectId, id));
      await tx.delete(essayViews).where(eq(essayViews.projectId, id));
      await tx.delete(essayClicks).where(eq(essayClicks.projectId, id));
      await tx.delete(essayReactions).where(eq(essayReactions.projectId, id));
      await tx.delete(novelProjects).where(eq(novelProjects.id, id));
    });
  }

  async createKnowledgeEntry(data: InsertKnowledgeEntry): Promise<KnowledgeEntry> {
    const [entry] = await db.insert(knowledgeEntries).values(data).returning();
    return entry;
  }

  async getKnowledgeEntries(filters: { category?: string; contentType?: string; validated?: boolean; rejected?: boolean; search?: string; limit?: number; offset?: number }): Promise<KnowledgeEntry[]> {
    const conditions = [];

    if (filters.category) {
      conditions.push(eq(knowledgeEntries.category, filters.category));
    }
    if (filters.contentType) {
      conditions.push(eq(knowledgeEntries.contentType, filters.contentType));
    }
    if (filters.validated !== undefined) {
      conditions.push(eq(knowledgeEntries.validated, filters.validated));
    }
    if (filters.rejected !== undefined) {
      conditions.push(eq(knowledgeEntries.rejected, filters.rejected));
    }
    if (filters.search) {
      conditions.push(like(knowledgeEntries.knowledge, `%${filters.search}%`));
    }

    const query = db
      .select()
      .from(knowledgeEntries)
      .orderBy(desc(knowledgeEntries.createdAt))
      .limit(filters.limit || 50)
      .offset(filters.offset || 0);

    if (conditions.length > 0) {
      return query.where(and(...conditions));
    }
    return query;
  }

  async updateKnowledgeEntry(id: number, data: Partial<KnowledgeEntry>): Promise<KnowledgeEntry> {
    const [entry] = await db
      .update(knowledgeEntries)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(knowledgeEntries.id, id))
      .returning();
    return entry;
  }

  async deleteKnowledgeEntry(id: number): Promise<void> {
    await db.delete(knowledgeEntries).where(eq(knowledgeEntries.id, id));
  }

  async createLearningSession(data: InsertLearningSession): Promise<LearningSession> {
    const [session] = await db.insert(learningSessions).values(data).returning();
    return session;
  }

  async updateLearningSession(id: number, data: Partial<LearningSession>): Promise<LearningSession> {
    const [session] = await db
      .update(learningSessions)
      .set(data)
      .where(eq(learningSessions.id, id))
      .returning();
    return session;
  }

  async getLearningSessions(limit: number = 20): Promise<LearningSession[]> {
    return db
      .select()
      .from(learningSessions)
      .orderBy(desc(learningSessions.startedAt))
      .limit(limit);
  }

  async getLearningStats(): Promise<{ totalEntries: number; validatedEntries: number; rejectedEntries: number; pendingEntries: number; totalSessions: number; lastSessionDate: string | null }> {
    const [total] = await db.select({ count: count() }).from(knowledgeEntries);
    const [validated] = await db.select({ count: count() }).from(knowledgeEntries).where(eq(knowledgeEntries.validated, true));
    const [rejected] = await db.select({ count: count() }).from(knowledgeEntries).where(eq(knowledgeEntries.rejected, true));
    const [pending] = await db.select({ count: count() }).from(knowledgeEntries).where(and(eq(knowledgeEntries.validated, false), eq(knowledgeEntries.rejected, false)));
    const [sessions] = await db.select({ count: count() }).from(learningSessions);
    const [lastSession] = await db.select({ startedAt: learningSessions.startedAt }).from(learningSessions).orderBy(desc(learningSessions.startedAt)).limit(1);

    return {
      totalEntries: total.count,
      validatedEntries: validated.count,
      rejectedEntries: rejected.count,
      pendingEntries: pending.count,
      totalSessions: sessions.count,
      lastSessionDate: lastSession?.startedAt?.toISOString() || null,
    };
  }

  async createWebhookDelivery(data: InsertWebhookDelivery): Promise<WebhookDelivery> {
    const [delivery] = await db.insert(webhookDeliveries).values(data).returning();
    return delivery;
  }

  async updateWebhookDelivery(id: number, data: Partial<WebhookDelivery>): Promise<WebhookDelivery> {
    const [delivery] = await db.update(webhookDeliveries).set(data).where(eq(webhookDeliveries.id, id)).returning();
    return delivery;
  }

  async getWebhookDeliveries(limit: number = 50): Promise<WebhookDelivery[]> {
    return db.select().from(webhookDeliveries).orderBy(desc(webhookDeliveries.createdAt)).limit(limit);
  }

  async getPendingWebhookRetries(): Promise<WebhookDelivery[]> {
    return db.select().from(webhookDeliveries)
      .where(and(
        eq(webhookDeliveries.status, "pending"),
        lt(webhookDeliveries.nextRetryAt, new Date()),
      ))
      .orderBy(asc(webhookDeliveries.nextRetryAt))
      .limit(20);
  }
}

export const storage = new DatabaseStorage();
