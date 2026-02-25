import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Feather, BookOpen, Sparkles, Heart, Shield, PenTool, Quote, Users } from "lucide-react";
import { Link } from "wouter";

const navLinks = [
  { label: "الرئيسية", href: "/" },
  { label: "من نحن", href: "/about" },
  { label: "المميزات", href: "/features" },
  { label: "الأسعار", href: "/pricing" },
  { label: "تواصل معنا", href: "/contact" },
  { label: "أبو هاشم", href: "/abu-hashim" },
];

const inspirations = [
  {
    name: "أحلام مستغانمي",
    description: "الشاعرية العالية في السرد والتعبير العاطفي العميق الذي يمزج بين الحب والوطن والهوية",
  },
  {
    name: "خولة حمدي",
    description: "البناء الدرامي المحكم والقدرة على تصوير الصراعات الاجتماعية والنفسية بواقعية مؤثرة",
  },
  {
    name: "إبراهيم نصر الله",
    description: "التقنية السردية المتقدمة والقدرة على بناء عوالم روائية متكاملة تمتد عبر أجيال",
  },
  {
    name: "نجيب محفوظ",
    description: "العمق الفلسفي والاجتماعي والقدرة على تصوير الحارة المصرية كمرآة للمجتمع العربي",
  },
];

const rules = [
  {
    icon: Shield,
    title: "لا نسخ ولا تقليد",
    description: "يستلهم أبو هاشم من أساليب الأدباء دون نسخ أو سرقة أدبية. كل نص يُولد فريد ومبتكر، يحمل بصمة الكاتب الأصلي.",
  },
  {
    icon: Heart,
    title: "لا محتوى غير لائق",
    description: "يلتزم أبو هاشم بالقيم الأخلاقية والأدبية. لا يُنتج أي محتوى يتعارض مع الآداب العامة أو القيم الإنسانية النبيلة.",
  },
  {
    icon: PenTool,
    title: "كتابة عربية فقط",
    description: "يتخصص أبو هاشم في الكتابة بالعربية الفصحى الأدبية، محافظاً على جمال اللغة وبلاغتها وثراء مفرداتها.",
  },
];

