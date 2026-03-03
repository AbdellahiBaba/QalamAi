import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  Globe,
  ExternalLink,
  Camera,
  Loader2,
  Sparkles,
  Palette,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { NovelProject } from "@shared/schema";
import { getProjectPriceUSD } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import LtrNum from "@/components/ui/ltr-num";

export default function Profile() {
  useDocumentTitle("الملف الشخصي — قلم AI");
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [publicProfile, setPublicProfile] = useState(false);
  const [avatarStyle, setAvatarStyle] = useState("classic");
  const [showAvatarGenerator, setShowAvatarGenerator] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setDisplayName((user as any).displayName || "");
      setBio((user as any).bio || "");
      setPublicProfile((user as any).publicProfile || false);
    }
  }, [user]);

  const { data: projects, isLoading: projectsLoading } = useQuery<NovelProject[]>({
    queryKey: ["/api/projects"],
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; displayName?: string; bio?: string; publicProfile?: boolean }) => {
      const res = await apiRequest("PATCH", "/api/profile", data);
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

  const avatarUploadMutation = useMutation({
    mutationFn: async (image: string) => {
      const res = await apiRequest("POST", "/api/profile/avatar", { image });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "تم تحديث الصورة الشخصية بنجاح" });
    },
    onError: (err: any) => {
      let msg = "فشل في رفع الصورة";
      try {
        const parsed = JSON.parse(err?.message?.replace(/^\d+:\s*/, "") || "{}");
        if (parsed.error) msg = parsed.error;
      } catch {}
      toast({ title: msg, variant: "destructive" });
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "حجم الصورة يتجاوز 2 ميغابايت", variant: "destructive" });
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast({ title: "صيغة الصورة غير مدعومة. استخدم PNG أو JPEG أو WebP", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result && typeof reader.result === "string") {
        avatarUploadMutation.mutate(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const generateAvatarMutation = useMutation({
    mutationFn: async (style: string) => {
      const res = await apiRequest("POST", "/api/profile/generate-avatar", { style });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "تم إنشاء الصورة الشخصية بنجاح" });
      setShowAvatarGenerator(false);
    },
    onError: (err: any) => {
      let msg = "فشل في إنشاء الصورة";
      try {
        const parsed = JSON.parse(err?.message?.replace(/^\d+:\s*/, "") || "{}");
        if (parsed.error) msg = parsed.error;
      } catch {}
      toast({ title: msg, variant: "destructive" });
    },
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({ firstName, lastName, displayName, bio, publicProfile });
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-md bg-primary flex items-center justify-center">
              <Feather className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
            </div>
            <span className="font-serif text-lg sm:text-xl font-bold">QalamAI</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
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
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => logout()} data-testid="button-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold mb-6 sm:mb-8" data-testid="text-profile-title">
          الملف الشخصي
        </h1>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()} data-testid="button-upload-avatar">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={user?.profileImageUrl || undefined} />
                    <AvatarFallback className="text-2xl">
                      {user?.firstName?.[0] || user?.email?.[0] || "م"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {avatarUploadMutation.isPending ? (
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : (
                      <Camera className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleAvatarChange}
                    data-testid="input-avatar-file"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setShowAvatarGenerator(!showAvatarGenerator)}
                  data-testid="button-toggle-ai-avatar"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  توليد صورة بالذكاء الاصطناعي
                </Button>
                {showAvatarGenerator && (
                  <div className="w-full space-y-3 p-3 border rounded-lg bg-muted/30" data-testid="panel-ai-avatar-generator">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Palette className="w-4 h-4 text-primary" />
                      اختر نمط الصورة
                    </div>
                    <Select value={avatarStyle} onValueChange={setAvatarStyle}>
                      <SelectTrigger data-testid="select-avatar-style">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="classic" data-testid="option-style-classic">كلاسيكي — لوحة زيتية</SelectItem>
                        <SelectItem value="modern" data-testid="option-style-modern">عصري — فن رقمي</SelectItem>
                        <SelectItem value="calligraphy" data-testid="option-style-calligraphy">خط عربي — زخارف إسلامية</SelectItem>
                        <SelectItem value="watercolor" data-testid="option-style-watercolor">ألوان مائية — فني</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      className="w-full gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
                      onClick={() => generateAvatarMutation.mutate(avatarStyle)}
                      disabled={generateAvatarMutation.isPending}
                      data-testid="button-generate-ai-avatar"
                    >
                      {generateAvatarMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          جاري التوليد...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          توليد الصورة
                        </>
                      )}
                    </Button>
                    <p className="text-[11px] text-muted-foreground text-center">
                      سيقوم أبو هاشم بتصميم صورة فنية فريدة لملفك الشخصي
                    </p>
                  </div>
                )}
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
                      <span className="upgrade-btn inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full cursor-pointer" data-testid="link-upgrade-plan">
                        <Crown className="w-3 h-3" />
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
                <h3 className="font-semibold">تعديل الملف الشخصي</h3>
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
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">اسم العرض العام</label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="الاسم الذي يظهر للزوار"
                    data-testid="input-display-name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">نبذة عنك</label>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="اكتب نبذة مختصرة عن نفسك..."
                    className="min-h-[80px]"
                    data-testid="input-bio"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <label className="text-sm">ملف شخصي عام</label>
                  </div>
                  <Switch
                    checked={publicProfile}
                    onCheckedChange={setPublicProfile}
                    data-testid="switch-public-profile"
                  />
                </div>
                {publicProfile && user && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    <span>صفحتك العامة: /author/{user.id}</span>
                  </div>
                )}
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
                                <LtrNum>{getProjectPriceUSD(project.pageCount)}</LtrNum> دولار
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
