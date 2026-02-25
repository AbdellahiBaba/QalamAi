import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, BookOpen, Feather, LogOut, Clock, FileText, Lock, CreditCard, TicketCheck, ShieldCheck } from "lucide-react";
import type { NovelProject } from "@shared/schema";
import { getProjectPriceUSD, WORDS_PER_PAGE } from "@shared/schema";

export default function Home() {
  const { user, logout } = useAuth();
  const { data: projects, isLoading } = useQuery<NovelProject[]>({
    queryKey: ["/api/projects"],
  });

  const statusLabel = (status: string, paid: boolean) => {
    if (!paid && status === "locked") return "مشروع مقفل";
    switch (status) {
      case "draft": return "مسودة";
      case "outline": return "المخطط";
      case "writing": return "قيد الكتابة";
      case "completed": return "مكتمل";
      case "finished": return "مكتمل (حد الكلمات)";
      case "locked": return "مشروع مقفل";
      default: return status;
    }
  };

  const statusColor = (status: string, paid: boolean) => {
    if (!paid && status === "locked") return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    switch (status) {
      case "draft": return "bg-muted text-muted-foreground";
      case "outline": return "bg-primary/10 text-primary";
      case "writing": return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
      case "completed": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "finished": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "locked": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
              <Feather className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-serif text-xl font-bold">QalamAI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/tickets">
              <Button variant="ghost" size="sm" data-testid="link-tickets">
                <TicketCheck className="w-4 h-4 ml-1" />
                <span className="hidden sm:inline">تذاكر الدعم</span>
              </Button>
            </Link>
            {user?.role === "admin" && (
              <Link href="/admin">
                <Button variant="ghost" size="sm" data-testid="link-admin">
                  <ShieldCheck className="w-4 h-4 ml-1" />
                  <span className="hidden sm:inline">الإدارة</span>
                </Button>
              </Link>
            )}
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback className="text-xs">
                  {user?.firstName?.[0] || user?.email?.[0] || "م"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:inline" data-testid="text-username">
                {user?.firstName || user?.email || "مستخدم"}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => logout()} data-testid="button-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="font-serif text-3xl font-bold mb-2" data-testid="text-welcome">
              أهلاً {user?.firstName || ""}
            </h1>
            <p className="text-muted-foreground">مشاريعك الروائية</p>
          </div>
          <Link href="/project/new">
            <Button data-testid="button-new-project">
              <Plus className="w-4 h-4 ml-2" />
              مشروع جديد
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link key={project.id} href={`/project/${project.id}`}>
                <Card className="cursor-pointer hover-elevate h-full">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-serif text-lg font-semibold line-clamp-2" data-testid={`text-project-title-${project.id}`}>
                        {project.title}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${statusColor(project.status, project.paid)}`} data-testid={`badge-status-${project.id}`}>
                        {!project.paid && <Lock className="w-3 h-3 inline ml-1" />}
                        {statusLabel(project.status, project.paid)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {project.mainIdea}
                    </p>
                    {!project.paid && (
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="text-sm font-semibold text-primary" data-testid={`text-price-${project.id}`}>
                          {getProjectPriceUSD(project.pageCount)} دولار
                        </span>
                        <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                          <CreditCard className="w-3.5 h-3.5" />
                          إتمام الدفع
                        </span>
                      </div>
                    )}
                    {project.paid && project.allowedWords > 0 && (
                      <div className="text-xs text-muted-foreground" data-testid={`text-words-remaining-${project.id}`}>
                        عدد الكلمات المتبقية: {(project.allowedWords - project.usedWords).toLocaleString()}
                      </div>
                    )}
                    <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(project.createdAt).toLocaleDateString("ar-EG")}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        {project.pageCount} صفحة
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-10 h-10 text-primary" />
            </div>
            <h2 className="font-serif text-2xl font-semibold mb-3">لا توجد مشاريع بعد</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              ابدأ بإنشاء مشروعك الروائي الأول. حدد شخصياتك وفكرتك وسيساعدك أبو هاشم في كتابة رواية عربية بأسلوب أدبي رفيع
            </p>
            <Link href="/project/new">
              <Button size="lg" data-testid="button-empty-new-project">
                <Plus className="w-4 h-4 ml-2" />
                أنشئ مشروعك الأول
              </Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
