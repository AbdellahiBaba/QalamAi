import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Clock, AlertCircle, Mail, CreditCard, HelpCircle, RefreshCw } from "lucide-react";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { SharedNavbar } from "@/components/shared-navbar";
import { SharedFooter } from "@/components/shared-footer";

export default function Refund() {
  useDocumentTitle("سياسة الاسترداد — QalamAI");
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SharedNavbar />

      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
            <RefreshCw className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">سياسة الاسترداد</span>
          </div>
          <h1 className="font-serif text-4xl lg:text-5xl font-bold leading-tight text-foreground" data-testid="text-refund-title">
            سياسة الاسترداد
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            نحرص على رضاك التام. تعرّف على سياسة الاسترداد الخاصة بنا وكيفية طلب استرداد المبالغ المدفوعة.
          </p>
        </div>
      </section>

      <section className="py-16 px-6 bg-card/50">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-serif text-3xl font-bold" data-testid="text-refund-eligibility">أهلية الاسترداد</h2>
          </div>
          <p className="text-muted-foreground leading-loose text-lg">
            يحق لك طلب استرداد المبلغ المدفوع في الحالات التالية:
          </p>
          <ul className="text-muted-foreground leading-loose text-lg list-disc list-inside space-y-3 pr-4">
            <li>إذا تم خصم المبلغ بالخطأ أو تم تحصيل مبلغ أكبر من المتفق عليه.</li>
            <li>إذا لم تتمكّن من الوصول إلى الخدمة بسبب مشكلة تقنية من طرفنا لم يتم حلّها خلال فترة معقولة.</li>
            <li>إذا قمت بإلغاء اشتراكك خلال الفترة المحددة للاسترداد (انظر أدناه).</li>
            <li>إذا تم تجديد اشتراكك تلقائياً دون علمك ولم تستخدم الخدمة بعد التجديد.</li>
          </ul>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-serif text-3xl font-bold" data-testid="text-trial-policy">سياسة الفترة التجريبية</h2>
          </div>
          <p className="text-muted-foreground leading-loose text-lg">
            توفّر QalamAI فترة تجريبية مجانية للمستخدمين الجدد تتيح لهم تجربة المنصّة والتعرّف على مميزاتها قبل الاشتراك في أي خطة مدفوعة. خلال الفترة التجريبية:
          </p>
          <ul className="text-muted-foreground leading-loose text-lg list-disc list-inside space-y-3 pr-4">
            <li>لا يتم تحصيل أي مبالغ مالية خلال الفترة التجريبية.</li>
            <li>يمكنك إلغاء حسابك في أي وقت خلال الفترة التجريبية دون أي التزامات.</li>
            <li>بعد انتهاء الفترة التجريبية، يمكنك اختيار الخطة المناسبة لك أو التوقف عن استخدام الخدمة.</li>
            <li>لا يوجد استرداد يتعلق بالفترة التجريبية لأنها مجانية بالكامل.</li>
          </ul>
        </div>
      </section>

      <section className="py-16 px-6 bg-card/50">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-serif text-3xl font-bold" data-testid="text-plan-refunds">استرداد الخطط المدفوعة</h2>
          </div>
          <p className="text-muted-foreground leading-loose text-lg">
            فيما يخص الخطط المدفوعة (الشهرية أو السنوية)، تطبّق سياسة الاسترداد التالية:
          </p>
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <Card className="bg-background">
              <CardContent className="p-6 space-y-3">
                <h3 className="font-serif text-lg font-semibold">الخطط الشهرية</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  يمكنك طلب استرداد كامل المبلغ خلال 7 أيام من تاريخ الاشتراك أو التجديد، بشرط ألّا يتجاوز استخدامك حداً معقولاً من موارد المنصّة. بعد مرور 7 أيام، لا يمكن استرداد المبلغ ولكن يمكنك إلغاء التجديد التلقائي.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-background">
              <CardContent className="p-6 space-y-3">
                <h3 className="font-serif text-lg font-semibold">الخطط السنوية</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  يمكنك طلب استرداد كامل المبلغ خلال 14 يوماً من تاريخ الاشتراك أو التجديد. بعد مرور 14 يوماً، يمكن استرداد المبلغ المتبقي بشكل تناسبي (حسب الأشهر المتبقية) مع خصم رسوم إدارية بسيطة.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-serif text-3xl font-bold" data-testid="text-how-to-request">كيفية طلب الاسترداد</h2>
          </div>
          <p className="text-muted-foreground leading-loose text-lg">
            لطلب استرداد المبلغ المدفوع، يرجى اتباع الخطوات التالية:
          </p>
          <ol className="text-muted-foreground leading-loose text-lg list-decimal list-inside space-y-3 pr-4">
            <li>قم بتسجيل الدخول إلى حسابك على QalamAI.</li>
            <li>انتقل إلى صفحة "تذاكر الدعم" وأنشئ تذكرة جديدة بعنوان "طلب استرداد".</li>
            <li>اذكر في التذكرة سبب طلب الاسترداد وتاريخ الاشتراك.</li>
            <li>سيقوم فريق الدعم بمراجعة طلبك والرد عليك خلال 3 أيام عمل.</li>
          </ol>
          <p className="text-muted-foreground leading-loose text-lg">
            يمكنك أيضاً التواصل معنا مباشرة عبر البريد الإلكتروني على العنوان التالي:
          </p>
          <p className="text-foreground font-medium text-lg" dir="ltr" data-testid="text-refund-email">
            support@qalamai.net
          </p>
        </div>
      </section>

      <section className="py-16 px-6 bg-card/50">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-serif text-3xl font-bold" data-testid="text-processing-timeline">مدة معالجة الاسترداد</h2>
          </div>
          <p className="text-muted-foreground leading-loose text-lg">
            بعد الموافقة على طلب الاسترداد:
          </p>
          <ul className="text-muted-foreground leading-loose text-lg list-disc list-inside space-y-3 pr-4">
            <li>تتم معالجة الاسترداد خلال 5 إلى 10 أيام عمل.</li>
            <li>يتم إرجاع المبلغ إلى نفس وسيلة الدفع المستخدمة عند الاشتراك.</li>
            <li>قد يستغرق ظهور المبلغ في حسابك البنكي وقتاً إضافياً حسب سياسة البنك أو مزوّد خدمة الدفع.</li>
            <li>ستتلقّى إشعاراً بالبريد الإلكتروني عند إتمام عملية الاسترداد.</li>
          </ul>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-serif text-3xl font-bold" data-testid="text-exceptions">الاستثناءات</h2>
          </div>
          <p className="text-muted-foreground leading-loose text-lg">
            لا يمكن استرداد المبالغ المدفوعة في الحالات التالية:
          </p>
          <ul className="text-muted-foreground leading-loose text-lg list-disc list-inside space-y-3 pr-4">
            <li>إذا تم إيقاف حسابك بسبب مخالفة شروط الاستخدام أو سياسة الاستخدام المقبول.</li>
            <li>إذا مضى أكثر من 30 يوماً على تاريخ الدفع (للخطط الشهرية) أو أكثر من 60 يوماً (للخطط السنوية).</li>
            <li>إذا تم استخدام حصة كبيرة من موارد المنصّة (مثل توليد عدد كبير من الفصول أو المشاريع) قبل طلب الاسترداد.</li>
            <li>العروض الترويجية والخصومات الخاصة قد تخضع لشروط استرداد مختلفة يتم توضيحها عند الشراء.</li>
          </ul>
        </div>
      </section>

      <section className="py-16 px-6 bg-card/50">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-serif text-3xl font-bold" data-testid="text-refund-contact">تواصل معنا</h2>
          </div>
          <p className="text-muted-foreground leading-loose text-lg">
            إذا كان لديك أي استفسار حول سياسة الاسترداد أو كنت بحاجة إلى مساعدة، لا تتردد في التواصل معنا:
          </p>
          <ul className="text-muted-foreground leading-loose text-lg list-disc list-inside space-y-3 pr-4">
            <li>عبر صفحة <span className="text-foreground font-medium">تواصل معنا</span> على الموقع.</li>
            <li>عبر نظام تذاكر الدعم من داخل حسابك.</li>
            <li>عبر البريد الإلكتروني: <span dir="ltr" className="text-foreground font-medium">support@qalamai.net</span></li>
          </ul>
          <p className="text-muted-foreground leading-loose text-lg mt-4">
            نحن ملتزمون بضمان رضاك عن خدماتنا ونسعى دائماً لحل أي مشكلة بأسرع وقت ممكن.
          </p>
          <p className="text-sm text-muted-foreground mt-8" data-testid="text-refund-last-updated">
            آخر تحديث: يناير 2025
          </p>
        </div>
      </section>

      <SharedFooter />
    </div>
  );
}
