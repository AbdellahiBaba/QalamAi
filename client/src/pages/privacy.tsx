import { Card, CardContent } from "@/components/ui/card";
import { Shield, Lock, Cookie, Server, Clock, UserCheck, Mail, Eye, Database, Globe } from "lucide-react";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { SharedNavbar } from "@/components/shared-navbar";
import { SharedFooter } from "@/components/shared-footer";

const dataCollectionItems = [
  {
    icon: UserCheck,
    title: "بيانات الحساب",
    description: "الاسم، البريد الإلكتروني، وصورة الملف الشخصي عند إنشاء حسابك أو تسجيل الدخول.",
  },
  {
    icon: Database,
    title: "المحتوى الأدبي",
    description: "النصوص والروايات والشخصيات والفصول التي تنشئها على المنصّة.",
  },
  {
    icon: Globe,
    title: "بيانات الاستخدام",
    description: "معلومات عن كيفية استخدامك للمنصّة مثل الصفحات التي تزورها ومدة الجلسات.",
  },
  {
    icon: Server,
    title: "بيانات الدفع",
    description: "تتم معالجة المدفوعات عبر Stripe ولا نخزّن بيانات بطاقتك الائتمانية على خوادمنا.",
  },
];

export default function Privacy() {
  useDocumentTitle("سياسة الخصوصية — QalamAI", "اطّلع على سياسة الخصوصية لمنصة QalamAI: كيف نجمع بياناتك ونستخدمها ونحميها، وحقوقك فيما يتعلق ببياناتك الشخصية.");
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SharedNavbar />

      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">سياسة الخصوصية</span>
          </div>
          <h1 className="font-serif text-4xl lg:text-5xl font-bold leading-tight text-foreground" data-testid="text-privacy-title">
            سياسة الخصوصية
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            نلتزم في QalamAI بحماية خصوصيتك وبياناتك الشخصية. توضّح هذه السياسة كيف نجمع بياناتك ونستخدمها ونحميها.
          </p>
          <p className="text-sm text-muted-foreground">
            آخر تحديث: يناير 2025
          </p>
        </div>
      </section>

      <section className="py-16 px-6 bg-card/50">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
              <Eye className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-serif text-3xl font-bold" data-testid="text-data-collection-title">البيانات التي نجمعها</h2>
          </div>
          <p className="text-muted-foreground leading-loose text-lg">
            نجمع الحد الأدنى من البيانات اللازمة لتقديم خدماتنا بأفضل صورة ممكنة. فيما يلي أنواع البيانات التي قد نجمعها:
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {dataCollectionItems.map((item) => (
              <Card key={item.title} className="bg-background">
                <CardContent className="p-6 space-y-3">
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-serif text-lg font-semibold">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-serif text-3xl font-bold" data-testid="text-data-usage-title">كيف نستخدم بياناتك</h2>
          </div>
          <div className="space-y-4">
            <p className="text-muted-foreground leading-loose text-lg">
              نستخدم بياناتك للأغراض التالية:
            </p>
            <ul className="space-y-3 text-muted-foreground text-lg leading-loose list-none">
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 rounded-full bg-primary mt-3 shrink-0"></span>
                <span>تقديم خدمات الكتابة بالذكاء الاصطناعي وتخصيص تجربتك على المنصّة.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 rounded-full bg-primary mt-3 shrink-0"></span>
                <span>إدارة حسابك واشتراكاتك ومعالجة المدفوعات.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 rounded-full bg-primary mt-3 shrink-0"></span>
                <span>تحسين جودة خدماتنا وتطوير ميزات جديدة.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 rounded-full bg-primary mt-3 shrink-0"></span>
                <span>التواصل معك بشأن تحديثات الخدمة أو الدعم الفني.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 rounded-full bg-primary mt-3 shrink-0"></span>
                <span>ضمان أمان المنصّة ومنع الاستخدام غير المصرّح به.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-card/50">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
              <Cookie className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-serif text-3xl font-bold" data-testid="text-cookies-title">ملفات تعريف الارتباط (Cookies)</h2>
          </div>
          <p className="text-muted-foreground leading-loose text-lg">
            نستخدم ملفات تعريف الارتباط (Cookies) لتحسين تجربتك على المنصّة. تشمل هذه الملفات:
          </p>
          <ul className="space-y-3 text-muted-foreground text-lg leading-loose list-none">
            <li className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-primary mt-3 shrink-0"></span>
              <span><strong>ملفات الجلسة:</strong> للحفاظ على تسجيل دخولك أثناء تصفّح المنصّة.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-primary mt-3 shrink-0"></span>
              <span><strong>ملفات التفضيلات:</strong> لحفظ إعداداتك مثل وضع العرض (فاتح/داكن).</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-primary mt-3 shrink-0"></span>
              <span><strong>ملفات التحليل:</strong> لفهم كيفية استخدام المنصّة وتحسينها.</span>
            </li>
          </ul>
          <p className="text-muted-foreground leading-loose text-lg">
            يمكنك التحكم في ملفات تعريف الارتباط من خلال إعدادات متصفّحك، لكن تعطيل بعضها قد يؤثر على وظائف المنصّة.
          </p>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
              <Server className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-serif text-3xl font-bold" data-testid="text-third-party-title">الخدمات الخارجية</h2>
          </div>
          <p className="text-muted-foreground leading-loose text-lg">
            نستخدم خدمات خارجية موثوقة لتشغيل بعض وظائف المنصّة. تخضع هذه الخدمات لسياسات خصوصية خاصة بها:
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-background">
              <CardContent className="p-6 space-y-3">
                <h3 className="font-serif text-lg font-semibold">Stripe</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  نستخدم Stripe لمعالجة المدفوعات بشكل آمن. لا نخزّن أي بيانات بطاقات ائتمانية على خوادمنا. جميع عمليات الدفع تتم مباشرة عبر بنية Stripe الآمنة المتوافقة مع معيار PCI DSS.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-background">
              <CardContent className="p-6 space-y-3">
                <h3 className="font-serif text-lg font-semibold">OpenAI</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  نستخدم نماذج OpenAI لتوليد المحتوى الأدبي. يتم إرسال المعطيات اللازمة فقط (مثل تفاصيل الشخصيات والحبكة) لتوليد النصوص، ولا يتم استخدام محتواك لتدريب نماذج الذكاء الاصطناعي.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-card/50">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-serif text-3xl font-bold" data-testid="text-data-retention-title">الاحتفاظ بالبيانات</h2>
          </div>
          <p className="text-muted-foreground leading-loose text-lg">
            نحتفظ ببياناتك طالما أن حسابك نشط أو حسب الحاجة لتقديم خدماتنا. عند حذف حسابك، سنقوم بحذف بياناتك الشخصية خلال فترة معقولة، باستثناء ما يلزم الاحتفاظ به لأسباب قانونية أو محاسبية.
          </p>
          <p className="text-muted-foreground leading-loose text-lg">
            يمكنك طلب حذف حسابك وجميع بياناتك المرتبطة به في أي وقت عن طريق التواصل معنا.
          </p>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-serif text-3xl font-bold" data-testid="text-user-rights-title">حقوقك</h2>
          </div>
          <p className="text-muted-foreground leading-loose text-lg">
            لديك الحقوق التالية فيما يتعلق ببياناتك الشخصية:
          </p>
          <ul className="space-y-3 text-muted-foreground text-lg leading-loose list-none">
            <li className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-primary mt-3 shrink-0"></span>
              <span><strong>حق الوصول:</strong> يمكنك طلب نسخة من بياناتك الشخصية المخزّنة لدينا.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-primary mt-3 shrink-0"></span>
              <span><strong>حق التصحيح:</strong> يمكنك تحديث أو تصحيح بياناتك من خلال صفحة الملف الشخصي.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-primary mt-3 shrink-0"></span>
              <span><strong>حق الحذف:</strong> يمكنك طلب حذف حسابك وبياناتك بالكامل.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-primary mt-3 shrink-0"></span>
              <span><strong>حق نقل البيانات:</strong> يمكنك تصدير محتواك الأدبي بصيغ متعددة (PDF، EPUB، DOCX).</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-primary mt-3 shrink-0"></span>
              <span><strong>حق الاعتراض:</strong> يمكنك الاعتراض على معالجة بياناتك لأغراض تسويقية.</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="py-16 px-6 bg-card/50">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-serif text-3xl font-bold" data-testid="text-contact-privacy-title">تواصل معنا</h2>
          </div>
          <p className="text-muted-foreground leading-loose text-lg">
            إذا كانت لديك أي أسئلة أو استفسارات حول سياسة الخصوصية هذه أو كيفية تعاملنا مع بياناتك، يمكنك التواصل معنا عبر:
          </p>
          <ul className="space-y-3 text-muted-foreground text-lg leading-loose list-none">
            <li className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-primary mt-3 shrink-0"></span>
              <span>البريد الإلكتروني: support@qalamai.net</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-primary mt-3 shrink-0"></span>
              <span>صفحة تواصل معنا على المنصّة.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-primary mt-3 shrink-0"></span>
              <span>نظام تذاكر الدعم الفني داخل لوحة التحكم.</span>
            </li>
          </ul>
          <p className="text-muted-foreground leading-loose text-lg">
            نحتفظ بحق تعديل سياسة الخصوصية هذه في أي وقت. سنقوم بإشعارك بأي تغييرات جوهرية عبر البريد الإلكتروني أو من خلال إشعار على المنصّة.
          </p>
        </div>
      </section>

      <SharedFooter />
    </div>
  );
}