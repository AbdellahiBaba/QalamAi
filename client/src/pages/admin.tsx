import { useState, useEffect, useRef } from "react";
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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Feather, LogOut, ShieldCheck, Ticket, Clock, Search, ArrowRight, AlertCircle, Users, FolderOpen, Crown, BarChart3, BookOpen, FileText, Film, Tag, DollarSign, Download, Eye, Flag, FlagOff, Loader2, PenTool, TrendingUp, Cpu, ShieldOff, ShieldAlert, Info, MessageSquare, Star, Check, Trash2, Crosshair, Share2, Plus, GripVertical, ExternalLink, Pencil, Settings, ToggleLeft, ToggleRight, X, Menu, GraduationCap, MapPin, Globe, Wifi, Monitor, Smartphone, Tablet, ChevronDown, ChevronUp, AlertTriangle, Hash, CalendarCheck, Brain, PlayCircle, CheckCircle, XCircle, RefreshCw, Webhook, Send, ChevronLeft, ChevronRight, Megaphone, Sparkles, UserCheck, Square, CheckSquare } from "lucide-react";
import { SiLinkedin, SiTiktok, SiX, SiInstagram, SiFacebook, SiYoutube, SiSnapchat, SiTelegram, SiWhatsapp } from "react-icons/si";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SupportTicket, NovelProject, PromoCode, PlatformReview, SocialMediaLink, PlatformFeature } from "@shared/schema";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FREE_ANALYSIS_USES, PAID_ANALYSIS_USES } from "@shared/schema";
import LtrNum from "@/components/ui/ltr-num";

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

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
  displayName: string | null;
  bio: string | null;
  publicProfile: boolean;
  profileImageUrl: string | null;
  plan: string;
  role: string | null;
  createdAt: string | null;
  totalProjects: number;
  trialActive: boolean;
  trialEndsAt: string | null;
  trialChargeStatus: string | null;
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
  low: "text-gray-500 dark:text-gray-400",
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

const SUPER_ADMIN_IDS = ["39706084", "e482facd-d157-4e97-ad91-af96b8ec8f49"];

const projectTypeLabels: Record<string, string> = {
  novel: "رواية",
  essay: "مقال",
  scenario: "سيناريو",
  short_story: "قصة قصيرة",
  khawater: "خاطرة",
  social_media: "سوشيال ميديا",
  poetry: "قصيدة",
  memoire: "مذكرة تخرج",
};

const projectStatusLabels: Record<string, string> = {
  locked: "مقفل",
  draft: "مسودة",
  outline: "مخطط",
  writing: "قيد الكتابة",
  completed: "مكتمل",
};

function AdminPagination({ page, total, limit, onPageChange, testIdPrefix }: { page: number; total: number; limit: number; onPageChange: (p: number) => void; testIdPrefix: string }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-4 flex-wrap" data-testid={`pagination-${testIdPrefix}`}>
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        data-testid={`button-${testIdPrefix}-prev`}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
      <span className="text-sm text-muted-foreground" data-testid={`text-${testIdPrefix}-page-info`}>
        صفحة <LtrNum>{page}</LtrNum> من <LtrNum>{totalPages}</LtrNum> (<LtrNum>{total}</LtrNum> عنصر)
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        data-testid={`button-${testIdPrefix}-next`}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>
    </div>
  );
}

