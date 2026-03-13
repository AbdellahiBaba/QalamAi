import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
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
  BadgeCheck,
  CheckCircle2,
  GraduationCap,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiX, SiInstagram, SiTiktok, SiFacebook, SiLinkedin, SiYoutube } from "react-icons/si";
import type { NovelProject } from "@shared/schema";
import { getProjectPriceUSD } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import LtrNum from "@/components/ui/ltr-num";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [socialTwitter, setSocialTwitter] = useState("");
  const [socialInstagram, setSocialInstagram] = useState("");
  const [socialTiktok, setSocialTiktok] = useState("");
  const [socialFacebook, setSocialFacebook] = useState("");
  const [socialLinkedin, setSocialLinkedin] = useState("");
  const [socialYoutube, setSocialYoutube] = useState("");
  const [socialWebsite, setSocialWebsite] = useState("");
  const [avatarStyle, setAvatarStyle] = useState("classic");
  const [showAvatarGenerator, setShowAvatarGenerator] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const initialValuesRef = useRef({ firstName: "", lastName: "", displayName: "", bio: "", publicProfile: false, socialTwitter: "", socialInstagram: "", socialTiktok: "", socialFacebook: "", socialLinkedin: "", socialYoutube: "", socialWebsite: "" });

  useEffect(() => {
    if (user) {
      let sp: Record<string, string> = {};
      try { if ((user as any).socialProfiles) sp = JSON.parse((user as any).socialProfiles); } catch {}
      const vals = {
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        displayName: (user as any).displayName || "",
        bio: (user as any).bio || "",
        publicProfile: (user as any).publicProfile || false,
        socialTwitter: sp.twitter || "",
        socialInstagram: sp.instagram || "",
        socialTiktok: sp.tiktok || "",
        socialFacebook: sp.facebook || "",
        socialLinkedin: sp.linkedin || "",
        socialYoutube: sp.youtube || "",
        socialWebsite: sp.website || "",
      };
      setFirstName(vals.firstName);
      setLastName(vals.lastName);
      setDisplayName(vals.displayName);
      setBio(vals.bio);
      setPublicProfile(vals.publicProfile);
      setSocialTwitter(vals.socialTwitter);
      setSocialInstagram(vals.socialInstagram);
      setSocialTiktok(vals.socialTiktok);
      setSocialFacebook(vals.socialFacebook);
      setSocialLinkedin(vals.socialLinkedin);
      setSocialYoutube(vals.socialYoutube);
      setSocialWebsite(vals.socialWebsite);
      initialValuesRef.current = vals;
    }
  }, [user]);

  const BIO_MAX_LENGTH = 500;

  const hasUnsavedChanges = useCallback(() => {
    const init = initialValuesRef.current;
    return (
      firstName !== init.firstName ||
      lastName !== init.lastName ||
      displayName !== init.displayName ||
      bio !== init.bio ||
      publicProfile !== init.publicProfile ||
      socialTwitter !== init.socialTwitter ||
      socialInstagram !== init.socialInstagram ||
      socialTiktok !== init.socialTiktok ||
      socialFacebook !== init.socialFacebook ||
      socialLinkedin !== init.socialLinkedin ||
      socialYoutube !== init.socialYoutube ||
      socialWebsite !== init.socialWebsite
    );
  }, [firstName, lastName, displayName, bio, publicProfile, socialTwitter, socialInstagram, socialTiktok, socialFacebook, socialLinkedin, socialYoutube, socialWebsite]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  const handleNavigation = useCallback((href: string) => {
    if (hasUnsavedChanges()) {
      setPendingNavigation(href);
      setShowUnsavedDialog(true);
      return false;
    }
    return true;
  }, [hasUnsavedChanges]);

  const confirmNavigation = useCallback(() => {
    if (pendingNavigation) {
      setShowUnsavedDialog(false);
      if (pendingNavigation === "__logout__") {
        logout();
      } else {
        setLocation(pendingNavigation);
      }
      setPendingNavigation(null);
    }
  }, [pendingNavigation, setLocation, logout]);

  const cancelNavigation = useCallback(() => {
    setShowUnsavedDialog(false);
    setPendingNavigation(null);
  }, []);

  const { data: projects, isLoading: projectsLoading } = useQuery<NovelProject[]>({
    queryKey: ["/api/projects"],
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; displayName?: string; bio?: string; publicProfile?: boolean; socialProfiles?: string }) => {
      const res = await apiRequest("PATCH", "/api/profile", data);
      return res.json();
    },
    onSuccess: () => {
      initialValuesRef.current = { firstName, lastName, displayName, bio, publicProfile, socialTwitter, socialInstagram, socialTiktok, socialFacebook, socialLinkedin, socialYoutube, socialWebsite };
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
      } catch (parseErr) {
        console.warn("Failed to parse avatar upload error:", parseErr);
      }
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
      } catch (parseErr) {
        console.warn("Failed to parse avatar generation error:", parseErr);
      }
      toast({ title: msg, variant: "destructive" });
    },
  });

  const handleSaveProfile = () => {
    const sp: Record<string, string> = {};
    if (socialTwitter.trim()) sp.twitter = socialTwitter.trim();
    if (socialInstagram.trim()) sp.instagram = socialInstagram.trim();
    if (socialTiktok.trim()) sp.tiktok = socialTiktok.trim();
    if (socialFacebook.trim()) sp.facebook = socialFacebook.trim();
    if (socialLinkedin.trim()) sp.linkedin = socialLinkedin.trim();
    if (socialYoutube.trim()) sp.youtube = socialYoutube.trim();
    if (socialWebsite.trim()) sp.website = socialWebsite.trim();
    const socialProfiles = Object.keys(sp).length > 0 ? JSON.stringify(sp) : "";
    updateProfileMutation.mutate({ firstName, lastName, displayName, bio, publicProfile, socialProfiles });
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
            <Button variant="ghost" size="sm" data-testid="link-home" onClick={(e) => { e.preventDefault(); if (handleNavigation("/")) setLocation("/"); }}>
              <Home className="w-4 h-4 ml-1" />
              <span className="hidden sm:inline">الرئيسية</span>
            </Button>
            <Button variant="ghost" size="sm" data-testid="link-tickets" onClick={(e) => { e.preventDefault(); if (handleNavigation("/tickets")) setLocation("/tickets"); }}>
              <TicketCheck className="w-4 h-4 ml-1" />
              <span className="hidden sm:inline">تذاكر الدعم</span>
            </Button>
            {user?.role === "admin" && (
              <Button variant="ghost" size="sm" data-testid="link-admin" onClick={(e) => { e.preventDefault(); if (handleNavigation("/admin")) setLocation("/admin"); }}>
                <ShieldCheck className="w-4 h-4 ml-1" />
                <span className="hidden sm:inline">الإدارة</span>
              </Button>
            )}
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => {
              if (hasUnsavedChanges()) {
                setPendingNavigation("__logout__");
                setShowUnsavedDialog(true);
              } else {
                logout();
              }
            }} data-testid="button-logout" aria-label="تسجيل الخروج">
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
                  <div className="flex items-center justify-center gap-2">
                    <h2 className="font-serif text-xl font-semibold" data-testid="text-user-name">
                      {user?.firstName || ""} {user?.lastName || ""}
                    </h2>
                    {user?.verified && (
                      <BadgeCheck className="w-6 h-6 text-[#1D9BF0] shrink-0" title="كاتب موثّق" data-testid="badge-profile-verified" />
                    )}
                  </div>
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

            {user?.verified ? (
              <Card className="border-[#1D9BF0]/40 bg-[#1D9BF0]/5" data-testid="card-verified-status">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="w-6 h-6 text-[#1D9BF0] shrink-0" />
                    <span className="font-semibold text-sm">كاتب موثّق</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    شارتك الزرقاء تظهر بجانب اسمك على جميع مقالاتك، في لوحة المتصدرين، وعلى صفحتك العامة.
                  </p>
                  <Link href={`/author/${user.id}`}>
                    <Button variant="outline" size="sm" className="w-full gap-1.5 border-[#1D9BF0]/40 text-[#1D9BF0] hover:bg-[#1D9BF0]/10" data-testid="button-view-public-profile">
                      <ExternalLink className="w-3.5 h-3.5" />
                      استعرض صفحتك العامة
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed" data-testid="card-apply-verified-profile">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <GraduationCap className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">احصل على شارة الكاتب الموثّق</p>
                      <p className="text-[11px] text-muted-foreground">
                        {(user?.role === "admin" || (user?.plan && user.plan !== "free" && user.plan !== "trial"))
                          ? "تظهر بجانب اسمك في كل مكان"
                          : "متاحة فقط لأصحاب الخطط المدفوعة"}
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-1.5">
                    {[
                      "شارة زرقاء كما في تويتر بجانب اسمك",
                      "ظهور مميّز في لوحة المتصدرين",
                      "تعزيز ثقة القراء بمحتواك",
                      "أولوية في قسم مقال الأسبوع",
                    ].map((benefit) => (
                      <li key={benefit} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                  {(user?.role === "admin" || (user?.plan && user.plan !== "free" && user.plan !== "trial")) ? (
                    <Link href="/apply-verified">
                      <Button size="sm" className="w-full gap-1.5" data-testid="button-apply-verified-profile">
                        <BadgeCheck className="w-4 h-4" />
                        تقديم طلب التوثيق
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/pricing">
                      <Button size="sm" variant="outline" className="w-full gap-1.5" data-testid="button-upgrade-for-verified-profile">
                        <Lock className="w-4 h-4" />
                        ترقية الخطة للحصول على الشارة
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            )}

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
                    onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX_LENGTH))}
                    maxLength={BIO_MAX_LENGTH}
                    placeholder="اكتب نبذة مختصرة عن نفسك..."
                    className="min-h-[80px]"
                    data-testid="input-bio"
                  />
                  <p className="text-xs text-muted-foreground text-left" dir="ltr" data-testid="text-bio-counter">
                    {bio.length}/{BIO_MAX_LENGTH}
                  </p>
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

                <div className="space-y-3 pt-2 border-t border-border/50">
                  <p className="text-sm font-semibold text-muted-foreground">حسابات التواصل الاجتماعي</p>
                  <div className="grid grid-cols-1 gap-3">
                    {([
                      { icon: SiX, label: "تويتر / X", val: socialTwitter, set: setSocialTwitter, ph: "https://x.com/username", id: "twitter" },
                      { icon: SiInstagram, label: "إنستغرام", val: socialInstagram, set: setSocialInstagram, ph: "https://instagram.com/username", id: "instagram" },
                      { icon: SiTiktok, label: "تيك توك", val: socialTiktok, set: setSocialTiktok, ph: "https://tiktok.com/@username", id: "tiktok" },
                      { icon: SiFacebook, label: "فيسبوك", val: socialFacebook, set: setSocialFacebook, ph: "https://facebook.com/username", id: "facebook" },
                      { icon: SiLinkedin, label: "لينكدإن", val: socialLinkedin, set: setSocialLinkedin, ph: "https://linkedin.com/in/username", id: "linkedin" },
                      { icon: SiYoutube, label: "يوتيوب", val: socialYoutube, set: setSocialYoutube, ph: "https://youtube.com/@channel", id: "youtube" },
                      { icon: Globe, label: "الموقع الشخصي", val: socialWebsite, set: setSocialWebsite, ph: "https://yourwebsite.com", id: "website" },
                    ] as const).map(({ icon: Icon, label, val, set, ph, id }) => (
                      <div key={id} className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <Input
                          value={val}
                          onChange={(e) => set(e.target.value)}
                          placeholder={ph}
                          dir="ltr"
                          className="text-sm"
                          data-testid={`input-social-${id}`}
                        />
                      </div>
                    ))}
                  </div>
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

      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent dir="rtl" data-testid="dialog-unsaved-changes">
          <AlertDialogHeader>
            <AlertDialogTitle>تغييرات غير محفوظة</AlertDialogTitle>
            <AlertDialogDescription>
              لديك تعديلات لم يتم حفظها. هل تريد المغادرة بدون حفظ؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel onClick={cancelNavigation} data-testid="button-cancel-navigation">
              البقاء
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmNavigation} data-testid="button-confirm-navigation">
              مغادرة بدون حفظ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
