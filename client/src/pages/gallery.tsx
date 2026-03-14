import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Image as ImageIcon, BookOpen, ArrowRight, Flag, BadgeCheck, Tag, UserCheck, Loader2, Trophy, BookOpenCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import StarRating from "@/components/ui/star-rating";
import { ttqTrack } from "@/lib/ttq";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useToast } from "@/hooks/use-toast";
import { SharedFooter } from "@/components/shared-footer";
import { ReportDialog } from "@/components/report-dialog";

interface GalleryProject {
  id: number;
  title: string;
  projectType: string;
  coverImageUrl: string | null;
  shareToken: string | null;
  mainIdea: string | null;
  authorName: string | null;
  authorId: string | null;
  authorAverageRating: number;
  authorIsVerified?: boolean;
  tags?: string[];
  seekingBetaReaders?: boolean;
  challengeWinId?: number | null;
  challengeWinTitle?: string | null;
}

const typeLabels: Record<string, string> = {
  novel: "رواية",
  essay: "مقال",
  scenario: "سيناريو",
  short_story: "قصة قصيرة",
  khawater: "خاطرة",
  social_media: "سوشيال ميديا",
  poetry: "قصيدة",
  memoire: "مذكرة تخرج",
};

const filterOptions = [
  { value: "all", label: "الكل" },
  { value: "novel", label: "رواية" },
  { value: "essay", label: "مقال" },
  { value: "scenario", label: "سيناريو" },
  { value: "short_story", label: "قصة قصيرة" },
  { value: "khawater", label: "خاطرة" },
  { value: "social_media", label: "سوشيال ميديا" },
  { value: "poetry", label: "قصيدة" },
  { value: "memoire", label: "مذكرة تخرج" },
];

