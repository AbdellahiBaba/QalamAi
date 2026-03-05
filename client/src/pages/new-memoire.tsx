import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useForm } from "react-hook-form";
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
import { Slider } from "@/components/ui/slider";
import { ArrowRight, GraduationCap, Loader2, Sparkles, X, BookOpen, Building2, FlaskConical, CheckCircle2, Info } from "lucide-react";
import { Link } from "wouter";
import { ThemeToggle } from "@/components/theme-toggle";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LtrNum from "@/components/ui/ltr-num";
import {
  getUniversitiesByCountry,
  getFacultiesByUniversity,
  getDepartmentsByFaculty,
  getMethodologiesByContext,
  getCitationStyleByContext,
  getMethodologiesByFaculty,
  getCitationStylesByFaculty,
  ALL_METHODOLOGY_OPTIONS,
  ALL_CITATION_STYLES,
} from "@/data/universities";

const ARAB_COUNTRIES = [
  { value: "sa", label: "المملكة العربية السعودية" },
  { value: "eg", label: "مصر" },
  { value: "dz", label: "الجزائر" },
  { value: "ma", label: "المغرب" },
  { value: "tn", label: "تونس" },
  { value: "iq", label: "العراق" },
  { value: "sy", label: "سوريا" },
  { value: "jo", label: "الأردن" },
  { value: "lb", label: "لبنان" },
  { value: "ae", label: "الإمارات العربية المتحدة" },
  { value: "kw", label: "الكويت" },
  { value: "qa", label: "قطر" },
  { value: "bh", label: "البحرين" },
  { value: "om", label: "عُمان" },
  { value: "ye", label: "اليمن" },
  { value: "ly", label: "ليبيا" },
  { value: "sd", label: "السودان" },
  { value: "mr", label: "موريتانيا" },
  { value: "so", label: "الصومال" },
  { value: "dj", label: "جيبوتي" },
  { value: "km", label: "جزر القمر" },
  { value: "ps", label: "فلسطين" },
];

const ACADEMIC_FIELDS = [
  { value: "sciences", label: "العلوم" },
  { value: "humanities", label: "العلوم الإنسانية" },
  { value: "law", label: "القانون والحقوق" },
  { value: "medicine", label: "الطب والعلوم الصحية" },
  { value: "engineering", label: "الهندسة" },
  { value: "economics", label: "الاقتصاد والتجارة" },
  { value: "education", label: "علوم التربية" },
  { value: "literature", label: "الأدب واللغات" },
  { value: "media", label: "الإعلام والاتصال" },
  { value: "computer_science", label: "علوم الحاسوب والمعلوماتية" },
  { value: "political_science", label: "العلوم السياسية" },
  { value: "sociology", label: "علم الاجتماع" },
  { value: "psychology", label: "علم النفس" },
  { value: "islamic_studies", label: "الدراسات الإسلامية" },
  { value: "agriculture", label: "العلوم الزراعية" },
  { value: "architecture", label: "العمارة والتخطيط" },
  { value: "pharmacy", label: "الصيدلة" },
  { value: "management", label: "الإدارة والتسيير" },
];

const OTHER_VALUE = "__other__";

const memoireFormSchema = z.object({
  title: z.string().min(1, "عنوان البحث مطلوب"),
  mainIdea: z.string().min(10, "يجب أن تكون إشكالية البحث 10 أحرف على الأقل"),
  memoireField: z.string().min(1, "التخصص الأكاديمي مطلوب"),
  memoireDegreeLevel: z.string().min(1, "المستوى الأكاديمي مطلوب"),
  memoireCountry: z.string().min(1, "البلد مطلوب"),
  memoireUniversity: z.string().min(1, "اسم الجامعة مطلوب"),
  memoireFaculty: z.string().min(1, "اسم الكلية مطلوب"),
  memoireDepartment: z.string().min(1, "اسم القسم مطلوب"),
  memoireMethodology: z.string().min(1, "المنهجية مطلوبة"),
  memoireCitationStyle: z.string().min(1, "نظام التوثيق مطلوب"),
  memoirePageTarget: z.number().min(50).max(300),
  memoireChapterCount: z.number().min(3).max(8),
  memoireHypotheses: z.string().optional().default(""),
  memoireKeywords: z.string().optional().default(""),
  memoireUserData: z.string().optional().default(""),
});

