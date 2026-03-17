import {
  novelProjects, characters, characterRelationships, chapters, chapterVersions,
  users, supportTickets, ticketReplies, notifications, promoCodes, readingProgress, bookmarks, projectFavorites, apiUsageLogs,
  authorRatings, platformReviews, trackingPixels, essayViews, essayClicks, passwordResetTokens, authorFollows,
  conversations, messages,
  systemSettings,
  type Conversation, type InsertConversation,
  type Message, type InsertMessage,
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
  emailSubscriptions, type EmailSubscription,
  chapterUnlocks, type ChapterUnlock,
  giftSubscriptions, type GiftSubscription,
  userPoints, type UserPoints,
  pointTransactions, type PointTransaction,
  newsletterSends, type NewsletterSend,
  collections, type Collection,
  payoutSettings, type PayoutSettings, type InsertPayoutSettings,
  workVotes, type WorkVote,
  hallOfGloryFeatured, type HallOfGloryFeatured,
  writingSprints, type WritingSprint, type InsertWritingSprint,
  readingClubs, readingClubMembers, type ReadingClub, type InsertReadingClub, type ReadingClubMember,
  projectComments,
  writingCourses, courseLessons, courseEnrollments, lessonCompletions, courseRatings,
  type WritingCourse, type InsertWritingCourse, type CourseLesson, type CourseEnrollment, type LessonCompletion, type CourseRating,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, asc, desc, sql, count, isNotNull, isNull, avg, lt, inArray, like, or } from "drizzle-orm";
