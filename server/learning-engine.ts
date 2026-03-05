import OpenAI from "openai";
import { db } from "./db";
import { knowledgeEntries, learningSessions, novelProjects, chapters, chapterVersions } from "@shared/schema";
import type { InsertKnowledgeEntry, LearningSession } from "@shared/schema";
import { eq, and, desc, isNotNull, sql, count } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const MAX_ENTRIES_PER_SESSION = 50;

interface RawInsight {
  knowledge: string;
  category: string;
  contentType: string;
  confidence: number;
}

async function collectStyleAnalysisInsights(): Promise<{ source: string; data: string }[]> {
  const results: { source: string; data: string }[] = [];

  const projects = await db
    .select({
      projectType: novelProjects.projectType,
      styleResult: novelProjects.style_analysis_result,
    })
    .from(novelProjects)
    .where(isNotNull(novelProjects.style_analysis_result))
    .limit(100);

  const grouped: Record<string, string[]> = {};
  for (const p of projects) {
    if (!p.styleResult) continue;
    const type = p.projectType || "general";
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(p.styleResult.substring(0, 500));
  }

  for (const [type, analyses] of Object.entries(grouped)) {
    if (analyses.length < 2) continue;
    results.push({
      source: "style_analysis",
      data: `نوع المحتوى: ${type}\nعدد التحليلات: ${analyses.length}\nملخص التحليلات:\n${analyses.slice(0, 10).join("\n---\n")}`,
    });
  }

  return results;
}

async function collectRewritePatterns(): Promise<{ source: string; data: string }[]> {
  const results: { source: string; data: string }[] = [];

  const rewrites = await db
    .select({
      chapterId: chapterVersions.chapterId,
      content: chapterVersions.content,
      source: chapterVersions.source,
    })
    .from(chapterVersions)
    .where(isNotNull(chapterVersions.source))
    .orderBy(desc(chapterVersions.savedAt))
    .limit(50);

  const byChapter: Record<number, { ai: string | null; user: string | null }> = {};
  for (const r of rewrites) {
    if (!byChapter[r.chapterId]) byChapter[r.chapterId] = { ai: null, user: null };
    if (r.source === "ai_generated" && !byChapter[r.chapterId].ai) {
      byChapter[r.chapterId].ai = r.content?.substring(0, 400) || null;
    } else if (r.source !== "ai_generated" && !byChapter[r.chapterId].user) {
      byChapter[r.chapterId].user = r.content?.substring(0, 400) || null;
    }
  }

  const pairs: string[] = [];
  for (const [, versions] of Object.entries(byChapter)) {
    if (versions.ai && versions.user) {
      pairs.push(`نص الذكاء الاصطناعي:\n${versions.ai}\n\nنص المستخدم بعد التعديل:\n${versions.user}`);
    }
  }

  if (pairs.length > 0) {
    results.push({
      source: "rewrite",
      data: `عدد حالات المقارنة: ${pairs.length}\n\n${pairs.slice(0, 5).join("\n═══\n")}`,
    });
  }

  return results;
}

async function collectSuccessfulPatterns(): Promise<{ source: string; data: string }[]> {
  const results: { source: string; data: string }[] = [];

  const published = await db
    .select({
      projectType: novelProjects.projectType,
      title: novelProjects.title,
      genre: novelProjects.genre,
      narrativeTechnique: novelProjects.narrativeTechnique,
      writingStyle: novelProjects.writingStyle,
    })
    .from(novelProjects)
    .where(eq(novelProjects.showInGallery, true))
    .limit(50);

  if (published.length > 0) {
    const summary = published
      .map((p) => `${p.title} (${p.projectType}): نوع=${p.genre || "غير محدد"}, تقنية=${p.narrativeTechnique || "غير محدد"}, اسلوب=${p.writingStyle || "غير محدد"}`)
      .join("\n");

    results.push({
      source: "successful_projects",
      data: `المشاريع المنشورة (${published.length}):\n${summary}`,
    });
  }

  return results;
}

