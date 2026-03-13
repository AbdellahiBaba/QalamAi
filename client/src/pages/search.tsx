import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SharedNavbar } from "@/components/shared-navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, BookOpen, Users, ListOrdered, ChevronLeft, ChevronRight, BadgeCheck, FileText, Clapperboard, PenLine, MessageCircle, Feather as FeatherIcon, GraduationCap } from "lucide-react";

const PROJECT_TYPE_LABELS: Record<string, string> = {
  novel: "رواية",
  essay: "مقال",
  scenario: "سيناريو",
  short_story: "قصة قصيرة",
  khawater: "خواطر",
  social_media: "سوشيال ميديا",
  poetry: "شعر",
  memoire: "مذكرة تخرج",
};

const PROJECT_TYPE_ICONS: Record<string, typeof BookOpen> = {
  novel: BookOpen,
  essay: FileText,
  scenario: Clapperboard,
  short_story: PenLine,
  khawater: MessageCircle,
  poetry: FeatherIcon,
  memoire: GraduationCap,
};

const TABS = [
  { key: "all", label: "الكل" },
  { key: "projects", label: "الأعمال" },
  { key: "authors", label: "الكتّاب" },
  { key: "series", label: "السلاسل" },
];

function useSearchParams() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split("?")[1] || "");
  return params;
}