import { createHash } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserStripeCustomerId(userId: string, stripeCustomerId: string): Promise<User>;
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined>;
  getApprovedVerifiedApplication(userId: string): Promise<boolean>;
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
  getAllTickets(status?: string, limit?: number, offset?: number): Promise<{ data: SupportTicket[]; total: number }>;
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
  getPendingReviews(limit?: number, offset?: number): Promise<{ data: PlatformReview[]; total: number }>;
  approvePlatformReview(id: number): Promise<PlatformReview>;
  deletePlatformReview(id: number): Promise<void>;
  getTrackingPixels(): Promise<TrackingPixel[]>;
  upsertTrackingPixel(data: InsertTrackingPixel): Promise<TrackingPixel>;
  updateUserTrial(userId: string, data: Partial<User>): Promise<User>;
  grantAnalysisUses(projectId: number, continuityUses: number, styleUses: number): Promise<void>;
  grantAnalysisUsesForAllProjects(userId: string, continuityUses: number, styleUses: number): Promise<void>;
  recordEssayView(projectId: number, visitorIp: string, referrer?: string, country?: string | null): Promise<void>;
  getViewsByCountry(userId: string): Promise<Array<{ country: string; count: number }>>;
  recordEssayClick(projectId: number, visitorIp: string): Promise<void>;
  getEssayViewCount(projectId: number): Promise<number>;
  getEssayClickCount(projectId: number): Promise<number>;
  getEssayAnalytics(): Promise<Array<{ projectId: number; title: string; views: number; clicks: number }>>;
  getMemoireAnalytics(): Promise<Array<{ projectId: number; title: string; university: string | null; memoireField: string | null; memoireMethodology: string | null; memoireCountry: string | null; views: number; clicks: number }>>;
  getAllReviews(limit?: number, offset?: number): Promise<{ data: PlatformReview[]; total: number }>;
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
  getPublishedEssaysWithStats(page?: number, limit?: number, search?: string): Promise<{ rows: Array<{ id: number; title: string; mainIdea: string | null; coverImageUrl: string | null; shareToken: string | null; authorName: string; authorId: string; authorAverageRating: number; subject: string | null; views: number; clicks: number; reactions: Record<string, number>; totalWords: number; createdAt: Date }>; total: number }>;
  getGalleryProjectsPaginated(page?: number, limit?: number, projectType?: string): Promise<{ rows: (NovelProject & { authorName: string; authorId: string; authorAverageRating: number })[]; total: number }>;
  getSocialMediaLinks(): Promise<SocialMediaLink[]>;
  getEnabledSocialMediaLinks(): Promise<SocialMediaLink[]>;
  upsertSocialMediaLink(data: InsertSocialMediaLink): Promise<SocialMediaLink>;
  deleteSocialMediaLink(id: number): Promise<void>;
  getAllFeatures(): Promise<PlatformFeature[]>;
  getFeature(key: string): Promise<PlatformFeature | undefined>;
  updateFeature(key: string, data: Partial<PlatformFeature>): Promise<PlatformFeature>;
  isFeatureEnabled(key: string, userId?: string): Promise<boolean>;
  seedDefaultFeatures(): Promise<void>;
  getProjectStatsForUser(userId: string): Promise<Record<number, { realWordCount: number; realPageCount: number }>>;
  getWritingStatsForUser(userId: string): Promise<{ totalWords: number; totalProjects: number; completedProjects: number; avgWordsPerProject: number; dailyWordCounts: { date: string; words: number }[]; projectBreakdown: { projectId: number; title: string; type: string; words: number; chapters: number; completedChapters: number }[] }>;
  deleteProject(id: number): Promise<void>;
  createContentReport(report: InsertContentReport): Promise<ContentReport>;
  getContentReports(status?: string, limit?: number, offset?: number): Promise<{ data: (ContentReport & { projectTitle?: string })[]; total: number }>;
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
  getPlatformStats(): Promise<{ userCount: number; projectCount: number; totalWords: number }>;
  getPublicEssayByShareToken(token: string): Promise<{ id: number; title: string; mainIdea: string | null; coverImageUrl: string | null; shareToken: string; authorName: string; authorId: string; authorAverageRating: number; subject: string | null; views: number; clicks: number; reactions: Record<string, number>; totalWords: number; createdAt: Date; essayTone: string | null; targetAudience: string | null } | undefined>;
  followAuthor(followerId: string, followingId: string): Promise<void>;
  unfollowAuthor(followerId: string, followingId: string): Promise<void>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  getFollowingList(followerId: string): Promise<string[]>;
  getAuthorFollowerCount(authorId: string): Promise<number>;
  setUserVerified(userId: string, verified: boolean): Promise<User>;
  getUsersWithEmails(): Promise<Array<{ id: string; email: string; displayName: string | null }>>;
  getUsersWithEmailsForDigest(): Promise<Array<{ id: string; email: string; displayName: string | null }>>;
  setDigestOptOut(userId: string, optOut: boolean): Promise<void>;
  getDigestOptOut(userId: string): Promise<boolean>;
  getEmailNotificationsEnabled(userId: string): Promise<boolean>;
  setEmailNotificationsEnabled(userId: string, enabled: boolean): Promise<void>;
  getTopEssaysForWeek(limit?: number): Promise<Array<{ id: number; title: string; shareToken: string | null; authorName: string; views: number }>>;
  getLeaderboard(limit?: number): Promise<Array<{ userId: string; displayName: string; profileImageUrl: string | null; verified: boolean; totalViews: number; followerCount: number; projectCount: number; averageRating: number }>>;
  createEssayComment(data: { essayId: number; authorName: string; content: string; ipHash?: string }): Promise<import("@shared/schema").EssayComment>;
  getEssayComments(essayId: number, onlyApproved?: boolean): Promise<import("@shared/schema").EssayComment[]>;
  approveEssayComment(id: number): Promise<void>;
  deleteEssayComment(id: number): Promise<void>;
  getPendingComments(limit?: number, offset?: number): Promise<{ data: import("@shared/schema").EssayComment[]; total: number }>;
  createProjectComment(data: { projectId: number; authorName: string; content: string; ipHash?: string }): Promise<import("@shared/schema").ProjectComment>;
  getProjectComments(projectId: number, onlyApproved?: boolean): Promise<import("@shared/schema").ProjectComment[]>;
  getProjectCommentsPaginated(projectId: number, limit: number, offset: number): Promise<{ data: any[]; total: number }>;
  getProjectComment(id: number): Promise<import("@shared/schema").ProjectComment | undefined>;
  getProjectCommentCount(projectId: number): Promise<number>;
  approveProjectComment(id: number): Promise<void>;
  deleteProjectComment(id: number): Promise<void>;
  getPendingProjectComments(limit?: number, offset?: number): Promise<{ data: any[]; total: number }>;
  getRecentProjectComments(limit?: number, offset?: number): Promise<{ data: any[]; total: number }>;
  createCollection(data: import("@shared/schema").InsertCollection): Promise<import("@shared/schema").Collection>;
  getUserCollections(userId: string): Promise<import("@shared/schema").Collection[]>;
  getCollectionBySlug(slug: string): Promise<(import("@shared/schema").Collection & { items: Array<{ essayId: number | null; projectId: number | null; title: string; coverImageUrl: string | null; shareToken: string | null; authorName: string; projectType: string | null }> }) | undefined>;
  getCollectionById(id: number): Promise<import("@shared/schema").Collection | undefined>;
  addToCollection(collectionId: number, essayId?: number, projectId?: number): Promise<void>;
  removeFromCollection(collectionId: number, essayId?: number, projectId?: number): Promise<void>;
  getCollectionItems(collectionId: number): Promise<Array<{ essayId: number | null; projectId: number | null; title: string; coverImageUrl: string | null; shareToken: string | null; authorName: string; projectType: string | null }>>;
  deleteCollection(id: number): Promise<void>;
  submitVerifiedApplication(data: import("@shared/schema").InsertVerifiedApplication): Promise<import("@shared/schema").VerifiedApplication>;
  getVerifiedApplications(status?: string): Promise<import("@shared/schema").VerifiedApplication[]>;
  updateVerifiedApplication(id: number, status: string, adminNote?: string): Promise<import("@shared/schema").VerifiedApplication>;
  getOrCreateReferralCode(userId: string): Promise<string>;
  applyReferral(referralCode: string, newUserId: string): Promise<{ success: boolean; referrerId?: string }>;
  getReferralStats(userId: string): Promise<{ referralCode: string; referralCount: number; bonusGenerations: number }>;
  getRelatedEssays(essayId: number, subject: string | null, limit?: number): Promise<Array<{ id: number; title: string; coverImageUrl: string | null; shareToken: string | null; authorName: string; views: number }>>;
  getEssayOfWeek(): Promise<{ id: number; title: string; shareToken: string; coverImageUrl: string | null; authorName: string; authorId: string; views: number; mainIdea: string | null } | null>;
  updateWritingStreak(userId: string): Promise<{ streakDays: number; isNewRecord: boolean }>;
  // New growth features
  getFollowerEmails(authorId: string): Promise<Array<{ email: string; displayName: string | null }>>;
  getAuthorAnalytics(userId: string): Promise<{ totalViews: number; totalEssays: number; followerCount: number; totalReactions: number; topEssays: Array<{ id: number; title: string; shareToken: string | null; views: number; reactions: number }>; viewsThisMonth: number; followersThisMonth: number }>;
  getMonthlyAuthorStats(userId: string): Promise<{ totalViews: number; totalEssays: number; followerCount: number; topEssay: { title: string; views: number } | null; newFollowers: number }>;
  getTodayPrompt(): Promise<import("@shared/schema").DailyPrompt | undefined>;
  getPastPrompts(limit?: number): Promise<import("@shared/schema").DailyPrompt[]>;
  createDailyPrompt(data: import("@shared/schema").InsertDailyPrompt): Promise<import("@shared/schema").DailyPrompt>;
  getPromptEntries(promptId: number): Promise<Array<import("@shared/schema").DailyPromptEntry & { authorName: string; authorProfileImage: string | null }>>;
  submitPromptEntry(data: import("@shared/schema").InsertDailyPromptEntry): Promise<import("@shared/schema").DailyPromptEntry>;
  getUserPromptEntry(promptId: number, userId: string): Promise<import("@shared/schema").DailyPromptEntry | undefined>;
  setPromptWinner(promptId: number, winnerId: string, winnerEntryId: number): Promise<void>;
  createAuthorTip(data: { fromUserId?: string; toAuthorId: string; projectId?: number; amountCents: number; stripeSessionId: string }): Promise<import("@shared/schema").AuthorTip>;
  subscribeEmailToAuthor(email: string, authorId: string): Promise<{ token: string; alreadySubscribed: boolean }>;
  unsubscribeEmailByToken(token: string): Promise<boolean>;
  getEmailSubscribersForAuthor(authorId: string): Promise<{ email: string }[]>;
  isEmailSubscribed(email: string, authorId: string): Promise<boolean>;
  completeAuthorTip(stripeSessionId: string): Promise<void>;
  getTipsByAuthor(authorId: string): Promise<import("@shared/schema").AuthorTip[]>;
  getViewsSeries(userId: string): Promise<Array<{ date: string; views: number }>>;
  getFollowerHistory(userId: string): Promise<Array<{ week: string; count: number }>>;
  getCompletionRates(userId: string): Promise<Array<{ id: number; title: string; shareToken: string | null; totalChapters: number; readers: number; completions: number; completionRate: number }>>;
  getViewsByStory(userId: string): Promise<Array<{ id: number; title: string; data: Array<{ date: string; views: number }> }>>;
  createSeries(data: import("@shared/schema").InsertContentSeries): Promise<import("@shared/schema").ContentSeries>;
  getSeriesByUser(userId: string): Promise<import("@shared/schema").ContentSeries[]>;
  getSeriesById(id: number): Promise<(import("@shared/schema").ContentSeries & { items: Array<{ id: number; orderIndex: number; project: { id: number; title: string; shareToken: string | null; coverImageUrl: string | null; mainIdea: string | null } }> }) | undefined>;
  addSeriesItem(seriesId: number, projectId: number, orderIndex?: number): Promise<void>;
  removeSeriesItem(seriesId: number, projectId: number): Promise<void>;
  deleteSeries(id: number): Promise<void>;
  updateProjectTags(projectId: number, tags: string[]): Promise<import("@shared/schema").NovelProject>;
  getProjectsByTag(tag: string, limit?: number, offset?: number): Promise<{ rows: import("@shared/schema").NovelProject[]; total: number }>;
  getGalleryProjectsByTag(tag: string, page?: number, limit?: number, projectType?: string): Promise<{ rows: (import("@shared/schema").NovelProject & { authorName: string; authorId: string; authorAverageRating: number })[]; total: number }>;
  createWritingChallenge(data: import("@shared/schema").InsertWritingChallenge): Promise<import("@shared/schema").WritingChallenge>;
  getWritingChallenges(): Promise<import("@shared/schema").WritingChallenge[]>;
  getWritingChallenge(id: number): Promise<import("@shared/schema").WritingChallenge | undefined>;
  deleteChallenge(id: number): Promise<void>;
  setChallengWinner(challengeId: number, winnerId: string, winnerEntryId: number): Promise<import("@shared/schema").WritingChallenge>;
  submitChallengeEntry(data: import("@shared/schema").InsertChallengeEntry): Promise<import("@shared/schema").ChallengeEntry>;
  getChallengeEntries(challengeId: number): Promise<(import("@shared/schema").ChallengeEntry & { authorName: string; authorProfileImage: string | null })[]>;
  getUserChallengeEntry(challengeId: number, userId: string): Promise<import("@shared/schema").ChallengeEntry | undefined>;
  requestBetaReader(data: import("@shared/schema").InsertBetaReaderRequest): Promise<import("@shared/schema").BetaReaderRequest>;
  getBetaReaderRequests(projectId: number): Promise<(import("@shared/schema").BetaReaderRequest & { userName: string; userProfileImage: string | null })[]>;
  cancelBetaReaderRequest(projectId: number, userId: string): Promise<void>;
  getRelatedProjects(projectId: number, limit?: number): Promise<Array<{ id: number; title: string; coverImageUrl: string | null; shareToken: string | null; authorName: string; projectType: string }>>;
  checkChapterUnlock(userId: string, chapterId: number): Promise<boolean>;
  createChapterUnlock(userId: string, chapterId: number, stripeSessionId?: string): Promise<void>;
  getUnlockedChapterIds(userId: string, projectId: number): Promise<number[]>;
  createGiftSubscription(data: { gifterUserId: string; gifterEmail: string; recipientEmail: string; plan: string; token: string; stripeSessionId?: string }): Promise<import("@shared/schema").GiftSubscription>;
  getGiftByToken(token: string): Promise<import("@shared/schema").GiftSubscription | undefined>;
  redeemGift(token: string, userId: string): Promise<import("@shared/schema").GiftSubscription>;
  getGiftsByGifter(userId: string): Promise<import("@shared/schema").GiftSubscription[]>;
  getPointsBalance(userId: string): Promise<number>;
  addPoints(userId: string, points: number, reason: string, metadata?: string): Promise<number>;
  getPointHistory(userId: string, limit?: number): Promise<import("@shared/schema").PointTransaction[]>;
  redeemPoints(userId: string, points: number, reason: string): Promise<{ newBalance: number }>;
  createNewsletterSend(data: { authorId: string; subject: string; body: string; recipientCount: number }): Promise<NewsletterSend>;
  getNewsletterSendsByAuthor(authorId: string, limit?: number): Promise<NewsletterSend[]>;
  getRecentPublicationsByFollowedAuthors(userId: string, daysBack?: number): Promise<Array<{ id: number; title: string; shareToken: string | null; authorName: string; projectType: string }>>;
  checkAndIncrementAiUsage(userId: string): Promise<{ allowed: boolean; remaining: number; resetTime: string }>;
  getAiUsageStatus(userId: string): Promise<{ used: number; limit: number; remaining: number; resetTime: string }>;
  getPayoutSettings(userId: string): Promise<PayoutSettings | undefined>;
  upsertPayoutSettings(data: InsertPayoutSettings): Promise<PayoutSettings>;
  getConversationsByUser(userId: string, mode?: string, projectId?: number): Promise<Conversation[]>;
  getConversation(id: number, userId: string): Promise<Conversation | undefined>;
  createConversation(data: InsertConversation): Promise<Conversation>;
  deleteConversation(id: number, userId: string): Promise<void>;
  getMessagesByConversation(conversationId: number, limit?: number): Promise<Message[]>;
  addMessage(data: InsertMessage): Promise<Message>;
  updateConversationTitle(id: number, userId: string, title: string): Promise<Conversation>;
  getSystemSetting(key: string): Promise<string | null>;
  setSystemSetting(key: string, value: string): Promise<void>;
  getUserEmailPreferences(userId: string): Promise<{ digestOptOut: boolean; emailNotifications: boolean; emailFollowPublications: boolean; emailTipsComments: boolean; emailChallenges: boolean }>;
  setUserEmailPreferences(userId: string, prefs: { digestOptOut?: boolean; emailNotifications?: boolean; emailFollowPublications?: boolean; emailTipsComments?: boolean; emailChallenges?: boolean }): Promise<void>;
  getUsersForFollowDigest(): Promise<Array<{ id: string; email: string; displayName: string | null }>>;
  getUsersForMonthlyReport(): Promise<Array<{ id: string; email: string; displayName: string | null }>>;
  getUsersForChallengeEmails(): Promise<Array<{ id: string; email: string; displayName: string | null }>>;
  addVote(projectId: number, userId: string): Promise<WorkVote>;
  removeVote(projectId: number, userId: string): Promise<void>;
  getVoteCount(projectId: number): Promise<number>;
  getUserVote(projectId: number, userId: string): Promise<WorkVote | undefined>;
  getTopVotedProjects(limit?: number): Promise<Array<NovelProject & { voteCount: number; authorName: string | null; authorProfileImage: string | null; alreadyFeatured: boolean }>>;
  featureInHallOfGlory(projectId: number, adminId: string): Promise<HallOfGloryFeatured>;
  getFeaturedHallOfGlory(): Promise<Array<NovelProject & { voteCount: number; authorName: string | null; authorProfileImage: string | null; authorId: string; featuredAt: Date | null }>>;
  toggleChallengeEntryVote(entryId: number, userId: string): Promise<{ voted: boolean; voteCount: number }>;
  getChallengeEntryVoteCount(entryId: number, userId?: string): Promise<{ voteCount: number; voted: boolean }>;
  createWritingSprint(data: InsertWritingSprint): Promise<WritingSprint>;
  getWritingSprintsByUser(userId: string, limit?: number): Promise<WritingSprint[]>;
  getWritingSprintStats(userId: string): Promise<{ totalSprints: number; totalWords: number; totalMinutes: number; avgWordsPerSprint: number; bestSprint: number; thisWeekSprints: number; thisWeekWords: number; thisWeekMinutes: number }>;
  createReadingClub(data: InsertReadingClub): Promise<ReadingClub>;
  getReadingClub(id: number): Promise<ReadingClub | undefined>;
  getClubsByProject(projectId: number): Promise<(ReadingClub & { memberCount: number; adminName: string })[]>;
  getClubsByUser(userId: string): Promise<(ReadingClub & { memberCount: number; projectTitle: string; projectCoverUrl: string | null; totalChapters: number })[]>;
  joinClub(clubId: number, userId: string): Promise<void>;
  leaveClub(clubId: number, userId: string): Promise<void>;
  getClubMembers(clubId: number): Promise<{ userId: string; displayName: string; profileImageUrl: string | null; joinedAt: Date }[]>;
  getClubMemberCount(clubId: number): Promise<number>;
  isClubMember(clubId: number, userId: string): Promise<boolean>;
  advanceClub(clubId: number): Promise<ReadingClub>;
  deleteReadingClub(id: number): Promise<void>;
  getClubComments(clubId: number, chapterIndex: number, limit?: number, offset?: number): Promise<{ data: any[]; total: number }>;
  createClubComment(data: { projectId: number; clubId: number; chapterIndex: number; authorName: string; content: string; ipHash?: string }): Promise<any>;

  createWritingCourse(data: InsertWritingCourse): Promise<WritingCourse>;
  getWritingCourse(id: number): Promise<WritingCourse | undefined>;
  updateWritingCourse(id: number, data: Partial<WritingCourse>): Promise<WritingCourse>;
  deleteWritingCourse(id: number): Promise<void>;
  getPublishedCourses(): Promise<WritingCourse[]>;
  getCoursesByAuthor(authorId: string): Promise<WritingCourse[]>;
  getCourseLessons(courseId: number): Promise<CourseLesson[]>;
  createCourseLesson(data: { courseId: number; orderIndex: number; title: string; content?: string; excerptChapterId?: number; exercisePrompt?: string }): Promise<CourseLesson>;
  updateCourseLesson(id: number, data: Partial<CourseLesson>): Promise<CourseLesson>;
  deleteCourseLesson(id: number): Promise<void>;
  enrollInCourse(courseId: number, userId: string, stripeSessionId?: string): Promise<CourseEnrollment>;
  getCourseEnrollment(courseId: number, userId: string): Promise<CourseEnrollment | undefined>;
  getCourseEnrollments(courseId: number): Promise<CourseEnrollment[]>;
  getUserEnrollments(userId: string): Promise<CourseEnrollment[]>;
  completeCourseLesson(lessonId: number, userId: string, exerciseResponse?: string): Promise<LessonCompletion>;
  getLessonCompletions(courseId: number, userId: string): Promise<LessonCompletion[]>;
  getCourseStats(courseId: number): Promise<{ enrollmentCount: number; completionRate: number }>;
  getAuthorCourseStats(authorId: string): Promise<{ totalCourses: number; totalEnrollments: number; totalRevenue: number }>;
  rateCourse(courseId: number, userId: string, rating: number, review?: string): Promise<any>;
  getCourseRatings(courseId: number): Promise<any[]>;
  getCourseAverageRating(courseId: number): Promise<{ avgRating: number; ratingCount: number }>;
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

  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, stripeCustomerId)).limit(1);
    return user;
  }

  async getApprovedVerifiedApplication(userId: string): Promise<boolean> {
    const result: any[] = (await db.execute(sql`
      SELECT id FROM verified_applications WHERE user_id = ${userId} AND status = 'approved' LIMIT 1
    `)).rows;
    return result.length > 0;
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
    const [updated] = await db.update(chapters).set({ ...data, updatedAt: new Date() }).where(eq(chapters.id, id)).returning();
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

  async getAllTickets(status?: string, limit?: number, offset?: number): Promise<{ data: SupportTicket[]; total: number }> {
    const conditions = status ? [eq(supportTickets.status, status)] : [];
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [totalResult] = await db.select({ count: count() }).from(supportTickets).where(whereClause);
    let query = db.select().from(supportTickets).where(whereClause).orderBy(desc(supportTickets.createdAt));
    if (limit !== undefined) query = query.limit(limit) as any;
    if (offset !== undefined) query = query.offset(offset) as any;
    const data = await query;
    return { data, total: totalResult?.count || 0 };
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
    if (existing.length > 10) {
      const toDelete = existing.slice(10);
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

  async getAllPromoCodes(limit?: number, offset?: number): Promise<{ data: PromoCode[]; total: number }> {
    const [totalResult] = await db.select({ count: count() }).from(promoCodes);
    let query = db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
    if (limit !== undefined) query = query.limit(limit) as any;
    if (offset !== undefined) query = query.offset(offset) as any;
    const data = await query;
    return { data, total: totalResult?.count || 0 };
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

  async getUserInProgressReads(userId: string, limit: number = 10): Promise<any[]> {
    const rows: any[] = (await db.execute(sql`
      SELECT rp.project_id as "projectId", rp.last_chapter_id as "lastChapterId",
        rp.scroll_position as "scrollPosition", rp.updated_at as "updatedAt",
        np.title, np.cover_image_url as "coverImageUrl", np.project_type as "projectType",
        np.share_token as "shareToken",
        (SELECT COUNT(*)::int FROM chapters pc WHERE pc.project_id = np.id AND pc.content IS NOT NULL AND pc.content != '') as "totalChapters",
        (SELECT chapter_number FROM chapters pc2 WHERE pc2.id = rp.last_chapter_id) as "lastChapterNumber"
      FROM reading_progress rp
      JOIN novel_projects np ON np.id = rp.project_id
      WHERE rp.user_id = ${userId}
        AND np.share_token IS NOT NULL
      ORDER BY rp.updated_at DESC
      LIMIT ${limit}
    `)).rows;
    return rows;
  }

  async getTrendingProjects(limit: number = 6): Promise<any[]> {
    const rows: any[] = (await db.execute(sql`
      SELECT np.id, np.title, np.cover_image_url as "coverImageUrl", np.share_token as "shareToken",
        np.project_type as "projectType", np.main_idea as "mainIdea",
        COALESCE(u.display_name, u.first_name || ' ' || u.last_name, 'كاتب') as "authorName",
        u.id as "authorId",
        COALESCE(v.vote_count, 0) as "voteCount",
        COALESCE(r.read_count, 0) as "readCount",
        (COALESCE(v.vote_count, 0) + COALESCE(r.read_count, 0)) as "score"
      FROM novel_projects np
      LEFT JOIN users u ON u.id = np.user_id
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int as vote_count FROM work_votes wv
        WHERE wv.project_id = np.id AND wv.created_at > NOW() - INTERVAL '7 days'
      ) v ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int as read_count FROM reading_progress rp2
        WHERE rp2.project_id = np.id AND rp2.updated_at > NOW() - INTERVAL '7 days'
      ) r ON true
      WHERE np.published_to_gallery = true
        AND np.share_token IS NOT NULL
      ORDER BY (COALESCE(v.vote_count, 0) + COALESCE(r.read_count, 0)) DESC, np.id DESC
      LIMIT ${limit}
    `)).rows;
    return rows;
  }

  async getSimilarProjects(projectId: number, limit: number = 4): Promise<any[]> {
    const project = await this.getProject(projectId);
    if (!project) return [];
    const tagsArr = (project.tags || []).filter(Boolean);
    const tagsSql = tagsArr.length > 0
      ? sql.raw(`ARRAY[${tagsArr.map(t => `'${t.replace(/'/g, "''")}'`).join(",")}]::text[]`)
      : sql.raw(`ARRAY[]::text[]`);
    const rows: any[] = (await db.execute(sql`
      SELECT np.id, np.title, np.cover_image_url as "coverImageUrl", np.share_token as "shareToken",
        np.project_type as "projectType",
        COALESCE(u.display_name, u.first_name || ' ' || u.last_name, 'كاتب') as "authorName",
        COALESCE(vc.cnt, 0) as "voteCount"
      FROM novel_projects np
      LEFT JOIN users u ON u.id = np.user_id
      LEFT JOIN LATERAL (SELECT COUNT(*)::int as cnt FROM work_votes wv WHERE wv.project_id = np.id) vc ON true
      WHERE np.id != ${projectId}
        AND np.published_to_gallery = true
        AND np.project_type = ${project.projectType || 'novel'}
        AND (
          np.tags && ${tagsSql}
          OR np.user_id = ${project.userId}
        )
      ORDER BY
        CASE WHEN np.tags && ${tagsSql} THEN 0 ELSE 1 END,
        COALESCE(vc.cnt, 0) DESC,
        np.id DESC
      LIMIT ${limit}
    `)).rows;
    return rows;
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
    if (!user) return undefined;
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
      .leftJoin(users, eq(novelProjects.userId, users.id))
      .where(and(
        isNotNull(novelProjects.shareToken),
        eq(novelProjects.publishedToGallery, true),
        or(eq(novelProjects.flagged, false), isNull(novelProjects.flagged))
      ))
      .orderBy(desc(novelProjects.updatedAt));

    const uniqueAuthorIds = [...new Set(projectsWithAuthors.map(r => r.authorId).filter(Boolean))] as string[];
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
      authorId: row.authorId || row.project.userId,
      authorAverageRating: row.authorId ? (ratingsMap.get(row.authorId) || 0) : 0,
    }));
    result.sort((a, b) => b.authorAverageRating - a.authorAverageRating || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return result;
  }

  async getGalleryProjectsPaginated(page: number = 1, limit: number = 24, projectType?: string): Promise<{ rows: (NovelProject & { authorName: string; authorId: string; authorAverageRating: number })[]; total: number }> {
    const typeFilter = projectType ? sql`AND p.project_type = ${projectType}` : sql``;
    const countResult: any[] = (await db.execute(sql`
      SELECT COUNT(*)::int as total FROM novel_projects p
      WHERE p.share_token IS NOT NULL AND p.published_to_gallery = true
        AND (p.flagged = false OR p.flagged IS NULL)
        ${typeFilter}
    `)).rows;
    const total = countResult[0]?.total || 0;

    const offset = (page - 1) * limit;
    const rows: any[] = (await db.execute(sql`
      SELECT
        p.id, p.title, p.project_type as "projectType",
        p.cover_image_url as "coverImageUrl", p.share_token as "shareToken",
        LEFT(p.main_idea, 300) as "mainIdea", p.subject,
        p.memoire_university as "memoireUniversity", p.memoire_country as "memoireCountry",
        p.memoire_field as "memoireField", p.memoire_degree_level as "memoireDegreeLevel",
        p.memoire_methodology as "memoireMethodology", p.memoire_citation_style as "memoireCitationStyle",
        p.memoire_keywords as "memoireKeywords",
        COALESCE(u.display_name, CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')), 'كاتب مجهول') as "authorName",
        COALESCE(u.id, p.user_id) as "authorId",
        COALESCE(ar_avg.avg_rating, 0)::float as "authorAverageRating",
        COALESCE(u.verified, false) as "authorIsVerified",
        p.tags,
        COALESCE(p.seeking_beta_readers, false) as "seekingBetaReaders",
        (SELECT wc.id FROM writing_challenges wc WHERE wc.winner_id = p.user_id ORDER BY wc.end_date DESC LIMIT 1) as "challengeWinId",
        (SELECT wc.title FROM writing_challenges wc WHERE wc.winner_id = p.user_id ORDER BY wc.end_date DESC LIMIT 1) as "challengeWinTitle",
        (SELECT COUNT(*)::int FROM project_comments pc WHERE pc.project_id = p.id AND pc.approved = true) as "commentCount"
      FROM novel_projects p
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN (SELECT author_id, ROUND(AVG(rating)::numeric, 1)::float as avg_rating FROM author_ratings GROUP BY author_id) ar_avg ON ar_avg.author_id = p.user_id
      WHERE p.share_token IS NOT NULL AND p.published_to_gallery = true
        AND (p.flagged = false OR p.flagged IS NULL)
        ${typeFilter}
      ORDER BY COALESCE(u.verified, false) DESC, "authorAverageRating" DESC, p.updated_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `)).rows;

    return {
      rows: rows.map(r => ({
        ...r,
        authorName: r.authorName?.trim() || 'كاتب مجهول',
      })),
      total,
    };
  }

  async updateUserProfileExtended(userId: string, data: { firstName?: string; lastName?: string; bio?: string; displayName?: string; publicProfile?: boolean; onboardingCompleted?: boolean; profileImageUrl?: string; socialProfiles?: string | null; country?: string | null }): Promise<User> {
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

  async getSavedProjectsEnriched(userId: string): Promise<any[]> {
    const rows: any[] = (await db.execute(sql`
      SELECT np.id, np.title, np.cover_image_url as "coverImageUrl", np.share_token as "shareToken",
        np.project_type as "projectType",
        COALESCE(u.display_name, u.first_name || ' ' || u.last_name, 'كاتب') as "authorName"
      FROM project_favorites pf
      JOIN novel_projects np ON np.id = pf.project_id
      LEFT JOIN users u ON u.id = np.user_id
      WHERE pf.user_id = ${userId}
      ORDER BY pf.created_at DESC
    `)).rows;
    return rows;
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

  async getPendingReviews(limit?: number, offset?: number): Promise<{ data: PlatformReview[]; total: number }> {
    const [totalResult] = await db.select({ count: count() }).from(platformReviews).where(eq(platformReviews.approved, false));
    let query = db.select().from(platformReviews).where(eq(platformReviews.approved, false)).orderBy(desc(platformReviews.createdAt));
    if (limit !== undefined) query = query.limit(limit) as any;
    if (offset !== undefined) query = query.offset(offset) as any;
    const data = await query;
    return { data, total: totalResult?.count || 0 };
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

  async recordEssayView(projectId: number, visitorIp: string, referrer?: string, country?: string | null): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayKey = today.toISOString().slice(0, 10);
    const hashedIp = createHash("sha256").update(visitorIp + dayKey).digest("hex").slice(0, 16);
    const [existing] = await db.select().from(essayViews)
      .where(and(
        eq(essayViews.projectId, projectId),
        eq(essayViews.visitorIp, hashedIp),
        sql`${essayViews.viewedAt} >= ${today}`
      ));
    if (!existing) {
      await db.insert(essayViews).values({ projectId, visitorIp: hashedIp, referrer: referrer || null, country: country || null });
    }
  }

  async getViewsByCountry(userId: string): Promise<Array<{ country: string; count: number }>> {
    const rows: any[] = (await db.execute(sql`
      SELECT ev.country, COUNT(*)::int as count
      FROM essay_views ev
      JOIN novel_projects np ON np.id = ev.project_id
      WHERE np.user_id = ${userId} AND ev.country IS NOT NULL AND ev.country != ''
      GROUP BY ev.country
      ORDER BY count DESC
      LIMIT 20
    `)).rows;
    return rows.map(r => ({ country: r.country, count: Number(r.count) }));
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

  async getAllReviews(limit?: number, offset?: number): Promise<{ data: PlatformReview[]; total: number }> {
    const [totalResult] = await db.select({ count: count() }).from(platformReviews);
    let query = db.select().from(platformReviews).orderBy(desc(platformReviews.createdAt));
    if (limit !== undefined) query = query.limit(limit) as any;
    if (offset !== undefined) query = query.offset(offset) as any;
    const data = await query;
    return { data, total: totalResult?.count || 0 };
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

  async getPublishedEssaysWithStats(page: number = 1, limit: number = 24, search?: string): Promise<{ rows: Array<{ id: number; title: string; mainIdea: string | null; coverImageUrl: string | null; shareToken: string | null; authorName: string; authorId: string; authorAverageRating: number; subject: string | null; views: number; clicks: number; reactions: Record<string, number>; totalWords: number; createdAt: Date }>; total: number }> {
    const offset = (page - 1) * limit;
    const searchFilter = search ? sql` AND (p.title ILIKE ${'%' + search + '%'} OR p.main_idea ILIKE ${'%' + search + '%'} OR u.display_name ILIKE ${'%' + search + '%'} OR u.first_name ILIKE ${'%' + search + '%'} OR u.last_name ILIKE ${'%' + search + '%'})` : sql``;

    const countResult: any[] = (await db.execute(sql`
      SELECT COUNT(*)::int as total FROM novel_projects p
      LEFT JOIN users u ON u.id = p.user_id
      WHERE p.project_type = 'essay' AND p.share_token IS NOT NULL
        AND (p.flagged = false OR p.flagged IS NULL)
        AND (p.published_to_news = true OR p.published_to_gallery = true)
        ${searchFilter}
    `)).rows;
    const total = countResult[0]?.total || 0;

    const rows: any[] = (await db.execute(sql`
      SELECT
        p.id, p.title, LEFT(p.main_idea, 300) as "mainIdea", p.cover_image_url as "coverImageUrl",
        p.share_token as "shareToken", p.subject, p.user_id as "authorId", p.created_at as "createdAt",
        COALESCE(u.display_name, u.first_name, u.email, 'كاتب') as "authorName",
        COALESCE(ar_avg.avg_rating, 0)::float as "authorAverageRating",
        COALESCE(v.view_count, 0)::int as views,
        COALESCE(c.click_count, 0)::int as clicks,
        COALESCE(p.used_words, 0)::int as "totalWords",
        COALESCE(u.verified, false) as "authorIsVerified"
      FROM novel_projects p
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN (SELECT author_id, ROUND(AVG(rating)::numeric, 1)::float as avg_rating FROM author_ratings GROUP BY author_id) ar_avg ON ar_avg.author_id = p.user_id
      LEFT JOIN (SELECT project_id, COUNT(*)::int as view_count FROM essay_views GROUP BY project_id) v ON v.project_id = p.id
      LEFT JOIN (SELECT project_id, COUNT(*)::int as click_count FROM essay_clicks GROUP BY project_id) c ON c.project_id = p.id
      WHERE p.project_type = 'essay' AND p.share_token IS NOT NULL
        AND (p.flagged = false OR p.flagged IS NULL)
        AND (p.published_to_news = true OR p.published_to_gallery = true)
        ${searchFilter}
      ORDER BY COALESCE(u.verified, false) DESC, clicks DESC, p.updated_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `)).rows;

    const projectIds = rows.map(r => Number(r.id));
    let reactionsMap: Record<number, Record<string, number>> = {};
    if (projectIds.length > 0) {
      const idsLiteral = projectIds.join(',');
      const reactionRows: any[] = (await db.execute(sql.raw(`
        SELECT project_id as "projectId", reaction_type as "reactionType", COUNT(*)::int as count
        FROM essay_reactions
        WHERE project_id = ANY(ARRAY[${idsLiteral}]::int[])
        GROUP BY project_id, reaction_type
      `))).rows;
      for (const r of reactionRows) {
        if (!reactionsMap[r.projectId]) reactionsMap[r.projectId] = {};
        reactionsMap[r.projectId][r.reactionType] = r.count;
      }
    }

    return {
      rows: rows.map(r => ({
        id: r.id,
        title: r.title,
        mainIdea: r.mainIdea,
        coverImageUrl: r.coverImageUrl,
        shareToken: r.shareToken,
        authorName: r.authorName,
        authorId: r.authorId,
        authorAverageRating: r.authorAverageRating,
        subject: r.subject,
        views: r.views,
        clicks: r.clicks,
        reactions: reactionsMap[r.id] || {},
        totalWords: r.totalWords,
        createdAt: r.createdAt,
      })),
      total,
    };
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

  async getContentReports(status?: string, limit?: number, offset?: number): Promise<{ data: (ContentReport & { projectTitle?: string; projectType?: string; projectUserId?: string; reportCountForProject?: number })[]; total: number }> {
    const conditions = status ? [eq(contentReports.status, status)] : [];
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [totalResult] = await db.select({ count: count() }).from(contentReports).where(whereClause);
    let query = db
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
      .where(whereClause)
      .orderBy(desc(contentReports.createdAt));
    if (limit !== undefined) query = query.limit(limit) as any;
    if (offset !== undefined) query = query.offset(offset) as any;
    const reports = await query;
    return { data: reports, total: totalResult?.count || 0 };
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
    const [totals] = await db.select({
      total: count(),
      pending: sql<number>`count(*) filter (where ${contentReports.status} = 'pending')`,
      resolvedThisWeek: sql<number>`count(*) filter (where ${contentReports.resolvedAt} > now() - interval '7 days')`,
    }).from(contentReports);

    const severityRows = await db.select({
      severity: sql<string>`coalesce(${contentReports.severity}, 'unset')`,
      cnt: count(),
    }).from(contentReports).groupBy(sql`coalesce(${contentReports.severity}, 'unset')`);

    const reasonRows = await db.select({
      reason: contentReports.reason,
      cnt: count(),
    }).from(contentReports).groupBy(contentReports.reason);

    const bySeverity: Record<string, number> = {};
    for (const r of severityRows) bySeverity[r.severity] = Number(r.cnt);

    const byReason: Record<string, number> = {};
    for (const r of reasonRows) byReason[r.reason] = Number(r.cnt);

    return {
      total: Number(totals?.total || 0),
      pending: Number(totals?.pending || 0),
      bySeverity,
      byReason,
      resolvedThisWeek: Number(totals?.resolvedThisWeek || 0),
    };
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

  async getProjectStatsForUser(userId: string): Promise<Record<number, { realWordCount: number; realPageCount: number }>> {
    const rows = await db
      .select({
        projectId: novelProjects.id,
        content: chapters.content,
      })
      .from(novelProjects)
      .leftJoin(chapters, eq(chapters.projectId, novelProjects.id))
      .where(eq(novelProjects.userId, userId));

    const statsMap: Record<number, { realWordCount: number; realPageCount: number }> = {};
    for (const row of rows) {
      if (!statsMap[row.projectId]) {
        statsMap[row.projectId] = { realWordCount: 0, realPageCount: 0 };
      }
      if (row.content) {
        statsMap[row.projectId].realWordCount += row.content.split(/\s+/).filter((w: string) => w.trim()).length;
      }
    }
    for (const id of Object.keys(statsMap)) {
      const s = statsMap[Number(id)];
      s.realPageCount = s.realWordCount > 0 ? Math.max(1, Math.ceil(s.realWordCount / 250)) : 0;
    }
    return statsMap;
  }

  async getWritingStatsForUser(userId: string): Promise<{ totalWords: number; totalProjects: number; completedProjects: number; avgWordsPerProject: number; dailyWordCounts: { date: string; words: number }[]; projectBreakdown: { projectId: number; title: string; type: string; words: number; chapters: number; completedChapters: number }[] }> {
    const rows = await db
      .select({
        projectId: novelProjects.id,
        projectTitle: novelProjects.title,
        projectType: novelProjects.projectType,
        projectStatus: novelProjects.status,
        chapterId: chapters.id,
        chapterContent: chapters.content,
        chapterStatus: chapters.status,
        chapterCreatedAt: chapters.createdAt,
      })
      .from(novelProjects)
      .leftJoin(chapters, eq(chapters.projectId, novelProjects.id))
      .where(eq(novelProjects.userId, userId));

    const projectMap: Record<number, { title: string; type: string; status: string; words: number; chapters: number; completedChapters: number }> = {};
    const dailyMap: Record<string, number> = {};
    let totalWords = 0;

    for (const row of rows) {
      if (!projectMap[row.projectId]) {
        projectMap[row.projectId] = { title: row.projectTitle, type: row.projectType || "novel", status: row.projectStatus || "", words: 0, chapters: 0, completedChapters: 0 };
      }
      const pm = projectMap[row.projectId];
      if (row.chapterId !== null) {
        pm.chapters++;
        if (row.chapterStatus === "completed") pm.completedChapters++;
        if (row.chapterContent) {
          const words = row.chapterContent.split(/\s+/).filter((w: string) => w.trim()).length;
          pm.words += words;
          totalWords += words;
          if (row.chapterCreatedAt) {
            const dateKey = new Date(row.chapterCreatedAt).toISOString().split("T")[0];
            dailyMap[dateKey] = (dailyMap[dateKey] || 0) + words;
          }
        }
      }
    }

    const projectIds = Object.keys(projectMap).map(Number);
    let completedProjects = 0;
    const projectBreakdown: { projectId: number; title: string; type: string; words: number; chapters: number; completedChapters: number }[] = [];
    for (const pid of projectIds) {
      const pm = projectMap[pid];
      if (pm.status === "completed" || pm.status === "finished") completedProjects++;
      projectBreakdown.push({ projectId: pid, title: pm.title, type: pm.type, words: pm.words, chapters: pm.chapters, completedChapters: pm.completedChapters });
    }

    const today = new Date();
    const dailyWordCounts: { date: string; words: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      dailyWordCounts.push({ date: key, words: dailyMap[key] || 0 });
    }

    return {
      totalWords,
      totalProjects: projectIds.length,
      completedProjects,
      avgWordsPerProject: projectIds.length > 0 ? Math.round(totalWords / projectIds.length) : 0,
      dailyWordCounts,
      projectBreakdown: projectBreakdown.sort((a, b) => b.words - a.words),
    };
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

  async getPlatformStats(): Promise<{ userCount: number; projectCount: number; totalWords: number }> {
    const [uc] = await db.select({ cnt: count() }).from(users);
    const [pc] = await db.select({ cnt: count() }).from(novelProjects);
    const [tw] = await db.select({ total: sql<number>`COALESCE(SUM(used_words), 0)` }).from(novelProjects);
    return { userCount: uc?.cnt || 0, projectCount: pc?.cnt || 0, totalWords: Number(tw?.total) || 0 };
  }

  async getPublicEssayByShareToken(token: string): Promise<{ id: number; title: string; mainIdea: string | null; coverImageUrl: string | null; shareToken: string; authorName: string; authorId: string; authorAverageRating: number; subject: string | null; views: number; clicks: number; reactions: Record<string, number>; totalWords: number; createdAt: Date; essayTone: string | null; targetAudience: string | null } | undefined> {
    const rows: any[] = (await db.execute(sql`
      SELECT
        p.id, p.title, p.main_idea as "mainIdea", p.cover_image_url as "coverImageUrl",
        p.share_token as "shareToken", p.subject, p.user_id as "authorId", p.created_at as "createdAt",
        p.essay_tone as "essayTone", p.target_audience as "targetAudience",
        p.tags,
        COALESCE(p.used_words, 0)::int as "totalWords",
        COALESCE(u.display_name, u.first_name, u.email, 'كاتب') as "authorName",
        COALESCE(ar_avg.avg_rating, 0)::float as "authorAverageRating",
        COALESCE(v.view_count, 0)::int as views,
        COALESCE(c.click_count, 0)::int as clicks
      FROM novel_projects p
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN (SELECT author_id, ROUND(AVG(rating)::numeric, 1)::float as avg_rating FROM author_ratings GROUP BY author_id) ar_avg ON ar_avg.author_id = p.user_id
      LEFT JOIN (SELECT project_id, COUNT(*)::int as view_count FROM essay_views GROUP BY project_id) v ON v.project_id = p.id
      LEFT JOIN (SELECT project_id, COUNT(*)::int as click_count FROM essay_clicks GROUP BY project_id) c ON c.project_id = p.id
      WHERE p.share_token = ${token}
        AND p.project_type = 'essay'
        AND (p.published_to_news = true OR p.published_to_gallery = true)
        AND (p.flagged = false OR p.flagged IS NULL)
      LIMIT 1
    `)).rows;
    if (!rows.length) return undefined;
    const r = rows[0];
    const reactionRows: any[] = (await db.execute(sql.raw(`
      SELECT reaction_type as "reactionType", COUNT(*)::int as count
      FROM essay_reactions WHERE project_id = ${Number(r.id)} GROUP BY reaction_type
    `))).rows;
    const reactions: Record<string, number> = {};
    for (const rr of reactionRows) reactions[rr.reactionType] = rr.count;
    return {
      id: r.id, title: r.title, mainIdea: r.mainIdea, coverImageUrl: r.coverImageUrl,
      shareToken: r.shareToken, authorName: r.authorName, authorId: r.authorId,
      authorAverageRating: r.authorAverageRating, subject: r.subject,
      views: r.views, clicks: r.clicks, reactions,
      totalWords: r.totalWords || 0, createdAt: r.createdAt,
      essayTone: r.essayTone, targetAudience: r.targetAudience,
      tags: r.tags || [],
    };
  }

  async followAuthor(followerId: string, followingId: string): Promise<void> {
    await db.insert(authorFollows).values({ followerId, followingId }).onConflictDoNothing();
  }

  async unfollowAuthor(followerId: string, followingId: string): Promise<void> {
    await db.delete(authorFollows).where(
      and(eq(authorFollows.followerId, followerId), eq(authorFollows.followingId, followingId))
    );
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const [row] = await db.select({ id: authorFollows.id }).from(authorFollows)
      .where(and(eq(authorFollows.followerId, followerId), eq(authorFollows.followingId, followingId)));
    return !!row;
  }

  async getFollowingList(followerId: string): Promise<string[]> {
    const rows = await db.select({ followingId: authorFollows.followingId }).from(authorFollows)
      .where(eq(authorFollows.followerId, followerId));
    return rows.map(r => r.followingId);
  }

  async getAuthorFollowerCount(authorId: string): Promise<number> {
    const [row] = await db.select({ cnt: count() }).from(authorFollows)
      .where(eq(authorFollows.followingId, authorId));
    return row?.cnt || 0;
  }

  async setUserVerified(userId: string, verified: boolean): Promise<User> {
    const [updated] = await db.update(users).set({ verified } as any).where(eq(users.id, userId)).returning();
    return updated;
  }

  async getUsersWithEmails(): Promise<Array<{ id: string; email: string; displayName: string | null }>> {
    const rows = await db.select({ id: users.id, email: users.email, displayName: users.displayName })
      .from(users).where(isNotNull(users.email));
    return rows.filter(r => r.email) as Array<{ id: string; email: string; displayName: string | null }>;
  }

  async getUsersWithEmailsForDigest(): Promise<Array<{ id: string; email: string; displayName: string | null }>> {
    const rows = await db.select({ id: users.id, email: users.email, displayName: users.displayName })
      .from(users)
      .where(and(
        isNotNull(users.email),
        or(eq(users.digestOptOut, false), isNull(users.digestOptOut)),
        or(eq(users.emailNotifications, true), isNull(users.emailNotifications))
      ));
    return rows.filter(r => r.email) as Array<{ id: string; email: string; displayName: string | null }>;
  }

  async setDigestOptOut(userId: string, optOut: boolean): Promise<void> {
    await db.update(users).set({ digestOptOut: optOut, updatedAt: new Date() }).where(eq(users.id, userId));
  }

  async getDigestOptOut(userId: string): Promise<boolean> {
    const [row] = await db.select({ digestOptOut: users.digestOptOut }).from(users).where(eq(users.id, userId));
    return row?.digestOptOut === true;
  }

  async getEmailNotificationsEnabled(userId: string): Promise<boolean> {
    const [row] = await db.select({ emailNotifications: users.emailNotifications }).from(users).where(eq(users.id, userId));
    return row?.emailNotifications !== false;
  }

  async setEmailNotificationsEnabled(userId: string, enabled: boolean): Promise<void> {
    await db.update(users).set({ emailNotifications: enabled, updatedAt: new Date() }).where(eq(users.id, userId));
  }

  async getTopEssaysForWeek(limit: number = 5): Promise<Array<{ id: number; title: string; shareToken: string | null; authorName: string; views: number }>> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const rows: any[] = (await db.execute(sql`
      SELECT p.id, p.title, p.share_token as "shareToken",
        COALESCE(u.display_name, u.first_name, u.email, 'كاتب') as "authorName",
        COUNT(v.id)::int as views
      FROM novel_projects p
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN essay_views v ON v.project_id = p.id AND v.viewed_at > ${oneWeekAgo}
      WHERE p.project_type = 'essay'
        AND (p.published_to_news = true OR p.published_to_gallery = true)
        AND p.share_token IS NOT NULL
        AND (p.flagged = false OR p.flagged IS NULL)
      GROUP BY p.id, p.title, p.share_token, u.display_name, u.first_name, u.email
      ORDER BY views DESC
      LIMIT ${limit}
    `)).rows;
    return rows.map(r => ({ id: Number(r.id), title: r.title, shareToken: r.shareToken, authorName: r.authorName, views: Number(r.views) }));
  }

  async getLeaderboard(limit: number = 20): Promise<Array<{ userId: string; displayName: string; profileImageUrl: string | null; verified: boolean; country: string | null; totalViews: number; followerCount: number; projectCount: number; averageRating: number }>> {
    const rows: any[] = (await db.execute(sql`
      SELECT
        u.id as "userId",
        COALESCE(u.display_name, u.first_name, u.email, 'كاتب') as "displayName",
        u.profile_image_url as "profileImageUrl",
        COALESCE(u.verified, false) as verified,
        u.country as "country",
        COALESCE(SUM(ev.view_count), 0)::int as "totalViews",
        COALESCE(fc.cnt, 0)::int as "followerCount",
        COUNT(DISTINCT p.id)::int as "projectCount",
        COALESCE(AVG(ar.rating), 0)::float as "averageRating"
      FROM users u
      JOIN novel_projects p ON p.user_id = u.id
        AND (p.published_to_news = true OR p.published_to_gallery = true)
        AND (p.flagged = false OR p.flagged IS NULL)
      LEFT JOIN (
        SELECT project_id, COUNT(*)::int as view_count FROM essay_views GROUP BY project_id
      ) ev ON ev.project_id = p.id
      LEFT JOIN (
        SELECT following_id, COUNT(*)::int as cnt FROM author_follows GROUP BY following_id
      ) fc ON fc.following_id = u.id
      LEFT JOIN author_ratings ar ON ar.author_id = u.id
      WHERE u.public_profile = true
      GROUP BY u.id, u.display_name, u.first_name, u.email, u.profile_image_url, u.verified, u.country, fc.cnt
      ORDER BY "totalViews" DESC, "followerCount" DESC
      LIMIT ${limit}
    `)).rows;
    return rows.map(r => ({
      userId: r.userId,
      displayName: r.displayName,
      profileImageUrl: r.profileImageUrl,
      verified: r.verified,
      country: r.country ?? null,
      totalViews: Number(r.totalViews),
      followerCount: Number(r.followerCount),
      projectCount: Number(r.projectCount),
      averageRating: Number(r.averageRating),
    }));
  }

  async createEssayComment(data: { essayId: number; authorName: string; content: string; ipHash?: string }): Promise<any> {
    const [row] = await db.execute(sql`
      INSERT INTO essay_comments (essay_id, author_name, content, ip_hash, approved)
      VALUES (${data.essayId}, ${data.authorName}, ${data.content}, ${data.ipHash || null}, true)
      RETURNING *
    `).then(r => r.rows);
    return row;
  }

  async getEssayComments(essayId: number, onlyApproved: boolean = true): Promise<any[]> {
    const rows: any[] = (await db.execute(sql`
      SELECT * FROM essay_comments
      WHERE essay_id = ${essayId}
        ${onlyApproved ? sql`AND approved = true` : sql``}
      ORDER BY created_at ASC
    `)).rows;
    return rows;
  }

  async approveEssayComment(id: number): Promise<void> {
    await db.execute(sql`UPDATE essay_comments SET approved = true WHERE id = ${id}`);
  }

  async deleteEssayComment(id: number): Promise<void> {
    await db.execute(sql`DELETE FROM essay_comments WHERE id = ${id}`);
  }

  async getPendingComments(limit: number = 50, offset: number = 0): Promise<{ data: any[]; total: number }> {
    const rows: any[] = (await db.execute(sql`
      SELECT ec.*, p.title as "essayTitle"
      FROM essay_comments ec
      LEFT JOIN novel_projects p ON p.id = ec.essay_id
      WHERE ec.approved = false
      ORDER BY ec.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `)).rows;
    const [{ total }]: any[] = (await db.execute(sql`SELECT COUNT(*)::int as total FROM essay_comments WHERE approved = false`)).rows;
    return { data: rows, total: Number(total) };
  }

  async createProjectComment(data: { projectId: number; authorName: string; content: string; ipHash?: string }): Promise<any> {
    const [row] = await db.execute(sql`
      INSERT INTO project_comments (project_id, author_name, content, ip_hash, approved)
      VALUES (${data.projectId}, ${data.authorName}, ${data.content}, ${data.ipHash || null}, true)
      RETURNING *
    `).then(r => r.rows);
    return row;
  }

  async getProjectComments(projectId: number, onlyApproved: boolean = true): Promise<any[]> {
    const rows: any[] = (await db.execute(sql`
      SELECT * FROM project_comments
      WHERE project_id = ${projectId}
        ${onlyApproved ? sql`AND approved = true` : sql``}
      ORDER BY created_at DESC
    `)).rows;
    return rows;
  }

  async getProjectCommentsPaginated(projectId: number, limit: number, offset: number): Promise<{ data: any[]; total: number }> {
    const rows: any[] = (await db.execute(sql`
      SELECT * FROM project_comments
      WHERE project_id = ${projectId} AND approved = true
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `)).rows;
    const [{ total }]: any[] = (await db.execute(sql`
      SELECT COUNT(*)::int as total FROM project_comments WHERE project_id = ${projectId} AND approved = true
    `)).rows;
    return { data: rows, total: Number(total) };
  }

  async getProjectComment(id: number): Promise<any> {
    const [row]: any[] = (await db.execute(sql`SELECT * FROM project_comments WHERE id = ${id}`)).rows;
    return row;
  }

  async getRecentProjectComments(limit: number = 50, offset: number = 0): Promise<{ data: any[]; total: number }> {
    const rows: any[] = (await db.execute(sql`
      SELECT pc.*, p.title as "projectTitle", p.user_id as "projectOwnerId"
      FROM project_comments pc
      LEFT JOIN novel_projects p ON p.id = pc.project_id
      ORDER BY pc.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `)).rows;
    const [{ total }]: any[] = (await db.execute(sql`SELECT COUNT(*)::int as total FROM project_comments`)).rows;
    return { data: rows, total: Number(total) };
  }

  async getProjectCommentCount(projectId: number): Promise<number> {
    const [{ count }]: any[] = (await db.execute(sql`
      SELECT COUNT(*)::int as count FROM project_comments WHERE project_id = ${projectId} AND approved = true
    `)).rows;
    return Number(count);
  }

  async approveProjectComment(id: number): Promise<void> {
    await db.execute(sql`UPDATE project_comments SET approved = true WHERE id = ${id}`);
  }

  async deleteProjectComment(id: number): Promise<void> {
    await db.execute(sql`DELETE FROM project_comments WHERE id = ${id}`);
  }

  async getPendingProjectComments(limit: number = 50, offset: number = 0): Promise<{ data: any[]; total: number }> {
    const rows: any[] = (await db.execute(sql`
      SELECT pc.*, p.title as "projectTitle"
      FROM project_comments pc
      LEFT JOIN novel_projects p ON p.id = pc.project_id
      WHERE pc.approved = false
      ORDER BY pc.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `)).rows;
    const [{ total }]: any[] = (await db.execute(sql`SELECT COUNT(*)::int as total FROM project_comments WHERE approved = false`)).rows;
    return { data: rows, total: Number(total) };
  }

  async createCollection(data: any): Promise<any> {
    const [row] = (await db.execute(sql`
      INSERT INTO collections (user_id, name, slug, description, is_public)
      VALUES (${data.userId}, ${data.name}, ${data.slug}, ${data.description || null}, ${data.isPublic || false})
      RETURNING *
    `)).rows;
    return row;
  }

  async getUserCollections(userId: string): Promise<any[]> {
    const rows: any[] = (await db.execute(sql`
      SELECT c.*, COUNT(ci.id)::int as item_count
      FROM collections c
      LEFT JOIN collection_items ci ON ci.collection_id = c.id
      WHERE c.user_id = ${userId}
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `)).rows;
    return rows;
  }

  async getCollectionById(id: number): Promise<Collection | undefined> {
    const rows = await db.select().from(collections).where(eq(collections.id, id));
    return rows[0];
  }

  async getCollectionBySlug(slug: string): Promise<any | undefined> {
    const [col]: any[] = (await db.execute(sql`
      SELECT * FROM collections WHERE slug = ${slug} AND is_public = true
    `)).rows;
    if (!col) return undefined;
    const items = await this.getCollectionItems(col.id);
    return { ...col, items };
  }

  async getCollectionItems(collectionId: number): Promise<any[]> {
    const items: any[] = (await db.execute(sql`
      SELECT ci.essay_id as "essayId", ci.project_id as "projectId",
        p.title, p.cover_image_url as "coverImageUrl", p.share_token as "shareToken",
        p.project_type as "projectType",
        COALESCE(u.display_name, u.first_name, u.email, 'كاتب') as "authorName"
      FROM collection_items ci
      JOIN novel_projects p ON p.id = COALESCE(ci.project_id, ci.essay_id)
      LEFT JOIN users u ON u.id = p.user_id
      WHERE ci.collection_id = ${collectionId}
      ORDER BY ci.added_at DESC
    `)).rows;
    return items;
  }

  async addToCollection(collectionId: number, essayId?: number, projectId?: number): Promise<void> {
    if (projectId) {
      await db.execute(sql`
        INSERT INTO collection_items (collection_id, project_id)
        VALUES (${collectionId}, ${projectId})
        ON CONFLICT DO NOTHING
      `);
    } else if (essayId) {
      await db.execute(sql`
        INSERT INTO collection_items (collection_id, essay_id)
        VALUES (${collectionId}, ${essayId})
        ON CONFLICT DO NOTHING
      `);
    }
  }

  async removeFromCollection(collectionId: number, essayId?: number, projectId?: number): Promise<void> {
    if (projectId) {
      await db.execute(sql`
        DELETE FROM collection_items WHERE collection_id = ${collectionId} AND project_id = ${projectId}
      `);
    } else if (essayId) {
      await db.execute(sql`
        DELETE FROM collection_items WHERE collection_id = ${collectionId} AND essay_id = ${essayId}
      `);
    }
  }

  async deleteCollection(id: number): Promise<void> {
    await db.execute(sql`DELETE FROM collection_items WHERE collection_id = ${id}`);
    await db.execute(sql`DELETE FROM collections WHERE id = ${id}`);
  }

  async submitVerifiedApplication(data: any): Promise<any> {
    const [row] = (await db.execute(sql`
      INSERT INTO verified_applications (user_id, bio, writing_samples, social_links)
      VALUES (${data.userId}, ${data.bio}, ${data.writingSamples || null}, ${data.socialLinks || null})
      RETURNING *
    `)).rows;
    return row;
  }

  async getVerifiedApplications(status?: string): Promise<any[]> {
    const rows: any[] = (await db.execute(sql`
      SELECT va.*, u.email, COALESCE(u.display_name, u.first_name, u.email) as "displayName"
      FROM verified_applications va
      LEFT JOIN users u ON u.id = va.user_id
      ${status ? sql`WHERE va.status = ${status}` : sql``}
      ORDER BY va.created_at DESC
    `)).rows;
    return rows;
  }

  async updateVerifiedApplication(id: number, status: string, adminNote?: string): Promise<any> {
    const [row] = (await db.execute(sql`
      UPDATE verified_applications
      SET status = ${status}, admin_note = ${adminNote || null}, reviewed_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `)).rows;
    return row;
  }

  async getOrCreateReferralCode(userId: string): Promise<string> {
    const [user]: any[] = (await db.execute(sql`SELECT referral_code FROM users WHERE id = ${userId}`)).rows;
    if (user?.referral_code) return user.referral_code;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    await db.execute(sql`UPDATE users SET referral_code = ${code} WHERE id = ${userId}`);
    return code;
  }

  async applyReferral(referralCode: string, newUserId: string): Promise<{ success: boolean; referrerId?: string }> {
    const [referrer]: any[] = (await db.execute(sql`SELECT id FROM users WHERE referral_code = ${referralCode}`)).rows;
    if (!referrer || referrer.id === newUserId) return { success: false };
    await db.execute(sql`
      UPDATE users SET referral_count = referral_count + 1, bonus_generations = bonus_generations + 2 WHERE id = ${referrer.id}
    `);
    return { success: true, referrerId: referrer.id };
  }

  async getReferralStats(userId: string): Promise<{ referralCode: string; referralCount: number; bonusGenerations: number }> {
    const code = await this.getOrCreateReferralCode(userId);
    const [user]: any[] = (await db.execute(sql`SELECT referral_count, bonus_generations FROM users WHERE id = ${userId}`)).rows;
    return {
      referralCode: code,
      referralCount: Number(user?.referral_count || 0),
      bonusGenerations: Number(user?.bonus_generations || 0),
    };
  }

  async getRelatedEssays(essayId: number, subject: string | null, limit: number = 3): Promise<Array<{ id: number; title: string; coverImageUrl: string | null; shareToken: string | null; authorName: string; views: number }>> {
    const rows: any[] = (await db.execute(sql`
      SELECT p.id, p.title, p.cover_image_url as "coverImageUrl", p.share_token as "shareToken",
        COALESCE(u.display_name, u.first_name, u.email, 'كاتب') as "authorName",
        COUNT(v.id)::int as views
      FROM novel_projects p
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN essay_views v ON v.project_id = p.id
      WHERE p.id != ${essayId}
        AND p.project_type = 'essay'
        AND (p.published_to_news = true OR p.published_to_gallery = true)
        AND p.share_token IS NOT NULL
        AND (p.flagged = false OR p.flagged IS NULL)
        ${subject ? sql`AND p.subject = ${subject}` : sql``}
      GROUP BY p.id, p.title, p.cover_image_url, p.share_token, u.display_name, u.first_name, u.email
      ORDER BY views DESC
      LIMIT ${limit}
    `)).rows;
    return rows.map(r => ({ id: Number(r.id), title: r.title, coverImageUrl: r.coverImageUrl, shareToken: r.shareToken, authorName: r.authorName, views: Number(r.views) }));
  }

  async getEssayOfWeek(): Promise<{ id: number; title: string; shareToken: string; coverImageUrl: string | null; authorName: string; authorId: string; views: number; mainIdea: string | null } | null> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [row]: any[] = (await db.execute(sql`
      SELECT p.id, p.title, p.share_token as "shareToken", p.cover_image_url as "coverImageUrl",
        p.main_idea as "mainIdea", p.user_id as "authorId",
        COALESCE(u.display_name, u.first_name, u.email, 'كاتب') as "authorName",
        COUNT(v.id)::int as views
      FROM novel_projects p
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN essay_views v ON v.project_id = p.id AND v.viewed_at > ${oneWeekAgo}
      WHERE p.project_type = 'essay'
        AND (p.published_to_news = true OR p.published_to_gallery = true)
        AND p.share_token IS NOT NULL
        AND (p.flagged = false OR p.flagged IS NULL)
      GROUP BY p.id, p.title, p.share_token, p.cover_image_url, p.main_idea, p.user_id, u.display_name, u.first_name, u.email
      ORDER BY views DESC
      LIMIT 1
    `)).rows;
    if (!row) return null;
    return { id: Number(row.id), title: row.title, shareToken: row.shareToken, coverImageUrl: row.coverImageUrl, authorName: row.authorName, authorId: row.authorId, views: Number(row.views), mainIdea: row.mainIdea };
  }

  async updateWritingStreak(userId: string): Promise<{ streakDays: number; isNewRecord: boolean }> {
    const today = new Date().toISOString().split('T')[0];
    const [user]: any[] = (await db.execute(sql`SELECT writing_streak, last_writing_date FROM users WHERE id = ${userId}`)).rows;
    const lastDate = user?.last_writing_date;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    let newStreak = 1;
    if (lastDate === today) {
      newStreak = Number(user?.writing_streak || 1);
    } else if (lastDate === yesterday) {
      newStreak = Number(user?.writing_streak || 0) + 1;
    }
    await db.execute(sql`UPDATE users SET writing_streak = ${newStreak}, last_writing_date = ${today} WHERE id = ${userId}`);
    return { streakDays: newStreak, isNewRecord: newStreak > Number(user?.writing_streak || 0) };
  }

  // ── Follower Emails ──────────────────────────────────────────────────────────
  async getFollowerEmails(authorId: string): Promise<Array<{ email: string; displayName: string | null }>> {
    const rows: any[] = (await db.execute(sql`
      SELECT u.email, u.display_name as "displayName"
      FROM author_follows af
      JOIN users u ON u.id = af.follower_id
      WHERE af.following_id = ${authorId}
        AND u.email IS NOT NULL
        AND (u.email_notifications IS NULL OR u.email_notifications = true)
        AND (u.email_follow_publications IS NULL OR u.email_follow_publications = true)
    `)).rows;
    return rows.filter(r => r.email);
  }

  // ── Author Analytics ─────────────────────────────────────────────────────────
  async getAuthorAnalytics(userId: string): Promise<{ totalViews: number; totalEssays: number; followerCount: number; totalReactions: number; topEssays: Array<{ id: number; title: string; shareToken: string | null; views: number; reactions: number }>; viewsThisMonth: number; followersThisMonth: number }> {
    const firstOfMonth = new Date(); firstOfMonth.setDate(1); firstOfMonth.setHours(0, 0, 0, 0);
    const [stats]: any[] = (await db.execute(sql`
      SELECT
        COUNT(DISTINCT p.id)::int as "totalEssays",
        COUNT(DISTINCT v.id)::int as "totalViews",
        COUNT(DISTINCT v2.id)::int as "viewsThisMonth",
        COALESCE((SELECT COUNT(*)::int FROM essay_reactions r WHERE r.project_id IN (SELECT id FROM novel_projects WHERE user_id = ${userId} AND (published_to_news = true OR published_to_gallery = true))), 0)::int as "totalReactions"
      FROM novel_projects p
      LEFT JOIN essay_views v ON v.project_id = p.id
      LEFT JOIN essay_views v2 ON v2.project_id = p.id AND v2.viewed_at >= ${firstOfMonth}
      WHERE p.user_id = ${userId}
        AND (p.published_to_news = true OR p.published_to_gallery = true)
    `)).rows;
    const followerCount = await this.getAuthorFollowerCount(userId);
    const [fmRow]: any[] = (await db.execute(sql`
      SELECT COUNT(*)::int as cnt FROM author_follows WHERE following_id = ${userId} AND created_at >= ${firstOfMonth}
    `)).rows;
    const topEssays: any[] = (await db.execute(sql`
      SELECT p.id, p.title, p.share_token as "shareToken",
        COUNT(DISTINCT v.id)::int as views,
        (SELECT COUNT(*)::int FROM essay_reactions r WHERE r.project_id = p.id) as reactions
      FROM novel_projects p
      LEFT JOIN essay_views v ON v.project_id = p.id
      WHERE p.user_id = ${userId} AND (p.published_to_news = true OR p.published_to_gallery = true)
      GROUP BY p.id, p.title, p.share_token
      ORDER BY views DESC LIMIT 5
    `)).rows;
    return {
      totalViews: Number(stats?.totalViews || 0),
      totalEssays: Number(stats?.totalEssays || 0),
      followerCount,
      totalReactions: Number(stats?.totalReactions || 0),
      topEssays: topEssays.map(r => ({ id: Number(r.id), title: r.title, shareToken: r.shareToken, views: Number(r.views), reactions: Number(r.reactions) })),
      viewsThisMonth: Number(stats?.viewsThisMonth || 0),
      followersThisMonth: Number(fmRow?.cnt || 0),
    };
  }

  async getMonthlyAuthorStats(userId: string): Promise<{ totalViews: number; totalEssays: number; followerCount: number; topEssay: { title: string; views: number } | null; newFollowers: number }> {
    const firstOfMonth = new Date(); firstOfMonth.setDate(1); firstOfMonth.setHours(0, 0, 0, 0);
    const [stats]: any[] = (await db.execute(sql`
      SELECT COUNT(DISTINCT p.id)::int as "totalEssays", COUNT(DISTINCT v.id)::int as "totalViews"
      FROM novel_projects p
      LEFT JOIN essay_views v ON v.project_id = p.id AND v.viewed_at >= ${firstOfMonth}
      WHERE p.user_id = ${userId} AND (p.published_to_news = true OR p.published_to_gallery = true)
    `)).rows;
    const followerCount = await this.getAuthorFollowerCount(userId);
    const [fmRow]: any[] = (await db.execute(sql`SELECT COUNT(*)::int as cnt FROM author_follows WHERE following_id = ${userId} AND created_at >= ${firstOfMonth}`)).rows;
    const [topEssayRow]: any[] = (await db.execute(sql`
      SELECT p.title, COUNT(v.id)::int as views
      FROM novel_projects p LEFT JOIN essay_views v ON v.project_id = p.id AND v.viewed_at >= ${firstOfMonth}
      WHERE p.user_id = ${userId} AND (p.published_to_news = true OR p.published_to_gallery = true)
      GROUP BY p.id, p.title ORDER BY views DESC LIMIT 1
    `)).rows;
    return {
      totalViews: Number(stats?.totalViews || 0),
      totalEssays: Number(stats?.totalEssays || 0),
      followerCount,
      topEssay: topEssayRow ? { title: topEssayRow.title, views: Number(topEssayRow.views) } : null,
      newFollowers: Number(fmRow?.cnt || 0),
    };
  }

  // ── Daily Prompts ────────────────────────────────────────────────────────────
  private _mapDailyPromptRow(row: any): any {
    if (!row) return row;
    return {
      id: row.id,
      promptText: row.prompt_text ?? row.promptText,
      promptDate: row.prompt_date ?? row.promptDate,
      active: row.active,
      winnerId: row.winner_id ?? row.winnerId ?? null,
      winnerEntryId: row.winner_entry_id ?? row.winnerEntryId ?? null,
      createdAt: row.created_at ?? row.createdAt,
    };
  }

  async getTodayPrompt(): Promise<any> {
    const today = new Date().toISOString().split('T')[0];
    const result = await db.execute(sql`SELECT * FROM daily_prompts WHERE prompt_date = ${today} AND active = true LIMIT 1`);
    return this._mapDailyPromptRow(result.rows[0]);
  }

  async getPastPrompts(limit: number = 10): Promise<any[]> {
    const today = new Date().toISOString().split('T')[0];
    const rows: any[] = (await db.execute(sql`SELECT * FROM daily_prompts WHERE prompt_date <= ${today} ORDER BY prompt_date DESC LIMIT ${limit}`)).rows;
    return rows.map((r) => this._mapDailyPromptRow(r));
  }

  async createDailyPrompt(data: any): Promise<any> {
    const [row]: any[] = (await db.execute(sql`
      INSERT INTO daily_prompts (prompt_text, prompt_date, active)
      VALUES (${data.promptText}, ${data.promptDate}, ${data.active ?? true})
      ON CONFLICT (prompt_date) DO UPDATE SET prompt_text = EXCLUDED.prompt_text, active = EXCLUDED.active
      RETURNING *
    `)).rows;
    return this._mapDailyPromptRow(row);
  }

  async getPromptEntries(promptId: number): Promise<any[]> {
    const rows: any[] = (await db.execute(sql`
      SELECT dpe.*, COALESCE(u.display_name, u.first_name, u.email, 'كاتب') as "authorName",
        u.profile_image_url as "authorProfileImage"
      FROM daily_prompt_entries dpe
      JOIN users u ON u.id = dpe.user_id
      WHERE dpe.prompt_id = ${promptId}
      ORDER BY dpe.created_at DESC
    `)).rows;
    return rows;
  }

  async submitPromptEntry(data: any): Promise<any> {
    const [row]: any[] = (await db.execute(sql`
      INSERT INTO daily_prompt_entries (prompt_id, user_id, content)
      VALUES (${data.promptId}, ${data.userId}, ${data.content})
      ON CONFLICT (prompt_id, user_id) DO UPDATE SET content = EXCLUDED.content
      RETURNING *
    `)).rows;
    return row;
  }

  async getUserPromptEntry(promptId: number, userId: string): Promise<any> {
    const [row]: any[] = (await db.execute(sql`
      SELECT * FROM daily_prompt_entries WHERE prompt_id = ${promptId} AND user_id = ${userId} LIMIT 1
    `)).rows;
    return row;
  }

  async setPromptWinner(promptId: number, winnerId: string, winnerEntryId: number): Promise<void> {
    await db.execute(sql`
      UPDATE daily_prompts SET winner_id = ${winnerId}, winner_entry_id = ${winnerEntryId} WHERE id = ${promptId}
    `);
  }

  // ── Author Tips ──────────────────────────────────────────────────────────────
  async createAuthorTip(data: { fromUserId?: string; toAuthorId: string; projectId?: number; amountCents: number; stripeSessionId: string }): Promise<any> {
    const [row]: any[] = (await db.execute(sql`
      INSERT INTO author_tips (from_user_id, to_author_id, project_id, amount_cents, stripe_session_id, status)
      VALUES (${data.fromUserId ?? null}, ${data.toAuthorId}, ${data.projectId ?? null}, ${data.amountCents}, ${data.stripeSessionId}, 'pending')
      RETURNING *
    `)).rows;
    return row;
  }

  async completeAuthorTip(stripeSessionId: string): Promise<void> {
    await db.execute(sql`UPDATE author_tips SET status = 'completed' WHERE stripe_session_id = ${stripeSessionId}`);
  }

  async getTipsByAuthor(authorId: string): Promise<any[]> {
    const rows: any[] = (await db.execute(sql`
      SELECT at.*, COALESCE(u.display_name, u.first_name, 'قارئ') as "fromName"
      FROM author_tips at LEFT JOIN users u ON u.id = at.from_user_id
      WHERE at.to_author_id = ${authorId} AND at.status = 'completed'
      ORDER BY at.created_at DESC
    `)).rows;
    return rows;
  }

  async getViewsSeries(userId: string): Promise<Array<{ date: string; views: number }>> {
    const rows: any[] = (await db.execute(sql`
      SELECT d.day::date as date, COUNT(v.id)::int as views
      FROM generate_series(NOW() - INTERVAL '30 days', NOW(), '1 day') d(day)
      LEFT JOIN essay_views v ON v.viewed_at::date = d.day::date
        AND v.project_id IN (SELECT id FROM novel_projects WHERE user_id = ${userId} AND (published_to_news = true OR published_to_gallery = true))
      GROUP BY d.day::date
      ORDER BY d.day::date ASC
    `)).rows;
    return rows.map((r: any) => ({ date: new Date(r.date).toISOString().split("T")[0], views: Number(r.views) }));
  }

  async getFollowerHistory(userId: string): Promise<Array<{ week: string; count: number }>> {
    const rows: any[] = (await db.execute(sql`
      SELECT date_trunc('week', created_at)::date as week, COUNT(*)::int as count
      FROM author_follows
      WHERE following_id = ${userId} AND created_at >= NOW() - INTERVAL '12 weeks'
      GROUP BY week
      ORDER BY week ASC
    `)).rows;
    return rows.map((r: any) => ({ week: new Date(r.week).toISOString().split("T")[0], count: Number(r.count) }));
  }

  async getCompletionRates(userId: string): Promise<Array<{ id: number; title: string; shareToken: string | null; totalChapters: number; readers: number; completions: number; completionRate: number }>> {
    const rows: any[] = (await db.execute(sql`
      SELECT np.id, np.title, np.share_token as "shareToken",
             COUNT(DISTINCT c.id)::int as total_chapters,
             COUNT(DISTINCT rp.id)::int as readers,
             COUNT(DISTINCT CASE WHEN rp.last_chapter_id = (SELECT id FROM chapters WHERE project_id = np.id ORDER BY chapter_number DESC LIMIT 1) THEN rp.id END)::int as completions
      FROM novel_projects np
      LEFT JOIN chapters c ON c.project_id = np.id
      LEFT JOIN reading_progress rp ON rp.project_id = np.id
      WHERE np.user_id = ${userId} AND (np.published_to_news = true OR np.published_to_gallery = true)
      GROUP BY np.id, np.title, np.share_token
      HAVING COUNT(DISTINCT c.id) > 0
      ORDER BY readers DESC
      LIMIT 10
    `)).rows;
    return rows.map((r: any) => ({
      id: Number(r.id),
      title: r.title,
      shareToken: r.shareToken,
      totalChapters: Number(r.total_chapters),
      readers: Number(r.readers),
      completions: Number(r.completions),
      completionRate: Number(r.readers) > 0 ? Math.round((Number(r.completions) / Number(r.readers)) * 100) : 0,
    }));
  }

  async getViewsByStory(userId: string): Promise<Array<{ id: number; title: string; data: Array<{ date: string; views: number }> }>> {
    const rows: any[] = (await db.execute(sql`
      SELECT np.id, np.title,
             d.day::date as date,
             COUNT(v.id)::int as views
      FROM novel_projects np
      CROSS JOIN generate_series(NOW() - INTERVAL '30 days', NOW(), '1 day') d(day)
      LEFT JOIN essay_views v ON v.project_id = np.id AND v.viewed_at::date = d.day::date
      WHERE np.user_id = ${userId} AND (np.published_to_news = true OR np.published_to_gallery = true)
      GROUP BY np.id, np.title, d.day::date
      ORDER BY np.id, d.day::date ASC
    `)).rows;
    const stories: Record<number, { id: number; title: string; data: Array<{ date: string; views: number }> }> = {};
    for (const r of rows) {
      const sid = Number(r.id);
      if (!stories[sid]) stories[sid] = { id: sid, title: r.title, data: [] };
      stories[sid].data.push({ date: new Date(r.date).toISOString().split("T")[0], views: Number(r.views) });
    }
    return Object.values(stories);
  }

  // ── Email Subscriptions ───────────────────────────────────────────────────────
  async subscribeEmailToAuthor(email: string, authorId: string): Promise<{ token: string; alreadySubscribed: boolean }> {
    const existing: any[] = (await db.execute(sql`
      SELECT token FROM email_subscriptions WHERE email = ${email} AND author_id = ${authorId}
    `)).rows;
    if (existing.length > 0) return { token: existing[0].token, alreadySubscribed: true };
    const { randomBytes } = await import("crypto");
    const token = randomBytes(48).toString("hex");
    await db.execute(sql`
      INSERT INTO email_subscriptions (email, author_id, token) VALUES (${email}, ${authorId}, ${token})
      ON CONFLICT (email, author_id) DO NOTHING
    `);
    return { token, alreadySubscribed: false };
  }

  async unsubscribeEmailByToken(token: string): Promise<boolean> {
    const result: any = await db.execute(sql`DELETE FROM email_subscriptions WHERE token = ${token} RETURNING id`);
    return (result.rows?.length ?? 0) > 0;
  }

  async getEmailSubscribersForAuthor(authorId: string): Promise<{ email: string }[]> {
    const rows: any[] = (await db.execute(sql`SELECT email FROM email_subscriptions WHERE author_id = ${authorId}`)).rows;
    return rows.map(r => ({ email: r.email }));
  }

  async isEmailSubscribed(email: string, authorId: string): Promise<boolean> {
    const rows: any[] = (await db.execute(sql`SELECT 1 FROM email_subscriptions WHERE email = ${email} AND author_id = ${authorId}`)).rows;
    return rows.length > 0;
  }

  // ── Content Series ───────────────────────────────────────────────────────────
  async createSeries(data: any): Promise<any> {
    const [row]: any[] = (await db.execute(sql`
      INSERT INTO content_series (user_id, title, description)
      VALUES (${data.userId}, ${data.title}, ${data.description ?? null})
      RETURNING *
    `)).rows;
    return row;
  }

  async getSeriesByUser(userId: string): Promise<any[]> {
    const rows: any[] = (await db.execute(sql`
      SELECT cs.*, COUNT(si.id)::int as item_count
      FROM content_series cs LEFT JOIN series_items si ON si.series_id = cs.id
      WHERE cs.user_id = ${userId}
      GROUP BY cs.id ORDER BY cs.created_at DESC
    `)).rows;
    return rows;
  }

  async getSeriesById(id: number): Promise<any> {
    const [series]: any[] = (await db.execute(sql`SELECT * FROM content_series WHERE id = ${id}`)).rows;
    if (!series) return undefined;
    const items: any[] = (await db.execute(sql`
      SELECT si.id, si.order_index as "orderIndex",
        p.id as "projectId", p.title, p.share_token as "shareToken",
        p.cover_image_url as "coverImageUrl", p.main_idea as "mainIdea"
      FROM series_items si
      JOIN novel_projects p ON p.id = si.project_id
      WHERE si.series_id = ${id}
      ORDER BY si.order_index ASC, si.created_at ASC
    `)).rows;
    return { ...series, items: items.map(r => ({ id: r.id, orderIndex: r.orderIndex, project: { id: r.projectId, title: r.title, shareToken: r.shareToken, coverImageUrl: r.coverImageUrl, mainIdea: r.mainIdea } })) };
  }

  async addSeriesItem(seriesId: number, projectId: number, orderIndex: number = 0): Promise<void> {
    await db.execute(sql`
      INSERT INTO series_items (series_id, project_id, order_index)
      VALUES (${seriesId}, ${projectId}, ${orderIndex})
      ON CONFLICT (series_id, project_id) DO UPDATE SET order_index = EXCLUDED.order_index
    `);
  }

  async removeSeriesItem(seriesId: number, projectId: number): Promise<void> {
    await db.execute(sql`DELETE FROM series_items WHERE series_id = ${seriesId} AND project_id = ${projectId}`);
  }

  async deleteSeries(id: number): Promise<void> {
    await db.execute(sql`DELETE FROM content_series WHERE id = ${id}`);
  }
  // ── Social Hub ──────────────────────────────────────────────────────────────
  async createSocialPost(data: { content: string; platforms: string[]; scheduledAt?: Date | null; status?: string; postType?: string; coverImageUrl?: string | null }): Promise<any> {
    const validPlatforms = ["facebook", "instagram", "x", "tiktok", "linkedin"];
    const safePlatforms = data.platforms.filter(p => validPlatforms.includes(p));
    const platformsLiteral = sql.raw(`ARRAY[${safePlatforms.map(p => `'${p}'`).join(",")}]::text[]`);
    const [row] = (await db.execute(sql`
      INSERT INTO social_posts (content, platforms, scheduled_at, status, post_type, cover_image_url)
      VALUES (${data.content}, ${platformsLiteral}, ${data.scheduledAt || null}, ${data.status || "draft"}, ${data.postType || "marketing"}, ${data.coverImageUrl || null})
      RETURNING *
    `)).rows;
    return row;
  }

  async getSocialPosts(status?: string): Promise<any[]> {
    if (status) {
      return (await db.execute(sql`SELECT * FROM social_posts WHERE status = ${status} ORDER BY COALESCE(scheduled_at, created_at) DESC`)).rows;
    }
    return (await db.execute(sql`SELECT * FROM social_posts ORDER BY COALESCE(scheduled_at, created_at) DESC`)).rows;
  }

  async getSocialPostById(id: number): Promise<any> {
    const [row] = (await db.execute(sql`SELECT * FROM social_posts WHERE id = ${id}`)).rows;
    return row;
  }

  async updateSocialPost(id: number, data: Partial<{ content: string; platforms: string[]; scheduledAt: Date | null; status: string; postType: string; coverImageUrl: string | null }>): Promise<any> {
    const sets: string[] = [];
    const vals: any[] = [];
    if (data.content !== undefined) { sets.push("content"); vals.push(data.content); }
    if (data.status !== undefined) { sets.push("status"); vals.push(data.status); }
    if (data.postType !== undefined) { sets.push("post_type"); vals.push(data.postType); }
    if (data.coverImageUrl !== undefined) { sets.push("cover_image_url"); vals.push(data.coverImageUrl); }
    if (data.scheduledAt !== undefined) { sets.push("scheduled_at"); vals.push(data.scheduledAt); }

    if (data.platforms !== undefined) {
      const validPlatforms = ["facebook", "instagram", "x", "tiktok", "linkedin"];
      const safePlatforms = data.platforms.filter(p => validPlatforms.includes(p));
      const platformsArr = sql.raw(`ARRAY[${safePlatforms.map(p => `'${p}'`).join(",")}]::text[]`);
      await db.execute(sql`UPDATE social_posts SET platforms = ${platformsArr} WHERE id = ${id}`);
    }

    for (let i = 0; i < sets.length; i++) {
      await db.execute(sql`UPDATE social_posts SET ${sql.raw(`${sets[i]} = `)}${vals[i]} WHERE id = ${id}`);
    }
    return this.getSocialPostById(id);
  }

  async deleteSocialPost(id: number): Promise<void> {
    await db.execute(sql`DELETE FROM social_posts WHERE id = ${id}`);
  }

  async addSocialPostInsight(data: { postId: number; likes: number; shares: number; reach: number; clicks: number; comments: number }): Promise<any> {
    const [row] = (await db.execute(sql`
      INSERT INTO social_post_insights (post_id, likes, shares, reach, clicks, comments)
      VALUES (${data.postId}, ${data.likes}, ${data.shares}, ${data.reach}, ${data.clicks}, ${data.comments})
      RETURNING *
    `)).rows;
    return row;
  }

  async getSocialPostInsights(postId: number): Promise<any[]> {
    return (await db.execute(sql`SELECT * FROM social_post_insights WHERE post_id = ${postId} ORDER BY logged_at DESC`)).rows;
  }

  async getInsightsGroupedByPost(): Promise<any[]> {
    return (await db.execute(sql`
      SELECT sp.id as post_id, sp.content, sp.platforms, sp.post_type, sp.status,
        sp.scheduled_at, sp.cover_image_url,
        COALESCE(SUM(spi.likes), 0)::int as total_likes,
        COALESCE(SUM(spi.shares), 0)::int as total_shares,
        COALESCE(SUM(spi.reach), 0)::int as total_reach,
        COALESCE(SUM(spi.clicks), 0)::int as total_clicks,
        COALESCE(SUM(spi.comments), 0)::int as total_comments,
        COUNT(spi.id)::int as insight_entries
      FROM social_posts sp
      LEFT JOIN social_post_insights spi ON spi.post_id = sp.id
      WHERE sp.status = 'posted'
      GROUP BY sp.id
      ORDER BY sp.scheduled_at DESC
      LIMIT 50
    `)).rows;
  }

  async getYesterdayEngagement(): Promise<{ totalLikes: number; totalShares: number; totalReach: number; totalClicks: number; totalComments: number; postCount: number }> {
    const rows: any[] = (await db.execute(sql`
      SELECT
        COALESCE(SUM(spi.likes), 0)::int as "totalLikes",
        COALESCE(SUM(spi.shares), 0)::int as "totalShares",
        COALESCE(SUM(spi.reach), 0)::int as "totalReach",
        COALESCE(SUM(spi.clicks), 0)::int as "totalClicks",
        COALESCE(SUM(spi.comments), 0)::int as "totalComments",
        COUNT(DISTINCT sp.id)::int as "postCount"
      FROM social_posts sp
      JOIN social_post_insights spi ON spi.post_id = sp.id
      WHERE sp.scheduled_at >= CURRENT_DATE - INTERVAL '1 day'
        AND sp.scheduled_at < CURRENT_DATE
    `)).rows;
    return rows[0] || { totalLikes: 0, totalShares: 0, totalReach: 0, totalClicks: 0, totalComments: 0, postCount: 0 };
  }

  async getDueScheduledPosts(): Promise<any[]> {
    return (await db.execute(sql`
      SELECT * FROM social_posts
      WHERE status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= NOW()
      ORDER BY scheduled_at ASC
    `)).rows;
  }

  async getBestPostingTimes(): Promise<{ hour: number; avgEngagement: number }[]> {
    const rows: any[] = (await db.execute(sql`
      SELECT EXTRACT(HOUR FROM sp.scheduled_at)::int as hour,
        AVG(spi.likes + spi.shares + spi.reach + spi.clicks + spi.comments)::real as "avgEngagement"
      FROM social_posts sp
      JOIN social_post_insights spi ON spi.post_id = sp.id
      WHERE sp.scheduled_at IS NOT NULL
      GROUP BY hour
      ORDER BY "avgEngagement" DESC
    `)).rows;
    return rows;
  }

  async updateProjectTags(projectId: number, tags: string[]): Promise<NovelProject> {
    const cleanTags = tags.slice(0, 5).map(t => t.trim()).filter(Boolean);
    const [updated] = await db.update(novelProjects).set({ tags: cleanTags, updatedAt: new Date() }).where(eq(novelProjects.id, projectId)).returning();
    return updated;
  }

  async getProjectsByTag(tag: string, limit = 20, offset = 0): Promise<{ rows: NovelProject[]; total: number }> {
    const rows: any[] = (await db.execute(sql`
      SELECT * FROM novel_projects
      WHERE published_to_gallery = true AND ${tag} = ANY(tags)
      ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `)).rows;
    const [{ count: total }]: any[] = (await db.execute(sql`
      SELECT COUNT(*)::int as count FROM novel_projects
      WHERE published_to_gallery = true AND ${tag} = ANY(tags)
    `)).rows;
    return { rows, total };
  }

  async getGalleryProjectsByTag(tag: string, page = 1, limit = 24, projectType?: string): Promise<{ rows: (NovelProject & { authorName: string; authorId: string; authorAverageRating: number })[]; total: number }> {
    const offset = (page - 1) * limit;
    const typeFilter = projectType ? sql`AND np.project_type = ${projectType}` : sql``;
    const rows: any[] = (await db.execute(sql`
      SELECT
        np.id, np.title, np.project_type as "projectType",
        np.cover_image_url as "coverImageUrl", np.share_token as "shareToken",
        LEFT(np.main_idea, 300) as "mainIdea",
        np.tags,
        COALESCE(np.seeking_beta_readers, false) as "seekingBetaReaders",
        COALESCE(u.display_name, CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')), 'كاتب مجهول') as "authorName",
        COALESCE(u.id, np.user_id) as "authorId",
        COALESCE(ar_avg.avg_rating, 0)::float as "authorAverageRating",
        COALESCE(u.verified, false) as "authorIsVerified",
        (SELECT wc.id FROM writing_challenges wc WHERE wc.winner_id = np.user_id ORDER BY wc.end_date DESC LIMIT 1) as "challengeWinId",
        (SELECT wc.title FROM writing_challenges wc WHERE wc.winner_id = np.user_id ORDER BY wc.end_date DESC LIMIT 1) as "challengeWinTitle",
        (SELECT COUNT(*)::int FROM project_comments pc WHERE pc.project_id = np.id AND pc.approved = true) as "commentCount"
      FROM novel_projects np
      LEFT JOIN users u ON u.id = np.user_id
      LEFT JOIN (SELECT author_id, ROUND(AVG(rating)::numeric, 1)::float as avg_rating FROM author_ratings GROUP BY author_id) ar_avg ON ar_avg.author_id = np.user_id
      WHERE np.published_to_gallery = true
        AND (np.flagged = false OR np.flagged IS NULL)
        AND ${tag} = ANY(np.tags)
        ${typeFilter}
      ORDER BY COALESCE(u.verified, false) DESC, "authorAverageRating" DESC, np.updated_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `)).rows;
    const typeFilterCount = projectType ? sql`AND project_type = ${projectType}` : sql``;
    const [{ count: total }]: any[] = (await db.execute(sql`
      SELECT COUNT(*)::int as count FROM novel_projects
      WHERE published_to_gallery = true AND (flagged = false OR flagged IS NULL) AND ${tag} = ANY(tags)
      ${typeFilterCount}
    `)).rows;
    return {
      rows: rows.map(r => ({
        ...r,
        authorName: r.authorName?.trim() || 'كاتب مجهول',
      })),
      total,
    };
  }

  async createWritingChallenge(data: any): Promise<any> {
    const [row] = (await db.execute(sql`
      INSERT INTO writing_challenges (title, description, theme, project_type, prize_description, start_date, end_date, created_by)
      VALUES (${data.title}, ${data.description}, ${data.theme || null}, ${data.projectType || "essay"}, ${data.prizeDescription || null}, ${data.startDate || new Date()}, ${data.endDate}, ${data.createdBy})
      RETURNING *
    `)).rows;
    return row;
  }

  async getWritingChallenges(): Promise<any[]> {
    return (await db.execute(sql`
      SELECT wc.*, COUNT(ce.id)::int as "entryCount",
        COALESCE(wu.display_name, wu.first_name || ' ' || wu.last_name, NULL) as "winnerName",
        wu.profile_image_url as "winnerProfileImage",
        we.content as "winnerEntryContent"
      FROM writing_challenges wc
      LEFT JOIN challenge_entries ce ON ce.challenge_id = wc.id
      LEFT JOIN users wu ON wu.id = wc.winner_id
      LEFT JOIN challenge_entries we ON we.id = wc.winner_entry_id
      GROUP BY wc.id, wu.display_name, wu.first_name, wu.last_name, wu.profile_image_url, we.content
      ORDER BY wc.end_date DESC
    `)).rows;
  }

  async getWritingChallenge(id: number): Promise<any> {
    const rows: any[] = (await db.execute(sql`
      SELECT wc.*, COUNT(ce.id)::int as "entryCount"
      FROM writing_challenges wc
      LEFT JOIN challenge_entries ce ON ce.challenge_id = wc.id
      WHERE wc.id = ${id}
      GROUP BY wc.id
    `)).rows;
    return rows[0];
  }

  async deleteChallenge(id: number): Promise<void> {
    await db.execute(sql`DELETE FROM challenge_entries WHERE challenge_id = ${id}`);
    await db.execute(sql`DELETE FROM writing_challenges WHERE id = ${id}`);
  }

  async setChallengWinner(challengeId: number, winnerId: string, winnerEntryId: number): Promise<any> {
    const [row] = (await db.execute(sql`
      UPDATE writing_challenges SET winner_id = ${winnerId}, winner_entry_id = ${winnerEntryId}
      WHERE id = ${challengeId} RETURNING *
    `)).rows;
    return row;
  }

  async submitChallengeEntry(data: any): Promise<any> {
    const [row] = (await db.execute(sql`
      INSERT INTO challenge_entries (challenge_id, user_id, content)
      VALUES (${data.challengeId}, ${data.userId}, ${data.content})
      RETURNING *
    `)).rows;
    return row;
  }

  async getChallengeEntries(challengeId: number): Promise<any[]> {
    return (await db.execute(sql`
      SELECT ce.*,
        COALESCE(u.display_name, u.first_name || ' ' || u.last_name, 'كاتب') as "authorName",
        u.profile_image_url as "authorProfileImage"
      FROM challenge_entries ce
      LEFT JOIN users u ON u.id = ce.user_id
      WHERE ce.challenge_id = ${challengeId}
      ORDER BY ce.created_at ASC
    `)).rows;
  }

  async getUserChallengeEntry(challengeId: number, userId: string): Promise<any> {
    const rows: any[] = (await db.execute(sql`
      SELECT * FROM challenge_entries WHERE challenge_id = ${challengeId} AND user_id = ${userId} LIMIT 1
    `)).rows;
    return rows[0];
  }

  async requestBetaReader(data: any): Promise<any> {
    const [row] = (await db.execute(sql`
      INSERT INTO beta_reader_requests (project_id, user_id, message)
      VALUES (${data.projectId}, ${data.userId}, ${data.message || null})
      ON CONFLICT (project_id, user_id) DO NOTHING
      RETURNING *
    `)).rows;
    return row;
  }

  async getBetaReaderRequests(projectId: number): Promise<any[]> {
    return (await db.execute(sql`
      SELECT br.*,
        COALESCE(u.display_name, u.first_name || ' ' || u.last_name, 'قارئ') as "userName",
        u.profile_image_url as "userProfileImage"
      FROM beta_reader_requests br
      LEFT JOIN users u ON u.id = br.user_id
      WHERE br.project_id = ${projectId}
      ORDER BY br.created_at ASC
    `)).rows;
  }

  async cancelBetaReaderRequest(projectId: number, userId: string): Promise<void> {
    await db.execute(sql`DELETE FROM beta_reader_requests WHERE project_id = ${projectId} AND user_id = ${userId}`);
  }

  async getRelatedProjects(projectId: number, limit = 3): Promise<any[]> {
    const project = await this.getProject(projectId);
    if (!project) return [];
    const tagsArr = (project.tags || []).filter(Boolean);
    const tagsSql = tagsArr.length > 0
      ? sql.raw(`ARRAY[${tagsArr.map(t => `'${t.replace(/'/g, "''")}'`).join(",")}]::text[]`)
      : sql.raw(`ARRAY[]::text[]`);
    const rows: any[] = (await db.execute(sql`
      SELECT np.id, np.title, np.cover_image_url as "coverImageUrl", np.share_token as "shareToken",
        np.project_type as "projectType",
        COALESCE(u.display_name, u.first_name || ' ' || u.last_name, 'كاتب') as "authorName"
      FROM novel_projects np
      LEFT JOIN users u ON u.id = np.user_id
      WHERE np.id != ${projectId}
        AND np.published_to_gallery = true
        AND (
          np.user_id = ${project.userId}
          OR np.tags && ${tagsSql}
        )
      ORDER BY
        CASE WHEN np.tags && ${tagsSql} THEN 0
             WHEN np.user_id = ${project.userId} THEN 1
             ELSE 2 END,
        np.created_at DESC
      LIMIT ${limit}
    `)).rows;
    return rows;
  }

  async checkChapterUnlock(userId: string, chapterId: number): Promise<boolean> {
    const rows: any[] = (await db.execute(sql`
      SELECT 1 FROM chapter_unlocks WHERE user_id = ${userId} AND chapter_id = ${chapterId} LIMIT 1
    `)).rows;
    return rows.length > 0;
  }

  async createChapterUnlock(userId: string, chapterId: number, stripeSessionId?: string): Promise<void> {
    await db.execute(sql`
      INSERT INTO chapter_unlocks (user_id, chapter_id, stripe_session_id)
      VALUES (${userId}, ${chapterId}, ${stripeSessionId || null})
      ON CONFLICT (user_id, chapter_id) DO NOTHING
    `);
  }

  async getUnlockedChapterIds(userId: string, projectId: number): Promise<number[]> {
    const rows: any[] = (await db.execute(sql`
      SELECT cu.chapter_id FROM chapter_unlocks cu
      JOIN chapters c ON c.id = cu.chapter_id
      WHERE cu.user_id = ${userId} AND c.project_id = ${projectId}
    `)).rows;
    return rows.map((r: any) => r.chapter_id);
  }

  async createGiftSubscription(data: { gifterUserId: string; gifterEmail: string; recipientEmail: string; plan: string; token: string; stripeSessionId?: string }): Promise<GiftSubscription> {
    const rows: any[] = (await db.execute(sql`
      INSERT INTO gift_subscriptions (gifter_user_id, gifter_email, recipient_email, plan, token, stripe_session_id)
      VALUES (${data.gifterUserId}, ${data.gifterEmail}, ${data.recipientEmail}, ${data.plan}, ${data.token}, ${data.stripeSessionId || null})
      RETURNING *
    `)).rows;
    return rows[0];
  }

  async getGiftByToken(token: string): Promise<GiftSubscription | undefined> {
    const rows: any[] = (await db.execute(sql`
      SELECT * FROM gift_subscriptions WHERE token = ${token} LIMIT 1
    `)).rows;
    return rows[0] || undefined;
  }

  async redeemGift(token: string, userId: string): Promise<GiftSubscription> {
    const rows: any[] = (await db.execute(sql`
      UPDATE gift_subscriptions SET redeemed = true, redeemed_by = ${userId}, redeemed_at = NOW()
      WHERE token = ${token} AND redeemed = false
      RETURNING *
    `)).rows;
    if (!rows[0]) throw new Error("Gift not found or already redeemed");
    return rows[0];
  }

  async getGiftsByGifter(userId: string): Promise<GiftSubscription[]> {
    const rows: any[] = (await db.execute(sql`
      SELECT * FROM gift_subscriptions WHERE gifter_user_id = ${userId} ORDER BY created_at DESC
    `)).rows;
    return rows;
  }

  async getPointsBalance(userId: string): Promise<number> {
    const rows: any[] = (await db.execute(sql`
      SELECT balance FROM user_points WHERE user_id = ${userId} LIMIT 1
    `)).rows;
    return rows[0]?.balance || 0;
  }

  async addPoints(userId: string, points: number, reason: string, metadata?: string): Promise<number> {
    await db.execute(sql`
      INSERT INTO user_points (user_id, balance)
      VALUES (${userId}, ${points})
      ON CONFLICT (user_id) DO UPDATE SET balance = user_points.balance + ${points}
    `);
    if (metadata) {
      await db.execute(sql`
        INSERT INTO point_transactions (user_id, points, reason, metadata) VALUES (${userId}, ${points}, ${reason}, ${metadata})
      `);
    } else {
      await db.execute(sql`
        INSERT INTO point_transactions (user_id, points, reason) VALUES (${userId}, ${points}, ${reason})
      `);
    }
    const balance = await this.getPointsBalance(userId);
    return balance;
  }

  async getPointHistory(userId: string, limit = 50): Promise<PointTransaction[]> {
    const rows: any[] = (await db.execute(sql`
      SELECT * FROM point_transactions WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT ${limit}
    `)).rows;
    return rows;
  }

  async redeemPoints(userId: string, points: number, reason: string): Promise<{ newBalance: number }> {
    const balance = await this.getPointsBalance(userId);
    if (balance < points) throw new Error("Insufficient points");
    await db.execute(sql`
      UPDATE user_points SET balance = balance - ${points} WHERE user_id = ${userId}
    `);
    await db.execute(sql`
      INSERT INTO point_transactions (user_id, points, reason) VALUES (${userId}, ${-points}, ${reason})
    `);
    const newBalance = await this.getPointsBalance(userId);
    return { newBalance };
  }

  async createNewsletterSend(data: { authorId: string; subject: string; body: string; recipientCount: number }): Promise<NewsletterSend> {
    const [created] = await db.insert(newsletterSends).values(data).returning();
    return created;
  }

  async getNewsletterSendsByAuthor(authorId: string, limit = 20): Promise<NewsletterSend[]> {
    return db.select().from(newsletterSends).where(eq(newsletterSends.authorId, authorId)).orderBy(desc(newsletterSends.createdAt)).limit(limit);
  }

  async getRecentPublicationsByFollowedAuthors(userId: string, daysBack = 7): Promise<Array<{ id: number; title: string; shareToken: string | null; authorName: string; projectType: string }>> {
    const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    const rows: any[] = (await pool.query(`
      (SELECT p.id, p.title, p.share_token as "shareToken",
        COALESCE(u.display_name, u.first_name, 'كاتب') as "authorName",
        p.project_type as "projectType",
        p.created_at
      FROM novel_projects p
      JOIN author_follows af ON af.following_id = p.user_id AND af.follower_id = $1
      LEFT JOIN users u ON u.id = p.user_id
      WHERE (p.published_to_news = true OR p.published_to_gallery = true)
        AND p.created_at > $2
        AND p.share_token IS NOT NULL
        AND (p.flagged = false OR p.flagged IS NULL))
      UNION ALL
      (SELECT c.id, c.title, p.share_token as "shareToken",
        COALESCE(u.display_name, u.first_name, 'كاتب') as "authorName",
        'chapter' as "projectType",
        c.created_at
      FROM chapters c
      JOIN novel_projects p ON p.id = c.project_id
      JOIN author_follows af ON af.following_id = p.user_id AND af.follower_id = $1
      LEFT JOIN users u ON u.id = p.user_id
      WHERE c.created_at > $2
        AND p.share_token IS NOT NULL
        AND (p.published_to_news = true OR p.published_to_gallery = true)
        AND (p.flagged = false OR p.flagged IS NULL))
      ORDER BY created_at DESC
      LIMIT 15
    `, [userId, cutoff])).rows;
    return rows;
  }

  async checkAndIncrementAiUsage(userId: string): Promise<{ allowed: boolean; remaining: number; resetTime: string }> {
    const MAX_DAILY = 20;
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const resetTime = tomorrow.toISOString();

    const { pool } = await import("./db");

    const result = await pool.query(
      `UPDATE users
       SET daily_ai_uses = CASE
         WHEN last_ai_use_date = $2 THEN daily_ai_uses + 1
         ELSE 1
       END,
       last_ai_use_date = $2
       WHERE id = $1
         AND (
           last_ai_use_date != $2
           OR COALESCE(daily_ai_uses, 0) < $3
         )
       RETURNING daily_ai_uses`,
      [userId, today, MAX_DAILY]
    );

    if (result.rowCount === 0) {
      return { allowed: false, remaining: 0, resetTime };
    }

    const newCount = result.rows[0].daily_ai_uses;
    return { allowed: true, remaining: MAX_DAILY - newCount, resetTime: "" };
  }

  async getAiUsageStatus(userId: string): Promise<{ used: number; limit: number; remaining: number; resetTime: string }> {
    const user = await this.getUser(userId);
    if (!user) return { used: 0, limit: 20, remaining: 20, resetTime: "" };
    const today = new Date().toISOString().split("T")[0];
    const used = (user.lastAiUseDate === today) ? (user.dailyAiUses || 0) : 0;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return { used, limit: 20, remaining: 20 - used, resetTime: tomorrow.toISOString() };
  }

  async getPayoutSettings(userId: string): Promise<PayoutSettings | undefined> {
    const [row] = await db.select().from(payoutSettings).where(eq(payoutSettings.userId, userId));
    return row;
  }

  async upsertPayoutSettings(data: InsertPayoutSettings): Promise<PayoutSettings> {
    const [row] = await db
      .insert(payoutSettings)
      .values({ ...data, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: payoutSettings.userId,
        set: {
          method: data.method,
          paypalEmail: data.paypalEmail,
          kastWalletId: data.kastWalletId,
          bankAccountName: data.bankAccountName,
          bankIban: data.bankIban,
          bankSwift: data.bankSwift,
          bankCountry: data.bankCountry,
          stripeAccountId: data.stripeAccountId,
          updatedAt: new Date(),
        },
      })
      .returning();
    return row;
  }

  async getConversationsByUser(userId: string, mode?: string, projectId?: number): Promise<Conversation[]> {
    const conditions = [eq(conversations.userId, userId)];
    if (mode) conditions.push(eq(conversations.mode, mode));
    if (projectId !== undefined) conditions.push(eq(conversations.projectId, projectId));
    return db.select().from(conversations)
      .where(and(...conditions))
      .orderBy(desc(conversations.updatedAt))
      .limit(50);
  }

  async getConversation(id: number, userId: string): Promise<Conversation | undefined> {
    const [conv] = await db.select().from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
    return conv;
  }

  async createConversation(data: InsertConversation): Promise<Conversation> {
    const [conv] = await db.insert(conversations).values(data).returning();
    return conv;
  }

  async deleteConversation(id: number, userId: string): Promise<void> {
    await db.delete(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
  }

  async getMessagesByConversation(conversationId: number, limit: number = 30): Promise<Message[]> {
    const rows = await db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
    return rows.reverse();
  }

  async addMessage(data: InsertMessage): Promise<Message> {
    const [msg] = await db.insert(messages).values(data).returning();
    await db.update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, data.conversationId));
    return msg;
  }

  async updateConversationTitle(id: number, userId: string, title: string): Promise<Conversation> {
    const [conv] = await db.update(conversations)
      .set({ title, updatedAt: new Date() })
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
      .returning();
    return conv;
  }

  async getSystemSetting(key: string): Promise<string | null> {
    const [row] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    return row?.value ?? null;
  }

  async setSystemSetting(key: string, value: string): Promise<void> {
    await db.insert(systemSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: systemSettings.key, set: { value, updatedAt: new Date() } });
  }

  async getUserEmailPreferences(userId: string): Promise<{ digestOptOut: boolean; emailNotifications: boolean; emailFollowPublications: boolean; emailTipsComments: boolean; emailChallenges: boolean }> {
    const [row] = await db.select({
      digestOptOut: users.digestOptOut,
      emailNotifications: users.emailNotifications,
      emailFollowPublications: users.emailFollowPublications,
      emailTipsComments: users.emailTipsComments,
      emailChallenges: users.emailChallenges,
    }).from(users).where(eq(users.id, userId));
    return {
      digestOptOut: row?.digestOptOut ?? false,
      emailNotifications: row?.emailNotifications ?? true,
      emailFollowPublications: row?.emailFollowPublications ?? true,
      emailTipsComments: row?.emailTipsComments ?? true,
      emailChallenges: row?.emailChallenges ?? true,
    };
  }

  async setUserEmailPreferences(userId: string, prefs: { digestOptOut?: boolean; emailNotifications?: boolean; emailFollowPublications?: boolean; emailTipsComments?: boolean; emailChallenges?: boolean }): Promise<void> {
    const updateData: any = { updatedAt: new Date() };
    if (prefs.digestOptOut !== undefined) updateData.digestOptOut = prefs.digestOptOut;
    if (prefs.emailNotifications !== undefined) updateData.emailNotifications = prefs.emailNotifications;
    if (prefs.emailFollowPublications !== undefined) updateData.emailFollowPublications = prefs.emailFollowPublications;
    if (prefs.emailTipsComments !== undefined) updateData.emailTipsComments = prefs.emailTipsComments;
    if (prefs.emailChallenges !== undefined) updateData.emailChallenges = prefs.emailChallenges;
    await db.update(users).set(updateData).where(eq(users.id, userId));
  }

  async getUsersForFollowDigest(): Promise<Array<{ id: string; email: string; displayName: string | null }>> {
    const rows = await db.select({ id: users.id, email: users.email, displayName: users.displayName })
      .from(users)
      .where(and(
        isNotNull(users.email),
        or(eq(users.emailFollowPublications, true), isNull(users.emailFollowPublications)),
        or(eq(users.emailNotifications, true), isNull(users.emailNotifications))
      ));
    return rows.filter(r => r.email) as Array<{ id: string; email: string; displayName: string | null }>;
  }

  async getUsersForMonthlyReport(): Promise<Array<{ id: string; email: string; displayName: string | null }>> {
    const rows = await db.select({ id: users.id, email: users.email, displayName: users.displayName })
      .from(users)
      .where(and(
        isNotNull(users.email),
        or(eq(users.emailNotifications, true), isNull(users.emailNotifications))
      ));
    return rows.filter(r => r.email) as Array<{ id: string; email: string; displayName: string | null }>;
  }

  async getUsersForChallengeEmails(): Promise<Array<{ id: string; email: string; displayName: string | null }>> {
    const rows = await db.select({ id: users.id, email: users.email, displayName: users.displayName })
      .from(users)
      .where(and(
        isNotNull(users.email),
        or(eq(users.emailNotifications, true), isNull(users.emailNotifications)),
        or(eq(users.emailChallenges, true), isNull(users.emailChallenges))
      ));
    return rows.filter(r => r.email) as Array<{ id: string; email: string; displayName: string | null }>;
  }

  async addVote(projectId: number, userId: string): Promise<WorkVote> {
    const [vote] = await db.insert(workVotes).values({ projectId, userId }).onConflictDoNothing().returning();
    if (!vote) {
      const [existing] = await db.select().from(workVotes).where(and(eq(workVotes.projectId, projectId), eq(workVotes.userId, userId)));
      return existing;
    }
    return vote;
  }

  async removeVote(projectId: number, userId: string): Promise<void> {
    await db.delete(workVotes).where(and(eq(workVotes.projectId, projectId), eq(workVotes.userId, userId)));
  }

  async getVoteCount(projectId: number): Promise<number> {
    const [row] = await db.select({ count: count() }).from(workVotes).where(eq(workVotes.projectId, projectId));
    return Number(row?.count ?? 0);
  }

  async getUserVote(projectId: number, userId: string): Promise<WorkVote | undefined> {
    const [vote] = await db.select().from(workVotes).where(and(eq(workVotes.projectId, projectId), eq(workVotes.userId, userId)));
    return vote;
  }

  async getTopVotedProjects(limit = 50): Promise<Array<NovelProject & { voteCount: number; authorName: string | null; authorProfileImage: string | null; alreadyFeatured: boolean }>> {
    const rows = await db
      .select({
        project: novelProjects,
        voteCount: count(workVotes.id),
        authorName: sql<string | null>`COALESCE(${users.displayName}, ${users.firstName})`,
        authorProfileImage: users.profileImageUrl,
        alreadyFeatured: sql<boolean>`CASE WHEN ${hallOfGloryFeatured.id} IS NOT NULL THEN TRUE ELSE FALSE END`,
      })
      .from(novelProjects)
      .leftJoin(workVotes, eq(workVotes.projectId, novelProjects.id))
      .leftJoin(users, eq(users.id, novelProjects.userId))
      .leftJoin(hallOfGloryFeatured, eq(hallOfGloryFeatured.projectId, novelProjects.id))
      .where(and(
        eq(novelProjects.publishedToGallery, true)
      ))
      .groupBy(novelProjects.id, users.displayName, users.firstName, users.profileImageUrl, hallOfGloryFeatured.id)
      .orderBy(desc(count(workVotes.id)))
      .limit(limit);
    return rows.map(r => ({ ...r.project, voteCount: Number(r.voteCount), authorName: r.authorName, authorProfileImage: r.authorProfileImage, alreadyFeatured: Boolean(r.alreadyFeatured) }));
  }

  async featureInHallOfGlory(projectId: number, adminId: string): Promise<HallOfGloryFeatured> {
    const [existing] = await db.select().from(hallOfGloryFeatured).where(eq(hallOfGloryFeatured.projectId, projectId));
    if (existing) return existing;
    const [row] = await db.insert(hallOfGloryFeatured).values({ projectId, featuredByAdminId: adminId }).returning();
    return row;
  }

  async getFeaturedHallOfGlory(): Promise<Array<NovelProject & { voteCount: number; authorName: string | null; authorProfileImage: string | null; authorId: string; featuredAt: Date | null }>> {
    const rows = await db
      .select({
        project: novelProjects,
        voteCount: count(workVotes.id),
        authorName: sql<string | null>`COALESCE(${users.displayName}, ${users.firstName})`,
        authorProfileImage: users.profileImageUrl,
        authorId: users.id,
        featuredAt: hallOfGloryFeatured.featuredAt,
      })
      .from(hallOfGloryFeatured)
      .innerJoin(novelProjects, eq(novelProjects.id, hallOfGloryFeatured.projectId))
      .leftJoin(users, eq(users.id, novelProjects.userId))
      .leftJoin(workVotes, eq(workVotes.projectId, novelProjects.id))
      .groupBy(novelProjects.id, users.displayName, users.firstName, users.profileImageUrl, users.id, hallOfGloryFeatured.featuredAt)
      .orderBy(desc(hallOfGloryFeatured.featuredAt));
    return rows.map(r => ({ ...r.project, voteCount: Number(r.voteCount), authorName: r.authorName, authorProfileImage: r.authorProfileImage, authorId: r.authorId ?? r.project.userId, featuredAt: r.featuredAt }));
  }

  async toggleChallengeEntryVote(entryId: number, userId: string): Promise<{ voted: boolean; voteCount: number }> {
    const existing = await db.execute(sql`SELECT id FROM challenge_entry_votes WHERE entry_id = ${entryId} AND user_id = ${userId} LIMIT 1`);
    if (existing.rows.length > 0) {
      await db.execute(sql`DELETE FROM challenge_entry_votes WHERE entry_id = ${entryId} AND user_id = ${userId}`);
    } else {
      await db.execute(sql`INSERT INTO challenge_entry_votes (entry_id, user_id) VALUES (${entryId}, ${userId}) ON CONFLICT DO NOTHING`);
    }
    const [countRow] = (await db.execute(sql`SELECT COUNT(*) as cnt FROM challenge_entry_votes WHERE entry_id = ${entryId}`)).rows as any[];
    const voteCount = Number(countRow?.cnt ?? 0);
    const voted = existing.rows.length === 0;
    return { voted, voteCount };
  }

  async getChallengeEntryVoteCount(entryId: number, userId?: string): Promise<{ voteCount: number; voted: boolean }> {
    const [countRow] = (await db.execute(sql`SELECT COUNT(*) as cnt FROM challenge_entry_votes WHERE entry_id = ${entryId}`)).rows as any[];
    const voteCount = Number(countRow?.cnt ?? 0);
    let voted = false;
    if (userId) {
      const existing = await db.execute(sql`SELECT id FROM challenge_entry_votes WHERE entry_id = ${entryId} AND user_id = ${userId} LIMIT 1`);
      voted = existing.rows.length > 0;
    }
    return { voteCount, voted };
  }

  async createWritingSprint(data: InsertWritingSprint): Promise<WritingSprint> {
    const [sprint] = await db.insert(writingSprints).values(data).returning();
    return sprint;
  }

  async getWritingSprintsByUser(userId: string, limit = 20): Promise<WritingSprint[]> {
    return db.select().from(writingSprints).where(eq(writingSprints.userId, userId)).orderBy(desc(writingSprints.completedAt)).limit(limit);
  }

  async getWritingSprintStats(userId: string): Promise<{ totalSprints: number; totalWords: number; totalMinutes: number; avgWordsPerSprint: number; bestSprint: number; thisWeekSprints: number; thisWeekWords: number; thisWeekMinutes: number }> {
    const allTime = await db.select({
      totalSprints: sql<number>`COUNT(*)::int`,
      totalWords: sql<number>`COALESCE(SUM(${writingSprints.wordsWritten}), 0)::int`,
      totalSeconds: sql<number>`COALESCE(SUM(${writingSprints.durationSeconds}), 0)::int`,
      bestSprint: sql<number>`COALESCE(MAX(${writingSprints.wordsWritten}), 0)::int`,
    }).from(writingSprints).where(eq(writingSprints.userId, userId));

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const thisWeek = await db.select({
      cnt: sql<number>`COUNT(*)::int`,
      words: sql<number>`COALESCE(SUM(${writingSprints.wordsWritten}), 0)::int`,
      seconds: sql<number>`COALESCE(SUM(${writingSprints.durationSeconds}), 0)::int`,
    }).from(writingSprints).where(and(eq(writingSprints.userId, userId), sql`${writingSprints.completedAt} >= ${weekAgo}`));

    const stats = allTime[0];
    const week = thisWeek[0];
    return {
      totalSprints: stats?.totalSprints ?? 0,
      totalWords: stats?.totalWords ?? 0,
      totalMinutes: Math.round((stats?.totalSeconds ?? 0) / 60),
      avgWordsPerSprint: stats?.totalSprints ? Math.round((stats.totalWords ?? 0) / stats.totalSprints) : 0,
      bestSprint: stats?.bestSprint ?? 0,
      thisWeekSprints: week?.cnt ?? 0,
      thisWeekWords: week?.words ?? 0,
      thisWeekMinutes: Math.round((week?.seconds ?? 0) / 60),
    };
  }

  async createReadingClub(data: InsertReadingClub): Promise<ReadingClub> {
    const [club] = await db.insert(readingClubs).values(data).returning();
    await db.insert(readingClubMembers).values({ clubId: club.id, userId: data.adminUserId });
    return club;
  }

  async getReadingClub(id: number): Promise<ReadingClub | undefined> {
    const [club] = await db.select().from(readingClubs).where(eq(readingClubs.id, id));
    return club;
  }

  async getClubsByProject(projectId: number): Promise<(ReadingClub & { memberCount: number; adminName: string })[]> {
    const clubs = await db.select().from(readingClubs).where(eq(readingClubs.projectId, projectId)).orderBy(desc(readingClubs.createdAt));
    const results: (ReadingClub & { memberCount: number; adminName: string })[] = [];
    for (const club of clubs) {
      const [countResult] = await db.select({ cnt: sql<number>`COUNT(*)::int` }).from(readingClubMembers).where(eq(readingClubMembers.clubId, club.id));
      const admin = await this.getUser(club.adminUserId);
      results.push({ ...club, memberCount: countResult?.cnt ?? 0, adminName: admin?.displayName || admin?.firstName || "مجهول" });
    }
    return results;
  }

  async getClubsByUser(userId: string): Promise<(ReadingClub & { memberCount: number; projectTitle: string; projectCoverUrl: string | null; totalChapters: number })[]> {
    const memberships = await db.select({ clubId: readingClubMembers.clubId }).from(readingClubMembers).where(eq(readingClubMembers.userId, userId));
    if (memberships.length === 0) return [];
    const clubIds = memberships.map(m => m.clubId);
    const clubs = await db.select().from(readingClubs).where(inArray(readingClubs.id, clubIds)).orderBy(desc(readingClubs.createdAt));
    const results: (ReadingClub & { memberCount: number; projectTitle: string; projectCoverUrl: string | null; totalChapters: number })[] = [];
    for (const club of clubs) {
      const [countResult] = await db.select({ cnt: sql<number>`COUNT(*)::int` }).from(readingClubMembers).where(eq(readingClubMembers.clubId, club.id));
      const project = await this.getProject(club.projectId);
      const chapterList = await this.getChaptersByProject(club.projectId);
      results.push({
        ...club,
        memberCount: countResult?.cnt ?? 0,
        projectTitle: project?.title || "غير معروف",
        projectCoverUrl: project?.coverImageUrl || null,
        totalChapters: chapterList.length,
      });
    }
    return results;
  }

  async joinClub(clubId: number, userId: string): Promise<void> {
    await db.insert(readingClubMembers).values({ clubId, userId }).onConflictDoNothing();
  }

  async leaveClub(clubId: number, userId: string): Promise<void> {
    await db.delete(readingClubMembers).where(and(eq(readingClubMembers.clubId, clubId), eq(readingClubMembers.userId, userId)));
  }

  async getClubMembers(clubId: number): Promise<{ userId: string; displayName: string; profileImageUrl: string | null; joinedAt: Date }[]> {
    const members = await db.select().from(readingClubMembers).where(eq(readingClubMembers.clubId, clubId)).orderBy(asc(readingClubMembers.joinedAt));
    const results: { userId: string; displayName: string; profileImageUrl: string | null; joinedAt: Date }[] = [];
    for (const m of members) {
      const user = await this.getUser(m.userId);
      results.push({
        userId: m.userId,
        displayName: user?.displayName || user?.firstName || "مجهول",
        profileImageUrl: (user as any)?.profileImageUrl || null,
        joinedAt: m.joinedAt,
      });
    }
    return results;
  }

  async getClubMemberCount(clubId: number): Promise<number> {
    const [result] = await db.select({ cnt: sql<number>`COUNT(*)::int` }).from(readingClubMembers).where(eq(readingClubMembers.clubId, clubId));
    return result?.cnt ?? 0;
  }

  async isClubMember(clubId: number, userId: string): Promise<boolean> {
    const [member] = await db.select().from(readingClubMembers).where(and(eq(readingClubMembers.clubId, clubId), eq(readingClubMembers.userId, userId)));
    return !!member;
  }

  async advanceClub(clubId: number): Promise<ReadingClub> {
    const [updated] = await db.update(readingClubs)
      .set({ currentChapterIndex: sql`${readingClubs.currentChapterIndex} + 1` })
      .where(eq(readingClubs.id, clubId))
      .returning();
    return updated;
  }

  async deleteReadingClub(id: number): Promise<void> {
    await db.delete(readingClubs).where(eq(readingClubs.id, id));
  }

  async getClubComments(clubId: number, chapterIndex: number, limit = 50, offset = 0): Promise<{ data: any[]; total: number }> {
    const [totalResult] = await db.select({ cnt: sql<number>`COUNT(*)::int` }).from(projectComments)
      .where(and(eq(projectComments.clubId, clubId), eq(projectComments.chapterIndex, chapterIndex), eq(projectComments.approved, true)));
    const data = await db.select().from(projectComments)
      .where(and(eq(projectComments.clubId, clubId), eq(projectComments.chapterIndex, chapterIndex), eq(projectComments.approved, true)))
      .orderBy(desc(projectComments.createdAt))
      .limit(limit).offset(offset);
    return { data, total: totalResult?.cnt ?? 0 };
  }

  async createClubComment(data: { projectId: number; clubId: number; chapterIndex: number; authorName: string; content: string; ipHash?: string }): Promise<any> {
    const [comment] = await db.insert(projectComments).values({
      projectId: data.projectId,
      clubId: data.clubId,
      chapterIndex: data.chapterIndex,
      authorName: data.authorName,
      content: data.content,
      ipHash: data.ipHash,
      approved: true,
    }).returning();
    return comment;
  }

  async createWritingCourse(data: InsertWritingCourse): Promise<WritingCourse> {
    const [course] = await db.insert(writingCourses).values(data).returning();
    return course;
  }

  async getWritingCourse(id: number): Promise<WritingCourse | undefined> {
    const [course] = await db.select().from(writingCourses).where(eq(writingCourses.id, id));
    return course;
  }

  async updateWritingCourse(id: number, data: Partial<WritingCourse>): Promise<WritingCourse> {
    const [updated] = await db.update(writingCourses).set({ ...data, updatedAt: new Date() }).where(eq(writingCourses.id, id)).returning();
    return updated;
  }

  async deleteWritingCourse(id: number): Promise<void> {
    await db.delete(writingCourses).where(eq(writingCourses.id, id));
  }

  async getPublishedCourses(): Promise<WritingCourse[]> {
    return db.select().from(writingCourses).where(eq(writingCourses.isPublished, true)).orderBy(desc(writingCourses.createdAt));
  }

  async getCoursesByAuthor(authorId: string): Promise<WritingCourse[]> {
    return db.select().from(writingCourses).where(eq(writingCourses.authorId, authorId)).orderBy(desc(writingCourses.createdAt));
  }

  async getCourseLessons(courseId: number): Promise<CourseLesson[]> {
    return db.select().from(courseLessons).where(eq(courseLessons.courseId, courseId)).orderBy(asc(courseLessons.orderIndex));
  }

  async createCourseLesson(data: { courseId: number; orderIndex: number; title: string; content?: string; excerptChapterId?: number; exercisePrompt?: string }): Promise<CourseLesson> {
    const [lesson] = await db.insert(courseLessons).values(data).returning();
    return lesson;
  }

  async updateCourseLesson(id: number, data: Partial<CourseLesson>): Promise<CourseLesson> {
    const [updated] = await db.update(courseLessons).set(data).where(eq(courseLessons.id, id)).returning();
    return updated;
  }

  async deleteCourseLesson(id: number): Promise<void> {
    await db.delete(courseLessons).where(eq(courseLessons.id, id));
  }

  async enrollInCourse(courseId: number, userId: string, stripeSessionId?: string): Promise<CourseEnrollment> {
    const [enrollment] = await db.insert(courseEnrollments).values({ courseId, userId, stripeSessionId }).onConflictDoNothing().returning();
    if (!enrollment) {
      const [existing] = await db.select().from(courseEnrollments).where(and(eq(courseEnrollments.courseId, courseId), eq(courseEnrollments.userId, userId)));
      return existing;
    }
    return enrollment;
  }

  async getCourseEnrollment(courseId: number, userId: string): Promise<CourseEnrollment | undefined> {
    const [enrollment] = await db.select().from(courseEnrollments).where(and(eq(courseEnrollments.courseId, courseId), eq(courseEnrollments.userId, userId)));
    return enrollment;
  }

  async getCourseEnrollments(courseId: number): Promise<CourseEnrollment[]> {
    return db.select().from(courseEnrollments).where(eq(courseEnrollments.courseId, courseId)).orderBy(desc(courseEnrollments.purchasedAt));
  }

  async getUserEnrollments(userId: string): Promise<CourseEnrollment[]> {
    return db.select().from(courseEnrollments).where(eq(courseEnrollments.userId, userId)).orderBy(desc(courseEnrollments.purchasedAt));
  }

  async completeCourseLesson(lessonId: number, userId: string, exerciseResponse?: string): Promise<LessonCompletion> {
    const [completion] = await db.insert(lessonCompletions).values({ lessonId, userId, exerciseResponse }).onConflictDoNothing().returning();
    if (!completion) {
      const [existing] = await db.select().from(lessonCompletions).where(and(eq(lessonCompletions.lessonId, lessonId), eq(lessonCompletions.userId, userId)));
      return existing;
    }
    return completion;
  }

  async getLessonCompletions(courseId: number, userId: string): Promise<LessonCompletion[]> {
    const lessons = await db.select({ id: courseLessons.id }).from(courseLessons).where(eq(courseLessons.courseId, courseId));
    if (lessons.length === 0) return [];
    const lessonIds = lessons.map(l => l.id);
    return db.select().from(lessonCompletions).where(and(inArray(lessonCompletions.lessonId, lessonIds), eq(lessonCompletions.userId, userId)));
  }

  async getCourseStats(courseId: number): Promise<{ enrollmentCount: number; completionRate: number }> {
    const [enrollResult] = await db.select({ cnt: sql<number>`COUNT(*)::int` }).from(courseEnrollments).where(eq(courseEnrollments.courseId, courseId));
    const enrollmentCount = enrollResult?.cnt ?? 0;
    if (enrollmentCount === 0) return { enrollmentCount: 0, completionRate: 0 };
    const lessons = await db.select({ id: courseLessons.id }).from(courseLessons).where(eq(courseLessons.courseId, courseId));
    if (lessons.length === 0) return { enrollmentCount, completionRate: 0 };
    const lessonIds = lessons.map(l => l.id);
    const [completionResult] = await db.select({ cnt: sql<number>`COUNT(DISTINCT user_id)::int` }).from(lessonCompletions)
      .where(inArray(lessonCompletions.lessonId, lessonIds));
    const completedAll = completionResult?.cnt ?? 0;
    return { enrollmentCount, completionRate: Math.round((completedAll / enrollmentCount) * 100) };
  }

  async getAuthorCourseStats(authorId: string): Promise<{ totalCourses: number; totalEnrollments: number; totalRevenue: number }> {
    const courses = await db.select().from(writingCourses).where(eq(writingCourses.authorId, authorId));
    const totalCourses = courses.length;
    if (totalCourses === 0) return { totalCourses: 0, totalEnrollments: 0, totalRevenue: 0 };
    const courseIds = courses.map(c => c.id);
    const enrollments = await db.select().from(courseEnrollments).where(inArray(courseEnrollments.courseId, courseIds));
    const totalEnrollments = enrollments.length;
    let totalRevenue = 0;
    for (const e of enrollments) {
      const course = courses.find(c => c.id === e.courseId);
      if (course) totalRevenue += (course.priceCents || 0) * 0.8;
    }
    return { totalCourses, totalEnrollments, totalRevenue: Math.round(totalRevenue) };
  }

  async rateCourse(courseId: number, userId: string, rating: number, review?: string): Promise<any> {
    const existing = await db.select().from(courseRatings).where(and(eq(courseRatings.courseId, courseId), eq(courseRatings.userId, userId)));
    if (existing.length > 0) {
      const [updated] = await db.update(courseRatings).set({ rating, review: review || null }).where(eq(courseRatings.id, existing[0].id)).returning();
      return updated;
    }
    const [created] = await db.insert(courseRatings).values({ courseId, userId, rating, review: review || undefined }).returning();
    return created;
  }

  async getCourseRatings(courseId: number): Promise<any[]> {
    return db.select().from(courseRatings).where(eq(courseRatings.courseId, courseId)).orderBy(desc(courseRatings.createdAt));
  }

  async getCourseAverageRating(courseId: number): Promise<{ avgRating: number; ratingCount: number }> {
    const result = await db.select({ avgRating: avg(courseRatings.rating), ratingCount: count() }).from(courseRatings).where(eq(courseRatings.courseId, courseId));
    return { avgRating: parseFloat(result[0]?.avgRating || "0"), ratingCount: result[0]?.ratingCount || 0 };
  }
}

export const storage = new DatabaseStorage();
