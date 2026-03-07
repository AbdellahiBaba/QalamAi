import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import LtrNum from "@/components/ui/ltr-num";
import { ESSAY_SUBJECTS } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { ArrowRight, FileText, Globe, Loader2, Newspaper, CheckCircle2, Sparkles, X } from "lucide-react";
import { Link } from "wouter";
import { ThemeToggle } from "@/components/theme-toggle";

const SUBJECT_LABELS: Record<string, string> = {
  news: "أخبار",
  politics: "سياسة",
  science: "علوم",
  technology: "تكنولوجيا",
  economics: "اقتصاد",
  sports: "رياضة",
  weather: "طقس",
  culture: "ثقافة",
  health: "صحة",
  education: "تعليم",
  environment: "بيئة",
  opinion: "رأي",
  travel: "سفر",
  food: "طعام",
  fashion: "أزياء",
  entertainment: "ترفيه",
  history: "تاريخ",
  philosophy: "فلسفة",
};

const TONE_OPTIONS = [
  { value: "formal", label: "رسمي أكاديمي" },
  { value: "analytical", label: "تحليلي" },
  { value: "investigative", label: "استقصائي" },
  { value: "editorial", label: "افتتاحي / رأي" },
  { value: "conversational", label: "حواري خبير" },
  { value: "narrative", label: "سردي قصصي" },
  { value: "persuasive", label: "إقناعي" },
  { value: "satirical", label: "ساخر" },
  { value: "scientific", label: "علمي تبسيطي" },
  { value: "literary", label: "أدبي" },
  { value: "journalistic", label: "صحفي إخباري" },
];

const WORD_COUNT_OPTIONS = [
  { value: "2000", label: "٢٬٠٠٠ كلمة (مقال قصير)" },
  { value: "5000", label: "٥٬٠٠٠ كلمة (مقال متوسط)" },
  { value: "10000", label: "١٠٬٠٠٠ كلمة (مقال طويل)" },
  { value: "20000", label: "٢٠٬٠٠٠ كلمة (تقرير مفصل)" },
  { value: "37500", label: "٣٧٬٥٠٠ كلمة (تقرير شامل)" },
  { value: "custom", label: "عدد مخصص..." },
];

const essayFormSchema = z.object({
  title: z.string().min(1, "عنوان المقال مطلوب"),
  mainIdea: z.string().min(10, "يجب أن يكون الموضوع 10 أحرف على الأقل"),
  subject: z.string().min(1, "تصنيف الموضوع مطلوب"),
  essayTone: z.string().min(1, "نبرة الكتابة مطلوبة"),
  wordCount: z.string().min(1, "عدد الكلمات مطلوب"),
  customWordCount: z.string().optional().default("").refine(
    (val) => !val || (parseInt(val) >= 500 && parseInt(val) <= 50000),
    { message: "يجب أن يكون العدد بين 500 و 50,000" }
  ),
  targetAudience: z.string().optional().default(""),
  keyPoints: z.string().optional().default(""),
  timeSetting: z.string().optional().default(""),
  placeSetting: z.string().optional().default(""),
  backgroundInfo: z.string().optional().default(""),
  specificData: z.string().optional().default(""),
  allowDialect: z.boolean().default(false),
});

type EssayFormData = z.infer<typeof essayFormSchema>;

