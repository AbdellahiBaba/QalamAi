import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SharedNavbar } from "@/components/shared-navbar";
import { SharedFooter } from "@/components/shared-footer";
import { Eye, Clock, ArrowRight, BookOpen, Share2, Heart } from "lucide-react";
import StarRating from "@/components/ui/star-rating";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PublicEssay {
  id: number;
  title: string;
  mainIdea: string | null;
  coverImageUrl: string | null;
  shareToken: string;
  authorName: string;
  authorId: string;
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

export default function EssayPublic() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

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
    <div className="min-h-screen bg-background" dir="rtl">
      <SharedNavbar />

      <article className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-16">
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
                  <p className="text-sm font-medium">{essay.authorName}</p>
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
        ) : shared?.chapters && shared.chapters.length > 0 ? (
          <div className="space-y-8" data-testid="essay-content">
            {shared.chapters.map((chapter) => (
              <section key={chapter.chapterNumber}>
                {chapter.title && chapter.title !== essay.title && (
                  <h2 className="font-serif text-xl font-semibold mb-4 text-foreground" data-testid={`heading-chapter-${chapter.chapterNumber}`}>
                    {chapter.title}
                  </h2>
                )}
                <div className="prose prose-lg max-w-none text-foreground leading-8 font-serif space-y-4" data-testid={`content-chapter-${chapter.chapterNumber}`}>
                  {chapter.content.split("\n\n").filter(p => p.trim()).map((para, i) => (
                    <p key={i} className="leading-8 text-[1.05rem]">{para.trim()}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : null}

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

          <div className="flex items-center gap-2">
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
          </div>
        </div>

        {/* Author card */}
        {essay.authorId && (
          <div className="mt-8 p-4 bg-card border rounded-xl" data-testid="card-author">
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
                  <p className="font-semibold">{essay.authorName}</p>
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
        <div className="mt-8 p-6 bg-primary/5 border rounded-xl text-center space-y-3" data-testid="card-cta">
          <p className="font-serif text-lg font-semibold">هل تريد نشر مقالك؟</p>
          <p className="text-sm text-muted-foreground">انضم إلى QalamAI واكتب مقالاتك بمساعدة أبو هاشم</p>
          <Link href="/register">
            <Button data-testid="button-cta-register">إنشاء حساب مجاني</Button>
          </Link>
        </div>
      </article>

      <SharedFooter />
    </div>
  );
}
