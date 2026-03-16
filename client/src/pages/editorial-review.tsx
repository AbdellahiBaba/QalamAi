import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useToast } from "@/hooks/use-toast";
import { SharedNavbar } from "@/components/shared-navbar";
import { SharedFooter } from "@/components/shared-footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Feather, Send, Copy, CheckCircle, Loader2, FileEdit } from "lucide-react";

const projectTypes = [
  { value: "novel", label: "رواية" },
  { value: "essay", label: "مقال" },
  { value: "scenario", label: "سيناريو" },
  { value: "short_story", label: "قصة قصيرة" },
  { value: "khawater", label: "خاطرة" },
  { value: "social_media", label: "سوشيال ميديا" },
  { value: "poetry", label: "قصيدة" },
  { value: "memoire", label: "مذكرة تخرج" },
];

export default function EditorialReview() {
  useDocumentTitle("محرر أبو هاشم — مراجعة تحريرية ذكية", "أرسل نصّك العربي لأبو هاشم واحصل على مراجعة تحريرية شاملة: لغة، أسلوب، بناء، ونص منقّح.");
  const { user } = useAuth();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [projectType, setProjectType] = useState("novel");
  const [reviewContent, setReviewContent] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [copied, setCopied] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (resultRef.current && reviewContent) {
      resultRef.current.scrollTop = resultRef.current.scrollHeight;
    }
  }, [reviewContent]);

  const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;

  const handleSubmit = async () => {
    if (!text.trim() || text.trim().length < 20) {
      toast({ title: "يرجى إدخال نص لا يقل عن 20 حرفاً", variant: "destructive" });
      return;
    }
    setIsReviewing(true);
    setReviewContent("");

    try {
      const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
      const csrfVal = csrfMatch ? decodeURIComponent(csrfMatch[1]) : "";
      const res = await fetch("/api/editorial-review", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfVal },
        body: JSON.stringify({ text: text.trim(), projectType }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "فشل في المراجعة");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.error) throw new Error(event.error);
            if (event.content) {
              full += event.content;
              setReviewContent(full);
            }
          } catch (parseErr: any) {
            if (parseErr.message && parseErr.message !== "Unexpected end of JSON input") throw parseErr;
          }
        }
      }
    } catch (error: any) {
      toast({ title: error.message || "فشل في المراجعة التحريرية", variant: "destructive" });
    } finally {
      setIsReviewing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(reviewContent);
    setCopied(true);
    toast({ title: "تم نسخ المراجعة" });
    setTimeout(() => setCopied(false), 2000);
  };

  const extractRevisedText = () => {
    const marker = "## النص المنقّح";
    const idx = reviewContent.indexOf(marker);
    if (idx === -1) return null;
    return reviewContent.slice(idx + marker.length).trim();
  };

  const handleApplyRevised = () => {
    const revised = extractRevisedText();
    if (revised) {
      setText(revised);
      setReviewContent("");
      toast({ title: "تم تحميل النص المنقّح في المحرر" });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <SharedNavbar />
        <div className="max-w-4xl mx-auto px-4 py-32 text-center space-y-6">
          <Feather className="w-16 h-16 text-primary mx-auto" />
          <h1 className="font-serif text-3xl font-bold" data-testid="text-editor-login-required">محرر أبو هاشم</h1>
          <p className="text-muted-foreground text-lg">سجّل دخولك للوصول إلى المحرر التحريري الذكي</p>
        </div>
        <SharedFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SharedNavbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center mb-8 sm:mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
            <FileEdit className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">محرر أبو هاشم</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold" data-testid="text-editor-title">
            المراجعة التحريرية الذكية
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            الصق نصّك العربي وسيقدّم لك أبو هاشم مراجعة تحريرية شاملة: ملاحظات لغوية ونحوية، تقييم أسلوبي، ملاحظات بنيوية، ونسخة منقّحة من النص.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-lg flex items-center gap-2">
                <Feather className="w-5 h-5 text-primary" />
                النص المراد مراجعته
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Select value={projectType} onValueChange={setProjectType}>
                  <SelectTrigger className="w-48" data-testid="select-editor-type">
                    <SelectValue placeholder="نوع العمل" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectTypes.map(t => (
                      <SelectItem key={t.value} value={t.value} data-testid={`option-type-${t.value}`}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge variant={wordCount > 5000 ? "destructive" : "outline"} className="text-xs" data-testid="badge-word-count">
                  {wordCount} كلمة{wordCount > 5000 ? " (الحد الأقصى ~5000)" : ""}
                </Badge>
              </div>

              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="الصق نصّك العربي هنا..."
                className="min-h-[350px] text-base leading-relaxed font-serif resize-y"
                dir="rtl"
                data-testid="textarea-editor-input"
              />

              <Button
                onClick={handleSubmit}
                disabled={isReviewing || text.trim().length < 20}
                className="w-full"
                size="lg"
                data-testid="button-submit-review"
              >
                {isReviewing ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    جارٍ المراجعة...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 ml-2" />
                    راجع النص
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className={reviewContent ? "" : "opacity-60"}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-serif text-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  المراجعة التحريرية
                </CardTitle>
                {reviewContent && !isReviewing && (
                  <div className="flex gap-2">
                    {extractRevisedText() && (
                      <Button variant="outline" size="sm" onClick={handleApplyRevised} data-testid="button-apply-revised">
                        <FileEdit className="w-3.5 h-3.5 ml-1.5" />
                        تطبيق المنقّح
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={handleCopy} data-testid="button-copy-review">
                      {copied ? <CheckCircle className="w-3.5 h-3.5 ml-1.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 ml-1.5" />}
                      {copied ? "تم النسخ" : "نسخ"}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!reviewContent && !isReviewing && (
                <div className="text-center py-16 text-muted-foreground" data-testid="text-editor-empty">
                  <FileEdit className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>ستظهر المراجعة هنا بعد إرسال النص</p>
                </div>
              )}
              {isReviewing && !reviewContent && (
                <div className="text-center py-16" data-testid="text-editor-loading">
                  <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-primary" />
                  <p className="text-muted-foreground">أبو هاشم يراجع نصّك...</p>
                </div>
              )}
              {reviewContent && (
                <div
                  ref={resultRef}
                  className="prose prose-sm dark:prose-invert max-w-none max-h-[500px] overflow-y-auto font-serif text-base leading-relaxed whitespace-pre-wrap"
                  dir="rtl"
                  data-testid="text-editor-result"
                >
                  {reviewContent}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <SharedFooter />
    </div>
  );
}
