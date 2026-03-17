import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Users, ArrowRight, ChevronLeft, Feather, Send, Loader2, Lock, CheckCircle, MessageCircle, Crown, Trash2 } from "lucide-react";
import LtrNum from "@/components/ui/ltr-num";
import { ErrorBoundary } from "@/components/error-boundary";

interface ClubChapter {
  id: number;
  chapterNumber: number;
  title: string;
}

interface ClubMember {
  userId: string;
  displayName: string;
  profileImageUrl: string | null;
  joinedAt: string;
}

interface ClubDetail {
  id: number;
  name: string;
  description: string | null;
  projectId: number;
  adminUserId: string;
  pace: string;
  isPrivate: boolean;
  currentChapterIndex: number;
  maxMembers: number;
  memberCount: number;
  members: ClubMember[];
  adminName: string;
  projectTitle: string;
  projectCoverUrl: string | null;
  chapters: ClubChapter[];
  totalChapters: number;
  createdAt: string;
}

interface CommentData {
  id: number;
  author_name?: string;
  authorName?: string;
  content: string;
  created_at?: string;
  createdAt?: string;
}

const PACE_LABELS: Record<string, string> = {
  daily: "يومي",
  weekly: "أسبوعي",
  biweekly: "كل أسبوعين",
};

function relativeTime(dateStr: string): string {
  const diff = Math.max(0, Date.now() - new Date(dateStr).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `منذ ${days} يوم`;
  return new Date(dateStr).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
}

function ChapterDiscussion({ clubId, chapterIndex, isUnlocked }: { clubId: number; chapterIndex: number; isUnlocked: boolean }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [commentText, setCommentText] = useState("");

  const { data: commentsResult, isLoading } = useQuery<{ data: CommentData[]; total: number }>({
    queryKey: ["/api/clubs", String(clubId), "comments", String(chapterIndex)],
    queryFn: async () => {
      const r = await fetch(`/api/clubs/${clubId}/comments/${chapterIndex}`);
      if (!r.ok) throw new Error("فشل في جلب التعليقات");
      return r.json();
    },
    enabled: isUnlocked,
    staleTime: 30_000,
  });

  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/clubs/${clubId}/comments`, { chapterIndex, content });
      return res.json();
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", String(clubId), "comments", String(chapterIndex)] });
    },
    onError: (err: Error) => {
      toast({ title: err.message || "فشل في إضافة التعليق", variant: "destructive" });
    },
  });

  if (!isUnlocked) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm" data-testid="club-chapter-locked">
        <Lock className="w-5 h-5 mx-auto mb-2 opacity-40" />
        لم يُفتح هذا الفصل بعد
      </div>
    );
  }

  const comments = commentsResult?.data || [];

  return (
    <div className="space-y-3" data-testid={`club-discussion-${chapterIndex}`}>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-3/4" />
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {comments.map(c => (
            <div key={c.id} className="p-2.5 rounded-lg bg-muted/50 border space-y-0.5" data-testid={`club-comment-${c.id}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium" data-testid={`club-comment-author-${c.id}`}>{c.author_name || c.authorName}</span>
                <span className="text-[10px] text-muted-foreground">{relativeTime(c.created_at || c.createdAt || "")}</span>
              </div>
              <p className="text-sm leading-relaxed text-foreground/90">{c.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-3" data-testid="club-no-comments">لا توجد تعليقات بعد</p>
      )}

      {user && (
        <div className="flex gap-2">
          <Textarea
            placeholder="شارك رأيك حول هذا الفصل..."
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            maxLength={2000}
            rows={2}
            dir="rtl"
            className="text-sm"
            data-testid={`textarea-club-comment-${chapterIndex}`}
          />
          <Button
            size="sm"
            className="shrink-0 h-auto"
            disabled={!commentText.trim() || commentMutation.isPending}
            onClick={() => commentMutation.mutate(commentText.trim())}
            data-testid={`button-club-comment-${chapterIndex}`}
          >
            {commentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ClubDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);

  const { data: club, isLoading } = useQuery<ClubDetail>({
    queryKey: ["/api/clubs", id],
    enabled: !!id,
  });

  useDocumentTitle(club ? `${club.name} — نادي القراءة` : "نادي القراءة — قلم AI");

  const userId = user?.id;
  const isAdmin = club?.adminUserId === userId;
  const isMember = club?.members?.some(m => m.userId === userId) || false;

  const joinMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/clubs/${id}/join`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-clubs"] });
      toast({ title: "تم الانضمام إلى النادي بنجاح!" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const leaveMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/clubs/${id}/leave`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-clubs"] });
      toast({ title: "تم مغادرة النادي" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const advanceMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/clubs/${id}/advance`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", id] });
      toast({ title: "تم فتح الفصل التالي!" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/clubs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-clubs"] });
      window.location.href = "/";
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-3">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">النادي غير موجود</p>
          <Link href="/">
            <Button variant="outline" size="sm" data-testid="link-back-home">العودة للرئيسية</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <Feather className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-serif text-lg font-bold">نادي القراءة</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <Card data-testid="club-header-card">
          <CardContent className="p-5">
            <div className="flex gap-4">
              {club.projectCoverUrl ? (
                <img src={club.projectCoverUrl} alt={club.projectTitle} className="w-16 h-24 rounded-md object-cover shrink-0" loading="lazy" />
              ) : (
                <div className="w-16 h-24 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <BookOpen className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0 space-y-1.5">
                <h1 className="font-serif text-xl font-bold line-clamp-2" data-testid="text-club-name">{club.name}</h1>
                <p className="text-sm text-muted-foreground line-clamp-1" data-testid="text-club-project">
                  <BookOpen className="w-3.5 h-3.5 inline ml-1" />
                  {club.projectTitle}
                </p>
                {club.description && (
                  <p className="text-sm text-foreground/80 line-clamp-2">{club.description}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <LtrNum>{club.memberCount}</LtrNum> عضو
                  </span>
                  <Badge variant="outline" className="text-[10px]" data-testid="badge-club-pace">{PACE_LABELS[club.pace] || club.pace}</Badge>
                  <span>الفصل <LtrNum>{club.currentChapterIndex + 1}</LtrNum> / <LtrNum>{club.totalChapters}</LtrNum></span>
                  <span className="flex items-center gap-0.5">
                    <Crown className="w-3 h-3 text-amber-500" />
                    {club.adminName}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
              {!isMember && user && (
                <Button onClick={() => joinMutation.mutate()} disabled={joinMutation.isPending} className="gap-1" data-testid="button-join-club">
                  {joinMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                  انضم إلى النادي
                </Button>
              )}
              {isMember && !isAdmin && (
                <Button variant="outline" onClick={() => leaveMutation.mutate()} disabled={leaveMutation.isPending} className="gap-1 text-destructive" data-testid="button-leave-club">
                  مغادرة النادي
                </Button>
              )}
              {isAdmin && club.currentChapterIndex < club.totalChapters - 1 && (
                <Button onClick={() => advanceMutation.mutate()} disabled={advanceMutation.isPending} className="gap-1" data-testid="button-advance-club">
                  {advanceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  فتح الفصل التالي
                </Button>
              )}
              {isAdmin && (
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if (confirm("هل أنت متأكد من حذف هذا النادي؟")) deleteMutation.mutate(); }} data-testid="button-delete-club">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {club.members.slice(0, 20).map(m => (
            <Link key={m.userId} href={`/author/${m.userId}`}>
              <div className="flex flex-col items-center gap-1 min-w-[52px]" data-testid={`club-member-${m.userId}`}>
                <Avatar className="w-10 h-10 border-2 border-background">
                  <AvatarImage src={m.profileImageUrl || undefined} />
                  <AvatarFallback className="text-xs">{m.displayName?.charAt(0) || "?"}</AvatarFallback>
                </Avatar>
                <span className="text-[10px] text-muted-foreground line-clamp-1 max-w-[52px] text-center">{m.displayName}</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="space-y-3">
          <h2 className="font-serif text-lg font-semibold flex items-center gap-2" data-testid="text-reading-schedule">
            <BookOpen className="w-5 h-5 text-primary" />
            جدول القراءة
          </h2>

          {club.chapters.map((ch, idx) => {
            const isUnlocked = idx <= club.currentChapterIndex;
            const isCurrent = idx === club.currentChapterIndex;
            const isExpanded = expandedChapter === idx;

            return (
              <Card
                key={ch.id}
                className={`transition-colors ${isCurrent ? "border-primary/50 bg-primary/5" : ""} ${!isUnlocked ? "opacity-50" : ""}`}
                data-testid={`club-chapter-card-${idx}`}
              >
                <CardContent className="p-4">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedChapter(isExpanded ? null : idx)}
                    data-testid={`button-toggle-chapter-${idx}`}
                  >
                    <div className="flex items-center gap-2">
                      {isUnlocked ? (
                        isCurrent ? (
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <BookOpen className="w-3 h-3 text-primary-foreground" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                          </div>
                        )
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                          <Lock className="w-3 h-3 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <span className="text-sm font-medium">
                          الفصل <LtrNum>{ch.chapterNumber}</LtrNum>
                          {ch.title && <span className="text-muted-foreground mr-1">— {ch.title}</span>}
                        </span>
                        {isCurrent && <Badge className="mr-2 text-[10px]" variant="default">الفصل الحالي</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isUnlocked && (
                        <MessageCircle className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t">
                      <ErrorBoundary fallbackMode="inline" label="النقاش">
                        <ChapterDiscussion clubId={club.id} chapterIndex={idx} isUnlocked={isUnlocked} />
                      </ErrorBoundary>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
