import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, FileText, CheckCircle, Link2, Check, ThumbsUp, Heart, Lightbulb, Brain, Clock, Image as ImageIcon, ArrowRight, Feather } from "lucide-react";
import { SiX, SiFacebook, SiWhatsapp, SiTelegram } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import LtrNum from "@/components/ui/ltr-num";
import { ttqTrack } from "@/lib/ttq";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { Progress } from "@/components/ui/progress";

interface SharedChapter {
  chapterNumber: number;
  title: string;
  content: string | null;
}

interface SharedProject {
  id: number;
  title: string;
  projectType: string;
  coverImageUrl: string | null;
  chapters: SharedChapter[];
}

interface RelatedEssay {
  id: number;
  title: string;
  shareToken: string;
  coverImageUrl: string | null;
  authorName: string;
  totalWords: number;
}

interface ReactionCounts {
  like: number;
  love: number;
  insightful: number;
  thoughtful: number;
}

function calcReadingTime(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 200));
}

const REACTION_CONFIG = [
  { type: "like", icon: ThumbsUp, label: "أعجبني" },
  { type: "love", icon: Heart, label: "أحببته" },
  { type: "insightful", icon: Lightbulb, label: "ملهم" },
  { type: "thoughtful", icon: Brain, label: "مثير للتفكير" },
] as const;

