import { ErrorBoundary } from "@/components/error-boundary";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useFeatures } from "@/hooks/use-features";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, BookOpen, Feather, LogOut, Clock, FileText, Lock, CreditCard, TicketCheck, ShieldCheck, PenTool, CheckCircle, Activity, Sun, Moon, Newspaper, Film, ChevronDown, AlignRight, Hash, Search, SlidersHorizontal, ArrowUpDown, X, Bell, CheckCheck, Sparkles, Download, List, BookMarked, BarChart3, Keyboard, MessageCircle, Lightbulb, Heart, Share2, MessageSquareQuote, Flame, Target, Trophy, Award, Loader2, ArrowRight, ImageIcon, GraduationCap, Users, BadgeCheck, TrendingUp, Eye, Send, PenLine, Layers, Coffee } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { NovelProject, Notification } from "@shared/schema";
import { getProjectPriceUSD } from "@shared/schema";
import { estimateReadingTime } from "@shared/utils";
import { useMemo, useState, useEffect, useRef, lazy, Suspense } from "react";
import LtrNum from "@/components/ui/ltr-num";
import { Crown } from "lucide-react";
import { ChallengeBanner } from "@/components/challenge-banner";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
const TrialPromptPopup = lazy(() => import("@/components/trial-prompt-popup").then(m => ({ default: m.TrialPromptPopup })));
const AbuHashimChat = lazy(() => import("@/components/abu-hashim-chat").then(m => ({ default: m.AbuHashimChat })));
const WritingStatsPanel = lazy(() => import("@/components/writing-stats-panel"));

interface WritingStreakData {
  streak: number;
  lastWritingDate: string | null;
  dailyWordGoal: number;
  todayWords: number;
}

const STREAK_MILESTONES = [
  { days: 3, label: "٣ أيام", icon: Flame },
  { days: 7, label: "أسبوع", icon: Trophy },
  { days: 14, label: "أسبوعان", icon: Award },
  { days: 30, label: "شهر", icon: Crown },
];

