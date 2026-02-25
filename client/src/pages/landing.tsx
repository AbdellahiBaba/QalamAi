import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import {
  BookOpen,
  Feather,
  Sparkles,
  Users,
  PenTool,
  Globe,
  ShieldCheck,
  Layers,
  MessageSquareQuote,
  Star,
  ChevronLeft,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const navLinks = [
  { label: "الرئيسية", href: "/" },
  { label: "من نحن", href: "/about" },
  { label: "المميزات", href: "/features" },
  { label: "الأسعار", href: "/pricing" },
  { label: "تواصل معنا", href: "/contact" },
  { label: "أبو هاشم", href: "/abu-hashim" },
];

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-background/80 border-b">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
              <Feather className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-serif text-xl font-bold" data-testid="text-logo">QalamAI</span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <span
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  data-testid={`link-nav-${link.href.replace("/", "") || "home"}`}
                >
                  {link.label}
                </span>
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <a href="/api/login">
              <Button variant="outline" data-testid="button-login">تسجيل الدخول</Button>
            </a>
            <a href="/api/login">
              <Button data-testid="button-signup">إنشاء حساب جديد</Button>
            </a>
            <Button
              size="icon"
              variant="ghost"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background px-6 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <span
                  className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer py-1"
                  onClick={() => setMobileMenuOpen(false)}
                  data-testid={`link-mobile-nav-${link.href.replace("/", "") || "home"}`}
                >
                  {link.label}
                </span>
              </Link>
            ))}
          </div>
        )}
      </nav>

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">منصّة الكتابة الأدبية بالذكاء الاصطناعي</span>
            </div>
            <h1 className="font-serif text-5xl lg:text-6xl font-bold leading-tight text-foreground" data-testid="text-hero-title">
              QalamAI
              <br />
              <span className="text-primary">وأبو هاشم</span>
            </h1>
            <p className="font-serif text-xl text-muted-foreground leading-relaxed" data-testid="text-hero-tagline">
              حيث تتحوّل الفكرة إلى رواية، والقلم إلى صوت.
            </p>
            <p className="text-muted-foreground leading-relaxed max-w-lg">
              منصّة QalamAI تجمع بين الذكاء الاصطناعي والأدب العربي لتقدّم لك تجربة كتابة روائية فريدة. أبو هاشم — مساعدك الأدبي — مستوحى من أساليب كبار الروائيين العرب مثل أحلام مستغانمي وإبراهيم نصر الله والدكتورة خولة حمدي.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="/api/login">
                <Button size="lg" data-testid="button-get-started">
                  <PenTool className="w-4 h-4 ml-2" />
                  إنشاء حساب جديد
                </Button>
              </a>
              <a href="/api/login">
                <Button size="lg" variant="outline" data-testid="button-hero-login">
                  تسجيل الدخول
                </Button>
              </a>
              <Link href="/features">
                <Button size="lg" variant="outline" data-testid="button-discover-more">
                  اكتشف المزيد
                  <ChevronLeft className="w-4 h-4 mr-2" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/30 rounded-2xl blur-3xl" />
            <div className="relative bg-card border rounded-2xl p-8 space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <PenTool className="w-4 h-4 text-primary" />
                </div>
                <span className="font-serif text-lg font-semibold">معاينة الكتابة</span>
              </div>
              <div className="font-serif text-lg leading-loose text-muted-foreground space-y-4">
                <p>
                  كانت الشمسُ تميل نحو الأفق، تسكب ذهبها الأخير على أسطح المدينة العتيقة، حين وقف أمام الباب الخشبي المُتآكل، يتأمّل الحروف المنقوشة عليه بأناة من عَبَرَ الزمن...
                </p>
                <p>
                  لم يكن يعلم أنّ هذا الباب سيفتح له عوالم لم يحلم بها قط، عوالم تتشابك فيها خيوط الماضي بنسيج الحاضر.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-4 border-t">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">الفصل الأول — مدخل إلى المجهول</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-card/50" data-testid="section-features">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl font-bold mb-4" data-testid="text-features-title">ما الذي يقدّمه QalamAI؟</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              أدوات متكاملة لتحويل فكرتك إلى رواية عربية أدبية متكاملة
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-background">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-serif text-xl font-semibold" data-testid="text-feature-novel">كتابة الروايات</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  كتابة روايات عربية كاملة بأسلوب أدبي رفيع، فصلاً بفصل، مع تطوير تدريجي للأحداث والشخصيات.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-background">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-serif text-xl font-semibold" data-testid="text-feature-characters">تطوير الشخصيات</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  بناء شخصيات غنية ومعقّدة بأبعاد نفسية واجتماعية عميقة، مع أقواس تطوّر متماسكة عبر الرواية.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-background">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                  <Layers className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-serif text-xl font-semibold" data-testid="text-feature-outlines">بناء المخططات</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  إنشاء مخططات تفصيلية للحبكة وتقسيم الفصول وربط الأحداث بالفكرة المحورية للرواية.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-background">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                  <Feather className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-serif text-xl font-semibold" data-testid="text-feature-editing">التحرير والتحسين</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  مراجعة النصوص وتحسينها لغوياً وأسلوبياً مع الحفاظ على صوت الكاتب الأصلي وأسلوبه المميز.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20 px-6" data-testid="section-why-qalamai">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl font-bold mb-4" data-testid="text-why-title">لماذا QalamAI؟</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              ما يميّزنا عن غيرنا في عالم الكتابة بالذكاء الاصطناعي
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto">
                <Globe className="w-7 h-7 text-secondary-foreground" />
              </div>
              <h3 className="font-serif text-lg font-semibold" data-testid="text-why-arabic">لغة عربية فصيحة</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                مصمّم خصيصاً للكتابة بالعربية الفصحى، مع فهم عميق لقواعد اللغة وبلاغتها وإيقاعها الأدبي.
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto">
                <ShieldCheck className="w-7 h-7 text-secondary-foreground" />
              </div>
              <h3 className="font-serif text-lg font-semibold" data-testid="text-why-ethics">التزام أخلاقي</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                لا نسخ ولا تقليد — كتابة أصيلة تحترم حقوق الملكية الفكرية ولا تتضمّن أي محتوى غير لائق.
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto">
                <Sparkles className="w-7 h-7 text-secondary-foreground" />
              </div>
              <h3 className="font-serif text-lg font-semibold" data-testid="text-why-inspired">مستوحى من كبار الأدباء</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                يحلّل أبو هاشم البنية السردية والإيقاع اللغوي من أعمال كبار الروائيين العرب ليستلهم منها دون نسخ.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-card/50" data-testid="section-testimonials">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl font-bold mb-4" data-testid="text-testimonials-title">ماذا يقول كتّابنا؟</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              آراء من كتّاب استخدموا QalamAI في رحلتهم الأدبية
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-background">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-1 text-primary">
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed italic">
                  <MessageSquareQuote className="w-4 h-4 text-primary inline-block ml-1" />
                  أبو هاشم ساعدني على كتابة فصول روايتي الأولى بأسلوب أدبي لم أكن أتوقّع أنني أستطيع تحقيقه. تجربة رائعة حقاً.
                </p>
                <div className="pt-2 border-t">
                  <p className="font-semibold text-sm">سارة أحمد</p>
                  <p className="text-xs text-muted-foreground">كاتبة روائية مبتدئة</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-background">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-1 text-primary">
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed italic">
                  <MessageSquareQuote className="w-4 h-4 text-primary inline-block ml-1" />
                  المنصّة تفهم اللغة العربية بعمق. الشخصيات التي ساعدني أبو هاشم في بنائها كانت حيّة ومقنعة جداً.
                </p>
                <div className="pt-2 border-t">
                  <p className="font-semibold text-sm">محمد العلي</p>
                  <p className="text-xs text-muted-foreground">كاتب قصص قصيرة</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-background">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-1 text-primary">
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed italic">
                  <MessageSquareQuote className="w-4 h-4 text-primary inline-block ml-1" />
                  أخيراً منصّة تحترم جمال اللغة العربية وتلتزم بالقيم. أنصح بها كل كاتب عربي يبحث عن أداة ذكية.
                </p>
                <div className="pt-2 border-t">
                  <p className="font-semibold text-sm">نورة الحربي</p>
                  <p className="text-xs text-muted-foreground">مدوّنة وكاتبة محتوى</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-primary/10 rounded-full">
            <PenTool className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">ابدأ رحلتك الأدبية اليوم</span>
          </div>
          <h2 className="font-serif text-3xl font-bold mb-4" data-testid="text-cta-title">حوّل فكرتك إلى رواية</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            انضم إلى QalamAI واكتشف قوة الكتابة الأدبية بالذكاء الاصطناعي. أبو هاشم في انتظارك لمساعدتك في كتابة روايتك العربية الأولى.
          </p>
          <a href="/api/login">
            <Button size="lg" data-testid="button-cta-bottom">
              <Sparkles className="w-4 h-4 ml-2" />
              ابدأ مشروعك الروائي
            </Button>
          </a>
        </div>
      </section>

      <footer className="border-t py-12 px-6 bg-secondary text-secondary-foreground">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
                  <Feather className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-serif text-xl font-bold" data-testid="text-footer-logo">QalamAI</span>
              </div>
              <p className="text-sm opacity-80 leading-relaxed">
                منصّة الكتابة الأدبية العربية بالذكاء الاصطناعي. نسعى لتمكين الكتّاب العرب من تحويل أفكارهم إلى روايات بلغة عربية فصيحة.
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-sm" data-testid="text-footer-links-heading">روابط سريعة</h4>
              <div className="flex flex-col gap-2">
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href}>
                    <span
                      className="text-sm opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                      data-testid={`link-footer-${link.href.replace("/", "") || "home"}`}
                    >
                      {link.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-sm" data-testid="text-footer-more-heading">المزيد</h4>
              <div className="flex flex-col gap-2">
                <Link href="/novel-theme">
                  <span className="text-sm opacity-80 hover:opacity-100 transition-opacity cursor-pointer" data-testid="link-footer-novel-theme">
                    فكرة الرواية
                  </span>
                </Link>
                <a href="/api/login">
                  <span className="text-sm opacity-80 hover:opacity-100 transition-opacity cursor-pointer" data-testid="link-footer-login">
                    تسجيل الدخول
                  </span>
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-secondary-foreground/20 pt-6 flex flex-wrap items-center justify-between gap-4 text-sm opacity-70">
            <span>QalamAI — منصّة الكتابة الأدبية بالذكاء الاصطناعي</span>
            <span>&copy; {new Date().getFullYear()} QalamAI. جميع الحقوق محفوظة.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
