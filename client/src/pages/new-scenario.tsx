import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import LtrNum from "@/components/ui/ltr-num";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { ArrowRight, Plus, Trash2, Clapperboard, Users, MapPin, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { SCENARIO_GENRES } from "@shared/schema";

const GENRE_LABELS: Record<string, string> = {
  drama: "دراما",
  thriller: "إثارة وتشويق",
  comedy: "كوميديا",
  romance: "رومانسي",
  historical: "تاريخي",
  action: "أكشن",
  "sci-fi": "خيال علمي",
  horror: "رعب",
  family: "عائلي",
  social: "اجتماعي",
  crime: "جريمة",
  war: "حربي",
};

const FORMAT_OPTIONS = [
  { value: "film", label: "فيلم سينمائي" },
  { value: "series", label: "مسلسل تلفزيوني" },
];

const TARGET_AUDIENCE_OPTIONS = [
  { value: "family", label: "عائلي" },
  { value: "adult", label: "للكبار" },
  { value: "youth", label: "شباب" },
];

const CHARACTER_ROLES = [
  { value: "protagonist", label: "بطل رئيسي" },
  { value: "antagonist", label: "الخصم" },
  { value: "supporting", label: "شخصية مساندة" },
  { value: "love_interest", label: "الحبيب / الحبيبة" },
  { value: "mentor", label: "المرشد / المعلم" },
  { value: "comic_relief", label: "شخصية فكاهية" },
  { value: "secondary", label: "شخصية ثانوية" },
  { value: "villain", label: "الشرير" },
];

const DIALECT_OPTIONS = [
  { value: "msa", label: "الفصحى المعاصرة" },
  { value: "egyptian", label: "اللهجة المصرية" },
  { value: "gulf", label: "اللهجة الخليجية" },
  { value: "levantine", label: "اللهجة الشامية" },
  { value: "maghrebi", label: "اللهجة المغاربية" },
  { value: "iraqi", label: "اللهجة العراقية" },
];

const scenarioFormSchema = z.object({
  title: z.string().min(1, "عنوان المشروع مطلوب"),
  mainIdea: z.string().min(10, "يجب أن يكون الملخص 10 أحرف على الأقل"),
  genre: z.string().min(1, "النوع الدرامي مطلوب"),
  formatType: z.string().min(1, "نوع العمل مطلوب"),
  episodeCount: z.number().min(1).max(30).optional(),
  characters: z.array(z.object({
    name: z.string().min(1, "اسم الشخصية مطلوب"),
    role: z.string().min(1, "دور الشخصية مطلوب"),
    background: z.string().min(1, "خلفية الشخصية مطلوبة"),
    dialect: z.string().optional(),
  })).min(1, "يجب إضافة شخصية واحدة على الأقل"),
  timeSetting: z.string().min(1, "الفترة الزمنية مطلوبة"),
  placeSetting: z.string().min(1, "المكان مطلوب"),
  visualTone: z.string().optional(),
  targetAudience: z.string().optional(),
  allowDialect: z.boolean().default(false),
});

type ScenarioFormData = z.infer<typeof scenarioFormSchema>;

export default function NewScenario() {
  useDocumentTitle("سيناريو جديد — قلم AI");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);

  const form = useForm<ScenarioFormData>({
    resolver: zodResolver(scenarioFormSchema),
    defaultValues: {
      title: "",
      mainIdea: "",
      genre: "",
      formatType: "",
      episodeCount: 1,
      characters: [{ name: "", role: "protagonist", background: "", dialect: "msa" }],
      timeSetting: "",
      placeSetting: "",
      visualTone: "",
      targetAudience: "",
      allowDialect: false,
    },
  });

  const { fields: charFields, append: addChar, remove: removeChar } = useFieldArray({
    control: form.control,
    name: "characters",
  });

  const createMutation = useMutation({
    mutationFn: async (data: ScenarioFormData) => {
      const payload = {
        title: data.title,
        mainIdea: data.mainIdea,
        projectType: "scenario",
        genre: data.genre,
        formatType: data.formatType,
        episodeCount: data.formatType === "series" ? data.episodeCount : 1,
        timeSetting: data.timeSetting,
        placeSetting: data.placeSetting,
        targetAudience: data.targetAudience || "",
        visualTone: data.visualTone || "",
        narrativePov: "third_person",
        pageCount: 150,
        characters: data.characters,
        relationships: [],
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

  const onSubmit = (data: ScenarioFormData) => {
    createMutation.mutate(data);
  };

  const steps = [
    { title: "تفاصيل المشروع", icon: Clapperboard },
    { title: "الشخصيات", icon: Users },
    { title: "المكان والأجواء", icon: MapPin },
  ];

  const formatType = form.watch("formatType");
  const characters = form.watch("characters");

  const canNextStep = () => {
    if (step === 0) {
      const title = form.watch("title");
      const mainIdea = form.watch("mainIdea");
      const genre = form.watch("genre");
      const ft = form.watch("formatType");
      return title && mainIdea && genre && ft;
    }
    if (step === 1) {
      return characters.length > 0 && characters.every(c => c.name && c.background && c.role);
    }
    return true;
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
              <Clapperboard className="w-5 h-5 text-primary" />
              <span className="font-serif text-lg font-bold">سيناريو جديد</span>
            </div>
          </div>
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
            {step === 0 && (
              <Card>
                <CardContent className="p-5 sm:p-8 space-y-6">
                  <div className="space-y-2 mb-6">
                    <h2 className="font-serif text-xl sm:text-2xl font-bold">تفاصيل السيناريو</h2>
                    <p className="text-sm text-muted-foreground">أدخل المعلومات الأساسية لمشروعك الدرامي</p>
                  </div>

                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>عنوان العمل</FormLabel>
                      <FormControl>
                        <Input placeholder="مثال: أولاد الشوارع" {...field} data-testid="input-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="mainIdea" render={({ field }) => (
                    <FormItem>
                      <FormLabel>الفكرة الرئيسية / اللوغلاين</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="ملخص قصير للعمل الدرامي: الصراع الرئيسي، الشخصيات، والمكان..."
                          className="min-h-[120px]"
                          {...field}
                          data-testid="input-main-idea"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="genre" render={({ field }) => (
                      <FormItem>
                        <FormLabel>النوع الدرامي</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-genre">
                              <SelectValue placeholder="اختر النوع" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SCENARIO_GENRES.map((g) => (
                              <SelectItem key={g} value={g}>{GENRE_LABELS[g] || g}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="formatType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>نوع العمل</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-format">
                              <SelectValue placeholder="فيلم أو مسلسل" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {FORMAT_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  {formatType === "series" && (
                    <FormField control={form.control} name="episodeCount" render={({ field }) => (
                      <FormItem>
                        <FormLabel>عدد الحلقات</FormLabel>
                        <Select onValueChange={(v) => field.onChange(parseInt(v))} value={String(field.value || 1)}>
                          <FormControl>
                            <SelectTrigger data-testid="select-episode-count">
                              <SelectValue placeholder="اختر عدد الحلقات" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
                              <SelectItem key={n} value={String(n)}>
                                {n === 1 ? "حلقة واحدة" : n === 2 ? "حلقتان" : <><LtrNum>{n}</LtrNum> حلقات</>}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}

                  <div className="rounded-md bg-primary/5 border border-primary/10 p-4 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">
                      {formatType === "series"
                        ? <>مسلسل — <LtrNum>{form.watch("episodeCount") || 1}</LtrNum> حلقة</>
                        : "فيلم سينمائي"}
                    </p>
                    <p>
                      {formatType === "series"
                        ? "سيتم كتابة كل حلقة كمشهد متكامل مع الحوار والإرشادات المرئية"
                        : "سيتم كتابة السيناريو الكامل مع المشاهد والحوارات والتوجيهات الإخراجية"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 1 && (
              <Card>
                <CardContent className="p-5 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                    <div>
                      <h2 className="font-serif text-xl sm:text-2xl font-bold">الشخصيات</h2>
                      <p className="text-sm text-muted-foreground">أضف شخصيات العمل الدرامي وحدد أدوارها ولهجاتها</p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => addChar({ name: "", role: "secondary", background: "", dialect: "msa" })}
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
                                    {CHARACTER_ROLES.map((r) => (
                                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                    ))}
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
                                  placeholder="خلفية الشخصية: عمرها، مهنتها، دوافعها..."
                                  className="min-h-[80px]"
                                  {...field}
                                  data-testid={`input-char-background-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name={`characters.${index}.dialect`} render={({ field }) => (
                            <FormItem>
                              <FormLabel>لهجة الحوار</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || "msa"}>
                                <FormControl>
                                  <SelectTrigger data-testid={`select-char-dialect-${index}`}>
                                    <SelectValue placeholder="اختر اللهجة" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {DIALECT_OPTIONS.map((d) => (
                                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <CardContent className="p-5 sm:p-8 space-y-6">
                  <div className="space-y-2 mb-6">
                    <h2 className="font-serif text-xl sm:text-2xl font-bold">المكان والأجواء</h2>
                    <p className="text-sm text-muted-foreground">حدد إعدادات المكان والزمان والنغمة البصرية</p>
                  </div>

                  <FormField control={form.control} name="timeSetting" render={({ field }) => (
                    <FormItem>
                      <FormLabel>الفترة الزمنية</FormLabel>
                      <FormControl>
                        <Input placeholder="مثال: العصر الحديث — القاهرة ٢٠٢٤" {...field} data-testid="input-time-setting" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="placeSetting" render={({ field }) => (
                    <FormItem>
                      <FormLabel>المكان</FormLabel>
                      <FormControl>
                        <Input placeholder="مثال: حي شعبي في القاهرة القديمة" {...field} data-testid="input-place-setting" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="visualTone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>النغمة البصرية</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="صف الأجواء البصرية: إضاءة داكنة، ألوان دافئة، طبيعة صحراوية..."
                          className="min-h-[80px]"
                          {...field}
                          data-testid="input-visual-tone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="targetAudience" render={({ field }) => (
                    <FormItem>
                      <FormLabel>الجمهور المستهدف</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-target-audience">
                            <SelectValue placeholder="اختر الفئة المستهدفة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TARGET_AUDIENCE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

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
                        <FormLabel className="text-base">السماح باستخدام اللهجة في الحوار</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          عند التفعيل، يستخدم أبو هاشم اللهجة المحددة لكل شخصية في حواراتها. الوصف المشهدي يبقى بالفصحى دائماً.
                        </p>
                      </div>
                    </FormItem>
                  )} />

                  <div className="rounded-md bg-primary/5 border border-primary/10 p-4 text-sm text-muted-foreground space-y-2">
                    <p className="font-medium text-foreground">ملخص المشروع</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <span>العنوان:</span>
                      <span className="text-foreground">{form.watch("title") || "—"}</span>
                      <span>النوع:</span>
                      <span className="text-foreground">{GENRE_LABELS[form.watch("genre")] || "—"}</span>
                      <span>الصيغة:</span>
                      <span className="text-foreground">
                        {form.watch("formatType") === "series"
                          ? <>مسلسل — <LtrNum>{form.watch("episodeCount") || 1}</LtrNum> حلقة</>
                          : form.watch("formatType") === "film"
                          ? "فيلم سينمائي"
                          : "—"}
                      </span>
                      <span>الشخصيات:</span>
                      <span className="text-foreground">{characters.filter(c => c.name).length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center justify-between gap-4 mt-8">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep(Math.max(0, step - 1))}
                disabled={step === 0}
                data-testid="button-prev-step"
              >
                السابق
              </Button>
              {step < 2 ? (
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
                  data-testid="button-create-project"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      جارٍ الإنشاء والتوجيه للدفع...
                    </>
                  ) : (
                    <>
                      <Clapperboard className="w-4 h-4 ml-2" />
                      أنشئ المشروع وادفع
                    </>
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
