import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Clock, Users, Crown, Send, Loader2, Feather, Star, Sparkles, ChevronRight, Heart, Gift } from "lucide-react";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { SharedFooter } from "@/components/shared-footer";
import { SharedNavbar } from "@/components/shared-navbar";
import LtrNum from "@/components/ui/ltr-num";
import { VoteDonateModal } from "@/components/vote-donate-modal";

function getAnonVoterId(): string {
  let id = localStorage.getItem("qalamai_voter_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("qalamai_voter_id", id);
  }
  return id;
}

function EntryVoteButton({ entryId, loggedInUserId, authorId, authorName }: {
  entryId: number;
  loggedInUserId: string | undefined;
  authorId: string;
  authorName: string;
}) {
  const [optimistic, setOptimistic] = useState<{ voted: boolean; voteCount: number } | null>(null);
  const [showDonate, setShowDonate] = useState(false);

  const voterId = loggedInUserId ?? getAnonVoterId();

  const { data } = useQuery<{ voteCount: number; voted: boolean }>({
    queryKey: ["/api/challenge-entries", entryId, "vote-count", voterId],
    queryFn: () => {
      const params = loggedInUserId ? "" : `?voterId=${encodeURIComponent(getAnonVoterId())}`;
      return fetch(`/api/challenge-entries/${entryId}/vote-count${params}`).then(r => r.json());
    },
  });

  const voted = optimistic !== null ? optimistic.voted : (data?.voted ?? false);
  const voteCount = optimistic !== null ? optimistic.voteCount : (data?.voteCount ?? 0);

  const mutation = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {};
      if (!loggedInUserId) body.voterId = getAnonVoterId();
      return apiRequest("POST", `/api/challenge-entries/${entryId}/vote`, Object.keys(body).length ? body : undefined);
    },
    onMutate: () => {
      const newVoted = !voted;
      setOptimistic({ voted: newVoted, voteCount: newVoted ? voteCount + 1 : Math.max(0, voteCount - 1) });
    },
    onSuccess: async (res) => {
      const result = await res.json();
      setOptimistic(result);
      queryClient.invalidateQueries({ queryKey: ["/api/challenge-entries", entryId, "vote-count"] });
      if (result.voted) setShowDonate(true);
    },
    onError: () => setOptimistic(null),
  });

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
            voted
              ? "bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400"
              : "border-border text-muted-foreground hover:border-rose-300 hover:text-rose-500 dark:hover:border-rose-700 hover:bg-rose-50/50 dark:hover:bg-rose-950/20"
          } cursor-pointer`}
          data-testid={`vote-btn-entry-${entryId}`}
        >
          {mutation.isPending
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Heart className={`w-3.5 h-3.5 ${voted ? "fill-rose-500 text-rose-500" : ""}`} />
          }
          <span>{voted ? "صوّتّ" : "صوّت"}</span>
          {voteCount > 0 && <span className="opacity-70"><LtrNum>{voteCount}</LtrNum></span>}
        </button>

        {voted && (
          <button
            onClick={() => setShowDonate(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-all cursor-pointer font-medium"
            data-testid={`donate-btn-entry-${entryId}`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>ادعم الكاتب</span>
          </button>
        )}
      </div>

      <VoteDonateModal
        open={showDonate}
        onClose={() => setShowDonate(false)}
        authorId={authorId}
        authorName={authorName}
        projectId={0}
      />
    </>
  );
}

interface ChallengeEntry {
  id: number;
  challenge_id: number;
  user_id: string;
  content: string;
  created_at: string;
  authorName: string;
  authorProfileImage: string | null;
}

interface ChallengeDetail {
  id: number;
  title: string;
  description: string;
  theme: string | null;
  project_type: string | null;
  prize_description: string | null;
  start_date: string;
  end_date: string;
  winner_id: string | null;
  winner_entry_id: number | null;
  entryCount: number;
  entries: ChallengeEntry[];
}

const PROJECT_TYPE_LABELS: Record<string, string> = {
  essay: "مقال", novel: "رواية", poetry: "قصيدة", poem: "قصيدة",
  short_story: "قصة قصيرة", scenario: "سيناريو", screenplay: "سيناريو",
  khawater: "خاطرة", memoire: "مذكرة",
};

function getTimeRemaining(endDate: string) {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days} يوم و ${hours} ساعة`;
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours} ساعة و ${minutes} دقيقة`;
}

function WinnerCard({ entry, challenge }: { entry: ChallengeEntry; challenge: ChallengeDetail }) {
  return (
    <div className="relative" data-testid="card-winner-entry">
      <style>{`
        @keyframes winner-shimmer {
          0% { background-position: -300% center; }
          100% { background-position: 300% center; }
        }
        @keyframes winner-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes golden-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(234,179,8,0.2), 0 0 40px rgba(234,179,8,0.1); }
          50% { box-shadow: 0 0 30px rgba(234,179,8,0.4), 0 0 60px rgba(234,179,8,0.2), 0 0 80px rgba(234,179,8,0.1); }
        }
        @keyframes star-twinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8) rotate(0deg); }
          50% { opacity: 1; transform: scale(1.2) rotate(15deg); }
        }
        @keyframes confetti-fall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(60px) rotate(360deg); opacity: 0; }
        }
      `}</style>

      <div className="relative overflow-hidden rounded-2xl" style={{ animation: "golden-pulse 3s ease-in-out infinite" }}>
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: "linear-gradient(135deg, rgba(234,179,8,0.15) 0%, rgba(245,158,11,0.08) 50%, rgba(234,179,8,0.15) 100%)",
            backgroundSize: "300% 100%",
            animation: "winner-shimmer 4s linear infinite",
          }}
        />

        <div className="absolute inset-0 border-2 border-yellow-500/40 rounded-2xl" />

        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute pointer-events-none"
            style={{
              right: `${15 + i * 14}%`,
              top: `${5 + (i % 3) * 8}%`,
              animation: `star-twinkle ${1.5 + i * 0.4}s ease-in-out ${i * 0.25}s infinite`,
            }}
          >
            <Star className={`text-yellow-400 ${i % 2 === 0 ? "w-3 h-3" : "w-2 h-2"}`} fill="currentColor" />
          </div>
        ))}

        <div className="relative z-10 p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-center gap-3">
            <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
            <div className="text-center">
              <div
                className="text-2xl sm:text-3xl font-serif font-bold"
                style={{
                  background: "linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b, #d97706)",
                  backgroundSize: "300% auto",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  animation: "winner-shimmer 3s linear infinite",
                }}
              >
                ✦ العمل الفائز ✦
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-serif italic">تشرّفت قاعة المجد بهذا الإبداع</p>
            </div>
            <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" style={{ animationDelay: "0.5s" }} />
          </div>

          <div className="flex items-center gap-4" style={{ animation: "winner-float 4s ease-in-out infinite" }}>
            <div className="relative shrink-0">
              <div className="absolute -inset-2 rounded-full opacity-70" style={{ background: "conic-gradient(from 0deg, #f59e0b, #fbbf24, #f59e0b)", animation: "winner-shimmer 3s linear infinite", backgroundSize: "200% 200%" }} />
              <div className="absolute -inset-1.5 rounded-full bg-background" />
              <Avatar className="w-14 h-14 sm:w-16 sm:h-16 relative ring-2 ring-yellow-500/60">
                <AvatarImage src={entry.authorProfileImage || undefined} alt={entry.authorName || "فائز"} />
                <AvatarFallback className="bg-gradient-to-br from-yellow-100 to-amber-200 dark:from-yellow-900 dark:to-amber-800 text-yellow-700 dark:text-yellow-300 text-xl font-bold">
                  {(entry.authorName || "?")[0]}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-lg">
                <Crown className="w-4 h-4 text-white" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Link href={`/author/${entry.user_id}`}>
                  <span
                    className="text-xl sm:text-2xl font-serif font-bold cursor-pointer hover:underline"
                    style={{
                      background: "linear-gradient(90deg, #f59e0b, #d97706)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                    data-testid="text-winner-name"
                  >
                    {entry.authorName}
                  </span>
                </Link>
                <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/40 gap-1 text-xs" data-testid="badge-winner">
                  <Crown className="w-3 h-3" /> الفائز
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-serif">
                {new Date(entry.created_at).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>

          <div className="relative bg-background/70 backdrop-blur-sm border border-yellow-400/30 rounded-xl p-5 sm:p-6">
            <Feather className="absolute top-4 right-4 w-6 h-6 text-yellow-400/30" />
            <div className="absolute top-0 left-0 right-0 h-0.5 rounded-full bg-gradient-to-r from-transparent via-yellow-500/60 to-transparent" />
            <p
              className="font-serif text-base sm:text-lg leading-loose whitespace-pre-wrap pr-8"
              style={{ color: "hsl(var(--foreground))", lineHeight: "2" }}
              data-testid="text-winner-content"
            >
              {entry.content}
            </p>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-gradient-to-r from-transparent via-yellow-500/60 to-transparent" />
          </div>

          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-xs text-yellow-600/70 dark:text-yellow-400/70 font-serif italic">
              <Star className="w-3 h-3" fill="currentColor" />
              هذا العمل نال إعجاب لجنة التحكيم وفاز بتاج المجد
              <Star className="w-3 h-3" fill="currentColor" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChallengeDetailPage() {
  const [, params] = useRoute("/challenges/:id");
  const challengeId = params?.id;
  useDocumentTitle("تفاصيل التحدي — قلم AI", "شارك في تحدي الكتابة على QalamAI وتنافس مع كتّاب عرب آخرين.");
  const { toast } = useToast();
  const { user } = useAuth();
  const [entryContent, setEntryContent] = useState("");

  const { data: challenge, isLoading } = useQuery<ChallengeDetail>({
    queryKey: ["/api/challenges", challengeId],
    queryFn: () => fetch(`/api/challenges/${challengeId}`).then(r => r.json()),
    enabled: !!challengeId,
  });

  const submitMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/challenges/${challengeId}/entries`, { content });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم تقديم مشاركتك بنجاح!" });
      setEntryContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/challenges", challengeId] });
    },
    onError: (err: any) => {
      toast({ title: err.message || "فشل في تقديم المشاركة", variant: "destructive" });
    },
  });

  const setWinnerMutation = useMutation({
    mutationFn: async ({ winnerId, winnerEntryId }: { winnerId: string; winnerEntryId: number }) => {
      const res = await apiRequest("PUT", `/api/admin/challenges/${challengeId}/winner`, { winnerId, winnerEntryId });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم تحديد الفائز" });
      queryClient.invalidateQueries({ queryKey: ["/api/challenges", challengeId] });
    },
  });

  const isActive = challenge ? new Date(challenge.end_date) > new Date() : false;
  const remaining = challenge ? getTimeRemaining(challenge.end_date) : null;
  const userAlreadySubmitted = challenge?.entries?.some(e => e.user_id === user?.id);
  const isAdmin = user && (user as any).role === "admin";
  const winnerEntry = challenge?.winner_entry_id ? challenge.entries?.find(e => e.id === challenge.winner_entry_id) : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <SharedNavbar />
        <div className="pt-14 sm:pt-16 max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <SharedNavbar />
        <div className="pt-14 sm:pt-16 flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground font-serif">التحدي غير موجود</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SharedNavbar />

      <div className="pt-14 sm:pt-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-label="مسار التنقل">
            <Link href="/challenges">
              <span className="hover:text-foreground cursor-pointer transition-colors">تحديات الكتابة</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
            <span className="text-foreground font-medium truncate max-w-[200px]">{challenge.title}</span>
          </nav>

          <Card data-testid="card-challenge-detail" className="overflow-hidden">
            <div className={`h-1.5 w-full ${isActive ? "bg-gradient-to-r from-green-400 via-emerald-500 to-teal-400" : "bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-400"}`} />
            <CardContent className="p-5 sm:p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 flex-1 min-w-0">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold leading-tight" data-testid="text-challenge-title">{challenge.title}</h1>
                  <div className="flex flex-wrap gap-1.5">
                    {challenge.project_type && (
                      <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-900/20" data-testid="badge-challenge-type">
                        {PROJECT_TYPE_LABELS[challenge.project_type] || challenge.project_type}
                      </Badge>
                    )}
                    {challenge.theme && <Badge variant="secondary" data-testid="badge-challenge-theme">{challenge.theme}</Badge>}
                  </div>
                </div>
                <Badge className={`shrink-0 gap-1 ${isActive ? "bg-green-500/10 text-green-600 border-green-500/30 dark:text-green-400" : "bg-muted text-muted-foreground"}`} variant={isActive ? "default" : "outline"}>
                  {isActive ? <><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> نشط</> : "منتهي"}
                </Badge>
              </div>

              <p className="text-muted-foreground whitespace-pre-wrap font-serif leading-loose" data-testid="text-challenge-desc">{challenge.description}</p>

              {challenge.prize_description && (
                <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4" data-testid="div-challenge-prize">
                  <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center shrink-0">
                    <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-0.5">الجائزة</p>
                    <p className="text-sm text-amber-800 dark:text-amber-300 font-serif">{challenge.prize_description}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-5 text-sm text-muted-foreground pt-1 border-t">
                {remaining && (
                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-orange-400" /> متبقي: {remaining}</span>
                )}
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> <LtrNum>{challenge.entries?.length || 0}</LtrNum> مشاركة</span>
              </div>
            </CardContent>
          </Card>

          {winnerEntry && <WinnerCard entry={winnerEntry} challenge={challenge} />}

          {isActive && user && !userAlreadySubmitted && (
            <Card data-testid="card-submit-entry" className="border-primary/20">
              <CardContent className="p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Send className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold font-serif">شارك في التحدي</h2>
                    <p className="text-xs text-muted-foreground">اكتب وأبهر القراء بإبداعك</p>
                  </div>
                </div>
                <Textarea
                  value={entryContent}
                  onChange={(e) => setEntryContent(e.target.value)}
                  placeholder="هنا تبدأ القصيدة، هنا تولد الكلمات... اكتب ما يحرك قلبك (حتى 2000 حرف)"
                  dir="rtl"
                  rows={7}
                  maxLength={2000}
                  className="resize-none font-serif leading-loose text-base"
                  data-testid="textarea-challenge-entry"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground"><LtrNum>{entryContent.length}</LtrNum>/2000</span>
                  <Button
                    onClick={() => submitMutation.mutate(entryContent)}
                    disabled={!entryContent.trim() || submitMutation.isPending}
                    className="gap-2"
                    data-testid="button-submit-entry"
                  >
                    {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    تقديم المشاركة
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {userAlreadySubmitted && (
            <div className="text-center py-4 text-sm text-green-600 dark:text-green-400 flex items-center justify-center gap-2 bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200/50 dark:border-green-800/30" data-testid="text-already-submitted">
              <Feather className="w-4 h-4" />
              لقد شاركت بالفعل في هذا التحدي — نتمنى لك التوفيق!
            </div>
          )}

          {!isActive && !winnerEntry && challenge.entries && challenge.entries.length > 0 && (
            <div className="text-center py-3 text-sm text-muted-foreground font-serif italic bg-muted/30 rounded-xl border">
              جارٍ تقييم المشاركات وسيُعلَن عن الفائز قريباً ✦
            </div>
          )}

          {challenge.entries && challenge.entries.filter(e => e.id !== challenge.winner_entry_id).length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-serif font-semibold" data-testid="text-entries-section">مشاركات الكتّاب</h2>
                <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
              </div>
              {challenge.entries.filter(e => e.id !== challenge.winner_entry_id).map(entry => (
                <Card key={entry.id} data-testid={`card-entry-${entry.id}`} className="hover:border-primary/20 transition-colors">
                  <CardContent className="p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={entry.authorProfileImage || undefined} alt={entry.authorName || "كاتب"} />
                          <AvatarFallback className="text-xs font-bold bg-muted">{(entry.authorName || "?")[0]}</AvatarFallback>
                        </Avatar>
                        <Link href={`/author/${entry.user_id}`}>
                          <span className="text-sm font-semibold hover:underline cursor-pointer">{entry.authorName}</span>
                        </Link>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.created_at).toLocaleDateString("ar-SA")}
                      </span>
                    </div>
                    <p className="font-serif text-sm leading-loose whitespace-pre-wrap text-foreground/80" data-testid={`text-entry-content-${entry.id}`}>
                      {entry.content}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <EntryVoteButton
                        entryId={entry.id}
                        loggedInUserId={user?.id}
                        authorId={entry.user_id}
                        authorName={entry.authorName || "الكاتب"}
                      />
                      {isAdmin && !challenge.winner_id && !isActive && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs border-amber-500/40 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                          onClick={() => setWinnerMutation.mutate({ winnerId: entry.user_id, winnerEntryId: entry.id })}
                          disabled={setWinnerMutation.isPending}
                          data-testid={`button-set-winner-${entry.id}`}
                        >
                          {setWinnerMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Crown className="w-3 h-3" />}
                          اختيار كفائز
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {(!challenge.entries || challenge.entries.length === 0) && (
            <div className="text-center py-12 space-y-3 text-muted-foreground">
              <Feather className="w-10 h-10 mx-auto text-muted-foreground/30" />
              <p className="font-serif">لا توجد مشاركات بعد</p>
              <p className="text-xs font-serif italic">«كن أول من يُضيء هذا الميدان بكلماتك»</p>
            </div>
          )}
        </div>
      </div>

      <SharedFooter />
    </div>
  );
}
