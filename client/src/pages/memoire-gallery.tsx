import { useState, useMemo, useRef, useEffect } from "react";
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
  Image as ImageIcon,
  GraduationCap,
  Flag,
  MapPin,
  BookMarked,
  FlaskConical,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import StarRating from "@/components/ui/star-rating";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { SharedNavbar } from "@/components/shared-navbar";
import { SharedFooter } from "@/components/shared-footer";
import { ReportDialog } from "@/components/report-dialog";

interface PublicMemoire {
  id: number;
  title: string;
  mainIdea: string | null;
  coverImageUrl: string | null;
  shareToken: string | null;
  authorName: string | null;
  authorId: string | null;
  authorAverageRating: number;
  memoireUniversity: string | null;
  memoireCountry: string | null;
  memoireField: string | null;
  memoireDegreeLevel: string | null;
  memoireMethodology: string | null;
  memoireCitationStyle: string | null;
  memoireKeywords: string | null;
}

const METHODOLOGY_LABELS: Record<string, string> = {
  descriptive: "المنهج الوصفي", analytical: "المنهج التحليلي", experimental: "المنهج التجريبي",
  historical: "المنهج التاريخي", comparative: "المنهج المقارن", survey: "المنهج المسحي",
  case_study: "دراسة حالة", inductive: "المنهج الاستقرائي", deductive: "المنهج الاستنباطي",
  mixed: "منهج مختلط", qualitative: "نوعي (كيفي)", quantitative: "كمّي",
};

const DEGREE_LEVEL_LABELS: Record<string, string> = {
  licence: "ليسانس / بكالوريوس", master: "ماستر / ماجستير", doctorate: "دكتوراه",
};

const CITATION_LABELS: Record<string, string> = {
  apa: "APA", mla: "MLA", chicago: "Chicago / Turabian", harvard: "Harvard",
  ieee: "IEEE", iso690: "ISO 690", islamic: "التوثيق الإسلامي", university_specific: "حسب نظام الجامعة",
};

const FIELD_LABELS: Record<string, string> = {
  sciences: "العلوم", humanities: "العلوم الإنسانية", law: "القانون والحقوق",
  medicine: "الطب والعلوم الصحية", engineering: "الهندسة", economics: "الاقتصاد والتجارة",
  education: "علوم التربية", literature: "الأدب واللغات", media: "الإعلام والاتصال",
  computer_science: "علوم الحاسوب والمعلوماتية", political_science: "العلوم السياسية",
  sociology: "علم الاجتماع", psychology: "علم النفس", islamic_studies: "الدراسات الإسلامية",
  agriculture: "العلوم الزراعية", architecture: "العمارة والتخطيط", pharmacy: "الصيدلة",
  management: "الإدارة والتسيير",
};

const COUNTRY_LABELS: Record<string, string> = {
  dz: "الجزائر", ma: "المغرب", tn: "تونس", eg: "مصر", sa: "السعودية",
  ae: "الإمارات", iq: "العراق", jo: "الأردن", lb: "لبنان", sy: "سوريا",
  kw: "الكويت", qa: "قطر", bh: "البحرين", om: "عُمان", ye: "اليمن", ly: "ليبيا",
  sd: "السودان", mr: "موريتانيا", so: "الصومال", dj: "جيبوتي", km: "جزر القمر", ps: "فلسطين",
};

