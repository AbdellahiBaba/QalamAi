import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useParams, useLocation } from "wouter";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BookOpen, GraduationCap, Users, Lock, CheckCircle2, CircleDot, ChevronLeft, Loader2, Quote, Sparkles, Brain } from "lucide-react";

function ExcerptSection({ chapterId }: { chapterId: number }) {
  const { data: chapter } = useQuery<any>({
    queryKey: ["/api/chapters", chapterId],
  });
  if (!chapter?.content) return null;
  const excerpt = chapter.content.length > 1500 ? chapter.content.substring(0, 1500) + "..." : chapter.content;
  return (
    <Card className="mt-6 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Quote className="h-4 w-4 text-amber-600" />
          مقتطف تطبيقي: {chapter.title || `فصل ${chapter.chapterNumber}`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm dark:prose-invert max-w-none font-serif leading-relaxed whitespace-pre-wrap text-muted-foreground" dir="rtl" data-testid="text-excerpt-content">
          {excerpt}
        </div>
      </CardContent>
    </Card>
  );
}

function AbuHashimExercisePrompt({ courseId, lessonId }: { courseId: string; lessonId: number }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const { toast } = useToast();
  const abortRef = useRef<AbortController | null>(null);

  const generateExercise = async () => {
    setLoading(true);
    setStarted(true);
    setPrompt("");
    abortRef.current = new AbortController();
    try {
      const response = await fetch(`/api/courses/${courseId}/lessons/${lessonId}/exercise`, {
        credentials: "include",
        signal: abortRef.current.signal,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "فشل في توليد التمرين");
      }
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No reader");
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) setPrompt(prev => prev + parsed.content);
              if (parsed.error) throw new Error(parsed.error);
            } catch (_) { /* ignore */ }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast({ title: err.message || "فشل في توليد التمرين", variant: "destructive" });
        setStarted(false);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        size="sm"
        onClick={generateExercise}
        disabled={loading}
        className="gap-2 border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-400 dark:hover:bg-violet-950/30"
        data-testid="button-generate-exercise"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
        {loading ? "أبو هاشم يصيغ التمرين..." : "اجعل أبو هاشم يصيغ تمريناً لك"}
      </Button>
      {started && (
        <Card className="border-violet-200 dark:border-violet-800 bg-gradient-to-b from-violet-50/80 to-transparent dark:from-violet-950/30">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm flex items-center gap-2 text-violet-700 dark:text-violet-400">
              <Sparkles className="h-4 w-4" />
              تمرين من أبو هاشم
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading && !prompt ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            ) : (
              <p className="text-sm leading-relaxed whitespace-pre-wrap font-serif" dir="rtl" data-testid="text-abu-hashim-exercise">
                {prompt}
                {loading && <span className="animate-pulse">|</span>}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AbuHashimFeedback({ courseId, lessonId, exerciseResponse, exercisePrompt }: {
  courseId: string;
  lessonId: number;
  exerciseResponse: string;
  exercisePrompt: string;
}) {
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const { toast } = useToast();
  const abortRef = useRef<AbortController | null>(null);

  const requestFeedback = async () => {
    if (exerciseResponse.trim().length < 10) {
      toast({ title: "يرجى كتابة إجابة أولاً (10 أحرف على الأقل)", variant: "destructive" });
      return;
    }
    setLoading(true);
    setStarted(true);
    setFeedback("");
    abortRef.current = new AbortController();

    try {
      const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
      const csrfVal = csrfMatch ? decodeURIComponent(csrfMatch[1]) : "";

      const response = await fetch(`/api/courses/${courseId}/lessons/${lessonId}/exercise-feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfVal,
        },
        credentials: "include",
        body: JSON.stringify({ exerciseResponse }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "فشل في الحصول على التغذية الراجعة");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No reader");

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) setFeedback(prev => prev + parsed.content);
              if (parsed.error) throw new Error(parsed.error);
            } catch (e) { /* ignore parse errors */ }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast({ title: err.message || "فشل في الحصول على التغذية الراجعة", variant: "destructive" });
        setStarted(false);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  return (
    <div className="mt-4 space-y-3">
      <Button
        variant="outline"
        size="sm"
        onClick={requestFeedback}
        disabled={loading}
        className="gap-2 border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-400 dark:hover:bg-violet-950/30"
        data-testid="button-abu-hashim-feedback"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
        {loading ? "أبو هاشم يقرأ إجابتك..." : "اطلب رأي أبو هاشم"}
      </Button>

      {started && (
        <Card className="border-violet-200 dark:border-violet-800 bg-gradient-to-b from-violet-50/80 to-transparent dark:from-violet-950/30">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm flex items-center gap-2 text-violet-700 dark:text-violet-400">
              <Sparkles className="h-4 w-4" />
              أبو هاشم — المرشد الأدبي
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading && !feedback ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            ) : (
              <ScrollArea className="max-h-64">
                <p className="text-sm leading-relaxed whitespace-pre-wrap font-serif" dir="rtl" data-testid="text-abu-hashim-feedback">
                  {feedback}
                  {loading && <span className="animate-pulse">|</span>}
                </p>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeLesson, setActiveLesson] = useState<number | null>(null);
  const [exerciseText, setExerciseText] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  const { data: course, isLoading } = useQuery<any>({
    queryKey: ["/api/courses", id],
  });

  const enrollMutation = useMutation({
    mutationFn: (_?: string) => apiRequest("POST", `/api/courses/${id}/enroll`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses/enrolled"] });
      toast({ title: "تم التسجيل بنجاح!" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: ({ lessonId, exerciseResponse }: { lessonId: number; exerciseResponse?: string }) =>
      apiRequest("POST", `/api/courses/${id}/lessons/${lessonId}/complete`, { exerciseResponse }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", id] });
      toast({ title: "تم إكمال الدرس!" });
    },
  });

  useEffect(() => {
    setExerciseText("");
    setShowFeedback(false);
  }, [activeLesson]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <p className="text-muted-foreground">الدورة غير موجودة</p>
      </div>
    );
  }

  const canAccessContent = course.enrolled || course.isOwner || course.priceCents === 0;
  const selectedLesson = activeLesson !== null ? course.lessons?.find((l: any) => l.id === activeLesson) : null;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Button variant="ghost" className="mb-4" onClick={() => setLocation("/courses")} data-testid="button-back-courses">
          <ChevronLeft className="h-4 w-4 ml-1" />
          العودة للدورات
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {selectedLesson ? (
              <div>
                <Button variant="ghost" size="sm" onClick={() => setActiveLesson(null)} className="mb-4" data-testid="button-back-lessons">
                  <ChevronLeft className="h-4 w-4 ml-1" />
                  قائمة الدروس
                </Button>
                <h2 className="text-2xl font-bold font-serif mb-4" data-testid="text-lesson-title">{selectedLesson.title}</h2>
                {selectedLesson.content ? (
                  <div className="prose prose-lg dark:prose-invert max-w-none font-serif leading-relaxed mb-6" dir="rtl" data-testid="text-lesson-content" dangerouslySetInnerHTML={{ __html: selectedLesson.content }} />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Lock className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>محتوى هذا الدرس مقفل</p>
                    {!user && <p className="text-sm mt-1">سجّل دخولك للتسجيل في الدورة</p>}
                  </div>
                )}

                {selectedLesson.excerptChapterId && canAccessContent && (
                  <ExcerptSection chapterId={selectedLesson.excerptChapterId} />
                )}

                {canAccessContent && (
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Brain className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                        تمرين الدرس
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedLesson.exercisePrompt ? (
                        <p className="text-muted-foreground font-serif" data-testid="text-exercise-prompt">{selectedLesson.exercisePrompt}</p>
                      ) : (
                        <AbuHashimExercisePrompt courseId={id} lessonId={selectedLesson.id} />
                      )}
                      <Textarea
                        placeholder="اكتب إجابتك هنا..."
                        value={exerciseText}
                        onChange={(e) => {
                          setExerciseText(e.target.value);
                          setShowFeedback(false);
                        }}
                        className="min-h-[120px] font-serif"
                        dir="rtl"
                        data-testid="input-exercise-response"
                      />
                      {user && exerciseText.trim().length >= 10 && (
                        <AbuHashimFeedback
                          courseId={id}
                          lessonId={selectedLesson.id}
                          exerciseResponse={exerciseText}
                          exercisePrompt={selectedLesson.exercisePrompt || ""}
                        />
                      )}
                    </CardContent>
                  </Card>
                )}

                {canAccessContent && !selectedLesson.completed && (
                  <Button
                    className="mt-4"
                    onClick={() => completeMutation.mutate({ lessonId: selectedLesson.id, exerciseResponse: exerciseText || undefined })}
                    disabled={completeMutation.isPending}
                    data-testid="button-complete-lesson"
                  >
                    {completeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <CheckCircle2 className="h-4 w-4 ml-2" />}
                    إكمال الدرس
                  </Button>
                )}
                {selectedLesson.completed && (
                  <Badge className="mt-4 bg-green-500/10 text-green-600 border-green-500/20">
                    <CheckCircle2 className="h-3.5 w-3.5 ml-1" /> مكتمل
                  </Badge>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-start gap-4 mb-6">
                  {course.coverImageUrl ? (
                    <img src={course.coverImageUrl} alt={course.title} className="w-32 h-32 rounded-lg object-cover" />
                  ) : (
                    <div className="w-32 h-32 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="h-12 w-12 text-primary/40" />
                    </div>
                  )}
                  <div>
                    <h1 className="text-3xl font-bold font-serif mb-2" data-testid="text-course-title">{course.title}</h1>
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      {course.authorProfileImage && <img src={course.authorProfileImage} alt="" className="w-6 h-6 rounded-full" />}
                      <span>{course.authorName}</span>
                      {course.authorVerified && <Badge variant="secondary" className="text-xs">موثّق</Badge>}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      {course.projectType && course.projectType !== "general" && (
                        <Badge variant="outline" className="text-xs" data-testid="badge-course-type">
                          {{ novel: "رواية", short_story: "قصة قصيرة", essay: "مقالة", poetry: "شعر", scenario: "سيناريو", khawater: "خواطر", memoire: "مذكرة تخرج" }[course.projectType as string] || course.projectType}
                        </Badge>
                      )}
                      {course.difficulty && (
                        <Badge variant="outline" className={`text-xs ${{ beginner: "border-green-400 text-green-600", intermediate: "border-amber-400 text-amber-600", advanced: "border-red-400 text-red-600" }[course.difficulty as string] || ""}`} data-testid="badge-course-difficulty">
                          {{ beginner: "مبتدئ", intermediate: "متوسط", advanced: "متقدم" }[course.difficulty as string] || course.difficulty}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><BookOpen className="h-4 w-4" /> {course.lessons?.length || 0} درس</span>
                      <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {course.enrollmentCount} طالب</span>
                    </div>
                  </div>
                </div>

                {course.description && (
                  <p className="text-muted-foreground mb-6 font-serif leading-relaxed" data-testid="text-course-description">{course.description}</p>
                )}

                <h3 className="text-xl font-bold mb-4">محتوى الدورة</h3>
                <div className="space-y-2">
                  {course.lessons?.map((lesson: any, idx: number) => {
                    const locked = !canAccessContent && idx > 0;
                    return (
                      <Card
                        key={lesson.id}
                        className={`transition-colors ${locked ? "opacity-60" : "hover:bg-muted/50 cursor-pointer"}`}
                        onClick={() => !locked && setActiveLesson(lesson.id)}
                        data-testid={`card-lesson-${lesson.id}`}
                      >
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {lesson.completed ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                            ) : locked ? (
                              <Lock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            ) : (
                              <CircleDot className="h-5 w-5 text-primary flex-shrink-0" />
                            )}
                            <div>
                              <p className="font-medium">{lesson.title}</p>
                              {lesson.exercisePrompt && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Badge variant="outline" className="text-xs">يتضمن تمرين</Badge>
                                  <Badge variant="outline" className="text-xs border-violet-300 text-violet-600 dark:border-violet-700 dark:text-violet-400">
                                    <Brain className="h-2.5 w-2.5 ml-1" />أبو هاشم
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                          <span className="text-sm text-muted-foreground">الدرس {idx + 1}</span>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Card>
              <CardContent className="p-6 text-center space-y-4">
                <div className="text-lg font-semibold text-muted-foreground">التسجيل مجاني</div>
                {course.enrolled ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-base px-4 py-1" data-testid="badge-enrolled">
                    <CheckCircle2 className="h-4 w-4 ml-1" /> مسجّل
                  </Badge>
                ) : course.isOwner ? (
                  <Button variant="outline" className="w-full" onClick={() => setLocation(`/courses/${id}/edit`)} data-testid="button-edit-own-course">
                    تعديل الدورة
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => {
                      if (!user) return setLocation("/login");
                      enrollMutation.mutate(undefined);
                    }}
                    disabled={enrollMutation.isPending}
                    data-testid="button-enroll"
                  >
                    {enrollMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    ) : (
                      <GraduationCap className="h-4 w-4 ml-2" />
                    )}
                    سجّل مجاناً
                  </Button>
                )}
              </CardContent>
            </Card>

            {course.enrolled && course.lessons?.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-2">التقدم</p>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div
                      className="bg-green-500 h-2.5 rounded-full transition-all"
                      style={{ width: `${(course.lessons.filter((l: any) => l.completed).length / course.lessons.length) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {course.lessons.filter((l: any) => l.completed).length}/{course.lessons.length} درس
                  </p>
                </CardContent>
              </Card>
            )}

            {canAccessContent && course.priceCents === 0 && (
              <Card className="border-violet-200 dark:border-violet-800 bg-violet-50/30 dark:bg-violet-950/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    <p className="text-sm font-medium text-violet-700 dark:text-violet-300">مدعوم بأبو هاشم</p>
                  </div>
                  <p className="text-xs text-muted-foreground">تمارين الدروس تحظى بتغذية راجعة فورية من مرشدك الأدبي الذكي</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
