import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { GraduationCap, Plus, Trash2, Save, Loader2, ChevronLeft, ArrowUp, ArrowDown, BookOpen } from "lucide-react";

interface LessonForm {
  id?: number;
  title: string;
  content: string;
  exercisePrompt: string;
  excerptChapterId?: number | null;
  orderIndex: number;
}

export default function CourseEditor() {
  const params = useParams<{ id: string }>();
  const isEditing = !!params.id;
  const courseId = params.id;
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceCents, setPriceCents] = useState(0);
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [lessons, setLessons] = useState<LessonForm[]>([]);
  const [activeLessonIdx, setActiveLessonIdx] = useState<number | null>(null);

  const { data: course, isLoading: courseLoading } = useQuery<any>({
    queryKey: ["/api/courses", courseId],
    enabled: isEditing,
  });

  const { data: authorChapters = [] } = useQuery<{ id: number; title: string; projectTitle: string }[]>({
    queryKey: ["/api/author/chapters-for-excerpt"],
    enabled: !!user,
  });

  useEffect(() => {
    if (course && isEditing) {
      setTitle(course.title || "");
      setDescription(course.description || "");
      setPriceCents(course.priceCents || 0);
      setCoverImageUrl(course.coverImageUrl || "");
      if (course.lessons) {
        setLessons(course.lessons.map((l: any) => ({
          id: l.id,
          title: l.title,
          content: l.content || "",
          exercisePrompt: l.exercisePrompt || "",
          excerptChapterId: l.excerptChapterId || null,
          orderIndex: l.orderIndex,
        })));
      }
    }
  }, [course, isEditing]);

  const createCourseMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/courses", { title, description, priceCents, coverImageUrl: coverImageUrl || undefined }),
    onSuccess: async (res) => {
      const data = await res.json();
      toast({ title: "تم إنشاء الدورة" });
      setLocation(`/courses/${data.id}/edit`);
    },
    onError: () => toast({ title: "فشل في إنشاء الدورة", variant: "destructive" }),
  });

  const updateCourseMutation = useMutation({
    mutationFn: () => apiRequest("PUT", `/api/courses/${courseId}`, { title, description, priceCents, coverImageUrl: coverImageUrl || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses/my"] });
      toast({ title: "تم حفظ التغييرات" });
    },
    onError: () => toast({ title: "فشل في حفظ التغييرات", variant: "destructive" }),
  });

  const deleteCourseMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/courses/${courseId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({ title: "تم حذف الدورة" });
      setLocation("/courses");
    },
  });

  const addLessonMutation = useMutation({
    mutationFn: (lesson: LessonForm) => apiRequest("POST", `/api/courses/${courseId}/lessons`, {
      title: lesson.title,
      content: lesson.content,
      exercisePrompt: lesson.exercisePrompt || undefined,
      orderIndex: lesson.orderIndex,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId] });
      toast({ title: "تم إضافة الدرس" });
    },
  });

  const updateLessonMutation = useMutation({
    mutationFn: ({ lessonId, data }: { lessonId: number; data: Partial<LessonForm> }) =>
      apiRequest("PUT", `/api/courses/${courseId}/lessons/${lessonId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId] });
      toast({ title: "تم تحديث الدرس" });
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: (lessonId: number) => apiRequest("DELETE", `/api/courses/${courseId}/lessons/${lessonId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId] });
      toast({ title: "تم حذف الدرس" });
    },
  });

  const handleAddLesson = () => {
    const newLesson: LessonForm = {
      title: `درس ${lessons.length + 1}`,
      content: "",
      exercisePrompt: "",
      orderIndex: lessons.length,
    };
    if (isEditing) {
      addLessonMutation.mutate(newLesson);
    }
    setLessons([...lessons, newLesson]);
    setActiveLessonIdx(lessons.length);
  };

  const handleSaveLesson = (idx: number) => {
    const lesson = lessons[idx];
    if (lesson.id) {
      updateLessonMutation.mutate({
        lessonId: lesson.id,
        data: { title: lesson.title, content: lesson.content, exercisePrompt: lesson.exercisePrompt, excerptChapterId: lesson.excerptChapterId || undefined, orderIndex: lesson.orderIndex },
      });
    }
  };

  const handleDeleteLesson = (idx: number) => {
    const lesson = lessons[idx];
    if (lesson.id) {
      deleteLessonMutation.mutate(lesson.id);
    }
    setLessons(lessons.filter((_, i) => i !== idx));
    setActiveLessonIdx(null);
  };

  const moveLesson = (idx: number, direction: "up" | "down") => {
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= lessons.length) return;
    const newLessons = [...lessons];
    [newLessons[idx], newLessons[newIdx]] = [newLessons[newIdx], newLessons[idx]];
    newLessons.forEach((l, i) => { l.orderIndex = i; });
    setLessons(newLessons);
    setActiveLessonIdx(newIdx);
    if (newLessons[idx].id) updateLessonMutation.mutate({ lessonId: newLessons[idx].id!, data: { orderIndex: idx } });
    if (newLessons[newIdx].id) updateLessonMutation.mutate({ lessonId: newLessons[newIdx].id!, data: { orderIndex: newIdx } });
  };

  if (!user?.verified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-4">
          <GraduationCap className="h-16 w-16 text-muted-foreground/30 mx-auto" />
          <p className="text-lg">يجب أن تكون كاتباً موثقاً لإنشاء دورات</p>
          <Button onClick={() => setLocation("/apply-verified")} data-testid="button-apply-verified">تقديم طلب التوثيق</Button>
        </div>
      </div>
    );
  }

  if (isEditing && courseLoading) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button variant="ghost" className="mb-4" onClick={() => setLocation("/courses")} data-testid="button-back-courses">
          <ChevronLeft className="h-4 w-4 ml-1" />
          العودة للدورات
        </Button>

        <h1 className="text-2xl font-bold font-serif mb-6 flex items-center gap-3" data-testid="text-editor-title">
          <GraduationCap className="h-7 w-7 text-primary" />
          {isEditing ? "تعديل الدورة" : "إنشاء دورة جديدة"}
        </h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>معلومات الدورة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>عنوان الدورة</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: أساسيات كتابة الرواية" data-testid="input-course-title" />
            </div>
            <div>
              <Label>وصف الدورة</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف مختصر عن محتوى الدورة..." className="min-h-[100px]" data-testid="input-course-description" />
            </div>
            <div>
              <Label>صورة غلاف الدورة (رابط)</Label>
              <Input value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} placeholder="https://example.com/cover.jpg" data-testid="input-cover-image" />
              {coverImageUrl && (
                <div className="mt-2 rounded-lg overflow-hidden border w-40 h-40">
                  <img src={coverImageUrl} alt="غلاف الدورة" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                </div>
              )}
            </div>
            <div>
              <Label>السعر (بالسنت، 0 = مجانية)</Label>
              <Input type="number" value={priceCents} onChange={(e) => setPriceCents(parseInt(e.target.value) || 0)} min={0} data-testid="input-course-price" />
              {priceCents > 0 && <p className="text-xs text-muted-foreground mt-1">السعر: ${(priceCents / 100).toFixed(2)} — حصتك بعد العمولة (20%): ${((priceCents * 0.8) / 100).toFixed(2)}</p>}
            </div>
            {isEditing && course && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                {course.isPublished ? (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">منشورة</Badge>
                ) : (
                  <Badge variant="secondary">مسودة — بانتظار مراجعة الإدارة للنشر</Badge>
                )}
              </div>
            )}
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button onClick={() => updateCourseMutation.mutate()} disabled={updateCourseMutation.isPending || !title.trim()} data-testid="button-save-course">
                    {updateCourseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Save className="h-4 w-4 ml-2" />}
                    حفظ التغييرات
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => { if (confirm("هل تريد حذف هذه الدورة نهائياً؟")) deleteCourseMutation.mutate(); }} data-testid="button-delete-course">
                    <Trash2 className="h-4 w-4 ml-1" /> حذف
                  </Button>
                </>
              ) : (
                <Button onClick={() => createCourseMutation.mutate()} disabled={createCourseMutation.isPending || !title.trim()} data-testid="button-create-course">
                  {createCourseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Plus className="h-4 w-4 ml-2" />}
                  إنشاء الدورة
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {isEditing && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>الدروس ({lessons.length}/20)</CardTitle>
              <Button size="sm" onClick={handleAddLesson} disabled={addLessonMutation.isPending || lessons.length >= 20} data-testid="button-add-lesson">
                <Plus className="h-4 w-4 ml-1" /> إضافة درس
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {lessons.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">لا توجد دروس بعد. أضف أول درس!</p>
              ) : (
                lessons.map((lesson, idx) => (
                  <div key={lesson.id || idx}>
                    <div
                      className={`flex items-center gap-2 p-3 rounded-lg border transition-colors cursor-pointer ${activeLessonIdx === idx ? "bg-primary/5 border-primary/30" : "hover:bg-muted/50"}`}
                      onClick={() => setActiveLessonIdx(activeLessonIdx === idx ? null : idx)}
                      data-testid={`lesson-row-${idx}`}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm text-muted-foreground w-8">#{idx + 1}</span>
                      <span className="font-medium flex-1">{lesson.title || "بدون عنوان"}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); moveLesson(idx, "up"); }} disabled={idx === 0}>
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); moveLesson(idx, "down"); }} disabled={idx === lessons.length - 1}>
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {activeLessonIdx === idx && (
                      <div className="p-4 border border-t-0 rounded-b-lg space-y-3 bg-muted/20">
                        <div>
                          <Label>عنوان الدرس</Label>
                          <Input
                            value={lesson.title}
                            onChange={(e) => {
                              const updated = [...lessons];
                              updated[idx] = { ...updated[idx], title: e.target.value };
                              setLessons(updated);
                            }}
                            data-testid={`input-lesson-title-${idx}`}
                          />
                        </div>
                        <div>
                          <Label>محتوى الدرس</Label>
                          <div className="border rounded-md overflow-hidden">
                            <div className="flex gap-1 p-1 border-b bg-muted/30">
                              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => document.execCommand("bold")} data-testid={`btn-bold-${idx}`}>
                                <strong>B</strong>
                              </Button>
                              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => document.execCommand("italic")} data-testid={`btn-italic-${idx}`}>
                                <em>I</em>
                              </Button>
                              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => document.execCommand("formatBlock", false, "H3")} data-testid={`btn-heading-${idx}`}>
                                H
                              </Button>
                              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => document.execCommand("insertUnorderedList")} data-testid={`btn-list-${idx}`}>
                                ●
                              </Button>
                            </div>
                            <div
                              contentEditable
                              suppressContentEditableWarning
                              className="min-h-[200px] p-3 font-serif text-sm outline-none prose prose-sm max-w-none"
                              dir="rtl"
                              dangerouslySetInnerHTML={{ __html: lesson.content }}
                              onBlur={(e) => {
                                const updated = [...lessons];
                                updated[idx] = { ...updated[idx], content: e.currentTarget.innerHTML };
                                setLessons(updated);
                              }}
                              data-testid={`input-lesson-content-${idx}`}
                            />
                          </div>
                        </div>
                        <div>
                          <Label>تمرين (اختياري)</Label>
                          <Textarea
                            value={lesson.exercisePrompt}
                            onChange={(e) => {
                              const updated = [...lessons];
                              updated[idx] = { ...updated[idx], exercisePrompt: e.target.value };
                              setLessons(updated);
                            }}
                            className="min-h-[80px]"
                            placeholder="اكتب سؤال التمرين هنا..."
                            data-testid={`input-lesson-exercise-${idx}`}
                          />
                        </div>
                        {authorChapters.length > 0 && (
                          <div>
                            <Label className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> مقتطف من أعمالك (اختياري)</Label>
                            <Select
                              value={lesson.excerptChapterId ? String(lesson.excerptChapterId) : "none"}
                              onValueChange={(val) => {
                                const updated = [...lessons];
                                updated[idx] = { ...updated[idx], excerptChapterId: val === "none" ? null : parseInt(val) };
                                setLessons(updated);
                              }}
                            >
                              <SelectTrigger data-testid={`select-excerpt-${idx}`}>
                                <SelectValue placeholder="اختر فصلاً من أعمالك المنشورة" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">بدون مقتطف</SelectItem>
                                {authorChapters.map((ch: any) => (
                                  <SelectItem key={ch.id} value={String(ch.id)}>
                                    {ch.projectTitle} — {ch.title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground mt-1">أضف مقتطفاً من فصولك المنشورة كمثال تطبيقي للدرس</p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSaveLesson(idx)} disabled={updateLessonMutation.isPending} data-testid={`button-save-lesson-${idx}`}>
                            {updateLessonMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Save className="h-4 w-4 ml-1" />}
                            حفظ الدرس
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteLesson(idx)} data-testid={`button-delete-lesson-${idx}`}>
                            <Trash2 className="h-4 w-4 ml-1" /> حذف
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
