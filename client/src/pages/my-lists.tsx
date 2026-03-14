import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { SharedNavbar } from "@/components/shared-navbar";
import { SharedFooter } from "@/components/shared-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BookMarked, Plus, Trash2, Globe, Lock, ExternalLink, BookOpen, ChevronDown, ChevronUp, X } from "lucide-react";

interface Collection {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  is_public: boolean;
  item_count: number;
  created_at: string;
}

interface CollectionItem {
  essayId: number | null;
  projectId: number | null;
  title: string;
  coverImageUrl: string | null;
  shareToken: string | null;
  authorName: string;
  projectType: string | null;
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

function CollectionItemsList({ collectionId }: { collectionId: number }) {
  const { toast } = useToast();

  const { data: items, isLoading } = useQuery<CollectionItem[]>({
    queryKey: ["/api/collections", collectionId, "items"],
    queryFn: async () => {
      const res = await fetch(`/api/collections/${collectionId}/items`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const removeMutation = useMutation({
    mutationFn: (item: CollectionItem) => {
      if (item.projectId) {
        return apiRequest("DELETE", `/api/collections/${collectionId}/projects/${item.projectId}`);
      }
      return apiRequest("DELETE", `/api/collections/${collectionId}/items/${item.essayId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collections", collectionId, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      toast({ title: "تم إزالة العنصر" });
    },
    onError: () => toast({ title: "فشل في الإزالة", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="space-y-2 mt-3">
        {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground mt-3" data-testid={`collection-${collectionId}-empty`}>
        <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">لا توجد عناصر في هذه القائمة بعد</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3" data-testid={`collection-${collectionId}-items`}>
      {items.map((item, idx) => {
        const itemKey = item.projectId || item.essayId || idx;
        const href = item.shareToken
          ? (item.projectId ? `/shared/${item.shareToken}` : `/essay/${item.shareToken}`)
          : "#";

        return (
          <div key={itemKey} className="relative group" data-testid={`collection-item-${itemKey}`}>
            <Link href={href}>
              <Card className="hover-elevate cursor-pointer h-full">
                <div className="flex gap-3 p-3">
                  {item.coverImageUrl ? (
                    <img
                      src={item.coverImageUrl}
                      alt={item.title}
                      className="w-16 h-20 rounded-md object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-20 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 space-y-1">
                    {item.projectType && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0" data-testid={`badge-type-${itemKey}`}>
                        {typeLabels[item.projectType] || item.projectType}
                      </Badge>
                    )}
                    <h3 className="font-serif font-semibold text-sm line-clamp-2" data-testid={`title-item-${itemKey}`}>
                      {item.title}
                    </h3>
                    <p className="text-xs text-muted-foreground" data-testid={`author-item-${itemKey}`}>
                      {item.authorName}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
            <button
              className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-full bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                removeMutation.mutate(item);
              }}
              data-testid={`button-remove-item-${itemKey}`}
            >
              <X className="w-3 h-3 text-destructive" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default function MyLists() {
  useDocumentTitle("قوائم القراءة — QalamAI");
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPublic, setNewPublic] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

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
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === col.id ? null : col.id)}
                    >
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
                        {expandedId === col.id ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      {col.description && (
                        <p className="text-sm text-muted-foreground mb-2">{col.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground" data-testid={`count-collection-${col.id}`}>
                        {col.item_count} {col.item_count === 1 ? "عنصر" : "عناصر"}
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
                  {expandedId === col.id && (
                    <CollectionItemsList collectionId={col.id} />
                  )}
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
