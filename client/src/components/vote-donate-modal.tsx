import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface VoteDonateModalProps {
  open: boolean;
  onClose: () => void;
  authorId: string;
  authorName: string;
  projectId: number;
}

export function VoteDonateModal({ open, onClose, authorId, authorName, projectId }: VoteDonateModalProps) {
  const { toast } = useToast();
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const donate = async (amountCents: number) => {
    if (amountCents < 100) {
      toast({ title: "المبلغ صغير جداً", description: "الحد الأدنى للتبرع هو 1 دولار", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/votes/donate", {
        toAuthorId: authorId,
        projectId,
        amountCents,
      });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch {
      toast({ title: "تعذّر إنشاء جلسة الدفع", description: "حاول مرة أخرى", variant: "destructive" });
      setLoading(false);
    }
  };

  const handleCustomDonate = () => {
    const parsed = parseFloat(customAmount.trim());
    if (isNaN(parsed) || parsed <= 0) {
      toast({ title: "أدخل مبلغاً صحيحاً", variant: "destructive" });
      return;
    }
    donate(Math.round(parsed * 100));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm" dir="rtl" data-testid="vote-donate-modal">
        <DialogHeader>
          <DialogTitle className="font-serif text-center text-lg flex items-center justify-center gap-2">
            <Heart className="w-5 h-5 text-red-500 fill-current" />
            ادعم هذا الكاتب
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            أعجبك عمل <span className="font-semibold text-foreground">{authorName}</span>؟
            <br />
            <span className="text-xs">تبرّعك اختياري تماماً ويصل مباشرة للكاتب</span>
          </p>

          <Button
            className="w-full gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold h-11"
            onClick={() => donate(500)}
            disabled={loading}
            data-testid="vote-donate-5"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4 fill-current" />}
            دعم سريع — 5$
          </Button>

          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">أو مبلغ مخصص</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="flex gap-2">
            <Input
              type="number"
              min="1"
              step="0.5"
              placeholder="0.00"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="text-center"
              disabled={loading}
              data-testid="vote-donate-custom-input"
            />
            <span className="flex items-center text-sm text-muted-foreground font-medium">USD</span>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleCustomDonate}
            disabled={loading || !customAmount}
            data-testid="vote-donate-submit"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
            أرسل التبرع
          </Button>

          <button
            onClick={onClose}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            data-testid="vote-donate-skip"
          >
            تخطّي — شكراً لتصويتك
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
