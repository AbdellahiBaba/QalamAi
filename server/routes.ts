import type { Express } from "express";
import { createServer, type Server } from "http";
import { eq } from "drizzle-orm";
import { storage } from "./storage";
import { db } from "./db";
import { characterRelationships } from "@shared/schema";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { buildOutlinePrompt, buildChapterPrompt, calculateNovelStructure } from "./abu-hashim";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

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

  app.post("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title, mainIdea, timeSetting, placeSetting, narrativePov, pageCount, characters: chars, relationships } = req.body;

      const project = await storage.createProject({
        userId,
        title,
        mainIdea,
        timeSetting,
        placeSetting,
        narrativePov,
        pageCount: Math.min(200, Math.max(10, pageCount || 50)),
      });

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

      const chars = await storage.getCharactersByProject(id);
      const rels = await db.select().from(characterRelationships).where(eq(characterRelationships.projectId, id));

      const { system, user } = buildOutlinePrompt(project, chars, rels, chars);

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_completion_tokens: 8192,
      });

      const outline = response.choices[0]?.message?.content || "";

      const updated = await storage.updateProject(id, { outline, status: "outline" });

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

      const chapter = await storage.getChapter(chapterId);
      if (!chapter) return res.status(404).json({ error: "Chapter not found" });

      const chars = await storage.getCharactersByProject(projectId);
      const allChapters = await storage.getChaptersByProject(projectId);
      const previousChapters = allChapters.filter(c => c.chapterNumber < chapter.chapterNumber);

      const structure = calculateNovelStructure(project.pageCount);
      const totalParts = structure.partsPerChapter;

      await storage.updateChapter(chapterId, { status: "generating" });

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

        const { system, user } = buildChapterPrompt(
          project, chars, updatedChapter!, previousChapters, project.outline || "",
          part, totalParts
        );

        const stream = await openai.chat.completions.create({
          model: "gpt-5.2",
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
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

      const completedCount = allChapters.filter(c => c.status === "completed" || c.id === chapterId).length;
      if (completedCount === allChapters.length) {
        await storage.updateProject(projectId, { status: "completed" });
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

  return httpServer;
}
