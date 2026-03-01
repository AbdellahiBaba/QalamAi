import { useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Feather,
  PenTool,
  Users,
  BookOpen,
  Sparkles,
  Globe,
  Zap,
  Palette,
  Monitor,
  FileText,
  BookMarked,
  ImageIcon,
  ArrowRight,
} from "lucide-react";

function useScrollAnimation() {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const observe = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("animate-in");
              observerRef.current?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
      );
    }
    observerRef.current.observe(node);
  }, []);

  useEffect(() => {
    return () => observerRef.current?.disconnect();
  }, []);

  return observe;
}

function AnimatedSection({ children, className = "", stagger = 0 }: { children: React.ReactNode; className?: string; stagger?: number }) {
  const observe = useScrollAnimation();
  return (
    <div
      ref={observe}
      className={`promo-animate ${stagger ? `promo-stagger-${stagger}` : ""} ${className}`}
    >
      {children}
    </div>
  );
}

const capabilities = [
  { icon: PenTool, title: "مساعد كتابة عربي ذكي", desc: "ذكاء اصطناعي متخصص في الأدب العربي الفصيح" },
  { icon: BookOpen, title: "توليد الروايات والقصص", desc: "روايات وقصص كاملة، فصلاً بفصل، بأسلوب أدبي رفيع" },
  { icon: FileText, title: "إنشاء محتوى احترافي", desc: "مقالات وسيناريوهات وخواطر ومحتوى سوشيال ميديا" },
  { icon: Zap, title: "مخرجات سريعة ودقيقة", desc: "نتائج فورية بدقة لغوية وأسلوبية عالية" },
  { icon: Globe, title: "وعي ثقافي عميق", desc: "مستلهم من كبار الأدباء العرب مع احترام القيم والثقافة" },
  { icon: Monitor, title: "واجهة سهلة الاستخدام", desc: "تصميم عصري وبسيط يناسب المبتدئين والمحترفين" },
];

const interfacePanels = [
  { icon: PenTool, title: "محرر الكتابة الذكي", desc: "اكتب وحرّر مع مساعدة أبو هاشم اللحظية — تدفّق إبداعي بلا حدود مع اقتراحات أسلوبية فورية" },
  { icon: Users, title: "بناء الشخصيات", desc: "أنشئ شخصيات ثلاثية الأبعاد بأبعاد نفسية واجتماعية عميقة وعلاقات متشابكة" },
  { icon: Palette, title: "توليد أغلفة فنية", desc: "أغلفة كتب احترافية بالذكاء الاصطناعي مع خط عربي أنيق على الغلاف" },
];

const quotes = [
  { en: "Where ideas become stories", ar: "حيث تتحوّل الأفكار إلى قصص" },
  { en: "Your Arabic creativity partner", ar: "شريكك الإبداعي العربي" },
  { en: "Smart. Fast. Authentic.", ar: "ذكي. سريع. أصيل." },
];

const exportCards = [
  { icon: FileText, title: "تصدير PDF", desc: "ملفات PDF احترافية بخط عربي أنيق مع دعم كامل للاتجاه من اليمين لليسار" },
  { icon: BookMarked, title: "تصدير EPUB", desc: "كتب إلكترونية جاهزة للنشر على جميع منصات القراءة الرقمية" },
  { icon: ImageIcon, title: "أغلفة بالذكاء الاصطناعي", desc: "تصميم أغلفة كتب فريدة بتقنية DALL-E مع عنوان عربي مدمج" },
];

