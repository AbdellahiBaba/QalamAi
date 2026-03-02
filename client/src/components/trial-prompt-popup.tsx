import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Sparkles, BookOpen, PenTool, Loader2, CreditCard, Shield, X, Check, Zap, Star } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import LtrNum from "@/components/ui/ltr-num";
import { ttqTrack } from "@/lib/ttq";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const SESSION_KEY = "qalamai_trial_prompt_dismissed";

function CardCaptureForm({ onSuccess, onError }: { onSuccess: (id: string) => void; onError: (msg: string) => void }) {
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
    <form onSubmit={handleSubmit} className="space-y-5" data-testid="form-trial-popup-card-capture">
      <div className="rounded-xl border-2 border-amber-200 dark:border-amber-800/50 p-4 bg-white dark:bg-zinc-900 shadow-sm">
        <PaymentElement
          options={{
            layout: "tabs",
          }}
        />
      </div>

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Shield className="w-3.5 h-3.5 shrink-0 text-green-600 dark:text-green-400" />
        <span>محمية بتشفير <span className="font-semibold">Stripe</span> المعتمد عالمياً</span>
      </div>

      <Button
        type="submit"
        className="w-full h-12 rounded-xl text-base font-bold bg-gradient-to-l from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-200"
        disabled={!stripe || !elements || isSubmitting}
        data-testid="button-trial-popup-confirm"
      >
        {isSubmitting ? (
          <Loader2 className="w-5 h-5 ml-2 animate-spin" />
        ) : (
          <CreditCard className="w-5 h-5 ml-2" />
        )}
        {isSubmitting ? "جارٍ التأكيد..." : "تأكيد وبدء التجربة المجانية"}
      </Button>
    </form>
  );
}

interface TrialPromptPopupProps {
  userPlan: string;
  trialUsed: boolean;
}

