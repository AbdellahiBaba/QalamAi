import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Feather, Check, Crown, BookOpen, FileText, Sparkles, Film, PenTool, Layers, Loader2, CheckCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const mainPlans = [
  {
    id: "essay",
    planKey: "essay",
    name: "خطة المقالات",
    subtitle: "كتابة احترافية للمقالات والأخبار",
    price: "٥٠ دولار",
    priceNote: "دفعة واحدة",
    icon: PenTool,
    highlighted: false,
    features: [
      "مقالات غير محدودة الكلمات",
      "جميع التخصصات: أخبار، سياسة، علوم، تكنولوجيا",
      "أنماط متعددة: تحليلي، تحقيقي، افتتاحي",
      "تنسيق احترافي جاهز للنشر",
      "معايير وكالات الأنباء العالمية",
      "تحسين محركات البحث (SEO)",
      "تصدير بصيغة PDF",
    ],
    cta: "اشتري خطة المقالات",
    createHref: "/project/new/essay",
  },
  {
    id: "all-in-one",
    planKey: "all_in_one",
    name: "الخطة الشاملة",
    subtitle: "وصول كامل لجميع أنواع الكتابة",
    price: "٥٠٠ دولار",
    priceNote: "دفعة واحدة",
    icon: Layers,
    highlighted: true,
    features: [
      "كتابة الروايات — جميع الأحجام",
      "كتابة المقالات والأخبار — جميع التخصصات",
      "كتابة السيناريوهات — أفلام ومسلسلات",
      "شخصيات وأقواس سردية غير محدودة",
      "تصدير بجميع الصيغ: PDF و EPUB",
      "دعم سريع على مدار الساعة",
      "أفضل قيمة — وفّر أكثر من ٤٠٪",
    ],
    cta: "اشتري الخطة الشاملة",
    createHref: "/project/new",
  },
  {
    id: "scenario",
    planKey: "scenario",
    name: "خطة السيناريوهات",
    subtitle: "كتابة سيناريوهات أفلام ومسلسلات",
    price: "٢٠٠ دولار",
    priceNote: "دفعة واحدة",
    icon: Film,
    highlighted: false,
    features: [
      "سيناريوهات أفلام (٩٠-١٢٠ دقيقة)",
      "مسلسلات درامية (حتى ٣٠ حلقة)",
      "بنية درامية كاملة (٣ فصول / ٥ فصول)",
      "حوارات بلهجات متعددة",
      "وصف مشاهد وإرشادات كاميرا",
      "تطوير شخصيات وأقواس درامية",
      "تصدير بتنسيق السيناريو الاحترافي",
    ],
    cta: "اشتري خطة السيناريوهات",
    createHref: "/project/new/scenario",
  },
];

const novelTiers = [
  {
    pages: 150,
    name: "رواية ١٥٠ صفحة",
    price: "٣٠٠ دولار",
    features: [
      "١٥٠ صفحة من الكتابة الروائية",
      "تطوير شخصيات كامل",
      "مخطط رواية تفصيلي",
      "تصدير بصيغة PDF و EPUB",
    ],
  },
  {
    pages: 200,
    name: "رواية ٢٠٠ صفحة",
    price: "٣٥٠ دولار",
    features: [
      "٢٠٠ صفحة من الكتابة الروائية",
      "تطوير شخصيات كامل",
      "مخطط رواية تفصيلي",
      "تصدير بصيغة PDF و EPUB",
    ],
  },
  {
    pages: 250,
    name: "رواية ٢٥٠ صفحة",
    price: "٤٥٠ دولار",
    highlighted: true,
    features: [
      "٢٥٠ صفحة من الكتابة الروائية",
      "مخطط تفصيلي وأقواس سردية",
      "تصدير بصيغة PDF و EPUB",
      "دعم ذو أولوية",
    ],
  },
  {
    pages: 300,
    name: "رواية ٣٠٠ صفحة",
    price: "٦٠٠ دولار",
    features: [
      "٣٠٠ صفحة من الكتابة الروائية",
      "تطوير شخصيات غير محدود",
      "تحليل أسلوبي متعمّق",
      "دعم سريع على مدار الساعة",
    ],
  },
];

