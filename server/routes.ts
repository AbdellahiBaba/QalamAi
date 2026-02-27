import type { Express } from "express";
import { createServer, type Server } from "http";
import { eq } from "drizzle-orm";
import { storage } from "./storage";
import { db } from "./db";
import { characterRelationships, getProjectPrice, getProjectPriceByType, VALID_PAGE_COUNTS, userPlanCoversType, getPlanPrice, PLAN_PRICES, novelProjects, users, bookmarks } from "@shared/schema";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { buildOutlinePrompt, buildChapterPrompt, buildTitleSuggestionPrompt, buildCharacterSuggestionPrompt, buildCoverPrompt, calculateNovelStructure, buildEssayOutlinePrompt, buildEssaySectionPrompt, calculateEssayStructure, buildScenarioOutlinePrompt, buildScenePrompt, calculateScenarioStructure, buildShortStoryOutlinePrompt, buildShortStorySectionPrompt, calculateShortStoryStructure, buildRewritePrompt, buildOriginalityCheckPrompt, buildGlossaryPrompt, buildOriginalityEnhancePrompt, buildTechniqueSuggestionPrompt, buildFormatSuggestionPrompt, buildStyleAnalysisPrompt, NARRATIVE_TECHNIQUE_MAP } from "./abu-hashim";
import OpenAI from "openai";
import { getUncachableStripeClient } from "./stripeClient";
import { sendNovelCompletionEmail, sendTicketReplyEmail } from "./email";
import archiver from "archiver";
import { createCanvas, loadImage, registerFont } from "canvas";
import path from "path";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const FREE_ACCESS_USER_IDS = ["39706084", "e482facd-d157-4e97-ad91-af96b8ec8f49"];

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

      res.json({ success: true, plan });
    } catch (error) {
      console.error("Error verifying plan:", error);
      res.status(500).json({ error: "فشل في التحقق من الدفع" });
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
                name: project.projectType === "essay" ? `مقال: ${project.title}` : project.projectType === "scenario" ? `سيناريو: ${project.title}` : project.projectType === "short_story" ? `قصة قصيرة: ${project.title}` : `رواية: ${project.title}`,
                description: project.projectType === "essay" ? `مقال احترافي` : project.projectType === "scenario" ? `سيناريو ${project.formatType === "series" ? "مسلسل" : "فيلم"}` : project.projectType === "short_story" ? `قصة قصيرة ${project.pageCount} صفحة` : `رواية ${project.pageCount} صفحة`,
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

      const updates: Partial<{ timeSetting: string; placeSetting: string; narrativeTechnique: string | null }> = {};
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
      const { title, mainIdea, timeSetting, placeSetting, narrativePov, pageCount, characters: chars, relationships, projectType, subject, essayTone, targetAudience, genre, episodeCount, formatType, narrativeTechnique } = req.body;

      const type = (projectType === "essay" || projectType === "scenario" || projectType === "short_story") ? projectType : "novel";
      const validPageCount = type === "novel" ? (VALID_PAGE_COUNTS.includes(pageCount) ? pageCount : 150) : (pageCount || 10);
      const price = getProjectPriceByType(type, validPageCount);

      const user = await storage.getUser(userId);
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
        essayTone: type === "essay" ? (essayTone || null) : null,
        targetAudience: type === "essay" ? (targetAudience || null) : null,
        genre: (type === "scenario" || type === "short_story") ? (genre || null) : null,
        episodeCount: type === "scenario" ? (episodeCount || 1) : null,
        formatType: type === "scenario" ? (formatType || "film") : null,
        narrativeTechnique: (type === "novel" || type === "short_story") && narrativeTechnique && NARRATIVE_TECHNIQUE_MAP[narrativeTechnique] ? narrativeTechnique : null,
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

      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  app.post("/api/projects/:id/outline", isAuthenticated, async (req: any, res) => {
    try {
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
      const pType = project.projectType || "novel";

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
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "Forbidden" });
      if (project.outlineApproved) return res.status(400).json({ error: "لا يمكن تعديل المخطط بعد الموافقة عليه" });

      const { instruction } = req.body;
      if (!instruction || typeof instruction !== "string") return res.status(400).json({ error: "التعليمات مطلوبة" });

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
        max_tokens: 16000,
      });
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
        if (pType === "essay") {
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
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "Forbidden" });

      const prompt = buildCoverPrompt(project);

      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt,
        size: "1024x1024",
      });

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
        margins: { top: 72, bottom: 72, left: 72, right: 72 },
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
      drawBorder();

      if (project.coverImageUrl) {
        try {
          const response = await fetch(project.coverImageUrl);
          if (response.ok) {
            const buffer = Buffer.from(await response.arrayBuffer());
            doc.image(buffer, 147, 100, { width: 300, height: 400, fit: [300, 400], align: "center" });
          }
        } catch (e) {
          console.error("Failed to load cover image for PDF:", e);
        }
      }

      if (!project.coverImageUrl) {
        doc.font("ArabicBold")
          .fontSize(28)
          .fillColor("#2C1810");
        const titleWidth = doc.widthOfString(project.title);
        doc.text(project.title, (fullPageWidth - titleWidth) / 2, 350, {
          features: ["rtla"],
        });

        doc.font("Arabic")
          .fontSize(14)
          .fillColor("#6B5B4F");
        const subtitle = "بقلم أبو هاشم — QalamAI";
        const subWidth = doc.widthOfString(subtitle);
        doc.text(subtitle, (fullPageWidth - subWidth) / 2, 400, {
          features: ["rtla"],
        });
      }

      doc.addPage();
      drawBorder();

      doc.font("ArabicBold").fontSize(24).fillColor("#2C1810");
      const cpTitleW = doc.widthOfString(project.title);
      doc.text(project.title, (fullPageWidth - cpTitleW) / 2, 280, { features: ["rtla"] });

      doc.font("Arabic").fontSize(14).fillColor("#6B5B4F");
      const authorLine = "كُتب بمساعدة أبو هاشم — QalamAI";
      const authorW = doc.widthOfString(authorLine);
      doc.text(authorLine, (fullPageWidth - authorW) / 2, 330, { features: ["rtla"] });

      const dateLine = new Date().toLocaleDateString("ar-SA");
      const dateW = doc.widthOfString(dateLine);
      doc.text(dateLine, (fullPageWidth - dateW) / 2, 370, { features: ["rtla"] });

      doc.font("Arabic").fontSize(13).fillColor("#8B7355");
      const rightsLine = "جميع الحقوق محفوظة \u00A9 2026";
      const rightsW = doc.widthOfString(rightsLine);
      doc.text(rightsLine, (fullPageWidth - rightsW) / 2, 410, { features: ["rtla"] });

      const chapterLabel = project.projectType === "essay" ? "القسم" : project.projectType === "scenario" ? "المشهد" : project.projectType === "short_story" ? "المقطع" : "الفصل";

      const chapters = (project.chapters || [])
        .filter((ch: any) => ch.content && ch.status === "completed")
        .sort((a: any, b: any) => a.chapterNumber - b.chapterNumber);

      const chapterContentStartY = 155;
      const continuationStartY = 90;
      let estimatedPage = 4;
      const chapterStartPages: number[] = [];

      for (const chapter of chapters) {
        chapterStartPages.push(estimatedPage);
        const paragraphs = (chapter.content || "").split(/\n+/).filter((p: string) => p.trim());
        let estY = chapterContentStartY;
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
        const chTitle = ch.title || `${chapterLabel} ${ch.chapterNumber}`;
        const tocEntry = `${chapterLabel} ${ch.chapterNumber}: ${chTitle}`;
        const pageNum = chapterStartPages[ci] || "";

        doc.font("Arabic").fontSize(13).fillColor("#333333");
        doc.text(tocEntry, 100, tocY, {
          width: pageWidth - 60,
          align: "right",
          features: ["rtla"],
        });

        doc.font("Arabic").fontSize(13).fillColor("#8B7355");
        doc.text(String(pageNum), 72, tocY, {
          width: 50,
          align: "left",
        });

        tocY += 28;
        if (tocY > pageHeight - 120) {
          doc.addPage();
          drawBorder();
          tocY = 72;
        }
      }

      let pageNumber = 3;

      const drawPageHeader = (chapterTitle: string) => {
        doc.font("Arabic").fontSize(9).fillColor("#999");
        doc.text(chapterTitle, 72, 50, {
          width: pageWidth,
          align: "right",
          features: ["rtla"],
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
        });
      };

      for (const chapter of chapters) {
        doc.addPage();
        pageNumber++;
        drawBorder();

        const chTitle = chapter.title || `${chapterLabel} ${chapter.chapterNumber}`;

        doc.font("ArabicBold")
          .fontSize(22)
          .fillColor("#2C1810");
        doc.text(chTitle, 72, contentStartY, {
          width: pageWidth,
          align: "right",
          features: ["rtla"],
        });

        drawOrnamentalDivider(130);

        doc.font("Arabic")
          .fontSize(13)
          .fillColor("#333333");

        const paragraphs = (chapter.content || "").split(/\n+/).filter((p: string) => p.trim());
        let yPos = chapterContentStartY;

        for (const para of paragraphs) {
          const textHeight = doc.heightOfString(para.trim(), { width: pageWidth, align: "right", lineGap: 8, indent: 25 });
          if (yPos + textHeight > pageHeight - 100) {
            doc.font("Arabic").fontSize(9).fillColor("#999");
            doc.text(`\u2014 ${pageNumber} \u2014`, 0, pageHeight - 60, { width: fullPageWidth, align: "center" });
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
        doc.text(`\u2014 ${pageNumber} \u2014`, 0, pageHeight - 60, { width: fullPageWidth, align: "center" });
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
            doc.text(`\u2014 ${pageNumber} \u2014`, 0, pageHeight - 60, { width: fullPageWidth, align: "center" });
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
        doc.text(`\u2014 ${pageNumber} \u2014`, 0, pageHeight - 60, { width: fullPageWidth, align: "center" });
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
      const project = await storage.getProjectWithDetails(id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "Forbidden" });

      const epubChapterLabel = project.projectType === "essay" ? "القسم" : project.projectType === "scenario" ? "المشهد" : project.projectType === "short_story" ? "المقطع" : "الفصل";
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
        .map((ch: any, i: number) => `      <li><a href="chapter${i + 1}.xhtml">${epubChapterLabel} ${ch.chapterNumber}: ${ch.title}</a></li>`)
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
<head><title>${epubChapterLabel} ${ch.chapterNumber}: ${ch.title}</title><link rel="stylesheet" href="style.css"/></head>
<body>
  <h2>${epubChapterLabel} ${ch.chapterNumber}</h2>
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
      res.json({
        id: data.user.id,
        displayName: data.user.displayName || `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim(),
        bio: data.user.bio,
        profileImageUrl: data.user.profileImageUrl,
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

  // ===== Originality Check =====
  app.post("/api/chapters/:id/originality-check", isAuthenticated, async (req: any, res) => {
    try {
      const chapterId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const chapter = await storage.getChapter(chapterId);
      if (!chapter) return res.status(404).json({ error: "Chapter not found" });
      const project = await storage.getProject(chapter.projectId);
      if (!project || project.userId !== userId) return res.status(403).json({ error: "Forbidden" });
      if (!chapter.content) return res.status(400).json({ error: "لا يوجد محتوى للفحص" });

      const { system, user } = buildOriginalityCheckPrompt(chapter.content);
      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_completion_tokens: 4096,
      });

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
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const project = await storage.getProjectWithDetails(id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== userId) return res.status(403).json({ error: "Forbidden" });

      const allContent = project.chapters
        .filter((ch: any) => ch.content)
        .sort((a: any, b: any) => a.chapterNumber - b.chapterNumber)
        .map((ch: any) => `الفصل ${ch.chapterNumber}: ${ch.title}\n${ch.content}`)
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
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const project = await storage.getProjectWithDetails(id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== userId) return res.status(403).json({ error: "Forbidden" });

      const completedChapters = project.chapters
        .filter((ch: any) => ch.content && ch.status === "completed")
        .sort((a: any, b: any) => a.chapterNumber - b.chapterNumber);

      if (completedChapters.length < 2) return res.status(400).json({ error: "يجب أن يكون هناك فصلان مكتملان على الأقل لإجراء فحص الاستمرارية" });

      const chapterLabel = project.projectType === "essay" ? "القسم" : project.projectType === "scenario" ? "المشهد" : project.projectType === "short_story" ? "المقطع" : "الفصل";

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
        max_tokens: 4000,
        response_format: { type: "json_object" },
      });

      const resultText = response.choices[0]?.message?.content || "{}";
      try {
        const result = JSON.parse(resultText);
        res.json(result);
      } catch {
        res.json({ overallScore: 0, issues: [], strengths: [], summary: resultText });
      }
    } catch (error) {
      console.error("Error running continuity check:", error);
      res.status(500).json({ error: "فشل في فحص الاستمرارية" });
    }
  });

  // ===== Style Analysis =====
  app.post("/api/projects/:id/style-analysis", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const project = await storage.getProjectWithDetails(id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== userId) return res.status(403).json({ error: "Forbidden" });

      const completedChapters = project.chapters
        .filter((ch: any) => ch.content && ch.status === "completed")
        .sort((a: any, b: any) => a.chapterNumber - b.chapterNumber);

      if (completedChapters.length < 1) return res.status(400).json({ error: "يجب أن يكون هناك فصل مكتمل واحد على الأقل لتحليل الأسلوب" });

      const chapterLabel = project.projectType === "essay" ? "القسم" : project.projectType === "scenario" ? "المشهد" : project.projectType === "short_story" ? "المقطع" : "الفصل";

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
        max_tokens: 5000,
        response_format: { type: "json_object" },
      });

      const resultText = response.choices[0]?.message?.content || "{}";
      try {
        const result = JSON.parse(resultText);
        res.json(result);
      } catch {
        res.json({ overallScore: 0, summary: resultText, dimensions: [], strengths: [], improvements: [], styleProfile: {}, topPriority: "" });
      }
    } catch (error) {
      console.error("Error running style analysis:", error);
      res.status(500).json({ error: "فشل في تحليل الأسلوب الأدبي" });
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

  return httpServer;
}
