import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Feather, LogOut, ShieldCheck, Ticket, Clock, Search, ArrowRight, AlertCircle, Users, FolderOpen, Crown, BarChart3, BookOpen, FileText, Film, Tag, DollarSign, Download, Eye, Flag, FlagOff, Loader2, PenTool, TrendingUp, Cpu, ShieldOff, ShieldAlert, Info, MessageSquare, Star, Check, Trash2, Crosshair, Share2, Plus, GripVertical, ExternalLink, Pencil } from "lucide-react";
import { SiLinkedin, SiTiktok, SiX, SiInstagram, SiFacebook, SiYoutube, SiSnapchat, SiTelegram, SiWhatsapp } from "react-icons/si";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SupportTicket, NovelProject, PromoCode, PlatformReview, SocialMediaLink } from "@shared/schema";
import { FREE_ANALYSIS_USES, PAID_ANALYSIS_USES } from "@shared/schema";
import LtrNum from "@/components/ui/ltr-num";

interface RevenueData {
  totalRevenue: number;
  monthlyRevenue: number;
  revenueByType: { type: string; amount: number }[];
  paidPlans: { plan: string; count: number; revenue: number }[];
}

interface AnalyticsData {
  totalUsers: number;
  totalProjects: number;
  projectsByType: { type: string; count: number }[];
  planBreakdown: { plan: string; count: number }[];
  revenueData?: RevenueData;
  totalWords?: number;
  writingActivity?: { date: string; words: number; projects: number }[];
  topWriters?: { name: string; words: number }[];
}

interface AdminUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  plan: string;
  role: string | null;
  createdAt: string | null;
  totalProjects: number;
}

const statusLabels: Record<string, string> = {
  open: "مفتوح",
  in_progress: "قيد المعالجة",
  resolved: "تم الحل",
  closed: "مغلق",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  in_progress: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  closed: "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400",
};

const priorityLabels: Record<string, string> = {
  low: "منخفض",
  normal: "عادي",
  high: "مرتفع",
  urgent: "عاجل",
};

const priorityColors: Record<string, string> = {
  low: "text-gray-500",
  normal: "text-blue-500",
  high: "text-amber-500",
  urgent: "text-red-500",
};

const featureLabels: Record<string, string> = {
  title_suggestion: "اقتراح عنوان",
  format_suggestion: "اقتراح شكل أدبي",
  technique_suggestion: "اقتراح تقنية سرد",
  outline: "إنشاء مخطط",
  outline_refine: "تحسين مخطط",
  chapter: "كتابة فصل",
  character_suggestion: "اقتراح شخصيات",
  cover_image: "إنشاء غلاف",
  rewrite: "إعادة كتابة",
  originality_check: "فحص الأصالة",
  originality_enhance: "تعزيز الأصالة",
  glossary: "إنشاء مسرد",
  continuity_check: "فحص الاتساق",
  fix_continuity: "إصلاح اتساق",
  style_analysis: "تحليل الأسلوب",
  fix_style: "إصلاح الأسلوب",
  fix_style_identify: "تحديد إصلاح الأسلوب",
};

const planLabels: Record<string, string> = {
  free: "مجاني",
  essay: "خطة المقالات",
  scenario: "خطة السيناريوهات",
  all_in_one: "الخطة الشاملة",
};

const projectTypeLabels: Record<string, string> = {
  novel: "رواية",
  essay: "مقال",
  scenario: "سيناريو",
};

const projectStatusLabels: Record<string, string> = {
  locked: "مقفل",
  draft: "مسودة",
  outline: "مخطط",
  writing: "قيد الكتابة",
  completed: "مكتمل",
};

