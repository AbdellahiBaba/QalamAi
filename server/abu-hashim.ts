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

export function buildOutlinePrompt(project: NovelProject, chars: Character[], relationships: CharacterRelationship[], allChars: Character[]) {
  let prompt = `أنشئ مخططاً تفصيلياً لرواية بعنوان "${project.title}".

الفكرة الرئيسية: ${project.mainIdea}
الزمان: ${project.timeSetting}
المكان: ${project.placeSetting}
نوع السرد: ${project.narrativePov === "first_person" ? "ضمير المتكلم" : project.narrativePov === "third_person" ? "ضمير الغائب" : project.narrativePov === "omniscient" ? "الراوي العليم" : "تعدد الأصوات"}

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
1. ملخص عام للرواية (فقرتان)
2. تقسيم الفصول (8-12 فصلاً) مع عنوان وملخص مختصر لكل فصل
3. أقواس تطور الشخصيات الرئيسية
4. الصراع المحوري
5. الذروة
6. الحل

اكتب المخطط بشكل منظم وواضح.`;

  return { system: SYSTEM_PROMPT, user: prompt };
}

export function buildChapterPrompt(
  project: NovelProject,
  chars: Character[],
  chapter: Chapter,
  previousChapters: Chapter[],
  outline: string
) {
  let prompt = `اكتب الفصل رقم ${chapter.chapterNumber} بعنوان "${chapter.title}" من رواية "${project.title}".

المخطط العام للرواية:
${outline}

`;

  if (previousChapters.length > 0) {
    prompt += `الفصول السابقة المكتوبة:\n`;
    for (const prev of previousChapters) {
      if (prev.content) {
        const preview = prev.content.substring(0, 500);
        prompt += `\nالفصل ${prev.chapterNumber} - ${prev.title}:\n${preview}...\n`;
      }
    }
  }

  prompt += `
الشخصيات:
`;
  for (const char of chars) {
    prompt += `- ${char.name}: ${char.background}\n`;
  }

  prompt += `
${chapter.summary ? `ملخص هذا الفصل: ${chapter.summary}` : ""}

تعليمات الكتابة:
- اكتب الفصل كاملاً بأسلوب أدبي رفيع
- استخدم لغة عربية فصحى حديثة وشعرية
- طوّر الشخصيات تدريجياً
- اربط الأحداث بالفكرة المحورية للرواية
- استخدم الحوار الطبيعي والوصف البصري
- أضف صوراً بلاغية واستعارات بشكل متوازن
- اجعل الفصل بطول 2000-3000 كلمة تقريباً
- لا تضف عناوين فرعية أو ترقيم داخل الفصل
- ابدأ مباشرة بالسرد`;

  return { system: SYSTEM_PROMPT, user: prompt };
}