export default function MemoireGallery() {
  useDocumentTitle("مذكرات التخرج الأكاديمية — قلم AI");
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [reportProjectId, setReportProjectId] = useState<number | null>(null);
  const [reportProjectTitle, setReportProjectTitle] = useState<string>("");
  const [fieldFilter, setFieldFilter] = useState("all");
  const [methodologyFilter, setMethodologyFilter] = useState("all");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: memoires, isLoading, isError } = useQuery<PublicMemoire[]>({
    queryKey: ["/api/public/memoires"],
  });

  const fields = useMemo(() => {
    if (!memoires) return [];
    const set = new Set<string>();
    memoires.forEach((m) => {
      if (m.memoireField) set.add(m.memoireField);
    });
    return Array.from(set);
  }, [memoires]);

  const methodologies = useMemo(() => {
    if (!memoires) return [];
    const set = new Set<string>();
    memoires.forEach((m) => {
      if (m.memoireMethodology) set.add(m.memoireMethodology);
    });
    return Array.from(set);
  }, [memoires]);

  const filteredMemoires = useMemo(() => {
    if (!memoires) return [];
    return memoires.filter((m) => {
      const matchesField = fieldFilter === "all" || m.memoireField === fieldFilter;
      const matchesMethodology = methodologyFilter === "all" || m.memoireMethodology === methodologyFilter;
      const q = searchQuery.trim();
      const methodologyLabel = m.memoireMethodology ? (METHODOLOGY_LABELS[m.memoireMethodology] || m.memoireMethodology) : "";
      const citationLabel = m.memoireCitationStyle ? (CITATION_LABELS[m.memoireCitationStyle] || m.memoireCitationStyle) : "";
      const matchesSearch =
        !q ||
        m.title.includes(q) ||
        (m.mainIdea && m.mainIdea.includes(q)) ||
        (m.authorName && m.authorName.includes(q)) ||
        (m.memoireUniversity && m.memoireUniversity.includes(q)) ||
        (m.memoireField && m.memoireField.includes(q)) ||
        (m.memoireKeywords && m.memoireKeywords.includes(q)) ||
        methodologyLabel.includes(q) ||
        citationLabel.includes(q);
      return matchesField && matchesMethodology && matchesSearch;
    });
  }, [memoires, searchQuery, fieldFilter, methodologyFilter]);

  const itemListJsonLd = useMemo(() => {
    if (!filteredMemoires || filteredMemoires.length === 0) return null;
    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "مذكرات التخرج الأكاديمية — QalamAI",
      description: "مجموعة من مذكرات التخرج والأبحاث الأكاديمية المنشورة على منصة QalamAI",
      numberOfItems: filteredMemoires.length,
      itemListElement: filteredMemoires.slice(0, 50).map((m, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Thesis",
          name: m.title,
          description: m.mainIdea || "",
          author: m.authorName ? { "@type": "Person", name: m.authorName } : undefined,
          inLanguage: "ar",
          url: m.shareToken ? `${window.location.origin}/shared/${m.shareToken}` : undefined,
        },
      })),
    };
  }, [filteredMemoires]);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SharedNavbar />
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

      <section className="pt-24 sm:pt-32 pb-10 sm:pb-16 px-4 sm:px-6 bg-card/50">
        <div className="max-w-6xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
            <GraduationCap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">مذكرات تخرج</span>
          </div>
          <h1
            className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight"
            data-testid="text-memoires-hero-title"
          >
            مذكرات التخرج الأكاديمية
          </h1>
          <p
            className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed"
            data-testid="text-memoires-hero-subtitle"
          >
            استعرض مذكرات التخرج والأبحاث الأكاديمية المنشورة من طلاب وباحثين عرب — مرتّبة حسب التقييم
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="ابحث عن مذكرة أو جامعة أو باحث..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9"
              data-testid="input-memoires-search"
            />
          </div>
          {fields.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap" data-testid="filter-field-group">
              <Badge
                variant={fieldFilter === "all" ? "default" : "outline"}
                className="cursor-pointer toggle-elevate"
                onClick={() => setFieldFilter("all")}
                data-testid="filter-field-all"
              >
                الكل
              </Badge>
              {fields.map((field) => (
                <Badge
                  key={field}
                  variant={fieldFilter === field ? "default" : "outline"}
                  className="cursor-pointer toggle-elevate"
                  onClick={() => setFieldFilter(field)}
                  data-testid={`filter-field-${field}`}
                >
                  {FIELD_LABELS[field] || field}
                </Badge>
              ))}
            </div>
          )}
        </div>
        {methodologies.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap" data-testid="filter-methodology-group">
            <span className="text-sm text-muted-foreground shrink-0">المنهجية:</span>
            <Badge
              variant={methodologyFilter === "all" ? "default" : "outline"}
              className="cursor-pointer toggle-elevate"
              onClick={() => setMethodologyFilter("all")}
              data-testid="filter-methodology-all"
            >
              الكل
            </Badge>
            {methodologies.map((m) => (
              <Badge
                key={m}
                variant={methodologyFilter === m ? "default" : "outline"}
                className="cursor-pointer toggle-elevate"
                onClick={() => setMethodologyFilter(m)}
                data-testid={`filter-methodology-${m}`}
              >
                {METHODOLOGY_LABELS[m] || m}
              </Badge>
            ))}
          </div>
        )}

        {isError ? (
          <div className="text-center py-16 space-y-4" data-testid="memoires-error">
            <GraduationCap className="w-16 h-16 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground text-lg" data-testid="text-memoires-error">
              حدث خطأ أثناء تحميل المذكرات
            </p>
            <p className="text-muted-foreground text-sm">
              يرجى تحديث الصفحة والمحاولة مرة أخرى
            </p>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="h-full" data-testid={`skeleton-memoire-${i}`}>
                <Skeleton className="aspect-[16/9] w-full rounded-t-md rounded-b-none" />
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3.5 w-2/3" />
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredMemoires.length === 0 ? (
          <div className="text-center py-16 space-y-4" data-testid="memoires-empty">
            <GraduationCap className="w-16 h-16 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground text-lg" data-testid="text-no-memoires">
              لا توجد مذكرات تخرج منشورة حالياً
            </p>
            <p className="text-muted-foreground text-sm">
              كن أول من ينشر مذكرته الأكاديمية على المنصة
            </p>
          </div>
        ) : (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            data-testid="grid-memoires"
          >
            {filteredMemoires.map((memoire) => (
              <Link
                key={memoire.id}
                href={memoire.shareToken ? `/shared/${memoire.shareToken}` : "#"}
                data-testid={`link-memoire-${memoire.id}`}
              >
                <Card
                  className="hover-elevate cursor-pointer h-full"
                  data-testid={`card-memoire-${memoire.id}`}
                >
                  <div className="relative aspect-[16/9] bg-muted flex items-center justify-center rounded-t-md overflow-hidden">
                    {memoire.coverImageUrl ? (
                      <img
                        src={memoire.coverImageUrl}
                        alt={memoire.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        data-testid={`img-memoire-cover-${memoire.id}`}
                      />
                    ) : (
                      <GraduationCap className="w-10 h-10 text-muted-foreground" />
                    )}
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <h3
                      className="font-serif font-semibold text-lg line-clamp-2"
                      data-testid={`text-memoire-title-${memoire.id}`}
                    >
                      {memoire.title}
                    </h3>
                    {memoire.authorName && (
                      <div>
                        {memoire.authorId ? (
                          <span
                            className="text-sm text-primary font-medium hover:underline cursor-pointer"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              navigate(`/author/${memoire.authorId}`);
                            }}
                            role="link"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                e.stopPropagation();
                                navigate(`/author/${memoire.authorId}`);
                              }
                            }}
                            data-testid={`link-memoire-author-${memoire.id}`}
                          >
                            {memoire.authorName}
                          </span>
                        ) : (
                          <span
                            className="text-sm text-muted-foreground"
                            data-testid={`text-memoire-author-${memoire.id}`}
                          >
                            {memoire.authorName}
                          </span>
                        )}
                      </div>
                    )}
                    {memoire.authorAverageRating > 0 && (
                      <div data-testid={`rating-memoire-author-${memoire.id}`}>
                        <StarRating rating={memoire.authorAverageRating} size="sm" showCount={false} />
                      </div>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      {memoire.memoireUniversity && (
                        <Badge variant="secondary" className="text-xs gap-1" data-testid={`badge-memoire-university-${memoire.id}`}>
                          <BookMarked className="w-3 h-3" />
                          {memoire.memoireUniversity}
                        </Badge>
                      )}
                      {memoire.memoireCountry && (
                        <Badge variant="secondary" className="text-xs gap-1" data-testid={`badge-memoire-country-${memoire.id}`}>
                          <MapPin className="w-3 h-3" />
                          {COUNTRY_LABELS[memoire.memoireCountry] || memoire.memoireCountry}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {memoire.memoireField && (
                        <Badge variant="outline" className="text-xs gap-1" data-testid={`badge-memoire-field-${memoire.id}`}>
                          <BookOpen className="w-3 h-3" />
                          {FIELD_LABELS[memoire.memoireField] || memoire.memoireField}
                        </Badge>
                      )}
                      {memoire.memoireDegreeLevel && (
                        <Badge variant="outline" className="text-xs gap-1" data-testid={`badge-memoire-degree-${memoire.id}`}>
                          <GraduationCap className="w-3 h-3" />
                          {DEGREE_LEVEL_LABELS[memoire.memoireDegreeLevel] || memoire.memoireDegreeLevel}
                        </Badge>
                      )}
                      {memoire.memoireMethodology && (
                        <Badge variant="outline" className="text-xs gap-1" data-testid={`badge-memoire-methodology-${memoire.id}`}>
                          <FlaskConical className="w-3 h-3" />
                          {METHODOLOGY_LABELS[memoire.memoireMethodology] || memoire.memoireMethodology}
                        </Badge>
                      )}
                      {memoire.memoireCitationStyle && (
                        <Badge variant="outline" className="text-xs gap-1" data-testid={`badge-memoire-citation-${memoire.id}`}>
                          <FileText className="w-3 h-3" />
                          {CITATION_LABELS[memoire.memoireCitationStyle] || memoire.memoireCitationStyle}
                        </Badge>
                      )}
                    </div>

                    {memoire.mainIdea && (
                      <p
                        className="text-sm text-muted-foreground line-clamp-3 leading-relaxed"
                        data-testid={`text-memoire-excerpt-${memoire.id}`}
                      >
                        {memoire.mainIdea}
                      </p>
                    )}

                    {memoire.memoireKeywords && (
                      <div className="flex items-center gap-1 flex-wrap" data-testid={`keywords-memoire-${memoire.id}`}>
                        {memoire.memoireKeywords
                          .split(/[,،]/)
                          .filter((k) => k.trim())
                          .slice(0, 4)
                          .map((keyword, idx) => (
                            <span
                              key={idx}
                              className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md"
                              data-testid={`keyword-memoire-${memoire.id}-${idx}`}
                            >
                              {keyword.trim()}
                            </span>
                          ))}
                      </div>
                    )}

                    <div className="flex items-center justify-end pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto py-1 px-2 text-xs text-muted-foreground gap-1"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setReportProjectId(memoire.id);
                          setReportProjectTitle(memoire.title);
                        }}
                        data-testid={`button-report-memoire-${memoire.id}`}
                      >
                        <Flag className="w-3 h-3" /> إبلاغ
                      </Button>
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
          onOpenChange={(open) => {
            if (!open) setReportProjectId(null);
          }}
        />
      )}
    </div>
  );
}
