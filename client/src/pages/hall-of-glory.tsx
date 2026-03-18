import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Crown, Star, Feather, ArrowRight, CalendarDays, ChevronDown, ChevronUp, Share2, Heart, Image as ImageIcon } from "lucide-react";
import { SharedNavbar } from "@/components/shared-navbar";
import { SharedFooter } from "@/components/shared-footer";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { MilestoneCardModal } from "@/components/milestone-card-modal";
import { useAuth } from "@/hooks/use-auth";

interface Challenge {
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
  created_at: string;
  entryCount: number;
  winnerName: string | null;
  winnerProfileImage?: string | null;
  winnerEntryContent?: string | null;
}

const PROJECT_TYPE_LABELS: Record<string, string> = {
  essay: "مقال", novel: "رواية", poetry: "قصيدة", poem: "قصيدة",
  short_story: "قصة قصيرة", scenario: "سيناريو", screenplay: "سيناريو",
  khawater: "خاطرة", memoire: "مذكرة",
};

interface FeaturedWork {
  id: number;
  projectId: number;
  featuredAt: string;
  voteCount: number;
  project: {
    id: number;
    title: string;
    shareToken: string | null;
    authorName: string | null;
    authorId: string;
    coverImageUrl: string | null;
    projectType: string | null;
    mainIdea: string | null;
    authorProfileImage: string | null;
  };
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function GloryCard({ challenge, onShare }: { challenge: Challenge; onShare?: (challengeTitle: string, winnerName: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const content = (challenge.winnerEntryContent || "").trim();
  const isLong = content.length > 400;
  const displayContent = isLong && !expanded ? content.slice(0, 400) + "…" : content;

  return (
    <article
      className="relative overflow-hidden rounded-2xl border border-yellow-400/30 bg-gradient-to-br from-yellow-950/10 via-amber-900/5 to-orange-950/10 dark:from-yellow-950/30 dark:via-amber-900/15 dark:to-orange-950/20 shadow-lg"
      data-testid={`card-glory-${challenge.id}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(234,179,8,0.06)_0%,_transparent_60%)] pointer-events-none" />

      <div className="relative p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="relative shrink-0 self-start sm:self-auto">
            <div className="absolute -inset-1.5 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 opacity-50 blur-md" />
            <Avatar className="w-16 h-16 ring-2 ring-yellow-500/60 relative">
              <AvatarImage src={challenge.winnerProfileImage || undefined} alt={challenge.winnerName || "فائز"} />
              <AvatarFallback className="bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 text-xl font-bold">
                {(challenge.winnerName || "?")[0]}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-yellow-500 flex items-center justify-center shadow-lg ring-2 ring-background">
              <Crown className="w-3.5 h-3.5 text-white" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-serif font-bold text-lg text-foreground">{challenge.winnerName}</span>
              <Badge className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30 text-[10px] gap-1 shrink-0">
                <Crown className="w-2.5 h-2.5" /> فائز التحدي
              </Badge>
              {challenge.project_type && (
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {PROJECT_TYPE_LABELS[challenge.project_type] ?? challenge.project_type}
                </Badge>
              )}
            </div>

            <Link href={`/challenges/${challenge.id}`}>
              <p className="text-sm font-semibold text-primary hover:underline cursor-pointer mb-1">
                {challenge.title}
              </p>
            </Link>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                {formatDate(challenge.end_date)}
              </span>
              {challenge.prize_description && (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                  <Trophy className="w-3 h-3" />
                  {challenge.prize_description}
                </span>
              )}
            </div>
          </div>
        </div>

        {content ? (
          <div className="space-y-3">
            <div className="h-px bg-gradient-to-r from-yellow-500/30 via-amber-400/20 to-transparent" />
            <div className="relative">
              <div className="absolute top-0 right-0 text-yellow-400/20 font-serif text-7xl leading-none select-none pointer-events-none">"</div>
              <p
                className="font-serif text-sm sm:text-base leading-loose text-foreground/85 whitespace-pre-wrap pr-6"
                data-testid={`text-glory-entry-${challenge.id}`}
              >
                {displayContent}
              </p>
            </div>
            {isLong && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                data-testid={`button-expand-glory-${challenge.id}`}
              >
                {expanded ? (
                  <><ChevronUp className="w-3.5 h-3.5" /> طيّ النص</>
                ) : (
                  <><ChevronDown className="w-3.5 h-3.5" /> اقرأ المزيد</>
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="h-px bg-gradient-to-r from-yellow-500/30 via-amber-400/20 to-transparent" />
            <p className="font-serif text-sm italic text-muted-foreground text-center py-2" data-testid={`text-glory-entry-placeholder-${challenge.id}`}>
              يمكنك الاطلاع على العمل الفائز من صفحة التحدي
            </p>
          </div>
        )}

        <div className="flex items-center justify-between">
          {onShare && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1.5 text-amber-600 dark:text-amber-400 hover:text-amber-700"
              onClick={() => onShare(challenge.title, challenge.winnerName || "كاتب")}
              data-testid={`button-share-glory-${challenge.id}`}
            >
              <Share2 className="w-3.5 h-3.5" />
              شارك إنجازك
            </Button>
          )}
          <Link href={`/challenges/${challenge.id}`}>
            <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-muted-foreground hover:text-primary" data-testid={`link-glory-challenge-${challenge.id}`}>
              <span>استعرض التحدي كاملاً</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function HallOfGlory() {
  useDocumentTitle("قاعة المجد — قلم AI", "أعمال الفائزين في تحديات QalamAI — شواهد الموهبة والإبداع الأدبي العربي.");
  const { user } = useAuth();

  const [showGloryCard, setShowGloryCard] = useState(false);
  const [gloryCardTitle, setGloryCardTitle] = useState("");
  const [gloryCardAuthor, setGloryCardAuthor] = useState("");

  const { data: challenges, isLoading, isError } = useQuery<Challenge[]>({
    queryKey: ["/api/challenges"],
  });

  const { data: featuredData } = useQuery<{ featured: FeaturedWork[] }>({
    queryKey: ["/api/hall-of-glory/featured"],
  });

  const featured = featuredData?.featured ?? [];

  const winners = (challenges || []).filter(
    (c) => c.winner_id && c.winner_entry_id && c.winnerName
  ).sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime());

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      <SharedNavbar />

      <div className="max-w-5xl mx-auto px-4 pt-20">
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => window.history.back()} data-testid="button-back-hall-of-glory">
          <ArrowRight className="w-4 h-4" />
          رجوع
        </Button>
      </div>

      <section className="relative overflow-hidden py-8 sm:py-12 text-center">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,_rgba(234,179,8,0.08)_0%,_transparent_60%)]" />
          {["✦", "✧", "❋", "✿", "✱", "✶", "❊"].map((sym, i) => (
            <span
              key={i}
              className="absolute text-yellow-400/15 font-serif select-none"
              style={{
                fontSize: `${1.5 + (i % 3) * 0.8}rem`,
                right: `${8 + i * 12}%`,
                top: `${15 + (i % 4) * 15}%`,
                animation: `pulse ${2 + i * 0.3}s ease-in-out infinite alternate`,
              }}
            >
              {sym}
            </span>
          ))}
        </div>

        <div className="relative max-w-2xl mx-auto px-4 space-y-5">
          <div className="flex items-center justify-center gap-3">
            <div className="relative">
              <Trophy className="w-10 h-10 text-yellow-500" style={{ filter: "drop-shadow(0 0 12px rgba(234,179,8,0.5))" }} />
              <div className="absolute inset-0 animate-ping rounded-full bg-yellow-400/20" style={{ animationDuration: "2.5s" }} />
            </div>
            <Star className="w-6 h-6 text-amber-400 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h1 className="font-serif text-3xl sm:text-4xl font-bold" data-testid="text-hall-title">
              <span
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #fbbf24, #d97706, #fbbf24)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  backgroundSize: "200% 200%",
                }}
              >
                قاعة المجد الأدبي
              </span>
            </h1>
            <p className="text-muted-foreground font-serif text-sm sm:text-base leading-loose italic">
              يُنشر عمل الفائز ويبقى شاهداً على موهبته للأبد
            </p>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent" />

          <p className="text-sm text-muted-foreground/80 font-serif leading-loose">
            هنا تلتقي عقول أدبية بقلوب مبدعة — أعمال خُلّدت، وأسماء نُقشت في ذاكرة الكتابة العربية.
          </p>
        </div>
      </section>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 pb-16 space-y-6">

        {featured.length > 0 && (
          <section className="space-y-4" data-testid="section-featured-works">
            <div className="flex items-center gap-3 py-2">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-300" />
                <span className="font-serif text-base font-semibold">أعمال مختارة</span>
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-amber-400/30 to-transparent" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {featured.map((item) => (
                <article
                  key={item.id}
                  className="relative overflow-hidden rounded-xl border border-amber-400/25 bg-gradient-to-br from-amber-950/10 via-yellow-900/5 to-transparent shadow-sm hover:shadow-md transition-shadow"
                  data-testid={`card-featured-${item.id}`}
                >
                  {item.project.coverImageUrl && (
                    <div className="aspect-[16/7] overflow-hidden">
                      <img
                        src={item.project.coverImageUrl}
                        alt={item.project.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                        data-testid={`img-featured-cover-${item.id}`}
                      />
                    </div>
                  )}
                  {!item.project.coverImageUrl && (
                    <div className="aspect-[16/7] bg-amber-50/30 dark:bg-amber-900/10 flex items-center justify-center">
                      <ImageIcon className="w-10 h-10 text-amber-300/50" />
                    </div>
                  )}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {item.project.projectType && (
                            <Badge variant="outline" className="text-[10px]" data-testid={`badge-featured-type-${item.id}`}>
                              {PROJECT_TYPE_LABELS[item.project.projectType] ?? item.project.projectType}
                            </Badge>
                          )}
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25 text-[10px] gap-1 shrink-0">
                            <Star className="w-2.5 h-2.5 fill-current" /> مميَّز
                          </Badge>
                        </div>
                        <h3 className="font-serif font-semibold text-foreground truncate" data-testid={`text-featured-title-${item.id}`}>
                          {item.project.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Avatar className="w-5 h-5 shrink-0">
                            <AvatarImage src={item.project.authorProfileImage || undefined} alt={item.project.authorName || "مؤلف"} />
                            <AvatarFallback className="text-[8px]">{(item.project.authorName || "؟")[0]}</AvatarFallback>
                          </Avatar>
                          <Link href={`/author/${item.project.authorId}`}>
                            <p className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer" data-testid={`text-featured-author-${item.id}`}>
                              {item.project.authorName}
                            </p>
                          </Link>
                          {item.voteCount > 0 && (
                            <span className="flex items-center gap-0.5 text-xs text-red-400" data-testid={`text-featured-votes-${item.id}`}>
                              <Heart className="w-3 h-3 fill-current" />
                              {item.voteCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {item.project.mainIdea && (
                      <p className="text-xs text-muted-foreground line-clamp-2" data-testid={`text-featured-idea-${item.id}`}>
                        {item.project.mainIdea}
                      </p>
                    )}

                    {item.project.shareToken && (() => {
                      const essayTypes = ["essay", "khawater", "memoire"];
                      const href = essayTypes.includes(item.project.projectType || "")
                        ? `/essay/${item.project.shareToken}`
                        : `/shared/${item.project.shareToken}`;
                      return (
                        <Link href={href}>
                          <Button size="sm" variant="ghost" className="gap-1.5 text-xs px-2 h-7 -mr-2" data-testid={`link-featured-read-${item.id}`}>
                            <ArrowRight className="w-3 h-3" />
                            اقرأ العمل
                          </Button>
                        </Link>
                      );
                    })()}
                  </div>
                </article>
              ))}
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent" />
          </section>
        )}

        {isError ? (
          <div className="text-center py-20 space-y-4" data-testid="text-glory-error">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <Trophy className="w-8 h-8 text-destructive/50" />
            </div>
            <h2 className="font-serif text-lg font-semibold text-muted-foreground">تعذّر تحميل قاعة المجد</h2>
            <p className="text-sm text-muted-foreground/70">يرجى المحاولة مرة أخرى لاحقاً</p>
            <Link href="/challenges">
              <Button variant="outline" className="gap-2 mt-2" data-testid="button-glory-retry">
                العودة إلى التحديات
              </Button>
            </Link>
          </div>
        ) : isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-border/50 p-6 sm:p-8 space-y-4">
                <div className="flex items-start gap-4">
                  <Skeleton className="w-16 h-16 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-56" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <Skeleton className="h-32 w-full" />
              </div>
            ))}
          </div>
        ) : winners.length === 0 ? (
          <div className="text-center py-20 space-y-4" data-testid="text-no-winners">
            <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto">
              <Trophy className="w-8 h-8 text-yellow-500/50" />
            </div>
            <h2 className="font-serif text-lg font-semibold text-muted-foreground">لم يُكرَّم أحد بعد</h2>
            <p className="text-sm text-muted-foreground/70">
              كن الأول من يُخلّد اسمه في قاعة المجد
            </p>
            <Link href="/challenges">
              <Button className="gap-2 mt-2" data-testid="button-go-challenges">
                <Feather className="w-4 h-4" />
                استكشف التحديات
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 py-2" data-testid="text-winners-count">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-yellow-500" />
                <span className="font-serif text-base font-semibold">
                  {winners.length} {winners.length === 1 ? "كاتب مُكرَّم" : "كتّاب مُكرَّمون"}
                </span>
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-yellow-500/30 to-transparent" />
            </div>

            {winners.map((challenge) => (
              <GloryCard
                key={challenge.id}
                challenge={challenge}
                onShare={user && challenge.winner_id === user.id ? (title, name) => {
                  setGloryCardTitle(title);
                  setGloryCardAuthor(name);
                  setShowGloryCard(true);
                } : undefined}
              />
            ))}
          </>
        )}

        <div className="text-center pt-4">
          <Link href="/challenges">
            <Button variant="outline" className="gap-2 font-serif" data-testid="link-back-challenges">
              <ArrowRight className="w-4 h-4" />
              العودة إلى تحديات الكتابة
            </Button>
          </Link>
        </div>
      </main>

      <SharedFooter />

      <MilestoneCardModal
        open={showGloryCard}
        onOpenChange={setShowGloryCard}
        type="hall_of_glory"
        authorName={gloryCardAuthor}
        projectTitle={gloryCardTitle}
      />
    </div>
  );
}
