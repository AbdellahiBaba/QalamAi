import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowRight, MessageSquare, Star } from "lucide-react";
import StarRating from "@/components/ui/star-rating";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

interface PlatformReview {
  id: number;
  userId: string;
  reviewerName: string;
  content: string;
  rating: number;
  approved: boolean;
  createdAt: string;
}

export default function Reviews() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");

  const { data: reviews, isLoading } = useQuery<PlatformReview[]>({
    queryKey: ["/api/reviews"],
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/reviews", { content, rating });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      toast({
        title: "تم إرسال مراجعتك",
        description: "مراجعتك قيد المراجعة وستظهر بعد الموافقة عليها",
      });
      setDialogOpen(false);
      setRating(0);
      setContent("");
    },
    onError: () => {
      toast({
        title: "حدث خطأ",
        description: "لم نتمكن من إرسال مراجعتك، حاول مرة أخرى",
        variant: "destructive",
      });
    },
  });

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
          <div className="flex items-center gap-3 flex-wrap">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back-home">
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">
              آراء المستخدمين
            </h1>
          </div>

          {user ? (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-review">
                  <MessageSquare className="w-4 h-4 ml-2" />
                  أضف مراجعتك
                </Button>
              </DialogTrigger>
              <DialogContent dir="rtl" data-testid="dialog-add-review">
                <DialogHeader>
                  <DialogTitle>أضف مراجعتك</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-sm text-muted-foreground">تقييمك</span>
                    <StarRating
                      rating={rating}
                      interactive
                      onRate={setRating}
                      size="lg"
                      showCount={false}
                    />
                  </div>
                  <Textarea
                    placeholder="اكتب مراجعتك هنا..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={4}
                    dir="rtl"
                    data-testid="input-review-content"
                  />
                  <Button
                    className="w-full"
                    disabled={!rating || !content.trim() || submitMutation.isPending}
                    onClick={() => submitMutation.mutate()}
                    data-testid="button-submit-review"
                  >
                    {submitMutation.isPending ? "جاري الإرسال..." : "إرسال المراجعة"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-login-prompt">
              <span>سجل دخول لإضافة مراجعتك</span>
              <Link href="/login">
                <Button variant="outline" size="sm" data-testid="link-login">
                  تسجيل الدخول
                </Button>
              </Link>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="loading-skeletons">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : reviews && reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="reviews-grid">
            {reviews.map((review) => (
              <Card key={review.id} data-testid={`card-review-${review.id}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-semibold text-sm" data-testid={`text-reviewer-${review.id}`}>
                      {review.reviewerName}
                    </span>
                    <StarRating rating={review.rating} size="sm" showCount={false} />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed" dir="rtl" data-testid={`text-content-${review.id}`}>
                    {review.content}
                  </p>
                  <p className="text-xs text-muted-foreground/70" data-testid={`text-date-${review.id}`}>
                    {formatDate(review.createdAt)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center" data-testid="empty-state">
            <Star className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">لا توجد مراجعات بعد</p>
            <p className="text-sm text-muted-foreground/70 mt-1">كن أول من يضيف مراجعة</p>
          </div>
        )}
      </div>
    </div>
  );
}
