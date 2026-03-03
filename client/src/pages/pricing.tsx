import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Feather, Check, Crown, BookOpen, FileText, Sparkles, Film, PenTool, Layers, Loader2, CheckCircle, Tag, X, Clock, CreditCard, Shield } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { ThemeToggle } from "@/components/theme-toggle";
import { SocialMediaIcons } from "@/components/social-media-icons";
import LtrNum from "@/components/ui/ltr-num";
import { ttqTrack, ttqIdentify } from "@/lib/ttq";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const planPriceUSD: Record<string, number> = {
  essay: 50,
  all_in_one: 500,
  scenario: 200,
  novel_150: 300,
  novel_200: 350,
  novel_250: 450,
  novel_300: 600,
};

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
      "كتابة القصص القصيرة — جميع الأنواع الأدبية",
      "كتابة المقالات والأخبار — جميع التخصصات",
      "كتابة السيناريوهات — أفلام ومسلسلات",
      "خواطر وتأملات أدبية — جميع الأساليب",
      "محتوى سوشيال ميديا — جميع المنصات",
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
    a: "خطة المقالات مخصصة لكتابة المقالات والتقارير الصحفية. خطة السيناريوهات لكتابة سيناريوهات الأفلام والمسلسلات. الخطة الشاملة تمنحك وصولاً كاملاً لجميع أنواع الكتابة بما فيها الروايات والقصص القصيرة والخواطر ومحتوى السوشيال ميديا.",
  },
  {
    q: "كيف يعمل نظام الأسعار؟",
    a: "خطط المقالات والسيناريوهات والشاملة تُشترى مرة واحدة وتتيح لك إنشاء مشاريع غير محدودة من النوع المشمول. الخواطر بـ ٩.٩٩$ ومحتوى السوشيال ميديا بـ ١٩.٩٩$ لكل قطعة. للروايات والقصص القصيرة بدون الخطة الشاملة، تدفع لكل مشروع حسب عدد الصفحات.",
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
  { label: "المعرض", href: "/gallery" },
  { label: "المقالات", href: "/essays" },
  { label: "من نحن", href: "/about" },
  { label: "المميزات", href: "/features" },
  { label: "الأسعار", href: "/pricing" },
  { label: "تواصل معنا", href: "/contact" },
  { label: "أبو هاشم", href: "/abu-hashim" },
];

const footerOnlyLinks = [
  { label: "آراء المستخدمين", href: "/reviews" },
];

function isPlanActive(userPlan: string | null | undefined, planKey: string): boolean {
  if (!userPlan || userPlan === "free") return false;
  if (userPlan === "all_in_one") return true;
  return userPlan === planKey;
}