export default function Admin() {
  useDocumentTitle("لوحة الإدارة — قلم AI");
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"tickets" | "users" | "analytics" | "promos" | "api-usage" | "reviews" | "tracking" | "essays" | "social">("tickets");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showProjectsDialog, setShowProjectsDialog] = useState(false);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [planChangeUser, setPlanChangeUser] = useState<AdminUser | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showBulkPlanDialog, setShowBulkPlanDialog] = useState(false);
  const [showContentDialog, setShowContentDialog] = useState(false);
  const [contentProjectId, setContentProjectId] = useState<number | null>(null);
  const [newPromo, setNewPromo] = useState({ code: "", discountPercent: "", maxUses: "", validUntil: "", applicableTo: "all" });
  const [apiUsageSearch, setApiUsageSearch] = useState("");
  const [apiUsageDetailUser, setApiUsageDetailUser] = useState<string | null>(null);
  const [showApiUsageDialog, setShowApiUsageDialog] = useState(false);
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<{ status: string; count: number }[]>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: tickets, isLoading: ticketsLoading } = useQuery<SupportTicket[]>({
    queryKey: ["/api/admin/tickets"],
  });

  const { data: adminUsers, isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: userProjects, isLoading: userProjectsLoading } = useQuery<NovelProject[]>({
    queryKey: ["/api/admin/users", selectedUserId, "projects"],
    enabled: !!selectedUserId && showProjectsDialog,
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics"],
    enabled: activeTab === "analytics",
  });

  const { data: promos, isLoading: promosLoading } = useQuery<PromoCode[]>({
    queryKey: ["/api/admin/promos"],
    enabled: activeTab === "promos",
  });

  const { data: projectContent, isLoading: contentLoading } = useQuery<{ project: NovelProject; chapters: any[] }>({
    queryKey: ["/api/admin/projects", contentProjectId, "content"],
    enabled: !!contentProjectId && showContentDialog,
  });

  interface ApiUsageRow { userId: string; email: string | null; displayName: string | null; totalCalls: number; totalTokens: number; totalCostMicro: number; apiSuspended: boolean }
  interface ApiLogEntry { id: number; userId: string; projectId: number | null; feature: string; model: string; promptTokens: number; completionTokens: number; totalTokens: number; estimatedCostMicro: number; createdAt: string }

  const { data: apiUsageData, isLoading: apiUsageLoading } = useQuery<ApiUsageRow[]>({
    queryKey: ["/api/admin/api-usage"],
    enabled: activeTab === "api-usage",
  });

  const { data: apiUserLogs, isLoading: apiUserLogsLoading } = useQuery<ApiLogEntry[]>({
    queryKey: ["/api/admin/api-usage", apiUsageDetailUser],
    queryFn: async () => {
      const res = await fetch(`/api/admin/api-usage/${apiUsageDetailUser}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!apiUsageDetailUser && showApiUsageDialog,
  });

  interface EssayAnalyticsRow { projectId: number; title: string; views: number; clicks: number }

  const { data: essayAnalytics, isLoading: essayAnalyticsLoading } = useQuery<EssayAnalyticsRow[]>({
    queryKey: ["/api/admin/essay-analytics"],
    enabled: activeTab === "essays",
  });

  const [essaySortBy, setEssaySortBy] = useState<"views" | "clicks" | "ctr">("clicks");

  const SOCIAL_PLATFORMS = [
    { value: "linkedin", label: "LinkedIn", icon: SiLinkedin },
    { value: "tiktok", label: "TikTok", icon: SiTiktok },
    { value: "x", label: "X / Twitter", icon: SiX },
    { value: "instagram", label: "Instagram", icon: SiInstagram },
    { value: "facebook", label: "Facebook", icon: SiFacebook },
    { value: "youtube", label: "YouTube", icon: SiYoutube },
    { value: "snapchat", label: "Snapchat", icon: SiSnapchat },
    { value: "telegram", label: "Telegram", icon: SiTelegram },
    { value: "whatsapp", label: "WhatsApp", icon: SiWhatsapp },
  ] as const;

  const getPlatformInfo = (platform: string) => SOCIAL_PLATFORMS.find(p => p.value === platform);

  const { data: socialLinks, isLoading: socialLinksLoading } = useQuery<SocialMediaLink[]>({
    queryKey: ["/api/admin/social-links"],
    enabled: activeTab === "social",
  });

  const [showSocialDialog, setShowSocialDialog] = useState(false);
  const [editingSocialLink, setEditingSocialLink] = useState<SocialMediaLink | null>(null);
  const [socialForm, setSocialForm] = useState({ platform: "", url: "", enabled: true, displayOrder: 0 });
  const [deletingSocialId, setDeletingSocialId] = useState<number | null>(null);

  const upsertSocialLinkMutation = useMutation({
    mutationFn: async (data: { platform: string; url: string; enabled: boolean; displayOrder: number }) => {
      await apiRequest("PUT", "/api/admin/social-links", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/social-links"] });
      setShowSocialDialog(false);
      setEditingSocialLink(null);
      setSocialForm({ platform: "", url: "", enabled: true, displayOrder: 0 });
      toast({ title: "تم حفظ رابط التواصل الاجتماعي بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل في حفظ الرابط", variant: "destructive" });
    },
  });

  const deleteSocialLinkMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/social-links/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/social-links"] });
      setDeletingSocialId(null);
      toast({ title: "تم حذف الرابط بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل في حذف الرابط", variant: "destructive" });
    },
  });

  const openAddSocialDialog = () => {
    setEditingSocialLink(null);
    const maxOrder = (socialLinks || []).reduce((max, l) => Math.max(max, l.displayOrder || 0), 0);
    setSocialForm({ platform: "", url: "", enabled: true, displayOrder: maxOrder + 1 });
    setShowSocialDialog(true);
  };

  const openEditSocialDialog = (link: SocialMediaLink) => {
    setEditingSocialLink(link);
    setSocialForm({ platform: link.platform, url: link.url, enabled: !!link.enabled, displayOrder: link.displayOrder || 0 });
    setShowSocialDialog(true);
  };

  const sortedEssayAnalytics = (essayAnalytics || []).slice().sort((a, b) => {
    if (essaySortBy === "views") return b.views - a.views;
    if (essaySortBy === "clicks") return b.clicks - a.clicks;
    const ctrA = a.views > 0 ? a.clicks / a.views : 0;
    const ctrB = b.views > 0 ? b.clicks / b.views : 0;
    return ctrB - ctrA;
  });

  const { data: pendingReviews, isLoading: reviewsLoading } = useQuery<PlatformReview[]>({
    queryKey: ["/api/admin/reviews"],
    enabled: activeTab === "reviews",
  });

  const approveReviewMutation = useMutation({
    mutationFn: async (reviewId: number) => {
      await apiRequest("PATCH", `/api/admin/reviews/${reviewId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
      toast({ title: "تمت الموافقة على المراجعة بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل في الموافقة على المراجعة", variant: "destructive" });
    },
  });

  interface TrackingPixelData {
    id: number;
    platform: string;
    pixelId: string;
    hasAccessToken: boolean;
    enabled: boolean;
    updatedAt: string;
  }

  const { data: trackingPixelsData, isLoading: trackingLoading } = useQuery<TrackingPixelData[]>({
    queryKey: ["/api/admin/tracking-pixels"],
    enabled: activeTab === "tracking",
  });

  const [tiktokConfig, setTiktokConfig] = useState({ pixelId: "", accessToken: "", enabled: false, hasAccessToken: false });
  const [facebookConfig, setFacebookConfig] = useState({ pixelId: "", accessToken: "", enabled: false, hasAccessToken: false });
  const [trackingInitialized, setTrackingInitialized] = useState(false);

  useEffect(() => {
    if (trackingPixelsData && !trackingInitialized) {
      const tiktok = trackingPixelsData.find(p => p.platform === "tiktok");
      const facebook = trackingPixelsData.find(p => p.platform === "facebook");
      if (tiktok) setTiktokConfig({ pixelId: tiktok.pixelId, accessToken: "", enabled: !!tiktok.enabled, hasAccessToken: !!tiktok.hasAccessToken });
      if (facebook) setFacebookConfig({ pixelId: facebook.pixelId, accessToken: "", enabled: !!facebook.enabled, hasAccessToken: !!facebook.hasAccessToken });
      setTrackingInitialized(true);
    }
  }, [trackingPixelsData, trackingInitialized]);

  const saveTrackingPixelMutation = useMutation({
    mutationFn: async (data: { platform: string; pixelId: string; accessToken: string; enabled: boolean }) => {
      await apiRequest("PUT", "/api/admin/tracking-pixels", data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tracking-pixels"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tracking-pixels"] });
      setTrackingInitialized(false);
      if (variables.platform === "tiktok") setTiktokConfig(c => ({ ...c, accessToken: "" }));
      if (variables.platform === "facebook") setFacebookConfig(c => ({ ...c, accessToken: "" }));
      toast({ title: `تم حفظ إعدادات ${variables.platform === "tiktok" ? "TikTok" : "Facebook"} بنجاح` });
    },
    onError: () => {
      toast({ title: "فشل في حفظ الإعدادات", variant: "destructive" });
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (reviewId: number) => {
      await apiRequest("DELETE", `/api/admin/reviews/${reviewId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
      toast({ title: "تم حذف المراجعة بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل في حذف المراجعة", variant: "destructive" });
    },
  });

  const suspendApiMutation = useMutation({
    mutationFn: async ({ userId, suspended }: { userId: string; suspended: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/suspend-api`, { suspended });
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-usage"] });
      toast({ title: variables.suspended ? "تم تعليق المستخدم من استخدام API" : "تم إعادة تفعيل المستخدم" });
    },
    onError: () => {
      toast({ title: "فشل في تحديث حالة التعليق", variant: "destructive" });
    },
  });

  const createPromoMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/promos", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promos"] });
      setNewPromo({ code: "", discountPercent: "", maxUses: "", validUntil: "", applicableTo: "all" });
      toast({ title: "تم إنشاء كود الخصم بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل في إنشاء كود الخصم", variant: "destructive" });
    },
  });

  const flagProjectMutation = useMutation({
    mutationFn: async ({ projectId, flagged, reason }: { projectId: number; flagged: boolean; reason?: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/projects/${projectId}/flag`, { flagged, reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projects", contentProjectId, "content"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "تم تحديث حالة المشروع" });
    },
    onError: () => {
      toast({ title: "فشل في تحديث حالة المشروع", variant: "destructive" });
    },
  });

  const bulkPlanMutation = useMutation({
    mutationFn: async ({ userIds, plan }: { userIds: string[]; plan: string }) => {
      const res = await apiRequest("PATCH", "/api/admin/users/bulk-plan", { userIds, plan });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowBulkPlanDialog(false);
      setSelectedUsers(new Set());
      toast({ title: "تم تحديث خطط المستخدمين بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل في تحديث الخطط", variant: "destructive" });
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ userId, plan }: { userId: string; plan: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/plan`, { plan });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowPlanDialog(false);
      setPlanChangeUser(null);
      toast({ title: "تم تحديث الخطة بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل في تحديث الخطة", variant: "destructive" });
    },
  });

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
          <h1 className="font-serif text-2xl font-bold">غير مصرح</h1>
          <p className="text-muted-foreground">ليس لديك صلاحية الوصول إلى لوحة الإدارة.</p>
          <Link href="/">
            <Button variant="outline">العودة إلى الرئيسية</Button>
          </Link>
        </div>
      </div>
    );
  }

  const totalTickets = stats?.reduce((sum, s) => sum + s.count, 0) || 0;
  const getStatCount = (status: string) => stats?.find(s => s.status === status)?.count || 0;

  const filteredTickets = (tickets || []).filter(t => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.id.toString().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredUsers = (adminUsers || []).filter(u => {
    if (!userSearchQuery) return true;
    const q = userSearchQuery.toLowerCase();
    return (
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.firstName && u.firstName.toLowerCase().includes(q)) ||
      (u.lastName && u.lastName.toLowerCase().includes(q)) ||
      u.id.toLowerCase().includes(q)
    );
  });

  const statCards = [
    { label: "إجمالي التذاكر", value: totalTickets, color: "text-foreground" },
    { label: "مفتوح", value: getStatCount("open"), color: "text-blue-500" },
    { label: "قيد المعالجة", value: getStatCount("in_progress"), color: "text-amber-500" },
    { label: "تم الحل", value: getStatCount("resolved"), color: "text-green-500" },
    { label: "مغلق", value: getStatCount("closed"), color: "text-gray-500" },
  ];

  const handleViewProjects = (userId: string) => {
    setSelectedUserId(userId);
    setShowProjectsDialog(true);
  };

  const handleChangePlan = (u: AdminUser) => {
    setPlanChangeUser(u);
    setShowPlanDialog(true);
  };

  const [showGrantDialog, setShowGrantDialog] = useState(false);
  const [grantUser, setGrantUser] = useState<AdminUser | null>(null);
  const [grantProjectId, setGrantProjectId] = useState<string>("all");
  const [grantContinuity, setGrantContinuity] = useState("0");
  const [grantStyle, setGrantStyle] = useState("0");
  const [grantContinuityUsed, setGrantContinuityUsed] = useState("0");
  const [grantStyleUsed, setGrantStyleUsed] = useState("0");

  const { data: grantUserProjects } = useQuery<NovelProject[]>({
    queryKey: ["/api/admin/users", grantUser?.id, "projects"],
    enabled: !!grantUser,
  });

  const setAnalysisCountsMutation = useMutation({
    mutationFn: async ({ projectId, continuityCheckPaidCount, styleAnalysisPaidCount, continuityCheckCount, styleAnalysisCount }: { projectId: number; continuityCheckPaidCount: number; styleAnalysisPaidCount: number; continuityCheckCount: number; styleAnalysisCount: number }) => {
      const res = await apiRequest("PATCH", `/api/admin/projects/${projectId}/analysis-counts`, { continuityCheckPaidCount, styleAnalysisPaidCount, continuityCheckCount, styleAnalysisCount });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم تحديث عدد المحاولات بنجاح" });
      if (grantUser) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/users", grantUser.id, "projects"] });
      }
      setShowGrantDialog(false);
      setGrantUser(null);
      setGrantContinuity("0");
      setGrantStyle("0");
      setGrantContinuityUsed("0");
      setGrantStyleUsed("0");
      setGrantProjectId("all");
    },
    onError: () => {
      toast({ title: "فشل في تحديث المحاولات", variant: "destructive" });
    },
  });

  const grantAnalysisMutation = useMutation({
    mutationFn: async ({ userId, continuityUses, styleUses, projectId }: { userId: string; continuityUses: number; styleUses: number; projectId?: number }) => {
      const body: any = { continuityUses, styleUses };
      if (projectId) body.projectId = projectId;
      const res = await apiRequest("POST", `/api/admin/users/${userId}/grant-analysis`, body);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم منح محاولات التحليل بنجاح" });
      if (grantUser) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/users", grantUser.id, "projects"] });
      }
      setShowGrantDialog(false);
      setGrantUser(null);
      setGrantContinuity("0");
      setGrantStyle("0");
      setGrantContinuityUsed("0");
      setGrantStyleUsed("0");
      setGrantProjectId("all");
    },
    onError: () => {
      toast({ title: "فشل في منح المحاولات", variant: "destructive" });
    },
  });

  const selectedGrantProject = grantUserProjects?.find(p => String(p.id) === grantProjectId);

  useEffect(() => {
    if (selectedGrantProject) {
      setGrantContinuity(String(selectedGrantProject.continuityCheckPaidCount || 0));
      setGrantStyle(String(selectedGrantProject.styleAnalysisPaidCount || 0));
      setGrantContinuityUsed(String(selectedGrantProject.continuityCheckCount || 0));
      setGrantStyleUsed(String(selectedGrantProject.styleAnalysisCount || 0));
    } else {
      setGrantContinuity("0");
      setGrantStyle("0");
      setGrantContinuityUsed("0");
      setGrantStyleUsed("0");
    }
  }, [grantProjectId, selectedGrantProject]);

  const handleGrantAnalysis = (u: AdminUser) => {
    setGrantUser(u);
    setGrantContinuity("0");
    setGrantStyle("0");
    setGrantProjectId("all");
    setShowGrantDialog(true);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/">
              <div className="flex items-center gap-2 sm:gap-3 cursor-pointer">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-md bg-primary flex items-center justify-center">
                  <Feather className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
                </div>
                <span className="font-serif text-lg sm:text-xl font-bold">QalamAI</span>
              </div>
            </Link>
            <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium hidden sm:flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              لوحة الإدارة
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="link-dashboard">
                <ArrowRight className="w-4 h-4 sm:ml-1" />
                <span className="hidden sm:inline">المشاريع</span>
              </Button>
            </Link>
            <Avatar className="w-8 h-8">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback className="text-xs">
                {user?.firstName?.[0] || "م"}
              </AvatarFallback>
            </Avatar>
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => logout()} data-testid="button-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold mb-6 sm:mb-8" data-testid="text-admin-title">
          لوحة الإدارة
        </h1>

        <div className="flex items-center gap-2 mb-6 sm:mb-8 overflow-x-auto pb-2">
          <Button
            variant={activeTab === "tickets" ? "default" : "outline"}
            onClick={() => setActiveTab("tickets")}
            size="sm"
            className="shrink-0"
            data-testid="button-tab-tickets"
          >
            <Ticket className="w-4 h-4 sm:ml-2" />
            <span className="hidden sm:inline">تذاكر الدعم</span>
          </Button>
          <Button
            variant={activeTab === "users" ? "default" : "outline"}
            onClick={() => setActiveTab("users")}
            size="sm"
            className="shrink-0"
            data-testid="button-tab-users"
          >
            <Users className="w-4 h-4 sm:ml-2" />
            <span className="hidden sm:inline">المستخدمون</span>
          </Button>
          <Button
            variant={activeTab === "analytics" ? "default" : "outline"}
            onClick={() => setActiveTab("analytics")}
            size="sm"
            className="shrink-0"
            data-testid="button-tab-analytics"
          >
            <BarChart3 className="w-4 h-4 sm:ml-2" />
            <span className="hidden sm:inline">إحصائيات</span>
          </Button>
          <Button
            variant={activeTab === "promos" ? "default" : "outline"}
            onClick={() => setActiveTab("promos")}
            size="sm"
            className="shrink-0"
            data-testid="button-tab-promos"
          >
            <Tag className="w-4 h-4 sm:ml-2" />
            <span className="hidden sm:inline">رموز الخصم</span>
          </Button>
          <Button
            variant={activeTab === "api-usage" ? "default" : "outline"}
            onClick={() => setActiveTab("api-usage")}
            size="sm"
            className="shrink-0"
            data-testid="button-tab-api-usage"
          >
            <Cpu className="w-4 h-4 sm:ml-2" />
            <span className="hidden sm:inline">استخدام API</span>
          </Button>
          <Button
            variant={activeTab === "reviews" ? "default" : "outline"}
            onClick={() => setActiveTab("reviews")}
            size="sm"
            className="shrink-0"
            data-testid="button-tab-reviews"
          >
            <MessageSquare className="w-4 h-4 sm:ml-2" />
            <span className="hidden sm:inline">المراجعات</span>
            {pendingReviews && pendingReviews.length > 0 && (
              <Badge variant="secondary" className="mr-1 text-[10px]" data-testid="badge-reviews-count">
                <LtrNum>{pendingReviews.length}</LtrNum>
              </Badge>
            )}
          </Button>
          <Button
            variant={activeTab === "tracking" ? "default" : "outline"}
            onClick={() => setActiveTab("tracking")}
            size="sm"
            className="shrink-0"
            data-testid="button-tab-tracking"
          >
            <Crosshair className="w-4 h-4 sm:ml-2" />
            <span className="hidden sm:inline">بكسل التتبع</span>
          </Button>
          <Button
            variant={activeTab === "essays" ? "default" : "outline"}
            onClick={() => setActiveTab("essays")}
            size="sm"
            className="shrink-0"
            data-testid="button-tab-essays"
          >
            <FileText className="w-4 h-4 sm:ml-2" />
            <span className="hidden sm:inline">المقالات</span>
          </Button>
          <Button
            variant={activeTab === "social" ? "default" : "outline"}
            onClick={() => setActiveTab("social")}
            size="sm"
            className="shrink-0"
            data-testid="button-tab-social"
          >
            <Share2 className="w-4 h-4 sm:ml-2" />
            <span className="hidden sm:inline">وسائل التواصل</span>
          </Button>
        </div>

        {activeTab === "tickets" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              {statsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-5">
                      <Skeleton className="h-8 w-12 mb-2" />
                      <Skeleton className="h-4 w-20" />
                    </CardContent>
                  </Card>
                ))
              ) : (
                statCards.map((stat) => (
                  <Card key={stat.label} data-testid={`card-stat-${stat.label}`}>
                    <CardContent className="p-5 text-center">
                      <div className={`text-3xl font-bold mb-1 ${stat.color}`}>{stat.value}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-6">
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث بالرقم أو الموضوع أو البريد..."
                  className="pr-10"
                  data-testid="input-search"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status-filter">
                  <SelectValue placeholder="تصفية بالحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="open">مفتوح</SelectItem>
                  <SelectItem value="in_progress">قيد المعالجة</SelectItem>
                  <SelectItem value="resolved">تم الحل</SelectItem>
                  <SelectItem value="closed">مغلق</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {ticketsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-5 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredTickets.length > 0 ? (
              <>
              <div className="hidden sm:block border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-right p-3 font-medium text-muted-foreground">#</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">الموضوع</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">المرسل</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">الحالة</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">الأولوية</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTickets.map((ticket) => (
                        <tr
                          key={ticket.id}
                          className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => navigate(`/admin/tickets/${ticket.id}`)}
                          data-testid={`row-ticket-${ticket.id}`}
                        >
                          <td className="p-3 font-mono text-muted-foreground">{ticket.id}</td>
                          <td className="p-3 font-medium max-w-[300px] truncate">{ticket.subject}</td>
                          <td className="p-3 text-muted-foreground">
                            <div>{ticket.name}</div>
                            <div className="text-xs">{ticket.email}</div>
                          </td>
                          <td className="p-3">
                            <span className={`text-xs px-2.5 py-0.5 rounded-full ${statusColors[ticket.status]}`}>
                              {statusLabels[ticket.status]}
                            </span>
                          </td>
                          <td className={`p-3 text-xs font-medium ${priorityColors[ticket.priority]}`}>
                            {priorityLabels[ticket.priority]}
                          </td>
                          <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {new Date(ticket.createdAt).toLocaleDateString("ar-EG")}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="sm:hidden space-y-3">
                {filteredTickets.map((ticket) => (
                  <Card
                    key={ticket.id}
                    className="cursor-pointer hover-elevate"
                    onClick={() => navigate(`/admin/tickets/${ticket.id}`)}
                    data-testid={`card-ticket-${ticket.id}`}
                  >
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-sm line-clamp-2">{ticket.subject}</span>
                        <span className="font-mono text-xs text-muted-foreground shrink-0">#{ticket.id}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full ${statusColors[ticket.status]}`}>
                          {statusLabels[ticket.status]}
                        </span>
                        <span className={`text-xs font-medium ${priorityColors[ticket.priority]}`}>
                          {priorityLabels[ticket.priority]}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{ticket.name}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(ticket.createdAt).toLocaleDateString("ar-EG")}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              </>
            ) : (
              <div className="text-center py-16">
                <Ticket className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">لا توجد تذاكر مطابقة للبحث</p>
              </div>
            )}
          </>
        )}

        {activeTab === "users" && (
          <>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-6">
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="بحث بالاسم أو البريد..."
                  className="pr-10"
                  data-testid="input-search-users"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                {adminUsers ? <><LtrNum>{adminUsers.length}</LtrNum> مستخدم</> : ""}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.open("/api/admin/users/export", "_blank");
                }}
                data-testid="button-export-csv"
              >
                <Download className="w-4 h-4 ml-1" />
                تصدير CSV
              </Button>
              {selectedUsers.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkPlanDialog(true)}
                  data-testid="button-bulk-plan"
                >
                  <Crown className="w-4 h-4 ml-1" />
                  تغيير خطة المحددين ({selectedUsers.size})
                </Button>
              )}
            </div>

            {usersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-5 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredUsers.length > 0 ? (
              <>
              <div className="hidden sm:block border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 w-10">
                          <Checkbox
                            checked={filteredUsers.length > 0 && filteredUsers.every(u => selectedUsers.has(u.id))}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
                              } else {
                                setSelectedUsers(new Set());
                              }
                            }}
                            data-testid="checkbox-select-all-users"
                          />
                        </th>
                        <th className="text-right p-3 font-medium text-muted-foreground">المستخدم</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">البريد الإلكتروني</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">الخطة</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">المشاريع</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">تاريخ الانضمام</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => (
                        <tr
                          key={u.id}
                          className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                          data-testid={`row-user-${u.id}`}
                        >
                          <td className="p-3">
                            <Checkbox
                              checked={selectedUsers.has(u.id)}
                              onCheckedChange={(checked) => {
                                const next = new Set(selectedUsers);
                                if (checked) { next.add(u.id); } else { next.delete(u.id); }
                                setSelectedUsers(next);
                              }}
                              data-testid={`checkbox-user-${u.id}`}
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-7 h-7">
                                <AvatarImage src={u.profileImageUrl || undefined} />
                                <AvatarFallback className="text-xs">
                                  {u.firstName?.[0] || u.email?.[0] || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-sm">
                                  {[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}
                                </div>
                                {u.role === "admin" && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    <ShieldCheck className="w-3 h-3 ml-1" />
                                    مدير
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-muted-foreground text-xs" data-testid={`text-email-${u.id}`}>
                            {u.email || "—"}
                          </td>
                          <td className="p-3" data-testid={`text-plan-${u.id}`}>
                            <Badge variant={u.plan === "free" ? "outline" : "default"}>
                              {u.plan === "all_in_one" && <Crown className="w-3 h-3 ml-1" />}
                              {planLabels[u.plan] || u.plan}
                            </Badge>
                          </td>
                          <td className="p-3 text-muted-foreground" data-testid={`text-projects-${u.id}`}>
                            {u.totalProjects}
                          </td>
                          <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString("ar-EG") : "—"}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1 flex-wrap">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewProjects(u.id)}
                                data-testid={`button-view-projects-${u.id}`}
                              >
                                <FolderOpen className="w-4 h-4 ml-1" />
                                المشاريع
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleChangePlan(u)}
                                data-testid={`button-change-plan-${u.id}`}
                              >
                                <Crown className="w-4 h-4 ml-1" />
                                تغيير الخطة
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleGrantAnalysis(u)}
                                data-testid={`button-grant-analysis-${u.id}`}
                              >
                                <BarChart3 className="w-4 h-4 ml-1" />
                                منح تحليل
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="sm:hidden space-y-3">
                {filteredUsers.map((u) => (
                  <Card key={u.id} data-testid={`card-user-${u.id}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedUsers.has(u.id)}
                          onCheckedChange={(checked) => {
                            const next = new Set(selectedUsers);
                            if (checked) { next.add(u.id); } else { next.delete(u.id); }
                            setSelectedUsers(next);
                          }}
                          data-testid={`checkbox-user-mobile-${u.id}`}
                        />
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={u.profileImageUrl || undefined} />
                          <AvatarFallback className="text-xs">
                            {u.firstName?.[0] || u.email?.[0] || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{u.email || "—"}</div>
                        </div>
                        <Badge variant={u.plan === "free" ? "outline" : "default"} className="shrink-0 text-xs">
                          {planLabels[u.plan] || u.plan}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{u.totalProjects} مشاريع</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString("ar-EG") : "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewProjects(u.id)} data-testid={`button-view-projects-mobile-${u.id}`}>
                          <FolderOpen className="w-3.5 h-3.5 ml-1" />
                          المشاريع
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleChangePlan(u)} data-testid={`button-change-plan-mobile-${u.id}`}>
                          <Crown className="w-3.5 h-3.5 ml-1" />
                          تغيير الخطة
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleGrantAnalysis(u)} data-testid={`button-grant-analysis-mobile-${u.id}`}>
                          <BarChart3 className="w-3.5 h-3.5 ml-1" />
                          منح تحليل
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              </>
            ) : (
              <div className="text-center py-16">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">لا يوجد مستخدمون مطابقون للبحث</p>
              </div>
            )}
          </>
        )}

        {activeTab === "analytics" && (
          <>
            {analyticsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-5">
                      <Skeleton className="h-8 w-12 mb-2" />
                      <Skeleton className="h-4 w-20" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : analytics ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <Card data-testid="card-analytics-total-users">
                    <CardContent className="p-5 text-center">
                      <Users className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                      <div className="text-3xl font-bold mb-1" data-testid="text-analytics-total-users">{analytics.totalUsers}</div>
                      <div className="text-xs text-muted-foreground">إجمالي المستخدمين</div>
                    </CardContent>
                  </Card>
                  <Card data-testid="card-analytics-total-projects">
                    <CardContent className="p-5 text-center">
                      <FolderOpen className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                      <div className="text-3xl font-bold mb-1" data-testid="text-analytics-total-projects">{analytics.totalProjects}</div>
                      <div className="text-xs text-muted-foreground">إجمالي المشاريع</div>
                    </CardContent>
                  </Card>
                  <Card data-testid="card-analytics-project-types">
                    <CardContent className="p-5 text-center">
                      <BookOpen className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                      <div className="text-3xl font-bold mb-1">{analytics.projectsByType.length}</div>
                      <div className="text-xs text-muted-foreground">أنواع المشاريع</div>
                    </CardContent>
                  </Card>
                  <Card data-testid="card-analytics-plans">
                    <CardContent className="p-5 text-center">
                      <Crown className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                      <div className="text-3xl font-bold mb-1">{analytics.planBreakdown.length}</div>
                      <div className="text-xs text-muted-foreground">الخطط النشطة</div>
                    </CardContent>
                  </Card>
                </div>

                {analytics.revenueData && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <Card data-testid="card-revenue-total">
                      <CardContent className="p-5 text-center">
                        <DollarSign className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                        <div className="text-3xl font-bold mb-1" data-testid="text-revenue-total">
                          ${(analytics.revenueData.totalRevenue / 100).toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">إجمالي الإيرادات</div>
                      </CardContent>
                    </Card>
                    <Card data-testid="card-revenue-monthly">
                      <CardContent className="p-5 text-center">
                        <DollarSign className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                        <div className="text-3xl font-bold mb-1" data-testid="text-revenue-monthly">
                          ${(analytics.revenueData.monthlyRevenue / 100).toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">إيرادات الشهر</div>
                      </CardContent>
                    </Card>
                    <Card data-testid="card-revenue-by-type">
                      <CardContent className="p-5">
                        <h4 className="text-xs text-muted-foreground mb-2">الإيرادات حسب النوع</h4>
                        <div className="space-y-1">
                          {analytics.revenueData.revenueByType.map((item) => (
                            <div key={item.type} className="flex items-center justify-between gap-2 text-sm" data-testid={`text-revenue-type-${item.type}`}>
                              <span>{projectTypeLabels[item.type] || item.type}</span>
                              <span className="font-medium">${(item.amount / 100).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                    <Card data-testid="card-revenue-paid-plans">
                      <CardContent className="p-5">
                        <h4 className="text-xs text-muted-foreground mb-2">الخطط المدفوعة</h4>
                        <div className="space-y-1">
                          {analytics.revenueData.paidPlans.map((item) => (
                            <div key={item.plan} className="flex items-center justify-between gap-2 text-sm" data-testid={`text-paid-plan-${item.plan}`}>
                              <span>{planLabels[item.plan] || item.plan} ({item.count})</span>
                              <span className="font-medium">${(item.revenue / 100).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card data-testid="card-analytics-projects-chart">
                    <CardContent className="p-5">
                      <h3 className="font-medium mb-4 flex items-center gap-2 flex-wrap">
                        <BookOpen className="w-4 h-4" />
                        المشاريع حسب النوع
                      </h3>
                      {analytics.projectsByType.length > 0 ? (
                        <div className="space-y-3">
                          {(() => {
                            const maxCount = Math.max(...analytics.projectsByType.map(p => p.count), 1);
                            const typeIcons: Record<string, typeof BookOpen> = { novel: BookOpen, essay: FileText, scenario: Film };
                            const typeColors: Record<string, string> = {
                              novel: "bg-blue-500",
                              essay: "bg-emerald-500",
                              scenario: "bg-amber-500",
                            };
                            return analytics.projectsByType.map((item) => {
                              const Icon = typeIcons[item.type] || BookOpen;
                              const barColor = typeColors[item.type] || "bg-primary";
                              return (
                                <div key={item.type} data-testid={`bar-project-type-${item.type}`}>
                                  <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                                    <div className="flex items-center gap-1.5 text-sm">
                                      <Icon className="w-4 h-4 text-muted-foreground" />
                                      {projectTypeLabels[item.type] || item.type}
                                    </div>
                                    <span className="text-sm font-medium">{item.count}</span>
                                  </div>
                                  <div className="h-3 rounded-md bg-muted overflow-hidden">
                                    <div
                                      className={`h-full rounded-md ${barColor} transition-all duration-500`}
                                      style={{ width: `${(item.count / maxCount) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">لا توجد مشاريع بعد</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card data-testid="card-analytics-plans-chart">
                    <CardContent className="p-5">
                      <h3 className="font-medium mb-4 flex items-center gap-2 flex-wrap">
                        <Crown className="w-4 h-4" />
                        توزيع الخطط
                      </h3>
                      {analytics.planBreakdown.length > 0 ? (
                        <div className="space-y-3">
                          {(() => {
                            const maxCount = Math.max(...analytics.planBreakdown.map(p => p.count), 1);
                            const planColors: Record<string, string> = {
                              free: "bg-gray-400",
                              essay: "bg-emerald-500",
                              scenario: "bg-amber-500",
                              all_in_one: "bg-primary",
                            };
                            return analytics.planBreakdown.map((item) => {
                              const barColor = planColors[item.plan] || "bg-primary";
                              return (
                                <div key={item.plan} data-testid={`bar-plan-${item.plan}`}>
                                  <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                                    <div className="flex items-center gap-1.5 text-sm">
                                      {item.plan === "all_in_one" && <Crown className="w-4 h-4 text-muted-foreground" />}
                                      {planLabels[item.plan] || item.plan}
                                    </div>
                                    <span className="text-sm font-medium">{item.count}</span>
                                  </div>
                                  <div className="h-3 rounded-md bg-muted overflow-hidden">
                                    <div
                                      className={`h-full rounded-md ${barColor} transition-all duration-500`}
                                      style={{ width: `${(item.count / maxCount) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {analytics.totalWords !== undefined && (
                  <div className="mt-6">
                    <Card data-testid="card-analytics-total-words">
                      <CardContent className="p-5 text-center">
                        <PenTool className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                        <div className="text-3xl font-bold mb-1" data-testid="text-analytics-total-words">
                          {analytics.totalWords.toLocaleString("ar-EG")}
                        </div>
                        <div className="text-xs text-muted-foreground">إجمالي الكلمات على المنصة</div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {analytics.writingActivity && analytics.writingActivity.length > 0 && (
                  <div className="mt-6">
                    <Card data-testid="card-analytics-writing-activity">
                      <CardContent className="p-5">
                        <h3 className="font-medium mb-4 flex items-center gap-2 flex-wrap">
                          <TrendingUp className="w-4 h-4" />
                          نشاط الكتابة (آخر 30 يوم)
                        </h3>
                        <div className="space-y-1">
                          {(() => {
                            const maxWords = Math.max(...analytics.writingActivity!.map(d => d.words), 1);
                            return analytics.writingActivity!.map((day) => (
                              <div key={day.date} className="flex items-center gap-2" data-testid={`bar-activity-${day.date}`}>
                                <span className="text-[10px] text-muted-foreground w-16 shrink-0 text-left">
                                  {new Date(day.date).toLocaleDateString("ar-EG", { month: "short", day: "numeric" })}
                                </span>
                                <div className="flex-1 h-4 rounded-md bg-muted overflow-hidden">
                                  <div
                                    className="h-full rounded-md bg-primary transition-all duration-500"
                                    style={{ width: `${(day.words / maxWords) * 100}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-muted-foreground w-14 shrink-0">
                                  {day.words.toLocaleString("ar-EG")}
                                </span>
                              </div>
                            ));
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {analytics.topWriters && analytics.topWriters.length > 0 && (
                  <div className="mt-6">
                    <Card data-testid="card-analytics-top-writers">
                      <CardContent className="p-5">
                        <h3 className="font-medium mb-4 flex items-center gap-2 flex-wrap">
                          <Crown className="w-4 h-4" />
                          أفضل الكتّاب
                        </h3>
                        <div className="space-y-3">
                          {analytics.topWriters.map((writer, index) => (
                            <div key={index} className="flex items-center justify-between gap-2" data-testid={`row-top-writer-${index}`}>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-primary w-6 text-center">{index + 1}</span>
                                <span className="text-sm">{writer.name}</span>
                              </div>
                              <Badge variant="secondary"><LtrNum>{writer.words.toLocaleString("ar-EG")}</LtrNum> كلمة</Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">فشل في تحميل الإحصائيات</p>
              </div>
            )}
          </>
        )}

        {activeTab === "promos" && (
          <>
            <Card className="mb-6">
              <CardContent className="p-5 space-y-4">
                <h3 className="font-medium flex items-center gap-2 flex-wrap">
                  <Tag className="w-4 h-4" />
                  إنشاء كود خصم جديد
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label data-testid="label-promo-code">الكود</Label>
                    <Input
                      value={newPromo.code}
                      onChange={(e) => setNewPromo(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                      placeholder="مثال: SAVE20"
                      data-testid="input-new-promo-code"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label data-testid="label-promo-discount">نسبة الخصم (%)</Label>
                    <Input
                      type="number"
                      value={newPromo.discountPercent}
                      onChange={(e) => setNewPromo(p => ({ ...p, discountPercent: e.target.value }))}
                      placeholder="مثال: 20"
                      data-testid="input-new-promo-discount"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label data-testid="label-promo-max-uses">الحد الأقصى للاستخدام (اختياري)</Label>
                    <Input
                      type="number"
                      value={newPromo.maxUses}
                      onChange={(e) => setNewPromo(p => ({ ...p, maxUses: e.target.value }))}
                      placeholder="غير محدود"
                      data-testid="input-new-promo-max-uses"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label data-testid="label-promo-valid-until">تاريخ الانتهاء (اختياري)</Label>
                    <Input
                      type="date"
                      value={newPromo.validUntil}
                      onChange={(e) => setNewPromo(p => ({ ...p, validUntil: e.target.value }))}
                      data-testid="input-new-promo-valid-until"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label data-testid="label-promo-applicable">ينطبق على</Label>
                    <Select value={newPromo.applicableTo} onValueChange={(v) => setNewPromo(p => ({ ...p, applicableTo: v }))}>
                      <SelectTrigger data-testid="select-promo-applicable">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">الكل</SelectItem>
                        <SelectItem value="essay">المقالات</SelectItem>
                        <SelectItem value="scenario">السيناريوهات</SelectItem>
                        <SelectItem value="all_in_one">الخطة الشاملة</SelectItem>
                        <SelectItem value="novel">الروايات</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    if (!newPromo.code.trim() || !newPromo.discountPercent) {
                      toast({ title: "يرجى ملء الكود ونسبة الخصم", variant: "destructive" });
                      return;
                    }
                    const body: any = {
                      code: newPromo.code.trim(),
                      discountPercent: parseInt(newPromo.discountPercent),
                      applicableTo: newPromo.applicableTo,
                    };
                    if (newPromo.maxUses) body.maxUses = parseInt(newPromo.maxUses);
                    if (newPromo.validUntil) body.validUntil = newPromo.validUntil;
                    createPromoMutation.mutate(body);
                  }}
                  disabled={createPromoMutation.isPending}
                  data-testid="button-create-promo"
                >
                  {createPromoMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جارٍ الإنشاء...</>
                  ) : (
                    <><Tag className="w-4 h-4 ml-2" /> إنشاء كود الخصم</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {promosLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}><CardContent className="p-4"><Skeleton className="h-5 w-full" /></CardContent></Card>
                ))}
              </div>
            ) : promos && promos.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-right p-3 font-medium text-muted-foreground">الكود</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">نسبة الخصم</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">الحد الأقصى</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">الاستخدام</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">تاريخ الانتهاء</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">ينطبق على</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {promos.map((promo) => (
                        <tr key={promo.id} className="border-b last:border-0" data-testid={`row-promo-${promo.id}`}>
                          <td className="p-3 font-mono font-medium" data-testid={`text-promo-code-${promo.id}`}>{promo.code}</td>
                          <td className="p-3" data-testid={`text-promo-discount-${promo.id}`}>
                            <Badge variant="secondary"><LtrNum>{promo.discountPercent}%</LtrNum></Badge>
                          </td>
                          <td className="p-3 text-muted-foreground" data-testid={`text-promo-max-uses-${promo.id}`}>{promo.maxUses ?? "غير محدود"}</td>
                          <td className="p-3 text-muted-foreground" data-testid={`text-promo-used-${promo.id}`}>{promo.usedCount}</td>
                          <td className="p-3 text-xs text-muted-foreground" data-testid={`text-promo-valid-${promo.id}`}>
                            {promo.validUntil ? new Date(promo.validUntil).toLocaleDateString("ar-EG") : "غير محدد"}
                          </td>
                          <td className="p-3 text-xs" data-testid={`text-promo-applicable-${promo.id}`}>
                            {promo.applicableTo === "all" ? "الكل" : planLabels[promo.applicableTo] || projectTypeLabels[promo.applicableTo] || promo.applicableTo}
                          </td>
                          <td className="p-3" data-testid={`text-promo-status-${promo.id}`}>
                            <Badge variant={promo.active ? "default" : "outline"}>
                              {promo.active ? "نشط" : "معطل"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">لا توجد رموز خصم بعد</p>
              </div>
            )}
          </>
        )}

        {activeTab === "api-usage" && (
          <>
            {apiUsageLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {[1, 2, 3].map((i) => (
                  <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                      <Cpu className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">إجمالي الطلبات</p>
                      <p className="text-xl font-bold" data-testid="text-total-api-calls">
                        <LtrNum>{(apiUsageData || []).reduce((s, r) => s + r.totalCalls, 0).toLocaleString()}</LtrNum>
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                      <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">التكلفة التقديرية</p>
                      <p className="text-xl font-bold" data-testid="text-total-api-cost" dir="ltr">
                        ${((apiUsageData || []).reduce((s, r) => s + r.totalCostMicro, 0) / 1_000_000).toFixed(2)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg">
                      <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">مستخدمون معلّقون</p>
                      <p className="text-xl font-bold" data-testid="text-suspended-users">
                        <LtrNum>{(apiUsageData || []).filter(r => r.apiSuspended).length}</LtrNum>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="relative mb-4">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="بحث بالاسم أو البريد..."
                value={apiUsageSearch}
                onChange={(e) => setApiUsageSearch(e.target.value)}
                className="pr-9"
                data-testid="input-api-usage-search"
              />
            </div>

            {apiUsageLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
                ))}
              </div>
            ) : apiUsageData && apiUsageData.length > 0 ? (
              <>
                <div className="hidden md:block border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-right p-3 font-medium text-muted-foreground">المستخدم</th>
                          <th className="text-right p-3 font-medium text-muted-foreground">الطلبات</th>
                          <th className="text-right p-3 font-medium text-muted-foreground">التوكنز</th>
                          <th className="text-right p-3 font-medium text-muted-foreground">التكلفة</th>
                          <th className="text-right p-3 font-medium text-muted-foreground">الحالة</th>
                          <th className="text-right p-3 font-medium text-muted-foreground">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {apiUsageData
                          .filter(r => {
                            if (!apiUsageSearch.trim()) return true;
                            const q = apiUsageSearch.toLowerCase();
                            return (r.displayName || "").toLowerCase().includes(q) || (r.email || "").toLowerCase().includes(q);
                          })
                          .map((row) => (
                          <tr key={row.userId} className="border-b hover:bg-muted/30" data-testid={`row-api-usage-${row.userId}`}>
                            <td className="p-3">
                              <div className="font-medium">{row.displayName || "—"}</div>
                              <div className="text-xs text-muted-foreground" dir="ltr">{row.email || "—"}</div>
                            </td>
                            <td className="p-3"><LtrNum>{row.totalCalls.toLocaleString()}</LtrNum></td>
                            <td className="p-3"><LtrNum>{row.totalTokens.toLocaleString()}</LtrNum></td>
                            <td className="p-3" dir="ltr">${(row.totalCostMicro / 1_000_000).toFixed(4)}</td>
                            <td className="p-3">
                              {row.apiSuspended ? (
                                <Badge variant="destructive" className="text-xs">معلّق</Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">نشط</Badge>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setApiUsageDetailUser(row.userId);
                                    setShowApiUsageDialog(true);
                                  }}
                                  data-testid={`button-api-details-${row.userId}`}
                                >
                                  <Info className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant={row.apiSuspended ? "outline" : "destructive"}
                                  onClick={() => suspendApiMutation.mutate({ userId: row.userId, suspended: !row.apiSuspended })}
                                  disabled={suspendApiMutation.isPending}
                                  data-testid={`button-suspend-${row.userId}`}
                                >
                                  {suspendApiMutation.isPending ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : row.apiSuspended ? (
                                    <><ShieldOff className="w-3 h-3 ml-1" /> تفعيل</>
                                  ) : (
                                    <><ShieldAlert className="w-3 h-3 ml-1" /> تعليق</>
                                  )}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="md:hidden space-y-3">
                  {apiUsageData
                    .filter(r => {
                      if (!apiUsageSearch.trim()) return true;
                      const q = apiUsageSearch.toLowerCase();
                      return (r.displayName || "").toLowerCase().includes(q) || (r.email || "").toLowerCase().includes(q);
                    })
                    .map((row) => (
                    <Card key={row.userId} data-testid={`card-api-usage-${row.userId}`}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{row.displayName || "—"}</p>
                            <p className="text-xs text-muted-foreground" dir="ltr">{row.email || "—"}</p>
                          </div>
                          {row.apiSuspended ? (
                            <Badge variant="destructive" className="text-xs">معلّق</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">نشط</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div>
                            <p className="text-muted-foreground">الطلبات</p>
                            <p className="font-bold"><LtrNum>{row.totalCalls.toLocaleString()}</LtrNum></p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">التوكنز</p>
                            <p className="font-bold"><LtrNum>{row.totalTokens.toLocaleString()}</LtrNum></p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">التكلفة</p>
                            <p className="font-bold" dir="ltr">${(row.totalCostMicro / 1_000_000).toFixed(4)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                              setApiUsageDetailUser(row.userId);
                              setShowApiUsageDialog(true);
                            }}
                            data-testid={`button-api-details-m-${row.userId}`}
                          >
                            <Info className="w-3 h-3 ml-1" /> تفاصيل
                          </Button>
                          <Button
                            size="sm"
                            variant={row.apiSuspended ? "outline" : "destructive"}
                            className="flex-1"
                            onClick={() => suspendApiMutation.mutate({ userId: row.userId, suspended: !row.apiSuspended })}
                            disabled={suspendApiMutation.isPending}
                            data-testid={`button-suspend-m-${row.userId}`}
                          >
                            {row.apiSuspended ? (
                              <><ShieldOff className="w-3 h-3 ml-1" /> تفعيل</>
                            ) : (
                              <><ShieldAlert className="w-3 h-3 ml-1" /> تعليق</>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <Cpu className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">لا توجد بيانات استخدام API بعد</p>
              </div>
            )}
          </>
        )}

        {activeTab === "reviews" && (
          <>
            {reviewsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-5 w-1/3 mb-2" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : pendingReviews && pendingReviews.length > 0 ? (
              <div className="space-y-3">
                {pendingReviews.map((review) => (
                  <Card key={review.id} data-testid={`card-review-${review.id}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm" data-testid={`text-reviewer-name-${review.id}`}>
                            {review.reviewerName}
                          </span>
                          <div className="flex items-center gap-0.5" data-testid={`text-review-rating-${review.id}`}>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${i < review.rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}`}
                              />
                            ))}
                            <span className="text-xs text-muted-foreground mr-1">
                              <LtrNum>{review.rating}</LtrNum>/5
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground" data-testid={`text-review-date-${review.id}`}>
                          {review.createdAt ? new Date(review.createdAt).toLocaleDateString("ar-EG") : ""}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed" dir="rtl" data-testid={`text-review-content-${review.id}`}>
                        {review.content}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-200 dark:border-green-800 dark:text-green-400"
                          onClick={() => approveReviewMutation.mutate(review.id)}
                          disabled={approveReviewMutation.isPending || deleteReviewMutation.isPending}
                          data-testid={`button-approve-review-${review.id}`}
                        >
                          {approveReviewMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5 ml-1" />
                          )}
                          موافقة
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteReviewMutation.mutate(review.id)}
                          disabled={approveReviewMutation.isPending || deleteReviewMutation.isPending}
                          data-testid={`button-delete-review-${review.id}`}
                        >
                          {deleteReviewMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5 ml-1" />
                          )}
                          حذف
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground" data-testid="text-no-reviews">لا توجد مراجعات معلقة</p>
              </div>
            )}
          </>
        )}

        {activeTab === "tracking" && (
          <>
            {trackingLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-5 w-1/4 mb-4" />
                      <Skeleton className="h-10 w-full mb-3" />
                      <Skeleton className="h-10 w-full mb-3" />
                      <Skeleton className="h-8 w-24" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <Card data-testid="card-tiktok-pixel">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center">
                          <span className="text-white font-bold text-sm">TT</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-base">TikTok Pixel</h3>
                          <p className="text-xs text-muted-foreground">تتبع الأحداث على تيك توك (بكسل + Events API)</p>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <span className="text-xs text-muted-foreground">{tiktokConfig.enabled ? "مفعّل" : "معطّل"}</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={tiktokConfig.enabled}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${tiktokConfig.enabled ? "bg-primary" : "bg-muted"}`}
                          onClick={() => setTiktokConfig(c => ({ ...c, enabled: !c.enabled }))}
                          data-testid="toggle-tiktok-enabled"
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${tiktokConfig.enabled ? "translate-x-1" : "translate-x-6"}`} />
                        </button>
                      </label>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm mb-1.5 block">معرّف البكسل (Pixel ID)</Label>
                        <Input
                          value={tiktokConfig.pixelId}
                          onChange={(e) => setTiktokConfig(c => ({ ...c, pixelId: e.target.value }))}
                          placeholder="مثال: C5XXXXXXXXXXXXXXXXXX"
                          dir="ltr"
                          className="text-left"
                          data-testid="input-tiktok-pixel-id"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">تجده في TikTok Events Manager → Setup → Pixel ID</p>
                      </div>
                      <div>
                        <Label className="text-sm mb-1.5 block">رمز الوصول (Access Token) — اختياري للتتبع من الخادم</Label>
                        <Input
                          value={tiktokConfig.accessToken}
                          onChange={(e) => setTiktokConfig(c => ({ ...c, accessToken: e.target.value }))}
                          placeholder={tiktokConfig.hasAccessToken ? "••••••••  (محفوظ — أدخل قيمة جديدة للتحديث)" : "رمز الوصول لـ TikTok Events API"}
                          dir="ltr"
                          type="password"
                          className="text-left"
                          data-testid="input-tiktok-access-token"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {tiktokConfig.hasAccessToken && !tiktokConfig.accessToken ? "✓ رمز الوصول محفوظ بأمان. أدخل قيمة جديدة فقط إذا أردت التحديث" : "مطلوب لتتبع الأحداث من الخادم (Server-Side Events). اتركه فارغاً لتتبع المتصفح فقط"}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => saveTrackingPixelMutation.mutate({ platform: "tiktok", pixelId: tiktokConfig.pixelId, accessToken: tiktokConfig.accessToken, enabled: tiktokConfig.enabled })}
                      disabled={saveTrackingPixelMutation.isPending || !tiktokConfig.pixelId.trim()}
                      data-testid="button-save-tiktok"
                    >
                      {saveTrackingPixelMutation.isPending ? <Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> : <Check className="w-4 h-4 ml-1.5" />}
                      حفظ إعدادات TikTok
                    </Button>
                  </CardContent>
                </Card>

                <Card data-testid="card-facebook-pixel">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                          <span className="text-white font-bold text-sm">FB</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-base">Facebook Pixel</h3>
                          <p className="text-xs text-muted-foreground">تتبع الأحداث على فيسبوك وإنستجرام (بكسل + Conversions API)</p>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <span className="text-xs text-muted-foreground">{facebookConfig.enabled ? "مفعّل" : "معطّل"}</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={facebookConfig.enabled}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${facebookConfig.enabled ? "bg-primary" : "bg-muted"}`}
                          onClick={() => setFacebookConfig(c => ({ ...c, enabled: !c.enabled }))}
                          data-testid="toggle-facebook-enabled"
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${facebookConfig.enabled ? "translate-x-1" : "translate-x-6"}`} />
                        </button>
                      </label>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm mb-1.5 block">معرّف البكسل (Pixel ID)</Label>
                        <Input
                          value={facebookConfig.pixelId}
                          onChange={(e) => setFacebookConfig(c => ({ ...c, pixelId: e.target.value }))}
                          placeholder="مثال: 1234567890123456"
                          dir="ltr"
                          className="text-left"
                          data-testid="input-facebook-pixel-id"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">تجده في Facebook Events Manager → Data Sources → Pixel ID</p>
                      </div>
                      <div>
                        <Label className="text-sm mb-1.5 block">رمز الوصول (Access Token) — اختياري للتتبع من الخادم</Label>
                        <Input
                          value={facebookConfig.accessToken}
                          onChange={(e) => setFacebookConfig(c => ({ ...c, accessToken: e.target.value }))}
                          placeholder={facebookConfig.hasAccessToken ? "••••••••  (محفوظ — أدخل قيمة جديدة للتحديث)" : "رمز الوصول لـ Facebook Conversions API"}
                          dir="ltr"
                          type="password"
                          className="text-left"
                          data-testid="input-facebook-access-token"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {facebookConfig.hasAccessToken && !facebookConfig.accessToken ? "✓ رمز الوصول محفوظ بأمان. أدخل قيمة جديدة فقط إذا أردت التحديث" : "مطلوب لتتبع الأحداث من الخادم (Server-Side Events). اتركه فارغاً لتتبع المتصفح فقط"}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => saveTrackingPixelMutation.mutate({ platform: "facebook", pixelId: facebookConfig.pixelId, accessToken: facebookConfig.accessToken, enabled: facebookConfig.enabled })}
                      disabled={saveTrackingPixelMutation.isPending || !facebookConfig.pixelId.trim()}
                      data-testid="button-save-facebook"
                    >
                      {saveTrackingPixelMutation.isPending ? <Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> : <Check className="w-4 h-4 ml-1.5" />}
                      حفظ إعدادات Facebook
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                      <div className="text-xs text-muted-foreground space-y-1.5 leading-relaxed" dir="rtl">
                        <p><strong>التتبع من المتصفح:</strong> يتم تلقائياً عند تفعيل البكسل — يتتبع مشاهدات الصفحات وتفاعلات المستخدم.</p>
                        <p><strong>التتبع من الخادم (Events API):</strong> يتطلب إدخال رمز الوصول — يتتبع عمليات الشراء وإنشاء المشاريع بدقة أعلى.</p>
                        <p>رموز الوصول محفوظة بأمان على الخادم ولا تُرسل أبداً إلى المتصفح.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}

        {activeTab === "essays" && (
          <>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-6">
              <h2 className="font-serif text-lg font-bold flex-1">تحليلات المقالات</h2>
              <Select value={essaySortBy} onValueChange={(v) => setEssaySortBy(v as "views" | "clicks" | "ctr")}>
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-essay-sort">
                  <SelectValue placeholder="ترتيب حسب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clicks">الأكثر نقراً</SelectItem>
                  <SelectItem value="views">الأكثر مشاهدة</SelectItem>
                  <SelectItem value="ctr">أعلى CTR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {essayAnalyticsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-5 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : sortedEssayAnalytics.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <Card data-testid="card-total-essays">
                    <CardContent className="p-5 text-center">
                      <div className="text-3xl font-bold mb-1"><LtrNum>{sortedEssayAnalytics.length}</LtrNum></div>
                      <div className="text-xs text-muted-foreground">إجمالي المقالات</div>
                    </CardContent>
                  </Card>
                  <Card data-testid="card-total-essay-views">
                    <CardContent className="p-5 text-center">
                      <div className="text-3xl font-bold mb-1 text-blue-500"><LtrNum>{sortedEssayAnalytics.reduce((s, e) => s + e.views, 0)}</LtrNum></div>
                      <div className="text-xs text-muted-foreground">إجمالي المشاهدات</div>
                    </CardContent>
                  </Card>
                  <Card data-testid="card-total-essay-clicks">
                    <CardContent className="p-5 text-center">
                      <div className="text-3xl font-bold mb-1 text-green-500"><LtrNum>{sortedEssayAnalytics.reduce((s, e) => s + e.clicks, 0)}</LtrNum></div>
                      <div className="text-xs text-muted-foreground">إجمالي النقرات</div>
                    </CardContent>
                  </Card>
                  <Card data-testid="card-avg-ctr">
                    <CardContent className="p-5 text-center">
                      <div className="text-3xl font-bold mb-1 text-amber-500">
                        <LtrNum>
                          {(() => {
                            const totalViews = sortedEssayAnalytics.reduce((s, e) => s + e.views, 0);
                            const totalClicks = sortedEssayAnalytics.reduce((s, e) => s + e.clicks, 0);
                            return totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : "0";
                          })()}%
                        </LtrNum>
                      </div>
                      <div className="text-xs text-muted-foreground">متوسط CTR</div>
                    </CardContent>
                  </Card>
                </div>

                <div className="hidden sm:block border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-right p-3 font-medium text-muted-foreground">#</th>
                          <th className="text-right p-3 font-medium text-muted-foreground">العنوان</th>
                          <th className="text-right p-3 font-medium text-muted-foreground">المشاهدات</th>
                          <th className="text-right p-3 font-medium text-muted-foreground">النقرات</th>
                          <th className="text-right p-3 font-medium text-muted-foreground">CTR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedEssayAnalytics.map((essay, idx) => {
                          const ctr = essay.views > 0 ? ((essay.clicks / essay.views) * 100).toFixed(1) : "0";
                          return (
                            <tr key={essay.projectId} className="border-b last:border-0 hover:bg-muted/30 transition-colors" data-testid={`row-essay-${essay.projectId}`}>
                              <td className="p-3 text-muted-foreground"><LtrNum>{idx + 1}</LtrNum></td>
                              <td className="p-3 font-medium max-w-[400px] truncate">{essay.title}</td>
                              <td className="p-3">
                                <div className="flex items-center gap-1.5">
                                  <Eye className="w-3.5 h-3.5 text-blue-500" />
                                  <LtrNum>{essay.views.toLocaleString()}</LtrNum>
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-1.5">
                                  <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                                  <LtrNum>{essay.clicks.toLocaleString()}</LtrNum>
                                </div>
                              </td>
                              <td className="p-3">
                                <Badge variant="secondary"><LtrNum>{ctr}%</LtrNum></Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="sm:hidden space-y-3">
                  {sortedEssayAnalytics.map((essay, idx) => {
                    const ctr = essay.views > 0 ? ((essay.clicks / essay.views) * 100).toFixed(1) : "0";
                    return (
                      <Card key={essay.projectId} data-testid={`card-essay-${essay.projectId}`}>
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-medium text-sm line-clamp-2">{essay.title}</span>
                            <span className="font-mono text-xs text-muted-foreground shrink-0">#{idx + 1}</span>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Eye className="w-3.5 h-3.5 text-blue-500" />
                              <LtrNum>{essay.views.toLocaleString()}</LtrNum> مشاهدة
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                              <LtrNum>{essay.clicks.toLocaleString()}</LtrNum> نقرة
                            </div>
                            <Badge variant="secondary" className="text-[10px]">
                              CTR: <LtrNum>{ctr}%</LtrNum>
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">لا توجد مقالات منشورة بعد</p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {activeTab === "social" && (
          <>
            <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
              <h2 className="font-medium flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                إدارة روابط التواصل الاجتماعي
              </h2>
              <Button size="sm" onClick={openAddSocialDialog} data-testid="button-add-social-link">
                <Plus className="w-4 h-4 ml-1" />
                إضافة رابط جديد
              </Button>
            </div>

            {socialLinksLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
                ))}
              </div>
            ) : socialLinks && socialLinks.length > 0 ? (
              <>
                <div className="hidden sm:block border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-right p-3 font-medium text-muted-foreground">المنصة</th>
                          <th className="text-right p-3 font-medium text-muted-foreground">الرابط</th>
                          <th className="text-right p-3 font-medium text-muted-foreground">الترتيب</th>
                          <th className="text-right p-3 font-medium text-muted-foreground">الحالة</th>
                          <th className="text-right p-3 font-medium text-muted-foreground">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...socialLinks].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)).map((link) => {
                          const platformInfo = getPlatformInfo(link.platform);
                          const PlatformIcon = platformInfo?.icon;
                          return (
                            <tr key={link.id} className="border-b last:border-0" data-testid={`row-social-link-${link.id}`}>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  {PlatformIcon && <PlatformIcon className="w-4 h-4" />}
                                  <span className="font-medium">{platformInfo?.label || link.platform}</span>
                                </div>
                              </td>
                              <td className="p-3">
                                <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground flex items-center gap-1" dir="ltr" data-testid={`link-social-url-${link.id}`}>
                                  <span className="truncate max-w-[200px]">{link.url}</span>
                                  <ExternalLink className="w-3 h-3 shrink-0" />
                                </a>
                              </td>
                              <td className="p-3">
                                <Badge variant="secondary" data-testid={`text-social-order-${link.id}`}>
                                  <LtrNum>{link.displayOrder || 0}</LtrNum>
                                </Badge>
                              </td>
                              <td className="p-3">
                                {link.enabled ? (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" data-testid={`badge-social-enabled-${link.id}`}>مفعّل</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground" data-testid={`badge-social-disabled-${link.id}`}>معطّل</Badge>
                                )}
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => openEditSocialDialog(link)}
                                    data-testid={`button-edit-social-${link.id}`}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => upsertSocialLinkMutation.mutate({ platform: link.platform, url: link.url, enabled: !link.enabled, displayOrder: link.displayOrder || 0 })}
                                    disabled={upsertSocialLinkMutation.isPending}
                                    data-testid={`button-toggle-social-${link.id}`}
                                  >
                                    {link.enabled ? <Eye className="w-4 h-4" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="text-destructive"
                                    onClick={() => setDeletingSocialId(link.id)}
                                    data-testid={`button-delete-social-${link.id}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="sm:hidden space-y-3">
                  {[...socialLinks].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)).map((link) => {
                    const platformInfo = getPlatformInfo(link.platform);
                    const PlatformIcon = platformInfo?.icon;
                    return (
                      <Card key={link.id} data-testid={`card-social-link-${link.id}`}>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {PlatformIcon && <PlatformIcon className="w-5 h-5" />}
                              <span className="font-medium text-sm">{platformInfo?.label || link.platform}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-[10px]"><LtrNum>{link.displayOrder || 0}</LtrNum></Badge>
                              {link.enabled ? (
                                <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">مفعّل</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] text-muted-foreground">معطّل</Badge>
                              )}
                            </div>
                          </div>
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground flex items-center gap-1" dir="ltr">
                            <span className="truncate">{link.url}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditSocialDialog(link)} data-testid={`button-edit-social-m-${link.id}`}>
                              <Pencil className="w-3.5 h-3.5 ml-1" />
                              تعديل
                            </Button>
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => upsertSocialLinkMutation.mutate({ platform: link.platform, url: link.url, enabled: !link.enabled, displayOrder: link.displayOrder || 0 })} data-testid={`button-toggle-social-m-${link.id}`}>
                              {link.enabled ? "تعطيل" : "تفعيل"}
                            </Button>
                            <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeletingSocialId(link.id)} data-testid={`button-delete-social-m-${link.id}`}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <Share2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">لا توجد روابط تواصل اجتماعي بعد</p>
                <Button variant="outline" onClick={openAddSocialDialog} data-testid="button-add-social-link-empty">
                  <Plus className="w-4 h-4 ml-1" />
                  إضافة رابط جديد
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      <Dialog open={showSocialDialog} onOpenChange={(open) => { if (!open) { setShowSocialDialog(false); setEditingSocialLink(null); } }}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle data-testid="text-social-dialog-title">{editingSocialLink ? "تعديل رابط التواصل" : "إضافة رابط تواصل جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>المنصة</Label>
              <Select
                value={socialForm.platform}
                onValueChange={(v) => setSocialForm(f => ({ ...f, platform: v }))}
                disabled={!!editingSocialLink}
              >
                <SelectTrigger data-testid="select-social-platform">
                  <SelectValue placeholder="اختر المنصة" />
                </SelectTrigger>
                <SelectContent>
                  {SOCIAL_PLATFORMS.map((p) => {
                    const alreadyExists = !editingSocialLink && socialLinks?.some(l => l.platform === p.value);
                    return (
                      <SelectItem key={p.value} value={p.value} disabled={alreadyExists}>
                        <div className="flex items-center gap-2">
                          <p.icon className="w-4 h-4" />
                          <span>{p.label}</span>
                          {alreadyExists && <span className="text-xs text-muted-foreground">(مضاف)</span>}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>الرابط (URL)</Label>
              <Input
                value={socialForm.url}
                onChange={(e) => setSocialForm(f => ({ ...f, url: e.target.value }))}
                placeholder="https://..."
                dir="ltr"
                className="text-left"
                data-testid="input-social-url"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>ترتيب العرض</Label>
                <Input
                  type="number"
                  min="0"
                  value={socialForm.displayOrder}
                  onChange={(e) => setSocialForm(f => ({ ...f, displayOrder: parseInt(e.target.value) || 0 }))}
                  data-testid="input-social-order"
                />
              </div>
              <div className="space-y-1.5">
                <Label>الحالة</Label>
                <div className="flex items-center gap-2 h-9">
                  <Checkbox
                    checked={socialForm.enabled}
                    onCheckedChange={(checked) => setSocialForm(f => ({ ...f, enabled: !!checked }))}
                    data-testid="checkbox-social-enabled"
                  />
                  <span className="text-sm">{socialForm.enabled ? "مفعّل" : "معطّل"}</span>
                </div>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => {
                if (!socialForm.platform || !socialForm.url.trim()) {
                  toast({ title: "يرجى اختيار المنصة وإدخال الرابط", variant: "destructive" });
                  return;
                }
                upsertSocialLinkMutation.mutate({
                  platform: socialForm.platform,
                  url: socialForm.url.trim(),
                  enabled: socialForm.enabled,
                  displayOrder: socialForm.displayOrder,
                });
              }}
              disabled={upsertSocialLinkMutation.isPending}
              data-testid="button-save-social-link"
            >
              {upsertSocialLinkMutation.isPending ? (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 ml-2" />
              )}
              {editingSocialLink ? "تحديث الرابط" : "إضافة الرابط"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deletingSocialId !== null} onOpenChange={(open) => { if (!open) setDeletingSocialId(null); }}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle data-testid="text-delete-social-title">تأكيد الحذف</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">هل أنت متأكد من حذف هذا الرابط؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => deletingSocialId && deleteSocialLinkMutation.mutate(deletingSocialId)}
                disabled={deleteSocialLinkMutation.isPending}
                data-testid="button-confirm-delete-social"
              >
                {deleteSocialLinkMutation.isPending ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Trash2 className="w-4 h-4 ml-1" />}
                حذف
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setDeletingSocialId(null)} data-testid="button-cancel-delete-social">
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showApiUsageDialog} onOpenChange={(open) => { setShowApiUsageDialog(open); if (!open) setApiUsageDetailUser(null); }}>
        <DialogContent className="max-w-3xl max-h-[80vh]" dir="rtl">
          <DialogHeader>
            <DialogTitle>تفاصيل استخدام API</DialogTitle>
          </DialogHeader>
          {apiUserLogsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : apiUserLogs && apiUserLogs.length > 0 ? (
            <ScrollArea className="max-h-[60vh]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-right p-2 font-medium text-muted-foreground text-xs">الميزة</th>
                      <th className="text-right p-2 font-medium text-muted-foreground text-xs">النموذج</th>
                      <th className="text-right p-2 font-medium text-muted-foreground text-xs">المدخل</th>
                      <th className="text-right p-2 font-medium text-muted-foreground text-xs">المخرج</th>
                      <th className="text-right p-2 font-medium text-muted-foreground text-xs">التكلفة</th>
                      <th className="text-right p-2 font-medium text-muted-foreground text-xs">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apiUserLogs.map((log) => (
                      <tr key={log.id} className="border-b" data-testid={`row-api-log-${log.id}`}>
                        <td className="p-2 text-xs">{featureLabels[log.feature] || log.feature}</td>
                        <td className="p-2 text-xs" dir="ltr">{log.model}</td>
                        <td className="p-2 text-xs"><LtrNum>{log.promptTokens.toLocaleString()}</LtrNum></td>
                        <td className="p-2 text-xs"><LtrNum>{log.completionTokens.toLocaleString()}</LtrNum></td>
                        <td className="p-2 text-xs" dir="ltr">${(log.estimatedCostMicro / 1_000_000).toFixed(6)}</td>
                        <td className="p-2 text-xs" dir="ltr">{new Date(log.createdAt).toLocaleString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          ) : (
            <p className="text-center text-muted-foreground py-8">لا توجد سجلات استخدام</p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showProjectsDialog} onOpenChange={setShowProjectsDialog}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>مشاريع المستخدم</DialogTitle>
          </DialogHeader>
          {userProjectsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : userProjects && userProjects.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {userProjects.map((p) => (
                <Card key={p.id} data-testid={`card-user-project-${p.id}`}>
                  <CardContent className="p-3 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{p.title}</div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">
                          {projectTypeLabels[p.projectType || "novel"] || p.projectType}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {projectStatusLabels[p.status] || p.status}
                        </Badge>
                        {p.paid && (
                          <Badge variant="default" className="text-[10px] bg-green-600">
                            مدفوع
                          </Badge>
                        )}
                        {p.flagged && (
                          <Badge variant="destructive" className="text-[10px]">
                            <Flag className="w-3 h-3 ml-0.5" />
                            مُبلّغ
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setContentProjectId(p.id);
                          setShowContentDialog(true);
                        }}
                        data-testid={`button-view-content-${p.id}`}
                      >
                        <Eye className="w-4 h-4 ml-1" />
                        عرض المحتوى
                      </Button>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString("ar-EG") : ""}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FolderOpen className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">لا توجد مشاريع لهذا المستخدم</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تغيير خطة المستخدم</DialogTitle>
          </DialogHeader>
          {planChangeUser && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                المستخدم: {[planChangeUser.firstName, planChangeUser.lastName].filter(Boolean).join(" ") || planChangeUser.email || planChangeUser.id}
              </div>
              <div className="text-sm text-muted-foreground">
                الخطة الحالية: <Badge variant="outline">{planLabels[planChangeUser.plan] || planChangeUser.plan}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(["free", "essay", "scenario", "all_in_one"] as const).map((plan) => (
                  <Button
                    key={plan}
                    variant={planChangeUser.plan === plan ? "default" : "outline"}
                    className="w-full"
                    disabled={planChangeUser.plan === plan || updatePlanMutation.isPending}
                    onClick={() => updatePlanMutation.mutate({ userId: planChangeUser.id, plan })}
                    data-testid={`button-set-plan-${plan}`}
                  >
                    {plan === "all_in_one" && <Crown className="w-4 h-4 ml-1" />}
                    {planLabels[plan]}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إدارة محاولات التحليل</DialogTitle>
          </DialogHeader>
          {grantUser && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                المستخدم: {[grantUser.firstName, grantUser.lastName].filter(Boolean).join(" ") || grantUser.email || grantUser.id}
              </div>
              <div className="space-y-2">
                <Label>المشروع</Label>
                <Select value={grantProjectId} onValueChange={setGrantProjectId}>
                  <SelectTrigger data-testid="select-grant-project">
                    <SelectValue placeholder="اختر مشروعاً" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المشاريع (إضافة)</SelectItem>
                    {grantUserProjects?.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedGrantProject && (
                <>
                  <div className="rounded-md border p-3 space-y-3 bg-muted/30" data-testid="section-current-analysis-counts">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium text-muted-foreground">الاستخدام الحالي:</div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] px-2"
                        onClick={() => { setGrantContinuityUsed("0"); setGrantStyleUsed("0"); }}
                        data-testid="button-reset-usage"
                      >
                        تصفير الاستخدام
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-0.5">
                        <div className="font-medium">فحص الاستمرارية</div>
                        <div className="text-muted-foreground">
                          المتاح: <LtrNum>{Math.max(0, FREE_ANALYSIS_USES + ((parseInt(grantContinuity) || 0) * PAID_ANALYSIS_USES) - (parseInt(grantContinuityUsed) || 0))}</LtrNum>
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <div className="font-medium">تحليل الأسلوب</div>
                        <div className="text-muted-foreground">
                          المتاح: <LtrNum>{Math.max(0, FREE_ANALYSIS_USES + ((parseInt(grantStyle) || 0) * PAID_ANALYSIS_USES) - (parseInt(grantStyleUsed) || 0))}</LtrNum>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">المرات المستخدمة - فحص الاستمرارية</Label>
                      <Input
                        type="number"
                        min="0"
                        value={grantContinuityUsed}
                        onChange={(e) => setGrantContinuityUsed(e.target.value)}
                        data-testid="input-grant-continuity-used"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">المرات المستخدمة - تحليل الأسلوب</Label>
                      <Input
                        type="number"
                        min="0"
                        value={grantStyleUsed}
                        onChange={(e) => setGrantStyleUsed(e.target.value)}
                        data-testid="input-grant-style-used"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">الباقات المدفوعة - فحص الاستمرارية</Label>
                      <Input
                        type="number"
                        min="0"
                        value={grantContinuity}
                        onChange={(e) => setGrantContinuity(e.target.value)}
                        data-testid="input-grant-continuity"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">الباقات المدفوعة - تحليل الأسلوب</Label>
                      <Input
                        type="number"
                        min="0"
                        value={grantStyle}
                        onChange={(e) => setGrantStyle(e.target.value)}
                        data-testid="input-grant-style"
                      />
                    </div>
                  </div>
                </>
              )}

              {!selectedGrantProject && (
                <>
                  <div className="space-y-2">
                    <Label>عدد محاولات فحص الاستمرارية (إضافة)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={grantContinuity}
                      onChange={(e) => setGrantContinuity(e.target.value)}
                      data-testid="input-grant-continuity"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>عدد محاولات تحليل الأسلوب (إضافة)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={grantStyle}
                      onChange={(e) => setGrantStyle(e.target.value)}
                      data-testid="input-grant-style"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">سيتم إضافة المحاولات لجميع مشاريع المستخدم</p>
                </>
              )}

              <Button
                className="w-full"
                disabled={
                  (selectedGrantProject ? setAnalysisCountsMutation.isPending : grantAnalysisMutation.isPending) ||
                  (!selectedGrantProject && parseInt(grantContinuity) <= 0 && parseInt(grantStyle) <= 0)
                }
                onClick={() => {
                  if (selectedGrantProject) {
                    setAnalysisCountsMutation.mutate({
                      projectId: selectedGrantProject.id,
                      continuityCheckPaidCount: Math.max(0, parseInt(grantContinuity) || 0),
                      styleAnalysisPaidCount: Math.max(0, parseInt(grantStyle) || 0),
                      continuityCheckCount: Math.max(0, parseInt(grantContinuityUsed) || 0),
                      styleAnalysisCount: Math.max(0, parseInt(grantStyleUsed) || 0),
                    });
                  } else {
                    grantAnalysisMutation.mutate({
                      userId: grantUser.id,
                      continuityUses: parseInt(grantContinuity) || 0,
                      styleUses: parseInt(grantStyle) || 0,
                    });
                  }
                }}
                data-testid="button-submit-grant-analysis"
              >
                {(grantAnalysisMutation.isPending || setAnalysisCountsMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <BarChart3 className="w-4 h-4 ml-2" />}
                {selectedGrantProject ? "تحديث المحاولات" : "منح المحاولات"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showContentDialog} onOpenChange={(open) => { if (!open) { setShowContentDialog(false); setContentProjectId(null); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle data-testid="text-content-dialog-title">محتوى المشروع</DialogTitle>
          </DialogHeader>
          {contentLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : projectContent ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h3 className="font-serif font-semibold" data-testid="text-content-project-title">{projectContent.project.title}</h3>
                <div className="flex items-center gap-2">
                  {projectContent.project.flagged ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => contentProjectId && flagProjectMutation.mutate({ projectId: contentProjectId, flagged: false })}
                      disabled={flagProjectMutation.isPending}
                      data-testid="button-unflag-project"
                    >
                      <FlagOff className="w-4 h-4 ml-1" />
                      إلغاء التبليغ
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => contentProjectId && flagProjectMutation.mutate({ projectId: contentProjectId, flagged: true, reason: "محتوى مخالف" })}
                      disabled={flagProjectMutation.isPending}
                      data-testid="button-flag-project"
                    >
                      <Flag className="w-4 h-4 ml-1" />
                      تبليغ عن المحتوى
                    </Button>
                  )}
                </div>
              </div>
              {projectContent.project.flagged && (
                <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/20 text-sm text-red-700 dark:text-red-400" data-testid="text-flag-reason">
                  <Flag className="w-4 h-4 inline ml-1" />
                  مُبلّغ: {projectContent.project.flagReason || "بدون سبب"}
                </div>
              )}
              <div className="space-y-3">
                {projectContent.chapters && projectContent.chapters.length > 0 ? (
                  projectContent.chapters
                    .sort((a: any, b: any) => a.chapterNumber - b.chapterNumber)
                    .map((ch: any) => (
                      <Card key={ch.id} data-testid={`card-content-chapter-${ch.id}`}>
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-primary">{ch.chapterNumber}.</span>
                            <span className="font-serif font-medium">{ch.title}</span>
                            <Badge variant="secondary" className="text-[10px]">{ch.status}</Badge>
                          </div>
                          {ch.content && (
                            <ScrollArea className="max-h-[200px]">
                              <p className="text-sm font-serif leading-[2] whitespace-pre-wrap text-muted-foreground" data-testid={`text-content-chapter-text-${ch.id}`}>
                                {ch.content}
                              </p>
                            </ScrollArea>
                          )}
                        </CardContent>
                      </Card>
                    ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">لا توجد فصول لهذا المشروع</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">فشل في تحميل المحتوى</p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showBulkPlanDialog} onOpenChange={setShowBulkPlanDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle data-testid="text-bulk-plan-title">تغيير خطة المستخدمين المحددين</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground" data-testid="text-bulk-plan-count">
              عدد المستخدمين المحددين: {selectedUsers.size}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(["free", "essay", "scenario", "all_in_one"] as const).map((plan) => (
                <Button
                  key={plan}
                  variant="outline"
                  className="w-full"
                  disabled={bulkPlanMutation.isPending}
                  onClick={() => bulkPlanMutation.mutate({ userIds: Array.from(selectedUsers), plan })}
                  data-testid={`button-bulk-set-plan-${plan}`}
                >
                  {bulkPlanMutation.isPending ? (
                    <Loader2 className="w-4 h-4 ml-1 animate-spin" />
                  ) : plan === "all_in_one" ? (
                    <Crown className="w-4 h-4 ml-1" />
                  ) : null}
                  {planLabels[plan]}
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
