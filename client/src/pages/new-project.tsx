import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ArrowRight, Plus, Trash2, Feather, Users, MapPin, BookOpen, Loader2, Sparkles, X, ChevronDown, ChevronUp, LayoutTemplate, Search, Heart, Crosshair, Landmark, Wand2, FileText, PenLine, Crown, Film } from "lucide-react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/theme-toggle";

const PAGE_OPTIONS = [
  { value: 150, label: "١٥٠ صفحة — ٩٩.٩٩ دولار" },
  { value: 200, label: "٢٠٠ صفحة — ١٢٩.٩٩ دولار" },
  { value: 250, label: "٢٥٠ صفحة — ١٤٩.٩٩ دولار" },
  { value: 300, label: "٣٠٠ صفحة — ١٩٩.٩٩ دولار" },
];

const NARRATIVE_TECHNIQUE_OPTIONS = [
  { value: "linear", label: "السرد الزمني التقليدي (الخطّي)" },
  { value: "temporal_break", label: "الانكسار الزمني (كسر التسلسل)" },
  { value: "polyphonic", label: "تعدّد الأصوات (البوليفونية)" },
  { value: "omniscient_narrator", label: "الراوي العليم" },
  { value: "limited", label: "الراوي المحدود أو الداخلي" },
  { value: "first_person_narration", label: "السرد بضمير المتكلم" },
  { value: "second_person", label: "السرد بضمير المخاطب" },
  { value: "documentary", label: "السرد الوثائقي" },
  { value: "fragmented", label: "السرد المتشظّي" },
  { value: "stream_of_consciousness", label: "تيار الوعي" },
  { value: "symbolic", label: "السرد الرمزي أو الأسطوري" },
  { value: "circular", label: "السرد الدائري" },
];

const POETRY_METERS = [
  { id: "taweel", name: "الطويل", description: "أكثر البحور شيوعاً — فعولن مفاعيلن فعولن مفاعيلن" },
  { id: "kamel", name: "الكامل", description: "غني بالإيقاع — متفاعلن متفاعلن متفاعلن" },
  { id: "baseet", name: "البسيط", description: "ثاني أكثرها استعمالاً — مستفعلن فاعلن مستفعلن فاعلن" },
  { id: "wafer", name: "الوافر", description: "بحر حيوي — مفاعلتن مفاعلتن مفاعلتن" },
  { id: "rajaz", name: "الرجز", description: "مرن وكثير الاستعمال — مستفعلن مستفعلن مستفعلن" },
  { id: "ramal", name: "الرمل", description: "غنائي رقيق — فاعلاتن فاعلاتن فاعلاتن" },
  { id: "hazaj", name: "الهزج", description: "مجزوء غالباً — مفاعيلن مفاعيلن" },
  { id: "saree", name: "السريع", description: "مستفعلن مستفعلن فاعلن" },
  { id: "munsarih", name: "المنسرح", description: "مستفعلن مفعولاتُ مستفعلن" },
  { id: "khafeef", name: "الخفيف", description: "رشيق ومرن — فاعلاتن مستفعِلن فاعلاتن" },
  { id: "mudarei", name: "المضارع", description: "مجزوء قليل الاستعمال — مفاعيلن فاعلاتن" },
  { id: "muqtadab", name: "المقتضب", description: "مجزوء — مفعولاتُ مستفعلن" },
  { id: "mujtath", name: "المجتث", description: "مجزوء — مستفعِلن فاعلاتن" },
  { id: "mutaqareb", name: "المتقارب", description: "سيّال وموسيقي — فعولن فعولن فعولن فعولن" },
  { id: "mutadarek", name: "المتدارك", description: "بحر الخبب — فاعلن فاعلن فاعلن فاعلن" },
];

const POETRY_RHYME_LETTERS = [
  "ا", "ب", "ت", "ث", "ج", "ح", "خ", "د", "ذ", "ر", "ز", "س", "ش",
  "ص", "ض", "ط", "ظ", "ع", "غ", "ف", "ق", "ك", "ل", "م", "ن", "ه", "و", "ي",
];

const POETRY_ERA_OPTIONS = [
  { id: "jahili", name: "جاهلي", description: "عصر المعلقات والفحولة الشعرية" },
  { id: "umawi", name: "أموي", description: "الشعر السياسي والنقائض والغزل العذري" },
  { id: "abbasi", name: "عباسي", description: "عصر التجديد والبديع والفلسفة" },
  { id: "andalusi", name: "أندلسي", description: "الموشحات ووصف الطبيعة والحنين" },
  { id: "hadith", name: "حديث", description: "من عصر النهضة إلى المعاصر" },
];

const POETRY_TONE_OPTIONS = [
  { id: "romantic", name: "رومانسي" },
  { id: "epic", name: "ملحمي" },
  { id: "mystical", name: "صوفي" },
  { id: "melancholic", name: "حزين" },
  { id: "triumphant", name: "انتصاري" },
  { id: "contemplative", name: "تأملي" },
  { id: "passionate", name: "متوهج" },
  { id: "satirical", name: "ساخر" },
  { id: "nostalgic", name: "حنيني" },
  { id: "solemn", name: "مهيب" },
];

const POETRY_THEME_OPTIONS = [
  { id: "ghazal", name: "غزل" },
  { id: "fakhr", name: "فخر" },
  { id: "madh", name: "مدح" },
  { id: "hija", name: "هجاء" },
  { id: "ritha", name: "رثاء" },
  { id: "hikma", name: "حكمة" },
  { id: "wasf", name: "وصف" },
  { id: "hamasa", name: "حماسة" },
  { id: "zuhd", name: "زهد" },
  { id: "itab", name: "عتاب" },
  { id: "hanin", name: "حنين" },
  { id: "watani", name: "وطني" },
  { id: "ijtimaii", name: "اجتماعي" },
  { id: "falsafi", name: "فلسفي" },
];

const POETRY_VERSE_OPTIONS = [
  { value: 6, label: "٦ أبيات — قصيدة قصيرة" },
  { value: 10, label: "١٠ أبيات — قصيدة متوسطة" },
  { value: 14, label: "١٤ أبيات — قصيدة طويلة" },
  { value: 20, label: "٢٠ بيتاً — قصيدة مطوّلة" },
];

interface ProjectTemplate {
  id: string;
  label: string;
  icon: typeof Search;
  description: string;
  prefill: {
    title: string;
    mainIdea: string;
    timeSetting: string;
    placeSetting: string;
    narrativePov: string;
    narrativeTechnique: string;
    characters: Array<{
      name: string;
      background: string;
      role: string;
      motivation: string;
      speechStyle: string;
      physicalDescription: string;
      psychologicalTraits: string;
      age: string;
    }>;
  };
}

