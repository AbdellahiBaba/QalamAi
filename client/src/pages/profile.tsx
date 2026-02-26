import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/theme-provider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Feather,
  LogOut,
  Sun,
  Moon,
  Save,
  Home,
  TicketCheck,
  ShieldCheck,
  BookOpen,
  Clock,
  FileText,
  DollarSign,
  User,
  Mail,
  Crown,
  CalendarDays,
  Lock,
} from "lucide-react";
import type { NovelProject } from "@shared/schema";
import { getProjectPriceUSD } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
    }
  }, [user]);

  const { data: projects, isLoading: projectsLoading } = useQuery<NovelProject[]>({
    queryKey: ["/api/projects"],
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string }) => {
      const res = await apiRequest("PATCH", "/api/auth/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "تم تحديث الملف الشخصي بنجاح" });
    },
    onError: () => {
      toast({ title: "حدث خطأ أثناء تحديث الملف الشخصي", variant: "destructive" });
    },
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({ firstName, lastName });
  };

  const totalSpending = projects
    ? projects
        .filter((p) => p.paid)
        .reduce((sum, p) => sum + getProjectPriceUSD(p.pageCount), 0)
    : 0;

  const statusLabel = (status: string, paid: boolean) => {
    if (!paid && status === "locked") return "مشروع مقفل";
    switch (status) {
      case "draft": return "مسودة";
      case "outline": return "المخطط";
      case "writing": return "قيد الكتابة";
      case "completed": return "مكتمل";
      case "finished": return "مكتمل";
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

  const planLabel = (plan: string | null) => {
    switch (plan) {
      case "all_in_one": return "الخطة الشاملة";
      case "essay": return "خطة المقالات";
      case "scenario": return "خطة السيناريوهات";
      default: return "مجاني";
    }
  };

  const roleLabel = (role: string | null) => {
    switch (role) {
      case "admin": return "مدير";
      default: return "مستخدم";
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
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="link-home">
                <Home className="w-4 h-4 ml-1" />
                <span className="hidden sm:inline">الرئيسية</span>
              </Button>
            </Link>
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
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              data-testid="button-theme-toggle"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => logout()} data-testid="button-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="font-serif text-3xl font-bold mb-8" data-testid="text-profile-title">
          الملف الشخصي
        </h1>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <Avatar className="w-24 h-24" data-testid="img-avatar">
                  <AvatarImage src={user?.profileImageUrl || undefined} />
                  <AvatarFallback className="text-2xl">
                    {user?.firstName?.[0] || user?.email?.[0] || "م"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-serif text-xl font-semibold" data-testid="text-user-name">
                    {user?.firstName || ""} {user?.lastName || ""}
                  </h2>
                  <p className="text-sm text-muted-foreground" data-testid="text-user-email">
                    {user?.email || ""}
                  </p>
                </div>
                <div className="flex items-center gap-4 flex-wrap justify-center">
                  <span className="flex items-center gap-1 text-sm text-muted-foreground" data-testid="text-user-role">
                    <User className="w-4 h-4" />
                    {roleLabel(user?.role || null)}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground" data-testid="text-user-plan">
                    <Crown className="w-4 h-4" />
                    {planLabel(user?.plan || null)}
                  </span>
                  {(!user?.plan || user.plan === "free") && (
                    <Link href="/pricing">
                      <span className="text-xs text-primary cursor-pointer hover:underline" data-testid="link-upgrade-plan">
                        ترقية الخطة
                      </span>
                    </Link>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground" data-testid="text-member-since">
                  <CalendarDays className="w-3.5 h-3.5" />
                  عضو منذ {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("ar-EG") : ""}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <h3 className="font-semibold">تعديل الاسم</h3>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">الاسم الأول</label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="الاسم الأول"
                    data-testid="input-first-name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">اسم العائلة</label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="اسم العائلة"
                    data-testid="input-last-name"
                  />
                </div>
                <Button
                  onClick={handleSaveProfile}
                  disabled={updateProfileMutation.isPending}
                  className="w-full"
                  data-testid="button-save-profile"
                >
                  <Save className="w-4 h-4 ml-2" />
                  {updateProfileMutation.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي الإنفاق</p>
                  <p className="text-2xl font-bold" data-testid="text-total-spending">
                    {totalSpending} دولار
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="font-serif text-xl font-semibold">مشاريعك</h2>
              <span className="text-sm text-muted-foreground" data-testid="text-projects-count">
                ({projects?.length || 0})
              </span>
            </div>

            {projectsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6 space-y-3">
                      <Skeleton className="h-5 w-2/3" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-1/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : projects && projects.length > 0 ? (
              <div className="space-y-4">
                {projects.map((project) => (
                  <Link key={project.id} href={`/project/${project.id}`}>
                    <Card className="cursor-pointer hover-elevate mb-4" data-testid={`card-project-${project.id}`}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="space-y-2 flex-1 min-w-0">
                            <h3 className="font-serif text-lg font-semibold truncate" data-testid={`text-project-title-${project.id}`}>
                              {project.title}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {new Date(project.createdAt).toLocaleDateString("ar-EG")}
                              </span>
                              <span className="flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5" />
                                {project.pageCount} صفحة
                              </span>
                              {project.usedWords > 0 && (
                                <span data-testid={`text-words-${project.id}`}>
                                  {project.usedWords.toLocaleString()} كلمة
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            {project.paid && (
                              <span className="text-sm font-medium text-muted-foreground" data-testid={`text-price-${project.id}`}>
                                {getProjectPriceUSD(project.pageCount)} دولار
                              </span>
                            )}
                            <span
                              className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${statusColor(project.status, project.paid)}`}
                              data-testid={`badge-status-${project.id}`}
                            >
                              {!project.paid && <Lock className="w-3 h-3 inline ml-1" />}
                              {statusLabel(project.status, project.paid)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-10 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-muted-foreground mb-4">لا توجد مشاريع بعد</p>
                  <Link href="/project/new">
                    <Button data-testid="button-new-project">مشروع جديد</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
