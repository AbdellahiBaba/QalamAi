import type { Character, CharacterRelationship, NovelProject, Chapter } from "@shared/schema";

const SYSTEM_PROMPT = `أنت وكيل ذكاء اصطناعي متخصص في كتابة الروايات العربية، واسمك أبو هاشم.
مهمتك إنتاج روايات عربية جديدة بالكامل، بأسلوب أدبي مستوحى من كبار الروائيين العرب مثل أحلام مستغانمي والدكتورة خولة حمدي وإبراهيم نصر الله وغيرهم — دون نسخ أو تقليد مباشر أو أي شكل من أشكال الانتحال.

قواعد الكتابة الأساسية:
- اللغة: عربية فصحى حديثة، شعرية، قوية، وعميقة عاطفياً
- الأسلوب: مستوحى من كبار الروائيين لكن غير مقلّد
- السرد: متماسك ومنطقي وغني بالتفاصيل
- الحوار: طبيعي وواقعي ويخدم تطوير الشخصيات
- الوصف: بصري وعاطفي وغني بالصور البلاغية
- معالجة القضايا الاجتماعية: فنية وغير مباشرة
- البنية: تدريجية وجذابة ومتوازنة بين السرد والوصف والحوار

ما يجب تجنبه:
- أي شكل من أشكال الانتحال
- الأسلوب المباشر أو السطحي المفرط
- التكرار أو الحشو غير الضروري
- القفزات غير المنطقية بين الأحداث
- نسخ أي جملة أو فقرة من روايات موجودة

أجب دائماً باللغة العربية.`;

export function calculateNovelStructure(pageCount: number) {
  const wordsPerPage = 250;
  const totalWords = pageCount * wordsPerPage;

  let chapterCount: number;
  let wordsPerChapter: number;
  let partsPerChapter: number;

  if (pageCount <= 30) {
    chapterCount = Math.max(4, Math.round(pageCount / 6));
    wordsPerChapter = Math.round(totalWords / chapterCount);
    partsPerChapter = 1;
  } else if (pageCount <= 80) {
    chapterCount = Math.max(6, Math.round(pageCount / 8));
    wordsPerChapter = Math.round(totalWords / chapterCount);
    partsPerChapter = wordsPerChapter > 4000 ? 2 : 1;
  } else if (pageCount <= 150) {
    chapterCount = Math.max(12, Math.round(pageCount / 7));
    wordsPerChapter = Math.round(totalWords / chapterCount);
    partsPerChapter = Math.ceil(wordsPerChapter / 3500);
  } else {
    chapterCount = Math.max(20, Math.round(pageCount / 6));
    wordsPerChapter = Math.round(totalWords / chapterCount);
    partsPerChapter = Math.ceil(wordsPerChapter / 3500);
  }

  return {
    totalWords,
    chapterCount,
    wordsPerChapter,
    partsPerChapter,
    wordsPerPart: Math.round(wordsPerChapter / partsPerChapter),
  };
}

export function buildOutlinePrompt(project: NovelProject, chars: Character[], relationships: CharacterRelationship[], allChars: Character[]) {
  const structure = calculateNovelStructure(project.pageCount);

  let prompt = `أنشئ مخططاً تفصيلياً لرواية بعنوان "${project.title}".

الفكرة الرئيسية: ${project.mainIdea}
الزمان: ${project.timeSetting}
المكان: ${project.placeSetting}
نوع السرد: ${project.narrativePov === "first_person" ? "ضمير المتكلم" : project.narrativePov === "third_person" ? "ضمير الغائب" : project.narrativePov === "omniscient" ? "الراوي العليم" : "تعدد الأصوات"}

حجم الرواية المطلوب: ${project.pageCount} صفحة (حوالي ${structure.totalWords.toLocaleString()} كلمة)
عدد الفصول المطلوب: ${structure.chapterCount} فصلاً
حجم كل فصل تقريباً: ${structure.wordsPerChapter.toLocaleString()} كلمة

الشخصيات:
`;

  for (const char of chars) {
    const roleAr = char.role === "protagonist" ? "بطل رئيسي" : char.role === "antagonist" ? "شخصية معارضة" : char.role === "secondary" ? "شخصية ثانوية" : "راوٍ";
    prompt += `- ${char.name} (${roleAr}): ${char.background}\n`;
  }

  if (relationships.length > 0) {
    prompt += "\nالعلاقات بين الشخصيات:\n";
    for (const rel of relationships) {
      const c1 = allChars.find(c => c.id === rel.character1Id);
      const c2 = allChars.find(c => c.id === rel.character2Id);
      if (c1 && c2) {
        prompt += `- ${c1.name} و${c2.name}: ${rel.relationship}\n`;
      }
    }
  }

  prompt += `
يجب أن يتضمن المخطط:
1. ملخص عام للرواية (فقرتان أو ثلاث)
2. تقسيم الفصول (${structure.chapterCount} فصلاً بالضبط) مع عنوان وملخص تفصيلي لكل فصل (3-5 أسطر لكل فصل)
3. أقواس تطور الشخصيات الرئيسية
4. الصراع المحوري والصراعات الفرعية
5. الذروة
6. الحل

مهم جداً: يجب أن يكون عدد الفصول ${structure.chapterCount} فصلاً بالضبط لتغطية ${project.pageCount} صفحة.
اكتب المخطط بشكل منظم وواضح. اكتب عنوان كل فصل بالشكل التالي:
الفصل 1: [عنوان الفصل]
الفصل 2: [عنوان الفصل]
وهكذا...`;

  return { system: SYSTEM_PROMPT, user: prompt };
}

