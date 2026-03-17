import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useParams, useLocation, useSearch } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BookOpen, GraduationCap, Users, Lock, CheckCircle2, CircleDot, ChevronLeft, Loader2, ShoppingCart } from "lucide-react";

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const [activeLesson, setActiveLesson] = useState<number | null>(null);
  const [exerciseText, setExerciseText] = useState("");

  const { data: course, isLoading } = useQuery<any>({
    queryKey: ["/api/courses", id],
  });

  const checkoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/courses/${id}/checkout`),
    onSuccess: async (res) => {
      const data = await res.json();
      if (data.alreadyEnrolled) {
        queryClient.invalidateQueries({ queryKey: ["/api/courses", id] });
        toast({ title: "أنت مسجل بالفعل" });
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: () => toast({ title: "فشل في إنشاء عملية الدفع", variant: "destructive" }),
  });

  const enrollMutation = useMutation({
    mutationFn: (sessionId?: string) => apiRequest("POST", `/api/courses/${id}/enroll`, { sessionId }),
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
    const params = new URLSearchParams(search);
    const payment = params.get("payment");
    const sessionId = params.get("session_id");
    if (payment === "success" && sessionId && user) {
      enrollMutation.mutate(sessionId);
    }
  }, [search, user]);

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

                {selectedLesson.exercisePrompt && canAccessContent && (
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle className="text-lg">تمرين</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-muted-foreground">{selectedLesson.exercisePrompt}</p>
                      <Textarea
                        placeholder="اكتب إجابتك هنا..."
                        value={exerciseText}
                        onChange={(e) => setExerciseText(e.target.value)}
                        className="min-h-[120px] font-serif"
                        dir="rtl"
                        data-testid="input-exercise-response"
                      />
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
                              {lesson.exercisePrompt && <Badge variant="outline" className="text-xs mt-1">يتضمن تمرين</Badge>}
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
                <div className="text-3xl font-bold">
                  {course.priceCents > 0 ? `$${(course.priceCents / 100).toFixed(2)}` : "مجانية"}
                </div>
                {course.enrolled ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-base px-4 py-1">
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
                      if (course.priceCents === 0) {
                        enrollMutation.mutate();
                      } else {
                        checkoutMutation.mutate();
                      }
                    }}
                    disabled={checkoutMutation.isPending || enrollMutation.isPending}
                    data-testid="button-enroll"
                  >
                    {(checkoutMutation.isPending || enrollMutation.isPending) ? (
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    ) : (
                      <ShoppingCart className="h-4 w-4 ml-2" />
                    )}
                    {course.priceCents > 0 ? "اشترِ الدورة" : "سجّل مجاناً"}
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
          </div>
        </div>
      </div>
    </div>
  );
}
