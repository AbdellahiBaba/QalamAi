import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { SharedNavbar } from "@/components/shared-navbar";
import { SharedFooter } from "@/components/shared-footer";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { BookMarked, BookOpen, ArrowRight } from "lucide-react";

interface CollectionItem {
  essayId: number;
  title: string;
  coverImageUrl: string | null;
  shareToken: string | null;
  authorName: string;
}

interface CollectionPublic {
  id: number;
  name: string;
  description: string | null;
  items: CollectionItem[];
}

export default function CollectionPublic() {
  const { slug } = useParams<{ slug: string }>();
  useDocumentTitle("قائمة قراءة — QalamAI");

  const { data: collection, isLoading, error } = useQuery<CollectionPublic>({
    queryKey: ["/api/public/collections", slug],
    queryFn: async () => {
      const res = await fetch(`/api/public/collections/${slug}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <SharedNavbar />
        <div className="max-w-3xl mx-auto px-4 pt-24 pb-16 space-y-6">
          <Skeleton className="h-9 w-60" />
          <Skeleton className="h-4 w-80" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
          </div>
        </div>
        <SharedFooter />
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <SharedNavbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <BookMarked className="w-16 h-16 text-muted-foreground mx-auto" />
            <h1 className="text-2xl font-serif font-bold">القائمة غير موجودة</h1>
            <p className="text-muted-foreground">هذه القائمة غير متاحة أو تمت إزالتها</p>
            <Link href="/essays">
              <Button variant="outline">
                <ArrowRight className="w-4 h-4 ml-2" />
                تصفح المقالات
              </Button>
            </Link>
          </div>
        </div>
        <SharedFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SharedNavbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        <div className="flex items-center gap-3 mb-2">
          <BookMarked className="w-7 h-7 text-primary" />
          <h1 className="font-serif text-3xl font-bold" data-testid="text-collection-title">{collection.name}</h1>
        </div>
        {collection.description && (
          <p className="text-muted-foreground mb-2">{collection.description}</p>
        )}
        <p className="text-sm text-muted-foreground mb-10" data-testid="text-collection-count">
          {collection.items.length} {collection.items.length === 1 ? "مقال" : "مقالات"}
        </p>

        {collection.items.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground" data-testid="collection-empty">
            <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>لا توجد مقالات في هذه القائمة بعد</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="collection-items">
            {collection.items.map((item) => (
              <Link key={item.essayId} href={item.shareToken ? `/essay/${item.shareToken}` : "#"}>
                <Card className="hover-elevate cursor-pointer h-full" data-testid={`card-collection-item-${item.essayId}`}>
                  {item.coverImageUrl ? (
                    <div className="aspect-[16/9] overflow-hidden rounded-t-lg">
                      <img
                        src={item.coverImageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[16/9] bg-primary/5 rounded-t-lg flex items-center justify-center">
                      <BookOpen className="w-10 h-10 text-primary/30" />
                    </div>
                  )}
                  <CardContent className="p-4 space-y-1">
                    <h2 className="font-serif font-semibold line-clamp-2" data-testid={`title-item-${item.essayId}`}>
                      {item.title}
                    </h2>
                    <p className="text-sm text-muted-foreground" data-testid={`author-item-${item.essayId}`}>
                      {item.authorName}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <SharedFooter />
    </div>
  );
}
