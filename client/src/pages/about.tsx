import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Feather, Heart, Shield, BookOpen, Cpu, Globe, Eye, Compass, Gem, PenTool } from "lucide-react";
import { Link } from "wouter";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { SharedNavbar } from "@/components/shared-navbar";
import { SharedFooter } from "@/components/shared-footer";

const values = [
  {
    icon: Heart,
    title: "الأصالة",
    description: "نحترم جمال اللغة العربية ونحافظ على أصالتها في كل ما نقدّمه من محتوى أدبي.",
  },
  {
    icon: Shield,
    title: "الالتزام الأخلاقي",
    description: "لا نسخ، لا تقليد، لا محتوى غير لائق. نلتزم بأعلى المعايير الأخلاقية في الكتابة.",
  },
  {
    icon: Globe,
    title: "الشمولية",
    description: "نسعى لخدمة جميع الكتّاب العرب في كل مكان، بغض النظر عن مستواهم أو خبرتهم.",
  },
  {
    icon: Gem,
    title: "الإبداع",
    description: "نشجّع التفرّد والإبداع الأدبي، ونساعد كل كاتب على إيجاد صوته الخاص.",
  },
  {
    icon: Eye,
    title: "الشفافية",
    description: "نوضّح دائماً كيف يعمل الذكاء الاصطناعي ونؤمن بأن الكاتب يجب أن يفهم أدواته.",
  },
  {
    icon: Compass,
    title: "التمكين",
    description: "هدفنا ليس استبدال الكاتب، بل تمكينه من تحقيق رؤيته الإبداعية بأفضل صورة ممكنة.",
  },
];

