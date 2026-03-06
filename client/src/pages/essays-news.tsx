import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  BookOpen,
  ArrowRight,
  Eye,
  MousePointerClick,
  Image as ImageIcon,
  Heart,
  Clock,
  Flag,
} from "lucide-react";
import StarRating from "@/components/ui/star-rating";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { SharedNavbar } from "@/components/shared-navbar";
import { SharedFooter } from "@/components/shared-footer";
import { ReportDialog } from "@/components/report-dialog";

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
  reactions: { like: number; love: number; insightful: number; thoughtful: number } | null;
  totalWords: number;
  createdAt: string | null;
  authorAverageRating: number;
}

function calcReadingTime(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 200));
}

export default function EssaysNews() {
  useDocumentTitle("المقالات السياسية والرأي العام — قلم AI", "اكتشف أحدث المقالات والتحليلات السياسية ومقالات الرأي من كتّاب عرب مميزين على منصة QalamAI.");
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [reportProjectId, setReportProjectId] = useState<number | null>(null);
  const [reportProjectTitle, setReportProjectTitle] = useState<string>("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: essays, isLoading } = useQuery<PublicEssay[]>({
    queryKey: ["/api/public/essays"],
  });

  const handleCardClick = (essay: PublicEssay) => {
    const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
    const csrfVal = csrfMatch ? decodeURIComponent(csrfMatch[1]) : "";
    fetch(`/api/public/essays/${essay.id}/view`, { method: "POST", headers: { "X-CSRF-Token": csrfVal } }).catch((e: unknown) => console.warn("Failed to track essay view:", e));
    fetch(`/api/public/essays/${essay.id}/click`, { method: "POST", headers: { "X-CSRF-Token": csrfVal } }).catch((e: unknown) => console.warn("Failed to track essay click:", e));
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
      <SharedNavbar />

      <section className="pt-24 sm:pt-32 pb-10 sm:pb-16 px-4 sm:px-6 bg-card/50">
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
              <Card key={i} className="h-full" data-testid={`skeleton-essay-${i}`}>
                <Skeleton className="aspect-[16/9] w-full rounded-t-md rounded-b-none" />
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/3" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3.5 w-2/3" />
                  </div>
                  <div className="flex items-center gap-4 pt-1">
                    <Skeleton className="h-3 w-10" />
                    <Skeleton className="h-3 w-10" />
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </CardContent>
              </Card>
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
                        width={640}
                        height={360}
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
                      <div>
                        {essay.authorId ? (
                          <span
                            className="text-sm text-primary font-medium hover:underline cursor-pointer"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/author/${essay.authorId}`); }}
                            role="link"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); navigate(`/author/${essay.authorId}`); } }}
                            data-testid={`link-essay-author-${essay.id}`}
                          >
                            {essay.authorName}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground" data-testid={`text-essay-author-${essay.id}`}>
                            {essay.authorName}
                          </span>
                        )}
                      </div>
                    )}
                    {essay.authorAverageRating > 0 && (
                      <div data-testid={`rating-essay-author-${essay.id}`}>
                        <StarRating rating={essay.authorAverageRating} size="sm" showCount={false} />
                      </div>
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
                      {essay.totalWords > 0 && (
                        <span className="flex items-center gap-1" data-testid={`stat-reading-time-${essay.id}`}>
                          <Clock className="w-3.5 h-3.5" />
                          {calcReadingTime(essay.totalWords)} {calcReadingTime(essay.totalWords) === 1 ? "دقيقة" : "دقائق"}
                        </span>
                      )}
                      {essay.reactions && (essay.reactions.like + essay.reactions.love + essay.reactions.insightful + essay.reactions.thoughtful) > 0 && (
                        <span className="flex items-center gap-1" data-testid={`stat-reactions-${essay.id}`}>
                          <Heart className="w-3.5 h-3.5" />
                          {essay.reactions.like + essay.reactions.love + essay.reactions.insightful + essay.reactions.thoughtful}
                        </span>
                      )}
                      {essay.createdAt && (
                        <span data-testid={`stat-date-${essay.id}`}>
                          {new Date(essay.createdAt).toLocaleDateString("ar-EG", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                      <button
                        className="flex items-center gap-1 text-muted-foreground hover:text-red-500 transition-colors mr-auto"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setReportProjectId(essay.id); setReportProjectTitle(essay.title); }}
                        data-testid={`button-report-essay-${essay.id}`}
                      >
                        <Flag className="w-3 h-3" /> إبلاغ
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <SharedFooter />
      {reportProjectId && (
        <ReportDialog
          projectId={reportProjectId}
          projectTitle={reportProjectTitle}
          open={!!reportProjectId}
          onOpenChange={(open) => { if (!open) setReportProjectId(null); }}
        />
      )}
    </div>
  );
}
