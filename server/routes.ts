import type { Express } from "express";
import { createServer, type Server } from "http";
import { eq } from "drizzle-orm";
import { storage } from "./storage";
import { db } from "./db";
import { characterRelationships, getProjectPrice, getProjectPriceByType, VALID_PAGE_COUNTS, userPlanCoversType, getPlanPrice, PLAN_PRICES, novelProjects, users, bookmarks, ANALYSIS_UNLOCK_PRICE, getRemainingAnalysisUses, TRIAL_MAX_PROJECTS, TRIAL_MAX_CHAPTERS, TRIAL_MAX_COVERS, TRIAL_MAX_CONTINUITY, TRIAL_MAX_STYLE, TRIAL_DURATION_HOURS, TRIAL_CHARGE_AMOUNT, isTrialExpired, type NovelProject } from "@shared/schema";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { buildOutlinePrompt, buildChapterPrompt, buildTitleSuggestionPrompt, buildCharacterSuggestionPrompt, buildCoverPrompt, calculateNovelStructure, buildEssayOutlinePrompt, buildEssaySectionPrompt, calculateEssayStructure, buildScenarioOutlinePrompt, buildScenePrompt, calculateScenarioStructure, buildShortStoryOutlinePrompt, buildShortStorySectionPrompt, calculateShortStoryStructure, buildRewritePrompt, buildOriginalityCheckPrompt, buildGlossaryPrompt, buildOriginalityEnhancePrompt, buildTechniqueSuggestionPrompt, buildFormatSuggestionPrompt, buildStyleAnalysisPrompt, buildKhawaterPrompt, buildSocialMediaPrompt, NARRATIVE_TECHNIQUE_MAP } from "./abu-hashim";
import { toArabicOrdinal } from "@shared/utils";
import OpenAI from "openai";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { sendNovelCompletionEmail, sendTicketReplyEmail } from "./email";
import { logApiUsage, logImageUsage } from "./api-usage";
import { trackServerEvent, invalidatePixelCache } from "./tracking";
import archiver from "archiver";
import { createCanvas, loadImage, registerFont } from "canvas";
import path from "path";
import crypto from "crypto";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const FREE_ACCESS_USER_IDS = ["39706084", "e482facd-d157-4e97-ad91-af96b8ec8f49"];

async function checkApiSuspension(userId: string, res: any): Promise<boolean> {
  const user = await storage.getUser(userId);
  if (user?.apiSuspended) {
    res.status(403).json({ error: "تم تعليق حسابك من استخدام أبو هاشم حتى يتم تسوية المستحقات. تواصل مع الإدارة.", apiSuspended: true });
    return true;
  }
  return false;
}

