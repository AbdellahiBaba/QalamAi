import { useState } from "react";
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
  Wand2, Facebook, Instagram, Linkedin, RefreshCw, Search
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

function PostCard({ post, onDelete, onStatusChange, onReschedule }: {
  post: any;
  onDelete: (id: number) => void;
  onStatusChange: (id: number, status: string) => void;
  onReschedule: (id: number, scheduledAt: string) => void;
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
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs"
            onClick={() => onStatusChange(post.id, "posted")}
            data-testid={`button-mark-posted-${post.id}`}
          >
            <Check className="w-3 h-3 ml-1" />
            تم النشر
          </Button>
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

      {yesterdayPosts.length > 0 && (
        <div>
          <h3 className="font-medium text-sm mb-3 text-muted-foreground">ملخص الأمس ({yesterdayPosts.length} منشورات)</h3>
          <div className="text-xs text-muted-foreground">
            {yesterdayPosts.filter((p: any) => p.status === "posted").length} نُشرت ·{" "}
            {yesterdayPosts.filter((p: any) => p.status === "scheduled").length} لم تُنشر بعد
          </div>
        </div>
      )}
    </div>
  );
}

function PostQueueTab() {
  const { data: posts = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/social/posts"] });
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>("all");

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
      <div className="flex items-center gap-2">
        {["all", "draft", "scheduled", "posted"].map((s) => (
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
            />
          ))}
        </div>
      )}
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

  const generateMutation = useMutation({
    mutationFn: async () => {
      setGenerating(true);
      setProgress(0);
      setConfirmed(false);
      setGeneratedPosts([]);
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 1, 4));
      }, 8000);
      const res = await apiRequest("POST", "/api/admin/social/generate-daily", { platforms: selectedPlatforms });
      clearInterval(progressInterval);
      setProgress(5);
      return res.json();
    },
    onSuccess: (data) => {
      const posts = data.posts || [];
      setGeneratedPosts(posts);
      toast({ title: data.message || "تم توليد المنشورات" });
      setGenerating(false);
    },
    onError: (err: any) => {
      toast({ title: err.message || "فشل في التوليد", variant: "destructive" });
      setGenerating(false);
    },
  });

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
            onClick={() => generateMutation.mutate()}
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

function SettingsTab() {
  const { toast } = useToast();
  const { data: settings } = useQuery<any>({ queryKey: ["/api/admin/social/settings"] });
  const [credentials, setCredentials] = useState<Record<string, string>>({
    facebook: "",
    instagram: "",
    x: "",
    tiktok: "",
    linkedin: "",
  });
  const [loaded, setLoaded] = useState(false);

  if (settings && !loaded) {
    const creds = settings.credentials || {};
    setCredentials({
      facebook: creds.facebook || "",
      instagram: creds.instagram || "",
      x: creds.x || "",
      tiktok: creds.tiktok || "",
      linkedin: creds.linkedin || "",
    });
    setLoaded(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/admin/social/settings", { credentials });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social/settings"] });
      toast({ title: "تم حفظ الإعدادات" });
    },
    onError: () => {
      toast({ title: "فشل في حفظ الإعدادات", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Settings className="w-4 h-4" />
            بيانات اعتماد المنصات
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            أدخل Access Token أو API Key لكل منصة لتفعيل النشر المباشر. بدون بيانات الاعتماد، يمكنك نسخ المحتوى ونشره يدوياً.
          </p>
          {Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon;
            return (
              <div key={key} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-md bg-muted flex items-center justify-center ${cfg.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium">{cfg.label}</label>
                  <Input
                    type="password"
                    placeholder="Access Token / API Key"
                    value={credentials[key] || ""}
                    onChange={(e) => setCredentials((c) => ({ ...c, [key]: e.target.value }))}
                    className="text-sm mt-1"
                    data-testid={`input-credential-${key}`}
                  />
                </div>
              </div>
            );
          })}
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
