import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { useDocumentTitle } from "@/hooks/use-document-title";
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
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { MarketingPopup } from "@/components/marketing-popup";
import { EssaysMarketingPopup } from "@/components/essays-marketing-popup";
import { SharedNavbar } from "@/components/shared-navbar";
import { SharedFooter } from "@/components/shared-footer";

interface LandingReview {
  id: number;
  reviewerName: string;
  reviewerBio: string | null;
  content: string;
  rating: number;
}

export default function Landing() {
  useDocumentTitle("QalamAI — حيث تتحوّل الفكرة إلى رواية");
  const { data: realReviews } = useQuery<LandingReview[]>({
    queryKey: ["/api/reviews"],
  });

  const averageRating = realReviews && realReviews.length > 0
    ? (realReviews.reduce((sum, r) => sum + r.rating, 0) / realReviews.length).toFixed(1)
    : "5";
  const reviewCount = realReviews ? realReviews.length + 3 : 3;

  const softwareAppJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "QalamAI",
    "applicationCategory": "LifestyleApplication",
    "operatingSystem": "Web",
    "url": "https://qalamai.net",
    "description": "منصّة الكتابة الروائية العربية بالذكاء الاصطناعي. اكتب روايتك بأسلوب أدبي رفيع بمساعدة أبو هاشم.",
    "inLanguage": "ar",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": averageRating,
      "reviewCount": reviewCount,
      "bestRating": "5",
      "worstRating": "1",
    },
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }}
      />
      <MarketingPopup />
      <EssaysMarketingPopup />
      <SharedNavbar />

      <section className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 sm:gap-16 items-center">
          <div className="space-y-5 sm:space-y-8">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-primary/10 rounded-full">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
              <span className="text-xs sm:text-sm font-medium text-primary">منصّة الكتابة الأدبية بالذكاء الاصطناعي</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight text-foreground" data-testid="text-hero-title">
              QalamAI
              <br />
              <span className="text-primary">وأبو هاشم</span>
            </h1>
            <p className="font-serif text-base sm:text-xl text-muted-foreground leading-relaxed" data-testid="text-hero-tagline">
              حيث تتحوّل الفكرة إلى رواية، والقلم إلى صوت.
            </p>
            <p className="text-muted-foreground leading-relaxed max-w-lg">
              منصّة QalamAI تجمع بين الذكاء الاصطناعي والأدب العربي لتقدّم لك تجربة كتابة روائية فريدة. أبو هاشم — مساعدك الأدبي — مستوحى من أساليب كبار الروائيين العرب مثل أحلام مستغانمي وإبراهيم نصر الله والدكتورة خولة حمدي.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/login">
                <Button size="lg" data-testid="button-get-started">
                  <PenTool className="w-4 h-4 ml-2" />
                  إنشاء حساب جديد
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" data-testid="button-hero-login">
                  تسجيل الدخول
                </Button>
              </Link>
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

      <section className="py-12 sm:py-20 px-4 sm:px-6 bg-card/50" data-testid="section-features">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold mb-4" data-testid="text-features-title">ما الذي يقدّمه QalamAI؟</h2>
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

      <section className="py-12 sm:py-20 px-4 sm:px-6" data-testid="section-why-qalamai">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold mb-4" data-testid="text-why-title">لماذا QalamAI؟</h2>
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

      <section className="py-12 sm:py-20 px-4 sm:px-6 bg-card/50" data-testid="section-testimonials">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold mb-4" data-testid="text-testimonials-title">ماذا يقول كتّابنا؟</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              آراء من كتّاب استخدموا QalamAI في رحلتهم الأدبية
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "سارة أحمد", role: "كاتبة روائية مبتدئة", content: "أبو هاشم ساعدني على كتابة فصول روايتي الأولى بأسلوب أدبي لم أكن أتوقّع أنني أستطيع تحقيقه. تجربة رائعة حقاً.", rating: 5 },
              { name: "محمد العلي", role: "كاتب قصص قصيرة", content: "المنصّة تفهم اللغة العربية بعمق. الشخصيات التي ساعدني أبو هاشم في بنائها كانت حيّة ومقنعة جداً.", rating: 5 },
              { name: "نورة الحربي", role: "مدوّنة وكاتبة محتوى", content: "أخيراً منصّة تحترم جمال اللغة العربية وتلتزم بالقيم. أنصح بها كل كاتب عربي يبحث عن أداة ذكية.", rating: 5 },
            ].map((t, i) => (
              <Card key={i} className="bg-background" data-testid={`card-testimonial-${i}`}>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-1 text-primary">
                    {Array.from({ length: t.rating }).map((_, si) => (
                      <Star key={si} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed italic">
                    <MessageSquareQuote className="w-4 h-4 text-primary inline-block ml-1" />
                    {t.content}
                  </p>
                  <div className="pt-2 border-t">
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {realReviews && realReviews.length > 0 && (
            <div className="grid md:grid-cols-3 gap-6 mt-6">
              {realReviews.slice(0, 3).map((review) => (
                <Card key={review.id} className="bg-background" data-testid={`card-landing-review-${review.id}`}>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-1 text-primary">
                      {Array.from({ length: review.rating }).map((_, si) => (
                        <Star key={si} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed italic">
                      <MessageSquareQuote className="w-4 h-4 text-primary inline-block ml-1" />
                      {review.content}
                    </p>
                    <div className="pt-2 border-t">
                      <p className="font-semibold text-sm">{review.reviewerName}</p>
                      <p className="text-xs text-muted-foreground">{review.reviewerBio || "مستخدم QalamAI"}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <div className="text-center mt-10">
            <Link href="/reviews">
              <Button variant="outline" size="lg" data-testid="button-share-review">
                <MessageSquareQuote className="w-4 h-4 ml-2" />
                شاركنا رأيك
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-primary/10 rounded-full">
            <PenTool className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">ابدأ رحلتك الأدبية اليوم</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold mb-4" data-testid="text-cta-title">حوّل فكرتك إلى رواية</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            انضم إلى QalamAI واكتشف قوة الكتابة الأدبية بالذكاء الاصطناعي. أبو هاشم في انتظارك لمساعدتك في كتابة روايتك العربية الأولى.
          </p>
          <Link href="/login">
            <Button size="lg" data-testid="button-cta-bottom">
              <Sparkles className="w-4 h-4 ml-2" />
              ابدأ مشروعك الروائي
            </Button>
          </Link>
        </div>
      </section>

      <SharedFooter />
    </div>
  );
}