async function collectTerminology(): Promise<{ source: string; data: string }[]> {
  const results: { source: string; data: string }[] = [];

  const memoires = await db
    .select({
      title: novelProjects.title,
      field: novelProjects.memoireField,
      country: novelProjects.memoireCountry,
    })
    .from(novelProjects)
    .where(and(eq(novelProjects.projectType, "memoire"), isNotNull(novelProjects.memoireField)))
    .limit(30);

  if (memoires.length > 0) {
    const fieldGroups: Record<string, string[]> = {};
    for (const m of memoires) {
      const field = m.field || "عام";
      if (!fieldGroups[field]) fieldGroups[field] = [];
      fieldGroups[field].push(`${m.title} (${m.country || "غير محدد"})`);
    }

    const summary = Object.entries(fieldGroups)
      .map(([field, titles]) => `التخصص: ${field}\n  المذكرات: ${titles.join("، ")}`)
      .join("\n");

    results.push({
      source: "terminology",
      data: `التخصصات الأكاديمية المستخدمة:\n${summary}`,
    });
  }

  return results;
}

async function synthesizeKnowledge(
  rawData: { source: string; data: string }[],
): Promise<RawInsight[]> {
  if (rawData.length === 0) return [];

  const combinedData = rawData
    .map((d) => `[المصدر: ${d.source}]\n${d.data}`)
    .join("\n\n════════════════\n\n");

  const systemPrompt = `أنت محلل ذكاء اصطناعي متخصص في استخلاص المعارف من بيانات التفاعلات الأدبية.

مهمتك: تحليل البيانات التالية واستخلاص معارف قابلة للتطبيق يمكن استخدامها لتحسين جودة الكتابة.

لكل معرفة مستخلصة، أعط:
- knowledge: النص العربي للمعرفة (جملة واحدة أو جملتان واضحتان)
- category: واحدة من: writing_pattern, correction, style_insight, domain_expertise, user_preference, quality_standard, terminology
- contentType: واحد من: novel, essay, scenario, short_story, khawater, social_media, poetry, memoire, general
- confidence: رقم بين 0.0 و 1.0 يعكس مدى موثوقية هذه المعرفة

قواعد الاستخلاص:
1. استخلص فقط المعارف القابلة للتطبيق المباشر
2. تجنب المعلومات العامة أو البديهية
3. ركز على الأنماط المتكررة لا الحالات الفردية
4. ارفض أي محتوى ضار أو مسيء أو غير أخلاقي
5. تأكد من دقة اللغة العربية
6. لا تستخلص أكثر من ${MAX_ENTRIES_PER_SESSION} معرفة

أجب بصيغة JSON array فقط، بدون أي نص إضافي:
[{"knowledge": "...", "category": "...", "contentType": "...", "confidence": 0.X}, ...]`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: combinedData.substring(0, 12000) },
      ],
      max_completion_tokens: 4000,
      temperature: 0.3,
    });

    const text = response.choices[0]?.message?.content?.trim() || "[]";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]) as RawInsight[];

    return parsed
      .filter(
        (item) =>
          item.knowledge &&
          item.category &&
          item.contentType &&
          typeof item.confidence === "number" &&
          item.confidence >= 0.4
      )
      .slice(0, MAX_ENTRIES_PER_SESSION);
  } catch (error) {
    console.error("[LearningEngine] Synthesis error:", error);
    return [];
  }
}

async function validateKnowledgeEntry(
  entry: RawInsight
): Promise<{ valid: boolean; confidence: number }> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        {
          role: "system",
          content: `أنت مدقق جودة المعارف. قيّم المعرفة التالية من حيث:
1. الدقة اللغوية والمعنوية
2. القابلية للتطبيق العملي
3. عدم التعارض مع قواعد اللغة العربية والأدب
4. خلوها من أي محتوى ضار أو مسيء
5. الفائدة الفعلية لتحسين الكتابة

أجب بـ JSON فقط: {"valid": true/false, "confidence": 0.X, "reason": "..."}`,
        },
        {
          role: "user",
          content: `المعرفة: ${entry.knowledge}\nالتصنيف: ${entry.category}\nنوع المحتوى: ${entry.contentType}\nالثقة الأولية: ${entry.confidence}`,
        },
      ],
      max_completion_tokens: 200,
      temperature: 0.1,
    });

    const text = response.choices[0]?.message?.content?.trim() || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { valid: false, confidence: 0 };

    const result = JSON.parse(jsonMatch[0]);
    return {
      valid: result.valid === true && (result.confidence || 0) >= 0.6,
      confidence: result.confidence || 0,
    };
  } catch {
    return { valid: false, confidence: 0 };
  }
}

