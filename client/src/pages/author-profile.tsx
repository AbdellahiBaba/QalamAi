import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { User, BookOpen, Image as ImageIcon } from "lucide-react";

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
  projects: AuthorProject[];
}

const typeLabels: Record<string, string> = {
  novel: "رواية",
  essay: "مقال",
  scenario: "سيناريو",
};

export default function AuthorProfile() {
  const { id } = useParams<{ id: string }>();

  const { data: author, isLoading, error } = useQuery<AuthorData>({
    queryKey: ["/api/authors", id],
    queryFn: async () => {
      const res = await fetch(`/api/authors/${id}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6" dir="rtl">
        <div className="max-w-5xl mx-auto space-y-6">
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
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-4" data-testid="author-not-found">
          <User className="w-16 h-16 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-serif font-bold" data-testid="text-author-not-found-title">الكاتب غير موجود</h1>
          <p className="text-muted-foreground" data-testid="text-author-not-found-message">هذا الملف الشخصي غير متاح</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-8">
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
            <h1 className="text-2xl font-serif font-bold" data-testid="text-author-name">{author.displayName}</h1>
            {author.bio && (
              <p className="text-muted-foreground max-w-xl" data-testid="text-author-bio">{author.bio}</p>
            )}
          </div>
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
                    <div className="relative aspect-[3/4] bg-muted flex items-center justify-center rounded-t-md overflow-hidden">
                      {project.coverImageUrl ? (
                        <img
                          src={project.coverImageUrl}
                          alt={project.title}
                          className="w-full h-full object-cover"
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
    </div>
  );
}
