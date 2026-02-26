import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Feather, LogOut, ShieldCheck, Ticket, Clock, Search, ArrowRight, AlertCircle, Users, FolderOpen, Crown, BarChart3, BookOpen, FileText, Film } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SupportTicket, NovelProject } from "@shared/schema";

interface AnalyticsData {
  totalUsers: number;
  totalProjects: number;
  projectsByType: { type: string; count: number }[];
  planBreakdown: { plan: string; count: number }[];
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
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"tickets" | "users" | "analytics">("tickets");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showProjectsDialog, setShowProjectsDialog] = useState(false);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [planChangeUser, setPlanChangeUser] = useState<AdminUser | null>(null);
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

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <div className="flex items-center gap-3 cursor-pointer">
                <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
                  <Feather className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-serif text-xl font-bold">QalamAI</span>
              </div>
            </Link>
            <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              لوحة الإدارة
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="link-dashboard">
                <ArrowRight className="w-4 h-4 ml-1" />
                المشاريع
              </Button>
            </Link>
            <Avatar className="w-8 h-8">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback className="text-xs">
                {user?.firstName?.[0] || "م"}
              </AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" onClick={() => logout()} data-testid="button-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <h1 className="font-serif text-3xl font-bold mb-8" data-testid="text-admin-title">
          لوحة الإدارة
        </h1>

        <div className="flex flex-wrap items-center gap-2 mb-8">
          <Button
            variant={activeTab === "tickets" ? "default" : "outline"}
            onClick={() => setActiveTab("tickets")}
            data-testid="button-tab-tickets"
          >
            <Ticket className="w-4 h-4 ml-2" />
            تذاكر الدعم
          </Button>
          <Button
            variant={activeTab === "users" ? "default" : "outline"}
            onClick={() => setActiveTab("users")}
            data-testid="button-tab-users"
          >
            <Users className="w-4 h-4 ml-2" />
            المستخدمون
          </Button>
          <Button
            variant={activeTab === "analytics" ? "default" : "outline"}
            onClick={() => setActiveTab("analytics")}
            data-testid="button-tab-analytics"
          >
            <BarChart3 className="w-4 h-4 ml-2" />
            إحصائيات
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

            <div className="flex flex-wrap items-center gap-4 mb-6">
              <div className="relative flex-1 min-w-[200px] max-w-md">
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
                <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
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
              <div className="border rounded-lg overflow-hidden">
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
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <div className="relative flex-1 min-w-[200px] max-w-md">
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
                {adminUsers ? `${adminUsers.length} مستخدم` : ""}
              </div>
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
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
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
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
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
              </>
            ) : (
              <div className="text-center py-16">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">فشل في تحميل الإحصائيات</p>
              </div>
            )}
          </>
        )}
      </main>

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
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString("ar-EG") : ""}
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
    </div>
  );
}
