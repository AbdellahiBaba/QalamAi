import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { useEffect, useState, useRef, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SharedNavbar } from "@/components/shared-navbar";
import { SharedFooter } from "@/components/shared-footer";
import { Eye, Clock, ArrowRight, BookOpen, Share2, Heart, MessageCircle, Send, Code2, Lock, BadgeCheck, Volume2, VolumeX, Coffee, Quote } from "lucide-react";
import StarRating from "@/components/ui/star-rating";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface PublicEssay {
  id: number;
  title: string;
  mainIdea: string | null;
  coverImageUrl: string | null;
  shareToken: string;
  authorName: string;
  authorId: string;
  authorIsVerified: boolean;
  authorAverageRating: number;
  subject: string | null;
  views: number;
  clicks: number;
  reactions: Record<string, number>;
  totalWords: number;
  createdAt: string;
  essayTone: string | null;
  targetAudience: string | null;
}

interface SharedProject {
  id: number;
  title: string;
  mainIdea: string;
  projectType: string;
  coverImageUrl: string | null;
  chapters: Array<{ chapterNumber: number; title: string; content: string }>;
}

function calcReadingTime(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 200));
}

const SUBJECT_LABELS: Record<string, string> = {
  news: "أخبار", politics: "سياسة", science: "علوم", technology: "تقنية",
  economics: "اقتصاد", sports: "رياضة", culture: "ثقافة", health: "صحة",
  education: "تعليم", environment: "بيئة", opinion: "رأي", travel: "سياحة",
  food: "طعام", entertainment: "ترفيه", history: "تاريخ", philosophy: "فلسفة",
  fashion: "موضة", weather: "طقس",
};

interface EssayComment {
  id: number;
  author_name: string;
  content: string;
  created_at: string;
}