function BetaReaderGalleryButton({ projectId }: { projectId: number }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/beta-readers`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم تقديم طلبك كقارئ بيتا" });
      setSubmitted(true);
    },
    onError: (err: any) => {
      toast({ title: err.message || "فشل في تقديم الطلب", variant: "destructive" });
    },
  });

  if (submitted) {
    return (
      <Badge variant="secondary" className="text-[10px] gap-1 w-fit text-green-600 dark:text-green-400" data-testid={`badge-beta-submitted-${projectId}`}>
        <UserCheck className="w-3 h-3" /> تم التقديم
      </Badge>
    );
  }

  return (
    <button
      className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border bg-primary/5 hover:bg-primary/10 text-primary transition-colors w-fit"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
          toast({ title: "يجب تسجيل الدخول أولاً", variant: "destructive" });
          return;
        }
        submitMutation.mutate();
      }}
      disabled={submitMutation.isPending}
      data-testid={`button-beta-optin-${projectId}`}
    >
      {submitMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
      أريد المشاركة كقارئ بيتا
    </button>
  );
}

export default function Gallery() {
  useDocumentTitle("معرض الأعمال — قلم AI", "استكشف معرض الأعمال الأدبية على QalamAI: روايات، مقالات، سيناريوهات، قصص قصيرة، وخواطر من كتّاب عرب مبدعين.");
  const [location] = useLocation();
  const urlParams = useMemo(() => new URLSearchParams(location.split("?")[1] || ""), [location]);
  const initialBeta = urlParams.get("beta") === "true";
  const authorIdFilter = urlParams.get("authorId") || "";
  const [searchQuery, setSearchQuery] = useState("");
  const [reportProjectId, setReportProjectId] = useState<number | null>(null);
  const [reportProjectTitle, setReportProjectTitle] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeTag, setActiveTag] = useState("");
  const [betaFilter, setBetaFilter] = useState(initialBeta);
  useEffect(() => {
    const newBeta = urlParams.get("beta") === "true";
    setBetaFilter(newBeta);
  }, [urlParams]);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    ttqTrack("ViewContent", {
      contentId: "gallery",
      contentType: "product_group",
      contentName: "معرض الأعمال",
    });
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) return;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      ttqTrack("Search", {
        contentId: "gallery",
        contentType: "product_group",
        contentName: "gallery_search",
        searchString: searchQuery.trim(),
      });
    }, 800);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery]);

  const [page, setPage] = useState(1);
  const pageLimit = 24;

  const { data: galleryData, isLoading } = useQuery<{ data: GalleryProject[]; total: number; page: number; limit: number }>({
    queryKey: ["/api/gallery", page, pageLimit, activeTag, betaFilter, authorIdFilter],
    queryFn: () => {
      let url = `/api/gallery?page=${page}&limit=${pageLimit}`;
      if (activeTag) url += `&tag=${encodeURIComponent(activeTag)}`;
      if (betaFilter) url += `&beta=true`;
      if (authorIdFilter) url += `&authorId=${encodeURIComponent(authorIdFilter)}`;
      return fetch(url).then(r => r.json());
    },
  });

  const projects = galleryData?.data;
  const totalItems = galleryData?.total || 0;
  const totalPages = Math.ceil(totalItems / pageLimit);

  const allTags = useMemo(() => {
    if (!projects) return [];
    const tagSet = new Set<string>();
    projects.forEach(p => (p.tags || []).forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [projects]);

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    return projects.filter((p) => {
      const matchesFilter = activeFilter === "all" || p.projectType === activeFilter;
      const matchesSearch =
        !searchQuery ||
        p.title.includes(searchQuery) ||
        (p.mainIdea && p.mainIdea.includes(searchQuery)) ||
        (p.authorName && p.authorName.includes(searchQuery));
      return matchesFilter && matchesSearch;
    });
  }, [projects, searchQuery, activeFilter]);

  const itemListJsonLd = useMemo(() => {
    if (!filteredProjects || filteredProjects.length === 0) return null;
    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "معرض الأعمال الأدبية — QalamAI",
      "description": "مجموعة من الأعمال الأدبية العربية المنشورة على منصة QalamAI",
      "numberOfItems": filteredProjects.length,
      "itemListElement": filteredProjects.slice(0, 50).map((project, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "CreativeWork",
          "name": project.title,
          "description": project.mainIdea || "",
          "author": project.authorName ? { "@type": "Person", "name": project.authorName } : undefined,
          "inLanguage": "ar",
          "url": project.shareToken ? `${window.location.origin}/shared/${project.shareToken}` : undefined,
        },
      })),
    };
  }, [filteredProjects]);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6" dir="rtl">
      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(itemListJsonLd)
              .replace(/</g, "\\u003c")
              .replace(/>/g, "\\u003e")
              .replace(/&/g, "\\u0026"),
          }}
        />
      )}
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-start">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1" data-testid="button-back-home">
              <ArrowRight className="w-4 h-4" />
              الرئيسية
            </Button>
          </Link>
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold" data-testid="text-gallery-title">معرض الأعمال</h1>
          <p className="text-muted-foreground" data-testid="text-gallery-subtitle">استكشف الأعمال الأدبية المشتركة</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="ابحث عن عمل أو كاتب..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9"
              data-testid="input-search"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap" data-testid="filter-group">
            {filterOptions.map((opt) => (
              <Badge
                key={opt.value}
                variant={activeFilter === opt.value ? "default" : "outline"}
                className="cursor-pointer toggle-elevate"
                onClick={() => setActiveFilter(opt.value)}
                data-testid={`filter-${opt.value}`}
              >
                {opt.label}
              </Badge>
            ))}
            <Badge
              variant={betaFilter ? "default" : "outline"}
              className="cursor-pointer toggle-elevate gap-1"
              onClick={() => { setBetaFilter(!betaFilter); setPage(1); }}
              data-testid="filter-beta-readers"
            >
              <BookOpenCheck className="w-3 h-3" />
              يقبل قراء بيتا
            </Badge>
          </div>
        </div>

        {allTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap" data-testid="tag-filter-group">
            <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
            {activeTag && (
              <Badge
                variant="default"
                className="cursor-pointer gap-1"
                onClick={() => { setActiveTag(""); setPage(1); }}
                data-testid="tag-filter-clear"
              >
                {activeTag} ×
              </Badge>
            )}
            {allTags.filter(t => t !== activeTag).map(tag => (
              <Badge
                key={tag}
                variant="outline"
                className="cursor-pointer toggle-elevate text-xs"
                onClick={() => { setActiveTag(tag); setPage(1); }}
                data-testid={`tag-filter-${tag}`}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden" data-testid={`skeleton-gallery-${i}`}>
                <Skeleton className="aspect-[2/3] w-full" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3.5 w-1/2" />
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-16 space-y-4" data-testid="gallery-empty">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground" data-testid="text-no-results">لا توجد أعمال مطابقة</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-5" data-testid="grid-gallery">
            {filteredProjects.map((project) => (
              <Card key={project.id} className="transition-shadow hover:shadow-lg overflow-hidden" data-testid={`card-gallery-${project.id}`}>
                <Link
                  href={project.shareToken ? `/shared/${project.shareToken}` : "#"}
                  data-testid={`link-gallery-project-${project.id}`}
                >
                  <div className="relative aspect-[2/3] bg-muted flex items-center justify-center overflow-hidden cursor-pointer">
                    {project.coverImageUrl ? (
                      <img
                        src={project.coverImageUrl}
                        alt={project.title}
                        width={400}
                        height={600}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                        data-testid={`img-gallery-cover-${project.id}`}
                      />
                    ) : (
                      <ImageIcon className="w-16 h-16 text-muted-foreground" />
                    )}
                  </div>
                </Link>
                <CardContent className="p-4 space-y-2">
                  <Badge variant="secondary" className="text-xs font-medium px-2 py-0.5" data-testid={`badge-gallery-type-${project.id}`}>
                    {typeLabels[project.projectType] || project.projectType}
                  </Badge>
                  <h3 className="font-serif font-semibold line-clamp-2 leading-snug" data-testid={`text-gallery-title-${project.id}`}>
                    {project.title}
                  </h3>
                  {project.authorName && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {project.authorId ? (
                        <Link
                          href={`/author/${project.authorId}`}
                          data-testid={`link-author-${project.id}`}
                        >
                          <span className="text-sm text-primary font-medium hover:underline cursor-pointer">
                            {project.authorName}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-sm text-muted-foreground" data-testid={`text-author-${project.id}`}>
                          {project.authorName}
                        </span>
                      )}
                      {project.authorIsVerified && (
                        <BadgeCheck className="w-3.5 h-3.5 text-[#1D9BF0] shrink-0" title="كاتب موثّق" data-testid={`badge-verified-${project.id}`} />
                      )}
                    </div>
                  )}
                  {project.authorAverageRating > 0 && (
                    <div data-testid={`rating-author-${project.id}`}>
                      <StarRating rating={project.authorAverageRating} size="sm" showCount={false} />
                    </div>
                  )}
                  {project.tags && project.tags.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap" data-testid={`tags-gallery-${project.id}`}>
                      {project.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 cursor-pointer" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTag(tag); setPage(1); }}>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {project.seekingBetaReaders && (
                    <BetaReaderGalleryButton projectId={project.id} />
                  )}
                  {project.challengeWinId && (
                    <Link
                      href={`/challenges/${project.challengeWinId}`}
                      onClick={(e) => e.stopPropagation()}
                      data-testid={`badge-challenge-winner-${project.id}`}
                    >
                      <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30 dark:text-yellow-400 gap-1 text-[10px] w-fit cursor-pointer">
                        <Trophy className="w-3 h-3" /> فائز بتحدي
                      </Badge>
                    </Link>
                  )}
                  {project.mainIdea && (
                    <p
                      className="text-xs text-muted-foreground line-clamp-2"
                      data-testid={`text-gallery-excerpt-${project.id}`}
                    >
                      {project.mainIdea}
                    </p>
                  )}
                  <button
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 transition-colors mt-1"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setReportProjectId(project.id); setReportProjectTitle(project.title); }}
                    data-testid={`button-report-gallery-${project.id}`}
                  >
                    <Flag className="w-3 h-3" /> إبلاغ
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 py-6" data-testid="gallery-pagination">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            data-testid="button-gallery-prev"
          >
            السابق
          </Button>
          <span className="text-sm text-muted-foreground" data-testid="text-gallery-page">
            صفحة {page} من {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            data-testid="button-gallery-next"
          >
            التالي
          </Button>
        </div>
      )}
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
