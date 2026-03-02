import { useState } from "react";
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
import { ArrowRight, Plus, Trash2, Feather, Users, MapPin, BookOpen, Loader2, ChevronDown, ChevronUp, Sparkles, X } from "lucide-react";
import { Link } from "wouter";

const PAGE_OPTIONS = [
  { value: 10, label: "١٠ صفحات — ٨٠ دولار" },
  { value: 15, label: "١٥ صفحة — ٨٠ دولار" },
  { value: 20, label: "٢٠ صفحة — ٨٠ دولار" },
  { value: 30, label: "٣٠ صفحة — ٨٠ دولار" },
  { value: 40, label: "٤٠ صفحة — ٨٠ دولار" },
  { value: 50, label: "٥٠ صفحة — ٨٠ دولار" },
];

const GENRE_OPTIONS = [
  { value: "realistic", label: "واقعي" },
  { value: "symbolic", label: "رمزي / أسطوري" },
  { value: "psychological", label: "نفسي" },
  { value: "social", label: "اجتماعي" },
  { value: "fantasy", label: "فانتازيا" },
  { value: "horror", label: "رعب" },
  { value: "romantic", label: "رومانسي" },
  { value: "historical", label: "تاريخي" },
  { value: "satirical", label: "ساخر" },
  { value: "philosophical", label: "فلسفي" },
];

const NARRATIVE_TECHNIQUE_OPTIONS = [
  { value: "linear", label: "السرد الزمني التقليدي (الخطّي)" },
  { value: "temporal_break", label: "الانكسار الزمني (كسر التسلسل)" },
  { value: "first_person_narration", label: "السرد بضمير المتكلم" },
  { value: "stream_of_consciousness", label: "تيار الوعي" },
  { value: "symbolic", label: "السرد الرمزي أو الأسطوري" },
  { value: "circular", label: "السرد الدائري" },
  { value: "fragmented", label: "السرد المتشظّي" },
  { value: "limited", label: "الراوي المحدود أو الداخلي" },
];

const formSchema = z.object({
  title: z.string().min(1, "عنوان القصة مطلوب"),
  mainIdea: z.string().min(10, "يجب أن تكون الفكرة الرئيسية 10 أحرف على الأقل"),
  timeSetting: z.string().optional(),
  placeSetting: z.string().optional(),
  narrativePov: z.string().min(1, "نوع السرد مطلوب"),
  narrativeTechnique: z.string().optional(),
  allowDialect: z.boolean().default(false),
  genre: z.string().min(1, "النوع الأدبي مطلوب"),
  pageCount: z.number().min(10).max(50),
  characters: z.array(z.object({
    name: z.string().min(1, "اسم الشخصية مطلوب"),
    background: z.string().min(1, "خلفية الشخصية مطلوبة"),
    role: z.string().min(1, "دور الشخصية مطلوب"),
    motivation: z.string().optional(),
    speechStyle: z.string().optional(),
    physicalDescription: z.string().optional(),
    psychologicalTraits: z.string().optional(),
    age: z.string().optional(),
  })).min(1, "يجب إضافة شخصية واحدة على الأقل"),
  relationships: z.array(z.object({
    char1Index: z.number(),
    char2Index: z.number(),
    relationship: z.string().min(1, "وصف العلاقة مطلوب"),
  })),
});

type FormData = z.infer<typeof formSchema>;

