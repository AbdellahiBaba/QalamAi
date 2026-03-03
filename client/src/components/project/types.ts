import type { NovelProject, Character, Chapter, CharacterRelationship } from "@shared/schema";

export interface ProjectData extends NovelProject {
  characters: Character[];
  chapters: Chapter[];
  relationships: CharacterRelationship[];
}

export interface TypeLabels {
  chaptersLabel: string;
  chapterSingular: string;
  outlineLabel: string;
  typeLabel: string;
  writeAll: string;
  writeOne: string;
  createOutline: string;
  outlineCreating: string;
  approveOutline: string;
  noOutline: string;
  mustApprove: string;
  mustApproveDesc: string;
  lockedMsg: string;
  paymentDesc: string;
  allDone: string;
}

export function getTypeLabels(projectType?: string): TypeLabels {
  if (projectType === "essay") {
    return {
      chaptersLabel: "الأقسام",
      chapterSingular: "القسم",
      outlineLabel: "الهيكل",
      typeLabel: "مقال",
      writeAll: "اكتب جميع الأقسام",
      writeOne: "اكتب هذا القسم",
      createOutline: "إنشاء الهيكل",
      outlineCreating: "جاري إنشاء الهيكل...",
      approveOutline: "الموافقة على الهيكل",
      noOutline: "لم يتم إنشاء الهيكل بعد. اضغط على \"إنشاء الهيكل\" للبدء",
      mustApprove: "يجب الموافقة على الهيكل أولاً",
      mustApproveDesc: "قم بإنشاء الهيكل والموافقة عليه من تبويب \"نظرة عامة\" قبل البدء بكتابة الأقسام",
      lockedMsg: "هذا المشروع مقفل. يجب إتمام الدفع قبل أن تتمكن من إنشاء الهيكل وكتابة الأقسام.",
      paymentDesc: "إتمام الدفع للبدء بكتابة المقال",
      allDone: "تم الانتهاء من كتابة جميع الأقسام!",
    };
  }
  if (projectType === "short_story") {
    return {
      chaptersLabel: "المقاطع",
      chapterSingular: "المقطع",
      outlineLabel: "المخطط القصصي",
      typeLabel: "قصة قصيرة",
      writeAll: "اكتب جميع المقاطع",
      writeOne: "اكتب هذا المقطع",
      createOutline: "إنشاء المخطط القصصي",
      outlineCreating: "جاري إنشاء المخطط القصصي...",
      approveOutline: "الموافقة على المخطط القصصي",
      noOutline: "لم يتم إنشاء المخطط القصصي بعد. اضغط على \"إنشاء المخطط القصصي\" للبدء",
      mustApprove: "يجب الموافقة على المخطط القصصي أولاً",
      mustApproveDesc: "قم بإنشاء المخطط القصصي والموافقة عليه من تبويب \"نظرة عامة\" قبل البدء بكتابة المقاطع",
      lockedMsg: "هذا المشروع مقفل. يجب إتمام الدفع قبل أن تتمكن من إنشاء المخطط وكتابة المقاطع.",
      paymentDesc: "إتمام الدفع للبدء بكتابة القصة القصيرة",
      allDone: "تم الانتهاء من كتابة جميع المقاطع!",
    };
  }
  if (projectType === "scenario") {
    return {
      chaptersLabel: "المشاهد",
      chapterSingular: "المشهد",
      outlineLabel: "المخطط الدرامي",
      typeLabel: "سيناريو",
      writeAll: "اكتب جميع المشاهد",
      writeOne: "اكتب هذا المشهد",
      createOutline: "إنشاء المخطط الدرامي",
      outlineCreating: "جاري إنشاء المخطط الدرامي...",
      approveOutline: "الموافقة على المخطط الدرامي",
      noOutline: "لم يتم إنشاء المخطط الدرامي بعد. اضغط على \"إنشاء المخطط الدرامي\" للبدء",
      mustApprove: "يجب الموافقة على المخطط الدرامي أولاً",
      mustApproveDesc: "قم بإنشاء المخطط الدرامي والموافقة عليه من تبويب \"نظرة عامة\" قبل البدء بكتابة المشاهد",
      lockedMsg: "هذا المشروع مقفل. يجب إتمام الدفع قبل أن تتمكن من إنشاء المخطط وكتابة المشاهد.",
      paymentDesc: "إتمام الدفع للبدء بكتابة السيناريو",
      allDone: "تم الانتهاء من كتابة جميع المشاهد!",
    };
  }
  if (projectType === "khawater") {
    return {
      chaptersLabel: "النص",
      chapterSingular: "النص",
      outlineLabel: "—",
      typeLabel: "خاطرة",
      writeAll: "اكتب الخاطرة",
      writeOne: "اكتب الخاطرة",
      createOutline: "",
      outlineCreating: "",
      approveOutline: "",
      noOutline: "",
      mustApprove: "",
      mustApproveDesc: "",
      lockedMsg: "هذا المشروع مقفل. يجب إتمام الدفع قبل أن تتمكن من كتابة الخاطرة.",
      paymentDesc: "إتمام الدفع للبدء بكتابة الخاطرة",
      allDone: "تم الانتهاء من كتابة الخاطرة!",
    };
  }
  if (projectType === "social_media") {
    return {
      chaptersLabel: "المحتوى",
      chapterSingular: "المحتوى",
      outlineLabel: "—",
      typeLabel: "سوشيال ميديا",
      writeAll: "أنشئ المحتوى",
      writeOne: "أنشئ المحتوى",
      createOutline: "",
      outlineCreating: "",
      approveOutline: "",
      noOutline: "",
      mustApprove: "",
      mustApproveDesc: "",
      lockedMsg: "هذا المشروع مقفل. يجب إتمام الدفع قبل أن تتمكن من إنشاء المحتوى.",
      paymentDesc: "إتمام الدفع للبدء بإنشاء المحتوى",
      allDone: "تم الانتهاء من إنشاء المحتوى!",
    };
  }
  if (projectType === "poetry") {
    return {
      chaptersLabel: "القصيدة",
      chapterSingular: "القصيدة",
      outlineLabel: "—",
      typeLabel: "قصيدة",
      writeAll: "انظم القصيدة",
      writeOne: "انظم القصيدة",
      createOutline: "",
      outlineCreating: "",
      approveOutline: "",
      noOutline: "",
      mustApprove: "",
      mustApproveDesc: "",
      lockedMsg: "هذا المشروع مقفل. يجب إتمام الدفع قبل أن تتمكن من نظم القصيدة.",
      paymentDesc: "إتمام الدفع للبدء بنظم القصيدة",
      allDone: "تم الانتهاء من نظم القصيدة!",
    };
  }
  return {
    chaptersLabel: "الفصول",
    chapterSingular: "الفصل",
    outlineLabel: "المخطط التفصيلي",
    typeLabel: "رواية",
    writeAll: "اكتب جميع الفصول",
    writeOne: "اكتب هذا الفصل",
    createOutline: "إنشاء المخطط",
    outlineCreating: "جاري إنشاء المخطط...",
    approveOutline: "الموافقة على المخطط",
    noOutline: "لم يتم إنشاء المخطط بعد. اضغط على \"إنشاء المخطط\" للبدء",
    mustApprove: "يجب الموافقة على المخطط أولاً",
    mustApproveDesc: "قم بإنشاء المخطط والموافقة عليه من تبويب \"نظرة عامة\" قبل البدء بكتابة الفصول",
    lockedMsg: "هذا المشروع مقفل. يجب إتمام الدفع قبل أن تتمكن من إنشاء المخطط وكتابة الفصول.",
    paymentDesc: "إتمام الدفع للبدء بكتابة الرواية",
    allDone: "تم الانتهاء من كتابة جميع الفصول!",
  };
}