export default function SharedProject() {
  const { token } = useParams<{ token: string }>();
  useDocumentTitle("مشروع مشارك — قلم AI");
  const { toast } = useToast();

  const [scrollProgress, setScrollProgress] = useState(0);
  const [readChapters, setReadChapters] = useState<Set<number>>(new Set());
  const [linkCopied, setLinkCopied] = useState(false);
  const [reactionCounts, setReactionCounts] = useState<ReactionCounts>({ like: 0, love: 0, insightful: 0, thoughtful: 0 });
  const [reactingType, setReactingType] = useState<string | null>(null);
  const [animatingType, setAnimatingType] = useState<string | null>(null);

  const { data: project, isLoading, error } = useQuery<SharedProject>({
    queryKey: ["/api/shared", token],
    queryFn: async () => {
      const res = await fetch(`/api/shared/${token}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!token,
  });

  const { data: relatedEssays } = useQuery<RelatedEssay[]>({
    queryKey: ["/api/public/essays", project?.id, "related"],
    queryFn: async () => {
      const res = await fetch(`/api/public/essays/${project!.id}/related`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!project?.id && project?.projectType === "essay",
  });

  useEffect(() => {
    if (token) {
      try {
        const stored = localStorage.getItem(`qalam-shared-read-${token}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setReadChapters(new Set(parsed));
          }
        }
      } catch {}
    }
  }, [token]);

  const markChapterRead = useCallback((chapterNumber: number) => {
    setReadChapters(prev => {
      const next = new Set(prev);
      next.add(chapterNumber);
      if (token) {
        try {
          localStorage.setItem(`qalam-shared-read-${token}`, JSON.stringify(Array.from(next)));
        } catch {}
      }
      return next;
    });
  }, [token]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        setScrollProgress(Math.min((scrollTop / docHeight) * 100, 100));
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!project) return;
    const chapters = project.chapters.filter(ch => ch.content).sort((a, b) => a.chapterNumber - b.chapterNumber);
    if (chapters.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const num = Number(entry.target.getAttribute("data-chapter-number"));
            if (!isNaN(num)) {
              markChapterRead(num);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    const elements = document.querySelectorAll("[data-chapter-number]");
    elements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [project, markChapterRead]);

  useEffect(() => {
    if (project) {
      ttqTrack("ViewContent", {
        contentId: token || "shared",
        contentType: project.projectType || "product",
        contentName: project.title,
      });
    }
  }, [project]);

  useEffect(() => {
    if (project?.id && project?.projectType === "essay") {
      fetch(`/api/public/essays/${project.id}/reactions`)
        .then(res => res.ok ? res.json() : null)
        .then(data => { if (data) setReactionCounts(data); })
        .catch(() => {});
    }
  }, [project?.id, project?.projectType]);

  const handleReact = async (reactionType: string) => {
    if (!project?.id || reactingType) return;
    setReactingType(reactionType);
    try {
      const res = await fetch(`/api/public/essays/${project.id}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reactionType }),
      });
      if (res.ok) {
        const counts = await res.json();
        setReactionCounts(counts);
        setAnimatingType(reactionType);
        setTimeout(() => setAnimatingType(null), 600);
      }
    } catch {
      toast({ title: "حدث خطأ", description: "لم نتمكن من تسجيل تفاعلك", variant: "destructive" });
    } finally {
      setReactingType(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="space-y-4 w-full max-w-3xl px-4">
          <Skeleton className="h-8 w-64 mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-4">
          <BookOpen className="w-16 h-16 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-serif font-bold">المشروع غير موجود</h1>
          <p className="text-muted-foreground">هذا الرابط غير صالح أو تم إلغاء المشاركة</p>
        </div>
      </div>
    );
  }

  const typeLabel = project.projectType === "essay" ? "مقال" : project.projectType === "scenario" ? "سيناريو" : project.projectType === "short_story" ? "قصة قصيرة" : project.projectType === "khawater" ? "خاطرة" : project.projectType === "social_media" ? "سوشيال ميديا" : project.projectType === "poetry" ? "قصيدة" : "رواية";
  const chapterLabel = project.projectType === "essay" ? "قسم" : project.projectType === "scenario" ? "مشهد" : project.projectType === "short_story" ? "مقطع" : project.projectType === "khawater" ? "النص" : project.projectType === "social_media" ? "المحتوى" : project.projectType === "poetry" ? "القصيدة" : "فصل";
  const visibleChapters = project.chapters.filter(ch => ch.content).sort((a, b) => a.chapterNumber - b.chapterNumber);
  const readCount = visibleChapters.filter(ch => readChapters.has(ch.chapterNumber)).length;
  const totalChapters = visibleChapters.length;
  const chapterProgress = totalChapters > 0 ? Math.round((readCount / totalChapters) * 100) : 0;
  const totalWords = visibleChapters.reduce((sum, ch) => sum + (ch.content ? ch.content.split(/\s+/).filter(w => w.trim()).length : 0), 0);
  const readingTime = calcReadingTime(totalWords);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="fixed top-0 left-0 right-0 z-50" data-testid="reading-progress-bar">
        <Progress value={scrollProgress} className="h-1 rounded-none" />
      </div>

      <nav className="sticky top-0 z-30 backdrop-blur-md bg-background/80 border-b" data-testid="nav-shared-header">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-1" data-testid="button-back" onClick={() => window.history.back()}>
              <ArrowRight className="w-4 h-4" />
              العودة
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Feather className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-serif text-lg font-bold">قلم AI</span>
          </div>
        </div>
      </nav>

      {totalChapters > 1 && (
        <div className="fixed top-[60px] left-4 right-4 z-40 flex justify-center pointer-events-none">
          <div className="bg-background/90 backdrop-blur-sm border rounded-b-lg px-4 py-1.5 flex items-center gap-3 pointer-events-auto shadow-sm" data-testid="chapter-progress-tracker">
            <span className="text-xs text-muted-foreground">
              <LtrNum>{readCount}</LtrNum>/<LtrNum>{totalChapters}</LtrNum> {chapterLabel}
            </span>
            <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${chapterProgress}%` }}
              />
            </div>
            {readCount === totalChapters && (
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
            )}
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-8 pt-6">
        {project.coverImageUrl && (
          <div className="mb-8 flex justify-center">
            <img
              src={project.coverImageUrl}
              alt={project.title}
              className="max-h-80 rounded-lg shadow-lg"
              loading="lazy"
              data-testid="img-shared-cover"
            />
          </div>
        )}

        <div className="text-center mb-10">
          <h1 className="text-3xl font-serif font-bold mb-2" data-testid="text-shared-title">{project.title}</h1>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <p className="text-muted-foreground">{typeLabel} — QalamAI</p>
            {totalWords > 0 && (
              <Badge variant="secondary" className="no-default-active-elevate" data-testid="badge-reading-time">
                <Clock className="w-3 h-3 ml-1" />
                <LtrNum>{readingTime}</LtrNum> {readingTime === 1 ? "دقيقة" : "دقائق"} للقراءة
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-8">
          {visibleChapters.map((ch) => (
              <Card
                key={ch.chapterNumber}
                className="overflow-hidden"
                data-testid={`card-shared-chapter-${ch.chapterNumber}`}
                data-chapter-number={ch.chapterNumber}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-sm text-muted-foreground">{chapterLabel} <LtrNum>{ch.chapterNumber}</LtrNum></span>
                    {readChapters.has(ch.chapterNumber) && (
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    )}
                    <span className="mx-1">—</span>
                    <h2 className="font-serif text-lg font-semibold">{ch.title}</h2>
                  </div>
                  <ScrollArea className="max-h-[600px]">
                    <div className="font-serif text-base leading-[2.2] whitespace-pre-wrap">
                      {ch.content}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ))}
        </div>

        {project.projectType === "essay" && (
          <div className="mt-10 pt-6 border-t" data-testid="reactions-section">
            <h3 className="text-center font-serif text-lg font-semibold mb-4">ما رأيك في هذا المحتوى؟</h3>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {REACTION_CONFIG.map(({ type, icon: Icon, label }) => {
                const count = reactionCounts[type as keyof ReactionCounts] || 0;
                const isAnimating = animatingType === type;
                const isReacting = reactingType === type;
                return (
                  <Button
                    key={type}
                    variant="outline"
                    onClick={() => handleReact(type)}
                    disabled={!!reactingType}
                    className="gap-2"
                    data-testid={`button-react-${type}`}
                  >
                    <Icon className={`w-4 h-4 ${isReacting ? "animate-pulse" : ""} ${isAnimating ? "animate-bounce" : ""}`} />
                    <span>{label}</span>
                    <span
                      className={`text-xs font-bold transition-transform ${isAnimating ? "scale-125" : "scale-100"}`}
                      data-testid={`count-react-${type}`}
                    >
                      <LtrNum>{count}</LtrNum>
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {relatedEssays && relatedEssays.length > 0 && (
          <div className="mt-10 pt-6 border-t" data-testid="related-essays-section">
            <h3 className="font-serif text-lg font-semibold mb-4">مقالات ذات صلة</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedEssays.map((essay) => {
                const essayReadingTime = calcReadingTime(essay.totalWords);
                return (
                  <Link key={essay.id} href={`/shared/${essay.shareToken}`} data-testid={`link-related-essay-${essay.id}`}>
                    <Card className="hover-elevate cursor-pointer h-full" data-testid={`card-related-essay-${essay.id}`}>
                      <div className="relative aspect-[16/9] bg-muted flex items-center justify-center rounded-t-md overflow-hidden">
                        {essay.coverImageUrl ? (
                          <img
                            src={essay.coverImageUrl}
                            alt={essay.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-muted-foreground" />
                        )}
                      </div>
                      <CardContent className="p-3 space-y-1">
                        <h4 className="font-serif font-semibold text-sm line-clamp-2" data-testid={`text-related-title-${essay.id}`}>
                          {essay.title}
                        </h4>
                        <p className="text-xs text-muted-foreground" data-testid={`text-related-author-${essay.id}`}>
                          {essay.authorName}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span data-testid={`text-related-reading-time-${essay.id}`}>
                            <LtrNum>{essayReadingTime}</LtrNum> {essayReadingTime === 1 ? "دقيقة" : "دقائق"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="text-center mt-10 pt-6 border-t text-sm text-muted-foreground">
          <p>تم إنشاء هذا المحتوى بواسطة QalamAI — منصّة الكتابة العربية بالذكاء الاصطناعي</p>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-t" data-testid="social-sharing-bar">
        <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center justify-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground ml-2">شارك:</span>
          <Button
            size="icon"
            variant="ghost"
            data-testid="button-share-x"
            onClick={() => {
              const url = encodeURIComponent(window.location.href);
              const text = encodeURIComponent(project.title + " — QalamAI");
              window.open(`https://x.com/intent/tweet?url=${url}&text=${text}`, "_blank", "noopener");
            }}
          >
            <SiX className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            data-testid="button-share-facebook"
            onClick={() => {
              const url = encodeURIComponent(window.location.href);
              window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank", "noopener");
            }}
          >
            <SiFacebook className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            data-testid="button-share-whatsapp"
            onClick={() => {
              const text = encodeURIComponent(project.title + " — QalamAI\n" + window.location.href);
              window.open(`https://wa.me/?text=${text}`, "_blank", "noopener");
            }}
          >
            <SiWhatsapp className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            data-testid="button-share-telegram"
            onClick={() => {
              const url = encodeURIComponent(window.location.href);
              const text = encodeURIComponent(project.title + " — QalamAI");
              window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank", "noopener");
            }}
          >
            <SiTelegram className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            data-testid="button-share-copy-link"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(window.location.href);
                setLinkCopied(true);
                toast({ title: "تم نسخ الرابط" });
                setTimeout(() => setLinkCopied(false), 2000);
              } catch {
                toast({ title: "فشل نسخ الرابط", variant: "destructive" });
              }
            }}
          >
            {linkCopied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <div className="h-14" />
    </div>
  );
}
