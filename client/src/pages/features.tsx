import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { SocialMediaIcons } from "@/components/social-media-icons";
import { SharedNavbar, navLinks, footerOnlyLinks } from "@/components/shared-navbar";
import {
  Feather,
  BookOpen,
  Users,
  Map,
  PenTool,
  Edit3,
  ShieldCheck,
  Newspaper,
  Search,
  BarChart3,
  Globe,
  Target,
  FileText,
  Clapperboard,
  Drama,
  Film,
  MessageSquare,
  Eye,
  Sparkles,
  Crown,
  CheckCircle2,
} from "lucide-react";

const novelFeatures = [
  {
    icon: BookOpen,
    title: "كتابة الروايات العربية",
    description:
      "يساعدك أبو هاشم في كتابة روايات عربية متكاملة بأسلوب أدبي رفيع مستوحى من كبار الروائيين العرب. يبدأ معك من الفكرة الأولى ويرافقك حتى الفصل الأخير.",
  },
  {
    icon: Users,
    title: "تطوير الشخصيات",
    description:
      "أنشئ شخصيات غنية ومتعددة الأبعاد بخلفيات نفسية واجتماعية معمّقة. يساعدك في رسم ملامح كل شخصية وتحديد دوافعها وصراعاتها الداخلية.",
  },
  {
    icon: Map,
    title: "بناء الحبكة والمخططات",
    description:
      "صمّم هيكل روايتك بمخطط تفصيلي شامل يتضمن ملخصاً عاماً وتقسيماً للفصول وأقواس تطور الشخصيات مع الحفاظ على عنصر التشويق.",
  },
  {
    icon: PenTool,
    title: "كتابة الفصول",
    description:
      "يكتب لك كل فصل بأسلوب أدبي راقٍ يجمع بين جمال اللغة العربية الفصحى وسلاسة السرد الحديث مع ربط كل فصل بالفكرة المحورية.",
  },
  {
    icon: Edit3,
    title: "التحرير والتحسين",
    description:
      "راجع وحسّن نصوصك مع اقتراحات ذكية لتحسين البنية اللغوية والأسلوب الأدبي والإيقاع السردي واختيار المفردات.",
  },
  {
    icon: ShieldCheck,
    title: "الالتزام الأخلاقي",
    description:
      "لا نسخ أو سرقة أدبية، لا محتوى غير لائق. كل ما يُكتب هو إبداع أصيل بلغة عربية فصيحة تحترم الذوق العام.",
  },
];

const essayFeatures = [
  {
    icon: Newspaper,
    title: "كتابة احترافية متعددة المجالات",
    description:
      "كتابة مقالات وأخبار في مجالات متنوعة: سياسة، اقتصاد، علوم، تكنولوجيا، رياضة، ثقافة، صحة، بيئة، وغيرها بمستوى صحفي احترافي.",
  },
  {
    icon: Search,
    title: "أساليب صحفية متقدمة",
    description:
      "إتقان أسلوب الهرم المقلوب، والأسئلة الخمسة (5W1H)، والصحافة الاستقصائية، والمقالات الافتتاحية، والتحليلات المتعمقة.",
  },
  {
    icon: BarChart3,
    title: "تحليل ومعايير تحريرية",
    description:
      "معايير الحيادية على نمط رويترز وأسوشيتد برس للأخبار، والبلاغة الإقناعية لمقالات الرأي، مع الالتزام بأعلى المعايير التحريرية.",
  },
  {
    icon: Globe,
    title: "توافق مع الإعلام العربي",
    description:
      "كتابة متوافقة مع أدلة الأسلوب لكبرى المؤسسات الإعلامية العربية مثل الجزيرة وبي بي سي عربي والعربية.",
  },
  {
    icon: Target,
    title: "تحسين محركات البحث (SEO)",
    description:
      "عناوين جاذبة ومقدمات قوية وهيكلة محتوى متوافقة مع محركات البحث لتحقيق أقصى انتشار ووصول للجمهور المستهدف.",
  },
  {
    icon: FileText,
    title: "تنوع النبرة والأسلوب",
    description:
      "تكييف النبرة حسب الحاجة: أكاديمية رسمية، تحليلية، استقصائية، افتتاحية، أو حوارية متخصصة لتناسب كل سياق ومنصة.",
  },
];