export default function Home() {
  useDocumentTitle("مشاريعي — قلم AI");
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isEnabled, getDisabledMessage } = useFeatures();
  const { data: projects, isLoading } = useQuery<NovelProject[]>({
    queryKey: ["/api/projects"],
  });

  const { data: planData } = useQuery<{ plan: string; planPurchasedAt: string | null }>({
    queryKey: ["/api/user/plan"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: freeUsageData } = useQuery<{
    plan: string;
    unlimited: boolean;
    projectsUsed?: number;
    projectsLimit?: number;
    generationsUsed?: number;
    generationsLimit?: number;
  }>({
    queryKey: ["/api/user/free-usage"],
    staleTime: 60 * 1000,
  });

  const { data: projectStats } = useQuery<Record<number, { realWordCount: number; realPageCount: number }>>({
    queryKey: ["/api/projects/stats"],
    enabled: !!projects && projects.length > 0,
    staleTime: 60 * 1000,
  });

  const { data: notifications, isLoading: isLoadingNotifications } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    staleTime: 30 * 1000,
  });

  const { data: unreadCountData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 60000,
    staleTime: 30 * 1000,
  });

  const { data: favorites } = useQuery<number[]>({
    queryKey: ["/api/favorites"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: streakData } = useQuery<WritingStreakData>({
    queryKey: ["/api/writing-streak"],
    staleTime: 60 * 1000,
  });

  const { data: referralData } = useQuery<{ referralCode: string; referralCount: number; bonusGenerations: number }>({
    queryKey: ["/api/me/referral"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: analyticsData } = useQuery<{
    totalViews: number; totalEssays: number; followerCount: number; totalReactions: number;
    topEssays: Array<{ id: number; title: string; shareToken: string | null; views: number; reactions: number }>;
    viewsThisMonth: number; followersThisMonth: number;
  }>({
    queryKey: ["/api/me/analytics"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: tipsReceivedData } = useQuery<{ totalCents: number; tips: Array<{
    id: number; fromUserName: string | null; fromUserImage: string | null;
    amountCents: number; status: string; createdAt: string; projectId: number | null;
  }> }>({
    queryKey: ["/api/tips/received"],
    staleTime: 2 * 60 * 1000,
  });
  const tipsReceived = tipsReceivedData?.tips;

  const { data: dailyPromptData } = useQuery<{
    prompt: { id: number; promptText: string; promptDate: string; winnerId: string | null } | null;
    entries: Array<{ id: number; userId: string; content: string; authorName: string; authorProfileImage: string | null }>;
    entryCount: number;
  }>({
    queryKey: ["/api/daily-prompt"],
    staleTime: 5 * 60 * 1000,
  });

  const [promptEntry, setPromptEntry] = useState("");
  const [promptSubmitted, setPromptSubmitted] = useState(false);

  const submitPromptMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/daily-prompt/entry", { promptId: dailyPromptData?.prompt?.id, content });
      return res.json();
    },
    onSuccess: () => {
      setPromptSubmitted(true);
      setPromptEntry("");
      queryClient.invalidateQueries({ queryKey: ["/api/daily-prompt"] });
    },
  });

  const [referralCopied, setReferralCopied] = useState(false);

  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalInput, setGoalInput] = useState("");

  const updateGoalMutation = useMutation({
    mutationFn: async (dailyWordGoal: number) => {
      const res = await apiRequest("PATCH", "/api/writing-streak/goal", { dailyWordGoal });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/writing-streak"] });
      setGoalDialogOpen(false);
    },
  });

  const favoritesSet = useMemo(() => new Set(favorites || []), [favorites]);

  const toggleFavoriteMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/favorite`);
      return res.json();
    },
    onMutate: async (projectId: number) => {
      await queryClient.cancelQueries({ queryKey: ["/api/favorites"] });
      const previousFavorites = queryClient.getQueryData<number[]>(["/api/favorites"]);
      queryClient.setQueryData<number[]>(["/api/favorites"], (old) => {
        const current = old || [];
        if (current.includes(projectId)) {
          return current.filter((id) => id !== projectId);
        }
        return [...current, projectId];
      });
      return { previousFavorites };
    },
    onError: (_err, _projectId, context) => {
      if (context?.previousFavorites) {
        queryClient.setQueryData(["/api/favorites"], context.previousFavorites);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
    },
  });

  const unreadCount = unreadCountData?.count ?? 0;

  const markAllReadMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const [desktopNotifOpen, setDesktopNotifOpen] = useState(false);
  const [mobileNotifOpen, setMobileNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [, navigate] = useLocation();

  const [onboardingStep, setOnboardingStep] = useState(1);
  const [selectedProjectType, setSelectedProjectType] = useState<string | null>(null);
  const showOnboarding = user && !user.onboardingCompleted;

  const onboardingMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/user/onboarding-complete"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [sortBy, setSortBy] = useState("date_desc");
  const [showWritingStats, setShowWritingStats] = useState(false);

  const { data: trialStatus } = useQuery<{ trialActive: boolean; trialUsed: boolean; trialEndsAt: string | null; plan: string }>({
    queryKey: ["/api/trial/status"],
    staleTime: 5 * 60 * 1000,
  });

  const [trialRemaining, setTrialRemaining] = useState<{ hours: number; minutes: number } | null>(null);

  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [welcomeType, setWelcomeType] = useState<"new" | "returning" | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const sessionKey = `qalamai_welcome_shown_${user.id}`;
    if (sessionStorage.getItem(sessionKey)) return;

    const lastLoginKey = `qalamai_last_login_${user.id}`;
    const lastLogin = localStorage.getItem(lastLoginKey);

    if (!lastLogin) {
      setWelcomeType("new");
    } else {
      setWelcomeType("returning");
    }
    setWelcomeOpen(true);
    sessionStorage.setItem(sessionKey, "1");
    localStorage.setItem(lastLoginKey, new Date().toISOString());
  }, [user?.id]);

  useEffect(() => {
    if (!welcomeOpen) return;
    const timer = setTimeout(() => setWelcomeOpen(false), 8000);
    return () => clearTimeout(timer);
  }, [welcomeOpen]);

  useEffect(() => {
    if (!trialStatus?.trialActive || !trialStatus?.trialEndsAt) {
      setTrialRemaining(null);
      return;
    }
    const update = () => {
      const diff = new Date(trialStatus.trialEndsAt!).getTime() - Date.now();
      if (diff <= 0) {
        setTrialRemaining(null);
        apiRequest("POST", "/api/trial/check-expiry").then(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/trial/status"] });
          queryClient.invalidateQueries({ queryKey: ["/api/user/plan"] });
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        });
        return;
      }
      setTrialRemaining({
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
      });
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [trialStatus]);

  const userPlan = planData?.plan || "free";
  const planLabel = userPlan === "all_in_one" ? "الخطة الشاملة" : userPlan === "essay" ? "خطة المقالات" : userPlan === "scenario" ? "خطة السيناريوهات" : userPlan === "trial" ? "تجربة مجانية" : null;

  const stats = useMemo(() => {
    if (!projects) return { total: 0, totalWords: 0, completed: 0, active: 0 };
    let totalWords = 0;
    if (projectStats) {
      totalWords = Object.values(projectStats).reduce((sum, s) => sum + s.realWordCount, 0);
    } else {
      totalWords = projects.reduce((sum, p) => sum + (p.usedWords || 0), 0);
    }
    return {
      total: projects.length,
      totalWords,
      completed: projects.filter((p) => p.status === "completed").length,
      active: projects.filter((p) => p.status !== "completed" && p.status !== "locked").length,
    };
  }, [projects, projectStats]);

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

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    let result = [...projects];

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter((p) => p.title.toLowerCase().includes(query));
    }

    if (filterType !== "all") {
      result = result.filter((p) => (p.projectType || "novel") === filterType);
    }

    if (filterStatus !== "all") {
      result = result.filter((p) => p.status === filterStatus);
    }

    if (filterFavorites) {
      result = result.filter((p) => favoritesSet.has(p.id));
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "date_asc":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "title_asc":
          return a.title.localeCompare(b.title, "ar");
        case "title_desc":
          return b.title.localeCompare(a.title, "ar");
        case "date_desc":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return result;
  }, [projects, searchQuery, filterType, filterStatus, filterFavorites, favoritesSet, sortBy]);

  const hasActiveFilters = searchQuery.trim() !== "" || filterType !== "all" || filterStatus !== "all" || filterFavorites || sortBy !== "date_desc";

  const statCards = [
    {
      id: "total-projects",
      label: "إجمالي المشاريع",
      value: stats.total,
      icon: BookOpen,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      id: "total-words",
      label: "إجمالي الكلمات",
      value: stats.totalWords.toLocaleString("ar-EG"),
      icon: PenTool,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-100 dark:bg-amber-900/30",
    },
    {
      id: "completed-novels",
      label: "مشاريع مكتملة",
      value: stats.completed,
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-100 dark:bg-green-900/30",
    },
    {
      id: "active-projects",
      label: "مشاريع نشطة",
      value: stats.active,
      icon: Activity,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-900/30",
    },
  ];

  const homeQuickQuestions = [
    "كيف أبدأ رواية جديدة؟",
    "اقترح فكرة لقصة قصيرة",
    "ما هي أفضل تقنيات السرد؟",
    "كيف أتغلب على حصار الكاتب؟",
    "اقترح موضوعاً لمقال",
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-md bg-primary flex items-center justify-center">
              <Feather className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
            </div>
            <span className="font-serif text-base sm:text-xl font-bold">QalamAI</span>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            <Link href="/gallery">
              <Button variant="ghost" size="sm" data-testid="link-gallery">
                <ImageIcon className="w-4 h-4 ml-1" />
                المعرض
              </Button>
            </Link>
            <Link href="/essays">
              <Button variant="ghost" size="sm" data-testid="link-essays">
                <Newspaper className="w-4 h-4 ml-1" />
                المقالات
              </Button>
            </Link>
            <Popover open={desktopNotifOpen} onOpenChange={setDesktopNotifOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications" aria-label="الإشعارات">
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -left-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1" data-testid="badge-unread-count">
                      {unreadCount > 99 ? "٩٩+" : unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" dir="rtl" className="w-80 p-0" data-testid="dropdown-notifications">
                <div className="flex items-center justify-between gap-2 p-3 border-b">
                  <span className="font-semibold text-sm">الإشعارات</span>
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAllReadMutation.mutate()}
                      disabled={markAllReadMutation.isPending}
                      data-testid="button-mark-all-read"
                    >
                      <CheckCheck className="w-3.5 h-3.5 ml-1" />
                      تعيين الكل كمقروء
                    </Button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {isLoadingNotifications ? (
                    <div className="space-y-0" data-testid="skeleton-notifications">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="p-3 border-b last:border-b-0 space-y-2" data-testid={`skeleton-notification-${i}`}>
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-2.5 w-1/3" />
                        </div>
                      ))}
                    </div>
                  ) : notifications && notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <a
                        key={notif.id}
                        href={notif.link || "#"}
                        className={`block p-3 border-b last:border-b-0 hover-elevate ${!notif.read ? "bg-primary/5" : ""}`}
                        data-testid={`notification-item-${notif.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium text-sm" data-testid={`notification-title-${notif.id}`}>{notif.title}</span>
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2" data-testid={`notification-message-${notif.id}`}>{notif.message}</p>
                        <span className="text-[10px] text-muted-foreground mt-1 block" data-testid={`notification-time-${notif.id}`}>
                          {new Date(notif.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </a>
                    ))
                  ) : (
                    <div className="p-6 text-center text-sm text-muted-foreground" data-testid="text-no-notifications">
                      لا توجد إشعارات
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <Link href="/reviews">
              <Button variant="ghost" size="sm" data-testid="link-reviews">
                <MessageSquareQuote className="w-4 h-4 ml-1" />
                آراء المستخدمين
              </Button>
            </Link>
            <Link href="/tickets">
              <Button variant="ghost" size="sm" data-testid="link-tickets">
                <TicketCheck className="w-4 h-4 ml-1" />
                تذاكر الدعم
              </Button>
            </Link>
            {user?.role === "admin" && (
              <Link href="/admin">
                <Button variant="ghost" size="sm" data-testid="link-admin">
                  <ShieldCheck className="w-4 h-4 ml-1" />
                  الإدارة
                </Button>
              </Link>
            )}
            <Link href="/profile">
              <div className="flex items-center gap-2 cursor-pointer" data-testid="link-profile">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.profileImageUrl || undefined} />
                  <AvatarFallback className="text-xs">
                    {user?.firstName?.[0] || user?.email?.[0] || "م"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium" data-testid="text-username">
                  {user?.firstName || user?.email || "مستخدم"}
                </span>
              </div>
            </Link>
            <Button variant="ghost" size="icon" onClick={() => logout()} data-testid="button-logout" aria-label="تسجيل الخروج">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex md:hidden items-center gap-1">
            <ThemeToggle />
            <Popover open={mobileNotifOpen} onOpenChange={setMobileNotifOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications-mobile" aria-label="الإشعارات">
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -left-0.5 min-w-[16px] h-[16px] rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-0.5" data-testid="badge-unread-count-mobile">
                      {unreadCount > 99 ? "٩٩+" : unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" dir="rtl" className="w-72 p-0" data-testid="dropdown-notifications-mobile">
                <div className="flex items-center justify-between gap-2 p-3 border-b">
                  <span className="font-semibold text-sm">الإشعارات</span>
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending} data-testid="button-mark-all-read-mobile">
                      <CheckCheck className="w-3.5 h-3.5 ml-1" />
                      مقروء
                    </Button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {isLoadingNotifications ? (
                    <div className="space-y-0" data-testid="skeleton-notifications-mobile">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="p-3 border-b last:border-b-0 space-y-1.5" data-testid={`skeleton-notification-mobile-${i}`}>
                          <Skeleton className="h-4 w-2/3" />
                          <Skeleton className="h-3 w-full" />
                        </div>
                      ))}
                    </div>
                  ) : notifications && notifications.length > 0 ? notifications.map((notif) => (
                    <a key={notif.id} href={notif.link || "#"} className={`block p-3 border-b last:border-b-0 ${!notif.read ? "bg-primary/5" : ""}`} data-testid={`notification-item-mobile-${notif.id}`}>
                      <span className="font-medium text-sm line-clamp-1">{notif.title}</span>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{notif.message}</p>
                    </a>
                  )) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">لا توجد إشعارات</div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" data-testid="button-mobile-menu" aria-label="القائمة">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" dir="rtl" className="w-64 p-0">
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b">
                    <Link href="/profile" onClick={() => setMobileMenuOpen(false)}>
                      <div className="flex items-center gap-3 cursor-pointer" data-testid="link-profile-mobile">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={user?.profileImageUrl || undefined} />
                          <AvatarFallback className="text-sm">
                            {user?.firstName?.[0] || user?.email?.[0] || "م"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{user?.firstName || user?.email || "مستخدم"}</div>
                          <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                        </div>
                      </div>
                    </Link>
                  </div>
                  <nav className="flex-1 p-2 space-y-1">
                    <Link href="/gallery" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start gap-2" data-testid="link-gallery-mobile">
                        <ImageIcon className="w-4 h-4" />
                        المعرض
                      </Button>
                    </Link>
                    <Link href="/essays" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start gap-2" data-testid="link-essays-mobile">
                        <Newspaper className="w-4 h-4" />
                        المقالات
                      </Button>
                    </Link>
                    <Link href="/reviews" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start gap-2" data-testid="link-reviews-mobile">
                        <MessageSquareQuote className="w-4 h-4" />
                        آراء المستخدمين
                      </Button>
                    </Link>
                    <Link href="/tickets" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start gap-2" data-testid="link-tickets-mobile">
                        <TicketCheck className="w-4 h-4" />
                        تذاكر الدعم
                      </Button>
                    </Link>
                    {user?.role === "admin" && (
                      <Link href="/admin" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start gap-2" data-testid="link-admin-mobile">
                          <ShieldCheck className="w-4 h-4" />
                          الإدارة
                        </Button>
                      </Link>
                    )}
                    <Link href="/profile" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start gap-2" data-testid="link-profile-mobile-nav">
                        <Feather className="w-4 h-4" />
                        الملف الشخصي
                      </Button>
                    </Link>
                  </nav>
                  <div className="p-3 border-t">
                    <Button variant="ghost" className="w-full justify-start gap-2 text-destructive" onClick={() => { setMobileMenuOpen(false); logout(); }} data-testid="button-logout-mobile">
                      <LogOut className="w-4 h-4" />
                      تسجيل الخروج
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <Suspense fallback={null}>
        <ErrorBoundary fallbackMode="inline" label="المساعد الأدبي">
          <AbuHashimChat mode="general" quickQuestions={homeQuickQuestions} />
        </ErrorBoundary>
      </Suspense>

      {trialRemaining && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 px-4 py-3" data-testid="banner-trial-countdown">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">
                متبقي <LtrNum>{trialRemaining.hours}</LtrNum> ساعة و <LtrNum>{trialRemaining.minutes}</LtrNum> دقيقة من الفترة التجريبية
              </span>
            </div>
            <Link href="/pricing">
              <Button size="sm" variant="outline" className="border-amber-400 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50" data-testid="button-trial-upgrade">
                <Crown className="w-3 h-3 ml-1" />
                ترقية الآن
              </Button>
            </Link>
          </div>
        </div>
      )}

      {userPlan === "free" && stats.total > 0 && (
        <div className="border-b bg-primary/5 px-4 py-3" data-testid="banner-upgrade">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-foreground">
              <Crown className="w-4 h-4 text-primary" />
              <span className="text-sm">أنت على الخطة المجانية — قم بالترقية لإنشاء محتوى غير محدود</span>
            </div>
            <Link href="/pricing">
              <Button size="sm" className="shrink-0" data-testid="button-upgrade-from-banner">
                اكتشف الخطط
              </Button>
            </Link>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold mb-2" data-testid="text-welcome">
              أهلاً {user?.firstName || ""}
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-muted-foreground">مشاريعك الإبداعية</p>
              {planLabel && (
                <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium" data-testid="text-user-plan">
                  <Crown className="w-3 h-3" />
                  {planLabel}
                </span>
              )}
              {userPlan === "free" && (
                <Link href="/pricing">
                  <span className="upgrade-btn inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full cursor-pointer" data-testid="link-upgrade-plan">
                    <Crown className="w-3 h-3" />
                    ترقية الخطة
                  </span>
                </Link>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button data-testid="button-new-project">
                <Plus className="w-4 h-4 ml-2" />
                مشروع جديد
                <ChevronDown className="w-3 h-3 mr-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" dir="rtl">
              {isEnabled("novel") ? (
                <Link href="/project/new">
                  <DropdownMenuItem data-testid="menu-new-novel">
                    <BookOpen className="w-4 h-4 ml-2" />
                    رواية جديدة
                  </DropdownMenuItem>
                </Link>
              ) : (
                <DropdownMenuItem disabled data-testid="menu-new-novel" title={getDisabledMessage("novel")}>
                  <BookOpen className="w-4 h-4 ml-2 opacity-50" />
                  <span className="opacity-50">رواية جديدة</span>
                  <span className="text-xs text-amber-500 mr-auto">قريباً</span>
                </DropdownMenuItem>
              )}
              {isEnabled("essay") ? (
                <Link href="/project/new/essay">
                  <DropdownMenuItem data-testid="menu-new-essay">
                    <Newspaper className="w-4 h-4 ml-2" />
                    مقال جديد
                  </DropdownMenuItem>
                </Link>
              ) : (
                <DropdownMenuItem disabled data-testid="menu-new-essay" title={getDisabledMessage("essay")}>
                  <Newspaper className="w-4 h-4 ml-2 opacity-50" />
                  <span className="opacity-50">مقال جديد</span>
                  <span className="text-xs text-amber-500 mr-auto">قريباً</span>
                </DropdownMenuItem>
              )}
              {isEnabled("scenario") ? (
                <Link href="/project/new/scenario">
                  <DropdownMenuItem data-testid="menu-new-scenario">
                    <Film className="w-4 h-4 ml-2" />
                    سيناريو جديد
                  </DropdownMenuItem>
                </Link>
              ) : (
                <DropdownMenuItem disabled data-testid="menu-new-scenario" title={getDisabledMessage("scenario")}>
                  <Film className="w-4 h-4 ml-2 opacity-50" />
                  <span className="opacity-50">سيناريو جديد</span>
                  <span className="text-xs text-amber-500 mr-auto">قريباً</span>
                </DropdownMenuItem>
              )}
              {isEnabled("short_story") ? (
                <Link href="/project/new/short-story">
                  <DropdownMenuItem data-testid="menu-new-short-story">
                    <PenTool className="w-4 h-4 ml-2" />
                    قصة قصيرة جديدة
                  </DropdownMenuItem>
                </Link>
              ) : (
                <DropdownMenuItem disabled data-testid="menu-new-short-story" title={getDisabledMessage("short_story")}>
                  <PenTool className="w-4 h-4 ml-2 opacity-50" />
                  <span className="opacity-50">قصة قصيرة جديدة</span>
                  <span className="text-xs text-amber-500 mr-auto">قريباً</span>
                </DropdownMenuItem>
              )}
              {isEnabled("khawater") ? (
                <Link href="/project/new/khawater">
                  <DropdownMenuItem data-testid="menu-new-khawater">
                    <Feather className="w-4 h-4 ml-2" />
                    خاطرة جديدة
                  </DropdownMenuItem>
                </Link>
              ) : (
                <DropdownMenuItem disabled data-testid="menu-new-khawater" title={getDisabledMessage("khawater")}>
                  <Feather className="w-4 h-4 ml-2 opacity-50" />
                  <span className="opacity-50">خاطرة جديدة</span>
                  <span className="text-xs text-amber-500 mr-auto">قريباً</span>
                </DropdownMenuItem>
              )}
              {isEnabled("social_media") ? (
                <Link href="/project/new/social-media">
                  <DropdownMenuItem data-testid="menu-new-social-media">
                    <Share2 className="w-4 h-4 ml-2" />
                    محتوى سوشيال ميديا
                  </DropdownMenuItem>
                </Link>
              ) : (
                <DropdownMenuItem disabled data-testid="menu-new-social-media" title={getDisabledMessage("social_media")}>
                  <Share2 className="w-4 h-4 ml-2 opacity-50" />
                  <span className="opacity-50">محتوى سوشيال ميديا</span>
                  <span className="text-xs text-amber-500 mr-auto">قريباً</span>
                </DropdownMenuItem>
              )}
              {isEnabled("poetry") ? (
                <Link href="/project/new?type=poetry">
                  <DropdownMenuItem data-testid="menu-new-poetry">
                    <BookMarked className="w-4 h-4 ml-2" />
                    قصيدة عمودية
                  </DropdownMenuItem>
                </Link>
              ) : (
                <DropdownMenuItem disabled data-testid="menu-new-poetry" title={getDisabledMessage("poetry")}>
                  <BookMarked className="w-4 h-4 ml-2 opacity-50" />
                  <span className="opacity-50">قصيدة عمودية</span>
                  <span className="text-xs text-amber-500 mr-auto">قريباً</span>
                </DropdownMenuItem>
              )}
              <Link href="/project/new/memoire">
                <DropdownMenuItem data-testid="menu-new-memoire">
                  <GraduationCap className="w-4 h-4 ml-2" />
                  مذكرة تخرج جديدة
                </DropdownMenuItem>
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {streakData && (
          <Card className="mb-6" data-testid="card-writing-streak">
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-md flex items-center justify-center shrink-0 ${streakData.streak > 0 ? "bg-amber-100 dark:bg-amber-900/30" : "bg-muted"}`}>
                    <Flame className={`w-6 h-6 ${streakData.streak > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-2xl font-bold" data-testid="text-streak-count">
                        <LtrNum>{streakData.streak}</LtrNum>
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {streakData.streak === 1 ? "يوم متتالي" : "أيام متتالية"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">حافظ على الكتابة يومياً لزيادة سلسلتك</p>
                  </div>
                </div>
                <Popover open={goalDialogOpen} onOpenChange={(open) => {
                  setGoalDialogOpen(open);
                  if (open) setGoalInput(String(streakData.dailyWordGoal));
                }}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" data-testid="button-set-daily-goal">
                      <Target className="w-3.5 h-3.5 ml-1" />
                      تعديل الهدف اليومي
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" dir="rtl" className="w-64" data-testid="popover-daily-goal">
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">الهدف اليومي (كلمات)</h4>
                      <Input
                        type="number"
                        min={100}
                        max={10000}
                        step={100}
                        value={goalInput}
                        onChange={(e) => setGoalInput(e.target.value)}
                        data-testid="input-daily-goal"
                      />
                      <div className="flex items-center gap-2 flex-wrap">
                        {[200, 500, 1000, 2000].map((v) => (
                          <Button
                            key={v}
                            variant="outline"
                            size="sm"
                            onClick={() => setGoalInput(String(v))}
                            data-testid={`button-goal-preset-${v}`}
                          >
                            <LtrNum>{v}</LtrNum>
                          </Button>
                        ))}
                      </div>
                      <Button
                        className="w-full"
                        size="sm"
                        disabled={updateGoalMutation.isPending || !goalInput || Number(goalInput) < 100 || Number(goalInput) > 10000}
                        onClick={() => updateGoalMutation.mutate(Number(goalInput))}
                        data-testid="button-save-daily-goal"
                      >
                        {updateGoalMutation.isPending ? "جارٍ الحفظ..." : "حفظ الهدف"}
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">تقدم اليوم</span>
                  <span className="font-medium" data-testid="text-today-progress">
                    <LtrNum>{streakData.todayWords.toLocaleString("ar-EG")}</LtrNum> / <LtrNum>{streakData.dailyWordGoal.toLocaleString("ar-EG")}</LtrNum> كلمة
                  </span>
                </div>
                <Progress
                  value={Math.min((streakData.todayWords / streakData.dailyWordGoal) * 100, 100)}
                  className="h-2.5 bg-amber-100 dark:bg-amber-900/30"
                  data-testid="progress-daily-words"
                />
                {streakData.todayWords >= streakData.dailyWordGoal && (
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1" data-testid="text-goal-achieved">
                    <CheckCircle className="w-3.5 h-3.5" />
                    أحسنت! لقد حققت هدفك اليومي
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 flex-wrap" data-testid="milestone-badges">
                {STREAK_MILESTONES.map((milestone) => {
                  const achieved = streakData.streak >= milestone.days;
                  const MilestoneIcon = milestone.icon;
                  return (
                    <div
                      key={milestone.days}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        achieved
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                          : "bg-muted text-muted-foreground"
                      }`}
                      data-testid={`badge-milestone-${milestone.days}`}
                    >
                      <MilestoneIcon className="w-3 h-3" />
                      {milestone.label}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Author Analytics Dashboard */}
        {analyticsData && (analyticsData.totalEssays > 0 || analyticsData.followerCount > 0) && (
          <Card className="mb-6" data-testid="card-author-analytics">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">إحصائيات المحتوى</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="bg-muted/50 rounded-lg p-3 text-center" data-testid="stat-total-views">
                  <div className="text-xl font-bold">{analyticsData.totalViews.toLocaleString("ar-EG")}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-0.5"><Eye className="w-3 h-3" />مشاهدة</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center" data-testid="stat-total-essays">
                  <div className="text-xl font-bold">{analyticsData.totalEssays}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">مقال منشور</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center" data-testid="stat-followers">
                  <div className="text-xl font-bold">{analyticsData.followerCount}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-0.5"><Users className="w-3 h-3" />متابع</div>
                </div>
                <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 text-center" data-testid="stat-views-month">
                  <div className="text-xl font-bold text-primary">{analyticsData.viewsThisMonth.toLocaleString("ar-EG")}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">مشاهدة هذا الشهر</div>
                </div>
              </div>
              {analyticsData.topEssays.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2 font-medium">أفضل المقالات</p>
                  <div className="space-y-1.5">
                    {analyticsData.topEssays.slice(0, 3).map((e, i) => (
                      <div key={e.id} className="flex items-center justify-between gap-2 text-sm" data-testid={`top-essay-${e.id}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-muted-foreground text-xs shrink-0">{i + 1}.</span>
                          {e.shareToken ? (
                            <Link href={`/essay/${e.shareToken}`} className="truncate hover:text-primary transition-colors">{e.title}</Link>
                          ) : (
                            <span className="truncate text-muted-foreground">{e.title}</span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                          <Eye className="w-3 h-3" />{e.views.toLocaleString("ar-EG")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tips Received */}
        {tipsReceived && tipsReceived.filter(t => t.status === "completed").length > 0 && (
          <Card className="mb-6 border-amber-200 dark:border-amber-800" data-testid="card-tips-received">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Coffee className="w-4 h-4 text-amber-600" />
                <h3 className="font-semibold text-sm">الدعم الذي تلقيته</h3>
                <span className="mr-auto text-xs text-amber-600 font-medium">
                  {(tipsReceived.filter(t => t.status === "completed").reduce((sum, t) => sum + t.amountCents, 0) / 100).toFixed(2)} USD
                </span>
              </div>
              <div className="space-y-2">
                {tipsReceived.filter(t => t.status === "completed").slice(0, 5).map((tip) => (
                  <div key={tip.id} className="flex items-center gap-3 text-sm" data-testid={`tip-row-${tip.id}`}>
                    <Avatar className="w-7 h-7 shrink-0">
                      <AvatarImage src={tip.fromUserImage || undefined} />
                      <AvatarFallback className="text-xs">{tip.fromUserName?.[0] ?? "?"}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate text-muted-foreground">{tip.fromUserName ?? "قارئ مجهول"}</span>
                    <span className="text-amber-600 font-medium shrink-0" dir="ltr">${(tip.amountCents / 100).toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(tip.createdAt).toLocaleDateString("ar-EG", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Challenge Banner */}
        <ChallengeBanner />

        {/* Daily Writing Prompt */}
        {dailyPromptData?.prompt && (
          <Card className="mb-6 border-violet-200 dark:border-violet-800" data-testid="card-daily-prompt">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <PenLine className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                <h3 className="font-semibold text-sm text-violet-700 dark:text-violet-300">تحدي الكتابة اليومي</h3>
                <span className="text-xs text-muted-foreground mr-auto">{new Date(dailyPromptData.prompt.promptDate).toLocaleDateString("ar-EG", { month: "long", day: "numeric" })}</span>
              </div>
              <p className="text-base font-serif leading-relaxed mb-4 text-foreground bg-violet-50/50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-900 rounded-lg p-3" data-testid="text-daily-prompt">
                {dailyPromptData.prompt.promptText}
              </p>
              {promptSubmitted ? (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium" data-testid="prompt-submitted-confirmation">
                  <CheckCircle className="w-4 h-4" />
                  تم إرسال إجابتك! شكراً على مشاركتك.
                </div>
              ) : (
                <div className="space-y-2">
                  <Textarea
                    placeholder="اكتب إجابتك هنا... (20 حرف على الأقل)"
                    value={promptEntry}
                    onChange={(e) => setPromptEntry(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    data-testid="textarea-prompt-entry"
                  />
                  <div className="flex items-center justify-between">
                    <Link href="/daily-prompt">
                      <span className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer">{dailyPromptData.entryCount} مشارك اليوم — عرض الكل</span>
                    </Link>
                    <Button
                      size="sm"
                      className="gap-1.5"
                      disabled={promptEntry.trim().length < 20 || submitPromptMutation.isPending}
                      onClick={() => submitPromptMutation.mutate(promptEntry.trim())}
                      data-testid="button-submit-prompt"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {submitPromptMutation.isPending ? "جارٍ الإرسال..." : "مشاركة"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Social Marketing AI — paid users only */}
        {["essay", "scenario", "all_in_one"].includes(userPlan) && (
          <Card className="mb-6 border-dashed" data-testid="card-social-marketing">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium">مستشار التسويق الأدبي</p>
                    <p className="text-xs text-muted-foreground">محتوى سوشيال ميديا جاهز لأعمالك — أبو هاشم</p>
                  </div>
                </div>
                <Link href="/social-marketing">
                  <Button variant="outline" size="sm" data-testid="button-social-marketing">ابدأ</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content Series Link */}
        <Card className="mb-6 border-dashed" data-testid="card-content-series">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">سلاسل المحتوى</p>
                  <p className="text-xs text-muted-foreground">رتّب أعمالك في سلاسل متعددة الأجزاء</p>
                </div>
              </div>
              <Link href="/series">
                <Button variant="outline" size="sm" data-testid="button-manage-series">إدارة السلاسل</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {freeUsageData && !freeUsageData.unlimited && (
          <Card className="mb-6 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20" data-testid="card-free-usage">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-3 flex-1 min-w-[200px]">
                  <h3 className="font-semibold text-sm">
                    حصتك المجانية الشهرية
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>المشاريع</span>
                        <span>{freeUsageData.projectsUsed ?? 0} / {freeUsageData.projectsLimit ?? 1}</span>
                      </div>
                      <Progress
                        value={((freeUsageData.projectsUsed ?? 0) / (freeUsageData.projectsLimit ?? 1)) * 100}
                        className="h-2"
                        data-testid="progress-free-projects"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>التوليدات</span>
                        <span>{freeUsageData.generationsUsed ?? 0} / {freeUsageData.generationsLimit ?? 2}</span>
                      </div>
                      <Progress
                        value={((freeUsageData.generationsUsed ?? 0) / (freeUsageData.generationsLimit ?? 2)) * 100}
                        className="h-2"
                        data-testid="progress-free-generations"
                      />
                    </div>
                  </div>
                </div>
                <Link href="/pricing">
                  <Button size="sm" className="shrink-0" data-testid="button-upgrade-free">
                    ترقية الآن
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {referralData && (
          <Card className="mb-6 border-primary/20 bg-primary/5 dark:bg-primary/10" data-testid="card-referral">
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">ادعُ أصدقاءك إلى QalamAI</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">عند تسجيل كل صديق برمزك، تحصل على <strong>توليدتين مجانيتين</strong> إضافيتين</p>
                  <p className="text-xs text-muted-foreground" data-testid="text-referral-stats">
                    أحلت <LtrNum>{referralData.referralCount}</LtrNum> {referralData.referralCount === 1 ? "شخص" : "أشخاص"} — <LtrNum>{referralData.bonusGenerations}</LtrNum> توليدة مكافأة
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div
                    className="flex-1 sm:flex-none px-3 py-1.5 bg-background border rounded-md font-mono text-sm font-bold tracking-widest text-primary min-w-[90px] text-center"
                    dir="ltr"
                    data-testid="text-referral-code"
                  >
                    {referralData.referralCode}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const url = `https://qalamai.net/register?ref=${referralData.referralCode}`;
                      try {
                        await navigator.clipboard.writeText(url);
                        setReferralCopied(true);
                        setTimeout(() => setReferralCopied(false), 2000);
                      } catch {}
                    }}
                    data-testid="button-copy-referral"
                  >
                    {referralCopied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
                    {referralCopied ? "تم النسخ" : "نسخ الرابط"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {user?.verified ? (
          <Card className="mb-6 border-[#1D9BF0]/40 bg-[#1D9BF0]/5" data-testid="card-verified-home">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <BadgeCheck className="w-8 h-8 text-[#1D9BF0] shrink-0" />
                  <div>
                    <h3 className="font-semibold text-sm">أنت كاتب موثّق</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">شارتك الزرقاء تظهر بجانب اسمك على جميع مقالاتك</p>
                  </div>
                </div>
                <Link href={`/author/${user.id}`}>
                  <Button size="sm" variant="outline" className="border-[#1D9BF0]/40 text-[#1D9BF0] hover:bg-[#1D9BF0]/10 shrink-0" data-testid="button-view-public-profile-home">
                    صفحتك العامة
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 border-dashed" data-testid="card-apply-verified">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <GraduationCap className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">احصل على شارة الكاتب الموثّق</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(!user?.plan || user.plan === "free" || user.plan === "trial")
                        ? "متاحة فقط لأصحاب الخطط المدفوعة"
                        : "كما في تويتر — شارة زرقاء بجانب اسمك في كل مكان"}
                    </p>
                  </div>
                </div>
                {(!user?.plan || user.plan === "free" || user.plan === "trial") ? (
                  <Link href="/pricing" className="shrink-0">
                    <Button size="sm" variant="outline" data-testid="button-upgrade-for-verified">
                      <Lock className="w-3.5 h-3.5 ml-1" />
                      ترقية الخطة
                    </Button>
                  </Link>
                ) : (
                  <Link href="/apply-verified" className="shrink-0">
                    <Button size="sm" data-testid="button-apply-verified">
                      تقديم طلب
                    </Button>
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { icon: BadgeCheck, label: "شارة زرقاء موثّقة", color: "text-[#1D9BF0]" },
                  { icon: Trophy, label: "تميّز في المتصدرين", color: "text-yellow-500" },
                  { icon: Users, label: "ثقة أكبر من القراء", color: "text-green-500" },
                  { icon: Award, label: "أولوية في مقال الأسبوع", color: "text-purple-500" },
                ].map(({ icon: Icon, label, color }) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${color}`} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {statCards.map((stat) => (
            <Card key={stat.id}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-md ${stat.bg} flex items-center justify-center shrink-0`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <div className="text-2xl font-bold" data-testid={`stat-value-${stat.id}`}>
                    {stat.value}
                  </div>
                  <div className="text-xs text-muted-foreground" data-testid={`stat-label-${stat.id}`}>
                    {stat.label}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowWritingStats(!showWritingStats)}
            className="gap-1.5 mb-4"
            data-testid="button-toggle-writing-stats"
          >
            <BarChart3 className="w-4 h-4" />
            {showWritingStats ? "إخفاء إحصائيات الكتابة" : "إحصائيات الكتابة التفصيلية"}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showWritingStats ? "rotate-180" : ""}`} />
          </Button>

          {showWritingStats && (
            <Suspense fallback={<div className="space-y-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-32 w-full" /></div>}>
              <WritingStatsPanel />
            </Suspense>
          )}
        </div>

        {projects && projects.length > 0 && (
          <Card className="mb-8">
            <CardContent className="p-4 space-y-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="ابحث في مشاريعك..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                  data-testid="input-search-projects"
                />
              </div>
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 sm:flex-wrap">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-muted-foreground shrink-0 hidden sm:block" />
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-full sm:w-[140px]" data-testid="select-filter-type">
                      <SelectValue placeholder="النوع" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="all">جميع الأنواع</SelectItem>
                      <SelectItem value="novel">رواية</SelectItem>
                      <SelectItem value="essay">مقال</SelectItem>
                      <SelectItem value="scenario">سيناريو</SelectItem>
                      <SelectItem value="short_story">قصة قصيرة</SelectItem>
                      <SelectItem value="khawater">خاطرة</SelectItem>
                      <SelectItem value="social_media">سوشيال ميديا</SelectItem>
                      <SelectItem value="poetry">قصيدة</SelectItem>
                      <SelectItem value="memoire">مذكرة تخرج</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full sm:w-[140px]" data-testid="select-filter-status">
                      <SelectValue placeholder="الحالة" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="all">جميع الحالات</SelectItem>
                      <SelectItem value="draft">مسودة</SelectItem>
                      <SelectItem value="outline">المخطط</SelectItem>
                      <SelectItem value="writing">قيد الكتابة</SelectItem>
                      <SelectItem value="completed">مكتمل</SelectItem>
                      <SelectItem value="locked">مقفل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-muted-foreground shrink-0 hidden sm:block" />
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full sm:w-[160px]" data-testid="select-sort-by">
                      <SelectValue placeholder="ترتيب حسب" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="date_desc">الأحدث أولاً</SelectItem>
                      <SelectItem value="date_asc">الأقدم أولاً</SelectItem>
                      <SelectItem value="title_asc">العنوان (أ-ي)</SelectItem>
                      <SelectItem value="title_desc">العنوان (ي-أ)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant={filterFavorites ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterFavorites((v) => !v)}
                  className="toggle-elevate"
                  data-testid="button-filter-favorites"
                >
                  <Heart className={`w-3.5 h-3.5 ml-1 ${filterFavorites ? "fill-current" : ""}`} />
                  المفضلة
                </Button>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setFilterType("all");
                      setFilterStatus("all");
                      setFilterFavorites(false);
                      setSortBy("date_desc");
                    }}
                    data-testid="button-clear-filters"
                  >
                    <X className="w-3 h-3 ml-1" />
                    مسح الفلاتر
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
        ) : projects && projects.length > 0 && filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Card key={project.id} className="cursor-pointer hover-elevate h-full relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 left-2 z-10"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFavoriteMutation.mutate(project.id);
                  }}
                  data-testid={`button-favorite-${project.id}`}
                  aria-label={favoritesSet.has(project.id) ? "إزالة من المفضلة" : "إضافة للمفضلة"}
                >
                  <Heart className={`w-4 h-4 ${favoritesSet.has(project.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                </Button>
                <Link href={`/project/${project.id}`}>
                <CardContent className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {(project.projectType === "essay") && <Newspaper className="w-4 h-4 text-blue-500 shrink-0" />}
                        {(project.projectType === "scenario") && <Film className="w-4 h-4 text-purple-500 shrink-0" />}
                        {(project.projectType === "poetry") && <BookMarked className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                        {(project.projectType === "memoire") && <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                        {(!project.projectType || project.projectType === "novel") && <BookOpen className="w-4 h-4 text-primary shrink-0" />}
                        <h3 className="font-serif text-lg font-semibold line-clamp-2 break-words" data-testid={`text-project-title-${project.id}`}>
                          {project.title}
                        </h3>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${statusColor(project.status, project.paid)}`} data-testid={`badge-status-${project.id}`}>
                        {!project.paid && <Lock className="w-3 h-3 inline ml-1" />}
                        {statusLabel(project.status, project.paid)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {project.projectType === "essay" ? "مقال" : project.projectType === "scenario" ? "سيناريو" : project.projectType === "short_story" ? "قصة قصيرة" : project.projectType === "khawater" ? "خاطرة" : project.projectType === "social_media" ? "سوشيال ميديا" : project.projectType === "poetry" ? "قصيدة" : project.projectType === "memoire" ? "مذكرة تخرج" : "رواية"}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {project.mainIdea}
                    </p>
                    {!project.paid && (
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="text-sm font-semibold text-primary" data-testid={`text-price-${project.id}`}>
                          <LtrNum>{getProjectPriceUSD(project.pageCount)}</LtrNum> دولار
                        </span>
                        <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                          <CreditCard className="w-3.5 h-3.5" />
                          إتمام الدفع
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 sm:gap-4 pt-2 text-[11px] sm:text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1" data-testid={`text-words-written-${project.id}`}>
                        <PenTool className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <LtrNum>{(projectStats?.[project.id]?.realWordCount ?? project.usedWords).toLocaleString()}</LtrNum> كلمة
                      </span>
                      <span className="flex items-center gap-1" data-testid={`text-pages-${project.id}`}>
                        <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        {projectStats?.[project.id] !== undefined
                          ? projectStats[project.id].realPageCount > 0
                            ? <><LtrNum>{projectStats[project.id].realPageCount}</LtrNum> صفحة</>
                            : "٠ صفحة"
                          : <><LtrNum>{project.pageCount}</LtrNum> صفحة</>}
                      </span>
                      {(projectStats?.[project.id]?.realWordCount ?? project.usedWords) > 0 && (
                        <span className="flex items-center gap-1 hidden sm:flex" data-testid={`text-reading-time-${project.id}`}>
                          <Clock className="w-3.5 h-3.5" />
                          <LtrNum>{estimateReadingTime(projectStats?.[project.id]?.realWordCount ?? project.usedWords)}</LtrNum> د قراءة
                        </span>
                      )}
                    </div>
                    {project.targetWordCount && project.targetWordCount > 0 && (() => {
                      const currentWords = projectStats?.[project.id]?.realWordCount ?? project.usedWords;
                      const progress = Math.min((currentWords / project.targetWordCount) * 100, 100);
                      const radius = 18;
                      const circumference = 2 * Math.PI * radius;
                      const strokeDashoffset = circumference - (progress / 100) * circumference;
                      return (
                        <div className="flex items-center gap-3 pt-2" data-testid={`progress-ring-${project.id}`}>
                          <div className="relative w-11 h-11 shrink-0">
                            <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
                              <circle cx="22" cy="22" r={radius} fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="3" />
                              <circle cx="22" cy="22" r={radius} fill="none" stroke="currentColor" className={progress >= 100 ? "text-green-500" : "text-primary"} strokeWidth="3" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} style={{ transition: "stroke-dashoffset 0.5s ease" }} />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold">
                              <LtrNum>{Math.round(progress)}</LtrNum>%
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <Target className="w-3 h-3 inline ml-1" />
                            <LtrNum>{currentWords.toLocaleString()}</LtrNum> / <LtrNum>{project.targetWordCount.toLocaleString()}</LtrNum> كلمة
                          </div>
                        </div>
                      );
                    })()}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(project.createdAt).toLocaleDateString("ar-EG")}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground pt-1 border-t" data-testid={`text-progress-${project.id}`}>
                      {project.status === "completed" || project.status === "finished"
                        ? "جميع الفصول مكتملة"
                        : project.status === "writing"
                          ? "الكتابة جارية"
                          : project.status === "outline"
                            ? "مرحلة التخطيط"
                            : project.status === "draft"
                              ? "مرحلة المسودة"
                              : "في الانتظار"}
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        ) : projects && projects.length > 0 && filteredProjects.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="font-serif text-xl font-semibold mb-2" data-testid="text-no-filter-results">لا توجد نتائج</h2>
            <p className="text-muted-foreground mb-4">لم يتم العثور على مشاريع تطابق معايير البحث أو الفلترة</p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setFilterType("all");
                setFilterStatus("all");
                setFilterFavorites(false);
                setSortBy("date_desc");
              }}
              data-testid="button-clear-filters-empty"
            >
              <X className="w-4 h-4 ml-1" />
              مسح الفلاتر
            </Button>
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-10 h-10 text-primary" />
            </div>
            <h2 className="font-serif text-2xl font-semibold mb-3">لا توجد مشاريع بعد</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              ابدأ بإنشاء مشروعك الأول — رواية، مقال، سيناريو، خاطرة، قصيدة، مذكرة تخرج، أو محتوى سوشيال ميديا. وسيساعدك أبو هاشم في الكتابة بأسلوب احترافي
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/project/new">
                <Button size="lg" data-testid="button-empty-new-novel">
                  <BookOpen className="w-4 h-4 ml-2" />
                  رواية جديدة
                </Button>
              </Link>
              <Link href="/project/new/essay">
                <Button size="lg" variant="outline" data-testid="button-empty-new-essay">
                  <Newspaper className="w-4 h-4 ml-2" />
                  مقال جديد
                </Button>
              </Link>
              <Link href="/project/new/scenario">
                <Button size="lg" variant="outline" data-testid="button-empty-new-scenario">
                  <Film className="w-4 h-4 ml-2" />
                  سيناريو جديد
                </Button>
              </Link>
              <Link href="/project/new/short-story">
                <Button size="lg" variant="outline" data-testid="button-empty-new-short-story">
                  <PenTool className="w-4 h-4 ml-2" />
                  قصة قصيرة جديدة
                </Button>
              </Link>
              <Link href="/project/new/khawater">
                <Button size="lg" variant="outline" data-testid="button-empty-new-khawater">
                  <Feather className="w-4 h-4 ml-2" />
                  خاطرة جديدة
                </Button>
              </Link>
              <Link href="/project/new/social-media">
                <Button size="lg" variant="outline" data-testid="button-empty-new-social-media">
                  <Share2 className="w-4 h-4 ml-2" />
                  محتوى سوشيال ميديا
                </Button>
              </Link>
              <Link href="/project/new?type=poetry">
                <Button size="lg" variant="outline" data-testid="button-empty-new-poetry">
                  <BookMarked className="w-4 h-4 ml-2" />
                  قصيدة عمودية
                </Button>
              </Link>
              <Link href="/project/new/memoire">
                <Button size="lg" variant="outline" data-testid="button-empty-new-memoire">
                  <GraduationCap className="w-4 h-4 ml-2" />
                  مذكرة تخرج جديدة
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>

      <Dialog open={!!showOnboarding} onOpenChange={(open) => { if (!open) onboardingMutation.mutate(); }}>
        <DialogContent dir="rtl" className="max-w-xl" data-testid="dialog-onboarding">
          <div className="w-full bg-muted rounded-full h-1.5 mb-2" data-testid="onboarding-progress-bar">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(onboardingStep / 4) * 100}%` }}
            />
          </div>
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="font-serif text-2xl" data-testid="text-onboarding-title">
              {onboardingStep === 1 && "مرحباً بك في QalamAI"}
              {onboardingStep === 2 && "اختر نوع مشروعك"}
              {onboardingStep === 3 && "جولة سريعة"}
              {onboardingStep === 4 && "أنت جاهز!"}
            </DialogTitle>
            <DialogDescription data-testid="text-onboarding-description">
              {onboardingStep === 1 && "منصة الكتابة الإبداعية بالذكاء الاصطناعي"}
              {onboardingStep === 2 && "حدد نوع المشروع الذي تريد البدء به"}
              {onboardingStep === 3 && "تعرّف على أهم مزايا لوحة التحكم"}
              {onboardingStep === 4 && "نصائح سريعة لبدء رحلتك الإبداعية"}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4" data-testid={`onboarding-step-${onboardingStep}`}>
            {onboardingStep === 1 && (
              <div className="text-center space-y-4">
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 rounded-2xl bg-primary/10 animate-pulse" />
                  <div className="relative w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Avatar className="w-14 h-14">
                      <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold font-serif">
                        هـ
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                  QalamAI هي منصتك الذكية للكتابة الإبداعية باللغة العربية.
                  يساعدك أبو هاشم — مساعد الكتابة بالذكاء الاصطناعي — في تأليف الروايات والمقالات والسيناريوهات بأسلوب احترافي وسلس.
                </p>
                <div className="flex items-center justify-center gap-2 text-sm font-medium text-primary">
                  <MessageCircle className="w-4 h-4" />
                  <span>أبو هاشم — رفيقك في الكتابة</span>
                </div>
                <div className="bg-muted/50 rounded-md p-3 max-w-sm mx-auto">
                  <p className="text-xs text-muted-foreground leading-relaxed" data-testid="text-onboarding-tip-1">
                    <Sparkles className="w-3.5 h-3.5 inline ml-1 text-primary" />
                    ما يميز QalamAI: ذكاء اصطناعي مُدرَّب خصيصاً على الأدب العربي، يفهم البلاغة والأساليب الأدبية العربية لمساعدتك في إنتاج نصوص عالية الجودة.
                  </p>
                </div>
              </div>
            )}

            {onboardingStep === 2 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Card
                  className={`cursor-pointer transition-shadow hover:shadow-lg ${selectedProjectType === "novel" ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setSelectedProjectType("novel")}
                  data-testid="card-project-type-novel"
                >
                  <CardContent className="p-4 text-center space-y-2">
                    <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mx-auto">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <h4 className="font-semibold text-sm">رواية</h4>
                    <p className="text-xs text-muted-foreground">فصول مترابطة، شخصيات، حبكة كاملة</p>
                  </CardContent>
                </Card>
                <Card
                  className={`cursor-pointer transition-shadow hover:shadow-lg ${selectedProjectType === "essay" ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setSelectedProjectType("essay")}
                  data-testid="card-project-type-essay"
                >
                  <CardContent className="p-4 text-center space-y-2">
                    <div className="w-10 h-10 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto">
                      <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h4 className="font-semibold text-sm">مقال</h4>
                    <p className="text-xs text-muted-foreground">مقالات منظمة بأقسام وفقرات</p>
                  </CardContent>
                </Card>
                <Card
                  className={`cursor-pointer transition-shadow hover:shadow-lg ${selectedProjectType === "scenario" ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setSelectedProjectType("scenario")}
                  data-testid="card-project-type-scenario"
                >
                  <CardContent className="p-4 text-center space-y-2">
                    <div className="w-10 h-10 rounded-md bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto">
                      <Film className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h4 className="font-semibold text-sm">سيناريو</h4>
                    <p className="text-xs text-muted-foreground">مشاهد، حوارات، توجيهات إخراجية</p>
                  </CardContent>
                </Card>
                <Card
                  className={`cursor-pointer transition-shadow hover:shadow-lg ${selectedProjectType === "short_story" ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setSelectedProjectType("short_story")}
                  data-testid="card-project-type-short-story"
                >
                  <CardContent className="p-4 text-center space-y-2">
                    <div className="w-10 h-10 rounded-md bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
                      <PenTool className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h4 className="font-semibold text-sm">قصة قصيرة</h4>
                    <p className="text-xs text-muted-foreground">سرد مكثف ومؤثر بحبكة محكمة</p>
                  </CardContent>
                </Card>
                <Card
                  className={`cursor-pointer transition-shadow hover:shadow-lg ${selectedProjectType === "khawater" ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setSelectedProjectType("khawater")}
                  data-testid="card-project-type-khawater"
                >
                  <CardContent className="p-4 text-center space-y-2">
                    <div className="w-10 h-10 rounded-md bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mx-auto">
                      <Feather className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <h4 className="font-semibold text-sm">خاطرة</h4>
                    <p className="text-xs text-muted-foreground">تأملات أدبية وخواطر عميقة</p>
                  </CardContent>
                </Card>
                <Card
                  className={`cursor-pointer transition-shadow hover:shadow-lg ${selectedProjectType === "social_media" ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setSelectedProjectType("social_media")}
                  data-testid="card-project-type-social-media"
                >
                  <CardContent className="p-4 text-center space-y-2">
                    <div className="w-10 h-10 rounded-md bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mx-auto">
                      <Share2 className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                    </div>
                    <h4 className="font-semibold text-sm">سوشيال ميديا</h4>
                    <p className="text-xs text-muted-foreground">محتوى منصات التواصل الاجتماعي</p>
                  </CardContent>
                </Card>
                <Card
                  className={`cursor-pointer transition-shadow hover:shadow-lg ${selectedProjectType === "poetry" ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setSelectedProjectType("poetry")}
                  data-testid="card-project-type-poetry"
                >
                  <CardContent className="p-4 text-center space-y-2">
                    <div className="w-10 h-10 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
                      <BookMarked className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h4 className="font-semibold text-sm">قصيدة</h4>
                    <p className="text-xs text-muted-foreground">شعر عمودي بأوزان وقوافٍ</p>
                  </CardContent>
                </Card>
                <Card
                  className={`cursor-pointer transition-shadow hover:shadow-lg ${selectedProjectType === "memoire" ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setSelectedProjectType("memoire")}
                  data-testid="card-project-type-memoire"
                >
                  <CardContent className="p-4 text-center space-y-2">
                    <div className="w-10 h-10 rounded-md bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mx-auto">
                      <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h4 className="font-semibold text-sm">مذكرة تخرج</h4>
                    <p className="text-xs text-muted-foreground">بحث أكاديمي بمعايير جامعية</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {onboardingStep === 3 && (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <List className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-0.5">قائمة المشاريع</h4>
                    <p className="text-xs text-muted-foreground">تابع جميع مشاريعك الإبداعية من مكان واحد مع إحصائيات تفصيلية</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-md bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                    <PenTool className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-0.5">أدوات الكتابة</h4>
                    <p className="text-xs text-muted-foreground">استخدم أبو هاشم لتوليد المخططات والفصول والتحرير بمساعدة الذكاء الاصطناعي</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                    <Download className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-0.5">التصدير والنشر</h4>
                    <p className="text-xs text-muted-foreground">صدّر مشاريعك بصيغة PDF جاهزة للطباعة أو النشر الرقمي</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                    <BookMarked className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-0.5">الفهرس والمسرد</h4>
                    <p className="text-xs text-muted-foreground">أنشئ فهارس ومسارد تلقائية لشخصياتك وأماكنك ومصطلحاتك</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-md bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-0.5">تحليل الأسلوب</h4>
                    <p className="text-xs text-muted-foreground">احصل على تحليل لأسلوبك الأدبي مع اقتراحات لتحسين النص وتقوية السرد</p>
                  </div>
                </div>
              </div>
            )}

            {onboardingStep === 4 && (
              <div className="space-y-4">
                <div className="text-center mb-2">
                  <div className="w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-7 h-7 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                    أنت الآن مستعد لبدء الكتابة! إليك بعض النصائح المفيدة:
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 bg-muted/50 rounded-md p-3">
                    <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-xs mb-0.5" data-testid="text-tip-abu-hashim">استخدام أبو هاشم</h4>
                      <p className="text-xs text-muted-foreground">افتح محادثة أبو هاشم من داخل أي فصل لطلب المساعدة في الكتابة أو التعديل أو توليد الأفكار. كلما كانت تعليماتك أوضح، كانت النتائج أفضل.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-muted/50 rounded-md p-3">
                    <Keyboard className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-xs mb-0.5" data-testid="text-tip-workflow">سير العمل المُقترح</h4>
                      <p className="text-xs text-muted-foreground">ابدأ بكتابة الفكرة الرئيسية، ثم اطلب من أبو هاشم توليد المخطط، وبعدها انتقل لكتابة الفصول واحداً تلو الآخر.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-muted/50 rounded-md p-3">
                    <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-xs mb-0.5" data-testid="text-tip-export">نصيحة احترافية</h4>
                      <p className="text-xs text-muted-foreground">استخدم ميزة تحليل الأسلوب بعد كتابة كل فصل للحصول على ملاحظات فورية لتحسين جودة النص.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`w-2 h-2 rounded-full transition-colors ${s === onboardingStep ? "bg-primary" : "bg-muted"}`}
                  data-testid={`onboarding-dot-${s}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="link"
                size="sm"
                className="text-muted-foreground"
                onClick={() => onboardingMutation.mutate()}
                data-testid="button-onboarding-skip"
              >
                تخطي
              </Button>
              {onboardingStep > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOnboardingStep((s) => s - 1)}
                  data-testid="button-onboarding-back"
                >
                  السابق
                </Button>
              )}
              {onboardingStep < 4 ? (
                <Button
                  size="sm"
                  onClick={() => setOnboardingStep((s) => s + 1)}
                  data-testid="button-onboarding-next"
                >
                  التالي
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    onboardingMutation.mutate();
                    if (selectedProjectType) {
                      const routes: Record<string, string> = {
                        novel: "/project/new",
                        essay: "/project/new/essay",
                        scenario: "/project/new/scenario",
                        short_story: "/project/new/short-story",
                        khawater: "/project/new/khawater",
                        social_media: "/project/new/social-media",
                        poetry: "/project/new?type=poetry",
                        memoire: "/project/new/memoire",
                      };
                      navigate(routes[selectedProjectType]);
                    }
                  }}
                  disabled={onboardingMutation.isPending}
                  data-testid="button-onboarding-start"
                >
                  <Sparkles className="w-4 h-4 ml-2" />
                  ابدأ الآن
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={welcomeOpen} onOpenChange={setWelcomeOpen}>
        <DialogContent dir="rtl" className="max-w-md" data-testid="dialog-welcome">
          <DialogHeader className="text-center sm:text-center">
            <div className="flex justify-center mb-3">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center animate-bounce">
                <Sparkles className="w-8 h-8 text-amber-500" />
              </div>
            </div>
            <DialogTitle className="font-serif text-2xl" data-testid="text-welcome-title">
              {welcomeType === "new" ? "أهلاً وسهلاً بك في قلم AI!" : "مرحباً بعودتك!"}
            </DialogTitle>
            <DialogDescription data-testid="text-welcome-description">
              {welcomeType === "new"
                ? "يسعدنا انضمامك إلينا! رحلتك الإبداعية تبدأ الآن مع أبو هاشم، مساعدك الذكي في الكتابة العربية."
                : "اشتقنا لك! نحن سعداء بعودتك لمواصلة رحلتك الإبداعية."}
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-4" data-testid="welcome-content">
            {welcomeType === "new" ? (
              <div className="space-y-3">
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-4 text-center">
                  <Feather className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm leading-relaxed">
                    ابدأ بإنشاء مشروعك الأول — رواية، مقال، سيناريو، أو قصة قصيرة — وسيرافقك أبو هاشم في كل خطوة من خطوات الكتابة.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>جرّب محادثة أبو هاشم من الزر الذهبي في أسفل الشاشة</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {streakData && streakData.streak > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-4 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                      <Flame className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                      <div className="font-bold text-lg" data-testid="text-welcome-streak">
                        <LtrNum>{streakData.streak}</LtrNum> {streakData.streak === 1 ? "يوم متتالي" : "أيام متتالية"}
                      </div>
                      <p className="text-xs text-muted-foreground">حافظ على سلسلتك! واصل الكتابة اليوم</p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-md p-3 text-center">
                    <div className="text-lg font-bold" data-testid="text-welcome-projects">
                      <LtrNum>{stats.total}</LtrNum>
                    </div>
                    <div className="text-xs text-muted-foreground">مشروع</div>
                  </div>
                  <div className="bg-muted/50 rounded-md p-3 text-center">
                    <div className="text-lg font-bold" data-testid="text-welcome-words">
                      <LtrNum>{stats.totalWords.toLocaleString("ar-EG")}</LtrNum>
                    </div>
                    <div className="text-xs text-muted-foreground">كلمة</div>
                  </div>
                </div>
                <p className="text-sm text-center text-muted-foreground">
                  واصل إبداعك — كل كلمة تكتبها تقرّبك من حلمك الأدبي
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-center pt-1">
            <Button onClick={() => setWelcomeOpen(false)} data-testid="button-welcome-close">
              {welcomeType === "new" ? "هيا نبدأ!" : "متابعة الكتابة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Suspense fallback={null}>
        <TrialPromptPopup
          userPlan={userPlan}
          trialUsed={trialStatus?.trialUsed ?? true}
        />
      </Suspense>
    </div>
  );
}
