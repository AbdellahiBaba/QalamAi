import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Feather, Check, Crown } from "lucide-react";
import { Link } from "wouter";

const tiers = [
  {
    name: "الباقة المجانية",
    price: "مجاناً",
    description: "للمبتدئين الذين يرغبون في استكشاف عالم الكتابة الروائية",
    highlighted: false,
    features: [
      "كتابة محدودة (3 فصول شهرياً)",
      "مشروع واحد نشط",
      "تطوير شخصيتين رئيسيتين",
      "مخطط رواية أساسي",
      "دعم عبر البريد الإلكتروني",
    ],
    cta: "ابدأ مجاناً",
  },
  {
    name: "باقة الكاتب المحترف",
    price: "٤٩ ر.س/شهرياً",
    description: "للكتّاب الجادّين الذين يسعون لإنجاز رواية كاملة باحترافية",
    highlighted: true,
    features: [
      "كتابة رواية كاملة بلا حدود",
      "حتى 5 مشاريع نشطة",
      "تطوير شخصيات غير محدود",
      "مخططات تفصيلية وأقواس سردية",
      "تحرير وتحسين الفصول",
      "تصدير بصيغة PDF",
      "دعم ذو أولوية",
    ],
    cta: "اشترك الآن",
  },
  {
    name: "باقة الاستوديو",
    price: "٩٩ ر.س/شهرياً",
    description: "للمؤلفين المحترفين ودور النشر التي تحتاج إنتاجية عالية",
    highlighted: false,
    features: [
      "مشاريع غير محدودة",
      "كتابة وتحرير بلا حدود",
      "تطوير شخصيات غير محدود",
      "مخططات تفصيلية متقدمة",
      "تحليل أسلوبي متعمّق",
      "تصدير بصيغ متعددة",
      "دعم سريع على مدار الساعة",
      "وصول مبكر للميزات الجديدة",
    ],
    cta: "اشترك الآن",
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
          <a href="/api/login">
            <Button data-testid="button-login">تسجيل الدخول</Button>
          </a>
        </div>
      </nav>

      <section className="pt-32 pb-16 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-4 text-foreground" data-testid="text-pricing-title">
            خطط الأسعار
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            اختر الباقة المناسبة لرحلتك في عالم الكتابة الروائية العربية
          </p>
        </div>
      </section>

      <section className="pb-24 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 items-stretch">
          {tiers.map((tier, index) => (
            <Card
              key={index}
              className={`relative flex flex-col ${tier.highlighted ? "border-primary border-2 shadow-lg" : ""}`}
              data-testid={`card-tier-${index}`}
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
                <div className="space-y-4 mb-8">
                  <h3 className="font-serif text-xl font-bold text-foreground" data-testid={`text-tier-name-${index}`}>
                    {tier.name}
                  </h3>
                  <div className="font-serif text-3xl font-bold text-primary" data-testid={`text-tier-price-${index}`}>
                    {tier.price}
                  </div>
                  <p className="text-sm text-muted-foreground">{tier.description}</p>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <a href="/api/login">
                  <Button
                    className="w-full"
                    variant={tier.highlighted ? "default" : "outline"}
                    size="lg"
                    data-testid={`button-tier-cta-${index}`}
                  >
                    {tier.cta}
                  </Button>
                </a>
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
              <h3 className="font-serif font-semibold text-foreground">هل يمكنني تغيير الباقة لاحقاً؟</h3>
              <p className="text-sm text-muted-foreground">نعم، يمكنك الترقية أو تخفيض باقتك في أي وقت. ستُطبَّق التغييرات فوراً.</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-serif font-semibold text-foreground">هل تُحفظ مشاريعي عند انتهاء الاشتراك؟</h3>
              <p className="text-sm text-muted-foreground">بالتأكيد، جميع مشاريعك وفصولك محفوظة بأمان ويمكنك الوصول إليها دائماً.</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-serif font-semibold text-foreground">هل يوجد ضمان استرداد الأموال؟</h3>
              <p className="text-sm text-muted-foreground">نقدم ضمان استرداد كامل خلال 14 يوماً من الاشتراك إذا لم تكن راضياً عن الخدمة.</p>
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
