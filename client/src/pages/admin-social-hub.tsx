import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowRight, Megaphone, Calendar, Clock, Copy, Check, Trash2, Edit3,
  Loader2, Sparkles, BarChart3, Settings, LayoutDashboard, ListOrdered,
  Wand2, Facebook, Instagram, Linkedin, RefreshCw, Search, CopyPlus,
  ChevronLeft, ChevronRight, AlertTriangle, CalendarDays
} from "lucide-react";
import { SiX, SiTiktok } from "react-icons/si";

const SUPER_ADMIN_IDS = ["39706084", "e482facd-d157-4e97-ad91-af96b8ec8f49"];

const PLATFORM_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  facebook: { label: "Facebook", icon: Facebook, color: "text-blue-600" },
  instagram: { label: "Instagram", icon: Instagram, color: "text-pink-500" },
  x: { label: "X", icon: SiX, color: "text-foreground" },
  tiktok: { label: "TikTok", icon: SiTiktok, color: "text-red-500" },
  linkedin: { label: "LinkedIn", icon: Linkedin, color: "text-blue-500" },
};

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "مسودة", variant: "secondary" },
  scheduled: { label: "مجدول", variant: "default" },
  posted: { label: "نُشر", variant: "outline" },
  needs_manual: { label: "يحتاج نشر يدوي", variant: "destructive" },
};

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="p-1.5 rounded hover:bg-muted transition-colors"
      title="نسخ"
      data-testid="button-copy-post"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  );
}

function PlatformBadges({ platforms }: { platforms: string[] }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {platforms.map((p) => {
        const cfg = PLATFORM_CONFIG[p];
        if (!cfg) return null;
        const Icon = cfg.icon;
        return (
          <span key={p} className={`inline-flex items-center gap-1 text-xs ${cfg.color}`} data-testid={`badge-platform-${p}`}>
            <Icon className="w-3 h-3" />
          </span>
        );
      })}
    </div>
  );
}

