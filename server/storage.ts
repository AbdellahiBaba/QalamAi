import {
  novelProjects, characters, characterRelationships, chapters, chapterVersions,
  users, supportTickets, ticketReplies,
  type NovelProject, type InsertNovelProject,
  type Character, type InsertCharacter,
  type CharacterRelationship,
  type Chapter, type InsertChapter,
  type ChapterVersion,
  type User, type UpsertUser,
  type SupportTicket, type InsertSupportTicket,
  type TicketReply, type InsertTicketReply,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, asc, desc, sql, count } from "drizzle-orm";

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
  }> {
    const totalUsersResult = await db.select({ value: count() }).from(users);
    const totalProjectsResult = await db.select({ value: count() }).from(novelProjects);
    const projectsByType = await db.execute(
      sql`SELECT COALESCE(project_type, 'novel') as type, COUNT(*)::int as count FROM novel_projects GROUP BY COALESCE(project_type, 'novel')`
    );
    const planBreakdown = await db.execute(
      sql`SELECT COALESCE(plan, 'free') as plan, COUNT(*)::int as count FROM users GROUP BY COALESCE(plan, 'free')`
    );
    return {
      totalUsers: totalUsersResult[0]?.value || 0,
      totalProjects: totalProjectsResult[0]?.value || 0,
      projectsByType: projectsByType.rows as { type: string; count: number }[],
      planBreakdown: planBreakdown.rows as { plan: string; count: number }[],
    };
  }
}

export const storage = new DatabaseStorage();