export async function runLearningSession(triggeredBy: string): Promise<LearningSession> {
  const running = await db
    .select()
    .from(learningSessions)
    .where(eq(learningSessions.status, "running"))
    .limit(1);

  if (running.length > 0) {
    throw new Error("جلسة تعلم أخرى قيد التشغيل بالفعل");
  }

  const [session] = await db
    .insert(learningSessions)
    .values({
      triggeredBy,
      status: "running",
      dataSourcesProcessed: 0,
      entriesGenerated: 0,
      entriesValidated: 0,
      entriesRejected: 0,
    })
    .returning();

  try {
    console.log(`[LearningEngine] Starting learning session #${session.id} (${triggeredBy})`);

    const allData: { source: string; data: string }[] = [];

    const [styleInsights, rewritePatterns, successPatterns, terminology] = await Promise.all([
      collectStyleAnalysisInsights(),
      collectRewritePatterns(),
      collectSuccessfulPatterns(),
      collectTerminology(),
    ]);

    allData.push(...styleInsights, ...rewritePatterns, ...successPatterns, ...terminology);

    let dataSourcesProcessed = 0;
    if (styleInsights.length > 0) dataSourcesProcessed++;
    if (rewritePatterns.length > 0) dataSourcesProcessed++;
    if (successPatterns.length > 0) dataSourcesProcessed++;
    if (terminology.length > 0) dataSourcesProcessed++;

    await db
      .update(learningSessions)
      .set({ dataSourcesProcessed })
      .where(eq(learningSessions.id, session.id));

    if (allData.length === 0) {
      const [completed] = await db
        .update(learningSessions)
        .set({
          status: "completed",
          summary: "لا توجد بيانات كافية للتعلم منها بعد. يحتاج النظام إلى المزيد من تفاعلات المستخدمين.",
          completedAt: new Date(),
        })
        .where(eq(learningSessions.id, session.id))
        .returning();
      return completed;
    }

    const rawInsights = await synthesizeKnowledge(allData);
    let entriesGenerated = rawInsights.length;
    let entriesValidated = 0;
    let entriesRejected = 0;

    for (const insight of rawInsights) {
      const validation = await validateKnowledgeEntry(insight);

      const entryData: InsertKnowledgeEntry = {
        category: insight.category,
        contentType: insight.contentType,
        knowledge: insight.knowledge,
        source: triggeredBy === "admin_manual" ? "admin_manual" : "auto_learning",
        confidence: validation.confidence || insight.confidence,
        validated: validation.valid,
        rejected: !validation.valid && validation.confidence < 0.4,
      };

      await db.insert(knowledgeEntries).values(entryData);

      if (validation.valid) {
        entriesValidated++;
      } else {
        entriesRejected++;
      }
    }

    const summaryPrompt = `لخّص نتائج جلسة التعلم:
- مصادر البيانات المعالجة: ${dataSourcesProcessed}
- المعارف المستخلصة: ${entriesGenerated}
- المعارف المعتمدة: ${entriesValidated}
- المعارف المرفوضة: ${entriesRejected}
- أنواع المعارف: ${[...new Set(rawInsights.map((i) => i.category))].join("، ")}
- أنواع المحتوى: ${[...new Set(rawInsights.map((i) => i.contentType))].join("، ")}

اكتب ملخصاً عربياً موجزاً (3-4 جمل) يصف ما تعلمه النظام.`;

    let summary = `تمت معالجة ${dataSourcesProcessed} مصادر بيانات، واستخلاص ${entriesGenerated} معرفة جديدة، اعتُمد منها ${entriesValidated} ورُفض ${entriesRejected}.`;

    try {
      const summaryRes = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: "أنت مساعد يلخص نتائج التعلم الآلي بالعربية. أجب بفقرة واحدة موجزة فقط." },
          { role: "user", content: summaryPrompt },
        ],
        max_completion_tokens: 300,
        temperature: 0.3,
      });
      summary = summaryRes.choices[0]?.message?.content?.trim() || summary;
    } catch {}

    const [completed] = await db
      .update(learningSessions)
      .set({
        status: "completed",
        entriesGenerated,
        entriesValidated,
        entriesRejected,
        summary,
        completedAt: new Date(),
      })
      .where(eq(learningSessions.id, session.id))
      .returning();

    console.log(`[LearningEngine] Session #${session.id} completed: ${entriesValidated} validated, ${entriesRejected} rejected`);
    return completed;
  } catch (error: any) {
    console.error(`[LearningEngine] Session #${session.id} failed:`, error);

    const [failed] = await db
      .update(learningSessions)
      .set({
        status: "failed",
        summary: `فشلت الجلسة: ${error.message}`,
        completedAt: new Date(),
      })
      .where(eq(learningSessions.id, session.id))
      .returning();

    return failed;
  }
}
