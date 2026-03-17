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
import { Timer, Play, Pause, Square, Trophy, Flame, Target, Clock, Zap, TrendingUp, Award, Volume2, VolumeX } from "lucide-react";
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
  thisWeekMinutes: number;
}

type SprintPhase = "setup" | "running" | "paused" | "completed";

const ABU_HASHIM_QUOTES = [
  "أحسنت يا صديقي! الكلمات تتراقص على أناملك كأنّها تعرف طريقها.",
  "ما شاء الله! هكذا يُصنع الأدب — كلمة بعد كلمة، بصبرٍ وشغف.",
  "لقد أثبتّ أنّ القلم أقوى من الزمن. واصل!",
  "كل سباق كتابة هو خطوة نحو روايتك الخالدة.",
  "أبو هاشم فخور بك! الكاتب الحقيقي يكتب حتى حين لا يشعر بالإلهام.",
  "هذا هو إيقاع الكتّاب العظام — لا تتوقف!",
  "بوركت يداك! الحبر الذي يسيل اليوم يصبح تاريخاً غداً.",
  "رائع! لقد حوّلت الدقائق إلى كنوز أدبية.",
  "الكتابة المنتظمة هي سرّ كل كاتب عظيم. أنت على الطريق الصحيح.",
  "تذكّر: كل كلمة كتبتها اليوم هي بذرة لعمل أدبي عظيم.",
];

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

interface WritingSprintTimerProps {
  projects?: NovelProject[];
  editorMode?: boolean;
  projectId?: number;
  getWordCount?: () => number;
  onSprintStateChange?: (isRunning: boolean) => void;
}

