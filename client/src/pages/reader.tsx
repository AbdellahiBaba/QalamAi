import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, ChevronLeft, ChevronRight, Settings2,
  Eye, EyeOff, BookOpen, Clock, Keyboard, ImageIcon
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { apiRequest } from "@/lib/queryClient";
import { VoteButton } from "@/components/vote-button";
import StarRating from "@/components/ui/star-rating";
import { QuoteSelectionToolbar } from "@/components/quote-selection-toolbar";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Chapter {
  id: number;
  chapterNumber: number;
  title: string;
  content: string | null;
  status: string;
}

interface ProjectData {
  id: number;
  title: string;
  projectType?: string;
  userId?: string;
  coverImageUrl?: string | null;
  shareToken?: string | null;
  chapters: Chapter[];
}

interface SimilarWork {
  id: number;
  title: string;
  coverImageUrl?: string | null;
  shareToken?: string | null;
  projectType?: string;
  authorName?: string;
}

type FontSize = "sm" | "base" | "lg";
type FontFamily = "naskh" | "scheherazade";

const fontSizeClass: Record<FontSize, string> = {
  sm: "text-sm leading-[2]",
  base: "text-base leading-[2.2]",
  lg: "text-lg leading-[2.4]",
};

const fontFamilyStyle: Record<FontFamily, string> = {
  naskh: "'Noto Naskh Arabic', serif",
  scheherazade: "'Scheherazade New', serif",
};

function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? Math.min(100, Math.round((scrollTop / docHeight) * 100)) : 0);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  return progress;
}

function getReadingTime(content: string | null): number {
  if (!content) return 0;
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

function toArabicNumerals(n: number): string {
  return n.toString().replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[parseInt(d)]);
}