const scenarioFeatures = [
  {
    icon: Clapperboard,
    title: "تنسيق سيناريو احترافي",
    description:
      "كتابة بتنسيق السيناريو المعتمد دولياً: عناوين المشاهد، الحركة، الحوار، الإرشادات المسرحية، مع المكافئات العربية لاصطلاحات INT/EXT.",
  },
  {
    icon: Drama,
    title: "البنية الدرامية المتقنة",
    description:
      "إتقان البنية الدرامية بأنماطها المتعددة: ثلاثية الفصول، خماسية الفصول، والأقواس الدرامية للمسلسلات متعددة الحلقات.",
  },
  {
    icon: MessageSquare,
    title: "تمييز أصوات الشخصيات",
    description:
      "حوارات متميزة لكل شخصية مع مراعاة اللهجات المصرية والخليجية والشامية، مستلهمة من أساتذة الدراما العربية.",
  },
  {
    icon: Film,
    title: "أفلام ومسلسلات",
    description:
      "كتابة سيناريوهات أفلام (90-120 دقيقة) وحلقات مسلسلات (45-60 دقيقة للحلقة)، مع مرونة في عدد الحلقات حتى 30 حلقة.",
  },
  {
    icon: Eye,
    title: "إرشادات بصرية وإخراجية",
    description:
      "توجيهات الكاميرا والانتقالات البصرية ووصف المشاهد بطريقة تخدم السرد البصري وتسهّل عمل المخرج وفريق الإنتاج.",
  },
  {
    icon: Sparkles,
    title: "تنوع الأنواع الدرامية",
    description:
      "إتقان جميع الأنواع: دراما، إثارة، كوميديا، رومانسية، تاريخي، أكشن، وخيال علمي مع مراعاة تقاليد كل نوع.",
  },
];

const allInOneFeatures = [
  "كتابة روايات كاملة بأسلوب أدبي رفيع",
  "مقالات وأخبار احترافية بجميع المجالات",
  "سيناريوهات أفلام ومسلسلات درامية",
  "تطوير شخصيات متعددة الأبعاد",
  "تصدير بصيغ PDF و EPUB",
  "دعم اللهجات العربية المتعددة",
  "تحسين محركات البحث للمقالات",
  "بنية درامية احترافية للسيناريوهات",
  "مراجعة وتحرير ذكي للنصوص",
  "التزام أخلاقي تام بمعايير الجودة",
];

interface ContentSectionProps {
  icon: typeof BookOpen;
  title: string;
  subtitle: string;
  features: { icon: typeof BookOpen; title: string; description: string }[];
  ctaText: string;
  ctaHref: string;
  testIdPrefix: string;
}