const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "blank",
    label: "مشروع فارغ",
    icon: FileText,
    description: "ابدأ من الصفر بدون قالب محدد",
    prefill: {
      title: "",
      mainIdea: "",
      timeSetting: "",
      placeSetting: "",
      narrativePov: "",
      narrativeTechnique: "",
      characters: [{ name: "", background: "", role: "protagonist", motivation: "", speechStyle: "", physicalDescription: "", psychologicalTraits: "", age: "" }],
    },
  },
  {
    id: "mystery",
    label: "رواية غموض وتحقيق",
    icon: Search,
    description: "جريمة غامضة، محقق ذكي، وألغاز تنكشف تدريجياً",
    prefill: {
      title: "",
      mainIdea: "جريمة غامضة تقع في ظروف مريبة، ومحقق يسعى لكشف الحقيقة وسط شبكة من الأكاذيب والأسرار المدفونة",
      timeSetting: "العصر الحديث",
      placeSetting: "مدينة عربية كبرى",
      narrativePov: "first_person",
      narrativeTechnique: "fragmented",
      characters: [
        { name: "", background: "محقق ذكي وملاحظ، يعاني من ماضٍ شخصي مؤلم يدفعه للبحث عن العدالة", role: "detective", motivation: "كشف الحقيقة وتحقيق العدالة", speechStyle: "تحليلي ودقيق", physicalDescription: "", psychologicalTraits: "ذكاء حاد، انتباه للتفاصيل، عزلة اجتماعية", age: "" },
        { name: "", background: "شخصية غامضة تبدو بريئة لكنها تخفي أسراراً خطيرة", role: "mysterious", motivation: "إخفاء الحقيقة بأي ثمن", speechStyle: "مراوغ وهادئ", physicalDescription: "", psychologicalTraits: "ازدواجية، قدرة على التمثيل، خوف دفين", age: "" },
        { name: "", background: "ضحية الجريمة أو شاهد رئيسي يملك مفتاح اللغز", role: "secondary", motivation: "", speechStyle: "", physicalDescription: "", psychologicalTraits: "", age: "" },
      ],
    },
  },
  {
    id: "romance",
    label: "رواية رومانسية",
    icon: Heart,
    description: "قصة حب عميقة تتحدى العقبات الاجتماعية والنفسية",
    prefill: {
      title: "",
      mainIdea: "قصة حب تتخطى الحدود الاجتماعية والثقافية، حيث يواجه العاشقان عقبات العائلة والتقاليد في سبيل مشاعرهما",
      timeSetting: "العصر الحديث",
      placeSetting: "مدينة عربية",
      narrativePov: "third_person",
      narrativeTechnique: "polyphonic",
      characters: [
        { name: "", background: "شاب/فتاة من بيئة اجتماعية معينة، يحمل أحلاماً كبيرة ويبحث عن الحب الحقيقي", role: "protagonist", motivation: "الحب والحرية في الاختيار", speechStyle: "عاطفي وصادق", physicalDescription: "", psychologicalTraits: "حساسية عالية، شجاعة، رومانسية", age: "" },
        { name: "", background: "الحبيب/الحبيبة من بيئة مختلفة، يجمعهما القدر رغم اختلاف عالميهما", role: "love_interest", motivation: "إيجاد شريك الروح", speechStyle: "رقيق وذكي", physicalDescription: "", psychologicalTraits: "وفاء، عناد، حنان", age: "" },
        { name: "", background: "فرد من العائلة يعارض العلاقة بشدة ويمثل صوت التقاليد", role: "antagonist", motivation: "الحفاظ على شرف العائلة وتقاليدها", speechStyle: "حازم وسلطوي", physicalDescription: "", psychologicalTraits: "تمسك بالعادات، حب السيطرة", age: "" },
      ],
    },
  },
  {
    id: "thriller",
    label: "رواية تشويق وإثارة",
    icon: Crosshair,
    description: "أحداث متسارعة، خطر محدق، وبطل في سباق مع الزمن",
    prefill: {
      title: "",
      mainIdea: "مؤامرة خطيرة تهدد حياة البطل ومن حوله، وعليه أن يكشفها قبل فوات الأوان في سباق محموم مع الزمن",
      timeSetting: "العصر الحديث",
      placeSetting: "عدة مدن عربية",
      narrativePov: "third_person",
      narrativeTechnique: "temporal_break",
      characters: [
        { name: "", background: "شخص عادي يجد نفسه في قلب أحداث خطيرة لم يكن مستعداً لها", role: "protagonist", motivation: "النجاة وحماية أحبائه", speechStyle: "متوتر ومباشر", physicalDescription: "", psychologicalTraits: "شجاعة تحت الضغط، ذكاء سريع، إصرار", age: "" },
        { name: "", background: "عقل مدبر يعمل من الظل ويحرك خيوط المؤامرة بدقة", role: "villain", motivation: "السلطة والسيطرة", speechStyle: "بارد ومحسوب", physicalDescription: "", psychologicalTraits: "دهاء، قسوة، نرجسية", age: "" },
        { name: "", background: "حليف غير متوقع يساعد البطل في لحظة حرجة", role: "sidekick", motivation: "تصحيح خطأ من الماضي", speechStyle: "عملي ومختصر", physicalDescription: "", psychologicalTraits: "ولاء، غموض، خبرة", age: "" },
      ],
    },
  },
  {
    id: "historical",
    label: "رواية تاريخية",
    icon: Landmark,
    description: "أحداث في حقبة تاريخية مع شخصيات تعيش تحولات كبرى",
    prefill: {
      title: "",
      mainIdea: "حياة عائلة عربية خلال حقبة تاريخية مفصلية، تتشابك مصائرها مع أحداث سياسية واجتماعية كبرى غيّرت وجه المنطقة",
      timeSetting: "منتصف القرن العشرين",
      placeSetting: "مدينة عربية عريقة",
      narrativePov: "omniscient",
      narrativeTechnique: "linear",
      characters: [
        { name: "", background: "رب عائلة يعيش تحولات العصر ويحاول الحفاظ على إرث أجداده", role: "protagonist", motivation: "حماية العائلة والتكيف مع المتغيرات", speechStyle: "بلاغي وحكيم", physicalDescription: "", psychologicalTraits: "حكمة، عناد، حنين للماضي", age: "" },
        { name: "", background: "الجيل الجديد الذي يتمرد على التقاليد ويسعى للتغيير", role: "rebel", motivation: "بناء مستقبل جديد", speechStyle: "حماسي وجريء", physicalDescription: "", psychologicalTraits: "طموح، تمرد، مثالية", age: "" },
        { name: "", background: "شخصية تمثل السلطة أو الاحتلال أو القوى المسيطرة في تلك الحقبة", role: "antagonist", motivation: "فرض النفوذ والسيطرة", speechStyle: "رسمي ومتعالٍ", physicalDescription: "", psychologicalTraits: "سلطوية، براغماتية", age: "" },
      ],
    },
  },
  {
    id: "fantasy",
    label: "رواية خيالية / فانتازيا",
    icon: Wand2,
    description: "عوالم خيالية مستوحاة من التراث العربي والأساطير الشرقية",
    prefill: {
      title: "",
      mainIdea: "رحلة بطولية في عالم خيالي مستوحى من التراث العربي، حيث تتصارع قوى الخير والشر وتتشابك الأقدار مع السحر والأساطير",
      timeSetting: "زمن أسطوري / خيالي",
      placeSetting: "ممالك خيالية مستوحاة من الشرق",
      narrativePov: "third_person",
      narrativeTechnique: "symbolic",
      characters: [
        { name: "", background: "بطل شاب يكتشف قدرات خارقة أو مصيراً عظيماً لم يكن يعلم به", role: "protagonist", motivation: "إنقاذ عالمه من الظلام", speechStyle: "شجاع وأحياناً ساخر", physicalDescription: "", psychologicalTraits: "شجاعة، شك بالذات، نمو مستمر", age: "" },
        { name: "", background: "حكيم أو ساحر عجوز يرشد البطل في رحلته", role: "mentor", motivation: "نقل المعرفة ومنع كارثة قديمة", speechStyle: "غامض وحكيم", physicalDescription: "", psychologicalTraits: "حكمة عميقة، أسرار مدفونة", age: "" },
        { name: "", background: "قوة شريرة قديمة تسعى للسيطرة على العالم", role: "villain", motivation: "القوة المطلقة والخلود", speechStyle: "مهيب ومخيف", physicalDescription: "", psychologicalTraits: "جبروت، ذكاء شيطاني، وحدة", age: "" },
      ],
    },
  },
];

