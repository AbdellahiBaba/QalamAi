import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { SharedNavbar } from "@/components/shared-navbar";
import { SharedFooter } from "@/components/shared-footer";
import { Layers, Plus, Trash2, BookOpen, ArrowRight, Wand2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Series {
  id: number;
  title: string;
  description: string | null;
  item_count: number;
  createdAt: string;
}

export default function ContentSeries() {
  useDocumentTitle("سلاسل المحتوى — قلم AI");
  const { user } = useAuth();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [suggestingDesc, setSuggestingDesc] = useState(false);

  const { data: series, isLoading } = useQuery<Series[]>({
    queryKey: ["/api/series"],
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/series", { title: newTitle.trim(), description: newDescription.trim() || undefined });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/series"] });
      setCreateOpen(false);
      setNewTitle("");
      setNewDescription("");
      toast({ title: "تم إنشاء السلسلة" });
    },
    onError: (err: any) => {
      toast({ title: err.message || "فشل الإنشاء", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/series/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/series"] });
      toast({ title: "تم حذف السلسلة" });
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <SharedNavbar />
        <div className="max-w-2xl mx-auto px-4 pt-32 text-center space-y-4">
          <Layers className="w-12 h-12 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-serif font-bold">سلاسل المحتوى</h1>
          <p className="text-muted-foreground">يجب تسجيل الدخول لإدارة سلاسلك</p>
          <Link href="/login">
            <Button>تسجيل الدخول</Button>
          </Link>
        </div>
        <SharedFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SharedNavbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
              <Layers className="w-6 h-6 text-primary" />
              سلاسل المحتوى
            </h1>
            <p className="text-muted-foreground text-sm mt-1">رتّب أعمالك في سلاسل متعددة الأجزاء</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5" data-testid="button-create-series">
            <Plus className="w-4 h-4" />
            سلسلة جديدة
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : !series || series.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <Layers className="w-12 h-12 text-muted-foreground mx-auto" />
            <h2 className="font-serif text-xl font-semibold">لا توجد سلاسل بعد</h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">أنشئ سلسلة لتجميع أعمالك المترابطة كأجزاء متسلسلة يتابعها القرّاء.</p>
            <Button onClick={() => setCreateOpen(true)} className="gap-1.5" data-testid="button-create-first-series">
              <Plus className="w-4 h-4" />
              إنشاء أول سلسلة
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {series.map((s) => (
              <Card key={s.id} data-testid={`card-series-${s.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link href={`/series/${s.id}`}>
                        <h2 className="font-serif font-semibold text-lg hover:text-primary transition-colors cursor-pointer" data-testid={`series-title-${s.id}`}>
                          {s.title}
                        </h2>
                      </Link>
                      {s.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{s.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {s.item_count} {s.item_count === 1 ? "عمل" : "أعمال"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(s.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link href={`/series/${s.id}`}>
                        <Button variant="outline" size="sm" className="gap-1" data-testid={`button-open-series-${s.id}`}>
                          <ArrowRight className="w-3.5 h-3.5" />
                          فتح
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("هل أنت متأكد من حذف هذه السلسلة؟")) {
                            deleteMutation.mutate(s.id);
                          }
                        }}
                        data-testid={`button-delete-series-${s.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent dir="rtl" data-testid="dialog-create-series">
            <DialogHeader>
              <DialogTitle>إنشاء سلسلة جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-sm font-medium block mb-1.5">عنوان السلسلة *</label>
                <Input
                  placeholder="مثال: رحلتي مع الكتابة"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  maxLength={200}
                  data-testid="input-series-title"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium">وصف السلسلة (اختياري)</label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary"
                    disabled={!newTitle.trim() || suggestingDesc}
                    data-testid="button-suggest-description"
                    onClick={async () => {
                      if (!newTitle.trim()) {
                        toast({ title: "أدخل عنوان السلسلة أولاً", variant: "destructive" });
                        return;
                      }
                      setSuggestingDesc(true);
                      try {
                        const res = await apiRequest("POST", "/api/series/suggest-description", { title: newTitle.trim() });
                        const data = await res.json();
                        if (data.description) {
                          setNewDescription(data.description);
                        } else {
                          toast({ title: "لم يتمكن أبو هاشم من اقتراح وصف", variant: "destructive" });
                        }
                      } catch {
                        toast({ title: "فشل في الاقتراح", variant: "destructive" });
                      } finally {
                        setSuggestingDesc(false);
                      }
                    }}
                  >
                    {suggestingDesc ? (
                      <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Wand2 className="w-3 h-3" />
                    )}
                    {suggestingDesc ? "أبو هاشم يكتب..." : "اقتراح من أبو هاشم"}
                  </Button>
                </div>
                <Textarea
                  placeholder="وصف مختصر للسلسلة..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  maxLength={500}
                  data-testid="textarea-series-description"
                />
              </div>
              <Button
                className="w-full"
                disabled={!newTitle.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate()}
                data-testid="button-confirm-create-series"
              >
                {createMutation.isPending ? "جارٍ الإنشاء..." : "إنشاء السلسلة"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <SharedFooter />
    </div>
  );
}
