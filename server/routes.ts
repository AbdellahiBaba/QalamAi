import type { Express } from "express";
import { createServer, type Server } from "http";
import { eq } from "drizzle-orm";
import { storage } from "./storage";
import { db } from "./db";
import { characterRelationships, getProjectPrice, getProjectPriceByType, VALID_PAGE_COUNTS, userPlanCoversType, getPlanPrice, PLAN_PRICES, novelProjects } from "@shared/schema";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { buildOutlinePrompt, buildChapterPrompt, buildTitleSuggestionPrompt, buildCharacterSuggestionPrompt, buildCoverPrompt, calculateNovelStructure, buildEssayOutlinePrompt, buildEssaySectionPrompt, calculateEssayStructure, buildScenarioOutlinePrompt, buildScenePrompt, calculateScenarioStructure } from "./abu-hashim";
import OpenAI from "openai";
import { getUncachableStripeClient } from "./stripeClient";
import { sendNovelCompletionEmail, sendTicketReplyEmail } from "./email";
import archiver from "archiver";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const FREE_ACCESS_USER_IDS = ["39706084", "e482facd-d157-4e97-ad91-af96b8ec8f49"];

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
                name: project.projectType === "essay" ? `مقال: ${project.title}` : project.projectType === "scenario" ? `سيناريو: ${project.title}` : `رواية: ${project.title}`,
                description: project.projectType === "essay" ? `مقال احترافي` : project.projectType === "scenario" ? `سيناريو ${project.formatType === "series" ? "مسلسل" : "فيلم"}` : `رواية ${project.pageCount} صفحة`,
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

  app.post("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title, mainIdea, timeSetting, placeSetting, narrativePov, pageCount, characters: chars, relationships, projectType, subject, essayTone, targetAudience, genre, episodeCount, formatType } = req.body;

      const type = (projectType === "essay" || projectType === "scenario") ? projectType : "novel";
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
        genre: type === "scenario" ? (genre || null) : null,
        episodeCount: type === "scenario" ? (episodeCount || 1) : null,
        formatType: type === "scenario" ? (formatType || "film") : null,
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

      if (project.outline && project.outlineApproved === 1) {
        return res.status(400).json({ error: "لا يمكن إعادة إنشاء المخطط بعد اعتماده" });
      }

      if (project.outline) {
        const existingChapters = await storage.getChaptersByProject(id);
        for (const ch of existingChapters) {
          await storage.deleteChapter(ch.id);
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
          sendNovelCompletionEmail(projectOwner.email, project.title, projectId).catch(() => {});
        }
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

      const { name, role, background } = req.body;
      if (!name || !role || !background) return res.status(400).json({ error: "جميع الحقول مطلوبة" });

      const character = await storage.createCharacter({ projectId: id, name, role, background });
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

      const updated = await storage.updateChapter(chapterId, { content });
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

      const coverImageUrl = `data:image/png;base64,${base64}`;
      await storage.updateProject(id, { coverImageUrl });
      res.json({ coverImageUrl });
    } catch (error) {
      console.error("Error generating cover:", error);
      res.status(500).json({ error: "فشل في إنشاء الغلاف" });
    }
  });

  app.get("/api/projects/:id/export/epub", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProjectWithDetails(id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== req.user.claims.sub) return res.status(403).json({ error: "Forbidden" });

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
        .map((_: any, i: number) => `    <itemref idref="chapter${i + 1}"/>`)
        .join("\n");

      const coverManifestItems = coverImageBuffer
        ? `    <item id="cover-image" href="cover.${coverExt}" media-type="${coverMediaType}" properties="cover-image"/>\n    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>\n`
        : "";
      const coverSpineItem = coverImageBuffer
        ? `    <itemref idref="cover"/>\n`
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
${coverManifestItems}${chapterItems}
  </manifest>
  <spine page-progression-direction="rtl">
${coverSpineItem}${chapterSpine}
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

      archive.append(`body { direction: rtl; unicode-bidi: embed; font-family: serif; line-height: 2; padding: 1em; color: #2C1810; background: #FFFDF5; }
html { writing-mode: horizontal-tb; }
h1 { text-align: center; color: #8B4513; font-size: 1.5em; margin-bottom: 0.5em; }
h2 { color: #8B7355; font-size: 0.9em; text-align: center; margin-bottom: 1em; }
p { text-indent: 2em; margin: 0.5em 0; text-align: justify; }
hr { border: none; border-top: 1px solid #D4A574; margin: 1.5em auto; width: 40%; }`, { name: "OEBPS/style.css" });

      const tocItems = completedChapters
        .map((ch: any, i: number) => `      <li><a href="chapter${i + 1}.xhtml">الفصل ${ch.chapterNumber}: ${ch.title}</a></li>`)
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
<head><title>الفصل ${ch.chapterNumber}: ${ch.title}</title><link rel="stylesheet" href="style.css"/></head>
<body>
  <h2>الفصل ${ch.chapterNumber}</h2>
  <h1>${ch.title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</h1>
  <hr/>
${paragraphs}
</body>
</html>`, { name: `OEBPS/chapter${i + 1}.xhtml` });
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
      res.status(201).json(reply);
    } catch (error) {
      console.error("Error creating reply:", error);
      res.status(500).json({ error: "Failed to create reply" });
    }
  });

  return httpServer;
}
