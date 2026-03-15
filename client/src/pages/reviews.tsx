import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowRight, MessageSquare, Star, MessageSquareQuote, Award } from "lucide-react";
import StarRating from "@/components/ui/star-rating";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { SharedFooter } from "@/components/shared-footer";
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
  reviewerBio: string | null;
  content: string;
  rating: number;
  approved: boolean;
  createdAt: string;
}

const featuredTestimonials = [
  {
    id: "featured-1",
    name: "سارة أحمد",
    role: "كاتبة روائية مبتدئة",
    content: "أبو هاشم ساعدني على كتابة فصول روايتي الأولى بأسلوب أدبي لم أكن أتوقّع أنني أستطيع تحقيقه. تجربة رائعة حقاً.",
    rating: 5,
  },
  {
    id: "featured-2",
    name: "محمد العلي",
    role: "كاتب قصص قصيرة",
    content: "المنصّة تفهم اللغة العربية بعمق. الشخصيات التي ساعدني أبو هاشم في بنائها كانت حيّة ومقنعة جداً.",
    rating: 5,
  },
  {
    id: "featured-3",
    name: "نورة الحربي",
    role: "مدوّنة وكاتبة محتوى",
    content: "أخيراً منصّة تحترم جمال اللغة العربية وتلتزم بالقيم. أنصح بها كل كاتب عربي يبحث عن أداة ذكية.",
    rating: 5,
  },
];

function useScrollAnimation() {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const observe = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("reviews-visible");
              observerRef.current?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
      );
    }
    observerRef.current.observe(node);
  }, []);

  useEffect(() => {
    return () => observerRef.current?.disconnect();
  }, []);

  return observe;
}

function AnimatedCard({ children, stagger, className = "", slideDirection = "up" }: {
  children: React.ReactNode;
  stagger: number;
  className?: string;
  slideDirection?: "up" | "right";
}) {
  const observe = useScrollAnimation();
  const animClass = slideDirection === "right" ? "reviews-slide-right" : "reviews-animate";

  return (
    <div
      ref={observe}
      className={`${animClass} reviews-stagger-${stagger} ${className}`}
    >
      {children}
    </div>
  );
}

export default function Reviews() {
  useDocumentTitle("آراء المستخدمين — قلم AI", "اطّلع على آراء وتجارب الكتّاب العرب الذين يستخدمون منصة QalamAI للكتابة الأدبية.");
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
              <Button variant="ghost" size="icon" data-testid="button-back-home" aria-label="العودة للرئيسية">
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
              <Button
                variant="outline"
                size="sm"
                data-testid="link-login"
                onClick={() => {
                  localStorage.setItem("returnTo", "/reviews");
                  window.location.href = "/api/login";
                }}
              >
                تسجيل الدخول
              </Button>
            </div>
          )}
        </div>

        <section className="mb-12" data-testid="section-featured-reviews">
          <div className="flex items-center gap-2 mb-6">
            <Award className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold" data-testid="text-featured-title">آراء مميزة</h2>
          </div>
          <div className="reviews-carousel-container">
            <div className="reviews-carousel-track">
              {[...featuredTestimonials, ...featuredTestimonials].map((t, i) => (
                <div key={`${t.id}-${i}`} className="reviews-carousel-card">
                  <Card className="hover-elevate border-primary/20 bg-primary/[0.03] h-full" data-testid={`card-${t.id}`}>
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center gap-1 text-primary">
                        {Array.from({ length: t.rating }).map((_, si) => (
                          <Star key={si} className="w-4 h-4 fill-current" />
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed italic">
                        <MessageSquareQuote className="w-4 h-4 text-primary inline-block ml-1" />
                        {t.content}
                      </p>
                      <div className="pt-2 border-t border-primary/10">
                        <p className="font-semibold text-sm" data-testid={`text-name-${t.id}`}>{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.role}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section data-testid="section-user-reviews">
          <div className="flex items-center gap-2 mb-6">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold" data-testid="text-user-reviews-title">آراء كتّابنا</h2>
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
              {reviews.map((review, i) => (
                <AnimatedCard key={review.id} stagger={((i % 6) + 1)}>
                  <Card className="hover-elevate" data-testid={`card-review-${review.id}`}>
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center gap-1 text-primary">
                        {Array.from({ length: review.rating }).map((_, si) => (
                          <Star key={si} className="w-4 h-4 fill-current" />
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed italic" dir="rtl" data-testid={`text-content-${review.id}`}>
                        <MessageSquareQuote className="w-4 h-4 text-primary inline-block ml-1" />
                        {review.content}
                      </p>
                      <div className="pt-2 border-t">
                        <p className="font-semibold text-sm" data-testid={`text-reviewer-${review.id}`}>
                          {review.reviewerName}
                        </p>
                        <p className="text-xs text-muted-foreground" data-testid={`text-bio-${review.id}`}>
                          {review.reviewerBio || "مستخدم QalamAI"}
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-1" data-testid={`text-date-${review.id}`}>
                          {formatDate(review.createdAt)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </AnimatedCard>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center" data-testid="empty-state">
              <Star className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">لا توجد مراجعات من المستخدمين بعد</p>
              <p className="text-sm text-muted-foreground/70 mt-1">كن أول من يضيف مراجعة</p>
            </div>
          )}
        </section>
      </div>
      <SharedFooter />
    </div>
  );
}
