import { Card, CardContent } from "@/components/ui/card";
import { FileText, Scale, UserCheck, PenTool, ShieldAlert, CreditCard, Clock, XCircle, AlertTriangle, Gavel } from "lucide-react";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { SharedNavbar } from "@/components/shared-navbar";
import { SharedFooter } from "@/components/shared-footer";

const sections = [
  {
    icon: UserCheck,
    title: "قبول الشروط",
    paragraphs: [
      "باستخدامك لمنصّة QalamAI أو بإنشاء حساب عليها، فإنك توافق على الالتزام بجميع الشروط والأحكام الواردة في هذه الصفحة. إذا كنت لا توافق على أيٍّ من هذه الشروط، يُرجى عدم استخدام المنصّة.",
      "تحتفظ QalamAI بالحق في تعديل هذه الشروط في أي وقت. سيتم إخطارك بأي تغييرات جوهرية عبر البريد الإلكتروني أو من خلال إشعار داخل المنصّة. استمرارك في استخدام المنصّة بعد التعديل يعني موافقتك على الشروط المحدّثة.",
    ],
  },
  {
    icon: ShieldAlert,
    title: "مسؤوليات الحساب",
    paragraphs: [
      "أنت مسؤول عن الحفاظ على سرّية بيانات تسجيل الدخول الخاصة بحسابك، بما في ذلك كلمة المرور. يجب عليك إخطارنا فوراً في حال اشتبهت بأي استخدام غير مصرّح به لحسابك.",
      "يجب أن تكون المعلومات التي تقدّمها عند التسجيل دقيقة وصحيحة ومحدّثة. لا يجوز لك إنشاء أكثر من حساب واحد، أو استخدام حساب شخص آخر دون إذنه.",
      "أنت مسؤول عن جميع الأنشطة التي تتم من خلال حسابك، سواء قمت بها أنت أو شخص آخر بعلمك أو دون علمك.",
    ],
  },
  {
    icon: PenTool,
    title: "ملكية المحتوى",
    paragraphs: [
      "يحتفظ المستخدم بملكية جميع المحتويات الأصلية التي يُدخلها إلى المنصّة، مثل أفكار الرواية ووصف الشخصيات والملاحظات الشخصية.",
      "المحتوى المُنتَج بواسطة الذكاء الاصطناعي على المنصّة يُعتبر ملكاً للمستخدم الذي طلب إنتاجه، ويحق له استخدامه ونشره وتعديله بحرّية.",
      "بنشرك لأي محتوى في معرض QalamAI العام، فإنك تمنح المنصّة ترخيصاً غير حصري لعرض هذا المحتوى ضمن المعرض لأغراض الترويج والعرض.",
    ],
  },
  {
    icon: AlertTriangle,
    title: "إخلاء المسؤولية عن المحتوى المُنتَج بالذكاء الاصطناعي",
    paragraphs: [
      "المحتوى الأدبي الذي تنتجه المنصّة يتم توليده بواسطة نماذج ذكاء اصطناعي، وقد لا يكون دقيقاً أو مناسباً في جميع الحالات. يقع على عاتق المستخدم مراجعة المحتوى وتحريره قبل نشره أو استخدامه.",
      "لا تضمن QalamAI خلوّ المحتوى المُنتَج من الأخطاء اللغوية أو النحوية أو المعلوماتية، ولا تتحمّل المسؤولية عن أي ضرر ينتج عن استخدام هذا المحتوى دون مراجعته.",
      "المنصّة تسعى لإنتاج محتوى يحترم القيم والأخلاق، لكنها لا تضمن ذلك بنسبة مطلقة في جميع الحالات.",
    ],
  },
  {
    icon: Scale,
    title: "الاستخدام المقبول",
    paragraphs: [
      "يلتزم المستخدم باستخدام المنصّة لأغراض مشروعة فقط، ويمتنع عن استخدامها لإنتاج محتوى يخالف القوانين أو ينتهك حقوق الآخرين أو يحرّض على العنف أو الكراهية.",
      "يُحظر استخدام المنصّة لإنتاج محتوى مسيء أو إباحي أو تشهيري أو احتيالي. كما يُحظر محاولة اختراق النظام أو استغلال ثغراته أو إساءة استخدام واجهات البرمجة.",
      "تحتفظ QalamAI بالحق في تعليق أو إنهاء حساب أي مستخدم يخالف سياسة الاستخدام المقبول دون إنذار مسبق.",
    ],
  },
  {
    icon: CreditCard,
    title: "شروط الدفع والاشتراك",
    paragraphs: [
      "تقدّم QalamAI خططاً مدفوعة متنوّعة. تتم عمليات الدفع بشكل آمن عبر بوابة Stripe. أسعار الاشتراكات محدّدة بوضوح في صفحة الأسعار وقد تتغيّر مع إشعار مسبق.",
      "عند الاشتراك في خطة مدفوعة، فإنك توافق على دفع الرسوم المحدّدة وفقاً لدورة الفوترة المختارة (شهرية أو سنوية). يتم تجديد الاشتراك تلقائياً ما لم تقم بإلغائه قبل تاريخ التجديد.",
      "في حال فشل عملية الدفع، قد يتم تقييد وصولك إلى ميزات الخطة المدفوعة حتى يتم تسوية المبلغ المستحق.",
    ],
  },
  {
    icon: Clock,
    title: "الفترة التجريبية",
    paragraphs: [
      "قد تقدّم QalamAI فترة تجريبية مجانية للمستخدمين الجدد تتيح لهم تجربة بعض ميزات المنصّة. تفاصيل الفترة التجريبية وشروطها محدّدة عند التسجيل.",
      "بانتهاء الفترة التجريبية، يتوقّف الوصول إلى الميزات المدفوعة ما لم يتم الاشتراك في إحدى الخطط المتاحة. لا يتم فرض أي رسوم تلقائية عند انتهاء الفترة التجريبية دون اشتراك.",
    ],
  },
  {
    icon: XCircle,
    title: "الإنهاء وتعليق الحساب",
    paragraphs: [
      "يحق لك إلغاء حسابك في أي وقت من خلال إعدادات الملف الشخصي أو بالتواصل مع فريق الدعم. عند الإلغاء، ستفقد الوصول إلى المحتوى المُخزّن على المنصّة بعد فترة سماح معقولة.",
      "تحتفظ QalamAI بالحق في تعليق أو إنهاء أي حساب يخالف هذه الشروط أو يُساء استخدامه، وذلك دون تحمّل أي مسؤولية تجاه المستخدم.",
      "في حال إنهاء الحساب بسبب مخالفة الشروط، لا يحق للمستخدم استرداد أي مبالغ مدفوعة عن الفترة الحالية.",
    ],
  },
  {
    icon: AlertTriangle,
    title: "تحديد المسؤولية",
    paragraphs: [
      "تُقدَّم المنصّة \"كما هي\" دون أي ضمانات صريحة أو ضمنية، بما في ذلك ضمانات الملاءمة لغرض معيّن أو عدم الانتهاك.",
      "لا تتحمّل QalamAI المسؤولية عن أي أضرار مباشرة أو غير مباشرة أو عرضية أو تبعية ناتجة عن استخدام المنصّة أو عدم القدرة على استخدامها.",
      "في جميع الأحوال، لا تتجاوز مسؤولية QalamAI إجمالي المبالغ التي دفعها المستخدم خلال الاثني عشر شهراً السابقة لتاريخ المطالبة.",
    ],
  },
  {
    icon: Gavel,
    title: "القانون الحاكم",
    paragraphs: [
      "تخضع هذه الشروط وتُفسَّر وفقاً للقوانين المعمول بها. أي نزاع ينشأ عن هذه الشروط أو يتعلّق بها يتم حلّه بالتراضي أولاً، وفي حال تعذّر ذلك، يُحال إلى الجهات القضائية المختصّة.",
      "يُعتبر أي بند من هذه الشروط يُحكم ببطلانه أو عدم قابليته للتنفيذ قابلاً للفصل عن بقية الشروط، ولا يؤثر على صحة وقابلية تنفيذ باقي البنود.",
    ],
  },
];