function CardCaptureForm({ onSuccess, onError }: {
  onSuccess: (setupIntentId: string) => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsSubmitting(true);
    try {
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (error) {
        onError(error.message || "فشل في تأكيد بيانات البطاقة");
      } else if (setupIntent && setupIntent.id) {
        onSuccess(setupIntent.id);
      }
    } catch (err: any) {
      onError(err.message || "حدث خطأ غير متوقع");
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="form-card-capture">
      <div className="rounded-md border p-4 bg-card">
        <PaymentElement
          options={{
            layout: "tabs",
          }}
        />
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Shield className="w-3.5 h-3.5 shrink-0" />
        <span>بياناتك محمية بتشفير Stripe الآمن</span>
      </div>
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={!stripe || !elements || isSubmitting}
        data-testid="button-confirm-trial"
      >
        {isSubmitting ? (
          <Loader2 className="w-4 h-4 ml-2 animate-spin" />
        ) : (
          <CreditCard className="w-4 h-4 ml-2" />
        )}
        {isSubmitting ? "جارٍ التأكيد..." : "تأكيد وبدء التجربة المجانية"}
      </Button>
    </form>
  );
}

export default function Pricing() {
  useDocumentTitle("أسعار الخطط — قلم AI");
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [purchasingPlan, setPurchasingPlan] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [validatedPromo, setValidatedPromo] = useState<{ code: string; discountPercent: number; applicableTo: string } | null>(null);
  const [trialDialogOpen, setTrialDialogOpen] = useState(false);
  const [trialClientSecret, setTrialClientSecret] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [trialLoading, setTrialLoading] = useState(false);

  const { data: authUser } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  const { data: planData } = useQuery<{ plan: string; planPurchasedAt: string | null }>({
    queryKey: ["/api/user/plan"],
    enabled: !!authUser,
  });

  const { data: trialStatus } = useQuery<{ trialActive: boolean; trialUsed: boolean; trialEndsAt: string | null }>({
    queryKey: ["/api/trial/status"],
    enabled: !!authUser,
  });

  const userPlan = planData?.plan || "free";
  const isLoggedIn = !!authUser;
  const canStartTrial = isLoggedIn && !trialStatus?.trialUsed && (!userPlan || userPlan === "free");

  const activateTrialMutation = useMutation({
    mutationFn: async (setupIntentId: string) => {
      const res = await apiRequest("POST", "/api/trial/activate", { setupIntentId });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم تفعيل التجربة المجانية بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["/api/user/plan"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trial/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setTrialDialogOpen(false);
      setTrialClientSecret(null);
      ttqTrack("StartTrial", {
        contentId: "trial_24h",
        contentType: "trial",
        contentName: "تجربة مجانية 24 ساعة",
        value: 0,
        currency: "USD",
      });
      setLocation("/");
    },
    onError: () => {
      toast({ title: "فشل في تفعيل التجربة المجانية", variant: "destructive" });
    },
  });

  const handleStartTrial = useCallback(async () => {
    if (!isLoggedIn) {
      setLocation("/login");
      return;
    }
    setTrialLoading(true);
    try {
      const res = await apiRequest("POST", "/api/trial/create-setup-intent", {});
      const data = await res.json();
      if (data.clientSecret && data.publishableKey) {
        setTrialClientSecret(data.clientSecret);
        setStripePromise(loadStripe(data.publishableKey));
        setTrialDialogOpen(true);
      }
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("400")) {
        toast({ title: "لا يمكن بدء التجربة المجانية", description: "ربما استخدمت التجربة من قبل أو لديك خطة مفعّلة", variant: "destructive" });
      } else {
        toast({ title: "حدث خطأ أثناء إعداد التجربة", variant: "destructive" });
      }
    }
    setTrialLoading(false);
  }, [isLoggedIn, setLocation, toast]);

  const handleCardSuccess = useCallback((setupIntentId: string) => {
    activateTrialMutation.mutate(setupIntentId);
  }, [activateTrialMutation]);

  const handleCardError = useCallback((msg: string) => {
    toast({ title: msg, variant: "destructive" });
  }, [toast]);

  const validatePromoMutation = useMutation({
    mutationFn: async ({ code, planType }: { code: string; planType: string }) => {
      const res = await apiRequest("POST", "/api/promo/validate", { code, planType });
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.valid) {
        setValidatedPromo({ code: data.code, discountPercent: data.discountPercent, applicableTo: data.applicableTo });
        toast({ title: `تم تطبيق كود الخصم: \u200e${data.discountPercent}%` });
      } else {
        setValidatedPromo(null);
        toast({ title: data.message || "كود الخصم غير صالح", variant: "destructive" });
      }
    },
    onError: () => {
      setValidatedPromo(null);
      toast({ title: "كود الخصم غير صالح أو منتهي الصلاحية", variant: "destructive" });
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async (plan: string) => {
      const body: any = { plan };
      if (validatedPromo) {
        body.promoCode = validatedPromo.code;
      }
      const res = await apiRequest("POST", "/api/plans/purchase", body);
      return res.json();
    },
    onSuccess: (data, planKey) => {
      if (data.alreadyActive) {
        toast({ title: "الخطة مفعّلة بالفعل" });
        queryClient.invalidateQueries({ queryKey: ["/api/user/plan"] });
        setPurchasingPlan(null);
      } else if (data.checkoutUrl) {
        const planName = mainPlans.find(p => p.planKey === planKey)?.name || planKey;
        ttqTrack("InitiateCheckout", {
          contentId: planKey,
          contentType: "product",
          contentName: planName,
          value: planPriceUSD[planKey] || 0,
          currency: "USD",
        });
        ttqTrack("AddPaymentInfo", {
          contentId: planKey,
          contentType: "product",
          contentName: planName,
          value: planPriceUSD[planKey] || 0,
          currency: "USD",
        });
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
    onSuccess: (data, variables) => {
      if (data.success) {
        toast({ title: "تم تفعيل خطتك بنجاح! 🎉" });
        queryClient.invalidateQueries({ queryKey: ["/api/user/plan"] });
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        const planName = mainPlans.find(p => p.planKey === variables.plan)?.name || variables.plan;
        ttqTrack("Purchase", {
          contentId: variables.plan,
          contentType: "product",
          contentName: planName,
          value: planPriceUSD[variables.plan] || 0,
          currency: "USD",
        });
        ttqTrack("PlaceAnOrder", {
          contentId: variables.plan,
          contentType: "product",
          contentName: planName,
          value: planPriceUSD[variables.plan] || 0,
          currency: "USD",
        });
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
    if (authUser) {
      ttqIdentify({ email: (authUser as any).email, id: String((authUser as any).id || (authUser as any).email) });
    }
    const planName = mainPlans.find(p => p.planKey === planKey)?.name || planKey;
    ttqTrack("AddToCart", {
      contentId: planKey,
      contentType: "product",
      contentName: planName,
      value: planPriceUSD[planKey] || 0,
      currency: "USD",
    });
    setPurchasingPlan(planKey);
    purchaseMutation.mutate(planKey);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-background/80 border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/">
              <div className="flex items-center gap-2 sm:gap-3 cursor-pointer">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-md bg-primary flex items-center justify-center">
                  <Feather className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
                </div>
                <span className="font-serif text-lg sm:text-xl font-bold" data-testid="text-logo">QalamAI</span>
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
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login">
              <Button size="sm" className="text-xs sm:text-sm" data-testid="button-login">تسجيل الدخول</Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="pt-24 sm:pt-32 pb-12 sm:pb-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-bold mb-4 text-foreground" data-testid="text-pricing-title">
            خطط الأسعار
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            اختر الخطة المناسبة لاحتياجاتك — مقالات، سيناريوهات، خواطر، محتوى سوشيال ميديا، أو وصول شامل لكل شيء
          </p>
          {isLoggedIn && userPlan !== "free" && (
            <div className="mt-4 inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium" data-testid="text-current-plan">
              <CheckCircle className="w-4 h-4" />
              <span>خطتك الحالية: {userPlan === "all_in_one" ? "الخطة الشاملة" : userPlan === "essay" ? "خطة المقالات" : userPlan === "scenario" ? "خطة السيناريوهات" : userPlan === "trial" ? "تجربة مجانية" : userPlan}</span>
            </div>
          )}
        </div>
      </section>

      {canStartTrial && (
        <section className="pb-8 px-4 sm:px-6">
          <div className="max-w-2xl mx-auto">
            <Card
              className="relative border-2 border-amber-500/50 bg-gradient-to-br from-amber-50/50 to-amber-100/30 dark:from-amber-950/20 dark:to-amber-900/10"
              data-testid="card-trial"
            >
              <CardContent className="p-6 sm:p-8 text-center space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  <h2 className="font-serif text-xl sm:text-2xl font-bold text-foreground" data-testid="text-trial-title">
                    تجربة مجانية — ٢٤ ساعة
                  </h2>
                </div>
                <p className="text-muted-foreground text-sm sm:text-base">
                  جرّب جميع مميزات المنصة مجاناً لمدة ٢٤ ساعة
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Badge variant="secondary" className="text-xs">
                    <LtrNum>1</LtrNum> مشروع
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <LtrNum>3</LtrNum> فصول
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <LtrNum>1</LtrNum> غلاف
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <LtrNum>1</LtrNum> تحليل
                  </Badge>
                </div>
                <Button
                  size="lg"
                  className="bg-amber-600 text-white border-amber-700 dark:bg-amber-600 dark:text-white dark:border-amber-700"
                  onClick={handleStartTrial}
                  disabled={trialLoading || activateTrialMutation.isPending}
                  data-testid="button-start-trial"
                >
                  {trialLoading ? (
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 ml-2" />
                  )}
                  {trialLoading ? "جارٍ التحضير..." : "ابدأ التجربة المجانية"}
                </Button>
                <p className="text-xs text-muted-foreground" data-testid="text-trial-fine-print">
                  بعد انتهاء الفترة التجريبية، يتم تفعيل خطة الشاملة (<LtrNum>$500</LtrNum>) تلقائياً
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      <Dialog open={trialDialogOpen} onOpenChange={(open) => {
        if (!activateTrialMutation.isPending) {
          setTrialDialogOpen(open);
          if (!open) setTrialClientSecret(null);
        }
      }}>
        <DialogContent className="sm:max-w-md" dir="rtl" data-testid="dialog-trial-card-capture">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-center">أدخل بيانات البطاقة</DialogTitle>
            <DialogDescription className="text-center text-sm">
              لن يتم خصم أي مبلغ الآن. سيتم حفظ البطاقة لتفعيل الخطة الشاملة بعد ٢٤ ساعة.
            </DialogDescription>
          </DialogHeader>
          {trialClientSecret && stripePromise ? (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret: trialClientSecret,
                appearance: {
                  theme: document.documentElement.classList.contains("dark") ? "night" : "stripe",
                  variables: {
                    colorPrimary: "#d97706",
                    borderRadius: "8px",
                  },
                },
              }}
            >
              <CardCaptureForm
                onSuccess={handleCardSuccess}
                onError={handleCardError}
              />
            </Elements>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {activateTrialMutation.isPending && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>جارٍ تفعيل التجربة...</span>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <section className="pb-8 px-4 sm:px-6">
        <div className="max-w-md mx-auto">
          <Card data-testid="card-promo-code">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">كود خصم</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="أدخل كود الخصم"
                  className="flex-1"
                  data-testid="input-promo-code"
                />
                <Button
                  size="default"
                  onClick={() => {
                    if (!promoCode.trim()) return;
                    validatePromoMutation.mutate({ code: promoCode.trim(), planType: "" });
                  }}
                  disabled={!promoCode.trim() || validatePromoMutation.isPending}
                  data-testid="button-apply-promo"
                >
                  {validatePromoMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "تطبيق"
                  )}
                </Button>
              </div>
              {validatedPromo && (
                <div className="flex items-center gap-2" data-testid="text-promo-applied">
                  <Badge variant="default" className="bg-green-600" data-testid="badge-promo-discount">
                    خصم <LtrNum>{validatedPromo.discountPercent}%</LtrNum>
                  </Badge>
                  <span className="text-xs text-muted-foreground">تم تطبيق الكود بنجاح</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setValidatedPromo(null); setPromoCode(""); }}
                    data-testid="button-remove-promo"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="pb-12 sm:pb-16 px-4 sm:px-6">
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

      <section className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-2 mb-3">
              <BookOpen className="w-6 h-6 text-primary" />
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-foreground" data-testid="text-novel-tiers-title">
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

      <section className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-2">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-foreground" data-testid="text-short-story-title">
              القصة القصيرة
            </h2>
            <p className="text-muted-foreground">
              {isPlanActive(userPlan, "all_in_one")
                ? "خطتك الشاملة تغطي جميع القصص القصيرة — ابدأ الكتابة الآن!"
                : "اكتب قصة قصيرة مكثفة ومؤثرة بأسلوب أمهر كتّاب القصة العربية"}
            </p>
          </div>
          <Card data-testid="card-short-story-pricing">
            <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-right space-y-1">
                <h3 className="font-serif font-bold text-lg">قصة قصيرة (١٠-٥٠ صفحة)</h3>
                <p className="text-sm text-muted-foreground">مقاطع مترابطة، شخصيات عميقة، نهايات مؤثرة — بأسلوب يوسف إدريس وزكريا تامر وغسان كنفاني</p>
              </div>
              <div className="flex flex-col items-center gap-2 shrink-0">
                {isPlanActive(userPlan, "all_in_one") ? (
                  <span className="font-serif text-2xl font-bold text-green-600">مشمولة</span>
                ) : (
                  <span className="font-serif text-2xl font-bold text-primary">٨٠ دولار</span>
                )}
                <Link href="/project/new/short-story">
                  <Button variant="outline" data-testid="button-short-story-cta">ابدأ الآن</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-2">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-foreground" data-testid="text-single-pieces-title">
              محتوى فردي
            </h2>
            <p className="text-muted-foreground">
              {isPlanActive(userPlan, "all_in_one")
                ? "خطتك الشاملة تغطي جميع أنواع المحتوى — ابدأ الكتابة الآن!"
                : "خواطر أدبية ومحتوى سوشيال ميديا — أسعار مناسبة لكل قطعة"}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            <Card data-testid="card-khawater-pricing">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <Feather className="w-5 h-5 text-primary" />
                  <h3 className="font-serif font-bold text-lg">خواطر وتأملات</h3>
                </div>
                <p className="text-sm text-muted-foreground text-right">تأملات أدبية وخواطر عميقة بأسلوب جبران وأنيس منصور</p>
                <div className="flex items-center justify-between">
                  {isPlanActive(userPlan, "all_in_one") ? (
                    <span className="font-serif text-2xl font-bold text-green-600">مشمولة</span>
                  ) : (
                    <span className="font-serif text-2xl font-bold text-primary">٩.٩٩ دولار</span>
                  )}
                  <Link href="/project/new/khawater">
                    <Button variant="outline" data-testid="button-khawater-cta">ابدأ الآن</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-social-media-pricing">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="font-serif font-bold text-lg">محتوى سوشيال ميديا</h3>
                </div>
                <p className="text-sm text-muted-foreground text-right">محتوى احترافي لتويتر وإنستغرام ولينكدإن وفيسبوك ويوتيوب وتيك توك</p>
                <div className="flex items-center justify-between">
                  {isPlanActive(userPlan, "all_in_one") ? (
                    <span className="font-serif text-2xl font-bold text-green-600">مشمولة</span>
                  ) : (
                    <span className="font-serif text-2xl font-bold text-primary">١٩.٩٩ دولار</span>
                  )}
                  <Link href="/project/new/social-media">
                    <Button variant="outline" data-testid="button-social-media-cta">ابدأ الآن</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-card/30">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-2">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-foreground" data-testid="text-analysis-tools-title">
              أدوات التحليل المتقدمة
            </h2>
            <p className="text-muted-foreground">
              فحص الاستمرارية وتحليل الأسلوب الأدبي — أدوات ذكية لتحسين جودة كتاباتك
            </p>
          </div>
          <Card data-testid="card-analysis-pricing">
            <CardContent className="p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-6 text-right">
                <div className="space-y-2">
                  <h3 className="font-serif font-bold">فحص الاستمرارية</h3>
                  <p className="text-sm text-muted-foreground">يراجع جميع الفصول بحثاً عن تناقضات في الشخصيات والأحداث والخط الزمني</p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-serif font-bold">تحليل الأسلوب الأدبي</h3>
                  <p className="text-sm text-muted-foreground">تحليل شامل لأسلوب الكتابة مع مقارنة بأساليب كبار الأدباء العرب</p>
                </div>
              </div>
              <div className="border-t pt-4 space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="font-medium">٣ استخدامات مجانية لكل مشروع</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <span>استخدامات إضافية: <span className="font-semibold text-primary">٥٩.٩٩ دولار</span> لكل ٣ استخدامات</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-card/50">
        <div className="max-w-6xl mx-auto text-center space-y-4">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-foreground" data-testid="text-faq-title">
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

      <footer className="border-t py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <SocialMediaIcons size="sm" className="mb-4" />
          <div className="flex flex-col sm:flex-row flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Feather className="w-4 h-4" />
              <span>QalamAI — منصة الكتابة العربية بالذكاء الاصطناعي</span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {[...navLinks, ...footerOnlyLinks].map((link) => (
                <Link key={link.href} href={link.href}>
                  <span className="cursor-pointer hover:text-foreground transition-colors" data-testid={`link-footer-${link.href.replace("/", "") || "home"}`}>
                    {link.label}
                  </span>
                </Link>
              ))}
            </div>
            <span>&copy; {new Date().getFullYear()} QalamAI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
