import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, BookOpen, Feather, LogOut, Clock, FileText, Lock, CreditCard, TicketCheck, ShieldCheck, PenTool, CheckCircle, Activity, Sun, Moon, Newspaper, Film, ChevronDown, AlignRight, Hash, Search, SlidersHorizontal, ArrowUpDown, X, Bell, CheckCheck, Sparkles, Download, List, BookMarked, BarChart3, Keyboard, MessageCircle, Lightbulb, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/components/theme-provider";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { NovelProject, Notification } from "@shared/schema";
import { getProjectPriceUSD } from "@shared/schema";
import { useMemo, useState, useEffect, useRef } from "react";
import LtrNum from "@/components/ui/ltr-num";
import { Crown } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

export default function Home() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { data: projects, isLoading } = useQuery<NovelProject[]>({
    queryKey: ["/api/projects"],
  });

  const { data: planData } = useQuery<{ plan: string; planPurchasedAt: string | null }>({
    queryKey: ["/api/user/plan"],
  });

  const { data: projectStats } = useQuery<Record<number, { realWordCount: number; realPageCount: number }>>({
    queryKey: ["/api/projects/stats"],
    enabled: !!projects && projects.length > 0,
  });

  const { data: notifications } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const { data: unreadCountData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 30000,
  });

  const { data: favorites } = useQuery<number[]>({
    queryKey: ["/api/favorites"],
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

  const [notifOpen, setNotifOpen] = useState(false);
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

  interface WritingStats {
    totalWords: number;
    totalProjects: number;
    completedProjects: number;
    avgWordsPerProject: number;
    dailyWordCounts: { date: string; words: number }[];
    projectBreakdown: { projectId: number; title: string; type: string; words: number; chapters: number; completedChapters: number }[];
  }

  const { data: writingStats } = useQuery<WritingStats>({
    queryKey: ["/api/projects/writing-stats"],
    enabled: showWritingStats,
  });

  const userPlan = planData?.plan || "free";
  const planLabel = userPlan === "all_in_one" ? "الخطة الشاملة" : userPlan === "essay" ? "خطة المقالات" : userPlan === "scenario" ? "خطة السيناريوهات" : null;

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
            <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="button-theme-toggle">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Popover open={notifOpen} onOpenChange={setNotifOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
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
                  {notifications && notifications.length > 0 ? (
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
            <Link href="/profile">
              <div className="flex items-center gap-2 cursor-pointer" data-testid="link-profile">
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
            </Link>
            <Button variant="ghost" size="icon" onClick={() => logout()} data-testid="button-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

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
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary cursor-pointer transition-colors" data-testid="link-upgrade-plan">
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
              <Link href="/project/new">
                <DropdownMenuItem data-testid="menu-new-novel">
                  <BookOpen className="w-4 h-4 ml-2" />
                  رواية جديدة
                </DropdownMenuItem>
              </Link>
              <Link href="/project/new/essay">
                <DropdownMenuItem data-testid="menu-new-essay">
                  <Newspaper className="w-4 h-4 ml-2" />
                  مقال جديد
                </DropdownMenuItem>
              </Link>
              <Link href="/project/new/scenario">
                <DropdownMenuItem data-testid="menu-new-scenario">
                  <Film className="w-4 h-4 ml-2" />
                  سيناريو جديد
                </DropdownMenuItem>
              </Link>
              <Link href="/project/new/short-story">
                <DropdownMenuItem data-testid="menu-new-short-story">
                  <PenTool className="w-4 h-4 ml-2" />
                  قصة قصيرة جديدة
                </DropdownMenuItem>
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

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

          {showWritingStats && writingStats && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-xl font-bold text-primary" data-testid="stat-avg-words">{writingStats.avgWordsPerProject.toLocaleString("ar-EG")}</div>
                    <div className="text-xs text-muted-foreground">متوسط الكلمات/مشروع</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-xl font-bold text-green-600 dark:text-green-400" data-testid="stat-completion-rate">
                      {writingStats.totalProjects > 0 ? Math.round((writingStats.completedProjects / writingStats.totalProjects) * 100) : 0}%
                    </div>
                    <div className="text-xs text-muted-foreground">نسبة الإنجاز</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-xl font-bold text-amber-600 dark:text-amber-400" data-testid="stat-completed-count">{writingStats.completedProjects}</div>
                    <div className="text-xs text-muted-foreground">مشاريع مكتملة</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400" data-testid="stat-daily-avg">
                      {(() => {
                        const activeDays = writingStats.dailyWordCounts.filter(d => d.words > 0).length;
                        return activeDays > 0 ? Math.round(writingStats.totalWords / activeDays).toLocaleString("ar-EG") : "٠";
                      })()}
                    </div>
                    <div className="text-xs text-muted-foreground">متوسط الكلمات/يوم نشط</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="p-5">
                  <h3 className="font-medium text-sm mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    نشاط الكتابة — آخر ١٤ يوماً
                  </h3>
                  <div className="flex items-end gap-1 h-24" data-testid="chart-daily-words">
                    {writingStats.dailyWordCounts.map((day, i) => {
                      const maxWords = Math.max(...writingStats.dailyWordCounts.map(d => d.words), 1);
                      const height = day.words > 0 ? Math.max(4, (day.words / maxWords) * 100) : 0;
                      const dateObj = new Date(day.date);
                      const dayLabel = dateObj.toLocaleDateString("ar-EG", { day: "numeric" });
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 group" data-testid={`bar-day-${i}`}>
                          <div className="relative w-full flex justify-center">
                            <div className="absolute -top-6 bg-popover border rounded px-1.5 py-0.5 text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-sm">
                              <LtrNum>{day.words.toLocaleString("ar-EG")}</LtrNum> كلمة
                            </div>
                          </div>
                          <div
                            className={`w-full rounded-t ${day.words > 0 ? "bg-primary/70 hover:bg-primary" : "bg-muted"} transition-all duration-300`}
                            style={{ height: `${height}%`, minHeight: day.words > 0 ? "4px" : "2px" }}
                          />
                          <span className="text-[9px] text-muted-foreground">{dayLabel}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {writingStats.projectBreakdown.length > 0 && (
                <Card>
                  <CardContent className="p-5">
                    <h3 className="font-medium text-sm mb-4 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary" />
                      توزيع الكلمات حسب المشروع
                    </h3>
                    <div className="space-y-3">
                      {writingStats.projectBreakdown.slice(0, 8).map((proj) => {
                        const maxWords = Math.max(...writingStats.projectBreakdown.map(p => p.words), 1);
                        const typeLabel = proj.type === "essay" ? "مقال" : proj.type === "scenario" ? "سيناريو" : proj.type === "short_story" ? "قصة قصيرة" : "رواية";
                        return (
                          <div key={proj.projectId} data-testid={`breakdown-project-${proj.projectId}`}>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-1.5 text-sm truncate min-w-0">
                                <span className="truncate">{proj.title}</span>
                                <span className="text-[10px] text-muted-foreground shrink-0">({typeLabel})</span>
                              </div>
                              <span className="text-xs font-medium shrink-0"><LtrNum>{proj.words.toLocaleString("ar-EG")}</LtrNum> كلمة</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary/60 transition-all duration-500"
                                style={{ width: `${(proj.words / maxWords) * 100}%` }}
                              />
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {proj.completedChapters}/{proj.chapters} فصول مكتملة
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {showWritingStats && !writingStats && (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
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
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <SlidersHorizontal className="w-4 h-4 text-muted-foreground shrink-0" />
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
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
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
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <ArrowUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
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
                >
                  <Heart className={`w-4 h-4 ${favoritesSet.has(project.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                </Button>
                <Link href={`/project/${project.id}`}>
                <CardContent className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {(project.projectType === "essay") && <Newspaper className="w-4 h-4 text-blue-500 shrink-0" />}
                        {(project.projectType === "scenario") && <Film className="w-4 h-4 text-purple-500 shrink-0" />}
                        {(!project.projectType || project.projectType === "novel") && <BookOpen className="w-4 h-4 text-primary shrink-0" />}
                        <h3 className="font-serif text-lg font-semibold line-clamp-2" data-testid={`text-project-title-${project.id}`}>
                          {project.title}
                        </h3>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${statusColor(project.status, project.paid)}`} data-testid={`badge-status-${project.id}`}>
                        {!project.paid && <Lock className="w-3 h-3 inline ml-1" />}
                        {statusLabel(project.status, project.paid)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {project.projectType === "essay" ? "مقال" : project.projectType === "scenario" ? "سيناريو" : project.projectType === "short_story" ? "قصة قصيرة" : "رواية"}
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
                    <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1" data-testid={`text-words-written-${project.id}`}>
                        <PenTool className="w-3.5 h-3.5" />
                        <LtrNum>{(projectStats?.[project.id]?.realWordCount ?? project.usedWords).toLocaleString()}</LtrNum> كلمة
                      </span>
                      <span className="flex items-center gap-1" data-testid={`text-pages-${project.id}`}>
                        <FileText className="w-3.5 h-3.5" />
                        {projectStats?.[project.id] !== undefined
                          ? projectStats[project.id].realPageCount > 0
                            ? <><LtrNum>{projectStats[project.id].realPageCount}</LtrNum> صفحة فعلية</>
                            : "٠ صفحة"
                          : <><LtrNum>{project.pageCount}</LtrNum> صفحة</>}
                      </span>
                    </div>
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
              ابدأ بإنشاء مشروعك الأول — رواية، مقال، أو سيناريو. وسيساعدك أبو هاشم في الكتابة بأسلوب احترافي
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card
                  className={`cursor-pointer hover-elevate ${selectedProjectType === "novel" ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setSelectedProjectType("novel")}
                  data-testid="card-project-type-novel"
                >
                  <CardContent className="p-4 text-center space-y-2">
                    <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mx-auto">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <h4 className="font-semibold text-sm">رواية</h4>
                    <p className="text-xs text-muted-foreground">فصول مترابطة، شخصيات، حبكة كاملة</p>
                    <p className="text-[10px] text-muted-foreground/70">حتى ١٠٠,٠٠٠ كلمة</p>
                  </CardContent>
                </Card>
                <Card
                  className={`cursor-pointer hover-elevate ${selectedProjectType === "essay" ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setSelectedProjectType("essay")}
                  data-testid="card-project-type-essay"
                >
                  <CardContent className="p-4 text-center space-y-2">
                    <div className="w-10 h-10 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto">
                      <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h4 className="font-semibold text-sm">مقال</h4>
                    <p className="text-xs text-muted-foreground">مقالات منظمة بأقسام وفقرات</p>
                    <p className="text-[10px] text-muted-foreground/70">حتى ١٠,٠٠٠ كلمة</p>
                  </CardContent>
                </Card>
                <Card
                  className={`cursor-pointer hover-elevate ${selectedProjectType === "scenario" ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setSelectedProjectType("scenario")}
                  data-testid="card-project-type-scenario"
                >
                  <CardContent className="p-4 text-center space-y-2">
                    <div className="w-10 h-10 rounded-md bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto">
                      <Film className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h4 className="font-semibold text-sm">سيناريو</h4>
                    <p className="text-xs text-muted-foreground">مشاهد، حوارات، توجيهات إخراجية</p>
                    <p className="text-[10px] text-muted-foreground/70">تنسيق سينمائي احترافي</p>
                  </CardContent>
                </Card>
                <Card
                  className={`cursor-pointer hover-elevate ${selectedProjectType === "short_story" ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setSelectedProjectType("short_story")}
                  data-testid="card-project-type-short-story"
                >
                  <CardContent className="p-4 text-center space-y-2">
                    <div className="w-10 h-10 rounded-md bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
                      <PenTool className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h4 className="font-semibold text-sm">قصة قصيرة</h4>
                    <p className="text-xs text-muted-foreground">سرد مكثف ومؤثر بحبكة محكمة</p>
                    <p className="text-[10px] text-muted-foreground/70">حتى ١٥,٠٠٠ كلمة</p>
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
    </div>
  );
}
