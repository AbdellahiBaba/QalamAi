import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import {
  Feather,
  BookOpen,
  Users,
  Map,
  PenTool,
  Edit3,
  ShieldCheck,
} from "lucide-react";

const navLinks = [
  { title: "الرئيسية", href: "/" },
  { title: "من نحن", href: "/about" },
  { title: "المميزات", href: "/features" },
  { title: "الأسعار", href: "/pricing" },
  { title: "تواصل معنا", href: "/contact" },
  { title: "أبو هاشم", href: "/abu-hashim" },
];

const features = [
  {
    icon: BookOpen,
    title: "كتابة الروايات العربية",
    description:
      "يساعدك أبو هاشم في كتابة روايات عربية متكاملة بأسلوب أدبي رفيع مستوحى من كبار الروائيين العرب. يبدأ معك من الفكرة الأولى ويرافقك حتى الفصل الأخير، مع الحفاظ على الاتساق السردي والنبرة الأدبية طوال العمل.",
  },
  {
    icon: Users,
    title: "تطوير الشخصيات",
    description:
      "أنشئ شخصيات غنية ومتعددة الأبعاد بخلفيات نفسية واجتماعية معمّقة. يساعدك أبو هاشم في رسم ملامح كل شخصية وتحديد دوافعها وصراعاتها الداخلية وعلاقاتها مع باقي الشخصيات لتكون مقنعة وحيّة.",
  },
  {
    icon: Map,
    title: "بناء الحبكة والمخططات",
    description:
      "صمّم هيكل روايتك بمخطط تفصيلي شامل يتضمن ملخصاً عاماً وتقسيماً للفصول وأقواس تطور الشخصيات. يضمن أبو هاشم أن تسير الأحداث بتسلسل منطقي ومتماسك مع الحفاظ على عنصر التشويق.",
  },
  {
    icon: PenTool,
    title: "كتابة الفصول",
    description:
      "يكتب لك كل فصل بأسلوب أدبي راقٍ يجمع بين جمال اللغة العربية الفصحى وسلاسة السرد الحديث. يراعي التطوير التدريجي للأحداث والشخصيات مع ربط كل فصل بالفكرة المحورية للرواية.",
  },
  {
    icon: Edit3,
    title: "التحرير والتحسين",
    description:
      "راجع وحسّن نصوصك مع اقتراحات ذكية لتحسين البنية اللغوية والأسلوب الأدبي. يقدّم أبو هاشم ملاحظات دقيقة على الإيقاع السردي واختيار المفردات وبناء الجمل لتحقيق أفضل مستوى أدبي.",
  },
  {
    icon: ShieldCheck,
    title: "الالتزام الأخلاقي",
    description:
      "يلتزم أبو هاشم بمعايير أخلاقية صارمة: لا نسخ أو سرقة أدبية، لا محتوى غير لائق أو مخالف للقيم. كل ما يُكتب هو إبداع أصيل بلغة عربية فصيحة تحترم الذوق العام وتصون جمال الأدب العربي.",
  },
];

export default function Features() {
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
                <span className="text-sm text-muted-foreground cursor-pointer hover-elevate px-2 py-1 rounded-md" data-testid={`link-nav-${link.href.replace("/", "") || "home"}`}>
                  {link.title}
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
          <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-6 text-foreground" data-testid="text-features-hero-title">
            مميزات <span className="text-primary">QalamAI</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            أدوات متكاملة لكتابة الرواية العربية بأسلوب أدبي رفيع، من الفكرة الأولى إلى الفصل الأخير
          </p>
        </div>
      </section>

      <section className="pb-20 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="bg-background" data-testid={`card-feature-${index}`}>
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-serif text-xl font-semibold" data-testid={`text-feature-title-${index}`}>
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed" data-testid={`text-feature-desc-${index}`}>
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="py-20 px-6 bg-card/50">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="font-serif text-3xl font-bold mb-4" data-testid="text-cta-title">
            ابدأ رحلتك الأدبية اليوم
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            انضم إلى QalamAI واكتشف كيف يمكن للذكاء الاصطناعي أن يساعدك في تحويل أفكارك إلى روايات عربية مكتملة
          </p>
          <a href="/api/login">
            <Button size="lg" data-testid="button-cta-features">
              ابدأ الكتابة الآن
            </Button>
          </a>
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
                <span className="cursor-pointer hover-elevate px-1 py-0.5 rounded-md" data-testid={`link-footer-${link.href.replace("/", "") || "home"}`}>
                  {link.title}
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
