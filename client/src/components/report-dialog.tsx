import { useState } from "react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Flag, ChevronLeft, ChevronRight, CheckCircle2, Info, AlertTriangle, ShieldAlert, Mail, Copy, Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import LtrNum from "@/components/ui/ltr-num";

const REPORT_REASONS = [
  { value: "inappropriate", label: "محتوى غير لائق" },
  { value: "plagiarism", label: "سرقة أدبية / انتحال" },
  { value: "offensive", label: "محتوى مسيء" },
  { value: "spam", label: "محتوى مزعج / سبام" },
  { value: "other", label: "سبب آخر" },
];

const SUB_REASONS: Record<string, { value: string; label: string }[]> = {
  inappropriate: [
    { value: "violence", label: "عنف" },
    { value: "sexual", label: "محتوى جنسي" },
    { value: "drugs", label: "مخدرات / مواد ممنوعة" },
    { value: "other_inappropriate", label: "أخرى" },
  ],
  plagiarism: [
    { value: "copied_known_source", label: "منسوخ من مصدر معروف" },
    { value: "ai_no_disclosure", label: "مُولَّد بالذكاء الاصطناعي بدون إفصاح" },
    { value: "other_plagiarism", label: "أخرى" },
  ],
  offensive: [
    { value: "hate_speech", label: "خطاب كراهية" },
    { value: "discrimination", label: "تمييز" },
    { value: "threats", label: "تهديدات" },
    { value: "other_offensive", label: "أخرى" },
  ],
  spam: [
    { value: "advertising", label: "إعلانات" },
    { value: "repeated_content", label: "محتوى متكرر" },
    { value: "misleading", label: "محتوى مضلل" },
    { value: "other_spam", label: "أخرى" },
  ],
  other: [],
};

