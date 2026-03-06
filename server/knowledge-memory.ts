import { db } from "./db";
import { knowledgeEntries } from "@shared/schema";
import { eq, and, or, desc, sql, inArray } from "drizzle-orm";

const MAX_KNOWLEDGE_CHARS = 2000;

export async function getRelevantKnowledge(
  contentType: string,
  category?: string,
  limit: number = 15
) {
  const conditions = [
    eq(knowledgeEntries.validated, true),
    eq(knowledgeEntries.rejected, false),
    or(
      eq(knowledgeEntries.contentType, contentType),
      eq(knowledgeEntries.contentType, "general")
    ),
  ];

  if (category) {
    conditions.push(eq(knowledgeEntries.category, category));
  }

  const entries = await db
    .select()
    .from(knowledgeEntries)
    .where(and(...conditions))
    .orderBy(desc(knowledgeEntries.confidence), desc(knowledgeEntries.usageCount))
    .limit(limit);

  return entries;
}

const CATEGORY_LABELS: Record<string, string> = {
  writing_pattern: "انماط الكتابة المكتسبة",
  correction: "تصحيحات متكررة",
  style_insight: "رؤى اسلوبية",
  domain_expertise: "خبرة تخصصية",
  user_preference: "تفضيلات المستخدمين",
  quality_standard: "معايير الجودة",
  terminology: "مصطلحات متخصصة",
};

export async function buildKnowledgeContext(contentType: string): Promise<string> {
  const entries = await getRelevantKnowledge(contentType);

  if (entries.length === 0) {
    return "";
  }

  const grouped: Record<string, string[]> = {};
  for (const entry of entries) {
    if (!grouped[entry.category]) {
      grouped[entry.category] = [];
    }
    grouped[entry.category].push(entry.knowledge);
  }

  let context = "\n\n═══ الذاكرة المعرفية المكتسبة ═══\n";
  context += "المعارف التالية مستخلصة من تحليل تفاعلات المستخدمين وأنماط الكتابة الناجحة:\n\n";

  let totalChars = context.length;

  for (const [category, items] of Object.entries(grouped)) {
    const label = CATEGORY_LABELS[category] || category;
    const section = `--- ${label} ---\n`;

    if (totalChars + section.length > MAX_KNOWLEDGE_CHARS) break;
    context += section;
    totalChars += section.length;

    for (const item of items) {
      const line = `- ${item}\n`;
      if (totalChars + line.length > MAX_KNOWLEDGE_CHARS) break;
      context += line;
      totalChars += line.length;
    }
    context += "\n";
    totalChars += 1;
  }

  const entryIds = entries.map((e) => e.id);
  if (entryIds.length > 0) {
    incrementUsageCount(entryIds).catch((e) => console.warn("Failed to increment knowledge entry usage count:", e));
  }

  return context;
}

export async function incrementUsageCount(entryIds: number[]): Promise<void> {
  if (entryIds.length === 0) return;

  await db
    .update(knowledgeEntries)
    .set({
      usageCount: sql`${knowledgeEntries.usageCount} + 1`,
    })
    .where(inArray(knowledgeEntries.id, entryIds));
}
