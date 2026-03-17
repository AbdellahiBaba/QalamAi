import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useParams, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, FileText, CheckCircle, Link2, Check, ThumbsUp, Heart, Lightbulb, Brain, Clock, Image as ImageIcon, ArrowRight, Feather, Flag, UserCheck, Loader2, Tag, Lock, CreditCard, Bookmark, MessageCircle, Send, Share2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SaveToListButton } from "@/components/save-to-list-button";
import { SiX, SiFacebook, SiWhatsapp, SiTelegram } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import LtrNum from "@/components/ui/ltr-num";
import { ttqTrack } from "@/lib/ttq";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { Progress } from "@/components/ui/progress";
import { ReportDialog } from "@/components/report-dialog";
import { QuoteSelectionToolbar } from "@/components/quote-selection-toolbar";

interface SharedChapter {
  chapterNumber: number;
  title: string;
  content: string | null;
  id?: number;
  isPaid?: boolean;
  priceCents?: number;
  locked?: boolean;
}

interface SharedProject {
  id: number;
  title: string;
  mainIdea: string;
  projectType: string;
  coverImageUrl: string | null;
  chapters: SharedChapter[];
  seekingBetaReaders?: boolean;
  tags?: string[];
}

interface ReactionCounts {
  like: number;
  love: number;
  insightful: number;
  thoughtful: number;
}

function calcReadingTime(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 200));
}

const REACTION_CONFIG = [
  { type: "like", icon: ThumbsUp, label: "أعجبني" },
  { type: "love", icon: Heart, label: "أحببته" },
  { type: "insightful", icon: Lightbulb, label: "ملهم" },
  { type: "thoughtful", icon: Brain, label: "مثير للتفكير" },
] as const;

