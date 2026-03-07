import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useDocumentTitle } from "@/hooks/use-document-title";
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
import { ArrowRight, Share2, Loader2, Sparkles, X, Film } from "lucide-react";
import { Link } from "wouter";

const PLATFORM_OPTIONS = [
  { value: "twitter", label: "تويتر / إكس — ثريد" },
  { value: "instagram", label: "إنستغرام — كابشن" },
  { value: "linkedin", label: "لينكدإن — منشور مهني" },
  { value: "facebook", label: "فيسبوك — منشور" },
  { value: "youtube_script", label: "يوتيوب — سكريبت فيديو" },
  { value: "tiktok_script", label: "تيك توك — سكريبت" },
];

const TONE_OPTIONS = [
  { value: "professional", label: "مهني واحترافي" },
  { value: "casual", label: "عفوي وودود" },
  { value: "inspirational", label: "ملهم ومحفز" },
  { value: "humorous", label: "فكاهي وخفيف" },
  { value: "educational", label: "تعليمي ومعرفي" },
  { value: "promotional", label: "ترويجي وتسويقي" },
];

const formSchema = z.object({
  title: z.string().min(1, "اسم الحملة/المحتوى مطلوب"),
  mainIdea: z.string().min(10, "يجب أن يكون الموضوع 10 أحرف على الأقل"),
  genre: z.string().min(1, "المنصة مطلوبة"),
  essayTone: z.string().min(1, "النبرة مطلوبة"),
  targetAudience: z.string().optional(),
  timeSetting: z.string().optional(),
  placeSetting: z.string().optional(),
  allowDialect: z.boolean().default(false),
  pageCount: z.number().default(1),
});

type FormData = z.infer<typeof formSchema>;

export default function NewSocialMedia() {
  useDocumentTitle("محتوى سوشيال ميديا — قلم AI");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [suggestingTitles, setSuggestingTitles] = useState(false);
  const [titleSuggestions, setTitleSuggestions] = useState<Array<{ title: string; reason: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestingFullProject, setSuggestingFullProject] = useState(false);
  const [fullProjectHint, setFullProjectHint] = useState("");
  const [showHintInput, setShowHintInput] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      mainIdea: "",
      genre: "",
      essayTone: "",
      targetAudience: "",
      timeSetting: "",
      placeSetting: "",
      allowDialect: false,
      pageCount: 1,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await apiRequest("POST", "/api/projects", {
        ...data,
        projectType: "social_media",
      });
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
        toast({ title: "تم إنشاء المحتوى بنجاح" });
        navigate(`/project/${project.id}`);
      }
    },
    onError: () => {
      toast({ title: "حدث خطأ", description: "فشل في إنشاء المحتوى", variant: "destructive" });
    },
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
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
      const res = await apiRequest("POST", "/api/projects/suggest-titles", {
        mainIdea,
        projectType: "social_media",
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
        projectType: "social_media",
        hint: fullProjectHint || undefined,
      });
      const data = await res.json();
      form.setValue("title", data.title, { shouldValidate: true });
      form.setValue("mainIdea", data.mainIdea, { shouldValidate: true });
      toast({ title: "تم اقتراح مشروع كامل — راجع التفاصيل وعدّلها كما تشاء" });
      setShowHintInput(false);
      setFullProjectHint("");
    } catch {
      toast({ title: "فشل في توليد الاقتراح", variant: "destructive" });
    } finally {
      setSuggestingFullProject(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowRight className="w-4 h-4 ml-1" />
              العودة
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            <h1 className="font-serif text-xl sm:text-2xl font-bold" data-testid="text-page-title">محتوى سوشيال ميديا</h1>
          </div>
        </div>

        <Link href="/project/new/reels">
          <Card className="border-primary/50 bg-primary/5 cursor-pointer hover:border-primary transition-colors" data-testid="card-reels-banner">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Film className="w-6 h-6 text-primary" />
                <div>
                  <p className="font-semibold text-sm">تريد إنشاء ريلز / فيديو قصير؟</p>
                  <p className="text-xs text-muted-foreground">إنشاء سكريبت + فيديو بالذكاء الاصطناعي مع صور وتعليق صوتي عربي</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-primary rotate-180" />
            </CardContent>
          </Card>
        </Link>

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

            <Card>
              <CardContent className="p-6 space-y-5">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم الحملة / المحتوى</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input placeholder="مثال: حملة إطلاق المنتج الجديد" {...field} data-testid="input-title" />
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
                  )}
                />

                <FormField
                  control={form.control}
                  name="mainIdea"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>موضوع المحتوى</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="اكتب وصفاً للمحتوى الذي تريد إنشاءه — الفكرة الأساسية والرسالة المطلوبة" className="min-h-[80px]" data-testid="input-main-idea" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="genre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المنصة</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-platform">
                              <SelectValue placeholder="اختر المنصة" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PLATFORM_OPTIONS.map(p => (
                              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="essayTone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>النبرة</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-tone">
                              <SelectValue placeholder="اختر النبرة" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TONE_OPTIONS.map(t => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="targetAudience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الجمهور المستهدف (اختياري)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="مثال: رواد أعمال، شباب جامعي، أمهات" data-testid="input-audience" />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="timeSetting"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الزمان (اختياري)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="مثال: رمضان ٢٠٢٥" data-testid="input-time" />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="placeSetting"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المكان (اختياري)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="مثال: السوق السعودي" data-testid="input-place" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
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
                      <FormLabel className="text-base">السماح باستخدام اللهجة العامية</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        عند التفعيل، قد يستخدم أبو هاشم اللهجة العامية لتكون أقرب لأسلوب السوشيال ميديا.
                      </p>
                    </div>
                  </FormItem>
                )} />

                <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                    إنشاء المحتوى
                  </Button>
                  <span className="text-sm text-muted-foreground">٧.٩٩ دولار</span>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    </div>
  );
}