const SEVERITY_OPTIONS = [
  { value: "low", label: "منخفضة", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  { value: "medium", label: "متوسطة", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  { value: "high", label: "عالية", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  { value: "critical", label: "حرجة", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
];

interface ReportDialogProps {
  projectId: number;
  projectTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportDialog({ projectId, projectTitle, open, onOpenChange }: ReportDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState("");
  const [subReason, setSubReason] = useState("");
  const [severity, setSeverity] = useState("");
  const [details, setDetails] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reportNumber, setReportNumber] = useState("");
  const [refCopied, setRefCopied] = useState(false);

  const maxDetailsLength = 2000;
  const availableSubReasons = SUB_REASONS[reason] || [];

  const resetForm = () => {
    setStep(1);
    setReason("");
    setSubReason("");
    setSeverity("");
    setDetails("");
    setReporterEmail("");
    setReportNumber("");
    setRefCopied(false);
  };

  const handleClose = (openState: boolean) => {
    if (!openState) {
      resetForm();
    }
    onOpenChange(openState);
  };

  const handleNextStep = () => {
    if (!reason) {
      toast({ title: "يرجى اختيار سبب البلاغ", variant: "destructive" });
      return;
    }
    if (availableSubReasons.length > 0 && !subReason) {
      toast({ title: "يرجى اختيار التصنيف الفرعي", variant: "destructive" });
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!severity) {
      toast({ title: "يرجى تحديد درجة الخطورة", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/reports", {
        projectId,
        reason,
        subReason: subReason || null,
        severity,
        details: details.trim() || null,
        reporterEmail: reporterEmail.trim() || null,
      });
      const data = await res.json();
      setReportNumber(data.reportNumber || "");
      setStep(3);
      toast({ title: "تم إرسال البلاغ بنجاح" });
    } catch (error: any) {
      const msg = error?.message || "فشل في إرسال البلاغ";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyRef = async () => {
    try {
      await navigator.clipboard.writeText(reportNumber);
      setRefCopied(true);
      setTimeout(() => setRefCopied(false), 2000);
    } catch (e) {
      console.warn("Failed to copy report reference to clipboard:", e);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent dir="rtl" className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2" data-testid="text-report-dialog-title">
            <Flag className="w-5 h-5 text-destructive" />
            الإبلاغ عن محتوى
          </AlertDialogTitle>
          {projectTitle && step !== 3 && (
            <div className="text-sm text-muted-foreground mt-1" data-testid="text-report-project-title">
              المحتوى: <span className="font-semibold text-foreground">{projectTitle}</span>
            </div>
          )}
          {step !== 3 && (
            <AlertDialogDescription data-testid="text-report-dialog-desc">
              إذا كنت تعتقد أن هذا المحتوى ينتهك سياسات المنصة، يرجى إرسال بلاغ وسنراجعه في أقرب وقت.
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>

        {step !== 3 && (
          <div className="flex items-center gap-2 py-2" data-testid="step-indicator">
            <div className={`flex items-center gap-1.5 text-sm font-medium ${step === 1 ? "text-primary" : "text-muted-foreground"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${step === 1 ? "border-primary bg-primary text-primary-foreground" : step > 1 ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"}`} data-testid="step-1-indicator">
                {step > 1 ? <CheckCircle2 className="w-4 h-4" /> : "1"}
              </div>
              <span>التصنيف</span>
            </div>
            <div className="flex-1 h-0.5 bg-muted rounded-full mx-1">
              <div className={`h-full rounded-full transition-all ${step >= 2 ? "bg-primary w-full" : "w-0"}`} />
            </div>
            <div className={`flex items-center gap-1.5 text-sm font-medium ${step === 2 ? "text-primary" : "text-muted-foreground"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${step === 2 ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"}`} data-testid="step-2-indicator">
                2
              </div>
              <span>التفاصيل</span>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 py-2" data-testid="step-1-content">
            <div className="space-y-2">
              <Label>سبب البلاغ</Label>
              <Select value={reason} onValueChange={(val) => { setReason(val); setSubReason(""); }}>
                <SelectTrigger data-testid="select-report-reason">
                  <SelectValue placeholder="اختر سبب البلاغ" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {availableSubReasons.length > 0 && (
              <div className="space-y-2">
                <Label>التصنيف الفرعي</Label>
                <Select value={subReason} onValueChange={setSubReason}>
                  <SelectTrigger data-testid="select-report-sub-reason">
                    <SelectValue placeholder="اختر التصنيف الفرعي" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubReasons.map((sr) => (
                      <SelectItem key={sr.value} value={sr.value}>{sr.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-2">
              <Button variant="outline" onClick={() => handleClose(false)} data-testid="button-cancel-report">
                إلغاء
              </Button>
              <Button onClick={handleNextStep} data-testid="button-next-step">
                التالي
                <ChevronLeft className="w-4 h-4 mr-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-2" data-testid="step-2-content">
            <div className="space-y-2">
              <Label>درجة الخطورة</Label>
              <div className="flex items-center gap-2 flex-wrap" data-testid="severity-selector">
                {SEVERITY_OPTIONS.map((opt) => (
                  <Badge
                    key={opt.value}
                    variant="outline"
                    className={`cursor-pointer toggle-elevate ${severity === opt.value ? opt.color + " border-transparent" : ""}`}
                    onClick={() => setSeverity(opt.value)}
                    data-testid={`badge-severity-${opt.value}`}
                  >
                    {opt.value === "critical" && <ShieldAlert className="w-3 h-3 ml-1" />}
                    {opt.value === "high" && <AlertTriangle className="w-3 h-3 ml-1" />}
                    {opt.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>تفاصيل إضافية (اختياري)</Label>
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="أضف تفاصيل إضافية عن سبب البلاغ..."
                className="min-h-[80px] text-sm"
                dir="rtl"
                maxLength={maxDetailsLength}
                data-testid="textarea-report-details"
              />
              <div className="text-xs text-muted-foreground text-left" dir="ltr" data-testid="text-char-counter">
                <LtrNum>{details.length}</LtrNum> / <LtrNum>{maxDetailsLength}</LtrNum>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                البريد الإلكتروني (اختياري)
              </Label>
              <Input
                type="email"
                value={reporterEmail}
                onChange={(e) => setReporterEmail(e.target.value)}
                placeholder="example@email.com"
                dir="ltr"
                className="text-left"
                data-testid="input-reporter-email"
              />
              <p className="text-xs text-muted-foreground">
                أدخل بريدك لنبلغك بنتيجة مراجعة البلاغ
              </p>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 border border-muted" data-testid="info-box-report">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>سيتم مراجعة بلاغك خلال 24-48 ساعة.</p>
                <p>هويتك ستبقى مجهولة تماماً.</p>
                <p>سيتم اتخاذ الإجراء المناسب في حال ثبوت المخالفة.</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(1)} data-testid="button-prev-step">
                <ChevronRight className="w-4 h-4 ml-1" />
                السابق
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!severity || submitting}
                variant="destructive"
                data-testid="button-submit-report"
              >
                {submitting ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Flag className="w-4 h-4 ml-2" />}
                إرسال البلاغ
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="py-4 space-y-5 text-center" data-testid="step-3-confirmation">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-serif font-bold" data-testid="text-report-success-title">تم إرسال البلاغ بنجاح</h3>
              <p className="text-sm text-muted-foreground">شكراً لمساهمتك في الحفاظ على جودة المحتوى</p>
            </div>

            {reportNumber && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">رقم البلاغ المرجعي:</p>
                <div className="flex items-center justify-center gap-2">
                  <Badge variant="secondary" className="text-sm px-3 py-1 font-mono" data-testid="text-report-number">
                    {reportNumber}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleCopyRef}
                    data-testid="button-copy-report-number"
                    aria-label="نسخ رقم التقرير"
                  >
                    {refCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 border border-muted text-right" data-testid="info-box-confirmation">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>سيتم مراجعة بلاغك خلال 24-48 ساعة.</p>
                <p>احتفظ برقم البلاغ المرجعي للمتابعة.</p>
              </div>
            </div>

            <Button variant="outline" onClick={() => handleClose(false)} className="w-full" data-testid="button-close-report">
              إغلاق
            </Button>
          </div>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
