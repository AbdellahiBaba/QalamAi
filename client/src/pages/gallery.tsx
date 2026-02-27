import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Image as ImageIcon, BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GalleryProject {
  id: number;
  title: string;
  projectType: string;
  coverImageUrl: string | null;
  shareToken: string | null;
  mainIdea: string | null;
  authorName: string | null;
  authorId: string | null;
}

const typeLabels: Record<string, string> = {
  novel: "رواية",
  essay: "مقال",
  scenario: "سيناريو",
};

const filterOptions = [
  { value: "all", label: "الكل" },
  { value: "novel", label: "رواية" },
  { value: "essay", label: "مقال" },
  { value: "scenario", label: "سيناريو" },
];

export default function Gallery() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const { data: projects, isLoading } = useQuery<GalleryProject[]>({
    queryKey: ["/api/gallery"],
  });

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

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6" dir="rtl">
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
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-72 w-full rounded-md" />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-16 space-y-4" data-testid="gallery-empty">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground" data-testid="text-no-results">لا توجد أعمال مطابقة</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" data-testid="grid-gallery">
            {filteredProjects.map((project) => (
              <Card key={project.id} className="overflow-visible hover-elevate" data-testid={`card-gallery-${project.id}`}>
                <Link
                  href={project.shareToken ? `/shared/${project.shareToken}` : "#"}
                  data-testid={`link-gallery-project-${project.id}`}
                >
                  <div className="relative aspect-[3/4] bg-muted flex items-center justify-center rounded-t-md overflow-hidden cursor-pointer">
                    {project.coverImageUrl ? (
                      <img
                        src={project.coverImageUrl}
                        alt={project.title}
                        className="w-full h-full object-cover"
                        data-testid={`img-gallery-cover-${project.id}`}
                      />
                    ) : (
                      <ImageIcon className="w-12 h-12 text-muted-foreground" />
                    )}
                    <Badge className="absolute top-2 right-2" data-testid={`badge-gallery-type-${project.id}`}>
                      {typeLabels[project.projectType] || project.projectType}
                    </Badge>
                  </div>
                </Link>
                <CardContent className="p-3 space-y-1">
                  <h3 className="font-serif font-semibold truncate" data-testid={`text-gallery-title-${project.id}`}>
                    {project.title}
                  </h3>
                  {project.authorName && (
                    <div>
                      {project.authorId ? (
                        <Link
                          href={`/author/${project.authorId}`}
                          data-testid={`link-author-${project.id}`}
                        >
                          <span className="text-sm text-muted-foreground hover:underline cursor-pointer">
                            {project.authorName}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-sm text-muted-foreground" data-testid={`text-author-${project.id}`}>
                          {project.authorName}
                        </span>
                      )}
                    </div>
                  )}
                  {project.mainIdea && (
                    <p
                      className="text-xs text-muted-foreground line-clamp-2"
                      data-testid={`text-gallery-excerpt-${project.id}`}
                    >
                      {project.mainIdea}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
