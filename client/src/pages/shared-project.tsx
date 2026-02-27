import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, FileText } from "lucide-react";

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

  const { data: project, isLoading, error } = useQuery<SharedProject>({
    queryKey: ["/api/shared", token],
    queryFn: async () => {
      const res = await fetch(`/api/shared/${token}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!token,
  });

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

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {project.coverImageUrl && (
          <div className="mb-8 flex justify-center">
            <img
              src={project.coverImageUrl}
              alt={project.title}
              className="max-h-80 rounded-lg shadow-lg"
              data-testid="img-shared-cover"
            />
          </div>
        )}

        <div className="text-center mb-10">
          <h1 className="text-3xl font-serif font-bold mb-2" data-testid="text-shared-title">{project.title}</h1>
          <p className="text-muted-foreground">{typeLabel} — QalamAI</p>
        </div>

        <div className="space-y-8">
          {project.chapters
            .filter(ch => ch.content)
            .sort((a, b) => a.chapterNumber - b.chapterNumber)
            .map((ch) => (
              <Card key={ch.chapterNumber} className="overflow-hidden" data-testid={`card-shared-chapter-${ch.chapterNumber}`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-sm text-muted-foreground">{chapterLabel} {ch.chapterNumber}</span>
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