export default function Terms() {
  useDocumentTitle("شروط الاستخدام — QalamAI");

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SharedNavbar />

      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">الشروط والأحكام</span>
          </div>
          <h1 className="font-serif text-4xl lg:text-5xl font-bold leading-tight text-foreground" data-testid="text-terms-title">
            شروط الاستخدام
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            يُرجى قراءة هذه الشروط بعناية قبل استخدام منصّة QalamAI. باستخدامك للمنصّة فإنك توافق على الالتزام بجميع الشروط التالية.
          </p>
          <p className="text-sm text-muted-foreground">
            آخر تحديث: يناير ٢٠٢٥
          </p>
        </div>
      </section>

      {sections.map((section, index) => (
        <section
          key={section.title}
          className={`py-16 px-6 ${index % 2 === 0 ? "bg-card/50" : ""}`}
        >
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                <section.icon className="w-6 h-6 text-primary" />
              </div>
              <h2 className="font-serif text-3xl font-bold" data-testid={`text-terms-section-${index}`}>
                {section.title}
              </h2>
            </div>
            {section.paragraphs.map((paragraph, pIndex) => (
              <p key={pIndex} className="text-muted-foreground leading-loose text-lg">
                {paragraph}
              </p>
            ))}
          </div>
        </section>
      ))}

      <section className="py-16 px-6 bg-card/50">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-background">
            <CardContent className="p-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">تواصل معنا</span>
              </div>
              <p className="font-serif text-lg leading-loose text-foreground" data-testid="text-terms-contact">
                إذا كان لديك أي أسئلة أو استفسارات حول شروط الاستخدام هذه، يُرجى التواصل معنا عبر صفحة تواصل معنا أو عبر البريد الإلكتروني: support@qalamai.net
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <SharedFooter />
    </div>
  );
}