const faqItems = [
  {
    q: "ما الفرق بين الخطط الثلاث؟",
    a: "خطة المقالات مخصصة لكتابة المقالات والتقارير الصحفية. خطة السيناريوهات لكتابة سيناريوهات الأفلام والمسلسلات. الخطة الشاملة تمنحك وصولاً كاملاً لجميع أنواع الكتابة بما فيها الروايات.",
  },
  {
    q: "كيف يعمل نظام الأسعار؟",
    a: "خطط المقالات والسيناريوهات والشاملة تُشترى مرة واحدة وتتيح لك إنشاء مشاريع غير محدودة من النوع المشمول. للروايات بدون الخطة الشاملة، تدفع لكل مشروع حسب عدد الصفحات.",
  },
  {
    q: "ماذا يحدث بعد شراء الخطة؟",
    a: "بعد إتمام الدفع، يتم تفعيل خطتك فوراً ويمكنك البدء بإنشاء مشاريع غير محدودة من النوع المشمول — جميع المشاريع الجديدة تُفتح تلقائياً.",
  },
  {
    q: "هل يمكنني الكتابة بلهجات مختلفة في السيناريوهات؟",
    a: "نعم! يدعم نظام كتابة السيناريوهات الحوار بالفصحى وبلهجات متعددة (مصرية، خليجية، شامية) حسب اختيارك.",
  },
  {
    q: "ما التخصصات المتاحة في كتابة المقالات؟",
    a: "يدعم النظام أكثر من ١٥ تخصصاً تشمل: الأخبار، السياسة، العلوم، التكنولوجيا، الاقتصاد، الرياضة، الثقافة، الصحة، التعليم، البيئة، الرأي، وغيرها.",
  },
  {
    q: "هل تُحفظ مشاريعي بأمان؟",
    a: "بالتأكيد، جميع مشاريعك محفوظة بأمان ويمكنك الوصول إليها في أي وقت من لوحة التحكم.",
  },
];

const navLinks = [
  { label: "الرئيسية", href: "/" },
  { label: "من نحن", href: "/about" },
  { label: "المميزات", href: "/features" },
  { label: "الأسعار", href: "/pricing" },
  { label: "تواصل معنا", href: "/contact" },
  { label: "أبو هاشم", href: "/abu-hashim" },
];

function isPlanActive(userPlan: string | null | undefined, planKey: string): boolean {
  if (!userPlan || userPlan === "free") return false;
  if (userPlan === "all_in_one") return true;
  return userPlan === planKey;
}

