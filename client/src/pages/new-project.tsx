import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
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
import { ArrowRight, Plus, Trash2, Feather, Users, MapPin, BookOpen, Loader2, Sparkles, X } from "lucide-react";
import { Link } from "wouter";

const PAGE_OPTIONS = [
  { value: 150, label: "١٥٠ صفحة — ٣٠٠ دولار" },
  { value: 200, label: "٢٠٠ صفحة — ٣٥٠ دولار" },
  { value: 250, label: "٢٥٠ صفحة — ٤٥٠ دولار" },
  { value: 300, label: "٣٠٠ صفحة — ٦٠٠ دولار" },
];

const projectFormSchema = z.object({
  title: z.string().min(1, "عنوان الرواية مطلوب"),
  mainIdea: z.string().min(10, "يجب أن تكون الفكرة الرئيسية 10 أحرف على الأقل"),
  timeSetting: z.string().min(1, "الزمن مطلوب"),
  placeSetting: z.string().min(1, "المكان مطلوب"),
  narrativePov: z.string().min(1, "نوع السرد مطلوب"),
  pageCount: z.number().min(150).max(300),
  characters: z.array(z.object({
    name: z.string().min(1, "اسم الشخصية مطلوب"),
    background: z.string().min(1, "خلفية الشخصية مطلوبة"),
    role: z.string().min(1, "دور الشخصية مطلوب"),
  })).min(1, "يجب إضافة شخصية واحدة على الأقل"),
  relationships: z.array(z.object({
    char1Index: z.number(),
    char2Index: z.number(),
    relationship: z.string().min(1, "وصف العلاقة مطلوب"),
  })),
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

export default function NewProject() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [titleSuggestions, setTitleSuggestions] = useState<Array<{ title: string; reason: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestingTitles, setSuggestingTitles] = useState(false);

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      title: "",
      mainIdea: "",
      timeSetting: "",
      placeSetting: "",
      narrativePov: "",
      pageCount: 150,
      characters: [{ name: "", background: "", role: "protagonist" }],
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
    mutationFn: async (data: ProjectFormData) => {
      const res = await apiRequest("POST", "/api/projects", data);
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

  const onSubmit = (data: ProjectFormData) => {
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
        timeSetting: form.getValues("timeSetting"),
        placeSetting: form.getValues("placeSetting"),
        narrativePov: form.getValues("narrativePov"),
        characters: form.getValues("characters")?.filter(c => c.name).map(c => ({ name: c.name, role: c.role })),
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

  const steps = [
    { title: "تفاصيل الرواية", icon: BookOpen },
    { title: "الشخصيات", icon: Users },
    { title: "العلاقات والمكان", icon: MapPin },
  ];

  const characters = form.watch("characters");

  const canNextStep = () => {
    if (step === 0) {
      return form.watch("title") && form.watch("mainIdea");
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
              <Feather className="w-5 h-5 text-primary" />
              <span className="font-serif text-lg font-bold">مشروع جديد</span>
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

                  <div className="rounded-md bg-primary/5 border border-primary/10 p-4 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">رواية {form.watch("pageCount")} صفحة</p>
                    <p>سيتم تقسيم الرواية إلى فصول متعددة، وقد يتم كتابة كل فصل على أجزاء لضمان الجودة والتفصيل.</p>
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
                      <p className="text-sm text-muted-foreground">أضف شخصيات روايتك وحدد خلفياتها</p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => addChar({ name: "", background: "", role: "secondary" })}
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
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
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
                      <Feather className="w-4 h-4 ml-2" />
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