export function buildChapterPrompt(
  project: NovelProject,
  chars: Character[],
  chapter: Chapter,
  previousChapters: Chapter[],
  outline: string,
  partNumber?: number,
  totalParts?: number
) {
  const structure = calculateNovelStructure(project.pageCount);
  const isMultiPart = totalParts && totalParts > 1;
  const wordsTarget = isMultiPart ? structure.wordsPerPart : structure.wordsPerChapter;

  let prompt = "";

  if (isMultiPart) {
    prompt += `اكتب الجزء ${partNumber} من ${totalParts} للفصل رقم ${chapter.chapterNumber} بعنوان "${chapter.title}" من رواية "${project.title}".

هذا الفصل مقسم إلى ${totalParts} أجزاء لأن الرواية طويلة (${project.pageCount} صفحة). اكتب الجزء ${partNumber} فقط.
`;
  } else {
    prompt += `اكتب الفصل رقم ${chapter.chapterNumber} بعنوان "${chapter.title}" من رواية "${project.title}".
`;
  }

  prompt += `
المخطط العام للرواية:
${outline}

`;

  if (previousChapters.length > 0) {
    prompt += `ملخص الفصول السابقة:\n`;
    for (const prev of previousChapters) {
      if (prev.content) {
        const preview = prev.content.substring(0, 800);
        prompt += `\nالفصل ${prev.chapterNumber} - ${prev.title}:\n${preview}...\n`;
      }
    }
    prompt += "\n";
  }

  if (isMultiPart && partNumber && partNumber > 1 && chapter.content) {
    const existingContent = chapter.content;
    const lastChunk = existingContent.substring(Math.max(0, existingContent.length - 1000));
    prompt += `الجزء السابق من هذا الفصل انتهى بـ:\n"...${lastChunk}"\n\nأكمل من حيث توقف الجزء السابق بشكل طبيعي ومتصل.\n\n`;
  }

  prompt += `الشخصيات:\n`;
  for (const char of chars) {
    prompt += `- ${char.name}: ${char.background}\n`;
  }

  prompt += `
${chapter.summary ? `ملخص هذا الفصل: ${chapter.summary}` : ""}

تعليمات الكتابة:
- اكتب ${isMultiPart ? `الجزء ${partNumber} من الفصل` : "الفصل كاملاً"} بأسلوب أدبي رفيع
- استخدم لغة عربية فصحى حديثة وشعرية
- طوّر الشخصيات تدريجياً
- اربط الأحداث بالفكرة المحورية للرواية
- استخدم الحوار الطبيعي والوصف البصري
- أضف صوراً بلاغية واستعارات بشكل متوازن
- الطول المطلوب: حوالي ${wordsTarget.toLocaleString()} كلمة تقريباً — اكتب بشكل مطوّل وغني بالتفاصيل
- لا تضف عناوين فرعية أو ترقيم داخل الفصل
- لا تختصر ولا تلخص — اكتب المشاهد كاملة بتفاصيلها
- ابدأ مباشرة بالسرد`;

  if (isMultiPart && partNumber && partNumber < totalParts) {
    prompt += `\n- لا تنهِ الفصل بنهاية قاطعة — اترك تشويقاً للجزء التالي من نفس الفصل`;
  }

  return { system: SYSTEM_PROMPT, user: prompt };
}