export default function Pricing() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [purchasingPlan, setPurchasingPlan] = useState<string | null>(null);

  const { data: authUser } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  const { data: planData } = useQuery<{ plan: string; planPurchasedAt: string | null }>({
    queryKey: ["/api/user/plan"],
    enabled: !!authUser,
  });

  const userPlan = planData?.plan || "free";
  const isLoggedIn = !!authUser;

  const purchaseMutation = useMutation({
    mutationFn: async (plan: string) => {
      const res = await apiRequest("POST", "/api/plans/purchase", { plan });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.alreadyActive) {
        toast({ title: "الخطة مفعّلة بالفعل" });
        queryClient.invalidateQueries({ queryKey: ["/api/user/plan"] });
        setPurchasingPlan(null);
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: () => {
      toast({ title: "حدث خطأ أثناء إنشاء جلسة الدفع", variant: "destructive" });
      setPurchasingPlan(null);
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ sessionId, plan }: { sessionId: string; plan: string }) => {
      const res = await apiRequest("POST", "/api/plans/verify", { sessionId, plan });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "تم تفعيل خطتك بنجاح! 🎉" });
        queryClient.invalidateQueries({ queryKey: ["/api/user/plan"] });
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      }
    },
    onError: () => {
      toast({ title: "فشل في التحقق من الدفع", variant: "destructive" });
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planSuccess = params.get("plan_success");
    const sessionId = params.get("session_id");
    const plan = params.get("plan");

    if (planSuccess === "true" && sessionId && plan) {
      verifyMutation.mutate({ sessionId, plan });
      window.history.replaceState({}, "", "/pricing");
    }
  }, []);

  const handlePurchase = (planKey: string) => {
    if (!isLoggedIn) {
      setLocation("/login");
      return;
    }
    setPurchasingPlan(planKey);
    purchaseMutation.mutate(planKey);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-background/80 border-b">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <div className="flex items-center gap-3 cursor-pointer">
                <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
                  <Feather className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-serif text-xl font-bold" data-testid="text-logo">QalamAI</span>
              </div>
            </Link>
          </div>
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <span className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors" data-testid={`link-nav-${link.href.replace("/", "") || "home"}`}>
                  {link.label}
                </span>
              </Link>
            ))}
          </div>
          <Link href="/login">
            <Button data-testid="button-login">تسجيل الدخول</Button>
          </Link>
        </div>
      </nav>

      <section className="pt-32 pb-16 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-4 text-foreground" data-testid="text-pricing-title">
            خطط الأسعار
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            اختر الخطة المناسبة لاحتياجاتك — مقالات احترافية، سيناريوهات درامية، أو وصول شامل لكل شيء
          </p>
          {isLoggedIn && userPlan !== "free" && (
            <div className="mt-4 inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium" data-testid="text-current-plan">
              <CheckCircle className="w-4 h-4" />
              <span>خطتك الحالية: {userPlan === "all_in_one" ? "الخطة الشاملة" : userPlan === "essay" ? "خطة المقالات" : userPlan === "scenario" ? "خطة السيناريوهات" : userPlan}</span>
            </div>
          )}
        </div>
      </section>

      <section className="pb-16 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 items-stretch">
          {mainPlans.map((plan) => {
            const active = isPlanActive(userPlan, plan.planKey);
            const isPurchasing = purchasingPlan === plan.planKey && purchaseMutation.isPending;

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col ${plan.highlighted ? "border-primary border-2 shadow-lg" : ""} ${active ? "ring-2 ring-green-500" : ""}`}
                data-testid={`card-plan-${plan.id}`}
              >
                {plan.highlighted && !active && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-medium">
                      <Crown className="w-4 h-4" />
                      <span>أفضل قيمة</span>
                    </div>
                  </div>
                )}
                {active && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-1.5 rounded-full text-sm font-medium">
                      <CheckCircle className="w-4 h-4" />
                      <span>مفعّلة</span>
                    </div>
                  </div>
                )}
                <CardContent className="p-6 flex flex-col flex-1">
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2">
                      <plan.icon className="w-5 h-5 text-primary" />
                      <h3 className="font-serif text-lg font-bold text-foreground" data-testid={`text-plan-name-${plan.id}`}>
                        {plan.name}
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.subtitle}</p>
                    <div data-testid={`text-plan-price-${plan.id}`}>
                      <span className="font-serif text-3xl font-bold text-primary">{plan.price}</span>
                      <span className="text-sm text-muted-foreground mr-2">{plan.priceNote}</span>
                    </div>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-start gap-2 text-sm text-foreground">
                        <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {active ? (
                    <Link href={plan.createHref}>
                      <Button
                        className="w-full"
                        variant="default"
                        size="lg"
                        data-testid={`button-plan-create-${plan.id}`}
                      >
                        <Sparkles className="w-4 h-4 ml-2" />
                        ابدأ مشروعاً جديداً
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      className="w-full"
                      variant={plan.highlighted ? "default" : "outline"}
                      size="lg"
                      onClick={() => handlePurchase(plan.planKey)}
                      disabled={isPurchasing}
                      data-testid={`button-plan-cta-${plan.id}`}
                    >
                      {isPurchasing ? (
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 ml-2" />
                      )}
                      {isPurchasing ? "جارٍ التحويل..." : plan.cta}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-2 mb-3">
              <BookOpen className="w-6 h-6 text-primary" />
              <h2 className="font-serif text-2xl font-bold text-foreground" data-testid="text-novel-tiers-title">
                خطط كتابة الروايات
              </h2>
            </div>
            <p className="text-muted-foreground">
              {isPlanActive(userPlan, "all_in_one")
                ? "خطتك الشاملة تغطي جميع أحجام الروايات — ابدأ الكتابة الآن!"
                : "اختر حجم روايتك وابدأ الكتابة فوراً — أسعار ثابتة بالدولار الأمريكي (أو احصل على الخطة الشاملة لتشمل كل شيء)"}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {novelTiers.map((tier) => (
              <Card
                key={tier.pages}
                className={`relative flex flex-col ${tier.highlighted ? "border-primary border-2" : ""}`}
                data-testid={`card-tier-${tier.pages}`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="default" className="text-xs">الأكثر طلباً</Badge>
                  </div>
                )}
                <CardContent className="p-5 flex flex-col flex-1">
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <h3 className="font-serif font-bold text-foreground" data-testid={`text-tier-name-${tier.pages}`}>
                        {tier.name}
                      </h3>
                    </div>
                    <div data-testid={`text-tier-price-${tier.pages}`}>
                      {isPlanActive(userPlan, "all_in_one") ? (
                        <>
                          <span className="font-serif text-2xl font-bold text-green-600">مشمولة</span>
                          <span className="text-xs text-muted-foreground mr-1 line-through">{tier.price}</span>
                        </>
                      ) : (
                        <>
                          <span className="font-serif text-2xl font-bold text-primary">{tier.price}</span>
                          <span className="text-xs text-muted-foreground mr-1">لكل مشروع</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ul className="space-y-2 mb-6 flex-1">
                    {tier.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-start gap-2 text-sm text-foreground">
                        <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/project/new">
                    <Button
                      className="w-full"
                      variant="outline"
                      data-testid={`button-tier-cta-${tier.pages}`}
                    >
                      ابدأ الآن
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-card/50">
        <div className="max-w-6xl mx-auto text-center space-y-4">
          <h2 className="font-serif text-2xl font-bold text-foreground" data-testid="text-faq-title">
            أسئلة شائعة
          </h2>
          <div className="max-w-3xl mx-auto grid gap-6 text-right mt-8">
            {faqItems.map((item, index) => (
              <div key={index} className="space-y-2" data-testid={`faq-item-${index}`}>
                <h3 className="font-serif font-semibold text-foreground">{item.q}</h3>
                <p className="text-sm text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Feather className="w-4 h-4" />
            <span>QalamAI — منصة الكتابة العربية بالذكاء الاصطناعي</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <span className="cursor-pointer hover:text-foreground transition-colors" data-testid={`link-footer-${link.href.replace("/", "") || "home"}`}>
                  {link.label}
                </span>
              </Link>
            ))}
          </div>
          <span>&copy; {new Date().getFullYear()} QalamAI</span>
        </div>
      </footer>
    </div>
  );
}
