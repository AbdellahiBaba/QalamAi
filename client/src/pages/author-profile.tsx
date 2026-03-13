import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { User, Image as ImageIcon, ArrowRight, BadgeCheck, UserPlus, UserMinus, Users, Rss, Globe } from "lucide-react";
import { SiX, SiInstagram, SiTiktok, SiFacebook, SiLinkedin, SiYoutube } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { SharedNavbar } from "@/components/shared-navbar";
import { SharedFooter } from "@/components/shared-footer";
import StarRating from "@/components/ui/star-rating";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface AuthorProject {
  id: number;
  title: string;
  projectType: string;
  coverImageUrl: string | null;
  shareToken: string | null;
  mainIdea: string | null;
}

interface SocialProfileLinks {
  twitter?: string;
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  linkedin?: string;
  youtube?: string;
  website?: string;
}

interface AuthorData {
  id: string;
  displayName: string;
  bio: string | null;
  profileImageUrl: string | null;
  averageRating: number;
  ratingCount: number;
  verified: boolean;
  followerCount: number;
  socialProfiles: string | null;
  projects: AuthorProject[];
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

export default function AuthorProfile() {
  const { id } = useParams<{ id: string }>();
  useDocumentTitle("ملف الكاتب — قلم AI");
  const { toast } = useToast();
  const { user } = useAuth();
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
      toast({ title: "شكراً لتقييمك", description: "تم تسجيل تقييمك بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ", description: "حدث خطأ أثناء تسجيل التقييم", variant: "destructive" });
    },
  });

  const { data: followStatus } = useQuery<{ following: boolean }>({
    queryKey: ["/api/follow", id, "status"],
    queryFn: async () => {
      const res = await fetch(`/api/follow/${id}/status`);
      if (!res.ok) return { following: false };
      return res.json();
    },
    enabled: !!user && !!id && user.id !== id,
  });

  const followMutation = useMutation({
    mutationFn: async (action: "follow" | "unfollow") => {
      const method = action === "follow" ? "POST" : "DELETE";
      const res = await apiRequest(method, `/api/follow/${id}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/follow", id, "status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/authors", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/following"] });
    },
    onError: () => {
      toast({ title: "خطأ", description: "حدث خطأ أثناء متابعة الكاتب", variant: "destructive" });
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
        {user && user.id === author.id ? (
          <Link href="/">
            <Button variant="ghost" className="mb-4" data-testid="button-back-dashboard">
              <ArrowRight className="w-4 h-4 ml-2" />
              لوحة التحكم
            </Button>
          </Link>
        ) : (
          <Button variant="ghost" onClick={() => window.history.back()} className="mb-4" data-testid="button-back">
            <ArrowRight className="w-4 h-4 ml-2" />
            العودة
          </Button>
        )}
        <div className="flex items-center gap-4" data-testid="author-header">
          <Avatar className="h-20 w-20" data-testid="img-author-avatar">
            {author.profileImageUrl ? (
              <AvatarImage src={author.profileImageUrl} alt={author.displayName} />
            ) : null}
            <AvatarFallback>
              <User className="w-8 h-8" />
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2 flex-1">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-serif font-bold" data-testid="text-author-name">{author.displayName}</h1>
                  {author.verified && (
                    <span title="كاتب موثّق" data-testid="badge-verified" className="inline-flex items-center shrink-0">
                      <BadgeCheck className="w-6 h-6 text-[#1D9BF0]" strokeWidth={2} />
                    </span>
                  )}
                </div>
                <StarRating
                  rating={author.averageRating || 0}
                  count={author.ratingCount || 0}
                  size="md"
                  showCount={true}
                />
                {author.followerCount > 0 && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground" data-testid="text-follower-count">
                    <Users className="w-3.5 h-3.5" />
                    <span>{author.followerCount} متابع</span>
                  </div>
                )}
                <a
                  href={`/api/authors/${id}/rss`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-orange-500 transition-colors"
                  title="اشترك في خلاصة RSS"
                  data-testid="link-author-rss"
                >
                  <Rss className="w-3.5 h-3.5" />
                  RSS
                </a>
              </div>
              {user && user.id !== author.id && (
                <Button
                  variant={followStatus?.following ? "outline" : "default"}
                  size="sm"
                  onClick={() => followMutation.mutate(followStatus?.following ? "unfollow" : "follow")}
                  disabled={followMutation.isPending}
                  data-testid="button-follow-author"
                  className="gap-1.5 shrink-0"
                >
                  {followStatus?.following ? (
                    <><UserMinus className="w-3.5 h-3.5" /> إلغاء المتابعة</>
                  ) : (
                    <><UserPlus className="w-3.5 h-3.5" /> متابعة</>
                  )}
                </Button>
              )}
            </div>
            {author.bio && (
              <p className="text-muted-foreground max-w-xl" data-testid="text-author-bio">{author.bio}</p>
            )}
            {(() => {
              let links: Record<string, string> = {};
              try { if (author.socialProfiles) links = JSON.parse(author.socialProfiles); } catch {}
              type SocialEntry = { key: string; Icon: any; label: string; color: string };
              const ALL: SocialEntry[] = [
                { key: "twitter", Icon: SiX, label: "تويتر", color: "hover:text-sky-500" },
                { key: "instagram", Icon: SiInstagram, label: "إنستغرام", color: "hover:text-pink-500" },
                { key: "tiktok", Icon: SiTiktok, label: "تيك توك", color: "hover:text-foreground" },
                { key: "facebook", Icon: SiFacebook, label: "فيسبوك", color: "hover:text-blue-600" },
                { key: "linkedin", Icon: SiLinkedin, label: "لينكدإن", color: "hover:text-blue-700" },
                { key: "youtube", Icon: SiYoutube, label: "يوتيوب", color: "hover:text-red-500" },
                { key: "website", Icon: Globe, label: "الموقع", color: "hover:text-primary" },
              ];
              const visible = ALL.filter(e => !!links[e.key]);
              if (!visible.length) return null;
              return (
                <div className="flex items-center gap-3 flex-wrap" data-testid="author-social-links">
                  {visible.map(({ key, Icon, label, color }) => {
                    const url = links[key];
                    return (
                      <a
                        key={key}
                        href={url.startsWith("http") ? url : `https://${url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={label}
                        className={`text-muted-foreground transition-colors ${color}`}
                        data-testid={`link-social-${key}`}
                      >
                        <Icon className="w-5 h-5" />
                      </a>
                    );
                  })}
                </div>
              );
            })()}
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
                    <div className="aspect-square bg-muted flex items-center justify-center rounded-t-md overflow-hidden">
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
                    </div>
                    <CardContent className="p-3 space-y-1">
                      <Badge variant="secondary" className="text-xs" data-testid={`badge-type-${project.id}`}>
                        {typeLabels[project.projectType] || project.projectType}
                      </Badge>
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
