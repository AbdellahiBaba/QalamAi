import {
  novelProjects, characters, characterRelationships, chapters, chapterVersions,
  users, supportTickets, ticketReplies, notifications, promoCodes, readingProgress, bookmarks, projectFavorites, apiUsageLogs,
  authorRatings, platformReviews, trackingPixels,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, asc, desc, sql, count, isNotNull, avg } from "drizzle-orm";

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

    const chars = await this.getCharactersByProject(id);
    const chaps = await this.getChaptersByProject(id);
    const rels = await db.select().from(characterRelationships).where(eq(characterRelationships.projectId, id));

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
    const totalUsersResult = await db.select({ value: count() }).from(users);
    const totalProjectsResult = await db.select({ value: count() }).from(novelProjects);
    const projectsByType = await db.execute(
      sql`SELECT COALESCE(project_type, 'novel') as type, COUNT(*)::int as count FROM novel_projects GROUP BY COALESCE(project_type, 'novel')`
    );
    const planBreakdown = await db.execute(
      sql`SELECT COALESCE(plan, 'free') as plan, COUNT(*)::int as count FROM users GROUP BY COALESCE(plan, 'free')`
    );

    let revenueData = null;
    try {
      const totalRevenue = await db.execute(
        sql`SELECT COALESCE(SUM(price), 0)::int as total FROM novel_projects WHERE paid = true`
      );
      const monthlyRevenue = await db.execute(
        sql`SELECT COALESCE(SUM(price), 0)::int as total FROM novel_projects WHERE paid = true AND updated_at >= date_trunc('month', CURRENT_DATE)`
      );
      const revenueByType = await db.execute(
        sql`SELECT COALESCE(project_type, 'novel') as type, COALESCE(SUM(price), 0)::int as total, COUNT(*)::int as count FROM novel_projects WHERE paid = true GROUP BY COALESCE(project_type, 'novel')`
      );
      const paidPlans = await db.execute(
        sql`SELECT COALESCE(plan, 'free') as plan, COUNT(*)::int as count FROM users WHERE plan != 'free' AND plan IS NOT NULL AND plan_purchased_at IS NOT NULL GROUP BY plan`
      );
      revenueData = {
        totalRevenue: (totalRevenue.rows[0] as any)?.total || 0,
        monthlyRevenue: (monthlyRevenue.rows[0] as any)?.total || 0,
        revenueByType: revenueByType.rows,
        paidPlans: paidPlans.rows,
      };
    } catch (e) {
      console.error("Error fetching revenue data:", e);
    }

    let totalWords = 0;
    let writingActivity: { date: string; words: number; projects: number }[] = [];
    let topWriters: { userId: string; name: string; words: number }[] = [];
    try {
      const userWordMap: Record<string, number> = {};
      const dailyMap: Record<string, { words: number; projectIds: Set<string> }> = {};

      const allChaptersWithProject = await db.select({
        content: chapters.content,
        createdAt: chapters.createdAt,
        userId: novelProjects.userId,
        projectId: chapters.projectId,
      }).from(chapters).innerJoin(novelProjects, eq(chapters.projectId, novelProjects.id));

      for (const ch of allChaptersWithProject) {
        if (!ch.content) continue;
        const words = ch.content.split(/\s+/).filter((w: string) => w.trim()).length;
        totalWords += words;
        userWordMap[ch.userId] = (userWordMap[ch.userId] || 0) + words;
        const dateKey = new Date(ch.createdAt).toISOString().split("T")[0];
        if (!dailyMap[dateKey]) dailyMap[dateKey] = { words: 0, projectIds: new Set() };
        dailyMap[dateKey].words += words;
        dailyMap[dateKey].projectIds.add(String(ch.projectId));
      }

      const today = new Date();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        const entry = dailyMap[key];
        writingActivity.push({ date: key, words: entry?.words || 0, projects: entry?.projectIds?.size || 0 });
      }

      const topUserIds = Object.entries(userWordMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
      for (const [uid, words] of topUserIds) {
        const [u] = await db.select().from(users).where(eq(users.id, uid));
        topWriters.push({
          userId: uid,
          name: u?.displayName || `${u?.firstName || ''} ${u?.lastName || ''}`.trim() || u?.email || 'مجهول',
          words,
        });
      }
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
    const projects = await db.select().from(novelProjects).where(isNotNull(novelProjects.shareToken)).orderBy(desc(novelProjects.updatedAt));
    const result: (NovelProject & { authorName: string; authorId: string; authorAverageRating: number })[] = [];
    for (const p of projects) {
      const [user] = await db.select().from(users).where(eq(users.id, p.userId));
      if (user) {
        const { average } = await this.getAuthorAverageRating(user.id);
        result.push({
          ...p,
          authorName: user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'كاتب مجهول',
          authorId: user.id,
          authorAverageRating: average,
        });
      }
    }
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
}

export const storage = new DatabaseStorage();
