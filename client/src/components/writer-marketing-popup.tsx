import { useState, useEffect } from "react";
import { X, PenLine, TrendingUp, Coins, Star, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const STORAGE_KEY = "qalamai_marketing_popup_seen";

export default function WriterMarketingPopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      const timer = setTimeout(() => setVisible(true), 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="رسالة ترحيبية"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={dismiss}
      />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-amber-300/30 dark:border-amber-700/40 bg-white dark:bg-zinc-900 animate-in slide-in-from-bottom-8 duration-500"
        dir="rtl"
      >
        {/* Gradient header strip */}
        <div className="h-1.5 w-full bg-gradient-to-l from-amber-400 via-yellow-300 to-amber-600" />

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-5">
          {/* Close button */}
          <button
            onClick={dismiss}
            className="absolute top-4 left-4 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="إغلاق"
            data-testid="button-close-marketing-popup"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Headline */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 mb-1">
              <PenLine className="w-7 h-7 text-amber-500" />
            </div>
            <h2 className="font-serif text-2xl font-bold leading-snug text-foreground">
              حوّل كلماتك إلى دخل شهري ثابت
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
              انضم إلى آلاف الكتّاب العرب الذين يكسبون من شغفهم بالكتابة على منصة قلم AI
            </p>
          </div>

          {/* Benefits */}
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <Coins className="w-4 h-4 text-amber-600" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">اكسب من كل مقال تنشره</p>
                <p className="text-xs text-muted-foreground">تلقّ إكراميات مباشرة من قرّائك عبر نظام الدعم</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-amber-600" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">ابنِ جمهورك وعلامتك الأدبية</p>
                <p className="text-xs text-muted-foreground">أدوات الذكاء الاصطناعي تساعدك على الكتابة بشكل احترافي وجذب متابعين</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <Star className="w-4 h-4 text-amber-600" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">توثيق وتميّز بالشارة الزرقاء</p>
                <p className="text-xs text-muted-foreground">احصل على الشارة الزرقاء وكن من كتّاب القمة في لوحة المتصدرين</p>
              </div>
            </li>
          </ul>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <Link href="/auth" className="flex-1" onClick={dismiss}>
              <Button
                className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-md"
                data-testid="button-marketing-signup"
              >
                ابدأ مجاناً الآن
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/leaderboard" className="flex-1" onClick={dismiss}>
              <Button
                variant="outline"
                className="w-full gap-2 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                data-testid="button-marketing-leaderboard"
              >
                استعرض المتصدرين
              </Button>
            </Link>
          </div>

          <p className="text-[11px] text-center text-muted-foreground">
            منصة QalamAI — أول منصة ذكاء اصطناعي متخصصة في الكتابة الأدبية العربية
          </p>
        </div>
      </div>
    </div>
  );
}
