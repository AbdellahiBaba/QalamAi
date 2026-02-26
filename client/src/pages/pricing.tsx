import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Feather, Check, Crown, BookOpen, FileText, Sparkles } from "lucide-react";
import { Link } from "wouter";

const tiers = [
  {
    pages: 150,
    name: "رواية ١٥٠ صفحة",
    price: "٣٠٠ دولار",
    priceNote: "دفعة واحدة",
    highlighted: false,
    features: [
      "١٥٠ صفحة من الكتابة الروائية",
      "كتابة غير محدودة الكلمات",
      "تطوير شخصيات كامل",
      "مخطط رواية تفصيلي",
      "كتابة تلقائية بالذكاء الاصطناعي",
      "تصدير بصيغة PDF و EPUB",
    ],
    cta: "ابدأ الآن",
  },
  {
    pages: 200,
    name: "رواية ٢٠٠ صفحة",
    price: "٣٥٠ دولار",
    priceNote: "دفعة واحدة",
    highlighted: false,
    features: [
      "٢٠٠ صفحة من الكتابة الروائية",
      "كتابة غير محدودة الكلمات",
      "تطوير شخصيات كامل",
      "مخطط رواية تفصيلي",
      "كتابة تلقائية بالذكاء الاصطناعي",
      "تصدير بصيغة PDF و EPUB",
    ],
    cta: "ابدأ الآن",
  },
  {
    pages: 250,
    name: "رواية ٢٥٠ صفحة",
    price: "٤٥٠ دولار",
    priceNote: "دفعة واحدة",
    highlighted: true,
    features: [
      "٢٥٠ صفحة من الكتابة الروائية",
      "كتابة غير محدودة الكلمات",
      "تطوير شخصيات كامل",
      "مخطط رواية تفصيلي وأقواس سردية",
      "كتابة تلقائية بالذكاء الاصطناعي",
      "تصدير بصيغة PDF و EPUB",
      "دعم ذو أولوية",
    ],
    cta: "ابدأ الآن",
  },
  {
    pages: 300,
    name: "رواية ٣٠٠ صفحة",
    price: "٦٠٠ دولار",
    priceNote: "دفعة واحدة",
    highlighted: false,
    features: [
      "٣٠٠ صفحة من الكتابة الروائية",
      "كتابة غير محدودة الكلمات",
      "تطوير شخصيات غير محدود",
      "مخطط رواية تفصيلي وأقواس سردية",
      "كتابة تلقائية بالذكاء الاصطناعي",
      "تحليل أسلوبي متعمّق",
      "تصدير بصيغة PDF و EPUB",
      "دعم سريع على مدار الساعة",
    ],
    cta: "ابدأ الآن",
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

export default function Pricing() {
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
            أسعار كتابة الرواية
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            اختر حجم روايتك وابدأ الكتابة فوراً — أسعار ثابتة بالدولار الأمريكي
          </p>
        </div>
      </section>

      <section className="pb-24 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {tiers.map((tier, index) => (
            <Card
              key={index}
              className={`relative flex flex-col ${tier.highlighted ? "border-primary border-2 shadow-lg" : ""}`}
              data-testid={`card-tier-${tier.pages}`}
            >
              {tier.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-medium">
                    <Crown className="w-4 h-4" />
                    <span>الأكثر طلباً</span>
                  </div>
                </div>
              )}
              <CardContent className="p-6 flex flex-col flex-1">
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <h3 className="font-serif text-lg font-bold text-foreground" data-testid={`text-tier-name-${tier.pages}`}>
                      {tier.name}
                    </h3>
                  </div>
                  <div data-testid={`text-tier-price-${tier.pages}`}>
                    <span className="font-serif text-3xl font-bold text-primary">{tier.price}</span>
                    <span className="text-sm text-muted-foreground mr-2">{tier.priceNote}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    <span data-testid={`text-tier-pages-${tier.pages}`}>{tier.pages} صفحة — كتابة غير محدودة</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/new-project">
                  <Button
                    className="w-full"
                    variant={tier.highlighted ? "default" : "outline"}
                    size="lg"
                    data-testid={`button-tier-cta-${tier.pages}`}
                  >
                    <Sparkles className="w-4 h-4 ml-2" />
                    {tier.cta}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="py-16 px-6 bg-card/50">
        <div className="max-w-6xl mx-auto text-center space-y-4">
          <h2 className="font-serif text-2xl font-bold text-foreground" data-testid="text-faq-title">
            أسئلة شائعة
          </h2>
          <div className="max-w-3xl mx-auto grid gap-6 text-right mt-8">
            <div className="space-y-2">
              <h3 className="font-serif font-semibold text-foreground">كيف يعمل نظام الأسعار؟</h3>
              <p className="text-sm text-muted-foreground">تختار حجم روايتك (عدد الصفحات) وتدفع مرة واحدة. عدد الصفحات يحدد هيكل الرواية وعدد الفصول.</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-serif font-semibold text-foreground">ماذا يحدث بعد الدفع؟</h3>
              <p className="text-sm text-muted-foreground">بعد إتمام الدفع، يتم تفعيل مشروعك فوراً ويمكنك البدء بكتابة المخطط والفصول باستخدام الذكاء الاصطناعي.</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-serif font-semibold text-foreground">هل تُحفظ مشاريعي بأمان؟</h3>
              <p className="text-sm text-muted-foreground">بالتأكيد، جميع مشاريعك وفصولك محفوظة بأمان ويمكنك الوصول إليها في أي وقت.</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-serif font-semibold text-foreground">هل هناك حد للكلمات؟</h3>
              <p className="text-sm text-muted-foreground">لا! الكتابة غير محدودة الكلمات في جميع الباقات. عدد الصفحات يحدد هيكل الرواية وعدد الفصول فقط.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Feather className="w-4 h-4" />
            <span>QalamAI — منصة كتابة الرواية العربية بالذكاء الاصطناعي</span>
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