export function WritingSprintTimer({ projects, editorMode, projectId: fixedProjectId, getWordCount, onSprintStateChange }: WritingSprintTimerProps) {
  const { toast } = useToast();
  const [phase, setPhase] = useState<SprintPhase>("setup");
  const [duration, setDuration] = useState(25);
  const [targetWords, setTargetWords] = useState(300);
  const [projectId, setProjectId] = useState<string>(fixedProjectId ? String(fixedProjectId) : "");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [wordsWritten, setWordsWritten] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [lastCompletedSprint, setLastCompletedSprint] = useState<{ wordsWritten: number; durationSeconds: number; targetWords: number; wpm: number; quote: string } | null>(null);
  const [ambientPlaying, setAmbientPlaying] = useState(false);
  const startTimeRef = useRef<number>(0);
  const startWordCountRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const ambientOscRef = useRef<OscillatorNode | null>(null);
  const ambientGainRef = useRef<GainNode | null>(null);

  const { data: sprintStats } = useQuery<SprintStats>({
    queryKey: ["/api/writing-sprints/stats"],
  });

  const saveSprint = useMutation({
    mutationFn: async (data: { durationSeconds: number; wordsWritten: number; targetWords?: number; projectId?: number }) => {
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

  const startAmbient = useCallback(() => {
    try {
      if (!audioRef.current) audioRef.current = new AudioContext();
      const ctx = audioRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(60, ctx.currentTime);
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      ambientOscRef.current = osc;
      ambientGainRef.current = gain;
      setAmbientPlaying(true);
    } catch {}
  }, []);

  const stopAmbient = useCallback(() => {
    try {
      if (ambientGainRef.current) {
        ambientGainRef.current.gain.exponentialRampToValueAtTime(0.001, (audioRef.current?.currentTime ?? 0) + 0.3);
      }
      setTimeout(() => {
        try { ambientOscRef.current?.stop(); } catch {}
        ambientOscRef.current = null;
        ambientGainRef.current = null;
      }, 400);
      setAmbientPlaying(false);
    } catch {}
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      try { ambientOscRef.current?.stop(); } catch {}
    };
  }, []);

  const autoFinish = useCallback((finalWords: number) => {
    const elapsedSeconds = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
    const elapsedMinutes = elapsedSeconds / 60;
    const wpm = elapsedMinutes > 0 ? Math.round(finalWords / elapsedMinutes) : 0;
    const quote = ABU_HASHIM_QUOTES[Math.floor(Math.random() * ABU_HASHIM_QUOTES.length)];

    const completedData = {
      wordsWritten: finalWords,
      durationSeconds: elapsedSeconds,
      targetWords,
      wpm,
      quote,
    };

    const resolvedProjectId = fixedProjectId || (projectId && projectId !== "none" ? parseInt(projectId) : undefined);

    saveSprint.mutate({
      durationSeconds: elapsedSeconds,
      wordsWritten: finalWords,
      targetWords,
      projectId: resolvedProjectId && !isNaN(resolvedProjectId) ? resolvedProjectId : undefined,
    }, {
      onSuccess: () => {
        setLastCompletedSprint(completedData);
        setShowCompletion(true);
        setPhase("setup");
        setSecondsLeft(0);
        setWordsWritten(0);
        onSprintStateChange?.(false);
      },
      onError: () => {
        setLastCompletedSprint(completedData);
        setShowCompletion(true);
        setPhase("setup");
        setSecondsLeft(0);
        setWordsWritten(0);
        onSprintStateChange?.(false);
        toast({ title: "خطأ", description: "فشل في حفظ نتيجة السباق.", variant: "destructive" });
      },
    });
  }, [fixedProjectId, projectId, targetWords, saveSprint, onSprintStateChange, toast]);

  const startSprint = () => {
    const totalSeconds = duration * 60;
    setSecondsLeft(totalSeconds);
    setPhase("running");
    startTimeRef.current = Date.now();
    startWordCountRef.current = getWordCount ? getWordCount() : 0;
    onSprintStateChange?.(true);
    startAmbient();
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          playCompletionSound();
          stopAmbient();
          const finalWords = getWordCount ? Math.max(0, getWordCount() - startWordCountRef.current) : 0;
          setTimeout(() => autoFinish(finalWords), 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const pauseSprint = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase("paused");
    stopAmbient();
  };

  const resumeSprint = () => {
    setPhase("running");
    startAmbient();
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          playCompletionSound();
          stopAmbient();
          const finalWords = getWordCount ? Math.max(0, getWordCount() - startWordCountRef.current) : 0;
          setTimeout(() => autoFinish(finalWords), 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopSprintEarly = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    stopAmbient();
    const finalWords = getWordCount ? Math.max(0, getWordCount() - startWordCountRef.current) : wordsWritten;
    autoFinish(finalWords);
  };

  const manualFinish = () => {
    autoFinish(wordsWritten);
  };

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const progressPercent = duration > 0 ? ((duration * 60 - secondsLeft) / (duration * 60)) * 100 : 0;
  const liveWordDelta = getWordCount ? Math.max(0, getWordCount() - startWordCountRef.current) : wordsWritten;
  const wordProgressPercent = targetWords > 0 ? Math.min((liveWordDelta / targetWords) * 100, 100) : 0;

  if (editorMode) {
    return (
      <>
        {phase === "setup" && (
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={String(duration)} onValueChange={(v) => setDuration(parseInt(v))}>
              <SelectTrigger className="h-7 w-[100px] text-xs" data-testid="select-sprint-duration-editor">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={startSprint} data-testid="button-start-sprint-editor">
              <Timer className="w-3.5 h-3.5" />
              سباق الكتابة
            </Button>
          </div>
        )}

        {(phase === "running" || phase === "paused") && (
          <div className="fixed bottom-4 left-4 z-50" data-testid="sprint-floating-ring">
            <div className="relative bg-background/95 backdrop-blur-sm border rounded-2xl shadow-lg p-3 flex flex-col items-center gap-2 w-[120px]">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/20" />
                <circle
                  cx="40" cy="40" r="34"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - progressPercent / 100)}`}
                  strokeLinecap="round"
                  className={`transition-all duration-1000 ${phase === "paused" ? "text-yellow-500" : "text-orange-500"}`}
                />
              </svg>
              <div className="absolute top-3 left-0 right-0 flex items-center justify-center" style={{ height: "80px" }}>
                <div className="text-center">
                  <div className="text-lg font-mono font-bold tabular-nums" dir="ltr" data-testid="text-sprint-timer-editor">
                    {formatTime(secondsLeft)}
                  </div>
                  {getWordCount && (
                    <div className="text-[10px] text-green-600 dark:text-green-400 font-medium">
                      +<LtrNum>{liveWordDelta}</LtrNum>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={ambientPlaying ? stopAmbient : startAmbient} data-testid="button-toggle-ambient-sprint">
                  {ambientPlaying ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                </Button>
                {phase === "running" ? (
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={pauseSprint} data-testid="button-pause-sprint-editor">
                    <Pause className="w-3 h-3" />
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={resumeSprint} data-testid="button-resume-sprint-editor">
                    <Play className="w-3 h-3" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={stopSprintEarly} data-testid="button-stop-sprint-editor">
                  <Square className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        )}

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
              <SprintCompletionContent sprint={lastCompletedSprint} sprintStats={sprintStats} onClose={() => setShowCompletion(false)} />
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

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

              {projects && projects.length > 0 && !fixedProjectId && (
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
                <Button size="sm" variant="ghost" onClick={ambientPlaying ? stopAmbient : startAmbient} className="gap-1" data-testid="button-toggle-ambient">
                  {ambientPlaying ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  {ambientPlaying ? "صوت" : "صامت"}
                </Button>
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
                <Button variant="destructive" onClick={stopSprintEarly} className="flex-1 gap-2" data-testid="button-stop-sprint">
                  <Square className="w-4 h-4" />
                  إنهاء
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

              <Button onClick={manualFinish} className="w-full gap-2" disabled={saveSprint.isPending} data-testid="button-save-sprint">
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
            <SprintCompletionContent sprint={lastCompletedSprint} sprintStats={sprintStats} onClose={() => setShowCompletion(false)} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function SprintCompletionContent({ sprint, sprintStats, onClose }: {
  sprint: { wordsWritten: number; durationSeconds: number; targetWords: number; wpm: number; quote: string };
  sprintStats?: SprintStats;
  onClose: () => void;
}) {
  const durationMinutes = Math.round(sprint.durationSeconds / 60);
  return (
    <div className="space-y-4">
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-center border border-amber-200 dark:border-amber-800">
        <p className="text-sm font-serif leading-relaxed text-amber-800 dark:text-amber-200" data-testid="text-abu-hashim-quote">
          « {sprint.quote} »
        </p>
        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">— أبو هاشم</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center">
          <Flame className="w-5 h-5 mx-auto text-orange-500 mb-1" />
          <div className="text-xl font-bold" data-testid="text-completion-words">
            <LtrNum>{sprint.wordsWritten.toLocaleString("ar-EG")}</LtrNum>
          </div>
          <div className="text-[10px] text-muted-foreground">كلمة</div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
          <Clock className="w-5 h-5 mx-auto text-blue-500 mb-1" />
          <div className="text-xl font-bold" data-testid="text-completion-duration">
            <LtrNum>{durationMinutes}</LtrNum>
          </div>
          <div className="text-[10px] text-muted-foreground">دقيقة</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
          <Zap className="w-5 h-5 mx-auto text-green-500 mb-1" />
          <div className="text-xl font-bold" data-testid="text-completion-wpm">
            <LtrNum>{sprint.wpm}</LtrNum>
          </div>
          <div className="text-[10px] text-muted-foreground">كلمة/دقيقة</div>
        </div>
        {sprint.targetWords > 0 && (
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
            <Target className="w-5 h-5 mx-auto text-purple-500 mb-1" />
            <div className="text-xl font-bold" data-testid="text-completion-target-pct">
              <LtrNum>{Math.round((sprint.wordsWritten / sprint.targetWords) * 100)}</LtrNum>%
            </div>
            <div className="text-[10px] text-muted-foreground">من الهدف</div>
          </div>
        )}
      </div>

      {sprintStats && sprintStats.bestSprint > 0 && sprint.wordsWritten > sprintStats.bestSprint && (
        <div className="bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 rounded-lg p-3 text-center">
          <TrendingUp className="w-5 h-5 mx-auto text-amber-600 dark:text-amber-400 mb-1" />
          <p className="text-sm font-bold text-amber-800 dark:text-amber-200">رقم قياسي جديد! 🏆</p>
        </div>
      )}

      <Button onClick={onClose} variant="outline" className="w-full" data-testid="button-close-completion">
        إغلاق
      </Button>
    </div>
  );
}

export function SprintWeekStat() {
  const { data: sprintStats } = useQuery<SprintStats>({
    queryKey: ["/api/writing-sprints/stats"],
    staleTime: 60 * 1000,
  });

  if (!sprintStats || sprintStats.thisWeekSprints === 0) return null;

  return (
    <div className="bg-muted/50 rounded-lg p-3 text-center" data-testid="stat-sprint-week">
      <div className="text-xl font-bold">
        <LtrNum>{sprintStats.thisWeekSprints}</LtrNum>
      </div>
      <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
        <Timer className="w-3 h-3" />
        الجلسات هذا الأسبوع
      </div>
    </div>
  );
}

export default WritingSprintTimer;