interface RelatedEssay {
  id: number;
  title: string;
  coverImageUrl: string | null;
  shareToken: string | null;
  authorName: string;
  views: number;
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export default function EssayPublic() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [embedOpen, setEmbedOpen] = useState(false);
  const [commentName, setCommentName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [commentSent, setCommentSent] = useState(false);

  // Reading progress bar
  const [readProgress, setReadProgress] = useState(0);
  const articleRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const onScroll = () => {
      const el = articleRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight;
      const scrolled = Math.max(0, -rect.top);
      setReadProgress(Math.min(100, (scrolled / (total - window.innerHeight)) * 100));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // TTS audio
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleTTS = useCallback(async () => {
    if (audioRef.current) {
      if (audioPlaying) { audioRef.current.pause(); setAudioPlaying(false); }
      else { audioRef.current.play(); setAudioPlaying(true); }
      return;
    }
    if (!shareToken) return;
    setAudioLoading(true);
    try {
      const res = await fetch(`/api/tts/essay/${shareToken}`, { method: "POST" });
      if (!res.ok) throw new Error("فشل");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setAudioPlaying(false);
      audio.play();
      setAudioPlaying(true);
    } catch {
      toast({ title: "فشل تحميل التسجيل الصوتي", variant: "destructive" });
    } finally {
      setAudioLoading(false);
    }
  }, [shareToken, audioPlaying, toast]);

  // Quote highlighting — state only, callback defined AFTER essay query to avoid TDZ
  const [quotePopup, setQuotePopup] = useState<{ text: string; x: number; y: number } | null>(null);
  const handleTextSelection = useCallback(() => {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (!text || text.length < 15 || text.length > 500) { setQuotePopup(null); return; }
    const range = sel!.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setQuotePopup({ text, x: rect.left + rect.width / 2, y: rect.top + window.scrollY - 48 });
  }, []);

  const { data: essay, isLoading: essayLoading, error: essayError } = useQuery<PublicEssay>({
    queryKey: ["/api/public/essay", shareToken],
    queryFn: async () => {
      const res = await fetch(`/api/public/essay/${shareToken}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!shareToken,
  });

  const { data: shared, isLoading: sharedLoading } = useQuery<SharedProject>({
    queryKey: ["/api/shared", shareToken],
    queryFn: async () => {
      const res = await fetch(`/api/shared/${shareToken}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!shareToken,
  });

  // Defined AFTER essay query — safe from TDZ
  const essayTitle = essay?.title;
  const handleShareQuote = useCallback(async () => {
    if (!quotePopup) return;
    const text = `"${quotePopup.text}" — ${essayTitle ?? ""} | QalamAI\nhttps://qalamai.net/essay/${shareToken}`;
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "تم نسخ الاقتباس" });
    } catch {
      toast({ title: "تعذّر النسخ" });
    }
    setQuotePopup(null);
  }, [quotePopup, essayTitle, shareToken, toast]);

  const reactMutation = useMutation({
    mutationFn: async (reactionType: string) => {
      const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
      const csrfVal = csrfMatch ? decodeURIComponent(csrfMatch[1]) : "";
      const res = await fetch(`/api/public/essays/${essay?.id}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfVal },
        body: JSON.stringify({ reactionType }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/essay", shareToken] });
    },
  });

  const { data: comments } = useQuery<EssayComment[]>({
    queryKey: ["/api/public/essays/comments", essay?.id],
    queryFn: async () => {
      const res = await fetch(`/api/public/essays/${essay!.id}/comments`);
      return res.json();
    },
    enabled: !!essay?.id,
  });

  const { data: relatedEssays } = useQuery<RelatedEssay[]>({
    queryKey: ["/api/public/essays/related", essay?.id],
    queryFn: async () => {
      const url = essay?.subject
        ? `/api/public/essays/${essay!.id}/related?subject=${essay.subject}`
        : `/api/public/essays/${essay!.id}/related`;
      const res = await fetch(url);
      return res.json();
    },
    enabled: !!essay?.id,
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
      const csrfVal = csrfMatch ? decodeURIComponent(csrfMatch[1]) : "";
      const res = await fetch(`/api/public/essays/${essay!.id}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfVal },
        body: JSON.stringify({ authorName: commentName, content: commentText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الإرسال");
      return data;
    },
    onSuccess: () => {
      setCommentSent(true);
      setCommentName("");
      setCommentText("");
    },
    onError: (err: any) => {
      toast({ title: err.message || "فشل الإرسال", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!essay) return;
    document.title = `${essay.title} — قلم AI`;
    const description = essay.mainIdea ? essay.mainIdea.slice(0, 160) : "مقال على منصة QalamAI";
    const url = `https://qalamai.net/essay/${shareToken}`;
    const image = essay.coverImageUrl || "https://qalamai.net/og-default.png";

    const setMeta = (name: string, content: string, prop?: boolean) => {
      const selector = prop ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let el = document.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        if (prop) el.setAttribute("property", name); else el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("description", description);
    setMeta("og:type", "article", true);
    setMeta("og:title", essay.title, true);
    setMeta("og:description", description, true);
    setMeta("og:image", image, true);
    setMeta("og:url", url, true);
    setMeta("og:locale", "ar_AR", true);
    setMeta("og:site_name", "QalamAI", true);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", essay.title);
    setMeta("twitter:description", description);
    setMeta("twitter:image", image);

    // Canonical link
    let canonical = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", url);

    // JSON-LD structured data
    const existingScript = document.querySelector("#essay-jsonld");
    if (existingScript) existingScript.remove();
    const script = document.createElement("script");
    script.id = "essay-jsonld";
    script.type = "application/ld+json";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": essay.title,
      "description": description,
      "author": { "@type": "Person", "name": essay.authorName },
      "publisher": { "@type": "Organization", "name": "QalamAI", "url": "https://qalamai.net" },
      "url": url,
      "image": image,
      "inLanguage": "ar",
      "datePublished": essay.createdAt,
    });
    document.head.appendChild(script);

    // Track view
    const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
    const csrfVal = csrfMatch ? decodeURIComponent(csrfMatch[1]) : "";
    fetch(`/api/public/essays/${essay.id}/view`, {
      method: "POST", headers: { "X-CSRF-Token": csrfVal },
    }).catch(() => {});

    return () => {
      const s = document.querySelector("#essay-jsonld");
      if (s) s.remove();
    };
  }, [essay, shareToken]);

  const handleShare = () => {
    const url = `https://qalamai.net/essay/${shareToken}`;
    const text = essay ? `اقرأ مقال "${essay.title}" على QalamAI` : "مقال على QalamAI";
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, "_blank", "noopener,noreferrer,width=600,height=400");
  };

  const handleShareNative = async () => {
    const url = `https://qalamai.net/essay/${shareToken}`;
    const text = essay ? `اقرأ مقال "${essay.title}" على QalamAI` : "مقال على QalamAI";
    if (navigator.share) {
      try {
        await navigator.share({ title: essay?.title, text, url });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast({ title: "تم نسخ الرابط", description: "يمكنك مشاركة الرابط الآن" });
      } catch {
        handleShare();
      }
    }
  };

  if (essayLoading) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <SharedNavbar />
        <div className="max-w-3xl mx-auto px-4 pt-24 pb-16 space-y-6">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="aspect-[16/9] w-full rounded-xl" />
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-4 w-full" />)}
          </div>
        </div>
        <SharedFooter />
      </div>
    );
  }

  if (essayError || !essay) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <SharedNavbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto" />
            <h1 className="text-2xl font-serif font-bold">المقال غير موجود</h1>
            <p className="text-muted-foreground">هذا المقال غير متاح أو تمت إزالته</p>
            <Link href="/essays">
              <Button variant="outline" data-testid="button-back-to-essays">
                <ArrowRight className="w-4 h-4 ml-2" />
                العودة إلى المقالات
              </Button>
            </Link>
          </div>
        </div>
        <SharedFooter />
      </div>
    );
  }

  const totalReactions = Object.values(essay.reactions).reduce((a, b) => a + b, 0);
  const readingTime = calcReadingTime(essay.totalWords);

  return (
    <div className="min-h-screen bg-background" dir="rtl" onMouseUp={handleTextSelection}>
      {/* Reading progress bar */}
      <div
        className="fixed top-0 left-0 h-0.5 bg-primary z-[9999] transition-all duration-100"
        style={{ width: `${readProgress}%` }}
        data-testid="reading-progress-bar"
      />

      {/* Quote share popup */}
      {quotePopup && (
        <div
          className="fixed z-[9998] transform -translate-x-1/2"
          style={{ top: quotePopup.y, left: quotePopup.x }}
        >
          <button
            onClick={handleShareQuote}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background text-xs rounded-full shadow-lg hover:opacity-90 transition-opacity whitespace-nowrap"
            data-testid="button-share-quote"
          >
            <Quote className="w-3 h-3" />
            نسخ الاقتباس
          </button>
        </div>
      )}

      <SharedNavbar />

      <article ref={articleRef} className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        {/* Header */}
        <div className="space-y-4 mb-8">
          {essay.subject && (
            <Badge variant="secondary" data-testid="badge-essay-subject">
              {SUBJECT_LABELS[essay.subject] || essay.subject}
            </Badge>
          )}

          <h1
            className="font-serif text-3xl sm:text-4xl font-bold leading-tight"
            data-testid="text-essay-title"
          >
            {essay.title}
          </h1>

          <div className="flex items-center gap-4 flex-wrap">
            {essay.authorId ? (
              <button
                onClick={() => navigate(`/author/${essay.authorId}`)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                data-testid="link-essay-author"
              >
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs">{essay.authorName[0]}</AvatarFallback>
                </Avatar>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium">{essay.authorName}</p>
                    {essay.authorIsVerified && (
                      <BadgeCheck className="w-4 h-4 text-[#1D9BF0] shrink-0" title="كاتب موثّق" data-testid="badge-verified-author-header" />
                    )}
                  </div>
                  {essay.authorAverageRating > 0 && (
                    <StarRating rating={essay.authorAverageRating} size="sm" showCount={false} />
                  )}
                </div>
              </button>
            ) : (
              <span className="text-sm text-muted-foreground">{essay.authorName}</span>
            )}

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1" data-testid="stat-essay-views">
                <Eye className="w-3.5 h-3.5" />
                {essay.views}
              </span>
              {essay.totalWords > 0 && (
                <span className="flex items-center gap-1" data-testid="stat-essay-reading-time">
                  <Clock className="w-3.5 h-3.5" />
                  {readingTime} {readingTime === 1 ? "دقيقة" : "دقائق"} للقراءة
                </span>
              )}
              {essay.createdAt && (
                <span data-testid="stat-essay-date">
                  {new Date(essay.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Cover Image */}
        {essay.coverImageUrl && (
          <div className="mb-8 rounded-xl overflow-hidden aspect-[16/9]">
            <img
              src={essay.coverImageUrl}
              alt={essay.title}
              className="w-full h-full object-cover"
              data-testid="img-essay-cover"
            />
          </div>
        )}

        {/* Main idea (excerpt/description) */}
        {essay.mainIdea && (
          <div className="mb-8 p-4 bg-primary/5 border-r-4 border-primary rounded-l-lg">
            <p className="text-muted-foreground leading-relaxed font-serif text-base italic" data-testid="text-essay-main-idea">
              {essay.mainIdea}
            </p>
          </div>
        )}

        {/* Essay Content */}
        {sharedLoading ? (
          <div className="space-y-3">
            {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-4 w-full" />)}
          </div>
        ) : shared?.chapters && shared.chapters.length > 0 ? (() => {
          const allParagraphs: { chapterNum: number; chapterTitle: string; paraIdx: number; text: string }[] = [];
          for (const chapter of shared.chapters) {
            const paras = chapter.content.split("\n\n").filter(p => p.trim());
            paras.forEach((p, i) => allParagraphs.push({ chapterNum: chapter.chapterNumber, chapterTitle: chapter.title, paraIdx: i, text: p.trim() }));
          }

          const FREE_WORD_LIMIT = 300;
          let wordsSoFar = 0;
          let cutoffIndex = allParagraphs.length;
          if (!user) {
            for (let i = 0; i < allParagraphs.length; i++) {
              wordsSoFar += countWords(allParagraphs[i].text);
              if (wordsSoFar >= FREE_WORD_LIMIT) { cutoffIndex = i + 1; break; }
            }
          }
          const visibleParas = allParagraphs.slice(0, cutoffIndex);
          const hiddenParas = !user ? allParagraphs.slice(cutoffIndex) : [];

          return (
            <div data-testid="essay-content">
              <div className="space-y-4 font-serif prose prose-lg max-w-none text-foreground">
                {visibleParas.map((item) => (
                  <p key={`${item.chapterNum}-${item.paraIdx}`} className="leading-8 text-[1.05rem]">{item.text}</p>
                ))}
              </div>
              {hiddenParas.length > 0 && (
                <div className="relative mt-4">
                  <div className="space-y-4 font-serif prose prose-lg max-w-none text-foreground opacity-30 blur-[3px] select-none pointer-events-none" aria-hidden="true">
                    {hiddenParas.slice(0, 5).map((item) => (
                      <p key={`${item.chapterNum}-${item.paraIdx}`} className="leading-8 text-[1.05rem]">{item.text}</p>
                    ))}
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-transparent via-background/70 to-background">
                    <div className="bg-card border rounded-xl p-6 text-center space-y-3 shadow-lg max-w-sm mx-auto mt-16" data-testid="card-paywall">
                      <Lock className="w-8 h-8 text-primary mx-auto" />
                      <p className="font-serif text-base font-semibold">اقرأ المقال كاملاً</p>
                      <p className="text-sm text-muted-foreground">انضم إلى QalamAI مجاناً لقراءة هذا المقال بالكامل وآلاف المقالات الأخرى</p>
                      <div className="flex gap-2 justify-center">
                        <Link href="/register">
                          <Button size="sm" data-testid="button-paywall-register">إنشاء حساب مجاني</Button>
                        </Link>
                        <Link href="/login">
                          <Button variant="outline" size="sm" data-testid="button-paywall-login">تسجيل الدخول</Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })() : null}

        {/* Footer actions */}
        <div className="mt-10 pt-6 border-t flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => reactMutation.mutate("like")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
              data-testid="button-react-like"
            >
              <Heart className="w-4 h-4" />
              <span>{totalReactions > 0 ? totalReactions : ""} إعجاب</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTTS}
              disabled={audioLoading}
              data-testid="button-tts"
              className="gap-1.5"
            >
              {audioLoading ? (
                <span className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
              ) : audioPlaying ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
              {audioPlaying ? "إيقاف" : "استمع للمقال"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              data-testid="button-share-twitter"
              className="gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              مشاركة على X
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShareNative}
              data-testid="button-share-native"
            >
              نسخ الرابط
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEmbedOpen(!embedOpen)}
              data-testid="button-embed-toggle"
              className="gap-1.5"
            >
              <Code2 className="w-3.5 h-3.5" />
              تضمين
            </Button>
          </div>
        </div>

        {/* Embed code */}
        {embedOpen && (
          <div className="mt-4 p-4 bg-muted rounded-lg space-y-2" data-testid="embed-code-section">
            <p className="text-xs text-muted-foreground font-medium">انسخ هذا الكود لتضمين المقال في موقعك:</p>
            <div
              className="bg-background border rounded p-3 text-xs font-mono text-left leading-5 break-all cursor-pointer hover:bg-muted/50 transition-colors"
              dir="ltr"
              onClick={async () => {
                const code = `<iframe src="https://qalamai.net/embed/essay/${shareToken}" width="100%" height="350" frameborder="0" scrolling="no" style="border-radius:8px;overflow:hidden;"></iframe>`;
                try { await navigator.clipboard.writeText(code); toast({ title: "تم نسخ الكود" }); } catch {}
              }}
              data-testid="text-embed-code"
            >
              {`<iframe src="https://qalamai.net/embed/essay/${shareToken}" width="100%" height="350" frameborder="0" scrolling="no" style="border-radius:8px;overflow:hidden;"></iframe>`}
            </div>
            <p className="text-xs text-muted-foreground">اضغط على الكود لنسخه</p>
          </div>
        )}

        {/* Tip section */}
        {essay.authorId && (() => {
          const TIP_AMOUNTS = [100, 300, 500, 1000];
          const TIP_LABELS: Record<number, string> = { 100: "$1", 300: "$3", 500: "$5", 1000: "$10" };
          return (
            <div className="mt-8 p-5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl text-center space-y-3" data-testid="section-tip-author">
              <Coffee className="w-6 h-6 text-amber-500 mx-auto" />
              <p className="font-semibold text-base">هل أعجبك هذا المقال؟</p>
              <p className="text-sm text-muted-foreground">ادعم الكاتب <span className="font-medium text-foreground">{essay.authorName}</span> بمبلغ رمزي يشجعه على الاستمرار</p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {TIP_AMOUNTS.map((cents) => (
                  <Button
                    key={cents}
                    variant="outline"
                    size="sm"
                    className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 font-semibold min-w-[52px]"
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/tips/public-checkout", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          credentials: "include",
                          body: JSON.stringify({ toAuthorId: essay.authorId, projectId: essay.id, amountCents: cents }),
                        });
                        const data = await res.json();
                        if (data.url) window.open(data.url, "_blank");
                        else toast({ title: data.error || "حدث خطأ", variant: "destructive" });
                      } catch {
                        toast({ title: "حدث خطأ أثناء المعالجة", variant: "destructive" });
                      }
                    }}
                    data-testid={`button-tip-${cents}`}
                  >
                    {TIP_LABELS[cents]}
                  </Button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Author card */}
        {essay.authorId && (
          <div className="mt-6 p-4 bg-card border rounded-xl" data-testid="card-author">
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={() => navigate(`/author/${essay.authorId}`)}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                data-testid="link-author-card"
              >
                <Avatar className="w-12 h-12">
                  <AvatarFallback>{essay.authorName[0]}</AvatarFallback>
                </Avatar>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <p className="font-semibold">{essay.authorName}</p>
                    {essay.authorIsVerified && (
                      <BadgeCheck className="w-5 h-5 text-[#1D9BF0] shrink-0" title="كاتب موثّق" data-testid="badge-verified-author-card" />
                    )}
                  </div>
                  {essay.authorAverageRating > 0 && (
                    <StarRating rating={essay.authorAverageRating} size="sm" showCount={false} />
                  )}
                </div>
              </button>
              <Link href="/essays">
                <Button variant="outline" size="sm" data-testid="button-more-essays">
                  المزيد من المقالات
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* CTA for non-members */}
        {!user && (
          <div className="mt-8 p-6 bg-primary/5 border rounded-xl text-center space-y-3" data-testid="card-cta">
            <p className="font-serif text-lg font-semibold">هل تريد نشر مقالك؟</p>
            <p className="text-sm text-muted-foreground">انضم إلى QalamAI واكتب مقالاتك بمساعدة أبو هاشم</p>
            <Link href="/register">
              <Button data-testid="button-cta-register">إنشاء حساب مجاني</Button>
            </Link>
          </div>
        )}

        {/* Related essays */}
        {relatedEssays && relatedEssays.length > 0 && (
          <div className="mt-12" data-testid="section-related-essays">
            <h2 className="font-serif text-xl font-bold mb-5">قرأ القرّاء أيضاً</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedEssays.map((rel) => (
                <Link key={rel.id} href={rel.shareToken ? `/essay/${rel.shareToken}` : "#"}>
                  <div className="border rounded-xl overflow-hidden hover:shadow-sm transition-shadow cursor-pointer" data-testid={`card-related-${rel.id}`}>
                    {rel.coverImageUrl ? (
                      <div className="aspect-[16/9] overflow-hidden">
                        <img src={rel.coverImageUrl} alt={rel.title} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    ) : (
                      <div className="aspect-[16/9] bg-primary/5 flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-primary/30" />
                      </div>
                    )}
                    <div className="p-3 space-y-1">
                      <h3 className="font-serif font-semibold text-sm line-clamp-2">{rel.title}</h3>
                      <p className="text-xs text-muted-foreground">{rel.authorName}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Comments section */}
        <div className="mt-12" data-testid="section-comments">
          <h2 className="font-serif text-xl font-bold mb-5 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            التعليقات {comments && comments.length > 0 ? `(${comments.length})` : ""}
          </h2>

          {comments && comments.length > 0 ? (
            <div className="space-y-4 mb-8">
              {comments.map((c) => (
                <div key={c.id} className="p-4 bg-card border rounded-xl" data-testid={`comment-${c.id}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm" data-testid={`comment-author-${c.id}`}>{c.author_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed" data-testid={`comment-content-${c.id}`}>{c.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm mb-6" data-testid="text-no-comments">لا توجد تعليقات بعد. كن أول من يعلّق.</p>
          )}

          {commentSent ? (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-center" data-testid="comment-sent-confirmation">
              <p className="text-sm text-green-700 dark:text-green-400 font-medium">شكراً! سيظهر تعليقك بعد المراجعة.</p>
            </div>
          ) : (
            <div className="space-y-3 p-4 bg-card border rounded-xl" data-testid="form-add-comment">
              <h3 className="text-sm font-semibold">أضف تعليقاً</h3>
              <Input
                placeholder="اسمك"
                value={commentName}
                onChange={(e) => setCommentName(e.target.value)}
                maxLength={80}
                data-testid="input-comment-name"
              />
              <Textarea
                placeholder="تعليقك..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={3}
                maxLength={1000}
                data-testid="textarea-comment-text"
              />
              <Button
                size="sm"
                disabled={!commentName.trim() || !commentText.trim() || commentMutation.isPending}
                onClick={() => commentMutation.mutate()}
                data-testid="button-submit-comment"
                className="gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {commentMutation.isPending ? "جارٍ الإرسال..." : "إرسال التعليق"}
              </Button>
            </div>
          )}
        </div>
      </article>

      <SharedFooter />
    </div>
  );
}
