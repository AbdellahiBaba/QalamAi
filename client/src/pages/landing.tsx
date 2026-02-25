import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Feather, Sparkles, Users, PenTool, Globe } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-background/80 border-b">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
              <Feather className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-serif text-xl font-bold" data-testid="text-logo">أبو هاشم</span>
          </div>
          <a href="/api/login">
            <Button data-testid="button-login">تسجيل الدخول</Button>
          </a>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <h1 className="font-serif text-5xl lg:text-6xl font-bold leading-tight text-foreground" data-testid="text-hero-title">
              اكتب روايتك العربية
              <br />
              <span className="text-primary">بأسلوب أدبي رفيع</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
              مساعد ذكي مستوحى من أساليب كبار الروائيين العرب مثل أحلام مستغانمي وإبراهيم نصر الله والدكتورة خولة حمدي. يساعدك في بناء شخصياتك وتطوير أحداث روايتك فصلاً بفصل.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="/api/login">
                <Button size="lg" data-testid="button-get-started">
                  <Sparkles className="w-4 h-4 ml-2" />
                  ابدأ الكتابة الآن
                </Button>
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                مجاني بالكامل
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                لا حاجة لبطاقة ائتمان
              </span>
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

      <section className="py-20 px-6 bg-card/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl font-bold mb-4" data-testid="text-features-title">كيف يعمل أبو هاشم؟</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              ثلاث خطوات بسيطة لتحويل فكرتك إلى رواية عربية متكاملة
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-background">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-serif text-xl font-semibold">أدخل تفاصيل روايتك</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  حدد أسماء الشخصيات وخلفياتها والعلاقات بينها والفكرة الرئيسية والمكان والزمان ونوع السرد
                </p>
              </CardContent>
            </Card>
            <Card className="bg-background">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-serif text-xl font-semibold">راجع المخطط التفصيلي</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  يقوم أبو هاشم بإنشاء مخطط شامل للرواية يتضمن ملخصاً عاماً وتقسيم الفصول وأقواس تطور الشخصيات
                </p>
              </CardContent>
            </Card>
            <Card className="bg-background">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                  <Feather className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-serif text-xl font-semibold">اكتب فصلاً بفصل</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  يكتب لك كل فصل بأسلوب أدبي رفيع مع تطوير تدريجي للشخصيات وربط الأحداث بالفكرة المحورية
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-primary/10 rounded-full">
            <Globe className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">مستوحى من كبار الأدباء العرب</span>
          </div>
          <h2 className="font-serif text-3xl font-bold mb-4">أسلوب أدبي أصيل</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            يحلّل أبو هاشم البنية السردية والإيقاع اللغوي والنبرة العاطفية وبناء الشخصيات من أعمال كبار الروائيين العرب، ليستلهم منها دون نسخ أو تقليد
          </p>
          <a href="/api/login">
            <Button size="lg" data-testid="button-cta-bottom">
              ابدأ مشروعك الروائي
            </Button>
          </a>
        </div>
      </section>

      <footer className="border-t py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Feather className="w-4 h-4" />
            <span>أبو هاشم — مساعد كتابة الرواية العربية</span>
          </div>
          <span>&copy; {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
