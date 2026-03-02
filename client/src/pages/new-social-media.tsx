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
import { ArrowRight, Share2, Loader2 } from "lucide-react";
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Card>
              <CardContent className="p-6 space-y-5">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم الحملة / المحتوى</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="مثال: حملة إطلاق المنتج الجديد" data-testid="input-title" />
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
                  <span className="text-sm text-muted-foreground">١٩.٩٩ دولار</span>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    </div>
  );
}
