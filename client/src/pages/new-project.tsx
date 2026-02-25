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
import { ArrowRight, Plus, Trash2, Feather, Users, MapPin, BookOpen, Loader2 } from "lucide-react";
import { Link } from "wouter";

const PAGE_OPTIONS = [
  { value: 20, label: "20 صفحة — قصة قصيرة" },
  { value: 50, label: "50 صفحة — رواية قصيرة" },
  { value: 80, label: "80 صفحة — رواية متوسطة" },
  { value: 100, label: "100 صفحة" },
  { value: 120, label: "120 صفحة" },
  { value: 150, label: "150 صفحة — رواية طويلة" },
  { value: 200, label: "200 صفحة — رواية كبيرة" },
];

const projectFormSchema = z.object({
  title: z.string().min(1, "عنوان الرواية مطلوب"),
  mainIdea: z.string().min(10, "يجب أن تكون الفكرة الرئيسية 10 أحرف على الأقل"),
  timeSetting: z.string().min(1, "الزمن مطلوب"),
  placeSetting: z.string().min(1, "المكان مطلوب"),
  narrativePov: z.string().min(1, "نوع السرد مطلوب"),
  pageCount: z.number().min(10).max(200),
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

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      title: "",
      mainIdea: "",
      timeSetting: "",
      placeSetting: "",
      narrativePov: "",
      pageCount: 50,
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
      return res.json();
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "تم إنشاء المشروع بنجاح" });
      navigate(`/project/${project.id}`);
    },
    onError: () => {
      toast({ title: "حدث خطأ", description: "فشل في إنشاء المشروع", variant: "destructive" });
    },
  });

  const onSubmit = (data: ProjectFormData) => {
    createMutation.mutate(data);
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
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
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

      <main className="max-w-4xl mx-auto px-6 py-10">
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
                <CardContent className="p-8 space-y-6">
                  <div className="space-y-2 mb-6">
                    <h2 className="font-serif text-2xl font-bold">تفاصيل الرواية</h2>
                    <p className="text-sm text-muted-foreground">أدخل المعلومات الأساسية لروايتك</p>
                  </div>

                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>عنوان الرواية</FormLabel>
                      <FormControl>
                        <Input placeholder="مثال: ظلال الذاكرة" {...field} data-testid="input-title" />
                      </FormControl>
                      <FormMessage />
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

                  {form.watch("pageCount") >= 100 && (
                    <div className="rounded-md bg-primary/5 border border-primary/10 p-4 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground mb-1">رواية طويلة ({form.watch("pageCount")} صفحة)</p>
                      <p>سيتم تقسيم الرواية إلى فصول متعددة، وقد يتم كتابة كل فصل على أجزاء لضمان الجودة والتفصيل. الكتابة الكاملة ستستغرق وقتاً أطول.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {step === 1 && (
              <Card>
                <CardContent className="p-8 space-y-6">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <h2 className="font-serif text-2xl font-bold">الشخصيات</h2>
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
                                    <SelectItem value="antagonist">شخصية معارضة</SelectItem>
                                    <SelectItem value="secondary">شخصية ثانوية</SelectItem>
                                    <SelectItem value="narrator">راوٍ</SelectItem>
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
                  <CardContent className="p-8 space-y-6">
                    <div>
                      <h2 className="font-serif text-2xl font-bold mb-2">المكان والزمان</h2>
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
                      جاري الإنشاء...
                    </>
                  ) : (
                    <>
                      <Feather className="w-4 h-4 ml-2" />
                      أنشئ المشروع
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