const projectFormSchema = z.object({
  projectType: z.enum(["novel", "poetry"]).default("novel"),
  title: z.string().min(1, "العنوان مطلوب"),
  mainIdea: z.string().min(10, "يجب أن تكون الفكرة الرئيسية 10 أحرف على الأقل"),
  timeSetting: z.string().default(""),
  placeSetting: z.string().default(""),
  narrativePov: z.string().default(""),
  narrativeTechnique: z.string().optional(),
  allowDialect: z.boolean().default(false),
  pageCount: z.number().default(150),
  characters: z.array(z.object({
    name: z.string(),
    background: z.string(),
    role: z.string(),
    motivation: z.string().optional(),
    speechStyle: z.string().optional(),
    physicalDescription: z.string().optional(),
    psychologicalTraits: z.string().optional(),
    age: z.string().optional(),
  })).default([]),
  relationships: z.array(z.object({
    char1Index: z.number(),
    char2Index: z.number(),
    relationship: z.string().min(1, "وصف العلاقة مطلوب"),
  })).default([]),
  poetryMeter: z.string().optional(),
  poetryRhyme: z.string().optional(),
  poetryEra: z.string().optional(),
  poetryTone: z.string().optional(),
  poetryTheme: z.string().optional(),
  poetryVerseCount: z.number().optional(),
  poetryImageryLevel: z.number().min(0).max(10).optional(),
  poetryEmotionLevel: z.number().min(0).max(10).optional(),
  poetryRawiHaraka: z.string().optional(),
  poetryRidf: z.string().optional(),
  poetryMuarada: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.projectType === "novel") {
    if (!data.timeSetting) ctx.addIssue({ code: "custom", path: ["timeSetting"], message: "الزمن مطلوب" });
    if (!data.placeSetting) ctx.addIssue({ code: "custom", path: ["placeSetting"], message: "المكان مطلوب" });
    if (!data.narrativePov) ctx.addIssue({ code: "custom", path: ["narrativePov"], message: "نوع السرد مطلوب" });
    if (!data.characters || data.characters.length === 0) {
      ctx.addIssue({ code: "custom", path: ["characters"], message: "يجب إضافة شخصية واحدة على الأقل" });
    } else {
      data.characters.forEach((c, i) => {
        if (!c.name) ctx.addIssue({ code: "custom", path: ["characters", i, "name"], message: "اسم الشخصية مطلوب" });
        if (!c.background) ctx.addIssue({ code: "custom", path: ["characters", i, "background"], message: "خلفية الشخصية مطلوبة" });
        if (!c.role) ctx.addIssue({ code: "custom", path: ["characters", i, "role"], message: "دور الشخصية مطلوب" });
      });
    }
  } else if (data.projectType === "poetry") {
    if (!data.poetryMeter) ctx.addIssue({ code: "custom", path: ["poetryMeter"], message: "البحر الشعري مطلوب" });
    if (!data.poetryRhyme) ctx.addIssue({ code: "custom", path: ["poetryRhyme"], message: "حرف الروي مطلوب" });
    if (!data.poetryVerseCount) ctx.addIssue({ code: "custom", path: ["poetryVerseCount"], message: "عدد الأبيات مطلوب" });
    if (data.poetryMuarada && data.poetryMuarada.trim().length > 0 && data.poetryMuarada.trim().length < 20) {
      ctx.addIssue({ code: "custom", path: ["poetryMuarada"], message: "ألصق القصيدة الأصلية كاملة — النص قصير جداً للمعارضة" });
    }
  }
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

export default function NewProject() {
  useDocumentTitle("مشروع جديد — قلم AI");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(-1);
  const [projectType, setProjectType] = useState<"novel" | "poetry">("novel");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [titleSuggestions, setTitleSuggestions] = useState<Array<{ title: string; reason: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestingTitles, setSuggestingTitles] = useState(false);
  const [suggestingTechnique, setSuggestingTechnique] = useState(false);
  const [techniqueSuggestion, setTechniqueSuggestion] = useState<{ primary: string; secondary: string; explanation: string; examples: string } | null>(null);
  const [expandedChars, setExpandedChars] = useState<Set<number>>(new Set());
  const [suggestingFormat, setSuggestingFormat] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [formatSuggestion, setFormatSuggestion] = useState<{ recommendation: string; confidence: string; reasoning: string; shortStoryAdvantages: string; novelAdvantages: string } | null>(null);
  const [suggestingFullProject, setSuggestingFullProject] = useState(false);
  const [fullProjectHint, setFullProjectHint] = useState("");
  const [showHintInput, setShowHintInput] = useState(false);
  const [selectedPoetryRhyme, setSelectedPoetryRhyme] = useState<string>("");
  const [muaradaEnabled, setMuaradaEnabled] = useState(false);

  const urlType = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("type") : null;
  const isPoetryFromUrl = urlType === "poetry";

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      projectType: "novel",
      title: "",
      mainIdea: "",
      timeSetting: "",
      placeSetting: "",
      narrativePov: "",
      narrativeTechnique: "",
      allowDialect: false,
      pageCount: 150,
      characters: [{ name: "", background: "", role: "protagonist", motivation: "", speechStyle: "", physicalDescription: "", psychologicalTraits: "", age: "" }],
      relationships: [],
      poetryMeter: undefined,
      poetryRhyme: undefined,
      poetryEra: undefined,
      poetryTone: undefined,
      poetryTheme: undefined,
      poetryVerseCount: undefined,
      poetryImageryLevel: 5,
      poetryEmotionLevel: 5,
      poetryRawiHaraka: undefined,
      poetryRidf: undefined,
      poetryMuarada: undefined,
    },
  });

  const { fields: charFields, append: addChar, remove: removeChar } = useFieldArray({
    control: form.control,
    name: "characters",
  });

  const { fields: relFields, append: addRel, remove: removeRel } = useFieldArray({
    control: form.control,
    name: "relationships",
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const payload: Record<string, unknown> = { ...data };
      if (data.projectType === "poetry") {
        payload.timeSetting = "poetry";
        payload.placeSetting = "poetry";
        payload.narrativePov = "poetry";
        if (payload.poetryRidf === "none") payload.poetryRidf = null;
      }
      const res = await apiRequest("POST", "/api/projects", payload);
      const project = await res.json();
      const checkoutRes = await apiRequest("POST", `/api/projects/${project.id}/create-checkout`);
      const checkoutData = await checkoutRes.json();
      return { project, checkoutData };
    },
    onSuccess: ({ project, checkoutData }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      if (checkoutData.checkoutUrl) {
        toast({ title: "تم إنشاء المشروع — جارٍ توجيهك إلى صفحة الدفع..." });
        window.location.href = checkoutData.checkoutUrl;
      } else {
        toast({ title: "تم إنشاء المشروع بنجاح" });
        navigate(`/project/${project.id}`);
      }
    },
    onError: (error: any) => {
      const msg = error?.message || "";
      if (msg.includes("FREE_MONTHLY_LIMIT")) {
        setShowUpgradeDialog(true);
        return;
      }
      toast({ title: "حدث خطأ", description: "فشل في إنشاء المشروع", variant: "destructive" });
    },
  });

  const onSubmit = (data: ProjectFormData) => {
    createMutation.mutate(data);
  };

  const handleSuggestFormat = async () => {
    const mainIdea = form.getValues("mainIdea");
    if (!mainIdea || mainIdea.length < 10) {
      toast({ title: "أدخل الفكرة الرئيسية أولاً", description: "يجب أن تكون الفكرة 10 أحرف على الأقل", variant: "destructive" });
      return;
    }
    setSuggestingFormat(true);
    setFormatSuggestion(null);
    try {
      const res = await apiRequest("POST", "/api/projects/suggest-format", {
        title: form.getValues("title"),
        mainIdea,
        timeSetting: form.getValues("timeSetting"),
        placeSetting: form.getValues("placeSetting"),
      });
      const data = await res.json();
      if (data.recommendation) {
        setFormatSuggestion(data);
      } else {
        toast({ title: "فشل في تحليل الفكرة", variant: "destructive" });
      }
    } catch {
      toast({ title: "فشل في تحليل الشكل الأدبي", variant: "destructive" });
    } finally {
      setSuggestingFormat(false);
    }
  };

  const handleSuggestTitles = async () => {
    const mainIdea = form.getValues("mainIdea");
    if (!mainIdea || mainIdea.length < 10) {
      toast({ title: "أدخل الفكرة الرئيسية أولاً", description: "يجب أن تكون الفكرة 10 أحرف على الأقل لاقتراح عناوين مناسبة", variant: "destructive" });
      return;
    }

    setSuggestingTitles(true);
    setShowSuggestions(false);
    try {
      const payload: any = {
        mainIdea,
        projectType,
      };
      if (projectType === "poetry") {
        payload.poetryMeter = form.getValues("poetryMeter");
        payload.poetryEra = form.getValues("poetryEra");
        payload.poetryTheme = form.getValues("poetryTheme");
        payload.poetryTone = form.getValues("poetryTone");
      } else {
        payload.timeSetting = form.getValues("timeSetting");
        payload.placeSetting = form.getValues("placeSetting");
        payload.narrativePov = form.getValues("narrativePov");
        payload.characters = form.getValues("characters")?.filter(c => c.name).map(c => ({ name: c.name, role: c.role }));
      }
      const res = await apiRequest("POST", "/api/projects/suggest-titles", payload);
      const suggestions = await res.json();
      if (Array.isArray(suggestions) && suggestions.length > 0) {
        setTitleSuggestions(suggestions);
        setShowSuggestions(true);
      } else {
        toast({ title: "لم يتمكن أبو هاشم من اقتراح عناوين", description: "حاول إضافة مزيد من التفاصيل", variant: "destructive" });
      }
    } catch {
      toast({ title: "فشل في اقتراح العناوين", description: "حاول مرة أخرى", variant: "destructive" });
    } finally {
      setSuggestingTitles(false);
    }
  };

  const selectTitle = (title: string) => {
    form.setValue("title", title, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    setShowSuggestions(false);
  };

  const handleSuggestTechnique = async () => {
    const mainIdea = form.getValues("mainIdea");
    if (!mainIdea || mainIdea.length < 10) {
      toast({ title: "أدخل الفكرة الرئيسية أولاً", description: "يجب أن تكون الفكرة 10 أحرف على الأقل", variant: "destructive" });
      return;
    }

    setSuggestingTechnique(true);
    setTechniqueSuggestion(null);
    try {
      const res = await apiRequest("POST", "/api/projects/suggest-technique", {
        mainIdea,
        timeSetting: form.getValues("timeSetting"),
        placeSetting: form.getValues("placeSetting"),
        characters: form.getValues("characters")?.filter(c => c.name).map(c => ({ name: c.name, role: c.role })),
      });
      const suggestion = await res.json();
      if (suggestion && suggestion.primary) {
        setTechniqueSuggestion(suggestion);
        form.setValue("narrativeTechnique", suggestion.primary, { shouldValidate: true });
        toast({ title: "اقتراح أبو هاشم", description: `التقنية المقترحة: ${NARRATIVE_TECHNIQUE_OPTIONS.find(o => o.value === suggestion.primary)?.label || suggestion.primary}` });
      } else {
        toast({ title: "لم يتمكن أبو هاشم من الاقتراح", description: "حاول إضافة مزيد من التفاصيل", variant: "destructive" });
      }
    } catch {
      toast({ title: "فشل في اقتراح التقنية السردية", description: "حاول مرة أخرى", variant: "destructive" });
    } finally {
      setSuggestingTechnique(false);
    }
  };

  const handleSuggestFullProject = async () => {
    if (!showHintInput) {
      setShowHintInput(true);
      return;
    }
    setSuggestingFullProject(true);
    try {
      const res = await apiRequest("POST", "/api/projects/suggest-full", {
        projectType: projectType,
        hint: fullProjectHint,
      });
      const data = await res.json();
      form.setValue("title", data.title, { shouldValidate: true });
      form.setValue("mainIdea", data.mainIdea, { shouldValidate: true });
      if (projectType === "poetry") {
        if (data.poetryMeter) form.setValue("poetryMeter", data.poetryMeter, { shouldValidate: true });
        if (data.poetryRhyme) {
          form.setValue("poetryRhyme", data.poetryRhyme, { shouldValidate: true });
          setSelectedPoetryRhyme(data.poetryRhyme);
        }
        if (data.poetryEra) form.setValue("poetryEra", data.poetryEra, { shouldValidate: true });
        if (data.poetryTone) form.setValue("poetryTone", data.poetryTone, { shouldValidate: true });
        if (data.poetryTheme) form.setValue("poetryTheme", data.poetryTheme, { shouldValidate: true });
        if (data.poetryVerseCount) form.setValue("poetryVerseCount", data.poetryVerseCount, { shouldValidate: true });
        form.setValue("poetryImageryLevel", data.poetryImageryLevel ?? 5, { shouldValidate: true });
        form.setValue("poetryEmotionLevel", data.poetryEmotionLevel ?? 5, { shouldValidate: true });
      } else {
        form.setValue("timeSetting", data.timeSetting, { shouldValidate: true });
        form.setValue("placeSetting", data.placeSetting, { shouldValidate: true });
        form.setValue("narrativePov", data.narrativePov, { shouldValidate: true });
        form.setValue("narrativeTechnique", data.narrativeTechnique || "", { shouldValidate: true });
        if (data.characters) {
          form.setValue("characters", data.characters, { shouldValidate: true });
        }
        form.setValue("relationships", data.relationships || [], { shouldValidate: true });
      }
      toast({ title: projectType === "poetry" ? "تم اقتراح قصيدة كاملة — راجع التفاصيل وعدّلها كما تشاء" : "تم اقتراح مشروع كامل — راجع التفاصيل وعدّلها كما تشاء" });
      setShowHintInput(false);
      setFullProjectHint("");
    } catch {
      toast({ title: "فشل في اقتراح المشروع", description: "حاول مرة أخرى", variant: "destructive" });
    } finally {
      setSuggestingFullProject(false);
    }
  };

  const handleSelectTemplate = (template: ProjectTemplate) => {
    setSelectedTemplate(template.id);
    setProjectType("novel");
    form.setValue("projectType", "novel", { shouldValidate: false });
    form.setValue("title", template.prefill.title, { shouldValidate: false });
    form.setValue("mainIdea", template.prefill.mainIdea, { shouldValidate: false });
    form.setValue("timeSetting", template.prefill.timeSetting, { shouldValidate: false });
    form.setValue("placeSetting", template.prefill.placeSetting, { shouldValidate: false });
    form.setValue("narrativePov", template.prefill.narrativePov, { shouldValidate: false });
    form.setValue("narrativeTechnique", template.prefill.narrativeTechnique, { shouldValidate: false });
    form.setValue("characters", template.prefill.characters, { shouldValidate: false });
    form.setValue("relationships", [], { shouldValidate: false });
    setStep(0);
  };

  const handleSelectPoetryType = () => {
    setProjectType("poetry");
    setSelectedTemplate("poetry");
    form.setValue("projectType", "poetry", { shouldValidate: false });
    form.setValue("title", "", { shouldValidate: false });
    form.setValue("mainIdea", "", { shouldValidate: false });
    form.setValue("characters", [], { shouldValidate: false });
    form.setValue("relationships", [], { shouldValidate: false });
    form.setValue("poetryImageryLevel", 5, { shouldValidate: false });
    form.setValue("poetryEmotionLevel", 5, { shouldValidate: false });
    setSelectedPoetryRhyme("");
    setStep(0);
  };

  useEffect(() => {
    if (isPoetryFromUrl) {
      handleSelectPoetryType();
    }
  }, []);

  const novelSteps = [
    { title: "القالب", icon: LayoutTemplate },
    { title: "تفاصيل الرواية", icon: BookOpen },
    { title: "الشخصيات", icon: Users },
    { title: "العلاقات والمكان", icon: MapPin },
  ];

  const poetrySteps = [
    { title: "النوع", icon: LayoutTemplate },
    { title: "تفاصيل القصيدة", icon: PenLine },
  ];

  const steps = projectType === "poetry" ? poetrySteps : novelSteps;

  const characters = form.watch("characters");

  const canNextStep = () => {
    if (projectType === "poetry") {
      return form.watch("title") && form.watch("mainIdea") && form.watch("poetryMeter") && form.watch("poetryRhyme") && form.watch("poetryVerseCount");
    }
    if (step === 0) {
      return form.watch("title") && form.watch("mainIdea");
    }
    if (step === 1) {
      return characters.length > 0 && characters.every(c => c.name && c.background && c.role);
    }
    return true;
  };

  const totalSteps = steps.length - 2;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back" aria-label="العودة للرئيسية">
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Feather className="w-5 h-5 text-primary" />
              <span className="font-serif text-lg font-bold">مشروع جديد</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex items-center justify-center gap-2 mb-10">
          {steps.map((s, i) => {
            const stepIndex = i - 1;
            return (
              <div key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => stepIndex < step && setStep(stepIndex)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    stepIndex === step
                      ? "bg-primary text-primary-foreground"
                      : stepIndex < step
                      ? "bg-primary/10 text-primary cursor-pointer"
                      : "bg-muted text-muted-foreground"
                  }`}
                  data-testid={`button-step-${i}`}
                >
                  <s.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{s.title}</span>
                </button>
                {i < steps.length - 1 && (
                  <div className={`w-8 h-0.5 ${stepIndex < step ? "bg-primary" : "bg-muted"}`} />
                )}
              </div>
            );
          })}
        </div>

        {step === -1 && (
          <div>
            <div className="text-center mb-8">
              <h2 className="font-serif text-xl sm:text-2xl font-bold mb-2">اختر نوع المشروع</h2>
              <p className="text-sm text-muted-foreground">اختر نوع العمل الأدبي الذي تريد إنشاءه</p>
            </div>

            <Card
              className={`cursor-pointer transition-colors hover-elevate mb-6 ${selectedTemplate === "poetry" ? "border-primary ring-1 ring-primary" : ""}`}
              data-testid="template-card-poetry"
            >
              <CardContent className="p-5">
                <button
                  type="button"
                  onClick={handleSelectPoetryType}
                  className="w-full text-right"
                  data-testid="button-template-poetry"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 text-primary shrink-0">
                      <PenLine className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-base">قصيدة عمودية (الشعر العمودي)</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">١٤.٩٩ دولار</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">اكتب قصيدة عمودية كلاسيكية بجميع البحور الشعرية والأوزان العروضية مع اختيار حرف الروي والعصر الأدبي</p>
                </button>
              </CardContent>
            </Card>

            <Link href="/project/new/reels">
              <Card
                className="cursor-pointer transition-colors hover-elevate mb-6"
                data-testid="template-card-reels"
              >
                <CardContent className="p-5">
                  <div className="w-full text-right">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 text-primary shrink-0">
                        <Film className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-serif font-bold text-base">ريلز (فيديو قصير)</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">٧.٩٩ دولار</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">سكريبت احترافي لريلز قصير مع توجيهات بصرية ومؤثرات وموسيقى لإنستغرام ريلز وتيك توك ويوتيوب شورتس</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground font-medium">أو اختر قالباً لروايتك</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {PROJECT_TEMPLATES.map((template) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-colors hover-elevate ${selectedTemplate === template.id ? "border-primary ring-1 ring-primary" : ""}`}
                  data-testid={`template-card-${template.id}`}
                >
                  <CardContent className="p-5">
                    <button
                      type="button"
                      onClick={() => handleSelectTemplate(template)}
                      className="w-full text-right"
                      data-testid={`button-template-${template.id}`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 text-primary shrink-0">
                          <template.icon className="w-5 h-5" />
                        </div>
                        <h3 className="font-serif font-bold text-base">{template.label}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{template.description}</p>
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {step >= 0 && (projectType === "novel" || projectType === "poetry") && (
              <div className="mb-6 flex flex-col items-center gap-3">
                <Button
                  type="button"
                  onClick={handleSuggestFullProject}
                  disabled={suggestingFullProject}
                  className="gap-2 bg-gradient-to-l from-amber-500 to-yellow-400 text-white border-amber-600 font-bold text-base px-6"
                  data-testid="button-suggest-full-project"
                >
                  {suggestingFullProject ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Sparkles className="h-5 w-5" />
                  )}
                  {suggestingFullProject ? "أبو هاشم يفكّر..." : projectType === "poetry" ? "أبو هاشم يقترح لك قصيدة كاملة" : "أبو هاشم يقترح لك مشروعاً كاملاً"}
                </Button>
                {showHintInput && (
                  <div className="flex items-center gap-2 w-full max-w-md">
                    <Input
                      value={fullProjectHint}
                      onChange={(e) => setFullProjectHint(e.target.value)}
                      placeholder="أدخل كلمة مفتاحية أو موضوع (اختياري)..."
                      className="flex-1"
                      data-testid="input-full-project-hint"
                    />
                    <Button
                      type="button"
                      onClick={handleSuggestFullProject}
                      disabled={suggestingFullProject}
                      className="shrink-0 gap-1.5 bg-gradient-to-l from-amber-500 to-yellow-400 text-white"
                      data-testid="button-confirm-full-project"
                    >
                      {suggestingFullProject ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      ابدأ
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => { setShowHintInput(false); setFullProjectHint(""); }}
                      data-testid="button-cancel-full-project"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {step === 0 && projectType === "poetry" && (
              <Card>
                <CardContent className="p-5 sm:p-8 space-y-6">
                  <div className="space-y-2 mb-6">
                    <h2 className="font-serif text-xl sm:text-2xl font-bold">تفاصيل القصيدة</h2>
                    <p className="text-sm text-muted-foreground">أدخل المعلومات الأساسية لقصيدتك العمودية</p>
                  </div>

                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>عنوان القصيدة</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input placeholder="مثال: قصيدة في مدح الوطن" {...field} data-testid="input-poetry-title" />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleSuggestTitles}
                          disabled={suggestingTitles}
                          className="shrink-0 gap-1.5 border-[hsl(43,76%,52%)] text-[hsl(43,76%,52%)] hover:bg-[hsl(43,76%,52%)]/10 whitespace-nowrap"
                          data-testid="button-suggest-poetry-titles"
                        >
                          {suggestingTitles ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                          {suggestingTitles ? "جارٍ التفكير..." : "اقتراح من أبو هاشم"}
                        </Button>
                      </div>
                      <FormMessage />

                      {showSuggestions && titleSuggestions.length > 0 && (
                        <div className="mt-3 rounded-lg border border-[hsl(43,76%,52%)]/30 bg-[hsl(43,76%,92%)] dark:bg-[hsl(213,66%,11%)]/50 p-4 space-y-2" data-testid="panel-poetry-title-suggestions">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-[hsl(43,76%,52%)]" />
                              <span className="text-sm font-semibold">اقتراحات أبو هاشم</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowSuggestions(false)}
                              className="h-6 w-6 p-0"
                              data-testid="button-close-poetry-suggestions"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          {titleSuggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => selectTitle(suggestion.title)}
                              className="w-full text-right p-3 rounded-md border border-transparent hover:border-[hsl(43,76%,52%)]/50 hover:bg-white dark:hover:bg-[hsl(213,66%,15%)] transition-colors cursor-pointer"
                              data-testid={`button-poetry-suggestion-${index}`}
                            >
                              <div className="font-serif font-bold text-base">{suggestion.title}</div>
                              <div className="text-xs text-muted-foreground mt-1">{suggestion.reason}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="mainIdea" render={({ field }) => (
                    <FormItem>
                      <FormLabel>موضوع القصيدة</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="صف موضوع القصيدة والمشاعر والأفكار التي تريد التعبير عنها..."
                          className="min-h-[100px]"
                          {...field}
                          data-testid="input-poetry-topic"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="space-y-3">
                    <FormField control={form.control} name="poetryMeter" render={({ field }) => (
                      <FormItem>
                        <FormLabel>البحر الشعري</FormLabel>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {POETRY_METERS.map((meter) => (
                            <button
                              key={meter.id}
                              type="button"
                              onClick={() => field.onChange(meter.id)}
                              className={`text-right p-3 rounded-md border transition-colors ${
                                field.value === meter.id
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border hover-elevate"
                              }`}
                              data-testid={`button-meter-${meter.id}`}
                            >
                              <div className="font-serif font-bold text-sm">{meter.name}</div>
                              <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{meter.description}</div>
                            </button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="space-y-3">
                    <FormField control={form.control} name="poetryRhyme" render={({ field }) => (
                      <FormItem>
                        <FormLabel>حرف الروي (القافية)</FormLabel>
                        <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5">
                          {POETRY_RHYME_LETTERS.map((letter) => (
                            <button
                              key={letter}
                              type="button"
                              onClick={() => {
                                field.onChange(letter);
                                setSelectedPoetryRhyme(letter);
                              }}
                              className={`flex items-center justify-center rounded-md border text-lg font-serif transition-colors aspect-square ${
                                field.value === letter
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border hover-elevate"
                              }`}
                              data-testid={`button-rhyme-${letter}`}
                            >
                              {letter}
                            </button>
                          ))}
                        </div>
                        {selectedPoetryRhyme && (
                          <p className="text-xs text-muted-foreground mt-1">
                            حرف الروي المختار: <span className="font-bold text-foreground">{selectedPoetryRhyme}</span> — سينتهي كل بيت بهذا الحرف
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="poetryRawiHaraka" render={({ field }) => (
                      <FormItem>
                        <FormLabel>حركة الروي — المَجرى (اختياري)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-poetry-rawi-haraka">
                              <SelectValue placeholder="اختر حركة الروي" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="fatha">الفتحة (َ) — قافية مطلقة</SelectItem>
                            <SelectItem value="damma">الضمة (ُ) — قافية مطلقة</SelectItem>
                            <SelectItem value="kasra">الكسرة (ِ) — قافية مطلقة</SelectItem>
                            <SelectItem value="sukun">السكون (ْ) — قافية مقيّدة</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">تُوحَّد هذه الحركة على حرف الروي في جميع أبيات القصيدة</p>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="poetryRidf" render={({ field }) => (
                      <FormItem>
                        <FormLabel>الردف (اختياري)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-poetry-ridf">
                              <SelectValue placeholder="بدون ردف" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">بدون ردف</SelectItem>
                            <SelectItem value="alef">ألف (ا) — مثل: نار، دار</SelectItem>
                            <SelectItem value="waw">واو (و) — مثل: نور، صدور</SelectItem>
                            <SelectItem value="yaa">ياء (ي) — مثل: سمير، كبير</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">حرف مدّ يأتي قبل الروي مباشرة في كل بيت</p>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label className="text-sm font-medium">معارضة قصيدة مشهورة</label>
                        <p className="text-xs text-muted-foreground">انظم قصيدة جديدة على نهج قصيدة مشهورة — نفس البحر والقافية مع معانٍ جديدة</p>
                      </div>
                      <Switch
                        checked={muaradaEnabled}
                        onCheckedChange={(checked) => {
                          setMuaradaEnabled(checked);
                          if (!checked) {
                            form.setValue("poetryMuarada", undefined);
                          }
                        }}
                        data-testid="switch-muarada"
                      />
                    </div>
                    {muaradaEnabled && (
                      <FormField control={form.control} name="poetryMuarada" render={({ field }) => (
                        <FormItem>
                          <FormLabel>القصيدة الأصلية المُعارَضة</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              value={field.value || ""}
                              placeholder={"ألصق أبيات القصيدة التي تريد معارضتها هنا...\n\nمثال:\nقفا نبكِ من ذكرى حبيبٍ ومنزلِ *** بسقطِ اللوى بين الدخولِ فحوملِ"}
                              className="min-h-[160px] font-serif text-base leading-[2] text-right"
                              dir="rtl"
                              data-testid="textarea-muarada"
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">سيدرس أبو هاشم القصيدة الأصلية وينظم معارضة لها بنفس البحر والقافية مع معانٍ وصور جديدة مبتكرة</p>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="poetryEra" render={({ field }) => (
                      <FormItem>
                        <FormLabel>العصر الأدبي (اختياري)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-poetry-era">
                              <SelectValue placeholder="اختر العصر الأدبي" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {POETRY_ERA_OPTIONS.map((era) => (
                              <SelectItem key={era.id} value={era.id}>
                                {era.name} — {era.description}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="poetryVerseCount" render={({ field }) => (
                      <FormItem>
                        <FormLabel>عدد الأبيات</FormLabel>
                        <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value ? String(field.value) : ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-poetry-verse-count">
                              <SelectValue placeholder="اختر عدد الأبيات" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {POETRY_VERSE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="poetryTheme" render={({ field }) => (
                      <FormItem>
                        <FormLabel>الغرض الشعري (اختياري)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-poetry-theme">
                              <SelectValue placeholder="اختر الغرض الشعري" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {POETRY_THEME_OPTIONS.map((theme) => (
                              <SelectItem key={theme.id} value={theme.id}>{theme.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="poetryTone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>النغمة (اختياري)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-poetry-tone">
                              <SelectValue placeholder="اختر النغمة" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {POETRY_TONE_OPTIONS.map((tone) => (
                              <SelectItem key={tone.id} value={tone.id}>{tone.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="space-y-4">
                    <FormField control={form.control} name="poetryImageryLevel" render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between gap-4">
                          <FormLabel>مستوى التصوير البلاغي</FormLabel>
                          <span className="text-sm font-medium text-muted-foreground" data-testid="text-imagery-level">{field.value ?? 5}/10</span>
                        </div>
                        <FormControl>
                          <Slider
                            min={0}
                            max={10}
                            step={1}
                            value={[field.value ?? 5]}
                            onValueChange={(vals) => field.onChange(vals[0])}
                            data-testid="slider-poetry-imagery"
                          />
                        </FormControl>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>مباشر وبسيط</span>
                          <span>بلاغة كثيفة وصور غنية</span>
                        </div>
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="poetryEmotionLevel" render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between gap-4">
                          <FormLabel>شدة العاطفة</FormLabel>
                          <span className="text-sm font-medium text-muted-foreground" data-testid="text-emotion-level">{field.value ?? 5}/10</span>
                        </div>
                        <FormControl>
                          <Slider
                            min={0}
                            max={10}
                            step={1}
                            value={[field.value ?? 5]}
                            onValueChange={(vals) => field.onChange(vals[0])}
                            data-testid="slider-poetry-emotion"
                          />
                        </FormControl>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>هادئ ورزين</span>
                          <span>عاطفة متوهجة ومشتعلة</span>
                        </div>
                      </FormItem>
                    )} />
                  </div>

                  <div className="rounded-md bg-primary/5 border border-primary/10 p-4 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">قصيدة عمودية — {POETRY_VERSE_OPTIONS.find(v => v.value === form.watch("poetryVerseCount"))?.label || "اختر عدد الأبيات"}</p>
                    <p>سيقوم أبو هاشم بنظم قصيدة ملتزمة بالوزن العروضي والقافية وفق أصول علم العروض والشعر العربي الكلاسيكي.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 0 && projectType === "novel" && (
              <Card>
                <CardContent className="p-5 sm:p-8 space-y-6">
                  <div className="space-y-2 mb-6">
                    <h2 className="font-serif text-xl sm:text-2xl font-bold">تفاصيل الرواية</h2>
                    <p className="text-sm text-muted-foreground">أدخل المعلومات الأساسية لروايتك</p>
                  </div>

                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>عنوان الرواية</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input placeholder="مثال: ظلال الذاكرة" {...field} data-testid="input-title" />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleSuggestTitles}
                          disabled={suggestingTitles}
                          className="shrink-0 gap-1.5 border-[hsl(43,76%,52%)] text-[hsl(43,76%,52%)] hover:bg-[hsl(43,76%,52%)]/10 whitespace-nowrap"
                          data-testid="button-suggest-titles"
                        >
                          {suggestingTitles ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                          {suggestingTitles ? "جارٍ التفكير..." : "اقتراح من أبو هاشم"}
                        </Button>
                      </div>
                      <FormMessage />

                      {showSuggestions && titleSuggestions.length > 0 && (
                        <div className="mt-3 rounded-lg border border-[hsl(43,76%,52%)]/30 bg-[hsl(43,76%,92%)] dark:bg-[hsl(213,66%,11%)]/50 p-4 space-y-2" data-testid="panel-title-suggestions">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-[hsl(43,76%,52%)]" />
                              <span className="text-sm font-semibold">اقتراحات أبو هاشم</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowSuggestions(false)}
                              className="h-6 w-6 p-0"
                              data-testid="button-close-suggestions"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          {titleSuggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => selectTitle(suggestion.title)}
                              className="w-full text-right p-3 rounded-md border border-transparent hover:border-[hsl(43,76%,52%)]/50 hover:bg-white dark:hover:bg-[hsl(213,66%,15%)] transition-colors cursor-pointer"
                              data-testid={`button-suggestion-${index}`}
                            >
                              <div className="font-serif font-bold text-base">{suggestion.title}</div>
                              <div className="text-xs text-muted-foreground mt-1">{suggestion.reason}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="mainIdea" render={({ field }) => (
                    <FormItem>
                      <FormLabel>الفكرة الرئيسية أو المشكلة الاجتماعية</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="مثال: صراع الهوية بين الأصالة والمعاصرة في مجتمع متحول..."
                          className="min-h-[120px]"
                          {...field}
                          data-testid="input-main-idea"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSuggestFormat}
                    disabled={suggestingFormat}
                    className="gap-1.5 border-[hsl(43,76%,52%)] text-[hsl(43,76%,52%)] hover:bg-[hsl(43,76%,52%)]/10"
                    data-testid="button-suggest-format"
                  >
                    {suggestingFormat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {suggestingFormat ? "أبو هاشم يحلّل فكرتك..." : "هل فكرتك رواية أم قصة قصيرة؟"}
                  </Button>

                  {formatSuggestion && (
                    <div className="rounded-lg border border-[hsl(43,76%,52%)]/30 bg-[hsl(43,76%,92%)] dark:bg-[hsl(213,66%,11%)]/50 p-4 space-y-3" data-testid="panel-format-suggestion">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-[hsl(43,76%,52%)]" />
                          <span className="text-sm font-semibold">
                            {formatSuggestion.recommendation === "novel" ? "أبو هاشم يرى أن فكرتك تصلح رواية ✓" : "أبو هاشم يقترح: قصة قصيرة"}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${formatSuggestion.confidence === "high" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : formatSuggestion.confidence === "medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
                            {formatSuggestion.confidence === "high" ? "ثقة عالية" : formatSuggestion.confidence === "medium" ? "ثقة متوسطة" : "ثقة منخفضة"}
                          </span>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setFormatSuggestion(null)} className="h-6 w-6 p-0" data-testid="button-close-format">
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <p className="text-sm text-amber-900 dark:text-amber-200">{formatSuggestion.reasoning}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="bg-white/50 dark:bg-white/5 rounded p-2">
                          <span className="font-medium">مزايا الرواية: </span>
                          <span className="text-muted-foreground">{formatSuggestion.novelAdvantages}</span>
                        </div>
                        <div className="bg-white/50 dark:bg-white/5 rounded p-2">
                          <span className="font-medium">مزايا القصة القصيرة: </span>
                          <span className="text-muted-foreground">{formatSuggestion.shortStoryAdvantages}</span>
                        </div>
                      </div>
                      {formatSuggestion.recommendation === "short_story" && (
                        <Link href="/project/new/short-story">
                          <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs" data-testid="button-switch-to-short-story">
                            انتقل إلى إنشاء قصة قصيرة
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="narrativePov" render={({ field }) => (
                      <FormItem>
                        <FormLabel>نوع السرد</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-pov">
                              <SelectValue placeholder="اختر نوع السرد" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="first_person">الراوي بضمير المتكلم (أنا)</SelectItem>
                            <SelectItem value="third_person">الراوي بضمير الغائب (هو/هي)</SelectItem>
                            <SelectItem value="omniscient">الراوي العليم</SelectItem>
                            <SelectItem value="multiple">تعدد الأصوات السردية</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="pageCount" render={({ field }) => (
                      <FormItem>
                        <FormLabel>عدد صفحات الرواية</FormLabel>
                        <Select onValueChange={(v) => field.onChange(parseInt(v))} value={String(field.value)}>
                          <FormControl>
                            <SelectTrigger data-testid="select-page-count">
                              <SelectValue placeholder="اختر حجم الرواية" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PAGE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="space-y-3">
                    <FormField control={form.control} name="narrativeTechnique" render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between gap-2">
                          <FormLabel>التقنية السردية (اختياري)</FormLabel>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleSuggestTechnique}
                            disabled={suggestingTechnique}
                            className="text-xs h-7 gap-1"
                            data-testid="button-suggest-technique"
                          >
                            {suggestingTechnique ? (
                              <><Loader2 className="w-3 h-3 animate-spin" /> يحلّل أبو هاشم...</>
                            ) : (
                              <><Sparkles className="w-3 h-3" /> اقتراح أبو هاشم</>
                            )}
                          </Button>
                        </div>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-technique">
                              <SelectValue placeholder="اختر التقنية السردية أو اترك لأبو هاشم" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {NARRATIVE_TECHNIQUE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {techniqueSuggestion && (
                      <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 text-sm space-y-2" data-testid="technique-suggestion-card">
                        <p className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4" />
                          تحليل أبو هاشم للتقنية السردية
                        </p>
                        <p className="text-amber-900 dark:text-amber-200">{techniqueSuggestion.explanation}</p>
                        {techniqueSuggestion.secondary && (
                          <p className="text-amber-700 dark:text-amber-400 text-xs">
                            تقنية ثانوية مقترحة: <span className="font-medium">{NARRATIVE_TECHNIQUE_OPTIONS.find(o => o.value === techniqueSuggestion.secondary)?.label || techniqueSuggestion.secondary}</span>
                          </p>
                        )}
                        {techniqueSuggestion.examples && (
                          <p className="text-amber-700 dark:text-amber-400 text-xs">أمثلة: {techniqueSuggestion.examples}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <FormField control={form.control} name="allowDialect" render={({ field }) => (
                    <FormItem className="flex flex-row-reverse items-center justify-between rounded-lg border p-4">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-allow-dialect"
                        />
                      </FormControl>
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">السماح باستخدام اللهجة جزئياً في الحوار</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          عند التفعيل، قد يستخدم أبو هاشم اللهجة العامية جزئياً في حوارات الشخصيات فقط. السرد والوصف يبقيان بالفصحى دائماً.
                        </p>
                      </div>
                    </FormItem>
                  )} />

                  <div className="rounded-md bg-primary/5 border border-primary/10 p-4 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">رواية {form.watch("pageCount")} صفحة</p>
                    <p>سيتم تقسيم الرواية إلى فصول متعددة، وقد يتم كتابة كل فصل على أجزاء لضمان الجودة والتفصيل.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 1 && projectType === "novel" && (
              <Card>
                <CardContent className="p-5 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                    <div>
                      <h2 className="font-serif text-xl sm:text-2xl font-bold">الشخصيات</h2>
                      <p className="text-sm text-muted-foreground">أضف شخصيات روايتك وحدد خلفياتها</p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => addChar({ name: "", background: "", role: "secondary", motivation: "", speechStyle: "", physicalDescription: "", psychologicalTraits: "", age: "" })}
                      data-testid="button-add-character"
                    >
                      <Plus className="w-4 h-4 ml-1" />
                      إضافة شخصية
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {charFields.map((field, index) => (
                      <Card key={field.id} className="bg-muted/30">
                        <CardContent className="p-5 space-y-4">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-muted-foreground">
                              شخصية {index + 1}
                            </span>
                            {charFields.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeChar(index)}
                                data-testid={`button-remove-character-${index}`}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                          <div className="grid sm:grid-cols-2 gap-4">
                            <FormField control={form.control} name={`characters.${index}.name`} render={({ field }) => (
                              <FormItem>
                                <FormLabel>الاسم</FormLabel>
                                <FormControl>
                                  <Input placeholder="اسم الشخصية" {...field} data-testid={`input-char-name-${index}`} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name={`characters.${index}.role`} render={({ field }) => (
                              <FormItem>
                                <FormLabel>الدور</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid={`select-char-role-${index}`}>
                                      <SelectValue placeholder="اختر الدور" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="protagonist">بطل رئيسي</SelectItem>
                                    <SelectItem value="love_interest">الحبيب / الحبيبة</SelectItem>
                                    <SelectItem value="antagonist">شخصية معارضة (الخصم)</SelectItem>
                                    <SelectItem value="anti_hero">بطل مضاد</SelectItem>
                                    <SelectItem value="mentor">المرشد / المعلم</SelectItem>
                                    <SelectItem value="sidekick">الصديق المقرب / الرفيق</SelectItem>
                                    <SelectItem value="comic_relief">شخصية فكاهية</SelectItem>
                                    <SelectItem value="secondary">شخصية ثانوية</SelectItem>
                                    <SelectItem value="mysterious">شخصية غامضة</SelectItem>
                                    <SelectItem value="villain">الشرير</SelectItem>
                                    <SelectItem value="wise_elder">الحكيم / الشيخ</SelectItem>
                                    <SelectItem value="child">طفل / شخصية صغيرة</SelectItem>
                                    <SelectItem value="narrator">راوٍ</SelectItem>
                                    <SelectItem value="tragic">شخصية مأساوية</SelectItem>
                                    <SelectItem value="rebel">المتمرد</SelectItem>
                                    <SelectItem value="guardian">الحامي / الوصي</SelectItem>
                                    <SelectItem value="trickster">المحتال / الماكر</SelectItem>
                                    <SelectItem value="healer">المعالج / الطبيب</SelectItem>
                                    <SelectItem value="outcast">المنبوذ / المنعزل</SelectItem>
                                    <SelectItem value="diplomat">الدبلوماسي / الوسيط</SelectItem>
                                    <SelectItem value="scholar">العالم / الباحث</SelectItem>
                                    <SelectItem value="warrior">المحارب / الفارس</SelectItem>
                                    <SelectItem value="prophet">النبي / صاحب الرؤيا</SelectItem>
                                    <SelectItem value="servant">الخادم / التابع</SelectItem>
                                    <SelectItem value="merchant">التاجر</SelectItem>
                                    <SelectItem value="artist">الفنان / الأديب</SelectItem>
                                    <SelectItem value="spy">الجاسوس</SelectItem>
                                    <SelectItem value="mother_figure">الأم / الأمومة</SelectItem>
                                    <SelectItem value="father_figure">الأب / الأبوّة</SelectItem>
                                    <SelectItem value="orphan">اليتيم</SelectItem>
                                    <SelectItem value="lover_betrayed">العاشق المخدوع</SelectItem>
                                    <SelectItem value="avenger">المنتقم</SelectItem>
                                    <SelectItem value="dreamer">الحالم</SelectItem>
                                    <SelectItem value="survivor">الناجي</SelectItem>
                                    <SelectItem value="tyrant">الطاغية</SelectItem>
                                    <SelectItem value="refugee">اللاجئ / المهاجر</SelectItem>
                                    <SelectItem value="detective">المحقق</SelectItem>
                                    <SelectItem value="rival">المنافس / الغريم</SelectItem>
                                    <SelectItem value="shapeshifter">المتلوّن / متقلب الأقنعة</SelectItem>
                                    <SelectItem value="scapegoat">كبش الفداء</SelectItem>
                                    <SelectItem value="confessor">المعترف / حامل الأسرار</SelectItem>
                                    <SelectItem value="wife">الزوجة</SelectItem>
                                    <SelectItem value="husband">الزوج</SelectItem>
                                    <SelectItem value="first_wife">الزوجة الأولى</SelectItem>
                                    <SelectItem value="second_wife">الزوجة الثانية</SelectItem>
                                    <SelectItem value="ex_wife">الزوجة السابقة</SelectItem>
                                    <SelectItem value="ex_husband">الزوج السابق</SelectItem>
                                    <SelectItem value="fiancee">الخطيبة</SelectItem>
                                    <SelectItem value="fiance">الخطيب</SelectItem>
                                    <SelectItem value="sister">الأخت</SelectItem>
                                    <SelectItem value="brother">الأخ</SelectItem>
                                    <SelectItem value="daughter">الابنة</SelectItem>
                                    <SelectItem value="son">الابن</SelectItem>
                                    <SelectItem value="grandmother">الجدة</SelectItem>
                                    <SelectItem value="grandfather">الجد</SelectItem>
                                    <SelectItem value="uncle">العم / الخال</SelectItem>
                                    <SelectItem value="aunt">العمة / الخالة</SelectItem>
                                    <SelectItem value="cousin_male">ابن العم / ابن الخال</SelectItem>
                                    <SelectItem value="cousin_female">بنت العم / بنت الخال</SelectItem>
                                    <SelectItem value="mother_in_law">الحماة</SelectItem>
                                    <SelectItem value="father_in_law">الحمو</SelectItem>
                                    <SelectItem value="stepmother">زوجة الأب</SelectItem>
                                    <SelectItem value="stepfather">زوج الأم</SelectItem>
                                    <SelectItem value="neighbor">الجار / الجارة</SelectItem>
                                    <SelectItem value="best_friend">الصديق الحميم</SelectItem>
                                    <SelectItem value="secret_lover">الحبيب السري</SelectItem>
                                    <SelectItem value="forbidden_love">الحب المحرّم</SelectItem>
                                    <SelectItem value="widow">الأرملة</SelectItem>
                                    <SelectItem value="widower">الأرمل</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                          <FormField control={form.control} name={`characters.${index}.background`} render={({ field }) => (
                            <FormItem>
                              <FormLabel>الخلفية</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="خلفية الشخصية وصفاتها وتاريخها..."
                                  className="min-h-[80px]"
                                  {...field}
                                  data-testid={`input-char-bg-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground text-xs"
                            onClick={() => {
                              const next = new Set(expandedChars);
                              if (next.has(index)) next.delete(index); else next.add(index);
                              setExpandedChars(next);
                            }}
                            data-testid={`button-toggle-details-${index}`}
                          >
                            {expandedChars.has(index) ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                            {expandedChars.has(index) ? "إخفاء التفاصيل المتقدمة" : "تفاصيل متقدمة (اختياري)"}
                          </Button>
                          {expandedChars.has(index) && (
                            <div className="space-y-4 border-t pt-4 mt-2">
                              <div className="grid sm:grid-cols-2 gap-4">
                                <FormField control={form.control} name={`characters.${index}.age`} render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>العمر</FormLabel>
                                    <FormControl>
                                      <Input placeholder="مثال: ٣٥ سنة" {...field} data-testid={`input-char-age-${index}`} />
                                    </FormControl>
                                  </FormItem>
                                )} />
                                <FormField control={form.control} name={`characters.${index}.motivation`} render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>الدافع</FormLabel>
                                    <FormControl>
                                      <Input placeholder="ما الذي يحرّك هذه الشخصية؟" {...field} data-testid={`input-char-motivation-${index}`} />
                                    </FormControl>
                                  </FormItem>
                                )} />
                              </div>
                              <FormField control={form.control} name={`characters.${index}.physicalDescription`} render={({ field }) => (
                                <FormItem>
                                  <FormLabel>الوصف الجسدي</FormLabel>
                                  <FormControl>
                                    <Input placeholder="الملامح والبنية والمظهر الخارجي..." {...field} data-testid={`input-char-physical-${index}`} />
                                  </FormControl>
                                </FormItem>
                              )} />
                              <FormField control={form.control} name={`characters.${index}.psychologicalTraits`} render={({ field }) => (
                                <FormItem>
                                  <FormLabel>السمات النفسية</FormLabel>
                                  <FormControl>
                                    <Input placeholder="الطباع والمخاوف ونقاط الضعف والقوة..." {...field} data-testid={`input-char-psych-${index}`} />
                                  </FormControl>
                                </FormItem>
                              )} />
                              <FormField control={form.control} name={`characters.${index}.speechStyle`} render={({ field }) => (
                                <FormItem>
                                  <FormLabel>أسلوب الكلام</FormLabel>
                                  <FormControl>
                                    <Input placeholder="مثال: رسمي وهادئ، عامّي ساخر، شعري..." {...field} data-testid={`input-char-speech-${index}`} />
                                  </FormControl>
                                </FormItem>
                              )} />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 2 && projectType === "novel" && (
              <div className="space-y-6">
                <Card>
                  <CardContent className="p-5 sm:p-8 space-y-6">
                    <div>
                      <h2 className="font-serif text-xl sm:text-2xl font-bold mb-2">المكان والزمان</h2>
                      <p className="text-sm text-muted-foreground">حدد إطار الرواية الزماني والمكاني</p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="timeSetting" render={({ field }) => (
                        <FormItem>
                          <FormLabel>الزمن</FormLabel>
                          <FormControl>
                            <Input placeholder="مثال: العصر الحديث، الخمسينيات..." {...field} data-testid="input-time" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="placeSetting" render={({ field }) => (
                        <FormItem>
                          <FormLabel>المكان</FormLabel>
                          <FormControl>
                            <Input placeholder="مثال: القاهرة، بيروت، الجزائر..." {...field} data-testid="input-place" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </CardContent>
                </Card>

                {characters.length >= 2 && (
                  <Card>
                    <CardContent className="p-8 space-y-6">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h2 className="font-serif text-xl font-bold mb-1">العلاقات بين الشخصيات</h2>
                          <p className="text-sm text-muted-foreground">حدد العلاقات بين شخصياتك (اختياري)</p>
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => addRel({ char1Index: 0, char2Index: 1, relationship: "" })}
                          data-testid="button-add-relationship"
                        >
                          <Plus className="w-4 h-4 ml-1" />
                          إضافة علاقة
                        </Button>
                      </div>

                      {relFields.map((field, index) => (
                        <div key={field.id} className="flex items-end gap-3">
                          <FormField control={form.control} name={`relationships.${index}.char1Index`} render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel>الشخصية الأولى</FormLabel>
                              <Select onValueChange={(v) => field.onChange(parseInt(v))} value={String(field.value)}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {characters.map((c, i) => (
                                    <SelectItem key={i} value={String(i)}>{c.name || `شخصية ${i + 1}`}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )} />
                          <FormField control={form.control} name={`relationships.${index}.char2Index`} render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel>الشخصية الثانية</FormLabel>
                              <Select onValueChange={(v) => field.onChange(parseInt(v))} value={String(field.value)}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {characters.map((c, i) => (
                                    <SelectItem key={i} value={String(i)}>{c.name || `شخصية ${i + 1}`}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )} />
                          <FormField control={form.control} name={`relationships.${index}.relationship`} render={({ field }) => (
                            <FormItem className="flex-[2]">
                              <FormLabel>العلاقة</FormLabel>
                              <FormControl>
                                <Input placeholder="مثال: أخوة، حب، صداقة..." {...field} data-testid={`input-rel-${index}`} />
                              </FormControl>
                            </FormItem>
                          )} />
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeRel(index)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {step >= 0 && (
              <div className="flex items-center justify-between gap-4 mt-8">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStep(Math.max(-1, step - 1))}
                  data-testid="button-prev-step"
                >
                  السابق
                </Button>
                {step < totalSteps ? (
                  <Button
                    type="button"
                    onClick={() => setStep(step + 1)}
                    disabled={!canNextStep()}
                    data-testid="button-next-step"
                  >
                    التالي
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || (projectType === "poetry" && !canNextStep())}
                    data-testid="button-create-project"
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        جارٍ الإنشاء والتوجيه للدفع...
                      </>
                    ) : projectType === "poetry" ? (
                      <>
                        <PenLine className="w-4 h-4 ml-2" />
                        أنشئ القصيدة وادفع
                      </>
                    ) : (
                      <>
                        <Feather className="w-4 h-4 ml-2" />
                        أنشئ المشروع وادفع
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </form>
        </Form>
      </main>

      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Crown className="w-5 h-5 text-amber-500" />
              لقد استنفدت حصتك المجانية الشهرية
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-muted-foreground text-sm leading-relaxed">
              الخطة المجانية تتيح لك إنشاء مشروع واحد وتوليد فصلين شهريًا لتجربة المنصة.
              قم بالترقية الآن لفتح إمكانيات غير محدودة مع أبو هاشم!
            </p>
            <ul className="space-y-1.5 text-sm list-disc list-inside text-muted-foreground">
              <li>مشاريع غير محدودة</li>
              <li>توليد فصول بلا حدود</li>
              <li>نشر في المعرض والمقالات</li>
              <li>دعم كامل من أبو هاشم</li>
            </ul>
            <div className="flex gap-2 pt-2">
              <Link href="/pricing" className="flex-1">
                <Button className="w-full" data-testid="button-upgrade-now">
                  <Crown className="w-4 h-4 ml-2" /> اطلع على الخطط
                </Button>
              </Link>
              <Button variant="outline" onClick={() => setShowUpgradeDialog(false)} data-testid="button-close-upgrade">
                لاحقًا
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
