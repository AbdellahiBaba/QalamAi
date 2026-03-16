import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BookOpen, BookMarked, Bookmark, ArrowRight, ImageIcon } from "lucide-react";

export default function MyLibrary() {
  useDocumentTitle("مكتبتي — قلم AI");
  const [activeTab, setActiveTab] = useState<"reading" | "saved">("reading");

  const { data: inProgress, isLoading: loadingProgress } = useQuery<any[]>({
    queryKey: ["/api/reading-progress"],
    staleTime: 2 * 60 * 1000,
  });

  const { data: savedLists, isLoading: loadingSaved } = useQuery<any[]>({
    queryKey: ["/api/saved-projects"],
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = activeTab === "reading" ? loadingProgress : loadingSaved;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <BookMarked className="w-6 h-6 text-primary" />
          <h1 className="font-serif text-2xl font-bold" data-testid="text-library-title">مكتبتي</h1>
        </div>

        <div className="flex gap-2 mb-6" data-testid="library-tabs">
          <Button
            variant={activeTab === "reading" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("reading")}
            data-testid="tab-reading"
          >
            <BookOpen className="w-4 h-4 ml-1" />
            أقرأ حالياً
            {inProgress && inProgress.length > 0 && (
              <Badge variant="secondary" className="mr-1 text-[10px] px-1.5">{inProgress.length}</Badge>
            )}
          </Button>
          <Button
            variant={activeTab === "saved" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("saved")}
            data-testid="tab-saved"
          >
            <Bookmark className="w-4 h-4 ml-1" />
            المحفوظات
            {savedLists && savedLists.length > 0 && (
              <Badge variant="secondary" className="mr-1 text-[10px] px-1.5">{savedLists.length}</Badge>
            )}
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <Skeleton className="aspect-[2/3] w-full rounded-t-lg" />
                <CardContent className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : activeTab === "reading" ? (
          <>
            {(!inProgress || inProgress.length === 0) ? (
              <div className="text-center py-16 text-muted-foreground" data-testid="empty-reading">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-serif text-lg mb-1">لم تبدأ أي قراءة بعد</p>
                <p className="text-sm">تصفح المعرض واختر عملاً لتبدأ القراءة</p>
                <Link href="/gallery">
                  <Button variant="outline" size="sm" className="mt-4" data-testid="link-browse-gallery">
                    تصفح المعرض
                    <ArrowRight className="w-4 h-4 mr-1" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {inProgress.map((item: any) => {
                  const rawPercent = item.totalChapters > 0 && item.lastChapterNumber
                    ? Math.round((item.lastChapterNumber / item.totalChapters) * 100)
                    : (item.scrollPosition || 0);
                  const percent = Math.max(0, Math.min(100, rawPercent));
                  return (
                    <Link key={item.projectId} href={item.lastChapterId ? `/project/${item.projectId}/read/${item.lastChapterId}` : (item.shareToken ? `/shared/${item.shareToken}` : "#")}>
                      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group" data-testid={`card-library-reading-${item.projectId}`}>
                        <div className="relative aspect-[2/3] bg-muted flex items-center justify-center overflow-hidden">
                          {item.coverImageUrl ? (
                            <img src={item.coverImageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" decoding="async" />
                          ) : (
                            <ImageIcon className="w-10 h-10 text-muted-foreground" />
                          )}
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                            <div className="w-full bg-white/30 rounded-full h-1.5">
                              <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${percent}%` }} />
                            </div>
                            <span className="text-[10px] text-white mt-0.5 block">{percent}% مكتمل</span>
                          </div>
                        </div>
                        <CardContent className="p-3 space-y-1">
                          <p className="text-sm font-semibold line-clamp-2 leading-tight">{item.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.lastChapterNumber ? `الفصل ${item.lastChapterNumber}` : ""} {item.totalChapters ? `من ${item.totalChapters}` : ""}
                          </p>
                          <Button variant="default" size="sm" className="w-full mt-2 text-xs" data-testid={`btn-continue-${item.projectId}`}>
                            تابع القراءة
                          </Button>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            {(!savedLists || savedLists.length === 0) ? (
              <div className="text-center py-16 text-muted-foreground" data-testid="empty-saved">
                <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-serif text-lg mb-1">لا توجد أعمال محفوظة</p>
                <p className="text-sm">احفظ الأعمال التي تعجبك من المعرض</p>
                <Link href="/gallery">
                  <Button variant="outline" size="sm" className="mt-4" data-testid="link-browse-saved">
                    تصفح المعرض
                    <ArrowRight className="w-4 h-4 mr-1" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {savedLists.map((item: any) => (
                  <Link key={item.id || item.projectId} href={item.shareToken ? `/shared/${item.shareToken}` : "#"}>
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group" data-testid={`card-library-saved-${item.id || item.projectId}`}>
                      <div className="relative aspect-[2/3] bg-muted flex items-center justify-center overflow-hidden">
                        {item.coverImageUrl ? (
                          <img src={item.coverImageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" decoding="async" />
                        ) : (
                          <ImageIcon className="w-10 h-10 text-muted-foreground" />
                        )}
                      </div>
                      <CardContent className="p-3 space-y-1">
                        <p className="text-sm font-semibold line-clamp-2 leading-tight">{item.title}</p>
                        {item.authorName && <p className="text-xs text-muted-foreground">{item.authorName}</p>}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