try {
  registerFont(path.join(process.cwd(), "server/fonts/Amiri-Bold.ttf"), { family: "Amiri", weight: "bold" });
  registerFont(path.join(process.cwd(), "server/fonts/Amiri-Regular.ttf"), { family: "Amiri", weight: "normal" });
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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  app.get("/sitemap.xml", (_req, res) => {
    const baseUrl = "https://qalamai.net";
    const pages = [
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
      { loc: "/login", priority: "0.5", changefreq: "yearly" },
      { loc: "/register", priority: "0.5", changefreq: "yearly" },
    ];
    const today = new Date().toISOString().split("T")[0];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>${baseUrl}${p.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join("\n")}
</urlset>`;
    res.set("Content-Type", "application/xml");
    res.send(xml);
  });

  app.get("/api/user/plan", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({ plan: user.plan || "free", planPurchasedAt: user.planPurchasedAt });
    } catch (error) {
      console.error("Error fetching plan:", error);
      res.status(500).json({ error: "Failed to fetch plan" });
    }
  });

  app.post("/api/plans/purchase", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { plan } = req.body;

      if (!plan || !PLAN_PRICES[plan]) {
        return res.status(400).json({ error: "خطة غير صالحة" });
      }

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

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

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: PLAN_PRICES[plan],
              product_data: {
                name: planNames[plan] || plan,
                description: `QalamAI - ${planNames[plan] || plan}`,
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
      if (!user) return res.status(404).json({ error: "User not found" });

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
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });

      if (!user.trialActive || user.plan !== "trial") {
        return res.json({ trialActive: false, plan: user.plan });
      }

      if (!isTrialExpired(user.trialEndsAt)) {
        return res.json({ trialActive: true, trialEndsAt: user.trialEndsAt, plan: "trial" });
      }

      if (!user.stripeCustomerId || !user.trialStripePaymentMethodId) {
        console.error("Trial auto-charge: missing stripe data for user", userId);
        await storage.updateUserTrial(userId, { plan: "free", trialActive: false });
        return res.json({ trialActive: false, plan: "free", charged: false, chargeFailed: true });
      }

      const stripe = await getUncachableStripeClient();
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: TRIAL_CHARGE_AMOUNT,
          currency: "usd",
          customer: user.stripeCustomerId,
          payment_method: user.trialStripePaymentMethodId,
          off_session: true,
          confirm: true,
          metadata: { userId, type: "trial_auto_charge" },
        });

        if (paymentIntent.status === "succeeded") {
          await storage.updateUserTrial(userId, {
            plan: "all_in_one",
            trialActive: false,
            planPurchasedAt: new Date(),
          });

          trackServerEvent({
            eventName: "Purchase",
            userId,
            value: TRIAL_CHARGE_AMOUNT / 100,
            currency: "USD",
            contentType: "plan",
            contentId: "all_in_one",
            ip: req.ip,
            userAgent: req.get("user-agent"),
          });

          return res.json({ trialActive: false, plan: "all_in_one", charged: true });
        }
      } catch (chargeError: any) {
        console.error("Trial auto-charge failed:", chargeError.message);
      }

      await storage.updateUserTrial(userId, {
        plan: "free",
        trialActive: false,
      });

      return res.json({ trialActive: false, plan: "free", charged: false, chargeFailed: true });
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
      const projects = await storage.getProjectsByUser(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projects = await storage.getProjectsByUser(userId);
      const statsMap: Record<number, { realWordCount: number; realPageCount: number }> = {};

      for (const project of projects) {
        const full = await storage.getProjectWithDetails(project.id);
        if (!full) continue;
        let totalWords = 0;
        for (const ch of full.chapters) {
          if (ch.content) {
            totalWords += ch.content.split(/\s+/).filter((w: string) => w.trim()).length;
          }
        }
        const wordsPerPage = 250;
        const realPages = Math.max(1, Math.ceil(totalWords / wordsPerPage));
        statsMap[project.id] = {
          realWordCount: totalWords,
          realPageCount: totalWords > 0 ? realPages : 0,
        };
      }
      res.json(statsMap);
    } catch (error) {
      console.error("Error fetching project stats:", error);
      res.status(500).json({ error: "Failed to fetch project stats" });
    }
  });

  app.get("/api/favorites", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favoriteIds = await storage.getFavoritesByUser(userId);
      res.json(favoriteIds);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ error: "Failed to fetch favorites" });
    }
  });

  app.post("/api/projects/:id/favorite", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ error: "المشروع غير موجود" });
      }
      const result = await storage.toggleFavorite(userId, projectId);
      res.json(result);
    } catch (error) {
      console.error("Error toggling favorite:", error);
      res.status(500).json({ error: "Failed to toggle favorite" });
    }
  });

  app.get("/api/projects/writing-stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projects = await storage.getProjectsByUser(userId);
      let totalWords = 0;
      let completedProjects = 0;
      const projectBreakdown: { projectId: number; title: string; type: string; words: number; chapters: number; completedChapters: number }[] = [];
      const dailyMap: Record<string, number> = {};

      for (const project of projects) {
        const full = await storage.getProjectWithDetails(project.id);
        if (!full) continue;
        let projectWords = 0;
        let completedChapters = 0;
        for (const ch of full.chapters) {
          if (ch.content) {
            const words = ch.content.split(/\s+/).filter((w: string) => w.trim()).length;
            projectWords += words;
            if (ch.status === "completed") completedChapters++;
            const dateKey = new Date(ch.createdAt).toISOString().split("T")[0];
            dailyMap[dateKey] = (dailyMap[dateKey] || 0) + words;
          }
        }
        totalWords += projectWords;
        if (project.status === "completed" || project.status === "finished") completedProjects++;
        projectBreakdown.push({
          projectId: project.id,
          title: project.title,
          type: project.projectType || "novel",
          words: projectWords,
          chapters: full.chapters.length,
          completedChapters,
        });
      }

      const today = new Date();
      const dailyWordCounts: { date: string; words: number }[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        dailyWordCounts.push({ date: key, words: dailyMap[key] || 0 });
      }

      res.json({
        totalWords,
        totalProjects: projects.length,
        completedProjects,
        avgWordsPerProject: projects.length > 0 ? Math.round(totalWords / projects.length) : 0,
        dailyWordCounts,
        projectBreakdown: projectBreakdown.sort((a, b) => b.words - a.words),
      });
    } catch (error) {
      console.error("Error fetching writing stats:", error);
      res.status(500).json({ error: "Failed to fetch writing stats" });
    }
  });

  app.get("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProjectWithDetails(id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "Forbidden" });
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.post("/api/projects/:id/create-checkout", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== userId) return res.status(403).json({ error: "Forbidden" });
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
                name: project.projectType === "essay" ? `مقال: ${project.title}` : project.projectType === "scenario" ? `سيناريو: ${project.title}` : project.projectType === "short_story" ? `قصة قصيرة: ${project.title}` : project.projectType === "khawater" ? `خاطرة: ${project.title}` : project.projectType === "social_media" ? `محتوى سوشيال: ${project.title}` : `رواية: ${project.title}`,
                description: project.projectType === "essay" ? `مقال احترافي` : project.projectType === "scenario" ? `سيناريو ${project.formatType === "series" ? "مسلسل" : "فيلم"}` : project.projectType === "short_story" ? `قصة قصيرة ${project.pageCount} صفحة` : project.projectType === "khawater" ? `خاطرة / تأمل أدبي` : project.projectType === "social_media" ? `محتوى سوشيال ميديا` : `رواية ${project.pageCount} صفحة`,
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
      res.status(500).json({ error: "Failed to create checkout" });
    }
  });

  app.post("/api/projects/:id/payment-success", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== userId) return res.status(403).json({ error: "Forbidden" });
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
      res.status(500).json({ error: "Failed to process payment" });
    }
  });

  app.post("/api/projects/suggest-titles", isAuthenticated, async (req: any, res) => {
    try {
      if (await checkApiSuspension(req.user.claims.sub, res)) return;
      const { mainIdea, timeSetting, placeSetting, narrativePov, characters } = req.body;
      if (!mainIdea || typeof mainIdea !== "string" || mainIdea.length < 10) {
        return res.status(400).json({ error: "الفكرة الرئيسية مطلوبة (10 أحرف على الأقل)" });
      }

      const safeChars = Array.isArray(characters)
        ? characters.filter((c: any) => c && typeof c.name === "string" && typeof c.role === "string").slice(0, 20).map((c: any) => ({ name: String(c.name).slice(0, 100), role: String(c.role).slice(0, 50) }))
        : undefined;

      const { system, user } = buildTitleSuggestionPrompt({
        mainIdea: mainIdea.slice(0, 2000),
        timeSetting: typeof timeSetting === "string" ? timeSetting.slice(0, 200) : undefined,
        placeSetting: typeof placeSetting === "string" ? placeSetting.slice(0, 200) : undefined,
        narrativePov: typeof narrativePov === "string" ? narrativePov.slice(0, 50) : undefined,
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

  app.post("/api/projects/suggest-format", isAuthenticated, async (req: any, res) => {
    try {
      if (await checkApiSuspension(req.user.claims.sub, res)) return;
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
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) return res.status(400).json({ error: "معرّف المشروع غير صالح" });

      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ error: "المشروع غير موجود" });
      }

      const updates: Partial<NovelProject> = {};

      if (typeof req.body.title === "string" && req.body.title.trim().length > 0) {
        updates.title = req.body.title.trim().slice(0, 200);
      }

      if (typeof req.body.timeSetting === "string") {
        updates.timeSetting = req.body.timeSetting.slice(0, 500);
      }
      if (typeof req.body.placeSetting === "string") {
        updates.placeSetting = req.body.placeSetting.slice(0, 500);
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

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "لا توجد تعديلات" });
      }

      const updated = await storage.updateProject(projectId, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating project settings:", error);
      res.status(500).json({ error: "فشل في تحديث إعدادات المشروع" });
    }
  });

  app.post("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title, mainIdea, timeSetting, placeSetting, narrativePov, pageCount, characters: chars, relationships, projectType, subject, essayTone, targetAudience, genre, episodeCount, formatType, narrativeTechnique, allowDialect } = req.body;

      const type = (projectType === "essay" || projectType === "scenario" || projectType === "short_story" || projectType === "khawater" || projectType === "social_media") ? projectType : "novel";
      const validPageCount = type === "novel" ? (VALID_PAGE_COUNTS.includes(pageCount) ? pageCount : 150) : (pageCount || 10);
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

      const isFreeUser = FREE_ACCESS_USER_IDS.includes(userId);
      const planCovers = userPlanCoversType(user?.plan, type);
      const autoPaid = isFreeUser || planCovers;

      const project = await storage.createProject({
        userId,
        title,
        mainIdea: mainIdea || title,
        timeSetting: timeSetting || "",
        placeSetting: placeSetting || "",
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
        ...(autoPaid ? { paid: true, status: "draft" } : {}),
      });

      if (chars && Array.isArray(chars) && chars.length > 0) {
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

      if (type === "khawater" || type === "social_media") {
        await storage.createChapter({
          projectId: project.id,
          chapterNumber: 1,
          title: type === "khawater" ? "النص" : "المحتوى",
          summary: null,
        });
        await storage.updateProject(project.id, { outline: "—", outlineApproved: 1 });
      }

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
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  app.post("/api/projects/:id/outline", isAuthenticated, async (req: any, res) => {
    try {
      if (await checkApiSuspension(req.user.claims.sub, res)) return;
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "Forbidden" });

      const userId = req.user.claims.sub;
      const isFreeUser = FREE_ACCESS_USER_IDS.includes(userId);
      const user = await storage.getUser(userId);
      const planCovers = userPlanCoversType(user?.plan, project.projectType || "novel");
      if (!project.paid && !isFreeUser && !planCovers) {
        return res.status(402).json({ error: "الرجاء إتمام الدفع أو تفعيل خطة مناسبة." });
      }

      const pType = project.projectType || "novel";
      if (pType === "khawater" || pType === "social_media") {
        return res.status(400).json({ error: "هذا النوع من المشاريع لا يحتاج مخططاً — اضغط على زر الكتابة مباشرة" });
      }

      const forceRegenerate = req.body?.forceRegenerate === true;

      if (project.outline && project.outlineApproved === 1 && !forceRegenerate) {
        return res.status(400).json({ error: "لا يمكن إعادة إنشاء المخطط بعد اعتماده" });
      }

      if (project.outline) {
        const existingChapters = await storage.getChaptersByProject(id);
        for (const ch of existingChapters) {
          await storage.deleteChapter(ch.id);
        }
        if (forceRegenerate && project.outlineApproved === 1) {
          await storage.updateProject(id, { outlineApproved: 0 } as any);
        }
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
      } else {
        promptResult = buildOutlinePrompt(project, chars, rels, chars);
      }

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
    } catch (error) {
      console.error("Error generating outline:", error);
      res.status(500).json({ error: "Failed to generate outline" });
    }
  });

  app.post("/api/projects/:id/outline/approve", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "Forbidden" });

      const updated = await storage.updateProject(id, { outlineApproved: 1, status: "writing" });
      res.json(updated);
    } catch (error) {
      console.error("Error approving outline:", error);
      res.status(500).json({ error: "Failed to approve outline" });
    }
  });

  app.patch("/api/projects/:id/outline", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "Forbidden" });
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
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "Forbidden" });
      if (project.outlineApproved) return res.status(400).json({ error: "لا يمكن تعديل المخطط بعد الموافقة عليه" });

      const { instruction } = req.body;
      if (!instruction || typeof instruction !== "string") return res.status(400).json({ error: "التعليمات مطلوبة" });

      if (project.projectType === "khawater" || project.projectType === "social_media") {
        return res.status(400).json({ error: "هذا النوع من المشاريع لا يحتاج مخططاً" });
      }

      const systemPrompt = project.projectType === "essay"
        ? "أنت أبو هاشم — محرر صحفي محترف. عدّل الهيكل التالي بناءً على تعليمات المستخدم. أعد الهيكل كاملاً مع التعديلات المطلوبة."
        : project.projectType === "scenario"
        ? "أنت أبو هاشم — كاتب سيناريو محترف. عدّل المخطط الدرامي التالي بناءً على تعليمات المستخدم. أعد المخطط كاملاً مع التعديلات."
        : project.projectType === "short_story"
        ? "أنت أبو هاشم — كاتب قصص قصيرة محترف. عدّل مخطط القصة التالي بناءً على تعليمات المستخدم. أعد المخطط كاملاً مع التعديلات المطلوبة."
        : "أنت أبو هاشم — وكيل أدبي ذكي. عدّل مخطط الرواية التالي بناءً على تعليمات المستخدم. أعد المخطط كاملاً مع التعديلات المطلوبة.";

      const userPrompt = `المخطط الحالي:\n${project.outline}\n\nالتعديل المطلوب:\n${instruction}\n\nأعد المخطط كاملاً بعد التعديل. حافظ على نفس التنسيق والبنية.`;

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

  app.post("/api/projects/:projectId/chapters/:chapterId/generate", isAuthenticated, async (req: any, res) => {
    try {
      if (await checkApiSuspension(req.user.claims.sub, res)) return;
      const projectId = parseInt(req.params.projectId);
      const chapterId = parseInt(req.params.chapterId);

      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "Forbidden" });

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

      const chapter = await storage.getChapter(chapterId);
      if (!chapter) return res.status(404).json({ error: "Chapter not found" });

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
        if (pType === "khawater") {
          promptResult = buildKhawaterPrompt(project);
        } else if (pType === "social_media") {
          promptResult = buildSocialMediaPrompt(project);
        } else if (pType === "essay") {
          promptResult = buildEssaySectionPrompt(project, updatedChapter!, previousChapters, project.outline || "", part, totalParts);
        } else if (pType === "scenario") {
          promptResult = buildScenePrompt(project, chars, updatedChapter!, previousChapters, project.outline || "", part, totalParts);
        } else if (pType === "short_story") {
          promptResult = buildShortStorySectionPrompt(project, updatedChapter!, previousChapters, project.outline || "", part, totalParts, chars);
        } else {
          promptResult = buildChapterPrompt(project, chars, updatedChapter!, previousChapters, project.outline || "", part, totalParts);
        }

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
          sendNovelCompletionEmail(projectOwner.email, project.title, projectId, project.projectType || "novel").catch(() => {});
        }
        storage.createNotification({
          userId: project.userId,
          type: "project_completed",
          title: "مشروعك مكتمل!",
          message: `مشروعك "${project.title}" مكتمل الآن. يمكنك تحميله.`,
          link: `/project/${projectId}`,
        }).catch(() => {});
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error generating chapter:", error);
      try {
        const chapter = await storage.getChapter(parseInt(req.params.chapterId));
        if (chapter && chapter.status === "generating") {
          await storage.updateChapter(parseInt(req.params.chapterId), {
            status: chapter.content ? "incomplete" : "pending"
          });
        }
      } catch {}
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to generate chapter" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to generate chapter" });
      }
    }
  });

  app.post("/api/projects/:id/characters", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "Forbidden" });

      const { name, role, background, motivation, speechStyle, physicalDescription, psychologicalTraits, age } = req.body;
      if (!name || !role || !background) return res.status(400).json({ error: "جميع الحقول مطلوبة" });

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
      res.status(500).json({ error: "Failed to add character" });
    }
  });

  app.patch("/api/projects/:projectId/chapters/:chapterId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const chapterId = parseInt(req.params.chapterId);
      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "Forbidden" });

      const chapter = await storage.getChapter(chapterId);
      if (!chapter || chapter.projectId !== projectId) return res.status(404).json({ error: "Chapter not found" });

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

      res.json(updated);
    } catch (error) {
      console.error("Error updating chapter:", error);
      res.status(500).json({ error: "Failed to update chapter" });
    }
  });

  app.post("/api/projects/:id/suggest-characters", isAuthenticated, async (req: any, res) => {
    try {
      if (await checkApiSuspension(req.user.claims.sub, res)) return;
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "Forbidden" });

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
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "Forbidden" });

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
      const id = parseInt(req.params.id);
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

      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 72, bottom: 0, left: 72, right: 72 },
        info: {
          Title: project.title,
          Author: "QalamAI - أبو هاشم",
        },
        autoFirstPage: false,
      });

      if (fs.existsSync(fontPath)) {
        doc.registerFont("Arabic", fontPath);
        doc.registerFont("ArabicBold", fs.existsSync(boldFontPath) ? boldFontPath : fontPath);
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(project.title)}.pdf"`);
      doc.pipe(res);

      const pageWidth = 595.28 - 144;
      const pageHeight = 841.89;
      const drawBorder = () => {
        doc.rect(36, 36, 595.28 - 72, 841.89 - 72)
          .lineWidth(1.5)
          .strokeColor("#8B7355")
          .stroke();
        doc.rect(42, 42, 595.28 - 84, 841.89 - 84)
          .lineWidth(0.5)
          .strokeColor("#C4A882")
          .stroke();
      };

      const fullPageWidth = 595.28;
      const contentStartY = 90;

      doc.addPage();

      let coverRendered = false;
      if (project.coverImageUrl) {
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
        doc.font("ArabicBold").fontSize(28).fillColor("#2C1810");
        const coverTitleH = doc.heightOfString(project.title, { width: pageWidth, align: "center" });
        const coverTitleY = Math.max(300, 380 - coverTitleH / 2);
        doc.text(project.title, 72, coverTitleY, {
          width: pageWidth,
          align: "center",
          features: ["rtla"],
        });

        doc.font("Arabic")
          .fontSize(14)
          .fillColor("#6B5B4F");
        const coverSubY = coverTitleY + coverTitleH + 30;
        const subAr = "بقلم أبو هاشم — ";
        const subEn = "QalamAI";
        const subArW = doc.widthOfString(subAr, { features: ["rtla"] });
        const subEnW = doc.widthOfString(subEn);
        const subTotalW = subArW + subEnW;
        const subStartX = (fullPageWidth - subTotalW) / 2;
        doc.text(subEn, subStartX, coverSubY, { width: subEnW + 2, lineBreak: false });
        doc.text(subAr, subStartX + subEnW, coverSubY, { width: subArW + 2, align: "right", features: ["rtla"], lineBreak: false });
      }

      doc.addPage();
      drawBorder();

      doc.font("ArabicBold").fontSize(24).fillColor("#2C1810");
      const cpTitleH = doc.heightOfString(project.title, { width: pageWidth, align: "center" });
      const cpTitleY = Math.max(240, 300 - cpTitleH / 2);
      doc.text(project.title, 72, cpTitleY, { width: pageWidth, align: "center", features: ["rtla"] });

      const authLineY = cpTitleY + cpTitleH + 30;
      doc.font("Arabic").fontSize(14).fillColor("#6B5B4F");
      const authAr = "كُتب بمساعدة أبو هاشم — ";
      const authEn = "QalamAI";
      const authArW = doc.widthOfString(authAr, { features: ["rtla"] });
      const authEnW = doc.widthOfString(authEn);
      const authTotalW = authArW + authEnW;
      const authStartX = (fullPageWidth - authTotalW) / 2;
      doc.text(authEn, authStartX, authLineY, { width: authEnW + 2, lineBreak: false });
      doc.text(authAr, authStartX + authEnW, authLineY, { width: authArW + 2, align: "right", features: ["rtla"], lineBreak: false });

      const dateLine = new Date().toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
      const dateW = doc.widthOfString(dateLine);
      doc.text(dateLine, (fullPageWidth - dateW) / 2, authLineY + 40, { lineBreak: false });

      doc.font("Arabic").fontSize(13).fillColor("#8B7355");
      const rightsAr = "جميع الحقوق محفوظة ";
      const rightsEn = "\u00A9 2026";
      const rightsArW = doc.widthOfString(rightsAr, { features: ["rtla"] });
      const rightsEnW = doc.widthOfString(rightsEn);
      const rightsTotalW = rightsArW + rightsEnW;
      const rightsStartX = (fullPageWidth - rightsTotalW) / 2;
      const rightsY = authLineY + 80;
      doc.text(rightsEn, rightsStartX, rightsY, { width: rightsEnW + 2, lineBreak: false });
      doc.text(rightsAr, rightsStartX + rightsEnW, rightsY, { width: rightsArW + 2, align: "right", features: ["rtla"], lineBreak: false });

      const chapterLabel = project.projectType === "essay" ? "القسم" : project.projectType === "scenario" ? "المشهد" : project.projectType === "short_story" ? "المقطع" : project.projectType === "khawater" ? "النص" : project.projectType === "social_media" ? "المحتوى" : "الفصل";

      const chapters = (project.chapters || [])
        .filter((ch: any) => ch.content && ch.status === "completed")
        .sort((a: any, b: any) => a.chapterNumber - b.chapterNumber);

      const continuationStartY = 90;
      const tocMinEntryHeight = 28;
      const tocEntrySpacing = 6;
      const tocFirstPageStartY = 145;
      const tocContPageStartY = 72;
      const tocBottomLimit = pageHeight - 120;
      const tocEntryWidth = pageWidth - 90;

      let tocPageCount = 1;
      let simTocY = tocFirstPageStartY;
      doc.font("Arabic").fontSize(13);
      for (const ch of chapters) {
        const chTitle = ch.title || `${chapterLabel} ${toArabicOrdinal(ch.chapterNumber)}`;
        const tocEntry = `${chapterLabel} ${toArabicOrdinal(ch.chapterNumber)}: ${chTitle}`;
        const entryH = doc.heightOfString(tocEntry, { width: tocEntryWidth, align: "right" });
        const totalH = Math.max(entryH, tocMinEntryHeight) + tocEntrySpacing;
        if (simTocY + totalH > tocBottomLimit) {
          tocPageCount++;
          simTocY = tocContPageStartY;
        }
        simTocY += totalH;
      }

      const pagesBeforeChapters = 2 + tocPageCount;
      let estimatedPage = pagesBeforeChapters + 1;
      const chapterStartPages: number[] = [];

      for (const chapter of chapters) {
        chapterStartPages.push(estimatedPage);
        const chTitleEst = chapter.title || `${chapterLabel} ${toArabicOrdinal(chapter.chapterNumber)}`;
        doc.font("ArabicBold").fontSize(22);
        const estTitleH = doc.heightOfString(chTitleEst, { width: pageWidth, align: "right" });
        const estContentStartY = contentStartY + estTitleH + 40;
        const paragraphs = (chapter.content || "").split(/\n+/).filter((p: string) => p.trim());
        let estY = estContentStartY;
        doc.font("Arabic").fontSize(13);
        for (const para of paragraphs) {
          const textHeight = doc.heightOfString(para.trim(), { width: pageWidth, align: "right", lineGap: 8, indent: 25 });
          if (estY + textHeight > pageHeight - 100) {
            estimatedPage++;
            estY = continuationStartY;
          }
          estY += textHeight + 12;
        }
        estimatedPage++;
      }

      doc.addPage();
      drawBorder();

      doc.font("ArabicBold").fontSize(22).fillColor("#2C1810");
      doc.text("فهرس المحتويات", 72, contentStartY, { width: pageWidth, align: "right", features: ["rtla"] });

      doc.moveTo(72, 125).lineTo(fullPageWidth - 72, 125).lineWidth(1).strokeColor("#8B7355").stroke();
      doc.moveTo(72, 128).lineTo(fullPageWidth - 72, 128).lineWidth(0.5).strokeColor("#C4A882").stroke();

      doc.font("Arabic").fontSize(13).fillColor("#333333");
      let tocY = 145;

      for (let ci = 0; ci < chapters.length; ci++) {
        const ch = chapters[ci];
        const chTitle = ch.title || `${chapterLabel} ${toArabicOrdinal(ch.chapterNumber)}`;
        const tocEntry = `${chapterLabel} ${toArabicOrdinal(ch.chapterNumber)}: ${chTitle}`;
        const pageNum = chapterStartPages[ci] || "";

        doc.font("Arabic").fontSize(13).fillColor("#333333");
        const tocEntryH = doc.heightOfString(tocEntry, { width: tocEntryWidth, align: "right" });
        const entryHeight = Math.max(tocEntryH, tocMinEntryHeight);
        doc.text(tocEntry, 100, tocY, {
          width: pageWidth - 90,
          align: "right",
          features: ["rtla"],
        });

        doc.font("Arabic").fontSize(13).fillColor("#8B7355");
        doc.text(String(pageNum), 72, tocY, {
          width: 50,
          align: "left",
          lineBreak: false,
        });

        tocY += entryHeight + tocEntrySpacing;
        if (tocY > tocBottomLimit) {
          doc.addPage();
          drawBorder();
          tocY = 72;
        }
      }

      let pageNumber = pagesBeforeChapters;

      const drawPageHeader = (chapterTitle: string) => {
        doc.font("Arabic").fontSize(9).fillColor("#999");
        doc.text(chapterTitle, 72, 50, {
          width: pageWidth,
          align: "right",
          features: ["rtla"],
          lineBreak: false,
        });
      };

      const drawOrnamentalDivider = (y: number) => {
        const centerX = fullPageWidth / 2;
        const dividerWidth = 180;

        doc.moveTo(centerX - dividerWidth / 2, y)
          .lineTo(centerX - 30, y)
          .lineWidth(1)
          .strokeColor("#C4A882")
          .stroke();

        doc.moveTo(centerX + 30, y)
          .lineTo(centerX + dividerWidth / 2, y)
          .lineWidth(1)
          .strokeColor("#C4A882")
          .stroke();

        doc.font("Arabic").fontSize(12).fillColor("#C4A882");
        doc.text("\u2726 \u2726 \u2726", centerX - 25, y - 6, {
          width: 50,
          align: "center",
          lineBreak: false,
        });
      };

      for (const chapter of chapters) {
        doc.addPage();
        pageNumber++;
        drawBorder();

        const chTitle = chapter.title || `${chapterLabel} ${toArabicOrdinal(chapter.chapterNumber)}`;

        doc.font("ArabicBold")
          .fontSize(22)
          .fillColor("#2C1810");
        const titleHeight = doc.heightOfString(chTitle, { width: pageWidth, align: "right" });
        doc.text(chTitle, 72, contentStartY, {
          width: pageWidth,
          align: "right",
          features: ["rtla"],
        });

        const dividerY = contentStartY + titleHeight + 15;
        drawOrnamentalDivider(dividerY);
        const chapterContentStartY = dividerY + 25;

        doc.font("Arabic")
          .fontSize(13)
          .fillColor("#333333");

        const paragraphs = (chapter.content || "").split(/\n+/).filter((p: string) => p.trim());
        let yPos = chapterContentStartY;

        for (const para of paragraphs) {
          const textHeight = doc.heightOfString(para.trim(), { width: pageWidth, align: "right", lineGap: 8, indent: 25 });
          if (yPos + textHeight > pageHeight - 100) {
            doc.font("Arabic").fontSize(9).fillColor("#999");
            doc.text(`\u2014 ${pageNumber} \u2014`, 0, pageHeight - 60, { width: fullPageWidth, align: "center", lineBreak: false });
            doc.addPage();
            pageNumber++;
            drawBorder();
            drawPageHeader(chTitle);
            yPos = continuationStartY;
          }
          doc.font("Arabic").fontSize(13).fillColor("#333333");
          doc.text(para.trim(), 72, yPos, {
            width: pageWidth,
            align: "right",
            lineGap: 8,
            indent: 25,
            features: ["rtla"],
          });
          yPos += textHeight + 12;
        }

        doc.font("Arabic").fontSize(9).fillColor("#999");
        doc.text(`\u2014 ${pageNumber} \u2014`, 0, pageHeight - 60, { width: fullPageWidth, align: "center", lineBreak: false });
      }

      if (project.glossary) {
        doc.addPage();
        pageNumber++;
        drawBorder();

        doc.font("ArabicBold").fontSize(22).fillColor("#2C1810");
        doc.text("المسرد", 72, contentStartY, { width: pageWidth, align: "right", features: ["rtla"] });

        doc.moveTo(72, 125).lineTo(fullPageWidth - 72, 125).lineWidth(1).strokeColor("#8B7355").stroke();
        doc.moveTo(72, 128).lineTo(fullPageWidth - 72, 128).lineWidth(0.5).strokeColor("#C4A882").stroke();

        doc.font("Arabic").fontSize(12).fillColor("#333333");
        const glossaryLines = project.glossary.split(/\n+/).filter((l: string) => l.trim());
        let yPos = 145;
        for (const line of glossaryLines) {
          const textHeight = doc.heightOfString(line.trim(), { width: pageWidth, align: "right", lineGap: 6 });
          if (yPos + textHeight > pageHeight - 100) {
            doc.font("Arabic").fontSize(9).fillColor("#999");
            doc.text(`\u2014 ${pageNumber} \u2014`, 0, pageHeight - 60, { width: fullPageWidth, align: "center", lineBreak: false });
            doc.addPage();
            pageNumber++;
            drawBorder();
            drawPageHeader("المسرد");
            yPos = continuationStartY;
          }
          doc.font("Arabic").fontSize(12).fillColor("#333333");
          doc.text(line.trim(), 72, yPos, { width: pageWidth, align: "right", lineGap: 6, features: ["rtla"] });
          yPos += textHeight + 8;
        }
        doc.font("Arabic").fontSize(9).fillColor("#999");
        doc.text(`\u2014 ${pageNumber} \u2014`, 0, pageHeight - 60, { width: fullPageWidth, align: "center", lineBreak: false });
      }

      doc.end();
    } catch (error) {
      console.error("Error generating PDF:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "فشل في إنشاء ملف PDF" });
      }
    }
  });

  app.get("/api/projects/:id/export/epub", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const epubExportUser = await storage.getUser(req.user.claims.sub);
      if (epubExportUser?.plan === "trial") {
        return res.status(403).json({ error: "التصدير غير متاح في الفترة التجريبية. يرجى الترقية إلى خطة مدفوعة." });
      }
      const project = await storage.getProjectWithDetails(id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "Forbidden" });

      const epubChapterLabel = project.projectType === "essay" ? "القسم" : project.projectType === "scenario" ? "المشهد" : project.projectType === "short_story" ? "المقطع" : project.projectType === "khawater" ? "النص" : project.projectType === "social_media" ? "المحتوى" : "الفصل";
      const completedChapters = project.chapters.filter((ch: any) => ch.content);
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
    <dc:title>${project.title}</dc:title>
    <dc:language>ar</dc:language>
    <dc:creator>QalamAI</dc:creator>
    <meta property="dcterms:modified">${new Date().toISOString().split(".")[0]}Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="style" href="style.css" media-type="text/css"/>
