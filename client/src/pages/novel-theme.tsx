import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { Feather, BookOpen, Heart, Users, Scale, ShieldCheck, Brain, BookMarked } from "lucide-react";

export default function NovelTheme() {
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
          <div className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-home">الرئيسية</Link>
            <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-about">من نحن</Link>
            <Link href="/features" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-features">المميزات</Link>
            <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-pricing">الأسعار</Link>
            <Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-contact">تواصل معنا</Link>
            <Link href="/abu-hashim" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-abu-hashim">أبو هاشم</Link>
          </div>
          <a href="/api/login">
            <Button data-testid="button-login">تسجيل الدخول</Button>
          </a>
        </div>
      </nav>

      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
            <BookMarked className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">فكرة الرواية</span>
          </div>
          <h1 className="font-serif text-4xl lg:text-5xl font-bold leading-tight text-foreground" data-testid="text-novel-title">
            بين نار الشوق
            <br />
            <span className="text-primary">وميزان الضمير</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            رواية تغوص في أعماق النفس البشرية، حيث يتصارع الحب والواجب، وتتشابك خيوط الدين والمجتمع والعاطفة في نسيجٍ إنساني بالغ التعقيد.
          </p>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-card/50 border-primary/20">
            <CardContent className="p-8 lg:p-12 space-y-8">
              <div className="flex items-center gap-3 mb-2">
                <BookOpen className="w-6 h-6 text-primary" />
                <h2 className="font-serif text-2xl font-bold">ملخص الرواية</h2>
              </div>
              <div className="font-serif text-lg leading-loose text-muted-foreground space-y-6">
                <p>
                  في قلب مدينة عربية تنبض بالحياة والتناقضات، يعيش <strong className="text-foreground">ياسين</strong> — رجلٌ متديّن، ملتزمٌ بقيمه ومبادئه، يُعرف بين الناس بصلاحه واستقامته. يحمل في صدره قلبًا رقيقًا يفيض بالحنان تجاه زوجته <strong className="text-foreground">نادية</strong>، المرأة التي شاركته سنوات العمر وبنت معه بيتًا مليئًا بالدفء والسكينة.
                </p>
                <p>
                  غير أنّ القدر يضع في طريق ياسين مشاعر لم يكن يتوقّعها — حبًّا غير مكتمل، عاطفةً تتسلّل إلى روحه كنسيمٍ خفيّ لا يملك له ردًّا. يجد نفسه أمام امرأة أخرى تشعل في داخله ما كان يظنّه قد خَبا، فيعيش صراعًا مريرًا بين ما يشعر به وما يؤمن به.
                </p>
                <p>
                  لا يفكّر ياسين في الخيانة — فهو رجلٌ يخشى الله ويحترم عهده — لكنّه يتأمّل في إمكانية الزواج الثاني، ذلك الباب الذي يفتحه الشرع لكنّه يغلقه المجتمع والعرف والخوف من جرح مشاعر من يحب.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-16 px-6 bg-card/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif text-3xl font-bold text-center mb-12" data-testid="text-themes-title">محاور الرواية</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-background">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                  <Heart className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-serif text-xl font-semibold" data-testid="text-theme-love">حبٌّ غير مكتمل</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  يعيش ياسين عاطفةً صادقة تجاه امرأة أخرى، حبًّا لم يختره ولم يسعَ إليه، لكنّه وجده يسكن قلبه رغمًا عنه. يتأرجح بين الإفصاح والكتمان، بين الأمل واليأس، في رحلة وجدانية تكشف هشاشة القلب الإنساني أمام قوة المشاعر.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-background">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                  <Scale className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-serif text-xl font-semibold" data-testid="text-theme-society">ضغط المجتمع والأسرة</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  يواجه ياسين حكم المجتمع الذي يرفض فكرة الزواج الثاني ويراها خيانة مقنّعة، وضغط الأسرة التي تخشى الفضيحة، وأعين الناس التي تراقب كل خطوة. يتحوّل قراره الشخصي إلى قضية اجتماعية يتداولها الجميع.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-background">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-serif text-xl font-semibold" data-testid="text-theme-conflict">صراع نفسي عميق</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  في أعماق ياسين تدور معركة لا هوادة فيها: صوت الضمير الذي يذكّره بوعده لنادية، وصوت القلب الذي يناديه نحو حياة جديدة. يتساءل: هل يمكن للإنسان أن يحب اثنتين دون أن يظلم إحداهما؟ وهل العدل ممكن حقًّا في مملكة القلوب؟
                </p>
              </CardContent>
            </Card>
            <Card className="bg-background">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-serif text-xl font-semibold" data-testid="text-theme-characters">شخصيات الرواية</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  ياسين، الرجل المتديّن الذي يبحث عن التوازن بين إيمانه ومشاعره. نادية، الزوجة الوفية التي تستشعر التغيير في زوجها. وشخصيات أخرى تمثّل أصوات المجتمع المتباينة بين الرفض والقبول والتعاطف.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-card/50 border-primary/20">
            <CardContent className="p-8 lg:p-12 space-y-6">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-primary" />
                <h2 className="font-serif text-2xl font-bold" data-testid="text-ethics-title">الالتزام الأخلاقي</h2>
              </div>
              <div className="font-serif text-lg leading-loose text-muted-foreground space-y-4">
                <p>
                  تلتزم هذه الرواية بأعلى المعايير الأخلاقية والأدبية. لا تحتوي على أي محتوى غير لائق أو مشاهد خادشة للحياء. تعالج القضايا الإنسانية المعقّدة بأسلوب راقٍ يحترم القارئ ويصون كرامة الشخصيات.
                </p>
                <p>
                  الهدف من الرواية هو تسليط الضوء على الصراعات النفسية والاجتماعية التي يعيشها الإنسان العربي المعاصر، وتقديمها في قالب أدبي يدعو إلى التأمّل والتفكّر، لا إلى الإثارة أو التحريض.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-16 px-6 bg-card/50">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="font-serif text-3xl font-bold">هل أنت مستعدّ لكتابة روايتك؟</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            انضمّ إلى QalamAI واستعن بأبو هاشم في تحويل أفكارك الأدبية إلى روايات عربية أصيلة
          </p>
          <a href="/api/login">
            <Button size="lg" data-testid="button-cta-start">
              ابدأ مشروعك الروائي
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
            <Link href="/" className="hover:text-foreground transition-colors">الرئيسية</Link>
            <Link href="/about" className="hover:text-foreground transition-colors">من نحن</Link>
            <Link href="/features" className="hover:text-foreground transition-colors">المميزات</Link>
            <Link href="/pricing" className="hover:text-foreground transition-colors">الأسعار</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">تواصل معنا</Link>
            <Link href="/abu-hashim" className="hover:text-foreground transition-colors">أبو هاشم</Link>
          </div>
          <span>&copy; {new Date().getFullYear()} QalamAI</span>
        </div>
      </footer>
    </div>
  );
}