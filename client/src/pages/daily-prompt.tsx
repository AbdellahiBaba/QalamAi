import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Flame, PenLine, Users, Clock, Trophy, ChevronDown, ChevronUp, Send, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SharedNavbar } from "@/components/shared-navbar";
import { SharedFooter } from "@/components/shared-footer";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { Link } from "wouter";

type DailyPrompt = {
  id: number;
  promptText: string;
  promptDate: string;
  active: boolean;
  winnerId?: string | null;
  winnerEntryId?: number | null;
};

type PromptEntry = {
  id: number;
  promptId: number;
  userId: string;
  content: string;
  createdAt: string;
  authorName: string;
  authorProfileImage: string | null;
};

type DailyPromptResponse = {
  prompt: DailyPrompt | null;
  entries: PromptEntry[];
  entryCount: number;
};

function parseLocalDate(dateStr: string): Date {
  // Parse YYYY-MM-DD as local time to avoid UTC midnight timezone shift
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatArabicDate(dateStr: string | undefined | null) {
  if (!dateStr) return "";
  const d = parseLocalDate(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function EntryCard({ entry, isWinner }: { entry: PromptEntry; isWinner: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const preview = entry.content.length > 200 ? entry.content.slice(0, 200) + "..." : entry.content;
  const needsExpand = entry.content.length > 200;

  return (
    <div
      className={`p-4 rounded-xl border bg-card transition-all ${isWinner ? "border-amber-400/60 bg-amber-50/10 dark:bg-amber-950/20" : ""}`}
      data-testid={`card-entry-${entry.id}`}
      dir="rtl"
    >
      <div className="flex items-start gap-3">
        <Link href={`/author/${entry.userId}`}>
          <Avatar className="w-9 h-9 shrink-0 cursor-pointer">
            <AvatarImage src={entry.authorProfileImage || undefined} />
            <AvatarFallback className="text-xs">{entry.authorName?.charAt(0) || "؟"}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <Link href={`/author/${entry.userId}`}>
              <span className="text-sm font-semibold hover:underline cursor-pointer">{entry.authorName}</span>
            </Link>
            {isWinner && (
              <Badge className="text-xs bg-amber-500 hover:bg-amber-500 text-white gap-1">
                <Trophy className="w-3 h-3" />
                فائز
              </Badge>
            )}
          </div>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {expanded ? entry.content : preview}
          </p>
          {needsExpand && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
              data-testid={`button-expand-entry-${entry.id}`}
            >
              {expanded ? <><ChevronUp className="w-3 h-3" /> عرض أقل</> : <><ChevronDown className="w-3 h-3" /> عرض المزيد</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DailyPromptPage() {
  useDocumentTitle("تحدي الكتابة اليومي — قلم AI");
  const { user } = useAuth();
  const { toast } = useToast();
  const [entryText, setEntryText] = useState("");

  const { data, isLoading } = useQuery<DailyPromptResponse>({
    queryKey: ["/api/daily-prompt"],
  });

  const { data: myEntry } = useQuery<{ entry: PromptEntry | null }>({
    queryKey: ["/api/daily-prompt", data?.prompt?.id, "my-entry"],
    enabled: !!user && !!data?.prompt?.id,
    queryFn: async () => {
      const res = await fetch(`/api/daily-prompt/${data!.prompt!.id}/my-entry`);
      return res.json();
    },
  });

  const { data: pastPrompts, isLoading: pastLoading } = useQuery<DailyPrompt[]>({
    queryKey: ["/api/daily-prompt/past"],
  });

  const submitMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", "/api/daily-prompt/entry", {
        promptId: data?.prompt?.id,
        content,
      });
    },
    onSuccess: () => {
      toast({ title: "تم إرسال مشاركتك بنجاح!" });
      setEntryText("");
      queryClient.invalidateQueries({ queryKey: ["/api/daily-prompt"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-prompt", data?.prompt?.id, "my-entry"] });
    },
    onError: (err: any) => {
      toast({ title: err?.message || "فشل إرسال المشاركة", variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!entryText.trim() || entryText.trim().length < 20) {
      toast({ title: "الإجابة قصيرة جداً (20 حرف على الأقل)", variant: "destructive" });
      return;
    }
    submitMutation.mutate(entryText.trim());
  };

  const prompt = data?.prompt;
  const entries = data?.entries ?? [];
  const alreadySubmitted = !!myEntry?.entry;

  return (
    <div className="min-h-screen flex flex-col bg-background" dir="rtl">
      <SharedNavbar />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium">
            <Flame className="w-4 h-4" />
            تحدي الكتابة اليومي
          </div>
          <h1 className="text-3xl font-serif font-bold text-foreground">اكتب اليوم، ابدع كل يوم</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            موضوع كتابي جديد كل يوم. شارك بمقطعك واقرأ ما يكتبه الآخرون.
          </p>
        </div>

        {/* Today's prompt */}
        {isLoading ? (
          <div className="h-40 rounded-2xl bg-muted animate-pulse" />
        ) : prompt ? (
          <div className="bg-gradient-to-br from-primary/10 via-card to-card border rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatArabicDate(prompt.promptDate)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                <span>{data?.entryCount ?? 0} مشاركة</span>
              </div>
            </div>
            <blockquote className="text-xl font-serif font-semibold text-foreground leading-relaxed border-r-4 border-primary pr-4" data-testid="text-daily-prompt">
              {prompt.promptText}
            </blockquote>

            {/* Submission area */}
            {!user ? (
              <div className="bg-muted/50 border border-dashed rounded-xl p-5 text-center space-y-3">
                <Lock className="w-6 h-6 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">سجّل الدخول للمشاركة في التحدي</p>
                <Link href="/login">
                  <Button size="sm" data-testid="button-login-to-participate">سجّل الدخول</Button>
                </Link>
              </div>
            ) : alreadySubmitted ? (
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4 text-sm text-green-700 dark:text-green-400 font-medium text-center" data-testid="text-already-submitted">
                شاركت في تحدي اليوم. تحقق من مشاركتك أدناه.
              </div>
            ) : (
              <div className="space-y-3">
                <Textarea
                  dir="rtl"
                  placeholder="اكتب مشاركتك هنا... (20–2000 حرف)"
                  className="min-h-[120px] text-sm resize-none"
                  value={entryText}
                  onChange={(e) => setEntryText(e.target.value)}
                  maxLength={2000}
                  data-testid="textarea-prompt-entry"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{entryText.length} / 2000</span>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitMutation.isPending || entryText.trim().length < 20}
                    size="sm"
                    className="gap-2"
                    data-testid="button-submit-prompt-entry"
                  >
                    {submitMutation.isPending ? (
                      <span className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    أرسل مشاركتك
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="border border-dashed rounded-2xl p-12 text-center text-muted-foreground space-y-2">
            <Flame className="w-8 h-8 mx-auto opacity-30" />
            <p className="text-sm">لا يوجد تحدٍّ نشط اليوم. تابعنا غداً!</p>
          </div>
        )}

        {/* My entry */}
        {myEntry?.entry && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <PenLine className="w-4 h-4" />
              مشاركتي
            </h2>
            <EntryCard entry={myEntry.entry as PromptEntry & { authorName: string; authorProfileImage: string | null }} isWinner={prompt?.winnerEntryId === myEntry.entry.id} />
          </section>
        )}

        {/* Community entries */}
        {entries.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              مشاركات الكتّاب ({entries.length})
            </h2>
            <div className="space-y-3">
              {entries.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  isWinner={prompt?.winnerEntryId === entry.id}
                />
              ))}
            </div>
          </section>
        )}

        {/* Past prompts */}
        {(pastPrompts?.length ?? 0) > 1 && (
          <section className="space-y-3 border-t pt-6">
            <h2 className="text-base font-semibold flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              تحديات سابقة
            </h2>
            {pastLoading ? (
              <div className="h-20 rounded-xl bg-muted animate-pulse" />
            ) : (
              <div className="space-y-2">
                {(pastPrompts ?? []).filter(p => p.id !== prompt?.id).map((past) => (
                  <div
                    key={past.id}
                    className="p-4 rounded-xl border bg-card text-sm text-muted-foreground flex items-start gap-3"
                    data-testid={`card-past-prompt-${past.id}`}
                  >
                    <span className="text-xs shrink-0 mt-0.5 text-primary/60">{formatArabicDate(past.promptDate)}</span>
                    <span className="font-medium text-foreground line-clamp-2">{past.promptText}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <SharedFooter />
    </div>
  );
}