export default function NewEssay() {
  useDocumentTitle("مقال جديد — قلم AI");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [suggestingTitles, setSuggestingTitles] = useState(false);
  const [titleSuggestions, setTitleSuggestions] = useState<Array<{ title: string; reason: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestingFullProject, setSuggestingFullProject] = useState(false);
  const [fullProjectHint, setFullProjectHint] = useState("");
  const [showHintInput, setShowHintInput] = useState(false);

  const form = useForm<EssayFormData>({
    resolver: zodResolver(essayFormSchema),
    defaultValues: {
      title: "",
      mainIdea: "",
      subject: "",
      essayTone: "",
      wordCount: "5000",
      customWordCount: "",
      targetAudience: "",
      keyPoints: "",
      timeSetting: "",
      placeSetting: "",
      backgroundInfo: "",
      specificData: "",
      allowDialect: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: EssayFormData) => {
      const wordCount = data.wordCount === "custom"
        ? Math.max(500, Math.min(50000, parseInt(data.customWordCount) || 5000))
        : parseInt(data.wordCount);
      const pageCount = Math.ceil(wordCount / 250);
      const payload = {
        projectType: "essay",
        title: data.title,
        mainIdea: data.mainIdea,
        subject: data.subject,
        essayTone: data.essayTone,
        targetAudience: data.targetAudience || "",
        timeSetting: data.timeSetting || "",
        placeSetting: data.placeSetting || "",
        narrativePov: "",
        pageCount,
        characters: [],
        relationships: [],
        keyPoints: data.keyPoints || "",
        backgroundInfo: data.backgroundInfo || "",
        specificData: data.specificData || "",
        allowDialect: data.allowDialect,
      };
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
    onError: () => {
      toast({ title: "حدث خطأ", description: "فشل في إنشاء المشروع", variant: "destructive" });
    },
  });

  const handleSuggestTitles = async () => {
    const mainIdea = form.getValues("mainIdea");
    if (!mainIdea || mainIdea.length < 10) {
      toast({ title: "أدخل الموضوع الرئيسي أولاً", description: "يجب أن يكون الموضوع 10 أحرف على الأقل لاقتراح عناوين مناسبة", variant: "destructive" });
      return;
    }

    setSuggestingTitles(true);
    setShowSuggestions(false);
    try {
      const res = await apiRequest("POST", "/api/projects/suggest-titles", {
        mainIdea,
        projectType: "essay",
        subject: form.getValues("subject"),
        essayTone: form.getValues("essayTone"),
        targetAudience: form.getValues("targetAudience"),
      });
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

  const handleSuggestFullProject = async () => {
    if (!showHintInput) {
      setShowHintInput(true);
      return;
    }
    setSuggestingFullProject(true);
    try {
      const res = await apiRequest("POST", "/api/projects/suggest-full", {
        projectType: "essay",
        hint: fullProjectHint || undefined,
      });
      const data = await res.json();
      form.setValue("title", data.title, { shouldValidate: true });
      form.setValue("mainIdea", data.mainIdea, { shouldValidate: true });
      form.setValue("subject", data.subject || "", { shouldValidate: true });
      form.setValue("essayTone", data.essayTone || "", { shouldValidate: true });
      form.setValue("targetAudience", data.targetAudience || "", { shouldValidate: true });
      form.setValue("keyPoints", data.keyPoints || "", { shouldValidate: true });
      form.setValue("timeSetting", data.timeSetting || "", { shouldValidate: true });
      form.setValue("placeSetting", data.placeSetting || "", { shouldValidate: true });
      toast({ title: "تم اقتراح مشروع كامل — راجع التفاصيل وعدّلها كما تشاء" });
      setShowHintInput(false);
      setFullProjectHint("");
    } catch {
      toast({ title: "فشل في توليد الاقتراح", variant: "destructive" });
    } finally {
      setSuggestingFullProject(false);
    }
  };

  const onSubmit = (data: EssayFormData) => {
    createMutation.mutate(data);
  };

  const steps = [
    { title: "تفاصيل المقال", icon: FileText },
    { title: "السياق والمصادر", icon: Globe },
  ];

  const canNextStep = () => {
    if (step === 0) {
      const title = form.watch("title");
      const mainIdea = form.watch("mainIdea");
      const subject = form.watch("subject");
      const essayTone = form.watch("essayTone");
      const wordCount = form.watch("wordCount");
      const customWordCount = form.watch("customWordCount");
      const wordCountValid = wordCount && (wordCount !== "custom" || (customWordCount && parseInt(customWordCount) >= 500));
      return title && mainIdea && mainIdea.length >= 10 && subject && essayTone && wordCountValid;
    }
    return true;
  };

  const watchedSubject = form.watch("subject");
  const watchedTone = form.watch("essayTone");
  const watchedTitle = form.watch("title");
  const watchedMainIdea = form.watch("mainIdea");
  const watchedTargetAudience = form.watch("targetAudience");
  const watchedWordCount = form.watch("wordCount");
  const watchedCustomWordCount = form.watch("customWordCount");

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
              <Newspaper className="w-5 h-5 text-primary" />
              <span className="font-serif text-lg font-bold">مقال جديد</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex items-center justify-center gap-2 mb-10">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  i === step
                    ? "bg-primary text-primary-foreground"
                    : i < step
                    ? "bg-primary/10 text-primary cursor-pointer"
                    : "bg-muted text-muted-foreground"
                }`}
                data-testid={`button-step-${i}`}
              >
                <s.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{s.title}</span>
              </button>
              {i < steps.length - 1 && (
                <div className={`w-8 h-0.5 ${i < step ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
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
                {suggestingFullProject ? "أبو هاشم يفكّر..." : "أبو هاشم يقترح لك مشروعاً كاملاً"}
              </Button>
              {showHintInput && (
                <div className="flex items-center gap-2 w-full max-w-md">
                  <Input
                    value={fullProjectHint}
                    onChange={(e) => setFullProjectHint(e.target.value)}
                    placeholder="كلمة مفتاحية أو موضوع (اختياري)..."
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

            {step === 0 && (
              <Card>
                <CardContent className="p-5 sm:p-8 space-y-6">
                  <div className="space-y-2 mb-6">
                    <h2 className="font-serif text-xl sm:text-2xl font-bold">تفاصيل المقال</h2>
                    <p className="text-sm text-muted-foreground">أدخل المعلومات الأساسية لمقالك المهني</p>
                  </div>

                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>عنوان المقال</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input placeholder="مثال: تحديات الأمن الغذائي في المنطقة العربية" {...field} data-testid="input-title" />
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
                      <FormLabel>الموضوع الرئيسي</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="اشرح الموضوع الذي تريد الكتابة عنه بالتفصيل..."
                          className="min-h-[120px]"
                          {...field}
                          data-testid="input-main-idea"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="subject" render={({ field }) => (
                      <FormItem>
                        <FormLabel>تصنيف الموضوع</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-subject">
                              <SelectValue placeholder="اختر التصنيف" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ESSAY_SUBJECTS.map((subj) => (
                              <SelectItem key={subj} value={subj}>{SUBJECT_LABELS[subj] || subj}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="essayTone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>نبرة الكتابة</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-tone">
                              <SelectValue placeholder="اختر النبرة" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TONE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="wordCount" render={({ field }) => (
                      <FormItem>
                        <FormLabel>عدد الكلمات المطلوب</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-word-count">
                              <SelectValue placeholder="اختر حجم المقال" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {WORD_COUNT_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {watchedWordCount === "custom" && (
                      <FormField control={form.control} name="customWordCount" render={({ field }) => (
                        <FormItem>
                          <FormLabel>العدد المخصص (500 - 50,000)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={500}
                              max={50000}
                              placeholder="مثال: 8000"
                              {...field}
                              data-testid="input-custom-word-count"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}
                  </div>

                  <FormField control={form.control} name="targetAudience" render={({ field }) => (
                    <FormItem>
                      <FormLabel>الجمهور المستهدف (اختياري)</FormLabel>
                      <FormControl>
                        <Input placeholder="مثال: صناع القرار، الباحثون، القارئ العام..." {...field} data-testid="input-target-audience" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="keyPoints" render={({ field }) => (
                    <FormItem>
                      <FormLabel>النقاط الرئيسية المراد تغطيتها (اختياري)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="اذكر النقاط الأساسية التي تريد أن يتناولها المقال، كل نقطة في سطر..."
                          className="min-h-[100px]"
                          {...field}
                          data-testid="input-key-points"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <Card>
                  <CardContent className="p-5 sm:p-8 space-y-6">
                    <div className="space-y-2 mb-6">
                      <h2 className="font-serif text-xl sm:text-2xl font-bold">السياق والمصادر</h2>
                      <p className="text-sm text-muted-foreground">أضف سياقًا إضافيًا لإثراء المقال (اختياري)</p>
                    </div>

                    <FormField control={form.control} name="timeSetting" render={({ field }) => (
                      <FormItem>
                        <FormLabel>السياق الزمني</FormLabel>
                        <FormControl>
                          <Input placeholder="مثال: الأحداث الجارية في 2024، عقب قمة المناخ..." {...field} data-testid="input-time-context" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="placeSetting" render={({ field }) => (
                      <FormItem>
                        <FormLabel>المنطقة / البلد محل التركيز</FormLabel>
                        <FormControl>
                          <Input placeholder="مثال: الشرق الأوسط، مصر، الخليج العربي..." {...field} data-testid="input-place-focus" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="backgroundInfo" render={({ field }) => (
                      <FormItem>
                        <FormLabel>معلومات خلفية</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="أي معلومات أو سياق تاريخي يساعد في فهم الموضوع..."
                            className="min-h-[100px]"
                            {...field}
                            data-testid="input-background-info"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="specificData" render={({ field }) => (
                      <FormItem>
                        <FormLabel>بيانات أو حقائق محددة للتضمين</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="أرقام، إحصائيات، اقتباسات، أو حقائق تريد تضمينها في المقال..."
                            className="min-h-[100px]"
                            {...field}
                            data-testid="input-specific-data"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <h3 className="font-serif text-lg font-bold">ملخص المقال</h3>
                    </div>
                    <div className="space-y-3 text-sm">
                      {watchedTitle && (
                        <div className="flex gap-2">
                          <span className="text-muted-foreground shrink-0">العنوان:</span>
                          <span className="font-medium" data-testid="text-summary-title">{watchedTitle}</span>
                        </div>
                      )}
                      {watchedSubject && (
                        <div className="flex gap-2">
                          <span className="text-muted-foreground shrink-0">التصنيف:</span>
                          <span className="font-medium" data-testid="text-summary-subject">{SUBJECT_LABELS[watchedSubject] || watchedSubject}</span>
                        </div>
                      )}
                      {watchedTone && (
                        <div className="flex gap-2">
                          <span className="text-muted-foreground shrink-0">النبرة:</span>
                          <span className="font-medium" data-testid="text-summary-tone">
                            {TONE_OPTIONS.find(t => t.value === watchedTone)?.label || watchedTone}
                          </span>
                        </div>
                      )}
                      {watchedTargetAudience && (
                        <div className="flex gap-2">
                          <span className="text-muted-foreground shrink-0">الجمهور:</span>
                          <span className="font-medium" data-testid="text-summary-audience">{watchedTargetAudience}</span>
                        </div>
                      )}
                      {watchedMainIdea && (
                        <div className="flex gap-2">
                          <span className="text-muted-foreground shrink-0">الموضوع:</span>
                          <span className="font-medium line-clamp-2" data-testid="text-summary-idea">{watchedMainIdea}</span>
                        </div>
                      )}
                      {watchedWordCount && (
                        <div className="flex gap-2">
                          <span className="text-muted-foreground shrink-0">الحجم:</span>
                          <span className="font-medium" data-testid="text-summary-word-count">
                            {watchedWordCount === "custom"
                              ? <><LtrNum>{parseInt(watchedCustomWordCount || "0").toLocaleString("ar-EG")}</LtrNum> كلمة</>

                              : WORD_COUNT_OPTIONS.find(o => o.value === watchedWordCount)?.label || watchedWordCount}
                          </span>
                        </div>
                      )}
                      <div className="mt-4 rounded-md bg-primary/5 border border-primary/10 p-4">
                        <p className="font-medium text-foreground mb-1">هيكل المقال المتوقع</p>
                        <p className="text-muted-foreground">سيتم إنشاء مقال احترافي مقسّم إلى أقسام منظمة تشمل: المقدمة، صلب الموضوع بأقسامه الفرعية، والخاتمة مع التوصيات.</p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-md bg-muted/50 border p-3 text-sm text-muted-foreground">
                      <p>سعر المقال: <span className="font-bold text-foreground" data-testid="text-essay-price">١٩.٩٩ دولار</span></p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex items-center justify-between gap-4 mt-8">
              {step > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  data-testid="button-prev-step"
                >
                  السابق
                </Button>
              ) : (
                <div />
              )}

              {step < steps.length - 1 ? (
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
                  disabled={createMutation.isPending}
                  data-testid="button-create-essay"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      جارٍ الإنشاء...
                    </>
                  ) : (
                    "إنشاء المقال والدفع"
                  )}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </main>
    </div>
  );
}
