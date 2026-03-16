import { useState, useEffect, useCallback, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { apiRequest } from "@/lib/queryClient";

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
  chapters: Chapter[];
}

type FontSize = "sm" | "base" | "lg";

const fontSizeClass: Record<FontSize, string> = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
};

export default function Reader() {
  useDocumentTitle("وضع القراءة — قلم AI");
  const [, params] = useRoute("/project/:id/read/:chapterId");
  const [, setLocation] = useLocation();
  const projectId = params?.id;
  const chapterId = params?.chapterId;

  const [fontSize, setFontSize] = useState<FontSize>("base");

  const { data: project, isLoading } = useQuery<ProjectData>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const sectionLabel = project?.projectType === "essay" ? "القسم" : project?.projectType === "scenario" ? "المشهد" : project?.projectType === "short_story" ? "المقطع" : "الفصل";

  const sortedChapters = project?.chapters
    ?.filter((c) => c.status === "completed")
    .sort((a, b) => a.chapterNumber - b.chapterNumber) ?? [];

  const currentIndex = sortedChapters.findIndex(
    (c) => c.id === Number(chapterId)
  );
  const currentChapter = sortedChapters[currentIndex];
  const prevChapter = currentIndex > 0 ? sortedChapters[currentIndex - 1] : null;
  const nextChapter =
    currentIndex < sortedChapters.length - 1
      ? sortedChapters[currentIndex + 1]
      : null;

  const navigateTo = useCallback(
    (chapter: Chapter | null) => {
      if (chapter) {
        setLocation(`/project/${projectId}/read/${chapter.id}`);
      }
    },
    [projectId, setLocation]
  );

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [chapterId]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") navigateTo(nextChapter);
      if (e.key === "ArrowRight") navigateTo(prevChapter);
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
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (timer) clearTimeout(timer);
    };
  }, [projectId, chapterId, currentChapter]);

  if (isLoading) {
    return (
      <div
        className="min-h-screen bg-[#FFFDF5] dark:bg-[#1a1510]"
        dir="rtl"
      >
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
      <div
        className="min-h-screen bg-[#FFFDF5] dark:bg-[#1a1510] flex items-center justify-center"
        dir="rtl"
      >
        <div className="text-center space-y-4">
          <p className="text-[#2C1810] dark:text-[#E8DCC8] font-serif text-lg">
            لم يتم العثور على الفصل
          </p>
          <Button
            variant="outline"
            onClick={() => setLocation(`/project/${projectId}`)}
            data-testid="button-back-not-found"
          >
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

  return (
    <div
      className="min-h-screen bg-[#FFFDF5] dark:bg-[#1a1510] text-[#2C1810] dark:text-[#E8DCC8]"
      dir="rtl"
    >
      <header className="sticky top-0 z-[999] bg-[#FFFDF5]/90 dark:bg-[#1a1510]/90 backdrop-blur-md border-b border-[#2C1810]/10 dark:border-[#E8DCC8]/10">
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

          <h1
            className="font-serif text-base font-semibold truncate flex-1 text-center"
            data-testid="text-chapter-title"
          >
            {currentChapter.title}
          </h1>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFontSize("sm")}
              className={`font-serif text-xs px-2 ${fontSize === "sm" ? "toggle-elevate toggle-elevated" : ""}`}
              data-testid="button-font-small"
            >
              أ-
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFontSize("base")}
              className={`font-serif text-sm px-2 ${fontSize === "base" ? "toggle-elevate toggle-elevated" : ""}`}
              data-testid="button-font-medium"
            >
              أ
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFontSize("lg")}
              className={`font-serif text-base px-2 ${fontSize === "lg" ? "toggle-elevate toggle-elevated" : ""}`}
              data-testid="button-font-large"
            >
              أ+
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 sm:px-10 py-12 sm:py-16">
        <article
          className={`font-serif leading-[2.2] ${fontSizeClass[fontSize]}`}
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
              <p
                key={i}
                className="mb-6"
                style={{ textIndent: "2em" }}
              >
                {text}
              </p>
            ))
          )}
        </article>
      </main>

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
            {sectionLabel} {currentIndex + 1} من {sortedChapters.length}
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
    </div>
  );
}
