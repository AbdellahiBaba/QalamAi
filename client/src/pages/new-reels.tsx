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
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, Video, Loader2, Sparkles, X } from "lucide-react";
import { Link } from "wouter";

const FORMAT_OPTIONS = [
  { value: "educational", label: "تعليمي" },
  { value: "storytelling", label: "سردي / قصصي" },
  { value: "promotional", label: "ترويجي" },
  { value: "behind_the_scenes", label: "كواليس" },
  { value: "trending", label: "ترند / تحدي" },
  { value: "motivational", label: "تحفيزي" },
];

const DURATION_OPTIONS = [
  { value: "15", label: "١٥ ثانية" },
  { value: "30", label: "٣٠ ثانية" },
  { value: "60", label: "٦٠ ثانية" },
  { value: "90", label: "٩٠ ثانية" },
];

const TONE_OPTIONS = [
  { value: "professional", label: "مهني واحترافي" },
  { value: "casual", label: "عفوي وودود" },
  { value: "inspirational", label: "ملهم ومحفز" },
  { value: "humorous", label: "فكاهي وخفيف" },
  { value: "educational", label: "تعليمي ومعرفي" },
  { value: "promotional", label: "ترويجي وتسويقي" },
];

const TARGET_PLATFORMS = [
  { value: "instagram", label: "Instagram Reels" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube_shorts", label: "YouTube Shorts" },
];

const formSchema = z.object({
  title: z.string().min(1, "عنوان الريلز مطلوب"),
  mainIdea: z.string().min(10, "يجب أن يكون الموضوع 10 أحرف على الأقل"),
  reelFormat: z.string().min(1, "نوع الريلز مطلوب"),
  duration: z.string().min(1, "المدة مطلوبة"),
  essayTone: z.string().min(1, "النبرة مطلوبة"),
  targetAudience: z.string().optional(),
  targetPlatforms: z.array(z.string()).min(1, "اختر منصة واحدة على الأقل"),
  allowDialect: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

export default function NewReels() {
  useDocumentTitle("ريلز جديد — قلم AI");
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
      reelFormat: "",
      duration: "",
      essayTone: "",
      targetAudience: "",
      targetPlatforms: ["instagram"],
      allowDialect: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const platforms = data.targetPlatforms.join(",");
      const audienceWithPlatforms = data.targetAudience
        ? `${data.targetAudience} | ${platforms}`
        : `| ${platforms}`;

      const res = await apiRequest("POST", "/api/projects", {
        title: data.title,
        mainIdea: data.mainIdea,
        genre: "reels",
        essayTone: data.essayTone,
        timeSetting: data.duration,
        placeSetting: data.reelFormat,
        targetAudience: audienceWithPlatforms,
        allowDialect: data.allowDialect,
        pageCount: 1,
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
        toast({ title: "تم إنشاء الريلز بنجاح" });
        navigate(`/project/${project.id}`);
      }
    },
    onError: () => {
      toast({ title: "حدث خطأ", description: "فشل في إنشاء الريلز", variant: "destructive" });
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
        genre: "reels",
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
            <Video className="w-5 h-5 text-primary" />
            <h1 className="font-serif text-xl sm:text-2xl font-bold" data-testid="text-page-title">ريلز جديد</h1>
          </div>
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

            <Card>
              <CardContent className="p-6 space-y-5">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>عنوان الريلز</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input placeholder="مثال: ٥ نصائح لزيادة الإنتاجية" {...field} data-testid="input-title" />
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
                      <FormLabel>الفكرة الرئيسية</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="اكتب وصفاً للريلز الذي تريد إنشاءه — الفكرة الأساسية والرسالة المطلوبة" className="min-h-[80px]" data-testid="input-main-idea" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="reelFormat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>نوع الريلز</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-reel-format">
                              <SelectValue placeholder="اختر النوع" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {FORMAT_OPTIONS.map(f => (
                              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المدة</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-duration">
                              <SelectValue placeholder="اختر المدة" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DURATION_OPTIONS.map(d => (
                              <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
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

                <FormField
                  control={form.control}
                  name="targetAudience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الجمهور المستهدف (اختياري)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="مثال: شباب 18-25، رواد أعمال، أمهات" data-testid="input-audience" />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="targetPlatforms"
                  render={() => (
                    <FormItem>
                      <FormLabel>المنصات المستهدفة</FormLabel>
                      <div className="flex flex-wrap gap-4">
                        {TARGET_PLATFORMS.map((platform) => (
                          <FormField
                            key={platform.value}
                            control={form.control}
                            name="targetPlatforms"
                            render={({ field }) => (
                              <FormItem key={platform.value} className="flex items-center gap-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(platform.value)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value || [];
                                      if (checked) {
                                        field.onChange([...current, platform.value]);
                                      } else {
                                        field.onChange(current.filter((v: string) => v !== platform.value));
                                      }
                                    }}
                                    data-testid={`checkbox-platform-${platform.value}`}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">{platform.label}</FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                        عند التفعيل، قد يستخدم أبو هاشم اللهجة العامية لتكون أقرب لأسلوب الريلز.
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
                    إنشاء الريلز
                  </Button>
                  <span className="text-sm text-muted-foreground" data-testid="text-price">٧.٩٩ دولار</span>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    </div>
  );
}
