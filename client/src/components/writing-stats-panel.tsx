import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, BookOpen } from "lucide-react";
import LtrNum from "@/components/ui/ltr-num";

interface WritingStats {
  totalWords: number;
  totalProjects: number;
  completedProjects: number;
  avgWordsPerProject: number;
  dailyWordCounts: { date: string; words: number }[];
  projectBreakdown: { projectId: number; title: string; type: string; words: number; chapters: number; completedChapters: number }[];
}

export default function WritingStatsPanel() {
  const { data: writingStats, isLoading } = useQuery<WritingStats>({
    queryKey: ["/api/projects/writing-stats"],
    staleTime: 60000,
  });

  if (isLoading || !writingStats) {
    return (
      <div className="space-y-3" data-testid="stats-loading">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold text-primary" data-testid="stat-avg-words">{writingStats.avgWordsPerProject.toLocaleString("ar-EG")}</div>
            <div className="text-xs text-muted-foreground">متوسط الكلمات/مشروع</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold text-green-600 dark:text-green-400" data-testid="stat-completion-rate">
              {writingStats.totalProjects > 0 ? Math.round((writingStats.completedProjects / writingStats.totalProjects) * 100) : 0}%
            </div>
            <div className="text-xs text-muted-foreground">نسبة الإنجاز</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400" data-testid="stat-completed-count">{writingStats.completedProjects}</div>
            <div className="text-xs text-muted-foreground">مشاريع مكتملة</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400" data-testid="stat-daily-avg">
              {(() => {
                const activeDays = writingStats.dailyWordCounts.filter(d => d.words > 0).length;
                return activeDays > 0 ? Math.round(writingStats.totalWords / activeDays).toLocaleString("ar-EG") : "\u0660";
              })()}
            </div>
            <div className="text-xs text-muted-foreground">متوسط الكلمات/يوم نشط</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5">
          <h3 className="font-medium text-sm mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            نشاط الكتابة — آخر ١٤ يوماً
          </h3>
          <div className="flex items-end gap-0.5 sm:gap-1 h-20 sm:h-24 overflow-x-auto" data-testid="chart-daily-words">
            {writingStats.dailyWordCounts.map((day, i) => {
              const maxWords = Math.max(...writingStats.dailyWordCounts.map(d => d.words), 1);
              const height = day.words > 0 ? Math.max(4, (day.words / maxWords) * 100) : 0;
              const dateObj = new Date(day.date);
              const dayLabel = dateObj.toLocaleDateString("ar-EG", { day: "numeric" });
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group" data-testid={`bar-day-${i}`}>
                  <div className="relative w-full flex justify-center">
                    <div className="absolute -top-6 bg-popover border rounded px-1.5 py-0.5 text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-sm">
                      <LtrNum>{day.words.toLocaleString("ar-EG")}</LtrNum> كلمة
                    </div>
                  </div>
                  <div
                    className={`w-full rounded-t ${day.words > 0 ? "bg-primary/70 hover:bg-primary" : "bg-muted"} transition-all duration-300`}
                    style={{ height: `${height}%`, minHeight: day.words > 0 ? "4px" : "2px" }}
                  />
                  <span className="text-[9px] text-muted-foreground">{dayLabel}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {writingStats.projectBreakdown.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-medium text-sm mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              توزيع الكلمات حسب المشروع
            </h3>
            <div className="space-y-3">
              {writingStats.projectBreakdown.slice(0, 8).map((proj) => {
                const maxWords = Math.max(...writingStats.projectBreakdown.map(p => p.words), 1);
                const typeLabel = proj.type === "essay" ? "مقال" : proj.type === "scenario" ? "سيناريو" : proj.type === "short_story" ? "قصة قصيرة" : proj.type === "khawater" ? "خاطرة" : proj.type === "social_media" ? "سوشيال ميديا" : proj.type === "poetry" ? "قصيدة" : proj.type === "memoire" ? "مذكرة تخرج" : "رواية";
                return (
                  <div key={proj.projectId} data-testid={`breakdown-project-${proj.projectId}`}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 text-sm truncate min-w-0">
                        <span className="truncate">{proj.title}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">({typeLabel})</span>
                      </div>
                      <span className="text-xs font-medium shrink-0"><LtrNum>{proj.words.toLocaleString("ar-EG")}</LtrNum> كلمة</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/60 transition-all duration-500"
                        style={{ width: `${(proj.words / maxWords) * 100}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {proj.completedChapters}/{proj.chapters} فصول مكتملة
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
