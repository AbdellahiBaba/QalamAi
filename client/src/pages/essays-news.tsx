import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Search,
  BookOpen,
  ArrowRight,
  Eye,
  MousePointerClick,
  Image as ImageIcon,
  Feather,
} from "lucide-react";
import { useDocumentTitle } from "@/hooks/use-document-title";

interface PublicEssay {
  id: number;
  title: string;
  mainIdea: string | null;
  coverImageUrl: string | null;
  shareToken: string | null;
  authorName: string | null;
  authorId: string | null;
  views: number;
  clicks: number;
  createdAt: string | null;
}

export default function EssaysNews() {
  useDocumentTitle("المقالات السياسية والرأي العام — قلم AI");
  const [searchQuery, setSearchQuery] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: essays, isLoading } = useQuery<PublicEssay[]>({
    queryKey: ["/api/public/essays"],
  });

  const handleCardClick = (essay: PublicEssay) => {
    fetch(`/api/public/essays/${essay.id}/view`, { method: "POST" }).catch(() => {});
    fetch(`/api/public/essays/${essay.id}/click`, { method: "POST" }).catch(() => {});
  };

  const filteredEssays = useMemo(() => {
    if (!essays) return [];
    if (!searchQuery.trim()) return essays;
    const q = searchQuery.trim();
    return essays.filter(
      (e) =>
        e.title.includes(q) ||
        (e.mainIdea && e.mainIdea.includes(q)) ||
        (e.authorName && e.authorName.includes(q))
    );
  }, [essays, searchQuery]);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-1" data-testid="button-back-home">
                <ArrowRight className="w-4 h-4" />
                الرئيسية
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Feather className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-serif text-lg font-bold" data-testid="text-essays-logo">QalamAI</span>
          </div>
        </div>
      </nav>

      <section className="py-10 sm:py-16 px-4 sm:px-6 bg-card/50">
        <div className="max-w-6xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">مقالات وآراء</span>
          </div>
          <h1
            className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight"
            data-testid="text-essays-hero-title"
          >
            المقالات السياسية والرأي العام
          </h1>
          <p
            className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed"
            data-testid="text-essays-hero-subtitle"
          >
            اكتشف أحدث المقالات والتحليلات السياسية من كتّاب عرب مميزين — مرتّبة حسب الأكثر قراءة
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="ابحث عن مقال أو كاتب..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9"
            data-testid="input-essays-search"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64 w-full rounded-md" />
            ))}
          </div>
        ) : filteredEssays.length === 0 ? (
          <div className="text-center py-16 space-y-4" data-testid="essays-empty">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground" data-testid="text-no-essays">لا توجد مقالات مطابقة</p>
          </div>
        ) : (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            data-testid="grid-essays"
          >
            {filteredEssays.map((essay) => (
              <Link
                key={essay.id}
                href={essay.shareToken ? `/shared/${essay.shareToken}` : "#"}
                onClick={() => handleCardClick(essay)}
                data-testid={`link-essay-${essay.id}`}
              >
                <Card
                  className="hover-elevate cursor-pointer h-full"
                  data-testid={`card-essay-${essay.id}`}
                >
                  <div className="relative aspect-[16/9] bg-muted flex items-center justify-center rounded-t-md overflow-hidden">
                    {essay.coverImageUrl ? (
                      <img
                        src={essay.coverImageUrl}
                        alt={essay.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        data-testid={`img-essay-cover-${essay.id}`}
                      />
                    ) : (
                      <ImageIcon className="w-10 h-10 text-muted-foreground" />
                    )}
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <h3
                      className="font-serif font-semibold text-lg line-clamp-2"
                      data-testid={`text-essay-title-${essay.id}`}
                    >
                      {essay.title}
                    </h3>
                    {essay.authorName && (
                      <p
                        className="text-sm text-muted-foreground"
                        data-testid={`text-essay-author-${essay.id}`}
                      >
                        {essay.authorName}
                      </p>
                    )}
                    {essay.mainIdea && (
                      <p
                        className="text-sm text-muted-foreground line-clamp-3 leading-relaxed"
                        data-testid={`text-essay-excerpt-${essay.id}`}
                      >
                        {essay.mainIdea}
                      </p>
                    )}
                    <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1" data-testid={`stat-views-${essay.id}`}>
                        <Eye className="w-3.5 h-3.5" />
                        {essay.views}
                      </span>
                      <span className="flex items-center gap-1" data-testid={`stat-clicks-${essay.id}`}>
                        <MousePointerClick className="w-3.5 h-3.5" />
                        {essay.clicks}
                      </span>
                      {essay.createdAt && (
                        <span data-testid={`stat-date-${essay.id}`}>
                          {new Date(essay.createdAt).toLocaleDateString("ar-EG", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <footer className="border-t py-6 px-4 sm:px-6 text-center">
        <p className="text-sm text-muted-foreground">
          جميع الحقوق محفوظة لمنصة QalamAI
        </p>
      </footer>
    </div>
  );
}
