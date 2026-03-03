import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { User, BookOpen, Image as ImageIcon, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SharedNavbar } from "@/components/shared-navbar";
import { SharedFooter } from "@/components/shared-footer";
import StarRating from "@/components/ui/star-rating";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useToast } from "@/hooks/use-toast";

interface AuthorProject {
  id: number;
  title: string;
  projectType: string;
  coverImageUrl: string | null;
  shareToken: string | null;
  mainIdea: string | null;
}

interface AuthorData {
  id: string;
  displayName: string;
  bio: string | null;
  profileImageUrl: string | null;
  averageRating: number;
  ratingCount: number;
  projects: AuthorProject[];
}

const typeLabels: Record<string, string> = {
  novel: "رواية",
  essay: "مقال",
  scenario: "سيناريو",
};

export default function AuthorProfile() {
  const { id } = useParams<{ id: string }>();
  useDocumentTitle("ملف الكاتب — قلم AI");
  const { toast } = useToast();
  const [visitorRating, setVisitorRating] = useState(0);

  useEffect(() => {
    if (id) {
      const stored = localStorage.getItem(`author-rating-${id}`);
      if (stored) {
        setVisitorRating(Number(stored));
      }
    }
  }, [id]);

  const { data: author, isLoading, error } = useQuery<AuthorData>({
    queryKey: ["/api/authors", id],
    queryFn: async () => {
      const res = await fetch(`/api/authors/${id}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!id,
  });

  const rateMutation = useMutation({
    mutationFn: async (rating: number) => {
      const res = await apiRequest("POST", `/api/authors/${id}/rate`, { rating });
      return res.json();
    },
    onSuccess: (_data: { average: number; count: number }, rating: number) => {
      localStorage.setItem(`author-rating-${id}`, String(rating));
      setVisitorRating(rating);
      queryClient.invalidateQueries({ queryKey: ["/api/authors", id] });
      toast({
        title: "شكراً لتقييمك",
        description: "تم تسجيل تقييمك بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تسجيل التقييم",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <SharedNavbar />
        <div className="max-w-5xl mx-auto p-6 pt-24 space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 w-full rounded-md" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !author) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <SharedNavbar />
        <div className="pt-24 px-6">
          <Button variant="ghost" onClick={() => window.history.back()} className="mb-4" data-testid="button-back">
            <ArrowRight className="w-4 h-4 ml-2" />
            العودة
          </Button>
        </div>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center space-y-4" data-testid="author-not-found">
            <User className="w-16 h-16 text-muted-foreground mx-auto" />
            <h1 className="text-2xl font-serif font-bold" data-testid="text-author-not-found-title">الكاتب غير موجود</h1>
            <p className="text-muted-foreground" data-testid="text-author-not-found-message">هذا الملف الشخصي غير متاح</p>
          </div>
        </div>
        <SharedFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SharedNavbar />
      <div className="max-w-5xl mx-auto p-6 pt-24 space-y-8">
        <Button variant="ghost" onClick={() => window.history.back()} className="mb-4" data-testid="button-back"><ArrowRight className="w-4 h-4 ml-2" />العودة</Button>
        <div className="flex items-center gap-4" data-testid="author-header">
          <Avatar className="h-20 w-20" data-testid="img-author-avatar">
            {author.profileImageUrl ? (
              <AvatarImage src={author.profileImageUrl} alt={author.displayName} />
            ) : null}
            <AvatarFallback>
              <User className="w-8 h-8" />
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-serif font-bold" data-testid="text-author-name">{author.displayName}</h1>
              <StarRating
                rating={author.averageRating || 0}
                count={author.ratingCount || 0}
                size="md"
                showCount={true}
              />
            </div>
            {author.bio && (
              <p className="text-muted-foreground max-w-xl" data-testid="text-author-bio">{author.bio}</p>
            )}
          </div>
        </div>

        <div className="space-y-2" data-testid="interactive-rating-section">
          <h3 className="text-sm font-semibold text-muted-foreground">قيّم هذا الكاتب</h3>
          <StarRating
            rating={visitorRating}
            interactive={true}
            onRate={(rating) => rateMutation.mutate(rating)}
            size="lg"
            showCount={false}
          />
        </div>

        <div>
          <h2 className="text-xl font-serif font-semibold mb-4" data-testid="text-projects-heading">المشاريع المشتركة</h2>
          {author.projects.length === 0 ? (
            <p className="text-muted-foreground" data-testid="text-no-projects">لا توجد مشاريع مشتركة حالياً</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" data-testid="grid-author-projects">
              {author.projects.map((project) => (
                <Link
                  key={project.id}
                  href={project.shareToken ? `/shared/${project.shareToken}` : "#"}
                  data-testid={`link-project-${project.id}`}
                >
                  <Card className="transition-shadow hover:shadow-lg cursor-pointer" data-testid={`card-project-${project.id}`}>
                    <div className="relative aspect-square bg-muted flex items-center justify-center rounded-t-md overflow-hidden">
                      {project.coverImageUrl ? (
                        <img
                          src={project.coverImageUrl}
                          alt={project.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          data-testid={`img-project-cover-${project.id}`}
                        />
                      ) : (
                        <ImageIcon className="w-12 h-12 text-muted-foreground" />
                      )}
                      <Badge className="absolute top-2 right-2" data-testid={`badge-type-${project.id}`}>
                        {typeLabels[project.projectType] || project.projectType}
                      </Badge>
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-serif font-semibold truncate" data-testid={`text-project-title-${project.id}`}>
                        {project.title}
                      </h3>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <SharedFooter />
    </div>
  );
}
