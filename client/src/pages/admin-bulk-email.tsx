import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight,
  Loader2,
  Mail,
  Sparkles,
  Send,
  Users,
  Tag,
  CheckCircle,
  RefreshCw,
  AlertTriangle,
  Copy,
  Check,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const SUPER_ADMIN_IDS = ["39706084", "e482facd-d157-4e97-ad91-af96b8ec8f49"];

type Step = "idle" | "generating" | "review" | "sending" | "done";

interface CampaignPreview {
  emailBody: string;
  emailSubject: string;
  targetCount: number;
}

interface CampaignResult {
  promoCode: string;
  validUntil: string;
  targetCount: number;
  sent: number;
  failed: number;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      data-testid="button-copy-promo"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "تم النسخ" : "نسخ"}
    </button>
  );
}

export default function AdminBulkEmail() {
  useDocumentTitle("حملة البريد التسويقي | QalamAI");
  const { user } = useAuth();
  const { toast } = useToast();

  const isSuperAdmin = user && (SUPER_ADMIN_IDS.includes((user as any).id || "") || (user as any).role === "admin");

  const [step, setStep] = useState<Step>("idle");
  const [preview, setPreview] = useState<CampaignPreview | null>(null);
  const [result, setResult] = useState<CampaignResult | null>(null);

  const handleGenerate = async () => {
    setStep("generating");
    try {
      const res = await apiRequest("POST", "/api/admin/promo-campaign/generate", {});
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPreview(data);
      setStep("review");
    } catch (err: any) {
      toast({ title: err.message || "فشل في توليد الحملة", variant: "destructive" });
      setStep("idle");
    }
  };

  const handleSend = async () => {
    if (!preview) return;
    setStep("sending");
    try {
      const res = await apiRequest("POST", "/api/admin/promo-campaign/send", {
        emailBody: preview.emailBody,
        emailSubject: preview.emailSubject,
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      setStep("done");
    } catch (err: any) {
      toast({ title: err.message || "فشل في إرسال الحملة", variant: "destructive" });
      setStep("review");
    }
  };

  const handleReset = () => {
    setStep("idle");
    setPreview(null);
    setResult(null);
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-4">
          <Mail className="w-12 h-12 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-serif font-bold">غير مصرّح</h1>
          <p className="text-muted-foreground">هذه الصفحة للمشرفين فقط.</p>
          <Link href="/admin"><Button variant="outline">العودة</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="gap-1.5" data-testid="button-back-admin">
              <ArrowRight className="w-4 h-4" />
              لوحة الإدارة
            </Button>
          </Link>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Mail className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-serif font-semibold text-sm">حملة البريد التسويقي</span>
            <Badge variant="outline" className="text-xs px-1.5 py-0 border-amber-300 text-amber-700 dark:text-amber-400">
              Super Admin
            </Badge>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Intro card */}
        <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="space-y-1">
              <h2 className="font-serif font-bold text-base">أبو هاشم يكتب — أنت ترسل</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                يقوم أبو هاشم بكتابة رسالة تسويقية أدبية مقنعة، ثم تستعرضها وتعتمدها. عند الإرسال يُنشئ النظام تلقائياً كود خصم 25% صالحاً في قاعدة البيانات ويرسله لجميع المستخدمين من الخطة المجانية.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Step 1: Idle / Generate */}
        {step === "idle" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                توليد حملة جديدة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                  <Tag className="w-5 h-5 text-amber-500 mx-auto" />
                  <p className="text-xl font-bold">25%</p>
                  <p className="text-xs text-muted-foreground">نسبة الخصم</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                  <Users className="w-5 h-5 text-blue-500 mx-auto" />
                  <p className="text-xl font-bold">مجاني</p>
                  <p className="text-xs text-muted-foreground">الخطة المستهدفة</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                  <Mail className="w-5 h-5 text-green-500 mx-auto" />
                  <p className="text-xl font-bold">تلقائي</p>
                  <p className="text-xs text-muted-foreground">كود + بريد تلقائي</p>
                </div>
              </div>
              <Button
                onClick={handleGenerate}
                className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                size="lg"
                data-testid="button-generate-campaign"
              >
                <Sparkles className="w-4 h-4" />
                اجعل أبو هاشم يكتب الرسالة
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Generating state */}
        {step === "generating" && (
          <Card>
            <CardContent className="py-16 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto">
                <Loader2 className="w-7 h-7 text-white animate-spin" />
              </div>
              <div>
                <p className="font-serif font-semibold text-lg">أبو هاشم يكتب الرسالة...</p>
                <p className="text-sm text-muted-foreground mt-1">قد يستغرق ذلك بضع ثوانٍ</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Review */}
        {step === "review" && preview && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <Users className="w-8 h-8 text-blue-500 shrink-0" />
                  <div>
                    <p className="text-2xl font-bold">{preview.targetCount}</p>
                    <p className="text-xs text-muted-foreground">مستخدم من الخطة المجانية</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <Tag className="w-8 h-8 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-2xl font-bold">25%</p>
                    <p className="text-xs text-muted-foreground">خصم صالح مرة واحدة</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Email subject */}
            <Card>
              <CardContent className="p-4 space-y-2">
                <Label className="text-xs text-muted-foreground">موضوع البريد الإلكتروني</Label>
                <Input
                  value={preview.emailSubject}
                  onChange={(e) => setPreview(prev => prev ? { ...prev, emailSubject: e.target.value } : prev)}
                  className="font-semibold"
                  data-testid="input-email-subject"
                />
              </CardContent>
            </Card>

            {/* Email body */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  نص الرسالة — بقلم أبو هاشم
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Textarea
                  value={preview.emailBody}
                  onChange={(e) => setPreview(prev => prev ? { ...prev, emailBody: e.target.value } : prev)}
                  rows={10}
                  className="text-sm leading-relaxed resize-none"
                  data-testid="textarea-email-body"
                />
                <p className="text-xs text-muted-foreground">يمكنك تعديل النص قبل الإرسال</p>
              </CardContent>
            </Card>

            {/* Promo code preview */}
            <Card className="border-dashed border-2">
              <CardContent className="p-4 text-center space-y-2">
                <p className="text-xs text-muted-foreground">سيُنشأ كود الخصم تلقائياً بهذا الشكل</p>
                <p className="text-2xl font-mono font-bold tracking-widest text-amber-600 dark:text-amber-400">
                  QALAM25-XXXX
                </p>
                <p className="text-xs text-muted-foreground">خصم 25% — يُولَّد عند الضغط على "إرسال"</p>
              </CardContent>
            </Card>

            {/* Warning */}
            <Card className="border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/20">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                <p className="text-sm text-orange-700 dark:text-orange-400">
                  ستُرسَل هذه الرسالة الآن لـ <strong>{preview.targetCount}</strong> مستخدم. هذا الإجراء لا يمكن التراجع عنه.
                </p>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleGenerate}
                className="gap-2"
                data-testid="button-regenerate"
              >
                <RefreshCw className="w-4 h-4" />
                إعادة التوليد
              </Button>
              <Button
                onClick={handleSend}
                className="flex-1 gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                size="lg"
                data-testid="button-send-campaign"
              >
                <Send className="w-4 h-4" />
                إرسال لـ {preview.targetCount} مستخدم
              </Button>
            </div>
          </div>
        )}

        {/* Sending state */}
        {step === "sending" && (
          <Card>
            <CardContent className="py-16 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center mx-auto">
                <Loader2 className="w-7 h-7 text-white animate-spin" />
              </div>
              <div>
                <p className="font-serif font-semibold text-lg">جارٍ الإرسال...</p>
                <p className="text-sm text-muted-foreground mt-1">يتم إنشاء كود الخصم وإرسال البريد الإلكتروني</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Done */}
        {step === "done" && result && (
          <div className="space-y-4">
            <Card className="border-green-200 dark:border-green-900/50 bg-green-50/50 dark:bg-green-950/20">
              <CardContent className="p-6 text-center space-y-3">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                <h2 className="font-serif font-bold text-xl">تمّ إرسال الحملة بنجاح</h2>
                <p className="text-sm text-muted-foreground">
                  تم إنشاء كود الخصم وإرساله عبر البريد الإلكتروني
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-4 text-center space-y-1">
                  <p className="text-2xl font-bold text-green-600">{result.sent}</p>
                  <p className="text-xs text-muted-foreground">بريد أُرسل</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center space-y-1">
                  <p className="text-2xl font-bold text-red-500">{result.failed}</p>
                  <p className="text-xs text-muted-foreground">فشل في الإرسال</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center space-y-1">
                  <p className="text-2xl font-bold">{result.targetCount}</p>
                  <p className="text-xs text-muted-foreground">إجمالي المستهدفين</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">كود الخصم المُنشأ</p>
                  <CopyButton text={result.promoCode} />
                </div>
                <div className="p-4 rounded-lg bg-muted text-center">
                  <p className="text-2xl font-mono font-bold tracking-widest text-amber-600 dark:text-amber-400" data-testid="text-promo-code">
                    {result.promoCode}
                  </p>
                </div>
                <Separator />
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>نسبة الخصم</span>
                    <span className="font-medium text-foreground">25% على جميع الخطط</span>
                  </div>
                  <div className="flex justify-between">
                    <span>صالح حتى</span>
                    <span className="font-medium text-foreground">
                      {new Date(result.validUntil).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>الحد الأقصى للاستخدام</span>
                    <span className="font-medium text-foreground">500 مرة</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              variant="outline"
              onClick={handleReset}
              className="w-full gap-2"
              data-testid="button-new-campaign"
            >
              <RefreshCw className="w-4 h-4" />
              إنشاء حملة جديدة
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
