import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Timer, Play, Pause, Square, Trophy, Flame, Target, Clock, Zap, TrendingUp, Award } from "lucide-react";
import LtrNum from "@/components/ui/ltr-num";
import type { NovelProject } from "@shared/schema";

interface SprintStats {
  totalSprints: number;
  totalWords: number;
  totalMinutes: number;
  avgWordsPerSprint: number;
  bestSprint: number;
  thisWeekSprints: number;
  thisWeekWords: number;
}

type SprintPhase = "setup" | "running" | "paused" | "completed";

const DURATION_OPTIONS = [
  { value: 5, label: "٥ دقائق" },
  { value: 10, label: "١٠ دقائق" },
  { value: 15, label: "١٥ دقيقة" },
  { value: 20, label: "٢٠ دقيقة" },
  { value: 25, label: "٢٥ دقيقة" },
  { value: 30, label: "٣٠ دقيقة" },
  { value: 45, label: "٤٥ دقيقة" },
  { value: 60, label: "ساعة" },
];

export function WritingSprintTimer({ projects }: { projects?: NovelProject[] }) {
  const { toast } = useToast();
  const [phase, setPhase] = useState<SprintPhase>("setup");
  const [duration, setDuration] = useState(15);
  const [targetWords, setTargetWords] = useState(300);
  const [projectId, setProjectId] = useState<string>("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [wordsWritten, setWordsWritten] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [lastCompletedSprint, setLastCompletedSprint] = useState<{ wordsWritten: number; duration: number; targetWords: number; wpm: number } | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  const { data: sprintStats } = useQuery<SprintStats>({
    queryKey: ["/api/writing-sprints/stats"],
  });

  const saveSprint = useMutation({
    mutationFn: async (data: { durationMinutes: number; wordsWritten: number; targetWords: number; projectId?: string; startedAt: string }) => {
      const res = await apiRequest("POST", "/api/writing-sprints", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/writing-sprints/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/writing-sprints"] });
      queryClient.invalidateQueries({ queryKey: ["/api/writing-streak"] });
    },
  });

  const playCompletionSound = useCallback(() => {
    try {
      if (!audioRef.current) audioRef.current = new AudioContext();
      const ctx = audioRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.15);
      osc.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    } catch {}
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startSprint = () => {
    setSecondsLeft(duration * 60);
    setPhase("running");
    startTimeRef.current = new Date();
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setPhase("completed");
          playCompletionSound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const pauseSprint = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase("paused");
  };

  const resumeSprint = () => {
    setPhase("running");
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setPhase("completed");
          playCompletionSound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopSprint = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase("completed");
  };

  const finishSprint = () => {
    const actualMinutes = startTimeRef.current
      ? Math.max(1, Math.round((Date.now() - startTimeRef.current.getTime()) / 60000))
      : duration;
    const wpm = actualMinutes > 0 ? Math.round(wordsWritten / actualMinutes) : 0;

    const completedData = {
      wordsWritten,
      duration: actualMinutes,
      targetWords,
      wpm,
    };

    const parsedProjectId = projectId && projectId !== "none" ? parseInt(projectId) : undefined;

    saveSprint.mutate({
      durationMinutes: actualMinutes,
      wordsWritten,
      targetWords,
      projectId: !isNaN(parsedProjectId as number) ? parsedProjectId : undefined,
      startedAt: startTimeRef.current?.toISOString() || new Date().toISOString(),
    }, {
      onSuccess: () => {
        setLastCompletedSprint(completedData);
        setShowCompletion(true);
        setPhase("setup");
        setSecondsLeft(0);
        setWordsWritten(0);
      },
      onError: () => {
        toast({ title: "خطأ", description: "فشل في حفظ نتيجة السباق. حاول مرة أخرى.", variant: "destructive" });
      },
    });
  };

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const progressPercent = duration > 0 ? ((duration * 60 - secondsLeft) / (duration * 60)) * 100 : 0;
  const wordProgressPercent = targetWords > 0 ? Math.min((wordsWritten / targetWords) * 100, 100) : 0;

  return (
    <>
      <Card className="mb-6 overflow-hidden" data-testid="card-writing-sprint">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-md bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
              <Timer className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm" data-testid="text-sprint-title">سباق الكتابة</h3>
              <p className="text-xs text-muted-foreground">حدد وقتاً وعدد كلمات وابدأ التحدي!</p>
            </div>
          </div>

          {phase === "setup" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">المدة</Label>
                  <Select value={String(duration)} onValueChange={(v) => setDuration(parseInt(v))}>
                    <SelectTrigger data-testid="select-sprint-duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={String(opt.value)}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">هدف الكلمات</Label>
                  <Input
                    type="number"
                    min={0}
                    max={10000}
                    value={targetWords}
                    onChange={(e) => setTargetWords(Math.max(0, parseInt(e.target.value) || 0))}
                    className="text-left"
                    dir="ltr"
                    data-testid="input-sprint-target"
                  />
                </div>
              </div>

              {projects && projects.length > 0 && (
                <div>
                  <Label className="text-xs mb-1 block">المشروع (اختياري)</Label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger data-testid="select-sprint-project">
                      <SelectValue placeholder="بدون مشروع محدد" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون مشروع محدد</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button onClick={startSprint} className="w-full gap-2" data-testid="button-start-sprint">
                <Play className="w-4 h-4" />
                ابدأ السباق
              </Button>

              {sprintStats && sprintStats.totalSprints > 0 && (
                <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-600 dark:text-orange-400" data-testid="text-sprint-total">
                      <LtrNum>{sprintStats.totalSprints}</LtrNum>
                    </div>
                    <div className="text-[10px] text-muted-foreground">سباق</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600 dark:text-green-400" data-testid="text-sprint-best">
                      <LtrNum>{sprintStats.bestSprint.toLocaleString("ar-EG")}</LtrNum>
                    </div>
                    <div className="text-[10px] text-muted-foreground">أفضل سباق</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400" data-testid="text-sprint-week-words">
                      <LtrNum>{sprintStats.thisWeekWords.toLocaleString("ar-EG")}</LtrNum>
                    </div>
                    <div className="text-[10px] text-muted-foreground">كلمات الأسبوع</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {(phase === "running" || phase === "paused") && (
            <div className="space-y-4">
              <div className="relative flex items-center justify-center">
                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/20" />
                  <circle
                    cx="60" cy="60" r="54"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    strokeDasharray={`${2 * Math.PI * 54}`}
                    strokeDashoffset={`${2 * Math.PI * 54 * (1 - progressPercent / 100)}`}
                    strokeLinecap="round"
                    className={`transition-all duration-1000 ${phase === "paused" ? "text-yellow-500" : "text-orange-500"}`}
                  />
                </svg>
                <div className="absolute text-center">
                  <div className="text-3xl font-mono font-bold tabular-nums" dir="ltr" data-testid="text-sprint-timer">
                    {formatTime(secondsLeft)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {phase === "paused" ? "متوقف مؤقتاً" : "جارٍ"}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs mb-1 block">الكلمات المكتوبة</Label>
                <Input
                  type="number"
                  min={0}
                  max={50000}
                  value={wordsWritten}
                  onChange={(e) => setWordsWritten(Math.max(0, parseInt(e.target.value) || 0))}
                  className="text-center text-lg font-bold"
                  dir="ltr"
                  data-testid="input-sprint-words"
                />
                {targetWords > 0 && (
                  <div className="mt-2">
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>الهدف: <LtrNum>{targetWords}</LtrNum></span>
                      <span><LtrNum>{Math.round(wordProgressPercent)}</LtrNum>%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${wordProgressPercent >= 100 ? "bg-green-500" : "bg-orange-500"}`}
                        style={{ width: `${Math.min(wordProgressPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {phase === "running" ? (
                  <Button variant="outline" onClick={pauseSprint} className="flex-1 gap-2" data-testid="button-pause-sprint">
                    <Pause className="w-4 h-4" />
                    إيقاف مؤقت
                  </Button>
                ) : (
                  <Button variant="outline" onClick={resumeSprint} className="flex-1 gap-2" data-testid="button-resume-sprint">
                    <Play className="w-4 h-4" />
                    استئناف
                  </Button>
                )}
                <Button variant="destructive" onClick={stopSprint} className="flex-1 gap-2" data-testid="button-stop-sprint">
                  <Square className="w-4 h-4" />
                  إنهاء مبكراً
                </Button>
              </div>
            </div>
          )}

          {phase === "completed" && (
            <div className="space-y-3">
              <div className="text-center py-3">
                <Trophy className="w-10 h-10 mx-auto text-amber-500 mb-2" />
                <p className="font-bold text-lg">انتهى الوقت!</p>
                <p className="text-sm text-muted-foreground">أدخل عدد الكلمات التي كتبتها</p>
              </div>

              <div>
                <Label className="text-xs mb-1 block">الكلمات المكتوبة</Label>
                <Input
                  type="number"
                  min={0}
                  value={wordsWritten}
                  onChange={(e) => setWordsWritten(Math.max(0, parseInt(e.target.value) || 0))}
                  className="text-center text-2xl font-bold"
                  dir="ltr"
                  data-testid="input-sprint-final-words"
                />
              </div>

              <Button onClick={finishSprint} className="w-full gap-2" disabled={saveSprint.isPending} data-testid="button-save-sprint">
                <Award className="w-4 h-4" />
                {saveSprint.isPending ? "جاري الحفظ..." : "حفظ النتيجة"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCompletion} onOpenChange={setShowCompletion}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-center">
              <Trophy className="w-12 h-12 mx-auto text-amber-500 mb-2" />
              {lastCompletedSprint && lastCompletedSprint.targetWords > 0 && lastCompletedSprint.wordsWritten >= lastCompletedSprint.targetWords
                ? "🎉 أحسنت! تجاوزت الهدف"
                : "أحسنت! أنهيت السباق"}
            </DialogTitle>
          </DialogHeader>

          {lastCompletedSprint && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center">
                  <Flame className="w-5 h-5 mx-auto text-orange-500 mb-1" />
                  <div className="text-xl font-bold" data-testid="text-completion-words">
                    <LtrNum>{lastCompletedSprint.wordsWritten.toLocaleString("ar-EG")}</LtrNum>
                  </div>
                  <div className="text-[10px] text-muted-foreground">كلمة</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                  <Clock className="w-5 h-5 mx-auto text-blue-500 mb-1" />
                  <div className="text-xl font-bold" data-testid="text-completion-duration">
                    <LtrNum>{lastCompletedSprint.duration}</LtrNum>
                  </div>
                  <div className="text-[10px] text-muted-foreground">دقيقة</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                  <Zap className="w-5 h-5 mx-auto text-green-500 mb-1" />
                  <div className="text-xl font-bold" data-testid="text-completion-wpm">
                    <LtrNum>{lastCompletedSprint.wpm}</LtrNum>
                  </div>
                  <div className="text-[10px] text-muted-foreground">كلمة/دقيقة</div>
                </div>
                {lastCompletedSprint.targetWords > 0 && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
                    <Target className="w-5 h-5 mx-auto text-purple-500 mb-1" />
                    <div className="text-xl font-bold" data-testid="text-completion-target-pct">
                      <LtrNum>{Math.round((lastCompletedSprint.wordsWritten / lastCompletedSprint.targetWords) * 100)}</LtrNum>%
                    </div>
                    <div className="text-[10px] text-muted-foreground">من الهدف</div>
                  </div>
                )}
              </div>

              {sprintStats && sprintStats.bestSprint > 0 && lastCompletedSprint.wordsWritten > sprintStats.bestSprint && (
                <div className="bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 rounded-lg p-3 text-center">
                  <TrendingUp className="w-5 h-5 mx-auto text-amber-600 dark:text-amber-400 mb-1" />
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-200">رقم قياسي جديد! 🏆</p>
                </div>
              )}

              <Button onClick={() => setShowCompletion(false)} variant="outline" className="w-full" data-testid="button-close-completion">
                إغلاق
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default WritingSprintTimer;
