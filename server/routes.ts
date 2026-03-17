import type { Express } from "express";
import { createServer, type Server } from "http";
import { eq, and, or, gte, lt, desc, sql as dsql, count, isNotNull } from "drizzle-orm";
import { storage } from "./storage";
import { db } from "./db";
import { characterRelationships, getProjectPrice, getProjectPriceByType, VALID_PAGE_COUNTS, userPlanCoversType, getPlanPrice, PLAN_PRICES, novelProjects, users, bookmarks, chapters, giftSubscriptions, ANALYSIS_UNLOCK_PRICE, getRemainingAnalysisUses, TRIAL_MAX_PROJECTS, TRIAL_MAX_CHAPTERS, TRIAL_MAX_COVERS, TRIAL_MAX_CONTINUITY, TRIAL_MAX_STYLE, TRIAL_DURATION_HOURS, TRIAL_CHARGE_AMOUNT, isTrialExpired, type NovelProject, insertSocialMediaLinkSchema, FREE_MONTHLY_PROJECTS, FREE_MONTHLY_GENERATIONS } from "@shared/schema";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { buildOutlinePrompt, buildChapterPrompt, buildTitleSuggestionPrompt, buildCharacterSuggestionPrompt, buildCoverPrompt, calculateNovelStructure, buildEssayOutlinePrompt, buildEssaySectionPrompt, calculateEssayStructure, buildScenarioOutlinePrompt, buildScenePrompt, calculateScenarioStructure, buildShortStoryOutlinePrompt, buildShortStorySectionPrompt, calculateShortStoryStructure, buildRewritePrompt, buildOriginalityCheckPrompt, buildGlossaryPrompt, buildOriginalityEnhancePrompt, buildTechniqueSuggestionPrompt, buildFormatSuggestionPrompt, buildFullProjectSuggestionPrompt, buildStyleAnalysisPrompt, buildMemoireStyleAnalysisPrompt, buildMemoireGlossaryPrompt, buildKhawaterPrompt, buildSocialMediaPrompt, buildPoetryPrompt, buildProjectChatPrompt, buildGeneralChatPrompt, buildChapterSummaryPrompt, buildMemoireOutlinePrompt, calculateMemoireStructure, buildMemoireSectionPrompt, NARRATIVE_TECHNIQUE_MAP, MEMOIRE_SYSTEM_PROMPT, enhanceWithKnowledge, buildMarketingChatPrompt, buildAuthorSocialMarketingPrompt, buildLiteraryCritiquePrompt, buildEditorialReviewPrompt } from "./abu-hashim";
import * as prosodyData from "./arabic-prosody";
import { toArabicOrdinal } from "@shared/utils";
import { z } from "zod";
import OpenAI from "openai";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { sendNovelCompletionEmail, sendTicketReplyEmail, sendViewMilestoneNotification, sendVerifiedApplicationStatusEmail, sendNewPublicationEmail, sendMonthlyAuthorReport, sendEmailSubscriptionConfirmation, sendEmailSubscriberPublication, sendGiftReceivedEmail, sendAuthorNewsletter, sendNotificationEmail, sendNewChallengeEmail, sendChallengeWinnerEmail, verifyDigestUnsubscribeToken } from "./email";
import { processTrialExpiry } from "./trial-processor";
import { logApiUsage, logImageUsage } from "./api-usage";
import { trackServerEvent, invalidatePixelCache } from "./tracking";
import { apiCache } from "./cache";
import { runLearningSession } from "./learning-engine";
import { dispatchWebhook, mapProjectTypeToCategory, countWords, processRetryQueue, type WebhookPayload } from "./webhook-dispatcher";
import { sanitizeText, sanitizeRichText } from "./sanitize";
import archiver from "archiver";
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import path from "path";
import crypto from "crypto";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const FREE_ACCESS_USER_IDS = ["39706084", "e482facd-d157-4e97-ad91-af96b8ec8f49"];

function serveCached(req: any, res: any, cacheKey: string, ttl: number, fetcher: () => Promise<any>) {
  const cached = apiCache.get(cacheKey);
  if (cached) {
    const clientEtag = req.headers["if-none-match"];
    if (clientEtag && clientEtag === cached.etag) {
      return res.status(304).end();
    }
    res.setHeader("ETag", cached.etag);
    res.setHeader("Cache-Control", `public, max-age=${ttl}`);
    return res.json(cached.data);
  }
  return fetcher().then(data => {
    const entry = apiCache.set(cacheKey, data, ttl);
    res.setHeader("ETag", entry.etag);
    res.setHeader("Cache-Control", `public, max-age=${ttl}`);
    res.json(data);
  }).catch(err => {
    console.error(`Cache fetch error for ${cacheKey}:`, err);
    res.status(500).json({ error: "خطأ في الخادم" });
  });
}


function parseIntParam(value: string): number | null {
  const num = parseInt(value, 10);
  return isNaN(num) ? null : num;
}

const createProjectSchema = z.object({
  title: z.string().min(1, "العنوان مطلوب").max(200, "العنوان طويل جداً"),
  mainIdea: z.string().max(5000, "الفكرة الرئيسية طويلة جداً").optional().default(""),
  timeSetting: z.string().max(500).optional().default(""),
  placeSetting: z.string().max(500).optional().default(""),
  narrativePov: z.string().max(50).optional().default("third_person"),
  pageCount: z.number().int().positive().optional().default(150),
  projectType: z.enum(["novel", "essay", "scenario", "short_story", "khawater", "social_media", "poetry", "memoire"]).optional().default("novel"),
  characters: z.array(z.object({
    name: z.string().min(1).max(200),
    background: z.string().max(2000).optional().default(""),
    role: z.string().max(200).optional().default(""),
    motivation: z.string().max(1000).optional().nullable(),
    speechStyle: z.string().max(1000).optional().nullable(),
    physicalDescription: z.string().max(1000).optional().nullable(),
    psychologicalTraits: z.string().max(1000).optional().nullable(),
    age: z.string().max(50).optional().nullable(),
  })).max(30).optional(),
  relationships: z.array(z.object({
    char1Index: z.number().int().min(0),
    char2Index: z.number().int().min(0),
    relationship: z.string().min(1).max(500),
  })).max(50).optional(),
  subject: z.string().max(200).optional().nullable(),
  essayTone: z.string().max(200).optional().nullable(),
  targetAudience: z.string().max(200).optional().nullable(),
  genre: z.string().max(200).optional().nullable(),
  episodeCount: z.number().int().min(1).max(100).optional().nullable(),
  formatType: z.string().max(200).optional().nullable(),
  narrativeTechnique: z.string().max(200).optional().nullable(),
  allowDialect: z.boolean().optional().default(false),
  poetryMeter: z.string().max(100).optional().nullable(),
  poetryRhyme: z.string().max(100).optional().nullable(),
  poetryEra: z.string().max(100).optional().nullable(),
  poetryTone: z.string().max(100).optional().nullable(),
  poetryTheme: z.string().max(100).optional().nullable(),
  poetryVerseCount: z.number().int().min(1).max(200).optional().nullable(),
  poetryImageryLevel: z.number().int().min(1).max(10).optional().nullable(),
  poetryEmotionLevel: z.number().int().min(1).max(10).optional().nullable(),
  poetryRawiHaraka: z.string().max(100).optional().nullable(),
  poetryRidf: z.string().max(500).optional().nullable(),
  poetryMuarada: z.string().max(500).optional().nullable(),
  memoireUniversity: z.string().max(500).optional().nullable(),
  memoireCountry: z.string().max(200).optional().nullable(),
  memoireFaculty: z.string().max(500).optional().nullable(),
  memoireDepartment: z.string().max(500).optional().nullable(),
  memoireField: z.string().max(500).optional().nullable(),
  memoireDegreeLevel: z.string().max(200).optional().nullable(),
  memoireMethodology: z.string().max(200).optional().nullable(),
  memoireCitationStyle: z.string().max(100).optional().nullable(),
  memoireChapterCount: z.number().int().min(1).max(50).optional().nullable(),
  memoirePageTarget: z.number().int().min(1).max(1000).optional().nullable(),
  memoireHypotheses: z.string().max(5000).optional().nullable(),
  memoireKeywords: z.string().max(2000).optional().nullable(),
  memoireUserData: z.string().max(10000).optional().nullable(),
});

const createCharacterSchema = z.object({
  name: z.string().min(1, "اسم الشخصية مطلوب").max(200, "اسم الشخصية طويل جداً"),
  role: z.string().min(1, "دور الشخصية مطلوب").max(200),
  background: z.string().min(1, "خلفية الشخصية مطلوبة").max(2000),
  motivation: z.string().max(1000).optional().nullable(),
  speechStyle: z.string().max(1000).optional().nullable(),
  physicalDescription: z.string().max(1000).optional().nullable(),
  psychologicalTraits: z.string().max(1000).optional().nullable(),
  age: z.string().max(50).optional().nullable(),
});

const createTicketSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب").max(200, "الاسم طويل جداً"),
  email: z.string().min(1, "البريد الإلكتروني مطلوب").email("البريد الإلكتروني غير صالح").max(200),
  subject: z.string().min(1, "الموضوع مطلوب").max(200, "الموضوع طويل جداً"),
  message: z.string().min(1, "الرسالة مطلوبة").max(5000, "الرسالة طويلة جداً"),
});

const chatMessageSchema = z.object({
  message: z.string().min(1, "الرسالة مطلوبة").max(5000, "الرسالة طويلة جداً"),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(5000),
  })).max(20).optional(),
});

const suggestTitlesSchema = z.object({
  mainIdea: z.string().min(10, "الفكرة الرئيسية مطلوبة (10 أحرف على الأقل)").max(2000),
  timeSetting: z.string().max(200).optional(),
  placeSetting: z.string().max(200).optional(),
  narrativePov: z.string().max(50).optional(),
  characters: z.array(z.object({
    name: z.string().max(100),
    role: z.string().max(50),
  })).max(20).optional(),
  projectType: z.enum(["novel", "essay", "scenario", "short_story", "khawater", "social_media", "poetry"]).optional(),
  poetryMeter: z.string().max(100).optional(),
  poetryEra: z.string().max(100).optional(),
  poetryTheme: z.string().max(100).optional(),
  poetryTone: z.string().max(100).optional(),
});

function formatZodErrors(error: z.ZodError): string {
  return error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ");
}

async function checkApiSuspension(userId: string, res: any): Promise<boolean> {
  const user = await storage.getUser(userId);
  if (user?.apiSuspended) {
    res.status(403).json({ error: "تم تعليق حسابك من استخدام أبو هاشم حتى يتم تسوية المستحقات. تواصل مع الإدارة.", apiSuspended: true });
    return true;
  }
  return false;
}

async function updateWritingStreak(userId: string) {
  try {
    await storage.updateWritingStreak(userId);
  } catch (e) {
    console.error("Error updating writing streak:", e);
  }
}

try {
  GlobalFonts.registerFromPath(path.join(process.cwd(), "server/fonts/Amiri-Bold.ttf"), "Amiri");
  GlobalFonts.registerFromPath(path.join(process.cwd(), "server/fonts/Amiri-Regular.ttf"), "Amiri");
} catch (e) {
  console.warn("Could not register Amiri fonts for cover generation:", e);
}

async function overlayTitleOnCover(base64Image: string, title: string): Promise<string> {
  if (!title || !title.trim()) return base64Image;

  const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, "");
  const imgBuffer = Buffer.from(cleanBase64, "base64");
  const img = await loadImage(imgBuffer);

  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");

  ctx.drawImage(img, 0, 0);

  const maxWidth = img.width * 0.85;
  let fontSize = Math.floor(img.width * 0.08);
  ctx.font = `bold ${fontSize}px "Amiri"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.direction = "rtl";

  const words = title.trim().split(/\s+/);
  let lines: string[] = [];

  let textWidth = ctx.measureText(title).width;
  if (textWidth <= maxWidth) {
    lines = [title];
  } else {
    let currentLine = "";
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    if (lines.length > 3) {
      lines = lines.slice(0, 3);
      lines[2] = lines[2] + "...";
    }
  }

  while (lines.length > 1 && fontSize > 24) {
    const widest = Math.max(...lines.map(l => ctx.measureText(l).width));
    if (widest <= maxWidth) break;
    fontSize -= 4;
    ctx.font = `bold ${fontSize}px "Amiri"`;
  }

  const lineHeight = fontSize * 1.5;
  const totalTextHeight = lines.length * lineHeight;
  const bandPadding = fontSize * 0.8;
  const bandHeight = totalTextHeight + bandPadding * 2;
  const bandY = Math.floor(img.height * 0.06);

  const gradient = ctx.createLinearGradient(0, bandY, 0, bandY + bandHeight);
  gradient.addColorStop(0, "rgba(0, 0, 0, 0.0)");
  gradient.addColorStop(0.2, "rgba(0, 0, 0, 0.55)");
  gradient.addColorStop(0.8, "rgba(0, 0, 0, 0.55)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0.0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, bandY, img.width, bandHeight);

  ctx.font = `bold ${fontSize}px "Amiri"`;
  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = "#F5E6C8";

  const firstLineY = bandY + bandPadding + lineHeight / 2;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], img.width / 2, firstLineY + i * lineHeight);
  }

  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  const lastLineY = firstLineY + (lines.length - 1) * lineHeight;
  const lastLineWidth = ctx.measureText(lines[lines.length - 1]).width;
  const decoY = lastLineY + fontSize * 0.7;
  const decoWidth = Math.min(lastLineWidth * 0.6, img.width * 0.4);
  ctx.strokeStyle = "rgba(212, 175, 55, 0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(img.width / 2 - decoWidth / 2, decoY);
  ctx.lineTo(img.width / 2 + decoWidth / 2, decoY);
  ctx.stroke();

  return canvas.toBuffer("image/png").toString("base64");
}

function extractMemoireSubSections(content: string): { type: string; text: string }[] {
  const subs: { type: string; text: string }[] = [];
  const lines = (content || "").split("\n");
  for (const line of lines) {
    const trimmed = line.trim().replace(/^#{1,3}\s*/, "");
    if (!trimmed) continue;
    if (/^(تمهيد الفصل|تمهيد)(\s|$|:)/.test(trimmed)) {
      subs.push({ type: "tamheed", text: trimmed.replace(/[:\s]*$/, "") });
    } else if (/^(المبحث\s|مبحث\s)/.test(trimmed)) {
      subs.push({ type: "mabhath", text: trimmed.replace(/[:\s]*$/, "") });
    } else if (/^(المطلب\s|مطلب\s)/.test(trimmed)) {
      subs.push({ type: "matlab", text: trimmed.replace(/[:\s]*$/, "") });
    } else if (/^(خلاصة الفصل|خلاصة)(\s|$|:)/.test(trimmed)) {
      subs.push({ type: "khulasat", text: trimmed.replace(/[:\s]*$/, "") });
    }
  }
  return subs;
}

function isMemoireAcademicHeader(text: string): { type: string; text: string } | null {
  const trimmed = text.trim().replace(/^#{1,3}\s*/, "");
  if (/^(تمهيد الفصل|تمهيد)(\s|$|:|\.|-|—)/.test(trimmed)) return { type: "tamheed", text: trimmed };
  if (/^(المبحث\s|مبحث\s)/.test(trimmed)) return { type: "mabhath", text: trimmed };
  if (/^(المطلب\s|مطلب\s)/.test(trimmed)) return { type: "matlab", text: trimmed };
  if (/^(خلاصة الفصل|خلاصة)(\s|$|:|\.|-|—)/.test(trimmed)) return { type: "khulasat", text: trimmed };
  if (/^(المقدمة العامة|المقدمة)(\s|$|:|\.|-|—)/.test(trimmed)) return { type: "intro", text: trimmed };
  if (/^(الخاتمة العامة|الخاتمة)(\s|$|:|\.|-|—)/.test(trimmed)) return { type: "conclusion", text: trimmed };
  return null;
}

async function buildXOAuth1Header(
  method: string,
  url: string,
  apiKey: string,
  apiSecret: string,
  accessToken: string,
  accessTokenSecret: string
): Promise<string> {
  const crypto = await import("crypto");
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: "1.0",
  };
  const sortedKeys = Object.keys(oauthParams).sort();
  const paramString = sortedKeys
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(oauthParams[k])}`)
    .join("&");
  const sigBase = [method.toUpperCase(), encodeURIComponent(url), encodeURIComponent(paramString)].join("&");
  const signingKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessTokenSecret)}`;
  const signature = crypto.createHmac("sha1", signingKey).update(sigBase).digest("base64");
  oauthParams.oauth_signature = signature;
  const authHeader = "OAuth " + Object.keys(oauthParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
    .join(", ");
  return authHeader;
}

export async function publishSocialPostToAPIs(
  post: any,
  credentials: Record<string, string>
): Promise<{ publishResults: Record<string, { success: boolean; error?: string }>; anyPublished: boolean }> {
  const publishResults: Record<string, { success: boolean; error?: string }> = {};
  let anyPublished = false;

  for (const platform of (post.platforms || [])) {
    try {
      if (platform === "facebook") {
        const token = credentials["facebook"] || "";
        if (!token.trim()) {
          publishResults[platform] = { success: false, error: "لا توجد بيانات اعتماد" };
          continue;
        }
        if (token.includes("|")) {
          const [pageId, pageToken] = token.split("|");
          const fbRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: post.content, access_token: pageToken }),
          });
          if (!fbRes.ok) {
            const fbErr = await fbRes.json().catch(() => ({}));
            throw new Error((fbErr as any)?.error?.message || "فشل النشر على فيسبوك");
          }
        } else {
          throw new Error("صيغة بيانات فيسبوك غير صحيحة — يجب أن تكون pageId|pageToken");
        }
        publishResults[platform] = { success: true };
        anyPublished = true;
      } else if (platform === "x") {
        const apiKey = (credentials["x_api_key"] || "").trim();
        const apiSecret = (credentials["x_api_secret"] || "").trim();
        const accessToken = (credentials["x_access_token"] || "").trim();
        const accessTokenSecret = (credentials["x_access_token_secret"] || "").trim();
        const rawBearer = (credentials["x_bearer_token"] || credentials["x"] || "").trim();
        const bearerToken = rawBearer ? decodeURIComponent(rawBearer) : "";

        if (apiKey && apiSecret && accessToken && accessTokenSecret) {
          const tweetUrl = "https://api.twitter.com/2/tweets";
          const authHeader = await buildXOAuth1Header("POST", tweetUrl, apiKey, apiSecret, accessToken, accessTokenSecret);
          const xRes = await fetch(tweetUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": authHeader },
            body: JSON.stringify({ text: (post.content || "").replace(/\*\*[^*]{1,60}:\*\*/g, "").replace(/^[\s\n]+/, "").substring(0, 280) }),
          });
          if (!xRes.ok) {
            const xErr = await xRes.json().catch(() => ({}));
            console.error("[X Publish] OAuth1 error:", xRes.status, JSON.stringify(xErr));
            throw new Error((xErr as any)?.detail || (xErr as any)?.title || "فشل النشر على X");
          }
          publishResults[platform] = { success: true };
          anyPublished = true;
        } else {
          const missing = [
            !apiKey && "x_api_key",
            !apiSecret && "x_api_secret",
            !accessToken && "x_access_token",
            !accessTokenSecret && "x_access_token_secret",
          ].filter(Boolean).join(", ");
          console.error("[X Publish] Missing credentials:", missing);
          publishResults[platform] = { success: false, error: `يلزم توفير: ${missing} — اذهب إلى الإعدادات` };
        }
      } else if (platform === "linkedin") {
        publishResults[platform] = { success: false, error: "النشر المباشر على LinkedIn يتطلب OAuth2 — يرجى النسخ يدوياً" };
      } else {
        const token = credentials[platform] || "";
        if (!token.trim()) {
          publishResults[platform] = { success: false, error: "لا توجد بيانات اعتماد" };
          continue;
        }
        publishResults[platform] = { success: false, error: "النشر المباشر غير مدعوم بعد لهذه المنصة — يرجى النسخ يدوياً" };
      }
    } catch (pubErr: any) {
      publishResults[platform] = { success: false, error: pubErr.message || "خطأ في النشر" };
    }
  }

  return { publishResults, anyPublished };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);
  storage.seedDefaultFeatures().catch((e: unknown) =>
    console.warn("[startup] seedDefaultFeatures:", e instanceof Error ? e.message : e)
  );

  async function notifyUser(userId: string, type: string, title: string, message: string, link?: string) {
    try {
      await storage.createNotification({ userId, type, title, message, link });
      const prefs = await storage.getUserEmailPreferences(userId);
      if (!prefs.emailNotifications) return;
      const tipCommentTypes = ["comment", "tip", "new_tip"];
      const challengeTypes = ["challenge", "new_challenge", "challenge_winner"];
      const followTypes = ["new_follower", "new_publication"];
      if (tipCommentTypes.includes(type) && !prefs.emailTipsComments) return;
      if (challengeTypes.includes(type) && !prefs.emailChallenges) return;
      if (followTypes.includes(type) && !prefs.emailFollowPublications) return;
      const user = await storage.getUser(userId);
      if (user?.email) {
        sendNotificationEmail(user.email, title, message, link).catch(() => {});
      }
    } catch (err) {
      console.error(`[Notify] Failed to notify user ${userId}:`, err);
    }
  }

  const MILESTONE_THRESHOLDS = [25, 50, 75, 100];
  const MILESTONE_MESSAGES: Record<number, string> = {
    25: "وصلت إلى ربع الطريق! 🎉",
    50: "أحسنت! أنجزت نصف الهدف! 🔥",
    75: "رائع! ثلاثة أرباع الطريق! 💪",
    100: "مبروك! أكملت هدف الكلمات بالكامل! 🏆",
  };

  async function checkWordCountMilestones(projectId: number, userId: string) {
    try {
      const project = await storage.getProject(projectId);
      if (!project || !project.wordCountGoal || project.wordCountGoal <= 0) return;

      const chaptersList = await storage.getChaptersByProject(projectId);
      const totalWords = chaptersList.reduce((sum, ch) => {
        const words = ch.content ? ch.content.split(/\s+/).filter((w: string) => w.length > 0).length : 0;
        return sum + words;
      }, 0);

      const percentComplete = Math.min((totalWords / project.wordCountGoal) * 100, 100);
      const currentMilestones: number[] = [...((project.milestonesReached as number[]) || [])];
      let changed = false;

      for (const threshold of MILESTONE_THRESHOLDS) {
        if (percentComplete >= threshold && !currentMilestones.includes(threshold)) {
          currentMilestones.push(threshold);
          changed = true;
          await notifyUser(
            userId,
            "milestone",
            MILESTONE_MESSAGES[threshold],
            `مشروع "${project.title}" — ${totalWords.toLocaleString("ar-EG")} / ${project.wordCountGoal.toLocaleString("ar-EG")} كلمة`,
            `/project/${projectId}`
          );
        }
      }

      if (changed) {
        await storage.updateProject(projectId, { milestonesReached: currentMilestones });
      }
    } catch (e) {
      console.error("Error checking word count milestones:", e);
    }
  }

  async function isUserSuperAdmin(userId: string): Promise<boolean> {
    if (FREE_ACCESS_USER_IDS.includes(userId)) return true;
    const user = await storage.getUser(userId);
    return user?.role === "admin";
  }

  const EDITORIAL_FREE_LIMIT = 2;

  async function checkEditorialReviewLimit(userId: string): Promise<{ allowed: boolean; used: number; limit: number }> {
    if (FREE_ACCESS_USER_IDS.includes(userId)) return { allowed: true, used: 0, limit: 999 };
    const user = await storage.getUser(userId);
    if (user?.role === "admin") return { allowed: true, used: 0, limit: 999 };
    if (user?.plan && user.plan !== "free" && user.plan !== "trial") return { allowed: true, used: 0, limit: 999 };
    const result = await db.execute(dsql`SELECT COUNT(*) as cnt FROM api_usage_logs WHERE user_id = ${userId} AND feature = 'editorial_review'`);
    const used = parseInt(String((result.rows?.[0] as any)?.cnt || "0"), 10);
    return { allowed: used < EDITORIAL_FREE_LIMIT, used, limit: EDITORIAL_FREE_LIMIT };
  }

  function wrapText(ctx: any, text: string, maxWidth: number): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function drawCardFooter(ctx: any, W: number, H: number, gold: string) {
    ctx.font = `bold 20px "Amiri"`;
    ctx.fillStyle = gold;
    ctx.textAlign = "center";
    ctx.fillText("QalamAI  —  قلم", W / 2, H - 65);
    ctx.font = `13px "Amiri"`;
    ctx.fillStyle = "#8b7355";
    ctx.fillText("#QalamAI  |  منصة الكتابة العربية بالذكاء الاصطناعي", W / 2, H - 42);
  }

  function renderCompletionCard(ctx: any, W: number, H: number, authorName: string, projectTitle: string) {
    const gold = "#d4af37", darkBrown = "#3d2b1f";

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#faf6ee");
    bg.addColorStop(1, "#f5ead0");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = gold;
    ctx.lineWidth = 6;
    ctx.strokeRect(20, 20, W - 40, H - 40);
    ctx.strokeStyle = "#b8941e";
    ctx.lineWidth = 2;
    ctx.strokeRect(32, 32, W - 64, H - 64);

    const corners = [[36, 36], [W - 36, 36], [36, H - 36], [W - 36, H - 36]];
    ctx.fillStyle = gold;
    for (const [cx, cy] of corners) {
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = gold; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI * 2); ctx.stroke();
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.direction = "rtl";

    ctx.fillStyle = gold;
    ctx.font = `28px "Amiri"`;
    ctx.fillText("✦  ❋  ✦", W / 2, 80);

    const trophyR = 70;
    ctx.fillStyle = "rgba(212, 175, 55, 0.12)";
    ctx.beginPath(); ctx.arc(W / 2, 200, trophyR, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(212, 175, 55, 0.3)";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(W / 2, 200, trophyR, 0, Math.PI * 2); ctx.stroke();
    ctx.font = `72px "Amiri"`;
    ctx.fillStyle = darkBrown;
    ctx.fillText("🏆", W / 2, 205);

    ctx.font = `bold 44px "Amiri"`;
    ctx.fillStyle = darkBrown;
    ctx.fillText("أتممتُ عملي الأدبي", W / 2, 330);

    ctx.strokeStyle = gold; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(W / 2 - 100, 370); ctx.lineTo(W / 2 + 100, 370); ctx.stroke();
    ctx.fillStyle = gold; ctx.beginPath(); ctx.arc(W / 2, 370, 4, 0, Math.PI * 2); ctx.fill();

    ctx.font = `28px "Amiri"`;
    ctx.fillStyle = "#6b5b4f";
    const titleLines = wrapText(ctx, projectTitle, W - 140).slice(0, 2);
    for (let i = 0; i < titleLines.length; i++) {
      ctx.fillText(titleLines[i], W / 2, 420 + i * 40);
    }

    const nameY = 420 + titleLines.length * 40 + 60;
    ctx.fillStyle = "rgba(212, 175, 55, 0.08)";
    ctx.beginPath(); ctx.roundRect(W / 2 - 200, nameY - 30, 400, 70, 12); ctx.fill();
    ctx.strokeStyle = "rgba(212, 175, 55, 0.25)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(W / 2 - 200, nameY - 30, 400, 70, 12); ctx.stroke();
    ctx.font = `bold 32px "Amiri"`;
    ctx.fillStyle = darkBrown;
    ctx.fillText(authorName.slice(0, 40), W / 2, nameY + 5);

    ctx.font = `16px "Amiri"`;
    ctx.fillStyle = "#8b7355";
    ctx.fillText("— كاتب على منصة قلم —", W / 2, nameY + 50);

    ctx.fillStyle = gold; ctx.font = `24px "Amiri"`;
    ctx.fillText("✦  ❋  ✦", W / 2, H - 100);

    drawCardFooter(ctx, W, H, gold);
  }

  function renderStreakCard(ctx: any, W: number, H: number, authorName: string, days: number) {
    const flame = "#e65100", warmOrange = "#ff8f00", darkBrown = "#3d2b1f", gold = "#d4af37";

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#2d1b0e");
    bg.addColorStop(0.4, "#3e1f0a");
    bg.addColorStop(1, "#1a0f06");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = warmOrange;
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, W - 32, H - 32);
    ctx.strokeStyle = "rgba(255, 143, 0, 0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(28, 28, W - 56, H - 56);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.direction = "rtl";

    for (let i = 0; i < 5; i++) {
      const sx = 100 + i * 150;
      ctx.fillStyle = `rgba(255, 100, 0, ${0.04 + i * 0.01})`;
      ctx.beginPath(); ctx.arc(sx, 700, 60 + i * 15, 0, Math.PI * 2); ctx.fill();
    }

    ctx.font = `80px "Amiri"`;
    ctx.fillStyle = "#fff";
    ctx.fillText("🔥", W / 2, 150);

    const dayStr = String(days);
    ctx.font = `bold 120px "Amiri"`;
    ctx.fillStyle = warmOrange;
    ctx.fillText(dayStr, W / 2, 300);

    ctx.font = `bold 36px "Amiri"`;
    ctx.fillStyle = "#f5e6c8";
    ctx.fillText(days > 10 ? "يومًا متواصلاً" : "أيام متواصلة", W / 2, 380);

    ctx.font = `28px "Amiri"`;
    ctx.fillStyle = "rgba(245, 230, 200, 0.7)";
    ctx.fillText("سلسلة كتابة يومية", W / 2, 440);

    const barY = 490;
    ctx.fillStyle = "rgba(255, 143, 0, 0.15)";
    ctx.beginPath(); ctx.roundRect(80, barY, W - 160, 60, 30); ctx.fill();
    const streakBarWidth = Math.min((days / 30) * (W - 160), W - 160);
    const barGrad = ctx.createLinearGradient(80, barY, 80 + streakBarWidth, barY);
    barGrad.addColorStop(0, flame);
    barGrad.addColorStop(1, warmOrange);
    ctx.fillStyle = barGrad;
    ctx.beginPath(); ctx.roundRect(80, barY, streakBarWidth, 60, 30); ctx.fill();
    ctx.font = `bold 22px "Amiri"`;
    ctx.fillStyle = "#fff";
    ctx.fillText(`${days} / 30`, W / 2, barY + 30);

    ctx.font = `bold 32px "Amiri"`;
    ctx.fillStyle = "#f5e6c8";
    ctx.fillText(authorName.slice(0, 40), W / 2, 610);

    ctx.font = `16px "Amiri"`;
    ctx.fillStyle = "rgba(245, 230, 200, 0.5)";
    ctx.fillText("— التزام يومي بالكتابة الإبداعية —", W / 2, 650);

    drawCardFooter(ctx, W, H, warmOrange);
  }

  function renderWordGoalCard(ctx: any, W: number, H: number, authorName: string, projectTitle: string, milestone: number) {
    const gold = "#d4af37", teal = "#0d7377", darkTeal = "#064e52", darkBrown = "#3d2b1f";

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#f0faf9");
    bg.addColorStop(0.5, "#e8f5f3");
    bg.addColorStop(1, "#e0f0ed");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = teal;
    ctx.lineWidth = 5;
    ctx.strokeRect(18, 18, W - 36, H - 36);
    ctx.strokeStyle = "rgba(13, 115, 119, 0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(30, 30, W - 60, H - 60);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.direction = "rtl";

    const ringCx = W / 2, ringCy = 220, ringR = 100;
    ctx.lineWidth = 12;
    ctx.strokeStyle = "rgba(13, 115, 119, 0.15)";
    ctx.beginPath(); ctx.arc(ringCx, ringCy, ringR, 0, Math.PI * 2); ctx.stroke();
    const pct = Math.min(milestone || 100, 100) / 100;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + pct * Math.PI * 2;
    ctx.strokeStyle = teal;
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(ringCx, ringCy, ringR, startAngle, endAngle); ctx.stroke();
    ctx.lineCap = "butt";

    ctx.font = `bold 56px "Amiri"`;
    ctx.fillStyle = darkTeal;
    ctx.fillText(`${milestone || 100}٪`, ringCx, ringCy);

    ctx.font = `bold 40px "Amiri"`;
    ctx.fillStyle = darkBrown;
    ctx.fillText(milestone >= 100 ? "حققتُ هدف الكلمات" : `بلغتُ ${milestone}٪ من هدفي`, W / 2, 370);

    ctx.strokeStyle = teal; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(W / 2 - 80, 410); ctx.lineTo(W / 2 + 80, 410); ctx.stroke();

    if (projectTitle) {
      ctx.font = `26px "Amiri"`;
      ctx.fillStyle = "#4a6b6e";
      const lines = wrapText(ctx, projectTitle, W - 140).slice(0, 2);
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], W / 2, 455 + i * 38);
      }
    }

    ctx.font = `bold 32px "Amiri"`;
    ctx.fillStyle = darkBrown;
    ctx.fillText(authorName.slice(0, 40), W / 2, 570);

    ctx.font = `16px "Amiri"`;
    ctx.fillStyle = "#4a6b6e";
    ctx.fillText("— كاتب على منصة قلم —", W / 2, 610);

    ctx.fillStyle = teal; ctx.font = `24px "Amiri"`;
    ctx.fillText("✦  ❋  ✦", W / 2, H - 100);

    drawCardFooter(ctx, W, H, teal);
  }

  app.post("/api/milestone-card", isAuthenticated, async (req: any, res) => {
    try {
      const { type, authorName, projectTitle, milestone } = req.body;
      if (!type || !authorName || authorName.length > 100) {
        return res.status(400).json({ error: "النوع واسم المؤلف مطلوبان" });
      }
      const safeAuthor = String(authorName).slice(0, 80);
      const safeTitle = projectTitle ? String(projectTitle).slice(0, 200) : "";
      const safeMilestone = milestone ? Math.min(Math.max(Number(milestone) || 0, 0), 10000) : undefined;

      const W = 800, H = 800;
      const canvas = createCanvas(W, H);
      const ctx = canvas.getContext("2d");

      if (type === "project_completion" || type === "first_publication" || type === "hall_of_glory") {
        renderCompletionCard(ctx, W, H, safeAuthor, safeTitle || (type === "hall_of_glory" ? "فائز بتحدي الكتابة" : type === "first_publication" ? "نشرتُ عملي الأول" : "مشروع مكتمل"));
      } else if (type === "writing_streak") {
        renderStreakCard(ctx, W, H, safeAuthor, safeMilestone || 7);
      } else if (type === "word_count_goal") {
        renderWordGoalCard(ctx, W, H, safeAuthor, safeTitle, safeMilestone || 100);
      } else {
        return res.status(400).json({ error: "نوع البطاقة غير معروف" });
      }

      const pngBuffer = canvas.toBuffer("image/png");
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Content-Disposition", `inline; filename="qalamai-milestone.png"`);
      res.send(pngBuffer);
    } catch (error) {
      console.error("Error generating milestone card:", error);
      res.status(500).json({ error: "فشل في إنشاء بطاقة الإنجاز" });
    }
  });

  async function checkAiRateLimit(req: any, res: any): Promise<boolean> {
    const userId = req.user?.claims?.sub;
    if (!userId) return false;
    if (await isUserSuperAdmin(userId)) return true;
    const result = await storage.checkAndIncrementAiUsage(userId);
    if (!result.allowed) {
      res.status(429).json({
        error: "لقد استنفدت حصتك اليومية من التوليد بالذكاء الاصطناعي (20 طلب/يوم). يرجى المحاولة غداً.",
        resetTime: result.resetTime,
        remaining: 0,
      });
      return false;
    }
    return true;
  }

  app.get("/api/ai-usage-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (await isUserSuperAdmin(userId)) {
        return res.json({ used: 0, limit: 999, remaining: 999, resetTime: "", exempt: true });
      }
      const status = await storage.getAiUsageStatus(userId);
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.get("/sitemap.xml", async (req, res) => {
    try {
      const cacheKey = "sitemap";
      const ttl = 3600;
      const cached = apiCache.get<string>(cacheKey);
      if (cached) {
        const clientEtag = req.headers["if-none-match"];
        if (clientEtag && clientEtag === cached.etag) {
          return res.status(304).end();
        }
        res.set("Content-Type", "application/xml");
        res.setHeader("ETag", cached.etag);
        res.setHeader("Cache-Control", `public, max-age=${ttl}`);
        return res.send(cached.data);
      }

      const baseUrl = "https://qalamai.net";
      const staticPages = [
        { loc: "/", priority: "1.0", changefreq: "weekly" },
        { loc: "/about", priority: "0.8", changefreq: "monthly" },
        { loc: "/features", priority: "0.8", changefreq: "monthly" },
        { loc: "/pricing", priority: "0.9", changefreq: "weekly" },
        { loc: "/contact", priority: "0.6", changefreq: "monthly" },
        { loc: "/gallery", priority: "0.7", changefreq: "daily" },
        { loc: "/reviews", priority: "0.6", changefreq: "weekly" },
        { loc: "/abu-hashim", priority: "0.7", changefreq: "monthly" },
        { loc: "/promo", priority: "0.8", changefreq: "monthly" },
        { loc: "/novel-theme", priority: "0.6", changefreq: "monthly" },
        { loc: "/memoires", priority: "0.7", changefreq: "daily" },
        { loc: "/essays", priority: "0.7", changefreq: "daily" },
        { loc: "/login", priority: "0.5", changefreq: "yearly" },
        { loc: "/register", priority: "0.5", changefreq: "yearly" },
        { loc: "/privacy", priority: "0.3", changefreq: "yearly" },
        { loc: "/terms", priority: "0.3", changefreq: "yearly" },
        { loc: "/refund", priority: "0.3", changefreq: "yearly" },
      ];
      const today = new Date().toISOString().split("T")[0];

      const sharedProjects = await storage.getGalleryProjects();
      const sharedUrls = sharedProjects
        .filter((p: any) => p.shareToken)
        .slice(0, 500)
        .map((p: any) => ({
          loc: `/shared/${p.shareToken}`,
          priority: "0.5",
          changefreq: "weekly",
        }));

      const essayUrls = sharedProjects
        .filter((p: any) => p.shareToken && p.projectType === "essay")
        .slice(0, 500)
        .map((p: any) => ({
          loc: `/essay/${p.shareToken}`,
          priority: "0.8",
          changefreq: "weekly",
        }));

      const authorIds = new Set<string>();
      sharedProjects.forEach((p: any) => { if (p.userId) authorIds.add(p.userId); });
      const authorUrls = Array.from(authorIds).slice(0, 200).map((id) => ({
        loc: `/author/${id}`,
        priority: "0.5",
        changefreq: "weekly",
      }));

      const allPages = [...staticPages, ...essayUrls, ...sharedUrls, ...authorUrls];
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(p => `  <url>
    <loc>${baseUrl}${p.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join("\n")}
</urlset>`;
      const entry = apiCache.set(cacheKey, xml, ttl);
      res.set("Content-Type", "application/xml");
      res.setHeader("ETag", entry.etag);
      res.setHeader("Cache-Control", `public, max-age=${ttl}`);
      res.send(xml);
    } catch (error) {
      console.error("Sitemap generation error:", error);
      res.status(500).send("خطأ في إنشاء خريطة الموقع");
    }
  });

  app.get("/api/user/plan", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });
      res.json({ plan: user.plan || "free", planPurchasedAt: user.planPurchasedAt });
    } catch (error) {
      console.error("Error fetching plan:", error);
      res.status(500).json({ error: "فشل في جلب الخطة" });
    }
  });

  app.post("/api/plans/purchase", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { plan, promoCode } = req.body;

      if (!plan || !PLAN_PRICES[plan]) {
        return res.status(400).json({ error: "خطة غير صالحة" });
      }

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });

      if (user.plan === plan || user.plan === "all_in_one") {
        return res.json({ message: "الخطة مفعّلة بالفعل", alreadyActive: true });
      }

      if (FREE_ACCESS_USER_IDS.includes(userId)) {
        await storage.updateUserPlan(userId, plan);
        const projects = await storage.getProjectsByUser(userId);
        for (const p of projects) {
          if (!p.paid && userPlanCoversType(plan, p.projectType || "novel")) {
            await storage.updateProjectPayment(p.id, true);
          }
        }
        return res.json({ message: "تم تفعيل الخطة مجاناً", alreadyActive: true });
      }

      let discountPercent = 0;
      if (promoCode && typeof promoCode === "string") {
        const promo = await storage.getPromoCode(promoCode.toUpperCase());
        if (promo && promo.active) {
          const notExpired = !promo.validUntil || new Date(promo.validUntil) >= new Date();
          const notMaxed = !promo.maxUses || promo.usedCount < promo.maxUses;
          const applicable = promo.applicableTo === "all" || promo.applicableTo === plan;
          if (notExpired && notMaxed && applicable) {
            discountPercent = promo.discountPercent;
            await storage.incrementPromoUsage(promo.id);
          }
        }
      }

      const stripe = await getUncachableStripeClient();

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          metadata: { userId },
        });
        customerId = customer.id;
        await storage.updateUserStripeCustomerId(userId, customer.id);
      }

      const planNames: Record<string, string> = {
        essay: "خطة المقالات",
        scenario: "خطة السيناريوهات",
        all_in_one: "الخطة الشاملة",
      };

      const basePrice = PLAN_PRICES[plan];
      const finalPrice = discountPercent > 0
        ? Math.round(basePrice * (1 - discountPercent / 100))
        : basePrice;

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: finalPrice,
              product_data: {
                name: planNames[plan] || plan,
                description: discountPercent > 0
                  ? `QalamAI - ${planNames[plan] || plan} (خصم ${discountPercent}%)`
                  : `QalamAI - ${planNames[plan] || plan}`,
              },
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${baseUrl}/pricing?plan_success=true&plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/pricing?plan_cancelled=true`,
        metadata: {
          userId,
          planType: plan,
          type: "plan_purchase",
          ...(promoCode ? { promoCode: promoCode.toUpperCase(), discountPercent: String(discountPercent) } : {}),
        },
      });

      res.json({ checkoutUrl: session.url });
    } catch (error) {
      console.error("Error creating plan checkout:", error);
      res.status(500).json({ error: "فشل في إنشاء جلسة الدفع" });
    }
  });

  app.post("/api/plans/verify", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { sessionId, plan } = req.body;

      if (!sessionId || !plan || !PLAN_PRICES[plan]) {
        return res.status(400).json({ error: "بيانات غير صالحة" });
      }

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });

      if (user.plan === plan || user.plan === "all_in_one") {
        return res.json({ success: true, plan: user.plan });
      }

      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== "paid") {
        return res.status(400).json({ error: "لم يتم تأكيد الدفع بعد" });
      }

      if (session.metadata?.planType !== plan || session.metadata?.userId !== userId) {
        return res.status(400).json({ error: "بيانات الجلسة غير متطابقة" });
      }

      await storage.updateUserPlan(userId, plan);

      const projects = await storage.getProjectsByUser(userId);
      for (const p of projects) {
        if (!p.paid && userPlanCoversType(plan, p.projectType || "novel")) {
          await storage.updateProjectPayment(p.id, true);
        }
      }

      trackServerEvent({
        eventName: "Purchase",
        userId,
        value: PLAN_PRICES[plan] / 100,
        currency: "USD",
        contentType: "plan",
        contentId: plan,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.json({ success: true, plan });
    } catch (error) {
      console.error("Error verifying plan:", error);
      res.status(500).json({ error: "فشل في التحقق من الدفع" });
    }
  });

  app.post("/api/trial/create-setup-intent", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });
      if (user.trialUsed) return res.status(400).json({ error: "لقد استخدمت الفترة التجريبية من قبل" });
      if (user.plan && user.plan !== "free") return res.status(400).json({ error: "لديك خطة مفعّلة بالفعل" });

      const stripe = await getUncachableStripeClient();
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          metadata: { userId },
        });
        customerId = customer.id;
        await storage.updateUserStripeCustomerId(userId, customerId);
      }

      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ["card"],
        metadata: { userId, type: "trial" },
      });

      const publishableKey = await getStripePublishableKey();
      res.json({ clientSecret: setupIntent.client_secret, publishableKey });
    } catch (error) {
      console.error("Error creating trial setup intent:", error);
      res.status(500).json({ error: "فشل في إعداد بيانات الدفع" });
    }
  });

  app.post("/api/trial/activate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { setupIntentId } = req.body;
      if (!setupIntentId) return res.status(400).json({ error: "بيانات غير صالحة" });

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });
      if (user.trialUsed) return res.status(400).json({ error: "لقد استخدمت الفترة التجريبية من قبل" });

      const stripe = await getUncachableStripeClient();
      const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
      if (setupIntent.status !== "succeeded") return res.status(400).json({ error: "لم يتم تأكيد بيانات الدفع" });

      const siCustomer = typeof setupIntent.customer === "string" ? setupIntent.customer : setupIntent.customer?.id;
      if (!siCustomer || siCustomer !== user.stripeCustomerId) {
        return res.status(403).json({ error: "بيانات الدفع لا تطابق حسابك" });
      }

      const paymentMethodId = typeof setupIntent.payment_method === "string" ? setupIntent.payment_method : setupIntent.payment_method?.id;
      if (!paymentMethodId) return res.status(400).json({ error: "لم يتم حفظ وسيلة الدفع" });

      const now = new Date();
      const trialEndsAt = new Date(now.getTime() + TRIAL_DURATION_HOURS * 60 * 60 * 1000);

      await storage.updateUserTrial(userId, {
        plan: "trial",
        trialActive: true,
        trialStartedAt: now,
        trialEndsAt,
        trialUsed: true,
        trialStripeSetupIntentId: setupIntentId,
        trialStripePaymentMethodId: paymentMethodId,
      });

      const projects = await storage.getProjectsByUser(userId);
      for (const p of projects) {
        if (!p.paid) {
          await storage.updateProjectPayment(p.id, true);
        }
      }

      trackServerEvent({
        eventName: "StartTrial",
        userId,
        value: 0,
        currency: "USD",
        contentType: "trial",
        contentId: "trial_24h",
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.json({ success: true, trialEndsAt });
    } catch (error) {
      console.error("Error activating trial:", error);
      res.status(500).json({ error: "فشل في تفعيل الفترة التجريبية" });
    }
  });

  app.post("/api/trial/check-expiry", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = await processTrialExpiry(userId, req.ip, req.get("user-agent"));

      if (result.status === "trial_active") {
        const user = await storage.getUser(userId);
        return res.json({ trialActive: true, trialEndsAt: user?.trialEndsAt, plan: "trial" });
      }

      res.json({
        trialActive: result.plan === "trial",
        plan: result.plan,
        charged: result.charged,
        chargeFailed: result.chargeFailed,
      });
    } catch (error) {
      console.error("Error checking trial expiry:", error);
      res.status(500).json({ error: "فشل في التحقق من حالة الفترة التجريبية" });
    }
  });

  app.get("/api/trial/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });
      res.json({
        trialActive: user.trialActive || false,
        trialUsed: user.trialUsed || false,
        trialEndsAt: user.trialEndsAt,
        plan: user.plan,
      });
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب حالة التجربة" });
    }
  });

  app.get("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const cacheKey = `user-projects-${userId}`;
      const cached = apiCache.get<any[]>(cacheKey);
      if (cached) {
        if (req.headers["if-none-match"] === cached.etag) return res.status(304).end();
        res.setHeader("ETag", cached.etag);
        res.setHeader("Cache-Control", "private, max-age=30");
        return res.json(cached.data);
      }
      const projects = await storage.getProjectsByUser(userId);
      const trimmed = projects.map(p => ({
        id: p.id,
        title: p.title,
        projectType: p.projectType,
        status: p.status,
        paid: p.paid,
        coverImageUrl: p.coverImageUrl,
        mainIdea: p.mainIdea?.slice(0, 200) || null,
        shareToken: p.shareToken,
        publishedToGallery: p.publishedToGallery,
        publishedToNews: p.publishedToNews,
        flagged: p.flagged,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        price: p.price,
        usedWords: p.usedWords,
        allowedWords: p.allowedWords,
        subject: p.subject,
        genre: p.genre,
        pageCount: p.pageCount,
        targetWordCount: p.targetWordCount,
        narrativePov: p.narrativePov,
        wordCountGoal: p.wordCountGoal,
        milestonesReached: p.milestonesReached,
      }));
      const entry = apiCache.set(cacheKey, trimmed, 30);
      res.setHeader("ETag", entry.etag);
      res.setHeader("Cache-Control", "private, max-age=30");
      res.json(trimmed);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ error: "فشل في جلب المشاريع" });
    }
  });

  app.get("/api/projects/stats", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    serveCached(req, res, `project-stats-${userId}`, 30, async () => {
      return storage.getProjectStatsForUser(userId);
    });
  });

  app.get("/api/favorites", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favoriteIds = await storage.getFavoritesByUser(userId);
      res.json(favoriteIds);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ error: "فشل في جلب المفضّلات" });
    }
  });

  app.get("/api/saved-projects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const saved = await storage.getSavedProjectsEnriched(userId);
      res.json(saved);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب المحفوظات" });
    }
  });

  app.post("/api/projects/:id/favorite", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = parseIntParam(req.params.id);
      if (projectId === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ error: "المشروع غير موجود" });
      }
      const result = await storage.toggleFavorite(userId, projectId);
      res.json(result);
    } catch (error) {
      console.error("Error toggling favorite:", error);
      res.status(500).json({ error: "فشل في تعديل المفضّلة" });
    }
  });

  app.get("/api/projects/writing-stats", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    serveCached(req, res, `writing-stats-${userId}`, 60, async () => {
      return storage.getWritingStatsForUser(userId);
    });
  });

  app.get("/api/writing-streak", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });

      const today = new Date().toISOString().split("T")[0];
      const todayStart = new Date(today + "T00:00:00.000Z");
      const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      const todayChapters = await db
        .select({ content: chapters.content })
        .from(chapters)
        .innerJoin(novelProjects, eq(chapters.projectId, novelProjects.id))
        .where(
          and(
            eq(novelProjects.userId, userId),
            gte(chapters.createdAt, todayStart),
            lt(chapters.createdAt, tomorrowStart)
          )
        );

      let todayWords = 0;
      for (const ch of todayChapters) {
        if (ch.content) {
          todayWords += ch.content.split(/\s+/).filter((w: string) => w.trim()).length;
        }
      }

      res.json({
        streak: user.writingStreak || 0,
        lastWritingDate: user.lastWritingDate || null,
        dailyWordGoal: user.dailyWordGoal || 500,
        todayWords,
      });
    } catch (error) {
      console.error("Error fetching writing streak:", error);
      res.status(500).json({ error: "فشل في جلب سلسلة الكتابة" });
    }
  });

  app.patch("/api/writing-streak/goal", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { dailyWordGoal } = req.body;
      if (typeof dailyWordGoal !== "number" || dailyWordGoal < 100 || dailyWordGoal > 10000) {
        return res.status(400).json({ error: "الهدف اليومي يجب أن يكون بين 100 و 10,000 كلمة" });
      }
      await db.update(users).set({ dailyWordGoal }).where(eq(users.id, userId));
      res.json({ dailyWordGoal });
    } catch (error) {
      console.error("Error updating daily goal:", error);
      res.status(500).json({ error: "فشل في تحديث الهدف اليومي" });
    }
  });

  app.get("/api/public/projects/:id/share-redirect", async (req, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      if ((project.publishedToGallery || project.publishedToNews) && project.shareToken) {
        return res.json({ shareToken: project.shareToken });
      }
      return res.status(404).json({ error: "المشروع غير متاح للعرض العام" });
    } catch (error: unknown) {
      console.error("Public project share redirect error:", error);
      res.status(500).json({ error: "فشل في جلب المشروع" });
    }
  });

  app.get("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const project = await storage.getProjectWithDetails(id);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "غير مصرّح بالوصول" });
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ error: "فشل في جلب المشروع" });
    }
  });

  app.post("/api/projects/:id/create-checkout", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const userId = req.user.claims.sub;
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      if (project.userId !== userId) return res.status(403).json({ error: "غير مصرّح بالوصول" });
      if (project.paid) return res.json({ message: "المشروع مدفوع بالفعل", alreadyPaid: true });

      const user = await storage.getUser(userId);
      const planCovers = userPlanCoversType(user?.plan, project.projectType || "novel");
      if (planCovers) {
        await storage.updateProjectPayment(id, true);
        return res.json({ message: "الخطة تغطي هذا المشروع", alreadyPaid: true });
      }

      if (FREE_ACCESS_USER_IDS.includes(userId)) {
        await storage.updateProjectPayment(id, true);
        return res.json({ message: "تم تفعيل المشروع مجاناً", alreadyPaid: true });
      }

      const stripe = await getUncachableStripeClient();

      let customerId = user?.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user?.email || undefined,
          metadata: { userId },
        });
        customerId = customer.id;
        await storage.updateUserStripeCustomerId(userId, customer.id);
      }

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: project.price,
              product_data: {
                name: project.projectType === "essay" ? `مقال: ${project.title}` : project.projectType === "scenario" ? `سيناريو: ${project.title}` : project.projectType === "short_story" ? `قصة قصيرة: ${project.title}` : project.projectType === "khawater" ? `خاطرة: ${project.title}` : project.projectType === "social_media" ? `محتوى سوشيال: ${project.title}` : project.projectType === "poetry" ? `قصيدة: ${project.title}` : project.projectType === "memoire" ? `مذكرة تخرج: ${project.title}` : `رواية: ${project.title}`,
                description: project.projectType === "essay" ? `مقال احترافي` : project.projectType === "scenario" ? `سيناريو ${project.formatType === "series" ? "مسلسل" : "فيلم"}` : project.projectType === "short_story" ? `قصة قصيرة ${project.pageCount} صفحة` : project.projectType === "khawater" ? `خاطرة / تأمل أدبي` : project.projectType === "social_media" ? `محتوى سوشيال ميديا` : project.projectType === "poetry" ? `قصيدة عمودية` : project.projectType === "memoire" ? `مذكرة تخرج أكاديمية` : `رواية ${project.pageCount} صفحة`,
              },
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${baseUrl}/project/${id}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/project/${id}?payment=cancelled`,
        metadata: {
          projectId: id.toString(),
          userId,
          type: "project_payment",
        },
      });

      res.json({ checkoutUrl: session.url });
    } catch (error) {
      console.error("Error creating checkout:", error);
      res.status(500).json({ error: "فشل في إنشاء عملية الدفع" });
    }
  });

  app.post("/api/projects/:id/payment-success", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const userId = req.user.claims.sub;
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      if (project.userId !== userId) return res.status(403).json({ error: "غير مصرّح بالوصول" });
      if (project.paid) return res.json(project);

      const { sessionId } = req.body;
      if (sessionId) {
        const stripe = await getUncachableStripeClient();
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status !== "paid") {
          return res.status(400).json({ error: "لم يتم تأكيد الدفع بعد" });
        }
      }

      const updated = await storage.updateProjectPayment(id, true);
      res.json(updated);
    } catch (error) {
      console.error("Error processing payment:", error);
      res.status(500).json({ error: "فشل في معالجة الدفع" });
    }
  });

  app.get("/api/poetry/prosody-data", (_req: any, res) => {
    res.json({
      meters: prosodyData.getAvailableMeters(),
      rhymes: prosodyData.getAvailableRhymes(),
      eras: prosodyData.getEras(),
      themes: prosodyData.getPoetryThemes(),
      tones: prosodyData.getPoetryTones(),
      verseCounts: prosodyData.VERSE_COUNT_OPTIONS,
    });
  });

  app.post("/api/projects/suggest-full", isAuthenticated, async (req: any, res) => {
    try {
      if (await checkApiSuspension(req.user.claims.sub, res)) return;
      if (!(await checkAiRateLimit(req, res))) return;
      const { projectType, hint } = req.body;
      const validTypes = ["novel", "essay", "scenario", "short_story", "khawater", "social_media", "poetry", "memoire"];
      const safeType = validTypes.includes(projectType) ? projectType : "novel";
      const safeHint = typeof hint === "string" ? hint.slice(0, 500) : undefined;

      const { system, user } = buildFullProjectSuggestionPrompt({ projectType: safeType, hint: safeHint });

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_completion_tokens: 4096,
      });
      logApiUsage(req.user.claims.sub, null, "full_project_suggestion", "gpt-5.2", response);

      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return res.status(500).json({ error: "فشل في توليد الاقتراح" });
      }

      try {
        const parsed = JSON.parse(jsonMatch[0]);
        res.json(parsed);

        dispatchWebhook({
          input: `Suggest full project (${safeType})${safeHint ? `: ${safeHint}` : ""}`,
          output: content,
          category: mapProjectTypeToCategory(safeType),
          correction: null,
          timestamp: new Date().toISOString(),
          metadata: { session_id: `suggest-${req.user.claims.sub}`, language: "ar", word_count: countWords(content) },
        });
      } catch {
        return res.status(500).json({ error: "فشل في تحليل الاقتراح" });
      }
    } catch (error) {
      console.error("Error generating full project suggestion:", error);
      res.status(500).json({ error: "حدث خطأ أثناء توليد الاقتراح" });
    }
  });

  app.post("/api/projects/suggest-titles", isAuthenticated, async (req: any, res) => {
    try {
      if (await checkApiSuspension(req.user.claims.sub, res)) return;
      if (!(await checkAiRateLimit(req, res))) return;
      const parsed = suggestTitlesSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: formatZodErrors(parsed.error) });
      }
      const { mainIdea, timeSetting, placeSetting, narrativePov, characters, projectType: safeProjectType, poetryMeter, poetryEra, poetryTheme, poetryTone } = parsed.data;

      const { system, user } = buildTitleSuggestionPrompt({
        mainIdea,
        projectType: safeProjectType,
        timeSetting,
        placeSetting,
        narrativePov,
        characters: characters?.map(c => ({ name: c.name, role: c.role })),
        poetryMeter,
        poetryEra,
        poetryTheme,
        poetryTone,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_completion_tokens: 2048,
      });
      logApiUsage(req.user.claims.sub, null, "title_suggestion", "gpt-5.2", response);

      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return res.status(500).json({ error: "فشل في توليد العناوين" });
      }

      let suggestions: Array<{ title: string; reason: string }>;
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(parsed)) throw new Error("Not an array");
        suggestions = parsed
          .filter((s: any) => s && typeof s.title === "string" && typeof s.reason === "string")
          .slice(0, 5)
          .map((s: any) => ({ title: String(s.title), reason: String(s.reason) }));
      } catch {
        return res.status(500).json({ error: "فشل في توليد العناوين" });
      }

      if (suggestions.length === 0) {
        return res.status(500).json({ error: "فشل في توليد العناوين" });
      }

      res.json(suggestions);
    } catch (error) {
      console.error("Error suggesting titles:", error);
      res.status(500).json({ error: "فشل في اقتراح العناوين" });
    }
  });

  app.post("/api/projects/:id/suggest-titles", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (await checkApiSuspension(userId, res)) return;
      if (!(await checkAiRateLimit(req, res))) return;
      const projectId = parseIntParam(req.params.id);
      if (projectId === null) return res.status(400).json({ error: "معرّف غير صالح" });
      if (isNaN(projectId)) return res.status(400).json({ error: "معرّف المشروع غير صالح" });

      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      if (project.userId !== userId) return res.status(403).json({ error: "غير مصرح" });

      if (!project.mainIdea || project.mainIdea.length < 5) {
        return res.status(400).json({ error: "الفكرة الرئيسية مطلوبة لاقتراح العناوين" });
      }

      const safeChars = Array.isArray(project.characters)
        ? project.characters.filter((c: any) => c && typeof c.name === "string" && typeof c.role === "string").slice(0, 20).map((c: any) => ({ name: String(c.name).slice(0, 100), role: String(c.role).slice(0, 50) }))
        : undefined;

      const { system, user } = buildTitleSuggestionPrompt({
        mainIdea: project.mainIdea.slice(0, 2000),
        projectType: project.projectType || "novel",
        timeSetting: project.timeSetting || undefined,
        placeSetting: project.placeSetting || undefined,
        narrativePov: project.narrativePov || undefined,
        characters: safeChars,
        subject: project.subject || undefined,
        essayTone: project.essayTone || undefined,
        targetAudience: project.targetAudience || undefined,
        genre: project.genre || undefined,
        formatType: project.formatType || undefined,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_completion_tokens: 2048,
      });
      logApiUsage(userId, projectId, "title_suggestion", "gpt-5.2", response);

      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return res.status(500).json({ error: "فشل في توليد العناوين" });
      }

      let suggestions: Array<{ title: string; reason: string }>;
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(parsed)) throw new Error("Not an array");
        suggestions = parsed
          .filter((s: any) => s && typeof s.title === "string" && typeof s.reason === "string")
          .slice(0, 5)
          .map((s: any) => ({ title: String(s.title), reason: String(s.reason) }));
      } catch {
        return res.status(500).json({ error: "فشل في توليد العناوين" });
      }

      if (suggestions.length === 0) {
        return res.status(500).json({ error: "فشل في توليد العناوين" });
      }

      res.json(suggestions);
    } catch (error) {
      console.error("Error suggesting titles for project:", error);
      res.status(500).json({ error: "فشل في اقتراح العناوين" });
    }
  });

  app.post("/api/projects/suggest-format", isAuthenticated, async (req: any, res) => {
    try {
      if (await checkApiSuspension(req.user.claims.sub, res)) return;
      if (!(await checkAiRateLimit(req, res))) return;
      const { title, mainIdea, timeSetting, placeSetting } = req.body;
      if (!mainIdea || typeof mainIdea !== "string" || mainIdea.length < 10) {
        return res.status(400).json({ error: "الفكرة الرئيسية مطلوبة (10 أحرف على الأقل)" });
      }

      const { system, user } = buildFormatSuggestionPrompt({
        title: typeof title === "string" ? title.slice(0, 200) : undefined,
        mainIdea: mainIdea.slice(0, 2000),
        timeSetting: typeof timeSetting === "string" ? timeSetting.slice(0, 200) : undefined,
        placeSetting: typeof placeSetting === "string" ? placeSetting.slice(0, 200) : undefined,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_completion_tokens: 1024,
      });
      logApiUsage(req.user.claims.sub, null, "format_suggestion", "gpt-5.2", response);

      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return res.status(500).json({ error: "فشل في تحليل الفكرة" });
      }

      let suggestion: { recommendation: string; confidence: string; reasoning: string; shortStoryAdvantages: string; novelAdvantages: string };
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (!parsed.recommendation || !parsed.reasoning) throw new Error("Invalid format");
        suggestion = {
          recommendation: parsed.recommendation === "short_story" ? "short_story" : "novel",
          confidence: ["high", "medium", "low"].includes(parsed.confidence) ? parsed.confidence : "medium",
          reasoning: String(parsed.reasoning),
          shortStoryAdvantages: String(parsed.shortStoryAdvantages || ""),
          novelAdvantages: String(parsed.novelAdvantages || ""),
        };
      } catch {
        return res.status(500).json({ error: "فشل في تحليل الفكرة" });
      }

      res.json(suggestion);
    } catch (error) {
      console.error("Error suggesting format:", error);
      res.status(500).json({ error: "فشل في تحليل الشكل الأدبي" });
    }
  });

  app.post("/api/projects/suggest-technique", isAuthenticated, async (req: any, res) => {
    try {
      if (await checkApiSuspension(req.user.claims.sub, res)) return;
      if (!(await checkAiRateLimit(req, res))) return;
      const { mainIdea, timeSetting, placeSetting, characters } = req.body;
      if (!mainIdea || typeof mainIdea !== "string" || mainIdea.length < 10) {
        return res.status(400).json({ error: "الفكرة الرئيسية مطلوبة (10 أحرف على الأقل)" });
      }

      const safeChars = Array.isArray(characters)
        ? characters.filter((c: any) => c && typeof c.name === "string" && typeof c.role === "string").slice(0, 20).map((c: any) => ({ name: String(c.name).slice(0, 100), role: String(c.role).slice(0, 50) }))
        : undefined;

      const { system, user } = buildTechniqueSuggestionPrompt({
        mainIdea: mainIdea.slice(0, 2000),
        timeSetting: typeof timeSetting === "string" ? timeSetting.slice(0, 200) : undefined,
        placeSetting: typeof placeSetting === "string" ? placeSetting.slice(0, 200) : undefined,
        characters: safeChars,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_completion_tokens: 2048,
      });
      logApiUsage(req.user.claims.sub, null, "technique_suggestion", "gpt-5.2", response);

      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return res.status(500).json({ error: "فشل في تحليل التقنية السردية" });
      }

      let suggestion: { primary: string; secondary: string; explanation: string; examples: string };
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (!parsed.primary || !parsed.explanation) throw new Error("Invalid format");
        suggestion = {
          primary: String(parsed.primary),
          secondary: String(parsed.secondary || ""),
          explanation: String(parsed.explanation),
          examples: String(parsed.examples || ""),
        };
      } catch {
        return res.status(500).json({ error: "فشل في تحليل التقنية السردية" });
      }

      res.json(suggestion);
    } catch (error) {
      console.error("Error suggesting technique:", error);
      res.status(500).json({ error: "فشل في اقتراح التقنية السردية" });
    }
  });

  app.patch("/api/projects/:id/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = parseIntParam(req.params.id);
      if (projectId === null) return res.status(400).json({ error: "معرّف غير صالح" });
      if (isNaN(projectId)) return res.status(400).json({ error: "معرّف المشروع غير صالح" });

      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ error: "المشروع غير موجود" });
      }

      const updates: Partial<NovelProject> = {};

      if (typeof req.body.title === "string" && req.body.title.trim().length > 0) {
        updates.title = sanitizeText(req.body.title).slice(0, 200);
      }

      if (typeof req.body.timeSetting === "string") {
        updates.timeSetting = sanitizeText(req.body.timeSetting).slice(0, 500);
      }
      if (typeof req.body.placeSetting === "string") {
        updates.placeSetting = sanitizeText(req.body.placeSetting).slice(0, 500);
      }
      if (typeof req.body.narrativeTechnique === "string") {
        if (req.body.narrativeTechnique === "" || NARRATIVE_TECHNIQUE_MAP[req.body.narrativeTechnique]) {
          updates.narrativeTechnique = req.body.narrativeTechnique || null;
        }
      }

      const validEssayTones = ["formal", "analytical", "investigative", "editorial", "conversational", "narrative", "persuasive", "satirical", "scientific", "literary", "journalistic"];
      if (typeof req.body.subject === "string") {
        updates.subject = req.body.subject.slice(0, 500);
      }
      if (typeof req.body.essayTone === "string" && validEssayTones.includes(req.body.essayTone)) {
        updates.essayTone = req.body.essayTone;
      }
      if (typeof req.body.targetAudience === "string") {
        updates.targetAudience = req.body.targetAudience.slice(0, 500);
      }

      const validShortStoryGenres = ["realistic", "symbolic", "psychological", "social", "fantasy", "horror", "romantic", "historical", "satirical", "philosophical"];
      const validScenarioGenres = ["drama", "comedy", "thriller", "romance", "action", "sci-fi", "horror", "family", "social", "crime", "war"];
      if (typeof req.body.genre === "string") {
        const projectType = project.projectType;
        const validGenres = projectType === "scenario" ? validScenarioGenres : validShortStoryGenres;
        if (validGenres.includes(req.body.genre)) {
          updates.genre = req.body.genre;
        }
      }
      if (typeof req.body.formatType === "string" && ["film", "series"].includes(req.body.formatType)) {
        updates.formatType = req.body.formatType;
      }
      if (req.body.episodeCount === null) {
        updates.episodeCount = null;
      } else if (typeof req.body.episodeCount === "number" && req.body.episodeCount >= 1 && req.body.episodeCount <= 100) {
        updates.episodeCount = req.body.episodeCount;
      }
      const validPovs = ["first_person", "third_person", "omniscient", "multiple"];
      if (typeof req.body.narrativePov === "string" && validPovs.includes(req.body.narrativePov)) {
        updates.narrativePov = req.body.narrativePov;
      }

      if (typeof req.body.mainIdea === "string" && req.body.mainIdea.trim().length > 0) {
        updates.mainIdea = req.body.mainIdea.trim().slice(0, 5000);
      }

      if (project.projectType === "poetry") {
        const validRawiHaraka = ["fatha", "damma", "kasra", "sukun"];
        if (req.body.poetryRawiHaraka === null || req.body.poetryRawiHaraka === "") {
          (updates as any).poetryRawiHaraka = null;
        } else if (typeof req.body.poetryRawiHaraka === "string" && validRawiHaraka.includes(req.body.poetryRawiHaraka)) {
          (updates as any).poetryRawiHaraka = req.body.poetryRawiHaraka;
        }

        const validRidf = ["alef", "waw", "yaa"];
        if (req.body.poetryRidf === null || req.body.poetryRidf === "" || req.body.poetryRidf === "none") {
          (updates as any).poetryRidf = null;
        } else if (typeof req.body.poetryRidf === "string" && validRidf.includes(req.body.poetryRidf)) {
          (updates as any).poetryRidf = req.body.poetryRidf;
        }

        if (req.body.poetryMuarada === null || req.body.poetryMuarada === "") {
          (updates as any).poetryMuarada = null;
        } else if (typeof req.body.poetryMuarada === "string") {
          (updates as any).poetryMuarada = req.body.poetryMuarada.slice(0, 10000);
        }
      }

      if (project.projectType === "memoire") {
        if (typeof req.body.memoireUniversity === "string") {
          (updates as any).memoireUniversity = req.body.memoireUniversity.slice(0, 500);
        }
        const validCountries = ["sa","eg","dz","ma","tn","iq","sy","jo","lb","ae","kw","qa","bh","om","ye","ly","sd","mr","so","dj","km","ps"];
        if (typeof req.body.memoireCountry === "string" && validCountries.includes(req.body.memoireCountry)) {
          (updates as any).memoireCountry = req.body.memoireCountry;
        }
        if (typeof req.body.memoireFaculty === "string") {
          (updates as any).memoireFaculty = req.body.memoireFaculty.slice(0, 500);
        }
        if (typeof req.body.memoireDepartment === "string") {
          (updates as any).memoireDepartment = req.body.memoireDepartment.slice(0, 500);
        }
        const validFields = ["sciences","humanities","law","medicine","engineering","economics","education","literature","media","computer_science","political_science","sociology","psychology","islamic_studies","agriculture","architecture","pharmacy","management"];
        if (typeof req.body.memoireField === "string" && validFields.includes(req.body.memoireField)) {
          (updates as any).memoireField = req.body.memoireField;
        }
        const validMethodologies = ["qualitative","quantitative","mixed"];
        if (typeof req.body.memoireMethodology === "string" && validMethodologies.includes(req.body.memoireMethodology)) {
          (updates as any).memoireMethodology = req.body.memoireMethodology;
        }
        const validCitations = ["apa","mla","chicago","university_specific"];
        if (typeof req.body.memoireCitationStyle === "string" && validCitations.includes(req.body.memoireCitationStyle)) {
          (updates as any).memoireCitationStyle = req.body.memoireCitationStyle;
        }
        if (req.body.memoirePageTarget === null) {
          (updates as any).memoirePageTarget = null;
        } else if (typeof req.body.memoirePageTarget === "number" && req.body.memoirePageTarget >= 20 && req.body.memoirePageTarget <= 500) {
          (updates as any).memoirePageTarget = req.body.memoirePageTarget;
        }
        if (req.body.memoireChapterCount === null) {
          (updates as any).memoireChapterCount = null;
        } else if (typeof req.body.memoireChapterCount === "number" && req.body.memoireChapterCount >= 2 && req.body.memoireChapterCount <= 20) {
          (updates as any).memoireChapterCount = req.body.memoireChapterCount;
        }
        if (typeof req.body.memoireHypotheses === "string") {
          (updates as any).memoireHypotheses = req.body.memoireHypotheses.slice(0, 5000);
        }
        if (typeof req.body.memoireKeywords === "string") {
          (updates as any).memoireKeywords = req.body.memoireKeywords.slice(0, 1000);
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "لا توجد تعديلات" });
      }

      const updated = await storage.updateProject(projectId, updates);
      apiCache.invalidate(`user-projects-${userId}`);
      res.json(updated);
    } catch (error) {
      console.error("Error updating project settings:", error);
      res.status(500).json({ error: "فشل في تحديث إعدادات المشروع" });
    }
  });

  app.post("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = createProjectSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: formatZodErrors(parsed.error) });
      }
      const { title, mainIdea, timeSetting, placeSetting, narrativePov, pageCount, characters: chars, relationships, projectType, subject, essayTone, targetAudience, genre, episodeCount, formatType, narrativeTechnique, allowDialect, poetryMeter, poetryRhyme, poetryEra, poetryTone, poetryTheme, poetryVerseCount, poetryImageryLevel, poetryEmotionLevel, poetryRawiHaraka, poetryRidf, poetryMuarada } = parsed.data;

      const type = projectType;

      const featureEnabled = await storage.isFeatureEnabled(type, userId);
      if (!featureEnabled) {
        const feature = await storage.getFeature(type);
        return res.status(403).json({ error: feature?.disabledMessage || "هذه الميزة قيد التطوير وستكون متاحة قريباً" });
      }

      const validPageCount = type === "novel" ? ((VALID_PAGE_COUNTS as readonly number[]).includes(pageCount) ? pageCount : 150) : (pageCount || 10);
      const price = getProjectPriceByType(type, validPageCount);

      const user = await storage.getUser(userId);

      if (user?.plan === "trial" && user.trialActive) {
        if (isTrialExpired(user.trialEndsAt)) {
          return res.status(403).json({ error: "انتهت الفترة التجريبية" });
        }
        const existingCount = await storage.getUserProjectCount(userId);
        if (existingCount >= TRIAL_MAX_PROJECTS) {
          return res.status(403).json({ error: `الفترة التجريبية تسمح بمشروع واحد فقط` });
        }
      }

      if (user?.plan === "free" && !FREE_ACCESS_USER_IDS.includes(userId)) {
        const { projectsUsed } = await storage.checkAndResetFreeMonthly(userId);
        if (projectsUsed >= FREE_MONTHLY_PROJECTS) {
          return res.status(403).json({
            error: "لقد استنفدت حصتك المجانية الشهرية. قم بالترقية لإنشاء مشاريع غير محدودة",
            code: "FREE_MONTHLY_LIMIT",
            usage: { projectsUsed, projectsLimit: FREE_MONTHLY_PROJECTS }
          });
        }
      }

      const isFreeUser = FREE_ACCESS_USER_IDS.includes(userId);
      const planCovers = userPlanCoversType(user?.plan, type);
      const autoPaid = isFreeUser || planCovers || (user?.plan === "free");

      const project = await storage.createProject({
        userId,
        title: sanitizeText(title).slice(0, 200),
        mainIdea: sanitizeText(mainIdea || title).slice(0, 5000),
        timeSetting: sanitizeText(timeSetting || "").slice(0, 500),
        placeSetting: sanitizeText(placeSetting || "").slice(0, 500),
        narrativePov: narrativePov || "third_person",
        pageCount: validPageCount,
        allowedWords: 0,
        price,
        projectType: type,
        subject: type === "essay" ? (subject || null) : null,
        essayTone: (type === "essay" || type === "social_media") ? (essayTone || null) : null,
        targetAudience: (type === "essay" || type === "social_media") ? (targetAudience || null) : null,
        genre: (type === "scenario" || type === "short_story" || type === "khawater" || type === "social_media") ? (genre || null) : null,
        episodeCount: type === "scenario" ? (episodeCount || 1) : null,
        formatType: (type === "scenario" || type === "khawater") ? (formatType || null) : null,
        narrativeTechnique: (type === "novel" || type === "short_story") && narrativeTechnique && NARRATIVE_TECHNIQUE_MAP[narrativeTechnique] ? narrativeTechnique : null,
        allowDialect: allowDialect === true,
        poetryMeter: type === "poetry" ? (poetryMeter || "taweel") : null,
        poetryRhyme: type === "poetry" ? (poetryRhyme || "ن") : null,
        poetryEra: type === "poetry" ? (poetryEra || "abbasi") : null,
        poetryTone: type === "poetry" ? (poetryTone || "romantic") : null,
        poetryTheme: type === "poetry" ? (poetryTheme || "ghazal") : null,
        poetryVerseCount: type === "poetry" ? (poetryVerseCount || 10) : null,
        poetryImageryLevel: type === "poetry" ? (poetryImageryLevel ?? 5) : null,
        poetryEmotionLevel: type === "poetry" ? (poetryEmotionLevel ?? 7) : null,
        poetryRawiHaraka: type === "poetry" ? (poetryRawiHaraka || null) : null,
        poetryRidf: type === "poetry" ? (poetryRidf || null) : null,
        poetryMuarada: type === "poetry" ? (poetryMuarada || null) : null,
        memoireUniversity: type === "memoire" ? (parsed.data.memoireUniversity || null) : null,
        memoireCountry: type === "memoire" ? (parsed.data.memoireCountry || null) : null,
        memoireFaculty: type === "memoire" ? (parsed.data.memoireFaculty || null) : null,
        memoireDepartment: type === "memoire" ? (parsed.data.memoireDepartment || null) : null,
        memoireField: type === "memoire" ? (parsed.data.memoireField || null) : null,
        memoireDegreeLevel: type === "memoire" ? (parsed.data.memoireDegreeLevel || null) : null,
        memoireMethodology: type === "memoire" ? (parsed.data.memoireMethodology || "mixed") : null,
        memoireCitationStyle: type === "memoire" ? (parsed.data.memoireCitationStyle || "apa") : null,
        memoireChapterCount: type === "memoire" ? (parsed.data.memoireChapterCount || 5) : null,
        memoirePageTarget: type === "memoire" ? (parsed.data.memoirePageTarget || 100) : null,
        memoireHypotheses: type === "memoire" ? (parsed.data.memoireHypotheses || null) : null,
        memoireKeywords: type === "memoire" ? (parsed.data.memoireKeywords || null) : null,
        memoireUserData: type === "memoire" ? (parsed.data.memoireUserData || null) : null,
        ...(autoPaid ? { paid: true, status: "draft" } : {}),
      });

      if (chars && chars.length > 0) {
        const createdChars = [];
        for (const char of chars) {
          const created = await storage.createCharacter({
            projectId: project.id,
            name: char.name,
            background: char.background,
            role: char.role,
            motivation: char.motivation || null,
            speechStyle: char.speechStyle || null,
            physicalDescription: char.physicalDescription || null,
            psychologicalTraits: char.psychologicalTraits || null,
            age: char.age || null,
          });
          createdChars.push(created);
        }

        if (relationships && relationships.length > 0) {
          for (const rel of relationships) {
            if (createdChars[rel.char1Index] && createdChars[rel.char2Index]) {
              await storage.createRelationship({
                projectId: project.id,
                character1Id: createdChars[rel.char1Index].id,
                character2Id: createdChars[rel.char2Index].id,
                relationship: rel.relationship,
              });
            }
          }
        }
      }

      if (type === "khawater" || type === "social_media" || type === "poetry") {
        await storage.createChapter({
          projectId: project.id,
          chapterNumber: 1,
          title: type === "khawater" ? "النص" : type === "poetry" ? "القصيدة" : "المحتوى",
          summary: null,
        });
        await storage.updateProject(project.id, { outline: "—", outlineApproved: 1 });
      }

      if (user?.plan === "free" && !FREE_ACCESS_USER_IDS.includes(userId)) {
        await storage.incrementFreeMonthlyUsage(userId, "project");
      }

      apiCache.invalidate(`user-projects-${userId}`);
      trackServerEvent({
        eventName: "InitiateCheckout",
        userId,
        contentType: type,
        contentId: String(project.id),
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ error: "فشل في إنشاء المشروع" });
    }
  });

  app.post("/api/projects/:id/outline", isAuthenticated, async (req: any, res) => {
    try {
      if (await checkApiSuspension(req.user.claims.sub, res)) return;
      if (!(await checkAiRateLimit(req, res))) return;
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "غير مصرّح بالوصول" });

      const userId = req.user.claims.sub;
      const isFreeUser = FREE_ACCESS_USER_IDS.includes(userId);
      const user = await storage.getUser(userId);
      const planCovers = userPlanCoversType(user?.plan, project.projectType || "novel");
      if (!project.paid && !isFreeUser && !planCovers) {
        return res.status(402).json({ error: "الرجاء إتمام الدفع أو تفعيل خطة مناسبة." });
      }

      const pType = project.projectType || "novel";
      if (pType === "khawater" || pType === "social_media" || pType === "poetry") {
        return res.status(400).json({ error: "هذا النوع من المشاريع لا يحتاج مخططاً — اضغط على زر الكتابة مباشرة" });
      }

      const forceRegenerate = req.body?.forceRegenerate === true;

      if (project.outline && project.outlineApproved === 1 && !forceRegenerate) {
        return res.status(400).json({ error: "لا يمكن إعادة إنشاء المخطط بعد اعتماده" });
      }

      const existingChapters = await storage.getChaptersByProject(id);
      for (const ch of existingChapters) {
        await storage.deleteChapter(ch.id);
      }
      if (forceRegenerate && project.outlineApproved === 1) {
        await storage.updateProject(id, { outlineApproved: 0 } as any);
      }

      const chars = await storage.getCharactersByProject(id);
      const rels = await db.select().from(characterRelationships).where(eq(characterRelationships.projectId, id));

      let promptResult: { system: string; user: string };

      if (pType === "essay") {
        promptResult = buildEssayOutlinePrompt(project);
      } else if (pType === "scenario") {
        promptResult = buildScenarioOutlinePrompt(project, chars, rels, chars);
      } else if (pType === "short_story") {
        promptResult = buildShortStoryOutlinePrompt(project, chars, rels, chars);
      } else if (pType === "memoire") {
        promptResult = buildMemoireOutlinePrompt(project);
      } else {
        promptResult = buildOutlinePrompt(project, chars, rels, chars);
      }

      promptResult = await enhanceWithKnowledge(promptResult, pType);

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: promptResult.system },
          { role: "user", content: promptResult.user },
        ],
        max_completion_tokens: 8192,
      });
      logApiUsage(userId, id, "outline", "gpt-5.2", response);

      const outline = response.choices[0]?.message?.content || "";

      const updated = await storage.updateProject(id, { outline, status: "outline" });

      if (pType === "essay") {
        const sectionRegex = /القسم\s+(\d+)\s*[:\-—–]\s*(.+)/g;
        const sectionMatches = outline.match(sectionRegex);
        if (sectionMatches) {
          let num = 1;
          for (const match of sectionMatches) {
            const titleMatch = match.match(/القسم\s+\d+\s*[:\-—–]\s*(.+)/);
            const sTitle = titleMatch?.[1]?.trim() || `القسم ${num}`;
            await storage.createChapter({
              projectId: id,
              chapterNumber: num,
              title: sTitle,
              summary: null,
            });
            num++;
          }
        } else {
          const structure = calculateEssayStructure(project.pageCount);
          for (let i = 1; i <= structure.sectionCount; i++) {
            await storage.createChapter({
              projectId: id,
              chapterNumber: i,
              title: `القسم ${i}`,
              summary: null,
            });
          }
        }
      } else if (pType === "scenario") {
        const sceneRegex = /المشهد\s+(\d+)\s*[:\-—–]\s*(.+)/g;
        const sceneMatches = outline.match(sceneRegex);
        if (sceneMatches) {
          let num = 1;
          for (const match of sceneMatches) {
            const titleMatch = match.match(/المشهد\s+\d+\s*[:\-—–]\s*(.+)/);
            const sTitle = titleMatch?.[1]?.trim() || `المشهد ${num}`;
            await storage.createChapter({
              projectId: id,
              chapterNumber: num,
              title: sTitle,
              summary: null,
            });
            num++;
          }
        } else {
          const structure = calculateScenarioStructure(project.formatType || "film", project.episodeCount || 1);
          for (let i = 1; i <= structure.totalScenes; i++) {
            await storage.createChapter({
              projectId: id,
              chapterNumber: i,
              title: `المشهد ${i}`,
              summary: null,
            });
          }
        }
      } else if (pType === "short_story") {
        const sectionRegex = /المقطع\s+(\d+)\s*[:\-—–]\s*(.+)/g;
        const sectionMatches = outline.match(sectionRegex);
        if (sectionMatches) {
          let num = 1;
          for (const match of sectionMatches) {
            const titleMatch = match.match(/المقطع\s+\d+\s*[:\-—–]\s*(.+)/);
            const sTitle = titleMatch?.[1]?.trim() || `المقطع ${num}`;
            await storage.createChapter({
              projectId: id,
              chapterNumber: num,
              title: sTitle,
              summary: null,
            });
            num++;
          }
        } else {
          const structure = calculateShortStoryStructure(project.pageCount);
          for (let i = 1; i <= structure.sectionCount; i++) {
            await storage.createChapter({
              projectId: id,
              chapterNumber: i,
              title: `المقطع ${i}`,
              summary: null,
            });
          }
        }
      } else if (pType === "memoire") {
        const safetyChapters = await storage.getChaptersByProject(id);
        for (const ch of safetyChapters) {
          await storage.deleteChapter(ch.id);
        }
        const arabicOrdinals = "الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر|الحادي عشر|الثاني عشر|الثالث عشر|الرابع عشر|الخامس عشر";
        const memoireChapterRegex = new RegExp(`الفصل\\s+(?:${arabicOrdinals}|[\\d١٢٣٤٥٦٧٨٩٠]+)\\s*[:\\-—–ـ]\\s*(.+)`, "g");
        const chapterMatches = outline.match(memoireChapterRegex);
        const memoireChapterCount = project.memoireChapterCount || 5;
        if (chapterMatches && chapterMatches.length > 0) {
          let num = 1;
          for (const match of chapterMatches) {
            if (num > memoireChapterCount) break;
            const titleMatch = match.match(new RegExp(`الفصل\\s+(?:${arabicOrdinals}|[\\d١٢٣٤٥٦٧٨٩٠]+)\\s*[:\\-—–ـ]\\s*(.+)`));
            const chTitle = titleMatch?.[1]?.trim() || `الفصل ${num}`;
            await storage.createChapter({
              projectId: id,
              chapterNumber: num,
              title: chTitle,
              summary: null,
            });
            num++;
          }
          for (let i = num; i <= memoireChapterCount; i++) {
            const looseFallback = outline.match(new RegExp(`الفصل\\s+(?:${arabicOrdinals}|[\\d١٢٣٤٥٦٧٨٩٠]*${i})[^\\n]*?[:\\-—–ـ]\\s*([^\\n]+)`, "i"));
            await storage.createChapter({
              projectId: id,
              chapterNumber: i,
              title: looseFallback?.[1]?.trim() || `الفصل ${i}`,
              summary: null,
            });
          }
        } else {
          const lines = outline.split("\n").filter(l => l.trim());
          const chapterLines = lines.filter(l => /الفصل\s/.test(l) && /[:\-—–ـ]/.test(l));
          if (chapterLines.length > 0) {
            let num = 1;
            for (const line of chapterLines) {
              const titlePart = line.replace(/^.*?[:\-—–ـ]\s*/, "").trim();
              await storage.createChapter({
                projectId: id,
                chapterNumber: num,
                title: titlePart || `الفصل ${num}`,
                summary: null,
              });
              num++;
              if (num > memoireChapterCount) break;
            }
            for (let i = num; i <= memoireChapterCount; i++) {
              await storage.createChapter({
                projectId: id,
                chapterNumber: i,
                title: `الفصل ${i}`,
                summary: null,
              });
            }
          } else {
            for (let i = 1; i <= memoireChapterCount; i++) {
              await storage.createChapter({
                projectId: id,
                chapterNumber: i,
                title: `الفصل ${i}`,
                summary: null,
              });
            }
          }
        }
      } else {
        const chapterRegex = /الفصل\s+(?:الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر|الحادي عشر|الثاني عشر|الثالث عشر|الرابع عشر|الخامس عشر|السادس عشر|السابع عشر|الثامن عشر|التاسع عشر|العشرون|الحادي والعشرون|الثاني والعشرون|الثالث والعشرون|الرابع والعشرون|الخامس والعشرون|الثلاثون|\d+)\s*[:\-—–]\s*(.+)/g;
        const chapterMatches = outline.match(chapterRegex);

        if (chapterMatches) {
          let chapterNum = 1;
          for (const match of chapterMatches) {
            const titleMatch = match.match(/الفصل\s+(?:الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر|الحادي عشر|الثاني عشر|الثالث عشر|الرابع عشر|الخامس عشر|السادس عشر|السابع عشر|الثامن عشر|التاسع عشر|العشرون|الحادي والعشرون|الثاني والعشرون|الثالث والعشرون|الرابع والعشرون|الخامس والعشرون|الثلاثون|\d+)\s*[:\-—–]\s*(.+)/);
            const chapterTitle = titleMatch?.[1]?.trim() || `الفصل ${chapterNum}`;
            await storage.createChapter({
              projectId: id,
              chapterNumber: chapterNum,
              title: chapterTitle,
              summary: null,
            });
            chapterNum++;
          }
        } else {
          const structure = calculateNovelStructure(project.pageCount);
          for (let i = 1; i <= structure.chapterCount; i++) {
            await storage.createChapter({
              projectId: id,
              chapterNumber: i,
              title: `الفصل ${i}`,
              summary: null,
            });
          }
        }
      }

      res.json(updated);

      dispatchWebhook({
        input: `Generate outline for "${project.title}" (${pType})`,
        output: outline,
        category: mapProjectTypeToCategory(pType),
        correction: null,
        timestamp: new Date().toISOString(),
        metadata: { session_id: `project-${id}`, language: "ar", word_count: countWords(outline) },
      });
    } catch (error) {
      console.error("Error generating outline:", error);
      res.status(500).json({ error: "فشل في توليد المخطط" });
    }
  });

  app.post("/api/projects/:id/outline/approve", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "غير مصرّح بالوصول" });

      const updated = await storage.updateProject(id, { outlineApproved: 1, status: "writing" });
      res.json(updated);
    } catch (error) {
      console.error("Error approving outline:", error);
      res.status(500).json({ error: "فشل في اعتماد المخطط" });
    }
  });

  app.patch("/api/projects/:id/outline", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "غير مصرّح بالوصول" });
      if (project.outlineApproved) return res.status(400).json({ error: "لا يمكن تعديل المخطط بعد الموافقة عليه" });

      const { outline } = req.body;
      if (!outline || typeof outline !== "string") return res.status(400).json({ error: "المخطط مطلوب" });

      const updated = await storage.updateProject(id, { outline: outline.slice(0, 50000) });
      res.json(updated);
    } catch (error) {
      console.error("Error updating outline:", error);
      res.status(500).json({ error: "فشل في حفظ التعديلات" });
    }
  });

  app.post("/api/projects/:id/outline/refine", isAuthenticated, async (req: any, res) => {
    try {
      if (await checkApiSuspension(req.user.claims.sub, res)) return;
      if (!(await checkAiRateLimit(req, res))) return;
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "غير مصرّح بالوصول" });
      if (project.outlineApproved) return res.status(400).json({ error: "لا يمكن تعديل المخطط بعد الموافقة عليه" });

      const { instruction } = req.body;
      if (!instruction || typeof instruction !== "string") return res.status(400).json({ error: "التعليمات مطلوبة" });

      if (project.projectType === "khawater" || project.projectType === "social_media" || project.projectType === "poetry") {
        return res.status(400).json({ error: "هذا النوع من المشاريع لا يحتاج مخططاً" });
      }

      let systemPrompt: string;
      let userPrompt: string;

      if (project.projectType === "memoire") {
        const fieldLabels: Record<string, string> = {
          sciences: "العلوم الطبيعية والتطبيقية", humanities: "العلوم الإنسانية والاجتماعية",
          law: "القانون والعلوم القانونية", medicine: "الطب والعلوم الصحية",
          engineering: "الهندسة والتكنولوجيا", economics: "العلوم الاقتصادية والتجارية وعلوم التسيير",
          education: "علوم التربية والتعليم", literature: "الآداب واللغات",
          media: "الإعلام والاتصال", computer_science: "الإعلام الآلي وعلوم الحاسوب",
          islamic_studies: "العلوم الإسلامية والشريعة", political_science: "العلوم السياسية والعلاقات الدولية",
          psychology: "علم النفس", sociology: "علم الاجتماع",
          history: "التاريخ", philosophy: "الفلسفة",
          agriculture: "العلوم الزراعية", architecture: "الهندسة المعمارية والعمران",
        };
        const fieldAr = fieldLabels[project.memoireField || ""] || project.memoireField || "غير محدد";
        const methodLabels: Record<string, string> = { qualitative: "نوعي", quantitative: "كمّي", mixed: "مختلط" };
        const methodAr = methodLabels[project.memoireMethodology || ""] || project.memoireMethodology || "غير محدد";

        systemPrompt = MEMOIRE_SYSTEM_PROMPT + `\n\nأنت الآن تراجع وتعدّل مخطط مذكرة تخرج أكاديمية. عدّل الهيكل بناءً على تعليمات الطالب مع الحفاظ على الصرامة الأكاديمية والمنهجية العلمية المناسبة للتخصص والنظام الجامعي.`;

        const contextParts = [
          `المخطط الحالي:\n${project.outline}`,
          `\n═══ السياق الأكاديمي ═══`,
          project.memoireUniversity ? `الجامعة: ${project.memoireUniversity}` : null,
          project.memoireCountry ? `البلد: ${project.memoireCountry}` : null,
          project.memoireFaculty ? `الكلية: ${project.memoireFaculty}` : null,
          project.memoireDepartment ? `القسم: ${project.memoireDepartment}` : null,
          `التخصص: ${fieldAr}`,
          `المنهجية: ${methodAr}`,
          project.memoireCitationStyle ? `أسلوب التوثيق: ${project.memoireCitationStyle}` : null,
          project.memoirePageTarget ? `عدد الصفحات المستهدف: ${project.memoirePageTarget}` : null,
          project.memoireChapterCount ? `عدد الفصول: ${project.memoireChapterCount}` : null,
          project.memoireHypotheses ? `الفرضيات: ${project.memoireHypotheses}` : null,
          project.memoireKeywords ? `الكلمات المفتاحية: ${project.memoireKeywords}` : null,
          `\nالتعديل المطلوب:\n${instruction}`,
          `\nأعد المخطط كاملاً بعد التعديل. حافظ على نفس التنسيق والبنية الأكاديمية. تأكد من أن الهيكل يتوافق مع معايير تخصص ${fieldAr} ومتطلبات النظام الجامعي في ${project.memoireCountry || "البلد المحدد"}.`,
        ];
        userPrompt = contextParts.filter(Boolean).join("\n");
      } else {
        systemPrompt = project.projectType === "essay"
          ? "أنت أبو هاشم — محرر صحفي محترف. عدّل الهيكل التالي بناءً على تعليمات المستخدم. أعد الهيكل كاملاً مع التعديلات المطلوبة."
          : project.projectType === "scenario"
          ? "أنت أبو هاشم — كاتب سيناريو محترف. عدّل المخطط الدرامي التالي بناءً على تعليمات المستخدم. أعد المخطط كاملاً مع التعديلات."
          : project.projectType === "short_story"
          ? "أنت أبو هاشم — كاتب قصص قصيرة محترف. عدّل مخطط القصة التالي بناءً على تعليمات المستخدم. أعد المخطط كاملاً مع التعديلات المطلوبة."
          : "أنت أبو هاشم — وكيل أدبي ذكي. عدّل مخطط الرواية التالي بناءً على تعليمات المستخدم. أعد المخطط كاملاً مع التعديلات المطلوبة.";
        userPrompt = `المخطط الحالي:\n${project.outline}\n\nالتعديل المطلوب:\n${instruction}\n\nأعد المخطط كاملاً بعد التعديل. حافظ على نفس التنسيق والبنية.`;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_completion_tokens: 16000,
      });
      logApiUsage(req.user.claims.sub, id, "outline_refine", "gpt-5.2", response);
      const refined = response.choices[0]?.message?.content || project.outline;
      const updated = await storage.updateProject(id, { outline: refined });
      res.json(updated);
    } catch (error) {
      console.error("Error refining outline:", error);
      res.status(500).json({ error: "فشل في تحسين المخطط" });
    }
  });

  app.delete("/api/projects/:projectId/chapters/:chapterId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = parseIntParam(req.params.projectId);
      const chapterId = parseIntParam(req.params.chapterId);
      if (projectId === null || chapterId === null) return res.status(400).json({ error: "معرّف غير صالح" });
      if (isNaN(projectId) || isNaN(chapterId)) {
        return res.status(400).json({ error: "معرّف غير صالح" });
      }

      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      if (project.userId !== userId) return res.status(403).json({ error: "غير مصرّح بالوصول" });

      const chapter = await storage.getChapter(chapterId);
      if (!chapter || chapter.projectId !== projectId) {
        return res.status(404).json({ error: "الفصل غير موجود" });
      }

      await storage.deleteChapter(chapterId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting chapter:", error);
      res.status(500).json({ error: "فشل في حذف الفصل" });
    }
  });

  app.post("/api/projects/:projectId/chapters/:chapterId/generate", isAuthenticated, async (req: any, res) => {
    try {
      if (await checkApiSuspension(req.user.claims.sub, res)) return;
      if (!(await checkAiRateLimit(req, res))) return;
      const projectId = parseIntParam(req.params.projectId);
      const chapterId = parseIntParam(req.params.chapterId);
      if (projectId === null || chapterId === null) return res.status(400).json({ error: "معرّف غير صالح" });

      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "غير مصرّح بالوصول" });

      const isFreeUser = FREE_ACCESS_USER_IDS.includes(req.user.claims.sub);
      const chapterUser = await storage.getUser(req.user.claims.sub);
      const chapterPlanCovers = userPlanCoversType(chapterUser?.plan, project.projectType || "novel");
      if (!project.paid && !isFreeUser && !chapterPlanCovers) {
        return res.status(402).json({ error: "الرجاء إتمام الدفع أو تفعيل خطة مناسبة." });
      }

      if (chapterUser?.plan === "trial" && chapterUser.trialActive) {
        if (isTrialExpired(chapterUser.trialEndsAt)) {
          return res.status(403).json({ error: "انتهت الفترة التجريبية" });
        }
        const allChapsForCount = await storage.getChaptersByProject(projectId);
        const completedCount = allChapsForCount.filter((c: any) => c.status === "completed").length;
        if (completedCount >= TRIAL_MAX_CHAPTERS) {
          return res.status(403).json({ error: `الفترة التجريبية تسمح بـ ${TRIAL_MAX_CHAPTERS} فصول فقط` });
        }
      }

      if (chapterUser?.plan === "free" && !isFreeUser) {
        const { generationsUsed } = await storage.checkAndResetFreeMonthly(req.user.claims.sub);
        if (generationsUsed >= FREE_MONTHLY_GENERATIONS) {
          return res.status(403).json({
            error: "لقد استنفدت حصة التوليد المجانية الشهرية. قم بالترقية لتوليد غير محدود",
            code: "FREE_MONTHLY_LIMIT",
            usage: { generationsUsed, generationsLimit: FREE_MONTHLY_GENERATIONS }
          });
        }
      }

      const chapter = await storage.getChapter(chapterId);
      if (!chapter) return res.status(404).json({ error: "الفصل غير موجود" });
      if (chapter.projectId !== projectId) return res.status(403).json({ error: "غير مصرّح بالوصول" });

      if (chapter.status === "generating") {
        return res.status(409).json({ error: "هذا الفصل قيد التوليد حالياً — يرجى الانتظار" });
      }

      let oldWordCount = 0;
      if (chapter.status === "completed" && chapter.content) {
        oldWordCount = chapter.content.split(/\s+/).filter(w => w.length > 0).length;
      }

      const chars = await storage.getCharactersByProject(projectId);
      const allChapters = await storage.getChaptersByProject(projectId);
      const previousChapters = allChapters.filter(c => c.chapterNumber < chapter.chapterNumber);

      const pType = project.projectType || "novel";
      let totalParts = 1;
      if (pType === "novel") {
        const structure = calculateNovelStructure(project.pageCount);
        totalParts = structure.partsPerChapter;
      } else if (pType === "memoire") {
        const structure = calculateMemoireStructure(project);
        totalParts = structure.partsPerChapter;
      }

      await storage.updateChapter(chapterId, { status: "generating", content: "" });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      res.write(`data: ${JSON.stringify({ totalParts, currentPart: 1 })}\n\n`);

      let fullContent = "";
      let chunkCount = 0;

      for (let part = 1; part <= totalParts; part++) {
        if (part > 1) {
          await storage.updateChapter(chapterId, { content: fullContent });
          res.write(`data: ${JSON.stringify({ currentPart: part, totalParts })}\n\n`);
        }

        const updatedChapter = part > 1
          ? await storage.getChapter(chapterId)
          : chapter;

        let promptResult: { system: string; user: string };
        if (pType === "poetry") {
          promptResult = buildPoetryPrompt(project);
        } else if (pType === "khawater") {
          promptResult = buildKhawaterPrompt(project);
        } else if (pType === "social_media") {
          promptResult = buildSocialMediaPrompt(project);
        } else if (pType === "essay") {
          promptResult = buildEssaySectionPrompt(project, updatedChapter!, previousChapters, project.outline || "", part, totalParts);
        } else if (pType === "scenario") {
          promptResult = buildScenePrompt(project, chars, updatedChapter!, previousChapters, project.outline || "", part, totalParts);
        } else if (pType === "short_story") {
          promptResult = buildShortStorySectionPrompt(project, updatedChapter!, previousChapters, project.outline || "", part, totalParts, chars);
        } else if (pType === "memoire") {
          promptResult = buildMemoireSectionPrompt(project, updatedChapter!, previousChapters, project.outline || "", part, totalParts);
        } else {
          promptResult = buildChapterPrompt(project, chars, updatedChapter!, previousChapters, project.outline || "", part, totalParts);
        }

        promptResult = await enhanceWithKnowledge(promptResult, pType);

        const stream = await openai.chat.completions.create({
          model: "gpt-5.2",
          messages: [
            { role: "system", content: promptResult.system },
            { role: "user", content: promptResult.user },
          ],
          stream: true,
          max_completion_tokens: 8192,
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            fullContent += content;
            chunkCount++;
            res.write(`data: ${JSON.stringify({ content })}\n\n`);

            if (chunkCount % 50 === 0) {
              await storage.updateChapter(chapterId, { content: fullContent });
            }
          }
        }
      }

      await storage.updateChapter(chapterId, { content: fullContent, status: "completed" });
      if (fullContent) {
        await storage.saveChapterVersion(chapterId, fullContent, "ai_generated");
      }

      updateWritingStreak(req.user.claims.sub).catch((e) => console.warn("Failed to update writing streak:", e));
      checkWordCountMilestones(projectId, req.user.claims.sub).catch((e) => console.warn("Failed to check milestones:", e));

      if (chapterUser?.plan === "free" && !isFreeUser) {
        storage.incrementFreeMonthlyUsage(req.user.claims.sub, "generation").catch((e) => console.warn("Failed to increment free monthly usage:", e));
      }

      const estCompletionTokens = Math.ceil(fullContent.length / 3);
      logApiUsage(req.user.claims.sub, projectId, "chapter", "gpt-5.2", { usage: { prompt_tokens: 2000, completion_tokens: estCompletionTokens, total_tokens: 2000 + estCompletionTokens } });

      const wordCount = fullContent.split(/\s+/).filter(w => w.length > 0).length;
      const netWords = wordCount - oldWordCount;
      if (netWords !== 0) {
        await storage.incrementUsedWords(projectId, netWords);
      }

      const completedCount = allChapters.filter(c => c.status === "completed" || c.id === chapterId).length;
      if (completedCount === allChapters.length) {
        await storage.updateProject(projectId, { status: "completed" });
        const projectOwner = await storage.getUser(project.userId);
        if (projectOwner?.email) {
          sendNovelCompletionEmail(projectOwner.email, project.title, projectId, project.projectType || "novel").catch((e) => console.error("Failed to send novel completion email:", e));
        }
        storage.createNotification({
          userId: project.userId,
          type: "project_completed",
          title: "مشروعك مكتمل!",
          message: `مشروعك "${project.title}" مكتمل الآن. يمكنك تحميله.`,
          link: `/project/${projectId}`,
        }).catch((e) => console.warn("Failed to create project completion notification:", e));
      }

      dispatchWebhook({
        input: `Generate chapter "${chapter.title}" for project "${project.title}"`,
        output: fullContent,
        category: mapProjectTypeToCategory(pType),
        correction: null,
        timestamp: new Date().toISOString(),
        metadata: { session_id: `project-${projectId}`, language: "ar", word_count: countWords(fullContent) },
      });

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error generating chapter:", error);
      try {
        const failedChapterId = parseIntParam(req.params.chapterId);
        if (failedChapterId === null) throw new Error("Invalid chapterId in cleanup");
        const chapter = await storage.getChapter(failedChapterId);
        if (chapter && chapter.status === "generating") {
          await storage.updateChapter(failedChapterId, {
            status: chapter.content ? "incomplete" : "pending"
          });
        }
      } catch (cleanupErr) {
        console.error("Error resetting chapter status after generation failure:", cleanupErr);
      }
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "فشل في توليد الفصل" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "فشل في توليد الفصل" });
      }
    }
  });

  app.post("/api/projects/:id/characters", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "غير مصرّح بالوصول" });

      const parsed = createCharacterSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: formatZodErrors(parsed.error) });
      }
      const { name, role, background, motivation, speechStyle, physicalDescription, psychologicalTraits, age } = parsed.data;

      const character = await storage.createCharacter({
        projectId: id, name, role, background,
        motivation: motivation || null,
        speechStyle: speechStyle || null,
        physicalDescription: physicalDescription || null,
        psychologicalTraits: psychologicalTraits || null,
        age: age || null,
      });
      res.status(201).json(character);
    } catch (error) {
      console.error("Error adding character:", error);
      res.status(500).json({ error: "فشل في إضافة الشخصية" });
    }
  });

  app.patch("/api/projects/:projectId/chapters/:chapterId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseIntParam(req.params.projectId);
      const chapterId = parseIntParam(req.params.chapterId);
      if (projectId === null || chapterId === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "غير مصرّح بالوصول" });

      const chapter = await storage.getChapter(chapterId);
      if (!chapter || chapter.projectId !== projectId) return res.status(404).json({ error: "الفصل غير موجود" });

      const { content } = req.body;
      if (typeof content !== "string") return res.status(400).json({ error: "المحتوى مطلوب" });

      const oldWordCount = chapter.content ? chapter.content.split(/\s+/).filter((w: string) => w.length > 0).length : 0;
      const newWordCount = content.split(/\s+/).filter((w: string) => w.length > 0).length;
      const netWords = newWordCount - oldWordCount;

      if (chapter.content) {
        await storage.saveChapterVersion(chapterId, chapter.content, "before_edit");
      }
      const updated = await storage.updateChapter(chapterId, { content });
      await storage.saveChapterVersion(chapterId, content, "manual_edit");
      if (netWords !== 0) {
        await storage.incrementUsedWords(projectId, netWords);
      }

      updateWritingStreak(req.user.claims.sub).catch((e) => console.warn("Failed to update writing streak:", e));
      checkWordCountMilestones(projectId, req.user.claims.sub).catch((e) => console.warn("Failed to check milestones:", e));

      res.json(updated);
    } catch (error) {
      console.error("Error updating chapter:", error);
      res.status(500).json({ error: "فشل في تحديث الفصل" });
    }
  });

  app.get("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const mode = typeof req.query.mode === "string" ? req.query.mode : undefined;
      const rawProjectId = req.query.projectId ? parseInt(req.query.projectId as string, 10) : undefined;
      const projectId = rawProjectId !== undefined && isNaN(rawProjectId) ? undefined : rawProjectId;
      const convos = await storage.getConversationsByUser(userId, mode, projectId);
      res.json(convos);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.get("/api/conversations/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const conv = await storage.getConversation(id, userId);
      if (!conv) return res.status(404).json({ error: "المحادثة غير موجودة" });
      const msgs = await storage.getMessagesByConversation(id);
      res.json({ conversation: conv, messages: msgs });
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.delete("/api/conversations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const conv = await storage.getConversation(id, userId);
      if (!conv) return res.status(404).json({ error: "المحادثة غير موجودة" });
      await storage.deleteConversation(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.patch("/api/conversations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const { title } = req.body;
      if (!title || typeof title !== "string") return res.status(400).json({ error: "العنوان مطلوب" });
      const existing = await storage.getConversation(id, userId);
      if (!existing) return res.status(404).json({ error: "المحادثة غير موجودة" });
      const conv = await storage.updateConversationTitle(id, userId, title.substring(0, 200));
      res.json(conv);
    } catch (error) {
      console.error("Error updating conversation:", error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.post("/api/chat", isAuthenticated, async (req: any, res) => {
    try {
      if (await checkApiSuspension(req.user.claims.sub, res)) return;
      if (!(await checkAiRateLimit(req, res))) return;
      const userId = req.user.claims.sub;

      const parsed = chatMessageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: formatZodErrors(parsed.error) });
      }
      const { message, history } = parsed.data;
      const conversationId = typeof req.body.conversationId === "number" ? req.body.conversationId : null;

      let convId = conversationId;
      if (!convId) {
        const conv = await storage.createConversation({
          userId,
          title: message.substring(0, 100),
          mode: "general",
        });
        convId = conv.id;
      } else {
        const conv = await storage.getConversation(convId, userId);
        if (!conv) return res.status(404).json({ error: "المحادثة غير موجودة" });
        if (conv.mode !== "general") return res.status(400).json({ error: "هذه المحادثة لا تنتمي لهذا السياق" });
      }

      await storage.addMessage({ conversationId: convId, role: "user", content: message });

      const generalChat = await enhanceWithKnowledge(buildGeneralChatPrompt(message), "general");

      const aiMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: generalChat.system },
      ];

      if (history) {
        for (const msg of history.slice(-10)) {
          aiMessages.push({ role: msg.role, content: msg.content.substring(0, 2000) });
        }
      }

      aiMessages.push({ role: "user", content: generalChat.user });

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: aiMessages,
        max_completion_tokens: 2000,
        temperature: 0.7,
      });

      const reply = response.choices[0]?.message?.content || "عذراً، لم أتمكن من الرد.";

      await storage.addMessage({ conversationId: convId, role: "assistant", content: reply });

      res.json({ reply, conversationId: convId });

      dispatchWebhook({
        input: message,
        output: reply,
        category: "general",
        correction: null,
        timestamp: new Date().toISOString(),
        metadata: { session_id: `chat-${userId}`, language: "ar", word_count: countWords(reply) },
      });
    } catch (error) {
      console.error("Error in general chat:", error);
      res.status(500).json({ error: "فشل في الحصول على رد من أبو هاشم" });
    }
  });

  const SUPER_ADMIN_IDS = ["39706084", "e482facd-d157-4e97-ad91-af96b8ec8f49"];

  app.post("/api/me/social-marketing-chat", isAuthenticated, async (req: any, res) => {
    try {
      if (!(await checkAiRateLimit(req, res))) return;
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) return res.status(401).json({ error: "غير مصادق" });
      const paidPlans = ["essay", "scenario", "all_in_one"];
      const hasPaid = paidPlans.includes(currentUser.plan || "") || currentUser.trialActive || currentUser.role === "admin";
      if (!hasPaid) return res.status(403).json({ error: "هذه الميزة متاحة للمشتركين فقط" });

      const { message, history = [] } = req.body;
      if (!message || typeof message !== "string" || !message.trim()) {
        return res.status(400).json({ error: "الرسالة مطلوبة" });
      }
      const authorName = currentUser.displayName || `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() || "الكاتب";
      const { system, user: userMsg, history: hist } = buildAuthorSocialMarketingPrompt(message.trim(), authorName, history);

      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: system },
      ];
      for (const msg of hist.slice(-14)) {
        messages.push({ role: msg.role, content: msg.content.substring(0, 3000) });
      }
      messages.push({ role: "user", content: userMsg });

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages,
        max_completion_tokens: 3000,
        temperature: 0.85,
      });

      const reply = response.choices[0]?.message?.content || "عذراً، لم أتمكن من الرد.";
      res.json({ reply });
    } catch (error) {
      console.error("Error in author social marketing chat:", error);
      res.status(500).json({ error: "فشل في الحصول على رد" });
    }
  });

  app.post("/api/admin/marketing-chat", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const adminUser = await storage.getUser(userId);
      if (!SUPER_ADMIN_IDS.includes(userId) && adminUser?.role !== "admin") {
        return res.status(403).json({ error: "غير مصرّح" });
      }

      const { message, history = [] } = req.body;
      if (!message || typeof message !== "string" || !message.trim()) {
        return res.status(400).json({ error: "الرسالة مطلوبة" });
      }

      const { system, user: userMsg, history: hist } = buildMarketingChatPrompt(message.trim(), history);

      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: system },
      ];

      for (const msg of hist.slice(-14)) {
        messages.push({ role: msg.role, content: msg.content.substring(0, 3000) });
      }
      messages.push({ role: "user", content: userMsg });

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages,
        max_completion_tokens: 3000,
        temperature: 0.85,
      });

      const reply = response.choices[0]?.message?.content || "عذراً، لم أتمكن من الرد.";
      res.json({ reply });
    } catch (error) {
      console.error("Error in marketing chat:", error);
      res.status(500).json({ error: "فشل في الحصول على رد من نموذج التسويق" });
    }
  });

  app.post("/api/projects/:id/chat", isAuthenticated, async (req: any, res) => {
    try {
      if (await checkApiSuspension(req.user.claims.sub, res)) return;
      if (!(await checkAiRateLimit(req, res))) return;
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const project = await storage.getProjectWithDetails(id);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "غير مصرح" });

      const { message, history } = req.body;
      if (!message || typeof message !== "string") return res.status(400).json({ error: "الرسالة مطلوبة" });

      const characters = await storage.getCharactersByProject(id);
      const projectChatEnhanced = await enhanceWithKnowledge(buildProjectChatPrompt({
        project,
        characters,
        chapters: project.chapters.map((ch: any) => ({
          chapterNumber: ch.chapterNumber,
          title: ch.title,
          content: ch.content,
          status: ch.status,
        })),
        userMessage: message,
      }), project.projectType || "general");

      const aiMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: projectChatEnhanced.system },
      ];

      if (Array.isArray(history)) {
        for (const msg of history.slice(-10)) {
          aiMessages.push({ role: msg.role, content: (msg.content || "").substring(0, 2000) });
        }
      }

      aiMessages.push({ role: "user", content: projectChatEnhanced.user });

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: aiMessages,
        max_completion_tokens: 2000,
        temperature: 0.7,
      });

      const reply = response.choices[0]?.message?.content || "عذراً، لم أتمكن من الرد.";
      res.json({ reply });

      dispatchWebhook({
        input: message,
        output: reply,
        category: mapProjectTypeToCategory(project.projectType),
        correction: null,
        timestamp: new Date().toISOString(),
        metadata: { session_id: `project-${id}`, language: "ar", word_count: countWords(reply) },
      });
    } catch (error) {
      console.error("Error in project chat:", error);
      res.status(500).json({ error: "فشل في الحصول على رد من أبو هاشم" });
    }
  });

  app.post("/api/projects/:id/suggest-characters", isAuthenticated, async (req: any, res) => {
    try {
      if (await checkApiSuspension(req.user.claims.sub, res)) return;
      if (!(await checkAiRateLimit(req, res))) return;
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "غير مصرّح بالوصول" });

      const existingChars = await storage.getCharactersByProject(id);
      const { system, user } = buildCharacterSuggestionPrompt(project, existingChars);

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_completion_tokens: 4096,
      });
      logApiUsage(req.user.claims.sub, id, "character_suggestion", "gpt-5.2", response);

      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return res.status(500).json({ error: "فشل في اقتراح الشخصيات" });

      let suggestions;
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(parsed)) throw new Error("Not an array");
        suggestions = parsed
          .filter((s: any) => s && typeof s.name === "string" && typeof s.role === "string" && typeof s.background === "string")
          .slice(0, 5)
          .map((s: any) => ({ name: String(s.name), role: String(s.role), background: String(s.background), traits: s.traits || "" }));
      } catch {
        return res.status(500).json({ error: "فشل في اقتراح الشخصيات" });
      }

      res.json(suggestions);
    } catch (error) {
      console.error("Error suggesting characters:", error);
      res.status(500).json({ error: "فشل في اقتراح الشخصيات" });
    }
  });

  app.post("/api/projects/:id/generate-cover", isAuthenticated, async (req: any, res) => {
    try {
      if (await checkApiSuspension(req.user.claims.sub, res)) return;
      if (!(await checkAiRateLimit(req, res))) return;
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "غير مصرّح بالوصول" });

      const coverUser = await storage.getUser(req.user.claims.sub);
      if (coverUser?.plan === "trial" && coverUser.trialActive) {
        if (isTrialExpired(coverUser.trialEndsAt)) {
          return res.status(403).json({ error: "انتهت الفترة التجريبية" });
        }
        if (project.coverImageUrl) {
          return res.status(403).json({ error: `الفترة التجريبية تسمح بتصميم غلاف واحد فقط` });
        }
      }

      const prompt = buildCoverPrompt(project);

      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt,
        size: "1024x1024",
      });
      logImageUsage(req.user.claims.sub, id, "cover_image");

      const base64 = response.data[0]?.b64_json;
      if (!base64) return res.status(500).json({ error: "فشل في إنشاء الغلاف" });

      const compositedBase64 = await overlayTitleOnCover(base64, project.title);
      const coverImageUrl = `data:image/png;base64,${compositedBase64}`;
      await storage.updateProject(id, { coverImageUrl });
      res.json({ coverImageUrl });
    } catch (error) {
      console.error("Error generating cover:", error);
      res.status(500).json({ error: "فشل في إنشاء الغلاف" });
    }
  });


  app.get("/api/projects/:id/export/pdf", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const exportUser = await storage.getUser(req.user.claims.sub);
      if (exportUser?.plan === "trial") {
        return res.status(403).json({ error: "التصدير غير متاح في الفترة التجريبية. يرجى الترقية إلى خطة مدفوعة." });
      }

      const project = await storage.getProjectWithDetails(id);
      if (!project || project.userId !== req.user.claims.sub) {
        return res.status(404).json({ error: "المشروع غير موجود" });
      }

      const PDFDocument = (await import("pdfkit")).default;
      const path = await import("path");
      const fs = await import("fs");

      const fontPath = path.join(process.cwd(), "server", "fonts", "Amiri-Regular.ttf");
      const boldFontPath = path.join(process.cwd(), "server", "fonts", "Amiri-Bold.ttf");

      const pdfAuthorName = (exportUser as any)?.displayName || (exportUser as any)?.firstName || exportUser?.email?.split("@")[0] || "المؤلف";
      const isMemoire = project.projectType === "memoire";

      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 72, bottom: 72, left: 72, right: 72 },
        info: {
          Title: project.title,
          Author: pdfAuthorName,
        },
        autoFirstPage: false,
      });

      if (fs.existsSync(fontPath)) {
        doc.registerFont("Arabic", fontPath);
        doc.registerFont("ArabicBold", fs.existsSync(boldFontPath) ? boldFontPath : fontPath);
      }

      const fixBidi = (text: string): string => {
        return text.replace(/([a-zA-Z0-9](?:[a-zA-Z0-9\s\/\-\:\©\(\)\#\%\&\*\+\=\,\;\!\?\u2014]*[a-zA-Z0-9])?)/g, (match) => {
          if (match.includes("@") || /^https?/i.test(match) || /^www\./i.test(match)) return match;
          return match.split("").reverse().join("");
        });
      };

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(project.title)}.pdf"`);
      doc.pipe(res);

      const fullPageWidth = 595.28;
      const pageWidth = fullPageWidth - 144;
      const pageHeight = 841.89;
      const borderInnerTop = 48;
      const borderInnerBottom = pageHeight - 48;
      const contentMarginX = 72;
      const contentStartY = 90;
      const contentBottomLimit = borderInnerBottom - 50;
      const footerY = borderInnerBottom - 30;
      const continuationStartY = 90;

      const memoireFieldMap: Record<string, string> = {
        sciences: "العلوم الطبيعية والتطبيقية",
        humanities: "العلوم الإنسانية والاجتماعية",
        law: "القانون والعلوم القانونية",
        medicine: "الطب والعلوم الصحية",
        engineering: "الهندسة والتكنولوجيا",
        economics: "العلوم الاقتصادية والتجارية وعلوم التسيير",
        education: "علوم التربية والتعليم",
        literature: "الآداب واللغات",
        media: "الإعلام والاتصال",
        computer_science: "الإعلام الآلي وعلوم الحاسوب",
        islamic_studies: "العلوم الإسلامية والشريعة",
        political_science: "العلوم السياسية والعلاقات الدولية",
        psychology: "علم النفس",
        sociology: "علم الاجتماع",
        history: "التاريخ",
        philosophy: "الفلسفة",
        agriculture: "العلوم الزراعية",
        architecture: "الهندسة المعمارية والعمران",
      };

      const navyBlue = "#1B365D";
      const goldAccent = "#C4A265";
      const darkBrown = "#2C1810";
      const mutedBrown = "#6B5B4F";
      const lightGold = "#E8D5B5";

      const drawBorder = () => {
        doc.rect(30, 30, fullPageWidth - 60, pageHeight - 60)
          .lineWidth(2)
          .strokeColor(navyBlue)
          .stroke();
        doc.rect(36, 36, fullPageWidth - 72, pageHeight - 72)
          .lineWidth(0.5)
          .strokeColor(goldAccent)
          .stroke();
        doc.rect(33, 33, fullPageWidth - 66, pageHeight - 66)
          .lineWidth(0.3)
          .strokeColor(goldAccent)
          .dash(3, { space: 3 })
          .stroke();
        doc.undash();
      };

      const drawSimpleBorder = () => {
        doc.rect(36, 36, fullPageWidth - 72, pageHeight - 72)
          .lineWidth(1)
          .strokeColor(navyBlue)
          .stroke();
      };

      const drawPageFooter = (num: number | string) => {
        const numStr = typeof num === "string" ? num : String(num);
        doc.font("Arabic").fontSize(9).fillColor("#888");
        doc.text(fixBidi(`\u2014  ${numStr}  \u2014`), 0, footerY, { width: fullPageWidth, align: "center", lineBreak: false });
      };

      const drawRunningHeader = (leftText: string, rightText: string) => {
        doc.font("Arabic").fontSize(8).fillColor("#999");
        doc.text(fixBidi(rightText), contentMarginX, 52, { width: pageWidth, align: "right", features: ["rtla"], lineBreak: false });
        doc.text(fixBidi(leftText), contentMarginX, 52, { width: pageWidth, align: "left", features: ["rtla"], lineBreak: false });
        doc.moveTo(contentMarginX, 64).lineTo(fullPageWidth - contentMarginX, 64).lineWidth(0.3).strokeColor(goldAccent).stroke();
      };

      const drawPageHeader = (chapterTitle: string) => {
        drawRunningHeader(project.title, chapterTitle);
      };

      const drawOrnamentalDivider = (y: number, dividerWidth?: number) => {
        const centerX = fullPageWidth / 2;
        const dw = dividerWidth || 220;
        doc.moveTo(centerX - dw / 2, y).lineTo(centerX - 15, y).lineWidth(0.8).strokeColor(goldAccent).stroke();
        doc.moveTo(centerX + 15, y).lineTo(centerX + dw / 2, y).lineWidth(0.8).strokeColor(goldAccent).stroke();
        doc.font("Arabic").fontSize(14).fillColor(goldAccent);
        doc.text("\u2766", centerX - 7, y - 7, { width: 14, align: "center", lineBreak: false });
      };

      const drawHeavyDivider = (y: number) => {
        const centerX = fullPageWidth / 2;
        const dw = 300;
        doc.moveTo(centerX - dw / 2, y).lineTo(centerX + dw / 2, y).lineWidth(1.5).strokeColor(navyBlue).stroke();
        doc.moveTo(centerX - dw / 2 + 10, y + 3).lineTo(centerX + dw / 2 - 10, y + 3).lineWidth(0.4).strokeColor(goldAccent).stroke();
      };

      const drawCenteredArabic = (text: string, y: number, fontSize: number, color: string, bold?: boolean) => {
        const t = fixBidi(text);
        doc.font(bold ? "ArabicBold" : "Arabic").fontSize(fontSize).fillColor(color);
        const w = doc.widthOfString(t, { features: ["rtla"] });
        doc.text(t, (fullPageWidth - w) / 2, y, { width: w + 4, features: ["rtla"], lineBreak: false });
        return doc.heightOfString(t, { width: w + 4 }) + 4;
      };

      const drawCenteredMultiline = (text: string, y: number, fontSize: number, color: string, bold?: boolean) => {
        const t = fixBidi(text);
        doc.font(bold ? "ArabicBold" : "Arabic").fontSize(fontSize).fillColor(color);
        const h = doc.heightOfString(t, { width: pageWidth, align: "center", lineGap: 6 });
        doc.text(t, contentMarginX, y, { width: pageWidth, align: "center", features: ["rtla"], lineGap: 6 });
        return h + 4;
      };

      const drawDecorativeBox = (x: number, y: number, w: number, h: number) => {
        doc.rect(x, y, w, h).lineWidth(1.5).strokeColor(navyBlue).stroke();
        doc.rect(x + 3, y + 3, w - 6, h - 6).lineWidth(0.5).strokeColor(goldAccent).stroke();
      };

      const drawDottedLeader = (fromX: number, toX: number, y: number) => {
        doc.save();
        doc.font("Arabic").fontSize(9).fillColor("#bbb");
        let x = fromX + 3;
        while (x < toX - 8) {
          doc.text(".", x, y + 1, { width: 4, lineBreak: false });
          x += 5;
        }
        doc.restore();
      };

      const toRoman = (num: number): string => {
        const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
        const syms = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];
        let result = "";
        for (let i = 0; i < vals.length; i++) {
          while (num >= vals[i]) { result += syms[i]; num -= vals[i]; }
        }
        return result;
      };

      const getCountryHeader = (code: string): { republic: string; ministry: string } => {
        const map: Record<string, { republic: string; ministry: string }> = {
          dz: { republic: "\u0627\u0644\u062C\u0645\u0647\u0648\u0631\u064A\u0629 \u0627\u0644\u062C\u0632\u0627\u0626\u0631\u064A\u0629 \u0627\u0644\u062F\u064A\u0645\u0642\u0631\u0627\u0637\u064A\u0629 \u0627\u0644\u0634\u0639\u0628\u064A\u0629", ministry: "\u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0639\u0627\u0644\u064A \u0648\u0627\u0644\u0628\u062D\u062B \u0627\u0644\u0639\u0644\u0645\u064A" },
          ma: { republic: "\u0627\u0644\u0645\u0645\u0644\u0643\u0629 \u0627\u0644\u0645\u063A\u0631\u0628\u064A\u0629", ministry: "\u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0639\u0627\u0644\u064A \u0648\u0627\u0644\u0628\u062D\u062B \u0627\u0644\u0639\u0644\u0645\u064A \u0648\u0627\u0644\u0627\u0628\u062A\u0643\u0627\u0631" },
          tn: { republic: "\u0627\u0644\u062C\u0645\u0647\u0648\u0631\u064A\u0629 \u0627\u0644\u062A\u0648\u0646\u0633\u064A\u0629", ministry: "\u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0639\u0627\u0644\u064A \u0648\u0627\u0644\u0628\u062D\u062B \u0627\u0644\u0639\u0644\u0645\u064A" },
          eg: { republic: "\u062C\u0645\u0647\u0648\u0631\u064A\u0629 \u0645\u0635\u0631 \u0627\u0644\u0639\u0631\u0628\u064A\u0629", ministry: "\u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0639\u0627\u0644\u064A \u0648\u0627\u0644\u0628\u062D\u062B \u0627\u0644\u0639\u0644\u0645\u064A" },
          sa: { republic: "\u0627\u0644\u0645\u0645\u0644\u0643\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629", ministry: "\u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062A\u0639\u0644\u064A\u0645" },
          iq: { republic: "\u062C\u0645\u0647\u0648\u0631\u064A\u0629 \u0627\u0644\u0639\u0631\u0627\u0642", ministry: "\u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0639\u0627\u0644\u064A \u0648\u0627\u0644\u0628\u062D\u062B \u0627\u0644\u0639\u0644\u0645\u064A" },
          sy: { republic: "\u0627\u0644\u062C\u0645\u0647\u0648\u0631\u064A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0627\u0644\u0633\u0648\u0631\u064A\u0629", ministry: "\u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0639\u0627\u0644\u064A \u0648\u0627\u0644\u0628\u062D\u062B \u0627\u0644\u0639\u0644\u0645\u064A" },
          jo: { republic: "\u0627\u0644\u0645\u0645\u0644\u0643\u0629 \u0627\u0644\u0623\u0631\u062F\u0646\u064A\u0629 \u0627\u0644\u0647\u0627\u0634\u0645\u064A\u0629", ministry: "\u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0639\u0627\u0644\u064A \u0648\u0627\u0644\u0628\u062D\u062B \u0627\u0644\u0639\u0644\u0645\u064A" },
          lb: { republic: "\u0627\u0644\u062C\u0645\u0647\u0648\u0631\u064A\u0629 \u0627\u0644\u0644\u0628\u0646\u0627\u0646\u064A\u0629", ministry: "\u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062A\u0631\u0628\u064A\u0629 \u0648\u0627\u0644\u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0639\u0627\u0644\u064A" },
          ps: { republic: "\u062F\u0648\u0644\u0629 \u0641\u0644\u0633\u0637\u064A\u0646", ministry: "\u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0639\u0627\u0644\u064A \u0648\u0627\u0644\u0628\u062D\u062B \u0627\u0644\u0639\u0644\u0645\u064A" },
          ly: { republic: "\u062F\u0648\u0644\u0629 \u0644\u064A\u0628\u064A\u0627", ministry: "\u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0639\u0627\u0644\u064A \u0648\u0627\u0644\u0628\u062D\u062B \u0627\u0644\u0639\u0644\u0645\u064A" },
          ye: { republic: "\u0627\u0644\u062C\u0645\u0647\u0648\u0631\u064A\u0629 \u0627\u0644\u064A\u0645\u0646\u064A\u0629", ministry: "\u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0639\u0627\u0644\u064A \u0648\u0627\u0644\u0628\u062D\u062B \u0627\u0644\u0639\u0644\u0645\u064A" },
          ae: { republic: "\u0627\u0644\u0625\u0645\u0627\u0631\u0627\u062A \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0627\u0644\u0645\u062A\u062D\u062F\u0629", ministry: "\u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062A\u0631\u0628\u064A\u0629 \u0648\u0627\u0644\u062A\u0639\u0644\u064A\u0645" },
          kw: { republic: "\u062F\u0648\u0644\u0629 \u0627\u0644\u0643\u0648\u064A\u062A", ministry: "\u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0639\u0627\u0644\u064A" },
          bh: { republic: "\u0645\u0645\u0644\u0643\u0629 \u0627\u0644\u0628\u062D\u0631\u064A\u0646", ministry: "\u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062A\u0631\u0628\u064A\u0629 \u0648\u0627\u0644\u062A\u0639\u0644\u064A\u0645" },
          qa: { republic: "\u062F\u0648\u0644\u0629 \u0642\u0637\u0631", ministry: "\u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062A\u0631\u0628\u064A\u0629 \u0648\u0627\u0644\u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0639\u0627\u0644\u064A" },
          sd: { republic: "\u062C\u0645\u0647\u0648\u0631\u064A\u0629 \u0627\u0644\u0633\u0648\u062F\u0627\u0646", ministry: "\u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0639\u0627\u0644\u064A \u0648\u0627\u0644\u0628\u062D\u062B \u0627\u0644\u0639\u0644\u0645\u064A" },
          om: { republic: "\u0633\u0644\u0637\u0646\u0629 \u0639\u064F\u0645\u0627\u0646", ministry: "\u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0639\u0627\u0644\u064A \u0648\u0627\u0644\u0628\u062D\u062B \u0627\u0644\u0639\u0644\u0645\u064A \u0648\u0627\u0644\u0627\u0628\u062A\u0643\u0627\u0631" },
          mr: { republic: "\u0627\u0644\u062C\u0645\u0647\u0648\u0631\u064A\u0629 \u0627\u0644\u0625\u0633\u0644\u0627\u0645\u064A\u0629 \u0627\u0644\u0645\u0648\u0631\u064A\u062A\u0627\u0646\u064A\u0629", ministry: "\u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0639\u0627\u0644\u064A \u0648\u0627\u0644\u0628\u062D\u062B \u0627\u0644\u0639\u0644\u0645\u064A" },
          so: { republic: "\u062C\u0645\u0647\u0648\u0631\u064A\u0629 \u0627\u0644\u0635\u0648\u0645\u0627\u0644", ministry: "\u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0639\u0627\u0644\u064A" },
          dj: { republic: "\u062C\u0645\u0647\u0648\u0631\u064A\u0629 \u062C\u064A\u0628\u0648\u062A\u064A", ministry: "\u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0639\u0627\u0644\u064A \u0648\u0627\u0644\u0628\u062D\u062B" },
          km: { republic: "\u0627\u062A\u062D\u0627\u062F \u062C\u0632\u0631 \u0627\u0644\u0642\u0645\u0631", ministry: "\u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062A\u0631\u0628\u064A\u0629 \u0627\u0644\u0648\u0637\u0646\u064A\u0629" },
        };
        return map[code.toLowerCase()] || { republic: "", ministry: "" };
      };

      doc.addPage();

      let coverRendered = false;
      const coverToken = typeof req.query.coverToken === "string" ? req.query.coverToken.trim() : "";
      const coverImageUrlParam = typeof req.query.coverImageUrl === "string" ? req.query.coverImageUrl.trim() : "";
      if (coverToken && pdfCoverStore.has(coverToken)) {
        const stored = pdfCoverStore.get(coverToken)!;
        if (stored.userId === req.user.claims.sub) {
          try {
            doc.image(stored.buffer, 0, 0, { width: fullPageWidth, height: pageHeight });
            coverRendered = true;
          } catch (e) {
            console.error("Failed to render custom cover from token:", e);
          }
          pdfCoverStore.delete(coverToken);
        }
      }
      if (!coverRendered && coverImageUrlParam) {
        try {
          const coverUrl = new URL(coverImageUrlParam);
          if (["http:", "https:"].includes(coverUrl.protocol)) {
            const hn = coverUrl.hostname.toLowerCase();
            const blockedHost = hn === "localhost" || hn === "127.0.0.1" || hn === "0.0.0.0" || hn.startsWith("10.") || hn.startsWith("172.") || hn.startsWith("192.168.") || hn === "[::1]" || hn.endsWith(".internal") || hn === "metadata.google.internal" || hn.startsWith("169.254.");
            if (!blockedHost) {
              const dns = await import("dns");
              const { promisify } = await import("util");
              const dnsResolve = promisify(dns.resolve);
              let dnsOk = true;
              try {
                const addrs = await dnsResolve(hn);
                dnsOk = !addrs.some((addr: string) => {
                  const p = addr.split(".").map(Number);
                  return addr === "127.0.0.1" || addr === "0.0.0.0" || p[0] === 10 || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) || (p[0] === 192 && p[1] === 168) || p[0] === 0 || addr.startsWith("169.254.") || addr === "::1" || addr.startsWith("fc") || addr.startsWith("fd") || addr.startsWith("fe80");
                });
              } catch { dnsOk = false; }
              if (dnsOk) {
                const coverRes = await fetch(coverImageUrlParam, { signal: AbortSignal.timeout(10000), redirect: "error" });
                if (coverRes.ok) {
                  const ct = coverRes.headers.get("content-type") || "";
                  if (ct.startsWith("image/")) {
                    const buf = Buffer.from(await coverRes.arrayBuffer());
                    if (buf.length <= 5 * 1024 * 1024) {
                      doc.image(buf, 0, 0, { width: fullPageWidth, height: pageHeight });
                      coverRendered = true;
                    }
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error("Failed to load coverImageUrl param:", e);
        }
      }
      if (!coverRendered && project.coverImageUrl) {
        try {
          const response = await fetch(project.coverImageUrl);
          if (response.ok) {
            const buffer = Buffer.from(await response.arrayBuffer());
            doc.image(buffer, 0, 0, { width: fullPageWidth, height: pageHeight });
            coverRendered = true;
          }
        } catch (e) {
          console.error("Failed to load cover image for PDF:", e);
        }
      }

      if (!coverRendered) {
        drawBorder();
        doc.font("ArabicBold").fontSize(28).fillColor(darkBrown);
        const coverTitleH = doc.heightOfString(project.title, { width: pageWidth, align: "center" });
        const coverTitleY = Math.max(300, 380 - coverTitleH / 2);
        doc.text(fixBidi(project.title), contentMarginX, coverTitleY, {
          width: pageWidth,
          align: "center",
          features: ["rtla"],
        });

        doc.font("Arabic").fontSize(14).fillColor(mutedBrown);
        const coverSubY = coverTitleY + coverTitleH + 30;
        drawCenteredArabic(`\u062A\u0623\u0644\u064A\u0641 ${pdfAuthorName}`, coverSubY, 14, mutedBrown);
      }

      let frontMatterPageNum = 0;

      if (isMemoire) {
        const memoireFieldAr = memoireFieldMap[(project as any).memoireField || ""] || (project as any).memoireField || "";
        const memoireUniv = (project as any).memoireUniversity || "";
        const memoireFac = (project as any).memoireFaculty || "";
        const memoireDept = (project as any).memoireDepartment || "";
        const memoireCountryCode = (project as any).memoireCountry || "";
        const memoireMethodology = (project as any).memoireMethodology || "";
        const memoireCitation = (project as any).memoireCitationStyle || "";
        const memoireKeywords = ((project as any).memoireKeywords || "").trim();
        const memoireHypotheses = ((project as any).memoireHypotheses || "").trim();
        const currentYear = new Date().getFullYear();
        const academicYear = `${currentYear - 1} / ${currentYear}`;
        const pdfDegreeLevel = (project as any).memoireDegreeLevel || "licence";
        const pdfDegreeLevelMap: Record<string, string> = { licence: "\u0644\u064A\u0633\u0627\u0646\u0633", master: "\u0645\u0627\u0633\u062A\u0631", doctorate: "\u062F\u0643\u062A\u0648\u0631\u0627\u0647" };
        const pdfDegreeLabelMap: Record<string, string> = { licence: "\u0634\u0647\u0627\u062F\u0629 \u0627\u0644\u0644\u064A\u0633\u0627\u0646\u0633", master: "\u0634\u0647\u0627\u062F\u0629 \u0627\u0644\u0645\u0627\u0633\u062A\u0631", doctorate: "\u0634\u0647\u0627\u062F\u0629 \u0627\u0644\u062F\u0643\u062A\u0648\u0631\u0627\u0647" };
        const degreeName = pdfDegreeLevelMap[pdfDegreeLevel] || pdfDegreeLevel;
        const degreeLabel = pdfDegreeLabelMap[pdfDegreeLevel] || `\u0634\u0647\u0627\u062F\u0629 ${pdfDegreeLevel}`;
        const methodologyMap: Record<string, string> = {
          descriptive: "\u0627\u0644\u0645\u0646\u0647\u062C \u0627\u0644\u0648\u0635\u0641\u064A",
          analytical: "\u0627\u0644\u0645\u0646\u0647\u062C \u0627\u0644\u062A\u062D\u0644\u064A\u0644\u064A",
          experimental: "\u0627\u0644\u0645\u0646\u0647\u062C \u0627\u0644\u062A\u062C\u0631\u064A\u0628\u064A",
          historical: "\u0627\u0644\u0645\u0646\u0647\u062C \u0627\u0644\u062A\u0627\u0631\u064A\u062E\u064A",
          comparative: "\u0627\u0644\u0645\u0646\u0647\u062C \u0627\u0644\u0645\u0642\u0627\u0631\u0646",
          survey: "\u0627\u0644\u0645\u0646\u0647\u062C \u0627\u0644\u0645\u0633\u062D\u064A",
          case_study: "\u062F\u0631\u0627\u0633\u0629 \u062D\u0627\u0644\u0629",
          inductive: "\u0627\u0644\u0645\u0646\u0647\u062C \u0627\u0644\u0627\u0633\u062A\u0642\u0631\u0627\u0626\u064A",
          deductive: "\u0627\u0644\u0645\u0646\u0647\u062C \u0627\u0644\u0627\u0633\u062A\u0646\u0628\u0627\u0637\u064A",
          mixed: "\u0645\u0646\u0647\u062C \u0645\u062E\u062A\u0644\u0637",
          qualitative: "\u0627\u0644\u0645\u0646\u0647\u062C \u0627\u0644\u0646\u0648\u0639\u064A",
          quantitative: "\u0627\u0644\u0645\u0646\u0647\u062C \u0627\u0644\u0643\u0645\u0651\u064A",
        };
        const pdfCitationMap: Record<string, string> = { apa: "APA", mla: "MLA", chicago: "\u0634\u064A\u0643\u0627\u063A\u0648", harvard: "\u0647\u0627\u0631\u0641\u0627\u0631\u062F", ieee: "IEEE", iso690: "ISO 690", islamic: "\u0627\u0644\u062A\u0648\u062B\u064A\u0642 \u0627\u0644\u0625\u0633\u0644\u0627\u0645\u064A", university_specific: "\u062D\u0633\u0628 \u0646\u0638\u0627\u0645 \u0627\u0644\u062C\u0627\u0645\u0639\u0629", custom_arabic: "\u0627\u0644\u062D\u0648\u0627\u0634\u064A \u0627\u0644\u0633\u0641\u0644\u064A\u0629" };
        const methodAr = methodologyMap[memoireMethodology] || memoireMethodology || "";
        const citationAr = pdfCitationMap[memoireCitation] || memoireCitation || "";
        const countryHeader = getCountryHeader(memoireCountryCode);

        doc.addPage();
        drawBorder();
        let metaY = 65;

        if (countryHeader.republic) {
          metaY += drawCenteredArabic(countryHeader.republic, metaY, 13, navyBlue, true);
          metaY += 2;
        }
        if (countryHeader.ministry) {
          metaY += drawCenteredArabic(countryHeader.ministry, metaY, 11, mutedBrown);
          metaY += 8;
        }
        drawHeavyDivider(metaY);
        metaY += 14;

        if (memoireUniv) {
          metaY += drawCenteredArabic(memoireUniv, metaY, 17, navyBlue, true);
          metaY += 4;
        }
        if (memoireFac) {
          metaY += drawCenteredArabic(memoireFac, metaY, 13, mutedBrown);
          metaY += 2;
        }
        if (memoireDept) {
          metaY += drawCenteredArabic(memoireDept, metaY, 12, "#888");
          metaY += 2;
        }

        metaY += 10;
        drawOrnamentalDivider(metaY, 280);
        metaY += 18;

        metaY += drawCenteredArabic(`\u0645\u0630\u0643\u0631\u0629 \u0645\u0642\u062F\u0645\u0629 \u0644\u0646\u064A\u0644 ${degreeLabel}`, metaY, 14, mutedBrown);
        metaY += 4;
        if (memoireFieldAr) {
          metaY += drawCenteredArabic(`\u0641\u064A \u062A\u062E\u0635\u0635: ${memoireFieldAr}`, metaY, 13, mutedBrown);
          metaY += 8;
        }

        const titleBoxPadding = 15;
        doc.font("ArabicBold").fontSize(22).fillColor(navyBlue);
        const titleH = doc.heightOfString(project.title, { width: pageWidth - 60, align: "center" });
        const titleBoxH = titleH + titleBoxPadding * 2;
        const titleBoxX = 60;
        const titleBoxW = fullPageWidth - 120;
        drawDecorativeBox(titleBoxX, metaY, titleBoxW, titleBoxH);
        doc.font("ArabicBold").fontSize(22).fillColor(navyBlue);
        doc.text(fixBidi(project.title), titleBoxX + 20, metaY + titleBoxPadding, { width: titleBoxW - 40, align: "center", features: ["rtla"] });
        metaY += titleBoxH + 18;

        drawOrnamentalDivider(metaY, 280);
        metaY += 22;

        if (methodAr) {
          metaY += drawCenteredArabic(`\u0627\u0644\u0645\u0646\u0647\u062C \u0627\u0644\u0645\u062A\u0628\u0639: ${methodAr}`, metaY, 12, mutedBrown);
          metaY += 4;
        }
        if (citationAr) {
          metaY += drawCenteredArabic(`\u0646\u0638\u0627\u0645 \u0627\u0644\u062A\u0648\u062B\u064A\u0642: ${citationAr}`, metaY, 12, mutedBrown);
          metaY += 10;
        }

        metaY += drawCenteredArabic(`\u0625\u0639\u062F\u0627\u062F \u0627\u0644\u0637\u0627\u0644\u0628(\u0629): ${pdfAuthorName}`, metaY, 14, darkBrown, true);
        metaY += 20;

        const bottomSection = Math.max(metaY, pageHeight - 160);
        drawHeavyDivider(bottomSection);
        drawCenteredArabic(`\u0627\u0644\u0633\u0646\u0629 \u0627\u0644\u062C\u0627\u0645\u0639\u064A\u0629: ${academicYear}`, bottomSection + 14, 13, navyBlue, true);

        doc.font("Arabic").fontSize(9).fillColor("#aaa");
        const rightsAcademic = fixBidi(`\u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0642\u0648\u0642 \u0645\u062D\u0641\u0648\u0638\u0629 \u00A9 ${currentYear} ${pdfAuthorName} \u2014 QalamAI`);
        const rightsW = doc.widthOfString(rightsAcademic, { features: ["rtla"] });
        doc.text(rightsAcademic, (fullPageWidth - rightsW) / 2, pageHeight - 65, { width: rightsW + 4, features: ["rtla"], lineBreak: false });

        doc.addPage();
        drawBorder();
        const bismCenterY = pageHeight / 2 - 50;
        drawOrnamentalDivider(bismCenterY - 40, 250);
        doc.font("ArabicBold").fontSize(42).fillColor(navyBlue);
        const bismillah = "\uFDFD";
        const bismW = doc.widthOfString(bismillah);
        doc.text(bismillah, (fullPageWidth - bismW) / 2, bismCenterY, { width: bismW + 4, lineBreak: false });
        drawCenteredArabic("\u0628\u0633\u0645 \u0627\u0644\u0644\u0647 \u0627\u0644\u0631\u062D\u0645\u0646 \u0627\u0644\u0631\u062D\u064A\u0645", bismCenterY + 65, 16, goldAccent, true);
        drawOrnamentalDivider(bismCenterY + 100, 250);
        frontMatterPageNum++;
        drawPageFooter(toRoman(frontMatterPageNum));

        doc.addPage();
        drawSimpleBorder();
        frontMatterPageNum++;
        const dedY = pageHeight / 2 - 60;
        drawOrnamentalDivider(dedY - 30, 200);
        drawCenteredArabic("\u0627\u0644\u0625\u0647\u062F\u0627\u0621", dedY, 24, navyBlue, true);
        drawOrnamentalDivider(dedY + 35, 200);
        drawCenteredArabic("\u0625\u0644\u0649 \u0643\u0644 \u0645\u0646 \u0633\u0627\u0647\u0645 \u0641\u064A \u0625\u062A\u0645\u0627\u0645 \u0647\u0630\u0627 \u0627\u0644\u0639\u0645\u0644...", dedY + 65, 14, mutedBrown);
        drawCenteredArabic("\u0625\u0644\u0649 \u0648\u0627\u0644\u062F\u064A\u0651 \u0627\u0644\u0643\u0631\u064A\u0645\u064A\u0646 \u0648\u0623\u0633\u0627\u062A\u0630\u062A\u064A \u0627\u0644\u0623\u0641\u0627\u0636\u0644...", dedY + 95, 14, mutedBrown);
        drawCenteredArabic("\u0625\u0644\u0649 \u0643\u0644 \u0637\u0627\u0644\u0628 \u0639\u0644\u0645 \u064A\u0633\u0639\u0649 \u0644\u0644\u0645\u0639\u0631\u0641\u0629...", dedY + 125, 14, mutedBrown);
        drawPageFooter(toRoman(frontMatterPageNum));

        doc.addPage();
        drawSimpleBorder();
        frontMatterPageNum++;
        let ackY = contentStartY;
        drawCenteredArabic("\u0627\u0644\u0634\u0643\u0631 \u0648\u0627\u0644\u062A\u0642\u062F\u064A\u0631", ackY, 22, navyBlue, true);
        ackY += 35;
        drawHeavyDivider(ackY);
        ackY += 25;
        const ackText = `\u0627\u0644\u062D\u0645\u062F \u0644\u0644\u0647 \u0631\u0628 \u0627\u0644\u0639\u0627\u0644\u0645\u064A\u0646 \u0627\u0644\u0630\u064A \u0623\u0639\u0627\u0646\u0646\u0627 \u0639\u0644\u0649 \u0625\u062A\u0645\u0627\u0645 \u0647\u0630\u0627 \u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u0645\u062A\u0648\u0627\u0636\u0639\u060C \u0648\u0627\u0644\u0635\u0644\u0627\u0629 \u0648\u0627\u0644\u0633\u0644\u0627\u0645 \u0639\u0644\u0649 \u0623\u0634\u0631\u0641 \u0627\u0644\u0645\u0631\u0633\u0644\u064A\u0646.\n\n\u0646\u062A\u0642\u062F\u0645 \u0628\u062C\u0632\u064A\u0644 \u0627\u0644\u0634\u0643\u0631 \u0648\u0627\u0644\u0639\u0631\u0641\u0627\u0646 \u0625\u0644\u0649 \u0643\u0644 \u0645\u0646 \u0633\u0627\u0647\u0645 \u0641\u064A \u0625\u0646\u062C\u0627\u0632 \u0647\u0630\u0627 \u0627\u0644\u0628\u062D\u062B\u060C \u0648\u0646\u062E\u0635 \u0628\u0627\u0644\u0630\u0643\u0631 \u0623\u0633\u0627\u062A\u0630\u062A\u0646\u0627 \u0627\u0644\u0643\u0631\u0627\u0645 \u0627\u0644\u0630\u064A\u0646 \u0644\u0645 \u064A\u0628\u062E\u0644\u0648\u0627 \u0639\u0644\u064A\u0646\u0627 \u0628\u062A\u0648\u062C\u064A\u0647\u0627\u062A\u0647\u0645 \u0627\u0644\u0633\u062F\u064A\u062F\u0629 \u0648\u0646\u0635\u0627\u0626\u062D\u0647\u0645 \u0627\u0644\u0642\u064A\u0651\u0645\u0629.\n\n\u0643\u0645\u0627 \u0646\u0634\u0643\u0631 ${memoireUniv || "\u062C\u0627\u0645\u0639\u062A\u0646\u0627"} \u0639\u0644\u0649 \u062A\u0648\u0641\u064A\u0631 \u0627\u0644\u0628\u064A\u0626\u0629 \u0627\u0644\u0639\u0644\u0645\u064A\u0629 \u0627\u0644\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0625\u0646\u062C\u0627\u0632 \u0647\u0630\u0627 \u0627\u0644\u0639\u0645\u0644.`;
        const ackParas = ackText.split(/\n+/).filter(Boolean);
        for (const p of ackParas) {
          doc.font("Arabic").fontSize(13).fillColor("#333");
          const h = doc.heightOfString(fixBidi(p.trim()), { width: pageWidth - 40, align: "right", lineGap: 10 });
          doc.text(fixBidi(p.trim()), contentMarginX + 20, ackY, { width: pageWidth - 40, align: "right", features: ["rtla"], lineGap: 10 });
          ackY += h + 14;
        }
        drawPageFooter(toRoman(frontMatterPageNum));

        doc.addPage();
        drawSimpleBorder();
        frontMatterPageNum++;
        let absY = contentStartY;
        drawCenteredArabic("\u0645\u0644\u062E\u0635 \u0627\u0644\u0628\u062D\u062B", absY, 22, navyBlue, true);
        absY += 35;
        drawHeavyDivider(absY);
        absY += 25;
        if (project.mainIdea) {
          absY += drawCenteredMultiline(project.mainIdea, absY, 13, "#333");
          absY += 15;
        }
        if (memoireKeywords) {
          drawOrnamentalDivider(absY, 180);
          absY += 20;
          drawCenteredArabic("\u0627\u0644\u0643\u0644\u0645\u0627\u062A \u0627\u0644\u0645\u0641\u062A\u0627\u062D\u064A\u0629:", absY, 13, navyBlue, true);
          absY += 22;
          drawCenteredArabic(memoireKeywords, absY, 12, mutedBrown);
          absY += 20;
        }
        drawPageFooter(toRoman(frontMatterPageNum));

        const parsedKeywords = memoireKeywords ? memoireKeywords.split(/[,\u060C\n]+/).map((k: string) => k.trim()).filter(Boolean) : [];
        if (parsedKeywords.length > 0) {
          doc.addPage();
          drawSimpleBorder();
          frontMatterPageNum++;
          drawCenteredArabic("\u0627\u0644\u0643\u0644\u0645\u0627\u062A \u0627\u0644\u0645\u0641\u062A\u0627\u062D\u064A\u0629", contentStartY, 22, navyBlue, true);
          let kwDivY = contentStartY + 35;
          drawHeavyDivider(kwDivY);
          let kwY = kwDivY + 20;
          for (const kw of parsedKeywords) {
            doc.font("Arabic").fontSize(13).fillColor("#333");
            const kwText = `\u25C6  ${kw}`;
            doc.text(fixBidi(kwText), contentMarginX + 20, kwY, { width: pageWidth - 40, align: "right", features: ["rtla"] });
            kwY += 28;
          }
          drawPageFooter(toRoman(frontMatterPageNum));
        }

        const parsedHypotheses = memoireHypotheses ? memoireHypotheses.split(/\n+/).map((h: string) => h.trim()).filter(Boolean) : [];
        if (parsedHypotheses.length > 0) {
          doc.addPage();
          drawSimpleBorder();
          frontMatterPageNum++;
          drawCenteredArabic("\u0641\u0631\u0636\u064A\u0627\u062A \u0627\u0644\u0628\u062D\u062B", contentStartY, 22, navyBlue, true);
          let hyDivY = contentStartY + 35;
          drawHeavyDivider(hyDivY);
          let hyY = hyDivY + 20;
          for (let hi = 0; hi < parsedHypotheses.length; hi++) {
            if (hyY > contentBottomLimit - 30) {
              drawPageFooter(toRoman(frontMatterPageNum));
              doc.addPage();
              drawSimpleBorder();
              frontMatterPageNum++;
              hyY = contentStartY;
            }
            doc.font("Arabic").fontSize(13).fillColor("#333");
            const hyText = `${hi + 1}.  ${parsedHypotheses[hi]}`;
            const hyH = doc.heightOfString(fixBidi(hyText), { width: pageWidth - 40, features: ["rtla"], lineGap: 8 });
            doc.text(fixBidi(hyText), contentMarginX + 20, hyY, { width: pageWidth - 40, align: "right", features: ["rtla"], lineGap: 8 });
            hyY += hyH + 14;
          }
          drawPageFooter(toRoman(frontMatterPageNum));
        }

      } else {
        doc.addPage();
        drawBorder();

        doc.font("ArabicBold").fontSize(24).fillColor("#2C1810");
        const cpTitleH = doc.heightOfString(project.title, { width: pageWidth, align: "center" });
        const cpTitleY = Math.max(240, 300 - cpTitleH / 2);
        doc.text(fixBidi(project.title), contentMarginX, cpTitleY, { width: pageWidth, align: "center", features: ["rtla"] });

        const authLineY = cpTitleY + cpTitleH + 30;
        drawCenteredArabic(`تأليف ${pdfAuthorName}`, authLineY, 14, "#6B5B4F");
        drawCenteredArabic("بمساعدة أبو هاشم — QalamAI", authLineY + 28, 12, "#8B7355");

        const dateLine = new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "long" });
        drawCenteredArabic(dateLine, authLineY + 58, 12, "#8B7355");

        const currentYear = new Date().getFullYear();
        drawCenteredArabic(`جميع الحقوق محفوظة © ${currentYear} ${pdfAuthorName}`, authLineY + 100, 13, "#8B7355");
      }

      const chapterLabel = project.projectType === "essay" ? "القسم" : project.projectType === "scenario" ? "المشهد" : project.projectType === "short_story" ? "المقطع" : project.projectType === "khawater" ? "النص" : project.projectType === "social_media" ? "المحتوى" : project.projectType === "poetry" ? "القصيدة" : project.projectType === "memoire" ? "الفصل" : "الفصل";

      const chapters = (project.chapters || [])
        .filter((ch: any) => ch.content && ch.status === "completed")
        .sort((a: any, b: any) => a.chapterNumber - b.chapterNumber);

      const tocMinEntryHeight = 24;
      const tocEntrySpacing = 5;
      const tocFirstPageStartY = 145;
      const tocContPageStartY = contentStartY;
      const tocEntryWidth = pageWidth - 80;

      let tocPageCount = 1;
      let simTocY = tocFirstPageStartY;
      doc.font("Arabic").fontSize(13);
      const memoireFrontMatterEntries = isMemoire ? 6 : 0;
      for (let si = 0; si < memoireFrontMatterEntries; si++) {
        simTocY += tocMinEntryHeight + tocEntrySpacing;
        if (simTocY > contentBottomLimit) { tocPageCount++; simTocY = tocContPageStartY; }
      }
      for (const ch of chapters) {
        const chTitle = ch.title || `${chapterLabel} ${toArabicOrdinal(ch.chapterNumber)}`;
        const tocEntry = `${chapterLabel} ${toArabicOrdinal(ch.chapterNumber)}: ${chTitle}`;
        const entryH = doc.heightOfString(tocEntry, { width: tocEntryWidth, align: "right" });
        const totalH = Math.max(entryH, tocMinEntryHeight) + tocEntrySpacing;
        if (simTocY + totalH > contentBottomLimit) { tocPageCount++; simTocY = tocContPageStartY; }
        simTocY += totalH;
        if (isMemoire) {
          const subs = extractMemoireSubSections((ch as any).content || "");
          for (const sub of subs) {
            const subH = tocMinEntryHeight + tocEntrySpacing;
            if (simTocY + subH > contentBottomLimit) { tocPageCount++; simTocY = tocContPageStartY; }
            simTocY += subH;
          }
        }
      }
      if (isMemoire) {
        for (let si = 0; si < 3; si++) {
          simTocY += tocMinEntryHeight + tocEntrySpacing;
          if (simTocY > contentBottomLimit) { tocPageCount++; simTocY = tocContPageStartY; }
        }
      }

      const extraPagesBeforeChapters = isMemoire ? (frontMatterPageNum + 1) : 1;
      const pagesBeforeChapters = 1 + extraPagesBeforeChapters + tocPageCount + (isMemoire ? 1 : 0);
      let estimatedPage = pagesBeforeChapters + 1;
      const chapterStartPages: number[] = [];

      for (const chapter of chapters) {
        chapterStartPages.push(estimatedPage);
        const chTitleEst = chapter.title || `${chapterLabel} ${toArabicOrdinal(chapter.chapterNumber)}`;
        doc.font("ArabicBold").fontSize(22);
        const estTitleH = doc.heightOfString(chTitleEst, { width: pageWidth, align: "right" });
        const estContentStartY = contentStartY + estTitleH + 60;
        const paragraphs = (chapter.content || "").split(/\n+/).filter((p: string) => p.trim());
        let estY = estContentStartY;
        doc.font("Arabic").fontSize(13);
        for (const para of paragraphs) {
          const textHeight = doc.heightOfString(para.trim(), { width: pageWidth - 40, align: "right", lineGap: 8 });
          if (estY + textHeight > contentBottomLimit) {
            estimatedPage++;
            estY = continuationStartY;
          }
          estY += textHeight + 14;
        }
        estimatedPage++;
      }

      doc.addPage();
      drawBorder();
      if (isMemoire) {
        frontMatterPageNum++;
      }

      drawCenteredArabic("\u0641\u0647\u0631\u0633 \u0627\u0644\u0645\u062D\u062A\u0648\u064A\u0627\u062A", contentStartY, 22, navyBlue, true);
      const tocDivY = contentStartY + 32;
      doc.moveTo(contentMarginX, tocDivY).lineTo(fullPageWidth - contentMarginX, tocDivY).lineWidth(1.5).strokeColor(navyBlue).stroke();
      doc.moveTo(contentMarginX, tocDivY + 3).lineTo(fullPageWidth - contentMarginX, tocDivY + 3).lineWidth(0.4).strokeColor(goldAccent).stroke();

      let tocY = tocFirstPageStartY;

      if (isMemoire) {
        const addTocEntry = (text: string, pageNum: string | number, indent: number, fontSize: number, color: string, bold: boolean, useLeader?: boolean) => {
          doc.font(bold ? "ArabicBold" : "Arabic").fontSize(fontSize).fillColor(color);
          const entryW = tocEntryWidth - indent;
          const entryH = doc.heightOfString(text, { width: entryW, align: "right" });
          const entryHeight = Math.max(entryH, tocMinEntryHeight);
          if (tocY + entryHeight + tocEntrySpacing > contentBottomLimit) {
            drawPageFooter(toRoman(frontMatterPageNum));
            doc.addPage();
            drawSimpleBorder();
            frontMatterPageNum++;
            tocY = tocContPageStartY;
          }
          doc.font(bold ? "ArabicBold" : "Arabic").fontSize(fontSize).fillColor(color);
          const textX = 90 + indent;
          doc.text(fixBidi(text), textX, tocY, { width: entryW, align: "right", features: ["rtla"] });

          if (pageNum && useLeader !== false) {
            const textW = doc.widthOfString(fixBidi(text), { features: ["rtla"] });
            const leaderStartX = contentMarginX + 50;
            const leaderEndX = textX + entryW - textW - 5;
            if (leaderEndX > leaderStartX + 20) {
              drawDottedLeader(leaderStartX, leaderEndX, tocY);
            }
            doc.font("Arabic").fontSize(fontSize).fillColor(goldAccent);
            doc.text(String(pageNum), contentMarginX, tocY, { width: 45, align: "left", lineBreak: false });
          }
          tocY += entryHeight + tocEntrySpacing;
        };

        let fmPage = 2;
        addTocEntry("\u0627\u0644\u0625\u0647\u062F\u0627\u0621", toRoman(fmPage), 0, 12, mutedBrown, false); fmPage++;
        addTocEntry("\u0627\u0644\u0634\u0643\u0631 \u0648\u0627\u0644\u062A\u0642\u062F\u064A\u0631", toRoman(fmPage), 0, 12, mutedBrown, false); fmPage++;
        addTocEntry("\u0645\u0644\u062E\u0635 \u0627\u0644\u0628\u062D\u062B", toRoman(fmPage), 0, 12, mutedBrown, false); fmPage++;
        if (parsedKeywords.length > 0) { addTocEntry("\u0627\u0644\u0643\u0644\u0645\u0627\u062A \u0627\u0644\u0645\u0641\u062A\u0627\u062D\u064A\u0629", toRoman(fmPage), 0, 12, mutedBrown, false); fmPage++; }
        if (parsedHypotheses.length > 0) { addTocEntry("\u0641\u0631\u0636\u064A\u0627\u062A \u0627\u0644\u0628\u062D\u062B", toRoman(fmPage), 0, 12, mutedBrown, false); fmPage++; }

        tocY += 6;
        addTocEntry("\u0627\u0644\u0645\u0642\u062F\u0645\u0629 \u0627\u0644\u0639\u0627\u0645\u0629", chapterStartPages[0] || "", 0, 13, darkBrown, true);

        for (let ci = 0; ci < chapters.length; ci++) {
          const ch = chapters[ci];
          const chTitle = ch.title || `${chapterLabel} ${toArabicOrdinal(ch.chapterNumber)}`;
          const tocEntry = `${chapterLabel} ${toArabicOrdinal(ch.chapterNumber)}: ${chTitle}`;
          addTocEntry(tocEntry, chapterStartPages[ci] || "", 0, 13, darkBrown, true);

          const subSections = extractMemoireSubSections(ch.content || "");
          for (const sub of subSections) {
            const subIndent = sub.type === "matlab" ? 50 : 25;
            const subFontSize = sub.type === "matlab" ? 10 : 11;
            const subColor = sub.type === "matlab" ? "#888" : mutedBrown;
            addTocEntry(sub.text, "", subIndent, subFontSize, subColor, false, false);
          }
        }

        tocY += 6;
        addTocEntry("\u0627\u0644\u062E\u0627\u062A\u0645\u0629 \u0627\u0644\u0639\u0627\u0645\u0629", "", 0, 13, darkBrown, true);
        addTocEntry("\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u0631\u0627\u062C\u0639", "", 0, 13, darkBrown, true);
        addTocEntry("\u0627\u0644\u0645\u0644\u0627\u062D\u0642", "", 0, 13, darkBrown, true);
        drawPageFooter(toRoman(frontMatterPageNum));
      } else {
        for (let ci = 0; ci < chapters.length; ci++) {
          const ch = chapters[ci];
          const chTitle = ch.title || `${chapterLabel} ${toArabicOrdinal(ch.chapterNumber)}`;
          const tocEntry = `${chapterLabel} ${toArabicOrdinal(ch.chapterNumber)}: ${chTitle}`;
          const pageNum = chapterStartPages[ci] || "";

          doc.font("Arabic").fontSize(13).fillColor("#333");
          const tocEntryH = doc.heightOfString(tocEntry, { width: tocEntryWidth, align: "right" });
          const entryHeight = Math.max(tocEntryH, tocMinEntryHeight);
          doc.text(fixBidi(tocEntry), 90, tocY, { width: tocEntryWidth, align: "right", features: ["rtla"] });

          if (pageNum) {
            const textW = doc.widthOfString(fixBidi(tocEntry), { features: ["rtla"] });
            const leaderEnd = 90 + tocEntryWidth - textW - 5;
            if (leaderEnd > contentMarginX + 55) drawDottedLeader(contentMarginX + 50, leaderEnd, tocY);
            doc.font("Arabic").fontSize(13).fillColor(goldAccent);
            doc.text(String(pageNum), contentMarginX, tocY, { width: 45, align: "left", lineBreak: false });
          }

          tocY += entryHeight + tocEntrySpacing;
          if (tocY > contentBottomLimit) {
            doc.addPage();
            drawBorder();
            tocY = contentStartY;
          }
        }
      }

      let pageNumber = pagesBeforeChapters;

      if (isMemoire) {
        doc.addPage();
        pageNumber++;
        drawBorder();
        const introY = pageHeight / 2 - 50;
        drawOrnamentalDivider(introY - 35, 280);
        drawCenteredArabic("\u0627\u0644\u0645\u0642\u062F\u0645\u0629 \u0627\u0644\u0639\u0627\u0645\u0629", introY, 28, navyBlue, true);
        drawOrnamentalDivider(introY + 40, 280);
        drawPageFooter(pageNumber);
      }

      for (const chapter of chapters) {
        doc.addPage();
        pageNumber++;
        drawBorder();

        const chTitle = chapter.title || `${chapterLabel} ${toArabicOrdinal(chapter.chapterNumber)}`;

        let chapterContentStartY: number;
        if (isMemoire) {
          const chNumLabel = `${chapterLabel} ${toArabicOrdinal(chapter.chapterNumber)}`;
          const chBoxY = contentStartY;
          const chBoxH = 50;
          const chBoxX = fullPageWidth * 0.25;
          const chBoxW = fullPageWidth * 0.5;
          doc.rect(chBoxX, chBoxY, chBoxW, chBoxH).lineWidth(1.5).strokeColor(navyBlue).fill("#F8F5F0").stroke();
          doc.rect(chBoxX + 2, chBoxY + 2, chBoxW - 4, chBoxH - 4).lineWidth(0.4).strokeColor(goldAccent).stroke();
          doc.font("ArabicBold").fontSize(18).fillColor(navyBlue);
          const numW = doc.widthOfString(fixBidi(chNumLabel), { features: ["rtla"] });
          doc.text(fixBidi(chNumLabel), (fullPageWidth - numW) / 2, chBoxY + 16, { width: numW + 4, features: ["rtla"], lineBreak: false });

          const titleY = chBoxY + chBoxH + 18;
          doc.font("ArabicBold").fontSize(20).fillColor(darkBrown);
          const titleHeight = doc.heightOfString(chTitle, { width: pageWidth - 40, align: "center" });
          doc.text(fixBidi(chTitle), contentMarginX + 20, titleY, { width: pageWidth - 40, align: "center", features: ["rtla"] });

          const divY = titleY + titleHeight + 12;
          drawOrnamentalDivider(divY, 250);
          chapterContentStartY = divY + 25;
        } else {
          doc.font("ArabicBold").fontSize(22).fillColor(darkBrown);
          const titleHeight = doc.heightOfString(chTitle, { width: pageWidth, align: "right" });
          doc.text(fixBidi(chTitle), contentMarginX, contentStartY, { width: pageWidth, align: "right", features: ["rtla"] });
          const dividerY = contentStartY + titleHeight + 15;
          drawOrnamentalDivider(dividerY);
          chapterContentStartY = dividerY + 25;
        }

        doc.font("Arabic").fontSize(13).fillColor("#333");

        const paragraphs = (chapter.content || "").split(/\n+/).filter((p: string) => p.trim());
        let yPos = chapterContentStartY;
        const paraWidth = pageWidth - 40;

        for (const para of paragraphs) {
          const trimmedPara = para.trim();

          if (isMemoire) {
            const headerInfo = isMemoireAcademicHeader(trimmedPara);
            if (headerInfo) {
              const headerText = headerInfo.text;
              if (headerInfo.type === "mabhath" || headerInfo.type === "intro" || headerInfo.type === "conclusion") {
                doc.font("ArabicBold").fontSize(16).fillColor(navyBlue);
                const headerHeight = doc.heightOfString(headerText, { width: paraWidth, align: "right", lineGap: 6 });
                if (yPos + headerHeight + 25 > contentBottomLimit) {
                  drawPageFooter(pageNumber);
                  doc.addPage(); pageNumber++;
                  drawSimpleBorder();
                  drawPageHeader(chTitle);
                  yPos = continuationStartY;
                }
                yPos += 14;
                doc.rect(contentMarginX + 5, yPos - 4, 3, headerHeight + 8).fill(navyBlue);
                doc.font("ArabicBold").fontSize(16).fillColor(navyBlue);
                doc.text(fixBidi(headerText), contentMarginX + 15, yPos, { width: paraWidth, align: "right", lineGap: 6, features: ["rtla"] });
                yPos += headerHeight + 6;
                doc.moveTo(contentMarginX + 40, yPos).lineTo(fullPageWidth - contentMarginX - 40, yPos).lineWidth(0.4).strokeColor(goldAccent).stroke();
                yPos += 14;
                continue;
              } else if (headerInfo.type === "matlab") {
                doc.font("ArabicBold").fontSize(14).fillColor("#4A3728");
                const headerHeight = doc.heightOfString(headerText, { width: paraWidth - 30, align: "right", lineGap: 6 });
                if (yPos + headerHeight + 20 > contentBottomLimit) {
                  drawPageFooter(pageNumber);
                  doc.addPage(); pageNumber++;
                  drawSimpleBorder();
                  drawPageHeader(chTitle);
                  yPos = continuationStartY;
                }
                yPos += 10;
                doc.rect(contentMarginX + 25, yPos - 2, 2, headerHeight + 4).fill(goldAccent);
                doc.font("ArabicBold").fontSize(14).fillColor("#4A3728");
                doc.text(fixBidi(headerText), contentMarginX + 35, yPos, { width: paraWidth - 30, align: "right", lineGap: 6, features: ["rtla"] });
                yPos += headerHeight + 12;
                continue;
              } else if (headerInfo.type === "tamheed" || headerInfo.type === "khulasat") {
                doc.font("ArabicBold").fontSize(15).fillColor(mutedBrown);
                const headerHeight = doc.heightOfString(headerText, { width: paraWidth, align: "right", lineGap: 6 });
                if (yPos + headerHeight + 20 > contentBottomLimit) {
                  drawPageFooter(pageNumber);
                  doc.addPage(); pageNumber++;
                  drawSimpleBorder();
                  drawPageHeader(chTitle);
                  yPos = continuationStartY;
                }
                yPos += 10;
                doc.font("ArabicBold").fontSize(15).fillColor(mutedBrown);
                doc.text(fixBidi(headerText), contentMarginX + 20, yPos, { width: paraWidth, align: "right", lineGap: 6, features: ["rtla"] });
                yPos += headerHeight + 12;
                continue;
              }
            }
          }

          const textHeight = doc.heightOfString(trimmedPara, { width: paraWidth, align: "right", lineGap: 8 });
          if (yPos + textHeight > contentBottomLimit) {
            drawPageFooter(pageNumber);
            doc.addPage();
            pageNumber++;
            if (isMemoire) { drawSimpleBorder(); } else { drawBorder(); }
            drawPageHeader(chTitle);
            yPos = continuationStartY;
          }
          doc.font("Arabic").fontSize(13).fillColor("#333");
          doc.text(fixBidi(trimmedPara), contentMarginX + 25, yPos, {
            width: paraWidth,
            align: "right",
            lineGap: 8,
            features: ["rtla"],
            indent: 20,
          });
          yPos += textHeight + 14;
        }

        drawPageFooter(pageNumber);
      }

      if (isMemoire) {
        doc.addPage();
        pageNumber++;
        drawBorder();
        const concY = pageHeight / 2 - 50;
        drawOrnamentalDivider(concY - 35, 280);
        drawCenteredArabic("\u0627\u0644\u062E\u0627\u062A\u0645\u0629 \u0627\u0644\u0639\u0627\u0645\u0629", concY, 28, navyBlue, true);
        drawOrnamentalDivider(concY + 40, 280);
        drawPageFooter(pageNumber);
      }

      if (project.glossary) {
        doc.addPage();
        pageNumber++;
        if (isMemoire) { drawSimpleBorder(); } else { drawBorder(); }

        const glossaryTitle = isMemoire ? "\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u0631\u0627\u062C\u0639" : "\u0627\u0644\u0645\u0633\u0631\u062F";
        drawCenteredArabic(glossaryTitle, contentStartY, 22, navyBlue, true);
        const glDivY = contentStartY + 32;
        doc.moveTo(contentMarginX, glDivY).lineTo(fullPageWidth - contentMarginX, glDivY).lineWidth(1.5).strokeColor(navyBlue).stroke();
        doc.moveTo(contentMarginX, glDivY + 3).lineTo(fullPageWidth - contentMarginX, glDivY + 3).lineWidth(0.4).strokeColor(goldAccent).stroke();

        const glossaryLines = project.glossary.split(/\n+/).filter((l: string) => l.trim());
        let yPos = glDivY + 18;
        for (const line of glossaryLines) {
          const trimmedLine = line.trim();
          let lineFont = "Arabic";
          let lineFontSize = 12;
          let lineColor = "#333";
          if (isMemoire) {
            if (/^(\u0641\u0647\u0631\u0633 \u0627\u0644\u0645\u062D\u062A\u0648\u064A\u0627\u062A|\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u062E\u062A\u0635\u0631\u0627\u062A|\u0641\u0647\u0631\u0633 \u0627\u0644\u0645\u0631\u0627\u062C\u0639|\u0645\u0631\u0627\u062C\u0639 \u0639\u0631\u0628\u064A\u0629|\u0645\u0631\u0627\u062C\u0639 \u0623\u062C\u0646\u0628\u064A\u0629|\u0645\u0648\u0627\u0642\u0639 \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0629|\u0631\u0633\u0627\u0626\u0644 \u062C\u0627\u0645\u0639\u064A\u0629)/.test(trimmedLine)) {
              lineFont = "ArabicBold"; lineFontSize = 15; lineColor = navyBlue;
            } else if (/^(\u0627\u0644\u0645\u0642\u062F\u0645\u0629 \u0627\u0644\u0639\u0627\u0645\u0629|\u0627\u0644\u062E\u0627\u062A\u0645\u0629 \u0627\u0644\u0639\u0627\u0645\u0629|\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u0631\u0627\u062C\u0639|\u0627\u0644\u0645\u0644\u0627\u062D\u0642|\u0627\u0644\u0641\u0635\u0644\s)/.test(trimmedLine)) {
              lineFont = "ArabicBold"; lineFontSize = 13; lineColor = "#4A3728";
            }
          }
          doc.font(lineFont).fontSize(lineFontSize).fillColor(lineColor);
          const textHeight = doc.heightOfString(trimmedLine, { width: pageWidth - 20, align: "right", lineGap: 6 });
          if (yPos + textHeight > contentBottomLimit) {
            drawPageFooter(pageNumber);
            doc.addPage(); pageNumber++;
            if (isMemoire) { drawSimpleBorder(); } else { drawBorder(); }
            drawPageHeader(glossaryTitle);
            yPos = continuationStartY;
          }
          doc.font(lineFont).fontSize(lineFontSize).fillColor(lineColor);
          doc.text(fixBidi(trimmedLine), contentMarginX + 10, yPos, { width: pageWidth - 20, align: "right", lineGap: 6, features: ["rtla"] });
          yPos += textHeight + 10;
        }
        drawPageFooter(pageNumber);
      } else if (isMemoire) {
        doc.addPage();
        pageNumber++;
        drawSimpleBorder();
        drawCenteredArabic("\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u0631\u0627\u062C\u0639", contentStartY, 22, navyBlue, true);
        const refDivY = contentStartY + 32;
        doc.moveTo(contentMarginX, refDivY).lineTo(fullPageWidth - contentMarginX, refDivY).lineWidth(1.5).strokeColor(navyBlue).stroke();
        doc.moveTo(contentMarginX, refDivY + 3).lineTo(fullPageWidth - contentMarginX, refDivY + 3).lineWidth(0.4).strokeColor(goldAccent).stroke();
        let refY = refDivY + 25;
        const refSections = ["\u0645\u0631\u0627\u062C\u0639 \u0639\u0631\u0628\u064A\u0629", "\u0645\u0631\u0627\u062C\u0639 \u0623\u062C\u0646\u0628\u064A\u0629", "\u0645\u0648\u0627\u0642\u0639 \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0629"];
        for (const sec of refSections) {
          doc.font("ArabicBold").fontSize(14).fillColor(navyBlue);
          doc.text(fixBidi(sec), contentMarginX + 15, refY, { width: pageWidth - 30, align: "right", features: ["rtla"] });
          refY += 25;
          doc.moveTo(contentMarginX + 40, refY).lineTo(fullPageWidth - contentMarginX - 40, refY).lineWidth(0.3).strokeColor(goldAccent).stroke();
          refY += 30;
        }
        drawPageFooter(pageNumber);
      }

      doc.end();
    } catch (error) {
      console.error("Error generating PDF:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "فشل في إنشاء ملف PDF" });
      }
    }
  });

  const pdfCoverStore = new Map<string, { buffer: Buffer; userId: string; createdAt: number }>();
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of pdfCoverStore) {
      if (now - val.createdAt > 5 * 60 * 1000) pdfCoverStore.delete(key);
    }
  }, 60_000);

  const pdfCoverBodyParser = (await import("express")).default.json({ limit: "8mb" });
  app.post("/api/projects/:id/export/pdf-cover", pdfCoverBodyParser, isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const coverUser = await storage.getUser(req.user.claims.sub);
      if (coverUser?.plan === "trial") {
        return res.status(403).json({ error: "التصدير غير متاح في الفترة التجريبية. يرجى الترقية إلى خطة مدفوعة." });
      }
      const project = await storage.getProject(id);
      if (!project || project.userId !== req.user.claims.sub) {
        return res.status(404).json({ error: "المشروع غير موجود" });
      }

      const { coverImageData, coverImageUrl: coverUrl } = req.body || {};
      let coverBuffer: Buffer | null = null;

      if (coverImageData && typeof coverImageData === "string") {
        const dataMatch = coverImageData.match(/^data:image\/\w+;base64,(.+)$/);
        if (dataMatch) {
          const decoded = Buffer.from(dataMatch[1], "base64");
          if (decoded.length <= 5 * 1024 * 1024) {
            coverBuffer = decoded;
          } else {
            return res.status(400).json({ error: "حجم الصورة يجب أن لا يتجاوز 5 ميغابايت" });
          }
        } else {
          return res.status(400).json({ error: "صيغة بيانات الصورة غير صالحة" });
        }
      } else if (coverUrl && typeof coverUrl === "string") {
        try {
          const parsed = new URL(coverUrl);
          if (!["http:", "https:"].includes(parsed.protocol)) {
            return res.status(400).json({ error: "يُسمح فقط بروابط HTTP/HTTPS" });
          }
          const hostname = parsed.hostname.toLowerCase();
          if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0" || hostname.startsWith("10.") || hostname.startsWith("172.") || hostname.startsWith("192.168.") || hostname === "[::1]" || hostname.endsWith(".internal") || hostname === "metadata.google.internal" || hostname.startsWith("169.254.")) {
            return res.status(400).json({ error: "رابط الصورة غير مسموح به" });
          }
          const dns = await import("dns");
          const { promisify } = await import("util");
          const dnsResolve = promisify(dns.resolve);
          try {
            const addresses = await dnsResolve(hostname);
            const isPrivate = addresses.some((addr: string) => {
              const parts = addr.split(".").map(Number);
              return addr === "127.0.0.1" || addr === "0.0.0.0" ||
                parts[0] === 10 ||
                (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
                (parts[0] === 192 && parts[1] === 168) ||
                parts[0] === 0 || addr.startsWith("169.254.") ||
                addr === "::1" || addr.startsWith("fc") || addr.startsWith("fd") || addr.startsWith("fe80");
            });
            if (isPrivate) return res.status(400).json({ error: "رابط الصورة غير مسموح به" });
          } catch {
            return res.status(400).json({ error: "فشل في التحقق من الرابط" });
          }
          const controller = new AbortController();
          const fetchTimeout = setTimeout(() => controller.abort(), 10000);
          const coverRes = await fetch(coverUrl, { signal: controller.signal, redirect: "error" });
          clearTimeout(fetchTimeout);
          if (!coverRes.ok) {
            return res.status(400).json({ error: "فشل في تحميل صورة الغلاف من الرابط" });
          }
          const ct = coverRes.headers.get("content-type") || "";
          if (!ct.startsWith("image/")) {
            return res.status(400).json({ error: "الرابط لا يشير إلى صورة صالحة" });
          }
          const arrayBuf = await coverRes.arrayBuffer();
          if (arrayBuf.byteLength > 10 * 1024 * 1024) {
            return res.status(400).json({ error: "حجم الصورة يجب أن لا يتجاوز 10 ميغابايت" });
          }
          coverBuffer = Buffer.from(arrayBuf);
        } catch {
          return res.status(400).json({ error: "فشل في تحميل صورة الغلاف من الرابط" });
        }
      }

      if (!coverBuffer) {
        return res.status(400).json({ error: "يرجى تحميل صورة أو إدخال رابط صورة صالح" });
      }

      const crypto = await import("crypto");
      const token = crypto.randomBytes(16).toString("hex");
      pdfCoverStore.set(token, { buffer: coverBuffer, userId: req.user.claims.sub, createdAt: Date.now() });

      res.json({ coverToken: token });
    } catch (error) {
      console.error("Error uploading PDF cover:", error);
      res.status(500).json({ error: "فشل في رفع صورة الغلاف" });
    }
  });

  app.get("/api/projects/:id/export/epub", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const epubExportUser = await storage.getUser(req.user.claims.sub);
      if (epubExportUser?.plan === "trial") {
        return res.status(403).json({ error: "التصدير غير متاح في الفترة التجريبية. يرجى الترقية إلى خطة مدفوعة." });
      }
      const project = await storage.getProjectWithDetails(id);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "غير مصرّح بالوصول" });

      const epubAuthorName = (epubExportUser as any)?.displayName || (epubExportUser as any)?.firstName || epubExportUser?.email?.split("@")[0] || "المؤلف";
      const epubChapterLabel = project.projectType === "essay" ? "القسم" : project.projectType === "scenario" ? "المشهد" : project.projectType === "short_story" ? "المقطع" : project.projectType === "khawater" ? "النص" : project.projectType === "social_media" ? "المحتوى" : project.projectType === "poetry" ? "القصيدة" : project.projectType === "memoire" ? "الفصل" : "الفصل";
      const completedChapters = project.chapters
        .filter((ch: any) => ch.status === "completed" && ch.content)
        .sort((a: any, b: any) => (a.chapterNumber || 0) - (b.chapterNumber || 0));
      if (completedChapters.length === 0) return res.status(400).json({ error: "لا توجد فصول مكتملة" });

      const hasCover = !!project.coverImageUrl;
      let coverImageBuffer: Buffer | null = null;
      let coverMediaType = "image/png";

      if (hasCover) {
        try {
          if (project.coverImageUrl!.startsWith("data:")) {
            const match = project.coverImageUrl!.match(/^data:(image\/\w+);base64,(.+)$/);
            if (match) {
              coverMediaType = match[1];
              coverImageBuffer = Buffer.from(match[2], "base64");
            }
          } else {
            const response = await fetch(project.coverImageUrl!);
            if (response.ok) {
              const arrayBuf = await response.arrayBuffer();
              coverImageBuffer = Buffer.from(arrayBuf);
              const ct = response.headers.get("content-type");
              if (ct) coverMediaType = ct.split(";")[0];
            }
          }
        } catch {
          // skip cover if it fails to load
        }
      }

      const coverExt = coverMediaType === "image/jpeg" ? "jpg" : "png";

      res.setHeader("Content-Type", "application/epub+zip");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(project.title)}.epub"`);

      const archive = archiver("zip", { zlib: { level: 9 } });
      archive.pipe(res);

      archive.append("application/epub+zip", { name: "mimetype", store: true });

      archive.append(`<?xml version="1.0" encoding="UTF-8"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`, { name: "META-INF/container.xml" });

      const isMemoire = project.projectType === "memoire";
      const chapterItems = completedChapters
        .map((_: any, i: number) => `    <item id="chapter${i + 1}" href="chapter${i + 1}.xhtml" media-type="application/xhtml+xml"/>`)
        .join("\n");
      const chapterSpine = completedChapters
        .map((_: any, i: number) => `    <itemref idref="chapter${i + 1}" properties="page-spread-right"/>`)
        .join("\n");

      const coverManifestItems = coverImageBuffer
        ? `    <item id="cover-image" href="cover.${coverExt}" media-type="${coverMediaType}" properties="cover-image"/>\n    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>\n`
        : "";
      const coverSpineItem = coverImageBuffer
        ? `    <itemref idref="cover" linear="no"/>\n`
        : "";
      const colophonManifestItem = `    <item id="colophon" href="colophon.xhtml" media-type="application/xhtml+xml"/>`;
      const colophonSpineItem = `    <itemref idref="colophon"/>\n`;
      const bismillahManifestItem = isMemoire
        ? `\n    <item id="bismillah" href="bismillah.xhtml" media-type="application/xhtml+xml"/>`
        : "";
      const bismillahSpineItem = isMemoire
        ? `    <itemref idref="bismillah"/>\n`
        : "";
      const glossaryManifestItem = project.glossary
        ? `\n    <item id="glossary" href="glossary.xhtml" media-type="application/xhtml+xml"/>`
        : "";
      const glossarySpineItem = project.glossary
        ? `\n    <itemref idref="glossary" properties="page-spread-right"/>`
        : "";

      archive.append(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" dir="rtl">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">qalamai-${id}</dc:identifier>
    <dc:title>${(project.title || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</dc:title>
    <dc:language>ar</dc:language>
    <dc:creator>${epubAuthorName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</dc:creator>
    <meta property="dcterms:modified">${new Date().toISOString().split(".")[0]}Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="style" href="style.css" media-type="text/css"/>
${coverManifestItems}${colophonManifestItem}${bismillahManifestItem}
${chapterItems}${glossaryManifestItem}
  </manifest>
  <spine page-progression-direction="rtl">
${coverSpineItem}${colophonSpineItem}${bismillahSpineItem}${chapterSpine}${glossarySpineItem}
  </spine>
</package>`, { name: "OEBPS/content.opf" });

      if (coverImageBuffer) {
        archive.append(coverImageBuffer, { name: `OEBPS/cover.${coverExt}` });

        archive.append(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="ar" dir="rtl">
<head><title>غلاف</title><style>body { margin: 0; padding: 0; text-align: center; } img { max-width: 100%; max-height: 100%; }</style></head>
<body>
  <img src="cover.${coverExt}" alt="${project.title.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}" />
</body>
</html>`, { name: "OEBPS/cover.xhtml" });
      }

      const epubDate = new Date().toLocaleDateString("ar-SA");
      const safeTitle = project.title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

      let epubMemoireMeta = "";
      if (isMemoire) {
        const epubMemoireFieldMap: Record<string, string> = {
          sciences: "العلوم الطبيعية والتطبيقية",
          humanities: "العلوم الإنسانية والاجتماعية",
          law: "القانون والعلوم القانونية",
          medicine: "الطب والعلوم الصحية",
          engineering: "الهندسة والتكنولوجيا",
          economics: "العلوم الاقتصادية والتجارية وعلوم التسيير",
          education: "علوم التربية والتعليم",
          literature: "الآداب واللغات",
          media: "الإعلام والاتصال",
          computer_science: "الإعلام الآلي وعلوم الحاسوب",
          islamic_studies: "العلوم الإسلامية والشريعة",
          political_science: "العلوم السياسية والعلاقات الدولية",
          psychology: "علم النفس",
          sociology: "علم الاجتماع",
          history: "التاريخ",
          philosophy: "الفلسفة",
          agriculture: "العلوم الزراعية",
          architecture: "الهندسة المعمارية والعمران",
        };
        const epubMemoireMethodologyMap: Record<string, string> = {
          descriptive: "المنهج الوصفي",
          analytical: "المنهج التحليلي",
          comparative: "المنهج المقارن",
          historical: "المنهج التاريخي",
          experimental: "المنهج التجريبي",
          survey: "المنهج المسحي",
          case_study: "دراسة حالة",
          inductive: "المنهج الاستقرائي",
          deductive: "المنهج الاستنباطي",
          mixed: "المنهج المختلط",
        };
        const epubMemoireCitationMap: Record<string, string> = {
          apa: "APA",
          mla: "MLA",
          chicago: "شيكاغو",
          harvard: "هارفارد",
          ieee: "IEEE",
          iso690: "ISO 690",
          islamic: "التوثيق الإسلامي",
        };
        const escHtml = (s: string) => (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const epubFieldAr = epubMemoireFieldMap[(project as any).memoireField || ""] || (project as any).memoireField || "";
        const epubUniv = escHtml((project as any).memoireUniversity || "");
        const epubFaculty = escHtml((project as any).memoireFaculty || "");
        const epubDepartment = escHtml((project as any).memoireDepartment || "");
        const epubCountry = escHtml((project as any).memoireCountry || "");
        const epubMethodology = epubMemoireMethodologyMap[(project as any).memoireMethodology || ""] || (project as any).memoireMethodology || "";
        const epubCitation = epubMemoireCitationMap[(project as any).memoireCitationStyle || ""] || (project as any).memoireCitationStyle || "";
        const epubKeywords = escHtml((project as any).memoireKeywords || "");
        const epubAcademicYear = `${new Date().getFullYear() - 1}/${new Date().getFullYear()}`;

        if (epubUniv) {
          epubMemoireMeta += `\n    <p style="text-indent: 0; font-size: 1.1em; color: #2C1810; font-weight: bold;">${epubUniv}</p>`;
        }
        if (epubFaculty) {
          epubMemoireMeta += `\n    <p style="text-indent: 0; font-size: 1em; color: #2C1810;">الكلية: ${epubFaculty}</p>`;
        }
        if (epubDepartment) {
          epubMemoireMeta += `\n    <p style="text-indent: 0; font-size: 1em; color: #2C1810;">القسم: ${epubDepartment}</p>`;
        }
        if (epubFieldAr) {
          epubMemoireMeta += `\n    <p style="text-indent: 0; font-size: 0.95em; color: #6B5B4F;">التخصص: ${epubFieldAr}</p>`;
        }
        const epubDegreeLevel = (project as any).memoireDegreeLevel || "";
        if (epubDegreeLevel) {
          const epubDegreeLevelMap: Record<string, string> = { licence: "ليسانس / بكالوريوس", master: "ماستر / ماجستير", doctorate: "دكتوراه" };
          epubMemoireMeta += `\n    <p style="text-indent: 0; font-size: 0.95em; color: #6B5B4F;">المستوى: ${epubDegreeLevelMap[epubDegreeLevel] || epubDegreeLevel}</p>`;
        }
        if (epubCountry) {
          epubMemoireMeta += `\n    <p style="text-indent: 0; font-size: 0.95em; color: #6B5B4F;">البلد: ${epubCountry}</p>`;
        }
        if (epubMethodology) {
          epubMemoireMeta += `\n    <p style="text-indent: 0; font-size: 0.95em; color: #6B5B4F;">المنهجية: ${epubMethodology}</p>`;
        }
        if (epubCitation) {
          epubMemoireMeta += `\n    <p style="text-indent: 0; font-size: 0.95em; color: #6B5B4F;">نمط التوثيق: ${epubCitation}</p>`;
        }
        epubMemoireMeta += `\n    <p style="text-indent: 0; font-size: 0.95em; color: #6B5B4F;">السنة الجامعية: ${epubAcademicYear}</p>`;
        if (epubKeywords) {
          epubMemoireMeta += `\n    <hr/>\n    <p style="text-indent: 0; font-size: 0.95em; color: #6B5B4F;"><strong>الكلمات المفتاحية:</strong> ${epubKeywords}</p>`;
        }
        const epubHypotheses = escHtml((project as any).memoireHypotheses || "");
        if (epubHypotheses) {
          const hyLines = epubHypotheses.split(/\n+/).filter((h: string) => h.trim());
          let hyHtml = `\n    <hr/>\n    <p style="text-indent: 0; font-size: 1em; color: #2C1810; font-weight: bold;">فرضيات البحث</p>`;
          hyHtml += `\n    <ol style="text-indent: 0; font-size: 0.95em; color: #6B5B4F; padding-right: 1.5em;">`;
          for (const h of hyLines) {
            hyHtml += `\n      <li>${escHtml(h.trim())}</li>`;
          }
          hyHtml += `\n    </ol>`;
          epubMemoireMeta += hyHtml;
        }
      }

      archive.append(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="ar" dir="rtl">
<head><title>حقوق النشر</title><link rel="stylesheet" href="style.css"/></head>
<body>
  <div style="text-align: center; padding-top: 40%; line-height: 2.5;">
    <h1>${safeTitle}</h1>
    <p style="text-indent: 0; font-size: 1.2em; color: #2C1810;">تأليف ${epubAuthorName.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>${epubMemoireMeta}
    <p style="text-indent: 0; font-size: 0.95em; color: #8B7355;">بمساعدة أبو هاشم — QalamAI</p>
    <p style="text-indent: 0; color: #8B7355;">${epubDate}</p>
    <hr/>
    <p style="text-indent: 0; font-size: 0.9em; color: #6B5B4F;">جميع الحقوق محفوظة © ${new Date().getFullYear()} ${epubAuthorName.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>
  </div>
</body>
</html>`, { name: "OEBPS/colophon.xhtml" });

      if (isMemoire) {
        archive.append(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="ar" dir="rtl">
<head><title>بسم الله الرحمن الرحيم</title><link rel="stylesheet" href="style.css"/></head>
<body>
  <div style="text-align: center; padding-top: 35%; line-height: 3;">
    <p style="text-indent: 0; font-size: 2em; color: #8B4513; font-weight: bold;">بسم الله الرحمن الرحيم</p>
    <hr/>
    <p style="text-indent: 0; font-size: 1.1em; color: #6B5B4F;">﴿ وَقُل رَّبِّ زِدْنِي عِلْمًا ﴾</p>
  </div>
</body>
</html>`, { name: "OEBPS/bismillah.xhtml" });
      }

      archive.append(`body { direction: rtl; unicode-bidi: embed; font-family: serif; line-height: 2; padding: 1em; color: #2C1810; background: #FFFDF5; }
html { writing-mode: horizontal-tb; }
h1 { text-align: center; color: #8B4513; font-size: 1.5em; margin-bottom: 0.5em; }
h2 { color: #8B7355; font-size: 0.9em; text-align: center; margin-bottom: 1em; }
p { text-indent: 2em; margin: 0.5em 0; text-align: justify; }
hr { border: none; border-top: 1px solid #D4A574; margin: 1.5em auto; width: 40%; }`, { name: "OEBPS/style.css" });

      let tocItemsHtml: string;
      const escHtmlEpub = (s: string) => (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      if (isMemoire) {
        let memoireTocItems = `      <li><span>المقدمة العامة</span></li>\n`;
        for (let i = 0; i < completedChapters.length; i++) {
          const ch = completedChapters[i];
          const subSections = extractMemoireSubSections(ch.content || "");
          let subList = "";
          if (subSections.length > 0) {
            const subItems = subSections.map((s: any) => `          <li><span>${escHtmlEpub(s.text)}</span></li>`).join("\n");
            subList = `\n        <ol>\n${subItems}\n        </ol>`;
          }
          memoireTocItems += `      <li><a href="chapter${i + 1}.xhtml">${epubChapterLabel} ${toArabicOrdinal(ch.chapterNumber)}: ${escHtmlEpub(ch.title)}</a>${subList}</li>\n`;
        }
        memoireTocItems += `      <li><span>الخاتمة العامة</span></li>\n`;
        memoireTocItems += `      <li><span>قائمة المراجع</span></li>\n`;
        memoireTocItems += `      <li><span>الملاحق</span></li>`;
        tocItemsHtml = memoireTocItems;
      } else {
        tocItemsHtml = completedChapters
          .map((ch: any, i: number) => `      <li><a href="chapter${i + 1}.xhtml">${epubChapterLabel} ${toArabicOrdinal(ch.chapterNumber)}: ${escHtmlEpub(ch.title)}</a></li>`)
          .join("\n");
      }

      archive.append(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="ar" dir="rtl">
<head><title>فهرس المحتويات</title><link rel="stylesheet" href="style.css"/></head>
<body>
  <h1>${escHtmlEpub(project.title)}</h1>
  <nav epub:type="toc">
    <ol>
${tocItemsHtml}
    </ol>
  </nav>
</body>
</html>`, { name: "OEBPS/nav.xhtml" });

      for (let i = 0; i < completedChapters.length; i++) {
        const ch = completedChapters[i];
        const escHtmlContent = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        let chapterContentHtml: string;

        if (isMemoire) {
          const lines = (ch.content || "").split("\n").filter((p: string) => p.trim());
          chapterContentHtml = lines.map((p: string) => {
            const trimmed = p.trim().replace(/^#{1,3}\s*/, "");
            const escaped = escHtmlContent(trimmed);
            if (/^(المبحث\s|مبحث\s)/.test(trimmed)) {
              return `<h3 style="text-indent: 0; font-size: 1.3em; color: #2C1810; margin-top: 1.5em; border-bottom: 1px solid #D4A574; padding-bottom: 0.3em;">${escaped}</h3>`;
            }
            if (/^(المطلب\s|مطلب\s)/.test(trimmed)) {
              return `<h4 style="text-indent: 0; font-size: 1.1em; color: #4A3728; margin-top: 1em; margin-right: 1em;">${escaped}</h4>`;
            }
            if (/^(تمهيد الفصل|تمهيد)(\s|$|:|\.|-|—)/.test(trimmed) || /^(خلاصة الفصل|خلاصة)(\s|$|:|\.|-|—)/.test(trimmed)) {
              return `<h3 style="text-indent: 0; font-size: 1.2em; color: #6B5B4F; margin-top: 1.5em; font-style: italic;">${escaped}</h3>`;
            }
            if (/^(المقدمة العامة|المقدمة|الخاتمة العامة|الخاتمة)(\s|$|:|\.|-|—)/.test(trimmed)) {
              return `<h3 style="text-indent: 0; font-size: 1.3em; color: #2C1810; margin-top: 1.5em;">${escaped}</h3>`;
            }
            return `<p>${escaped}</p>`;
          }).join("\n");
        } else {
          chapterContentHtml = (ch.content || "").split("\n").filter((p: string) => p.trim())
            .map((p: string) => `<p>${escHtmlContent(p.trim())}</p>`)
            .join("\n");
        }

        archive.append(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="ar" dir="rtl">
<head><title>${epubChapterLabel} ${toArabicOrdinal(ch.chapterNumber)}: ${escHtmlEpub(ch.title)}</title><link rel="stylesheet" href="style.css"/></head>
<body>
  <h2>${epubChapterLabel} ${toArabicOrdinal(ch.chapterNumber)}</h2>
  <h1>${ch.title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</h1>
  <hr/>
${chapterContentHtml}
</body>
</html>`, { name: `OEBPS/chapter${i + 1}.xhtml` });
      }

      if (project.glossary) {
        const epubGlossaryTitle = isMemoire ? "الفهرس الأكاديمي" : "المسرد";
        const glossaryParagraphs = project.glossary.split("\n").filter((p: string) => p.trim())
          .map((p: string) => {
            const trimmed = p.trim();
            const escaped = trimmed.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            if (isMemoire && /^(فهرس المحتويات|قائمة المختصرات|فهرس المراجع|مراجع عربية|مراجع أجنبية|مواقع إلكترونية|رسائل جامعية)/.test(trimmed)) {
              return `<h3 style="text-indent: 0; font-size: 1.2em; color: #2C1810; margin-top: 1.5em; border-bottom: 1px solid #D4A574; padding-bottom: 0.3em;">${escaped}</h3>`;
            }
            return `<p>${escaped}</p>`;
          })
          .join("\n");

        archive.append(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="ar" dir="rtl">
<head><title>${epubGlossaryTitle}</title><link rel="stylesheet" href="style.css"/></head>
<body>
  <h1>${epubGlossaryTitle}</h1>
  <hr/>
${glossaryParagraphs}
</body>
</html>`, { name: "OEBPS/glossary.xhtml" });
      }

      await archive.finalize();
    } catch (error) {
      console.error("Error generating EPUB:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "فشل في إنشاء ملف EPUB" });
      }
    }
  });

  app.patch("/api/projects/:id/target-word-count", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const project = await storage.getProject(id);
      if (!project || project.userId !== req.user.claims.sub) {
        return res.status(404).json({ error: "المشروع غير موجود" });
      }
      const { targetWordCount } = req.body;
      if (targetWordCount !== null && (typeof targetWordCount !== "number" || targetWordCount < 0)) {
        return res.status(400).json({ error: "هدف الكلمات يجب أن يكون رقماً موجباً" });
      }
      await storage.updateProject(id, { targetWordCount: targetWordCount || null });
      res.json({ success: true, targetWordCount });
    } catch (error) {
      console.error("Error updating target word count:", error);
      res.status(500).json({ error: "فشل في تحديث هدف الكلمات" });
    }
  });

  app.patch("/api/projects/:id/goal", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const project = await storage.getProject(id);
      if (!project || project.userId !== req.user.claims.sub) {
        return res.status(404).json({ error: "المشروع غير موجود" });
      }
      const { wordCountGoal } = req.body;
      if (wordCountGoal !== null && wordCountGoal !== undefined && (typeof wordCountGoal !== "number" || wordCountGoal < 0 || wordCountGoal > 10000000)) {
        return res.status(400).json({ error: "هدف الكلمات يجب أن يكون رقماً موجباً" });
      }
      await storage.updateProject(id, { wordCountGoal: wordCountGoal || null, milestonesReached: [] });
      res.json({ success: true, wordCountGoal });
    } catch (error) {
      console.error("Error updating word count goal:", error);
      res.status(500).json({ error: "فشل في تحديث الهدف" });
    }
  });

  app.patch("/api/projects/:id/reorder-chapters", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const project = await storage.getProject(id);
      if (!project || project.userId !== req.user.claims.sub) {
        return res.status(404).json({ error: "المشروع غير موجود" });
      }
      const { chapterIds } = req.body;
      if (!Array.isArray(chapterIds) || chapterIds.length === 0) {
        return res.status(400).json({ error: "قائمة الفصول مطلوبة" });
      }
      const projectChapters = await storage.getChaptersByProject(id);
      const projectChapterIds = new Set(projectChapters.map(ch => ch.id));
      for (const cid of chapterIds) {
        if (!projectChapterIds.has(cid)) {
          return res.status(400).json({ error: "فصل غير موجود في هذا المشروع" });
        }
      }
      for (let i = 0; i < chapterIds.length; i++) {
        await db.update(chapters)
          .set({ chapterNumber: i + 1 })
          .where(eq(chapters.id, chapterIds[i]));
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering chapters:", error);
      res.status(500).json({ error: "فشل في إعادة ترتيب الفصول" });
    }
  });

  app.post("/api/projects/:id/chapters/:chapterId/summarize", isAuthenticated, async (req: any, res) => {
    try {
      if (await checkApiSuspension(req.user.claims.sub, res)) return;
      if (!(await checkAiRateLimit(req, res))) return;
      const id = parseIntParam(req.params.id);
      const chapterId = parseIntParam(req.params.chapterId);
      if (id === null || chapterId === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const project = await storage.getProjectWithDetails(id);
      if (!project || project.userId !== req.user.claims.sub) {
        return res.status(404).json({ error: "المشروع غير موجود" });
      }
      const chapter = project.chapters.find((ch: any) => ch.id === chapterId);
      if (!chapter || !chapter.content) {
        return res.status(400).json({ error: "الفصل غير موجود أو لم يُكتب بعد" });
      }
      const prompt = buildChapterSummaryPrompt(chapter.title, chapter.content, project.title);
      const completion = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
        max_completion_tokens: 500,
      });
      const summary = completion.choices[0]?.message?.content || "لم يتم إنشاء ملخص";
      await storage.updateChapter(chapterId, { summary });
      await logApiUsage(req.user.claims.sub, "chapter_summary", id);
      res.json({ summary });
    } catch (error) {
      console.error("Error summarizing chapter:", error);
      res.status(500).json({ error: "فشل في تلخيص الفصل" });
    }
  });

  app.get("/api/projects/:id/export/docx", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const docxExportUser = await storage.getUser(req.user.claims.sub);
      if (docxExportUser?.plan === "trial") {
        return res.status(403).json({ error: "التصدير غير متاح في الفترة التجريبية. يرجى الترقية إلى خطة مدفوعة." });
      }
      const project = await storage.getProjectWithDetails(id);
      if (!project || project.userId !== req.user.claims.sub) {
        return res.status(404).json({ error: "المشروع غير موجود" });
      }
      const docxChapterLabel = project.projectType === "essay" ? "القسم" : project.projectType === "scenario" ? "المشهد" : project.projectType === "short_story" ? "المقطع" : project.projectType === "khawater" ? "النص" : project.projectType === "social_media" ? "المحتوى" : project.projectType === "poetry" ? "القصيدة" : project.projectType === "memoire" ? "الفصل" : "الفصل";
      const projectTypeLabel = project.projectType === "essay" ? "مقال" : project.projectType === "scenario" ? "سيناريو" : project.projectType === "short_story" ? "قصة قصيرة" : project.projectType === "khawater" ? "خواطر" : project.projectType === "social_media" ? "محتوى" : project.projectType === "poetry" ? "شعر" : project.projectType === "memoire" ? "مذكرة تخرج" : "رواية";
      const completedChapters = project.chapters
        .filter((ch: any) => ch.status === "completed" && ch.content)
        .sort((a: any, b: any) => (a.chapterNumber || 0) - (b.chapterNumber || 0));
      if (completedChapters.length === 0) {
        return res.status(400).json({ error: "لا توجد فصول مكتملة" });
      }
      const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Header, Footer, PageNumber, BorderStyle } = await import("docx");

      const mainFont = "Sakkal Majalla";
      const accentColor = "8B4513";
      const subtleColor = "6B5B4F";
      const bodyColor = "1A1A1A";
      const decorColor = "C4975A";
      const authorName = (docxExportUser as any)?.displayName || (docxExportUser as any)?.firstName || docxExportUser?.email?.split("@")[0] || "المؤلف";

      const splitBidiRuns = (text: string): { text: string; isRtl: boolean }[] => {
        const segments: { text: string; isRtl: boolean }[] = [];
        const bidiRegex = /([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0621-\u064A\u0660-\u0669]+(?:[\s\u060C\u061B\u061F\u0640]*[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0621-\u064A\u0660-\u0669]+)*)/g;
        let lastIndex = 0;
        let match;
        while ((match = bidiRegex.exec(text)) !== null) {
          if (match.index > lastIndex) {
            const ltrPart = text.slice(lastIndex, match.index);
            if (ltrPart) segments.push({ text: ltrPart, isRtl: false });
          }
          segments.push({ text: match[0], isRtl: true });
          lastIndex = bidiRegex.lastIndex;
        }
        if (lastIndex < text.length) {
          segments.push({ text: text.slice(lastIndex), isRtl: false });
        }
        if (segments.length === 0) {
          const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
          segments.push({ text, isRtl: hasArabic });
        }
        return segments;
      };

      const makeBidiTextRuns = (text: string, options: { bold?: boolean; size: number; color: string; italics?: boolean }): any[] => {
        const segments = splitBidiRuns(text);
        return segments.map(seg => new TextRun({
          text: seg.text,
          bold: options.bold,
          size: options.size,
          font: mainFont,
          rightToLeft: seg.isRtl,
          color: options.color,
          italics: options.italics,
        }));
      };

      const parseFormattedText = (text: string, defaultSize: number, defaultColor: string): any[] => {
        const runs: any[] = [];
        const parts = text.split(/(\*\*[^*]+\*\*)/g);
        for (const part of parts) {
          if (part.startsWith("**") && part.endsWith("**")) {
            runs.push(...makeBidiTextRuns(part.slice(2, -2), { bold: true, size: defaultSize, color: defaultColor }));
          } else if (part.trim()) {
            runs.push(...makeBidiTextRuns(part, { size: defaultSize, color: defaultColor }));
          }
        }
        return runs.length > 0 ? runs : makeBidiTextRuns(text, { size: defaultSize, color: defaultColor });
      };

      const decoratorLine = (spacing?: { before?: number; after?: number }) => new Paragraph({
        alignment: AlignmentType.CENTER,
        bidirectional: true,
        spacing: spacing || { after: 300 },
        children: [
          new TextRun({ text: "✦  ━━━━━━━━━━━━━━━  ✦", color: decorColor, size: 20, font: mainFont }),
        ],
      });

      const docxMemoireFieldMap: Record<string, string> = {
        sciences: "العلوم الطبيعية والتطبيقية",
        humanities: "العلوم الإنسانية والاجتماعية",
        law: "القانون والعلوم القانونية",
        medicine: "الطب والعلوم الصحية",
        engineering: "الهندسة والتكنولوجيا",
        economics: "العلوم الاقتصادية والتجارية وعلوم التسيير",
        education: "علوم التربية والتعليم",
        literature: "الآداب واللغات",
        media: "الإعلام والاتصال",
        computer_science: "الإعلام الآلي وعلوم الحاسوب",
        islamic_studies: "العلوم الإسلامية والشريعة",
        political_science: "العلوم السياسية والعلاقات الدولية",
        psychology: "علم النفس",
        sociology: "علم الاجتماع",
        history: "التاريخ",
        philosophy: "الفلسفة",
        agriculture: "العلوم الزراعية",
        architecture: "الهندسة المعمارية والعمران",
      };

      const isMemoireProject = project.projectType === "memoire";

      const titleSection = isMemoireProject ? (() => {
        const mUniv = (project as any).memoireUniversity || "";
        const mFaculty = (project as any).memoireFaculty || "";
        const mDepartment = (project as any).memoireDepartment || "";
        const mFieldKey = (project as any).memoireField || "";
        const mFieldAr = docxMemoireFieldMap[mFieldKey] || mFieldKey || "";
        const mCountry = (project as any).memoireCountry || "";
        const mMethodology = (project as any).memoireMethodology || "";
        const mCitationStyle = (project as any).memoireCitationStyle || "";
        const mDegreeLevel = (project as any).memoireDegreeLevel || "";
        const academicYear = `${new Date().getFullYear() - 1} / ${new Date().getFullYear()}`;

        const degreeLevelMap: Record<string, string> = {
          licence: "ليسانس / بكالوريوس",
          master: "ماستر / ماجستير",
          doctorate: "دكتوراه",
        };
        const mDegreeLevelAr = degreeLevelMap[mDegreeLevel] || mDegreeLevel || "";

        const methodologyMap: Record<string, string> = {
          descriptive: "المنهج الوصفي",
          analytical: "المنهج التحليلي",
          comparative: "المنهج المقارن",
          historical: "المنهج التاريخي",
          experimental: "المنهج التجريبي",
          survey: "المنهج المسحي",
          case_study: "دراسة حالة",
          inductive: "المنهج الاستقرائي",
          deductive: "المنهج الاستنباطي",
          mixed: "المنهج المختلط",
        };
        const mMethodologyAr = methodologyMap[mMethodology] || mMethodology || "";

        const citationMap: Record<string, string> = {
          apa: "APA",
          mla: "MLA",
          chicago: "شيكاغو",
          harvard: "هارفارد",
          ieee: "IEEE",
          iso690: "ISO 690",
          islamic: "التوثيق الإسلامي",
        };
        const mCitationAr = citationMap[mCitationStyle] || mCitationStyle || "";

        const titleChildren: any[] = [];

        if (mUniv) {
          titleChildren.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { before: 800, after: 200 },
            children: [
              new TextRun({ text: mUniv, bold: true, size: 32, font: mainFont, rightToLeft: true, color: bodyColor }),
            ],
          }));
        }

        if (mFaculty) {
          titleChildren.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { after: 150 },
            children: [
              new TextRun({ text: `كلية: ${mFaculty}`, size: 28, font: mainFont, rightToLeft: true, color: bodyColor }),
            ],
          }));
        }

        if (mDepartment) {
          titleChildren.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { after: 150 },
            children: [
              new TextRun({ text: `قسم: ${mDepartment}`, size: 28, font: mainFont, rightToLeft: true, color: bodyColor }),
            ],
          }));
        }

        if (mFieldAr) {
          titleChildren.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { after: 150 },
            children: [
              new TextRun({ text: `التخصص: ${mFieldAr}`, size: 26, font: mainFont, rightToLeft: true, color: subtleColor }),
            ],
          }));
        }

        titleChildren.push(decoratorLine({ before: 400, after: 400 }));

        titleChildren.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          bidirectional: true,
          spacing: { after: 200 },
          children: [
            new TextRun({ text: "مذكرة تخرج بعنوان", size: 24, font: mainFont, rightToLeft: true, color: subtleColor, italics: true }),
          ],
        }));

        titleChildren.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          bidirectional: true,
          spacing: { after: 400 },
          children: [
            new TextRun({ text: project.title, bold: true, size: 56, font: mainFont, rightToLeft: true, color: accentColor }),
          ],
        }));

        titleChildren.push(decoratorLine({ before: 200, after: 400 }));

        titleChildren.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          bidirectional: true,
          spacing: { after: 200 },
          children: [
            new TextRun({ text: "إعداد الطالب(ة)", size: 22, font: mainFont, rightToLeft: true, color: subtleColor }),
          ],
        }));

        titleChildren.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          bidirectional: true,
          spacing: { after: 400 },
          children: [
            new TextRun({ text: authorName, bold: true, size: 34, font: mainFont, rightToLeft: true, color: bodyColor }),
          ],
        }));

        const metaRows: { label: string; value: string }[] = [];
        if (mMethodologyAr) metaRows.push({ label: "المنهجية", value: mMethodologyAr });
        if (mCitationAr) metaRows.push({ label: "أسلوب التوثيق", value: mCitationAr });
        if (mCountry) metaRows.push({ label: "البلد", value: mCountry });

        if (metaRows.length > 0) {
          for (const row of metaRows) {
            titleChildren.push(new Paragraph({
              alignment: AlignmentType.CENTER,
              bidirectional: true,
              spacing: { after: 120 },
              children: [
                ...makeBidiTextRuns(`${row.label}: `, { size: 24, color: subtleColor }),
                ...makeBidiTextRuns(row.value, { bold: true, size: 24, color: bodyColor }),
              ],
            }));
          }
        }

        titleChildren.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          bidirectional: true,
          spacing: { before: 600, after: 200 },
          children: [
            ...makeBidiTextRuns(`السنة الجامعية: ${academicYear}`, { size: 24, color: subtleColor }),
          ],
        }));

        titleChildren.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          bidirectional: true,
          spacing: { before: 200, after: 200 },
          children: [
            ...makeBidiTextRuns("بمساعدة أبو هاشم — QalamAI", { size: 22, color: subtleColor }),
          ],
        }));

        titleChildren.push(new Paragraph({ spacing: { before: 1000 }, alignment: AlignmentType.CENTER, bidirectional: true, children: [] }));
        titleChildren.push(decoratorLine({ before: 200, after: 200 }));
        titleChildren.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          bidirectional: true,
          children: [
            ...makeBidiTextRuns(`جميع الحقوق محفوظة © ${new Date().getFullYear()} ${authorName}`, { size: 18, color: subtleColor }),
          ],
        }));

        return {
          properties: {
            page: {
              margin: { top: 1800, bottom: 1800, right: 1800, left: 1800 },
            },
          },
          children: titleChildren,
        };
      })() : {
        properties: {
          page: {
            margin: { top: 2160, bottom: 2160, right: 1800, left: 1800 },
          },
        },
        children: [
          new Paragraph({ spacing: { before: 3000 }, alignment: AlignmentType.CENTER, bidirectional: true, children: [] }),
          decoratorLine({ after: 600 }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { after: 300 },
            children: [
              new TextRun({ text: projectTypeLabel, size: 24, font: mainFont, rightToLeft: true, color: subtleColor, italics: true }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { after: 400 },
            children: [
              new TextRun({ text: project.title, bold: true, size: 64, font: mainFont, rightToLeft: true, color: accentColor }),
            ],
          }),
          decoratorLine({ before: 200, after: 600 }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { after: 200 },
            children: [
              new TextRun({ text: "تأليف", size: 22, font: mainFont, rightToLeft: true, color: subtleColor }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { after: 400 },
            children: [
              new TextRun({ text: authorName, bold: true, size: 36, font: mainFont, rightToLeft: true, color: bodyColor }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { before: 600, after: 200 },
            children: [
              ...makeBidiTextRuns("بمساعدة أبو هاشم — QalamAI", { size: 22, color: subtleColor }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { after: 200 },
            children: [
              ...makeBidiTextRuns(new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "long" }), { size: 22, color: subtleColor }),
            ],
          }),
          new Paragraph({ spacing: { before: 2000 }, alignment: AlignmentType.CENTER, bidirectional: true, children: [] }),
          decoratorLine({ before: 200, after: 200 }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            children: [
              ...makeBidiTextRuns(`جميع الحقوق محفوظة © ${new Date().getFullYear()} ${authorName}`, { size: 18, color: subtleColor }),
            ],
          }),
        ],
      };

      const bismillahSection = isMemoireProject ? {
        properties: {
          page: {
            margin: { top: 2160, bottom: 2160, right: 1800, left: 1800 },
          },
        },
        children: [
          new Paragraph({ spacing: { before: 4000 }, alignment: AlignmentType.CENTER, bidirectional: true, children: [] }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { after: 600 },
            children: [
              new TextRun({ text: "بسم الله الرحمن الرحيم", bold: true, size: 56, font: mainFont, rightToLeft: true, color: accentColor }),
            ],
          }),
          decoratorLine({ before: 200, after: 200 }),
        ],
      } : null;

      const tocChildren: any[] = [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          bidirectional: true,
          spacing: { before: 1000, after: 600 },
          children: [
            new TextRun({ text: "المحتويات", bold: true, size: 44, font: mainFont, rightToLeft: true, color: accentColor }),
          ],
        }),
        decoratorLine({ after: 400 }),
      ];

      if (isMemoireProject) {
        tocChildren.push(
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
            spacing: { after: 200 },
            indent: { right: 400 },
            children: [
              new TextRun({ text: "المقدمة العامة", bold: true, size: 26, font: mainFont, rightToLeft: true, color: bodyColor }),
            ],
          }),
        );
      }

      for (const ch of completedChapters) {
        tocChildren.push(
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
            spacing: { after: 200 },
            indent: { right: 400 },
            children: [
              new TextRun({ text: `${docxChapterLabel} ${toArabicOrdinal(ch.chapterNumber)}: `, size: 26, font: mainFont, rightToLeft: true, color: subtleColor }),
              new TextRun({ text: ch.title, bold: true, size: 26, font: mainFont, rightToLeft: true, color: bodyColor }),
            ],
          }),
        );

        if (isMemoireProject) {
          const subSections = extractMemoireSubSections(ch.content || "");
          for (const sub of subSections) {
            const subIndent = sub.type === "matlab" ? 1200 : 800;
            const subSize = sub.type === "matlab" ? 22 : 24;
            tocChildren.push(
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                spacing: { after: 120 },
                indent: { right: subIndent },
                children: [
                  new TextRun({ text: sub.text, size: subSize, font: mainFont, rightToLeft: true, color: subtleColor }),
                ],
              }),
            );
          }
        }
      }

      if (isMemoireProject) {
        tocChildren.push(
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
            spacing: { after: 200 },
            indent: { right: 400 },
            children: [
              new TextRun({ text: "الخاتمة العامة", bold: true, size: 26, font: mainFont, rightToLeft: true, color: bodyColor }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
            spacing: { after: 200 },
            indent: { right: 400 },
            children: [
              new TextRun({ text: "قائمة المراجع", bold: true, size: 26, font: mainFont, rightToLeft: true, color: bodyColor }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
            spacing: { after: 200 },
            indent: { right: 400 },
            children: [
              new TextRun({ text: "الملاحق", bold: true, size: 26, font: mainFont, rightToLeft: true, color: bodyColor }),
            ],
          }),
        );
      }

      if (project.glossary) {
        tocChildren.push(
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
            spacing: { after: 200 },
            indent: { right: 400 },
            children: [
              new TextRun({ text: isMemoireProject ? "الفهرس الأكاديمي" : "المسرد", bold: true, size: 26, font: mainFont, rightToLeft: true, color: bodyColor }),
            ],
          }),
        );
      }

      const tocSection = {
        properties: {
          page: {
            margin: { top: 1800, bottom: 1440, right: 1800, left: 1800 },
          },
        },
        children: tocChildren,
      };

      const contentChildren: any[] = [];
      for (let ci = 0; ci < completedChapters.length; ci++) {
        const ch = completedChapters[ci];
        contentChildren.push(
          new Paragraph({
            pageBreakBefore: true,
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { before: 1200, after: 200 },
            children: [
              new TextRun({ text: `${docxChapterLabel} ${toArabicOrdinal(ch.chapterNumber)}`, size: 24, font: mainFont, rightToLeft: true, color: subtleColor, italics: true }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { after: 300 },
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({ text: ch.title, bold: true, size: 44, font: mainFont, rightToLeft: true, color: accentColor }),
            ],
          }),
          decoratorLine({ after: 500 }),
        );

        const lines = (ch.content || "").split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith("### ")) {
            contentChildren.push(new Paragraph({
              alignment: AlignmentType.RIGHT,
              bidirectional: true,
              spacing: { before: 400, after: 200 },
              heading: HeadingLevel.HEADING_3,
              children: makeBidiTextRuns(trimmed.slice(4), { bold: true, size: 30, color: accentColor }),
            }));
          } else if (trimmed.startsWith("## ")) {
            contentChildren.push(new Paragraph({
              alignment: AlignmentType.RIGHT,
              bidirectional: true,
              spacing: { before: 500, after: 250 },
              heading: HeadingLevel.HEADING_2,
              children: makeBidiTextRuns(trimmed.slice(3), { bold: true, size: 34, color: accentColor }),
            }));
          } else if (trimmed.startsWith("# ")) {
            contentChildren.push(new Paragraph({
              alignment: AlignmentType.RIGHT,
              bidirectional: true,
              spacing: { before: 600, after: 300 },
              heading: HeadingLevel.HEADING_1,
              children: makeBidiTextRuns(trimmed.slice(2), { bold: true, size: 38, color: accentColor }),
            }));
          } else if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
            contentChildren.push(decoratorLine({ before: 300, after: 300 }));
          } else if (isMemoireProject) {
            const headerInfo = isMemoireAcademicHeader(trimmed);
            if (headerInfo) {
              if (headerInfo.type === "mabhath" || headerInfo.type === "intro" || headerInfo.type === "conclusion") {
                contentChildren.push(new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  bidirectional: true,
                  spacing: { before: 500, after: 250 },
                  heading: HeadingLevel.HEADING_2,
                  children: makeBidiTextRuns(headerInfo.text, { bold: true, size: 34, color: accentColor }),
                }));
                contentChildren.push(decoratorLine({ after: 200 }));
              } else if (headerInfo.type === "matlab") {
                contentChildren.push(new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  bidirectional: true,
                  spacing: { before: 400, after: 200 },
                  indent: { right: 400 },
                  heading: HeadingLevel.HEADING_3,
                  children: makeBidiTextRuns(headerInfo.text, { bold: true, size: 30, color: accentColor }),
                }));
              } else if (headerInfo.type === "tamheed" || headerInfo.type === "khulasat") {
                contentChildren.push(new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  bidirectional: true,
                  spacing: { before: 400, after: 200 },
                  heading: HeadingLevel.HEADING_3,
                  children: makeBidiTextRuns(headerInfo.text, { bold: true, size: 30, color: subtleColor, italics: true }),
                }));
              } else {
                contentChildren.push(new Paragraph({
                  alignment: AlignmentType.BOTH,
                  bidirectional: true,
                  spacing: { after: 180, line: 360 },
                  indent: { firstLine: 720 },
                  children: parseFormattedText(trimmed, 28, bodyColor),
                }));
              }
            } else {
              contentChildren.push(new Paragraph({
                alignment: AlignmentType.BOTH,
                bidirectional: true,
                spacing: { after: 180, line: 360 },
                indent: { firstLine: 720 },
                children: parseFormattedText(trimmed, 28, bodyColor),
              }));
            }
          } else {
            contentChildren.push(new Paragraph({
              alignment: AlignmentType.BOTH,
              bidirectional: true,
              spacing: { after: 180, line: 360 },
              indent: { firstLine: 720 },
              children: parseFormattedText(trimmed, 28, bodyColor),
            }));
          }
        }
      }

      if (project.glossary) {
        const docxGlossaryTitle = isMemoireProject ? "الفهرس الأكاديمي" : "المسرد";
        contentChildren.push(
          new Paragraph({
            pageBreakBefore: true,
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { before: 1200, after: 300 },
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({ text: docxGlossaryTitle, bold: true, size: 44, font: mainFont, rightToLeft: true, color: accentColor }),
            ],
          }),
          decoratorLine({ after: 400 }),
        );
        const glossaryLines = project.glossary.split("\n").filter((p: string) => p.trim());
        for (const line of glossaryLines) {
          const trimmed = line.trim();
          if (isMemoireProject && /^(فهرس المحتويات|قائمة المختصرات|فهرس المراجع|مراجع عربية|مراجع أجنبية|مواقع إلكترونية|رسائل جامعية)/.test(trimmed)) {
            contentChildren.push(new Paragraph({
              alignment: AlignmentType.RIGHT,
              bidirectional: true,
              spacing: { before: 400, after: 200 },
              heading: HeadingLevel.HEADING_2,
              children: makeBidiTextRuns(trimmed, { bold: true, size: 32, color: accentColor }),
            }));
            contentChildren.push(decoratorLine({ after: 150 }));
          } else if (trimmed.includes(":") || trimmed.includes("：")) {
            const sepIdx = trimmed.indexOf(":") !== -1 ? trimmed.indexOf(":") : trimmed.indexOf("：");
            const term = trimmed.slice(0, sepIdx).trim();
            const def = trimmed.slice(sepIdx + 1).trim();
            contentChildren.push(new Paragraph({
              alignment: AlignmentType.RIGHT,
              bidirectional: true,
              spacing: { after: 150, line: 360 },
              indent: { right: 200 },
              children: [
                ...makeBidiTextRuns(term, { bold: true, size: 26, color: accentColor }),
                ...makeBidiTextRuns(`: ${def}`, { size: 26, color: bodyColor }),
              ],
            }));
          } else {
            contentChildren.push(new Paragraph({
              alignment: AlignmentType.RIGHT,
              bidirectional: true,
              spacing: { after: 150, line: 360 },
              children: makeBidiTextRuns(trimmed, { size: 26, color: bodyColor }),
            }));
          }
        }
      }

      if (isMemoireProject) {
        const memoireKeywords = (project as any).memoireKeywords || "";
        if (memoireKeywords) {
          contentChildren.push(
            new Paragraph({
              pageBreakBefore: true,
              alignment: AlignmentType.CENTER,
              bidirectional: true,
              spacing: { before: 1200, after: 300 },
              heading: HeadingLevel.HEADING_1,
              children: [
                new TextRun({ text: "الكلمات المفتاحية", bold: true, size: 44, font: mainFont, rightToLeft: true, color: accentColor }),
              ],
            }),
            decoratorLine({ after: 400 }),
          );
          const keywords = memoireKeywords.split(",").map((k: string) => k.trim()).filter((k: string) => k);
          if (keywords.length > 0) {
            contentChildren.push(new Paragraph({
              alignment: AlignmentType.CENTER,
              bidirectional: true,
              spacing: { after: 300, line: 400 },
              children: [
                new TextRun({ text: keywords.join("  ·  "), size: 28, font: mainFont, rightToLeft: true, color: bodyColor }),
              ],
            }));
          }
        }
        const docxHypotheses = (project as any).memoireHypotheses || "";
        if (docxHypotheses) {
          contentChildren.push(
            new Paragraph({
              pageBreakBefore: true,
              alignment: AlignmentType.CENTER,
              bidirectional: true,
              spacing: { before: 1200, after: 300 },
              heading: HeadingLevel.HEADING_1,
              children: [
                new TextRun({ text: "فرضيات البحث", bold: true, size: 44, font: mainFont, rightToLeft: true, color: accentColor }),
              ],
            }),
            decoratorLine({ after: 400 }),
          );
          const hyLines = docxHypotheses.split(/\n+/).map((h: string) => h.trim()).filter(Boolean);
          for (let hi = 0; hi < hyLines.length; hi++) {
            contentChildren.push(new Paragraph({
              alignment: AlignmentType.RIGHT,
              bidirectional: true,
              spacing: { after: 200, line: 360 },
              children: makeBidiTextRuns(`${hi + 1}.  ${hyLines[hi]}`, { size: 26, color: bodyColor }),
            }));
          }
        }
      }

      const contentSection = {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, right: 1600, left: 1600 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                spacing: { after: 100 },
                children: [
                  new TextRun({ text: `${project.title}  —  ${authorName}`, size: 18, font: mainFont, rightToLeft: true, color: subtleColor, italics: true }),
                ],
                border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: decorColor, space: 4 } },
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                border: { top: { style: BorderStyle.SINGLE, size: 1, color: decorColor, space: 4 } },
                children: [
                  new TextRun({ text: "— ", size: 18, font: mainFont, color: subtleColor }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 18, font: mainFont, color: subtleColor }),
                  new TextRun({ text: " —", size: 18, font: mainFont, color: subtleColor }),
                ],
              }),
            ],
          }),
        },
        children: contentChildren,
      };

      const docSections: any[] = [titleSection];
      if (bismillahSection) docSections.push(bismillahSection);
      docSections.push(tocSection, contentSection);

      const doc = new Document({
        creator: authorName,
        title: project.title,
        sections: docSections,
      });

      const buffer = await Packer.toBuffer(doc);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(project.title)}.docx"`);
      res.send(buffer);
    } catch (error) {
      console.error("Error generating DOCX:", error);
      res.status(500).json({ error: "فشل في إنشاء ملف DOCX" });
    }
  });

  const isAdmin = async (req: any, res: any, next: any) => {
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ error: "غير مسجّل الدخول" });
    const user = await storage.getUser(userId);
    if (!user || user.role !== "admin") return res.status(403).json({ error: "غير مصرّح بالوصول" });
    next();
  };

  app.post("/api/chapters/:id/rewrite", isAuthenticated, async (req: any, res) => {
    try {
      if (await checkApiSuspension(req.user.claims.sub, res)) return;
      if (!(await checkAiRateLimit(req, res))) return;
      const chapterId = parseIntParam(req.params.id);
      if (chapterId === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const userId = req.user.claims.sub;
      const { content, tone } = req.body;

      if (!content || typeof content !== "string" || content.trim().length < 10) {
        return res.status(400).json({ error: "النص مطلوب (10 أحرف على الأقل)" });
      }
      if (!tone || typeof tone !== "string") {
        return res.status(400).json({ error: "النبرة مطلوبة" });
      }

      const chapter = await storage.getChapter(chapterId);
      if (!chapter) return res.status(404).json({ error: "الفصل غير موجود" });

      const project = await storage.getProject(chapter.projectId);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      if (project.userId !== userId) return res.status(403).json({ error: "غير مصرّح بالوصول" });

      const { system, user } = buildRewritePrompt(content, tone, project.projectType || "novel");

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_completion_tokens: 8192,
      });
      logApiUsage(userId, chapter.projectId, "rewrite", "gpt-5.2", response);

      const rewrittenContent = response.choices[0]?.message?.content || "";
      if (!rewrittenContent) {
        return res.status(500).json({ error: "فشل في إعادة كتابة النص" });
      }

      res.json({ rewrittenContent });

      dispatchWebhook({
        input: content,
        output: rewrittenContent,
        category: mapProjectTypeToCategory(project.projectType),
        correction: null,
        timestamp: new Date().toISOString(),
        metadata: { session_id: `project-${project.id}`, language: "ar", word_count: countWords(rewrittenContent) },
      });
    } catch (error) {
      console.error("Error rewriting chapter:", error);
      res.status(500).json({ error: "فشل في إعادة كتابة النص" });
    }
  });

  app.post("/api/tickets", async (req: any, res) => {
    try {
      const parsed = createTicketSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: formatZodErrors(parsed.error) });
      }
      const { name, email, subject, message } = parsed.data;
      const userId = req.user?.claims?.sub || null;
      const ticket = await storage.createTicket({
        name: sanitizeText(name).slice(0, 200),
        email: sanitizeText(email).slice(0, 200),
        subject: sanitizeText(subject).slice(0, 200),
        message: sanitizeText(message).slice(0, 5000),
        userId,
      });
      res.status(201).json(ticket);
    } catch (error) {
      console.error("Error creating ticket:", error);
      res.status(500).json({ error: "فشل في إنشاء التذكرة" });
    }
  });

  app.get("/api/tickets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tickets = await storage.getTicketsByUser(userId);
      res.json(tickets);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      res.status(500).json({ error: "فشل في جلب التذاكر" });
    }
  });

  app.get("/api/tickets/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const ticket = await storage.getTicket(id);
      if (!ticket) return res.status(404).json({ error: "التذكرة غير موجودة" });
      if (ticket.userId !== req.user.claims.sub) return res.status(403).json({ error: "غير مصرّح بالوصول" });
      const replies = await storage.getTicketReplies(id);
      res.json({ ...ticket, replies });
    } catch (error) {
      console.error("Error fetching ticket:", error);
      res.status(500).json({ error: "فشل في جلب التذكرة" });
    }
  });

  app.post("/api/tickets/:id/reply", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const ticket = await storage.getTicket(id);
      if (!ticket) return res.status(404).json({ error: "التذكرة غير موجودة" });
      if (ticket.userId !== req.user.claims.sub) return res.status(403).json({ error: "غير مصرّح بالوصول" });
      const { message } = req.body;
      if (!message) return res.status(400).json({ error: "الرسالة مطلوبة" });
      const reply = await storage.createTicketReply({ ticketId: id, userId: req.user.claims.sub, message, isAdmin: false });
      res.status(201).json(reply);
    } catch (error) {
      console.error("Error creating reply:", error);
      res.status(500).json({ error: "فشل في إرسال الرد" });
    }
  });

  app.patch("/api/tickets/:id/resolve", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const ticket = await storage.getTicket(id);
      if (!ticket) return res.status(404).json({ error: "التذكرة غير موجودة" });
      if (ticket.userId !== req.user.claims.sub) return res.status(403).json({ error: "غير مصرّح بالوصول" });
      if (ticket.status === "closed") return res.status(400).json({ error: "التذكرة مغلقة بالفعل" });
      const updated = await storage.updateTicketStatus(id, "resolved");
      res.json(updated);
    } catch (error) {
      console.error("Error resolving ticket:", error);
      res.status(500).json({ error: "فشل في إغلاق التذكرة" });
    }
  });

  app.get("/api/admin/stats", isAuthenticated, isAdmin, async (_req: any, res) => {
    try {
      const stats = await storage.getTicketStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "فشل في جلب الإحصائيات" });
    }
  });

  app.get("/api/admin/tickets", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const status = req.query.status as string | undefined;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;
      const result = await storage.getAllTickets(status, limit, offset);
      res.json({ data: result.data, total: result.total, page, limit });
    } catch (error) {
      console.error("Error fetching tickets:", error);
      res.status(500).json({ error: "فشل في جلب التذاكر" });
    }
  });

  app.get("/api/admin/tickets/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const ticket = await storage.getTicket(id);
      if (!ticket) return res.status(404).json({ error: "التذكرة غير موجودة" });
      const replies = await storage.getTicketReplies(id);
      res.json({ ...ticket, replies });
    } catch (error) {
      console.error("Error fetching ticket:", error);
      res.status(500).json({ error: "فشل في جلب التذكرة" });
    }
  });

  const VALID_STATUSES = ["open", "in_progress", "resolved", "closed"];
  const VALID_PRIORITIES = ["low", "normal", "high", "urgent"];

  app.patch("/api/admin/tickets/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const { status, priority } = req.body;
      if (status && !VALID_STATUSES.includes(status)) return res.status(400).json({ error: "حالة غير صالحة" });
      if (priority && !VALID_PRIORITIES.includes(priority)) return res.status(400).json({ error: "أولوية غير صالحة" });
      let ticket = await storage.getTicket(id);
      if (!ticket) return res.status(404).json({ error: "التذكرة غير موجودة" });
      if (status) ticket = await storage.updateTicketStatus(id, status);
      if (priority) ticket = await storage.updateTicketPriority(id, priority);
      res.json(ticket);
    } catch (error) {
      console.error("Error updating ticket:", error);
      res.status(500).json({ error: "فشل في تحديث التذكرة" });
    }
  });

  app.post("/api/admin/tickets/:id/reply", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const ticket = await storage.getTicket(id);
      if (!ticket) return res.status(404).json({ error: "التذكرة غير موجودة" });
      const { message } = req.body;
      if (!message) return res.status(400).json({ error: "الرسالة مطلوبة" });
      const reply = await storage.createTicketReply({ ticketId: id, userId: req.user.claims.sub, message, isAdmin: true });
      if (ticket.email) {
        sendTicketReplyEmail(ticket.email, ticket.subject, message, id).catch((e) => console.error("Failed to send ticket reply email:", e));
      }
      if (ticket.userId) {
        storage.createNotification({
          userId: ticket.userId,
          type: "ticket_reply",
          title: "رد جديد على تذكرتك",
          message: `تم الرد على تذكرتك "${ticket.subject}".`,
          link: `/tickets/${id}`,
        }).catch((e) => console.warn("Failed to create ticket reply notification:", e));
      }
      res.status(201).json(reply);
    } catch (error) {
      console.error("Error creating reply:", error);
      res.status(500).json({ error: "فشل في إرسال الرد" });
    }
  });

  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;
      const [totalResult] = await db.select({ count: count() }).from(users);
      const usersWithStats = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          displayName: users.displayName,
          bio: users.bio,
          publicProfile: users.publicProfile,
          profileImageUrl: users.profileImageUrl,
          plan: users.plan,
          role: users.role,
          createdAt: users.createdAt,
          trialActive: users.trialActive,
          trialEndsAt: users.trialEndsAt,
          trialChargeStatus: users.trialChargeStatus,
          totalProjects: count(novelProjects.id),
        })
        .from(users)
        .leftJoin(novelProjects, eq(users.id, novelProjects.userId))
        .groupBy(users.id)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

      const data = usersWithStats.map(u => ({
        ...u,
        plan: u.plan || "free",
        totalProjects: Number(u.totalProjects),
      }));
      res.json({ data, total: totalResult?.count || 0, page, limit });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "فشل في جلب المستخدمين" });
    }
  });

  app.get("/api/admin/users/:id/projects", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const projects = await storage.getProjectsByUser(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching user projects:", error);
      res.status(500).json({ error: "فشل في جلب مشاريع المستخدم" });
    }
  });

  app.patch("/api/admin/users/:id/plan", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const { plan } = req.body;
      const validPlans = ["free", "essay", "scenario", "all_in_one"];
      if (!plan || !validPlans.includes(plan)) {
        return res.status(400).json({ error: "خطة غير صالحة" });
      }
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });

      if (plan === "free") {
        const [updated] = await db.update(users).set({
          plan: "free",
          planPurchasedAt: null,
          updatedAt: new Date(),
        }).where(eq(users.id, userId)).returning();
        return res.json(updated);
      }

      const updated = await storage.updateUserPlan(userId, plan);
      const projects = await storage.getProjectsByUser(userId);
      for (const p of projects) {
        if (!p.paid && userPlanCoversType(plan, p.projectType || "novel")) {
          await storage.updateProjectPayment(p.id, true);
        }
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating user plan:", error);
      res.status(500).json({ error: "فشل في تحديث خطة المستخدم" });
    }
  });

  app.post("/api/admin/users/:id/grant-analysis", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const { continuityUses, styleUses, projectId } = req.body;
      const contUses = Math.max(0, Math.min(100, parseInt(continuityUses) || 0));
      const styUses = Math.max(0, Math.min(100, parseInt(styleUses) || 0));
      if (contUses <= 0 && styUses <= 0) {
        return res.status(400).json({ error: "يجب تحديد عدد المحاولات (قيمة موجبة)" });
      }

      const targetUser = await storage.getUser(userId);
      if (!targetUser) return res.status(404).json({ error: "المستخدم غير موجود" });

      if (projectId) {
        const project = await storage.getProject(parseInt(projectId));
        if (!project || project.userId !== userId) {
          return res.status(404).json({ error: "المشروع غير موجود" });
        }
        await storage.grantAnalysisUses(parseInt(projectId), contUses, styUses);
      } else {
        await storage.grantAnalysisUsesForAllProjects(userId, contUses, styUses);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error granting analysis uses:", error);
      res.status(500).json({ error: "فشل في منح المحاولات" });
    }
  });

  app.patch("/api/admin/projects/:id/analysis-counts", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const projectId = parseIntParam(req.params.id);
      if (projectId === null) return res.status(400).json({ error: "معرّف غير صالح" });
      if (isNaN(projectId)) return res.status(400).json({ error: "معرّف المشروع غير صالح" });

      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });

      const { continuityCheckPaidCount, styleAnalysisPaidCount, continuityCheckCount, styleAnalysisCount } = req.body;
      const updates: any = {};

      if (typeof continuityCheckPaidCount === "number") {
        updates.continuityCheckPaidCount = Math.max(0, Math.min(1000, Math.floor(continuityCheckPaidCount)));
      }
      if (typeof styleAnalysisPaidCount === "number") {
        updates.styleAnalysisPaidCount = Math.max(0, Math.min(1000, Math.floor(styleAnalysisPaidCount)));
      }
      if (typeof continuityCheckCount === "number") {
        updates.continuityCheckCount = Math.max(0, Math.min(1000, Math.floor(continuityCheckCount)));
      }
      if (typeof styleAnalysisCount === "number") {
        updates.styleAnalysisCount = Math.max(0, Math.min(1000, Math.floor(styleAnalysisCount)));
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "لا توجد تعديلات" });
      }

      const updated = await storage.updateProject(projectId, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating analysis counts:", error);
      res.status(500).json({ error: "فشل في تحديث عدد المحاولات" });
    }
  });

  app.get("/api/chapters/:id/versions", isAuthenticated, async (req: any, res) => {
    try {
      const chapterId = parseIntParam(req.params.id);
      if (chapterId === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const chapter = await storage.getChapter(chapterId);
      if (!chapter) return res.status(404).json({ error: "الفصل غير موجود" });
      const project = await storage.getProject(chapter.projectId);
      if (!project || project.userId !== req.user.claims.sub) return res.status(403).json({ error: "غير مصرّح بالوصول" });
      const versions = await storage.getChapterVersions(chapterId);
      res.json(versions);
    } catch (error) {
      console.error("Error fetching chapter versions:", error);
      res.status(500).json({ error: "فشل في جلب النسخ" });
    }
  });

  app.post("/api/chapters/:id/versions/:versionId/restore", isAuthenticated, async (req: any, res) => {
    try {
      const chapterId = parseIntParam(req.params.id);
      const versionId = parseIntParam(req.params.versionId);
      if (chapterId === null || versionId === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const chapter = await storage.getChapter(chapterId);
      if (!chapter) return res.status(404).json({ error: "الفصل غير موجود" });
      const project = await storage.getProject(chapter.projectId);
      if (!project || project.userId !== req.user.claims.sub) return res.status(403).json({ error: "غير مصرّح بالوصول" });
      const restored = await storage.restoreChapterVersion(chapterId, versionId);
      res.json(restored);
    } catch (error) {
      console.error("Error restoring version:", error);
      res.status(500).json({ error: "فشل في استعادة النسخة" });
    }
  });

  async function isProjectEligibleForSharing(project: any): Promise<boolean> {
    if (project.paid) return true;
    const chapters = await storage.getChaptersByProject(project.id);
    return chapters.length > 0 && chapters.every((c: any) => c.status === "completed");
  }

  app.post("/api/projects/:id/share", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "غير مصرّح بالوصول" });
      if (!(await isProjectEligibleForSharing(project))) return res.status(400).json({ error: "يجب إتمام الدفع أو إكمال جميع الفصول قبل المشاركة" });
      const crypto = await import("crypto");
      const token = crypto.randomBytes(16).toString("hex");
      const updated = await storage.updateProject(id, { shareToken: token } as any);
      apiCache.invalidate(`user-projects-${req.user.claims.sub}`);
      res.json({ shareToken: updated.shareToken });
    } catch (error) {
      console.error("Error sharing project:", error);
      res.status(500).json({ error: "فشل في مشاركة المشروع" });
    }
  });

  app.delete("/api/projects/:id/share", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "غير مصرّح بالوصول" });
      await storage.updateProject(id, { shareToken: null, publishedToGallery: false, publishedToNews: false } as any);
      apiCache.invalidate("gallery");
      apiCache.invalidate("memoires");
      apiCache.invalidate("essays");
      apiCache.invalidate("leaderboard");
      apiCache.invalidate("essay-of-week");
      apiCache.invalidate(`user-projects-${req.user.claims.sub}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error revoking share:", error);
      res.status(500).json({ error: "فشل في إلغاء المشاركة" });
    }
  });

  app.get("/api/shared/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const project = await storage.getProjectByShareToken(token);
      if (!project) return res.status(404).json({ error: "غير موجود" });
      const details = await storage.getProjectWithDetails(project.id);
      if (!details) return res.status(404).json({ error: "غير موجود" });
      let unlockedIds: number[] = [];
      const userId = (req as any).user?.claims?.sub;
      const isAuthor = userId && userId === project.userId;
      if (userId && !isAuthor) {
        unlockedIds = await storage.getUnlockedChapterIds(userId, project.id);
      }
      const commentCount = await storage.getProjectCommentCount(project.id);
      res.json({
        id: project.id,
        title: details.title,
        mainIdea: details.mainIdea,
        projectType: details.projectType,
        coverImageUrl: details.coverImageUrl,
        seekingBetaReaders: !!details.seekingBetaReaders,
        tags: details.tags || [],
        commentCount,
        chapters: details.chapters
          .filter((ch: any) => ch.content)
          .sort((a: any, b: any) => a.chapterNumber - b.chapterNumber)
          .map((ch: any) => {
            const isPaid = !!ch.isPaid;
            const hasAccess = !isPaid || isAuthor || unlockedIds.includes(ch.id);
            if (isPaid && !hasAccess) {
              const words = (ch.content || "").split(/\s+/);
              const preview = words.slice(0, 200).join(" ");
              return {
                id: ch.id,
                chapterNumber: ch.chapterNumber,
                title: ch.title,
                content: preview + (words.length > 200 ? "..." : ""),
                isPaid: true,
                priceCents: ch.priceCents || 199,
                locked: true,
              };
            }
            return {
              id: ch.id,
              chapterNumber: ch.chapterNumber,
              title: ch.title,
              content: ch.content,
              isPaid,
              priceCents: ch.priceCents || 0,
              locked: false,
            };
          }),
      });
    } catch (error) {
      console.error("Error fetching shared project:", error);
      res.status(500).json({ error: "فشل في جلب المشروع المشترك" });
    }
  });

  app.get("/api/admin/analytics", isAuthenticated, isAdmin, async (_req: any, res) => {
    try {
      const analytics = await storage.getAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: "فشل في جلب التحليلات" });
    }
  });

  // ===== Notification Routes =====
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifs = await storage.getNotificationsByUser(userId);
      res.json(notifs);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "فشل في جلب الإشعارات" });
    }
  });

  app.get("/api/notifications/unread-count", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب العدد" });
    }
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const notifs = await storage.getNotificationsByUser(req.user.claims.sub, 1000);
      const owned = notifs.find(n => n.id === id);
      if (!owned) return res.status(403).json({ error: "غير مصرّح بالوصول" });
      const updated = await storage.markNotificationRead(id);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "فشل في تعيين كمقروء" });
    }
  });

  app.patch("/api/notifications/read-all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.markAllNotificationsRead(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "فشل في تعيين الكل كمقروء" });
    }
  });

  // ===== Promo Code Routes =====
  app.post("/api/promo/validate", async (req: any, res) => {
    try {
      const { code, planType } = req.body;
      if (!code) return res.status(400).json({ error: "الرمز مطلوب" });
      const promo = await storage.getPromoCode(code.toUpperCase());
      if (!promo || !promo.active) return res.status(404).json({ error: "رمز غير صالح" });
      if (promo.validUntil && new Date(promo.validUntil) < new Date()) return res.status(400).json({ error: "انتهت صلاحية الرمز" });
      if (promo.maxUses && promo.usedCount >= promo.maxUses) return res.status(400).json({ error: "تم استخدام الرمز بالكامل" });
      if (promo.applicableTo !== "all" && planType && planType !== "" && promo.applicableTo !== planType) return res.status(400).json({ error: "الرمز غير قابل للتطبيق على هذه الخطة" });
      res.json({ valid: true, discountPercent: promo.discountPercent, code: promo.code, applicableTo: promo.applicableTo });
    } catch (error) {
      res.status(500).json({ error: "فشل في التحقق من العرض" });
    }
  });

  app.get("/api/admin/promos", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;
      const result = await storage.getAllPromoCodes(limit, offset);
      res.json({ data: result.data, total: result.total, page, limit });
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب العروض" });
    }
  });

  app.post("/api/admin/promos", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { code, discountPercent, maxUses, validUntil, applicableTo } = req.body;
      if (!code || !discountPercent) return res.status(400).json({ error: "الرمز والنسبة مطلوبان" });
      const promo = await storage.createPromoCode({
        code: code.toUpperCase(),
        discountPercent: parseInt(discountPercent),
        maxUses: maxUses ? parseInt(maxUses) : undefined,
        validUntil: validUntil ? new Date(validUntil) : undefined,
        applicableTo: applicableTo || "all",
      });
      res.status(201).json(promo);
    } catch (error) {
      res.status(500).json({ error: "فشل في إنشاء العرض" });
    }
  });

  app.patch("/api/admin/promos/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const { discountPercent, maxUses, validUntil, applicableTo, active } = req.body;
      const updateData: any = {};
      if (discountPercent !== undefined) updateData.discountPercent = parseInt(discountPercent);
      if (maxUses !== undefined) updateData.maxUses = maxUses ? parseInt(maxUses) : null;
      if (validUntil !== undefined) updateData.validUntil = validUntil ? new Date(validUntil) : null;
      if (applicableTo !== undefined) updateData.applicableTo = applicableTo;
      if (active !== undefined) updateData.active = active;
      const promo = await storage.updatePromoCode(id, updateData);
      res.json(promo);
    } catch (error) {
      res.status(500).json({ error: "فشل في تحديث العرض" });
    }
  });

  app.delete("/api/admin/promos/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      await storage.deletePromoCode(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "فشل في حذف العرض" });
    }
  });

  // ===== Reading Progress & Bookmarks =====
  app.put("/api/projects/:id/progress", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = parseIntParam(req.params.id);
      if (projectId === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const { lastChapterId, scrollPosition } = req.body;
      const progress = await storage.upsertReadingProgress(userId, projectId, lastChapterId, scrollPosition);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ error: "فشل في حفظ التقدم" });
    }
  });

  app.get("/api/projects/:id/progress", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = parseIntParam(req.params.id);
      if (projectId === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const progress = await storage.getReadingProgress(userId, projectId);
      res.json(progress || null);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب التقدم" });
    }
  });

  app.patch("/api/reading-progress", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { projectId, chapterId, percentComplete } = req.body;
      if (!projectId || typeof projectId !== "number") return res.status(400).json({ error: "معرّف المشروع مطلوب" });
      if (chapterId && typeof chapterId !== "number") return res.status(400).json({ error: "معرّف الفصل غير صالح" });
      const scrollPos = typeof percentComplete === "number" ? Math.min(100, Math.max(0, Math.round(percentComplete))) : undefined;
      const result = await storage.upsertReadingProgress(userId, projectId, chapterId || undefined, scrollPos);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "فشل في تحديث التقدم" });
    }
  });

  app.get("/api/reading-progress", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
      const reads = await storage.getUserInProgressReads(userId, limit);
      res.json(reads);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب قائمة القراءة" });
    }
  });

  app.get("/api/public/trending", async (_req, res) => {
    try {
      const trending = await storage.getTrendingProjects(6);
      res.json(trending);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب الأعمال الرائجة" });
    }
  });

  app.get("/api/projects/:id/similar", async (req, res) => {
    try {
      const projectId = parseIntParam(req.params.id);
      if (!projectId) return res.status(400).json({ error: "معرّف غير صالح" });
      const similar = await storage.getSimilarProjects(projectId, 4);
      res.json(similar);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب الأعمال المشابهة" });
    }
  });

  app.post("/api/projects/:id/bookmarks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = parseIntParam(req.params.id);
      if (projectId === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const { chapterId, note } = req.body;
      if (!chapterId) return res.status(400).json({ error: "معرّف الفصل مطلوب" });
      const bookmark = await storage.createBookmark({ userId, projectId, chapterId, note });
      res.status(201).json(bookmark);
    } catch (error) {
      res.status(500).json({ error: "فشل في إنشاء الإشارة المرجعية" });
    }
  });

  app.get("/api/projects/:id/bookmarks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = parseIntParam(req.params.id);
      if (projectId === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const bmarks = await storage.getBookmarksByProject(userId, projectId);
      res.json(bmarks);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب الإشارات المرجعية" });
    }
  });

  app.delete("/api/bookmarks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const userId = req.user.claims.sub;
      const allBookmarks = await db.select().from(bookmarks).where(eq(bookmarks.id, id));
      if (!allBookmarks.length || allBookmarks[0].userId !== userId) {
        return res.status(403).json({ error: "غير مصرّح بالوصول" });
      }
      await storage.deleteBookmark(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "فشل في حذف الإشارة المرجعية" });
    }
  });

  // ===== Author Profiles & Gallery =====
  app.get("/api/authors/:id", async (req, res) => {
    try {
      const userId = req.params.id;
      const data = await storage.getPublicAuthor(userId);
      if (!data) return res.status(404).json({ error: "المؤلف غير موجود" });
      const ratingData = await storage.getAuthorAverageRating(userId);
      const followerCount = await storage.getAuthorFollowerCount(userId);

      const { pool } = await import("./db");
      const challengeResult = await pool.query(
        `SELECT ce.id as entry_id, ce.challenge_id, ce.created_at as entry_date,
                wc.title as challenge_title, wc.start_date, wc.end_date,
                wc.winner_id, wc.winner_entry_id
         FROM challenge_entries ce
         JOIN writing_challenges wc ON ce.challenge_id = wc.id
         WHERE ce.user_id = $1
         ORDER BY wc.end_date DESC`,
        [userId]
      );
      const challenges = challengeResult.rows.map((r: any) => ({
        challengeId: r.challenge_id,
        challengeTitle: r.challenge_title,
        entryDate: r.entry_date,
        startDate: r.start_date,
        endDate: r.end_date,
        isWinner: r.winner_entry_id === r.entry_id,
      }));

      const betaResult = await pool.query(
        `SELECT COUNT(*)::int as count FROM novel_projects WHERE user_id = $1 AND seeking_beta_readers = true AND share_token IS NOT NULL`,
        [userId]
      );
      const seekingBetaReaders = (betaResult.rows[0]?.count || 0) > 0;

      res.json({
        id: data.user.id,
        displayName: data.user.displayName || `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim(),
        bio: data.user.bio,
        profileImageUrl: data.user.profileImageUrl,
        averageRating: ratingData.average,
        ratingCount: ratingData.count,
        verified: (data.user as any).verified || false,
        followerCount,
        socialProfiles: (data.user as any).socialProfiles || null,
        country: (data.user as any).country || null,
        challenges,
        seekingBetaReaders,
        projects: data.projects.map(p => ({
          id: p.id,
          title: p.title,
          projectType: p.projectType,
          coverImageUrl: p.coverImageUrl,
          shareToken: p.shareToken,
          mainIdea: p.mainIdea?.slice(0, 200),
        })),
      });
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب بيانات المؤلف" });
    }
  });

  app.post("/api/authors/:id/rate", async (req, res) => {
    try {
      const authorId = req.params.id;
      const { rating } = req.body;
      if (!rating || typeof rating !== "number" || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
        return res.status(400).json({ error: "التقييم يجب أن يكون رقماً صحيحاً بين ١ و ٥" });
      }
      const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.ip || "unknown";
      const hashedIp = crypto.createHash("sha256").update(ip + authorId).digest("hex");
      await storage.rateAuthor(authorId, hashedIp, rating);
      const ratingData = await storage.getAuthorAverageRating(authorId);
      notifyUser(authorId, "rating", "تقييم جديد", `حصلت على تقييم جديد (${rating} نجوم)`, `/author/${authorId}`);
      res.json(ratingData);
    } catch (error) {
      res.status(500).json({ error: "فشل في حفظ التقييم" });
    }
  });

  app.get("/api/authors/:id/rating", async (req, res) => {
    try {
      const ratingData = await storage.getAuthorAverageRating(req.params.id);
      res.json(ratingData);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب التقييم" });
    }
  });

  app.get("/api/gallery", async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 24));
    const tag = ((req.query.tag as string) || "").trim();
    const betaFilter = req.query.beta === "true";
    const authorId = ((req.query.authorId as string) || "").trim();
    const validTypes = ["novel", "essay", "scenario", "short_story", "khawater", "social_media", "poetry", "memoire"];
    const projectType = validTypes.includes(req.query.type as string) ? (req.query.type as string) : "";
    const cacheKey = `gallery_p${page}_l${limit}${tag ? `_tag_${tag}` : ''}${betaFilter ? '_beta' : ''}${authorId ? `_author_${authorId}` : ''}${projectType ? `_type_${projectType}` : ''}`;
    serveCached(req, res, cacheKey, 120, async () => {
      if (betaFilter || authorId) {
        const { pool } = await import("./db");
        const offset = (page - 1) * limit;
        const conditions: string[] = [
          `p.share_token IS NOT NULL`,
          `p.published_to_gallery = true`,
          `(p.flagged = false OR p.flagged IS NULL)`,
        ];
        const countParams: any[] = [];
        let paramIdx = 1;
        if (betaFilter) {
          conditions.push(`p.seeking_beta_readers = true`);
        }
        if (authorId) {
          conditions.push(`p.user_id = $${paramIdx}`);
          countParams.push(authorId);
          paramIdx++;
        }
        if (tag) {
          conditions.push(`$${paramIdx} = ANY(p.tags)`);
          countParams.push(tag);
          paramIdx++;
        }
        if (projectType) {
          conditions.push(`p.project_type = $${paramIdx}`);
          countParams.push(projectType);
          paramIdx++;
        }
        const whereClause = conditions.join(' AND ');
        const countQuery = `SELECT COUNT(*)::int as total FROM novel_projects p WHERE ${whereClause}`;
        const countResult = await pool.query(countQuery, countParams);
        const total = countResult.rows[0]?.total || 0;

        const dataParams = [...countParams, limit, offset];
        const limitIdx = paramIdx;
        const offsetIdx = paramIdx + 1;
        const dataQuery = `SELECT
            p.id, p.title, p.project_type as "projectType",
            p.cover_image_url as "coverImageUrl", p.share_token as "shareToken",
            LEFT(p.main_idea, 300) as "mainIdea",
            COALESCE(u.display_name, CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')), 'كاتب مجهول') as "authorName",
            COALESCE(u.id, p.user_id) as "authorId",
            COALESCE(ar_avg.avg_rating, 0)::float as "authorAverageRating",
            COALESCE(u.verified, false) as "authorIsVerified",
            p.tags,
            COALESCE(p.seeking_beta_readers, false) as "seekingBetaReaders",
            (SELECT COUNT(*)::int FROM project_comments pc WHERE pc.project_id = p.id AND pc.approved = true) as "commentCount"
          FROM novel_projects p
          LEFT JOIN users u ON u.id = p.user_id
          LEFT JOIN (SELECT author_id, ROUND(AVG(rating)::numeric, 1)::float as avg_rating FROM author_ratings GROUP BY author_id) ar_avg ON ar_avg.author_id = p.user_id
          WHERE ${whereClause}
          ORDER BY COALESCE(u.verified, false) DESC, "authorAverageRating" DESC, p.updated_at DESC
          LIMIT $${limitIdx} OFFSET $${offsetIdx}`;
        const dataResult = await pool.query(dataQuery, dataParams);
        return {
          data: dataResult.rows.map((r: any) => ({
            ...r,
            authorName: r.authorName?.trim() || 'كاتب مجهول',
          })),
          total,
          page,
          limit,
        };
      }
      let result;
      if (tag) {
        result = await storage.getGalleryProjectsByTag(tag, page, limit, projectType || undefined);
      } else {
        result = await storage.getGalleryProjectsPaginated(page, limit, projectType || undefined);
      }
      return {
        data: result.rows.map(p => ({
          id: p.id,
          title: p.title,
          projectType: p.projectType,
          coverImageUrl: p.coverImageUrl,
          shareToken: p.shareToken,
          mainIdea: p.mainIdea?.slice(0, 200),
          authorName: p.authorName,
          authorId: p.authorId,
          authorAverageRating: p.authorAverageRating,
          authorIsVerified: (p as any).authorIsVerified ?? false,
          tags: (p as any).tags || [],
          seekingBetaReaders: (p as any).seekingBetaReaders || false,
          challengeWinId: (p as any).challengeWinId || null,
          challengeWinTitle: (p as any).challengeWinTitle || null,
          commentCount: (p as any).commentCount || 0,
        })),
        total: result.total,
        page,
        limit,
      };
    });
  });

  app.get("/api/search", async (req, res) => {
    try {
      const q = ((req.query.q as string) || "").trim().substring(0, 200);
      if (!q || q.length < 2) {
        return res.json({ projects: [], authors: [], series: [], total: 0 });
      }

      const validTypes = ["all", "projects", "authors", "series", "prompts", "challenges"];
      const type = validTypes.includes(req.query.type as string) ? (req.query.type as string) : "all";
      const category = (req.query.category as string) || "";
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(30, Math.max(1, parseInt(req.query.limit as string) || 12));
      const offset = (page - 1) * limit;
      const isShort = q.length < 3;
      const likeParam = `%${q}%`;

      const validCategories = ["novel", "essay", "scenario", "short_story", "khawater", "social_media", "poetry", "memoire"];
      const categoryFilter = validCategories.includes(category) ? category : "";

      function safeTsQuery(input: string): string {
        return input.replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, " ").trim().split(/\s+/).filter(Boolean).join(" & ");
      }

      const { pool } = await import("./db");

      let projects: any[] = [];
      let projectTotal = 0;
      let authors: any[] = [];
      let authorTotal = 0;
      let series: any[] = [];
      let seriesTotal = 0;
      let prompts: any[] = [];
      let promptTotal = 0;
      let challenges: any[] = [];
      let challengeTotal = 0;

      if (type === "all" || type === "projects") {
        const tsq = safeTsQuery(q);
        const categoryClause = categoryFilter ? ` AND np.project_type = '${categoryFilter}'` : "";
        const categoryClauseNoAlias = categoryFilter ? ` AND project_type = '${categoryFilter}'` : "";

        if (isShort || !tsq) {
          const projectQuery = `SELECT np.id, np.title, np.main_idea, np.cover_image_url, np.share_token, np.project_type, np.user_id,
                    COALESCE(u.display_name, u.first_name, '') as author_name
             FROM novel_projects np
             LEFT JOIN users u ON np.user_id = u.id
             WHERE (np.published_to_gallery = true OR np.published_to_news = true)
               AND (np.title ILIKE $1 OR np.main_idea ILIKE $1)${categoryClause}
             ORDER BY np.created_at DESC
             LIMIT $2 OFFSET $3`;
          const projectResult = await pool.query(projectQuery, [likeParam, limit, offset]);
          projects = projectResult.rows;

          const countResult = await pool.query(
            `SELECT COUNT(*) FROM novel_projects WHERE (published_to_gallery = true OR published_to_news = true) AND (title ILIKE $1 OR main_idea ILIKE $1)${categoryClauseNoAlias}`,
            [likeParam]
          );
          projectTotal = parseInt(countResult.rows[0]?.count || "0");
        } else {
          const projectQuery = `SELECT np.id, np.title, np.main_idea, np.cover_image_url, np.share_token, np.project_type, np.user_id,
                    COALESCE(u.display_name, u.first_name, '') as author_name,
                    ts_rank(np.search_tsv, to_tsquery('simple', $1)) as rank
             FROM novel_projects np
             LEFT JOIN users u ON np.user_id = u.id
             WHERE (np.published_to_gallery = true OR np.published_to_news = true)
               AND (np.search_tsv @@ to_tsquery('simple', $1) OR np.title ILIKE $4)${categoryClause}
             ORDER BY rank DESC NULLS LAST, np.created_at DESC
             LIMIT $2 OFFSET $3`;
          const projectResult = await pool.query(projectQuery, [tsq, limit, offset, likeParam]);
          projects = projectResult.rows;

          const countResult = await pool.query(
            `SELECT COUNT(*) FROM novel_projects WHERE (published_to_gallery = true OR published_to_news = true)
               AND (search_tsv @@ to_tsquery('simple', $1) OR title ILIKE $2)${categoryClauseNoAlias}`,
            [tsq, likeParam]
          );
          projectTotal = parseInt(countResult.rows[0]?.count || "0");
        }
      }

      if (type === "all" || type === "authors") {
        const tsq = safeTsQuery(q);

        if (isShort || !tsq) {
          const authorQuery = `SELECT id, display_name, first_name, last_name, profile_image_url, verified, country
             FROM users
             WHERE (display_name IS NOT NULL AND display_name != '')
               AND (display_name ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1)
             LIMIT $2 OFFSET $3`;
          const authorResult = await pool.query(authorQuery, [likeParam, limit, offset]);
          authors = authorResult.rows.map((u: any) => ({
            id: u.id,
            displayName: u.display_name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || "",
            profileImageUrl: u.profile_image_url,
            verified: u.verified || false,
            country: u.country,
          }));

          const authorCountResult = await pool.query(
            `SELECT COUNT(*) FROM users WHERE (display_name IS NOT NULL AND display_name != '') AND (display_name ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1)`,
            [likeParam]
          );
          authorTotal = parseInt(authorCountResult.rows[0]?.count || "0");
        } else {
          const authorQuery = `SELECT id, display_name, first_name, last_name, profile_image_url, verified, country,
                    ts_rank(search_tsv, to_tsquery('simple', $1)) as rank
             FROM users
             WHERE (display_name IS NOT NULL AND display_name != '')
               AND (search_tsv @@ to_tsquery('simple', $1)
                   OR display_name ILIKE $4 OR first_name ILIKE $4 OR last_name ILIKE $4)
             ORDER BY rank DESC NULLS LAST
             LIMIT $2 OFFSET $3`;
          const authorResult = await pool.query(authorQuery, [tsq, limit, offset, likeParam]);
          authors = authorResult.rows.map((u: any) => ({
            id: u.id,
            displayName: u.display_name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || "",
            profileImageUrl: u.profile_image_url,
            verified: u.verified || false,
            country: u.country,
          }));

          const authorCountResult = await pool.query(
            `SELECT COUNT(*) FROM users WHERE (display_name IS NOT NULL AND display_name != '') AND (search_tsv @@ to_tsquery('simple', $1) OR display_name ILIKE $2 OR first_name ILIKE $2 OR last_name ILIKE $2)`,
            [tsq, likeParam]
          );
          authorTotal = parseInt(authorCountResult.rows[0]?.count || "0");
        }
      }

      if (type === "all" || type === "series") {
        const tsq = safeTsQuery(q);

        if (isShort || !tsq) {
          const seriesQuery = `SELECT cs.id, cs.title, cs.description, cs.user_id,
                                      COALESCE(u.display_name, u.first_name, '') as author_name
                               FROM content_series cs
                               LEFT JOIN users u ON cs.user_id = u.id
                               WHERE cs.title ILIKE $1 OR cs.description ILIKE $1
                               ORDER BY cs.created_at DESC
                               LIMIT $2 OFFSET $3`;
          const seriesResult = await pool.query(seriesQuery, [likeParam, limit, offset]);
          series = seriesResult.rows;

          const seriesCountResult = await pool.query(
            `SELECT COUNT(*) FROM content_series WHERE title ILIKE $1 OR description ILIKE $1`,
            [likeParam]
          );
          seriesTotal = parseInt(seriesCountResult.rows[0]?.count || "0");
        } else {
          const seriesQuery = `SELECT cs.id, cs.title, cs.description, cs.user_id,
                                      COALESCE(u.display_name, u.first_name, '') as author_name,
                                      ts_rank(cs.search_tsv, to_tsquery('simple', $1)) as rank
                               FROM content_series cs
                               LEFT JOIN users u ON cs.user_id = u.id
                               WHERE cs.search_tsv @@ to_tsquery('simple', $1) OR cs.title ILIKE $4
                               ORDER BY rank DESC NULLS LAST, cs.created_at DESC
                               LIMIT $2 OFFSET $3`;
          const seriesResult = await pool.query(seriesQuery, [tsq, limit, offset, likeParam]);
          series = seriesResult.rows;

          const seriesCountResult = await pool.query(
            `SELECT COUNT(*) FROM content_series WHERE search_tsv @@ to_tsquery('simple', $1) OR title ILIKE $2`,
            [tsq, likeParam]
          );
          seriesTotal = parseInt(seriesCountResult.rows[0]?.count || "0");
        }
      }

      if (type === "all" || type === "prompts") {
        const promptQuery = `SELECT dpe.id, dpe.content, dpe.created_at,
                                    dp.prompt_text, dp.prompt_date,
                                    COALESCE(u.display_name, u.first_name, '') as author_name,
                                    u.id as author_id, u.profile_image_url as author_image
                             FROM daily_prompt_entries dpe
                             JOIN daily_prompts dp ON dpe.prompt_id = dp.id
                             LEFT JOIN users u ON dpe.user_id = u.id
                             WHERE dpe.content ILIKE $1 OR dp.prompt_text ILIKE $1
                             ORDER BY dpe.created_at DESC
                             LIMIT $2 OFFSET $3`;
        const promptResult = await pool.query(promptQuery, [likeParam, limit, offset]);
        prompts = promptResult.rows;

        const promptCountResult = await pool.query(
          `SELECT COUNT(*) FROM daily_prompt_entries dpe JOIN daily_prompts dp ON dpe.prompt_id = dp.id WHERE dpe.content ILIKE $1 OR dp.prompt_text ILIKE $1`,
          [likeParam]
        );
        promptTotal = parseInt(promptCountResult.rows[0]?.count || "0");
      }

      if (type === "all" || type === "challenges") {
        const challengeQuery = `SELECT wc.id, wc.title, wc.description, wc.theme, wc.start_date, wc.end_date,
                                       wc.winner_id,
                                       (SELECT COUNT(*)::int FROM challenge_entries WHERE challenge_id = wc.id) as entry_count,
                                       CASE WHEN wc.end_date < NOW() THEN 'ended' ELSE 'active' END as status
                                FROM writing_challenges wc
                                WHERE wc.title ILIKE $1 OR wc.description ILIKE $1
                                ORDER BY wc.end_date DESC
                                LIMIT $2 OFFSET $3`;
        const challengeResult = await pool.query(challengeQuery, [likeParam, limit, offset]);
        challenges = challengeResult.rows;

        const challengeCountResult = await pool.query(
          `SELECT COUNT(*) FROM writing_challenges WHERE title ILIKE $1 OR description ILIKE $1`,
          [likeParam]
        );
        challengeTotal = parseInt(challengeCountResult.rows[0]?.count || "0");
      }

      res.json({
        projects,
        authors,
        series,
        prompts,
        challenges,
        total: projectTotal + authorTotal + seriesTotal + promptTotal + challengeTotal,
        projectTotal,
        authorTotal,
        seriesTotal,
        promptTotal,
        challengeTotal,
        page,
        limit,
      });
    } catch (error: any) {
      console.error("Search error:", error);
      res.status(500).json({ error: "خطأ في البحث" });
    }
  });

  app.get("/api/public/memoires", async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 24));
    const cacheKey = `memoires_p${page}_l${limit}`;
    serveCached(req, res, cacheKey, 120, async () => {
      const result = await storage.getGalleryProjectsPaginated(page, limit, "memoire");
      return {
        data: result.rows.map(p => ({
          id: p.id,
          title: p.title,
          coverImageUrl: p.coverImageUrl,
          shareToken: p.shareToken,
          mainIdea: p.mainIdea?.slice(0, 300),
          authorName: p.authorName,
          authorId: p.authorId,
          authorAverageRating: p.authorAverageRating,
          authorIsVerified: (p as any).authorIsVerified ?? false,
          memoireUniversity: p.memoireUniversity,
          memoireCountry: p.memoireCountry,
          memoireField: p.memoireField,
          memoireDegreeLevel: p.memoireDegreeLevel,
          memoireMethodology: p.memoireMethodology,
          memoireCitationStyle: p.memoireCitationStyle,
          memoireKeywords: p.memoireKeywords,
        })),
        total: result.total,
        page,
        limit,
      };
    });
  });

  app.get("/api/public/essays", async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 24));
    const search = ((req.query.q as string) || "").trim().substring(0, 200);
    const cacheKey = `essays_p${page}_l${limit}${search ? `_q_${search}` : ''}`;
    serveCached(req, res, cacheKey, 120, async () => {
      const result = await storage.getPublishedEssaysWithStats(page, limit, search || undefined);
      return {
        data: result.rows,
        total: result.total,
        page,
        limit,
      };
    });
  });

  app.post("/api/public/essays/:id/view", async (req, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const visitorIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
      const referrer = req.headers.referer || null;
      const rawCountry = ((req.headers["cf-ipcountry"] as string) || "").toUpperCase().slice(0, 2);
      const country = /^[A-Z]{2}$/.test(rawCountry) && rawCountry !== "XX" && rawCountry !== "T1" ? rawCountry : null;
      await storage.recordEssayView(id, visitorIp, referrer as string | undefined, country);
      res.json({ success: true });
      // Fire milestone notification asynchronously (non-blocking)
      const VIEW_MILESTONES = [10, 50, 100, 500, 1000, 5000];
      storage.getEssayViewCount(id).then(async (viewCount) => {
        if (!VIEW_MILESTONES.includes(viewCount)) return;
        const project = await storage.getProject(id);
        if (!project?.userId) return;
        const author = await storage.getUser(project.userId);
        if (!author?.email || (author as any).notifyOnViews === false) return;
        const name = author.displayName || author.firstName || "كاتب";
        sendViewMilestoneNotification(author.email, name, project.title, viewCount).catch(() => {});
      }).catch(() => {});
    } catch (error) {
      res.status(500).json({ error: "فشل في تسجيل المشاهدة" });
    }
  });

  app.post("/api/public/essays/:id/click", async (req, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const visitorIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
      await storage.recordEssayClick(id, visitorIp);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "فشل في تسجيل النقرة" });
    }
  });

  app.post("/api/projects/:id/publish-to-news", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = parseIntParam(req.params.id);
      if (projectId === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) return res.status(403).json({ error: "غير مصرح" });
      if (project.projectType !== "essay") return res.status(400).json({ error: "هذا الخيار متاح للمقالات فقط" });
      if (!project.shareToken) return res.status(400).json({ error: "يجب مشاركة المقال أولاً" });
      if (!(await isProjectEligibleForSharing(project))) return res.status(400).json({ error: "يجب إتمام الدفع أو إكمال جميع الفصول قبل النشر" });
      await storage.updateProject(projectId, { publishedToNews: true } as any);
      apiCache.invalidate("essays");
      apiCache.invalidate("leaderboard");
      apiCache.invalidate("essay-of-week");
      apiCache.invalidate(`user-projects-${userId}`);
      res.json({ success: true });
      // Fire follower + email-subscriber notifications asynchronously (non-blocking)
      (async () => {
        try {
          const author = await storage.getUser(userId);
          const authorName = author?.displayName || author?.firstName || "كاتب";
          const baseUrl = process.env.REPLIT_DEPLOYMENT_URL ? `https://${process.env.REPLIT_DEPLOYMENT_URL}` : (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://qalamai.net");
          const essayUrl = `${baseUrl}/essay/${project.shareToken}`;
          // Platform followers
          const followers = await storage.getFollowerEmails(userId);
          for (const f of followers) {
            await sendNewPublicationEmail(f.email, f.displayName, authorName, project.title, essayUrl);
          }
          // Non-platform email subscribers — include leaderboard rank
          const emailSubs = await storage.getEmailSubscribersForAuthor(userId);
          if (emailSubs.length > 0) {
            let leaderboardRank: number | null = null;
            try {
              const lb: any[] = (await db.execute(dsql`
                SELECT rank FROM (
                  SELECT u.id, RANK() OVER (ORDER BY COALESCE(SUM(ev.view_count), 0) DESC) AS rank
                  FROM users u
                  LEFT JOIN (SELECT project_id, COUNT(*)::int as view_count FROM essay_views GROUP BY project_id) ev ON ev.project_id IN (SELECT id FROM novel_projects WHERE user_id = u.id)
                  GROUP BY u.id
                ) ranked WHERE ranked.id = ${userId}
              `)).rows;
              if (lb.length > 0) leaderboardRank = lb[0].rank;
            } catch {}
            const subTokens: any[] = (await db.execute(dsql`SELECT email, token FROM email_subscriptions WHERE author_id = ${userId}`)).rows;
            const tokenMap = new Map(subTokens.map(r => [r.email, r.token]));
            for (const sub of emailSubs) {
              const tok = tokenMap.get(sub.email);
              if (tok) await sendEmailSubscriberPublication(sub.email, authorName, userId, project.title, essayUrl, leaderboardRank, tok);
            }
          }
        } catch (e) {
          console.error("[Followers] Failed to send publication emails:", e);
        }
      })();
    } catch (error) {
      res.status(500).json({ error: "حدث خطأ" });
    }
  });

  app.delete("/api/projects/:id/publish-to-news", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = parseIntParam(req.params.id);
      if (projectId === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) return res.status(403).json({ error: "غير مصرح" });
      if (project.projectType !== "essay") return res.status(400).json({ error: "هذا الخيار متاح للمقالات فقط" });
      await storage.updateProject(projectId, { publishedToNews: false } as any);
      apiCache.invalidate("essays");
      apiCache.invalidate("leaderboard");
      apiCache.invalidate("essay-of-week");
      apiCache.invalidate(`user-projects-${userId}`);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "حدث خطأ" });
    }
  });

  app.post("/api/projects/:id/publish-to-gallery", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = parseIntParam(req.params.id);
      if (projectId === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) return res.status(403).json({ error: "غير مصرح" });
      if (!project.shareToken) return res.status(400).json({ error: "يجب مشاركة المشروع أولاً" });
      if (!(await isProjectEligibleForSharing(project))) return res.status(400).json({ error: "يجب إتمام الدفع أو إكمال جميع الفصول قبل النشر" });
      await storage.updateProject(projectId, { publishedToGallery: true } as any);
      apiCache.invalidate("gallery");
      apiCache.invalidate("memoires");
      apiCache.invalidate("essays");
      apiCache.invalidate("leaderboard");
      apiCache.invalidate("essay-of-week");
      apiCache.invalidate(`user-projects-${userId}`);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "حدث خطأ" });
    }
  });

  app.delete("/api/projects/:id/publish-to-gallery", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = parseIntParam(req.params.id);
      if (projectId === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) return res.status(403).json({ error: "غير مصرح" });
      await storage.updateProject(projectId, { publishedToGallery: false } as any);
      apiCache.invalidate("gallery");
      apiCache.invalidate("memoires");
      apiCache.invalidate("essays");
      apiCache.invalidate("leaderboard");
      apiCache.invalidate("essay-of-week");
      apiCache.invalidate(`user-projects-${userId}`);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "حدث خطأ" });
    }
  });

  app.post("/api/public/essays/:id/react", async (req, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const project = await storage.getProject(id);
      if (!project || project.projectType !== "essay" || !project.publishedToNews || !project.shareToken) {
        return res.status(404).json({ error: "غير موجود" });
      }
      const { reactionType } = req.body;
      if (!["like", "love", "insightful", "thoughtful"].includes(reactionType)) {
        return res.status(400).json({ error: "نوع التفاعل غير صالح" });
      }
      const visitorIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
      await storage.upsertEssayReaction(id, visitorIp, reactionType);
      const counts = await storage.getEssayReactionCounts(id);
      res.json(counts);
    } catch (error) {
      res.status(500).json({ error: "فشل في تسجيل التفاعل" });
    }
  });

  app.get("/api/public/essays/:id/reactions", async (req, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const project = await storage.getProject(id);
      if (!project || project.projectType !== "essay" || !project.publishedToNews || !project.shareToken) {
        return res.status(404).json({ error: "غير موجود" });
      }
      const counts = await storage.getEssayReactionCounts(id);
      res.json(counts);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب التفاعلات" });
    }
  });

  app.get("/api/public/essays/:id/related", async (req, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const project = await storage.getProject(id);
      if (!project || project.projectType !== "essay") return res.status(404).json({ error: "غير موجود" });
      const allPublished = await storage.getPublishedEssays();
      const others = allPublished.filter((p: any) => p.id !== id);
      let related = others.filter((p: any) => p.subject && p.subject === project.subject);
      if (related.length < 3) {
        const remaining = others.filter((p: any) => !related.some((r: any) => r.id === p.id));
        related = [...related, ...remaining].slice(0, 3);
      } else {
        related = related.slice(0, 3);
      }
      const result = await Promise.all(related.map(async (p: any) => {
        const [user] = await db.select().from(users).where(eq(users.id, p.userId));
        const chapters = await storage.getChaptersByProject(p.id);
        const totalWords = chapters.reduce((sum: number, ch: any) => sum + (ch.content ? ch.content.split(/\s+/).length : 0), 0);
        return {
          id: p.id,
          title: p.title,
          shareToken: p.shareToken,
          coverImageUrl: p.coverImageUrl,
          authorName: user?.displayName || user?.firstName || user?.email || "مؤلف",
          totalWords,
        };
      }));
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب المقالات ذات الصلة" });
    }
  });

  // Platform stats — public
  app.get("/api/public/stats", async (_req, res) => {
    try {
      const cacheKey = "platform-stats";
      serveCached(_req, res, cacheKey, 3600, async () => storage.getPlatformStats());
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب إحصاءات المنصة" });
    }
  });

  // Single essay public page by shareToken (SEO)
  app.get("/api/public/essay/:shareToken", async (req, res) => {
    try {
      const { shareToken } = req.params;
      if (!shareToken) return res.status(400).json({ error: "رمز المشاركة مطلوب" });
      const essay = await storage.getPublicEssayByShareToken(shareToken);
      if (!essay) return res.status(404).json({ error: "المقال غير موجود" });
      res.json(essay);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب المقال" });
    }
  });

  // Follow / Unfollow author
  app.post("/api/follow/:authorId", isAuthenticated, async (req: any, res) => {
    try {
      const followerId = req.user.claims.sub;
      const { authorId } = req.params;
      if (followerId === authorId) return res.status(400).json({ error: "لا يمكنك متابعة نفسك" });
      await storage.followAuthor(followerId, authorId);
      const count = await storage.getAuthorFollowerCount(authorId);
      res.json({ success: true, followers: count });
      const followerUser = await storage.getUser(followerId);
      const followerName = followerUser?.displayName || followerUser?.firstName || "أحد المستخدمين";
      notifyUser(authorId, "follow", "متابع جديد", `${followerName} بدأ بمتابعتك`, `/author/${followerId}`);
    } catch (error) {
      res.status(500).json({ error: "فشل في متابعة الكاتب" });
    }
  });

  app.delete("/api/follow/:authorId", isAuthenticated, async (req: any, res) => {
    try {
      const followerId = req.user.claims.sub;
      const { authorId } = req.params;
      await storage.unfollowAuthor(followerId, authorId);
      const count = await storage.getAuthorFollowerCount(authorId);
      res.json({ success: true, followers: count });
    } catch (error) {
      res.status(500).json({ error: "فشل في إلغاء متابعة الكاتب" });
    }
  });

  app.get("/api/following", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const list = await storage.getFollowingList(userId);
      res.json(list);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب قائمة المتابَعين" });
    }
  });

  // Check follow status for a specific author
  app.get("/api/follow/:authorId/status", isAuthenticated, async (req: any, res) => {
    try {
      const followerId = req.user.claims.sub;
      const { authorId } = req.params;
      const following = await storage.isFollowing(followerId, authorId);
      const count = await storage.getAuthorFollowerCount(authorId);
      res.json({ following, followers: count });
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب حالة المتابعة" });
    }
  });

  // Admin: toggle verified badge
  app.patch("/api/admin/users/:id/verify", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { verified } = req.body;
      if (typeof verified !== "boolean") return res.status(400).json({ error: "قيمة verified يجب أن تكون boolean" });
      const user = await storage.setUserVerified(id, verified);
      res.json({ success: true, user });
    } catch (error) {
      res.status(500).json({ error: "فشل في تحديث حالة التوثيق" });
    }
  });

  app.get("/api/admin/essay-analytics", isAuthenticated, isAdmin, async (_req: any, res) => {
    try {
      const analytics = await storage.getEssayAnalytics();
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب تحليلات المقال" });
    }
  });

  app.get("/api/admin/memoire-analytics", isAuthenticated, isAdmin, async (_req: any, res) => {
    try {
      const analytics = await storage.getMemoireAnalytics();
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب تحليلات المذكرات" });
    }
  });

  // ===== Profile Extended Update =====
  app.patch("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { firstName, lastName, bio, displayName, publicProfile, onboardingCompleted, socialProfiles, country } = req.body;
      const countryVal = country === null || country === "" || country === "none" ? null : (country ?? undefined);
      const updated = await storage.updateUserProfileExtended(userId, { firstName, lastName, bio, displayName, publicProfile, onboardingCompleted, socialProfiles: socialProfiles ?? undefined, country: countryVal });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "فشل في تحديث الملف الشخصي" });
    }
  });

  app.post("/api/profile/avatar", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { image } = req.body;
      if (!image || typeof image !== "string") {
        return res.status(400).json({ error: "صورة غير صالحة" });
      }
      const match = image.match(/^data:image\/(png|jpeg|jpg|webp);base64,/);
      if (!match) {
        return res.status(400).json({ error: "صيغة الصورة غير مدعومة. استخدم PNG أو JPEG أو WebP" });
      }
      const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, "");
      const sizeBytes = Buffer.byteLength(base64Data, "base64");
      if (sizeBytes > 2 * 1024 * 1024) {
        return res.status(400).json({ error: "حجم الصورة يتجاوز 2 ميغابايت" });
      }
      const updated = await storage.updateUserProfileExtended(userId, { profileImageUrl: image });
      res.json({ profileImageUrl: updated.profileImageUrl });
    } catch (error) {
      res.status(500).json({ error: "فشل في تحديث الصورة الشخصية" });
    }
  });

  app.post("/api/profile/generate-avatar", isAuthenticated, async (req: any, res) => {
    try {
      if (await checkApiSuspension(req.user.claims.sub, res)) return;
      if (!(await checkAiRateLimit(req, res))) return;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });

      const { style } = req.body;
      const validStyles = ["classic", "modern", "calligraphy", "watercolor"];
      const selectedStyleKey = validStyles.includes(style) ? style : "classic";
      const userBio = (user.bio || "").slice(0, 200);

      const styleDescriptions: Record<string, string> = {
        classic: "classical oil painting style portrait with warm golden tones, reminiscent of Renaissance masters, elegant and timeless",
        modern: "modern digital art portrait with clean lines, vibrant colors, and contemporary aesthetic, professional and sleek",
        calligraphy: "portrait incorporating Arabic calligraphy elements and Islamic geometric patterns as decorative frame, elegant ink-wash style",
        watercolor: "soft watercolor portrait with gentle flowing colors, artistic and dreamy atmosphere, delicate brushstrokes",
      };

      const selectedStyle = styleDescriptions[selectedStyleKey];

      const prompt = `Create a professional author profile avatar portrait. Style: ${selectedStyle}. The portrait should depict an Arab author/writer persona - sophisticated, intellectual, and creative. Include subtle literary elements like a quill pen, books, or manuscript pages in the background. The portrait should be suitable as a profile picture with the subject centered. ${userBio ? `The author describes themselves as: ${userBio}` : ""} Make it artistic and unique, NOT a photograph. Square format, centered composition.`;

      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt,
        size: "1024x1024",
      });
      logImageUsage(userId, 0, "profile_avatar");

      const base64 = response.data[0]?.b64_json;
      if (!base64) return res.status(500).json({ error: "فشل في إنشاء الصورة الشخصية" });

      const profileImageUrl = `data:image/png;base64,${base64}`;
      await storage.updateUserProfileExtended(userId, { profileImageUrl });
      res.json({ profileImageUrl });
    } catch (error) {
      console.error("Error generating avatar:", error);
      res.status(500).json({ error: "فشل في إنشاء الصورة الشخصية" });
    }
  });

  // ===== Content Moderation (Admin) =====
  app.get("/api/admin/projects/:id/content", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const details = await storage.getProjectWithDetails(id);
      if (!details) return res.status(404).json({ error: "المشروع غير موجود" });
      const { chapters: chaps, characters: chars, relationships: rels, ...projectData } = details;
      res.json({ project: projectData, chapters: chaps, characters: chars, relationships: rels });
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب محتوى المشروع" });
    }
  });

  app.patch("/api/admin/projects/:id/flag", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const { flagged, flagReason } = req.body;
      const updated = await storage.updateProject(id, { flagged: !!flagged, flagReason: flagReason || null } as any);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "فشل في الإبلاغ عن المشروع" });
    }
  });

  // ===== Bulk User Management (Admin) =====
  app.get("/api/admin/users/export", isAuthenticated, isAdmin, async (_req: any, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const rows = [["ID", "الاسم", "البريد", "الخطة", "الدور", "تاريخ التسجيل"].join(",")];
      for (const u of allUsers) {
        const name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
        const projectCount = await storage.getUserProjectCount(u.id);
        rows.push([u.id, `"${name}"`, u.email || '', u.plan || 'free', u.role || 'user', u.createdAt?.toISOString() || ''].join(","));
      }
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=users.csv");
      res.send("\uFEFF" + rows.join("\n"));
    } catch (error) {
      res.status(500).json({ error: "فشل في تصدير المستخدمين" });
    }
  });

  app.patch("/api/admin/users/bulk-plan", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userIds, plan } = req.body;
      const validPlans = ["free", "essay", "scenario", "all_in_one"];
      if (!Array.isArray(userIds) || !plan || !validPlans.includes(plan)) {
        return res.status(400).json({ error: "بيانات غير صالحة" });
      }
      for (const userId of userIds) {
        await storage.updateUserPlan(userId, plan);
        if (plan !== "free") {
          const projects = await storage.getProjectsByUser(userId);
          for (const p of projects) {
            if (!p.paid && userPlanCoversType(plan, p.projectType || "novel")) {
              await storage.updateProjectPayment(p.id, true);
            }
          }
        }
      }
      res.json({ success: true, updated: userIds.length });
    } catch (error) {
      res.status(500).json({ error: "فشل في تحديث الخطط" });
    }
  });

  // ===== Admin API Usage Endpoints =====
  app.get("/api/admin/api-usage", isAuthenticated, isAdmin, async (_req: any, res) => {
    try {
      const data = await storage.getAggregatedApiUsage();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب بيانات استخدام الواجهة" });
    }
  });

  app.get("/api/admin/api-usage/:userId", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const logs = await storage.getUserApiUsageLogs(req.params.userId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب سجلّات المستخدم" });
    }
  });

  app.patch("/api/admin/users/:id/suspend-api", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { suspended } = req.body;
      if (typeof suspended !== "boolean") {
        return res.status(400).json({ error: "قيمة التعليق يجب أن تكون صح أو خطأ" });
      }
      const user = await storage.setUserApiSuspended(req.params.id, suspended);
      res.json({ success: true, apiSuspended: user.apiSuspended });
    } catch (error) {
      res.status(500).json({ error: "فشل في تحديث حالة التعليق" });
    }
  });

  app.patch("/api/admin/users/:id/profile", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { firstName, lastName, displayName, bio, publicProfile } = req.body;
      const updateData: any = {};
      if (typeof firstName === "string") updateData.firstName = firstName;
      if (typeof lastName === "string") updateData.lastName = lastName;
      if (typeof displayName === "string") updateData.displayName = displayName;
      if (typeof bio === "string") updateData.bio = bio;
      if (typeof publicProfile === "boolean") updateData.publicProfile = publicProfile;
      const updated = await storage.updateUserProfileExtended(req.params.id, updateData);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "فشل في تحديث بيانات المستخدم" });
    }
  });

  // ===== Originality Check =====
  app.post("/api/chapters/:id/originality-check", isAuthenticated, async (req: any, res) => {
    try {
      if (await checkApiSuspension(req.user.claims.sub, res)) return;
      if (!(await checkAiRateLimit(req, res))) return;
      const chapterId = parseIntParam(req.params.id);
      if (chapterId === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const userId = req.user.claims.sub;
      const chapter = await storage.getChapter(chapterId);
      if (!chapter) return res.status(404).json({ error: "الفصل غير موجود" });
      const project = await storage.getProject(chapter.projectId);
      if (!project || project.userId !== userId) return res.status(403).json({ error: "غير مصرّح بالوصول" });
      if (!chapter.content) return res.status(400).json({ error: "لا يوجد محتوى للفحص" });

      const { system, user: userMsg } = buildOriginalityCheckPrompt(chapter.content);
      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
        max_completion_tokens: 4096,
      });
      logApiUsage(userId, chapter.projectId, "originality_check", "gpt-5.2", response);

      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const result = JSON.parse(jsonMatch[0]);
          return res.json(result);
        } catch (parseErr) {
          console.warn("Failed to parse originality check JSON response:", parseErr);
        }
      }
      res.json({ score: 0, analysis: content, flaggedPhrases: [] });
    } catch (error) {
      console.error("Error checking originality:", error);
      res.status(500).json({ error: "فشل في فحص الأصالة" });
    }
  });

  // ===== Enhance from Originality =====
  app.post("/api/chapters/:id/enhance-from-originality", isAuthenticated, async (req: any, res) => {
    try {
      if (await checkApiSuspension(req.user.claims.sub, res)) return;
      if (!(await checkAiRateLimit(req, res))) return;
      const chapterId = parseIntParam(req.params.id);
      if (chapterId === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const userId = req.user.claims.sub;
      const { suggestions, flaggedPhrases } = req.body;

      if (!Array.isArray(suggestions) || !Array.isArray(flaggedPhrases)) {
        return res.status(400).json({ error: "الاقتراحات والعبارات المُعلَّمة يجب أن تكون مصفوفات" });
      }
      const cleanSuggestions = suggestions.filter((s: any) => typeof s === "string").slice(0, 20);
      const cleanFlagged = flaggedPhrases.filter((s: any) => typeof s === "string").slice(0, 20);

      const chapter = await storage.getChapter(chapterId);
      if (!chapter) return res.status(404).json({ error: "الفصل غير موجود" });
      const project = await storage.getProject(chapter.projectId);
      if (!project || project.userId !== userId) return res.status(403).json({ error: "غير مصرّح بالوصول" });
      if (!chapter.content) return res.status(400).json({ error: "لا يوجد محتوى للتحسين" });

      await storage.saveChapterVersion(chapterId, chapter.content, "before_enhance");

      const { system, user } = buildOriginalityEnhancePrompt(
        chapter.content,
        cleanSuggestions,
        cleanFlagged,
        project.projectType || "novel"
      );

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_completion_tokens: 8192,
      });
      logApiUsage(userId, chapter.projectId, "originality_enhance", "gpt-5.2", response);

      const enhancedContent = response.choices[0]?.message?.content || "";
      if (!enhancedContent) {
        return res.status(500).json({ error: "فشل في تحسين النص" });
      }

      await storage.updateChapter(chapterId, { content: enhancedContent });
      await storage.saveChapterVersion(chapterId, enhancedContent, "originality_enhance");

      res.json({ content: enhancedContent });
    } catch (error) {
      console.error("Error enhancing from originality:", error);
      res.status(500).json({ error: "فشل في تحسين النص" });
    }
  });

  // ===== Editorial Review (project-scoped) =====
  app.get("/api/editorial-review/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = await checkEditorialReviewLimit(userId);
      res.json({ used: result.used, limit: result.limit, remaining: Math.max(0, result.limit - result.used), unlimited: result.limit >= 999 });
    } catch {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.post("/api/projects/:id/editorial-review", isAuthenticated, async (req: any, res) => {
    try {
      if (await checkApiSuspension(req.user.claims.sub, res)) return;
      const userId = req.user.claims.sub;
      const editorialLimit = await checkEditorialReviewLimit(userId);
      if (!editorialLimit.allowed) {
        return res.status(402).json({
          error: `استنفدت الاستخدامات المجانية للمراجعة التحريرية (${EDITORIAL_FREE_LIMIT} مراجعات). ترقَّ للخطة المدفوعة للاستخدام غير المحدود.`,
          needsUpgrade: true,
          used: editorialLimit.used,
          limit: editorialLimit.limit,
        });
      }
      if (!(await checkAiRateLimit(req, res))) return;
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const project = await storage.getProject(id);
      if (!project || project.userId !== userId) return res.status(403).json({ error: "غير مصرّح بالوصول" });

      const { text } = req.body;
      if (!text || typeof text !== "string" || text.trim().length < 20) {
        return res.status(400).json({ error: "يرجى إدخال نص لا يقل عن 20 حرفاً" });
      }

      const trimmedText = text.trim();
      const { system, user: userMsg } = buildEditorialReviewPrompt(trimmedText, project.projectType || "novel");

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      if (trimmedText.length > 15000) {
        res.write(`data: ${JSON.stringify({ content: "⚠️ تم اقتصاص النص إلى أول ~5000 كلمة للمراجعة.\n\n" })}\n\n`);
      }

      const stream = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
        stream: true,
        max_completion_tokens: 8192,
      });

      let fullContent = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullContent += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      const estTokens = Math.ceil(fullContent.length / 3);
      logApiUsage(userId, id, "editorial_review", "gpt-5.2", { usage: { prompt_tokens: 2000, completion_tokens: estTokens, total_tokens: 2000 + estTokens } });

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error in project editorial review:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "فشل في المراجعة التحريرية" });
      } else {
        res.write(`data: ${JSON.stringify({ error: "فشل في المراجعة التحريرية" })}\n\n`);
        res.end();
      }
    }
  });

  // ===== Editorial Review (standalone) =====
  app.post("/api/editorial-review", isAuthenticated, async (req: any, res) => {
    try {
      if (await checkApiSuspension(req.user.claims.sub, res)) return;
      const userId = req.user.claims.sub;
      const editorialLimit = await checkEditorialReviewLimit(userId);
      if (!editorialLimit.allowed) {
        return res.status(402).json({
          error: `استنفدت الاستخدامات المجانية للمراجعة التحريرية (${EDITORIAL_FREE_LIMIT} مراجعات). ترقَّ للخطة المدفوعة للاستخدام غير المحدود.`,
          needsUpgrade: true,
          used: editorialLimit.used,
          limit: editorialLimit.limit,
        });
      }
      if (!(await checkAiRateLimit(req, res))) return;

      const { text, projectType } = req.body;
      if (!text || typeof text !== "string" || text.trim().length < 20) {
        return res.status(400).json({ error: "يرجى إدخال نص لا يقل عن 20 حرفاً" });
      }
      const validTypes = ["novel", "essay", "scenario", "short_story", "khawater", "social_media", "poetry", "memoire"];
      const pType = validTypes.includes(projectType) ? projectType : "novel";

      const trimmedText = text.trim();
      const { system, user: userMsg } = buildEditorialReviewPrompt(trimmedText, pType);

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      if (trimmedText.length > 15000) {
        res.write(`data: ${JSON.stringify({ content: "⚠️ تم اقتصاص النص إلى أول ~5000 كلمة للمراجعة.\n\n" })}\n\n`);
      }

      const stream = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
        stream: true,
        max_completion_tokens: 8192,
      });

      let fullContent = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullContent += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      const estTokens = Math.ceil(fullContent.length / 3);
      logApiUsage(userId, null, "editorial_review", "gpt-5.2", { usage: { prompt_tokens: 2000, completion_tokens: estTokens, total_tokens: 2000 + estTokens } });

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error in standalone editorial review:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "فشل في المراجعة التحريرية" });
      } else {
        res.write(`data: ${JSON.stringify({ error: "فشل في المراجعة التحريرية" })}\n\n`);
        res.end();
      }
    }
  });

  // ===== Glossary Generation =====
  app.post("/api/projects/:id/generate-glossary", isAuthenticated, async (req: any, res) => {
    try {
      if (await checkApiSuspension(req.user.claims.sub, res)) return;
      if (!(await checkAiRateLimit(req, res))) return;
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const userId = req.user.claims.sub;
      const project = await storage.getProjectWithDetails(id);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      if (project.userId !== userId) return res.status(403).json({ error: "غير مصرّح بالوصول" });

      const allContent = project.chapters
        .filter((ch: any) => ch.content)
        .sort((a: any, b: any) => a.chapterNumber - b.chapterNumber)
        .map((ch: any) => {
          const glossaryLabel = project.projectType === "essay" ? "القسم" : project.projectType === "scenario" ? "المشهد" : project.projectType === "short_story" ? "المقطع" : project.projectType === "khawater" ? "النص" : project.projectType === "social_media" ? "المحتوى" : project.projectType === "poetry" ? "القصيدة" : project.projectType === "memoire" ? "الفصل" : "الفصل";
          return `${glossaryLabel} ${toArabicOrdinal(ch.chapterNumber)}: ${ch.title}\n${ch.content}`;
        })
        .join("\n\n---\n\n");

      if (!allContent) return res.status(400).json({ error: "لا يوجد محتوى لإنشاء الفهرس" });

      const { system, user } = project.projectType === "memoire"
        ? buildMemoireGlossaryPrompt(
            allContent,
            project.title,
            project.chapters
              .filter((ch: any) => ch.content)
              .sort((a: any, b: any) => a.chapterNumber - b.chapterNumber)
              .map((ch: any) => ({ chapterNumber: ch.chapterNumber, title: ch.title }))
          )
        : buildGlossaryPrompt(allContent, project.title, project.projectType || "novel");
      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_completion_tokens: 8192,
      });
      logApiUsage(req.user.claims.sub, id, "glossary", "gpt-5.2", response);

      const glossaryContent = response.choices[0]?.message?.content || "";
      await storage.updateProject(id, { glossary: glossaryContent } as any);
      res.json({ glossary: glossaryContent });
    } catch (error) {
      console.error("Error generating glossary:", error);
      res.status(500).json({ error: "فشل في إنشاء الفهرس" });
    }
  });

  // ===== Continuity Check =====
  app.post("/api/projects/:id/continuity-check", isAuthenticated, async (req: any, res) => {
    try {
      if (await checkApiSuspension(req.user.claims.sub, res)) return;
      if (!(await checkAiRateLimit(req, res))) return;
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const userId = req.user.claims.sub;
      const project = await storage.getProjectWithDetails(id);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      if (project.userId !== userId) return res.status(403).json({ error: "غير مصرّح بالوصول" });

      const contUser = await storage.getUser(userId);
      if (contUser?.plan === "trial" && contUser.trialActive) {
        if (isTrialExpired(contUser.trialEndsAt)) {
          return res.status(403).json({ error: "انتهت الفترة التجريبية" });
        }
        if ((project.continuityCheckCount || 0) >= TRIAL_MAX_CONTINUITY) {
          return res.status(403).json({ error: "الفترة التجريبية تسمح بفحص استمرارية واحد فقط" });
        }
      }

      const remaining = getRemainingAnalysisUses(project.continuityCheckCount || 0, project.continuityCheckPaidCount || 0);
      if (remaining <= 0) {
        return res.status(402).json({ error: "استنفدت الاستخدامات المجانية لفحص الاستمرارية. يمكنك فتح ٣ استخدامات إضافية مقابل ٥٩.٩٩ دولار.", needsPayment: true, feature: "continuity" });
      }

      const completedChapters = project.chapters
        .filter((ch: any) => ch.content && ch.status === "completed")
        .sort((a: any, b: any) => a.chapterNumber - b.chapterNumber);

      if (completedChapters.length < 2) return res.status(400).json({ error: "يجب أن يكون هناك فصلان مكتملان على الأقل لإجراء فحص الاستمرارية" });

      const chapterLabel = project.projectType === "essay" ? "القسم" : project.projectType === "scenario" ? "المشهد" : project.projectType === "short_story" ? "المقطع" : project.projectType === "khawater" ? "النص" : project.projectType === "social_media" ? "المحتوى" : project.projectType === "poetry" ? "القصيدة" : project.projectType === "memoire" ? "الفصل" : "الفصل";

      const allContent = completedChapters
        .map((ch: any) => `${chapterLabel} ${ch.chapterNumber}: ${ch.title}\n${ch.content?.substring(0, 3000)}`)
        .join("\n\n---\n\n");

      const chars = await storage.getCharactersByProject(id);
      const charNames = chars.map(c => c.name).join("، ");

      const systemPrompt = `أنت أبو هاشم — محرر أدبي خبير متخصص في مراجعة استمرارية النصوص العربية.
مهمتك فحص الفصول المكتملة والبحث عن أي تناقضات أو مشاكل في الاستمرارية السردية.

أجب بصيغة JSON فقط بالشكل التالي:
{
  "overallScore": (رقم من 1 إلى 10 — 10 = استمرارية ممتازة),
  "issues": [
    {
      "type": "character|timeline|setting|plot|tone",
      "severity": "high|medium|low",
      "chapter": (رقم الفصل),
      "description": "وصف المشكلة بالعربية",
      "suggestion": "اقتراح الحل بالعربية"
    }
  ],
  "strengths": ["نقطة قوة 1", "نقطة قوة 2"],
  "summary": "ملخص شامل للتقييم بالعربية"
}`;

      const userPrompt = `الشخصيات في هذا العمل: ${charNames || "غير محددة"}

محتوى الفصول:
${allContent}

افحص الاستمرارية بين الفصول وابحث عن:
1. تناقضات في أسماء الشخصيات أو صفاتها
2. تناقضات في الخط الزمني
3. تناقضات في وصف الأماكن والمواقع
4. خيوط سردية مفتوحة لم تُعالج
5. تغييرات غير مبررة في شخصيات الأبطال
6. تناقضات في النبرة أو الأسلوب السردي

أجب بصيغة JSON فقط.`;

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_completion_tokens: 4000,
        response_format: { type: "json_object" },
      });
      logApiUsage(userId, id, "continuity_check", "gpt-5.2", response);

      const resultText = response.choices[0]?.message?.content || "{}";
      try {
        const result = JSON.parse(resultText);
        if (result.issues) {
          result.issues = result.issues.map((issue: any) => ({ ...issue, resolved: false }));
        }
        await storage.updateProject(id, { continuityCheckResult: JSON.stringify(result), continuityCheckCount: (project.continuityCheckCount || 0) + 1 } as any);
        res.json(result);
      } catch {
        const fallback = { overallScore: 0, issues: [], strengths: [], summary: resultText };
        await storage.updateProject(id, { continuityCheckResult: JSON.stringify(fallback), continuityCheckCount: (project.continuityCheckCount || 0) + 1 } as any);
        res.json(fallback);
      }
    } catch (error) {
      console.error("Error running continuity check:", error);
      res.status(500).json({ error: "فشل في فحص الاستمرارية" });
    }
  });

  // ===== Resolve Continuity Issue =====
  app.post("/api/projects/:id/resolve-continuity-issue", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const userId = req.user.claims.sub;
      const { issueIndex } = req.body;

      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      if (project.userId !== userId) return res.status(403).json({ error: "غير مصرّح بالوصول" });

      if (!project.continuityCheckResult) {
        return res.status(400).json({ error: "لا توجد نتائج فحص محفوظة" });
      }

      const result = JSON.parse(project.continuityCheckResult);
      if (!result.issues || typeof issueIndex !== "number" || issueIndex < 0 || issueIndex >= result.issues.length) {
        return res.status(400).json({ error: "رقم المشكلة غير صالح" });
      }

      result.issues[issueIndex].resolved = true;
      await storage.updateProject(id, { continuityCheckResult: JSON.stringify(result) });
      res.json(result);
    } catch (error) {
      console.error("Error resolving continuity issue:", error);
      res.status(500).json({ error: "فشل في تحديث حالة المشكلة" });
    }
  });

  // ===== Batch Resolve Continuity Issues =====
  app.post("/api/projects/:id/resolve-continuity-issues-batch", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const userId = req.user.claims.sub;
      const { issueIndices } = req.body;

      if (!Array.isArray(issueIndices) || issueIndices.length === 0) {
        return res.status(400).json({ error: "أرقام المشاكل مطلوبة" });
      }

      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      if (project.userId !== userId) return res.status(403).json({ error: "غير مصرّح بالوصول" });

      if (!project.continuityCheckResult) {
        return res.status(400).json({ error: "لا توجد نتائج فحص محفوظة" });
      }

      const result = JSON.parse(project.continuityCheckResult);
      if (!result.issues) {
        return res.status(400).json({ error: "لا توجد مشاكل" });
      }

      for (const idx of issueIndices) {
        if (typeof idx === "number" && idx >= 0 && idx < result.issues.length) {
          result.issues[idx].resolved = true;
        }
      }

      await storage.updateProject(id, { continuityCheckResult: JSON.stringify(result) });
      res.json(result);
    } catch (error) {
      console.error("Error batch resolving continuity issues:", error);
      res.status(500).json({ error: "فشل في تحديث حالة المشاكل" });
    }
  });

  // ===== Fix Continuity Issue =====
  app.post("/api/chapters/:id/fix-continuity", isAuthenticated, async (req: any, res) => {
    try {
      if (await checkApiSuspension(req.user.claims.sub, res)) return;
      if (!(await checkAiRateLimit(req, res))) return;
      const chapterId = parseIntParam(req.params.id);
      if (chapterId === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const userId = req.user.claims.sub;
      const { issue } = req.body;

      if (!issue || !issue.description || typeof issue.description !== "string") {
        return res.status(400).json({ error: "بيانات المشكلة مطلوبة" });
      }
      const validTypes = ["character", "timeline", "setting", "plot", "tone"];
      const validSeverities = ["high", "medium", "low"];
      if (issue.type && !validTypes.includes(issue.type)) issue.type = "";
      if (issue.severity && !validSeverities.includes(issue.severity)) issue.severity = "medium";
      if (issue.chapter && typeof issue.chapter !== "number") issue.chapter = parseInt(issue.chapter) || null;

      const chapter = await storage.getChapter(chapterId);
      if (!chapter) return res.status(404).json({ error: "الفصل غير موجود" });
      const project = await storage.getProject(chapter.projectId);
      if (!project || project.userId !== userId) return res.status(403).json({ error: "غير مصرّح بالوصول" });
      if (!chapter.content) return res.status(400).json({ error: "لا يوجد محتوى للإصلاح" });

      const allChapters = await storage.getChaptersByProject(chapter.projectId);
      const sortedChapters = allChapters
        .filter((ch: any) => ch.content && ch.id !== chapterId)
        .sort((a: any, b: any) => a.chapterNumber - b.chapterNumber);

      const contextChapters = sortedChapters
        .map((ch: any) => `الفصل ${ch.chapterNumber} - ${ch.title}:\n${ch.content!.substring(0, 600)}`)
        .join("\n---\n");

      const chapterLabel = project.projectType === "essay" ? "القسم" : project.projectType === "scenario" ? "المشهد" : project.projectType === "short_story" ? "المقطع" : project.projectType === "khawater" ? "النص" : project.projectType === "social_media" ? "المحتوى" : project.projectType === "poetry" ? "القصيدة" : project.projectType === "memoire" ? "الفصل" : "الفصل";

      const typeMap: Record<string, string> = {
        character: "تناقض في الشخصية", timeline: "تناقض في الخط الزمني",
        setting: "تناقض في المكان", plot: "فجوة في الحبكة", tone: "تغير في النبرة"
      };
      const issueTypeAr = typeMap[issue.type] || issue.type || "مشكلة";

      const systemPrompt = `أنت أبو هاشم — محرر أدبي متخصص في إصلاح مشاكل الاستمرارية في النصوص العربية.
مهمتك: إصلاح مشكلة محددة في نص ${chapterLabel} مع الحفاظ على بقية النص كما هو تمامًا.

قواعد صارمة:
1. أعد النص الكامل بعد الإصلاح — لا تحذف أي جزء لا يتعلق بالمشكلة
2. عدّل فقط الأجزاء المرتبطة مباشرة بالمشكلة المذكورة
3. حافظ على أسلوب الكتابة والنبرة الأصلية
4. حافظ على طول النص تقريبًا
5. أجب بصيغة JSON فقط بالشكل التالي:
{
  "fixedContent": "النص الكامل بعد الإصلاح",
  "changes": "ملخص موجز للتغييرات التي أجريتها بالعربية"
}`;

      const userPrompt = `نوع المشكلة: ${issueTypeAr}
الخطورة: ${issue.severity === "high" ? "خطيرة" : issue.severity === "medium" ? "متوسطة" : "طفيفة"}
${issue.chapter ? `${chapterLabel} رقم: ${issue.chapter}` : ""}

وصف المشكلة:
${issue.description}

${issue.suggestion ? `الاقتراح:\n${issue.suggestion}` : ""}

محتوى ${chapterLabel} الحالي المطلوب إصلاحه (${chapterLabel} ${chapter.chapterNumber} - ${chapter.title}):
${chapter.content}

${contextChapters ? `سياق من الفصول الأخرى:\n${contextChapters}` : ""}

أصلح المشكلة المحددة فقط وأعد النص الكامل بصيغة JSON.`;

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_completion_tokens: 16384,
        response_format: { type: "json_object" },
      });
      logApiUsage(userId, id, "fix_continuity", "gpt-5.2", response);

      if (response.choices[0]?.finish_reason === "length") {
        return res.status(400).json({ error: "النص طويل جدًا لإصلاحه دفعة واحدة. حاول تقسيم الفصل أو اختيار مشكلة أبسط." });
      }

      const resultText = response.choices[0]?.message?.content || "{}";
      let result: any;
      try {
        result = JSON.parse(resultText);
      } catch {
        return res.status(500).json({ error: "فشل في تحليل استجابة الذكاء الاصطناعي" });
      }

      if (!result.fixedContent) {
        return res.status(500).json({ error: "فشل في إنتاج النص المصلح" });
      }

      res.json({ content: result.fixedContent, changes: result.changes || "تم الإصلاح" });

      dispatchWebhook({
        input: issue.description,
        output: result.fixedContent,
        category: mapProjectTypeToCategory(project.projectType),
        correction: result.changes || null,
        timestamp: new Date().toISOString(),
        metadata: { session_id: `project-${project.id}`, language: "ar", word_count: countWords(result.fixedContent) },
      });
    } catch (error) {
      console.error("Error fixing continuity issue:", error);
      res.status(500).json({ error: "فشل في إصلاح المشكلة" });
    }
  });

  // ===== Style Analysis =====
  app.post("/api/projects/:id/style-analysis", isAuthenticated, async (req: any, res) => {
    try {
      if (await checkApiSuspension(req.user.claims.sub, res)) return;
      if (!(await checkAiRateLimit(req, res))) return;
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const userId = req.user.claims.sub;
      const project = await storage.getProjectWithDetails(id);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      if (project.userId !== userId) return res.status(403).json({ error: "غير مصرّح بالوصول" });

      const styleUser = await storage.getUser(userId);
      if (styleUser?.plan === "trial" && styleUser.trialActive) {
        if (isTrialExpired(styleUser.trialEndsAt)) {
          return res.status(403).json({ error: "انتهت الفترة التجريبية" });
        }
        if ((project.styleAnalysisCount || 0) >= TRIAL_MAX_STYLE) {
          return res.status(403).json({ error: "الفترة التجريبية تسمح بتحليل أسلوب واحد فقط" });
        }
      }

      const styleRemaining = getRemainingAnalysisUses(project.styleAnalysisCount || 0, project.styleAnalysisPaidCount || 0);
      if (styleRemaining <= 0) {
        return res.status(402).json({ error: "استنفدت الاستخدامات المجانية لتحليل الأسلوب. يمكنك فتح ٣ استخدامات إضافية مقابل ٥٩.٩٩ دولار.", needsPayment: true, feature: "style" });
      }

      const completedChapters = project.chapters
        .filter((ch: any) => ch.content && ch.status === "completed")
        .sort((a: any, b: any) => a.chapterNumber - b.chapterNumber);

      if (completedChapters.length < 1) return res.status(400).json({ error: "يجب أن يكون هناك فصل مكتمل واحد على الأقل لتحليل الأسلوب" });

      const chapterLabel = project.projectType === "essay" ? "القسم" : project.projectType === "scenario" ? "المشهد" : project.projectType === "short_story" ? "المقطع" : project.projectType === "khawater" ? "النص" : project.projectType === "social_media" ? "المحتوى" : project.projectType === "poetry" ? "القصيدة" : project.projectType === "memoire" ? "الفصل" : "الفصل";

      const allContent = completedChapters
        .map((ch: any) => `${chapterLabel} ${ch.chapterNumber}: ${ch.title}\n${ch.content?.substring(0, 4000)}`)
        .join("\n\n---\n\n");

      const methodologyMap: Record<string, string> = { descriptive: "المنهج الوصفي", analytical: "المنهج التحليلي", experimental: "المنهج التجريبي", historical: "المنهج التاريخي", comparative: "المنهج المقارن", survey: "المنهج المسحي", case_study: "دراسة حالة", mixed: "مختلط", qualitative: "نوعي", quantitative: "كمّي" };
      const fieldMap: Record<string, string> = { sciences: "العلوم", humanities: "العلوم الإنسانية", law: "القانون", medicine: "الطب", engineering: "الهندسة", economics: "الاقتصاد", education: "التربية", literature: "الآداب", computer_science: "الحاسوب", islamic_studies: "العلوم الإسلامية", political_science: "العلوم السياسية", psychology: "علم النفس", sociology: "علم الاجتماع" };
      const { system, user } = project.projectType === "memoire"
        ? buildMemoireStyleAnalysisPrompt(
            allContent,
            project.title,
            methodologyMap[project.memoireMethodology || ""] || project.memoireMethodology || undefined,
            fieldMap[project.memoireField || ""] || project.memoireField || undefined
          )
        : buildStyleAnalysisPrompt(
            allContent,
            project.title,
            project.projectType,
            project.narrativeTechnique || undefined
          );

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_completion_tokens: 5000,
        response_format: { type: "json_object" },
      });
      logApiUsage(userId, id, "style_analysis", "gpt-5.2", response);

      const resultText = response.choices[0]?.message?.content || "{}";
      try {
        const result = JSON.parse(resultText);
        await storage.updateProject(id, { styleAnalysisResult: JSON.stringify(result), styleAnalysisCount: (project.styleAnalysisCount || 0) + 1 } as any);
        res.json(result);
      } catch {
        const fallback = { overallScore: 0, summary: resultText, dimensions: [], strengths: [], improvements: [], styleProfile: {}, topPriority: "" };
        await storage.updateProject(id, { styleAnalysisResult: JSON.stringify(fallback), styleAnalysisCount: (project.styleAnalysisCount || 0) + 1 } as any);
        res.json(fallback);
      }
    } catch (error) {
      console.error("Error running style analysis:", error);
      res.status(500).json({ error: "فشل في تحليل الأسلوب الأدبي" });
    }
  });

  // ===== Fix Style Improvement =====
  app.post("/api/projects/:id/fix-style-improvement", isAuthenticated, async (req: any, res) => {
    try {
      if (await checkApiSuspension(req.user.claims.sub, res)) return;
      if (!(await checkAiRateLimit(req, res))) return;
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const userId = req.user.claims.sub;
      const { improvement } = req.body;

      if (!improvement || !improvement.suggestion || typeof improvement.suggestion !== "string") {
        return res.status(400).json({ error: "بيانات الاقتراح مطلوبة" });
      }

      const project = await storage.getProjectWithDetails(id);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      if (project.userId !== userId) return res.status(403).json({ error: "غير مصرّح بالوصول" });

      const completedChapters = project.chapters
        .filter((ch: any) => ch.content && ch.status === "completed")
        .sort((a: any, b: any) => a.chapterNumber - b.chapterNumber);

      if (completedChapters.length < 1) {
        return res.status(400).json({ error: "لا توجد فصول مكتملة" });
      }

      const chapterLabel = project.projectType === "essay" ? "القسم" : project.projectType === "scenario" ? "المشهد" : project.projectType === "short_story" ? "المقطع" : project.projectType === "khawater" ? "النص" : project.projectType === "social_media" ? "المحتوى" : project.projectType === "poetry" ? "القصيدة" : project.projectType === "memoire" ? "الفصل" : "الفصل";

      const chapterSummaries = completedChapters
        .map((ch: any) => `[${chapterLabel} ${ch.chapterNumber} — ${ch.title} — ID:${ch.id}]\n${(ch.content || "").substring(0, 1500)}`)
        .join("\n\n===\n\n");

      const identifyResponse = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: `أنت أبو هاشم — محرر أدبي. مهمتك تحديد أي الفصول تحتاج تعديلًا لتطبيق اقتراح أسلوبي معين.
أجب بصيغة JSON فقط: { "chapterIds": [<أرقام ID الفصول التي تحتاج تعديلًا>] }
إذا لم تجد فصولًا تحتاج تعديلًا، أعد مصفوفة فارغة.` },
          { role: "user", content: `مجال التحسين: ${improvement.area || "غير محدد"}
الوضع الحالي: ${improvement.current || "غير محدد"}
الاقتراح: ${improvement.suggestion}

ملخص الفصول:
${chapterSummaries}

حدد أرقام ID الفصول التي تحتاج تعديلًا.` },
        ],
        max_completion_tokens: 1024,
        response_format: { type: "json_object" },
      });
      logApiUsage(userId, id, "fix_style_identify", "gpt-5.2", identifyResponse);

      if (identifyResponse.choices[0]?.finish_reason === "length") {
        return res.status(400).json({ error: "المشروع يحتوي على فصول كثيرة. حاول مرة أخرى." });
      }

      const identifyText = identifyResponse.choices[0]?.message?.content || "{}";
      let identifyResult: any;
      try {
        identifyResult = JSON.parse(identifyText);
      } catch {
        identifyResult = { chapterIds: completedChapters.slice(0, 3).map((ch: any) => ch.id) };
      }

      const targetIds: number[] = Array.isArray(identifyResult.chapterIds) ? identifyResult.chapterIds : [];
      if (targetIds.length === 0) {
        return res.json({ fixedChapters: [] });
      }

      const validChapterIds = new Set(completedChapters.map((ch: any) => ch.id));
      const chaptersToFix = completedChapters.filter((ch: any) => targetIds.includes(ch.id) && validChapterIds.has(ch.id));

      if (chaptersToFix.length === 0) {
        return res.json({ fixedChapters: [] });
      }

      const fixResults = await Promise.all(chaptersToFix.map(async (ch: any) => {
        const fixSystemPrompt = `أنت أبو هاشم — محرر أدبي متخصص في تحسين الأسلوب الأدبي في النصوص العربية.
مهمتك: تطبيق اقتراح تحسين أسلوبي محدد على نص ${chapterLabel} واحد.

قواعد صارمة:
1. عدّل فقط الأجزاء المتعلقة بالاقتراح المحدد
2. أعد النص الكامل بعد التحسين — لا تحذف أي جزء غير متعلق
3. حافظ على المعنى والسياق العام
4. حافظ على طول النص تقريبًا
5. أجب بصيغة JSON فقط:
{
  "fixedContent": "النص الكامل بعد التحسين",
  "changes": "ملخص موجز بالعربية للتغييرات"
}`;

        const fixUserPrompt = `مجال التحسين: ${improvement.area || "غير محدد"}
التأثير: ${improvement.impact === "high" ? "عالٍ" : improvement.impact === "medium" ? "متوسط" : "طفيف"}

الوضع الحالي:
${improvement.current || "غير محدد"}

الاقتراح:
${improvement.suggestion}

محتوى ${chapterLabel} ${ch.chapterNumber} — ${ch.title}:
${ch.content}

طبّق الاقتراح وأعد النص الكامل بصيغة JSON.`;

        try {
          const fixResponse = await openai.chat.completions.create({
            model: "gpt-5.2",
            messages: [
              { role: "system", content: fixSystemPrompt },
              { role: "user", content: fixUserPrompt },
            ],
            max_completion_tokens: 16384,
            response_format: { type: "json_object" },
          });
          logApiUsage(userId, id, "fix_style", "gpt-5.2", fixResponse);

          if (fixResponse.choices[0]?.finish_reason === "length") {
            console.warn(`Style fix truncated for chapter ${ch.id}, skipping`);
            return null;
          }

          const fixText = fixResponse.choices[0]?.message?.content || "{}";
          const fixResult = JSON.parse(fixText);
          if (fixResult.fixedContent) {
            return {
              chapterId: ch.id,
              chapterNumber: ch.chapterNumber,
              title: ch.title,
              fixedContent: fixResult.fixedContent,
              changes: fixResult.changes || "تم التحسين",
            };
          }
          return null;
        } catch (chErr) {
          console.error(`Error fixing style for chapter ${ch.id}:`, chErr);
          return null;
        }
      }));

      const fixedChapters = fixResults.filter((r: any) => r !== null);
      res.json({ fixedChapters });
    } catch (error) {
      console.error("Error fixing style improvement:", error);
      res.status(500).json({ error: "فشل في تطبيق تحسين الأسلوب" });
    }
  });

  // ===== Resolve Style Improvement =====
  app.post("/api/projects/:id/resolve-style-improvement", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const userId = req.user.claims.sub;
      const { issueIndex } = req.body;

      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      if (project.userId !== userId) return res.status(403).json({ error: "غير مصرّح بالوصول" });

      if (!project.styleAnalysisResult) {
        return res.status(400).json({ error: "لا توجد نتائج تحليل محفوظة" });
      }

      const result = JSON.parse(project.styleAnalysisResult);
      if (!result.improvements || typeof issueIndex !== "number" || issueIndex < 0 || issueIndex >= result.improvements.length) {
        return res.status(400).json({ error: "رقم الاقتراح غير صالح" });
      }

      result.improvements[issueIndex].resolved = true;
      await storage.updateProject(id, { styleAnalysisResult: JSON.stringify(result) });
      res.json(result);
    } catch (error) {
      console.error("Error resolving style improvement:", error);
      res.status(500).json({ error: "فشل في تحديث حالة الاقتراح" });
    }
  });

  // ===== Batch Resolve Style Improvements =====
  app.post("/api/projects/:id/resolve-style-improvements-batch", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const userId = req.user.claims.sub;
      const { improvementIndices } = req.body;

      if (!Array.isArray(improvementIndices) || improvementIndices.length === 0) {
        return res.status(400).json({ error: "أرقام الاقتراحات مطلوبة" });
      }

      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      if (project.userId !== userId) return res.status(403).json({ error: "غير مصرّح بالوصول" });

      if (!project.styleAnalysisResult) {
        return res.status(400).json({ error: "لا توجد نتائج تحليل محفوظة" });
      }

      const result = JSON.parse(project.styleAnalysisResult);
      if (!result.improvements) {
        return res.status(400).json({ error: "لا توجد اقتراحات" });
      }

      for (const idx of improvementIndices) {
        if (typeof idx === "number" && idx >= 0 && idx < result.improvements.length) {
          result.improvements[idx].resolved = true;
        }
      }

      await storage.updateProject(id, { styleAnalysisResult: JSON.stringify(result) });
      res.json(result);
    } catch (error) {
      console.error("Error batch resolving style improvements:", error);
      res.status(500).json({ error: "فشل في تحديث حالة الاقتراحات" });
    }
  });

  // ===== Fix All Continuity Issues =====
  app.post("/api/projects/:id/fix-all-continuity", isAuthenticated, async (req: any, res) => {
    try {
      if (await checkApiSuspension(req.user.claims.sub, res)) return;
      if (!(await checkAiRateLimit(req, res))) return;
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const userId = req.user.claims.sub;

      const project = await storage.getProjectWithDetails(id);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      if (project.userId !== userId) return res.status(403).json({ error: "غير مصرّح بالوصول" });

      if (!project.continuityCheckResult) {
        return res.status(400).json({ error: "لا توجد نتائج فحص محفوظة" });
      }

      const continuityResult = JSON.parse(project.continuityCheckResult);
      if (!continuityResult.issues || !Array.isArray(continuityResult.issues)) {
        return res.status(400).json({ error: "لا توجد مشاكل" });
      }

      const completedChapters = project.chapters
        .filter((ch: any) => ch.content && ch.status === "completed")
        .sort((a: any, b: any) => a.chapterNumber - b.chapterNumber);

      const chapterLabel = project.projectType === "essay" ? "القسم" : project.projectType === "scenario" ? "المشهد" : project.projectType === "short_story" ? "المقطع" : project.projectType === "khawater" ? "النص" : project.projectType === "social_media" ? "المحتوى" : project.projectType === "poetry" ? "القصيدة" : project.projectType === "memoire" ? "الفصل" : "الفصل";

      const unresolvedIssues: { issue: any; index: number; chapter: any }[] = [];
      for (let i = 0; i < continuityResult.issues.length; i++) {
        const issue = continuityResult.issues[i];
        if (issue.resolved) continue;
        const targetChapter = completedChapters.find((ch: any) => ch.chapterNumber === issue.chapter);
        if (targetChapter) {
          unresolvedIssues.push({ issue, index: i, chapter: targetChapter });
        }
      }

      if (unresolvedIssues.length === 0) {
        return res.json({ fixes: [] });
      }

      const contextChapters = completedChapters
        .map((ch: any) => `${chapterLabel} ${ch.chapterNumber} - ${ch.title}:\n${ch.content!.substring(0, 600)}`)
        .join("\n---\n");

      const typeMap: Record<string, string> = {
        character: "تناقض في الشخصية", timeline: "تناقض في الخط الزمني",
        setting: "تناقض في المكان", plot: "فجوة في الحبكة", tone: "تغير في النبرة"
      };

      const fixResults = await Promise.all(unresolvedIssues.map(async ({ issue, index, chapter }) => {
        const issueTypeAr = typeMap[issue.type] || issue.type || "مشكلة";
        const systemPrompt = `أنت أبو هاشم — محرر أدبي متخصص في إصلاح مشاكل الاستمرارية في النصوص العربية.
مهمتك: إصلاح مشكلة محددة في نص ${chapterLabel} مع الحفاظ على بقية النص كما هو تمامًا.

قواعد صارمة:
1. أعد النص الكامل بعد الإصلاح — لا تحذف أي جزء لا يتعلق بالمشكلة
2. عدّل فقط الأجزاء المرتبطة مباشرة بالمشكلة المذكورة
3. حافظ على أسلوب الكتابة والنبرة الأصلية
4. حافظ على طول النص تقريبًا
5. أجب بصيغة JSON فقط بالشكل التالي:
{
  "fixedContent": "النص الكامل بعد الإصلاح",
  "changes": "ملخص موجز للتغييرات التي أجريتها بالعربية"
}`;

        const userPrompt = `نوع المشكلة: ${issueTypeAr}
الخطورة: ${issue.severity === "high" ? "خطيرة" : issue.severity === "medium" ? "متوسطة" : "طفيفة"}
${issue.chapter ? `${chapterLabel} رقم: ${issue.chapter}` : ""}

وصف المشكلة:
${issue.description}

${issue.suggestion ? `الاقتراح:\n${issue.suggestion}` : ""}

محتوى ${chapterLabel} الحالي المطلوب إصلاحه (${chapterLabel} ${chapter.chapterNumber} - ${chapter.title}):
${chapter.content}

${contextChapters ? `سياق من الفصول الأخرى:\n${contextChapters}` : ""}

أصلح المشكلة المحددة فقط وأعد النص الكامل بصيغة JSON.`;

        try {
          const response = await openai.chat.completions.create({
            model: "gpt-5.2",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            max_completion_tokens: 16384,
            response_format: { type: "json_object" },
          });
          logApiUsage(userId, id, "fix_continuity", "gpt-5.2", response);

          if (response.choices[0]?.finish_reason === "length") {
            console.warn(`Continuity fix truncated for issue ${index}, skipping`);
            return null;
          }

          const resultText = response.choices[0]?.message?.content || "{}";
          const result = JSON.parse(resultText);
          if (result.fixedContent) {
            return {
              issueIndex: index,
              chapterId: chapter.id,
              chapterNumber: chapter.chapterNumber,
              chapterTitle: chapter.title,
              content: result.fixedContent,
              changes: result.changes || "تم الإصلاح",
            };
          }
          return null;
        } catch (err) {
          console.error(`Error fixing continuity issue ${index}:`, err);
          return null;
        }
      }));

      const fixes = fixResults.filter((r: any) => r !== null);
      res.json({ fixes });
    } catch (error) {
      console.error("Error fixing all continuity issues:", error);
      res.status(500).json({ error: "فشل في إصلاح المشاكل" });
    }
  });

  // ===== Fix All Style Improvements =====
  app.post("/api/projects/:id/fix-all-style-improvements", isAuthenticated, async (req: any, res) => {
    try {
      if (await checkApiSuspension(req.user.claims.sub, res)) return;
      if (!(await checkAiRateLimit(req, res))) return;
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const userId = req.user.claims.sub;

      const project = await storage.getProjectWithDetails(id);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      if (project.userId !== userId) return res.status(403).json({ error: "غير مصرّح بالوصول" });

      if (!project.styleAnalysisResult) {
        return res.status(400).json({ error: "لا توجد نتائج تحليل محفوظة" });
      }

      const styleResult = JSON.parse(project.styleAnalysisResult);
      if (!styleResult.improvements || !Array.isArray(styleResult.improvements)) {
        return res.status(400).json({ error: "لا توجد اقتراحات" });
      }

      const completedChapters = project.chapters
        .filter((ch: any) => ch.content && ch.status === "completed")
        .sort((a: any, b: any) => a.chapterNumber - b.chapterNumber);

      if (completedChapters.length < 1) {
        return res.status(400).json({ error: "لا توجد فصول مكتملة" });
      }

      const chapterLabel = project.projectType === "essay" ? "القسم" : project.projectType === "scenario" ? "المشهد" : project.projectType === "short_story" ? "المقطع" : project.projectType === "khawater" ? "النص" : project.projectType === "social_media" ? "المحتوى" : project.projectType === "poetry" ? "القصيدة" : project.projectType === "memoire" ? "الفصل" : "الفصل";

      const unresolvedImprovements: { improvement: any; index: number }[] = [];
      for (let i = 0; i < styleResult.improvements.length; i++) {
        if (!styleResult.improvements[i].resolved) {
          unresolvedImprovements.push({ improvement: styleResult.improvements[i], index: i });
        }
      }

      if (unresolvedImprovements.length === 0) {
        return res.json({ results: [] });
      }

      const chapterSummaries = completedChapters
        .map((ch: any) => `[${chapterLabel} ${ch.chapterNumber} — ${ch.title} — ID:${ch.id}]\n${(ch.content || "").substring(0, 1500)}`)
        .join("\n\n===\n\n");

      const validChapterIds = new Set(completedChapters.map((ch: any) => ch.id));

      const improvementResults = await Promise.all(unresolvedImprovements.map(async ({ improvement, index }) => {
        try {
          const identifyResponse = await openai.chat.completions.create({
            model: "gpt-5.2",
            messages: [
              { role: "system", content: `أنت أبو هاشم — محرر أدبي. مهمتك تحديد أي الفصول تحتاج تعديلًا لتطبيق اقتراح أسلوبي معين.
أجب بصيغة JSON فقط: { "chapterIds": [<أرقام ID الفصول التي تحتاج تعديلًا>] }
إذا لم تجد فصولًا تحتاج تعديلًا، أعد مصفوفة فارغة.` },
              { role: "user", content: `مجال التحسين: ${improvement.area || "غير محدد"}
الوضع الحالي: ${improvement.current || "غير محدد"}
الاقتراح: ${improvement.suggestion}

ملخص الفصول:
${chapterSummaries}

حدد أرقام ID الفصول التي تحتاج تعديلًا.` },
            ],
            max_completion_tokens: 1024,
            response_format: { type: "json_object" },
          });
          logApiUsage(userId, id, "fix_style_identify", "gpt-5.2", identifyResponse);

          if (identifyResponse.choices[0]?.finish_reason === "length") return null;

          const identifyText = identifyResponse.choices[0]?.message?.content || "{}";
          let identifyResult: any;
          try {
            identifyResult = JSON.parse(identifyText);
          } catch {
            identifyResult = { chapterIds: completedChapters.slice(0, 3).map((ch: any) => ch.id) };
          }

          const targetIds: number[] = Array.isArray(identifyResult.chapterIds) ? identifyResult.chapterIds : [];
          const chaptersToFix = completedChapters.filter((ch: any) => targetIds.includes(ch.id) && validChapterIds.has(ch.id));
          if (chaptersToFix.length === 0) return { improvementIndex: index, fixedChapters: [] };

          const chapterFixes = await Promise.all(chaptersToFix.map(async (ch: any) => {
            try {
              const fixResponse = await openai.chat.completions.create({
                model: "gpt-5.2",
                messages: [
                  { role: "system", content: `أنت أبو هاشم — محرر أدبي متخصص في تحسين الأسلوب الأدبي في النصوص العربية.
مهمتك: تطبيق اقتراح تحسين أسلوبي محدد على نص ${chapterLabel} واحد.

قواعد صارمة:
1. عدّل فقط الأجزاء المتعلقة بالاقتراح المحدد
2. أعد النص الكامل بعد التحسين — لا تحذف أي جزء غير متعلق
3. حافظ على المعنى والسياق العام
4. حافظ على طول النص تقريبًا
5. أجب بصيغة JSON فقط:
{
  "fixedContent": "النص الكامل بعد التحسين",
  "changes": "ملخص موجز بالعربية للتغييرات"
}` },
                  { role: "user", content: `مجال التحسين: ${improvement.area || "غير محدد"}
التأثير: ${improvement.impact === "high" ? "عالٍ" : improvement.impact === "medium" ? "متوسط" : "طفيف"}

الوضع الحالي:
${improvement.current || "غير محدد"}

الاقتراح:
${improvement.suggestion}

محتوى ${chapterLabel} ${ch.chapterNumber} — ${ch.title}:
${ch.content}

طبّق الاقتراح وأعد النص الكامل بصيغة JSON.` },
                ],
                max_completion_tokens: 16384,
                response_format: { type: "json_object" },
              });
              logApiUsage(userId, id, "fix_style", "gpt-5.2", fixResponse);

              if (fixResponse.choices[0]?.finish_reason === "length") return null;
              const fixText = fixResponse.choices[0]?.message?.content || "{}";
              const fixResult = JSON.parse(fixText);
              if (fixResult.fixedContent) {
                return {
                  chapterId: ch.id,
                  chapterNumber: ch.chapterNumber,
                  title: ch.title,
                  fixedContent: fixResult.fixedContent,
                  changes: fixResult.changes || "تم التحسين",
                };
              }
              return null;
            } catch {
              return null;
            }
          }));

          return {
            improvementIndex: index,
            area: improvement.area,
            fixedChapters: chapterFixes.filter((r: any) => r !== null),
          };
        } catch (err) {
          console.error(`Error fixing style improvement ${index}:`, err);
          return null;
        }
      }));

      const results = improvementResults.filter((r: any) => r !== null);
      res.json({ results });
    } catch (error) {
      console.error("Error fixing all style improvements:", error);
      res.status(500).json({ error: "فشل في تطبيق تحسينات الأسلوب" });
    }
  });

  // ===== Onboarding =====
  app.patch("/api/user/onboarding-complete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updated = await storage.updateUserProfileExtended(userId, { onboardingCompleted: true });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "فشل في تحديث الإعداد الأولي" });
    }
  });

  app.get("/api/projects/:id/analysis-usage", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "غير مصرّح بالوصول" });

      const continuityUsed = project.continuityCheckCount || 0;
      const continuityPaid = project.continuityCheckPaidCount || 0;
      const continuityRemaining = getRemainingAnalysisUses(continuityUsed, continuityPaid);
      const continuityTotal = 3 + (continuityPaid * 3);

      const styleUsed = project.styleAnalysisCount || 0;
      const stylePaid = project.styleAnalysisPaidCount || 0;
      const styleRemaining = getRemainingAnalysisUses(styleUsed, stylePaid);
      const styleTotal = 3 + (stylePaid * 3);

      res.json({
        continuity: { used: continuityUsed, remaining: Math.max(0, continuityRemaining), total: continuityTotal },
        style: { used: styleUsed, remaining: Math.max(0, styleRemaining), total: styleTotal },
      });
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب استخدام التحليل" });
    }
  });

  app.post("/api/projects/:id/analysis-checkout", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const { feature } = req.body;
      if (!feature || !["continuity", "style"].includes(feature)) {
        return res.status(400).json({ error: "نوع التحليل يجب أن يكون 'continuity' أو 'style'" });
      }

      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "غير مصرّح بالوصول" });

      const stripe = await getUncachableStripeClient();
      const featureLabel = feature === "continuity" ? "فحص الاستمرارية" : "تحليل الأسلوب الأدبي";
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: ANALYSIS_UNLOCK_PRICE,
              product_data: {
                name: `فتح ${featureLabel} — ${project.title}`,
                description: `٣ استخدامات إضافية لـ${featureLabel}`,
              },
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${req.headers.origin || req.protocol + "://" + req.get("host")}/project/${id}?analysis_unlock=true&feature=${feature}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin || req.protocol + "://" + req.get("host")}/project/${id}`,
        metadata: {
          projectId: String(id),
          feature,
          type: "analysis_unlock",
        },
      });

      res.json({ checkoutUrl: session.url });
    } catch (error) {
      console.error("Error creating analysis checkout:", error);
      res.status(500).json({ error: "فشل في إنشاء جلسة الدفع" });
    }
  });

  app.post("/api/projects/:id/analysis-unlock-verify", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const { sessionId, feature } = req.body;
      if (!sessionId || !feature || !["continuity", "style"].includes(feature)) {
        return res.status(400).json({ error: "معرّف الجلسة أو نوع التحليل مفقود" });
      }

      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "غير مصرّح بالوصول" });

      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== "paid") {
        return res.status(400).json({ error: "الدفع لم يكتمل بعد" });
      }

      if (session.metadata?.projectId !== String(id) || session.metadata?.feature !== feature || session.metadata?.type !== "analysis_unlock") {
        return res.status(400).json({ error: "جلسة دفع غير صالحة" });
      }

      if (session.metadata?.redeemed === "true") {
        return res.status(400).json({ error: "تم استخدام هذه الجلسة بالفعل", alreadyRedeemed: true });
      }

      await stripe.checkout.sessions.update(sessionId, {
        metadata: { ...session.metadata, redeemed: "true" },
      });

      if (feature === "continuity") {
        await storage.updateProject(id, { continuityCheckPaidCount: (project.continuityCheckPaidCount || 0) + 1 } as any);
      } else {
        await storage.updateProject(id, { styleAnalysisPaidCount: (project.styleAnalysisPaidCount || 0) + 1 } as any);
      }

      const featureLabel = feature === "continuity" ? "فحص الاستمرارية" : "تحليل الأسلوب الأدبي";
      res.json({ success: true, message: `تم فتح ٣ استخدامات إضافية لـ${featureLabel}` });
    } catch (error) {
      console.error("Error verifying analysis unlock:", error);
      res.status(500).json({ error: "فشل في التحقق من الدفع" });
    }
  });

  // ===== Platform Reviews =====
  app.get("/api/reviews", async (req, res) => {
    serveCached(req, res, "reviews", 120, async () => {
      const reviews = await storage.getApprovedReviews();
      const enriched = await Promise.all(reviews.map(async (review) => {
        const user = await storage.getUser(review.userId);
        const liveBio = (user as any)?.bio || review.reviewerBio || null;
        const liveName = user?.displayName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || review.reviewerName;
        return { ...review, reviewerBio: liveBio, reviewerName: liveName };
      }));
      return enriched;
    });
  });

  app.post("/api/reviews", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { content, rating } = req.body;
      if (!content || typeof content !== "string" || content.trim().length < 10) {
        return res.status(400).json({ error: "المراجعة يجب أن تكون ١٠ أحرف على الأقل" });
      }
      if (!rating || typeof rating !== "number" || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
        return res.status(400).json({ error: "التقييم يجب أن يكون رقماً صحيحاً بين ١ و ٥" });
      }
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });
      const reviewerName = user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || "مستخدم";
      const reviewerBio = (user as any).bio || null;
      const review = await storage.createPlatformReview({ userId, reviewerName: sanitizeText(reviewerName).slice(0, 200), reviewerBio: reviewerBio ? sanitizeText(reviewerBio).slice(0, 500) : null, content: sanitizeText(content).slice(0, 2000), rating });
      apiCache.invalidate("reviews");
      res.json({ success: true, message: "تم إرسال مراجعتك بنجاح وسيتم نشرها بعد مراجعة الإدارة", review });
    } catch (error) {
      res.status(500).json({ error: "فشل في إرسال المراجعة" });
    }
  });

  // ===== Admin Review Moderation =====
  app.get("/api/admin/reviews", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const filter = req.query.filter;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;
      if (filter === "all") {
        const result = await storage.getAllReviews(limit, offset);
        res.json({ data: result.data, total: result.total, page, limit });
      } else {
        const result = await storage.getPendingReviews(limit, offset);
        res.json({ data: result.data, total: result.total, page, limit });
      }
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب المراجعات" });
    }
  });

  app.patch("/api/admin/reviews/:id/approve", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const review = await storage.approvePlatformReview(id);
      apiCache.invalidate("reviews");
      res.json(review);
    } catch (error) {
      res.status(500).json({ error: "فشل في الموافقة على المراجعة" });
    }
  });

  app.delete("/api/admin/reviews/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      await storage.deletePlatformReview(id);
      apiCache.invalidate("reviews");
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "فشل في حذف المراجعة" });
    }
  });

  // ===== Tracking Pixels =====
  app.get("/api/tracking-pixels", async (req, res) => {
    serveCached(req, res, "tracking-pixels", 300, async () => {
      const pixels = await storage.getTrackingPixels();
      return pixels.filter(p => p.enabled).map(p => ({ platform: p.platform, pixelId: p.pixelId }));
    });
  });

  app.get("/api/admin/tracking-pixels", isAuthenticated, isAdmin, async (_req: any, res) => {
    try {
      const pixels = await storage.getTrackingPixels();
      res.json(pixels.map(p => ({
        id: p.id,
        platform: p.platform,
        pixelId: p.pixelId,
        hasAccessToken: !!p.accessToken,
        enabled: p.enabled,
        updatedAt: p.updatedAt,
      })));
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب بيانات التتبع" });
    }
  });

  app.put("/api/admin/tracking-pixels", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { platform, pixelId, accessToken, enabled } = req.body;
      if (!platform || !["tiktok", "facebook"].includes(platform)) {
        return res.status(400).json({ error: "المنصة يجب أن تكون tiktok أو facebook" });
      }
      if (!pixelId || typeof pixelId !== "string") {
        return res.status(400).json({ error: "معرّف البكسل مطلوب" });
      }
      let finalAccessToken: string | null = accessToken?.trim() || null;
      if (!finalAccessToken) {
        const existing = (await storage.getTrackingPixels()).find(p => p.platform === platform);
        if (existing) finalAccessToken = existing.accessToken;
      }
      const pixel = await storage.upsertTrackingPixel({
        platform,
        pixelId: pixelId.trim(),
        accessToken: finalAccessToken,
        enabled: !!enabled,
      });
      invalidatePixelCache();
      apiCache.invalidate("tracking-pixels");
      res.json({
        id: pixel.id,
        platform: pixel.platform,
        pixelId: pixel.pixelId,
        hasAccessToken: !!pixel.accessToken,
        enabled: pixel.enabled,
        updatedAt: pixel.updatedAt,
      });
    } catch (error) {
      res.status(500).json({ error: "فشل في حفظ بيانات التتبع" });
    }
  });

  app.get("/api/public/social-links", async (req, res) => {
    serveCached(req, res, "social-links", 300, async () => {
      return await storage.getEnabledSocialMediaLinks();
    });
  });

  app.get("/api/admin/social-links", isAuthenticated, isAdmin, async (_req: any, res) => {
    try {
      const links = await storage.getSocialMediaLinks();
      res.json(links);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب روابط التواصل" });
    }
  });

  app.put("/api/admin/social-links", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const validPlatforms = ["linkedin", "tiktok", "x", "instagram", "facebook", "youtube", "snapchat", "telegram", "whatsapp"];
      const socialLinkSchema = insertSocialMediaLinkSchema.extend({
        platform: z.enum(validPlatforms as [string, ...string[]]),
        url: z.string().url("الرابط غير صالح"),
      });
      const parsed = socialLinkSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "بيانات غير صالحة" });
      }
      const link = await storage.upsertSocialMediaLink(parsed.data);
      apiCache.invalidate("social-links");
      res.json(link);
    } catch (error) {
      res.status(500).json({ error: "فشل في حفظ رابط التواصل" });
    }
  });

  app.delete("/api/admin/social-links/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      await storage.deleteSocialMediaLink(id);
      apiCache.invalidate("social-links");
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "فشل في حذف رابط التواصل" });
    }
  });

  app.get("/api/admin/features", isAuthenticated, isAdmin, async (_req: any, res) => {
    try {
      const features = await storage.getAllFeatures();
      res.json(features);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب المميزات" });
    }
  });

  app.patch("/api/admin/features/:key", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { key } = req.params;
      const { enabled, betaOnly, disabledMessage, betaUserIds } = req.body;
      const updateData: any = {};
      if (typeof enabled === "boolean") updateData.enabled = enabled;
      if (typeof betaOnly === "boolean") updateData.betaOnly = betaOnly;
      if (typeof disabledMessage === "string") updateData.disabledMessage = disabledMessage;
      if (Array.isArray(betaUserIds)) updateData.betaUserIds = betaUserIds;
      const updated = await storage.updateFeature(key, updateData);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "فشل في تحديث الميزة" });
    }
  });

  app.get("/api/features", async (req: any, res) => {
    try {
      const features = await storage.getAllFeatures();
      const userId = req.user?.claims?.sub;
      const result = features.map(f => {
        let effectiveEnabled = false;
        if (f.enabled) {
          if (f.betaOnly) {
            effectiveEnabled = !!(userId && f.betaUserIds?.includes(userId));
          } else {
            effectiveEnabled = true;
          }
        } else if (userId && f.betaUserIds?.includes(userId)) {
          effectiveEnabled = true;
        }
        return {
          featureKey: f.featureKey,
          name: f.name,
          description: f.description,
          enabled: effectiveEnabled,
          disabledMessage: f.disabledMessage,
        };
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب المميزات" });
    }
  });

  app.post("/api/admin/learning/trigger", isAuthenticated, isAdmin, async (_req: any, res) => {
    try {
      res.json({ message: "جاري بدء جلسة التعلم...", status: "started" });
      runLearningSession("admin_manual").catch((err) =>
        console.error("[LearningEngine] Manual trigger error:", err)
      );
    } catch (error) {
      res.status(500).json({ error: "فشل في بدء جلسة التعلم" });
    }
  });

  app.get("/api/admin/learning/sessions", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const sessions = await storage.getLearningSessions(limit);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب سجل الجلسات" });
    }
  });

  app.get("/api/admin/learning/entries", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const filters: any = {};
      if (req.query.category) filters.category = req.query.category;
      if (req.query.contentType) filters.contentType = req.query.contentType;
      if (req.query.validated === "true") filters.validated = true;
      if (req.query.validated === "false") filters.validated = false;
      if (req.query.rejected === "true") filters.rejected = true;
      if (req.query.rejected === "false") filters.rejected = false;
      if (req.query.search) filters.search = req.query.search;
      filters.limit = parseInt(req.query.limit as string) || 50;
      filters.offset = parseInt(req.query.offset as string) || 0;

      const entries = await storage.getKnowledgeEntries(filters);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب المعارف" });
    }
  });

  app.patch("/api/admin/learning/entries/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      if (isNaN(id)) return res.status(400).json({ error: "معرف غير صالح" });

      const schema = z.object({
        validated: z.boolean().optional(),
        rejected: z.boolean().optional(),
        knowledge: z.string().min(1).optional(),
      }).refine(data => !(data.validated === true && data.rejected === true), {
        message: "لا يمكن اعتماد ورفض المعرفة في نفس الوقت",
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message || "بيانات غير صالحة" });

      const entry = await storage.updateKnowledgeEntry(id, parsed.data);
      res.json(entry);
    } catch (error) {
      res.status(500).json({ error: "فشل في تحديث المعرفة" });
    }
  });

  app.delete("/api/admin/learning/entries/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      await storage.deleteKnowledgeEntry(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "فشل في حذف المعرفة" });
    }
  });

  app.get("/api/admin/learning/stats", isAuthenticated, isAdmin, async (_req: any, res) => {
    try {
      const stats = await storage.getLearningStats();
      const autoLearningEnabled = await storage.isFeatureEnabled("auto_learning");
      res.json({ ...stats, autoLearningEnabled });
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب الإحصائيات" });
    }
  });

  app.post("/api/admin/learning/auto-learning", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { enabled } = req.body;
      const feature = await storage.getFeature("auto_learning");
      if (feature) {
        await storage.updateFeature("auto_learning", { enabled: !!enabled });
      }
      res.json({ enabled: !!enabled });
    } catch (error) {
      res.status(500).json({ error: "فشل في تحديث إعداد التعلم التلقائي" });
    }
  });

  app.get("/api/admin/webhook-deliveries", isAuthenticated, isAdmin, async (_req: any, res) => {
    try {
      const deliveries = await storage.getWebhookDeliveries(50);
      res.json(deliveries);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب سجل الـ Webhook" });
    }
  });

  app.post("/api/admin/webhook-test", isAuthenticated, isAdmin, async (_req: any, res) => {
    try {
      const testPayload: WebhookPayload = {
        input: "هذه رسالة اختبار من لوحة التحكم",
        output: "تم استلام الرسالة بنجاح — هذا رد تجريبي من أبو هاشم",
        category: "general",
        correction: null,
        timestamp: new Date().toISOString(),
        metadata: { session_id: "test-webhook", language: "ar", word_count: 8 },
      };

      const webhookUrl = process.env.TRAINING_WEBHOOK_URL;
      const webhookSecret = process.env.WEBHOOK_SECRET;

      if (!webhookUrl) {
        return res.status(400).json({ error: "رابط خدمة التدريب غير مُعدّ" });
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(webhookSecret ? { "X-Webhook-Secret": webhookSecret } : {}),
        },
        body: JSON.stringify(testPayload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      await storage.createWebhookDelivery({
        payload: testPayload,
        status: response.ok ? "delivered" : "failed",
        statusCode: response.status,
        errorMessage: response.ok ? null : `HTTP ${response.status}`,
        retryCount: 0,
      });

      res.json({ success: response.ok, statusCode: response.status });
    } catch (error: any) {
      const errorMsg = error.name === "AbortError" ? "Request timeout" : error.message;
      res.status(500).json({ error: `فشل اختبار الـ Webhook: ${errorMsg}` });
    }
  });

  app.delete("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ error: "المشروع غير موجود" });
      }
      if (project.userId !== req.user.claims.sub) {
        return res.status(403).json({ error: "غير مصرّح بحذف هذا المشروع" });
      }
      await storage.deleteProject(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "فشل في حذف المشروع" });
    }
  });

  app.post("/api/reports", async (req: any, res) => {
    try {
      const { projectId, reason, subReason, severity, details, reporterEmail } = req.body;
      if (!projectId || !reason) {
        return res.status(400).json({ error: "معرف المحتوى وسبب البلاغ مطلوبان" });
      }

      const validReasons = ["inappropriate", "plagiarism", "offensive", "spam", "other"];
      if (!validReasons.includes(reason)) {
        return res.status(400).json({ error: "سبب البلاغ غير صالح" });
      }

      const validSeverities = ["low", "medium", "high", "critical"];
      if (severity && !validSeverities.includes(severity)) {
        return res.status(400).json({ error: "مستوى الخطورة غير صالح" });
      }

      const project = await storage.getProject(parseInt(projectId));
      if (!project) {
        return res.status(404).json({ error: "المحتوى غير موجود" });
      }

      const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
      const recentCount = await storage.getRecentReportCountByIp(ip, 3600000);
      if (recentCount >= 3) {
        return res.status(429).json({ error: "لقد أرسلت عدداً كبيراً من البلاغات. حاول مرة أخرى لاحقاً" });
      }

      const reporterUserId = req.user?.claims?.sub || null;

      const now = new Date();
      const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
      const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      const reportNumber = `RPT-${datePart}-${randomPart}`;

      const userAgent = req.headers["user-agent"] || "";
      let deviceType = "desktop";
      let deviceName = "Unknown";
      if (userAgent) {
        if (/mobile|android|iphone|ipod/i.test(userAgent)) deviceType = "mobile";
        else if (/ipad|tablet/i.test(userAgent)) deviceType = "tablet";

        const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera|MSIE|Trident)[\/\s]?([\d.]+)?/i);
        const osMatch = userAgent.match(/(Windows NT [\d.]+|Mac OS X [\d._]+|Linux|Android [\d.]+|iOS [\d._]+|iPhone OS [\d._]+)/i);
        const browserName = browserMatch ? browserMatch[1] : "Unknown Browser";
        const browserVersion = browserMatch ? browserMatch[2] : "";
        const osName = osMatch ? osMatch[1].replace(/_/g, ".") : "Unknown OS";
        deviceName = `${browserName} ${browserVersion} on ${osName}`.trim();
      }

      let reporterCountry: string | null = null;
      let reporterCity: string | null = null;
      let reporterIsp: string | null = null;
      let reporterGeoData: string | null = null;

      try {
        const cleanIp = ip.replace("::ffff:", "");
        if (cleanIp !== "unknown" && cleanIp !== "127.0.0.1" && cleanIp !== "::1") {
          const geoRes = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,country,city,isp,org,as,query,regionName`, { signal: AbortSignal.timeout(3000) });
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            if (geoData.status === "success") {
              reporterCountry = geoData.country || null;
              reporterCity = geoData.city ? `${geoData.city}, ${geoData.regionName || ""}`.trim() : null;
              reporterIsp = geoData.isp || geoData.org || null;
              reporterGeoData = JSON.stringify(geoData);
            }
          }
        }
      } catch (geoErr) {
        console.error("Geo lookup failed (non-critical):", geoErr);
      }

      const report = await storage.createContentReport({
        projectId: parseInt(projectId),
        reporterIp: ip,
        reporterUserId,
        reason,
        subReason: subReason || null,
        severity: severity || null,
        details: details ? sanitizeText(String(details)).slice(0, 2000) : null,
        reportNumber,
        reporterEmail: reporterEmail ? sanitizeText(String(reporterEmail)).slice(0, 255) : null,
        reporterUserAgent: userAgent || null,
        reporterDeviceType: deviceType,
        reporterDeviceName: deviceName,
        reporterCountry,
        reporterCity,
        reporterIsp,
        reporterGeoData,
      });

      res.status(201).json({ success: true, id: report.id, reportNumber });
    } catch (error) {
      console.error("Error creating report:", error);
      res.status(500).json({ error: "فشل في إرسال البلاغ" });
    }
  });

  app.get("/api/admin/reports", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const status = req.query.status as string | undefined;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;
      const result = await storage.getContentReports(status || undefined, limit, offset);
      const reportsWithCount = await Promise.all(
        result.data.map(async (r) => ({
          ...r,
          reportCountForProject: await storage.getReportCountForProject(r.projectId),
        }))
      );
      res.json({ data: reportsWithCount, total: result.total, page, limit });
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ error: "فشل في جلب البلاغات" });
    }
  });

  app.get("/api/admin/reports/stats", isAuthenticated, isAdmin, async (_req: any, res) => {
    try {
      const stats = await storage.getReportStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching report stats:", error);
      res.status(500).json({ error: "فشل في جلب إحصائيات البلاغات" });
    }
  });

  app.get("/api/admin/reports/project/:projectId", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const projectId = parseIntParam(req.params.projectId);
      if (projectId === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const reports = await storage.getReportsForProject(projectId);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching project reports:", error);
      res.status(500).json({ error: "فشل في جلب بلاغات المشروع" });
    }
  });

  app.get("/api/admin/reports/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const report = await storage.getContentReport(id);
      if (!report) return res.status(404).json({ error: "البلاغ غير موجود" });
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب البلاغ" });
    }
  });

  app.patch("/api/admin/reports/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const { status, adminNote, actionTaken, priority } = req.body;

      const report = await storage.getContentReport(id);
      if (!report) return res.status(404).json({ error: "البلاغ غير موجود" });

      const validStatuses = ["pending", "reviewed", "dismissed", "action_taken"];
      const validActions = ["none", "unpublished", "warned", "banned"];
      const validPriorities = ["normal", "high", "urgent"];

      const updates: any = {
        reviewedBy: req.user.claims.sub,
        reviewedAt: new Date(),
      };

      if (status && validStatuses.includes(status)) {
        updates.status = status;
        if (status === "dismissed" || status === "action_taken") {
          updates.resolvedAt = new Date();
        }
      }
      if (adminNote !== undefined) updates.adminNote = adminNote;
      if (actionTaken && validActions.includes(actionTaken)) updates.actionTaken = actionTaken;
      if (priority && validPriorities.includes(priority)) updates.priority = priority;

      if (actionTaken === "unpublished") {
        await storage.updateProject(report.projectId, {
          publishedToGallery: false,
          publishedToNews: false,
        });
        apiCache.invalidate("gallery");
        apiCache.invalidate("memoires");
        apiCache.invalidate("essays");
        apiCache.invalidate("leaderboard");
        apiCache.invalidate("essay-of-week");
      }

      if (actionTaken === "banned") {
        const project = await storage.getProject(report.projectId);
        if (project) {
          await storage.setUserApiSuspended(project.userId, true);
          await storage.updateProject(report.projectId, {
            publishedToGallery: false,
            publishedToNews: false,
            flagged: true,
            flagReason: adminNote || "تم الحظر بسبب بلاغ محتوى",
          });
          apiCache.invalidate("gallery");
          apiCache.invalidate("memoires");
          apiCache.invalidate("essays");
          apiCache.invalidate("leaderboard");
          apiCache.invalidate("essay-of-week");
        }
      }

      const updated = await storage.updateContentReport(id, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating report:", error);
      res.status(500).json({ error: "فشل في تحديث البلاغ" });
    }
  });

  app.delete("/api/admin/reports/bulk", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "لا توجد بلاغات محددة" });
      const adminId = req.user.claims.sub;
      let dismissed = 0;
      const failed: number[] = [];
      for (const id of ids) {
        try {
          await storage.updateContentReport(Number(id), { status: "dismissed", reviewedBy: adminId, reviewedAt: new Date(), resolvedAt: new Date() });
          dismissed++;
        } catch { failed.push(Number(id)); }
      }
      res.json({ success: true, dismissed, failed });
    } catch (error) {
      res.status(500).json({ error: "فشل في رفض البلاغات" });
    }
  });

  app.post("/api/admin/reports/bulk-warn", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "لا توجد بلاغات محددة" });
      const adminId = req.user.claims.sub;
      let warned = 0;
      const failed: number[] = [];
      for (const id of ids) {
        try {
          const report = await storage.getContentReport(Number(id));
          if (report) {
            await storage.updateContentReport(Number(id), { status: "action_taken", actionTaken: "warned", reviewedBy: adminId, reviewedAt: new Date(), resolvedAt: new Date() });
            const project = await storage.getProject(report.projectId);
            if (project) {
              notifyUser(project.userId, "content_warning", "تحذير بشأن المحتوى", "تم تلقي بلاغ عن أحد أعمالك. يرجى مراجعة المحتوى والتأكد من التزامه بسياسة المنصة.", "/profile");
            }
            warned++;
          } else { failed.push(Number(id)); }
        } catch { failed.push(Number(id)); }
      }
      res.json({ success: true, warned, failed });
    } catch (error) {
      res.status(500).json({ error: "فشل في إرسال التحذيرات" });
    }
  });

  app.post("/api/admin/reports/bulk-remove", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "لا توجد بلاغات محددة" });
      const adminId = req.user.claims.sub;
      let removed = 0;
      const failed: number[] = [];
      for (const id of ids) {
        try {
          const report = await storage.getContentReport(Number(id));
          if (report) {
            await storage.updateProject(report.projectId, { publishedToGallery: false, publishedToNews: false });
            apiCache.invalidate("gallery");
            apiCache.invalidate("memoires");
            apiCache.invalidate("essays");
            apiCache.invalidate("leaderboard");
            apiCache.invalidate("essay-of-week");
            await storage.updateContentReport(Number(id), { status: "action_taken", actionTaken: "unpublished", reviewedBy: adminId, reviewedAt: new Date(), resolvedAt: new Date() });
            removed++;
          } else { failed.push(Number(id)); }
        } catch { failed.push(Number(id)); }
      }
      res.json({ success: true, removed, failed });
    } catch (error) {
      res.status(500).json({ error: "فشل في إزالة المحتوى" });
    }
  });

  app.get("/api/admin/revenue-summary", isAuthenticated, isAdmin, async (_req: any, res) => {
    try {
      const pool = (await import("./db")).pool;
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      const planCountsResult = await pool.query(`SELECT plan, COUNT(*) as count FROM users WHERE plan IS NOT NULL AND plan != 'free' GROUP BY plan`);
      const planCounts: Record<string, number> = {};
      let totalSubscribers = 0;
      for (const row of planCountsResult.rows) {
        planCounts[row.plan] = parseInt(row.count);
        totalSubscribers += parseInt(row.count);
      }

      let mrr = 0;
      for (const [plan, count] of Object.entries(planCounts)) {
        const price = PLAN_PRICES[plan] || 0;
        mrr += (price / 100) * count;
      }

      const totalRevenueResult = await pool.query(`SELECT COALESCE(SUM(price), 0) as total FROM novel_projects WHERE paid = true`);
      const totalRevenue = parseInt(totalRevenueResult.rows[0]?.total || "0") / 100;

      const newSubsResult = await pool.query(`SELECT COUNT(*) as count FROM users WHERE plan IS NOT NULL AND plan != 'free' AND created_at > $1`, [thirtyDaysAgo]);
      const newSubscribers = parseInt(newSubsResult.rows[0]?.count || "0");

      const lastMonthSubsResult = await pool.query(`SELECT COUNT(*) as count FROM users WHERE plan IS NOT NULL AND plan != 'free' AND created_at > $1 AND created_at <= $2`, [sixtyDaysAgo, thirtyDaysAgo]);
      const lastMonthSubs = parseInt(lastMonthSubsResult.rows[0]?.count || "0");

      const cancelledResult = await pool.query(`SELECT COUNT(*) as count FROM users WHERE plan = 'free' AND updated_at > $1 AND created_at < $1`, [thirtyDaysAgo]);
      const churned = parseInt(cancelledResult.rows[0]?.count || "0");
      const churnRate = totalSubscribers > 0 ? Math.round((churned / (totalSubscribers + churned)) * 100) : 0;

      const planDistribution = Object.entries(planCounts).map(([plan, count]) => ({
        plan,
        label: plan === "all_in_one" ? "الشاملة" : plan === "essay" ? "المقالات" : plan === "scenario" ? "السيناريو" : plan === "trial" ? "تجريبي" : plan,
        count,
        revenue: ((PLAN_PRICES[plan] || 0) / 100) * count,
      }));

      res.json({
        mrr: Math.round(mrr * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalSubscribers,
        newSubscribers,
        lastMonthNewSubscribers: lastMonthSubs,
        churnRate,
        churned,
        planDistribution,
      });
    } catch (error) {
      console.error("Revenue summary error:", error);
      res.status(500).json({ error: "فشل في جلب بيانات الإيرادات" });
    }
  });

  app.post("/api/admin/daily-prompts/generate", isAuthenticated, isAdmin, async (_req: any, res) => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split("T")[0];
      const month = tomorrow.toLocaleDateString("ar-EG", { month: "long" });
      const dayOfWeek = tomorrow.toLocaleDateString("ar-EG", { weekday: "long" });
      const season = (() => {
        const m = tomorrow.getMonth();
        if (m >= 2 && m <= 4) return "الربيع";
        if (m >= 5 && m <= 7) return "الصيف";
        if (m >= 8 && m <= 10) return "الخريف";
        return "الشتاء";
      })();

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        max_completion_tokens: 300,
        messages: [
          {
            role: "system",
            content: "أنت مساعد أدبي عربي متخصص في توليد تحديات كتابية يومية. أنشئ بروبت كتابي واحد باللغة العربية الفصحى يناسب كتّاب من مستويات مختلفة.",
          },
          {
            role: "user",
            content: `أنشئ بروبت كتابي ليوم ${dayOfWeek} ${dateStr} (شهر ${month}، فصل ${season}).
يجب أن يكون:
- مُلهماً ومفتوحاً للتأويل
- بين 20 و 80 كلمة
- مناسباً لجميع أنواع الكتابة (نثر، شعر، خواطر، قصة)
- مرتبطاً بالموسم أو الوقت من السنة إن أمكن

أعد فقط نص البروبت بدون أي شرح إضافي.`,
          },
        ],
      });

      const promptText = response.choices?.[0]?.message?.content?.trim();
      if (!promptText) return res.status(500).json({ error: "فشل في توليد البروبت" });

      res.json({ promptText, promptDate: dateStr });
    } catch (error) {
      console.error("AI prompt generation error:", error);
      res.status(500).json({ error: "فشل في توليد البروبت بالذكاء الاصطناعي" });
    }
  });

  app.get("/api/user/free-usage", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user || user.plan !== "free") {
        return res.json({ plan: user?.plan || "free", unlimited: true });
      }
      const { projectsUsed, generationsUsed } = await storage.checkAndResetFreeMonthly(userId);
      res.json({
        plan: "free",
        unlimited: false,
        projectsUsed,
        projectsLimit: FREE_MONTHLY_PROJECTS,
        generationsUsed,
        generationsLimit: FREE_MONTHLY_GENERATIONS,
      });
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب بيانات الاستخدام" });
    }
  });

  // ===== Leaderboard =====
  app.get("/api/public/leaderboard", async (req, res) => {
    serveCached(req, res, "leaderboard", 120, async () => {
      return await storage.getLeaderboard(20);
    });
  });

  // ===== Essay of Week =====
  app.get("/api/public/essay-of-week", async (req, res) => {
    serveCached(req, res, "essay-of-week", 120, async () => {
      return await storage.getEssayOfWeek();
    });
  });

  // ===== Related Essays =====
  app.get("/api/public/essays/:id/related", async (req, res) => {
    try {
      const essayId = parseInt(req.params.id);
      const subject = (req.query.subject as string) || null;
      const related = await storage.getRelatedEssays(essayId, subject, 3);
      res.json(related);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب المقالات المشابهة" });
    }
  });

  // ===== Essay Comments =====
  app.post("/api/public/essays/:id/comment", async (req, res) => {
    try {
      const essayId = parseInt(req.params.id);
      const { authorName, content } = req.body;
      if (!authorName?.trim() || !content?.trim()) return res.status(400).json({ error: "الاسم والتعليق مطلوبان" });
      if (content.length > 1000) return res.status(400).json({ error: "التعليق طويل جداً" });
      const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.ip || "unknown";
      const ipHash = crypto.createHash("sha256").update(ip + String(essayId)).digest("hex");
      const comment = await storage.createEssayComment({ essayId, authorName: authorName.trim(), content: content.trim(), ipHash });
      const essay = await storage.getProject(essayId);
      if (essay && essay.userId) {
        notifyUser(essay.userId, "comment", "تعليق جديد", `علّق ${authorName.trim()} على مقالك "${essay.title}"`, `/essay/${(essay as any).shareToken || ""}`);
      }
      res.json({ success: true, comment, message: "تم نشر تعليقك" });
    } catch (error) {
      res.status(500).json({ error: "فشل في إرسال التعليق" });
    }
  });

  app.get("/api/public/essays/:id/comments", async (req, res) => {
    try {
      const essayId = parseInt(req.params.id);
      const comments = await storage.getEssayComments(essayId, true);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب التعليقات" });
    }
  });

  app.get("/api/admin/comments/pending", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const result = await storage.getPendingComments(limit, offset);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب التعليقات المعلقة" });
    }
  });

  app.patch("/api/admin/comments/:id/approve", isAuthenticated, isAdmin, async (req, res) => {
    try {
      await storage.approveEssayComment(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "فشل في الموافقة على التعليق" });
    }
  });

  app.delete("/api/admin/comments/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      await storage.deleteEssayComment(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "فشل في حذف التعليق" });
    }
  });

  // ===== Project Comments =====
  app.post("/api/projects/:shareToken/comments", async (req, res) => {
    try {
      const { shareToken } = req.params;
      const project = await storage.getProjectByShareToken(shareToken);
      if (!project || !(project as any).shareToken) {
        return res.status(404).json({ error: "العمل غير موجود أو غير منشور" });
      }
      const { authorName, content } = req.body;
      if (!authorName?.trim() || !content?.trim()) return res.status(400).json({ error: "الاسم والتعليق مطلوبان" });
      if (content.length > 1000) return res.status(400).json({ error: "التعليق طويل جداً" });
      const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.ip || "unknown";
      const ipHash = crypto.createHash("sha256").update(ip + String(project.id)).digest("hex");
      const existing = await db.execute(dsql`
        SELECT COUNT(*)::int as cnt FROM project_comments
        WHERE ip_hash = ${ipHash} AND created_at > NOW() - INTERVAL '1 hour'
      `);
      if ((existing.rows[0] as any)?.cnt >= 3) {
        return res.status(429).json({ error: "عدد التعليقات المسموح به في الساعة تم تجاوزه" });
      }
      const comment = await storage.createProjectComment({ projectId: project.id, authorName: authorName.trim(), content: content.trim(), ipHash });
      if (project.userId) {
        notifyUser(project.userId, "comment", "تعليق جديد على عملك", `علّق ${authorName.trim()} على عملك "${project.title}"`, `/shared/${(project as any).shareToken || ""}`);
      }
      res.json({ success: true, comment, message: "تم نشر تعليقك" });
    } catch (error) {
      res.status(500).json({ error: "فشل في إرسال التعليق" });
    }
  });

  app.get("/api/projects/:shareToken/comments", async (req, res) => {
    try {
      const { shareToken } = req.params;
      const project = await storage.getProjectByShareToken(shareToken);
      if (!project) return res.status(404).json({ error: "العمل غير موجود" });
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;
      const result = await storage.getProjectCommentsPaginated(project.id, limit, offset);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب التعليقات" });
    }
  });

  app.post("/api/project-comments/:id/report", async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      if (isNaN(commentId)) return res.status(400).json({ error: "معرّف غير صالح" });
      const comment = await storage.getProjectComment(commentId);
      if (!comment) return res.status(404).json({ error: "التعليق غير موجود" });
      const { reason } = req.body;
      const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.ip || "unknown";
      const reporterId = (req as any).user?.claims?.sub || null;
      await db.execute(dsql`
        INSERT INTO content_reports (project_id, reporter_ip, reporter_user_id, reason, sub_reason, status, created_at)
        VALUES (${(comment as any).project_id}, ${ip}, ${reporterId}, ${"تعليق مخالف"}, ${(reason || "إبلاغ").substring(0, 500)}, 'pending', NOW())
      `);
      res.json({ success: true, message: "تم الإبلاغ عن التعليق" });
    } catch (error) {
      res.status(500).json({ error: "فشل في الإبلاغ" });
    }
  });

  app.delete("/api/project-comments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const commentId = parseInt(req.params.id);
      if (isNaN(commentId)) return res.status(400).json({ error: "معرّف غير صالح" });
      const userId = req.user.claims.sub;
      const comment = await storage.getProjectComment(commentId);
      if (!comment) return res.status(404).json({ error: "التعليق غير موجود" });
      const project = await storage.getProject((comment as any).project_id);
      const isOwner = project && project.userId === userId;
      const dbUser = await storage.getUser(userId);
      const isAdminUser = dbUser?.role === "admin";
      if (!isOwner && !isAdminUser) return res.status(403).json({ error: "غير مصرّح بحذف هذا التعليق" });
      await storage.deleteProjectComment(commentId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "فشل في حذف التعليق" });
    }
  });

  app.get("/api/admin/project-comments/recent", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const result = await storage.getRecentProjectComments(limit, offset);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب التعليقات" });
    }
  });

  app.get("/api/admin/project-comments/pending", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const result = await storage.getPendingProjectComments(limit, offset);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب التعليقات المعلقة" });
    }
  });

  app.patch("/api/admin/project-comments/:id/approve", isAuthenticated, isAdmin, async (req, res) => {
    try {
      await storage.approveProjectComment(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "فشل في الموافقة على التعليق" });
    }
  });

  app.delete("/api/admin/project-comments/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      await storage.deleteProjectComment(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "فشل في حذف التعليق" });
    }
  });

  // ===== Collections =====
  app.get("/api/collections", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const cols = await storage.getUserCollections(userId);
      res.json(cols);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب القوائم" });
    }
  });

  app.post("/api/collections", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, description, isPublic } = req.body;
      if (!name?.trim()) return res.status(400).json({ error: "اسم القائمة مطلوب" });
      const slug = name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\u0600-\u06ff-]/g, "").substring(0, 50) + "-" + Date.now().toString(36);
      const col = await storage.createCollection({ userId, name: name.trim(), slug, description: description?.trim() || null, isPublic: !!isPublic });
      res.json(col);
    } catch (error) {
      res.status(500).json({ error: "فشل في إنشاء القائمة" });
    }
  });

  app.get("/api/public/collections/:slug", async (req, res) => {
    try {
      const col = await storage.getCollectionBySlug(req.params.slug);
      if (!col) return res.status(404).json({ error: "القائمة غير موجودة" });
      res.json(col);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب القائمة" });
    }
  });

  app.post("/api/collections/:id/items", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const collectionId = parseInt(req.params.id);
      const col = await storage.getCollectionById(collectionId);
      if (!col || col.userId !== userId) return res.status(403).json({ error: "غير مصرح" });
      let { essayId, projectId, shareToken } = req.body;

      if (shareToken && !projectId && !essayId) {
        const project = await storage.getProjectByShareToken(shareToken);
        if (!project) return res.status(404).json({ error: "العمل غير موجود" });
        projectId = project.id;
      }

      if (!essayId && !projectId) return res.status(400).json({ error: "essayId أو projectId أو shareToken مطلوب" });
      if (essayId && projectId) return res.status(400).json({ error: "يجب تحديد essayId أو projectId وليس كلاهما" });

      const resolvedProjectId = projectId ? parseInt(projectId) : undefined;
      const resolvedEssayId = essayId ? parseInt(essayId) : undefined;

      const targetId = resolvedProjectId || resolvedEssayId;
      if (targetId) {
        const targetProject = await storage.getProject(targetId);
        if (!targetProject || !targetProject.shareToken) {
          return res.status(400).json({ error: "لا يمكن حفظ عمل غير منشور" });
        }
      }

      await storage.addToCollection(collectionId, resolvedEssayId, resolvedProjectId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "فشل في إضافة العنصر" });
    }
  });

  app.get("/api/collections/:id/items", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const collectionId = parseInt(req.params.id);
      const col = await storage.getCollectionById(collectionId);
      if (!col || col.userId !== userId) return res.status(403).json({ error: "غير مصرح" });
      const items = await storage.getCollectionItems(collectionId);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب العناصر" });
    }
  });

  app.delete("/api/collections/:id/items/:essayId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const collectionId = parseInt(req.params.id);
      const col = await storage.getCollectionById(collectionId);
      if (!col || col.userId !== userId) return res.status(403).json({ error: "غير مصرح" });
      await storage.removeFromCollection(collectionId, parseInt(req.params.essayId));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "فشل في إزالة العنصر" });
    }
  });

  app.delete("/api/collections/:id/projects/:projectId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const collectionId = parseInt(req.params.id);
      const col = await storage.getCollectionById(collectionId);
      if (!col || col.userId !== userId) return res.status(403).json({ error: "غير مصرح" });
      await storage.removeFromCollection(collectionId, undefined, parseInt(req.params.projectId));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "فشل في إزالة العنصر" });
    }
  });

  app.delete("/api/collections/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteCollection(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "فشل في حذف القائمة" });
    }
  });

  // ===== Verified Applications =====
  app.post("/api/apply-verified", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const paidPlans = ["essay", "scenario", "all_in_one"];
      const isAdmin = user?.role === "admin";
      if (!user || (!isAdmin && !paidPlans.includes(user.plan || ""))) {
        return res.status(403).json({ error: "شارة التوثيق متاحة فقط لأصحاب الخطط المدفوعة. يرجى الترقية أولاً." });
      }
      const { bio, writingSamples, socialLinks } = req.body;
      if (!bio?.trim() || bio.trim().length < 50) return res.status(400).json({ error: "السيرة الذاتية مطلوبة (50 حرفاً على الأقل)" });
      const app = await storage.submitVerifiedApplication({ userId, bio: bio.trim(), writingSamples: writingSamples?.trim() || null, socialLinks: socialLinks?.trim() || null });
      res.json({ success: true, application: app });
    } catch (error) {
      res.status(500).json({ error: "فشل في إرسال الطلب" });
    }
  });

  app.get("/api/admin/verified-applications", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const apps = await storage.getVerifiedApplications(status);
      res.json(apps);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب الطلبات" });
    }
  });

  app.patch("/api/admin/verified-applications/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { status, adminNote } = req.body;
      if (!["approved", "rejected"].includes(status)) return res.status(400).json({ error: "حالة غير صالحة" });
      const updated = await storage.updateVerifiedApplication(parseInt(req.params.id), status, adminNote);
      if (status === "approved" && updated.user_id) {
        await storage.setUserVerified(updated.user_id as string, true);
      }
      if (updated.user_id) {
        const appUser = await storage.getUser(updated.user_id as string);
        if (appUser?.email) {
          const firstName = appUser.firstName || appUser.displayName || "عزيزي الكاتب";
          sendVerifiedApplicationStatusEmail(
            appUser.email,
            firstName,
            status as "approved" | "rejected",
            adminNote,
          ).catch((e) => console.error("Failed to send verified application status email:", e));
        }
        const isApproved = status === "approved";
        await storage.createNotification({
          userId: updated.user_id as string,
          type: isApproved ? "verified_approved" : "verified_rejected",
          title: isApproved ? "تم قبول طلب التوثيق" : "طلب التوثيق قيد المراجعة",
          message: isApproved
            ? "مبروك! تم الموافقة على طلب التوثيق الخاص بك. ستظهر شارة الكاتب الموثّق بجانب اسمك في جميع أنحاء المنصة."
            : `لم يتم قبول طلب التوثيق في الوقت الحالي.${adminNote ? ` سبب: ${adminNote}` : " يمكنك التقديم مجدداً بعد نشر المزيد من الأعمال."}`,
          link: isApproved ? "/profile" : "/apply-verified",
        });
      }
      res.json({ success: true, application: updated });
    } catch (error) {
      res.status(500).json({ error: "فشل في تحديث الطلب" });
    }
  });

  // ===== Referral Program =====
  app.get("/api/me/referral", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getReferralStats(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب بيانات الإحالة" });
    }
  });

  app.post("/api/apply-referral", async (req, res) => {
    try {
      const { referralCode, userId } = req.body;
      if (!referralCode || !userId) return res.status(400).json({ error: "البيانات ناقصة" });
      const result = await storage.applyReferral(referralCode, userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "فشل في تطبيق رمز الإحالة" });
    }
  });

  // ===== Writing Streak =====
  app.get("/api/me/streak", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json({ streakDays: user?.writingStreak || 0, lastWritingDate: user?.lastWritingDate || null });
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب بيانات السلسلة" });
    }
  });

  // ===== Embed Widget (HTML, not JSON) =====
  app.get("/embed/essay/:token", async (req, res) => {
    try {
      const essay = await storage.getPublicEssayByShareToken(req.params.token);
      if (!essay) return res.status(404).send("<p>المقال غير موجود</p>");
      res.setHeader("X-Frame-Options", "ALLOWALL");
      res.setHeader("Content-Security-Policy", "frame-ancestors *");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${essay.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Georgia', serif; background: #fafaf8; color: #1a1a1a; padding: 16px; line-height: 1.8; direction: rtl; }
    .title { font-size: 1.2rem; font-weight: bold; margin-bottom: 8px; }
    .author { font-size: 0.85rem; color: #666; margin-bottom: 12px; }
    .excerpt { font-size: 0.95rem; color: #333; margin-bottom: 16px; line-height: 1.9; }
    .cta { display: block; background: #1a1a2e; color: #fff; text-align: center; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 0.85rem; }
    .brand { text-align: center; margin-top: 8px; font-size: 0.75rem; color: #999; }
  </style>
</head>
<body>
  <div class="title">${essay.title}</div>
  <div class="author">${essay.authorName}</div>
  ${essay.mainIdea ? `<div class="excerpt">${essay.mainIdea.substring(0, 300)}...</div>` : ""}
  <a class="cta" href="https://qalamai.net/essay/${essay.shareToken}" target="_blank">اقرأ المقال كاملاً على QalamAI</a>
  <div class="brand">Powered by <a href="https://qalamai.net" target="_blank" style="color:#999;">QalamAI</a></div>
</body>
</html>`;
      res.send(html);
    } catch (error) {
      res.status(500).send("<p>حدث خطأ</p>");
    }
  });

  // ── Author Analytics ─────────────────────────────────────────────────────────
  app.get("/api/me/analytics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const analytics = await storage.getAuthorAnalytics(userId);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب الإحصائيات" });
    }
  });

  app.get("/api/me/analytics/views", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = await storage.getViewsSeries(userId);
      res.json(data);
    } catch (error) {
      console.error("Analytics views error:", error);
      res.status(500).json({ error: "فشل في جلب بيانات المشاهدات" });
    }
  });

  app.get("/api/me/analytics/followers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = await storage.getFollowerHistory(userId);
      res.json(data);
    } catch (error) {
      console.error("Analytics followers error:", error);
      res.status(500).json({ error: "فشل في جلب بيانات المتابعين" });
    }
  });

  app.get("/api/me/analytics/tips-history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tips = await storage.getTipsByAuthor(userId);
      const total = tips.reduce((sum: number, t: any) => sum + Number(t.amount_cents || 0), 0);
      res.json({
        totalCents: total,
        tips: tips.map((t: any) => ({
          id: t.id,
          amountCents: Number(t.amount_cents || 0),
          fromName: t.fromName || null,
          fromUserId: t.from_user_id || null,
          projectId: t.project_id || null,
          createdAt: t.created_at,
          status: t.status,
        })),
      });
    } catch (error) {
      console.error("Analytics tips error:", error);
      res.status(500).json({ error: "فشل في جلب بيانات الإكراميات" });
    }
  });

  app.get("/api/me/analytics/completion", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = await storage.getCompletionRates(userId);
      res.json(data);
    } catch (error) {
      console.error("Analytics completion error:", error);
      res.status(500).json({ error: "فشل في جلب بيانات الإتمام" });
    }
  });

  app.get("/api/me/analytics/countries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = await storage.getViewsByCountry(userId);
      res.json(data);
    } catch (error) {
      console.error("Analytics countries error:", error);
      res.status(500).json({ error: "فشل في جلب بيانات الدول" });
    }
  });

  app.get("/api/me/analytics/views-by-story", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = await storage.getViewsByStory(userId);
      res.json(data);
    } catch (error) {
      console.error("Analytics views-by-story error:", error);
      res.status(500).json({ error: "فشل في جلب بيانات المشاهدات حسب العمل" });
    }
  });

  // ── Email subscriptions (non-platform followers) ─────────────────────────────
  app.post("/api/authors/:id/subscribe-email", async (req, res) => {
    try {
      const authorId = req.params.id;
      const { email } = req.body;
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "البريد الإلكتروني غير صالح" });
      const author = await storage.getUser(authorId);
      if (!author) return res.status(404).json({ error: "الكاتب غير موجود" });
      const { token, alreadySubscribed } = await storage.subscribeEmailToAuthor(email.trim().toLowerCase(), authorId);
      if (!alreadySubscribed) {
        const authorName = author.displayName || author.firstName || "الكاتب";
        // Fetch author's 3 most recent published works to include in welcome email
        const recentWorks = await db
          .select({ title: novelProjects.title, shareToken: novelProjects.shareToken })
          .from(novelProjects)
          .where(and(eq(novelProjects.userId, authorId), isNotNull(novelProjects.shareToken)))
          .orderBy(desc(novelProjects.createdAt))
          .limit(3)
          .then(rows => rows.filter(r => r.shareToken).map(r => ({ title: r.title, shareToken: r.shareToken! })))
          .catch(() => []);
        sendEmailSubscriptionConfirmation(email, authorName, authorId, token, recentWorks).catch(() => {});
        // Notify the author of the new email subscriber
        storage.createNotification({
          userId: authorId,
          type: "email_subscriber",
          title: "مشترك جديد بالبريد",
          message: `مستخدم جديد اشترك لتلقّي مقالاتك عبر البريد الإلكتروني`,
        }).catch(() => {});
      }
      res.json({ success: true, alreadySubscribed });
    } catch (error) {
      console.error("[Subscribe] Error:", error);
      res.status(500).json({ error: "حدث خطأ أثناء الاشتراك" });
    }
  });

  app.get("/api/unsubscribe/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const removed = await storage.unsubscribeEmailByToken(token);
      if (removed) {
        res.send(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"/><title>إلغاء الاشتراك — QalamAI</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0f0f0f;color:#e5e5e5;direction:rtl;} .box{background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:40px;max-width:400px;text-align:center;}</style></head><body><div class="box"><h2 style="color:#d4a853;">تم إلغاء الاشتراك</h2><p>تم إلغاء اشتراكك بنجاح. لن تتلقّى تحديثات من هذا الكاتب بعد الآن.</p><a href="https://qalamai.net" style="color:#d4a853;">العودة إلى QalamAI</a></div></body></html>`);
      } else {
        res.status(404).send(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"/><title>رابط غير صالح — QalamAI</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0f0f0f;color:#e5e5e5;direction:rtl;} .box{background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:40px;max-width:400px;text-align:center;}</style></head><body><div class="box"><h2>رابط غير صالح</h2><p>هذا الرابط منتهي أو لم يُعثر على الاشتراك.</p><a href="https://qalamai.net" style="color:#d4a853;">العودة إلى QalamAI</a></div></body></html>`);
      }
    } catch (error) {
      res.status(500).send("حدث خطأ");
    }
  });

  app.get("/api/digest-unsubscribe", async (req, res) => {
    try {
      const { uid, cat, tok } = req.query as { uid?: string; cat?: string; tok?: string };
      if (!uid || !cat || !tok || !["digest", "follow"].includes(cat)) {
        return res.status(400).send(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"/><title>رابط غير صالح — QalamAI</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0f0f0f;color:#e5e5e5;direction:rtl;} .box{background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:40px;max-width:400px;text-align:center;}</style></head><body><div class="box"><h2>رابط غير صالح</h2><p>تعذّر التحقق من الرابط.</p><a href="https://qalamai.net" style="color:#d4a853;">العودة إلى QalamAI</a></div></body></html>`);
      }
      if (!verifyDigestUnsubscribeToken(uid, cat, tok)) {
        return res.status(403).send(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"/><title>رابط غير صالح — QalamAI</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0f0f0f;color:#e5e5e5;direction:rtl;} .box{background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:40px;max-width:400px;text-align:center;}</style></head><body><div class="box"><h2>رابط غير صالح</h2><p>هذا الرابط منتهي الصلاحية أو غير صالح.</p><a href="https://qalamai.net" style="color:#d4a853;">العودة إلى QalamAI</a></div></body></html>`);
      }
      const prefs: Record<string, boolean> = {};
      if (cat === "digest") {
        prefs.digestOptOut = true;
      } else if (cat === "follow") {
        prefs.emailFollowPublications = false;
      }
      await storage.setUserEmailPreferences(uid, prefs);
      const message = cat === "digest"
        ? "تم إلغاء اشتراكك من النشرة الأسبوعية بنجاح."
        : "تم إيقاف إشعارات المتابَعين بنجاح.";
      res.send(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"/><title>تم إلغاء الاشتراك — QalamAI</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0f0f0f;color:#e5e5e5;direction:rtl;} .box{background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:40px;max-width:400px;text-align:center;}</style></head><body><div class="box"><h2 style="color:#d4a853;">تم إلغاء الاشتراك</h2><p>${message}</p><p style="font-size:13px;color:#888;">يمكنك إعادة تفعيل الإشعارات من صفحة الملف الشخصي.</p><a href="https://qalamai.net" style="color:#d4a853;">العودة إلى QalamAI</a></div></body></html>`);
    } catch (error) {
      res.status(500).send("حدث خطأ");
    }
  });

  app.get("/api/authors/:id/check-email-subscription", async (req, res) => {
    try {
      const authorId = req.params.id;
      const { email } = req.query as { email?: string };
      if (!email) return res.json({ subscribed: false });
      const subscribed = await storage.isEmailSubscribed(email.trim().toLowerCase(), authorId);
      res.json({ subscribed });
    } catch {
      res.json({ subscribed: false });
    }
  });

  // ── RSS Feed Per Author ───────────────────────────────────────────────────────
  app.get("/rss/author/:id", async (req, res) => {
    try {
      const authorId = req.params.id;
      const author = await storage.getUser(authorId);
      if (!author) return res.status(404).send("المؤلف غير موجود");
      const authorName = author.displayName || author.firstName || "كاتب";
      const baseUrl = "https://qalamai.net";
      const rows: any[] = (await db.execute(dsql`
        SELECT id, title, main_idea, share_token, created_at
        FROM novel_projects
        WHERE user_id = ${authorId}
          AND (published_to_news = true OR published_to_gallery = true)
          AND share_token IS NOT NULL
        ORDER BY created_at DESC LIMIT 20
      `)).rows;
      const items = rows.map(p => `
    <item>
      <title><![CDATA[${p.title}]]></title>
      <link>${baseUrl}/essay/${p.share_token}</link>
      <guid>${baseUrl}/essay/${p.share_token}</guid>
      <pubDate>${new Date(p.created_at).toUTCString()}</pubDate>
      ${p.main_idea ? `<description><![CDATA[${String(p.main_idea).substring(0, 300)}]]></description>` : ""}
    </item>`).join("\n");
      res.set("Content-Type", "application/rss+xml; charset=utf-8");
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title><![CDATA[${authorName} — QalamAI]]></title>
    <link>${baseUrl}/author/${authorId}</link>
    <description><![CDATA[أعمال ${authorName} على منصة QalamAI]]></description>
    <language>ar</language>
    ${items}
  </channel>
</rss>`);
    } catch (error) {
      res.status(500).send("حدث خطأ");
    }
  });

  // ── Daily Writing Prompts ─────────────────────────────────────────────────────
  app.get("/api/daily-prompt", async (_req, res) => {
    try {
      const prompt = await storage.getTodayPrompt();
      if (!prompt) return res.json({ prompt: null, entries: [], entryCount: 0 });
      const entries = await storage.getPromptEntries(Number(prompt.id));
      res.json({ prompt, entries, entryCount: entries.length });
    } catch (error) {
      // Table may not exist yet in production — return empty gracefully
      res.json({ prompt: null, entries: [], entryCount: 0 });
    }
  });

  app.get("/api/daily-prompt/past", async (_req, res) => {
    try {
      const prompts = await storage.getPastPrompts(14);
      res.json(prompts);
    } catch (error) {
      res.json([]);
    }
  });

  app.post("/api/daily-prompt", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== "admin") return res.status(403).json({ error: "غير مصرح" });
      const { promptText, promptDate } = req.body;
      if (!promptText || !promptDate) return res.status(400).json({ error: "بيانات ناقصة" });
      const prompt = await storage.createDailyPrompt({ promptText, promptDate, active: true });
      res.json(prompt);
    } catch (error) {
      res.status(500).json({ error: "فشل في إنشاء البروبت" });
    }
  });

  app.post("/api/daily-prompt/entry", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { promptId, content } = req.body;
      if (!promptId || !content?.trim()) return res.status(400).json({ error: "بيانات ناقصة" });
      if (content.trim().length < 20) return res.status(400).json({ error: "الإجابة قصيرة جداً (20 حرف على الأقل)" });
      if (content.trim().length > 2000) return res.status(400).json({ error: "الإجابة طويلة جداً (2000 حرف كحد أقصى)" });
      const entry = await storage.submitPromptEntry({ promptId: Number(promptId), userId, content: content.trim() });
      res.json(entry);
    } catch (error) {
      res.status(500).json({ error: "فشل في إرسال الإجابة" });
    }
  });

  app.get("/api/daily-prompt/:promptId/my-entry", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const promptId = parseIntParam(req.params.promptId);
      if (promptId === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const entry = await storage.getUserPromptEntry(promptId, userId);
      res.json({ entry: entry || null });
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب الإجابة" });
    }
  });

  app.post("/api/admin/daily-prompt/:promptId/winner", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== "admin") return res.status(403).json({ error: "غير مصرح" });
      const promptId = parseIntParam(req.params.promptId);
      if (promptId === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const { winnerId, winnerEntryId } = req.body;
      if (!winnerId || !winnerEntryId) return res.status(400).json({ error: "بيانات ناقصة" });
      await storage.setPromptWinner(promptId, winnerId, Number(winnerEntryId));
      notifyUser(winnerId, "prompt_winner", "تهانينا! فزت بتحدي الكتابة", "تم اختيارك فائزاً في تحدي الكتابة اليومي. مبارك!", "/daily-prompt");
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "فشل في تحديد الفائز" });
    }
  });

  // ── Author Tipping ────────────────────────────────────────────────────────────
  app.post("/api/tips/public-checkout", async (req: any, res) => {
    try {
      const fromUserId: string | null = req.user?.claims?.sub || null;
      const { toAuthorId, projectId, amountCents } = req.body;
      if (!toAuthorId || !amountCents || amountCents < 100) return res.status(400).json({ error: "بيانات غير صالحة" });
      const author = await storage.getUser(toAuthorId);
      if (!author) return res.status(404).json({ error: "الكاتب غير موجود" });
      const stripe = await getUncachableStripeClient();
      const baseUrl = process.env.REPLIT_DEPLOYMENT_URL ? `https://${process.env.REPLIT_DEPLOYMENT_URL}` : (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://qalamai.net");
      const authorName = author.displayName || author.firstName || "الكاتب";
      const successPath = projectId ? `/essay/` : (toAuthorId ? `/author/${toAuthorId}` : "");
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        customer_creation: "if_required",
        line_items: [{
          price_data: {
            currency: "usd",
            unit_amount: Number(amountCents),
            product_data: { name: `دعم الكاتب ${authorName} على QalamAI` },
          },
          quantity: 1,
        }],
        metadata: { type: "author_tip", fromUserId: fromUserId || "anonymous", toAuthorId, projectId: projectId ? String(projectId) : "" },
        success_url: `${baseUrl}${successPath}?tip=success`,
        cancel_url: `${baseUrl}${successPath}?tip=cancelled`,
      });
      await storage.createAuthorTip({ fromUserId: fromUserId ?? undefined, toAuthorId, projectId: projectId ? Number(projectId) : undefined, amountCents: Number(amountCents), stripeSessionId: session.id });
      res.json({ url: session.url });
    } catch (error) {
      console.error("[Tips] Public checkout error:", error);
      res.status(500).json({ error: "فشل في إنشاء جلسة الدفع" });
    }
  });

  app.post("/api/tips/checkout", isAuthenticated, async (req: any, res) => {
    try {
      const fromUserId = req.user.claims.sub;
      const { toAuthorId, projectId, amountCents } = req.body;
      if (!toAuthorId || !amountCents || amountCents < 100) return res.status(400).json({ error: "بيانات غير صالحة" });
      const author = await storage.getUser(toAuthorId);
      if (!author) return res.status(404).json({ error: "الكاتب غير موجود" });
      const stripe = await getUncachableStripeClient();
      const baseUrl = process.env.REPLIT_DEPLOYMENT_URL ? `https://${process.env.REPLIT_DEPLOYMENT_URL}` : (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://qalamai.net");
      const authorName = author.displayName || author.firstName || "الكاتب";
      const projectPath = projectId ? `/essay/` : "";
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: { name: `دعم الكاتب ${authorName} على QalamAI` },
          },
          quantity: 1,
        }],
        metadata: { type: "author_tip", fromUserId, toAuthorId, projectId: projectId ? String(projectId) : "" },
        success_url: `${baseUrl}${projectPath}?tip=success`,
        cancel_url: `${baseUrl}${projectPath}?tip=cancelled`,
      });
      await storage.createAuthorTip({ fromUserId, toAuthorId, projectId: projectId ? Number(projectId) : undefined, amountCents: Number(amountCents), stripeSessionId: session.id });
      res.json({ url: session.url });
    } catch (error) {
      console.error("[Tips] Checkout error:", error);
      res.status(500).json({ error: "فشل في إنشاء جلسة الدفع" });
    }
  });

  app.get("/api/tips/received", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tips = await storage.getTipsByAuthor(userId);
      const total = tips.reduce((sum, t) => sum + t.amountCents, 0);
      res.json({ tips, totalCents: total });
    } catch (error) {
      res.json({ tips: [], totalCents: 0 });
    }
  });


  // ── Work Voting ───────────────────────────────────────────────────────────────
  app.post("/api/projects/:id/vote", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseIntParam(req.params.id);
      if (!projectId) return res.status(400).json({ error: "معرف غير صالح" });
      const userId = req.user.claims.sub;
      const existing = await storage.getUserVote(projectId, userId);
      if (existing) {
        await storage.removeVote(projectId, userId);
        const voteCount = await storage.getVoteCount(projectId);
        return res.json({ voted: false, voteCount });
      }
      await storage.addVote(projectId, userId);
      const voteCount = await storage.getVoteCount(projectId);
      res.json({ voted: true, voteCount });
    } catch (error) {
      console.error("[Votes] Toggle vote error:", error);
      res.status(500).json({ error: "فشل في تسجيل التصويت" });
    }
  });

  app.get("/api/projects/:id/vote-count", async (req: any, res) => {
    try {
      const projectId = parseIntParam(req.params.id);
      if (!projectId) return res.status(400).json({ error: "معرف غير صالح" });
      const voteCount = await storage.getVoteCount(projectId);
      const userId: string | null = req.user?.claims?.sub ?? null;
      let voted: boolean | null = null;
      if (userId) {
        const v = await storage.getUserVote(projectId, userId);
        voted = v ? true : false;
      }
      res.json({ voteCount, voted });
    } catch (error) {
      console.error("[Votes] Vote count error:", error);
      res.status(500).json({ error: "فشل في جلب عدد الأصوات" });
    }
  });

  app.post("/api/votes/donate", async (req: any, res) => {
    try {
      const fromUserId: string | null = req.user?.claims?.sub ?? null;
      const { toAuthorId, projectId, amountCents } = req.body;
      if (!toAuthorId || !amountCents || Number(amountCents) < 100) return res.status(400).json({ error: "بيانات غير صالحة" });
      const author = await storage.getUser(toAuthorId);
      if (!author) return res.status(404).json({ error: "الكاتب غير موجود" });
      const stripe = await getUncachableStripeClient();
      const baseUrl = process.env.REPLIT_DEPLOYMENT_URL ? `https://${process.env.REPLIT_DEPLOYMENT_URL}` : (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://qalamai.net");
      const authorName = author.displayName || author.firstName || "الكاتب";
      const returnPath = projectId ? `/author/${toAuthorId}` : `/author/${toAuthorId}`;
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        customer_creation: "if_required",
        line_items: [{
          price_data: {
            currency: "usd",
            unit_amount: Number(amountCents),
            product_data: { name: `دعم الكاتب ${authorName} على QalamAI` },
          },
          quantity: 1,
        }],
        metadata: { type: "author_tip", fromUserId: fromUserId || "anonymous", toAuthorId, projectId: projectId ? String(projectId) : "" },
        success_url: `${baseUrl}${returnPath}?tip=success`,
        cancel_url: `${baseUrl}${returnPath}?tip=cancelled`,
      });
      await storage.createAuthorTip({ fromUserId: fromUserId ?? undefined, toAuthorId, projectId: projectId ? Number(projectId) : undefined, amountCents: Number(amountCents), stripeSessionId: session.id });
      res.json({ url: session.url });
    } catch (error) {
      console.error("[Votes] Donate error:", error);
      res.status(500).json({ error: "فشل في إنشاء جلسة الدفع" });
    }
  });

  app.get("/api/hall-of-glory/featured", async (_req, res) => {
    try {
      const featured = await storage.getFeaturedHallOfGlory();
      res.json(featured);
    } catch (error) {
      console.error("[HoG] Featured error:", error);
      res.status(500).json({ error: "فشل في جلب الأعمال المختارة" });
    }
  });

  // ── Plagiarism Check ──────────────────────────────────────────────────────────
  app.post("/api/plagiarism-check", isAuthenticated, async (req: any, res) => {
    try {
      if (!(await checkAiRateLimit(req, res))) return;
      const { projectId } = req.body;
      const userId = req.user.claims.sub;
      if (!projectId) return res.status(400).json({ error: "معرّف المشروع مطلوب" });
      const project = await storage.getProject(Number(projectId));
      if (!project || project.userId !== userId) return res.status(403).json({ error: "غير مصرح" });
      const chapters = await storage.getChaptersByProject(Number(projectId));
      const text = chapters.map((c: any) => c.content || "").join("\n\n").substring(0, 3000);
      if (!text.trim()) return res.json({ score: 100, verdict: "original", notes: "المقال فارغ", reasons: [] });
      const openai = new OpenAI({ apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY, baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL });
      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        max_completion_tokens: 600,
        messages: [
          { role: "system", content: "أنت محقق في أصالة المحتوى الأدبي العربي. حلل النص وأعطِ تقييماً لأصالته مع ذكر أسباب واضحة. أجب بـ JSON فقط: {\"score\": <0-100 نسبة الأصالة>, \"verdict\": \"original\" | \"suspicious\" | \"likely_copied\", \"notes\": \"<ملاحظة مختصرة>\", \"reasons\": [\"<سبب 1: عبارة أو نمط مشبوه مع توضيح>\", \"<سبب 2>\"]}. إذا كان المحتوى أصيلاً اترك reasons فارغة. إذا وجدت تشابهاً، اذكر العبارات أو الأنماط المحددة التي تبدو مقتبسة أو مكررة مع شرح السبب." },
          { role: "user", content: `حلل أصالة هذا النص:\n\n${text}` },
        ],
      });
      const raw = response.choices[0]?.message?.content || "{}";
      let result: any = { score: 85, verdict: "original", notes: "لم يتمكن من التحليل", reasons: [] };
      try { result = JSON.parse(raw); } catch {}
      if (!Array.isArray(result.reasons)) result.reasons = [];
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "فشل في فحص الأصالة" });
    }
  });

  // ── Content Series ────────────────────────────────────────────────────────────
  app.get("/api/series", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const series = await storage.getSeriesByUser(userId);
      res.json(series);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب السلاسل" });
    }
  });

  app.post("/api/series", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title, description } = req.body;
      if (!title?.trim()) return res.status(400).json({ error: "عنوان السلسلة مطلوب" });
      const series = await storage.createSeries({ userId, title: title.trim(), description: description?.trim() || null });
      res.json(series);
    } catch (error) {
      res.status(500).json({ error: "فشل في إنشاء السلسلة" });
    }
  });

  app.post("/api/series/suggest-description", isAuthenticated, async (req: any, res) => {
    try {
      if (!(await checkAiRateLimit(req, res))) return;
      const { title } = req.body;
      if (!title?.trim()) return res.status(400).json({ error: "العنوان مطلوب" });
      const openai = await getOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        max_completion_tokens: 120,
        messages: [
          {
            role: "system",
            content: "أنت أبو هاشم، وكيل أدبي عربي متمرس. مهمتك كتابة وصف موجز وجذاب لسلسلة محتوى أدبي بناءً على عنوانها. اكتب وصفاً عربياً من 2-3 جمل يوضح موضوع السلسلة وما يمكن أن يتوقعه القارئ منها. لا تستخدم النقاط أو العناوين، فقط نص متدفق."
          },
          {
            role: "user",
            content: `اكتب وصفاً لسلسلة محتوى بعنوان: "${title.trim()}"`
          }
        ]
      });
      const description = completion.choices[0]?.message?.content?.trim() || "";
      res.json({ description });
    } catch (error) {
      res.status(500).json({ error: "فشل في اقتراح الوصف" });
    }
  });

  app.get("/api/series/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const series = await storage.getSeriesById(id);
      if (!series) return res.status(404).json({ error: "السلسلة غير موجودة" });
      if (series.userId !== req.user.claims.sub) return res.status(403).json({ error: "غير مصرح" });
      res.json(series);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب السلسلة" });
    }
  });

  app.get("/api/public/series/:id", async (req, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const series = await storage.getSeriesById(id);
      if (!series) return res.status(404).json({ error: "السلسلة غير موجودة" });
      res.json(series);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب السلسلة" });
    }
  });

  app.post("/api/series/:id/items", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const seriesId = parseIntParam(req.params.id);
      if (seriesId === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const series = await storage.getSeriesById(seriesId);
      if (!series || series.userId !== userId) return res.status(403).json({ error: "غير مصرح" });
      const { projectId, orderIndex } = req.body;
      if (!projectId) return res.status(400).json({ error: "معرّف المشروع مطلوب" });
      const project = await storage.getProject(Number(projectId));
      if (!project || project.userId !== userId) return res.status(403).json({ error: "غير مصرح" });
      await storage.addSeriesItem(seriesId, Number(projectId), orderIndex || 0);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "فشل في إضافة العمل للسلسلة" });
    }
  });

  app.delete("/api/series/:id/items/:projectId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const seriesId = parseIntParam(req.params.id);
      const projectId = parseIntParam(req.params.projectId);
      if (seriesId === null || projectId === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const series = await storage.getSeriesById(seriesId);
      if (!series || series.userId !== userId) return res.status(403).json({ error: "غير مصرح" });
      await storage.removeSeriesItem(seriesId, projectId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "فشل في حذف العمل من السلسلة" });
    }
  });

  app.delete("/api/series/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const seriesId = parseIntParam(req.params.id);
      if (seriesId === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const series = await storage.getSeriesById(seriesId);
      if (!series || series.userId !== userId) return res.status(403).json({ error: "غير مصرح" });
      await storage.deleteSeries(seriesId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "فشل في حذف السلسلة" });
    }
  });

  // ===== Payout Settings =====
  app.get("/api/payout-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getPayoutSettings(userId);
      res.json(settings || null);
    } catch (error: unknown) {
      console.error("Get payout settings error:", error);
      res.status(500).json({ error: "فشل في جلب إعدادات الدفع" });
    }
  });

  app.post("/api/payout-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const schema = z.object({
        method: z.enum(["paypal", "kast", "bank", "stripe"]),
        paypalEmail: z.string().email().optional().nullable(),
        kastWalletId: z.string().max(200).optional().nullable(),
        bankAccountName: z.string().max(200).optional().nullable(),
        bankIban: z.string().max(100).optional().nullable(),
        bankSwift: z.string().max(20).optional().nullable(),
        bankCountry: z.string().max(100).optional().nullable(),
        stripeAccountId: z.string().max(100).optional().nullable(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: formatZodErrors(parsed.error) });
      const settings = await storage.upsertPayoutSettings({ userId, ...parsed.data });
      res.json(settings);
    } catch (error: unknown) {
      console.error("Upsert payout settings error:", error);
      res.status(500).json({ error: "فشل في حفظ إعدادات الدفع" });
    }
  });

  // ===== Social Media Hub (Super Admin) =====
  const isSuperAdmin = (req: any, res: any, next: any) => {
    const SUPER_IDS = ["39706084", "e482facd-d157-4e97-ad91-af96b8ec8f49"];
    const userId = req.user?.claims?.sub;
    if (!userId || !SUPER_IDS.includes(userId)) {
      return res.status(403).json({ error: "Super Admin فقط" });
    }
    next();
  };

  const impersonationSessions = new Map<string, { adminId: string; targetUserId: string; expiresAt: number }>();

  app.post("/api/admin/impersonate/:userId/start", isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const targetUserId = req.params.userId;
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) return res.status(404).json({ error: "المستخدم غير موجود" });

      const crypto = await import("crypto");
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = Date.now() + 30 * 60 * 1000;
      impersonationSessions.set(token, { adminId, targetUserId, expiresAt });

      console.log(`[Impersonation] Admin ${adminId} started impersonation of user ${targetUserId}`);

      res.json({
        success: true,
        token,
        user: {
          id: targetUser.id,
          displayName: (targetUser as any).displayName || targetUser.firstName || targetUser.email || "مستخدم",
          email: targetUser.email,
          plan: targetUser.plan,
          profileImageUrl: targetUser.profileImageUrl,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "فشل في بدء وضع العرض" });
    }
  });

  app.post("/api/admin/impersonate/stop", isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const { token } = req.body;
      if (token && impersonationSessions.has(token)) {
        const session = impersonationSessions.get(token)!;
        console.log(`[Impersonation] Admin ${session.adminId} stopped impersonation of user ${session.targetUserId}`);
        impersonationSessions.delete(token);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "فشل في إيقاف وضع العرض" });
    }
  });

  app.get("/api/admin/impersonate/view", isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const token = req.query.token as string;
      if (!token || !impersonationSessions.has(token)) {
        return res.status(401).json({ error: "جلسة العرض غير صالحة أو منتهية" });
      }
      const session = impersonationSessions.get(token)!;
      if (Date.now() > session.expiresAt) {
        impersonationSessions.delete(token);
        return res.status(401).json({ error: "انتهت صلاحية جلسة العرض" });
      }
      const targetUser = await storage.getUser(session.targetUserId);
      if (!targetUser) return res.status(404).json({ error: "المستخدم غير موجود" });

      const projects = await storage.getProjectsByUser(session.targetUserId);
      const notifications = await storage.getNotifications(session.targetUserId);

      res.json({
        user: {
          id: targetUser.id,
          displayName: (targetUser as any).displayName || targetUser.firstName || targetUser.email || "مستخدم",
          email: targetUser.email,
          plan: targetUser.plan,
          profileImageUrl: targetUser.profileImageUrl,
          role: targetUser.role,
          createdAt: targetUser.createdAt,
        },
        projects: projects.slice(0, 20).map((p: any) => ({
          id: p.id,
          title: p.title,
          type: p.type,
          status: p.status,
          createdAt: p.createdAt,
          publishedToGallery: p.publishedToGallery,
        })),
        notificationCount: notifications.filter((n: any) => !n.read).length,
        totalProjects: projects.length,
      });
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب بيانات العرض" });
    }
  });

  app.get("/api/admin/social/posts", isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const status = req.query.status as string | undefined;
      const posts = await storage.getSocialPosts(status || undefined);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب المنشورات" });
    }
  });

  app.post("/api/admin/social/posts", isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const { content, platforms, scheduledAt, status, postType, coverImageUrl } = req.body;
      if (!content || !platforms || !Array.isArray(platforms) || platforms.length === 0) {
        return res.status(400).json({ error: "المحتوى والمنصات مطلوبة" });
      }
      const post = await storage.createSocialPost({
        content,
        platforms,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: status || "draft",
        postType: postType || "marketing",
        coverImageUrl: coverImageUrl || null,
      });
      res.json(post);
    } catch (error) {
      res.status(500).json({ error: "فشل في إنشاء المنشور" });
    }
  });

  app.patch("/api/admin/social/posts/:id", isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const { content, platforms, scheduledAt, status, postType, coverImageUrl } = req.body;
      const updates: any = {};
      if (content !== undefined) updates.content = content;
      if (platforms !== undefined) updates.platforms = platforms;
      if (scheduledAt !== undefined) updates.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
      if (status !== undefined) updates.status = status;
      if (postType !== undefined) updates.postType = postType;
      if (coverImageUrl !== undefined) updates.coverImageUrl = coverImageUrl;
      const post = await storage.updateSocialPost(id, updates);
      res.json(post);
    } catch (error) {
      res.status(500).json({ error: "فشل في تعديل المنشور" });
    }
  });

  app.delete("/api/admin/social/posts/:id", isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      await storage.deleteSocialPost(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "فشل في حذف المنشور" });
    }
  });

  app.post("/api/admin/social/generate-daily", isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const requestedPlatforms = req.body?.platforms;
      const source = req.body?.source || "dashboard";
      const bestTimes = await storage.getBestPostingTimes();
      const topHours = bestTimes.length >= 2
        ? [bestTimes[0].hour, bestTimes[1].hour]
        : [9, 13, 17, 20, 22];

      const scheduleHours = bestTimes.length >= 2
        ? [topHours[0], topHours[0], topHours[1], topHours[1], Math.min(topHours[0], topHours[1]) + 2]
        : [9, 13, 17, 20, 22];

      const validPlatformKeys = ["facebook", "instagram", "x", "tiktok", "linkedin"];
      const userPlatforms = Array.isArray(requestedPlatforms)
        ? requestedPlatforms.filter((p: string) => validPlatformKeys.includes(p))
        : null;

      const platformFormatGuide: Record<string, string> = {
        facebook: "فيسبوك: منشور طويل نسبياً (3-5 فقرات)، مع CTA واضح ورابط مباشر.",
        instagram: "إنستغرام: كابشن جذاب مع إيموجيات مناسبة، و15-20 هاشتاق متنوع.",
        x: "X/تويتر: تغريدة قصيرة (حد 280 حرف تقريباً)، مختصرة ومؤثرة مع 3-5 هاشتاقات.",
        tiktok: "TikTok: نص قصير جداً بأسلوب شبابي حيوي، مع هاشتاقات ترند.",
        linkedin: "LinkedIn: منشور مهني احترافي موجه لصنّاع القرار والمثقفين.",
      };

      const today = new Date();
      const posts: any[] = [];

      for (let i = 0; i < 5; i++) {
        const isLiterary = i >= 2;
        const postType = isLiterary ? "literary" : "marketing";
        const platforms = userPlatforms && userPlatforms.length > 0
          ? userPlatforms
          : isLiterary
            ? ["facebook", "instagram", "x"]
            : ["facebook", "instagram", "x", "tiktok", "linkedin"];

        const platformInstructions = platforms
          .map((p) => platformFormatGuide[p] || "")
          .filter(Boolean)
          .join("\n");

        const prompt = isLiterary
          ? `اكتب خاطرة أدبية عربية فصيحة قصيرة (3-5 أسطر) بأسلوب شاعري مؤثر عن ${["الحنين", "الأمل", "الحب"][i - 2] || "الحياة"}.

في نهاية الخاطرة أضف:
- عبارة CTA: "اكتشف عالم الكتابة العربية على QalamAI.net"
- رابط: qalamai.net
- 5 هاشتاقات عربية مناسبة`
          : `اكتب منشوراً تسويقياً لمنصة QalamAI (qalamai.net) — منصة كتابة عربية بالذكاء الاصطناعي تتيح للكتّاب إنشاء روايات ومقالات وسيناريوهات وخواطر وقصائد.
${i === 0 ? "ركز على سهولة الاستخدام والبدء مجاناً." : "ركز على جودة المحتوى المولّد وتنوع الأنواع الأدبية."}

يجب أن يتضمن:
- CTA قوي وواضح
- رابط qalamai.net
- 5 هاشتاقات مناسبة`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          max_completion_tokens: 800,
          messages: [
            { role: "system", content: "أنت أبو هاشم، كاتب ومسوّق رقمي عربي محترف. تكتب محتوى سوشيال ميديا بالعربية الفصحى موحداً ومباشراً. لا تضف عناوين أو تسميات للمنصات مثل 'تغريدة على X:' أو 'منشور فيسبوك:' أو أي تصنيف مشابه. اكتب المحتوى مباشرةً بدون أي مقدمات. دائماً تضيف CTA ورابط qalamai.net." },
            { role: "user", content: prompt },
          ],
        });

        const content = completion.choices[0]?.message?.content || "";

        let coverImageUrl: string | null = null;
        if (isLiterary) {
          try {
            const imgRes = await openai.images.generate({
              model: "dall-e-3",
              prompt: "Artistic Arabic calligraphy poster with a warm aesthetic, suitable for a literary social media post. Elegant minimalist design with golden and dark tones. No text.",
              n: 1,
              size: "1024x1024",
            });
            coverImageUrl = imgRes.data?.[0]?.url || null;
          } catch (imgErr) {
            console.warn("DALL-E image generation failed:", imgErr);
          }
        }

        const scheduledAt = new Date(today);
        scheduledAt.setHours(scheduleHours[i] || 12, 0, 0, 0);

        const post = await storage.createSocialPost({
          content,
          platforms,
          scheduledAt,
          status: source === "generator" ? "draft" : "scheduled",
          postType,
          coverImageUrl,
        });
        posts.push(post);
      }

      res.json({ posts, message: `تم توليد ${posts.length} منشورات لليوم` });
    } catch (error: any) {
      console.error("Social generate-daily error:", error);
      res.status(500).json({ error: "فشل في توليد المنشورات: " + (error.message || "") });
    }
  });

  app.post("/api/admin/social/generate-single", isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const { index, platforms: requestedPlatforms } = req.body;
      const postIndex = typeof index === "number" ? index : 0;
      const isLiterary = postIndex >= 2;
      const postType = isLiterary ? "literary" : "marketing";

      const validPlatformKeys = ["facebook", "instagram", "x", "tiktok", "linkedin"];
      const activePlatforms = await getActivePlatforms();
      const platforms = (Array.isArray(requestedPlatforms)
        ? requestedPlatforms.filter((p: string) => validPlatformKeys.includes(p))
        : isLiterary
          ? ["facebook", "instagram", "x"]
          : validPlatformKeys
      ).filter((p: string) => activePlatforms.includes(p));

      if (platforms.length === 0) {
        return res.status(400).json({ error: "لا توجد منصات مفعّلة — فعّل منصة واحدة على الأقل من الإعدادات" });
      }

      const platformFormatGuide: Record<string, string> = {
        facebook: "فيسبوك: منشور طويل نسبياً (3-5 فقرات)، مع CTA واضح ورابط مباشر.",
        instagram: "إنستغرام: كابشن جذاب مع إيموجيات مناسبة، و15-20 هاشتاق متنوع.",
        x: "X/تويتر: تغريدة قصيرة (حد 280 حرف تقريباً)، مختصرة ومؤثرة مع 3-5 هاشتاقات.",
        tiktok: "TikTok: نص قصير جداً بأسلوب شبابي حيوي، مع هاشتاقات ترند.",
        linkedin: "LinkedIn: منشور مهني احترافي موجه لصنّاع القرار والمثقفين.",
      };

      const platformInstructions = platforms
        .map((p) => platformFormatGuide[p] || "")
        .filter(Boolean)
        .join("\n");

      const bestTimes = await storage.getBestPostingTimes();
      const scheduleHours = bestTimes.length >= 2
        ? [bestTimes[0].hour, bestTimes[0].hour, bestTimes[1].hour, bestTimes[1].hour, Math.min(bestTimes[0].hour, bestTimes[1].hour) + 2]
        : [9, 13, 17, 20, 22];

      const prompt = isLiterary
        ? `اكتب خاطرة أدبية عربية فصيحة قصيرة (3-5 أسطر) بأسلوب شاعري مؤثر عن ${["الحنين", "الأمل", "الحب"][postIndex - 2] || "الحياة"}.

في نهاية الخاطرة أضف:
- عبارة CTA: "اكتشف عالم الكتابة العربية على QalamAI.net"
- رابط: qalamai.net
- 5 هاشتاقات عربية مناسبة`
        : `اكتب منشوراً تسويقياً لمنصة QalamAI (qalamai.net) — منصة كتابة عربية بالذكاء الاصطناعي تتيح للكتّاب إنشاء روايات ومقالات وسيناريوهات وخواطر وقصائد.
${postIndex === 0 ? "ركز على سهولة الاستخدام والبدء مجاناً." : "ركز على جودة المحتوى المولّد وتنوع الأنواع الأدبية."}

يجب أن يتضمن:
- CTA قوي وواضح
- رابط qalamai.net
- 5 هاشتاقات مناسبة`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        max_completion_tokens: 800,
        messages: [
          { role: "system", content: "أنت أبو هاشم، كاتب ومسوّق رقمي عربي محترف. تكتب محتوى سوشيال ميديا بالعربية الفصحى موحداً ومباشراً. لا تضف عناوين أو تسميات للمنصات مثل 'تغريدة على X:' أو 'منشور فيسبوك:' أو أي تصنيف مشابه. اكتب المحتوى مباشرةً بدون أي مقدمات. دائماً تضيف CTA ورابط qalamai.net." },
          { role: "user", content: prompt },
        ],
      });

      const content = completion.choices[0]?.message?.content || "";

      let coverImageUrl: string | null = null;
      let fbCoverImageUrl: string | null = null;
      if (isLiterary) {
        const hasFacebook = platforms.includes("facebook");
        const hasInstagram = platforms.includes("instagram");

        const squarePrompt = "Artistic Arabic calligraphy poster with a warm aesthetic, suitable for a literary social media post. Elegant minimalist design with golden and dark tones. Square composition (1:1 aspect ratio). No text.";
        const landscapePrompt = "Artistic Arabic calligraphy poster with a warm aesthetic, suitable for a literary social media post. Elegant minimalist design with golden and dark tones. Wide landscape composition suitable for a Facebook cover (approximately 1200x630 proportions). No text.";

        try {
          const useSquare = hasInstagram || (!hasFacebook);
          const imgRes = await openai.images.generate({
            model: "dall-e-3",
            prompt: useSquare ? squarePrompt : landscapePrompt,
            n: 1,
            size: useSquare ? "1024x1024" : "1792x1024",
          });
          coverImageUrl = imgRes.data?.[0]?.url || null;
        } catch (imgErr) {
          console.warn("DALL-E image generation failed:", imgErr);
        }

        if (hasFacebook && hasInstagram && coverImageUrl) {
          try {
            const fbImgRes = await openai.images.generate({
              model: "dall-e-3",
              prompt: landscapePrompt,
              n: 1,
              size: "1792x1024",
            });
            fbCoverImageUrl = fbImgRes.data?.[0]?.url || null;
          } catch (fbImgErr) {
            console.warn("DALL-E Facebook cover generation failed:", fbImgErr);
          }
        }
      }

      const today = new Date();
      const scheduledAt = new Date(today);
      scheduledAt.setHours(scheduleHours[postIndex] || 12, 0, 0, 0);

      const post = await storage.createSocialPost({
        content,
        platforms,
        scheduledAt,
        status: "draft",
        postType,
        coverImageUrl,
      });

      if (fbCoverImageUrl && post?.id) {
        await db.execute(dsql`UPDATE social_posts SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('fb_cover_url', ${fbCoverImageUrl}) WHERE id = ${post.id}`);
      }

      res.json({ post: { ...post, fb_cover_url: fbCoverImageUrl }, index: postIndex });
    } catch (error: any) {
      console.error("Social generate-single error:", error);
      res.status(500).json({ error: "فشل في توليد المنشور: " + (error.message || "") });
    }
  });

  app.post("/api/admin/social/insights", isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const { postId, likes, shares, reach, clicks, comments } = req.body;
      if (!postId) return res.status(400).json({ error: "معرّف المنشور مطلوب" });
      const insight = await storage.addSocialPostInsight({
        postId,
        likes: likes || 0,
        shares: shares || 0,
        reach: reach || 0,
        clicks: clicks || 0,
        comments: comments || 0,
      });
      res.json(insight);
    } catch (error) {
      res.status(500).json({ error: "فشل في تسجيل البيانات" });
    }
  });

  app.get("/api/admin/social/insights/:postId", isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const postId = parseIntParam(req.params.postId);
      if (postId === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const insights = await storage.getSocialPostInsights(postId);
      res.json(insights);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب البيانات" });
    }
  });

  app.get("/api/admin/social/insights/grouped", isAuthenticated, isSuperAdmin, async (_req: any, res) => {
    try {
      const grouped = await storage.getInsightsGroupedByPost();
      res.json(grouped);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب البيانات" });
    }
  });

  app.get("/api/admin/social/best-times", isAuthenticated, isSuperAdmin, async (_req: any, res) => {
    try {
      const times = await storage.getBestPostingTimes();
      res.json(times);
    } catch (error) {
      res.status(500).json({ error: "فشل في تحليل الأوقات" });
    }
  });

  app.post("/api/admin/social/regenerate-image/:id", isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const post = await storage.getSocialPostById(id);
      if (!post) return res.status(404).json({ error: "المنشور غير موجود" });
      const imgRes = await openai.images.generate({
        model: "dall-e-3",
        prompt: "Artistic Arabic calligraphy poster with a warm aesthetic, suitable for a literary social media post. Elegant minimalist design with golden and dark tones. No text.",
        n: 1,
        size: "1024x1024",
      });
      const coverImageUrl = imgRes.data?.[0]?.url || null;
      if (coverImageUrl) {
        await storage.updateSocialPost(id, { coverImageUrl });
      }
      res.json({ id, coverImageUrl });
    } catch (error: any) {
      console.error("Regenerate image error:", error);
      res.status(500).json({ error: "فشل في إعادة توليد الصورة" });
    }
  });

  app.get("/api/admin/social/yesterday-engagement", isAuthenticated, isSuperAdmin, async (_req: any, res) => {
    try {
      const engagement = await storage.getYesterdayEngagement();
      res.json(engagement);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب بيانات الأمس" });
    }
  });

  app.post("/api/admin/social/duplicate/:id", isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const post = await storage.getSocialPostById(id);
      if (!post) return res.status(404).json({ error: "المنشور غير موجود" });

      const duplicate = await storage.createSocialPost({
        content: post.content,
        platforms: post.platforms || [],
        scheduledAt: null,
        status: "draft",
        postType: post.post_type || "marketing",
        coverImageUrl: post.cover_image_url || null,
      });

      res.json({ post: duplicate });
    } catch (error: any) {
      console.error("Duplicate post error:", error);
      res.status(500).json({ error: "فشل في تكرار المنشور" });
    }
  });

  app.post("/api/admin/social/publish/:id", isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (id === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const post = await storage.getSocialPostById(id);
      if (!post) return res.status(404).json({ error: "المنشور غير موجود" });

      const credRows: any[] = (await db.execute(dsql`
        SELECT value FROM social_hub_settings WHERE key = 'platform_credentials'
      `)).rows;
      const rawVal = credRows[0]?.value;
      const credentials = rawVal ? (typeof rawVal === "string" ? JSON.parse(rawVal) : rawVal) : {};

      const { publishResults, anyPublished } = await publishSocialPostToAPIs(post, credentials);
      const allSucceeded = Object.values(publishResults).every((r) => r.success);

      if (allSucceeded) {
        await storage.updateSocialPost(id, { status: "posted" });
      } else if (anyPublished) {
        await storage.updateSocialPost(id, { status: "needs_manual" });
      }

      res.json({
        id,
        publishResults,
        fullyPublished: allSucceeded,
        partiallyPublished: anyPublished,
        message: allSucceeded
          ? "تم النشر على جميع المنصات"
          : anyPublished
            ? "تم النشر جزئياً — بعض المنصات تحتاج نشر يدوي"
            : "لم يتم النشر — تحقق من بيانات الاعتماد في الإعدادات",
      });
    } catch (error: any) {
      console.error("Publish post error:", error);
      res.status(500).json({ error: "فشل في النشر: " + (error.message || "") });
    }
  });

  app.get("/api/admin/social/settings", isAuthenticated, isSuperAdmin, async (_req: any, res) => {
    try {
      const rows: any[] = (await db.execute(dsql`
        SELECT value FROM social_hub_settings WHERE key = 'platform_credentials'
      `)).rows;
      const stored = rows[0]?.value ? JSON.parse(rows[0].value) : {};
      const maskedCredentials: Record<string, string> = {};
      for (const [key, val] of Object.entries(stored)) {
        if (typeof val === "string" && val.length > 0) {
          maskedCredentials[key] = val.substring(0, 4) + "****" + val.substring(val.length - 4);
        } else {
          maskedCredentials[key] = "";
        }
      }
      res.json({ credentials: maskedCredentials, hasCredentials: Object.fromEntries(
        Object.entries(stored).map(([k, v]) => [k, typeof v === "string" && v.length > 0])
      ) });
    } catch {
      res.json({ credentials: {}, hasCredentials: {} });
    }
  });

  app.put("/api/admin/social/settings", isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const { credentials } = req.body;
      if (!credentials || typeof credentials !== "object") {
        return res.status(400).json({ error: "بيانات غير صالحة" });
      }
      const existingRows: any[] = (await db.execute(dsql`
        SELECT value FROM social_hub_settings WHERE key = 'platform_credentials'
      `)).rows;
      const existing = existingRows[0]?.value ? JSON.parse(existingRows[0].value) : {};

      const merged: Record<string, string> = { ...existing };
      const allowedKeys = [
        "facebook", "instagram", "x", "tiktok", "linkedin",
        "x_api_key", "x_api_secret", "x_access_token", "x_access_token_secret",
        "x_bearer_token", "x_client_id", "x_client_secret",
      ];
      for (const key of allowedKeys) {
        if (typeof credentials[key] === "string") {
          merged[key] = credentials[key];
        }
      }
      const val = JSON.stringify(merged);
      await db.execute(dsql`
        INSERT INTO social_hub_settings (key, value)
        VALUES ('platform_credentials', ${val})
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `);
      res.json({ success: true, message: "تم حفظ الإعدادات" });
    } catch (error) {
      console.error("Save social settings error:", error);
      res.status(500).json({ error: "فشل في حفظ الإعدادات" });
    }
  });

  async function getActivePlatforms(): Promise<string[]> {
    try {
      const rows: any[] = (await db.execute(dsql`
        SELECT value FROM social_hub_settings WHERE key = 'active_platforms'
      `)).rows;
      if (!rows[0]?.value) return ["facebook", "instagram", "x", "tiktok", "linkedin"];
      const val = typeof rows[0].value === "string" ? JSON.parse(rows[0].value) : rows[0].value;
      return Array.isArray(val) ? val : ["facebook", "instagram", "x", "tiktok", "linkedin"];
    } catch {
      return ["facebook", "instagram", "x", "tiktok", "linkedin"];
    }
  }

  app.get("/api/admin/social/active-platforms", isAuthenticated, isSuperAdmin, async (_req: any, res) => {
    try {
      const active = await getActivePlatforms();
      res.json({ activePlatforms: active });
    } catch {
      res.json({ activePlatforms: ["facebook", "instagram", "x", "tiktok", "linkedin"] });
    }
  });

  app.put("/api/admin/social/active-platforms", isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const { activePlatforms } = req.body;
      const valid = ["facebook", "instagram", "x", "tiktok", "linkedin"];
      const filtered = Array.isArray(activePlatforms) ? activePlatforms.filter((p: string) => valid.includes(p)) : valid;
      if (filtered.length === 0) return res.status(400).json({ error: "يجب تفعيل منصة واحدة على الأقل" });
      const val = JSON.stringify(filtered);
      await db.execute(dsql`
        INSERT INTO social_hub_settings (key, value)
        VALUES ('active_platforms', ${val})
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `);
      res.json({ success: true, activePlatforms: filtered });
    } catch (error) {
      console.error("Save active platforms error:", error);
      res.status(500).json({ error: "فشل في حفظ إعدادات المنصات" });
    }
  });

  app.get("/api/admin/social/auto-generate-settings", isAuthenticated, isSuperAdmin, async (_req: any, res) => {
    try {
      const rows: any[] = (await db.execute(dsql`
        SELECT value FROM social_hub_settings WHERE key = 'auto_generate_config'
      `)).rows;
      const stored = rows[0]?.value
        ? (typeof rows[0].value === "string" ? JSON.parse(rows[0].value) : rows[0].value)
        : { enabled: false, platforms: ["facebook", "instagram", "x", "tiktok", "linkedin"], postsPerDay: 5 };
      res.json(stored);
    } catch {
      res.json({ enabled: false, platforms: ["facebook", "instagram", "x", "tiktok", "linkedin"], postsPerDay: 5 });
    }
  });

  app.put("/api/admin/social/auto-generate-settings", isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const { enabled, platforms, postsPerDay } = req.body;
      const config = {
        enabled: !!enabled,
        platforms: Array.isArray(platforms) ? platforms : ["facebook", "instagram", "x", "tiktok", "linkedin"],
        postsPerDay: typeof postsPerDay === "number" ? Math.min(Math.max(postsPerDay, 1), 10) : 5,
        updatedAt: new Date().toISOString(),
      };
      const val = JSON.stringify(config);
      await db.execute(dsql`
        INSERT INTO social_hub_settings (key, value)
        VALUES ('auto_generate_config', ${val})
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `);
      res.json({ success: true, config });
    } catch (error) {
      console.error("Save auto-generate settings error:", error);
      res.status(500).json({ error: "فشل في حفظ إعدادات التوليد التلقائي" });
    }
  });

  app.post("/api/admin/social/auto-generate-now", isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const { platforms: reqPlatforms } = req.body;
      const validPlatformKeys = ["facebook", "instagram", "x", "tiktok", "linkedin"];
      const activePlatforms = await getActivePlatforms();
      const requested = Array.isArray(reqPlatforms) ? reqPlatforms.filter((p: string) => validPlatformKeys.includes(p)) : activePlatforms;
      const platforms = requested.filter((p: string) => activePlatforms.includes(p));
      if (platforms.length === 0) {
        return res.status(400).json({ error: "لا توجد منصات مفعّلة — فعّل منصة واحدة على الأقل من الإعدادات" });
      }

      const bestTimes = await storage.getBestPostingTimes();
      const scheduleHours = bestTimes.length >= 2
        ? [bestTimes[0].hour, bestTimes[0].hour + 1, bestTimes[1].hour, bestTimes[1].hour + 1, Math.min(bestTimes[0].hour, bestTimes[1].hour) + 2]
        : [9, 12, 15, 18, 21];

      const created: any[] = [];
      for (let i = 0; i < 5; i++) {
        try {
          const isLiterary = i >= 2;
          const postType = isLiterary ? "literary" : "marketing";
          const topicsLiterary = ["الحنين", "الأمل", "الحب", "الصمت", "الغياب"];
          const prompt = isLiterary
            ? `اكتب خاطرة أدبية عربية فصيحة قصيرة (3-5 أسطر) بأسلوب شاعري مؤثر عن ${topicsLiterary[i - 2] || "الحياة"}. أضف CTA: "اكتشف عالم الكتابة العربية على QalamAI.net" ورابط qalamai.net و5 هاشتاقات عربية.`
            : `اكتب منشوراً تسويقياً لمنصة QalamAI (qalamai.net) — منصة كتابة عربية بالذكاء الاصطناعي. ${i === 0 ? "ركز على سهولة البدء مجاناً." : "ركز على جودة المحتوى وتنوع الأنواع الأدبية."} أضف CTA قوي ورابط qalamai.net و5 هاشتاقات.`;

          const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            max_completion_tokens: 600,
            messages: [
              { role: "system", content: "أنت أبو هاشم، كاتب ومسوّق رقمي عربي محترف. تكتب محتوى سوشيال ميديا بالعربية الفصحى مع CTA فعّال ورابط qalamai.net." },
              { role: "user", content: prompt },
            ],
          });
          const content = completion.choices[0]?.message?.content || "";

          let coverImageUrl: string | null = null;
          if (isLiterary) {
            try {
              const imgRes = await openai.images.generate({
                model: "dall-e-3",
                prompt: "Artistic Arabic calligraphy poster with warm golden tones, minimalist elegant design, square composition. No text.",
                n: 1,
                size: "1024x1024",
              });
              coverImageUrl = imgRes.data?.[0]?.url || null;
            } catch { /* skip image on failure */ }
          }

          const scheduledAt = new Date();
          scheduledAt.setHours(scheduleHours[i] || 12, 0, 0, 0);
          if (scheduledAt <= new Date()) scheduledAt.setDate(scheduledAt.getDate() + 1);

          const post = await storage.createSocialPost({ content, platforms, scheduledAt, status: "scheduled", postType, coverImageUrl });
          if (post) created.push(post);
        } catch (postErr: any) {
          console.error(`[AutoGenerate] Post ${i} failed:`, postErr.message);
        }
      }

      await db.execute(dsql`
        INSERT INTO social_hub_settings (key, value)
        VALUES ('auto_generate_last_run', ${new Date().toISOString()})
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `);

      res.json({ created: created.length, posts: created });
    } catch (error: any) {
      console.error("Auto-generate-now error:", error);
      res.status(500).json({ error: "فشل في التوليد التلقائي: " + (error.message || "") });
    }
  });

  // ── Community Features: Tags, Challenges, Beta Readers, Related Works ─────
  app.post("/api/projects/:id/tags", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseIntParam(req.params.id);
      if (!projectId) return res.status(400).json({ error: "معرف مشروع غير صالح" });
      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      const userId = req.user.claims.sub;
      if (project.userId !== userId) return res.status(403).json({ error: "غير مصرح" });
      const { tags } = req.body;
      if (!Array.isArray(tags) || tags.some((t: any) => typeof t !== "string")) {
        return res.status(400).json({ error: "الوسوم يجب أن تكون مصفوفة نصوص" });
      }
      if (tags.length > 5) return res.status(400).json({ error: "الحد الأقصى 5 وسوم" });
      const updated = await storage.updateProjectTags(projectId, tags);
      res.json({ tags: updated.tags });
    } catch (error: any) {
      console.error("Update tags error:", error);
      res.status(500).json({ error: "فشل في تحديث الوسوم" });
    }
  });

  app.get("/api/projects/by-tag/:tag", async (req, res) => {
    try {
      let tag: string;
      try {
        tag = decodeURIComponent(req.params.tag).trim();
      } catch {
        return res.status(400).json({ error: "وسم غير صالح" });
      }
      if (!tag) return res.status(400).json({ error: "الوسم مطلوب" });
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, parseInt(req.query.limit as string) || 24);
      const result = await storage.getGalleryProjectsByTag(tag, page, limit);
      res.json({ data: result.rows, total: result.total, page, limit, tag });
    } catch (error: any) {
      console.error("Get projects by tag error:", error);
      res.status(500).json({ error: "فشل في جلب المشاريع" });
    }
  });

  app.get("/api/projects/:id/related", async (req, res) => {
    try {
      const projectId = parseIntParam(req.params.id);
      if (!projectId) return res.status(400).json({ error: "معرف مشروع غير صالح" });
      const project = await storage.getProject(projectId);
      if (!project || !project.publishedToGallery) return res.json([]);
      const related = await storage.getRelatedProjects(projectId, 3);
      res.json(related);
    } catch (error: any) {
      console.error("Get related projects error:", error);
      res.status(500).json({ error: "فشل في جلب الأعمال المشابهة" });
    }
  });

  app.get("/api/challenges", async (_req, res) => {
    try {
      const challenges = await storage.getWritingChallenges();
      res.json(challenges);
    } catch (error: any) {
      console.error("Get challenges error:", error);
      res.status(500).json({ error: "فشل في جلب التحديات" });
    }
  });

  app.get("/api/challenges/:id", async (req, res) => {
    try {
      const id = parseIntParam(req.params.id);
      if (!id) return res.status(400).json({ error: "معرف غير صالح" });
      const challenge = await storage.getWritingChallenge(id);
      if (!challenge) return res.status(404).json({ error: "التحدي غير موجود" });
      const entries = await storage.getChallengeEntries(id);
      res.json({ ...challenge, entries });
    } catch (error: any) {
      console.error("Get challenge error:", error);
      res.status(500).json({ error: "فشل في جلب التحدي" });
    }
  });

  app.post("/api/admin/challenges", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const schema = z.object({
        title: z.string().min(1).max(200),
        description: z.string().min(1).max(2000),
        theme: z.string().max(200).optional(),
        projectType: z.string().max(50).optional(),
        prizeDescription: z.string().max(500).optional(),
        endDate: z.string().min(1),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: formatZodErrors(parsed.error) });
      const challenge = await storage.createWritingChallenge({
        title: parsed.data.title,
        description: parsed.data.description,
        theme: parsed.data.theme || null,
        projectType: parsed.data.projectType || "essay",
        prizeDescription: parsed.data.prizeDescription || null,
        startDate: new Date(),
        endDate: new Date(parsed.data.endDate),
        createdBy: req.user.claims.sub,
      });
      // Notify all users in the background
      (async () => {
        try {
          const allUsers = await storage.getAllUsers();
          const PROJECT_TYPE_LABELS: Record<string, string> = {
            essay: "مقال",
            novel: "رواية",
            poem: "قصيدة",
            short_story: "قصة قصيرة",
            screenplay: "سيناريو",
          };
          const projectTypeLabel = PROJECT_TYPE_LABELS[challenge.projectType || "essay"] || challenge.projectType || "";
          for (const u of allUsers) {
            try {
              await storage.createNotification({
                userId: u.id,
                type: "new_challenge",
                title: "تحدٍّ كتابي جديد!",
                message: `"${challenge.title}" — ${challenge.description.slice(0, 100)}${challenge.description.length > 100 ? "..." : ""}`,
                link: `/challenges/${challenge.id}`,
              });
            } catch (e) {
              console.error(`Failed to notify user ${u.id}:`, e);
            }
          }
          const emailRecipients = await storage.getUsersForChallengeEmails();
          await sendNewChallengeEmail(emailRecipients, {
            id: challenge.id,
            title: challenge.title,
            description: challenge.description,
            endDate: new Date(challenge.endDate),
            prizeDescription: challenge.prizeDescription,
            projectTypeLabel,
          });
        } catch (bgErr) {
          console.error("Challenge notification background error:", bgErr);
        }
      })();
      res.json(challenge);
    } catch (error: unknown) {
      console.error("Create challenge error:", error);
      res.status(500).json({ error: "فشل في إنشاء التحدي" });
    }
  });

  app.post("/api/challenges/:id/entries", isAuthenticated, async (req, res) => {
    try {
      const challengeId = parseIntParam(req.params.id);
      if (!challengeId) return res.status(400).json({ error: "معرف غير صالح" });
      const challenge = await storage.getWritingChallenge(challengeId);
      if (!challenge) return res.status(404).json({ error: "التحدي غير موجود" });
      if (new Date(challenge.end_date || challenge.endDate) < new Date()) {
        return res.status(400).json({ error: "انتهى وقت التحدي" });
      }
      const userId = req.user.claims.sub;
      const existing = await storage.getUserChallengeEntry(challengeId, userId);
      if (existing) return res.status(400).json({ error: "لقد شاركت بالفعل في هذا التحدي" });
      const schema = z.object({ content: z.string().min(1).max(2000) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: formatZodErrors(parsed.error) });
      const entry = await storage.submitChallengeEntry({ challengeId, userId, content: parsed.data.content });
      res.json(entry);
    } catch (error: any) {
      console.error("Submit challenge entry error:", error);
      res.status(500).json({ error: "فشل في تقديم المشاركة" });
    }
  });

  app.put("/api/admin/challenges/:id/winner", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const challengeId = parseIntParam(req.params.id);
      if (!challengeId) return res.status(400).json({ error: "معرف غير صالح" });
      const { winnerId, winnerEntryId } = req.body;
      if (!winnerId || !winnerEntryId) return res.status(400).json({ error: "بيانات ناقصة" });
      const challenge = await storage.getWritingChallenge(challengeId);
      if (!challenge) return res.status(404).json({ error: "التحدي غير موجود" });
      const updated = await storage.setChallengWinner(challengeId, winnerId, parseInt(winnerEntryId));
      try {
        await storage.createNotification({
          userId: winnerId,
          type: "challenge_winner",
          title: "تهانينا!",
          message: `تهانينا! فزت في التحدي "${challenge.title}"`,
          link: `/challenges/${challengeId}`,
        });
      } catch (notifErr) {
        console.error("Failed to create challenge winner notification:", notifErr);
      }
      storage.getUser(winnerId).then((winner) => {
        if (winner?.email) {
          sendChallengeWinnerEmail(winner.email, winner.displayName ?? winner.username, challenge.title, challengeId)
            .catch((err) => console.error("Failed to send challenge winner email:", err));
        }
      }).catch((err) => console.error("Failed to fetch winner for email:", err));
      res.json(updated);
    } catch (error: any) {
      console.error("Set challenge winner error:", error);
      res.status(500).json({ error: "فشل في تحديد الفائز" });
    }
  });

  app.put("/api/admin/challenges/:id/close", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const challengeId = parseIntParam(req.params.id);
      if (!challengeId) return res.status(400).json({ error: "معرف غير صالح" });
      const challenge = await storage.getWritingChallenge(challengeId);
      if (!challenge) return res.status(404).json({ error: "التحدي غير موجود" });
      await db.execute(dsql`UPDATE writing_challenges SET end_date = NOW() WHERE id = ${challengeId}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Close challenge error:", error);
      res.status(500).json({ error: "فشل في إغلاق التحدي" });
    }
  });

  app.put("/api/admin/challenges/:id/entries/:entryId/rate", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const challengeId = parseIntParam(req.params.id);
      const entryId = parseIntParam(req.params.entryId);
      if (!challengeId || !entryId) return res.status(400).json({ error: "معرف غير صالح" });
      const schema = z.object({
        adminRating: z.number().int().min(1).max(5),
        adminNotes: z.string().max(10000).optional().nullable(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: formatZodErrors(parsed.error) });
      await db.execute(dsql`
        UPDATE challenge_entries SET admin_rating = ${parsed.data.adminRating}, admin_notes = ${parsed.data.adminNotes || null}
        WHERE id = ${entryId} AND challenge_id = ${challengeId}
      `);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Rate challenge entry error:", error);
      res.status(500).json({ error: "فشل في تقييم المشاركة" });
    }
  });

  // ── Challenge Entry Votes (open to all visitors) ─────────────────────────────
  app.post("/api/challenge-entries/:id/vote", async (req: any, res) => {
    try {
      const entryId = parseIntParam(req.params.id);
      if (entryId === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const userId: string = req.user?.claims?.sub || (req.body?.voterId ? `anon_${String(req.body.voterId).slice(0, 64)}` : null);
      if (!userId) return res.status(400).json({ error: "معرّف المصوّت مطلوب" });
      const result = await storage.toggleChallengeEntryVote(entryId, userId);
      res.json(result);
    } catch (error) {
      console.error("Challenge entry vote error:", error);
      res.status(500).json({ error: "فشل في تسجيل التصويت" });
    }
  });

  app.get("/api/challenge-entries/:id/vote-count", async (req: any, res) => {
    try {
      const entryId = parseIntParam(req.params.id);
      if (entryId === null) return res.status(400).json({ error: "معرّف غير صالح" });
      const rawVoterId = req.query?.voterId as string | undefined;
      const userId: string | undefined = req.user?.claims?.sub || (rawVoterId ? `anon_${rawVoterId.slice(0, 64)}` : undefined);
      const result = await storage.getChallengeEntryVoteCount(entryId, userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب عدد الأصوات" });
    }
  });

  app.post("/api/admin/literary-critique", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const schema = z.object({
        entryContent: z.string().min(10).max(50000),
        critiqueType: z.enum(["شامل", "بنيوي", "أسلوبي", "نفسي", "اجتماعي", "سيميائي", "تفكيكي", "جمالي", "تاريخي", "انطباعي", "نسوي"]),
        wordCount: z.number().int().min(100).max(500),
        challengeTitle: z.string().min(1).max(500),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: formatZodErrors(parsed.error) });

      const { entryContent, critiqueType, wordCount, challengeTitle } = parsed.data;
      const { system, user } = buildLiteraryCritiquePrompt(entryContent, critiqueType, wordCount, challengeTitle);

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_completion_tokens: Math.max(2000, wordCount * 8),
        temperature: 0.7,
      });

      const critique = response.choices[0]?.message?.content || "عذراً، لم أتمكن من إنتاج النقد الأدبي.";
      logApiUsage(req.user.claims.sub, null, "literary_critique", "gpt-5.2", response);
      res.json({ critique });
    } catch (error: any) {
      console.error("Literary critique error:", error);
      res.status(500).json({ error: "فشل في توليد النقد الأدبي" });
    }
  });

  app.delete("/api/admin/challenges/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const challengeId = parseIntParam(req.params.id);
      if (!challengeId) return res.status(400).json({ error: "معرف غير صالح" });
      const challenge = await storage.getWritingChallenge(challengeId);
      if (!challenge) return res.status(404).json({ error: "التحدي غير موجود" });
      await storage.deleteChallenge(challengeId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete challenge error:", error);
      res.status(500).json({ error: "فشل في حذف التحدي" });
    }
  });

  app.get("/api/admin/top-voted", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const projects = await storage.getTopVotedProjects(100);
      res.json(projects);
    } catch (error) {
      console.error("[Admin] Top voted error:", error);
      res.status(500).json({ error: "فشل في جلب الأعمال" });
    }
  });

  app.post("/api/admin/hall-of-glory/feature", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { projectId } = req.body;
      if (!projectId) return res.status(400).json({ error: "معرف المشروع مطلوب" });
      const adminId = req.user.claims.sub;
      const project = await storage.getProject(Number(projectId));
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      const featured = await storage.featureInHallOfGlory(Number(projectId), adminId);
      res.json(featured);
    } catch (error) {
      console.error("[Admin] Feature in HoG error:", error);
      res.status(500).json({ error: "فشل في الإضافة إلى قاعة المجد" });
    }
  });

  app.post("/api/projects/:id/beta-readers", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseIntParam(req.params.id);
      if (!projectId) return res.status(400).json({ error: "معرف مشروع غير صالح" });
      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      if (!project.seekingBetaReaders) return res.status(400).json({ error: "هذا المشروع لا يقبل قراء بيتا حالياً" });
      const userId = req.user.claims.sub;
      if (userId === project.userId) return res.status(400).json({ error: "لا يمكنك التقدم لقراءة مشروعك الخاص" });
      const schema = z.object({ message: z.string().max(500).optional() });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: formatZodErrors(parsed.error) });
      const request = await storage.requestBetaReader({ projectId, userId, message: parsed.data.message || null });
      if (request) {
        try {
          await storage.createNotification({
            userId: project.userId,
            type: "beta_reader",
            title: "قارئ بيتا جديد",
            message: `قارئ جديد يريد المشاركة كقارئ بيتا لمشروعك "${project.title}"`,
            link: `/projects/${projectId}`,
          });
        } catch (notifErr) {
          console.error("Failed to create beta reader notification:", notifErr);
        }
      }
      res.json(request || { success: true });
    } catch (error: any) {
      console.error("Beta reader request error:", error);
      res.status(500).json({ error: "فشل في تقديم الطلب" });
    }
  });

  app.get("/api/projects/:id/beta-readers", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseIntParam(req.params.id);
      if (!projectId) return res.status(400).json({ error: "معرف مشروع غير صالح" });
      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "غير مصرح" });
      const requests = await storage.getBetaReaderRequests(projectId);
      res.json(requests);
    } catch (error: any) {
      console.error("Get beta readers error:", error);
      res.status(500).json({ error: "فشل في جلب القراء" });
    }
  });

  app.delete("/api/projects/:id/beta-readers", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseIntParam(req.params.id);
      if (!projectId) return res.status(400).json({ error: "معرف غير صالح" });
      await storage.cancelBetaReaderRequest(projectId, req.user.claims.sub);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Cancel beta reader error:", error);
      res.status(500).json({ error: "فشل في إلغاء الطلب" });
    }
  });

  app.put("/api/projects/:id/seeking-beta-readers", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseIntParam(req.params.id);
      if (!projectId) return res.status(400).json({ error: "معرف غير صالح" });
      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "غير مصرح" });
      const { seeking } = req.body;
      const updated = await storage.updateProject(projectId, { seekingBetaReaders: !!seeking });
      res.json({ seekingBetaReaders: updated.seekingBetaReaders });
    } catch (error: any) {
      console.error("Update seeking beta readers error:", error);
      res.status(500).json({ error: "فشل في تحديث الحالة" });
    }
  });

  // ── Chapter Paywall Routes ──
  app.put("/api/chapters/:id/paywall", isAuthenticated, async (req, res) => {
    try {
      const chapterId = parseIntParam(req.params.id);
      if (!chapterId) return res.status(400).json({ error: "معرف غير صالح" });
      const chapter = await storage.getChapter(chapterId);
      if (!chapter) return res.status(404).json({ error: "الفصل غير موجود" });
      const project = await storage.getProject(chapter.projectId);
      if (!project || project.userId !== req.user.claims.sub) return res.status(403).json({ error: "غير مصرح" });
      const { isPaid, priceCents } = req.body;
      const updated = await storage.updateChapter(chapterId, {
        isPaid: !!isPaid,
        priceCents: isPaid ? Math.max(0, Math.min(9999, parseInt(priceCents) || 199)) : 0,
      });
      res.json({ isPaid: updated.isPaid, priceCents: updated.priceCents });
    } catch (error: any) {
      console.error("Chapter paywall update error:", error);
      res.status(500).json({ error: "فشل في تحديث إعدادات الفصل" });
    }
  });

  app.get("/api/chapters/:id/access", isAuthenticated, async (req, res) => {
    try {
      const chapterId = parseIntParam(req.params.id);
      if (!chapterId) return res.status(400).json({ error: "معرف غير صالح" });
      const chapter = await storage.getChapter(chapterId);
      if (!chapter) return res.status(404).json({ error: "الفصل غير موجود" });
      if (!chapter.isPaid) return res.json({ hasAccess: true, isPaid: false });
      const project = await storage.getProject(chapter.projectId);
      if (project && project.userId === req.user.claims.sub) return res.json({ hasAccess: true, isPaid: true, isAuthor: true });
      const unlocked = await storage.checkChapterUnlock(req.user.claims.sub, chapterId);
      res.json({ hasAccess: unlocked, isPaid: true, priceCents: chapter.priceCents });
    } catch (error: any) {
      console.error("Chapter access check error:", error);
      res.status(500).json({ error: "فشل في التحقق" });
    }
  });

  app.post("/api/chapters/:id/unlock", isAuthenticated, async (req, res) => {
    try {
      const chapterId = parseIntParam(req.params.id);
      if (!chapterId) return res.status(400).json({ error: "معرف غير صالح" });
      const chapter = await storage.getChapter(chapterId);
      if (!chapter || !chapter.isPaid) return res.status(400).json({ error: "هذا الفصل ليس مدفوعًا" });
      const already = await storage.checkChapterUnlock(req.user.claims.sub, chapterId);
      if (already) return res.json({ alreadyUnlocked: true });
      const project = await storage.getProject(chapter.projectId);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });
      const stripe = await getUncachableStripeClient();
      const origin = `${req.protocol}://${req.get("host")}`;
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "usd",
            unit_amount: chapter.priceCents,
            product_data: {
              name: `فتح الفصل: ${chapter.title}`,
              description: `من ${project.title}`,
            },
          },
          quantity: 1,
        }],
        success_url: `${origin}/shared/${project.shareToken}?chapter_unlocked=${chapterId}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/shared/${project.shareToken}`,
        metadata: {
          type: "chapter_unlock",
          chapterId: String(chapterId),
          userId: req.user.claims.sub,
          priceCents: String(chapter.priceCents),
        },
      });
      res.json({ checkoutUrl: session.url });
    } catch (error: any) {
      console.error("Chapter unlock checkout error:", error);
      res.status(500).json({ error: "فشل في إنشاء جلسة الدفع" });
    }
  });

  app.post("/api/chapters/:id/verify-unlock", isAuthenticated, async (req, res) => {
    try {
      const chapterId = parseIntParam(req.params.id);
      if (!chapterId) return res.status(400).json({ error: "معرف غير صالح" });
      const { sessionId } = req.body;
      if (!sessionId) return res.status(400).json({ error: "معرف الجلسة مطلوب" });
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== "paid") return res.status(400).json({ error: "لم يتم الدفع" });
      if (session.metadata?.type !== "chapter_unlock") return res.status(400).json({ error: "جلسة دفع غير صالحة" });
      if (session.metadata?.chapterId !== String(chapterId)) return res.status(400).json({ error: "الفصل لا يتطابق مع جلسة الدفع" });
      if (session.metadata?.userId !== req.user.claims.sub) return res.status(400).json({ error: "المستخدم لا يتطابق مع جلسة الدفع" });
      await storage.createChapterUnlock(req.user.claims.sub, chapterId, sessionId);
      await storage.addPoints(req.user.claims.sub, 5, "chapter_read");
      res.json({ success: true });
    } catch (error: any) {
      console.error("Chapter unlock verify error:", error);
      res.status(500).json({ error: "فشل في التحقق من الدفع" });
    }
  });

  // ── Gift Subscription Routes ──
  app.post("/api/gifts/purchase", isAuthenticated, async (req, res) => {
    try {
      const { recipientEmail, plan } = req.body;
      if (!recipientEmail || !plan) return res.status(400).json({ error: "البريد والخطة مطلوبان" });
      const validPlans = ["essay", "scenario", "all_in_one"];
      if (!validPlans.includes(plan)) return res.status(400).json({ error: "خطة غير صالحة" });
      const planLabels: Record<string, string> = { essay: "خطة المقالات", scenario: "خطة السيناريوهات", all_in_one: "الخطة الشاملة" };
      const planPrices: Record<string, number> = { essay: 1999, scenario: 7999, all_in_one: 14999 };
      const token = `gift_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const user = await storage.getUser(req.user.claims.sub);
      const stripe = await getUncachableStripeClient();
      const origin = `${req.protocol}://${req.get("host")}`;
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "usd",
            unit_amount: planPrices[plan],
            product_data: {
              name: `هدية: ${planLabels[plan]}`,
              description: `هدية لـ ${recipientEmail}`,
            },
          },
          quantity: 1,
        }],
        success_url: `${origin}/pricing?gift_success=true&gift_token=${token}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/pricing`,
        metadata: { giftToken: token, recipientEmail, plan },
      });
      await storage.createGiftSubscription({
        gifterUserId: req.user.claims.sub,
        gifterEmail: user?.email || "",
        recipientEmail,
        plan,
        token,
        stripeSessionId: session.id,
      });
      res.json({ checkoutUrl: session.url, token });
    } catch (error: any) {
      console.error("Gift purchase error:", error);
      res.status(500).json({ error: "فشل في إنشاء جلسة الدفع" });
    }
  });

  app.post("/api/gifts/verify", isAuthenticated, async (req, res) => {
    try {
      const { sessionId, token } = req.body;
      if (!sessionId || !token) return res.status(400).json({ error: "بيانات ناقصة" });
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== "paid") return res.status(400).json({ error: "لم يتم الدفع" });
      if (session.metadata?.giftToken !== token) return res.status(400).json({ error: "رمز الهدية غير متطابق" });
      await db.update(giftSubscriptions).set({ paid: true, stripeSessionId: sessionId }).where(eq(giftSubscriptions.token, token));
      const gift = await storage.getGiftByToken(token);
      if (gift) {
        const planLabels: Record<string, string> = { essay: "خطة المقالات", scenario: "خطة السيناريوهات", all_in_one: "الخطة الشاملة" };
        const gifterUser = await storage.getUser(req.user.claims.sub);
        const gifterName = gifterUser?.firstName || gifterUser?.email || "صديق";
        sendGiftReceivedEmail(gift.recipientEmail, gifterName, planLabels[gift.plan] || gift.plan, token).catch(() => {});
      }
      res.json({ success: true, token });
    } catch (error: any) {
      console.error("Gift verify error:", error);
      res.status(500).json({ error: "فشل في التحقق" });
    }
  });

  app.get("/api/gifts/redeem/:token", async (req, res) => {
    try {
      const gift = await storage.getGiftByToken(req.params.token);
      if (!gift) return res.status(404).json({ error: "الهدية غير موجودة" });
      if (gift.redeemed) return res.json({ redeemed: true, plan: gift.plan });
      const planLabels: Record<string, string> = { essay: "خطة المقالات", scenario: "خطة السيناريوهات", all_in_one: "الخطة الشاملة" };
      res.json({ redeemed: false, plan: gift.plan, planLabel: planLabels[gift.plan] || gift.plan, gifterEmail: gift.gifterEmail });
    } catch (error: any) {
      console.error("Gift redeem info error:", error);
      res.status(500).json({ error: "فشل في جلب البيانات" });
    }
  });

  app.post("/api/gifts/redeem/:token", isAuthenticated, async (req, res) => {
    try {
      const gift = await storage.getGiftByToken(req.params.token);
      if (!gift) return res.status(404).json({ error: "الهدية غير موجودة" });
      if (gift.redeemed) return res.status(400).json({ error: "تم استخدام هذه الهدية بالفعل" });
      if (!gift.paid) return res.status(400).json({ error: "لم يتم الدفع لهذه الهدية بعد" });
      await storage.redeemGift(req.params.token, req.user.claims.sub);
      await storage.updateUserPlan(req.user.claims.sub, gift.plan);
      await storage.addPoints(req.user.claims.sub, 25, "gift_received");
      res.json({ success: true, plan: gift.plan });
    } catch (error: any) {
      console.error("Gift redeem error:", error);
      res.status(500).json({ error: "فشل في تفعيل الهدية" });
    }
  });

  app.get("/api/me/gifts", isAuthenticated, async (req, res) => {
    try {
      const gifts = await storage.getGiftsByGifter(req.user.claims.sub);
      res.json(gifts);
    } catch (error: any) {
      console.error("Get gifts error:", error);
      res.status(500).json({ error: "فشل في جلب الهدايا" });
    }
  });

  // ── Reading Rewards (Points) Routes ──
  app.get("/api/me/points", isAuthenticated, async (req, res) => {
    try {
      const balance = await storage.getPointsBalance(req.user.claims.sub);
      const history = await storage.getPointHistory(req.user.claims.sub, 20);
      res.json({ balance, history });
    } catch (error: any) {
      console.error("Get points error:", error);
      res.status(500).json({ error: "فشل في جلب النقاط" });
    }
  });

  app.post("/api/me/earn-points", isAuthenticated, async (req, res) => {
    try {
      const { reason, chapterId } = req.body;
      const pointsMap: Record<string, number> = {
        chapter_read: 10,
        daily_login: 5,
        share_project: 15,
      };
      const pts = pointsMap[reason];
      if (!pts) return res.status(400).json({ error: "سبب غير صالح" });

      const userId = req.user.claims.sub;
      const history = await storage.getPointHistory(userId, 50);
      const now = Date.now();

      if (reason === "daily_login") {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const alreadyLoggedIn = history.some((h: any) => h.reason === "daily_login" && new Date(h.createdAt) >= todayStart);
        if (alreadyLoggedIn) return res.json({ points: 0, newBalance: await storage.getPointsBalance(userId), duplicate: true });
      }

      if (reason === "chapter_read") {
        if (!chapterId) return res.status(400).json({ error: "معرف الفصل مطلوب" });
        const chapter = await storage.getChapter(chapterId);
        if (!chapter) return res.status(400).json({ error: "الفصل غير موجود" });
        const alreadyRead = history.some((h: any) => h.reason === "chapter_read" && h.metadata === String(chapterId));
        if (alreadyRead) return res.json({ points: 0, newBalance: await storage.getPointsBalance(userId), duplicate: true });
        const newBalance = await storage.addPoints(userId, pts, "chapter_read", String(chapterId));
        return res.json({ points: pts, newBalance });
      }

      if (reason === "share_project") {
        const recentShares = history.filter((h: any) => h.reason === "share_project" && (now - new Date(h.createdAt).getTime()) < 86400000);
        if (recentShares.length >= 3) return res.json({ points: 0, newBalance: await storage.getPointsBalance(userId), duplicate: true });
      }

      const newBalance = await storage.addPoints(userId, pts, reason);
      res.json({ points: pts, newBalance });
    } catch (error: any) {
      console.error("Earn points error:", error);
      res.status(500).json({ error: "فشل في إضافة النقاط" });
    }
  });

  app.post("/api/me/redeem-points", isAuthenticated, async (req, res) => {
    try {
      const balance = await storage.getPointsBalance(req.user.claims.sub);
      if (balance < 500) return res.status(400).json({ error: "رصيد النقاط غير كافٍ (500 نقطة مطلوبة)" });
      const { newBalance } = await storage.redeemPoints(req.user.claims.sub, 500, "redeem");
      res.json({ success: true, discountPercent: 10, newBalance });
    } catch (error: any) {
      console.error("Redeem points error:", error);
      res.status(500).json({ error: "فشل في استبدال النقاط" });
    }
  });

  app.get("/api/me/email-notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const enabled = await storage.getEmailNotificationsEnabled(userId);
      res.json({ emailNotifications: enabled });
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب التفضيلات" });
    }
  });

  app.patch("/api/me/email-notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { emailNotifications } = req.body;
      if (typeof emailNotifications !== "boolean") return res.status(400).json({ error: "قيمة غير صالحة" });
      await storage.setEmailNotificationsEnabled(userId, emailNotifications);
      res.json({ success: true, emailNotifications });
    } catch (error) {
      res.status(500).json({ error: "فشل في تحديث التفضيلات" });
    }
  });

  app.get("/api/me/digest-preference", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const optOut = await storage.getDigestOptOut(userId);
      res.json({ digestOptOut: optOut });
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب التفضيلات" });
    }
  });

  app.patch("/api/me/digest-preference", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { digestOptOut } = req.body;
      if (typeof digestOptOut !== "boolean") return res.status(400).json({ error: "قيمة غير صالحة" });
      await storage.setDigestOptOut(userId, digestOptOut);
      res.json({ success: true, digestOptOut });
    } catch (error) {
      res.status(500).json({ error: "فشل في تحديث التفضيلات" });
    }
  });

  app.get("/api/me/email-preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const prefs = await storage.getUserEmailPreferences(userId);
      res.json(prefs);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب تفضيلات البريد" });
    }
  });

  app.patch("/api/me/email-preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const allowed = ["digestOptOut", "emailNotifications", "emailFollowPublications", "emailTipsComments", "emailChallenges"];
      const prefs: any = {};
      for (const key of allowed) {
        if (typeof req.body[key] === "boolean") prefs[key] = req.body[key];
      }
      if (Object.keys(prefs).length === 0) return res.status(400).json({ error: "لم يتم تقديم تفضيلات صالحة" });
      await storage.setUserEmailPreferences(userId, prefs);
      const updated = await storage.getUserEmailPreferences(userId);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "فشل في تحديث تفضيلات البريد" });
    }
  });

  app.post("/api/me/newsletter/send", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { subject, body } = req.body;
      if (!subject?.trim() || !body?.trim()) return res.status(400).json({ error: "العنوان والمحتوى مطلوبان" });
      if (subject.length > 200) return res.status(400).json({ error: "العنوان طويل جداً" });
      if (body.length > 10000) return res.status(400).json({ error: "المحتوى طويل جداً" });

      const sanitizedBody = sanitizeRichText(body);
      if (!sanitizedBody.trim()) return res.status(400).json({ error: "المحتوى فارغ بعد التنقيح" });

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });
      const authorName = (user as any).displayName || user.firstName || "كاتب";

      const subscribers = await storage.getEmailSubscribersForAuthor(userId);
      if (subscribers.length === 0) return res.status(400).json({ error: "لا يوجد مشتركون في نشرتك البريدية" });

      const recent = await storage.getNewsletterSendsByAuthor(userId, 1);
      if (recent.length > 0) {
        const lastSent = new Date(recent[0].createdAt);
        const hoursSince = (Date.now() - lastSent.getTime()) / (1000 * 60 * 60);
        if (hoursSince < 24) return res.status(429).json({ error: "يمكنك إرسال نشرة واحدة كل 24 ساعة" });
      }

      const sent = await sendAuthorNewsletter(subscribers, authorName, userId, subject.trim(), sanitizedBody);
      await storage.createNewsletterSend({ authorId: userId, subject: subject.trim(), body: sanitizedBody, recipientCount: sent });
      res.json({ success: true, sentCount: sent, message: `تم إرسال النشرة إلى ${sent} مشترك` });
    } catch (error) {
      console.error("Newsletter send error:", error);
      res.status(500).json({ error: "فشل في إرسال النشرة البريدية" });
    }
  });

  app.get("/api/me/newsletter/history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sends = await storage.getNewsletterSendsByAuthor(userId);
      res.json(sends);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب سجل النشرات" });
    }
  });

  // ── Writing Sprint Routes ──────────────────────────────────────────────────
  const createSprintSchema = z.object({
    durationSeconds: z.number().int().min(1).max(7200),
    wordsWritten: z.number().int().min(0).max(100000),
    targetWords: z.number().int().min(0).max(100000).nullable().optional(),
    projectId: z.number().int().positive().nullable().optional(),
  });

  app.post("/api/writing-sprints", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = createSprintSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: formatZodErrors(parsed.error) });
      const { durationSeconds, wordsWritten, targetWords, projectId } = parsed.data;

      if (projectId) {
        const proj = await storage.getProject(projectId);
        if (!proj || proj.userId !== userId) return res.status(403).json({ error: "لا يمكنك ربط سباق بمشروع لا يخصك" });
      }

      const sprint = await storage.createWritingSprint({
        userId,
        projectId: projectId ?? null,
        durationSeconds,
        wordsWritten,
        targetWords: targetWords ?? null,
        completedAt: new Date(),
      });

      await updateWritingStreak(userId);

      res.json(sprint);
    } catch (error) {
      console.error("Create sprint error:", error);
      res.status(500).json({ error: "فشل في حفظ جلسة السباق" });
    }
  });

  app.get("/api/writing-sprints", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(String(req.query.limit || "20"), 10);
      const sprints = await storage.getWritingSprintsByUser(userId, Math.min(limit, 50));
      res.json(sprints);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب جلسات السباق" });
    }
  });

  app.get("/api/writing-sprints/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getWritingSprintStats(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب إحصائيات السباق" });
    }
  });

  return httpServer;
}