export default function NewShortStory() {
  useDocumentTitle("قصة قصيرة جديدة — قلم AI");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [expandedChars, setExpandedChars] = useState<Set<number>>(new Set());
  const [suggestingFormat, setSuggestingFormat] = useState(false);
  const [formatSuggestion, setFormatSuggestion] = useState<{ recommendation: string; confidence: string; reasoning: string; shortStoryAdvantages: string; novelAdvantages: string } | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      mainIdea: "",
      timeSetting: "",
      placeSetting: "",
      narrativePov: "",
      narrativeTechnique: "",
      allowDialect: false,
      genre: "",
      pageCount: 20,
      characters: [{ name: "", background: "", role: "protagonist", motivation: "", speechStyle: "", physicalDescription: "", psychologicalTraits: "", age: "" }],
      relationships: [],
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
    mutationFn: async (data: FormData) => {
      const res = await apiRequest("POST", "/api/projects", {
        ...data,
        projectType: "short_story",
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
        toast({ title: "تم إنشاء القصة بنجاح" });
        navigate(`/project/${project.id}`);
      }
    },
    onError: () => {
      toast({ title: "حدث خطأ", description: "فشل في إنشاء القصة", variant: "destructive" });
    },
  });

  const onSubmit = (data: FormData) => {
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

  const toggleExpanded = (index: number) => {
    setExpandedChars(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const steps = [
    { title: "الفكرة", icon: <BookOpen className="w-4 h-4" /> },
    { title: "الشخصيات", icon: <Users className="w-4 h-4" /> },
    { title: "المراجعة", icon: <Feather className="w-4 h-4" /> },
  ];

  const roleOptions = [
    { value: "protagonist", label: "بطل رئيسي" },
    { value: "antagonist", label: "شخصية معارضة" },
    { value: "secondary", label: "شخصية ثانوية" },
    { value: "narrator", label: "راوٍ" },
    { value: "mysterious", label: "شخصية غامضة" },
    { value: "tragic", label: "شخصية مأساوية" },
    { value: "love_interest", label: "الحبيب / الحبيبة" },
  ];

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowRight className="w-4 h-4 ml-1" />
              العودة
            </Button>
          </Link>
          <h1 className="font-serif text-xl sm:text-2xl font-bold" data-testid="text-page-title">قصة قصيرة جديدة</h1>
        </div>

        <div className="flex items-center gap-2 justify-center">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                {s.icon}
                {s.title}
              </div>
              {i < steps.length - 1 && <div className="w-6 h-px bg-border" />}
            </div>
          ))}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {step === 0 && (
              <Card>
                <CardContent className="p-6 space-y-5">
                  <h2 className="font-serif text-lg font-semibold" data-testid="text-step-title">فكرة القصة القصيرة</h2>

                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>عنوان القصة</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="مثال: صمت الحجارة" data-testid="input-title" />
                        </FormControl>
                        <FormMessage />
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
                          <Textarea {...field} placeholder="اكتب فكرة القصة بإيجاز — اللحظة المحورية أو الموقف الذي تدور حوله القصة" className="min-h-[80px]" data-testid="input-main-idea" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                    {suggestingFormat ? "أبو هاشم يحلّل فكرتك..." : "هل فكرتك قصة قصيرة أم رواية؟"}
                  </Button>

                  {formatSuggestion && (
                    <div className="rounded-lg border border-[hsl(43,76%,52%)]/30 bg-[hsl(43,76%,92%)] dark:bg-[hsl(213,66%,11%)]/50 p-4 space-y-3" data-testid="panel-format-suggestion">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-[hsl(43,76%,52%)]" />
                          <span className="text-sm font-semibold">
                            {formatSuggestion.recommendation === "short_story" ? "أبو هاشم يرى أن فكرتك تصلح قصة قصيرة ✓" : "أبو هاشم يقترح: رواية"}
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
                          <span className="font-medium">مزايا القصة القصيرة: </span>
                          <span className="text-muted-foreground">{formatSuggestion.shortStoryAdvantages}</span>
                        </div>
                        <div className="bg-white/50 dark:bg-white/5 rounded p-2">
                          <span className="font-medium">مزايا الرواية: </span>
                          <span className="text-muted-foreground">{formatSuggestion.novelAdvantages}</span>
                        </div>
                      </div>
                      {formatSuggestion.recommendation === "novel" && (
                        <Link href="/project/new">
                          <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs" data-testid="button-switch-to-novel">
                            انتقل إلى إنشاء رواية
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="genre"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>النوع الأدبي</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-genre">
                                <SelectValue placeholder="اختر النوع" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {GENRE_OPTIONS.map(g => (
                                <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pageCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>حجم القصة</FormLabel>
                          <Select onValueChange={(v) => field.onChange(Number(v))} defaultValue={String(field.value)}>
                            <FormControl>
                              <SelectTrigger data-testid="select-page-count">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {PAGE_OPTIONS.map(p => (
                                <SelectItem key={p.value} value={String(p.value)}>{p.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="timeSetting"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الزمان (اختياري)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="مثال: صباح يوم ممطر في الثمانينيات" data-testid="input-time" />
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
                            <Input {...field} placeholder="مثال: مقهى قديم في حارة شعبية" data-testid="input-place" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="narrativePov"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>زاوية السرد</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-pov">
                                <SelectValue placeholder="اختر زاوية السرد" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="first_person">ضمير المتكلم (أنا)</SelectItem>
                              <SelectItem value="third_person">ضمير الغائب (هو/هي)</SelectItem>
                              <SelectItem value="omniscient">الراوي العليم</SelectItem>
                              <SelectItem value="multi_pov">تعدد الأصوات</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="narrativeTechnique"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>التقنية السردية (اختياري)</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-technique">
                                <SelectValue placeholder="اختر التقنية" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {NARRATIVE_TECHNIQUE_OPTIONS.map(t => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                        <FormLabel className="text-base">السماح باستخدام اللهجة جزئياً في الحوار</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          عند التفعيل، قد يستخدم أبو هاشم اللهجة العامية جزئياً في حوارات الشخصيات فقط. السرد والوصف يبقيان بالفصحى دائماً.
                        </p>
                      </div>
                    </FormItem>
                  )} />

                  <div className="flex justify-start pt-2">
                    <Button type="button" onClick={() => setStep(1)} data-testid="button-next-step">
                      التالي — الشخصيات
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 1 && (
              <Card>
                <CardContent className="p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <h2 className="font-serif text-lg font-semibold" data-testid="text-step-characters">الشخصيات</h2>
                    <span className="text-xs text-muted-foreground">القصة القصيرة تتألق بشخصية أو اثنتين بعمق</span>
                  </div>

                  {charFields.map((field, index) => (
                    <div key={field.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">شخصية {index + 1}</span>
                        <div className="flex items-center gap-1">
                          <Button type="button" variant="ghost" size="sm" onClick={() => toggleExpanded(index)} data-testid={`button-expand-char-${index}`}>
                            {expandedChars.has(index) ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </Button>
                          {index > 0 && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeChar(index)} data-testid={`button-remove-char-${index}`}>
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name={`characters.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">الاسم</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="اسم الشخصية" data-testid={`input-char-name-${index}`} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`characters.${index}.role`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">الدور</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid={`select-char-role-${index}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {roleOptions.map(r => (
                                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
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
                        name={`characters.${index}.background`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">الخلفية</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="خلفية الشخصية وقصتها" className="min-h-[60px]" data-testid={`input-char-bg-${index}`} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {expandedChars.has(index) && (
                        <div className="space-y-3 border-t pt-3">
                          <p className="text-xs text-muted-foreground">تفاصيل متقدمة (اختياري)</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <FormField control={form.control} name={`characters.${index}.age`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">العمر</FormLabel>
                                  <FormControl><Input {...field} placeholder="مثال: ٤٥ سنة" data-testid={`input-char-age-${index}`} /></FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField control={form.control} name={`characters.${index}.motivation`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">الدافع</FormLabel>
                                  <FormControl><Input {...field} placeholder="ما الذي يحرك هذه الشخصية؟" data-testid={`input-char-motivation-${index}`} /></FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField control={form.control} name={`characters.${index}.speechStyle`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">أسلوب الكلام</FormLabel>
                                <FormControl><Input {...field} placeholder="مثال: صامت غالباً، كلماته قليلة وموجعة" data-testid={`input-char-speech-${index}`} /></FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField control={form.control} name={`characters.${index}.physicalDescription`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">الوصف الجسدي</FormLabel>
                                <FormControl><Input {...field} placeholder="ملامح مميزة" data-testid={`input-char-physical-${index}`} /></FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField control={form.control} name={`characters.${index}.psychologicalTraits`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">السمات النفسية</FormLabel>
                                <FormControl><Input {...field} placeholder="مثال: قلق مزمن، يخفي ضعفه بالسخرية" data-testid={`input-char-psych-${index}`} /></FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  {charFields.length < 4 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addChar({ name: "", background: "", role: "secondary", motivation: "", speechStyle: "", physicalDescription: "", psychologicalTraits: "", age: "" })}
                      data-testid="button-add-character"
                    >
                      <Plus className="w-3.5 h-3.5 ml-1" />
                      إضافة شخصية
                    </Button>
                  )}

                  {charFields.length >= 2 && (
                    <div className="border-t pt-4 space-y-3">
                      <h3 className="font-medium text-sm">العلاقات بين الشخصيات (اختياري)</h3>
                      {relFields.map((field, index) => (
                        <div key={field.id} className="flex items-end gap-2">
                          <div className="flex-1 grid grid-cols-3 gap-2">
                            <FormField
                              control={form.control}
                              name={`relationships.${index}.char1Index`}
                              render={({ field: f }) => (
                                <Select onValueChange={(v) => f.onChange(Number(v))} defaultValue={String(f.value)}>
                                  <SelectTrigger data-testid={`select-rel-char1-${index}`}><SelectValue placeholder="شخصية 1" /></SelectTrigger>
                                  <SelectContent>
                                    {charFields.map((c, ci) => (
                                      <SelectItem key={ci} value={String(ci)}>{form.watch(`characters.${ci}.name`) || `شخصية ${ci + 1}`}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`relationships.${index}.char2Index`}
                              render={({ field: f }) => (
                                <Select onValueChange={(v) => f.onChange(Number(v))} defaultValue={String(f.value)}>
                                  <SelectTrigger data-testid={`select-rel-char2-${index}`}><SelectValue placeholder="شخصية 2" /></SelectTrigger>
                                  <SelectContent>
                                    {charFields.map((c, ci) => (
                                      <SelectItem key={ci} value={String(ci)}>{form.watch(`characters.${ci}.name`) || `شخصية ${ci + 1}`}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`relationships.${index}.relationship`}
                              render={({ field: f }) => (
                                <Input {...f} placeholder="نوع العلاقة" data-testid={`input-rel-type-${index}`} />
                              )}
                            />
                          </div>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeRel(index)} data-testid={`button-remove-rel-${index}`}>
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => addRel({ char1Index: 0, char2Index: 1, relationship: "" })} data-testid="button-add-relationship">
                        <Plus className="w-3.5 h-3.5 ml-1" />
                        إضافة علاقة
                      </Button>
                    </div>
                  )}

                  <div className="flex justify-between pt-2">
                    <Button type="button" variant="outline" onClick={() => setStep(0)} data-testid="button-prev-step">
                      السابق
                    </Button>
                    <Button type="button" onClick={() => setStep(2)} data-testid="button-next-review">
                      التالي — المراجعة
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <CardContent className="p-6 space-y-5">
                  <h2 className="font-serif text-lg font-semibold" data-testid="text-step-review">مراجعة وإنشاء</h2>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-medium">العنوان:</span>
                      <span data-testid="text-review-title">{form.watch("title") || "—"}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Feather className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span className="font-medium shrink-0">الفكرة:</span>
                      <span data-testid="text-review-idea">{form.watch("mainIdea") || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">النوع:</span>
                      <span data-testid="text-review-genre">{GENRE_OPTIONS.find(g => g.value === form.watch("genre"))?.label || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">الحجم:</span>
                      <span data-testid="text-review-pages">{form.watch("pageCount")} صفحة</span>
                    </div>
                    {form.watch("timeSetting") && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary shrink-0" />
                        <span>{form.watch("timeSetting")} — {form.watch("placeSetting")}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary shrink-0" />
                      <span>{form.watch("characters")?.length || 0} شخصية</span>
                    </div>
                  </div>

                  <div className="flex justify-between pt-2">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} data-testid="button-prev-review">
                      السابق
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      data-testid="button-create-project"
                    >
                      {createMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جارٍ الإنشاء...</>
                      ) : (
                        <><Feather className="w-4 h-4 ml-2" /> إنشاء القصة</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </form>
        </Form>
      </div>
    </div>
  );
}
