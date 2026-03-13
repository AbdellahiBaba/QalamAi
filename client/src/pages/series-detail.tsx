import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SharedNavbar } from "@/components/shared-navbar";
import { SharedFooter } from "@/components/shared-footer";
import { Layers, BookOpen, ArrowRight, Plus, Trash2, ExternalLink } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { NovelProject } from "@shared/schema";

interface SeriesItem {
  id: number;
  orderIndex: number;
  project: {
    id: number;
    title: string;
    shareToken: string | null;
    coverImageUrl: string | null;
    mainIdea: string | null;
  };
}

interface SeriesDetail {
  id: number;
  userId: string;
  title: string;
  description: string | null;
  items: SeriesItem[];
  createdAt: string;
}

export default function SeriesDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const seriesId = id ? parseInt(id) : null;
  const isOwner = !!user;

  const { data: series, isLoading } = useQuery<SeriesDetail>({
    queryKey: seriesId ? [`/api/public/series/${seriesId}`] : [],
    queryFn: async () => {
      const endpoint = user ? `/api/series/${seriesId}` : `/api/public/series/${seriesId}`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("not found");
      return res.json();
    },
    enabled: !!seriesId,
  });

  useDocumentTitle(series ? `${series.title} — قلم AI` : "سلسلة — قلم AI");

  const { data: projects } = useQuery<NovelProject[]>({
    queryKey: ["/api/projects"],
    enabled: !!user,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/series/${seriesId}/items`, {
        projectId: parseInt(selectedProjectId),
        orderIndex: (series?.items.length || 0),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/public/series/${seriesId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/series/${seriesId}`] });
      setAddOpen(false);
      setSelectedProjectId("");
      toast({ title: "تم إضافة العمل للسلسلة" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const res = await apiRequest("DELETE", `/api/series/${seriesId}/items/${projectId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/public/series/${seriesId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/series/${seriesId}`] });
      toast({ title: "تم حذف العمل من السلسلة" });
    },
  });

  const availableProjects = projects?.filter(p =>
    !series?.items.some(item => item.project.id === p.id)
  ) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <SharedNavbar />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-16 space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
        <SharedFooter />
      </div>
    );
  }

  if (!series) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <SharedNavbar />
        <div className="max-w-3xl mx-auto px-4 pt-32 text-center space-y-4">
          <Layers className="w-12 h-12 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-serif font-bold">السلسلة غير موجودة</h1>
          <Link href="/essays"><Button variant="outline">العودة للمقالات</Button></Link>
        </div>
        <SharedFooter />
      </div>
    );
  }

  const isSeriesOwner = user && series.userId === (user as any)?.id;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SharedNavbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">سلسلة</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold" data-testid="series-title">{series.title}</h1>
              {series.description && (
                <p className="text-muted-foreground mt-2 leading-relaxed" data-testid="series-description">{series.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                {series.items.length} {series.items.length === 1 ? "جزء" : "أجزاء"}
              </p>
            </div>
            {isSeriesOwner && (
              <Button onClick={() => setAddOpen(true)} className="gap-1.5 shrink-0" data-testid="button-add-to-series">
                <Plus className="w-4 h-4" />
                إضافة عمل
              </Button>
            )}
          </div>
        </div>

        {series.items.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <BookOpen className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">لا توجد أعمال في هذه السلسلة بعد.</p>
            {isSeriesOwner && (
              <Button onClick={() => setAddOpen(true)} className="gap-1.5" data-testid="button-add-first-item">
                <Plus className="w-4 h-4" />
                إضافة أول عمل
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {series.items.map((item, idx) => (
              <Card key={item.id} data-testid={`series-item-${item.project.id}`}>
                <CardContent className="p-5">
                  <div className="flex gap-4">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-serif font-semibold text-lg leading-tight" data-testid={`item-title-${item.project.id}`}>{item.project.title}</h2>
                      {item.project.mainIdea && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.project.mainIdea}</p>
                      )}
                      <div className="flex items-center gap-2 mt-3">
                        {item.project.shareToken ? (
                          <Link href={`/essay/${item.project.shareToken}`}>
                            <Button variant="outline" size="sm" className="gap-1" data-testid={`button-read-${item.project.id}`}>
                              <ExternalLink className="w-3 h-3" />
                              اقرأ
                            </Button>
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">غير منشور</span>
                        )}
                        {isSeriesOwner && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => removeMutation.mutate(item.project.id)}
                            data-testid={`button-remove-item-${item.project.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {item.project.coverImageUrl && (
                      <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden">
                        <img src={item.project.coverImageUrl} alt={item.project.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent dir="rtl" data-testid="dialog-add-series-item">
            <DialogHeader>
              <DialogTitle>إضافة عمل إلى السلسلة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              {availableProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">لا توجد مشاريع متاحة للإضافة.</p>
              ) : (
                <>
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger data-testid="select-series-project">
                      <SelectValue placeholder="اختر المشروع" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProjects.map(p => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    className="w-full"
                    disabled={!selectedProjectId || addMutation.isPending}
                    onClick={() => addMutation.mutate()}
                    data-testid="button-confirm-add-item"
                  >
                    {addMutation.isPending ? "جارٍ الإضافة..." : "إضافة للسلسلة"}
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <SharedFooter />
    </div>
  );
}
