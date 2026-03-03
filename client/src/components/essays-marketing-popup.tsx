import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Newspaper,
  TrendingUp,
  Globe,
  X,
} from "lucide-react";

const SESSION_KEY = "qalamai_essays_popup_shown";

export function EssaysMarketingPopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const alreadyShown = sessionStorage.getItem(SESSION_KEY);
    if (alreadyShown) return;

    const timer = setTimeout(() => {
      setVisible(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem(SESSION_KEY, "true");
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      data-testid="essays-marketing-popup-overlay"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm marketing-backdrop-enter"
        onClick={dismiss}
      />
      <div
        className="relative w-full max-w-md bg-card border rounded-md marketing-popup-enter"
        dir="rtl"
        data-testid="essays-marketing-popup"
      >
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-2 left-2 z-10"
          onClick={dismiss}
          data-testid="button-close-essays-popup"
        >
          <X className="w-4 h-4" />
        </Button>

        <div className="p-6 space-y-5">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center marketing-icon-pulse">
              <Newspaper className="w-7 h-7 text-primary" />
            </div>
            <h2
              className="font-serif text-xl font-bold text-foreground text-center"
              data-testid="text-essays-popup-heading"
            >
              اكتشف أحدث المقالات السياسية والرأي العام
            </h2>
            <p className="text-sm text-muted-foreground text-center leading-relaxed">
              تابع أبرز المقالات والتحليلات السياسية من كتّاب QalamAI
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 shrink-0 rounded-md bg-primary/10 flex items-center justify-center mt-0.5">
                <Newspaper className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">مقالات سياسية متنوعة</p>
                <p className="text-xs text-muted-foreground">آراء وتحليلات من كتّاب عرب مميّزين</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 shrink-0 rounded-md bg-primary/10 flex items-center justify-center mt-0.5">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">الأكثر قراءةً وتفاعلاً</p>
                <p className="text-xs text-muted-foreground">المقالات مرتّبة حسب الشعبية والتفاعل</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 shrink-0 rounded-md bg-primary/10 flex items-center justify-center mt-0.5">
                <Globe className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">محتوى عربي أصيل</p>
                <p className="text-xs text-muted-foreground">مقالات بلغة عربية فصيحة وأسلوب أدبي رفيع</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Link href="/essays" onClick={dismiss}>
              <Button className="w-full" size="lg" data-testid="button-essays-popup-cta">
                <Newspaper className="w-4 h-4 ml-2" />
                تصفّح المقالات الآن
              </Button>
            </Link>
            <Button
              variant="ghost"
              className="w-full"
              onClick={dismiss}
              data-testid="button-essays-popup-dismiss"
            >
              لاحقاً
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
