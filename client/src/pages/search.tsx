import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SharedNavbar } from "@/components/shared-navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, BookOpen, Users, ListOrdered, ChevronLeft, ChevronRight, BadgeCheck, FileText, Clapperboard, PenLine, MessageCircle, Feather as FeatherIcon, GraduationCap, Lightbulb, Trophy } from "lucide-react";

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

const CATEGORY_OPTIONS = [
  { value: "all", label: "جميع الأنواع" },
  { value: "novel", label: "روايات" },
  { value: "essay", label: "مقالات" },
  { value: "scenario", label: "سيناريوهات" },
  { value: "short_story", label: "قصص قصيرة" },
  { value: "khawater", label: "خواطر" },
  { value: "social_media", label: "سوشيال ميديا" },
  { value: "poetry", label: "شعر" },
  { value: "memoire", label: "مذكرات تخرج" },
];

const TABS = [
  { key: "all", label: "الكل" },
  { key: "projects", label: "الأعمال" },
  { key: "authors", label: "الكتّاب" },
  { key: "series", label: "السلاسل" },
  { key: "prompts", label: "تحدي الكتابة" },
  { key: "challenges", label: "التحديات" },
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
  const initialCategory = params.get("category") || "all";
  const initialPage = parseInt(params.get("page") || "1");

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeType, setActiveType] = useState(initialType);
  const [category, setCategory] = useState(initialCategory);
  const [page, setPage] = useState(initialPage);
  const [, setLocation] = useLocation();

  const queryStr = searchQuery.trim();
  const categoryParam = category !== "all" ? category : "";

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/search", `?q=${encodeURIComponent(queryStr)}&type=${activeType}&category=${categoryParam}&page=${page}&limit=12`],
    enabled: queryStr.length >= 2,
  });

  useEffect(() => {
    if (queryStr.length >= 2) {
      const catPart = category !== "all" ? `&category=${category}` : "";
      const newUrl = `/search?q=${encodeURIComponent(queryStr)}&type=${activeType}${catPart}&page=${page}`;
      window.history.replaceState(null, "", newUrl);
    }
  }, [queryStr, activeType, category, page]);

  function handleTabChange(tab: string) {
    setActiveType(tab);
    setPage(1);
  }

  function handleCategoryChange(val: string) {
    setCategory(val);
    setPage(1);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
  }

  const projects = data?.projects || [];
  const authors = data?.authors || [];
  const series = data?.series || [];
  const prompts = data?.prompts || [];
  const challenges = data?.challenges || [];
  const projectTotal = data?.projectTotal || 0;
  const authorTotal = data?.authorTotal || 0;
  const seriesTotal = data?.seriesTotal || 0;
  const promptTotal = data?.promptTotal || 0;
  const challengeTotal = data?.challengeTotal || 0;

  const activeTotal = activeType === "projects" ? projectTotal
    : activeType === "authors" ? authorTotal
    : activeType === "series" ? seriesTotal
    : activeType === "prompts" ? promptTotal
    : activeType === "challenges" ? challengeTotal
    : 0;
  const totalPages = activeType !== "all" ? Math.ceil(activeTotal / 12) : 0;

  const hasAnyResults = projects.length > 0 || authors.length > 0 || series.length > 0 || prompts.length > 0 || challenges.length > 0;

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

        <div className="flex flex-wrap items-center gap-2 mb-6 border-b pb-3">
          <div className="flex gap-2 overflow-x-auto flex-1">
            {TABS.map((tab) => {
              const count = tab.key === "all" ? (projectTotal + authorTotal + seriesTotal + promptTotal + challengeTotal)
                : tab.key === "projects" ? projectTotal
                : tab.key === "authors" ? authorTotal
                : tab.key === "series" ? seriesTotal
                : tab.key === "prompts" ? promptTotal
                : tab.key === "challenges" ? challengeTotal
                : 0;
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

          {(activeType === "all" || activeType === "projects") && (
            <Select value={category} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-40 h-8 text-xs" data-testid="select-category">
                <SelectValue placeholder="نوع المحتوى" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} data-testid={`option-category-${opt.value}`}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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

        {!isLoading && queryStr.length >= 2 && !hasAnyResults && (
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

        {!isLoading && (activeType === "all" || activeType === "prompts") && prompts.length > 0 && (
          <div className="mb-10">
            {activeType === "all" && <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Lightbulb className="w-5 h-5" /> تحدي الكتابة ({promptTotal})</h2>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {prompts.map((p: any) => (
                <Link key={p.id} href="/daily-prompt">
                  <div className="border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer bg-card" data-testid={`card-prompt-${p.id}`}>
                    <div className="flex items-start gap-3">
                      {p.author_image ? (
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarImage src={p.author_image} />
                          <AvatarFallback>{(p.author_name || "?")[0]}</AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <Lightbulb className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">{p.prompt_text}</p>
                        <p className="text-sm line-clamp-3">{p.content}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">{p.author_name}</span>
                          {p.prompt_date && (
                            <span className="text-xs text-muted-foreground">{p.prompt_date}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {!isLoading && (activeType === "all" || activeType === "challenges") && challenges.length > 0 && (
          <div className="mb-10">
            {activeType === "all" && <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Trophy className="w-5 h-5" /> التحديات ({challengeTotal})</h2>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {challenges.map((c: any) => (
                <Link key={c.id} href="/challenges">
                  <div className="border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer bg-card" data-testid={`card-challenge-${c.id}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                        <Trophy className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm" data-testid={`text-challenge-title-${c.id}`}>{c.title}</h3>
                        {c.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <Badge variant={c.status === "active" ? "default" : "secondary"} className="text-xs" data-testid={`badge-challenge-status-${c.id}`}>
                            {c.status === "active" ? "نشط" : "منتهي"}
                          </Badge>
                          <span className="text-xs text-muted-foreground" data-testid={`text-challenge-entries-${c.id}`}>{c.entry_count} مشاركة</span>
                          {c.end_date && (
                            <span className="text-xs text-muted-foreground" data-testid={`text-challenge-date-${c.id}`}>
                              {new Date(c.end_date).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
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