export function TrialPromptPopup({ userPlan, trialUsed }: TrialPromptPopupProps) {
  const [visible, setVisible] = useState(false);
  const [showCardCapture, setShowCardCapture] = useState(false);
  const [trialClientSecret, setTrialClientSecret] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [trialLoading, setTrialLoading] = useState(false);
  const { toast } = useToast();

  const canShow = userPlan === "free" && !trialUsed;

  useEffect(() => {
    if (!canShow) return;
    const dismissed = sessionStorage.getItem(SESSION_KEY);
    if (dismissed) return;

    const timer = setTimeout(() => {
      setVisible(true);
      ttqTrack("ViewContent", {
        contentId: "trial_prompt_popup",
        contentType: "popup",
        contentName: "Dashboard Trial Prompt",
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, [canShow]);

  const dismiss = () => {
    setVisible(false);
    setShowCardCapture(false);
    setTrialClientSecret(null);
    setStripePromise(null);
    sessionStorage.setItem(SESSION_KEY, "true");
  };

  const activateTrialMutation = useMutation({
    mutationFn: async (setupIntentId: string) => {
      const res = await apiRequest("POST", "/api/trial/activate", { setupIntentId });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم تفعيل التجربة المجانية بنجاح! 🎉" });
      queryClient.invalidateQueries({ queryKey: ["/api/user/plan"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trial/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setVisible(false);
      setShowCardCapture(false);
      sessionStorage.setItem(SESSION_KEY, "true");
      ttqTrack("StartTrial", {
        contentId: "trial_24h",
        contentType: "trial",
        contentName: "تجربة مجانية 24 ساعة",
        value: 0,
        currency: "USD",
      });
    },
    onError: () => {
      toast({ title: "فشل في تفعيل التجربة المجانية", variant: "destructive" });
    },
  });

  const handleStartTrial = useCallback(async () => {
    setTrialLoading(true);
    try {
      const res = await apiRequest("POST", "/api/trial/create-setup-intent", {});
      const data = await res.json();
      if (data.clientSecret && data.publishableKey) {
        setTrialClientSecret(data.clientSecret);
        setStripePromise(loadStripe(data.publishableKey));
        setShowCardCapture(true);
      } else {
        toast({ title: "حدث خطأ أثناء إعداد التجربة، حاول مرة أخرى", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "لا يمكن بدء التجربة المجانية", description: "ربما استخدمت التجربة من قبل أو لديك خطة مفعّلة", variant: "destructive" });
    }
    setTrialLoading(false);
  }, [toast]);

  const handleCardSuccess = useCallback((setupIntentId: string) => {
    activateTrialMutation.mutate(setupIntentId);
  }, [activateTrialMutation]);

  const handleCardError = useCallback((msg: string) => {
    toast({ title: msg, variant: "destructive" });
  }, [toast]);

  if (!visible || !canShow) return null;

  const isDark = document.documentElement.classList.contains("dark");

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      data-testid="trial-prompt-popup-overlay"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm marketing-backdrop-enter"
        onClick={dismiss}
      />
      <div
        className="relative w-full max-w-[420px] bg-card rounded-2xl marketing-popup-enter overflow-hidden shadow-2xl shadow-black/20 dark:shadow-black/50 border border-amber-200/50 dark:border-amber-800/30"
        dir="rtl"
        data-testid="trial-prompt-popup"
      >
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500" />

        <Button
          size="icon"
          variant="ghost"
          className="absolute top-3 left-3 z-10 h-8 w-8 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
          onClick={dismiss}
          data-testid="button-close-trial-prompt"
        >
          <X className="w-4 h-4" />
        </Button>

        {!showCardCapture ? (
          <div className="flex flex-col">
            <div className="bg-gradient-to-bl from-amber-50 via-amber-50/80 to-orange-50/60 dark:from-amber-950/40 dark:via-amber-950/20 dark:to-orange-950/10 px-6 pt-8 pb-6">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30 marketing-icon-pulse">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-green-500 border-2 border-white dark:border-zinc-900 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </div>
                </div>
                <div className="text-center space-y-1.5">
                  <h2
                    className="font-serif text-xl font-bold text-foreground"
                    data-testid="text-trial-prompt-heading"
                  >
                    جرّب قلم AI مجاناً لمدة ٢٤ ساعة
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    ابدأ تجربتك المجانية واستمتع بجميع مميزات المنصة
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div className="space-y-2">
                {[
                  { icon: BookOpen, text: "كتابة رواية كاملة مع أبو هاشم" },
                  { icon: PenTool, text: "مقالات، سيناريوهات، قصص قصيرة وأكثر" },
                  { icon: Sparkles, text: "تحليل أدبي وأغلفة بالذكاء الاصطناعي" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/15 border border-amber-100/80 dark:border-amber-900/20">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                      <item.icon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <span className="text-sm text-foreground font-medium">{item.text}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                {[
                  { count: 1, label: "مشروع" },
                  { count: 3, label: "فصول" },
                  { count: 1, label: "غلاف" },
                  { count: 1, label: "تحليل" },
                ].map((item, i) => (
                  <Badge key={i} variant="secondary" className="text-xs px-2.5 py-1 bg-amber-100/80 dark:bg-amber-900/25 text-amber-800 dark:text-amber-200 border border-amber-200/50 dark:border-amber-800/30 font-medium">
                    <LtrNum>{item.count}</LtrNum> {item.label}
                  </Badge>
                ))}
              </div>

              <div className="flex flex-col gap-2.5">
                <Button
                  className="w-full h-12 rounded-xl text-base font-bold bg-gradient-to-l from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-200"
                  onClick={handleStartTrial}
                  disabled={trialLoading}
                  data-testid="button-trial-prompt-start"
                >
                  {trialLoading ? (
                    <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5 ml-2" />
                  )}
                  {trialLoading ? "جارٍ التحضير..." : "ابدأ التجربة المجانية"}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground hover:text-foreground text-sm"
                  onClick={dismiss}
                  data-testid="button-trial-prompt-later"
                >
                  لاحقاً
                </Button>
              </div>

              <div className="rounded-xl bg-orange-50/80 dark:bg-orange-950/15 border border-orange-200/50 dark:border-orange-800/20 p-3 text-center">
                <p className="text-xs text-orange-700 dark:text-orange-300 leading-relaxed">
                  <Clock className="w-3 h-3 inline-block ml-1 align-text-bottom" />
                  بعد انتهاء ٢٤ ساعة يتم تفعيل الخطة الشاملة (<LtrNum>$500</LtrNum>) تلقائياً
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-6 py-8 space-y-6">
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
                <CreditCard className="w-7 h-7 text-white" />
              </div>
              <div className="text-center space-y-1.5">
                <h3 className="font-serif text-lg font-bold text-foreground" data-testid="text-trial-popup-card-title">
                  أدخل بيانات البطاقة
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  لن يتم خصم أي مبلغ الآن. سيتم حفظ البطاقة لتفعيل الخطة الشاملة بعد ٢٤ ساعة.
                </p>
              </div>
            </div>

            {trialClientSecret && stripePromise ? (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: trialClientSecret,
                  appearance: {
                    theme: isDark ? "night" : "stripe",
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
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              </div>
            )}

            {activateTrialMutation.isPending && (
              <div className="flex items-center justify-center gap-2 text-sm text-amber-600 dark:text-amber-400 font-medium">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جارٍ تفعيل التجربة...</span>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground hover:text-foreground"
              onClick={() => { setShowCardCapture(false); setTrialClientSecret(null); }}
              disabled={activateTrialMutation.isPending}
              data-testid="button-trial-popup-back"
            >
              رجوع
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