export default function Promo() {
  return (
    <div className="bg-background text-foreground overflow-x-hidden" dir="rtl">
      <Link href="/">
        <Button
          variant="outline"
          size="sm"
          className="fixed top-4 right-4 z-50 gap-1.5 bg-background/80 backdrop-blur-md"
          data-testid="button-back-home"
        >
          <ArrowRight className="w-4 h-4" />
          الرئيسية
        </Button>
      </Link>

      <section
        className="relative min-h-screen flex items-center justify-center bg-secondary overflow-hidden"
        data-testid="section-hero"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-secondary via-secondary to-black/90" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full bg-primary/30 blur-[120px]" />
          <div className="absolute bottom-1/4 left-1/4 w-72 h-72 rounded-full bg-primary/20 blur-[100px]" />
        </div>

        <div className="relative z-10 text-center px-4 space-y-6 max-w-3xl mx-auto">
          <div className="promo-hero-fade flex justify-center">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-primary flex items-center justify-center promo-glow" data-testid="icon-hero-logo">
              <Feather className="w-10 h-10 sm:w-12 sm:h-12 text-primary-foreground" />
            </div>
          </div>
          <h1
            className="promo-hero-fade-d1 font-serif text-5xl sm:text-7xl lg:text-8xl font-bold text-primary tracking-tight"
            data-testid="text-hero-title"
          >
            QalamAI
          </h1>
          <p
            className="promo-hero-fade-d2 font-serif text-xl sm:text-2xl lg:text-3xl text-secondary-foreground/90 leading-relaxed"
            data-testid="text-hero-tagline"
          >
            حيث تتحوّل الأفكار إلى قصص
          </p>
          <p
            className="promo-hero-fade-d3 text-base sm:text-lg text-secondary-foreground/60"
            data-testid="text-hero-subtitle"
          >
            منصّة الكتابة الأدبية العربية بالذكاء الاصطناعي
          </p>
          <div className="promo-hero-fade-d4 flex items-center justify-center gap-3 pt-4">
            <Link href="/login">
              <Button size="lg" data-testid="button-hero-start">
                <Sparkles className="w-5 h-5 ml-2" />
                ابدأ الآن
              </Button>
            </Link>
            <Link href="/features">
              <Button size="lg" variant="outline" className="border-secondary-foreground/30 text-secondary-foreground" data-testid="button-hero-discover">
                اكتشف المزيد
              </Button>
            </Link>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-secondary-foreground/30 flex items-start justify-center p-1.5">
            <div className="w-1.5 h-2.5 rounded-full bg-primary" />
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-32 px-4 sm:px-6" data-testid="section-interface">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="text-center mb-16 sm:mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">منصّة متكاملة</span>
            </div>
            <h2
              className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold mb-4"
              data-testid="text-interface-title"
            >
              تجربة كتابة لم تعرفها من قبل
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg" data-testid="text-interface-subtitle">
              أدوات احترافية مصممة خصيصاً للكاتب العربي
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {interfacePanels.map((panel, i) => (
              <AnimatedSection key={i} stagger={i + 1}>
                <div
                  className="relative rounded-2xl border bg-card p-8 sm:p-10 space-y-5"
                  data-testid={`card-interface-${i}`}
                >
                  <div className="relative">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                      <panel.icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="font-serif text-xl font-bold mb-3" data-testid={`text-interface-title-${i}`}>
                      {panel.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">{panel.desc}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-32 px-4 sm:px-6 bg-card/50" data-testid="section-capabilities">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="text-center mb-16 sm:mb-20">
            <h2
              className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold mb-4"
              data-testid="text-capabilities-title"
            >
              قدرات لا مثيل لها
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg" data-testid="text-capabilities-subtitle">
              كل ما تحتاجه لإنتاج محتوى عربي أصيل واحترافي
            </p>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {capabilities.map((cap, i) => (
              <AnimatedSection key={i} stagger={i + 1}>
                <div className="flex items-start gap-4 p-6 rounded-xl bg-background border" data-testid={`card-capability-${i}`}>
                  <div className="w-12 h-12 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                    <cap.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold mb-1" data-testid={`text-capability-title-${i}`}>
                      {cap.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{cap.desc}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-secondary" data-testid="section-quotes">
        {quotes.map((quote, i) => (
          <div key={i} className="py-20 sm:py-28 px-4 sm:px-6">
            <AnimatedSection className="max-w-4xl mx-auto text-center space-y-4">
              <p
                className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold text-primary leading-tight"
                data-testid={`text-quote-ar-${i}`}
              >
                {quote.ar}
              </p>
              <p
                className="text-lg sm:text-xl text-secondary-foreground/50 tracking-wide"
                dir="ltr"
                data-testid={`text-quote-en-${i}`}
              >
                {quote.en}
              </p>
            </AnimatedSection>
            {i < quotes.length - 1 && (
              <div className="max-w-xs mx-auto mt-16">
                <div className="h-px bg-gradient-to-r from-transparent via-secondary-foreground/20 to-transparent" />
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="py-20 sm:py-32 px-4 sm:px-6" data-testid="section-export">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="text-center mb-16 sm:mb-20">
            <h2
              className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold mb-4"
              data-testid="text-export-title"
            >
              من الفكرة إلى الكتاب — بكل الصيغ
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg" data-testid="text-export-subtitle">
              صدّر أعمالك بصيغ احترافية جاهزة للنشر والتوزيع
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {exportCards.map((card, i) => (
              <AnimatedSection key={i} stagger={i + 1}>
                <div
                  className="rounded-2xl border bg-card p-8 sm:p-10 space-y-5 text-center"
                  data-testid={`card-export-${i}`}
                >
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                    <card.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-serif text-xl font-bold" data-testid={`text-export-title-${i}`}>
                    {card.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">{card.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section
        className="relative min-h-[80vh] flex items-center justify-center bg-secondary overflow-hidden"
        data-testid="section-cta"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-secondary to-secondary" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/3 left-1/3 w-80 h-80 rounded-full bg-primary/30 blur-[100px]" />
        </div>

        <AnimatedSection className="relative z-10 text-center px-4 space-y-8 max-w-3xl mx-auto">
          <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center mx-auto promo-glow">
            <Feather className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2
            className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-secondary-foreground leading-tight"
            data-testid="text-cta-title"
          >
            <span className="text-primary">QalamAI</span>
            <br />
            اكتب المستقبل اليوم
          </h2>
          <p
            className="text-xl sm:text-2xl text-secondary-foreground/60 font-medium tracking-wider"
            dir="ltr"
            data-testid="text-cta-website"
          >
            QalamAI.net
          </p>
          <div className="flex items-center justify-center gap-4 pt-4">
            <Link href="/login">
              <Button size="lg" data-testid="button-cta-start">
                <Sparkles className="w-5 h-5 ml-2" />
                ابدأ الآن
              </Button>
            </Link>
            <Link href="/features">
              <Button size="lg" variant="outline" className="border-secondary-foreground/30 text-secondary-foreground" data-testid="button-cta-discover">
                اكتشف المزيد
              </Button>
            </Link>
          </div>
        </AnimatedSection>
      </section>

      <footer className="bg-secondary border-t border-secondary-foreground/10 py-6 px-4 text-center" data-testid="section-footer">
        <p className="text-sm text-secondary-foreground/50" data-testid="text-footer-copyright">
          &copy; {new Date().getFullYear()} QalamAI. جميع الحقوق محفوظة.
        </p>
      </footer>
    </div>
  );
}
