import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Trophy, Clock, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Challenge {
  id: number;
  title: string;
  description: string;
  project_type: string | null;
  prize_description: string | null;
  end_date: string;
  entryCount: number;
}

const PROJECT_TYPE_LABELS: Record<string, string> = {
  essay: "مقال",
  novel: "رواية",
  poem: "قصيدة",
  short_story: "قصة قصيرة",
  screenplay: "سيناريو",
  khawater: "خاطرة",
  memoire: "مذكرة",
};

function getTimeRemaining(endDate: string): string | null {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days} يوم`;
  if (hours > 0) return `${hours} ساعة`;
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${minutes} دقيقة`;
}

export function ChallengeBanner() {
  const { data: challenges } = useQuery<Challenge[]>({
    queryKey: ["/api/challenges"],
  });

  const active = challenges?.filter(c => new Date(c.end_date) > new Date()) ?? [];
  if (active.length === 0) return null;

  const top = active[0];
  const remaining = getTimeRemaining(top.end_date);

  return (
    <Link href={`/challenges/${top.id}`} data-testid="banner-active-challenge">
      <div
        className="w-full rounded-xl bg-gradient-to-l from-amber-500/15 via-amber-400/10 to-transparent border border-amber-400/30 dark:border-amber-700/40 px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:border-amber-500/60 transition-colors"
        dir="rtl"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">تحدٍّ نشط</span>
              {top.project_type && (
                <Badge variant="outline" className="text-xs py-0 h-4 border-amber-400/40 text-amber-700 dark:text-amber-400">
                  {PROJECT_TYPE_LABELS[top.project_type] || top.project_type}
                </Badge>
              )}
            </div>
            <p className="font-semibold text-sm truncate" data-testid="text-banner-challenge-title">{top.title}</p>
            {top.prize_description && (
              <p className="text-xs text-muted-foreground truncate">🏆 {top.prize_description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {remaining && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" /> {remaining}
            </span>
          )}
          <span className="flex items-center gap-0.5 text-xs text-amber-700 dark:text-amber-400 font-medium">
            شارك <ArrowLeft className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