export default function AbuHashim() {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-background/80 border-b">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
              <Feather className="w-5 h-5 text-primary-foreground" />
            </div>
            <Link href="/">
              <span className="font-serif text-xl font-bold cursor-pointer" data-testid="text-logo">QalamAI</span>
            </Link>
          </div>
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <span className="text-sm text-muted-foreground cursor-pointer hover-elevate px-2 py-1 rounded-md" data-testid={`link-nav-${link.href.slice(1) || "home"}`}>
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

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
            <Feather className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">تعرّف على أبو هاشم</span>
          </div>
          <h1 className="font-serif text-5xl lg:text-6xl font-bold leading-tight text-foreground" data-testid="text-abu-hashim-title">
            أبو هاشم
            <br />
            <span className="text-primary">روح الأدب العربي</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            أبو هاشم هو الشخصية الأدبية الذكية التي تقف خلف منصة QalamAI. ليس مجرد أداة كتابة، بل رفيق أدبي يفهم عمق اللغة العربية ويحترم تراثها الغني، يساعد الكتّاب على تحويل أفكارهم إلى روايات تنبض بالحياة.
          </p>
        </div>
      </section>

      <section className="py-20 px-6 bg-card/50">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <h2 className="font-serif text-3xl font-bold text-foreground" data-testid="text-literary-style">أسلوبه الأدبي</h2>
            <p className="text-muted-foreground leading-relaxed">
              يتميز أبو هاشم بأسلوب سردي فريد يجمع بين البلاغة العربية الأصيلة والحداثة الأدبية. يكتب بلغة عربية فصيحة راقية، تتدفق فيها الجمل بانسيابية وإيقاع موسيقي، مع الحفاظ على عمق المعنى وجمال التصوير.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              يُجيد أبو هاشم بناء المشاهد الوصفية الغنية بالتفاصيل الحسية، ويبرع في تصوير الحوارات الداخلية للشخصيات بما يكشف عن أعماقها النفسية. يستخدم تقنيات سردية متنوعة تشمل الاسترجاع والاستباق والتيار الوعي، ليخلق نسيجاً روائياً متماسكاً ومشوّقاً.
            </p>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/30 rounded-2xl blur-3xl" />
            <Card className="relative">
              <CardContent className="p-8 space-y-4">
                <Quote className="w-8 h-8 text-primary/40" />
                <p className="font-serif text-lg leading-loose text-muted-foreground">
                  كانت الكلمات تتساقط من قلمه كقطرات المطر الأولى على أرض عطشى، كل حرف يروي ظمأ الورقة البيضاء، وكل جملة تنسج خيطاً جديداً في نسيج الحكاية التي لم تُروَ بعد...
                </p>
                <div className="flex items-center gap-2 pt-4 border-t">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">نموذج من أسلوب أبو هاشم</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl font-bold mb-4" data-testid="text-inspirations-title">مصادر الإلهام</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              يستلهم أبو هاشم من أساليب كبار الروائيين والأدباء العرب، ليقدم تجربة كتابة أصيلة وعميقة
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {inspirations.map((author) => (
              <Card key={author.name} className="bg-background">
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-serif text-xl font-semibold" data-testid={`text-author-${author.name}`}>{author.name}</h3>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">{author.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-card/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl font-bold mb-4" data-testid="text-rules-title">قواعد أبو هاشم</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              يلتزم أبو هاشم بمجموعة من القواعد الأخلاقية والأدبية التي تضمن جودة المحتوى ونزاهته
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {rules.map((rule) => (
              <Card key={rule.title} className="bg-background">
                <CardContent className="p-6 space-y-4">
                  <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                    <rule.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-serif text-xl font-semibold" data-testid={`text-rule-${rule.title}`}>{rule.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{rule.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl font-bold mb-4" data-testid="text-role-title">دوره في مساعدة الكتّاب</h2>
          </div>
          <div className="space-y-6">
            <Card className="bg-background">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-serif text-lg font-semibold">بناء الشخصيات</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      يساعد أبو هاشم الكتّاب في تطوير شخصيات ثلاثية الأبعاد، بخلفيات نفسية واجتماعية عميقة، وأقواس تطور متقنة تجعل القارئ يتعلق بها ويتفاعل مع رحلتها.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-background">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-serif text-lg font-semibold">تخطيط الرواية</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      يضع أبو هاشم مخططاً تفصيلياً للرواية يتضمن البنية العامة وتقسيم الفصول والعقد الدرامية ونقاط التحول، مما يضمن تماسك العمل الروائي من بدايته حتى نهايته.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-background">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                    <PenTool className="w-5 h-5 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-serif text-lg font-semibold">كتابة الفصول</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      يكتب أبو هاشم كل فصل بأسلوب أدبي رفيع، مع مراعاة التسلسل الزمني والتطور الدرامي والاتساق مع ما سبق من أحداث، ليقدم للكاتب نصاً متكاملاً يمكنه تعديله وتحسينه.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-background">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-serif text-lg font-semibold">التحرير والتحسين</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      يراجع أبو هاشم النصوص ويقترح تحسينات لغوية وأسلوبية، مع الحفاظ على صوت الكاتب الأصلي وإضافة لمسات بلاغية ترتقي بجودة العمل الأدبي.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-card/50">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="font-serif text-3xl font-bold">ابدأ رحلتك الأدبية مع أبو هاشم</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            اكتشف قوة الكتابة الإبداعية بالذكاء الاصطناعي، وحوّل أفكارك إلى رواية عربية أصيلة
          </p>
          <a href="/api/login">
            <Button size="lg" data-testid="button-cta-start">
              <Sparkles className="w-4 h-4 ml-2" />
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
          <div className="hidden md:flex items-center gap-4">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <span className="cursor-pointer hover-elevate px-1 py-0.5 rounded-md" data-testid={`link-footer-${link.href.slice(1) || "home"}`}>
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