function SharedRelatedWorks({ projectId }: { projectId: number }) {
  const { data: similar, isLoading } = useQuery<any[]>({
    queryKey: ["/api/projects", String(projectId), "similar"],
    queryFn: () => fetch(`/api/projects/${projectId}/similar`).then(r => r.json()),
  });

  const items = Array.isArray(similar) ? similar : [];
  if (isLoading || items.length === 0) return null;

  return (
    <div className="max-w-2xl mx-auto my-6 space-y-3" data-testid="shared-related-works">
      <h3 className="font-serif text-lg font-semibold" data-testid="text-shared-related-title">قد يعجبك أيضاً</h3>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {items.slice(0, 4).map((r: any) => (
          <Link key={r.id} href={r.shareToken ? `/shared/${r.shareToken}` : `/gallery`}>
            <div className="group cursor-pointer space-y-1 min-w-[120px] max-w-[140px]" data-testid={`shared-similar-${r.id}`}>
              {r.coverImageUrl ? (
                <img src={r.coverImageUrl} alt={r.title} className="w-full aspect-[2/3] rounded-md object-cover group-hover:opacity-80 transition-opacity" loading="lazy" decoding="async" />
              ) : (
                <div className="w-full aspect-[2/3] rounded-md bg-muted flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <p className="text-xs font-medium line-clamp-2">{r.title}</p>
              {r.authorName && <p className="text-[10px] text-muted-foreground">{r.authorName}</p>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function BetaReaderOptIn({ projectId }: { projectId: number }) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/beta-readers`, { message: message.trim() || undefined });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم تقديم طلبك كقارئ بيتا" });
      setSubmitted(true);
    },
    onError: (err: any) => {
      toast({ title: err.message || "فشل في تقديم الطلب", variant: "destructive" });
    },
  });

  if (submitted) {
    return (
      <Card className="max-w-2xl mx-auto my-6">
        <CardContent className="p-5 text-center space-y-2">
          <UserCheck className="w-8 h-8 text-green-500 mx-auto" />
          <p className="text-sm text-green-600 dark:text-green-400" data-testid="text-beta-submitted">تم تقديم طلبك بنجاح</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto my-6" data-testid="card-beta-optin">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-primary" />
          <h3 className="font-serif font-semibold" data-testid="text-beta-title">هذا العمل يقبل قراء بيتا</h3>
        </div>
        <p className="text-sm text-muted-foreground">أرسل طلبك للمشاركة كقارئ بيتا وتقديم ملاحظاتك للكاتب.</p>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="رسالة اختيارية للكاتب..."
          dir="rtl"
          maxLength={500}
          className="w-full px-3 py-2 text-sm bg-background border rounded-md"
          data-testid="input-beta-message"
        />
        <Button
          onClick={() => submitMutation.mutate()}
          disabled={submitMutation.isPending}
          className="gap-1"
          data-testid="button-beta-submit"
        >
          {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
          أريد المشاركة كقارئ بيتا
        </Button>
      </CardContent>
    </Card>
  );
}

interface ProjectCommentData {
  id: number;
  author_name: string;
  content: string;
  created_at: string;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes} ${minutes === 1 ? "دقيقة" : "دقائق"}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ${hours === 1 ? "ساعة" : "ساعات"}`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `منذ ${days} ${days === 1 ? "يوم" : "أيام"}`;
  return new Date(dateStr).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
}

function ProjectCommentsSection({ shareToken }: { shareToken: string }) {
  const { toast } = useToast();
  const { data: authUser } = useQuery<any>({ queryKey: ["/api/auth/user"] });
  const authName = authUser?.displayName || authUser?.firstName || "";
  const [commentName, setCommentName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [commentSent, setCommentSent] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  useEffect(() => {
    if (authName && !commentName) setCommentName(authName);
  }, [authName]);

  const { data: commentsResult } = useQuery<{ data: ProjectCommentData[]; total: number }>({
    queryKey: ["/api/projects/comments", shareToken, page],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${shareToken}/comments?limit=${pageSize}&offset=${page * pageSize}`);
      return res.json();
    },
    enabled: !!shareToken,
  });
  const comments = commentsResult?.data;
  const totalComments = commentsResult?.total || 0;

  const commentMutation = useMutation({
    mutationFn: async () => {
      const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
      const csrfVal = csrfMatch ? decodeURIComponent(csrfMatch[1]) : "";
      const res = await fetch(`/api/projects/${shareToken}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfVal },
        body: JSON.stringify({ authorName: commentName, content: commentText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الإرسال");
      return data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["/api/projects/comments", shareToken, page] });
      const previous = queryClient.getQueryData<{ data: ProjectCommentData[]; total: number }>(["/api/projects/comments", shareToken, page]);
      if (previous) {
        const optimistic: ProjectCommentData = {
          id: Date.now(),
          author_name: commentName.trim(),
          content: commentText.trim(),
          created_at: new Date().toISOString(),
        };
        queryClient.setQueryData(["/api/projects/comments", shareToken, page], {
          data: [optimistic, ...previous.data],
          total: previous.total + 1,
        });
      }
      return { previous };
    },
    onSuccess: () => {
      setCommentSent(true);
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["/api/projects/comments", shareToken] });
    },
    onError: (err: any, _vars: unknown, context: any) => {
      if (context?.previous) {
        queryClient.setQueryData(["/api/projects/comments", shareToken, page], context.previous);
      }
      toast({ title: err.message || "فشل الإرسال", variant: "destructive" });
    },
  });

  return (
    <div className="max-w-2xl mx-auto my-8 space-y-4" data-testid="project-comments-section">
      <div className="flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-primary" />
        <h3 className="font-serif text-lg font-semibold" data-testid="text-comments-title">
          التعليقات {totalComments > 0 && <span className="text-muted-foreground text-sm font-normal">({totalComments})</span>}
        </h3>
      </div>

      {comments && comments.length > 0 && (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="p-3 rounded-lg bg-muted/50 border space-y-1" data-testid={`comment-${c.id}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" data-testid={`comment-author-${c.id}`}>{c.author_name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground" data-testid={`comment-date-${c.id}`}>
                    {relativeTime(c.created_at)}
                  </span>
                  <button
                    className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                    onClick={async () => {
                      const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
                      const csrfVal = csrfMatch ? decodeURIComponent(csrfMatch[1]) : "";
                      await fetch(`/api/project-comments/${c.id}/report`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfVal },
                        body: JSON.stringify({ reason: "إبلاغ من القارئ" }),
                      });
                      toast({ title: "تم الإبلاغ عن التعليق" });
                    }}
                    data-testid={`button-report-comment-${c.id}`}
                  >
                    إبلاغ
                  </button>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-foreground/90" data-testid={`comment-content-${c.id}`}>{c.content}</p>
            </div>
          ))}
          {totalComments > pageSize && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)} data-testid="button-comments-prev">السابق</Button>
              <span className="text-xs text-muted-foreground">{page + 1} / {Math.ceil(totalComments / pageSize)}</span>
              <Button size="sm" variant="outline" disabled={(page + 1) * pageSize >= totalComments} onClick={() => setPage(p => p + 1)} data-testid="button-comments-next">التالي</Button>
            </div>
          )}
        </div>
      )}

      {commentSent ? (
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-center" data-testid="comment-sent-message">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mx-auto mb-1" />
          <p className="text-sm text-green-700 dark:text-green-300">تم نشر تعليقك بنجاح!</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Input
              placeholder="اسمك"
              value={commentName}
              onChange={(e) => setCommentName(e.target.value)}
              maxLength={100}
              dir="rtl"
              data-testid="input-comment-name"
            />
            <Textarea
              placeholder="اكتب تعليقك..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              maxLength={1000}
              rows={3}
              dir="rtl"
              data-testid="textarea-comment-content"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">{commentText.length}/1000</span>
              <Button
                size="sm"
                className="gap-1"
                disabled={!commentName.trim() || !commentText.trim() || commentMutation.isPending}
                onClick={() => commentMutation.mutate()}
                data-testid="button-submit-comment"
              >
                {commentMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                إرسال تعليق
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TopQuotesSection({ projectId, projectTitle }: { projectId: number; projectTitle: string }) {
  const { toast } = useToast();
  const { data: quotesResult } = useQuery<{ data: any[]; total: number }>({
    queryKey: ["/api/projects", String(projectId), "quotes"],
    queryFn: () => fetch(`/api/projects/${projectId}/quotes?limit=5`).then(r => r.json()),
    enabled: !!projectId,
    staleTime: 60_000,
  });

  const [sharingQuote, setSharingQuote] = useState<string | null>(null);
  const [shareImg, setShareImg] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);

  const quotes = quotesResult?.data || [];
  if (quotes.length === 0) return null;

  const handleShareQuote = async (text: string) => {
    setSharingQuote(text);
    setShareLoading(true);
    try {
      const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
      const csrfVal = csrfMatch ? decodeURIComponent(csrfMatch[1]) : "";
      const res = await fetch("/api/quote-card", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfVal },
        body: JSON.stringify({ quoteText: text, projectTitle }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      setShareImg(URL.createObjectURL(blob));
    } catch {
      toast({ title: "فشل في إنشاء بطاقة الاقتباس", variant: "destructive" });
      setSharingQuote(null);
    } finally {
      setShareLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-8 space-y-4" data-testid="top-quotes-section">
      <div className="flex items-center gap-2">
        <span className="text-2xl text-primary/60">❝</span>
        <h3 className="font-serif text-lg font-semibold" data-testid="text-top-quotes-title">أبرز الاقتباسات</h3>
      </div>
      <div className="space-y-3">
        {quotes.map((q: any) => (
          <div key={q.id} className="relative pr-8 py-3 border-r-2 border-primary/20" data-testid={`quote-${q.id}`}>
            <span className="absolute right-1 top-3 text-xl text-primary/30 font-serif">❝</span>
            <p className="font-serif text-base leading-relaxed text-foreground/90" data-testid={`quote-text-${q.id}`}>{q.quote_text}</p>
            <div className="flex items-center gap-2 mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 gap-1 text-muted-foreground hover:text-primary"
                onClick={() => handleShareQuote(q.quote_text)}
                data-testid={`button-share-quote-${q.id}`}
              >
                <Share2 className="w-3 h-3" />
                شارك
              </Button>
              {Number(q.save_count) > 1 && (
                <span className="text-[11px] text-muted-foreground" data-testid={`quote-count-${q.id}`}>
                  {q.save_count} حفظ
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {sharingQuote && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => { setSharingQuote(null); if (shareImg) URL.revokeObjectURL(shareImg); setShareImg(null); }}>
          <div className="bg-background rounded-xl shadow-2xl p-4 max-w-[90vw] space-y-3" onClick={(e) => e.stopPropagation()} dir="rtl" data-testid="quote-card-modal">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-semibold text-sm">بطاقة الاقتباس</h3>
              <button onClick={() => { setSharingQuote(null); if (shareImg) URL.revokeObjectURL(shareImg); setShareImg(null); }}>✕</button>
            </div>
            {shareLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : shareImg ? (
              <>
                <img src={shareImg} alt="بطاقة الاقتباس" className="rounded-lg max-w-full" data-testid="img-shared-quote-card" />
                <a
                  href={shareImg}
                  download="qalamai-quote.png"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                  data-testid="button-download-shared-quote-card"
                >
                  تحميل البطاقة
                </a>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SharedProject() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();

  const [scrollProgress, setScrollProgress] = useState(0);
  const [readChapters, setReadChapters] = useState<Set<number>>(new Set());
  const [linkCopied, setLinkCopied] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reactionCounts, setReactionCounts] = useState<ReactionCounts>({ like: 0, love: 0, insightful: 0, thoughtful: 0 });
  const [reactingType, setReactingType] = useState<string | null>(null);
  const [animatingType, setAnimatingType] = useState<string | null>(null);
  const [unlockingChapterId, setUnlockingChapterId] = useState<number | null>(null);
  const { data: authUser } = useQuery<any>({ queryKey: ["/api/auth/user"] });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const chapterUnlocked = params.get("chapter_unlocked");
    const sessionId = params.get("session_id");
    if (chapterUnlocked && sessionId && authUser) {
      apiRequest("POST", `/api/chapters/${chapterUnlocked}/verify-unlock`, { sessionId })
        .then(r => r.json())
        .then((data) => {
          if (data.success) {
            toast({ title: "تم فتح الفصل بنجاح!" });
            queryClient.invalidateQueries({ queryKey: ["/api/shared", token] });
          }
        })
        .catch(() => {});
      window.history.replaceState({}, "", `/shared/${token}`);
    }
  }, [authUser, token]);

  const { data: project, isLoading, error } = useQuery<SharedProject>({
    queryKey: ["/api/shared", token],
    queryFn: async () => {
      const res = await fetch(`/api/shared/${token}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!token,
  });

  const dynamicTitle = project ? `${project.title} — قلم AI` : "مشروع مشارك — قلم AI";
  const dynamicDescription = project?.mainIdea || undefined;
  const dynamicOgImage = project?.coverImageUrl || undefined;
  useDocumentTitle(dynamicTitle, dynamicDescription, "article", dynamicOgImage);

  useEffect(() => {
    if (token) {
      try {
        const stored = localStorage.getItem(`qalam-shared-read-${token}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setReadChapters(new Set(parsed));
          }
        }
      } catch (e) {
        console.warn("Failed to load reading progress from localStorage:", e);
      }
    }
  }, [token]);

  const markChapterRead = useCallback((chapterNumber: number) => {
    setReadChapters(prev => {
      const next = new Set(prev);
      next.add(chapterNumber);
      if (token) {
        try {
          localStorage.setItem(`qalam-shared-read-${token}`, JSON.stringify(Array.from(next)));
        } catch (e) {
          console.warn("Failed to save reading progress to localStorage:", e);
        }
      }
      return next;
    });
  }, [token]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        setScrollProgress(Math.min((scrollTop / docHeight) * 100, 100));
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!project) return;
    const chapters = project.chapters.filter(ch => ch.content).sort((a, b) => a.chapterNumber - b.chapterNumber);
    if (chapters.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const num = Number(entry.target.getAttribute("data-chapter-number"));
            if (!isNaN(num)) {
              markChapterRead(num);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    const elements = document.querySelectorAll("[data-chapter-number]");
    elements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [project, markChapterRead]);

  useEffect(() => {
    if (project) {
      ttqTrack("ViewContent", {
        contentId: token || "shared",
        contentType: project.projectType || "product",
        contentName: project.title,
      });
      fetch(`/api/public/essays/${project.id}/view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).catch(() => {});
    }
  }, [project]);

  useEffect(() => {
    if (project?.id && project?.projectType === "essay") {
      fetch(`/api/public/essays/${project.id}/reactions`)
        .then(res => res.ok ? res.json() : null)
        .then(data => { if (data) setReactionCounts(data); })
        .catch((e: unknown) => console.warn("Failed to fetch reaction counts:", e));
    }
  }, [project?.id, project?.projectType]);

  const handleReact = async (reactionType: string) => {
    if (!project?.id || reactingType) return;
    setReactingType(reactionType);
    try {
      const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
      const csrfVal = csrfMatch ? decodeURIComponent(csrfMatch[1]) : "";
      const res = await fetch(`/api/public/essays/${project.id}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfVal },
        body: JSON.stringify({ reactionType }),
      });
      if (res.ok) {
        const counts = await res.json();
        setReactionCounts(counts);
        setAnimatingType(reactionType);
        setTimeout(() => setAnimatingType(null), 600);
      }
    } catch {
      toast({ title: "حدث خطأ", description: "لم نتمكن من تسجيل تفاعلك", variant: "destructive" });
    } finally {
      setReactingType(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="space-y-4 w-full max-w-3xl px-4">
          <Skeleton className="h-8 w-64 mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-4">
          <BookOpen className="w-16 h-16 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-serif font-bold">المشروع غير موجود</h1>
          <p className="text-muted-foreground">هذا الرابط غير صالح أو تم إلغاء المشاركة</p>
        </div>
      </div>
    );
  }

  const typeLabel = project.projectType === "essay" ? "مقال" : project.projectType === "scenario" ? "سيناريو" : project.projectType === "short_story" ? "قصة قصيرة" : project.projectType === "khawater" ? "خاطرة" : project.projectType === "social_media" ? "سوشيال ميديا" : project.projectType === "poetry" ? "قصيدة" : project.projectType === "memoire" ? "مذكرة تخرج" : "رواية";
  const chapterLabel = project.projectType === "essay" ? "قسم" : project.projectType === "scenario" ? "مشهد" : project.projectType === "short_story" ? "مقطع" : project.projectType === "khawater" ? "النص" : project.projectType === "social_media" ? "المحتوى" : project.projectType === "poetry" ? "القصيدة" : project.projectType === "memoire" ? "الفصل" : "فصل";
  const visibleChapters = project.chapters.filter(ch => ch.content).sort((a, b) => a.chapterNumber - b.chapterNumber);
  const readCount = visibleChapters.filter(ch => readChapters.has(ch.chapterNumber)).length;
  const totalChapters = visibleChapters.length;
  const chapterProgress = totalChapters > 0 ? Math.round((readCount / totalChapters) * 100) : 0;
  const totalWords = visibleChapters.reduce((sum, ch) => sum + (ch.content ? ch.content.split(/\s+/).filter(w => w.trim()).length : 0), 0);
  const readingTime = calcReadingTime(totalWords);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="fixed top-0 left-0 right-0 z-50" data-testid="reading-progress-bar">
        <Progress value={scrollProgress} className="h-1 rounded-none" />
      </div>

      <nav className="sticky top-0 z-30 backdrop-blur-md bg-background/80 border-b" data-testid="nav-shared-header">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-1" data-testid="button-back" onClick={() => window.history.back()}>
              <ArrowRight className="w-4 h-4" />
              العودة
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Feather className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-serif text-lg font-bold">قلم AI</span>
          </div>
        </div>
      </nav>

      {totalChapters > 1 && (
        <div className="fixed top-[60px] left-4 right-4 z-40 flex justify-center pointer-events-none">
          <div className="bg-background/90 backdrop-blur-sm border rounded-b-lg px-4 py-1.5 flex items-center gap-3 pointer-events-auto shadow-sm" data-testid="chapter-progress-tracker">
            <span className="text-xs text-muted-foreground">
              <LtrNum>{readCount}</LtrNum>/<LtrNum>{totalChapters}</LtrNum> {chapterLabel}
            </span>
            <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${chapterProgress}%` }}
              />
            </div>
            {readCount === totalChapters && (
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
            )}
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-8 pt-6">
        {project.coverImageUrl && (
          <div className="mb-8 flex justify-center">
            <img
              src={project.coverImageUrl}
              alt={project.title}
              width={640}
              height={480}
              className="max-h-80 rounded-lg shadow-lg"
              loading="lazy"
              data-testid="img-shared-cover"
            />
          </div>
        )}

        <div className="text-center mb-10">
          <h1 className="text-3xl font-serif font-bold mb-2" data-testid="text-shared-title">{project.title}</h1>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <p className="text-muted-foreground">{typeLabel} — قلم AI</p>
            <SaveToListButton projectId={project.id} variant="full" />
            {totalWords > 0 && (
              <Badge variant="secondary" className="no-default-active-elevate" data-testid="badge-reading-time">
                <Clock className="w-3 h-3 ml-1" />
                <LtrNum>{readingTime}</LtrNum> {readingTime === 1 ? "دقيقة" : "دقائق"} للقراءة
              </Badge>
            )}
            {(project as any).commentCount > 0 && (
              <Badge variant="secondary" className="no-default-active-elevate" data-testid="badge-comment-count">
                <MessageCircle className="w-3 h-3 ml-1" />
                <LtrNum>{(project as any).commentCount}</LtrNum> تعليق
              </Badge>
            )}
          </div>
          {project.tags && project.tags.length > 0 && (
            <div className="flex items-center justify-center gap-1.5 flex-wrap mt-2" data-testid="shared-tags">
              {project.tags.map((tag: string) => (
                <Badge key={tag} variant="outline" className="text-[10px] gap-1">
                  <Tag className="w-2.5 h-2.5" />{tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-8">
          {visibleChapters.map((ch) => (
              <Card
                key={ch.chapterNumber}
                className="overflow-hidden"
                data-testid={`card-shared-chapter-${ch.chapterNumber}`}
                data-chapter-number={ch.chapterNumber}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-sm text-muted-foreground">{chapterLabel} <LtrNum>{ch.chapterNumber}</LtrNum></span>
                    {ch.isPaid && (
                      <Badge variant="outline" className="text-[10px] gap-0.5 border-amber-500/50 text-amber-600 dark:text-amber-400">
                        <Lock className="w-2.5 h-2.5" />
                        مدفوع
                      </Badge>
                    )}
                    {readChapters.has(ch.chapterNumber) && (
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    )}
                    <span className="mx-1">—</span>
                    <h2 className="font-serif text-lg font-semibold">{ch.title}</h2>
                  </div>
                  <div className="font-serif text-base leading-[2.2] whitespace-pre-wrap">
                    {ch.content}
                  </div>
                  {ch.locked && ch.id && (
                    <div className="mt-6 p-4 rounded-lg bg-gradient-to-b from-transparent via-background to-amber-50/50 dark:to-amber-950/20 border border-amber-500/30 text-center space-y-3" data-testid={`paywall-card-${ch.id}`}>
                      <Lock className="w-8 h-8 text-amber-500 mx-auto" />
                      <p className="font-serif text-base font-semibold">هذا الفصل مدفوع</p>
                      <p className="text-sm text-muted-foreground">
                        افتح هذا الفصل مقابل <span className="font-bold text-foreground">${((ch.priceCents || 199) / 100).toFixed(2)}</span>
                      </p>
                      <Button
                        className="gap-2"
                        disabled={unlockingChapterId === ch.id}
                        onClick={async () => {
                          if (!authUser) {
                            window.location.href = "/login";
                            return;
                          }
                          setUnlockingChapterId(ch.id!);
                          try {
                            const res = await apiRequest("POST", `/api/chapters/${ch.id}/unlock`, {});
                            const data = await res.json();
                            if (data.alreadyUnlocked) {
                              toast({ title: "هذا الفصل مفتوح بالفعل" });
                              queryClient.invalidateQueries({ queryKey: ["/api/shared", token] });
                            } else if (data.checkoutUrl) {
                              window.location.href = data.checkoutUrl;
                            }
                          } catch {
                            toast({ title: "فشل في بدء عملية الدفع", variant: "destructive" });
                          }
                          setUnlockingChapterId(null);
                        }}
                        data-testid={`button-unlock-chapter-${ch.id}`}
                      >
                        {unlockingChapterId === ch.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CreditCard className="w-4 h-4" />
                        )}
                        فتح الفصل
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
        </div>

        {project.projectType === "essay" && (
          <div className="mt-10 pt-6 border-t" data-testid="reactions-section">
            <h3 className="text-center font-serif text-lg font-semibold mb-4">ما رأيك في هذا المحتوى؟</h3>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {REACTION_CONFIG.map(({ type, icon: Icon, label }) => {
                const count = reactionCounts[type as keyof ReactionCounts] || 0;
                const isAnimating = animatingType === type;
                const isReacting = reactingType === type;
                return (
                  <Button
                    key={type}
                    variant="outline"
                    onClick={() => handleReact(type)}
                    disabled={!!reactingType}
                    className="gap-2"
                    data-testid={`button-react-${type}`}
                  >
                    <Icon className={`w-4 h-4 ${isReacting ? "animate-pulse" : ""} ${isAnimating ? "animate-bounce" : ""}`} />
                    <span>{label}</span>
                    <span
                      className={`text-xs font-bold transition-transform ${isAnimating ? "scale-125" : "scale-100"}`}
                      data-testid={`count-react-${type}`}
                    >
                      <LtrNum>{count}</LtrNum>
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        <div className="text-center mt-10 pt-6 border-t text-sm text-muted-foreground">
          <p>تم إنشاء هذا المحتوى بواسطة قلم AI — منصّة الكتابة العربية بالذكاء الاصطناعي</p>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-t" data-testid="social-sharing-bar">
        <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center justify-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground ml-2">شارك:</span>
          <Button
            size="icon"
            variant="ghost"
            aria-label="مشاركة على X"
            data-testid="button-share-x"
            onClick={() => {
              const url = encodeURIComponent(window.location.href);
              const text = encodeURIComponent(project.title + " — QalamAI");
              window.open(`https://x.com/intent/tweet?url=${url}&text=${text}`, "_blank", "noopener");
            }}
          >
            <SiX className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="مشاركة على فيسبوك"
            data-testid="button-share-facebook"
            onClick={() => {
              const url = encodeURIComponent(window.location.href);
              window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank", "noopener");
            }}
          >
            <SiFacebook className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="مشاركة على واتساب"
            data-testid="button-share-whatsapp"
            onClick={() => {
              const text = encodeURIComponent(project.title + " — QalamAI\n" + window.location.href);
              window.open(`https://wa.me/?text=${text}`, "_blank", "noopener");
            }}
          >
            <SiWhatsapp className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="مشاركة على تيليجرام"
            data-testid="button-share-telegram"
            onClick={() => {
              const url = encodeURIComponent(window.location.href);
              const text = encodeURIComponent(project.title + " — QalamAI");
              window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank", "noopener");
            }}
          >
            <SiTelegram className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="نسخ الرابط"
            data-testid="button-share-copy-link"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(window.location.href);
                setLinkCopied(true);
                toast({ title: "تم نسخ الرابط" });
                setTimeout(() => setLinkCopied(false), 2000);
              } catch {
                toast({ title: "فشل نسخ الرابط", variant: "destructive" });
              }
            }}
          >
            {linkCopied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
            data-testid="button-report-content"
            onClick={() => setReportOpen(true)}
          >
            <Flag className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {project?.seekingBetaReaders && (
        <BetaReaderOptIn projectId={project.id} />
      )}

      {project && <TopQuotesSection projectId={project.id} projectTitle={project.title} />}

      {project && token && <ProjectCommentsSection shareToken={token} />}

      {project && <SharedRelatedWorks projectId={project.id} />}

      {project && (
        <QuoteSelectionToolbar
          projectId={project.id}
          projectTitle={project.title}
        />
      )}

      {project && (
        <ReportDialog projectId={project.id} projectTitle={project.title} open={reportOpen} onOpenChange={setReportOpen} />
      )}

      <div className="h-14" />
    </div>
  );
}
