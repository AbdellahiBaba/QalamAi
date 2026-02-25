import { useState, useRef, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowRight, BookOpen, Users, Feather, Loader2, CheckCircle, FileText,
  Sparkles, ChevronDown, ChevronUp, PenTool, Download, Lock, CreditCard, AlertTriangle
} from "lucide-react";
import { generateNovelPDF } from "@/lib/pdf-generator";
import type { NovelProject, Character, Chapter, CharacterRelationship } from "@shared/schema";
import { getProjectPriceUSD } from "@shared/schema";

interface ProjectData extends NovelProject {
  characters: Character[];
  chapters: Chapter[];
  relationships: CharacterRelationship[];
}

export default function ProjectDetail() {
  const [, params] = useRoute("/project/:id");
  const projectId = params?.id;
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);
  const [generatingChapter, setGeneratingChapter] = useState<number | null>(null);
  const [streamedContent, setStreamedContent] = useState("");
  const [generationProgress, setGenerationProgress] = useState<{ currentPart: number; totalParts: number } | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const { data: project, isLoading } = useQuery<ProjectData>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const generateOutlineMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/outline`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: "تم إنشاء المخطط بنجاح" });
    },
    onError: (err: any) => {
      toast({ title: "حدث خطأ", description: err?.message || "فشل في إنشاء المخطط", variant: "destructive" });
    },
  });

  const [autoWriteAll, setAutoWriteAll] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("payment");
    const sessionId = params.get("session_id");

    if (paymentStatus === "success" && sessionId) {
      apiRequest("POST", `/api/projects/${projectId}/payment-success`, { sessionId })
        .then((res) => res.json())
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
          toast({ title: "تم الدفع بنجاح! يمكنك الآن بدء كتابة روايتك." });
        })
        .catch(() => {
          toast({ title: "حدث خطأ في تأكيد الدفع", variant: "destructive" });
        });
      window.history.replaceState({}, "", `/project/${projectId}`);
    } else if (paymentStatus === "cancelled") {
      toast({ title: "تم إلغاء عملية الدفع", variant: "destructive" });
      window.history.replaceState({}, "", `/project/${projectId}`);
    }
  }, [projectId]);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/create-checkout`);
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.alreadyPaid) {
        queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
        toast({ title: "المشروع مدفوع بالفعل" });
        return;
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: () => {
      toast({ title: "حدث خطأ في إنشاء جلسة الدفع", variant: "destructive" });
    },
  });

  const approveOutlineMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/outline/approve`);
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: "تمت الموافقة على المخطط — بدأت الكتابة التلقائية" });
      setAutoWriteAll(true);
    },
    onError: () => {
      toast({ title: "حدث خطأ", variant: "destructive" });
    },
  });

  const generateChapter = async (chapterId: number): Promise<boolean> => {
    setGeneratingChapter(chapterId);
    setStreamedContent("");
    setGenerationProgress(null);
    setExpandedChapter(chapterId);
    setActiveTab("chapters");

    try {
      const res = await fetch(`/api/projects/${projectId}/chapters/${chapterId}/generate`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to generate chapter");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.content) {
              fullContent += event.content;
              setStreamedContent(fullContent);
            }
            if (event.totalParts && event.currentPart) {
              setGenerationProgress({ currentPart: event.currentPart, totalParts: event.totalParts });
            }
            if (event.done) {
              queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
              setGenerationProgress(null);
            }
            if (event.error) {
              throw new Error(event.error);
            }
          } catch (e) {
            if (e instanceof Error && e.message !== "Failed to generate chapter") throw e;
          }
        }
      }
      return true;
    } catch (err: any) {
      toast({ title: err?.message || "حدث خطأ في كتابة الفصل", variant: "destructive" });
      return false;
    } finally {
      setGeneratingChapter(null);
      setGenerationProgress(null);
    }
  };

  useEffect(() => {
    if (!autoWriteAll || !project?.chapters || generatingChapter) return;

    const pendingChapters = project.chapters
      .filter(c => c.status !== "completed")
      .sort((a, b) => a.chapterNumber - b.chapterNumber);

    if (pendingChapters.length === 0) {
      setAutoWriteAll(false);
      toast({ title: "تم الانتهاء من كتابة جميع الفصول!" });
      return;
    }

    const nextChapter = pendingChapters[0];
    generateChapter(nextChapter.id).then((success) => {
      if (!success) {
        setAutoWriteAll(false);
      }
    });
  }, [autoWriteAll, project?.chapters, generatingChapter]);

  useEffect(() => {
    if (contentRef.current && streamedContent) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [streamedContent]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-3">
            <Skeleton className="w-9 h-9" />
            <Skeleton className="w-48 h-6" />
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-10">
          <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-48 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <h2 className="font-serif text-2xl font-bold mb-4">المشروع غير موجود</h2>
          <Link href="/"><Button>العودة للرئيسية</Button></Link>
        </div>
      </div>
    );
  }

  const roleLabel = (role: string) => {
    const roles: Record<string, string> = {
      protagonist: "بطل رئيسي",
      love_interest: "الحبيب / الحبيبة",
      antagonist: "شخصية معارضة",
      anti_hero: "بطل مضاد",
      mentor: "المرشد / المعلم",
      sidekick: "الصديق المقرب",
      comic_relief: "شخصية فكاهية",
      secondary: "شخصية ثانوية",
      mysterious: "شخصية غامضة",
      villain: "الشرير",
      wise_elder: "الحكيم / الشيخ",
      child: "طفل",
      narrator: "راوٍ",
      tragic: "شخصية مأساوية",
      rebel: "المتمرد",
      guardian: "الحامي / الوصي",
      trickster: "المحتال / الماكر",
      healer: "المعالج / الطبيب",
      outcast: "المنبوذ / المنعزل",
      diplomat: "الدبلوماسي / الوسيط",
      scholar: "العالم / الباحث",
      warrior: "المحارب / الفارس",
      prophet: "النبي / صاحب الرؤيا",
      servant: "الخادم / التابع",
      merchant: "التاجر",
      artist: "الفنان / الأديب",
      spy: "الجاسوس",
      mother_figure: "الأم",
      father_figure: "الأب",
      orphan: "اليتيم",
      lover_betrayed: "العاشق المخدوع",
      avenger: "المنتقم",
      dreamer: "الحالم",
      survivor: "الناجي",
      tyrant: "الطاغية",
      refugee: "اللاجئ / المهاجر",
      detective: "المحقق",
      rival: "المنافس / الغريم",
      shapeshifter: "المتلوّن",
      scapegoat: "كبش الفداء",
      confessor: "حامل الأسرار",
      wife: "الزوجة",
      husband: "الزوج",
      first_wife: "الزوجة الأولى",
      second_wife: "الزوجة الثانية",
      ex_wife: "الزوجة السابقة",
      ex_husband: "الزوج السابق",
      fiancee: "الخطيبة",
      fiance: "الخطيب",
      sister: "الأخت",
      brother: "الأخ",
      daughter: "الابنة",
      son: "الابن",
      grandmother: "الجدة",
      grandfather: "الجد",
      uncle: "العم / الخال",
      aunt: "العمة / الخالة",
      cousin_male: "ابن العم",
      cousin_female: "بنت العم",
      mother_in_law: "الحماة",
      father_in_law: "الحمو",
      stepmother: "زوجة الأب",
      stepfather: "زوج الأم",
      neighbor: "الجار / الجارة",
      best_friend: "الصديق الحميم",
      secret_lover: "الحبيب السري",
      forbidden_love: "الحب المحرّم",
      widow: "الأرملة",
      widower: "الأرمل",
    };
    return roles[role] || role;
  };

  const povLabel = (pov: string) => {
    switch (pov) {
      case "first_person": return "ضمير المتكلم";
      case "third_person": return "ضمير الغائب";
      case "omniscient": return "الراوي العليم";
      case "multiple": return "تعدد الأصوات";
      default: return pov;
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back-home">
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Feather className="w-5 h-5 text-primary" />
              <span className="font-serif text-lg font-bold line-clamp-1" data-testid="text-project-name">
                {project.title}
              </span>
            </div>
          </div>
          {project.chapters?.every(c => c.status === "completed") && project.chapters.length > 0 && (
            <Button
              size="sm"
              onClick={async () => {
                setIsDownloading(true);
                try {
                  await generateNovelPDF({
                    title: project.title,
                    chapters: project.chapters
                      .sort((a, b) => a.chapterNumber - b.chapterNumber)
                      .map(c => ({
                        chapterNumber: c.chapterNumber,
                        title: c.title,
                        content: c.content,
                      })),
                  });
                  toast({ title: "تم تحميل الرواية بنجاح" });
                } catch {
                  toast({ title: "حدث خطأ في إنشاء ملف PDF", variant: "destructive" });
                } finally {
                  setIsDownloading(false);
                }
              }}
              disabled={isDownloading}
              data-testid="button-download-pdf"
            >
              {isDownloading ? (
                <><Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> جارٍ التحميل...</>
              ) : (
                <><Download className="w-4 h-4 ml-1.5" /> تحميل PDF</>
              )}
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {!project.paid && (
          <Card className="mb-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                  <Lock className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1 space-y-3">
                  <h3 className="font-serif text-lg font-semibold text-red-800 dark:text-red-300" data-testid="text-payment-required">
                    الرجاء إتمام الدفع لبدء كتابة الرواية
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-400">
                    هذا المشروع مقفل. يجب إتمام الدفع قبل أن تتمكن من إنشاء المخطط وكتابة الفصول.
                  </p>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="text-2xl font-bold text-red-800 dark:text-red-300" data-testid="text-project-price">
                      {getProjectPriceUSD(project.pageCount)} دولار
                    </div>
                    <span className="text-sm text-red-600 dark:text-red-400">
                      ({project.pageCount} صفحة — {project.allowedWords.toLocaleString()} كلمة)
                    </span>
                  </div>
                  <Button
                    onClick={() => checkoutMutation.mutate()}
                    disabled={checkoutMutation.isPending}
                    className="bg-red-600 hover:bg-red-700 text-white"
                    data-testid="button-pay-project"
                  >
                    {checkoutMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جارٍ المعالجة...</>
                    ) : (
                      <><CreditCard className="w-4 h-4 ml-2" /> إتمام الدفع</>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {project.paid && project.allowedWords > 0 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="text-sm font-medium" data-testid="text-words-counter">
                  عدد الكلمات المتبقية: {(project.allowedWords - project.usedWords).toLocaleString()} من {project.allowedWords.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">
                  {Math.round((project.usedWords / project.allowedWords) * 100)}%
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, (project.usedWords / project.allowedWords) * 100)}%` }}
                  data-testid="progress-words"
                />
              </div>
              {project.usedWords >= project.allowedWords && (
                <div className="flex items-center gap-2 mt-3 text-sm text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span data-testid="text-word-limit-reached">تم الوصول إلى الحد الأقصى للكلمات لهذه الرواية.</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <BookOpen className="w-4 h-4 ml-1.5" />
              نظرة عامة
            </TabsTrigger>
            <TabsTrigger value="characters" data-testid="tab-characters">
              <Users className="w-4 h-4 ml-1.5" />
              الشخصيات
            </TabsTrigger>
            <TabsTrigger value="chapters" data-testid="tab-chapters">
              <FileText className="w-4 h-4 ml-1.5" />
              الفصول
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-serif text-lg font-semibold">تفاصيل الرواية</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">الزمان:</span>
                      <span className="font-medium">{project.timeSetting}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">المكان:</span>
                      <span className="font-medium">{project.placeSetting}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">نوع السرد:</span>
                      <span className="font-medium">{povLabel(project.narrativePov)}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">حجم الرواية:</span>
                      <span className="font-medium">{project.pageCount} صفحة (~{(project.pageCount * 250).toLocaleString()} كلمة)</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">عدد الشخصيات:</span>
                      <span className="font-medium">{project.characters?.length || 0}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">عدد الفصول:</span>
                      <span className="font-medium">{project.chapters?.length || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-serif text-lg font-semibold">الفكرة الرئيسية</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{project.mainIdea}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-serif text-lg font-semibold">المخطط التفصيلي</h3>
                  {!project.outline && (
                    <Button
                      onClick={() => generateOutlineMutation.mutate()}
                      disabled={generateOutlineMutation.isPending || !project.paid}
                      data-testid="button-generate-outline"
                    >
                      {generateOutlineMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                          جاري إنشاء المخطط...
                        </>
                      ) : !project.paid ? (
                        <>
                          <Lock className="w-4 h-4 ml-2" />
                          إنشاء المخطط (يتطلب الدفع)
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 ml-2" />
                          إنشاء المخطط
                        </>
                      )}
                    </Button>
                  )}
                  {project.outline && !project.outlineApproved && (
                    <Button
                      onClick={() => approveOutlineMutation.mutate()}
                      disabled={approveOutlineMutation.isPending || !project.paid}
                      data-testid="button-approve-outline"
                    >
                      {approveOutlineMutation.isPending ? (
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 ml-2" />
                      )}
                      الموافقة على المخطط
                    </Button>
                  )}
                  {project.outlineApproved === 1 && (
                    <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      تمت الموافقة
                    </span>
                  )}
                </div>
                {project.outline ? (
                  <div className="font-serif text-sm leading-loose whitespace-pre-wrap border-t pt-4">
                    {project.outline}
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <PenTool className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>لم يتم إنشاء المخطط بعد. اضغط على "إنشاء المخطط" للبدء</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="characters" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {project.characters?.map((char) => (
                <Card key={char.id}>
                  <CardContent className="p-6 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-serif text-lg font-semibold" data-testid={`text-char-${char.id}`}>
                        {char.name}
                      </h3>
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                        {roleLabel(char.role)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{char.background}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {project.relationships && project.relationships.length > 0 && (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-serif text-lg font-semibold">العلاقات</h3>
                  <div className="space-y-3">
                    {project.relationships.map((rel) => {
                      const c1 = project.characters?.find(c => c.id === rel.character1Id);
                      const c2 = project.characters?.find(c => c.id === rel.character2Id);
                      return (
                        <div key={rel.id} className="flex items-center gap-3 text-sm">
                          <span className="font-medium">{c1?.name}</span>
                          <span className="text-muted-foreground">—</span>
                          <span className="text-primary">{rel.relationship}</span>
                          <span className="text-muted-foreground">—</span>
                          <span className="font-medium">{c2?.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="chapters" className="space-y-4">
            {!project.outlineApproved ? (
              <div className="text-center py-16 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <h3 className="font-serif text-xl font-semibold mb-2 text-foreground">يجب الموافقة على المخطط أولاً</h3>
                <p>قم بإنشاء المخطط والموافقة عليه من تبويب "نظرة عامة" قبل البدء بكتابة الفصول</p>
              </div>
            ) : project.chapters && project.chapters.length > 0 ? (
              <>
                {(() => {
                  const completedCount = project.chapters.filter(c => c.status === "completed").length;
                  const totalCount = project.chapters.length;
                  const hasRemaining = completedCount < totalCount;
                  return (
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          {completedCount}/{totalCount} فصل مكتمل
                        </span>
                        <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${(completedCount / totalCount) * 100}%` }}
                          />
                        </div>
                      </div>
                      {hasRemaining && !generatingChapter && (
                        <Button
                          size="sm"
                          onClick={() => setAutoWriteAll(true)}
                          disabled={autoWriteAll || !project.paid || project.usedWords >= project.allowedWords}
                          data-testid="button-write-all-chapters"
                        >
                          {autoWriteAll ? (
                            <><Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" /> جارٍ الكتابة...</>
                          ) : (
                            <><Sparkles className="w-3.5 h-3.5 ml-1" /> اكتب جميع الفصول</>
                          )}
                        </Button>
                      )}
                      {autoWriteAll && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAutoWriteAll(false)}
                          data-testid="button-stop-writing"
                        >
                          إيقاف
                        </Button>
                      )}
                    </div>
                  );
                })()}
              {project.chapters.map((chapter) => {
                const isExpanded = expandedChapter === chapter.id;
                const isGenerating = generatingChapter === chapter.id;
                const displayContent = isGenerating ? streamedContent : chapter.content;

                return (
                  <Card key={chapter.id}>
                    <CardContent className="p-0">
                      <button
                        type="button"
                        className="w-full p-6 flex items-center justify-between gap-4 text-right"
                        onClick={() => setExpandedChapter(isExpanded ? null : chapter.id)}
                        data-testid={`button-chapter-${chapter.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                            {chapter.chapterNumber}
                          </span>
                          <div className="text-right">
                            <h4 className="font-serif font-semibold">{chapter.title}</h4>
                            {chapter.summary && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{chapter.summary}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {chapter.status === "completed" && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                          {chapter.status === "incomplete" && !isGenerating && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                              غير مكتمل
                            </span>
                          )}
                          {chapter.status === "generating" && !isGenerating && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                              قيد الكتابة
                            </span>
                          )}
                          {(!chapter.content || chapter.status === "incomplete" || chapter.status === "generating") && !isGenerating && (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={!project.paid || project.usedWords >= project.allowedWords}
                              onClick={(e) => {
                                e.stopPropagation();
                                generateChapter(chapter.id);
                              }}
                              data-testid={`button-write-chapter-${chapter.id}`}
                            >
                              <Feather className="w-3.5 h-3.5 ml-1" />
                              {chapter.content ? "أكمل الكتابة" : "اكتب الفصل"}
                            </Button>
                          )}
                          {isGenerating && (
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin text-primary" />
                              {generationProgress && generationProgress.totalParts > 1 && (
                                <span className="text-xs text-muted-foreground">
                                  جزء {generationProgress.currentPart}/{generationProgress.totalParts}
                                </span>
                              )}
                            </div>
                          )}
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </button>
                      {isExpanded && displayContent && (
                        <div className="border-t">
                          <ScrollArea className="max-h-[600px]" ref={contentRef}>
                            <div className="p-8 font-serif text-base leading-[2.2] whitespace-pre-wrap">
                              {displayContent}
                            </div>
                          </ScrollArea>
                          {chapter.status === "incomplete" && !isGenerating && (
                            <div className="border-t p-4 bg-yellow-50 dark:bg-yellow-900/10 text-center">
                              <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-2">
                                هذا الفصل لم يكتمل بعد. يمكنك إعادة كتابته للحصول على النسخة الكاملة.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              </>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>لا توجد فصول بعد</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
