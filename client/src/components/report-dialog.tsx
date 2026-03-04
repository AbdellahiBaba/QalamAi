import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Flag } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const REPORT_REASONS = [
  { value: "inappropriate", label: "محتوى غير لائق" },
  { value: "plagiarism", label: "سرقة أدبية / انتحال" },
  { value: "offensive", label: "محتوى مسيء" },
  { value: "spam", label: "محتوى مزعج / سبام" },
  { value: "other", label: "سبب آخر" },
];

interface ReportDialogProps {
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportDialog({ projectId, open, onOpenChange }: ReportDialogProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      toast({ title: "يرجى اختيار سبب البلاغ", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/reports", {
        projectId,
        reason,
        details: details.trim() || null,
      });
      toast({ title: "تم إرسال البلاغ بنجاح وسيتم مراجعته" });
      setReason("");
      setDetails("");
      onOpenChange(false);
    } catch (error: any) {
      const msg = error?.message || "فشل في إرسال البلاغ";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent dir="rtl" className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2" data-testid="text-report-dialog-title">
            <Flag className="w-5 h-5 text-red-500" />
            الإبلاغ عن محتوى
          </AlertDialogTitle>
          <AlertDialogDescription data-testid="text-report-dialog-desc">
            إذا كنت تعتقد أن هذا المحتوى ينتهك سياسات المنصة، يرجى إرسال بلاغ وسنراجعه في أقرب وقت.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>سبب البلاغ</Label>
            <Select value={reason} onValueChange={setReason}>
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

          <div className="space-y-2">
            <Label>تفاصيل إضافية (اختياري)</Label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="أضف تفاصيل إضافية عن سبب البلاغ..."
              className="min-h-[80px] text-sm"
              dir="rtl"
              maxLength={2000}
              data-testid="textarea-report-details"
            />
          </div>
        </div>

        <AlertDialogFooter className="flex-row-reverse gap-2">
          <AlertDialogCancel data-testid="button-cancel-report">إلغاء</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSubmit}
            disabled={!reason || submitting}
            className="bg-red-600 text-white hover:bg-red-700"
            data-testid="button-submit-report"
          >
            {submitting ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Flag className="w-4 h-4 ml-2" />}
            إرسال البلاغ
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
