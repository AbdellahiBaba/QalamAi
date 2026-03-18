import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { SharedNavbar } from "@/components/shared-navbar";
import { SharedFooter } from "@/components/shared-footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { Trophy, Eye, Users, BookOpen, Star, BadgeCheck, Coffee, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import LtrNum from "@/components/ui/ltr-num";
import { getCountry } from "@/lib/countries";

interface LeaderboardEntry {
  userId: string;
  displayName: string;
  profileImageUrl: string | null;
  verified: boolean;
  country: string | null;
  totalViews: number;
  followerCount: number;
  projectCount: number;
  averageRating: number;
}

function formatNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default function Leaderboard() {
  useDocumentTitle("لوحة الكتّاب المتصدرين — QalamAI", "تعرّف على أبرز الكتّاب والأعمال الأدبية الأكثر قراءة ومتابعة على QalamAI.");
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: entries, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/public/leaderboard"],
  });

  const handleTip = async (e: React.MouseEvent, authorId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const csrfToken = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/)?.[1] ?? "";
      const res = await fetch("/api/tips/public-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": decodeURIComponent(csrfToken) },
        credentials: "include",
        body: JSON.stringify({ toAuthorId: authorId, amountCents: 500 }),
      });
      const data = await res.json();
      if (data.url) window.open(data.url, "_blank");
      else toast({ title: data.error || "حدث خطأ أثناء المعالجة", variant: "destructive" });
    } catch {
      toast({ title: "حدث خطأ أثناء المعالجة", variant: "destructive" });
    }
  };

  const rankColors = ["text-yellow-500", "text-slate-400", "text-amber-600"];
  const rankBgs = ["bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800", "bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-700", "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SharedNavbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        <Button variant="ghost" size="sm" className="mb-4 gap-2 text-muted-foreground" onClick={() => window.history.back()} data-testid="button-back-leaderboard">
          <ArrowRight className="w-4 h-4" />
          رجوع
        </Button>
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="w-7 h-7 text-yellow-500" />
          <h1 className="font-serif text-3xl font-bold" data-testid="text-leaderboard-title">لوحة الكتّاب المتصدرين</h1>
        </div>
        <p className="text-muted-foreground mb-10">أكثر الكتّاب تفاعلاً ومتابعةً على منصة QalamAI</p>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 border rounded-xl">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-60" />
                </div>
              </div>
            ))}
          </div>
        ) : !entries || entries.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground" data-testid="leaderboard-empty">
            <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>لا يوجد كتّاب في لوحة المتصدرين بعد</p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="leaderboard-list">
            {entries.map((entry, index) => (
              <div key={entry.userId} className="relative group" data-testid={`leaderboard-row-${entry.userId}`}>
                <Link href={`/author/${entry.userId}`}>
                  <div
                    className={`flex items-center gap-4 p-4 border rounded-xl hover:shadow-sm transition-shadow cursor-pointer pl-16 ${index < 3 ? rankBgs[index] : "bg-card"}`}
                  >
                    <div className="w-8 text-center shrink-0">
                      <span className={`font-bold text-lg ${index < 3 ? rankColors[index] : "text-muted-foreground"}`} data-testid={`rank-${index + 1}`}>
                        {index + 1}
                      </span>
                    </div>

                    <Avatar className="w-12 h-12 shrink-0">
                      <AvatarImage src={entry.profileImageUrl || undefined} />
                      <AvatarFallback className="text-base font-semibold">{entry.displayName[0]}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold truncate" data-testid={`name-${entry.userId}`}>{entry.displayName}</span>
                        {entry.verified && (
                          <BadgeCheck className="w-5 h-5 text-[#1D9BF0] shrink-0" data-testid={`verified-${entry.userId}`} title="كاتب موثّق" />
                        )}
                        {entry.country && (() => {
                          const c = getCountry(entry.country!);
                          return (
                            <span className="text-base leading-none" title={c.nameAr} data-testid={`flag-${entry.userId}`}>{c.flag}</span>
                          );
                        })()}
                        {entry.averageRating > 0 && (
                          <div className="flex items-center gap-0.5 text-yellow-500" data-testid={`rating-${entry.userId}`}>
                            <Star className="w-3.5 h-3.5 fill-current" />
                            <span className="text-xs font-medium" dir="ltr">{entry.averageRating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1" data-testid={`views-${entry.userId}`}>
                          <Eye className="w-3 h-3" />
                          <span dir="ltr">{formatNum(entry.totalViews)}</span>
                          <span>مشاهدة</span>
                        </span>
                        <span className="flex items-center gap-1" data-testid={`followers-${entry.userId}`}>
                          <Users className="w-3 h-3" />
                          <span dir="ltr">{formatNum(entry.followerCount)}</span>
                          <span>متابع</span>
                        </span>
                        <span className="flex items-center gap-1" data-testid={`projects-${entry.userId}`}>
                          <BookOpen className="w-3 h-3" />
                          <span dir="ltr">{entry.projectCount}</span>
                          <span>عمل</span>
                        </span>
                      </div>
                    </div>

                    {index < 3 && (
                      <Badge
                        className={`shrink-0 text-xs ${index === 0 ? "bg-yellow-500 text-white" : index === 1 ? "bg-slate-400 text-white" : "bg-amber-600 text-white"}`}
                        data-testid={`medal-${entry.userId}`}
                      >
                        {index === 0 ? "الأول" : index === 1 ? "الثاني" : "الثالث"}
                      </Badge>
                    )}
                  </div>
                </Link>
                {/* Tip button — absolute so it doesn't interfere with Link */}
                {(!user || user.id !== entry.userId) && (
                  <button
                    onClick={(e) => handleTip(e, entry.userId)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-amber-600 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors font-medium"
                    title="ادعم الكاتب بـ $5"
                    data-testid={`button-tip-author-${entry.userId}`}
                  >
                    <Coffee className="w-3 h-3" />
                    دعم
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <SharedFooter />
    </div>
  );
}
