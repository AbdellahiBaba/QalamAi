import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { SharedNavbar } from "@/components/shared-navbar";
import { SharedFooter } from "@/components/shared-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BookMarked, Plus, Trash2, Globe, Lock, ExternalLink } from "lucide-react";

interface Collection {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  is_public: boolean;
  item_count: number;
  created_at: string;
}

export default function MyLists() {
  useDocumentTitle("قوائم القراءة — QalamAI");
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPublic, setNewPublic] = useState(false);

  const { data: collections, isLoading } = useQuery<Collection[]>({
    queryKey: ["/api/collections"],
  });

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/collections", { name: newName, description: newDesc, isPublic: newPublic }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
      setNewPublic(false);
      toast({ title: "تم إنشاء القائمة" });
    },
    onError: () => toast({ title: "فشل إنشاء القائمة", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/collections/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      toast({ title: "تم حذف القائمة" });
    },
    onError: () => toast({ title: "فشل حذف القائمة", variant: "destructive" }),
  });

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SharedNavbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <BookMarked className="w-7 h-7 text-primary" />
            <h1 className="font-serif text-3xl font-bold" data-testid="text-my-lists-title">قوائم القراءة</h1>
          </div>
          <Button onClick={() => setShowCreate(true)} data-testid="button-create-list">
            <Plus className="w-4 h-4 ml-2" />
            قائمة جديدة
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-5 space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-60" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !collections || collections.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground" data-testid="my-lists-empty">
            <BookMarked className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="mb-4">لا توجد قوائم بعد</p>
            <Button variant="outline" onClick={() => setShowCreate(true)} data-testid="button-create-first-list">
              أنشئ قائمتك الأولى
            </Button>
          </div>
        ) : (
          <div className="space-y-4" data-testid="collections-list">
            {collections.map((col) => (
              <Card key={col.id} data-testid={`card-collection-${col.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h2 className="font-semibold text-lg" data-testid={`name-collection-${col.id}`}>{col.name}</h2>
                        {col.is_public ? (
                          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <Globe className="w-3 h-3" /> عامة
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Lock className="w-3 h-3" /> خاصة
                          </span>
                        )}
                      </div>
                      {col.description && (
                        <p className="text-sm text-muted-foreground mb-2">{col.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground" data-testid={`count-collection-${col.id}`}>
                        {col.item_count} {col.item_count === 1 ? "مقال" : "مقالات"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {col.is_public && (
                        <Link href={`/list/${col.slug}`}>
                          <Button variant="outline" size="icon" data-testid={`button-view-collection-${col.id}`}>
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </Link>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm("هل أنت متأكد من حذف هذه القائمة؟")) {
                            deleteMutation.mutate(col.id);
                          }
                        }}
                        data-testid={`button-delete-collection-${col.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent dir="rtl" data-testid="dialog-create-collection">
          <DialogHeader>
            <DialogTitle>قائمة قراءة جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">اسم القائمة</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="مثال: مقالات مفضلة"
                data-testid="input-collection-name"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">وصف (اختياري)</label>
              <Input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="وصف مختصر للقائمة"
                data-testid="input-collection-desc"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newPublic}
                onChange={(e) => setNewPublic(e.target.checked)}
                className="rounded"
                data-testid="checkbox-collection-public"
              />
              <span className="text-sm">قائمة عامة (يمكن للجميع رؤيتها)</span>
            </label>
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1"
                disabled={!newName.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate()}
                data-testid="button-confirm-create-collection"
              >
                {createMutation.isPending ? "جارٍ الإنشاء..." : "إنشاء القائمة"}
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)} data-testid="button-cancel-create-collection">
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SharedFooter />
    </div>
  );
}