type MemoireFormData = z.infer<typeof memoireFormSchema>;

export default function NewMemoire() {
  useDocumentTitle("مذكرة تخرج جديدة — قلم AI");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [suggestingTitles, setSuggestingTitles] = useState(false);
  const [titleSuggestions, setTitleSuggestions] = useState<Array<{ title: string; reason: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestingFullProject, setSuggestingFullProject] = useState(false);
  const [fullProjectHint, setFullProjectHint] = useState("");
  const [showHintInput, setShowHintInput] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  const [universityOther, setUniversityOther] = useState(false);
  const [facultyOther, setFacultyOther] = useState(false);
  const [departmentOther, setDepartmentOther] = useState(false);
  const [methodologyOther, setMethodologyOther] = useState(false);
  const [citationOther, setCitationOther] = useState(false);

  const [customUniversity, setCustomUniversity] = useState("");
  const [customFaculty, setCustomFaculty] = useState("");
  const [customDepartment, setCustomDepartment] = useState("");
  const [customMethodology, setCustomMethodology] = useState("");
  const [customCitation, setCustomCitation] = useState("");
  const aiPopulatingRef = useRef(false);

  const form = useForm<MemoireFormData>({
    resolver: zodResolver(memoireFormSchema),
    defaultValues: {
      title: "",
      mainIdea: "",
      memoireField: "",
      memoireDegreeLevel: "",
      memoireCountry: "",
      memoireUniversity: "",
      memoireFaculty: "",
      memoireDepartment: "",
      memoireMethodology: "",
      memoireCitationStyle: "",
      memoirePageTarget: 100,
      memoireChapterCount: 5,
      memoireHypotheses: "",
      memoireKeywords: "",
      memoireUserData: "",
    },
  });

  const watchedCountry = form.watch("memoireCountry");
  const watchedUniversity = form.watch("memoireUniversity");
  const watchedFaculty = form.watch("memoireFaculty");
  const watchedField = form.watch("memoireField");
  const watchedTitle = form.watch("title");
  const watchedMainIdea = form.watch("mainIdea");
  const watchedDepartment = form.watch("memoireDepartment");
  const watchedMethodology = form.watch("memoireMethodology");
  const watchedCitationStyle = form.watch("memoireCitationStyle");
  const watchedPageTarget = form.watch("memoirePageTarget");
  const watchedChapterCount = form.watch("memoireChapterCount");
  const watchedHypotheses = form.watch("memoireHypotheses");
  const watchedKeywords = form.watch("memoireKeywords");

  const universities = watchedCountry ? getUniversitiesByCountry(watchedCountry) : [];
  const faculties = (watchedCountry && watchedUniversity && !universityOther)
    ? getFacultiesByUniversity(watchedCountry, watchedUniversity) : [];
  const departments = (watchedCountry && watchedUniversity && watchedFaculty && !universityOther && !facultyOther)
    ? getDepartmentsByFaculty(watchedCountry, watchedUniversity, watchedFaculty) : [];

  const contextMethodologies = (watchedCountry && watchedUniversity && !universityOther)
    ? (watchedFaculty && !facultyOther
        ? getMethodologiesByFaculty(watchedCountry, watchedUniversity, watchedFaculty, watchedField || "")
        : watchedField
          ? getMethodologiesByContext(watchedCountry, watchedUniversity, watchedField)
          : ALL_METHODOLOGY_OPTIONS.map(m => m.value))
    : ALL_METHODOLOGY_OPTIONS.map(m => m.value);

  const contextCitationStyles = (watchedCountry && watchedUniversity && !universityOther)
    ? (watchedFaculty && !facultyOther
        ? getCitationStylesByFaculty(watchedCountry, watchedUniversity, watchedFaculty, watchedField || "")
        : watchedField
          ? (() => {
              const recommended = getCitationStyleByContext(watchedCountry, watchedUniversity, watchedField);
              const allMap = new Map(ALL_CITATION_STYLES.map(c => [c.value, c]));
              const primary = allMap.get(recommended);
              if (!primary) return ALL_CITATION_STYLES;
              const result = [primary];
              for (const c of ALL_CITATION_STYLES) {
                if (c.value !== primary.value) result.push(c);
              }
              return result;
            })()
          : ALL_CITATION_STYLES)
    : ALL_CITATION_STYLES;

  useEffect(() => {
    if (watchedCountry && !aiPopulatingRef.current) {
      form.setValue("memoireUniversity", "");
      form.setValue("memoireFaculty", "");
      form.setValue("memoireDepartment", "");
      setUniversityOther(false);
      setFacultyOther(false);
      setDepartmentOther(false);
      setCustomUniversity("");
      setCustomFaculty("");
      setCustomDepartment("");
    }
  }, [watchedCountry]);

  useEffect(() => {
    if (watchedUniversity && !universityOther && !aiPopulatingRef.current) {
      form.setValue("memoireFaculty", "");
      form.setValue("memoireDepartment", "");
      setFacultyOther(false);
      setDepartmentOther(false);
      setCustomFaculty("");
      setCustomDepartment("");
    }
  }, [watchedUniversity, universityOther, form]);

  useEffect(() => {
    if (watchedFaculty && !facultyOther && !aiPopulatingRef.current) {
      form.setValue("memoireDepartment", "");
      setDepartmentOther(false);
      setCustomDepartment("");
      setMethodologyOther(false);
      setCustomMethodology("");
      form.setValue("memoireMethodology", "");
      setCitationOther(false);
      setCustomCitation("");
      form.setValue("memoireCitationStyle", "");
    }
  }, [watchedFaculty, facultyOther, form]);

  const primaryCitationValue = contextCitationStyles.length > 0 ? contextCitationStyles[0].value : "";
  const citationTrigger = `${primaryCitationValue}_${watchedFaculty}_${watchedField}`;
  useEffect(() => {
    if (primaryCitationValue && !citationOther && !aiPopulatingRef.current) {
      form.setValue("memoireCitationStyle", primaryCitationValue);
    }
  }, [citationTrigger, citationOther, form]);

  const createMutation = useMutation({
    mutationFn: async (data: MemoireFormData) => {
      const payload = {
        projectType: "memoire",
        title: data.title,
        mainIdea: data.mainIdea,
        timeSetting: "academic",
        placeSetting: data.memoireCountry,
        narrativePov: "academic",
        pageCount: data.memoirePageTarget,
        characters: [],
        relationships: [],
        memoireField: data.memoireField,
        memoireDegreeLevel: data.memoireDegreeLevel,
        memoireCountry: data.memoireCountry,
        memoireUniversity: data.memoireUniversity,
        memoireFaculty: data.memoireFaculty,
        memoireDepartment: data.memoireDepartment,
        memoireMethodology: data.memoireMethodology,
        memoireCitationStyle: data.memoireCitationStyle,
        memoirePageTarget: data.memoirePageTarget,
        memoireChapterCount: data.memoireChapterCount,
        memoireHypotheses: data.memoireHypotheses || "",
        memoireKeywords: data.memoireKeywords || "",
        memoireUserData: data.memoireUserData || "",
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
        toast({ title: "تم إنشاء المذكرة بنجاح" });
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

  const handleSuggestTitles = async () => {
    const mainIdea = form.getValues("mainIdea");
    if (!mainIdea || mainIdea.length < 10) {
      toast({ title: "أدخل إشكالية البحث أولاً", description: "يجب أن تكون الإشكالية 10 أحرف على الأقل لاقتراح عناوين مناسبة", variant: "destructive" });
      return;
    }

    setSuggestingTitles(true);
    setShowSuggestions(false);
    try {
      const res = await apiRequest("POST", "/api/projects/suggest-titles", {
        mainIdea,
        projectType: "memoire",
        memoireField: form.getValues("memoireField"),
        memoireMethodology: form.getValues("memoireMethodology"),
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
        projectType: "memoire",
        hint: fullProjectHint || undefined,
      });
      const data = await res.json();
      aiPopulatingRef.current = true;
      form.setValue("title", data.title, { shouldValidate: true });
      form.setValue("mainIdea", data.mainIdea, { shouldValidate: true });
      if (data.memoireField) form.setValue("memoireField", data.memoireField, { shouldValidate: true });
      if (data.memoireKeywords) form.setValue("memoireKeywords", data.memoireKeywords, { shouldValidate: true });
      if (data.memoireMethodology) form.setValue("memoireMethodology", data.memoireMethodology, { shouldValidate: true });
      if (data.memoireCitationStyle) form.setValue("memoireCitationStyle", data.memoireCitationStyle, { shouldValidate: true });
      if (data.memoireCountry) form.setValue("memoireCountry", data.memoireCountry, { shouldValidate: true });
      if (data.memoireUniversity) form.setValue("memoireUniversity", data.memoireUniversity, { shouldValidate: true });
      if (data.memoireFaculty) form.setValue("memoireFaculty", data.memoireFaculty, { shouldValidate: true });
      if (data.memoireDepartment) form.setValue("memoireDepartment", data.memoireDepartment, { shouldValidate: true });
      if (data.memoireHypotheses) form.setValue("memoireHypotheses", data.memoireHypotheses, { shouldValidate: true });
      if (data.memoireChapterCount) form.setValue("memoireChapterCount", Number(data.memoireChapterCount), { shouldValidate: true });
      if (data.memoirePageTarget) form.setValue("memoirePageTarget", Number(data.memoirePageTarget), { shouldValidate: true });
      setTimeout(() => { aiPopulatingRef.current = false; }, 500);
      toast({ title: "تم اقتراح مشروع كامل — راجع التفاصيل وعدّلها كما تشاء" });
      setShowHintInput(false);
      setFullProjectHint("");
    } catch {
      toast({ title: "فشل في توليد الاقتراح", variant: "destructive" });
    } finally {
      setSuggestingFullProject(false);
    }
  };

  const onSubmit = (data: MemoireFormData) => {
    createMutation.mutate(data);
  };

  const steps = [
    { title: "معلومات البحث", icon: BookOpen },
    { title: "معلومات الجامعة", icon: Building2 },
    { title: "إعدادات البحث", icon: FlaskConical },
  ];

  const canNextStep = () => {
    if (step === 0) {
      const title = form.watch("title");
      const mainIdea = form.watch("mainIdea");
      const field = form.watch("memoireField");
      const degreeLevel = form.watch("memoireDegreeLevel");
      return title && mainIdea && mainIdea.length >= 10 && field && degreeLevel;
    }
    if (step === 1) {
      const country = form.watch("memoireCountry");
      const university = form.watch("memoireUniversity");
      const faculty = form.watch("memoireFaculty");
      const department = form.watch("memoireDepartment");
      return country && university && faculty && department;
    }
    return true;
  };

  const handleUniversitySelect = (value: string) => {
    if (value === OTHER_VALUE) {
      setUniversityOther(true);
      setFacultyOther(true);
      setDepartmentOther(true);
      form.setValue("memoireUniversity", "");
      form.setValue("memoireFaculty", "");
      form.setValue("memoireDepartment", "");
      setCustomUniversity("");
      setCustomFaculty("");
      setCustomDepartment("");
    } else {
      setUniversityOther(false);
      setFacultyOther(false);
      setDepartmentOther(false);
      setCustomUniversity("");
      setCustomFaculty("");
      setCustomDepartment("");
      form.setValue("memoireUniversity", value);
      form.setValue("memoireFaculty", "");
      form.setValue("memoireDepartment", "");
    }
  };

  const handleFacultySelect = (value: string) => {
    if (value === OTHER_VALUE) {
      setFacultyOther(true);
      setDepartmentOther(true);
      form.setValue("memoireFaculty", "");
      form.setValue("memoireDepartment", "");
      setCustomFaculty("");
      setCustomDepartment("");
    } else {
      setFacultyOther(false);
      setDepartmentOther(false);
      setCustomFaculty("");
      setCustomDepartment("");
      form.setValue("memoireFaculty", value);
      form.setValue("memoireDepartment", "");
    }
  };

  const handleDepartmentSelect = (value: string) => {
    if (value === OTHER_VALUE) {
      setDepartmentOther(true);
      form.setValue("memoireDepartment", "");
      setCustomDepartment("");
    } else {
      setDepartmentOther(false);
      setCustomDepartment("");
      form.setValue("memoireDepartment", value);
    }
  };

  const handleMethodologySelect = (value: string) => {
    if (value === OTHER_VALUE) {
      setMethodologyOther(true);
      form.setValue("memoireMethodology", "");
    } else {
      setMethodologyOther(false);
      form.setValue("memoireMethodology", value);
    }
  };

  const handleCitationSelect = (value: string) => {
    if (value === OTHER_VALUE) {
      setCitationOther(true);
      form.setValue("memoireCitationStyle", "");
    } else {
      setCitationOther(false);
      form.setValue("memoireCitationStyle", value);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              <span className="font-serif text-lg font-bold">مذكرة تخرج جديدة</span>
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
                    <h2 className="font-serif text-xl sm:text-2xl font-bold">معلومات البحث</h2>
                    <p className="text-sm text-muted-foreground">أدخل المعلومات الأساسية لمذكرة التخرج</p>
                  </div>

                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>عنوان البحث</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input placeholder="مثال: أثر التعليم الإلكتروني على التحصيل الدراسي في الجامعات العربية" {...field} data-testid="input-title" />
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
                          <div className="flex items-center justify-between gap-4 mb-3">
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
                      <FormLabel>إشكالية البحث</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="صِغ إشكالية بحثك الأكاديمية: ما هي الفجوة المعرفية أو المشكلة العلمية التي يسعى بحثك لمعالجتها؟ ما هو السؤال المحوري الذي تطرحه؟"
                          className="min-h-[120px]"
                          {...field}
                          data-testid="input-main-idea"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-1">
                        حدد الفجوة البحثية أو التناقض العلمي الذي تتناوله، والسؤال المحوري الذي يسعى البحث للإجابة عنه
                      </p>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="memoireField" render={({ field }) => (
                    <FormItem>
                      <FormLabel>التخصص الأكاديمي</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-field">
                            <SelectValue placeholder="اختر التخصص" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ACADEMIC_FIELDS.map((f) => (
                            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="memoireDegreeLevel" render={({ field }) => (
                    <FormItem>
                      <FormLabel>المستوى الأكاديمي</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-degree-level">
                            <SelectValue placeholder="اختر المستوى" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="licence">ليسانس / بكالوريوس</SelectItem>
                          <SelectItem value="master">ماستر / ماجستير</SelectItem>
                          <SelectItem value="doctorate">دكتوراه</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            )}

            {step === 1 && (
              <Card>
                <CardContent className="p-5 sm:p-8 space-y-6">
                  <div className="space-y-2 mb-6">
                    <h2 className="font-serif text-xl sm:text-2xl font-bold">معلومات الجامعة</h2>
                    <p className="text-sm text-muted-foreground">اختر جامعتك وكليتك لتكييف المذكرة حسب معاييرها الأكاديمية</p>
                  </div>

                  <FormField control={form.control} name="memoireCountry" render={({ field }) => (
                    <FormItem>
                      <FormLabel>البلد</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-country">
                            <SelectValue placeholder="اختر البلد" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ARAB_COUNTRIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="memoireUniversity" render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم الجامعة</FormLabel>
                      {!universityOther && universities.length > 0 ? (
                        <Select
                          onValueChange={handleUniversitySelect}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-university">
                              <SelectValue placeholder="اختر الجامعة" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {universities.map((u) => (
                              <SelectItem key={u} value={u}>{u}</SelectItem>
                            ))}
                            <SelectItem value={OTHER_VALUE}>أخرى (إدخال يدوي)</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : universityOther || universities.length === 0 ? (
                        <div className="space-y-2">
                          <FormControl>
                            <Input
                              placeholder="أدخل اسم الجامعة"
                              value={customUniversity}
                              onChange={(e) => {
                                setCustomUniversity(e.target.value);
                                field.onChange(e.target.value);
                              }}
                              data-testid="input-university"
                            />
                          </FormControl>
                          {universities.length > 0 && (
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              className="text-xs p-0 h-auto"
                              onClick={() => { setUniversityOther(false); setFacultyOther(false); setDepartmentOther(false); form.setValue("memoireUniversity", ""); }}
                              data-testid="button-back-to-university-list"
                            >
                              العودة إلى القائمة
                            </Button>
                          )}
                        </div>
                      ) : null}
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="memoireFaculty" render={({ field }) => (
                      <FormItem>
                        <FormLabel>الكلية</FormLabel>
                        {!facultyOther && faculties.length > 0 ? (
                          <Select
                            onValueChange={handleFacultySelect}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-faculty">
                                <SelectValue placeholder="اختر الكلية" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {faculties.map((f) => (
                                <SelectItem key={f} value={f}>{f}</SelectItem>
                              ))}
                              <SelectItem value={OTHER_VALUE}>أخرى (إدخال يدوي)</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="space-y-2">
                            <FormControl>
                              <Input
                                placeholder="أدخل اسم الكلية"
                                value={customFaculty}
                                onChange={(e) => {
                                  setCustomFaculty(e.target.value);
                                  field.onChange(e.target.value);
                                }}
                                data-testid="input-faculty"
                              />
                            </FormControl>
                            {faculties.length > 0 && (
                              <Button
                                type="button"
                                variant="link"
                                size="sm"
                                className="text-xs p-0 h-auto"
                                onClick={() => { setFacultyOther(false); setDepartmentOther(false); form.setValue("memoireFaculty", ""); }}
                                data-testid="button-back-to-faculty-list"
                              >
                                العودة إلى القائمة
                              </Button>
                            )}
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="memoireDepartment" render={({ field }) => (
                      <FormItem>
                        <FormLabel>القسم</FormLabel>
                        {!departmentOther && departments.length > 0 ? (
                          <Select
                            onValueChange={handleDepartmentSelect}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-department">
                                <SelectValue placeholder="اختر القسم" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {departments.map((d) => (
                                <SelectItem key={d} value={d}>{d}</SelectItem>
                              ))}
                              <SelectItem value={OTHER_VALUE}>أخرى (إدخال يدوي)</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="space-y-2">
                            <FormControl>
                              <Input
                                placeholder="أدخل اسم القسم"
                                value={customDepartment}
                                onChange={(e) => {
                                  setCustomDepartment(e.target.value);
                                  field.onChange(e.target.value);
                                }}
                                data-testid="input-department"
                              />
                            </FormControl>
                            {departments.length > 0 && (
                              <Button
                                type="button"
                                variant="link"
                                size="sm"
                                className="text-xs p-0 h-auto"
                                onClick={() => { setDepartmentOther(false); form.setValue("memoireDepartment", ""); }}
                                data-testid="button-back-to-department-list"
                              >
                                العودة إلى القائمة
                              </Button>
                            )}
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <div className="space-y-6">
              <Card>
                <CardContent className="p-5 sm:p-8 space-y-6">
                  <div className="space-y-2 mb-6">
                    <h2 className="font-serif text-xl sm:text-2xl font-bold">إعدادات البحث</h2>
                    <p className="text-sm text-muted-foreground">حدد المنهجية ونظام التوثيق وتفاصيل أخرى</p>
                  </div>

                  {primaryCitationValue && !universityOther && (
                    <div className="rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 p-3 flex items-start gap-2 text-sm">
                      <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">
                        تم تحديد نظام التوثيق وتصفية المنهجيات المتاحة بناءً على معايير
                        <span className="font-medium text-foreground"> {watchedUniversity} </span>
                        في تخصص
                        <span className="font-medium text-foreground"> {ACADEMIC_FIELDS.find(f => f.value === watchedField)?.label || watchedField}</span>.
                        يمكنك تعديلها حسب الحاجة.
                      </span>
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="memoireMethodology" render={({ field }) => (
                      <FormItem>
                        <FormLabel>منهجية البحث</FormLabel>
                        {!methodologyOther ? (
                          <Select onValueChange={handleMethodologySelect} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-methodology">
                                <SelectValue placeholder="اختر المنهجية" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {contextMethodologies.map((m) => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                              ))}
                              <SelectItem value={OTHER_VALUE}>أخرى (إدخال يدوي)</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="space-y-2">
                            <FormControl>
                              <Input
                                placeholder="أدخل المنهجية"
                                value={customMethodology}
                                onChange={(e) => {
                                  setCustomMethodology(e.target.value);
                                  field.onChange(e.target.value);
                                }}
                                data-testid="input-methodology"
                              />
                            </FormControl>
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              className="text-xs p-0 h-auto"
                              onClick={() => { setMethodologyOther(false); form.setValue("memoireMethodology", ""); }}
                              data-testid="button-back-to-methodology-list"
                            >
                              العودة إلى القائمة
                            </Button>
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="memoireCitationStyle" render={({ field }) => (
                      <FormItem>
                        <FormLabel>نظام التوثيق</FormLabel>
                        {!citationOther ? (
                          <Select onValueChange={handleCitationSelect} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-citation-style">
                                <SelectValue placeholder="اختر نظام التوثيق" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {contextCitationStyles.map((c) => (
                                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                              ))}
                              <SelectItem value={OTHER_VALUE}>أخرى (إدخال يدوي)</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="space-y-2">
                            <FormControl>
                              <Input
                                placeholder="أدخل نظام التوثيق"
                                value={customCitation}
                                onChange={(e) => {
                                  setCustomCitation(e.target.value);
                                  field.onChange(e.target.value);
                                }}
                                data-testid="input-citation"
                              />
                            </FormControl>
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              className="text-xs p-0 h-auto"
                              onClick={() => { setCitationOther(false); form.setValue("memoireCitationStyle", ""); }}
                              data-testid="button-back-to-citation-list"
                            >
                              العودة إلى القائمة
                            </Button>
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="memoirePageTarget" render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        عدد الصفحات المستهدف: <LtrNum>{watchedPageTarget}</LtrNum> صفحة
                      </FormLabel>
                      <FormControl>
                        <Slider
                          min={50}
                          max={300}
                          step={10}
                          value={[field.value]}
                          onValueChange={(v) => field.onChange(v[0])}
                          data-testid="slider-page-target"
                        />
                      </FormControl>
                      <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground mt-1">
                        <span><LtrNum>50</LtrNum> صفحة</span>
                        <span><LtrNum>300</LtrNum> صفحة</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="memoireChapterCount" render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        عدد الفصول: <LtrNum>{watchedChapterCount}</LtrNum>
                      </FormLabel>
                      <FormControl>
                        <Slider
                          min={3}
                          max={8}
                          step={1}
                          value={[field.value]}
                          onValueChange={(v) => field.onChange(v[0])}
                          data-testid="slider-chapter-count"
                        />
                      </FormControl>
                      <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground mt-1">
                        <span><LtrNum>3</LtrNum> فصول</span>
                        <span><LtrNum>8</LtrNum> فصول</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="memoireHypotheses" render={({ field }) => (
                    <FormItem>
                      <FormLabel>فرضيات البحث (اختياري)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="اكتب فرضيات البحث إن وجدت..."
                          className="min-h-[80px]"
                          {...field}
                          data-testid="input-hypotheses"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="memoireKeywords" render={({ field }) => (
                    <FormItem>
                      <FormLabel>الكلمات المفتاحية (اختياري)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="مثال: التعليم الإلكتروني، التحصيل الدراسي، الجامعات العربية"
                          {...field}
                          data-testid="input-keywords"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="memoireUserData" render={({ field }) => (
                    <FormItem>
                      <FormLabel>بيانات ومراجع خاصة (اختياري)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="ألصق هنا أي بيانات أو مراجع أو استبيانات أو نتائج ميدانية تريد تضمينها في المذكرة..."
                          className="min-h-[100px]"
                          {...field}
                          data-testid="input-user-data"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-1">
                        يمكنك إضافة مراجع، نتائج استبيانات، إحصائيات، أو أي مادة تريد أن يعتمد عليها أبو هاشم في كتابة المذكرة
                      </p>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <h3 className="font-serif text-lg font-bold">ملخص المذكرة</h3>
                    </div>
                    <div className="space-y-3 text-sm">
                      {watchedTitle && (
                        <div className="flex gap-2">
                          <span className="text-muted-foreground shrink-0">العنوان:</span>
                          <span className="font-medium" data-testid="text-summary-title">{watchedTitle}</span>
                        </div>
                      )}
                      {watchedField && (
                        <div className="flex gap-2">
                          <span className="text-muted-foreground shrink-0">التخصص:</span>
                          <span className="font-medium" data-testid="text-summary-field">
                            {ACADEMIC_FIELDS.find(f => f.value === watchedField)?.label || watchedField}
                          </span>
                        </div>
                      )}
                      {watchedUniversity && (
                        <div className="flex gap-2">
                          <span className="text-muted-foreground shrink-0">الجامعة:</span>
                          <span className="font-medium" data-testid="text-summary-university">{watchedUniversity}</span>
                        </div>
                      )}
                      {watchedCountry && (
                        <div className="flex gap-2">
                          <span className="text-muted-foreground shrink-0">البلد:</span>
                          <span className="font-medium" data-testid="text-summary-country">
                            {ARAB_COUNTRIES.find(c => c.value === watchedCountry)?.label || watchedCountry}
                          </span>
                        </div>
                      )}
                      {watchedFaculty && (
                        <div className="flex gap-2">
                          <span className="text-muted-foreground shrink-0">الكلية:</span>
                          <span className="font-medium" data-testid="text-summary-faculty">{watchedFaculty}</span>
                        </div>
                      )}
                      {watchedDepartment && (
                        <div className="flex gap-2">
                          <span className="text-muted-foreground shrink-0">القسم:</span>
                          <span className="font-medium" data-testid="text-summary-department">{watchedDepartment}</span>
                        </div>
                      )}
                      {watchedMethodology && (
                        <div className="flex gap-2">
                          <span className="text-muted-foreground shrink-0">المنهجية:</span>
                          <span className="font-medium" data-testid="text-summary-methodology">{watchedMethodology}</span>
                        </div>
                      )}
                      {watchedCitationStyle && (
                        <div className="flex gap-2">
                          <span className="text-muted-foreground shrink-0">نظام التوثيق:</span>
                          <span className="font-medium" data-testid="text-summary-citation">
                            {ALL_CITATION_STYLES.find(c => c.value === watchedCitationStyle)?.label || watchedCitationStyle}
                          </span>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <span className="text-muted-foreground shrink-0">عدد الصفحات:</span>
                        <span className="font-medium" data-testid="text-summary-pages"><LtrNum>{watchedPageTarget}</LtrNum> صفحة</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-muted-foreground shrink-0">عدد الفصول:</span>
                        <span className="font-medium" data-testid="text-summary-chapters"><LtrNum>{watchedChapterCount}</LtrNum></span>
                      </div>
                      {watchedMainIdea && (
                        <div className="flex gap-2">
                          <span className="text-muted-foreground shrink-0">الإشكالية:</span>
                          <span className="font-medium line-clamp-2" data-testid="text-summary-idea">{watchedMainIdea}</span>
                        </div>
                      )}
                      {watchedHypotheses && (
                        <div className="flex gap-2">
                          <span className="text-muted-foreground shrink-0">الفرضيات:</span>
                          <span className="font-medium line-clamp-2" data-testid="text-summary-hypotheses">{watchedHypotheses}</span>
                        </div>
                      )}
                      {watchedKeywords && (
                        <div className="flex gap-2">
                          <span className="text-muted-foreground shrink-0">الكلمات المفتاحية:</span>
                          <span className="font-medium" data-testid="text-summary-keywords">{watchedKeywords}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 rounded-md bg-muted/50 border p-3 text-sm text-muted-foreground">
                      <p>سعر المذكرة: <span className="font-bold text-foreground" data-testid="text-summary-price"><LtrNum>150</LtrNum> دولار</span></p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex items-center justify-between gap-4 mt-6">
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
                <div className="flex items-center gap-4">
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin ml-2" />
                        جارٍ الإنشاء...
                      </>
                    ) : (
                      "إنشاء المذكرة"
                    )}
                  </Button>
                </div>
              )}
            </div>
          </form>
        </Form>
      </main>

      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">لقد استنفدت رصيدك المجاني</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              لقد استخدمت مشروعك المجاني لهذا الشهر. يمكنك شراء مذكرة تخرج جديدة أو الاشتراك في باقة شاملة.
            </p>
            <div className="flex flex-col gap-2">
              <Link href="/pricing">
                <Button className="w-full" data-testid="button-upgrade">
                  عرض الباقات والأسعار
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => setShowUpgradeDialog(false)}
                data-testid="button-dismiss-upgrade"
              >
                إغلاق
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
