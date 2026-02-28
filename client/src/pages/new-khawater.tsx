import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
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
import { Switch } from "@/components/ui/switch";
import { ArrowRight, Feather, Loader2 } from "lucide-react";
import { Link } from "wouter";

const STYLE_OPTIONS = [
  { value: "reflection", label: "تأمل" },
  { value: "thought", label: "خاطرة" },
  { value: "wisdom", label: "حكمة وعبرة" },
  { value: "meditation", label: "تأمل روحي" },
  { value: "letter", label: "رسالة أدبية" },
  { value: "prose_poem", label: "قصيدة نثرية" },
];

const MOOD_OPTIONS = [
  { value: "hopeful", label: "متفائل" },
  { value: "melancholic", label: "حزين / كئيب" },
  { value: "philosophical", label: "فلسفي" },
  { value: "romantic", label: "رومانسي / عاطفي" },
  { value: "nostalgic", label: "حنين وذكريات" },
  { value: "spiritual", label: "روحاني" },
];

const LENGTH_OPTIONS = [
  { value: 1, label: "قصيرة — حوالي ٣٠٠ كلمة" },
  { value: 2, label: "متوسطة — حوالي ٥٠٠ كلمة" },
  { value: 3, label: "طويلة — حوالي ٨٠٠ كلمة" },
];

const formSchema = z.object({
  title: z.string().min(1, "العنوان مطلوب"),
  mainIdea: z.string().min(10, "يجب أن يكون الموضوع 10 أحرف على الأقل"),
  genre: z.string().min(1, "نوع الكتابة مطلوب"),
  formatType: z.string().min(1, "المزاج مطلوب"),
  pageCount: z.number(),
  timeSetting: z.string().optional(),
  placeSetting: z.string().optional(),
  allowDialect: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

export default function NewKhawater() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      mainIdea: "",
      genre: "",
      formatType: "",
      pageCount: 2,
      timeSetting: "",
      placeSetting: "",
      allowDialect: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await apiRequest("POST", "/api/projects", {
        ...data,
        projectType: "khawater",
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
        toast({ title: "تم إنشاء الخاطرة بنجاح" });
        navigate(`/project/${project.id}`);
      }
    },
    onError: () => {
      toast({ title: "حدث خطأ", description: "فشل في إنشاء الخاطرة", variant: "destructive" });
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
            <Feather className="w-5 h-5 text-primary" />
            <h1 className="font-serif text-xl sm:text-2xl font-bold" data-testid="text-page-title">خاطرة جديدة</h1>
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
                      <FormLabel>العنوان</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="مثال: في مديح الصمت" data-testid="input-title" />
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
                      <FormLabel>الموضوع أو الفكرة</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="اكتب الموضوع أو الفكرة التي تريد التأمل فيها..." className="min-h-[80px]" data-testid="input-main-idea" />
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
                        <FormLabel>نوع الكتابة</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-style">
                              <SelectValue placeholder="اختر النوع" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {STYLE_OPTIONS.map(s => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="formatType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المزاج</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-mood">
                              <SelectValue placeholder="اختر المزاج" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {MOOD_OPTIONS.map(m => (
                              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
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
                  name="pageCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الطول</FormLabel>
                      <Select onValueChange={(v) => field.onChange(Number(v))} defaultValue={String(field.value)}>
                        <FormControl>
                          <SelectTrigger data-testid="select-length">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {LENGTH_OPTIONS.map(l => (
                            <SelectItem key={l.value} value={String(l.value)}>{l.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
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
                          <Input {...field} placeholder="مثال: في ليلة شتائية" data-testid="input-time" />
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
                          <Input {...field} placeholder="مثال: على شاطئ البحر" data-testid="input-place" />
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
                      <FormLabel className="text-base">السماح باستخدام اللهجة جزئياً</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        عند التفعيل، قد يستخدم أبو هاشم بعض التعابير العامية لإضفاء طابع حميمي. الأسلوب الأساسي يبقى بالفصحى.
                      </p>
                    </div>
                  </FormItem>
                )} />

                <div className="flex items-center justify-between gap-4 pt-2">
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
                      "إنشاء الخاطرة"
                    )}
                  </Button>
                  <span className="text-sm text-muted-foreground" data-testid="text-price">٩.٩٩ دولار</span>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    </div>
  );
}