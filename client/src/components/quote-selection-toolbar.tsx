import { useState, useEffect, useCallback, useRef } from "react";
import { Quote, Copy, Share2, Check, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QuoteSelectionToolbarProps {
  projectId: number;
  chapterId?: number;
  projectTitle?: string;
}

export function QuoteSelectionToolbar({ projectId, chapterId, projectTitle }: QuoteSelectionToolbarProps) {
  const { toast } = useToast();
  const [selectedText, setSelectedText] = useState("");
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSharePreview, setShowSharePreview] = useState(false);
  const [shareImgUrl, setShareImgUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const handleSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setTimeout(() => {
        const s = window.getSelection();
        if (!s || s.isCollapsed || !s.toString().trim()) {
          setSelectedText("");
          setPosition(null);
          setSaved(false);
        }
      }, 200);
      return;
    }
    const text = sel.toString().trim();
    if (text.length < 5 || text.length > 500) return;
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setSelectedText(text);
    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + window.scrollY - 55,
    });
    setSaved(false);
  }, []);

  useEffect(() => {
    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("touchend", handleSelection);
    return () => {
      document.removeEventListener("mouseup", handleSelection);
      document.removeEventListener("touchend", handleSelection);
    };
  }, [handleSelection]);

  const handleQuote = async () => {
    if (!selectedText || saving) return;
    setSaving(true);
    try {
      const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
      const csrfVal = csrfMatch ? decodeURIComponent(csrfMatch[1]) : "";
      const res = await fetch(`/api/projects/${projectId}/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfVal },
        credentials: "include",
        body: JSON.stringify({ quoteText: selectedText, chapterId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || "فشل في حفظ الاقتباس", variant: "destructive" });
        return;
      }
      setSaved(true);
      toast({ title: data.duplicate ? "تم اقتباس هذا النص مسبقاً" : "تم حفظ الاقتباس ✓" });
    } catch {
      toast({ title: "فشل في حفظ الاقتباس", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(selectedText);
      toast({ title: "تم نسخ النص" });
    } catch {
      toast({ title: "فشل في النسخ", variant: "destructive" });
    }
  };

  const handleShare = async () => {
    setShowSharePreview(true);
    setShareLoading(true);
    try {
      const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
      const csrfVal = csrfMatch ? decodeURIComponent(csrfMatch[1]) : "";
      const res = await fetch("/api/quote-card", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfVal },
        credentials: "include",
        body: JSON.stringify({ quoteText: selectedText, projectTitle }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      setShareImgUrl(URL.createObjectURL(blob));
    } catch {
      toast({ title: "فشل في إنشاء بطاقة الاقتباس", variant: "destructive" });
      setShowSharePreview(false);
    } finally {
      setShareLoading(false);
    }
  };

  if (!position || !selectedText) return null;

  return (
    <>
      <div
        ref={toolbarRef}
        className="fixed z-[9999] flex items-center gap-1 bg-background/95 backdrop-blur-sm border rounded-xl shadow-xl px-2 py-1.5 animate-in fade-in-0 zoom-in-95 duration-150"
        style={{
          left: `${Math.max(20, Math.min(position.x - 100, window.innerWidth - 220))}px`,
          top: `${Math.max(10, position.y - window.scrollY)}px`,
          position: "fixed",
          transform: "translateY(0)",
        }}
        dir="rtl"
        data-testid="quote-selection-toolbar"
      >
        <button
          onClick={handleQuote}
          disabled={saving || saved}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-primary/10 text-primary disabled:opacity-50"
          data-testid="button-quote-save"
        >
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : saved ? (
            <Check className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <Quote className="w-3.5 h-3.5" />
          )}
          <span>{saved ? "تم" : "اقتبس"}</span>
        </button>
        <div className="w-px h-5 bg-border" />
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-muted text-muted-foreground"
          data-testid="button-quote-copy"
        >
          <Copy className="w-3.5 h-3.5" />
          <span>نسخ</span>
        </button>
        <div className="w-px h-5 bg-border" />
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-muted text-muted-foreground"
          data-testid="button-quote-share"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>شارك</span>
        </button>
      </div>

      {showSharePreview && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => { setShowSharePreview(false); if (shareImgUrl) URL.revokeObjectURL(shareImgUrl); setShareImgUrl(null); }}>
          <div className="bg-background rounded-xl shadow-2xl p-4 max-w-[90vw] space-y-3" onClick={(e) => e.stopPropagation()} dir="rtl" data-testid="quote-share-preview">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-semibold text-sm">بطاقة الاقتباس</h3>
              <button onClick={() => { setShowSharePreview(false); if (shareImgUrl) URL.revokeObjectURL(shareImgUrl); setShareImgUrl(null); }} data-testid="button-close-quote-preview">
                <X className="w-4 h-4" />
              </button>
            </div>
            {shareLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : shareImgUrl ? (
              <>
                <img src={shareImgUrl} alt="بطاقة الاقتباس" className="rounded-lg max-w-full" data-testid="img-quote-card-preview" />
                <a
                  href={shareImgUrl}
                  download="qalamai-quote.png"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                  data-testid="button-download-quote-card"
                >
                  تحميل البطاقة
                </a>
              </>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}