export default function SearchPage() {
  const params = useSearchParams();
  const initialQuery = params.get("q") || "";
  const initialType = params.get("type") || "all";
  const initialPage = parseInt(params.get("page") || "1");

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeType, setActiveType] = useState(initialType);
  const [page, setPage] = useState(initialPage);
  const [, setLocation] = useLocation();

  const queryStr = searchQuery.trim();

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/search", `?q=${encodeURIComponent(queryStr)}&type=${activeType}&page=${page}&limit=12`],
    enabled: queryStr.length >= 2,
  });

  useEffect(() => {
    if (queryStr.length >= 2) {
      const newUrl = `/search?q=${encodeURIComponent(queryStr)}&type=${activeType}&page=${page}`;
      window.history.replaceState(null, "", newUrl);
    }
  }, [queryStr, activeType, page]);

  function handleTabChange(tab: string) {
    setActiveType(tab);
    setPage(1);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
  }

  const projects = data?.projects || [];
  const authors = data?.authors || [];
  const series = data?.series || [];
  const projectTotal = data?.projectTotal || 0;
  const authorTotal = data?.authorTotal || 0;
  const seriesTotal = data?.seriesTotal || 0;
  const totalPages = Math.ceil(
    (activeType === "projects" ? projectTotal : activeType === "authors" ? authorTotal : activeType === "series" ? seriesTotal : (projectTotal + authorTotal + seriesTotal)) / 12
  );

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SharedNavbar />
      <div className="pt-20 pb-16 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-serif font-bold mb-4" data-testid="text-search-title">البحث</h1>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن قصص، مقالات، كتّاب، سلاسل..."
                className="pr-10"
                data-testid="input-search"
                autoFocus
              />
            </div>
            <Button type="submit" data-testid="button-search">بحث</Button>
          </form>
        </div>

        <div className="flex gap-2 mb-6 border-b pb-3 overflow-x-auto">
          {TABS.map((tab) => {
            const count = tab.key === "all" ? (projectTotal + authorTotal + seriesTotal)
              : tab.key === "projects" ? projectTotal
              : tab.key === "authors" ? authorTotal
              : seriesTotal;
            return (
              <Button
                key={tab.key}
                variant={activeType === tab.key ? "default" : "ghost"}
                size="sm"
                onClick={() => handleTabChange(tab.key)}
                data-testid={`button-tab-${tab.key}`}
              >
                {tab.label}
                {queryStr.length >= 2 && count > 0 && (
                  <Badge variant="secondary" className="mr-1 text-xs">{count}</Badge>
                )}
              </Button>
            );
          })}
        </div>

        {queryStr.length < 2 && (
          <div className="text-center py-16 text-muted-foreground" data-testid="text-search-prompt">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>اكتب حرفين على الأقل للبدء في البحث</p>
          </div>
        )}

        {isLoading && queryStr.length >= 2 && (
          <div className="text-center py-16" data-testid="text-search-loading">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">جاري البحث...</p>
          </div>
        )}

        {!isLoading && queryStr.length >= 2 && projects.length === 0 && authors.length === 0 && series.length === 0 && (
          <div className="text-center py-16 text-muted-foreground" data-testid="text-search-empty">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>لم يتم العثور على نتائج لـ "{queryStr}"</p>
            <p className="text-sm mt-2">جرّب كلمات مختلفة أو أقل تحديداً</p>
          </div>
        )}

        {!isLoading && (activeType === "all" || activeType === "projects") && projects.length > 0 && (
          <div className="mb-10">
            {activeType === "all" && <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><BookOpen className="w-5 h-5" /> الأعمال ({projectTotal})</h2>}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((p: any) => {
                const TypeIcon = PROJECT_TYPE_ICONS[p.project_type] || BookOpen;
                const link = p.project_type === "essay" && p.share_token
                  ? `/essay/${p.share_token}`
                  : p.share_token
                    ? `/shared/${p.share_token}`
                    : `/project/${p.id}`;
                return (
                  <Link key={p.id} href={link}>
                    <div className="border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer bg-card" data-testid={`card-project-${p.id}`}>
                      <div className="flex gap-3">
                        {p.cover_image_url ? (
                          <img src={p.cover_image_url} alt={p.title} className="w-16 h-20 object-cover rounded" />
                        ) : (
                          <div className="w-16 h-20 rounded bg-muted flex items-center justify-center">
                            <TypeIcon className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate" data-testid={`text-project-title-${p.id}`}>{p.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1">{p.author_name}</p>
                          <Badge variant="outline" className="mt-2 text-xs">
                            <TypeIcon className="w-3 h-3 ml-1" />
                            {PROJECT_TYPE_LABELS[p.project_type] || p.project_type}
                          </Badge>
                          {p.main_idea && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{p.main_idea}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {!isLoading && (activeType === "all" || activeType === "authors") && authors.length > 0 && (
          <div className="mb-10">
            {activeType === "all" && <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Users className="w-5 h-5" /> الكتّاب ({authorTotal})</h2>}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {authors.map((a: any) => (
                <Link key={a.id} href={`/author/${a.id}`}>
                  <div className="border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer bg-card flex items-center gap-3" data-testid={`card-author-${a.id}`}>
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={a.profileImageUrl || undefined} />
                      <AvatarFallback>{(a.displayName || "?")[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-sm truncate" data-testid={`text-author-name-${a.id}`}>{a.displayName}</span>
                        {a.verified && <BadgeCheck className="w-4 h-4 text-[#1D9BF0] flex-shrink-0" />}
                      </div>
                      {a.country && (
                        <p className="text-xs text-muted-foreground mt-1">{a.country}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {!isLoading && (activeType === "all" || activeType === "series") && series.length > 0 && (
          <div className="mb-10">
            {activeType === "all" && <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><ListOrdered className="w-5 h-5" /> السلاسل ({seriesTotal})</h2>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {series.map((s: any) => (
                <Link key={s.id} href={`/series/${s.id}`}>
                  <div className="border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer bg-card" data-testid={`card-series-${s.id}`}>
                    <h3 className="font-semibold text-sm" data-testid={`text-series-title-${s.id}`}>{s.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{s.author_name}</p>
                    {s.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{s.description}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8" data-testid="pagination-search">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              data-testid="button-prev-page"
            >
              <ChevronRight className="w-4 h-4" />
              السابق
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              data-testid="button-next-page"
            >
              التالي
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