export const TECHNIQUE_LABELS: Record<string, string> = {
  linear: "السرد الزمني التقليدي (الخطّي)",
  temporal_break: "الانكسار الزمني (كسر التسلسل)",
  polyphonic: "تعدّد الأصوات (البوليفونية)",
  omniscient_narrator: "الراوي العليم",
  limited: "الراوي المحدود أو الداخلي",
  first_person_narration: "السرد بضمير المتكلم",
  second_person: "السرد بضمير المخاطب",
  documentary: "السرد الوثائقي",
  fragmented: "السرد المتشظّي",
  stream_of_consciousness: "تيار الوعي",
  symbolic: "السرد الرمزي أو الأسطوري",
  circular: "السرد الدائري",
};

export function roleLabel(role: string): string {
  const roles: Record<string, string> = {
    protagonist: "بطل رئيسي",
    love_interest: "الحبيب / الحبيبة",
    antagonist: "شخصية معارضة",
    anti_hero: "بطل مضاد",
    mentor: "المرشد / المعلم",
    sidekick: "الصديق المقرب",
    comic_relief: "شخصية فكاهية",
    secondary: "شخصية ثانوية",
    mysterious: "شخصية غامضة",
    villain: "الشرير",
    wise_elder: "الحكيم / الشيخ",
    child: "طفل",
    narrator: "راوٍ",
    tragic: "شخصية مأساوية",
    rebel: "المتمرد",
    guardian: "الحامي / الوصي",
    trickster: "المحتال / الماكر",
    healer: "المعالج / الطبيب",
    outcast: "المنبوذ / المنعزل",
    diplomat: "الدبلوماسي / الوسيط",
    scholar: "العالم / الباحث",
    warrior: "المحارب / الفارس",
    prophet: "النبي / صاحب الرؤيا",
    servant: "الخادم / التابع",
    merchant: "التاجر",
    artist: "الفنان / الأديب",
    spy: "الجاسوس",
    mother_figure: "الأم",
    father_figure: "الأب",
    orphan: "اليتيم",
    lover_betrayed: "العاشق المخدوع",
    avenger: "المنتقم",
    dreamer: "الحالم",
    survivor: "الناجي",
    tyrant: "الطاغية",
    refugee: "اللاجئ / المهاجر",
    detective: "المحقق",
    rival: "المنافس / الغريم",
    shapeshifter: "المتلوّن",
    scapegoat: "كبش الفداء",
    confessor: "حامل الأسرار",
    wife: "الزوجة",
    husband: "الزوج",
    first_wife: "الزوجة الأولى",
    second_wife: "الزوجة الثانية",
    ex_wife: "الزوجة السابقة",
    ex_husband: "الزوج السابق",
    fiancee: "الخطيبة",
    fiance: "الخطيب",
    sister: "الأخت",
    brother: "الأخ",
    daughter: "الابنة",
    son: "الابن",
    grandmother: "الجدة",
    grandfather: "الجد",
    uncle: "العم / الخال",
    aunt: "العمة / الخالة",
    cousin_male: "ابن العم",
    cousin_female: "بنت العم",
    mother_in_law: "الحماة",
    father_in_law: "الحمو",
    stepmother: "زوجة الأب",
    stepfather: "زوج الأم",
    neighbor: "الجار / الجارة",
    best_friend: "الصديق الحميم",
    secret_lover: "الحبيب السري",
    forbidden_love: "الحب المحرّم",
    widow: "الأرملة",
    widower: "الأرمل",
  };
  return roles[role] || role;
}

export function povLabel(pov: string): string {
  switch (pov) {
    case "first_person": return "ضمير المتكلم";
    case "third_person": return "ضمير الغائب";
    case "omniscient": return "الراوي العليم";
    case "multiple": return "تعدد الأصوات";
    default: return pov;
  }
}