export default function About() {
  useDocumentTitle("عن قلم AI — منصة الكتابة بالذكاء الاصطناعي");
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SharedNavbar />

      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">تعرّف علينا</span>
          </div>
          <h1 className="font-serif text-4xl lg:text-5xl font-bold leading-tight text-foreground" data-testid="text-about-title">
            من نحن
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            رحلة تجمع بين عبقرية اللغة العربية وقوة الذكاء الاصطناعي لتمكين الكتّاب من تحقيق أحلامهم الأدبية.
          </p>
        </div>
      </section>

      <section className="py-16 px-6 bg-card/50">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
              <PenTool className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-serif text-3xl font-bold" data-testid="text-abu-hashim-section">من هو أبو هاشم؟</h2>
          </div>
          <p className="text-muted-foreground leading-loose text-lg">
            أبو هاشم هو شخصية أدبية رقمية صُمّمت لتكون رفيق الكاتب العربي في رحلته الإبداعية. مستوحى من أساليب كبار الروائيين العرب مثل أحلام مستغانمي وإبراهيم نصر الله والدكتورة خولة حمدي، يتميّز أبو هاشم بقدرته على فهم تعقيدات اللغة العربية الفصحى وجمالياتها، وتوظيفها في كتابة نصوص أدبية تحترم ذوق القارئ العربي وقيمه.
          </p>
          <p className="text-muted-foreground leading-loose text-lg">
            لا يكتفي أبو هاشم بمجرد توليد النصوص، بل يحلّل البنية السردية والإيقاع اللغوي والنبرة العاطفية وبناء الشخصيات ليقدّم محتوى أدبياً أصيلاً يستلهم من التراث دون نسخ أو تقليد.
          </p>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
              <Feather className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-serif text-3xl font-bold" data-testid="text-qalamai-section">ما هي QalamAI؟</h2>
          </div>
          <p className="text-muted-foreground leading-loose text-lg">
            QalamAI هي منصّة متكاملة للكتابة الأدبية والأكاديمية العربية بالذكاء الاصطناعي. تجمع بين تقنيات الذكاء الاصطناعي المتقدّمة وفهم عميق للأدب العربي ومعايير البحث الأكاديمي لتقديم تجربة كتابة فريدة من نوعها. من خلال شخصية أبو هاشم، تساعد المنصّة الكتّاب والباحثين على كتابة الروايات والمقالات والسيناريوهات ومذكرات التخرج الأكاديمية بأسلوب رفيع يحترم معايير الجودة.
          </p>
          <p className="text-muted-foreground leading-loose text-lg">
            سواء كنت كاتباً مبتدئاً تخطو خطواتك الأولى في عالم الرواية، أو طالباً جامعياً تعدّ مذكرة تخرجك، أو كاتباً محترفاً تبحث عن أداة تساعدك في تطوير أفكارك، فإن QalamAI مصمّمة لتكون شريكك في كل مرحلة من مراحل الكتابة.
          </p>
        </div>
      </section>

      <section className="py-16 px-6 bg-card/50">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
          <Card className="bg-background">
            <CardContent className="p-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full">
                <Compass className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">الرسالة</span>
              </div>
              <p className="font-serif text-lg leading-loose text-foreground" data-testid="text-mission">
                تمكين الكتّاب والباحثين العرب من تحويل أفكارهم إلى أعمال أدبية وأكاديمية بلغة عربية فصيحة، عبر ذكاء اصطناعي يحترم القيم ويصون جمال اللغة ومعايير البحث العلمي.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-background">
            <CardContent className="p-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full">
                <Eye className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">الرؤية</span>
              </div>
              <p className="font-serif text-lg leading-loose text-foreground" data-testid="text-vision">
                أن تصبح QalamAI المنصّة العربية الأولى في الكتابة الأدبية بالذكاء الاصطناعي، مع الحفاظ على روح اللغة العربية وإحياء فن الرواية.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl font-bold mb-4" data-testid="text-values-title">القيم التي نؤمن بها</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              قيمنا هي البوصلة التي توجّه كل قرار نتّخذه وكل ميزة نطوّرها في المنصّة.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((value) => (
              <Card key={value.title} className="bg-background">
                <CardContent className="p-6 space-y-3">
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                    <value.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-serif text-lg font-semibold">{value.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-card/50">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-serif text-3xl font-bold" data-testid="text-literature-title">أهمية الأدب العربي</h2>
          </div>
          <p className="text-muted-foreground leading-loose text-lg">
            الأدب العربي هو أحد أعرق الآداب في تاريخ البشرية، وهو مرآة الحضارة العربية والإسلامية على مرّ العصور. من المعلّقات الجاهلية إلى الرواية المعاصرة، يحمل الأدب العربي في طيّاته ثراءً لغوياً وعمقاً فكرياً لا مثيل لهما.
          </p>
          <p className="text-muted-foreground leading-loose text-lg">
            في عصرنا الحالي، يواجه الأدب العربي تحديات عديدة تتعلق بالانتشار والوصول إلى جمهور أوسع. نؤمن في QalamAI بأن التكنولوجيا يمكن أن تكون جسراً يصل بين عبقرية اللغة العربية والأجيال الجديدة من القرّاء والكتّاب، دون المساس بروح الأدب وجماله.
          </p>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
              <Cpu className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-serif text-3xl font-bold" data-testid="text-ai-section">كيف يعمل الذكاء الاصطناعي؟</h2>
          </div>
          <p className="text-muted-foreground leading-loose text-lg">
            يعتمد QalamAI على نماذج ذكاء اصطناعي متقدّمة تمّ تدريبها على فهم اللغة العربية وأساليبها الأدبية المتنوعة. عندما تُدخل تفاصيل روايتك — من شخصيات وأحداث وأماكن — يقوم النظام بتحليل هذه المعطيات وربطها ببنى سردية مدروسة.
          </p>
          <p className="text-muted-foreground leading-loose text-lg">
            يمرّ النص المُنتَج بعدة مراحل من المعالجة لضمان سلاسة اللغة وتماسك الأحداث وعمق الشخصيات. كل فصل يُبنى على ما سبقه، مع الحفاظ على الاتساق في الأسلوب والنبرة والشخصيات عبر الرواية بأكملها.
          </p>
          <p className="text-muted-foreground leading-loose text-lg">
            الأهم من ذلك أن النظام لا ينسخ نصوصاً موجودة، بل يستلهم الأساليب والتقنيات الأدبية ويوظّفها في إنتاج محتوى أصيل فريد يعكس رؤية الكاتب الخاصة.
          </p>
        </div>
      </section>

      <section className="py-16 px-6 bg-card/50">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="font-serif text-3xl font-bold">هل أنت مستعد لبدء رحلتك الأدبية؟</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            انضمّ إلى QalamAI اليوم وابدأ في كتابة روايتك العربية بمساعدة أبو هاشم.
          </p>
          <Link href="/login">
            <Button size="lg" data-testid="button-cta-about">
              ابدأ الكتابة الآن
            </Button>
          </Link>
        </div>
      </section>

      <SharedFooter />
    </div>
  );
}
