import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, GraduationCap, Users, Plus, Star, Flame } from "lucide-react";

const PROJECT_TYPE_LABELS: Record<string, string> = {
  general: "عام",
  novel: "رواية",
  short_story: "قصة قصيرة",
  essay: "مقالة",
  poetry: "شعر",
  scenario: "سيناريو",
  khawater: "خواطر",
  social_media: "سوشيال ميديا",
  memoire: "مذكرة تخرج",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: "مبتدئ",
  intermediate: "متوسط",
  advanced: "متقدم",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  intermediate: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  advanced: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const ALL_FILTER = "all";

export default function CoursesGallery() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeFilter, setActiveFilter] = useState<string>(ALL_FILTER);

  const { data: courses, isLoading } = useQuery<any[]>({
    queryKey: ["/api/courses"],
  });

  const { data: enrolled } = useQuery<any[]>({
    queryKey: ["/api/courses/enrolled"],
    enabled: !!user,
  });

  const { data: myCourses } = useQuery<any[]>({
    queryKey: ["/api/courses/my"],
    enabled: !!user,
  });

  const availableTypes = courses
    ? Array.from(new Set(courses.map((c: any) => c.projectType || "general").filter(Boolean)))
    : [];

  const filteredCourses = courses
    ? (activeFilter === ALL_FILTER ? courses : courses.filter((c: any) => (c.projectType || "general") === activeFilter))
    : [];

  const incompleteCourses = enrolled?.filter((c: any) => {
    const completed = Array.isArray(c.completedLessons) ? c.completedLessons.length : (c.completedLessons || 0);
    return c.lessonCount > 0 && completed < c.lessonCount;
  }) ?? [];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold font-serif flex items-center gap-3" data-testid="text-courses-title">
              <GraduationCap className="h-8 w-8 text-primary" />
              مدرسة الكتابة
            </h1>
            <p className="text-muted-foreground mt-2">دورات تعليمية من أفضل الكتّاب العرب</p>
          </div>
          {user?.verified && (
            <Button onClick={() => setLocation("/courses/new")} data-testid="button-create-course">
              <Plus className="h-4 w-4 ml-2" />
              إنشاء دورة
            </Button>
          )}
        </div>

        {incompleteCourses.length > 0 && (
          <Card className="mb-8 border-primary/30 bg-primary/5" data-testid="card-incomplete-courses">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <Flame className="h-5 w-5 text-primary" />
                <h2 className="font-bold text-lg">أكمل تعلّمك</h2>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                {incompleteCourses.slice(0, 3).map((course: any) => {
                  const completedCount = Array.isArray(course.completedLessons) ? course.completedLessons.length : (course.completedLessons || 0);
                  const pct = course.lessonCount > 0 ? Math.round((completedCount / course.lessonCount) * 100) : 0;
                  return (
                    <div
                      key={course.id}
                      className="flex-1 min-w-0 cursor-pointer group"
                      onClick={() => setLocation(`/courses/${course.id}`)}
                      data-testid={`card-resume-course-${course.id}`}
                    >
                      <p className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">{course.title}</p>
                      <div className="w-full bg-muted rounded-full h-1.5 mt-1.5 mb-1">
                        <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground">{completedCount}/{course.lessonCount} درس · {pct}% مكتمل</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {user && myCourses && myCourses.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              دوراتي
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myCourses.map((course: any) => (
                <Card key={course.id} className="hover:shadow-md transition-shadow cursor-pointer" data-testid={`card-my-course-${course.id}`}>
                  <CardHeader className="p-0">
                    {course.coverImageUrl ? (
                      <img src={course.coverImageUrl} alt={course.title} className="w-full h-40 object-cover rounded-t-lg" />
                    ) : (
                      <div className="w-full h-40 bg-gradient-to-br from-primary/20 to-primary/5 rounded-t-lg flex items-center justify-center">
                        <BookOpen className="h-12 w-12 text-primary/40" />
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="font-bold text-lg line-clamp-1">{course.title}</h3>
                      <Badge variant={course.isPublished ? "default" : "secondary"}>
                        {course.isPublished ? "منشورة" : "مسودة"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {course.projectType && course.projectType !== "general" && (
                        <Badge variant="outline" className="text-xs">{PROJECT_TYPE_LABELS[course.projectType] || course.projectType}</Badge>
                      )}
                      {course.difficulty && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLORS[course.difficulty] || DIFFICULTY_COLORS.beginner}`}>
                          {DIFFICULTY_LABELS[course.difficulty] || course.difficulty}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {course.lessonCount} درس</span>
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {course.enrollmentCount} طالب</span>
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 pt-0 gap-2">
                    <Button size="sm" variant="outline" onClick={() => setLocation(`/courses/${course.id}/edit`)} data-testid={`button-edit-course-${course.id}`}>تعديل</Button>
                    <Button size="sm" variant="ghost" onClick={() => setLocation(`/courses/${course.id}`)} data-testid={`button-view-course-${course.id}`}>عرض</Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        )}

        {user && enrolled && enrolled.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-green-500" />
              دوراتي المسجلة
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {enrolled.map((course: any) => {
                const completedCount = Array.isArray(course.completedLessons) ? course.completedLessons.length : (course.completedLessons || 0);
                return (
                  <Card key={course.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation(`/courses/${course.id}`)} data-testid={`card-enrolled-course-${course.id}`}>
                    <CardHeader className="p-0">
                      {course.coverImageUrl ? (
                        <img src={course.coverImageUrl} alt={course.title} className="w-full h-40 object-cover rounded-t-lg" />
                      ) : (
                        <div className="w-full h-40 bg-gradient-to-br from-green-500/20 to-green-500/5 rounded-t-lg flex items-center justify-center">
                          <BookOpen className="h-12 w-12 text-green-500/40" />
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="p-4">
                      <h3 className="font-bold text-lg line-clamp-1 mb-1">{course.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">بواسطة {course.authorName}</p>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${course.lessonCount > 0 ? (completedCount / course.lessonCount) * 100 : 0}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{completedCount}/{course.lessonCount} درس مكتمل</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
            <h2 className="text-xl font-bold">جميع الدورات</h2>
            {availableTypes.length > 1 && (
              <div className="flex items-center gap-2 flex-wrap" data-testid="filter-project-types">
                <Button
                  size="sm"
                  variant={activeFilter === ALL_FILTER ? "default" : "outline"}
                  onClick={() => setActiveFilter(ALL_FILTER)}
                  data-testid="filter-tab-all"
                >
                  الكل
                </Button>
                {availableTypes.map((type) => (
                  <Button
                    key={type}
                    size="sm"
                    variant={activeFilter === type ? "default" : "outline"}
                    onClick={() => setActiveFilter(type)}
                    data-testid={`filter-tab-${type}`}
                  >
                    {PROJECT_TYPE_LABELS[type] || type}
                  </Button>
                ))}
              </div>
            )}
          </div>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <Skeleton className="h-40 rounded-t-lg" />
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCourses.map((course: any) => (
                <Card key={course.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation(`/courses/${course.id}`)} data-testid={`card-course-${course.id}`}>
                  <CardHeader className="p-0">
                    {course.coverImageUrl ? (
                      <img src={course.coverImageUrl} alt={course.title} className="w-full h-40 object-cover rounded-t-lg" />
                    ) : (
                      <div className="w-full h-40 bg-gradient-to-br from-primary/20 to-primary/5 rounded-t-lg flex items-center justify-center">
                        <GraduationCap className="h-12 w-12 text-primary/40" />
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-lg line-clamp-1 flex-1 min-w-0">{course.title}</h3>
                      {course.isFeatured && <Badge variant="outline" className="border-amber-500 text-amber-600 text-xs shrink-0"><Star className="h-3 w-3 ml-1 fill-amber-500" />مميزة</Badge>}
                    </div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {course.projectType && course.projectType !== "general" && (
                        <Badge variant="outline" className="text-xs" data-testid={`badge-type-${course.id}`}>{PROJECT_TYPE_LABELS[course.projectType] || course.projectType}</Badge>
                      )}
                      {course.difficulty && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLORS[course.difficulty] || DIFFICULTY_COLORS.beginner}`} data-testid={`badge-difficulty-${course.id}`}>
                          {DIFFICULTY_LABELS[course.difficulty] || course.difficulty}
                        </span>
                      )}
                    </div>
                    {course.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{course.description}</p>}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-muted-foreground">{course.authorName}</span>
                    </div>
                    {course.ratingCount > 0 && (
                      <div className="flex items-center gap-1 mb-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(course.avgRating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">({course.ratingCount})</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {course.lessonCount} درس</span>
                        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {course.enrollmentCount}</span>
                      </div>
                      <Badge variant={course.priceCents > 0 ? "default" : "secondary"}>
                        {course.priceCents > 0 ? `$${(course.priceCents / 100).toFixed(2)}` : "مجانية"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <GraduationCap className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">لا توجد دورات منشورة بعد</p>
              <p className="text-muted-foreground text-sm mt-1">كن أول من يُنشئ دورة تعليمية!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
