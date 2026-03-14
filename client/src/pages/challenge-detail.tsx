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
import { ArrowRight, Trophy, Clock, Users, Crown, Send, Loader2 } from "lucide-react";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { SharedFooter } from "@/components/shared-footer";
import LtrNum from "@/components/ui/ltr-num";

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
  start_date: string;
  end_date: string;
  winner_id: string | null;
  winner_entry_id: number | null;
  entryCount: number;
  entries: ChallengeEntry[];
}

function getTimeRemaining(endDate: string) {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days} يوم و ${hours} ساعة`;
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours} ساعة و ${minutes} دقيقة`;
}

export default function ChallengeDetailPage() {
  const [, params] = useRoute("/challenges/:id");
  const challengeId = params?.id;
  useDocumentTitle("تفاصيل التحدي — قلم AI");
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6" dir="rtl">
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6 flex items-center justify-center" dir="rtl">
        <p className="text-muted-foreground">التحدي غير موجود</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-start">
          <Link href="/challenges">
            <Button variant="ghost" size="sm" className="gap-1" data-testid="button-back-challenges">
              <ArrowRight className="w-4 h-4" />
              التحديات
            </Button>
          </Link>
        </div>

        <Card data-testid="card-challenge-detail">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-serif font-bold" data-testid="text-challenge-title">{challenge.title}</h1>
                {challenge.theme && <Badge variant="secondary">{challenge.theme}</Badge>}
              </div>
              <Badge className={isActive ? "bg-green-500/10 text-green-600 border-green-500/30 dark:text-green-400" : ""} variant={isActive ? "default" : "outline"}>
                {isActive ? "نشط" : "منتهي"}
              </Badge>
            </div>
            <p className="text-muted-foreground whitespace-pre-wrap" data-testid="text-challenge-desc">{challenge.description}</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {remaining && (
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> متبقي: {remaining}</span>
              )}
              <span className="flex items-center gap-1"><Users className="w-4 h-4" /> <LtrNum>{challenge.entries?.length || 0}</LtrNum> مشاركة</span>
            </div>
          </CardContent>
        </Card>

        {isActive && user && !userAlreadySubmitted && (
          <Card data-testid="card-submit-entry">
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Send className="w-5 h-5" /> شارك في التحدي
              </h2>
              <Textarea
                value={entryContent}
                onChange={(e) => setEntryContent(e.target.value)}
                placeholder="اكتب مشاركتك هنا (حتى 2000 حرف)..."
                dir="rtl"
                rows={6}
                maxLength={2000}
                className="resize-none font-serif"
                data-testid="textarea-challenge-entry"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground"><LtrNum>{entryContent.length}</LtrNum>/2000</span>
                <Button
                  onClick={() => submitMutation.mutate(entryContent)}
                  disabled={!entryContent.trim() || submitMutation.isPending}
                  className="gap-1"
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
          <div className="text-center py-4 text-sm text-green-600 dark:text-green-400" data-testid="text-already-submitted">
            لقد شاركت بالفعل في هذا التحدي
          </div>
        )}

        {challenge.entries && challenge.entries.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold" data-testid="text-entries-section">المشاركات</h2>
            {challenge.entries.map(entry => (
              <Card key={entry.id} className={`${challenge.winner_entry_id === entry.id ? "ring-2 ring-yellow-500" : ""}`} data-testid={`card-entry-${entry.id}`}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {entry.authorProfileImage ? (
                        <img src={entry.authorProfileImage} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                          {(entry.authorName || "?")[0]}
                        </div>
                      )}
                      <Link href={`/author/${entry.user_id}`}>
                        <span className="text-sm font-medium hover:underline cursor-pointer">{entry.authorName}</span>
                      </Link>
                      {challenge.winner_entry_id === entry.id && (
                        <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30 gap-1">
                          <Crown className="w-3 h-3" /> الفائز
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString("ar-SA")}
                    </span>
                  </div>
                  <p className="font-serif text-sm leading-relaxed whitespace-pre-wrap" data-testid={`text-entry-content-${entry.id}`}>
                    {entry.content}
                  </p>
                  {isAdmin && !challenge.winner_id && !isActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs"
                      onClick={() => setWinnerMutation.mutate({ winnerId: entry.user_id, winnerEntryId: entry.id })}
                      disabled={setWinnerMutation.isPending}
                      data-testid={`button-set-winner-${entry.id}`}
                    >
                      <Crown className="w-3 h-3" /> اختيار كفائز
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <SharedFooter />
    </div>
  );
}
