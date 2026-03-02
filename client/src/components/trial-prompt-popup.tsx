import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Sparkles, BookOpen, PenTool, Loader2, CreditCard, Shield, X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import LtrNum from "@/components/ui/ltr-num";
import { ttqTrack } from "@/lib/ttq";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const SESSION_KEY = "qalamai_trial_prompt_dismissed";

function CardCaptureForm({ clientSecret, onSuccess, onError }: { clientSecret: string; onSuccess: (id: string) => void; onError: (msg: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setIsSubmitting(true);
    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        onError("لم يتم العثور على حقل البطاقة");
        setIsSubmitting(false);
        return;
      }
      const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card: cardElement },
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
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-trial-popup-card-capture">
      <div className="rounded-md border p-4 bg-card">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "hsl(var(--foreground))",
                "::placeholder": { color: "hsl(var(--muted-foreground))" },
              },
              invalid: { color: "hsl(var(--destructive))" },
            },
            hidePostalCode: true,
          }}
        />
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Shield className="w-3.5 h-3.5 shrink-0" />
        <span>بياناتك محمية بتشفير Stripe الآمن</span>
      </div>
      <Button
        type="submit"
        className="w-full bg-amber-600 text-white dark:bg-amber-600 dark:text-white"
        size="lg"
        disabled={!stripe || isSubmitting}
        data-testid="button-trial-popup-confirm"
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

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      data-testid="trial-prompt-popup-overlay"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm marketing-backdrop-enter"
        onClick={dismiss}
      />
      <div
        className="relative w-full max-w-md bg-card border-2 border-amber-500/50 rounded-lg marketing-popup-enter overflow-hidden"
        dir="rtl"
        data-testid="trial-prompt-popup"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />

        <Button
          size="icon"
          variant="ghost"
          className="absolute top-2 left-2 z-10"
          onClick={dismiss}
          data-testid="button-close-trial-prompt"
        >
          <X className="w-4 h-4" />
        </Button>

        <div className="p-6 space-y-5">
          {!showCardCapture ? (
            <>
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center marketing-icon-pulse">
                  <Clock className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                </div>
                <h2
                  className="font-serif text-xl font-bold text-foreground text-center"
                  data-testid="text-trial-prompt-heading"
                >
                  جرّب قلم AI مجاناً لمدة ٢٤ ساعة
                </h2>
                <p className="text-sm text-muted-foreground text-center">
                  ابدأ تجربتك المجانية الآن واستمتع بجميع المميزات
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-3 p-2 rounded-md bg-amber-50/50 dark:bg-amber-950/20">
                  <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="text-sm text-foreground">كتابة رواية كاملة مع أبو هاشم</span>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-md bg-amber-50/50 dark:bg-amber-950/20">
                  <PenTool className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="text-sm text-foreground">مقالات، سيناريوهات، قصص قصيرة وأكثر</span>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-md bg-amber-50/50 dark:bg-amber-950/20">
                  <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="text-sm text-foreground">تحليل أدبي وأغلفة بالذكاء الاصطناعي</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <Badge variant="secondary" className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200">
                  <LtrNum>1</LtrNum> مشروع
                </Badge>
                <Badge variant="secondary" className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200">
                  <LtrNum>3</LtrNum> فصول
                </Badge>
                <Badge variant="secondary" className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200">
                  <LtrNum>1</LtrNum> غلاف
                </Badge>
                <Badge variant="secondary" className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200">
                  <LtrNum>1</LtrNum> تحليل
                </Badge>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <Button
                  size="lg"
                  className="w-full bg-amber-600 text-white dark:bg-amber-600 dark:text-white"
                  onClick={handleStartTrial}
                  disabled={trialLoading}
                  data-testid="button-trial-prompt-start"
                >
                  {trialLoading ? (
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 ml-2" />
                  )}
                  {trialLoading ? "جارٍ التحضير..." : "ابدأ التجربة المجانية"}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={dismiss}
                  data-testid="button-trial-prompt-later"
                >
                  لاحقاً
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                بعد ٢٤ ساعة يتم تفعيل الخطة الشاملة (<LtrNum>$500</LtrNum>) تلقائياً
              </p>
            </>
          ) : (
            <>
              <div className="text-center space-y-2">
                <h3 className="font-serif text-lg font-bold text-foreground" data-testid="text-trial-popup-card-title">
                  أدخل بيانات البطاقة
                </h3>
                <p className="text-sm text-muted-foreground">
                  لن يتم خصم أي مبلغ الآن. سيتم حفظ البطاقة لتفعيل الخطة الشاملة بعد ٢٤ ساعة.
                </p>
              </div>
              {trialClientSecret && stripePromise ? (
                <Elements stripe={stripePromise} options={{ clientSecret: trialClientSecret }}>
                  <CardCaptureForm
                    clientSecret={trialClientSecret}
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
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => { setShowCardCapture(false); setTrialClientSecret(null); }}
                disabled={activateTrialMutation.isPending}
                data-testid="button-trial-popup-back"
              >
                رجوع
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
