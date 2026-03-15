import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { SharedNavbar } from "@/components/shared-navbar";
import { SharedFooter } from "@/components/shared-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, CheckCircle, ArrowRight } from "lucide-react";

export default function ApplyVerified() {
  useDocumentTitle("طلب الشارة الموثقة — QalamAI", "تقدّم بطلب للحصول على شارة الكاتب الموثّق على منصة QalamAI.");
  const { toast } = useToast();
  const [bio, setBio] = useState("");
  const [writingSamples, setWritingSamples] = useState("");
  const [socialLinks, setSocialLinks] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/apply-verified", { bio, writingSamples, socialLinks }),
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err: any) => {
      const msg = err?.message || "فشل في إرسال الطلب";
      toast({ title: msg, variant: "destructive" });
    },
  });

  if (submitted) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <SharedNavbar />
        <div className="flex items-center justify-center min-h-[70vh] px-4">
          <div className="text-center space-y-5 max-w-sm">
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto" data-testid="icon-submitted" />
            <h1 className="font-serif text-2xl font-bold">تم إرسال طلبك</h1>
            <p className="text-muted-foreground leading-relaxed">
              سيراجع فريق QalamAI طلبك خلال ٣–٧ أيام عمل. سنتواصل معك عبر البريد الإلكتروني المرتبط بحسابك.
            </p>
            <Link href="/">
              <Button data-testid="button-back-home">
                <ArrowRight className="w-4 h-4 ml-2" />
                العودة للرئيسية
              </Button>
            </Link>
          </div>
        </div>
        <SharedFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SharedNavbar />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        <div className="flex items-center gap-3 mb-3">
          <ShieldCheck className="w-7 h-7 text-primary" />
          <h1 className="font-serif text-3xl font-bold" data-testid="text-apply-title">طلب الشارة الموثقة</h1>
        </div>
        <p className="text-muted-foreground mb-10 leading-relaxed">
          الشارة الموثقة تميّزك ككاتب محترف على منصة QalamAI. يُمنح التوثيق للكتّاب الذين يمتلكون تجربة أدبية أو صحفية أو أكاديمية موثقة.
        </p>

        <Card data-testid="card-apply-form">
          <CardContent className="p-6 space-y-6">
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
              <h2 className="font-semibold text-sm">متطلبات الحصول على التوثيق</h2>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                  مقالات أو روايات أو أعمال منشورة سابقاً
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                  حضور واضح على منصة QalamAI (مقالات منشورة)
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                  التزام بمعايير الجودة وأخلاقيات الكتابة
                </li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                السيرة الذاتية الأدبية / الصحفية <span className="text-destructive">*</span>
              </label>
              <Textarea
                rows={5}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="اكتب عن خلفيتك الكتابية، مؤهلاتك، وأبرز أعمالك... (٥٠ حرفاً على الأقل)"
                data-testid="textarea-bio"
              />
              <p className="text-xs text-muted-foreground text-left" dir="ltr">{bio.length} / 50+ حرف</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">روابط نماذج كتابية (اختياري)</label>
              <Textarea
                rows={3}
                value={writingSamples}
                onChange={(e) => setWritingSamples(e.target.value)}
                placeholder="روابط لمقالات أو أعمال منشورة على الإنترنت، كل رابط في سطر"
                data-testid="textarea-writing-samples"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">روابط حساباتك الاجتماعية (اختياري)</label>
              <Textarea
                rows={2}
                value={socialLinks}
                onChange={(e) => setSocialLinks(e.target.value)}
                placeholder="تويتر، لينكدإن، موقع شخصي... (كل رابط في سطر)"
                data-testid="textarea-social-links"
              />
            </div>

            <Button
              className="w-full"
              disabled={bio.trim().length < 50 || submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
              data-testid="button-submit-application"
            >
              {submitMutation.isPending ? "جارٍ الإرسال..." : "إرسال الطلب"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <SharedFooter />
    </div>
  );
}
