import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, FileText, CheckCircle } from "lucide-react";
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
  title: string;
  projectType: string;
  coverImageUrl: string | null;
  chapters: SharedChapter[];
}

export default function SharedProject() {
  const { token } = useParams<{ token: string }>();
  useDocumentTitle("مشروع مشارك — قلم AI");

  const [scrollProgress, setScrollProgress] = useState(0);
  const [readChapters, setReadChapters] = useState<Set<number>>(new Set());

  const { data: project, isLoading, error } = useQuery<SharedProject>({
    queryKey: ["/api/shared", token],
    queryFn: async () => {
      const res = await fetch(`/api/shared/${token}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!token,
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

  const typeLabel = project.projectType === "essay" ? "مقال" : project.projectType === "scenario" ? "سيناريو" : project.projectType === "short_story" ? "قصة قصيرة" : "رواية";
  const chapterLabel = project.projectType === "essay" ? "قسم" : project.projectType === "scenario" ? "مشهد" : project.projectType === "short_story" ? "مقطع" : "فصل";
  const visibleChapters = project.chapters.filter(ch => ch.content).sort((a, b) => a.chapterNumber - b.chapterNumber);
  const readCount = visibleChapters.filter(ch => readChapters.has(ch.chapterNumber)).length;
  const totalChapters = visibleChapters.length;
  const chapterProgress = totalChapters > 0 ? Math.round((readCount / totalChapters) * 100) : 0;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="fixed top-0 left-0 right-0 z-50" data-testid="reading-progress-bar">
        <Progress value={scrollProgress} className="h-1 rounded-none" />
      </div>

      {totalChapters > 1 && (
        <div className="fixed top-1 left-4 right-4 z-40 flex justify-center pointer-events-none">
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

      <div className="max-w-3xl mx-auto px-4 py-8 pt-12">
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
          <p className="text-muted-foreground">{typeLabel} — QalamAI</p>
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

        <div className="text-center mt-10 pt-6 border-t text-sm text-muted-foreground">
          <p>تم إنشاء هذا المحتوى بواسطة QalamAI — منصّة الكتابة العربية بالذكاء الاصطناعي</p>
        </div>
      </div>
    </div>
  );
}
