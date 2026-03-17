import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Share2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface MilestoneCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "project_completion" | "word_count_goal" | "writing_streak" | "hall_of_glory" | "first_publication";
  authorName: string;
  projectTitle?: string;
  milestone?: number | string;
}

export function MilestoneCardModal({ open, onOpenChange, type, authorName, projectTitle, milestone }: MilestoneCardModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateCard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/milestone-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type, authorName, projectTitle, milestone }),
      });
      if (!res.ok) throw new Error("فشل في إنشاء البطاقة");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setImageUrl(url);
    } catch (e: any) {
      setError(e.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && !imageUrl && !loading) {
      generateCard();
    }
    if (!isOpen) {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
        setImageUrl(null);
      }
      setError(null);
    }
    onOpenChange(isOpen);
  };

  const downloadCard = () => {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `qalamai-milestone-${type}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            شارك إنجازك
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3" data-testid="loading-milestone-card">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">جاري إنشاء البطاقة...</p>
            </div>
          )}
          {error && (
            <div className="text-center py-8 space-y-3" data-testid="error-milestone-card">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={generateCard} data-testid="button-retry-card">
                إعادة المحاولة
              </Button>
            </div>
          )}
          {imageUrl && !loading && (
            <>
              <div className="rounded-lg overflow-hidden border shadow-sm" data-testid="preview-milestone-card">
                <img src={imageUrl} alt="بطاقة الإنجاز" className="w-full h-auto" />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 gap-2" onClick={downloadCard} data-testid="button-download-card">
                  <Download className="w-4 h-4" />
                  تحميل البطاقة
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                حمّل البطاقة وشاركها على وسائل التواصل مع وسم <span className="font-medium text-primary" dir="ltr">#QalamAI</span>
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