function PostCard({ post, onDelete, onStatusChange, onReschedule, onPublish, onDuplicate }: {
  post: any;
  onDelete: (id: number) => void;
  onStatusChange: (id: number, status: string) => void;
  onReschedule: (id: number, scheduledAt: string) => void;
  onPublish?: (id: number) => void;
  onDuplicate?: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleTime, setRescheduleTime] = useState("");
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/admin/social/posts/${post.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social/posts"] });
      setEditing(false);
      toast({ title: "تم تحديث المنشور" });
    },
  });

  const statusInfo = STATUS_MAP[post.status] || STATUS_MAP.draft;

  return (
    <Card className="group" data-testid={`card-social-post-${post.id}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant={statusInfo.variant} data-testid={`status-${post.id}`}>{statusInfo.label}</Badge>
            <Badge variant="outline" className="text-xs">
              {post.post_type === "literary" ? "خاطرة أدبية" : "تسويقي"}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <CopyBtn text={post.content} />
            <button
              onClick={() => setEditing(!editing)}
              className="p-1.5 rounded hover:bg-muted transition-colors"
              data-testid={`button-edit-post-${post.id}`}
            >
              <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button
              onClick={() => setShowReschedule(!showReschedule)}
              className="p-1.5 rounded hover:bg-muted transition-colors"
              title="إعادة جدولة"
              data-testid={`button-reschedule-${post.id}`}
            >
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            {onDuplicate && (
              <button
                onClick={() => onDuplicate(post.id)}
                className="p-1.5 rounded hover:bg-muted transition-colors"
                title="تكرار"
                data-testid={`button-duplicate-${post.id}`}
              >
                <CopyPlus className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
            <button
              onClick={() => onDelete(post.id)}
              className="p-1.5 rounded hover:bg-destructive/10 transition-colors"
              data-testid={`button-delete-post-${post.id}`}
            >
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </button>
          </div>
        </div>

        {post.cover_image_url && (
          <img src={post.cover_image_url} alt="غلاف" className="w-full h-40 object-cover rounded-md" data-testid={`img-cover-${post.id}`} />
        )}

        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={4}
              className="text-sm"
              data-testid={`textarea-edit-${post.id}`}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => updateMutation.mutate({ content: editContent })}
                disabled={updateMutation.isPending}
                data-testid={`button-save-edit-${post.id}`}
              >
                {updateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "حفظ"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditContent(post.content); }}>
                إلغاء
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap" data-testid={`text-post-content-${post.id}`}>
            {post.content}
          </p>
        )}

        {showReschedule && (
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
            <Input
              type="datetime-local"
              value={rescheduleTime}
              onChange={(e) => setRescheduleTime(e.target.value)}
              className="text-sm flex-1"
              data-testid={`input-reschedule-${post.id}`}
            />
            <Button
              size="sm"
              onClick={() => {
                if (rescheduleTime) {
                  onReschedule(post.id, new Date(rescheduleTime).toISOString());
                  setShowReschedule(false);
                }
              }}
              data-testid={`button-confirm-reschedule-${post.id}`}
            >
              تأكيد
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <PlatformBadges platforms={post.platforms || []} />
          <div className="flex items-center gap-1">
            {post.scheduled_at && (
              <>
                <Clock className="w-3 h-3" />
                <span>{new Date(post.scheduled_at).toLocaleString("ar-SA", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}</span>
              </>
            )}
          </div>
        </div>

        {post.status === "draft" && (
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs"
            onClick={() => onStatusChange(post.id, "scheduled")}
            data-testid={`button-schedule-${post.id}`}
          >
            <Calendar className="w-3 h-3 ml-1" />
            جدولة
          </Button>
        )}
        {post.status === "scheduled" && (
          <div className="flex gap-2">
            {onPublish && (
              <Button
                size="sm"
                className="flex-1 text-xs bg-gradient-to-r from-green-600 to-emerald-600"
                onClick={() => onPublish(post.id)}
                data-testid={`button-publish-${post.id}`}
              >
                <Megaphone className="w-3 h-3 ml-1" />
                نشر مباشر
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-xs"
              onClick={() => onStatusChange(post.id, "posted")}
              data-testid={`button-mark-posted-${post.id}`}
            >
              <Check className="w-3 h-3 ml-1" />
              تم النشر يدوياً
            </Button>
          </div>
        )}
        {post.status === "needs_manual" && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-xs border-amber-500/30 text-amber-600"
              onClick={() => onStatusChange(post.id, "posted")}
              data-testid={`button-mark-posted-manual-${post.id}`}
            >
              <Check className="w-3 h-3 ml-1" />
              تم النشر يدوياً
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-xs"
              onClick={() => onStatusChange(post.id, "scheduled")}
              data-testid={`button-reschedule-manual-${post.id}`}
            >
              <Calendar className="w-3 h-3 ml-1" />
              إعادة جدولة
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardTab() {
  const { data: posts = [] } = useQuery<any[]>({ queryKey: ["/api/admin/social/posts"] });
  const { data: bestTimes = [] } = useQuery<any[]>({ queryKey: ["/api/admin/social/best-times"] });
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  const generateMutation = useMutation({
    mutationFn: async () => {
      setGenerating(true);
      const res = await apiRequest("POST", "/api/admin/social/generate-daily", {});
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social/posts"] });
      toast({ title: data.message || "تم توليد المنشورات" });
      setGenerating(false);
    },
    onError: (err: any) => {
      toast({ title: err.message || "فشل في التوليد", variant: "destructive" });
      setGenerating(false);
    },
  });

  const todayPosts = posts.filter((p: any) => {
    if (!p.scheduled_at) return false;
    const d = new Date(p.scheduled_at);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  const yesterdayPosts = posts.filter((p: any) => {
    if (!p.scheduled_at) return false;
    const d = new Date(p.scheduled_at);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return d.toDateString() === yesterday.toDateString();
  });

  const { data: yesterdayEngagement } = useQuery<any>({
    queryKey: ["/api/admin/social/yesterday-engagement"],
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold" data-testid="stat-total-posts">{posts.length}</p>
            <p className="text-sm text-muted-foreground">إجمالي المنشورات</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold" data-testid="stat-today-posts">{todayPosts.length}</p>
            <p className="text-sm text-muted-foreground">منشورات اليوم</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold" data-testid="stat-scheduled">{posts.filter((p: any) => p.status === "scheduled").length}</p>
            <p className="text-sm text-muted-foreground">مجدولة</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-medium text-sm">توليد منشورات اليوم</h3>
            <p className="text-xs text-muted-foreground">يولّد 5 منشورات (2 تسويقية + 3 أدبية) ويجدولها تلقائياً</p>
          </div>
          <Button
            className="gap-2 bg-gradient-to-r from-violet-600 to-primary shrink-0"
            onClick={() => generateMutation.mutate()}
            disabled={generating}
            data-testid="button-dashboard-generate"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {generating ? "جاري التوليد..." : "توليد 5 منشورات"}
          </Button>
        </CardContent>
      </Card>

      {bestTimes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              أفضل أوقات النشر
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center gap-3">
              {bestTimes.slice(0, 2).map((t: any, i: number) => (
                <Badge key={i} variant="outline" className="text-sm" data-testid={`best-time-${i}`}>
                  الساعة {t.hour}:00 — تفاعل {Math.round(t.avgEngagement)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {todayPosts.length > 0 && (
        <div>
          <h3 className="font-medium text-sm mb-3">منشورات اليوم</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {todayPosts.map((p: any) => (
              <Card key={p.id}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={STATUS_MAP[p.status]?.variant || "secondary"} className="text-xs">
                      {STATUS_MAP[p.status]?.label || p.status}
                    </Badge>
                    <PlatformBadges platforms={p.platforms || []} />
                    <span className="text-xs text-muted-foreground mr-auto">
                      {p.scheduled_at && new Date(p.scheduled_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-xs line-clamp-3">{p.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {(yesterdayPosts.length > 0 || (yesterdayEngagement && yesterdayEngagement.postCount > 0)) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              ملخص الأمس
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
              {yesterdayPosts.filter((p: any) => p.status === "posted").length} نُشرت ·{" "}
              {yesterdayPosts.filter((p: any) => p.status === "scheduled").length} لم تُنشر بعد ·{" "}
              {yesterdayPosts.length} إجمالي
            </div>
            {yesterdayEngagement && yesterdayEngagement.postCount > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="text-center p-2 rounded-md bg-muted/50">
                  <p className="text-lg font-bold" data-testid="yesterday-likes">{yesterdayEngagement.totalLikes}</p>
                  <p className="text-xs text-muted-foreground">اعجابات</p>
                </div>
                <div className="text-center p-2 rounded-md bg-muted/50">
                  <p className="text-lg font-bold" data-testid="yesterday-shares">{yesterdayEngagement.totalShares}</p>
                  <p className="text-xs text-muted-foreground">مشاركات</p>
                </div>
                <div className="text-center p-2 rounded-md bg-muted/50">
                  <p className="text-lg font-bold" data-testid="yesterday-reach">{yesterdayEngagement.totalReach}</p>
                  <p className="text-xs text-muted-foreground">وصول</p>
                </div>
                <div className="text-center p-2 rounded-md bg-muted/50">
                  <p className="text-lg font-bold" data-testid="yesterday-clicks">{yesterdayEngagement.totalClicks}</p>
                  <p className="text-xs text-muted-foreground">نقرات</p>
                </div>
                <div className="text-center p-2 rounded-md bg-muted/50">
                  <p className="text-lg font-bold" data-testid="yesterday-comments">{yesterdayEngagement.totalComments}</p>
                  <p className="text-xs text-muted-foreground">تعليقات</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PostQueueTab() {
  const { data: posts = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/social/posts"] });
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>("all");
  const [duplicatedPostId, setDuplicatedPostId] = useState<number | null>(null);
  const [duplicateRescheduleTime, setDuplicateRescheduleTime] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPost, setNewPost] = useState({
    content: "",
    platforms: ["facebook", "instagram", "x"] as string[],
    scheduledAt: "",
    postType: "marketing",
    status: "scheduled",
  });

  const createPostMutation = useMutation({
    mutationFn: async () => {
      if (!newPost.content.trim()) throw new Error("المحتوى مطلوب");
      if (newPost.platforms.length === 0) throw new Error("اختر منصة واحدة على الأقل");
      const res = await apiRequest("POST", "/api/admin/social/posts", {
        content: newPost.content,
        platforms: newPost.platforms,
        scheduledAt: newPost.scheduledAt ? new Date(newPost.scheduledAt).toISOString() : null,
        postType: newPost.postType,
        status: newPost.scheduledAt ? "scheduled" : "draft",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social/posts"] });
      toast({ title: "تم إنشاء المنشور" });
      setShowCreateDialog(false);
      setNewPost({ content: "", platforms: ["facebook", "instagram", "x"], scheduledAt: "", postType: "marketing", status: "scheduled" });
    },
    onError: (err: any) => {
      toast({ title: err.message || "فشل في إنشاء المنشور", variant: "destructive" });
    },
  });

  const toggleNewPostPlatform = (p: string) => {
    setNewPost((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(p) ? prev.platforms.filter((x) => x !== p) : [...prev.platforms, p],
    }));
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/social/posts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social/posts"] });
      toast({ title: "تم حذف المنشور" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/social/posts/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social/posts"] });
      toast({ title: "تم تحديث الحالة" });
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: async ({ id, scheduledAt }: { id: number; scheduledAt: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/social/posts/${id}`, { scheduledAt });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social/posts"] });
      toast({ title: "تم إعادة الجدولة" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/admin/social/publish/${id}`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social/posts"] });
      const results = data.publishResults || {};
      const successes = Object.entries(results).filter(([, r]: any) => r.success).map(([p]) => p);
      const failures = Object.entries(results).filter(([, r]: any) => !r.success).map(([p, r]: any) => `${p}: ${r.error}`);
      if (successes.length > 0) {
        toast({ title: `تم النشر على: ${successes.join(", ")}` });
      }
      if (failures.length > 0) {
        toast({ title: `فشل النشر`, description: failures.join(" | "), variant: "destructive" });
      }
      if (successes.length === 0 && failures.length === 0) {
        toast({ title: data.message || "لم يتم النشر", variant: "destructive" });
      }
    },
    onError: (err: any) => {
      toast({ title: err.message || "فشل في النشر", variant: "destructive" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/admin/social/duplicate/${id}`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social/posts"] });
      toast({ title: "تم تكرار المنشور — حدد موعد النشر" });
      if (data?.post?.id) {
        setDuplicatedPostId(data.post.id);
        setDuplicateRescheduleTime("");
      }
    },
    onError: () => {
      toast({ title: "فشل في تكرار المنشور", variant: "destructive" });
    },
  });

  const filtered = filter === "all" ? posts : posts.filter((p: any) => p.status === filter);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {["all", "draft", "scheduled", "posted", "needs_manual"].map((s) => (
            <Button
              key={s}
              size="sm"
              variant={filter === s ? "default" : "outline"}
              onClick={() => setFilter(s)}
              className="text-xs"
              data-testid={`filter-${s}`}
            >
              {s === "all" ? "الكل" : STATUS_MAP[s]?.label || s}
              {s !== "all" && <span className="mr-1 opacity-70">({posts.filter((p: any) => p.status === s).length})</span>}
            </Button>
          ))}
        </div>
        <Button
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setShowCreateDialog(true)}
          data-testid="button-create-post"
        >
          <Edit3 className="w-3.5 h-3.5" />
          إنشاء منشور
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ListOrdered className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">لا توجد منشورات</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((post: any) => (
            <PostCard
              key={post.id}
              post={post}
              onDelete={(id) => deleteMutation.mutate(id)}
              onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
              onReschedule={(id, scheduledAt) => rescheduleMutation.mutate({ id, scheduledAt })}
              onPublish={(id) => publishMutation.mutate(id)}
              onDuplicate={(id) => duplicateMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">إنشاء منشور جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">نوع المنشور</label>
              <Select value={newPost.postType} onValueChange={(v) => setNewPost((p) => ({ ...p, postType: v }))}>
                <SelectTrigger className="text-sm" data-testid="select-new-post-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="marketing">تسويقي</SelectItem>
                  <SelectItem value="literary">أدبي / خاطرة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">المحتوى</label>
              <Textarea
                value={newPost.content}
                onChange={(e) => setNewPost((p) => ({ ...p, content: e.target.value }))}
                rows={5}
                placeholder="اكتب محتوى المنشور هنا..."
                className="text-sm"
                data-testid="textarea-new-post-content"
              />
              <p className="text-[10px] text-muted-foreground mt-1">{newPost.content.length} حرف</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">المنصات</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  const selected = newPost.platforms.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleNewPostPlatform(key)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs transition-colors ${selected ? "border-primary bg-primary/10" : "border-border"}`}
                      data-testid={`new-post-platform-${key}`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">موعد النشر (اختياري)</label>
              <Input
                type="datetime-local"
                value={newPost.scheduledAt}
                onChange={(e) => setNewPost((p) => ({ ...p, scheduledAt: e.target.value }))}
                className="text-sm"
                data-testid="input-new-post-schedule"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                {newPost.scheduledAt ? "سيُجدوَل للنشر في هذا الوقت" : "إذا تركت فارغاً سيُحفظ كمسودة"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => createPostMutation.mutate()}
                disabled={createPostMutation.isPending || !newPost.content.trim() || newPost.platforms.length === 0}
                data-testid="button-confirm-create-post"
                className="flex-1"
              >
                {createPostMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                {newPost.scheduledAt ? "جدولة المنشور" : "حفظ كمسودة"}
              </Button>
              <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={duplicatedPostId !== null} onOpenChange={() => setDuplicatedPostId(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-serif">جدولة المنشور المكرر</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">حدد موعد نشر المنشور المكرر:</p>
            <Input
              type="datetime-local"
              value={duplicateRescheduleTime}
              onChange={(e) => setDuplicateRescheduleTime(e.target.value)}
              className="text-sm"
              data-testid="input-duplicate-reschedule"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (duplicateRescheduleTime && duplicatedPostId) {
                    rescheduleMutation.mutate({ id: duplicatedPostId, scheduledAt: new Date(duplicateRescheduleTime).toISOString() });
                    statusMutation.mutate({ id: duplicatedPostId, status: "scheduled" });
                    setDuplicatedPostId(null);
                  }
                }}
                disabled={!duplicateRescheduleTime}
                data-testid="button-confirm-duplicate-schedule"
              >
                جدولة
              </Button>
              <Button variant="ghost" onClick={() => setDuplicatedPostId(null)}>
                إبقاء كمسودة
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GeneratorTab() {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedPosts, setGeneratedPosts] = useState<any[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["facebook", "instagram", "x", "tiktok", "linkedin"]);

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const startGeneration = async () => {
    setGenerating(true);
    setProgress(0);
    setConfirmed(false);
    setGeneratedPosts([]);
    const results: any[] = [];
    for (let i = 0; i < 5; i++) {
      try {
        setProgress(i);
        const res = await apiRequest("POST", "/api/admin/social/generate-single", {
          index: i,
          platforms: selectedPlatforms,
        });
        const data = await res.json();
        if (data.post) {
          results.push(data.post);
          setGeneratedPosts([...results]);
        }
      } catch (err: any) {
        toast({ title: `فشل توليد المنشور ${i + 1}`, variant: "destructive" });
      }
    }
    setProgress(5);
    setGenerating(false);
    queryClient.invalidateQueries({ queryKey: ["/api/admin/social/posts"] });
    if (results.length > 0) {
      toast({ title: `تم توليد ${results.length} منشورات` });
    }
  };

  const editPost = (idx: number, content: string) => {
    setGeneratedPosts((prev) => prev.map((p, i) => (i === idx ? { ...p, content } : p)));
  };

  const confirmMutation = useMutation({
    mutationFn: async () => {
      for (const post of generatedPosts) {
        await apiRequest("PATCH", `/api/admin/social/posts/${post.id}`, {
          content: post.content,
          status: "scheduled",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social/posts"] });
      toast({ title: "تم تأكيد وجدولة جميع المنشورات" });
      setConfirmed(true);
    },
  });

  const regenerateImageMutation = useMutation({
    mutationFn: async (postId: number) => {
      const res = await apiRequest("POST", `/api/admin/social/regenerate-image/${postId}`, {});
      return res.json();
    },
    onSuccess: (data) => {
      if (data.coverImageUrl) {
        setGeneratedPosts((prev) =>
          prev.map((p) => (p.id === data.id ? { ...p, cover_image_url: data.coverImageUrl } : p))
        );
        queryClient.invalidateQueries({ queryKey: ["/api/admin/social/posts"] });
        toast({ title: "تم إعادة توليد الصورة" });
      }
    },
    onError: () => {
      toast({ title: "فشل في إعادة توليد الصورة", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-primary flex items-center justify-center mx-auto">
              <Wand2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold">مولّد المحتوى اليومي</h3>
              <p className="text-sm text-muted-foreground mt-1">
                يولّد 5 منشورات: 2 تسويقية لـ QalamAI + 3 خواطر أدبية — مع صور DALL-E للخواطر
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">المنصات المستهدفة:</p>
            <div className="flex items-center gap-3 flex-wrap">
              {Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => {
                const Icon = cfg.icon;
                const selected = selectedPlatforms.includes(key);
                return (
                  <label
                    key={key}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                      selected ? "border-primary bg-primary/5" : "border-border"
                    }`}
                    data-testid={`platform-toggle-${key}`}
                  >
                    <Checkbox
                      checked={selected}
                      onCheckedChange={() => togglePlatform(key)}
                    />
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                    <span className="text-sm">{cfg.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <Button
            size="lg"
            className="gap-2 bg-gradient-to-r from-violet-600 to-primary w-full"
            onClick={() => startGeneration()}
            disabled={generating || selectedPlatforms.length === 0}
            data-testid="button-generate-daily"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري توليد المنشور {progress + 1} من 5...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                توليد منشورات اليوم
              </>
            )}
          </Button>

          {generating && (
            <div className="space-y-2">
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-2 flex-1 rounded-full transition-colors ${
                      i <= progress ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {progress < 2 ? "يولّد المنشورات التسويقية..." : progress < 5 ? "يولّد الخواطر الأدبية مع الصور..." : "انتهى"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {generatedPosts.length > 0 && !confirmed && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              تم توليد {generatedPosts.length} منشورات — راجع وعدّل ثم أكّد
            </h3>
            <Button
              className="gap-2"
              onClick={() => confirmMutation.mutate()}
              disabled={confirmMutation.isPending}
              data-testid="button-confirm-all"
            >
              {confirmMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              تأكيد وجدولة الكل
            </Button>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-medium text-muted-foreground">تسويقي</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {generatedPosts.filter((p) => p.post_type !== "literary").map((post, idx) => {
                const realIdx = generatedPosts.indexOf(post);
                return (
                  <Card key={post.id} data-testid={`generated-post-${post.id}`}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">تسويقي</Badge>
                        <PlatformBadges platforms={post.platforms || []} />
                        <span className="text-xs text-muted-foreground mr-auto">
                          {post.scheduled_at && new Date(post.scheduled_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <Textarea
                        value={post.content}
                        onChange={(e) => editPost(realIdx, e.target.value)}
                        rows={4}
                        className="text-sm"
                        data-testid={`textarea-generated-${post.id}`}
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <h4 className="text-xs font-medium text-muted-foreground mt-4">خاطرة أدبية</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {generatedPosts.filter((p) => p.post_type === "literary").map((post) => {
                const realIdx = generatedPosts.indexOf(post);
                return (
                  <Card key={post.id} data-testid={`generated-post-${post.id}`}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">خاطرة أدبية</Badge>
                        <PlatformBadges platforms={post.platforms || []} />
                        <span className="text-xs text-muted-foreground mr-auto">
                          {post.scheduled_at && new Date(post.scheduled_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {post.cover_image_url && (
                        <div className="relative">
                          <img src={post.cover_image_url} alt="غلاف" className="w-full h-32 object-cover rounded-md" />
                          <Button
                            size="sm"
                            variant="secondary"
                            className="absolute bottom-2 left-2 gap-1 text-xs"
                            onClick={() => regenerateImageMutation.mutate(post.id)}
                            disabled={regenerateImageMutation.isPending}
                            data-testid={`button-regenerate-image-${post.id}`}
                          >
                            {regenerateImageMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                            إعادة توليد الصورة
                          </Button>
                        </div>
                      )}
                      <Textarea
                        value={post.content}
                        onChange={(e) => editPost(realIdx, e.target.value)}
                        rows={4}
                        className="text-sm"
                        data-testid={`textarea-generated-${post.id}`}
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {confirmed && (
        <Card>
          <CardContent className="p-6 text-center space-y-2">
            <Check className="w-10 h-10 text-green-500 mx-auto" />
            <p className="font-medium">تم تأكيد وجدولة جميع المنشورات</p>
            <p className="text-sm text-muted-foreground">يمكنك مراجعتها في طابور المنشورات</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InsightsTab() {
  const { data: posts = [] } = useQuery<any[]>({ queryKey: ["/api/admin/social/posts"] });
  const { data: bestTimes = [] } = useQuery<any[]>({ queryKey: ["/api/admin/social/best-times"] });
  const { toast } = useToast();
  const [selectedPost, setSelectedPost] = useState<number | null>(null);
  const [form, setForm] = useState({ likes: 0, shares: 0, reach: 0, clicks: 0, comments: 0 });
  const [showAnalysis, setShowAnalysis] = useState(false);

  const postedPosts = posts.filter((p: any) => p.status === "posted");

  const insightMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPost) return;
      const res = await apiRequest("POST", "/api/admin/social/insights", {
        postId: selectedPost,
        ...form,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social/best-times"] });
      toast({ title: "تم تسجيل التفاعل" });
      setForm({ likes: 0, shares: 0, reach: 0, clicks: 0, comments: 0 });
      setSelectedPost(null);
    },
  });

  return (
    <div className="space-y-6">
      {postedPosts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">المنشورات المنشورة — تسجيل التفاعل</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-right p-2">المحتوى</th>
                    <th className="text-center p-2">المنصات</th>
                    <th className="text-center p-2">الوقت</th>
                    <th className="text-center p-2">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {postedPosts.map((p: any) => (
                    <tr key={p.id} className="border-b last:border-0" data-testid={`insight-row-${p.id}`}>
                      <td className="p-2 max-w-[200px]">
                        <p className="text-xs line-clamp-2">{p.content}</p>
                      </td>
                      <td className="p-2 text-center">
                        <PlatformBadges platforms={p.platforms || []} />
                      </td>
                      <td className="p-2 text-center text-xs text-muted-foreground">
                        {p.scheduled_at ? new Date(p.scheduled_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) : "-"}
                      </td>
                      <td className="p-2 text-center">
                        <Button
                          size="sm"
                          variant={selectedPost === p.id ? "default" : "outline"}
                          className="text-xs"
                          onClick={() => setSelectedPost(selectedPost === p.id ? null : p.id)}
                          data-testid={`button-log-insight-${p.id}`}
                        >
                          {selectedPost === p.id ? "إلغاء" : "تسجيل"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedPost && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">تسجيل تفاعل المنشور #{selectedPost}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {(["likes", "shares", "reach", "clicks", "comments"] as const).map((field) => (
                <div key={field} className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {field === "likes" ? "إعجابات" : field === "shares" ? "مشاركات" : field === "reach" ? "وصول" : field === "clicks" ? "نقرات" : "تعليقات"}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={form[field]}
                    onChange={(e) => setForm((f) => ({ ...f, [field]: parseInt(e.target.value) || 0 }))}
                    className="text-sm"
                    data-testid={`input-insight-${field}`}
                  />
                </div>
              ))}
            </div>
            <Button
              onClick={() => insightMutation.mutate()}
              disabled={insightMutation.isPending}
              className="gap-2"
              data-testid="button-save-insight"
            >
              {insightMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
              تسجيل
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              أفضل أوقات النشر
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/admin/social/best-times"] });
                setShowAnalysis(true);
              }}
              data-testid="button-analyze-times"
            >
              <Search className="w-3 h-3" />
              تحليل الأوقات
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {!showAnalysis && bestTimes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">اضغط "تحليل الأوقات" لتحليل بيانات التفاعل وتحديد أفضل أوقات النشر.</p>
          ) : bestTimes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات كافية بعد. سجّل تفاعل المنشورات أولاً.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                {bestTimes.slice(0, 2).map((t: any, i: number) => (
                  <div key={i} className="bg-primary/10 rounded-lg p-3 text-center min-w-[120px]" data-testid={`insight-best-time-${i}`}>
                    <p className="text-2xl font-bold">{t.hour}:00</p>
                    <p className="text-xs text-muted-foreground">متوسط التفاعل: {Math.round(t.avgEngagement)}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2 mt-4">
                <p className="text-xs font-medium text-muted-foreground">التفاعل حسب الساعة</p>
                <div className="flex items-end gap-1 h-32">
                  {bestTimes.map((t: any, i: number) => {
                    const maxEng = Math.max(...bestTimes.map((x: any) => x.avgEngagement || 1));
                    const height = Math.max(8, (t.avgEngagement / maxEng) * 100);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full bg-primary/60 rounded-t-sm transition-all"
                          style={{ height: `${height}%` }}
                          title={`${t.hour}:00 — ${Math.round(t.avgEngagement)}`}
                        />
                        <span className="text-[10px] text-muted-foreground">{t.hour}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CalendarTab() {
  const { data: posts = [] } = useQuery<any[]>({ queryKey: ["/api/admin/social/posts"] });
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [editPost, setEditPost] = useState<any | null>(null);
  const [editContent, setEditContent] = useState("");

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/admin/social/posts/${data.id}`, data.updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social/posts"] });
      setEditPost(null);
      toast({ title: "تم تحديث المنشور" });
    },
  });

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const postsByDay: Record<string, any[]> = {};
  posts.forEach((p: any) => {
    if (!p.scheduled_at) return;
    const d = new Date(p.scheduled_at);
    if (d.getMonth() === month && d.getFullYear() === year) {
      const key = d.getDate().toString();
      if (!postsByDay[key]) postsByDay[key] = [];
      postsByDay[key].push(p);
    }
  });

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const dayNames = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
  const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

  const selectedDayPosts = selectedDay ? (postsByDay[selectedDay] || []) : [];

  const getPostDotColor = (post: any): string => {
    const isLiterary = post.post_type === "literary";
    const colorMap: Record<string, Record<string, string>> = {
      marketing: {
        draft: "bg-gray-400",
        scheduled: "bg-blue-500",
        posted: "bg-green-500",
        needs_manual: "bg-amber-500",
      },
      literary: {
        draft: "bg-purple-300",
        scheduled: "bg-purple-500",
        posted: "bg-emerald-500",
        needs_manual: "bg-orange-500",
      },
    };
    const typeKey = isLiterary ? "literary" : "marketing";
    return colorMap[typeKey][post.status] || "bg-gray-400";
  };

  const getPostDotShape = (post: any): string => {
    return post.post_type === "literary" ? "rounded-sm" : "rounded-full";
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={prevMonth} data-testid="button-prev-month">
              <ChevronRight className="w-4 h-4" />
            </Button>
            <h3 className="font-serif font-bold text-lg" data-testid="text-current-month">
              {monthNames[month]} {year}
            </h3>
            <Button variant="ghost" size="sm" onClick={nextMonth} data-testid="button-next-month">
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground p-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayStr = day.toString();
              const dayPosts = postsByDay[dayStr] || [];
              const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
              const isSelected = selectedDay === dayStr;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : dayStr)}
                  className={`aspect-square rounded-lg border text-sm flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer hover:bg-muted/50 ${
                    isSelected ? "border-primary bg-primary/10" : isToday ? "border-primary/50 bg-primary/5" : "border-border"
                  }`}
                  data-testid={`calendar-day-${day}`}
                >
                  <span className={`text-xs ${isToday ? "font-bold text-primary" : ""}`}>{day}</span>
                  {dayPosts.length > 0 && (
                    <div className="flex gap-0.5">
                      {dayPosts.slice(0, 3).map((p: any, idx: number) => (
                        <div
                          key={idx}
                          className={`w-1.5 h-1.5 ${getPostDotShape(p)} ${getPostDotColor(p)}`}
                          title={`${p.post_type === "literary" ? "أدبي" : "تسويقي"} — ${STATUS_MAP[p.status]?.label || p.status}`}
                        />
                      ))}
                      {dayPosts.length > 3 && (
                        <span className="text-[8px] text-muted-foreground">+{dayPosts.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col items-center gap-2 mt-3 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="font-medium">تسويقي (دائرة):</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gray-400" /> مسودة</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> مجدول</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /> نُشر</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /> يدوي</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-medium">أدبي (مربع):</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-purple-300" /> مسودة</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-purple-500" /> مجدول</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-emerald-500" /> نُشر</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-orange-500" /> يدوي</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedDay && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              {selectedDay} {monthNames[month]} — {selectedDayPosts.length} منشور
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {selectedDayPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد منشورات في هذا اليوم</p>
            ) : (
              selectedDayPosts.map((p: any) => {
                const statusInfo = STATUS_MAP[p.status] || STATUS_MAP.draft;
                return (
                  <div key={p.id} className="border rounded-lg p-3 space-y-2" data-testid={`calendar-post-${p.id}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={statusInfo.variant} className="text-xs">{statusInfo.label}</Badge>
                        <Badge variant="outline" className="text-xs">
                          {p.post_type === "literary" ? "أدبي" : "تسويقي"}
                        </Badge>
                        <PlatformBadges platforms={p.platforms || []} />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {p.scheduled_at && new Date(p.scheduled_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-xs line-clamp-3 whitespace-pre-wrap">{p.content}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs gap-1"
                      onClick={() => { setEditPost(p); setEditContent(p.content); }}
                      data-testid={`button-calendar-edit-${p.id}`}
                    >
                      <Edit3 className="w-3 h-3" /> تعديل
                    </Button>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editPost} onOpenChange={() => setEditPost(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-serif">تعديل المنشور</DialogTitle>
          </DialogHeader>
          {editPost && (
            <div className="space-y-4">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={6}
                className="text-sm"
                data-testid="textarea-calendar-edit"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => updateMutation.mutate({ id: editPost.id, updates: { content: editContent } })}
                  disabled={updateMutation.isPending}
                  data-testid="button-calendar-save"
                >
                  {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}
                </Button>
                <Button variant="ghost" onClick={() => setEditPost(null)}>إلغاء</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const X_FIELDS = [
  { key: "x_api_key", label: "API Key (Consumer Key)", required: true },
  { key: "x_api_secret", label: "API Secret (Consumer Secret)", required: true },
  { key: "x_access_token", label: "Access Token", required: true },
  { key: "x_access_token_secret", label: "Access Token Secret", required: true },
  { key: "x_bearer_token", label: "Bearer Token", required: false },
  { key: "x_client_id", label: "Client ID", required: false },
  { key: "x_client_secret", label: "Client Secret", required: false },
];


function SettingsTab() {
  const { toast } = useToast();
  const { data: settings } = useQuery<any>({ queryKey: ["/api/admin/social/settings"] });
  const { data: autoGenSettings } = useQuery<any>({ queryKey: ["/api/admin/social/auto-generate-settings"] });
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set());
  const [hasCredentials, setHasCredentials] = useState<Record<string, boolean>>({});
  const [autoGen, setAutoGen] = useState({ enabled: false, platforms: ["facebook", "instagram", "x", "tiktok", "linkedin"], postsPerDay: 5 });

  useEffect(() => {
    if (settings?.hasCredentials) {
      setHasCredentials(settings.hasCredentials);
    }
  }, [settings]);

  useEffect(() => {
    if (autoGenSettings) {
      setAutoGen({
        enabled: autoGenSettings.enabled || false,
        platforms: autoGenSettings.platforms || ["facebook", "instagram", "x", "tiktok", "linkedin"],
        postsPerDay: autoGenSettings.postsPerDay || 5,
      });
    }
  }, [autoGenSettings]);

  const saveAutoGenMutation = useMutation({
    mutationFn: async (cfg: typeof autoGen) => {
      const res = await apiRequest("PUT", "/api/admin/social/auto-generate-settings", cfg);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social/auto-generate-settings"] });
      toast({ title: "تم حفظ إعدادات التوليد التلقائي" });
    },
    onError: () => {
      toast({ title: "فشل في حفظ الإعدادات", variant: "destructive" });
    },
  });

  const runNowMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/social/auto-generate-now", { platforms: autoGen.platforms });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social/posts"] });
      toast({ title: `تم توليد ${data.created || 0} منشورات وجدولتها تلقائياً` });
    },
    onError: () => {
      toast({ title: "فشل التوليد التلقائي", variant: "destructive" });
    },
  });

  const toggleAutoGenPlatform = (p: string) => {
    setAutoGen((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(p) ? prev.platforms.filter((x) => x !== p) : [...prev.platforms, p],
    }));
  };

  const updateCredential = (key: string, value: string) => {
    setCredentials((c) => ({ ...c, [key]: value }));
    setChangedFields((prev) => new Set(prev).add(key));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const onlyChanged: Record<string, string> = {};
      for (const key of changedFields) {
        const val = credentials[key] || "";
        if (val.length > 0) {
          onlyChanged[key] = val;
        }
      }
      if (Object.keys(onlyChanged).length === 0) {
        throw new Error("لم يتم تغيير أي بيانات");
      }
      const res = await apiRequest("PUT", "/api/admin/social/settings", { credentials: onlyChanged });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social/settings"] });
      setChangedFields(new Set());
      toast({ title: "تم حفظ الإعدادات" });
    },
    onError: (err: any) => {
      toast({ title: err?.message || "فشل في حفظ الإعدادات", variant: "destructive" });
    },
  });

  const xFullyConfigured = ["x_api_key", "x_api_secret", "x_access_token", "x_access_token_secret"].every(k => hasCredentials[k] && !changedFields.has(k));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-500" />
            التوليد التلقائي اليومي
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            عند التفعيل، يقوم أبو هاشم تلقائياً بكتابة 5 منشورات يومياً (2 تسويقية + 3 أدبية) وجدولتها في أفضل الأوقات. يتم التحقق كل ساعة وتشغيل التوليد مرة واحدة كل 23 ساعة.
          </p>
          <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
            <div>
              <p className="text-sm font-medium">تشغيل التوليد التلقائي</p>
              <p className="text-xs text-muted-foreground">{autoGen.enabled ? "مُفعّل — سيولّد المحتوى تلقائياً كل يوم" : "معطّل"}</p>
            </div>
            <button
              type="button"
              onClick={() => setAutoGen((p) => ({ ...p, enabled: !p.enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoGen.enabled ? "bg-primary" : "bg-muted-foreground/30"}`}
              data-testid="toggle-auto-generate"
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoGen.enabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
          <div>
            <p className="text-xs font-medium mb-2">المنصات المستهدفة للتوليد التلقائي</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => {
                const Icon = cfg.icon;
                const selected = autoGen.platforms.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleAutoGenPlatform(key)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs transition-colors ${selected ? "border-primary bg-primary/10" : "border-border"}`}
                    data-testid={`auto-gen-platform-${key}`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              className="gap-2 flex-1"
              onClick={() => saveAutoGenMutation.mutate(autoGen)}
              disabled={saveAutoGenMutation.isPending}
              data-testid="button-save-auto-gen"
            >
              {saveAutoGenMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
              حفظ إعدادات التوليد
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => runNowMutation.mutate()}
              disabled={runNowMutation.isPending || autoGen.platforms.length === 0}
              data-testid="button-run-auto-gen-now"
            >
              {runNowMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              توليد الآن
            </Button>
          </div>
          {autoGen.enabled && (
            <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-md">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>التوليد التلقائي يستهلك رصيد OpenAI (GPT-4o + DALL-E). تأكد من توفر الرصيد.</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Settings className="w-4 h-4" />
            بيانات اعتماد المنصات
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-6">
          <p className="text-xs text-muted-foreground">
            أدخل بيانات الاعتماد لكل منصة لتفعيل النشر المباشر. بدونها يمكنك نسخ المحتوى ونشره يدوياً.
          </p>

          {[
            { key: "facebook", label: "Facebook", icon: Facebook, color: "text-blue-600", placeholder: "pageId|pageToken" },
            { key: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-500", placeholder: "Access Token" },
            { key: "tiktok", label: "TikTok", icon: SiTiktok, color: "text-red-500", placeholder: "Access Token" },
            { key: "linkedin", label: "LinkedIn", icon: Linkedin, color: "text-blue-500", placeholder: "Access Token" },
          ].map(({ key, label, icon: Icon, color, placeholder }) => (
            <div key={key} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-md bg-muted flex items-center justify-center ${color} shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium flex items-center gap-2">
                  {label}
                  {hasCredentials[key] && !changedFields.has(key) && (
                    <Badge variant="outline" className="text-[10px] py-0 text-green-600">مُعدّ</Badge>
                  )}
                </label>
                <Input
                  type="password"
                  placeholder={hasCredentials[key] ? "اترك فارغاً للإبقاء على القيمة الحالية" : placeholder}
                  value={credentials[key] || ""}
                  onChange={(e) => updateCredential(key, e.target.value)}
                  className="text-sm mt-1"
                  data-testid={`input-credential-${key}`}
                />
              </div>
            </div>
          ))}

          <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-foreground shrink-0">
                <SiX className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold flex items-center gap-2">
                  X (Twitter) — OAuth 1.0a
                  {xFullyConfigured && <Badge variant="outline" className="text-[10px] py-0 text-green-600">جاهز للنشر</Badge>}
                </p>
                <p className="text-[10px] text-muted-foreground">النشر يتطلب الحقول الأربعة الأولى المطلوبة</p>
              </div>
            </div>
            {X_FIELDS.map(({ key, label, required }) => (
              <div key={key}>
                <label className="text-[11px] font-medium flex items-center gap-1.5">
                  {label}
                  {required && <span className="text-destructive">*</span>}
                  {hasCredentials[key] && !changedFields.has(key) && (
                    <Badge variant="outline" className="text-[10px] py-0 text-green-600">مُعدّ</Badge>
                  )}
                </label>
                <Input
                  type="password"
                  placeholder={hasCredentials[key] ? "اترك فارغاً للإبقاء على القيمة الحالية" : label}
                  value={credentials[key] || ""}
                  onChange={(e) => updateCredential(key, e.target.value)}
                  className="text-sm mt-0.5"
                  data-testid={`input-credential-${key}`}
                />
              </div>
            ))}
          </div>

          <Button
            className="w-full gap-2"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            data-testid="button-save-settings"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
            حفظ الإعدادات
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminSocialHub() {
  useDocumentTitle("مركز السوشيال ميديا | QalamAI");
  const { user } = useAuth();
  const isSuperAdmin = user && SUPER_ADMIN_IDS.includes((user as any).id || "");

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-4">
          <Megaphone className="w-12 h-12 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-serif font-bold">غير مصرّح</h1>
          <p className="text-muted-foreground">هذه الصفحة للمشرفين الأعلى فقط.</p>
          <Link href="/"><Button variant="outline">العودة</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="gap-1.5" data-testid="button-back-admin">
                <ArrowRight className="w-4 h-4" />
                لوحة الإدارة
              </Button>
            </Link>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-primary flex items-center justify-center">
                <Megaphone className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-serif font-semibold text-sm">مركز السوشيال ميديا</span>
              <Badge className="text-xs px-1.5 py-0 bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800" variant="outline">
                Super Admin
              </Badge>
            </div>
          </div>
          <Link href="/admin/marketing">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" data-testid="link-marketing-chat">
              <Megaphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">شات التسويق</span>
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Tabs defaultValue="dashboard" dir="rtl">
          <TabsList className="w-full justify-start mb-6 flex-wrap gap-1" data-testid="tabs-social-hub">
            <TabsTrigger value="dashboard" className="gap-1.5 text-xs" data-testid="tab-dashboard">
              <LayoutDashboard className="w-3.5 h-3.5" />
              لوحة القيادة
            </TabsTrigger>
            <TabsTrigger value="queue" className="gap-1.5 text-xs" data-testid="tab-queue">
              <ListOrdered className="w-3.5 h-3.5" />
              طابور المنشورات
            </TabsTrigger>
            <TabsTrigger value="generator" className="gap-1.5 text-xs" data-testid="tab-generator">
              <Wand2 className="w-3.5 h-3.5" />
              مولّد المحتوى
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1.5 text-xs" data-testid="tab-calendar">
              <CalendarDays className="w-3.5 h-3.5" />
              التقويم
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-1.5 text-xs" data-testid="tab-insights">
              <BarChart3 className="w-3.5 h-3.5" />
              التحليلات
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5 text-xs" data-testid="tab-settings">
              <Settings className="w-3.5 h-3.5" />
              الإعدادات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <DashboardTab />
          </TabsContent>
          <TabsContent value="queue">
            <PostQueueTab />
          </TabsContent>
          <TabsContent value="generator">
            <GeneratorTab />
          </TabsContent>
          <TabsContent value="calendar">
            <CalendarTab />
          </TabsContent>
          <TabsContent value="insights">
            <InsightsTab />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