const PROJECT_TYPE_LABELS: Record<string, string> = {
  essay: "مقال",
  novel: "رواية",
  poetry: "قصيدة",
  short_story: "قصة قصيرة",
  scenario: "سيناريو",
  khawater: "خاطرة",
  memoire: "مذكرة",
};

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          className="p-0.5 focus:outline-none"
          data-testid={`star-${star}`}
        >
          <Star
            className={`w-4 h-4 transition-colors ${(hovered || value) >= star ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
          />
        </button>
      ))}
    </div>
  );
}

function ChallengeEntriesPanel({ challengeId, winnerId, onClose }: { challengeId: number; winnerId: string | null; onClose: () => void }) {
  const { toast } = useToast();
  const [entryRatings, setEntryRatings] = useState<Record<number, number>>({});
  const [entryNotes, setEntryNotes] = useState<Record<number, string>>({});
  const [expandedEntry, setExpandedEntry] = useState<number | null>(null);

  const { data: challenge, isLoading, refetch } = useQuery<any>({
    queryKey: ["/api/challenges", challengeId],
    queryFn: async () => {
      const res = await fetch(`/api/challenges/${challengeId}`);
      return res.json();
    },
  });

  useEffect(() => {
    if (challenge?.entries) {
      const ratings: Record<number, number> = {};
      const notes: Record<number, string> = {};
      challenge.entries.forEach((e: any) => {
        if (e.admin_rating) ratings[e.id] = e.admin_rating;
        if (e.admin_notes) notes[e.id] = e.admin_notes;
      });
      setEntryRatings(ratings);
      setEntryNotes(notes);
    }
  }, [challenge]);

  const rateMutation = useMutation({
    mutationFn: async ({ entryId, rating, notes }: { entryId: number; rating: number; notes: string }) => {
      await apiRequest("PUT", `/api/admin/challenges/${challengeId}/entries/${entryId}/rate`, {
        adminRating: rating,
        adminNotes: notes || null,
      });
    },
    onSuccess: () => {
      toast({ title: "تم حفظ التقييم" });
      refetch();
    },
    onError: () => toast({ title: "فشل في حفظ التقييم", variant: "destructive" }),
  });

  const winnerMutation = useMutation({
    mutationFn: async ({ entryId, userId }: { entryId: number; userId: string }) => {
      await apiRequest("PUT", `/api/admin/challenges/${challengeId}/winner`, { winnerId: userId, winnerEntryId: entryId });
    },
    onSuccess: () => {
      toast({ title: "تم تحديد الفائز" });
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      refetch();
    },
    onError: () => toast({ title: "فشل في تحديد الفائز", variant: "destructive" }),
  });

  if (isLoading) return <div className="p-6"><Skeleton className="h-32 w-full" /></div>;
  const entries: any[] = challenge?.entries || [];

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-base">{challenge?.title} — المشاركات ({entries.length})</h4>
        <Button size="sm" variant="ghost" onClick={onClose} data-testid="button-close-entries-panel"><X className="w-4 h-4" /></Button>
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">لا توجد مشاركات حتى الآن</p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry: any) => {
            const isExpanded = expandedEntry === entry.id;
            const currentRating = entryRatings[entry.id] || entry.admin_rating || 0;
            const currentNotes = entryNotes[entry.id] ?? (entry.admin_notes || "");
            const isWinner = winnerId === entry.user_id;
            return (
              <div
                key={entry.id}
                className={`border rounded-lg overflow-hidden ${isWinner ? "border-amber-400 bg-amber-50/30 dark:bg-amber-900/10" : ""}`}
                data-testid={`admin-entry-${entry.id}`}
              >
                <div className="p-3 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Avatar className="w-7 h-7 flex-shrink-0">
                      <AvatarImage src={entry.authorProfileImage || undefined} alt={entry.authorName} />
                      <AvatarFallback className="text-xs">{(entry.authorName || "?")[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium">{entry.authorName}</span>
                        {isWinner && <Badge className="text-xs py-0 h-4 bg-amber-500">🏆 الفائز</Badge>}
                        {currentRating > 0 && (
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">{currentRating}/5</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{entry.content?.slice(0, 80)}...</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 flex-shrink-0"
                    onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                    data-testid={`button-expand-entry-${entry.id}`}
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
                {isExpanded && (
                  <div className="border-t p-3 space-y-3 bg-muted/20">
                    <ScrollArea className="h-40">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{entry.content}</p>
                    </ScrollArea>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground shrink-0">التقييم:</Label>
                        <StarRating
                          value={currentRating}
                          onChange={(v) => setEntryRatings(prev => ({ ...prev, [entry.id]: v }))}
                        />
                      </div>
                      <Textarea
                        placeholder="ملاحظات الأدمن (اختياري)"
                        value={currentNotes}
                        onChange={e => setEntryNotes(prev => ({ ...prev, [entry.id]: e.target.value }))}
                        rows={2}
                        className="text-xs"
                        dir="rtl"
                        data-testid={`textarea-entry-notes-${entry.id}`}
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 gap-1"
                          disabled={rateMutation.isPending || currentRating === 0}
                          onClick={() => rateMutation.mutate({ entryId: entry.id, rating: currentRating, notes: currentNotes })}
                          data-testid={`button-save-rating-${entry.id}`}
                        >
                          <Check className="w-3 h-3" /> حفظ التقييم
                        </Button>
                        {!isWinner && (
                          <Button
                            size="sm"
                            className="text-xs h-7 gap-1 bg-amber-500 hover:bg-amber-600 text-white"
                            disabled={winnerMutation.isPending}
                            onClick={() => {
                              if (confirm(`تحديد "${entry.authorName}" كفائز لهذا التحدي؟`)) {
                                winnerMutation.mutate({ entryId: entry.id, userId: entry.user_id });
                              }
                            }}
                            data-testid={`button-set-winner-${entry.id}`}
                          >
                            <Crown className="w-3 h-3" /> تحديد كفائز
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AdminChallengesTab() {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [theme, setTheme] = useState("");
  const [projectType, setProjectType] = useState("essay");
  const [prizeDescription, setPrizeDescription] = useState("");
  const [endDays, setEndDays] = useState("7");
  const [generatedPrompt, setGeneratedPrompt] = useState<{ promptText: string; promptDate: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [selectedChallengeId, setSelectedChallengeId] = useState<number | null>(null);

  const { data: challenges, isLoading } = useQuery<any[]>({
    queryKey: ["/api/challenges"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + parseInt(endDays));
      const res = await apiRequest("POST", "/api/admin/challenges", {
        title,
        description,
        theme: theme || undefined,
        projectType,
        prizeDescription: prizeDescription || undefined,
        endDate: endDate.toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم إنشاء التحدي وإرسال الإشعارات" });
      setTitle(""); setDescription(""); setTheme(""); setPrizeDescription(""); setProjectType("essay");
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
    },
    onError: () => toast({ title: "فشل في إنشاء التحدي", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/challenges/${id}`);
    },
    onSuccess: (_data: unknown, deletedId: number) => {
      toast({ title: "تم حذف التحدي" });
      if (selectedChallengeId === deletedId) setSelectedChallengeId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
    },
    onError: () => toast({ title: "فشل في حذف التحدي", variant: "destructive" }),
  });

  const handleGeneratePrompt = async () => {
    setIsGenerating(true);
    try {
      const res = await apiRequest("POST", "/api/admin/daily-prompts/generate");
      const data = await res.json();
      setGeneratedPrompt(data);
      toast({ title: "تم توليد البروبت بنجاح" });
    } catch {
      toast({ title: "فشل في توليد البروبت", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveGeneratedPrompt = async () => {
    if (!generatedPrompt) return;
    setIsSavingPrompt(true);
    try {
      await apiRequest("POST", "/api/daily-prompt", { promptText: generatedPrompt.promptText, promptDate: generatedPrompt.promptDate });
      toast({ title: "تم حفظ البروبت اليومي" });
      setGeneratedPrompt(null);
    } catch {
      toast({ title: "فشل في حفظ البروبت", variant: "destructive" });
    } finally {
      setIsSavingPrompt(false);
    }
  };

  const selectedChallenge = challenges?.find((c: any) => c.id === selectedChallengeId);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="font-serif text-lg font-semibold flex items-center gap-2" data-testid="text-ai-prompt-gen-title">
            <Sparkles className="w-5 h-5 text-purple-500" /> توليد بروبت يومي بالذكاء الاصطناعي
          </h3>
          <p className="text-sm text-muted-foreground">توليد بروبت كتابي تلقائي ليوم الغد باستخدام الذكاء الاصطناعي</p>
          <div className="flex items-center gap-3">
            <Button onClick={handleGeneratePrompt} disabled={isGenerating} className="gap-1.5" data-testid="button-generate-prompt">
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isGenerating ? "جارٍ التوليد..." : "توليد بالذكاء الاصطناعي"}
            </Button>
          </div>
          {generatedPrompt && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg border" data-testid="generated-prompt-preview">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarCheck className="w-3.5 h-3.5" />
                <span dir="ltr">{generatedPrompt.promptDate}</span>
              </div>
              <Textarea
                value={generatedPrompt.promptText}
                onChange={(e) => setGeneratedPrompt({ ...generatedPrompt, promptText: e.target.value })}
                rows={4}
                dir="rtl"
                className="text-sm leading-relaxed"
                data-testid="textarea-generated-prompt"
              />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleSaveGeneratedPrompt} disabled={isSavingPrompt || !generatedPrompt.promptText.trim()} className="gap-1" data-testid="button-save-prompt">
                  {isSavingPrompt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  حفظ ونشر
                </Button>
                <Button size="sm" variant="outline" onClick={handleGeneratePrompt} disabled={isGenerating} data-testid="button-regenerate-prompt">
                  <RefreshCw className="w-3.5 h-3.5 ml-1" />
                  إعادة التوليد
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setGeneratedPrompt(null)} data-testid="button-discard-prompt">
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="font-serif text-lg font-semibold flex items-center gap-2" data-testid="text-create-challenge-title">
            <Crown className="w-5 h-5 text-amber-500" /> إنشاء تحدي جديد
          </h3>
          <div className="space-y-3">
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="عنوان التحدي" dir="rtl" data-testid="input-challenge-title" />
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="وصف التحدي والشروط..." dir="rtl" rows={3} data-testid="textarea-challenge-desc" />
            <Input value={theme} onChange={e => setTheme(e.target.value)} placeholder="الموضوع (اختياري)" dir="rtl" data-testid="input-challenge-theme" />
            <div className="flex items-center gap-2" dir="rtl">
              <Label className="text-sm text-muted-foreground shrink-0">نوع الكتابة:</Label>
              <Select value={projectType} onValueChange={setProjectType} dir="rtl">
                <SelectTrigger className="w-40" data-testid="select-challenge-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROJECT_TYPE_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input value={prizeDescription} onChange={e => setPrizeDescription(e.target.value)} placeholder="وصف الجائزة (اختياري) — مثال: كتاب + شهادة + نشر على المنصة" dir="rtl" data-testid="input-challenge-prize" />
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground shrink-0">المدة (أيام):</Label>
              <Input type="number" value={endDays} onChange={e => setEndDays(e.target.value)} className="w-24" min="1" max="90" data-testid="input-challenge-days" />
            </div>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !title.trim() || !description.trim()} className="gap-1" data-testid="button-create-challenge">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              إنشاء التحدي وإشعار الكتّاب
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="font-serif text-lg font-semibold" data-testid="text-challenges-list-title">التحديات الحالية</h3>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : challenges && challenges.length > 0 ? (
            <div className="space-y-3">
              {challenges.map((ch: any) => {
                const isActive = new Date(ch.end_date) > new Date();
                const isSelected = selectedChallengeId === ch.id;
                return (
                  <div key={ch.id} className={`border rounded-lg overflow-hidden transition-colors ${isSelected ? "border-primary/40 bg-primary/5" : ""}`} data-testid={`admin-challenge-${ch.id}`}>
                    <div
                      className="flex items-center justify-between gap-3 p-3 cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => setSelectedChallengeId(isSelected ? null : ch.id)}
                      data-testid={`button-manage-challenge-${ch.id}`}
                    >
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{ch.title}</p>
                          {isSelected ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {ch.project_type && (
                            <Badge variant="outline" className="text-xs py-0 h-4 border-amber-400/40 text-amber-700 dark:text-amber-400">
                              {PROJECT_TYPE_LABELS[ch.project_type] || ch.project_type}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">{ch.entryCount || 0} مشاركة</span>
                        </div>
                        {ch.prize_description && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 truncate">🏆 {ch.prize_description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        {isActive && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 gap-1"
                            onClick={async () => {
                              try {
                                await apiRequest("PUT", `/api/admin/challenges/${ch.id}/close`);
                                toast({ title: "تم إغلاق التحدي" });
                                queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
                              } catch {
                                toast({ title: "فشل في إغلاق التحدي", variant: "destructive" });
                              }
                            }}
                            data-testid={`button-close-challenge-${ch.id}`}
                          >
                            <X className="w-3 h-3" /> إغلاق
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-7 gap-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (confirm(`هل أنت متأكد من حذف التحدي "${ch.title}"؟ سيتم حذف جميع المشاركات.`)) {
                              deleteMutation.mutate(ch.id);
                            }
                          }}
                          data-testid={`button-delete-challenge-${ch.id}`}
                        >
                          <Trash2 className="w-3 h-3" /> حذف
                        </Button>
                        <Badge variant={isActive ? "default" : "outline"}>
                          {isActive ? "نشط" : "منتهي"}
                        </Badge>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="border-t p-4 bg-background">
                        <ChallengeEntriesPanel
                          challengeId={ch.id}
                          winnerId={ch.winner_id || null}
                          onClose={() => setSelectedChallengeId(null)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">لا توجد تحديات</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Admin() {
  useDocumentTitle("لوحة الإدارة — قلم AI");
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"tickets" | "users" | "analytics" | "promos" | "api-usage" | "reviews" | "tracking" | "essays" | "memoires" | "social" | "features" | "reports" | "learning" | "webhook" | "verified" | "challenges" | "revenue">("tickets");
  const [reportFilter, setReportFilter] = useState("all");
  const [reportActionNotes, setReportActionNotes] = useState<Record<number, string>>({});
  const [reportSearch, setReportSearch] = useState("");
  const [reportSort, setReportSort] = useState("newest");
  const [expandedReporterInfo, setExpandedReporterInfo] = useState<Record<number, boolean>>({});
  const [confirmBanReportId, setConfirmBanReportId] = useState<number | null>(null);
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedReports, setSelectedReports] = useState<Set<number>>(new Set());
  const [impersonating, setImpersonating] = useState<{ id: string; displayName: string; email?: string; plan?: string; token: string } | null>(null);
  const [impersonationData, setImpersonationData] = useState<any>(null);
  const [confirmBulkAction, setConfirmBulkAction] = useState<{ type: "dismiss" | "warn" | "remove"; ids: number[] } | null>(null);
  const [ticketsPage, setTicketsPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);
  const [promosPage, setPromosPage] = useState(1);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reportsPage, setReportsPage] = useState(1);
  const ADMIN_PAGE_LIMIT = 20;
  const mainContentRef = useRef<HTMLElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo(0, 0);
    }
  }, [activeTab]);

  const { data: stats, isLoading: statsLoading } = useQuery<{ status: string; count: number }[]>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: ticketsResponse, isLoading: ticketsLoading } = useQuery<PaginatedResponse<SupportTicket>>({
    queryKey: ["/api/admin/tickets", ticketsPage],
    queryFn: async () => {
      const res = await fetch(`/api/admin/tickets?page=${ticketsPage}&limit=${ADMIN_PAGE_LIMIT}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });
  const tickets = ticketsResponse?.data;

  const { data: usersResponse, isLoading: usersLoading } = useQuery<PaginatedResponse<AdminUser>>({
    queryKey: ["/api/admin/users", usersPage],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users?page=${usersPage}&limit=${ADMIN_PAGE_LIMIT}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });
  const adminUsers = usersResponse?.data;

  const { data: userProjects, isLoading: userProjectsLoading } = useQuery<NovelProject[]>({
    queryKey: ["/api/admin/users", selectedUserId, "projects"],
    enabled: !!selectedUserId && showProjectsDialog,
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics"],
    enabled: activeTab === "analytics",
  });

  const { data: promosResponse, isLoading: promosLoading } = useQuery<PaginatedResponse<PromoCode>>({
    queryKey: ["/api/admin/promos", promosPage],
    queryFn: async () => {
      const res = await fetch(`/api/admin/promos?page=${promosPage}&limit=${ADMIN_PAGE_LIMIT}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: activeTab === "promos",
  });
  const promos = promosResponse?.data;

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

  interface MemoireAnalyticsRow { projectId: number; title: string; university: string | null; memoireField: string | null; memoireMethodology: string | null; memoireCountry: string | null; views: number; clicks: number }

  const { data: memoireAnalytics, isLoading: memoireAnalyticsLoading } = useQuery<MemoireAnalyticsRow[]>({
    queryKey: ["/api/admin/memoire-analytics"],
    enabled: activeTab === "memoires",
  });

  const [memoireSortBy, setMemoireSortBy] = useState<"views" | "clicks" | "ctr">("clicks");

  const [reviewFilter, setReviewFilter] = useState<"pending" | "all">("pending");

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

  const { data: adminFeatures, isLoading: featuresLoading } = useQuery<PlatformFeature[]>({
    queryKey: ["/api/admin/features"],
    enabled: activeTab === "features",
  });

  const { data: learningStats, isLoading: learningStatsLoading } = useQuery<{ totalEntries: number; validatedEntries: number; rejectedEntries: number; pendingEntries: number; totalSessions: number; lastSessionDate: string | null; autoLearningEnabled: boolean }>({
    queryKey: ["/api/admin/learning/stats"],
    enabled: activeTab === "learning",
  });

  const { data: learningSessions, isLoading: learningSessionsLoading } = useQuery<Array<{ id: number; triggeredBy: string; status: string; dataSourcesProcessed: number; entriesGenerated: number; entriesValidated: number; entriesRejected: number; summary: string | null; startedAt: string; completedAt: string | null }>>({
    queryKey: ["/api/admin/learning/sessions"],
    enabled: activeTab === "learning",
  });

  const [learningCategoryFilter, setLearningCategoryFilter] = useState("");
  const [learningContentTypeFilter, setLearningContentTypeFilter] = useState("");
  const [learningStatusFilter, setLearningStatusFilter] = useState("all");
  const [learningSearch, setLearningSearch] = useState("");

  const learningEntriesUrl = (() => {
    const params = new URLSearchParams();
    if (learningCategoryFilter && learningCategoryFilter !== "all") params.set("category", learningCategoryFilter);
    if (learningContentTypeFilter && learningContentTypeFilter !== "all") params.set("contentType", learningContentTypeFilter);
    if (learningStatusFilter === "validated") { params.set("validated", "true"); params.set("rejected", "false"); }
    if (learningStatusFilter === "pending") { params.set("validated", "false"); params.set("rejected", "false"); }
    if (learningStatusFilter === "rejected") { params.set("rejected", "true"); }
    if (learningSearch) params.set("search", learningSearch);
    const qs = params.toString();
    return `/api/admin/learning/entries${qs ? `?${qs}` : ""}`;
  })();
  const { data: learningEntries, isLoading: learningEntriesLoading } = useQuery<Array<{ id: number; category: string; contentType: string; knowledge: string; source: string; confidence: number; usageCount: number; validated: boolean; rejected: boolean; createdAt: string }>>({
    queryKey: [learningEntriesUrl],
    enabled: activeTab === "learning",
  });

  const triggerLearningMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/learning/trigger", {});
    },
    onSuccess: () => {
      toast({ title: "تم بدء جلسة التعلم بنجاح" });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/learning/sessions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/learning/stats"] });
        queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/admin/learning/entries") });
      }, 5000);
    },
  });

  const updateEntryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { validated?: boolean; rejected?: boolean } }) => {
      await apiRequest("PATCH", `/api/admin/learning/entries/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/admin/learning/entries") });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/learning/stats"] });
      toast({ title: "تم تحديث المعرفة" });
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/learning/entries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/admin/learning/entries") });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/learning/stats"] });
      toast({ title: "تم حذف المعرفة" });
    },
  });

  const { data: webhookDeliveries } = useQuery<Array<{ id: number; payload: any; status: string; statusCode: number | null; errorMessage: string | null; retryCount: number; createdAt: string | null }>>({
    queryKey: ["/api/admin/webhook-deliveries"],
    enabled: activeTab === "webhook",
    refetchInterval: activeTab === "webhook" ? 10000 : false,
  });

  const webhookTestMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/webhook-test", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/webhook-deliveries"] });
      toast({ title: "تم إرسال اختبار الـ Webhook" });
    },
    onError: () => {
      toast({ title: "فشل اختبار الـ Webhook", variant: "destructive" });
    },
  });

  const toggleAutoLearningMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      await apiRequest("POST", "/api/admin/learning/auto-learning", { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/learning/stats"] });
      toast({ title: "تم تحديث إعداد التعلم التلقائي" });
    },
  });

  const [featureEdits, setFeatureEdits] = useState<Record<string, { disabledMessage: string; betaUserIds: string[] }>>({});
  const [betaSearchQuery, setBetaSearchQuery] = useState<Record<string, string>>({});

  const getFeatureEdit = (featureKey: string, feature: PlatformFeature) => {
    if (featureEdits[featureKey]) return featureEdits[featureKey];
    return { disabledMessage: feature.disabledMessage || "", betaUserIds: feature.betaUserIds || [] };
  };

  const setFeatureEdit = (featureKey: string, data: Partial<{ disabledMessage: string; betaUserIds: string[] }>, feature: PlatformFeature) => {
    const current = getFeatureEdit(featureKey, feature);
    setFeatureEdits(prev => ({ ...prev, [featureKey]: { ...current, ...data } }));
  };

  const updateFeatureMutation = useMutation({
    mutationFn: async ({ key, data }: { key: string; data: { enabled?: boolean; betaOnly?: boolean; disabledMessage?: string; betaUserIds?: string[] } }) => {
      await apiRequest("PATCH", `/api/admin/features/${key}`, data);
    },
    onSuccess: (_d, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/features"] });
      queryClient.invalidateQueries({ queryKey: ["/api/features"] });
      setFeatureEdits(prev => { const next = { ...prev }; delete next[variables.key]; return next; });
      toast({ title: "تم تحديث الميزة بنجاح" });
    },
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

  const { data: reviewsResponse, isLoading: reviewsLoading } = useQuery<PaginatedResponse<PlatformReview>>({
    queryKey: ["/api/admin/reviews", reviewFilter, reviewsPage],
    queryFn: async () => {
      const res = await fetch(`/api/admin/reviews?filter=${reviewFilter}&page=${reviewsPage}&limit=${ADMIN_PAGE_LIMIT}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: activeTab === "reviews",
  });
  const pendingReviews = reviewsResponse?.data;

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

  const { data: reportsResponse, isLoading: reportsLoading } = useQuery<PaginatedResponse<any>>({
    queryKey: ["/api/admin/reports", reportFilter, reportsPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (reportFilter !== "all") params.set("status", reportFilter);
      params.set("page", String(reportsPage));
      params.set("limit", String(ADMIN_PAGE_LIMIT));
      const res = await fetch(`/api/admin/reports?${params.toString()}`, { credentials: "include" });
      return res.json();
    },
    enabled: activeTab === "reports",
  });
  const reportsData = reportsResponse?.data;

  const { data: reportStats } = useQuery<any>({
    queryKey: ["/api/admin/reports/stats"],
    enabled: activeTab === "reports",
  });

  const { data: revenueData, isLoading: revenueLoading } = useQuery<any>({
    queryKey: ["/api/admin/revenue-summary"],
    enabled: activeTab === "revenue",
  });

  const bulkDismissMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await apiRequest("DELETE", "/api/admin/reports/bulk", { ids });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: `تم رفض ${data.dismissed} بلاغ` });
      setSelectedReports(new Set());
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports/stats"] });
    },
    onError: () => toast({ title: "فشل في رفض البلاغات", variant: "destructive" }),
  });

  const bulkWarnMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await apiRequest("POST", "/api/admin/reports/bulk-warn", { ids });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: `تم تحذير ${data.warned} مؤلف` });
      setSelectedReports(new Set());
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports/stats"] });
    },
    onError: () => toast({ title: "فشل في إرسال التحذيرات", variant: "destructive" }),
  });

  const bulkRemoveMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await apiRequest("POST", "/api/admin/reports/bulk-remove", { ids });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: `تم إزالة ${data.removed} محتوى` });
      setSelectedReports(new Set());
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports/stats"] });
    },
    onError: () => toast({ title: "فشل في إزالة المحتوى", variant: "destructive" }),
  });

  const { data: verifiedApps } = useQuery<any[]>({
    queryKey: ["/api/admin/verified-applications"],
    enabled: activeTab === "verified",
  });

  const updateVerifiedAppMutation = useMutation({
    mutationFn: async ({ id, status, adminNote }: { id: number; status: string; adminNote?: string }) => {
      return apiRequest("PATCH", `/api/admin/verified-applications/${id}`, { status, adminNote });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/verified-applications"] });
      toast({ title: "تم تحديث الطلب بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل في تحديث الطلب", variant: "destructive" });
    },
  });

  const updateReportMutation = useMutation({
    mutationFn: async ({ id, status, adminNote, actionTaken, priority }: { id: number; status?: string; adminNote?: string; actionTaken?: string; priority?: string }) => {
      const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
      const csrfVal = csrfMatch ? decodeURIComponent(csrfMatch[1]) : "";
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfVal },
        credentials: "include",
        body: JSON.stringify({ status, adminNote, actionTaken, priority }),
      });
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports/stats"] });
      setReportActionNotes((prev) => { const next = { ...prev }; delete next[variables.id]; return next; });
      toast({ title: "تم تحديث البلاغ بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل في تحديث البلاغ", variant: "destructive" });
    },
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

  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editUserForm, setEditUserForm] = useState({ displayName: "", firstName: "", lastName: "", bio: "", publicProfile: false });

  const handleEditUser = (u: AdminUser) => {
    setEditUser(u);
    setEditUserForm({
      displayName: u.displayName || "",
      firstName: u.firstName || "",
      lastName: u.lastName || "",
      bio: u.bio || "",
      publicProfile: u.publicProfile || false,
    });
    setShowEditUserDialog(true);
  };

  const editUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: typeof editUserForm }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/profile`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowEditUserDialog(false);
      setEditUser(null);
      toast({ title: "تم تحديث بيانات المستخدم بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل في تحديث بيانات المستخدم", variant: "destructive" });
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

  const updatePromoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/admin/promos/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promos"] });
      toast({ title: "تم تحديث كود الخصم بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل في تحديث كود الخصم", variant: "destructive" });
    },
  });

  const deletePromoMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/promos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promos"] });
      toast({ title: "تم حذف كود الخصم بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل في حذف كود الخصم", variant: "destructive" });
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
    { label: "مغلق", value: getStatCount("closed"), color: "text-gray-500 dark:text-gray-400" },
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
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
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
            <Link href="/admin/social-hub">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 hidden sm:flex"
                data-testid="button-social-hub"
              >
                <Megaphone className="w-3.5 h-3.5" />
                مركز السوشيال
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="flex sm:hidden"
                data-testid="button-social-hub-mobile"
              >
                <Megaphone className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/admin/marketing">
              <Button
                size="sm"
                className="gap-1.5 bg-gradient-to-r from-violet-600 to-primary hover:from-violet-700 hover:to-primary/90 text-white shadow-sm hidden sm:flex"
                data-testid="button-marketing-model"
              >
                <Megaphone className="w-3.5 h-3.5" />
                نموذج التسويق
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="flex sm:hidden text-violet-600"
                data-testid="button-marketing-model-mobile"
              >
                <Megaphone className="w-4 h-4" />
              </Button>
            </Link>
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
            <Button variant="ghost" size="icon" onClick={() => logout()} data-testid="button-logout" aria-label="تسجيل الخروج">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden lg:flex flex-col w-56 shrink-0 border-l bg-muted/30 sticky top-14 h-[calc(100vh-3.5rem)] sm:top-16 sm:h-[calc(100vh-4rem)]">
          <ScrollArea className="flex-1 py-4">
            <nav className="space-y-5 px-3">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 px-2">الإدارة</p>
                {[
                  { key: "tickets" as const, icon: Ticket, label: "تذاكر الدعم" },
                  { key: "users" as const, icon: Users, label: "المستخدمون" },
                  { key: "verified" as const, icon: ShieldCheck, label: "طلبات التوثيق", badge: verifiedApps?.filter((a: any) => a.status === "pending").length || 0 },
                  { key: "reports" as const, icon: AlertCircle, label: "البلاغات", badge: reportsData?.filter((r: any) => r.status === "pending").length || 0 },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setActiveTab(item.key)}
                    className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors relative ${activeTab === item.key ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted text-foreground/80"}`}
                    data-testid={`button-tab-${item.key}`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {item.label}
                    {item.badge && item.badge > 0 ? (
                      <Badge className="mr-auto h-5 min-w-5 px-1 flex items-center justify-center text-[10px] bg-red-500 text-white border-0" data-testid={`badge-${item.key}-count`}>
                        {item.badge}
                      </Badge>
                    ) : null}
                  </button>
                ))}
              </div>
              <Separator />
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 px-2">المحتوى</p>
                {[
                  { key: "reviews" as const, icon: MessageSquare, label: "المراجعات", badge: pendingReviews?.filter(r => !r.approved).length || 0 },
                  { key: "essays" as const, icon: FileText, label: "المقالات" },
                  { key: "memoires" as const, icon: GraduationCap, label: "المذكرات" },
                  { key: "social" as const, icon: Share2, label: "وسائل التواصل" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setActiveTab(item.key)}
                    className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${activeTab === item.key ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted text-foreground/80"}`}
                    data-testid={`button-tab-${item.key}`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {item.label}
                    {"badge" in item && item.badge && item.badge > 0 ? (
                      <Badge variant="secondary" className="mr-auto text-[10px]" data-testid={`badge-${item.key}-count`}>
                        <LtrNum>{item.badge}</LtrNum>
                      </Badge>
                    ) : null}
                  </button>
                ))}
              </div>
              <Separator />
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 px-2">التحليلات</p>
                {[
                  { key: "analytics" as const, icon: BarChart3, label: "إحصائيات" },
                  { key: "revenue" as const, icon: DollarSign, label: "الإيرادات" },
                  { key: "api-usage" as const, icon: Cpu, label: "استخدام API" },
                  { key: "tracking" as const, icon: Crosshair, label: "بكسل التتبع" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setActiveTab(item.key)}
                    className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${activeTab === item.key ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted text-foreground/80"}`}
                    data-testid={`button-tab-${item.key}`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </button>
                ))}
              </div>
              <Separator />
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 px-2">الإعدادات</p>
                {[
                  { key: "promos" as const, icon: Tag, label: "رموز الخصم" },
                  { key: "features" as const, icon: Settings, label: "المميزات" },
                  { key: "learning" as const, icon: Brain, label: "التعلم الذاتي" },
                  { key: "webhook" as const, icon: Webhook, label: "Webhook التدريب" },
                  { key: "challenges" as const, icon: Crown, label: "التحديات" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setActiveTab(item.key)}
                    className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${activeTab === item.key ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted text-foreground/80"}`}
                    data-testid={`button-tab-${item.key}`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </button>
                ))}
              </div>
            </nav>
          </ScrollArea>
        </aside>

        <main ref={mainContentRef} className="flex-1 min-w-0 overflow-y-auto px-4 sm:px-6 py-6 sm:py-10">
          {impersonating && (
            <div className="sticky top-0 z-50 mb-4 space-y-2" data-testid="impersonation-banner">
              <div className="flex items-center gap-3 p-3 bg-amber-100 dark:bg-amber-900/50 border border-amber-300 dark:border-amber-700 rounded-lg shadow-sm">
                <UserCheck className="w-5 h-5 text-amber-700 dark:text-amber-300 shrink-0" />
                <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  أنت تتصفح كـ: <strong>{impersonating.displayName}</strong>
                  {impersonating.email && <span className="text-xs opacity-75 mr-2">({impersonating.email})</span>}
                  {impersonating.plan && <Badge variant="outline" className="mr-2 text-[10px]">{planLabels[impersonating.plan] || impersonating.plan}</Badge>}
                </span>
                <div className="flex-1" />
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-400 text-amber-800 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-800"
                  onClick={() => window.open(`/author/${impersonating.id}`, "_blank")}
                  data-testid="button-view-as-profile"
                >
                  <Eye className="w-3.5 h-3.5 ml-1" />
                  عرض الملف الشخصي
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-400 text-amber-800 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-800"
                  onClick={async () => {
                    try { await apiRequest("POST", "/api/admin/impersonate/stop", { token: impersonating.token }); } catch {}
                    setImpersonating(null);
                    setImpersonationData(null);
                    toast({ title: "تم الخروج من وضع العرض" });
                  }}
                  data-testid="button-exit-impersonation"
                >
                  <X className="w-3.5 h-3.5 ml-1" />
                  خروج
                </Button>
              </div>
              {impersonationData && (
                <div className="p-4 bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg space-y-3" data-testid="impersonation-user-data">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="text-center p-2 bg-white dark:bg-background rounded border">
                      <p className="text-lg font-bold"><LtrNum>{impersonationData.totalProjects || 0}</LtrNum></p>
                      <p className="text-[10px] text-muted-foreground">إجمالي المشاريع</p>
                    </div>
                    <div className="text-center p-2 bg-white dark:bg-background rounded border">
                      <p className="text-lg font-bold"><LtrNum>{impersonationData.notificationCount || 0}</LtrNum></p>
                      <p className="text-[10px] text-muted-foreground">إشعارات غير مقروءة</p>
                    </div>
                    <div className="text-center p-2 bg-white dark:bg-background rounded border">
                      <p className="text-lg font-bold">{impersonationData.user?.plan ? planLabels[impersonationData.user.plan] || impersonationData.user.plan : "مجانية"}</p>
                      <p className="text-[10px] text-muted-foreground">الخطة</p>
                    </div>
                    <div className="text-center p-2 bg-white dark:bg-background rounded border">
                      <p className="text-lg font-bold text-xs">{impersonationData.user?.createdAt ? new Date(impersonationData.user.createdAt).toLocaleDateString("ar-EG") : "—"}</p>
                      <p className="text-[10px] text-muted-foreground">تاريخ الانضمام</p>
                    </div>
                  </div>
                  {impersonationData.projects && impersonationData.projects.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-2">مشاريع المستخدم الأخيرة:</p>
                      <div className="space-y-1">
                        {impersonationData.projects.slice(0, 5).map((p: any) => (
                          <div key={p.id} className="flex items-center gap-2 text-xs p-1.5 bg-white dark:bg-background rounded border">
                            <Badge variant="outline" className="text-[10px]">{projectTypeLabels[p.type] || p.type}</Badge>
                            <span className="font-medium truncate flex-1">{p.title || "بدون عنوان"}</span>
                            <Badge variant={p.status === "completed" ? "default" : "secondary"} className="text-[10px]">
                              {projectStatusLabels[p.status] || p.status}
                            </Badge>
                            {p.publishedToGallery && <Badge className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200">منشور</Badge>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="flex items-center gap-3 mb-6 sm:mb-8">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden shrink-0" data-testid="button-admin-menu" aria-label="قائمة الإدارة">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64 p-0" dir="rtl">
                <div className="p-4 border-b">
                  <h2 className="font-serif text-lg font-bold flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    لوحة الإدارة
                  </h2>
                </div>
                <ScrollArea className="h-[calc(100vh-5rem)]">
                  <nav className="space-y-5 px-3 py-4">
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 px-2">الإدارة</p>
                      {[
                        { key: "tickets" as const, icon: Ticket, label: "تذاكر الدعم" },
                        { key: "users" as const, icon: Users, label: "المستخدمون" },
                        { key: "verified" as const, icon: ShieldCheck, label: "طلبات التوثيق", badge: verifiedApps?.filter((a: any) => a.status === "pending").length || 0 },
                        { key: "reports" as const, icon: AlertCircle, label: "البلاغات", badge: reportsData?.filter((r: any) => r.status === "pending").length || 0 },
                      ].map((item) => (
                        <button
                          key={item.key}
                          onClick={() => { setActiveTab(item.key); setMobileMenuOpen(false); }}
                          className={`w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors ${activeTab === item.key ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted text-foreground/80"}`}
                          data-testid={`button-mobile-tab-${item.key}`}
                        >
                          <item.icon className="w-4 h-4 shrink-0" />
                          {item.label}
                          {item.badge && item.badge > 0 ? (
                            <Badge className="mr-auto h-5 min-w-5 px-1 flex items-center justify-center text-[10px] bg-red-500 text-white border-0">
                              {item.badge}
                            </Badge>
                          ) : null}
                        </button>
                      ))}
                    </div>
                    <Separator />
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 px-2">المحتوى</p>
                      {[
                        { key: "reviews" as const, icon: MessageSquare, label: "المراجعات", badge: pendingReviews?.filter(r => !r.approved).length || 0 },
                        { key: "essays" as const, icon: FileText, label: "المقالات" },
                        { key: "memoires" as const, icon: GraduationCap, label: "المذكرات" },
                        { key: "social" as const, icon: Share2, label: "وسائل التواصل" },
                      ].map((item) => (
                        <button
                          key={item.key}
                          onClick={() => { setActiveTab(item.key); setMobileMenuOpen(false); }}
                          className={`w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors ${activeTab === item.key ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted text-foreground/80"}`}
                          data-testid={`button-mobile-tab-${item.key}`}
                        >
                          <item.icon className="w-4 h-4 shrink-0" />
                          {item.label}
                          {"badge" in item && item.badge && item.badge > 0 ? (
                            <Badge variant="secondary" className="mr-auto text-[10px]">
                              <LtrNum>{item.badge}</LtrNum>
                            </Badge>
                          ) : null}
                        </button>
                      ))}
                    </div>
                    <Separator />
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 px-2">التحليلات</p>
                      {[
                        { key: "analytics" as const, icon: BarChart3, label: "إحصائيات" },
                        { key: "revenue" as const, icon: DollarSign, label: "الإيرادات" },
                        { key: "api-usage" as const, icon: Cpu, label: "استخدام API" },
                        { key: "tracking" as const, icon: Crosshair, label: "بكسل التتبع" },
                      ].map((item) => (
                        <button
                          key={item.key}
                          onClick={() => { setActiveTab(item.key); setMobileMenuOpen(false); }}
                          className={`w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors ${activeTab === item.key ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted text-foreground/80"}`}
                          data-testid={`button-mobile-tab-${item.key}`}
                        >
                          <item.icon className="w-4 h-4 shrink-0" />
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <Separator />
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 px-2">الإعدادات</p>
                      {[
                        { key: "promos" as const, icon: Tag, label: "رموز الخصم" },
                        { key: "features" as const, icon: Settings, label: "المميزات" },
                        { key: "learning" as const, icon: Brain, label: "التعلم الذاتي" },
                        { key: "webhook" as const, icon: Webhook, label: "Webhook التدريب" },
                        { key: "challenges" as const, icon: Crown, label: "التحديات" },
                      ].map((item) => (
                        <button
                          key={item.key}
                          onClick={() => { setActiveTab(item.key); setMobileMenuOpen(false); }}
                          className={`w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors ${activeTab === item.key ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted text-foreground/80"}`}
                          data-testid={`button-mobile-tab-${item.key}`}
                        >
                          <item.icon className="w-4 h-4 shrink-0" />
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </nav>
                </ScrollArea>
              </SheetContent>
            </Sheet>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold" data-testid="text-admin-title">
              لوحة الإدارة
            </h1>
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
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setTicketsPage(1); }}>
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
              {ticketsResponse && (
                <AdminPagination page={ticketsResponse.page} total={ticketsResponse.total} limit={ticketsResponse.limit} onPageChange={setTicketsPage} testIdPrefix="tickets" />
              )}
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
                {usersResponse ? <><LtrNum>{usersResponse.total}</LtrNum> مستخدم</> : ""}
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
                            <div className="flex flex-col gap-1">
                              <Badge variant={u.plan === "free" ? "outline" : "default"}>
                                {u.plan === "all_in_one" && <Crown className="w-3 h-3 ml-1" />}
                                {planLabels[u.plan] || u.plan}
                              </Badge>
                              {u.plan === "trial" && u.trialChargeStatus && (
                                <Badge variant="outline" className={`text-[10px] ${
                                  u.trialChargeStatus === "succeeded" ? "text-green-600 border-green-300" :
                                  u.trialChargeStatus === "failed" ? "text-red-600 border-red-300" :
                                  u.trialChargeStatus === "requires_action" ? "text-amber-600 border-amber-300" :
                                  "text-blue-600 border-blue-300"
                                }`} data-testid={`badge-trial-charge-${u.id}`}>
                                  {u.trialChargeStatus === "succeeded" ? "تم التحصيل" :
                                   u.trialChargeStatus === "failed" ? "فشل التحصيل" :
                                   u.trialChargeStatus === "requires_action" ? "بانتظار التأكيد" :
                                   u.trialChargeStatus === "pending" ? "جارٍ التحصيل" : u.trialChargeStatus}
                                </Badge>
                              )}
                            </div>
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
                                onClick={() => handleEditUser(u)}
                                data-testid={`button-edit-user-${u.id}`}
                              >
                                <Pencil className="w-4 h-4 ml-1" />
                                تعديل
                              </Button>
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
                              {user && SUPER_ADMIN_IDS.includes(String(user.id)) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const res = await apiRequest("POST", `/api/admin/impersonate/${u.id}/start`);
                                    const data = await res.json();
                                    if (data.success) {
                                      setImpersonating({ id: data.user.id, displayName: data.user.displayName, email: data.user.email, plan: data.user.plan, token: data.token });
                                      const viewRes = await fetch(`/api/admin/impersonate/view?token=${data.token}`, { credentials: "include" });
                                      if (viewRes.ok) {
                                        const viewData = await viewRes.json();
                                        setImpersonationData(viewData);
                                      }
                                      toast({ title: `وضع العرض: ${data.user.displayName}` });
                                    }
                                  } catch {
                                    toast({ title: "فشل في تحميل بيانات المستخدم", variant: "destructive" });
                                  }
                                }}
                                data-testid={`button-impersonate-${u.id}`}
                              >
                                <Eye className="w-4 h-4 ml-1" />
                                عرض كمستخدم
                              </Button>
                              )}
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
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditUser(u)} data-testid={`button-edit-user-mobile-${u.id}`}>
                          <Pencil className="w-3.5 h-3.5 ml-1" />
                          تعديل
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleViewProjects(u.id)} data-testid={`button-view-projects-mobile-${u.id}`}>
                          <FolderOpen className="w-3.5 h-3.5 ml-1" />
                          المشاريع
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleChangePlan(u)} data-testid={`button-change-plan-mobile-${u.id}`}>
                          <Crown className="w-3.5 h-3.5 ml-1" />
                          تغيير الخطة
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleGrantAnalysis(u)} data-testid={`button-grant-analysis-mobile-${u.id}`}>
                          <BarChart3 className="w-3.5 h-3.5 ml-1" />
                          منح تحليل
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {usersResponse && (
                <AdminPagination page={usersResponse.page} total={usersResponse.total} limit={usersResponse.limit} onPageChange={setUsersPage} testIdPrefix="users" />
              )}
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
              <>
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
                        <th className="text-right p-3 font-medium text-muted-foreground">إجراءات</th>
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
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updatePromoMutation.mutate({ id: promo.id, data: { active: !promo.active } })}
                                disabled={updatePromoMutation.isPending}
                                data-testid={`button-promo-toggle-${promo.id}`}
                              >
                                {promo.active ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-600"
                                onClick={() => { if (confirm("هل أنت متأكد من حذف كود الخصم هذا؟")) deletePromoMutation.mutate(promo.id); }}
                                disabled={deletePromoMutation.isPending}
                                data-testid={`button-promo-delete-${promo.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {promosResponse && (
                <AdminPagination page={promosResponse.page} total={promosResponse.total} limit={promosResponse.limit} onPageChange={setPromosPage} testIdPrefix="promos" />
              )}
              </>
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
            <div className="flex items-center gap-2 mb-6">
              <Button
                variant={reviewFilter === "pending" ? "default" : "outline"}
                size="sm"
                onClick={() => { setReviewFilter("pending"); setReviewsPage(1); }}
                data-testid="button-review-filter-pending"
              >
                قيد الانتظار
              </Button>
              <Button
                variant={reviewFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => { setReviewFilter("all"); setReviewsPage(1); }}
                data-testid="button-review-filter-all"
              >
                جميع المراجعات
              </Button>
            </div>
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
              <>
              <div className="space-y-3">
                {pendingReviews.map((review) => (
                  <Card key={review.id} data-testid={`card-review-${review.id}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm" data-testid={`text-reviewer-name-${review.id}`}>
                            {review.reviewerName}
                          </span>
                          {review.approved && (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-[10px]" data-testid={`badge-review-approved-${review.id}`}>
                              <Check className="w-3 h-3 ml-0.5" /> معتمدة
                            </Badge>
                          )}
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
                        {!review.approved && (
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
                        )}
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
              {reviewsResponse && (
                <AdminPagination page={reviewsResponse.page} total={reviewsResponse.total} limit={reviewsResponse.limit} onPageChange={setReviewsPage} testIdPrefix="reviews" />
              )}
              </>
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
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-200 transition-transform ${tiktokConfig.enabled ? "translate-x-1" : "translate-x-6"}`} />
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
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-200 transition-transform ${facebookConfig.enabled ? "translate-x-1" : "translate-x-6"}`} />
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
                  <SelectItem value="ctr">أعلى نسبة النقر</SelectItem>
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
                      <div className="text-xs text-muted-foreground">متوسط نسبة النقر</div>
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
                          <th className="text-right p-3 font-medium text-muted-foreground">نسبة النقر</th>
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
                              نسبة النقر: <LtrNum>{ctr}%</LtrNum>
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

        {activeTab === "memoires" && (
          <>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-6">
              <h2 className="font-serif text-lg font-bold flex-1 flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                تحليلات المذكرات الجامعية
              </h2>
              <Select value={memoireSortBy} onValueChange={(v) => setMemoireSortBy(v as "views" | "clicks" | "ctr")}>
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-memoire-sort">
                  <SelectValue placeholder="ترتيب حسب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clicks">الأكثر نقراً</SelectItem>
                  <SelectItem value="views">الأكثر مشاهدة</SelectItem>
                  <SelectItem value="ctr">أعلى نسبة النقر</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {memoireAnalyticsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-5 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (() => {
              const sorted = [...(memoireAnalytics || [])].sort((a, b) => {
                if (memoireSortBy === "views") return b.views - a.views;
                if (memoireSortBy === "ctr") {
                  const ctrA = a.views > 0 ? a.clicks / a.views : 0;
                  const ctrB = b.views > 0 ? b.clicks / b.views : 0;
                  return ctrB - ctrA;
                }
                return b.clicks - a.clicks;
              });
              return sorted.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <Card data-testid="card-total-memoires">
                      <CardContent className="p-5 text-center">
                        <div className="text-3xl font-bold mb-1"><LtrNum>{sorted.length}</LtrNum></div>
                        <div className="text-xs text-muted-foreground">إجمالي المذكرات</div>
                      </CardContent>
                    </Card>
                    <Card data-testid="card-total-memoire-views">
                      <CardContent className="p-5 text-center">
                        <div className="text-3xl font-bold mb-1 text-blue-500"><LtrNum>{sorted.reduce((s, m) => s + m.views, 0)}</LtrNum></div>
                        <div className="text-xs text-muted-foreground">إجمالي المشاهدات</div>
                      </CardContent>
                    </Card>
                    <Card data-testid="card-total-memoire-clicks">
                      <CardContent className="p-5 text-center">
                        <div className="text-3xl font-bold mb-1 text-green-500"><LtrNum>{sorted.reduce((s, m) => s + m.clicks, 0)}</LtrNum></div>
                        <div className="text-xs text-muted-foreground">إجمالي النقرات</div>
                      </CardContent>
                    </Card>
                    <Card data-testid="card-memoire-avg-ctr">
                      <CardContent className="p-5 text-center">
                        <div className="text-3xl font-bold mb-1 text-amber-500">
                          <LtrNum>
                            {(() => {
                              const totalViews = sorted.reduce((s, m) => s + m.views, 0);
                              const totalClicks = sorted.reduce((s, m) => s + m.clicks, 0);
                              return totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : "0";
                            })()}%
                          </LtrNum>
                        </div>
                        <div className="text-xs text-muted-foreground">متوسط نسبة النقر</div>
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
                            <th className="text-right p-3 font-medium text-muted-foreground">الجامعة</th>
                            <th className="text-right p-3 font-medium text-muted-foreground">التخصص</th>
                            <th className="text-right p-3 font-medium text-muted-foreground">المنهج</th>
                            <th className="text-right p-3 font-medium text-muted-foreground">البلد</th>
                            <th className="text-right p-3 font-medium text-muted-foreground">المشاهدات</th>
                            <th className="text-right p-3 font-medium text-muted-foreground">النقرات</th>
                            <th className="text-right p-3 font-medium text-muted-foreground">نسبة النقر</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sorted.map((m, idx) => {
                            const ctr = m.views > 0 ? ((m.clicks / m.views) * 100).toFixed(1) : "0";
                            return (
                              <tr key={m.projectId} className="border-b last:border-0 hover:bg-muted/30 transition-colors" data-testid={`row-memoire-${m.projectId}`}>
                                <td className="p-3 text-muted-foreground"><LtrNum>{idx + 1}</LtrNum></td>
                                <td className="p-3 font-medium max-w-[250px] truncate" data-testid={`text-memoire-title-${m.projectId}`}>{m.title}</td>
                                <td className="p-3 text-xs max-w-[150px] truncate" data-testid={`text-memoire-university-${m.projectId}`}>{m.university || "-"}</td>
                                <td className="p-3 text-xs max-w-[120px] truncate" data-testid={`text-memoire-field-${m.projectId}`}>{({
                                  sciences: "العلوم", humanities: "العلوم الإنسانية", law: "القانون والحقوق",
                                  medicine: "الطب والعلوم الصحية", engineering: "الهندسة", economics: "الاقتصاد والتجارة",
                                  education: "علوم التربية", literature: "الأدب واللغات", media: "الإعلام والاتصال",
                                  computer_science: "علوم الحاسوب والمعلوماتية", political_science: "العلوم السياسية",
                                  sociology: "علم الاجتماع", psychology: "علم النفس", islamic_studies: "الدراسات الإسلامية",
                                  agriculture: "العلوم الزراعية", architecture: "العمارة والتخطيط", pharmacy: "الصيدلة",
                                  management: "الإدارة والتسيير",
                                } as Record<string, string>)[m.memoireField || ""] || m.memoireField || "-"}</td>
                                <td className="p-3 text-xs" data-testid={`text-memoire-methodology-${m.projectId}`}>{m.memoireMethodology || "-"}</td>
                                <td className="p-3 text-xs" data-testid={`text-memoire-country-${m.projectId}`}>{({
                                  dz: "الجزائر", ma: "المغرب", tn: "تونس", eg: "مصر", sa: "السعودية",
                                  ae: "الإمارات", iq: "العراق", jo: "الأردن", lb: "لبنان", sy: "سوريا",
                                  kw: "الكويت", qa: "قطر", bh: "البحرين", om: "عُمان", ye: "اليمن", ly: "ليبيا",
                                  sd: "السودان", mr: "موريتانيا", so: "الصومال", dj: "جيبوتي", km: "جزر القمر", ps: "فلسطين",
                                } as Record<string, string>)[m.memoireCountry || ""] || m.memoireCountry || "-"}</td>
                                <td className="p-3" data-testid={`text-memoire-views-${m.projectId}`}>
                                  <div className="flex items-center gap-1.5">
                                    <Eye className="w-3.5 h-3.5 text-blue-500" />
                                    <LtrNum>{m.views.toLocaleString()}</LtrNum>
                                  </div>
                                </td>
                                <td className="p-3" data-testid={`text-memoire-clicks-${m.projectId}`}>
                                  <div className="flex items-center gap-1.5">
                                    <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                                    <LtrNum>{m.clicks.toLocaleString()}</LtrNum>
                                  </div>
                                </td>
                                <td className="p-3" data-testid={`text-memoire-ctr-${m.projectId}`}>
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
                    {sorted.map((m, idx) => {
                      const ctr = m.views > 0 ? ((m.clicks / m.views) * 100).toFixed(1) : "0";
                      return (
                        <Card key={m.projectId} data-testid={`card-memoire-${m.projectId}`}>
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-medium text-sm line-clamp-2">{m.title}</span>
                              <span className="font-mono text-xs text-muted-foreground shrink-0">#{idx + 1}</span>
                            </div>
                            {(m.university || m.memoireField || m.memoireCountry) && (
                              <div className="flex flex-wrap gap-1">
                                {m.university && <Badge variant="outline" className="text-[10px]" data-testid={`badge-memoire-university-${m.projectId}`}>{m.university}</Badge>}
                                {m.memoireField && <Badge variant="outline" className="text-[10px]" data-testid={`badge-memoire-field-${m.projectId}`}>{({
                                  sciences: "العلوم", humanities: "العلوم الإنسانية", law: "القانون والحقوق",
                                  medicine: "الطب والعلوم الصحية", engineering: "الهندسة", economics: "الاقتصاد والتجارة",
                                  education: "علوم التربية", literature: "الأدب واللغات", media: "الإعلام والاتصال",
                                  computer_science: "علوم الحاسوب والمعلوماتية", political_science: "العلوم السياسية",
                                  sociology: "علم الاجتماع", psychology: "علم النفس", islamic_studies: "الدراسات الإسلامية",
                                  agriculture: "العلوم الزراعية", architecture: "العمارة والتخطيط", pharmacy: "الصيدلة",
                                  management: "الإدارة والتسيير",
                                } as Record<string, string>)[m.memoireField] || m.memoireField}</Badge>}
                                {m.memoireCountry && <Badge variant="outline" className="text-[10px]" data-testid={`badge-memoire-country-${m.projectId}`}>{({
                                  dz: "الجزائر", ma: "المغرب", tn: "تونس", eg: "مصر", sa: "السعودية",
                                  ae: "الإمارات", iq: "العراق", jo: "الأردن", lb: "لبنان", sy: "سوريا",
                                  kw: "الكويت", qa: "قطر", bh: "البحرين", om: "عُمان", ye: "اليمن", ly: "ليبيا",
                                  sd: "السودان", mr: "موريتانيا", so: "الصومال", dj: "جيبوتي", km: "جزر القمر", ps: "فلسطين",
                                } as Record<string, string>)[m.memoireCountry] || m.memoireCountry}</Badge>}
                              </div>
                            )}
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Eye className="w-3.5 h-3.5 text-blue-500" />
                                <LtrNum>{m.views.toLocaleString()}</LtrNum> مشاهدة
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                                <LtrNum>{m.clicks.toLocaleString()}</LtrNum> نقرة
                              </div>
                              <Badge variant="secondary" className="text-[10px]">
                                نسبة النقر: <LtrNum>{ctr}%</LtrNum>
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
                    <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">لا توجد مذكرات منشورة بعد</p>
                  </CardContent>
                </Card>
              );
            })()}
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

      <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل بيانات المستخدم</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {editUser.email || editUser.id}
              </div>
              <div className="space-y-2">
                <Label>اسم العرض العام</Label>
                <Input
                  value={editUserForm.displayName}
                  onChange={(e) => setEditUserForm({ ...editUserForm, displayName: e.target.value })}
                  placeholder="اسم العرض"
                  data-testid="input-edit-displayName"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>الاسم الأول</Label>
                  <Input
                    value={editUserForm.firstName}
                    onChange={(e) => setEditUserForm({ ...editUserForm, firstName: e.target.value })}
                    placeholder="الاسم الأول"
                    data-testid="input-edit-firstName"
                  />
                </div>
                <div className="space-y-2">
                  <Label>الاسم الأخير</Label>
                  <Input
                    value={editUserForm.lastName}
                    onChange={(e) => setEditUserForm({ ...editUserForm, lastName: e.target.value })}
                    placeholder="الاسم الأخير"
                    data-testid="input-edit-lastName"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>نبذة</Label>
                <Textarea
                  value={editUserForm.bio}
                  onChange={(e) => setEditUserForm({ ...editUserForm, bio: e.target.value })}
                  placeholder="نبذة عن المستخدم"
                  rows={3}
                  data-testid="input-edit-bio"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>تفعيل الملف الشخصي العام</Label>
                <Switch
                  checked={editUserForm.publicProfile}
                  onCheckedChange={(checked) => setEditUserForm({ ...editUserForm, publicProfile: checked })}
                  data-testid="switch-edit-publicProfile"
                />
              </div>
              <Button
                className="w-full"
                disabled={editUserMutation.isPending}
                onClick={() => editUserMutation.mutate({ userId: editUser.id, data: editUserForm })}
                data-testid="button-save-edit-user"
              >
                {editUserMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                حفظ التعديلات
              </Button>
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

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground" data-testid="content-project-meta">
                {projectContent.project.projectType && (
                  <Badge variant="outline" className="text-[10px]">
                    {{ novel: "رواية", essay: "مقال", scenario: "سيناريو", short_story: "قصة قصيرة", khawater: "خواطر", social_media: "تواصل اجتماعي", poetry: "شعر", memoire: "مذكرة تخرج" }[projectContent.project.projectType as string] || projectContent.project.projectType}
                  </Badge>
                )}
                {projectContent.project.userId && <span>المؤلف: {projectContent.project.userId}</span>}
                {projectContent.project.createdAt && <span>تاريخ الإنشاء: {new Date(projectContent.project.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" })}</span>}
                {projectContent.project.publishedToGallery && <Badge variant="secondary" className="text-[10px]">منشور في المعرض</Badge>}
              </div>

              {projectContent.project.flagged && (
                <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/20 text-sm text-red-700 dark:text-red-400" data-testid="text-flag-reason">
                  <Flag className="w-4 h-4 inline ml-1" />
                  مُبلّغ: {projectContent.project.flagReason || "بدون سبب"}
                </div>
              )}

              {contentProjectId && (() => {
                const projectReports = (reportsData || []).filter((r: any) => r.projectId === contentProjectId);
                if (projectReports.length === 0) return null;
                return (
                  <div className="space-y-2" data-testid="content-report-timeline">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5">
                      <Flag className="w-4 h-4 text-red-500" />
                      سجل البلاغات ({projectReports.length})
                    </h4>
                    <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                      {projectReports.map((r: any) => (
                        <div key={r.id} className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1.5">
                          {r.reportNumber && <span className="font-mono text-[10px] text-muted-foreground">{r.reportNumber}</span>}
                          <Badge className={`text-[10px] ${({
                            pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
                            reviewed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
                            dismissed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
                            action_taken: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
                          } as Record<string, string>)[r.status] || ""}`}>
                            {{ pending: "قيد الانتظار", reviewed: "تمت المراجعة", dismissed: "مرفوض", action_taken: "تم اتخاذ إجراء" }[r.status as string] || r.status}
                          </Badge>
                          <span>{{ inappropriate: "غير لائق", plagiarism: "سرقة أدبية", offensive: "مسيء", spam: "مزعج", other: "أخرى" }[r.reason as string] || r.reason}</span>
                          {r.severity && (
                            <Badge variant="outline" className="text-[10px]">
                              {{ low: "منخفضة", medium: "متوسطة", high: "عالية", critical: "حرجة" }[r.severity as string] || r.severity}
                            </Badge>
                          )}
                          <span className="text-muted-foreground mr-auto">{new Date(r.createdAt).toLocaleDateString("ar-EG", { month: "short", day: "numeric" })}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

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

        {activeTab === "features" && (
          <div className="space-y-4" data-testid="features-panel">
            <h2 className="text-xl font-serif font-bold" data-testid="text-features-heading">إدارة المميزات</h2>
            <p className="text-sm text-muted-foreground">يمكنك تفعيل أو تعطيل أي ميزة في المنصة. الميزات المعطّلة ستظهر للمستخدمين مع رسالة "قيد التطوير".</p>
            {featuresLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4">
                {(adminFeatures || []).map((feature) => (
                  <Card key={feature.featureKey} className={`transition-all ${!feature.enabled ? 'opacity-70 border-destructive/30' : feature.betaOnly ? 'border-amber-400/50' : ''}`} data-testid={`card-feature-${feature.featureKey}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {!feature.enabled ? (
                            <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                          ) : feature.betaOnly ? (
                            <Users className="w-5 h-5 text-amber-500" />
                          ) : (
                            <ToggleRight className="w-5 h-5 text-green-500" />
                          )}
                          <div>
                            <h3 className="font-semibold" data-testid={`text-feature-name-${feature.featureKey}`}>{feature.name}</h3>
                            <p className="text-xs text-muted-foreground">{feature.description}</p>
                          </div>
                        </div>
                        <div className="flex gap-1" data-testid={`feature-mode-${feature.featureKey}`}>
                          <Button
                            size="sm"
                            variant={feature.enabled && !feature.betaOnly ? "default" : "outline"}
                            onClick={() => updateFeatureMutation.mutate({ key: feature.featureKey, data: { enabled: true, betaOnly: false } })}
                            disabled={updateFeatureMutation.isPending}
                            data-testid={`button-mode-all-${feature.featureKey}`}
                          >
                            للجميع
                          </Button>
                          <Button
                            size="sm"
                            variant={feature.enabled && feature.betaOnly ? "secondary" : "outline"}
                            onClick={() => updateFeatureMutation.mutate({ key: feature.featureKey, data: { enabled: true, betaOnly: true } })}
                            disabled={updateFeatureMutation.isPending}
                            data-testid={`button-mode-beta-${feature.featureKey}`}
                          >
                            بيتا فقط
                          </Button>
                          <Button
                            size="sm"
                            variant={!feature.enabled ? "destructive" : "outline"}
                            onClick={() => updateFeatureMutation.mutate({ key: feature.featureKey, data: { enabled: false, betaOnly: false } })}
                            disabled={updateFeatureMutation.isPending}
                            data-testid={`button-mode-disabled-${feature.featureKey}`}
                          >
                            معطّلة
                          </Button>
                        </div>
                      </div>
                      {(!feature.enabled || feature.betaOnly) && (() => {
                        const edit = getFeatureEdit(feature.featureKey, feature);
                        const searchQ = (betaSearchQuery[feature.featureKey] || "").toLowerCase();
                        const filteredUsers = searchQ.length >= 2 && adminUsers
                          ? adminUsers.filter(u =>
                              !edit.betaUserIds.includes(u.id) &&
                              ((u.email || "").toLowerCase().includes(searchQ) ||
                               (u.firstName || "").toLowerCase().includes(searchQ) ||
                               (u.lastName || "").toLowerCase().includes(searchQ))
                            ).slice(0, 5)
                          : [];
                        const origMsg = feature.disabledMessage || "";
                        const origIds = (feature.betaUserIds || []).join(",");
                        const hasChanges = edit.disabledMessage !== origMsg || edit.betaUserIds.join(",") !== origIds;
                        return (
                          <div className="space-y-3 border-t pt-3">
                            {!feature.enabled && (
                              <div>
                                <Label className="text-xs">رسالة التعطيل</Label>
                                <Textarea
                                  value={edit.disabledMessage}
                                  onChange={(e) => setFeatureEdit(feature.featureKey, { disabledMessage: e.target.value }, feature)}
                                  className="mt-1 text-sm"
                                  rows={2}
                                  data-testid={`input-disabled-message-${feature.featureKey}`}
                                />
                              </div>
                            )}
                            <div>
                              <Label className="text-xs">مستخدمو البيتا</Label>
                              {edit.betaUserIds.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2" data-testid={`beta-users-list-${feature.featureKey}`}>
                                  {edit.betaUserIds.map(uid => {
                                    const u = adminUsers?.find(au => au.id === uid);
                                    return (
                                      <Badge key={uid} variant="secondary" className="gap-1 pl-1 pr-2 py-1">
                                        <Avatar className="h-5 w-5">
                                          {u?.profileImageUrl ? <AvatarImage src={u.profileImageUrl} /> : null}
                                          <AvatarFallback className="text-[10px]">{(u?.firstName || u?.email || uid).charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs" dir="ltr">{u ? (u.firstName || u.email || uid) : uid}</span>
                                        <button
                                          type="button"
                                          className="mr-1 opacity-60 hover:opacity-100 transition-opacity"
                                          aria-label="إزالة المستخدم"
                                          onClick={() => setFeatureEdit(feature.featureKey, { betaUserIds: edit.betaUserIds.filter(id => id !== uid) }, feature)}
                                          data-testid={`button-remove-beta-${feature.featureKey}-${uid}`}
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </Badge>
                                    );
                                  })}
                                </div>
                              )}
                              <div className="relative mt-2">
                                <Input
                                  value={betaSearchQuery[feature.featureKey] || ""}
                                  onChange={(e) => setBetaSearchQuery(prev => ({ ...prev, [feature.featureKey]: e.target.value }))}
                                  placeholder="ابحث عن مستخدم بالبريد الإلكتروني أو الاسم..."
                                  className="text-sm"
                                  data-testid={`input-beta-search-${feature.featureKey}`}
                                />
                                {searchQ.length >= 2 && (
                                  <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto" data-testid={`dropdown-beta-users-${feature.featureKey}`}>
                                    {!adminUsers ? (
                                      <div className="flex items-center justify-center p-3 gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="text-xs text-muted-foreground">جارٍ تحميل المستخدمين...</span>
                                      </div>
                                    ) : filteredUsers.length === 0 ? (
                                      <div className="p-3 text-center text-xs text-muted-foreground" data-testid={`text-no-results-${feature.featureKey}`}>
                                        لا توجد نتائج مطابقة
                                      </div>
                                    ) : (
                                      filteredUsers.map(u => (
                                        <button
                                          key={u.id}
                                          type="button"
                                          className="w-full flex items-center gap-2 p-2 bg-popover transition-colors focus:bg-muted text-right"
                                          onMouseEnter={(e) => e.currentTarget.classList.add("bg-muted")}
                                          onMouseLeave={(e) => e.currentTarget.classList.remove("bg-muted")}
                                          onClick={() => {
                                            setFeatureEdit(feature.featureKey, { betaUserIds: [...edit.betaUserIds, u.id] }, feature);
                                            setBetaSearchQuery(prev => ({ ...prev, [feature.featureKey]: "" }));
                                          }}
                                          data-testid={`button-add-beta-${feature.featureKey}-${u.id}`}
                                        >
                                          <Avatar className="h-6 w-6">
                                            {u.profileImageUrl ? <AvatarImage src={u.profileImageUrl} /> : null}
                                            <AvatarFallback className="text-[10px]">{(u.firstName || u.email || "?").charAt(0)}</AvatarFallback>
                                          </Avatar>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{u.firstName ? `${u.firstName} ${u.lastName || ""}`.trim() : "—"}</p>
                                            <p className="text-xs text-muted-foreground truncate" dir="ltr">{u.email || u.id}</p>
                                          </div>
                                        </button>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex justify-end pt-1">
                              <Button
                                size="sm"
                                onClick={() => {
                                  updateFeatureMutation.mutate({
                                    key: feature.featureKey,
                                    data: { disabledMessage: edit.disabledMessage, betaUserIds: edit.betaUserIds },
                                  });
                                }}
                                disabled={!hasChanges || updateFeatureMutation.isPending}
                                data-testid={`button-save-feature-${feature.featureKey}`}
                              >
                                {updateFeatureMutation.isPending ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Check className="w-4 h-4 ml-2" />}
                                حفظ التعديلات
                              </Button>
                            </div>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "learning" && (
          <div className="space-y-6" data-testid="learning-panel">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-serif font-bold" data-testid="text-learning-heading">التعلم الذاتي لأبو هاشم</h2>
                <p className="text-sm text-muted-foreground mt-1">نظام استخلاص المعارف من تفاعلات المستخدمين وتحسين جودة الكتابة تلقائيا</p>
              </div>
              <Button
                onClick={() => triggerLearningMutation.mutate()}
                disabled={triggerLearningMutation.isPending}
                data-testid="button-trigger-learning"
              >
                {triggerLearningMutation.isPending ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <PlayCircle className="w-4 h-4 ml-2" />}
                بدء جلسة تعلم جديدة
              </Button>
            </div>

            {learningStatsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
              </div>
            ) : learningStats && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="learning-stats">
                <Card><CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold" dir="ltr" data-testid="text-total-entries">{learningStats.totalEntries}</p>
                  <p className="text-xs text-muted-foreground">إجمالي المعارف</p>
                </CardContent></Card>
                <Card><CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-green-600" dir="ltr" data-testid="text-validated-entries">{learningStats.validatedEntries}</p>
                  <p className="text-xs text-muted-foreground">معتمدة</p>
                </CardContent></Card>
                <Card><CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600" dir="ltr" data-testid="text-pending-entries">{learningStats.pendingEntries}</p>
                  <p className="text-xs text-muted-foreground">قيد المراجعة</p>
                </CardContent></Card>
                <Card><CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-red-600" dir="ltr" data-testid="text-rejected-entries">{learningStats.rejectedEntries}</p>
                  <p className="text-xs text-muted-foreground">مرفوضة</p>
                </CardContent></Card>
                <Card><CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold" dir="ltr" data-testid="text-total-sessions">{learningStats.totalSessions}</p>
                  <p className="text-xs text-muted-foreground">جلسات التعلم</p>
                </CardContent></Card>
                <Card><CardContent className="p-3 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Switch
                      checked={learningStats.autoLearningEnabled}
                      onCheckedChange={(checked) => toggleAutoLearningMutation.mutate(checked)}
                      data-testid="switch-auto-learning"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{learningStats.autoLearningEnabled ? "تعلم تلقائي مفعّل" : "تعلم تلقائي معطّل"}</p>
                </CardContent></Card>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-3">سجل جلسات التعلم</h3>
              {learningSessionsLoading ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
              ) : learningSessions && learningSessions.length > 0 ? (
                <div className="space-y-2">
                  {learningSessions.map((session) => (
                    <Card key={session.id} data-testid={`card-session-${session.id}`}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {session.status === "completed" && <CheckCircle className="w-4 h-4 text-green-500" />}
                            {session.status === "running" && <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />}
                            {session.status === "failed" && <XCircle className="w-4 h-4 text-red-500" />}
                            <Badge variant={session.triggeredBy === "admin_manual" ? "default" : "secondary"} data-testid={`badge-trigger-${session.id}`}>
                              {session.triggeredBy === "admin_manual" ? "يدوي" : "تلقائي"}
                            </Badge>
                            <span className="text-xs text-muted-foreground" dir="ltr">
                              {new Date(session.startedAt).toLocaleDateString("ar-DZ")} {new Date(session.startedAt).toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-green-600" data-testid={`text-session-validated-${session.id}`}>{session.entriesValidated} معتمدة</span>
                            <span className="text-red-600" data-testid={`text-session-rejected-${session.id}`}>{session.entriesRejected} مرفوضة</span>
                            <span className="text-muted-foreground">{session.entriesGenerated} مستخلصة</span>
                          </div>
                        </div>
                        {session.summary && <p className="text-sm text-muted-foreground">{session.summary}</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">لا توجد جلسات تعلم بعد. اضغط "بدء جلسة تعلم جديدة" لبدء أول جلسة.</p>
              )}
            </div>

            <div>
              <h3 className="font-semibold mb-3">قاعدة المعارف المكتسبة</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                <Select value={learningCategoryFilter} onValueChange={setLearningCategoryFilter}>
                  <SelectTrigger className="w-40" data-testid="select-category-filter"><SelectValue placeholder="كل التصنيفات" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل التصنيفات</SelectItem>
                    <SelectItem value="writing_pattern">أنماط كتابة</SelectItem>
                    <SelectItem value="correction">تصحيحات</SelectItem>
                    <SelectItem value="style_insight">رؤى أسلوبية</SelectItem>
                    <SelectItem value="domain_expertise">خبرة تخصصية</SelectItem>
                    <SelectItem value="user_preference">تفضيلات</SelectItem>
                    <SelectItem value="quality_standard">معايير جودة</SelectItem>
                    <SelectItem value="terminology">مصطلحات</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={learningContentTypeFilter} onValueChange={setLearningContentTypeFilter}>
                  <SelectTrigger className="w-40" data-testid="select-content-type-filter"><SelectValue placeholder="كل الأنواع" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الأنواع</SelectItem>
                    <SelectItem value="novel">رواية</SelectItem>
                    <SelectItem value="essay">مقال</SelectItem>
                    <SelectItem value="scenario">سيناريو</SelectItem>
                    <SelectItem value="short_story">قصة قصيرة</SelectItem>
                    <SelectItem value="khawater">خواطر</SelectItem>
                    <SelectItem value="social_media">تواصل اجتماعي</SelectItem>
                    <SelectItem value="poetry">شعر</SelectItem>
                    <SelectItem value="memoire">مذكرة تخرج</SelectItem>
                    <SelectItem value="general">عام</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={learningStatusFilter} onValueChange={setLearningStatusFilter}>
                  <SelectTrigger className="w-36" data-testid="select-status-filter"><SelectValue placeholder="كل الحالات" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الحالات</SelectItem>
                    <SelectItem value="validated">معتمدة</SelectItem>
                    <SelectItem value="pending">قيد المراجعة</SelectItem>
                    <SelectItem value="rejected">مرفوضة</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث في المعارف..."
                    value={learningSearch}
                    onChange={(e) => setLearningSearch(e.target.value)}
                    className="pr-10"
                    data-testid="input-learning-search"
                  />
                </div>
              </div>

              {learningEntriesLoading ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
              ) : learningEntries && learningEntries.length > 0 ? (
                <div className="space-y-2">
                  {learningEntries.map((entry) => {
                    const categoryLabels: Record<string, string> = { writing_pattern: "نمط كتابة", correction: "تصحيح", style_insight: "رؤية أسلوبية", domain_expertise: "خبرة تخصصية", user_preference: "تفضيل", quality_standard: "معيار جودة", terminology: "مصطلح" };
                    const contentTypeLabels: Record<string, string> = { novel: "رواية", essay: "مقال", scenario: "سيناريو", short_story: "قصة قصيرة", khawater: "خواطر", social_media: "تواصل", poetry: "شعر", memoire: "مذكرة", general: "عام" };
                    const confidenceColor = entry.confidence > 0.8 ? "text-green-600" : entry.confidence >= 0.6 ? "text-amber-600" : "text-red-600";

                    return (
                      <Card key={entry.id} className={`${entry.rejected ? "opacity-60 border-red-300" : entry.validated ? "border-green-300/50" : ""}`} data-testid={`card-entry-${entry.id}`}>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <Badge variant="outline" className="text-[10px]">{categoryLabels[entry.category] || entry.category}</Badge>
                                <Badge variant="secondary" className="text-[10px]">{contentTypeLabels[entry.contentType] || entry.contentType}</Badge>
                                <span className={`text-[10px] font-mono ${confidenceColor}`} dir="ltr" data-testid={`text-confidence-${entry.id}`}>{(entry.confidence * 100).toFixed(0)}%</span>
                                {entry.validated && <CheckCircle className="w-3 h-3 text-green-500" />}
                                {entry.rejected && <XCircle className="w-3 h-3 text-red-500" />}
                                <span className="text-[10px] text-muted-foreground" dir="ltr">({entry.usageCount}x)</span>
                              </div>
                              <p className="text-sm leading-relaxed" data-testid={`text-knowledge-${entry.id}`}>{entry.knowledge}</p>
                              <p className="text-[10px] text-muted-foreground mt-1">المصدر: {entry.source} | {new Date(entry.createdAt).toLocaleDateString("ar-DZ")}</p>
                            </div>
                            <div className="flex flex-col gap-1 shrink-0">
                              {!entry.validated && !entry.rejected && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600"
                                  onClick={() => updateEntryMutation.mutate({ id: entry.id, data: { validated: true, rejected: false } })}
                                  data-testid={`button-validate-${entry.id}`}
                                >
                                  <Check className="w-3 h-3 ml-1" />اعتماد
                                </Button>
                              )}
                              {!entry.rejected && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600"
                                  onClick={() => updateEntryMutation.mutate({ id: entry.id, data: { validated: false, rejected: true } })}
                                  data-testid={`button-reject-${entry.id}`}
                                >
                                  <X className="w-3 h-3 ml-1" />رفض
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-muted-foreground"
                                onClick={() => deleteEntryMutation.mutate(entry.id)}
                                data-testid={`button-delete-entry-${entry.id}`}
                              >
                                <Trash2 className="w-3 h-3 ml-1" />حذف
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">لا توجد معارف مكتسبة بعد. قم بتشغيل أول جلسة تعلم لاستخلاص المعارف من بيانات المنصة.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "webhook" && (
          <div className="space-y-6" data-testid="webhook-panel">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-serif font-bold" data-testid="text-webhook-heading">Webhook التدريب</h2>
                <p className="text-sm text-muted-foreground mt-1">إرسال بيانات التفاعلات إلى خادم التدريب الخارجي</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  webhookTestMutation.mutate();
                }}
                disabled={webhookTestMutation.isPending}
                data-testid="button-test-webhook"
              >
                {webhookTestMutation.isPending ? <Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> : <Send className="w-4 h-4 ml-1.5" />}
                اختبار الاتصال
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium">تم التوصيل</span>
                </div>
                <p className="text-2xl font-bold" data-testid="text-webhook-delivered">
                  {webhookDeliveries?.filter((d: any) => d.status === "delivered").length || 0}
                </p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium">في الانتظار</span>
                </div>
                <p className="text-2xl font-bold" data-testid="text-webhook-pending">
                  {webhookDeliveries?.filter((d: any) => d.status === "pending").length || 0}
                </p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium">فشل</span>
                </div>
                <p className="text-2xl font-bold" data-testid="text-webhook-failed">
                  {webhookDeliveries?.filter((d: any) => d.status === "failed").length || 0}
                </p>
              </Card>
            </div>

            <Card>
              <div className="p-4 border-b">
                <h3 className="font-semibold">سجل عمليات التسليم</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-webhook-deliveries">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-right p-3 font-medium">الوقت</th>
                      <th className="text-right p-3 font-medium">الحالة</th>
                      <th className="text-right p-3 font-medium">الفئة</th>
                      <th className="text-right p-3 font-medium">حجم البيانات</th>
                      <th className="text-right p-3 font-medium">كود الاستجابة</th>
                      <th className="text-right p-3 font-medium">المحاولات</th>
                      <th className="text-right p-3 font-medium">الخطأ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {webhookDeliveries && webhookDeliveries.length > 0 ? (
                      webhookDeliveries.map((d: any) => (
                        <tr key={d.id} className="border-b hover:bg-muted/30" data-testid={`row-webhook-${d.id}`}>
                          <td className="p-3 whitespace-nowrap text-xs">
                            {d.createdAt ? new Date(d.createdAt).toLocaleString("ar-DZ") : "-"}
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              d.status === "delivered" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                              d.status === "pending" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                              "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            }`}>
                              {d.status === "delivered" ? <CheckCircle className="w-3 h-3" /> :
                               d.status === "pending" ? <Clock className="w-3 h-3" /> :
                               <XCircle className="w-3 h-3" />}
                              {d.status === "delivered" ? "تم" : d.status === "pending" ? "انتظار" : "فشل"}
                            </span>
                          </td>
                          <td className="p-3 text-xs">{(d.payload as any)?.category || "-"}</td>
                          <td className="p-3 text-xs">{d.payload ? `${JSON.stringify(d.payload).length} bytes` : "-"}</td>
                          <td className="p-3 text-xs">{d.statusCode || "-"}</td>
                          <td className="p-3 text-xs">{d.retryCount}</td>
                          <td className="p-3 text-xs text-red-500 max-w-[200px] truncate">{d.errorMessage || "-"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-muted-foreground">
                          لا توجد عمليات تسليم بعد
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "verified" && (
          <div className="space-y-4" data-testid="section-verified-applications">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">طلبات التوثيق</h2>
              <Badge variant="secondary" data-testid="badge-verified-pending-count">
                {verifiedApps?.filter((a: any) => a.status === "pending").length || 0} قيد الانتظار
              </Badge>
            </div>
            {!verifiedApps || verifiedApps.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground" data-testid="text-no-verified-apps">
                لا توجد طلبات توثيق حتى الآن
              </div>
            ) : (
              <div className="space-y-4">
                {verifiedApps.map((app: any) => (
                  <Card key={app.id} className={`${app.status === "pending" ? "border-amber-300 dark:border-amber-700" : app.status === "approved" ? "border-green-300 dark:border-green-700" : "border-red-200 dark:border-red-900"}`} data-testid={`card-verified-app-${app.id}`}>
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold" data-testid={`text-verified-app-name-${app.id}`}>{app.display_name || app.first_name || app.email || "مجهول"}</span>
                            <Badge
                              variant={app.status === "approved" ? "default" : app.status === "rejected" ? "destructive" : "secondary"}
                              className={app.status === "approved" ? "bg-green-600" : ""}
                              data-testid={`badge-verified-app-status-${app.id}`}
                            >
                              {app.status === "pending" ? "قيد الانتظار" : app.status === "approved" ? "موافق عليه" : "مرفوض"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{app.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(app.created_at).toLocaleDateString("ar-SA")}
                          </p>
                        </div>
                        {app.status === "pending" && (
                          <div className="flex gap-2 shrink-0">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => updateVerifiedAppMutation.mutate({ id: app.id, status: "approved" })}
                              disabled={updateVerifiedAppMutation.isPending}
                              data-testid={`button-approve-verified-${app.id}`}
                            >
                              <CheckCircle className="w-3.5 h-3.5 ml-1" />
                              قبول
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateVerifiedAppMutation.mutate({ id: app.id, status: "rejected" })}
                              disabled={updateVerifiedAppMutation.isPending}
                              data-testid={`button-reject-verified-${app.id}`}
                            >
                              <XCircle className="w-3.5 h-3.5 ml-1" />
                              رفض
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2 text-sm border-t pt-3">
                        <div>
                          <span className="text-xs font-semibold text-muted-foreground block mb-1">السيرة الذاتية</span>
                          <p className="text-sm leading-relaxed" data-testid={`text-verified-app-bio-${app.id}`}>{app.bio}</p>
                        </div>
                        {app.writing_samples && (
                          <div>
                            <span className="text-xs font-semibold text-muted-foreground block mb-1">نماذج الكتابة</span>
                            <p className="text-sm text-primary break-all" data-testid={`text-verified-app-samples-${app.id}`}>{app.writing_samples}</p>
                          </div>
                        )}
                        {app.social_links && (
                          <div>
                            <span className="text-xs font-semibold text-muted-foreground block mb-1">روابط التواصل</span>
                            <p className="text-sm text-primary break-all" data-testid={`text-verified-app-social-${app.id}`}>{app.social_links}</p>
                          </div>
                        )}
                        {app.admin_note && (
                          <div className="bg-muted rounded p-2">
                            <span className="text-xs font-semibold text-muted-foreground block mb-1">ملاحظة الإدارة</span>
                            <p className="text-sm">{app.admin_note}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "reports" && (() => {
          const reasonLabels: Record<string, string> = {
            inappropriate: "محتوى غير لائق",
            plagiarism: "سرقة أدبية",
            offensive: "محتوى مسيء",
            spam: "محتوى مزعج",
            other: "أخرى",
          };
          const subReasonLabels: Record<string, string> = {
            violence: "عنف", sexual: "محتوى جنسي", drugs: "مخدرات", other_inappropriate: "أخرى",
            copied_known_source: "منسوخ من مصدر معروف", ai_no_disclosure: "ذكاء اصطناعي بدون إفصاح", other_plagiarism: "أخرى",
            hate_speech: "خطاب كراهية", discrimination: "تمييز", threats: "تهديدات", other_offensive: "أخرى",
            advertising: "إعلانات", repeated_content: "محتوى متكرر", misleading: "محتوى مضلل", other_spam: "أخرى",
          };
          const statusLabels: Record<string, string> = {
            pending: "قيد الانتظار",
            reviewed: "تمت المراجعة",
            dismissed: "مرفوض",
            action_taken: "تم اتخاذ إجراء",
          };
          const statusColors: Record<string, string> = {
            pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
            reviewed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
            dismissed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
            action_taken: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
          };
          const severityLabels: Record<string, string> = { low: "منخفضة", medium: "متوسطة", high: "عالية", critical: "حرجة" };
          const severityColors: Record<string, string> = {
            low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
            medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
            high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
            critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
          };
          const priorityLabels: Record<string, string> = { normal: "عادية", high: "مرتفعة", urgent: "عاجلة" };
          const priorityColors: Record<string, string> = {
            normal: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
            high: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
            urgent: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
          };
          const actionLabels: Record<string, string> = { warned: "تحذير", unpublished: "إلغاء النشر", banned: "حظر", none: "لا شيء" };
          const typeLabels: Record<string, string> = { novel: "رواية", essay: "مقال", scenario: "سيناريو", short_story: "قصة قصيرة", khawater: "خواطر", social_media: "تواصل اجتماعي", poetry: "شعر", memoire: "مذكرة تخرج" };

          const timeAgo = (date: string | Date) => {
            const diff = Date.now() - new Date(date).getTime();
            const minutes = Math.floor(diff / 60000);
            if (minutes < 1) return "الآن";
            if (minutes < 60) return `منذ ${minutes} دقيقة`;
            const hours = Math.floor(minutes / 60);
            if (hours < 24) return `منذ ${hours} ساعة`;
            const days = Math.floor(hours / 24);
            if (days < 30) return `منذ ${days} يوم`;
            return `منذ ${Math.floor(days / 30)} شهر`;
          };

          const DeviceIcon = ({ type }: { type: string }) => {
            if (type === "mobile") return <Smartphone className="w-3.5 h-3.5" />;
            if (type === "tablet") return <Tablet className="w-3.5 h-3.5" />;
            return <Monitor className="w-3.5 h-3.5" />;
          };

          let filteredReports = reportsData || [];
          if (reportSearch.trim()) {
            const q = reportSearch.trim().toLowerCase();
            filteredReports = filteredReports.filter((r: any) =>
              (r.projectTitle && r.projectTitle.toLowerCase().includes(q)) ||
              (r.reportNumber && r.reportNumber.toLowerCase().includes(q)) ||
              (r.details && r.details.toLowerCase().includes(q))
            );
          }
          if (reportSort === "oldest") {
            filteredReports = [...filteredReports].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          } else if (reportSort === "severity") {
            const sevOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
            filteredReports = [...filteredReports].sort((a: any, b: any) => (sevOrder[a.severity] ?? 4) - (sevOrder[b.severity] ?? 4));
          } else if (reportSort === "report_count") {
            filteredReports = [...filteredReports].sort((a: any, b: any) => (b.reportCountForProject || 0) - (a.reportCountForProject || 0));
          }

          return (
          <div className="space-y-6" data-testid="section-reports">
            {reportStats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="report-stats-bar">
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold" data-testid="text-stat-total"><LtrNum>{reportStats.total || 0}</LtrNum></p>
                    <p className="text-xs text-muted-foreground">إجمالي البلاغات</p>
                  </CardContent>
                </Card>
                <Card className="border-yellow-200 dark:border-yellow-800">
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-600" data-testid="text-stat-pending"><LtrNum>{reportStats.pending || 0}</LtrNum></p>
                    <p className="text-xs text-muted-foreground">قيد الانتظار</p>
                  </CardContent>
                </Card>
                <Card className="border-red-200 dark:border-red-800">
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-red-600" data-testid="text-stat-critical"><LtrNum>{(reportStats.bySeverity?.critical || 0) + (reportStats.bySeverity?.high || 0)}</LtrNum></p>
                    <p className="text-xs text-muted-foreground">عالية / حرجة</p>
                  </CardContent>
                </Card>
                <Card className="border-green-200 dark:border-green-800">
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-green-600" data-testid="text-stat-resolved-week"><LtrNum>{reportStats.resolvedThisWeek || 0}</LtrNum></p>
                    <p className="text-xs text-muted-foreground">تمت معالجتها هذا الأسبوع</p>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {[
                { value: "all", label: "الكل" },
                { value: "pending", label: "قيد الانتظار" },
                { value: "reviewed", label: "تمت المراجعة" },
                { value: "dismissed", label: "مرفوض" },
                { value: "action_taken", label: "تم اتخاذ إجراء" },
              ].map((f) => (
                <Button
                  key={f.value}
                  variant={reportFilter === f.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setReportFilter(f.value); setReportsPage(1); }}
                  data-testid={`button-report-filter-${f.value}`}
                >
                  {f.label}
                </Button>
              ))}
            </div>

            {selectedReports.size > 0 && (
              <div className="flex items-center gap-2 p-3 bg-muted/60 rounded-lg border" data-testid="bulk-moderation-toolbar">
                <span className="text-sm font-medium"><LtrNum>{selectedReports.size}</LtrNum> محدد</span>
                <div className="flex-1" />
                <Button size="sm" variant="outline" onClick={() => setConfirmBulkAction({ type: "dismiss", ids: Array.from(selectedReports) })} disabled={bulkDismissMutation.isPending} data-testid="button-bulk-dismiss">
                  {bulkDismissMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin ml-1" /> : <XCircle className="w-3.5 h-3.5 ml-1" />}
                  رفض الكل
                </Button>
                <Button size="sm" variant="outline" className="text-yellow-600 border-yellow-300" onClick={() => setConfirmBulkAction({ type: "warn", ids: Array.from(selectedReports) })} disabled={bulkWarnMutation.isPending} data-testid="button-bulk-warn">
                  {bulkWarnMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin ml-1" /> : <ShieldAlert className="w-3.5 h-3.5 ml-1" />}
                  تحذير الكل
                </Button>
                <Button size="sm" variant="outline" className="text-red-600 border-red-300" onClick={() => setConfirmBulkAction({ type: "remove", ids: Array.from(selectedReports) })} disabled={bulkRemoveMutation.isPending} data-testid="button-bulk-remove">
                  {bulkRemoveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin ml-1" /> : <FlagOff className="w-3.5 h-3.5 ml-1" />}
                  إزالة المحتوى
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedReports(new Set())} data-testid="button-bulk-clear">
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value)}
                  placeholder="بحث بالعنوان أو رقم البلاغ..."
                  className="pr-9"
                  data-testid="input-report-search"
                />
              </div>
              <Select value={reportSort} onValueChange={setReportSort}>
                <SelectTrigger className="w-[160px]" data-testid="select-report-sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">الأحدث أولاً</SelectItem>
                  <SelectItem value="oldest">الأقدم أولاً</SelectItem>
                  <SelectItem value="severity">الأعلى خطورة</SelectItem>
                  <SelectItem value="report_count">الأكثر بلاغات</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
                ))}
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground" data-testid="text-no-reports">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>لا توجد بلاغات</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReports.map((report: any) => {
                  const isExpanded = expandedReporterInfo[report.id] || false;
                  return (
                    <Card key={report.id} className={`${report.severity === "critical" ? "border-red-300 dark:border-red-800" : report.severity === "high" ? "border-orange-300 dark:border-orange-800" : ""} ${selectedReports.has(report.id) ? "ring-2 ring-primary" : ""}`} data-testid={`card-report-${report.id}`}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <button
                            className="mt-1 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setSelectedReports(prev => {
                              const next = new Set(prev);
                              next.has(report.id) ? next.delete(report.id) : next.add(report.id);
                              return next;
                            })}
                            data-testid={`checkbox-report-${report.id}`}
                          >
                            {selectedReports.has(report.id) ? <CheckSquare className="w-4.5 h-4.5 text-primary" /> : <Square className="w-4.5 h-4.5" />}
                          </button>
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {report.reportNumber && (
                                <Badge variant="secondary" className="font-mono text-[10px]" data-testid={`badge-report-number-${report.id}`}>
                                  <Hash className="w-3 h-3 ml-0.5" />
                                  {report.reportNumber}
                                </Badge>
                              )}
                              <Badge className={statusColors[report.status] || ""} data-testid={`badge-report-status-${report.id}`}>
                                {statusLabels[report.status] || report.status}
                              </Badge>
                              <Badge variant="outline" data-testid={`badge-report-reason-${report.id}`}>
                                {reasonLabels[report.reason] || report.reason}
                              </Badge>
                              {report.subReason && (
                                <Badge variant="outline" className="text-[10px]" data-testid={`badge-report-subreason-${report.id}`}>
                                  {subReasonLabels[report.subReason] || report.subReason}
                                </Badge>
                              )}
                              {report.severity && (
                                <Badge className={severityColors[report.severity] || ""} data-testid={`badge-report-severity-${report.id}`}>
                                  {report.severity === "critical" && <ShieldAlert className="w-3 h-3 ml-0.5" />}
                                  {report.severity === "high" && <AlertTriangle className="w-3 h-3 ml-0.5" />}
                                  {severityLabels[report.severity] || report.severity}
                                </Badge>
                              )}
                              {report.priority && report.priority !== "normal" && (
                                <Badge className={priorityColors[report.priority] || ""} data-testid={`badge-report-priority-${report.id}`}>
                                  {priorityLabels[report.priority]}
                                </Badge>
                              )}
                              {(report.reportCountForProject || 0) > 1 && (
                                <Badge variant="destructive" className="text-[10px]" data-testid={`badge-report-count-${report.id}`}>
                                  <Flag className="w-3 h-3 ml-0.5" />
                                  <LtrNum>{report.reportCountForProject}</LtrNum> بلاغات
                                </Badge>
                              )}
                            </div>

                            <p className="text-sm font-semibold" data-testid={`text-report-project-${report.id}`}>
                              المشروع: {report.projectTitle || `#${report.projectId}`}
                              {report.projectType && <span className="text-xs text-muted-foreground mr-2">({typeLabels[report.projectType] || report.projectType})</span>}
                            </p>

                            {report.details && (
                              <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-report-details-${report.id}`}>
                                {report.details}
                              </p>
                            )}

                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {timeAgo(report.createdAt)}
                              </span>
                              {report.reporterEmail && (
                                <span className="flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3" />
                                  {report.reporterEmail}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {report.status === "pending" && (
                              <Select
                                value={report.priority || "normal"}
                                onValueChange={(val) => updateReportMutation.mutate({ id: report.id, priority: val })}
                              >
                                <SelectTrigger className="w-[100px] h-8 text-xs" data-testid={`select-report-priority-${report.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="normal">عادية</SelectItem>
                                  <SelectItem value="high">مرتفعة</SelectItem>
                                  <SelectItem value="urgent">عاجلة</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setContentProjectId(report.projectId); setShowContentDialog(true); }}
                              data-testid={`button-report-view-content-${report.id}`}
                            >
                              <Eye className="w-4 h-4 ml-1" />
                              عرض المحتوى
                            </Button>
                          </div>
                        </div>

                        <button
                          className="flex items-center gap-1.5 text-xs text-primary hover:underline cursor-pointer bg-transparent border-0 p-0"
                          onClick={() => setExpandedReporterInfo((prev) => ({ ...prev, [report.id]: !prev[report.id] }))}
                          data-testid={`button-toggle-reporter-info-${report.id}`}
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          معلومات المُبلّغ
                        </button>

                        {isExpanded && (
                          <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-xs border" data-testid={`panel-reporter-info-${report.id}`}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="flex items-center gap-2">
                                <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground">IP:</span>
                                <span className="font-mono" dir="ltr" data-testid={`text-reporter-ip-${report.id}`}>{report.reporterIp || "-"}</span>
                              </div>
                              {report.reporterCountry && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  <span className="text-muted-foreground">الموقع:</span>
                                  <span data-testid={`text-reporter-location-${report.id}`}>
                                    {report.reporterCity ? `${report.reporterCity}، ` : ""}{report.reporterCountry}
                                  </span>
                                </div>
                              )}
                              {report.reporterIsp && (
                                <div className="flex items-center gap-2">
                                  <Wifi className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  <span className="text-muted-foreground">مزود الخدمة:</span>
                                  <span data-testid={`text-reporter-isp-${report.id}`}>{report.reporterIsp}</span>
                                </div>
                              )}
                              {report.reporterDeviceType && (
                                <div className="flex items-center gap-2">
                                  <DeviceIcon type={report.reporterDeviceType} />
                                  <span className="text-muted-foreground">الجهاز:</span>
                                  <span data-testid={`text-reporter-device-${report.id}`}>
                                    {report.reporterDeviceType === "mobile" ? "هاتف" : report.reporterDeviceType === "tablet" ? "جهاز لوحي" : "حاسوب"}
                                  </span>
                                </div>
                              )}
                              {report.reporterDeviceName && report.reporterDeviceName !== "Unknown" && (
                                <div className="flex items-center gap-2 sm:col-span-2">
                                  <Monitor className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  <span className="text-muted-foreground">المتصفح:</span>
                                  <span className="font-mono text-[10px]" dir="ltr" data-testid={`text-reporter-browser-${report.id}`}>{report.reporterDeviceName}</span>
                                </div>
                              )}
                              {report.reporterUserId && (
                                <div className="flex items-center gap-2">
                                  <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  <span className="text-muted-foreground">معرف المستخدم:</span>
                                  <span className="font-mono" data-testid={`text-reporter-userid-${report.id}`}>{report.reporterUserId}</span>
                                </div>
                              )}
                            </div>
                            {report.reporterUserAgent && (
                              <details className="mt-1">
                                <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">User-Agent الكامل</summary>
                                <p className="font-mono text-[10px] mt-1 p-2 bg-background rounded border break-all" dir="ltr" data-testid={`text-reporter-ua-${report.id}`}>
                                  {report.reporterUserAgent}
                                </p>
                              </details>
                            )}
                          </div>
                        )}

                        {report.adminNote && (
                          <div className="bg-muted p-2 rounded text-sm" data-testid={`text-report-admin-note-${report.id}`}>
                            <strong>ملاحظة الإدارة:</strong> {report.adminNote}
                          </div>
                        )}

                        {(report.status === "dismissed" || report.status === "action_taken") && (
                          <div className="bg-muted/30 p-2 rounded text-xs text-muted-foreground flex flex-wrap items-center gap-3" data-testid={`panel-resolution-${report.id}`}>
                            {report.reviewedBy && <span>المراجع: {report.reviewedBy}</span>}
                            {report.reviewedAt && <span>تاريخ المراجعة: {new Date(report.reviewedAt).toLocaleDateString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>}
                            {report.actionTaken && report.actionTaken !== "none" && (
                              <Badge variant="outline" className="text-[10px]">
                                الإجراء: {actionLabels[report.actionTaken] || report.actionTaken}
                              </Badge>
                            )}
                            {report.resolvedAt && report.createdAt && (
                              <span className="flex items-center gap-1">
                                <CalendarCheck className="w-3 h-3" />
                                مدة المعالجة: {(() => {
                                  const diff = new Date(report.resolvedAt).getTime() - new Date(report.createdAt).getTime();
                                  const hrs = Math.floor(diff / 3600000);
                                  if (hrs < 1) return "أقل من ساعة";
                                  if (hrs < 24) return `${hrs} ساعة`;
                                  return `${Math.floor(hrs / 24)} يوم`;
                                })()}
                              </span>
                            )}
                          </div>
                        )}

                        {report.status === "pending" && (
                          <div className="space-y-2 border-t pt-3">
                            <Input
                              placeholder="ملاحظة الإدارة (اختياري)..."
                              value={reportActionNotes[report.id] || ""}
                              onChange={(e) => setReportActionNotes((prev) => ({ ...prev, [report.id]: e.target.value }))}
                              data-testid={`input-report-note-${report.id}`}
                            />
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateReportMutation.mutate({ id: report.id, status: "dismissed", adminNote: reportActionNotes[report.id] || undefined })}
                                disabled={updateReportMutation.isPending}
                                data-testid={`button-report-dismiss-${report.id}`}
                              >
                                رفض البلاغ
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-yellow-600 border-yellow-300"
                                onClick={() => updateReportMutation.mutate({ id: report.id, status: "action_taken", actionTaken: "warned", adminNote: reportActionNotes[report.id] || undefined })}
                                disabled={updateReportMutation.isPending}
                                data-testid={`button-report-warn-${report.id}`}
                              >
                                <ShieldAlert className="w-4 h-4 ml-1" /> تحذير المؤلف
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-orange-600 border-orange-300"
                                onClick={() => updateReportMutation.mutate({ id: report.id, status: "action_taken", actionTaken: "unpublished", adminNote: reportActionNotes[report.id] || undefined })}
                                disabled={updateReportMutation.isPending}
                                data-testid={`button-report-unpublish-${report.id}`}
                              >
                                <FlagOff className="w-4 h-4 ml-1" /> إلغاء النشر
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setConfirmBanReportId(report.id)}
                                disabled={updateReportMutation.isPending}
                                data-testid={`button-report-ban-${report.id}`}
                              >
                                <ShieldOff className="w-4 h-4 ml-1" /> حظر المستخدم
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {reportsResponse && (
              <AdminPagination page={reportsResponse.page} total={reportsResponse.total} limit={reportsResponse.limit} onPageChange={setReportsPage} testIdPrefix="reports" />
            )}

            <Dialog open={confirmBulkAction !== null} onOpenChange={(open) => { if (!open) setConfirmBulkAction(null); }}>
              <DialogContent dir="rtl" className="max-w-sm">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2" data-testid="text-bulk-confirm-title">
                    {confirmBulkAction?.type === "dismiss" ? <XCircle className="w-5 h-5" /> : confirmBulkAction?.type === "warn" ? <ShieldAlert className="w-5 h-5 text-yellow-600" /> : <FlagOff className="w-5 h-5 text-red-600" />}
                    {confirmBulkAction?.type === "dismiss" ? "تأكيد رفض البلاغات" : confirmBulkAction?.type === "warn" ? "تأكيد تحذير المؤلفين" : "تأكيد إزالة المحتوى"}
                  </DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  {confirmBulkAction?.type === "dismiss" ? `سيتم رفض ${confirmBulkAction.ids.length} بلاغ. هل أنت متأكد؟` :
                   confirmBulkAction?.type === "warn" ? `سيتم تحذير مؤلفي ${confirmBulkAction?.ids.length || 0} بلاغ وإرسال إشعارات لهم. هل أنت متأكد؟` :
                   `سيتم إلغاء نشر محتوى ${confirmBulkAction?.ids.length || 0} بلاغ. هذا الإجراء لا يمكن التراجع عنه. هل أنت متأكد؟`}
                </p>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setConfirmBulkAction(null)} data-testid="button-bulk-confirm-cancel">إلغاء</Button>
                  <Button
                    variant={confirmBulkAction?.type === "remove" ? "destructive" : "default"}
                    onClick={() => {
                      if (!confirmBulkAction) return;
                      if (confirmBulkAction.type === "dismiss") bulkDismissMutation.mutate(confirmBulkAction.ids);
                      else if (confirmBulkAction.type === "warn") bulkWarnMutation.mutate(confirmBulkAction.ids);
                      else bulkRemoveMutation.mutate(confirmBulkAction.ids);
                      setConfirmBulkAction(null);
                    }}
                    data-testid="button-bulk-confirm-proceed"
                  >
                    {confirmBulkAction?.type === "dismiss" ? "رفض" : confirmBulkAction?.type === "warn" ? "تحذير" : "إزالة"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={confirmBanReportId !== null} onOpenChange={(open) => { if (!open) setConfirmBanReportId(null); }}>
              <DialogContent dir="rtl" className="max-w-sm">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-destructive" data-testid="text-ban-confirm-title">
                    <ShieldOff className="w-5 h-5" />
                    تأكيد حظر المستخدم
                  </DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  هذا الإجراء سيؤدي إلى حظر المؤلف وإلغاء نشر المحتوى ومنع وصوله للمنصة. هل أنت متأكد؟
                </p>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setConfirmBanReportId(null)} data-testid="button-ban-cancel">
                    إلغاء
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (confirmBanReportId !== null) {
                        updateReportMutation.mutate({ id: confirmBanReportId, status: "action_taken", actionTaken: "banned", adminNote: reportActionNotes[confirmBanReportId] || undefined });
                        setConfirmBanReportId(null);
                      }
                    }}
                    disabled={updateReportMutation.isPending}
                    data-testid="button-ban-confirm"
                  >
                    <ShieldOff className="w-4 h-4 ml-1" />
                    تأكيد الحظر
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          );
        })()}

        {activeTab === "revenue" && (
          <div className="space-y-6" data-testid="section-revenue">
            <h2 className="text-xl font-serif font-semibold flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              لوحة الإيرادات
            </h2>
            {revenueLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>)}
              </div>
            ) : revenueData ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="border-green-200 dark:border-green-800">
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-green-600" data-testid="text-revenue-mrr">
                        $<LtrNum>{revenueData.mrr?.toFixed(0) || 0}</LtrNum>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">الإيراد الشهري المتكرر (MRR)</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold" data-testid="text-revenue-subscribers">
                        <LtrNum>{revenueData.totalSubscribers || 0}</LtrNum>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">إجمالي المشتركين</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-blue-600" data-testid="text-revenue-new-subs">
                        +<LtrNum>{revenueData.newSubscribers || 0}</LtrNum>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">مشتركين جدد (30 يوم)</p>
                      {revenueData.lastMonthNewSubscribers !== undefined && (
                        <p className="text-[10px] text-muted-foreground mt-0.5" data-testid="text-revenue-mom">
                          الشهر السابق: <LtrNum>{revenueData.lastMonthNewSubscribers}</LtrNum>
                          {revenueData.newSubscribers > revenueData.lastMonthNewSubscribers ? (
                            <span className="text-green-600 mr-1">↑</span>
                          ) : revenueData.newSubscribers < revenueData.lastMonthNewSubscribers ? (
                            <span className="text-red-600 mr-1">↓</span>
                          ) : null}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                  <Card className={revenueData.churnRate > 10 ? "border-red-200 dark:border-red-800" : "border-green-200 dark:border-green-800"}>
                    <CardContent className="p-4 text-center">
                      <p className={`text-3xl font-bold ${revenueData.churnRate > 10 ? "text-red-600" : "text-green-600"}`} data-testid="text-revenue-churn">
                        <LtrNum>{revenueData.churnRate || 0}</LtrNum>%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">معدل الإلغاء ({revenueData.churned || 0} ألغوا)</p>
                    </CardContent>
                  </Card>
                </div>

                {revenueData.planDistribution && revenueData.planDistribution.length > 0 && (() => {
                  const pieColors: Record<string, string> = {
                    all_in_one: "#f59e0b",
                    essay: "#3b82f6",
                    scenario: "#8b5cf6",
                    trial: "#9ca3af",
                  };
                  const barColors: Record<string, string> = {
                    all_in_one: "bg-amber-500",
                    essay: "bg-blue-500",
                    scenario: "bg-purple-500",
                    trial: "bg-gray-400",
                  };
                  const total = revenueData.totalSubscribers || 1;
                  let cumulativeDeg = 0;
                  const gradientParts = revenueData.planDistribution.map((pd: any) => {
                    const pct = (pd.count / total) * 360;
                    const start = cumulativeDeg;
                    cumulativeDeg += pct;
                    return `${pieColors[pd.plan] || "#6366f1"} ${start}deg ${cumulativeDeg}deg`;
                  });
                  const conicGradient = `conic-gradient(${gradientParts.join(", ")})`;

                  return (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-serif font-semibold mb-4" data-testid="text-plan-distribution-title">توزيع الخطط</h3>
                      <div className="flex flex-col md:flex-row gap-6 items-center">
                        <div
                          className="w-40 h-40 rounded-full shrink-0 relative"
                          style={{ background: conicGradient }}
                          data-testid="pie-chart-plans"
                        >
                          <div className="absolute inset-4 bg-background rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold"><LtrNum>{total}</LtrNum></span>
                          </div>
                        </div>
                        <div className="flex-1 space-y-3 w-full">
                          {revenueData.planDistribution.map((pd: any) => {
                            const percentage = total > 0 ? Math.round((pd.count / total) * 100) : 0;
                            return (
                              <div key={pd.plan} className="space-y-1" data-testid={`plan-dist-${pd.plan}`}>
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: pieColors[pd.plan] || "#6366f1" }} />
                                    <span className="font-medium">{pd.label}</span>
                                  </div>
                                  <span className="text-muted-foreground">
                                    <LtrNum>{pd.count}</LtrNum> مشترك — $<LtrNum>{pd.revenue?.toFixed(0) || 0}</LtrNum>/شهر
                                  </span>
                                </div>
                                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${barColors[pd.plan] || "bg-primary"}`}
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <p className="text-[10px] text-muted-foreground text-left" dir="ltr"><LtrNum>{percentage}</LtrNum>%</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })()}

                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-serif font-semibold mb-2" data-testid="text-total-revenue-title">إجمالي الإيرادات</h3>
                    <p className="text-4xl font-bold text-green-600" data-testid="text-total-revenue">
                      $<LtrNum>{revenueData.totalRevenue?.toFixed(0) || 0}</LtrNum>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">إجمالي المبيعات من المشاريع المدفوعة</p>
                  </CardContent>
                </Card>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">فشل في تحميل بيانات الإيرادات</p>
            )}
          </div>
        )}

        {activeTab === "challenges" && (
          <AdminChallengesTab />
        )}

      </main>
      </div>

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
