import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Clock, Users, Crown, Feather, Star, Sparkles, Pen, BookOpen, ArrowLeft } from "lucide-react";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { SharedFooter } from "@/components/shared-footer";
import { SharedNavbar } from "@/components/shared-navbar";
import LtrNum from "@/components/ui/ltr-num";

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

function getTimeRemaining(endDate: string) {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days} يوم و ${hours} ساعة`;
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours} ساعة و ${minutes} دقيقة`;
}

function FloatingParticle({ delay, duration, x, y, size }: { delay: number; duration: number; x: number; y: number; size: number }) {
  return (
    <div
      className="absolute rounded-full bg-yellow-400/30 dark:bg-yellow-300/20 pointer-events-none"
      style={{
        width: size, height: size,
        left: `${x}%`, top: `${y}%`,
        animation: `float ${duration}s ease-in-out ${delay}s infinite alternate`,
      }}
    />
  );
}

function WinnerShowcase({ challenges }: { challenges: Challenge[] }) {
  const winners = challenges.filter(c => c.winner_id && c.winner_entry_id && c.winnerName);
  const [activeIdx, setActiveIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (winners.length > 1) {
      intervalRef.current = setInterval(() => {
        setActiveIdx(prev => (prev + 1) % winners.length);
      }, 6000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [winners.length]);

  if (winners.length === 0) return null;
  const winner = winners[activeIdx];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-yellow-400/30 bg-gradient-to-br from-yellow-950/20 via-amber-900/10 to-orange-950/20 dark:from-yellow-950/40 dark:via-amber-900/20 dark:to-orange-950/30 p-0.5 shadow-2xl" data-testid="section-winner-showcase">
      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <FloatingParticle
            key={i}
            delay={i * 0.7}
            duration={3 + (i % 4)}
            x={Math.random() * 100}
            y={Math.random() * 100}
            size={4 + (i % 6)}
          />
        ))}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(234,179,8,0.08)_0%,_transparent_70%)]" />
      </div>

      <div className="relative rounded-2xl bg-background/60 backdrop-blur-sm p-6 sm:p-8">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="relative">
            <Trophy className="w-7 h-7 text-yellow-500" style={{ filter: "drop-shadow(0 0 8px rgba(234,179,8,0.6))" }} />
            <div className="absolute inset-0 animate-ping rounded-full bg-yellow-400/20" style={{ animationDuration: "2s" }} />
          </div>
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-yellow-600 dark:text-yellow-400" style={{ textShadow: "0 0 20px rgba(234,179,8,0.3)" }}>
              قاعة المجد الأدبي
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">أضواء تُنير دروب الكتّاب الفائزين</p>
          </div>
          <Star className="w-5 h-5 text-yellow-400 animate-pulse" />
        </div>

        <Link href={`/challenges/${winner.id}`}>
          <div className="cursor-pointer group" data-testid={`winner-showcase-${winner.id}`}>
            <div className="flex items-start gap-4 mb-5">
              <div className="relative shrink-0">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 opacity-60 blur-sm animate-pulse" style={{ animationDuration: "3s" }} />
                <Avatar className="w-14 h-14 sm:w-16 sm:h-16 ring-2 ring-yellow-500/60 relative">
                  <AvatarImage src={winner.winnerProfileImage || undefined} alt={winner.winnerName || "فائز"} />
                  <AvatarFallback className="bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 text-lg font-bold">
                    {(winner.winnerName || "?")[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center shadow-lg">
                  <Crown className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-bold text-base sm:text-lg font-serif">{winner.winnerName}</span>
                  <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30 text-[10px] gap-1">
                    <Crown className="w-2.5 h-2.5" /> فائز التحدي
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-1">في تحدي: <span className="font-medium text-foreground/80">{winner.title}</span></p>
                {winner.prize_description && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> {winner.prize_description}
                  </p>
                )}
              </div>
            </div>

            {winner.winnerEntryContent && (
              <div className="relative bg-yellow-50/50 dark:bg-yellow-950/30 border border-yellow-200/50 dark:border-yellow-800/30 rounded-xl p-4 sm:p-5">
                <Feather className="absolute top-3 right-3 w-5 h-5 text-yellow-400/40" />
                <p className="font-serif text-sm sm:text-base leading-loose text-foreground/80 line-clamp-4 whitespace-pre-wrap pr-7" data-testid="text-winner-entry-preview">
                  {winner.winnerEntryContent}
                </p>
                <div className="mt-3 flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400 group-hover:underline">
                  اقرأ العمل الفائز كاملاً <ArrowLeft className="w-3.5 h-3.5" />
                </div>
              </div>
            )}
          </div>
        </Link>

        <div className="flex items-center justify-between mt-5">
          {winners.length > 1 ? (
            <div className="flex items-center gap-2">
              {winners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIdx(i)}
                  className={`rounded-full transition-all duration-300 ${i === activeIdx ? "w-6 h-2 bg-yellow-500" : "w-2 h-2 bg-yellow-500/30 hover:bg-yellow-500/60"}`}
                  data-testid={`winner-dot-${i}`}
                />
              ))}
            </div>
          ) : <div />}
          <Link href="/hall-of-glory">
            <button className="flex items-center gap-1.5 text-xs text-yellow-600 dark:text-yellow-400 hover:text-yellow-500 dark:hover:text-yellow-300 transition-colors font-medium" data-testid="link-hall-of-glory-showcase">
              <Trophy className="w-3.5 h-3.5" />
              قاعة المجد كاملة
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Challenges() {
  useDocumentTitle("تحديات الكتابة — قلم AI", "شارك في تحديات الكتابة الأسبوعية على QalamAI وتنافس مع كتّاب عرب مبدعين.");

  const { data: challenges, isLoading } = useQuery<Challenge[]>({ queryKey: ["/api/challenges"] });

  const activeChallenges = challenges?.filter(c => new Date(c.end_date) > new Date()) || [];
  const pastChallenges = challenges?.filter(c => new Date(c.end_date) <= new Date()) || [];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px) scale(1); opacity: 0.3; }
          100% { transform: translateY(-20px) scale(1.2); opacity: 0.6; }
        }
        @keyframes shimmer-gold {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes ink-drop {
          0% { transform: scaleX(0); opacity: 0; }
          100% { transform: scaleX(1); opacity: 1; }
        }
      `}</style>

      <SharedNavbar />

      <div className="pt-14 sm:pt-16">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-yellow-500/5 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute text-primary/10 font-serif select-none"
                style={{
                  right: `${10 + i * 12}%`,
                  top: `${15 + (i % 3) * 25}%`,
                  fontSize: `${14 + (i % 4) * 4}px`,
                  animation: `twinkle ${2 + i * 0.5}s ease-in-out ${i * 0.3}s infinite`,
                }}
              >
                {["✦", "✧", "❋", "✿", "❀", "✾", "✱", "✲"][i]}
              </div>
            ))}
          </div>

          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-center space-y-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-primary/40" style={{ animation: "ink-drop 1s ease-out forwards" }} />
              <Pen className="w-5 h-5 text-primary/60" />
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-primary/40" />
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold leading-tight" data-testid="text-challenges-title">
                <span className="block text-foreground">حيث تُولَد الكلمات</span>
                <span
                  className="block mt-1"
                  style={{
                    background: "linear-gradient(90deg, hsl(var(--primary)), #d97706, hsl(var(--primary)))",
                    backgroundSize: "200% auto",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    animation: "shimmer-gold 4s linear infinite",
                  }}
                >
                  تحديات الكتابة
                </span>
              </h1>

              <div className="relative max-w-xl mx-auto">
                <p className="text-base sm:text-lg text-muted-foreground font-serif leading-loose italic" data-testid="text-challenges-subtitle">
                  «من الكلمة تُبنى الأمم، ومن القلم تُرسم الحضارات»
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-sm">
              {[
                { icon: Feather, title: "اكتب ببراعة", desc: "موضوع جديد كل أسبوع يُلهم قلمك ويوقظ روح الإبداع بداخلك", href: null },
                { icon: Trophy, title: "تنافس وانتصر", desc: "يُقيّم خبراؤنا أعمالك ويُكرّم أصحاب القلوب الشاعرة", href: null },
                { icon: Star, title: "خلّد اسمك", desc: "يُنشر عمل الفائز في قاعة المجد ويبقى شاهداً على موهبتك", href: "/hall-of-glory" },
              ].map((item, i) => {
                const inner = (
                  <div className={`flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/40 border transition-colors ${item.href ? "border-yellow-400/40 hover:border-yellow-400/70 hover:bg-yellow-500/5 cursor-pointer" : "border-border/50 hover:border-primary/30"}`}>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${item.href ? "bg-yellow-500/15" : "bg-primary/10"}`}>
                      <item.icon className={`w-4.5 h-4.5 ${item.href ? "text-yellow-500" : "text-primary"}`} />
                    </div>
                    <h3 className="font-semibold text-sm text-foreground">{item.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed text-center">{item.desc}</p>
                    {item.href && (
                      <span className="text-[10px] text-yellow-600 dark:text-yellow-400 font-medium flex items-center gap-1 mt-0.5">
                        <Trophy className="w-3 h-3" /> استعرض قاعة المجد
                      </span>
                    )}
                  </div>
                );
                return item.href
                  ? <Link key={i} href={item.href} data-testid="link-khalled-ismak">{inner}</Link>
                  : <div key={i}>{inner}</div>;
              })}
            </div>

            <div className="relative max-w-2xl mx-auto space-y-2 py-4">
              <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              <p className="text-sm text-muted-foreground/70 font-serif italic leading-loose">
                في هذه الرحلة الأدبية، كلّ كلمة تكتبها نجمة تُضيء سماء الأدب العربي.
                <br />
                الميدان مفتوح، والقلم سلاحك، والإبداع تاجك.
              </p>
              <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            </div>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-12 space-y-10">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : (
            <>
              {challenges && challenges.length > 0 && (
                <WinnerShowcase challenges={challenges} />
              )}

              {activeChallenges.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                      <h2 className="text-lg sm:text-xl font-serif font-bold" data-testid="text-active-section">تحديات نشطة الآن</h2>
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-green-500/30 to-transparent" />
                  </div>
                  <div className="grid gap-4">
                    {activeChallenges.map(ch => {
                      const remaining = getTimeRemaining(ch.end_date);
                      return (
                        <Link key={ch.id} href={`/challenges/${ch.id}`}>
                          <Card className="group hover:shadow-xl hover:border-primary/30 transition-all duration-300 cursor-pointer overflow-hidden" data-testid={`card-challenge-${ch.id}`}>
                            <div className="h-1 w-full bg-gradient-to-r from-green-500 via-emerald-400 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <CardContent className="p-5 sm:p-6 space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1.5 flex-1 min-w-0">
                                  <h3 className="font-serif font-bold text-lg group-hover:text-primary transition-colors" data-testid={`text-challenge-title-${ch.id}`}>{ch.title}</h3>
                                  <div className="flex flex-wrap gap-1.5">
                                    {ch.project_type && (
                                      <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-900/20">
                                        {PROJECT_TYPE_LABELS[ch.project_type] || ch.project_type}
                                      </Badge>
                                    )}
                                    {ch.theme && <Badge variant="secondary" className="text-xs">{ch.theme}</Badge>}
                                  </div>
                                </div>
                                <Badge className="bg-green-500/10 text-green-600 border-green-500/30 dark:text-green-400 shrink-0 gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> نشط
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">{ch.description}</p>
                              {ch.prize_description && (
                                <p className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                  <Trophy className="w-3.5 h-3.5" /> الجائزة: {ch.prize_description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                                {remaining && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-orange-400" /> {remaining}</span>}
                                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> <LtrNum>{ch.entryCount}</LtrNum> مشاركة</span>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {pastChallenges.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Crown className="w-5 h-5 text-amber-500" />
                      <h2 className="text-lg sm:text-xl font-serif font-bold" data-testid="text-past-section">التحديات المنتهية</h2>
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-amber-500/30 to-transparent" />
                  </div>
                  <div className="grid gap-3">
                    {pastChallenges.map(ch => (
                      <Link key={ch.id} href={`/challenges/${ch.id}`}>
                        <Card className="group hover:shadow-md hover:border-amber-500/20 transition-all duration-200 cursor-pointer opacity-80 hover:opacity-100" data-testid={`card-challenge-past-${ch.id}`}>
                          <CardContent className="p-4 sm:p-5">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <h3 className="font-serif font-semibold text-base group-hover:text-primary transition-colors truncate">{ch.title}</h3>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> <LtrNum>{ch.entryCount}</LtrNum></span>
                                  {ch.winner_id && ch.winnerName ? (
                                    <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 font-medium"><Crown className="w-3 h-3" /> {ch.winnerName}</span>
                                  ) : !ch.winner_id ? (
                                    <span className="flex items-center gap-1 text-muted-foreground"><Crown className="w-3 h-3" /> لم يُحدَّد الفائز</span>
                                  ) : null}
                                </div>
                              </div>
                              <Badge variant="outline" className="shrink-0 text-xs">منتهي</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {(!challenges || challenges.length === 0) && (
                <div className="text-center py-20 space-y-5" data-testid="challenges-empty">
                  <div className="relative inline-block">
                    <Trophy className="w-16 h-16 text-muted-foreground/40 mx-auto" />
                    <Sparkles className="w-5 h-5 text-yellow-400/60 absolute -top-1 -right-1 animate-pulse" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-lg font-serif font-semibold text-muted-foreground">لا توجد تحديات حالياً</p>
                    <p className="text-sm text-muted-foreground/60 font-serif italic">«كل رحلة تبدأ بخطوة، وكل قصيدة تبدأ بكلمة»</p>
                    <p className="text-xs text-muted-foreground/50">ترقّبوا التحديات القادمة!</p>
                  </div>
                </div>
              )}

              <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-background to-primary/5 border border-primary/20 p-8 text-center">
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <BookOpen className="absolute top-4 right-6 w-24 h-24 text-primary/5 rotate-12" />
                  <Feather className="absolute bottom-4 left-6 w-20 h-20 text-primary/5 -rotate-12" />
                </div>
                <div className="relative space-y-3">
                  <p className="text-2xl font-serif font-bold leading-tight">
                    هل أنت مستعد لتُبهر العالم بكلماتك؟
                  </p>
                  <p className="text-sm text-muted-foreground font-serif italic leading-loose max-w-md mx-auto">
                    الكاتب الحقيقي لا ينتظر الإلهام — بل يصنعه. شارك في التحديات وأثبت أن قلمك أقوى من أي عقبة.
                  </p>
                  <Link href="/register">
                    <Button className="mt-2 gap-2 font-serif" size="lg">
                      <Feather className="w-4 h-4" />
                      ابدأ رحلتك الكتابية اليوم
                    </Button>
                  </Link>
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      <SharedFooter />
    </div>
  );
}