export default function Reader() {
  useDocumentTitle("وضع القراءة — قلم AI");
  const [, params] = useRoute("/project/:id/read/:chapterId");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const projectId = params?.id;
  const chapterId = params?.chapterId;

  const [fontSize, setFontSize] = useState<FontSize>(() => {
    const saved = localStorage.getItem("reader-font-size");
    return (saved === "sm" || saved === "base" || saved === "lg") ? saved : "base";
  });
  const [fontFamily, setFontFamily] = useState<FontFamily>(() => {
    const saved = localStorage.getItem("reader-font-family");
    return (saved === "naskh" || saved === "scheherazade") ? saved : "naskh";
  });
  const [focusMode, setFocusMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [authorRating, setAuthorRating] = useState(0);

  useEffect(() => { localStorage.setItem("reader-font-size", fontSize); }, [fontSize]);
  useEffect(() => { localStorage.setItem("reader-font-family", fontFamily); }, [fontFamily]);

  const scrollProgress = useScrollProgress();

  const { data: project, isLoading } = useQuery<ProjectData>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const sectionLabel = project?.projectType === "essay" ? "القسم" : project?.projectType === "scenario" ? "المشهد" : project?.projectType === "short_story" ? "المقطع" : "الفصل";

  const sortedChapters = useMemo(() =>
    project?.chapters
      ?.filter((c) => c.status === "completed")
      .sort((a, b) => a.chapterNumber - b.chapterNumber) ?? [],
    [project?.chapters]
  );

  const currentIndex = sortedChapters.findIndex(
    (c) => c.id === Number(chapterId)
  );
  const currentChapter = sortedChapters[currentIndex];
  const prevChapter = currentIndex > 0 ? sortedChapters[currentIndex - 1] : null;
  const nextChapter =
    currentIndex < sortedChapters.length - 1
      ? sortedChapters[currentIndex + 1]
      : null;
  const isLastChapter = currentIndex === sortedChapters.length - 1 && sortedChapters.length > 0;

  const readingTime = useMemo(() => getReadingTime(currentChapter?.content ?? null), [currentChapter?.content]);

  const { data: similarWorks } = useQuery<SimilarWork[]>({
    queryKey: ["/api/projects", projectId, "similar"],
    queryFn: () => fetch(`/api/projects/${projectId}/similar`).then(r => r.json()),
    enabled: !!projectId && isLastChapter,
    staleTime: 10 * 60 * 1000,
  });

  const rateMutation = useMutation({
    mutationFn: (rating: number) =>
      apiRequest("POST", `/api/authors/${project?.userId}/rate`, { rating }),
    onSuccess: () => {
      toast({ title: "شكراً لتقييمك!", description: "تم حفظ تقييمك بنجاح" });
    },
    onError: () => {
      toast({ title: "تعذّر الحفظ", variant: "destructive" });
    },
  });

  const navigateTo = useCallback(
    (chapter: Chapter | null) => {
      if (chapter) {
        setShowEndScreen(false);
        setLocation(`/project/${projectId}/read/${chapter.id}`);
      }
    },
    [projectId, setLocation]
  );

  useEffect(() => {
    setShowEndScreen(false);
    const savedKey = `reader-scroll-${projectId}-${chapterId}`;
    const savedPos = localStorage.getItem(savedKey);
    if (savedPos) {
      const pos = parseInt(savedPos, 10);
      requestAnimationFrame(() => {
        setTimeout(() => {
          window.scrollTo({ top: pos, behavior: "instant" as ScrollBehavior });
        }, 100);
      });
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [chapterId, projectId]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft") navigateTo(nextChapter);
      if (e.key === "ArrowRight") navigateTo(prevChapter);
      if (e.key === "f" || e.key === "F" || e.key === "ب") setFocusMode(prev => !prev);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [nextChapter, prevChapter, navigateTo]);

  const progressSent = useRef(false);
  useEffect(() => {
    progressSent.current = false;
  }, [chapterId]);

  useEffect(() => {
    if (!projectId || !chapterId || !currentChapter) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const handleScroll = () => {
      if (progressSent.current) return;
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const pct = Math.round((scrollTop / docHeight) * 100);
      if (pct >= 50) {
        progressSent.current = true;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          apiRequest("PATCH", "/api/reading-progress", {
            projectId: Number(projectId),
            chapterId: Number(chapterId),
            percentComplete: pct,
          }).catch(() => {});
        }, 1500);
      }
      if (pct >= 95 && isLastChapter) {
        setShowEndScreen(true);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (timer) clearTimeout(timer);
    };
  }, [projectId, chapterId, currentChapter, isLastChapter]);

  useEffect(() => {
    if (!projectId || !chapterId) return;
    const savedKey = `reader-scroll-${projectId}-${chapterId}`;
    let raf = 0;
    let lastSaved = 0;
    const saveScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const now = Date.now();
        if (now - lastSaved < 2000) return;
        lastSaved = now;
        localStorage.setItem(savedKey, String(Math.round(window.scrollY)));
      });
    };
    window.addEventListener("scroll", saveScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", saveScroll);
      cancelAnimationFrame(raf);
      localStorage.setItem(savedKey, String(Math.round(window.scrollY)));
    };
  }, [projectId, chapterId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] dark:bg-[#1a1510]" dir="rtl">
        <div className="max-w-3xl mx-auto px-6 py-20 space-y-6">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (!project || !currentChapter) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] dark:bg-[#1a1510] flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-4">
          <p className="text-[#2C1810] dark:text-[#E8DCC8] font-serif text-lg">
            لم يتم العثور على الفصل
          </p>
          <Button variant="outline" onClick={() => setLocation(`/project/${projectId}`)} data-testid="button-back-not-found">
            <ArrowRight className="w-4 h-4 ml-1" />
            العودة
          </Button>
        </div>
      </div>
    );
  }

  const paragraphs = (currentChapter.content || "")
    .split("\n")
    .filter((p) => p.trim());

  const similarItems: SimilarWork[] = Array.isArray(similarWorks) ? similarWorks.slice(0, 3) : [];

  return (
    <div className="min-h-screen bg-[#FFFDF5] dark:bg-[#1a1510] text-[#2C1810] dark:text-[#E8DCC8]" dir="rtl">
      <div
        className="fixed top-0 left-0 h-[3px] bg-primary z-[1000] transition-[width] duration-150"
        style={{ width: `${scrollProgress}%` }}
        data-testid="progress-bar"
      />

      <header
        className={`sticky top-0 z-[999] bg-[#FFFDF5]/90 dark:bg-[#1a1510]/90 backdrop-blur-md border-b border-[#2C1810]/10 dark:border-[#E8DCC8]/10 transition-transform duration-300 ${focusMode ? "-translate-y-full" : "translate-y-0"}`}
      >
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => setLocation(`/project/${projectId}`)}
            className="text-[#2C1810] dark:text-[#E8DCC8]"
            data-testid="button-back-reader"
          >
            <ArrowRight className="w-4 h-4 ml-1" />
            العودة
          </Button>

          <div className="flex items-center gap-1 flex-1 justify-center min-w-0">
            <Button
              variant="ghost"
              size="sm"
              disabled={!prevChapter}
              onClick={() => navigateTo(prevChapter)}
              className="text-[#2C1810] dark:text-[#E8DCC8] h-8 px-1.5 shrink-0"
              data-testid="button-top-prev"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <div className="text-center min-w-0">
              <h1 className="font-serif text-sm font-semibold truncate" data-testid="text-chapter-title">
                {currentChapter.title}
              </h1>
              <span className="text-[10px] text-[#2C1810]/50 dark:text-[#E8DCC8]/50" data-testid="text-chapter-progress">
                {sectionLabel} {toArabicNumerals(currentIndex + 1)} من {toArabicNumerals(sortedChapters.length)}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={!nextChapter}
              onClick={() => navigateTo(nextChapter)}
              className="text-[#2C1810] dark:text-[#E8DCC8] h-8 px-1.5 shrink-0"
              data-testid="button-top-next"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSettings(!showSettings)}
                    className="text-[#2C1810] dark:text-[#E8DCC8]"
                    data-testid="button-settings"
                  >
                    <Settings2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">إعدادات الخط</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFocusMode(!focusMode)}
                    className="text-[#2C1810] dark:text-[#E8DCC8]"
                    data-testid="button-focus-mode"
                  >
                    {focusMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">وضع التركيز (F)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[#2C1810] dark:text-[#E8DCC8]"
                    data-testid="button-shortcuts-info"
                  >
                    <Keyboard className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs space-y-1">
                  <p>← {sectionLabel} التالي</p>
                  <p>→ {sectionLabel} السابق</p>
                  <p>F وضع التركيز</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {showSettings && (
          <div className="border-t border-[#2C1810]/10 dark:border-[#E8DCC8]/10 bg-[#FFFDF5] dark:bg-[#1a1510] px-4 py-3" data-testid="settings-panel">
            <div className="max-w-4xl mx-auto flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#2C1810]/60 dark:text-[#E8DCC8]/60">الحجم:</span>
                {(["sm", "base", "lg"] as FontSize[]).map((s) => (
                  <Button
                    key={s}
                    variant={fontSize === s ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFontSize(s)}
                    className="font-serif px-2.5 h-8"
                    data-testid={`button-font-${s}`}
                  >
                    {s === "sm" ? "أ-" : s === "base" ? "أ" : "أ+"}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#2C1810]/60 dark:text-[#E8DCC8]/60">الخط:</span>
                <Button
                  variant={fontFamily === "naskh" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFontFamily("naskh")}
                  className="h-8 text-xs"
                  style={{ fontFamily: "'Noto Naskh Arabic', serif" }}
                  data-testid="button-font-naskh"
                >
                  نسخ
                </Button>
                <Button
                  variant={fontFamily === "scheherazade" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFontFamily("scheherazade")}
                  className="h-8 text-xs"
                  style={{ fontFamily: "'Scheherazade New', serif" }}
                  data-testid="button-font-scheherazade"
                >
                  كوفي
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-3xl mx-auto px-6 sm:px-10 py-12 sm:py-16">
        <div className="flex items-center justify-center gap-2 mb-8 text-[#2C1810]/50 dark:text-[#E8DCC8]/50" data-testid="reading-time">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-xs">وقت القراءة: ~{toArabicNumerals(readingTime)} دقائق</span>
        </div>

        <article
          className={`${fontSizeClass[fontSize]}`}
          style={{ fontFamily: fontFamilyStyle[fontFamily] }}
          data-testid="article-chapter-content"
        >
          {paragraphs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-6" data-testid="empty-chapter-content">
              <p className="text-lg text-muted-foreground font-serif">لا يوجد محتوى في هذا الفصل بعد</p>
              <Button
                variant="outline"
                onClick={() => setLocation(`/project/${projectId}`)}
                className="gap-2"
                data-testid="button-back-empty-chapter"
              >
                <ArrowRight className="w-4 h-4" />
                العودة للمشروع
              </Button>
            </div>
          ) : (
            paragraphs.map((text, i) => (
              <p key={i} className="mb-6" style={{ textIndent: "2em" }}>
                {text}
              </p>
            ))
          )}
        </article>

        {showEndScreen && isLastChapter && (
          <div className="mt-16 mb-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-500" data-testid="end-screen">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
              <h2 className="font-serif text-2xl font-bold">— نهاية —</h2>
              <p className="text-sm text-[#2C1810]/60 dark:text-[#E8DCC8]/60">
                أتممت قراءة «{project.title}»
              </p>

              {project.coverImageUrl && (
                <div className="mx-auto w-32 aspect-[2/3] rounded-lg overflow-hidden shadow-lg">
                  <img src={project.coverImageUrl} alt={project.title} className="w-full h-full object-cover" />
                </div>
              )}

              {project.userId && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">قيّم الكاتب</p>
                  <div className="flex justify-center">
                    <StarRating
                      rating={authorRating}
                      interactive
                      onRate={(r) => {
                        setAuthorRating(r);
                        rateMutation.mutate(r);
                      }}
                      size="lg"
                      showCount={false}
                      testIdPrefix="end"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-center">
                <VoteButton projectId={project.id} authorId={project.userId || ""} size="default" />
              </div>

              {similarItems.length > 0 && (
                <div className="space-y-3 pt-4">
                  <h3 className="font-serif text-base font-semibold">قد يعجبك أيضاً</h3>
                  <div className="flex justify-center gap-4">
                    {similarItems.map((w) => (
                      <Link key={w.id} href={w.shareToken ? `/shared/${w.shareToken}` : "#"}>
                        <Card className="w-28 overflow-hidden hover:shadow-md transition-shadow cursor-pointer" data-testid={`end-similar-${w.id}`}>
                          <div className="aspect-[2/3] bg-muted flex items-center justify-center overflow-hidden">
                            {w.coverImageUrl ? (
                              <img src={w.coverImageUrl} alt={w.title} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <ImageIcon className="w-6 h-6 text-muted-foreground" />
                            )}
                          </div>
                          <CardContent className="p-2">
                            <p className="text-[10px] font-medium line-clamp-2 leading-tight">{w.title}</p>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => setLocation(`/project/${projectId}`)}
                className="gap-2"
                data-testid="button-back-to-project-end"
              >
                <ArrowRight className="w-4 h-4" />
                العودة للمشروع
              </Button>
            </div>
          </div>
        )}
      </main>

      {focusMode ? (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-[#2C1810]/80 dark:bg-[#E8DCC8]/80 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-3 shadow-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-300" data-testid="focus-bar">
          <Button
            variant="ghost"
            size="sm"
            disabled={!prevChapter}
            onClick={() => navigateTo(prevChapter)}
            className="text-white dark:text-[#1a1510] h-8 px-2"
            data-testid="focus-prev"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-xs text-white dark:text-[#1a1510] font-serif whitespace-nowrap" data-testid="focus-chapter-info">
            {toArabicNumerals(currentIndex + 1)} / {toArabicNumerals(sortedChapters.length)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={!nextChapter}
            onClick={() => navigateTo(nextChapter)}
            className="text-white dark:text-[#1a1510] h-8 px-2"
            data-testid="focus-next"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="w-px h-5 bg-white/30 dark:bg-[#1a1510]/30" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFocusMode(false)}
            className="text-white dark:text-[#1a1510] h-8 px-2"
            data-testid="focus-exit"
          >
            <EyeOff className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <footer className="sticky bottom-0 z-[999] bg-[#FFFDF5]/90 dark:bg-[#1a1510]/90 backdrop-blur-md border-t border-[#2C1810]/10 dark:border-[#E8DCC8]/10">
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              disabled={!prevChapter}
              onClick={() => navigateTo(prevChapter)}
              className="text-[#2C1810] dark:text-[#E8DCC8]"
              data-testid="button-prev-chapter"
            >
              <ChevronRight className="w-4 h-4 ml-1" />
              {sectionLabel} السابق
            </Button>

            <span
              className="text-sm text-[#2C1810]/60 dark:text-[#E8DCC8]/60 font-serif"
              data-testid="text-reading-progress"
            >
              {sectionLabel} {toArabicNumerals(currentIndex + 1)} من {toArabicNumerals(sortedChapters.length)}
            </span>

            <Button
              variant="ghost"
              disabled={!nextChapter}
              onClick={() => navigateTo(nextChapter)}
              className="text-[#2C1810] dark:text-[#E8DCC8]"
              data-testid="button-next-chapter"
            >
              {sectionLabel} التالي
              <ChevronLeft className="w-4 h-4 mr-1" />
            </Button>
          </div>
        </footer>
      )}

      <QuoteSelectionToolbar
        projectId={Number(projectId)}
        chapterId={currentChapter?.id}
        projectTitle={project?.title}
      />
    </div>
  );
}
