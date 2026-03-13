import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  BookOpen,
  Feather,
  PenTool,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { ttqTrack } from "@/lib/ttq";

const STORAGE_KEY = "qalamai_visited";

export function MarketingPopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const alreadyVisited = localStorage.getItem(STORAGE_KEY);
    if (alreadyVisited) return;

    const timer = setTimeout(() => {
      setVisible(true);
      ttqTrack("ViewContent", {
        contentId: "marketing_popup",
        contentType: "popup",
        contentName: "New Visitor Welcome Popup",
      });
    }, 22000);

    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      data-testid="marketing-popup-overlay"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm marketing-backdrop-enter"
        onClick={dismiss}
      />
      <div
        className="relative w-full max-w-md bg-card border rounded-md marketing-popup-enter"
        dir="rtl"
        data-testid="marketing-popup"
      >
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-2 left-2 z-10"
          onClick={dismiss}
          data-testid="button-close-marketing-popup"
          aria-label="إغلاق النافذة"
        >
          <X className="w-4 h-4" />
        </Button>

        <div className="p-6 space-y-5">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center marketing-icon-pulse">
              <Feather className="w-7 h-7 text-primary" />
            </div>
            <h2
              className="font-serif text-xl font-bold text-foreground"
              data-testid="text-marketing-heading"
            >
              مرحباً بك في قلم AI
            </h2>
            <p className="text-sm text-muted-foreground text-center">
              منصّة الكتابة الأدبية العربية بالذكاء الاصطناعي
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 shrink-0 rounded-md bg-primary/10 flex items-center justify-center mt-0.5">
                <BookOpen className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">كتابة روايات كاملة</p>
                <p className="text-xs text-muted-foreground">فصلاً بفصل مع أبو هاشم، مساعدك الأدبي</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 shrink-0 rounded-md bg-primary/10 flex items-center justify-center mt-0.5">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">تطوير شخصيات غنية</p>
                <p className="text-xs text-muted-foreground">أبعاد نفسية واجتماعية عميقة لشخصياتك</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 shrink-0 rounded-md bg-primary/10 flex items-center justify-center mt-0.5">
                <PenTool className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">أسلوب أدبي رفيع</p>
                <p className="text-xs text-muted-foreground">مستوحى من أساليب كبار الروائيين العرب</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 shrink-0 rounded-md bg-primary/10 flex items-center justify-center mt-0.5">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">تصدير واحترافية</p>
                <p className="text-xs text-muted-foreground">تصدير روايتك كملف PDF جاهز للنشر</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Link href="/pricing" onClick={dismiss}>
              <Button className="w-full" size="lg" data-testid="button-marketing-trial-cta">
                <Sparkles className="w-4 h-4 ml-2" />
                جرّب مجاناً لمدة ٢٤ ساعة
              </Button>
            </Link>
            <Button
              variant="ghost"
              className="w-full"
              onClick={dismiss}
              data-testid="button-marketing-dismiss"
            >
              تصفح المنصة
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