function ContentSection({ icon: SectionIcon, title, subtitle, features, ctaText, ctaHref, testIdPrefix }: ContentSectionProps) {
  return (
    <section className="py-16 px-6" data-testid={`section-${testIdPrefix}`}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center text-center mb-12">
          <div className="w-16 h-16 rounded-md bg-primary/10 flex items-center justify-center mb-4">
            <SectionIcon className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-serif text-3xl font-bold mb-3 text-foreground" data-testid={`text-${testIdPrefix}-title`}>
            {title}
          </h2>
          <p className="text-muted-foreground max-w-2xl leading-relaxed" data-testid={`text-${testIdPrefix}-subtitle`}>
            {subtitle}
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {features.map((feature, index) => (
            <Card key={index} className="bg-background" data-testid={`card-${testIdPrefix}-feature-${index}`}>
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-serif text-lg font-semibold" data-testid={`text-${testIdPrefix}-feature-title-${index}`}>
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed" data-testid={`text-${testIdPrefix}-feature-desc-${index}`}>
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="text-center">
          <Link href={ctaHref}>
            <Button data-testid={`button-cta-${testIdPrefix}`}>
              {ctaText}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Features() {
  useDocumentTitle("مميزات قلم AI — أدوات الكتابة الإبداعية");
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SharedNavbar />

      <section className="pt-32 pb-16 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-6 text-foreground" data-testid="text-features-hero-title">
            مميزات <span className="text-primary">QalamAI</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed" data-testid="text-features-hero-desc">
            منصة متكاملة للكتابة الإبداعية والمهنية بالعربية — من الروايات الأدبية إلى المقالات الاحترافية وسيناريوهات الأفلام والمسلسلات
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <Badge variant="secondary" data-testid="badge-novel">كتابة الروايات</Badge>
            <Badge variant="secondary" data-testid="badge-essay">المقالات والأخبار</Badge>
            <Badge variant="secondary" data-testid="badge-scenario">السيناريوهات</Badge>
          </div>
        </div>
      </section>

      <ContentSection
        icon={BookOpen}
        title="كتابة الروايات"
        subtitle="روايات عربية متكاملة بأسلوب أدبي رفيع مستوحى من كبار الروائيين العرب، مع شخصية أبو هاشم الأدبية المتفردة"
        features={novelFeatures}
        ctaText="ابدأ كتابة روايتك"
        ctaHref="/project/new"
        testIdPrefix="novel"
      />

      <div className="border-t" />

      <ContentSection
        icon={Newspaper}
        title="كتابة المقالات والأخبار"
        subtitle="كتابة صحفية ومقالات احترافية بمعايير عالمية، مع خبرة عميقة في جميع التخصصات وتوافق تام مع الإعلام العربي"
        features={essayFeatures}
        ctaText="ابدأ كتابة مقالك"
        ctaHref="/project/new/essay"
        testIdPrefix="essay"
      />

      <div className="border-t" />

      <ContentSection
        icon={Clapperboard}
        title="كتابة السيناريوهات"
        subtitle="سيناريوهات أفلام ومسلسلات درامية بتنسيق احترافي، مع إتقان البنية الدرامية وتمييز أصوات الشخصيات والسرد البصري"
        features={scenarioFeatures}
        ctaText="ابدأ كتابة سيناريو"
        ctaHref="/project/new/scenario"
        testIdPrefix="scenario"
      />

      <section className="py-20 px-6 bg-card/50" data-testid="section-all-features">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-16 h-16 rounded-md bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Crown className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-serif text-3xl font-bold mb-3" data-testid="text-all-features-title">
            جميع المميزات — الخطة الشاملة
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-10" data-testid="text-all-features-desc">
            احصل على وصول كامل لجميع أدوات الكتابة الإبداعية والمهنية في خطة واحدة شاملة بأفضل قيمة
          </p>
          <div className="grid sm:grid-cols-2 gap-4 text-start mb-10">
            {allInOneFeatures.map((feature, index) => (
              <div key={index} className="flex items-center gap-3" data-testid={`text-allinone-feature-${index}`}>
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/pricing">
              <Button size="lg" data-testid="button-cta-pricing">
                استعرض الأسعار والخطط
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" data-testid="button-cta-start">
                ابدأ الكتابة الآن
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t py-8 px-6">
        <div className="max-w-6xl mx-auto">
          <SocialMediaIcons size="sm" className="mb-4" />
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Feather className="w-4 h-4" />
              <span>QalamAI — منصة الكتابة الإبداعية والمهنية بالذكاء الاصطناعي</span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {[...navLinks, ...footerOnlyLinks].map((link) => (
                <Link key={link.href} href={link.href}>
                  <span className="cursor-pointer hover-elevate px-1 py-0.5 rounded-md" data-testid={`link-footer-${link.href.replace("/", "") || "home"}`}>
                    {link.label}
                  </span>
                </Link>
              ))}
            </div>
            <span>&copy; {new Date().getFullYear()} QalamAI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