${coverManifestItems}${colophonManifestItem}
${chapterItems}${glossaryManifestItem}
  </manifest>
  <spine page-progression-direction="rtl">
${coverSpineItem}${colophonSpineItem}${chapterSpine}${glossarySpineItem}
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

      archive.append(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="ar" dir="rtl">
<head><title>حقوق النشر</title><link rel="stylesheet" href="style.css"/></head>
<body>
  <div style="text-align: center; padding-top: 40%; line-height: 2.5;">
    <h1>${safeTitle}</h1>
    <p style="text-indent: 0; font-size: 1.1em; color: #8B7355;">\u0643\u064F\u062A\u0628 \u0628\u0645\u0633\u0627\u0639\u062F\u0629 \u0623\u0628\u0648 \u0647\u0627\u0634\u0645 \u2014 QalamAI</p>
    <p style="text-indent: 0; color: #8B7355;">${epubDate}</p>
    <hr/>
    <p style="text-indent: 0; font-size: 0.9em; color: #6B5B4F;">\u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0642\u0648\u0642 \u0645\u062D\u0641\u0648\u0638\u0629 \u00A9 2026</p>
  </div>
</body>
</html>`, { name: "OEBPS/colophon.xhtml" });

      archive.append(`body { direction: rtl; unicode-bidi: embed; font-family: serif; line-height: 2; padding: 1em; color: #2C1810; background: #FFFDF5; }
html { writing-mode: horizontal-tb; }
h1 { text-align: center; color: #8B4513; font-size: 1.5em; margin-bottom: 0.5em; }
h2 { color: #8B7355; font-size: 0.9em; text-align: center; margin-bottom: 1em; }
p { text-indent: 2em; margin: 0.5em 0; text-align: justify; }
hr { border: none; border-top: 1px solid #D4A574; margin: 1.5em auto; width: 40%; }`, { name: "OEBPS/style.css" });

      const tocItems = completedChapters
        .map((ch: any, i: number) => `      <li><a href="chapter${i + 1}.xhtml">${epubChapterLabel} ${toArabicOrdinal(ch.chapterNumber)}: ${ch.title}</a></li>`)
        .join("\n");

      archive.append(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="ar" dir="rtl">
<head><title>فهرس المحتويات</title><link rel="stylesheet" href="style.css"/></head>
<body>
  <h1>${project.title}</h1>
  <nav epub:type="toc">
    <ol>
${tocItems}
    </ol>
  </nav>
</body>
</html>`, { name: "OEBPS/nav.xhtml" });

      for (let i = 0; i < completedChapters.length; i++) {
        const ch = completedChapters[i];
        const paragraphs = (ch.content || "").split("\n").filter((p: string) => p.trim())
          .map((p: string) => `<p>${p.trim().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`)
          .join("\n");

        archive.append(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="ar" dir="rtl">
<head><title>${epubChapterLabel} ${toArabicOrdinal(ch.chapterNumber)}: ${ch.title}</title><link rel="stylesheet" href="style.css"/></head>
<body>
  <h2>${epubChapterLabel} ${toArabicOrdinal(ch.chapterNumber)}</h2>
  <h1>${ch.title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</h1>
  <hr/>
${paragraphs}
</body>
</html>`, { name: `OEBPS/chapter${i + 1}.xhtml` });
      }

      if (project.glossary) {
        const glossaryParagraphs = project.glossary.split("\n").filter((p: string) => p.trim())
          .map((p: string) => `<p>${p.trim().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`)
          .join("\n");

        archive.append(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="ar" dir="rtl">
<head><title>المسرد</title><link rel="stylesheet" href="style.css"/></head>
<body>
  <h1>المسرد</h1>
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

  const isAdmin = async (req: any, res: any, next: any) => {
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const user = await storage.getUser(userId);
    if (!user || user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    next();
  };

  app.post("/api/chapters/:id/rewrite", isAuthenticated, async (req: any, res) => {
    try {
      if (await checkApiSuspension(req.user.claims.sub, res)) return;
      const chapterId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const { content, tone } = req.body;

      if (!content || typeof content !== "string" || content.trim().length < 10) {
        return res.status(400).json({ error: "النص مطلوب (10 أحرف على الأقل)" });
      }
      if (!tone || typeof tone !== "string") {
        return res.status(400).json({ error: "النبرة مطلوبة" });
      }

      const chapter = await storage.getChapter(chapterId);
      if (!chapter) return res.status(404).json({ error: "Chapter not found" });

      const project = await storage.getProject(chapter.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== userId) return res.status(403).json({ error: "Forbidden" });

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
    } catch (error) {
      console.error("Error rewriting chapter:", error);
      res.status(500).json({ error: "فشل في إعادة كتابة النص" });
    }
  });

  app.post("/api/tickets", async (req: any, res) => {
    try {
      const { name, email, subject, message } = req.body;
      if (!name || !email || !subject || !message) {
        return res.status(400).json({ error: "جميع الحقول مطلوبة" });
      }
      const userId = req.user?.claims?.sub || null;
      const ticket = await storage.createTicket({ name, email, subject, message, userId });
      res.status(201).json(ticket);
    } catch (error) {
      console.error("Error creating ticket:", error);
      res.status(500).json({ error: "Failed to create ticket" });
    }
  });

  app.get("/api/tickets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tickets = await storage.getTicketsByUser(userId);
      res.json(tickets);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      res.status(500).json({ error: "Failed to fetch tickets" });
    }
  });

  app.get("/api/tickets/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const ticket = await storage.getTicket(id);
      if (!ticket) return res.status(404).json({ error: "Ticket not found" });
      if (ticket.userId !== req.user.claims.sub) return res.status(403).json({ error: "Forbidden" });
      const replies = await storage.getTicketReplies(id);
      res.json({ ...ticket, replies });
    } catch (error) {
      console.error("Error fetching ticket:", error);
      res.status(500).json({ error: "Failed to fetch ticket" });
    }
  });

  app.post("/api/tickets/:id/reply", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const ticket = await storage.getTicket(id);
      if (!ticket) return res.status(404).json({ error: "Ticket not found" });
      if (ticket.userId !== req.user.claims.sub) return res.status(403).json({ error: "Forbidden" });
      const { message } = req.body;
      if (!message) return res.status(400).json({ error: "الرسالة مطلوبة" });
      const reply = await storage.createTicketReply({ ticketId: id, userId: req.user.claims.sub, message, isAdmin: false });
      res.status(201).json(reply);
    } catch (error) {
      console.error("Error creating reply:", error);
      res.status(500).json({ error: "Failed to create reply" });
    }
  });

  app.get("/api/admin/stats", isAuthenticated, isAdmin, async (_req: any, res) => {
    try {
      const stats = await storage.getTicketStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.get("/api/admin/tickets", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const status = req.query.status as string | undefined;
      const tickets = await storage.getAllTickets(status);
      res.json(tickets);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      res.status(500).json({ error: "Failed to fetch tickets" });
    }
  });

  app.get("/api/admin/tickets/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const ticket = await storage.getTicket(id);
      if (!ticket) return res.status(404).json({ error: "Ticket not found" });
      const replies = await storage.getTicketReplies(id);
      res.json({ ...ticket, replies });
    } catch (error) {
      console.error("Error fetching ticket:", error);
      res.status(500).json({ error: "Failed to fetch ticket" });
    }
  });

  const VALID_STATUSES = ["open", "in_progress", "resolved", "closed"];
  const VALID_PRIORITIES = ["low", "normal", "high", "urgent"];

  app.patch("/api/admin/tickets/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, priority } = req.body;
      if (status && !VALID_STATUSES.includes(status)) return res.status(400).json({ error: "حالة غير صالحة" });
      if (priority && !VALID_PRIORITIES.includes(priority)) return res.status(400).json({ error: "أولوية غير صالحة" });
      let ticket = await storage.getTicket(id);
      if (!ticket) return res.status(404).json({ error: "Ticket not found" });
      if (status) ticket = await storage.updateTicketStatus(id, status);
      if (priority) ticket = await storage.updateTicketPriority(id, priority);
      res.json(ticket);
    } catch (error) {
      console.error("Error updating ticket:", error);
      res.status(500).json({ error: "Failed to update ticket" });
    }
  });

  app.post("/api/admin/tickets/:id/reply", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const ticket = await storage.getTicket(id);
      if (!ticket) return res.status(404).json({ error: "Ticket not found" });
      const { message } = req.body;
      if (!message) return res.status(400).json({ error: "الرسالة مطلوبة" });
      const reply = await storage.createTicketReply({ ticketId: id, userId: req.user.claims.sub, message, isAdmin: true });
      if (ticket.email) {
        sendTicketReplyEmail(ticket.email, ticket.subject, message, id).catch(() => {});
      }
      if (ticket.userId) {
        storage.createNotification({
          userId: ticket.userId,
          type: "ticket_reply",
          title: "رد جديد على تذكرتك",
          message: `تم الرد على تذكرتك "${ticket.subject}".`,
          link: `/tickets/${id}`,
        }).catch(() => {});
      }
      res.status(201).json(reply);
    } catch (error) {
      console.error("Error creating reply:", error);
      res.status(500).json({ error: "Failed to create reply" });
    }
  });

  app.get("/api/admin/users", isAuthenticated, isAdmin, async (_req: any, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const usersWithStats = await Promise.all(
        allUsers.map(async (u) => {
          const projectCount = await storage.getUserProjectCount(u.id);
          return {
            id: u.id,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            profileImageUrl: u.profileImageUrl,
            plan: u.plan || "free",
            role: u.role,
            createdAt: u.createdAt,
            totalProjects: projectCount,
          };
        })
      );
      res.json(usersWithStats);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/users/:id/projects", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const projects = await storage.getProjectsByUser(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching user projects:", error);
      res.status(500).json({ error: "Failed to fetch user projects" });
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
      if (!user) return res.status(404).json({ error: "User not found" });

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
      res.status(500).json({ error: "Failed to update user plan" });
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
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) return res.status(400).json({ error: "معرّف المشروع غير صالح" });

      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ error: "المشروع غير موجود" });

      const { continuityCheckPaidCount, styleAnalysisPaidCount } = req.body;
      const updates: any = {};

      if (typeof continuityCheckPaidCount === "number") {
        updates.continuityCheckPaidCount = Math.max(0, Math.min(1000, Math.floor(continuityCheckPaidCount)));
      }
      if (typeof styleAnalysisPaidCount === "number") {
        updates.styleAnalysisPaidCount = Math.max(0, Math.min(1000, Math.floor(styleAnalysisPaidCount)));
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
      const chapterId = parseInt(req.params.id);
      const chapter = await storage.getChapter(chapterId);
      if (!chapter) return res.status(404).json({ error: "Chapter not found" });
      const project = await storage.getProject(chapter.projectId);
      if (!project || project.userId !== req.user.claims.sub) return res.status(403).json({ error: "Forbidden" });
      const versions = await storage.getChapterVersions(chapterId);
      res.json(versions);
    } catch (error) {
      console.error("Error fetching chapter versions:", error);
      res.status(500).json({ error: "Failed to fetch versions" });
    }
  });

  app.post("/api/chapters/:id/versions/:versionId/restore", isAuthenticated, async (req: any, res) => {
    try {
      const chapterId = parseInt(req.params.id);
      const versionId = parseInt(req.params.versionId);
      const chapter = await storage.getChapter(chapterId);
      if (!chapter) return res.status(404).json({ error: "Chapter not found" });
      const project = await storage.getProject(chapter.projectId);
      if (!project || project.userId !== req.user.claims.sub) return res.status(403).json({ error: "Forbidden" });
      const restored = await storage.restoreChapterVersion(chapterId, versionId);
      res.json(restored);
    } catch (error) {
      console.error("Error restoring version:", error);
      res.status(500).json({ error: "Failed to restore version" });
    }
  });

  app.post("/api/projects/:id/share", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "Forbidden" });
      const crypto = await import("crypto");
      const token = crypto.randomBytes(16).toString("hex");
      const updated = await storage.updateProject(id, { shareToken: token } as any);
      res.json({ shareToken: updated.shareToken });
    } catch (error) {
      console.error("Error sharing project:", error);
      res.status(500).json({ error: "Failed to share project" });
    }
  });

  app.delete("/api/projects/:id/share", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "Forbidden" });
      await storage.updateProject(id, { shareToken: null } as any);
      res.json({ success: true });
    } catch (error) {
      console.error("Error revoking share:", error);
      res.status(500).json({ error: "Failed to revoke share" });
    }
  });

  app.get("/api/shared/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const project = await storage.getProjectByShareToken(token);
      if (!project) return res.status(404).json({ error: "Not found" });
      const details = await storage.getProjectWithDetails(project.id);
      if (!details) return res.status(404).json({ error: "Not found" });
      res.json({
        title: details.title,
        projectType: details.projectType,
        coverImageUrl: details.coverImageUrl,
        chapters: details.chapters
          .filter((ch: any) => ch.content)
          .sort((a: any, b: any) => a.chapterNumber - b.chapterNumber)
          .map((ch: any) => ({
            chapterNumber: ch.chapterNumber,
            title: ch.title,
            content: ch.content,
          })),
      });
    } catch (error) {
      console.error("Error fetching shared project:", error);
      res.status(500).json({ error: "Failed to fetch shared project" });
    }
  });

  app.get("/api/admin/analytics", isAuthenticated, isAdmin, async (_req: any, res) => {
    try {
      const analytics = await storage.getAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
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
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread-count", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch count" });
    }
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const notifs = await storage.getNotificationsByUser(req.user.claims.sub, 1000);
      const owned = notifs.find(n => n.id === id);
      if (!owned) return res.status(403).json({ error: "Forbidden" });
      const updated = await storage.markNotificationRead(id);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to mark as read" });
    }
  });

  app.patch("/api/notifications/read-all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.markAllNotificationsRead(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark all as read" });
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
      res.status(500).json({ error: "Failed to validate promo" });
    }
  });

  app.get("/api/admin/promos", isAuthenticated, isAdmin, async (_req: any, res) => {
    try {
      const promos = await storage.getAllPromoCodes();
      res.json(promos);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch promos" });
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
      res.status(500).json({ error: "Failed to create promo" });
    }
  });

  // ===== Reading Progress & Bookmarks =====
  app.put("/api/projects/:id/progress", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = parseInt(req.params.id);
      const { lastChapterId, scrollPosition } = req.body;
      const progress = await storage.upsertReadingProgress(userId, projectId, lastChapterId, scrollPosition);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ error: "Failed to save progress" });
    }
  });

  app.get("/api/projects/:id/progress", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = parseInt(req.params.id);
      const progress = await storage.getReadingProgress(userId, projectId);
      res.json(progress || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch progress" });
    }
  });

  app.post("/api/projects/:id/bookmarks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = parseInt(req.params.id);
      const { chapterId, note } = req.body;
      if (!chapterId) return res.status(400).json({ error: "chapterId required" });
      const bookmark = await storage.createBookmark({ userId, projectId, chapterId, note });
      res.status(201).json(bookmark);
    } catch (error) {
      res.status(500).json({ error: "Failed to create bookmark" });
    }
  });

  app.get("/api/projects/:id/bookmarks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = parseInt(req.params.id);
      const bmarks = await storage.getBookmarksByProject(userId, projectId);
      res.json(bmarks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bookmarks" });
    }
  });

  app.delete("/api/bookmarks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const allBookmarks = await db.select().from(bookmarks).where(eq(bookmarks.id, id));
      if (!allBookmarks.length || allBookmarks[0].userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      await storage.deleteBookmark(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete bookmark" });
    }
  });

  // ===== Author Profiles & Gallery =====
  app.get("/api/authors/:id", async (req, res) => {
    try {
      const userId = req.params.id;
      const data = await storage.getPublicAuthor(userId);
      if (!data) return res.status(404).json({ error: "Author not found" });
      const ratingData = await storage.getAuthorAverageRating(userId);
      res.json({
        id: data.user.id,
        displayName: data.user.displayName || `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim(),
        bio: data.user.bio,
        profileImageUrl: data.user.profileImageUrl,
        averageRating: ratingData.average,
        ratingCount: ratingData.count,
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
      res.status(500).json({ error: "Failed to fetch author" });
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

  app.get("/api/gallery", async (_req, res) => {
    try {
      const projects = await storage.getGalleryProjects();
      res.json(projects.map(p => ({
        id: p.id,
        title: p.title,
        projectType: p.projectType,
        coverImageUrl: p.coverImageUrl,
        shareToken: p.shareToken,
        mainIdea: p.mainIdea?.slice(0, 200),
        authorName: p.authorName,
        authorId: p.authorId,
        authorAverageRating: p.authorAverageRating,
      })));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch gallery" });
    }
  });

  // ===== Profile Extended Update =====
  app.patch("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { firstName, lastName, bio, displayName, publicProfile, onboardingCompleted } = req.body;
      const updated = await storage.updateUserProfileExtended(userId, { firstName, lastName, bio, displayName, publicProfile, onboardingCompleted });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update profile" });
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

  // ===== Content Moderation (Admin) =====
  app.get("/api/admin/projects/:id/content", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const details = await storage.getProjectWithDetails(id);
      if (!details) return res.status(404).json({ error: "Project not found" });
      const { chapters: chaps, characters: chars, relationships: rels, ...projectData } = details;
      res.json({ project: projectData, chapters: chaps, characters: chars, relationships: rels });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project content" });
    }
  });

  app.patch("/api/admin/projects/:id/flag", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { flagged, flagReason } = req.body;
      const updated = await storage.updateProject(id, { flagged: !!flagged, flagReason: flagReason || null } as any);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to flag project" });
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
      res.status(500).json({ error: "Failed to export users" });
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
      res.status(500).json({ error: "Failed to update plans" });
    }
  });

  // ===== Admin API Usage Endpoints =====
  app.get("/api/admin/api-usage", isAuthenticated, isAdmin, async (_req: any, res) => {
    try {
      const data = await storage.getAggregatedApiUsage();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch API usage data" });
    }
  });

  app.get("/api/admin/api-usage/:userId", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const logs = await storage.getUserApiUsageLogs(req.params.userId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user API logs" });
    }
  });

  app.patch("/api/admin/users/:id/suspend-api", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { suspended } = req.body;
      if (typeof suspended !== "boolean") {
        return res.status(400).json({ error: "suspended must be a boolean" });
      }
      const user = await storage.setUserApiSuspended(req.params.id, suspended);
      res.json({ success: true, apiSuspended: user.apiSuspended });
    } catch (error) {
      res.status(500).json({ error: "Failed to update suspension status" });
    }
  });

  // ===== Originality Check =====
  app.post("/api/chapters/:id/originality-check", isAuthenticated, async (req: any, res) => {
    try {
      if (await checkApiSuspension(req.user.claims.sub, res)) return;
      const chapterId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const chapter = await storage.getChapter(chapterId);
      if (!chapter) return res.status(404).json({ error: "Chapter not found" });
      const project = await storage.getProject(chapter.projectId);
      if (!project || project.userId !== userId) return res.status(403).json({ error: "Forbidden" });
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
        } catch {}
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
      const chapterId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const { suggestions, flaggedPhrases } = req.body;

      if (!Array.isArray(suggestions) || !Array.isArray(flaggedPhrases)) {
        return res.status(400).json({ error: "suggestions و flaggedPhrases يجب أن يكونا مصفوفات" });
      }
      const cleanSuggestions = suggestions.filter((s: any) => typeof s === "string").slice(0, 20);
      const cleanFlagged = flaggedPhrases.filter((s: any) => typeof s === "string").slice(0, 20);

      const chapter = await storage.getChapter(chapterId);
      if (!chapter) return res.status(404).json({ error: "Chapter not found" });
      const project = await storage.getProject(chapter.projectId);
      if (!project || project.userId !== userId) return res.status(403).json({ error: "Forbidden" });
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

  // ===== Glossary Generation =====
  app.post("/api/projects/:id/generate-glossary", isAuthenticated, async (req: any, res) => {
    try {
      if (await checkApiSuspension(req.user.claims.sub, res)) return;
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const project = await storage.getProjectWithDetails(id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== userId) return res.status(403).json({ error: "Forbidden" });

      const allContent = project.chapters
        .filter((ch: any) => ch.content)
        .sort((a: any, b: any) => a.chapterNumber - b.chapterNumber)
        .map((ch: any) => {
          const glossaryLabel = project.projectType === "essay" ? "القسم" : project.projectType === "scenario" ? "المشهد" : project.projectType === "short_story" ? "المقطع" : project.projectType === "khawater" ? "النص" : project.projectType === "social_media" ? "المحتوى" : "الفصل";
          return `${glossaryLabel} ${toArabicOrdinal(ch.chapterNumber)}: ${ch.title}\n${ch.content}`;
        })
        .join("\n\n---\n\n");

      if (!allContent) return res.status(400).json({ error: "لا يوجد محتوى لإنشاء الفهرس" });

      const { system, user } = buildGlossaryPrompt(allContent, project.title, project.projectType || "novel");
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
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const project = await storage.getProjectWithDetails(id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== userId) return res.status(403).json({ error: "Forbidden" });

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

      const chapterLabel = project.projectType === "essay" ? "القسم" : project.projectType === "scenario" ? "المشهد" : project.projectType === "short_story" ? "المقطع" : project.projectType === "khawater" ? "النص" : project.projectType === "social_media" ? "المحتوى" : "الفصل";

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
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const { issueIndex } = req.body;

      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== userId) return res.status(403).json({ error: "Forbidden" });

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
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const { issueIndices } = req.body;

      if (!Array.isArray(issueIndices) || issueIndices.length === 0) {
        return res.status(400).json({ error: "أرقام المشاكل مطلوبة" });
      }

      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== userId) return res.status(403).json({ error: "Forbidden" });

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
      const chapterId = parseInt(req.params.id);
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
      if (!chapter) return res.status(404).json({ error: "Chapter not found" });
      const project = await storage.getProject(chapter.projectId);
      if (!project || project.userId !== userId) return res.status(403).json({ error: "Forbidden" });
      if (!chapter.content) return res.status(400).json({ error: "لا يوجد محتوى للإصلاح" });

      const allChapters = await storage.getChaptersByProject(chapter.projectId);
      const sortedChapters = allChapters
        .filter((ch: any) => ch.content && ch.id !== chapterId)
        .sort((a: any, b: any) => a.chapterNumber - b.chapterNumber);

      const contextChapters = sortedChapters
        .map((ch: any) => `الفصل ${ch.chapterNumber} - ${ch.title}:\n${ch.content!.substring(0, 600)}`)
        .join("\n---\n");

      const chapterLabel = project.projectType === "essay" ? "القسم" : project.projectType === "scenario" ? "المشهد" : project.projectType === "short_story" ? "المقطع" : project.projectType === "khawater" ? "النص" : project.projectType === "social_media" ? "المحتوى" : "الفصل";

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
    } catch (error) {
      console.error("Error fixing continuity issue:", error);
      res.status(500).json({ error: "فشل في إصلاح المشكلة" });
    }
  });

  // ===== Style Analysis =====
  app.post("/api/projects/:id/style-analysis", isAuthenticated, async (req: any, res) => {
    try {
      if (await checkApiSuspension(req.user.claims.sub, res)) return;
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const project = await storage.getProjectWithDetails(id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== userId) return res.status(403).json({ error: "Forbidden" });

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

      const chapterLabel = project.projectType === "essay" ? "القسم" : project.projectType === "scenario" ? "المشهد" : project.projectType === "short_story" ? "المقطع" : project.projectType === "khawater" ? "النص" : project.projectType === "social_media" ? "المحتوى" : "الفصل";

      const allContent = completedChapters
        .map((ch: any) => `${chapterLabel} ${ch.chapterNumber}: ${ch.title}\n${ch.content?.substring(0, 4000)}`)
        .join("\n\n---\n\n");

      const { system, user } = buildStyleAnalysisPrompt(
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
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const { improvement } = req.body;

      if (!improvement || !improvement.suggestion || typeof improvement.suggestion !== "string") {
        return res.status(400).json({ error: "بيانات الاقتراح مطلوبة" });
      }

      const project = await storage.getProjectWithDetails(id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== userId) return res.status(403).json({ error: "Forbidden" });

      const completedChapters = project.chapters
        .filter((ch: any) => ch.content && ch.status === "completed")
        .sort((a: any, b: any) => a.chapterNumber - b.chapterNumber);

      if (completedChapters.length < 1) {
        return res.status(400).json({ error: "لا توجد فصول مكتملة" });
      }

      const chapterLabel = project.projectType === "essay" ? "القسم" : project.projectType === "scenario" ? "المشهد" : project.projectType === "short_story" ? "المقطع" : project.projectType === "khawater" ? "النص" : project.projectType === "social_media" ? "المحتوى" : "الفصل";

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
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const { issueIndex } = req.body;

      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== userId) return res.status(403).json({ error: "Forbidden" });

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
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const { improvementIndices } = req.body;

      if (!Array.isArray(improvementIndices) || improvementIndices.length === 0) {
        return res.status(400).json({ error: "أرقام الاقتراحات مطلوبة" });
      }

      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== userId) return res.status(403).json({ error: "Forbidden" });

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
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;

      const project = await storage.getProjectWithDetails(id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== userId) return res.status(403).json({ error: "Forbidden" });

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

      const chapterLabel = project.projectType === "essay" ? "القسم" : project.projectType === "scenario" ? "المشهد" : project.projectType === "short_story" ? "المقطع" : project.projectType === "khawater" ? "النص" : project.projectType === "social_media" ? "المحتوى" : "الفصل";

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
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;

      const project = await storage.getProjectWithDetails(id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== userId) return res.status(403).json({ error: "Forbidden" });

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

      const chapterLabel = project.projectType === "essay" ? "القسم" : project.projectType === "scenario" ? "المشهد" : project.projectType === "short_story" ? "المقطع" : project.projectType === "khawater" ? "النص" : project.projectType === "social_media" ? "المحتوى" : "الفصل";

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
      res.status(500).json({ error: "Failed to update onboarding" });
    }
  });

  app.get("/api/projects/:id/analysis-usage", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "Forbidden" });

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
      res.status(500).json({ error: "Failed to fetch analysis usage" });
    }
  });

  app.post("/api/projects/:id/analysis-checkout", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { feature } = req.body;
      if (!feature || !["continuity", "style"].includes(feature)) {
        return res.status(400).json({ error: "Feature must be 'continuity' or 'style'" });
      }

      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "Forbidden" });

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
      const id = parseInt(req.params.id);
      const { sessionId, feature } = req.body;
      if (!sessionId || !feature || !["continuity", "style"].includes(feature)) {
        return res.status(400).json({ error: "Missing sessionId or feature" });
      }

      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "Forbidden" });

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
  app.get("/api/reviews", async (_req, res) => {
    try {
      const reviews = await storage.getApprovedReviews();
      const enriched = await Promise.all(reviews.map(async (review) => {
        const user = await storage.getUser(review.userId);
        const liveBio = (user as any)?.bio || review.reviewerBio || null;
        const liveName = user?.displayName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || review.reviewerName;
        return { ...review, reviewerBio: liveBio, reviewerName: liveName };
      }));
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب المراجعات" });
    }
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
      const review = await storage.createPlatformReview({ userId, reviewerName, reviewerBio, content: content.trim(), rating });
      res.json({ success: true, message: "تم إرسال مراجعتك بنجاح وسيتم نشرها بعد مراجعة الإدارة", review });
    } catch (error) {
      res.status(500).json({ error: "فشل في إرسال المراجعة" });
    }
  });

  // ===== Admin Review Moderation =====
  app.get("/api/admin/reviews", isAuthenticated, isAdmin, async (_req: any, res) => {
    try {
      const reviews = await storage.getPendingReviews();
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب المراجعات" });
    }
  });

  app.patch("/api/admin/reviews/:id/approve", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const review = await storage.approvePlatformReview(id);
      res.json(review);
    } catch (error) {
      res.status(500).json({ error: "فشل في الموافقة على المراجعة" });
    }
  });

  app.delete("/api/admin/reviews/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePlatformReview(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "فشل في حذف المراجعة" });
    }
  });

  // ===== Tracking Pixels =====
  app.get("/api/tracking-pixels", async (_req, res) => {
    try {
      const pixels = await storage.getTrackingPixels();
      res.json(pixels.filter(p => p.enabled).map(p => ({ platform: p.platform, pixelId: p.pixelId })));
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب بيانات التتبع" });
    }
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

  return httpServer;
}
