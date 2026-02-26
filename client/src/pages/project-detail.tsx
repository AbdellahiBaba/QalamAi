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
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  ArrowRight, BookOpen, Users, Feather, Loader2, CheckCircle, FileText,
  Sparkles, ChevronDown, ChevronUp, PenTool, Download, Lock, CreditCard,
  RefreshCw, Pencil, Save, X, Eye, ImagePlus, UserPlus, Plus, RotateCcw, History,
  Share2, Copy, LinkIcon
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { generateChapterPreviewPDF } from "@/lib/pdf-generator";
import { useAuth } from "@/hooks/use-auth";
import type { NovelProject, Character, Chapter, CharacterRelationship, ChapterVersion } from "@shared/schema";
import { getProjectPriceUSD, userPlanCoversType } from "@shared/schema";

interface ProjectData extends NovelProject {
  characters: Character[];
  chapters: Chapter[];
  relationships: CharacterRelationship[];
}

function getTypeLabels(projectType?: string) {
  if (projectType === "essay") {
    return {
      chaptersLabel: "الأقسام",
      chapterSingular: "القسم",
      outlineLabel: "الهيكل",
      typeLabel: "مقال",
      writeAll: "اكتب جميع الأقسام",
      writeOne: "اكتب هذا القسم",
      createOutline: "إنشاء الهيكل",
      outlineCreating: "جاري إنشاء الهيكل...",
      approveOutline: "الموافقة على الهيكل",
      noOutline: "لم يتم إنشاء الهيكل بعد. اضغط على \"إنشاء الهيكل\" للبدء",
      mustApprove: "يجب الموافقة على الهيكل أولاً",
      mustApproveDesc: "قم بإنشاء الهيكل والموافقة عليه من تبويب \"نظرة عامة\" قبل البدء بكتابة الأقسام",
      lockedMsg: "هذا المشروع مقفل. يجب إتمام الدفع قبل أن تتمكن من إنشاء الهيكل وكتابة الأقسام.",
      paymentDesc: "إتمام الدفع للبدء بكتابة المقال",
      allDone: "تم الانتهاء من كتابة جميع الأقسام!",
    };
  }
  if (projectType === "scenario") {
    return {
      chaptersLabel: "المشاهد",
      chapterSingular: "المشهد",
      outlineLabel: "المخطط الدرامي",
      typeLabel: "سيناريو",
      writeAll: "اكتب جميع المشاهد",
      writeOne: "اكتب هذا المشهد",
      createOutline: "إنشاء المخطط الدرامي",
      outlineCreating: "جاري إنشاء المخطط الدرامي...",
      approveOutline: "الموافقة على المخطط الدرامي",
      noOutline: "لم يتم إنشاء المخطط الدرامي بعد. اضغط على \"إنشاء المخطط الدرامي\" للبدء",
      mustApprove: "يجب الموافقة على المخطط الدرامي أولاً",
      mustApproveDesc: "قم بإنشاء المخطط الدرامي والموافقة عليه من تبويب \"نظرة عامة\" قبل البدء بكتابة المشاهد",
      lockedMsg: "هذا المشروع مقفل. يجب إتمام الدفع قبل أن تتمكن من إنشاء المخطط وكتابة المشاهد.",
      paymentDesc: "إتمام الدفع للبدء بكتابة السيناريو",
      allDone: "تم الانتهاء من كتابة جميع المشاهد!",
    };
  }
  return {
    chaptersLabel: "الفصول",
    chapterSingular: "الفصل",
    outlineLabel: "المخطط التفصيلي",
    typeLabel: "رواية",
    writeAll: "اكتب جميع الفصول",
    writeOne: "اكتب هذا الفصل",
    createOutline: "إنشاء المخطط",
    outlineCreating: "جاري إنشاء المخطط...",
    approveOutline: "الموافقة على المخطط",
    noOutline: "لم يتم إنشاء المخطط بعد. اضغط على \"إنشاء المخطط\" للبدء",
    mustApprove: "يجب الموافقة على المخطط أولاً",
    mustApproveDesc: "قم بإنشاء المخطط والموافقة عليه من تبويب \"نظرة عامة\" قبل البدء بكتابة الفصول",
    lockedMsg: "هذا المشروع مقفل. يجب إتمام الدفع قبل أن تتمكن من إنشاء المخطط وكتابة الفصول.",
    paymentDesc: "إتمام الدفع للبدء بكتابة الرواية",
    allDone: "تم الانتهاء من كتابة جميع الفصول!",
  };
}

export default function ProjectDetail() {
  const [, params] = useRoute("/project/:id");
  const projectId = params?.id;
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const FREE_ACCESS_IDS = ["39706084", "e482facd-d157-4e97-ad91-af96b8ec8f49"];
  const hasFreeAccess = !!(authUser && FREE_ACCESS_IDS.includes(authUser.id));
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);
  const [generatingChapter, setGeneratingChapter] = useState<number | null>(null);
  const [streamedContent, setStreamedContent] = useState("");
  const [generationProgress, setGenerationProgress] = useState<{ currentPart: number; totalParts: number } | null>(null);
  const [confirmRegenerate, setConfirmRegenerate] = useState<number | null>(null);
  const [editingChapter, setEditingChapter] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [confirmOutlineRegen, setConfirmOutlineRegen] = useState(false);
  const [suggestedChars, setSuggestedChars] = useState<Array<{ name: string; role: string; background: string; traits: string }>>([]);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [rewriteChapterId, setRewriteChapterId] = useState<number | null>(null);
  const [rewriteContent, setRewriteContent] = useState("");
  const [rewriteTone, setRewriteTone] = useState("formal");
  const [customTone, setCustomTone] = useState("");
  const [rewrittenResult, setRewrittenResult] = useState<string | null>(null);
  const [versionHistoryChapterId, setVersionHistoryChapterId] = useState<number | null>(null);
  const [confirmRestoreVersion, setConfirmRestoreVersion] = useState<{ chapterId: number; versionId: number } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const { data: project, isLoading } = useQuery<ProjectData>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: planData } = useQuery<{ plan: string; planPurchasedAt: string | null }>({
    queryKey: ["/api/user/plan"],
    enabled: !!authUser,
  });

  const planCoversProject = userPlanCoversType(planData?.plan, project?.projectType || "novel");
  const hasAccess = hasFreeAccess || planCoversProject || !!project?.paid;

  const labels = getTypeLabels(project?.projectType);

  const generateOutlineMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/outline`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: `تم إنشاء ${labels.outlineLabel} بنجاح` });
    },
    onError: (err: any) => {
      toast({ title: "حدث خطأ", description: err?.message || `فشل في إنشاء ${labels.outlineLabel}`, variant: "destructive" });
    },
  });

  const saveChapterMutation = useMutation({
    mutationFn: async ({ chapterId, content }: { chapterId: number; content: string }) => {
      const res = await apiRequest("PATCH", `/api/projects/${projectId}/chapters/${chapterId}`, { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: "تم حفظ التعديلات" });
      setEditingChapter(null);
    },
    onError: () => {
      toast({ title: "فشل في حفظ التعديلات", variant: "destructive" });
    },
  });

  const suggestCharsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/suggest-characters`);
      return res.json();
    },
    onSuccess: (data: any) => {
      setSuggestedChars(data);
    },
    onError: () => {
      toast({ title: "فشل في اقتراح الشخصيات", variant: "destructive" });
    },
  });

  const addCharacterMutation = useMutation({
    mutationFn: async (char: { name: string; role: string; background: string }) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/characters`, char);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: "تمت إضافة الشخصية" });
    },
    onError: () => {
      toast({ title: "فشل في إضافة الشخصية", variant: "destructive" });
    },
  });

  const rewriteMutation = useMutation({
    mutationFn: async ({ chapterId, content, tone }: { chapterId: number; content: string; tone: string }) => {
      const res = await apiRequest("POST", `/api/chapters/${chapterId}/rewrite`, { content, tone });
      return res.json();
    },
    onSuccess: (data: any) => {
      setRewrittenResult(data.rewrittenContent);
    },
    onError: (err: any) => {
      toast({ title: err?.message || "فشل في إعادة كتابة النص", variant: "destructive" });
    },
  });

  const { data: chapterVersions, isLoading: isLoadingVersions } = useQuery<ChapterVersion[]>({
    queryKey: ["/api/chapters", versionHistoryChapterId, "versions"],
    enabled: !!versionHistoryChapterId,
  });

  const restoreVersionMutation = useMutation({
    mutationFn: async ({ chapterId, versionId }: { chapterId: number; versionId: number }) => {
      const res = await apiRequest("POST", `/api/chapters/${chapterId}/versions/${versionId}/restore`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/chapters", versionHistoryChapterId, "versions"] });
      toast({ title: "تم استعادة النسخة بنجاح" });
      setConfirmRestoreVersion(null);
    },
    onError: () => {
      toast({ title: "فشل في استعادة النسخة", variant: "destructive" });
      setConfirmRestoreVersion(null);
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

  const attemptGenerateChapter = async (chapterId: number): Promise<boolean> => {
    setStreamedContent("");
    setGenerationProgress(null);

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
  };

  const generateChapter = async (chapterId: number): Promise<boolean> => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 2000;

    setGeneratingChapter(chapterId);
    setExpandedChapter(chapterId);
    setActiveTab("chapters");

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const success = await attemptGenerateChapter(chapterId);
        if (success) {
          setGeneratingChapter(null);
          setGenerationProgress(null);
          return true;
        }
      } catch (err: any) {
        if (attempt < MAX_RETRIES) {
          toast({
            title: `إعادة المحاولة... (${attempt + 1}/${MAX_RETRIES})`,
            description: err?.message || "حدث خطأ، جاري إعادة المحاولة",
          });
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        } else {
          toast({
            title: "فشلت جميع المحاولات",
            description: err?.message || "حدث خطأ في كتابة الفصل بعد عدة محاولات",
            variant: "destructive",
          });
          setAutoWriteAll(false);
          setGeneratingChapter(null);
          setGenerationProgress(null);
          return false;
        }
      }
    }

    setGeneratingChapter(null);
    setGenerationProgress(null);
    return false;
  };

  useEffect(() => {
    if (!autoWriteAll || !project?.chapters || generatingChapter) return;

    const pendingChapters = project.chapters
      .filter(c => c.status !== "completed")
      .sort((a, b) => a.chapterNumber - b.chapterNumber);

    if (pendingChapters.length === 0) {
      setAutoWriteAll(false);
      toast({ title: labels.allDone });
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
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center gap-3">
            <Skeleton className="w-9 h-9" />
            <Skeleton className="w-48 h-6" />
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back-home">
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2 min-w-0">
              <Feather className="w-5 h-5 text-primary shrink-0" />
              <span className="font-serif text-base sm:text-lg font-bold line-clamp-1" data-testid="text-project-name">
                {project.title}
              </span>
            </div>
          </div>
          {project.chapters?.every(c => c.status === "completed") && project.chapters.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                onClick={() => {
                  window.open(`/api/projects/${projectId}/export/pdf`, "_blank");
                }}
                data-testid="button-download-pdf"
              >
                <Download className="w-4 h-4 sm:ml-1.5" /> <span className="hidden sm:inline">تحميل PDF</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  window.open(`/api/projects/${projectId}/export/epub`, "_blank");
                }}
                data-testid="button-download-epub"
              >
                <Download className="w-4 h-4 sm:ml-1.5" /> <span className="hidden sm:inline">تحميل EPUB</span>
              </Button>
              {project.shareToken ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const url = `${window.location.origin}/shared/${project.shareToken}`;
                    navigator.clipboard.writeText(url);
                    toast({ title: "تم نسخ رابط المشاركة" });
                  }}
                  data-testid="button-copy-share-link"
                >
                  <Copy className="w-4 h-4 sm:ml-1.5" /> <span className="hidden sm:inline">نسخ الرابط</span>
                </Button>
              ) : null}
              <Button
                size="sm"
                variant={project.shareToken ? "destructive" : "secondary"}
                onClick={async () => {
                  try {
                    if (project.shareToken) {
                      await apiRequest("DELETE", `/api/projects/${projectId}/share`);
                      toast({ title: "تم إلغاء المشاركة" });
                    } else {
                      await apiRequest("POST", `/api/projects/${projectId}/share`);
                      toast({ title: "تم إنشاء رابط المشاركة" });
                    }
                    queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
                  } catch {
                    toast({ title: "حدث خطأ", variant: "destructive" });
                  }
                }}
                data-testid="button-toggle-share"
              >
                {project.shareToken ? (
                  <><X className="w-4 h-4 sm:ml-1.5" /> <span className="hidden sm:inline">إلغاء المشاركة</span></>
                ) : (
                  <><Share2 className="w-4 h-4 sm:ml-1.5" /> <span className="hidden sm:inline">مشاركة</span></>
                )}
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {!hasAccess && (
          <Card className="mb-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                  <Lock className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1 space-y-3">
                  <h3 className="font-serif text-lg font-semibold text-red-800 dark:text-red-300" data-testid="text-payment-required">
                    {labels.paymentDesc}
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-400">
                    {labels.lockedMsg}
                  </p>
                  {project.projectType === "novel" || !project.projectType ? (
                    <>
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="text-2xl font-bold text-red-800 dark:text-red-300" data-testid="text-project-price">
                          {getProjectPriceUSD(project.pageCount)} دولار
                        </div>
                        <span className="text-sm text-red-600 dark:text-red-400">
                          ({project.pageCount} صفحة)
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <Button
                          onClick={() => checkoutMutation.mutate()}
                          disabled={checkoutMutation.isPending}
                          className="bg-red-600 hover:bg-red-700 text-white"
                          data-testid="button-pay-project"
                        >
                          {checkoutMutation.isPending ? (
                            <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جارٍ المعالجة...</>
                          ) : (
                            <><CreditCard className="w-4 h-4 ml-2" /> دفع لهذا المشروع</>
                          )}
                        </Button>
                        <Link href="/pricing">
                          <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50" data-testid="button-view-plans">
                            أو احصل على الخطة الشاملة
                          </Button>
                        </Link>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-3 flex-wrap">
                      <Link href="/pricing">
                        <Button
                          className="bg-red-600 hover:bg-red-700 text-white"
                          data-testid="button-buy-plan"
                        >
                          <CreditCard className="w-4 h-4 ml-2" />
                          {project.projectType === "essay" ? "اشتري خطة المقالات" : "اشتري خطة السيناريوهات"}
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {project.paid && project.usedWords > 0 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <PenTool className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium" data-testid="text-words-counter">
                  عدد الكلمات المكتوبة: {project.usedWords.toLocaleString()} كلمة
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full max-w-full sm:max-w-md ${project.projectType === "essay" ? "grid-cols-2" : "grid-cols-3"}`}>
            <TabsTrigger value="overview" data-testid="tab-overview">
              <BookOpen className="w-4 h-4 ml-1.5" />
              نظرة عامة
            </TabsTrigger>
            {project.projectType !== "essay" && (
              <TabsTrigger value="characters" data-testid="tab-characters">
                <Users className="w-4 h-4 ml-1.5" />
                الشخصيات
              </TabsTrigger>
            )}
            <TabsTrigger value="chapters" data-testid="tab-chapters">
              <FileText className="w-4 h-4 ml-1.5" />
              {labels.chaptersLabel}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {project.coverImageUrl && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex justify-center">
                    <img
                      src={project.coverImageUrl}
                      alt={`غلاف ${project.title}`}
                      className="max-h-96 rounded-lg shadow-lg"
                      data-testid="img-cover"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-4 sm:p-6 space-y-4">
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
                      <span className="text-muted-foreground">عدد {labels.chaptersLabel}:</span>
                      <span className="font-medium">{project.chapters?.length || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 sm:p-6 space-y-4">
                  <h3 className="font-serif text-lg font-semibold">الفكرة الرئيسية</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{project.mainIdea}</p>
                  {!project.coverImageUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isGeneratingCover}
                      onClick={async () => {
                        setIsGeneratingCover(true);
                        try {
                          const res = await apiRequest("POST", `/api/projects/${projectId}/generate-cover`);
                          await res.json();
                          queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
                          toast({ title: "تم إنشاء غلاف الرواية" });
                        } catch {
                          toast({ title: "فشل في إنشاء الغلاف", variant: "destructive" });
                        } finally {
                          setIsGeneratingCover(false);
                        }
                      }}
                      data-testid="button-generate-cover"
                    >
                      {isGeneratingCover ? (
                        <><Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" /> جارٍ إنشاء الغلاف...</>
                      ) : (
                        <><ImagePlus className="w-3.5 h-3.5 ml-1" /> إنشاء غلاف الرواية</>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-serif text-lg font-semibold">{labels.outlineLabel}</h3>
                  {!project.outline && (
                    <Button
                      onClick={() => generateOutlineMutation.mutate()}
                      disabled={generateOutlineMutation.isPending || (!hasAccess)}
                      data-testid="button-generate-outline"
                    >
                      {generateOutlineMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                          {labels.outlineCreating}
                        </>
                      ) : (!hasAccess) ? (
                        <>
                          <Lock className="w-4 h-4 ml-2" />
                          {labels.createOutline} (يتطلب الدفع)
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 ml-2" />
                          {labels.createOutline}
                        </>
                      )}
                    </Button>
                  )}
                  {project.outline && !project.outlineApproved && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {!confirmOutlineRegen ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConfirmOutlineRegen(true)}
                          disabled={generateOutlineMutation.isPending}
                          data-testid="button-regenerate-outline"
                        >
                          <RefreshCw className="w-3.5 h-3.5 ml-1" />
                          إعادة إنشاء
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">متأكد؟</span>
                          <Button size="sm" variant="destructive" onClick={() => { setConfirmOutlineRegen(false); generateOutlineMutation.mutate(); }} data-testid="button-confirm-regen-outline">
                            نعم
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setConfirmOutlineRegen(false)} data-testid="button-cancel-regen-outline">
                            لا
                          </Button>
                        </div>
                      )}
                      <Button
                        onClick={() => approveOutlineMutation.mutate()}
                        disabled={approveOutlineMutation.isPending || (!hasAccess)}
                        data-testid="button-approve-outline"
                      >
                        {approveOutlineMutation.isPending ? (
                          <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4 ml-2" />
                        )}
                        {labels.approveOutline}
                      </Button>
                    </div>
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
                    <p>{labels.noOutline}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="characters" className="space-y-6">
            <div className="flex items-center justify-between gap-4 mb-2">
              <h3 className="font-serif text-lg font-semibold">الشخصيات ({project.characters?.length || 0})</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => suggestCharsMutation.mutate()}
                disabled={suggestCharsMutation.isPending}
                data-testid="button-suggest-characters"
              >
                {suggestCharsMutation.isPending ? (
                  <><Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" /> جارٍ الاقتراح...</>
                ) : (
                  <><Sparkles className="w-3.5 h-3.5 ml-1" /> اقتراح شخصيات</>
                )}
              </Button>
            </div>

            {suggestedChars.length > 0 && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-serif font-semibold flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      اقتراحات أبو هاشم
                    </h4>
                    <Button variant="ghost" size="sm" onClick={() => setSuggestedChars([])} data-testid="button-dismiss-suggestions">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {suggestedChars.map((char, i) => (
                      <div key={i} className="p-4 rounded-lg bg-background space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-serif font-semibold">{char.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{char.role}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{char.background}</p>
                        {char.traits && <p className="text-xs text-primary/80">{char.traits}</p>}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            addCharacterMutation.mutate({ name: char.name, role: char.role, background: char.background });
                            setSuggestedChars(prev => prev.filter((_, idx) => idx !== i));
                          }}
                          data-testid={`button-add-suggested-char-${i}`}
                        >
                          <Plus className="w-3 h-3 ml-1" />
                          إضافة
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <h3 className="font-serif text-xl font-semibold mb-2 text-foreground">{labels.mustApprove}</h3>
                <p>{labels.mustApproveDesc}</p>
              </div>
            ) : project.chapters && project.chapters.length > 0 ? (
              <>
                {(() => {
                  const completedCount = project.chapters.filter(c => c.status === "completed").length;
                  const totalCount = project.chapters.length;
                  const hasRemaining = completedCount < totalCount;
                  return (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          {completedCount}/{totalCount} {labels.chapterSingular} مكتمل
                        </span>
                        <div className="w-24 sm:w-32 h-2 rounded-full bg-muted overflow-hidden">
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
                          disabled={autoWriteAll || (!hasAccess)}
                          data-testid="button-write-all-chapters"
                        >
                          {autoWriteAll ? (
                            <><Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" /> جارٍ الكتابة...</>
                          ) : (
                            <><Sparkles className="w-3.5 h-3.5 ml-1" /> {labels.writeAll}</>
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
                        className="w-full p-4 sm:p-6 flex items-center justify-between gap-2 sm:gap-4 text-right"
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
                            <>
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              {!isGenerating && confirmRegenerate !== chapter.id && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmRegenerate(chapter.id);
                                  }}
                                  data-testid={`button-regenerate-chapter-${chapter.id}`}
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  إعادة كتابة
                                </Button>
                              )}
                              {confirmRegenerate === chapter.id && !isGenerating && (
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  <span className="text-xs text-muted-foreground">متأكد؟</span>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="text-xs h-7 px-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmRegenerate(null);
                                      generateChapter(chapter.id);
                                    }}
                                    data-testid={`button-confirm-regenerate-${chapter.id}`}
                                  >
                                    نعم
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-xs h-7 px-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmRegenerate(null);
                                    }}
                                    data-testid={`button-cancel-regenerate-${chapter.id}`}
                                  >
                                    لا
                                  </Button>
                                </div>
                              )}
                            </>
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
                              disabled={(!hasAccess)}
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
                          {editingChapter === chapter.id ? (
                            <div className="p-4 space-y-3">
                              <Textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="min-h-[400px] font-serif text-base leading-[2.2] resize-y"
                                dir="rtl"
                                data-testid={`textarea-edit-chapter-${chapter.id}`}
                              />
                              <div className="flex items-center gap-2 justify-end">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingChapter(null)}
                                  data-testid={`button-cancel-edit-${chapter.id}`}
                                >
                                  <X className="w-3.5 h-3.5 ml-1" />
                                  إلغاء
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => saveChapterMutation.mutate({ chapterId: chapter.id, content: editContent })}
                                  disabled={saveChapterMutation.isPending}
                                  data-testid={`button-save-edit-${chapter.id}`}
                                >
                                  {saveChapterMutation.isPending ? (
                                    <Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" />
                                  ) : (
                                    <Save className="w-3.5 h-3.5 ml-1" />
                                  )}
                                  حفظ
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <ScrollArea className="max-h-[60vh] sm:max-h-[600px]" ref={contentRef}>
                                <div className="p-4 sm:p-8 font-serif text-sm sm:text-base leading-[2] sm:leading-[2.2] whitespace-pre-wrap">
                                  {displayContent}
                                </div>
                              </ScrollArea>
                              {chapter.status === "completed" && !isGenerating && (
                                <div className="border-t p-3 flex items-center justify-end gap-2 flex-wrap">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        const url = await generateChapterPreviewPDF({
                                          chapterNumber: chapter.chapterNumber,
                                          title: chapter.title,
                                          content: chapter.content,
                                        });
                                        setPreviewPdfUrl(url);
                                      } catch {
                                        toast({ title: "فشل في إنشاء معاينة PDF", variant: "destructive" });
                                      }
                                    }}
                                    data-testid={`button-preview-pdf-${chapter.id}`}
                                  >
                                    <Eye className="w-3.5 h-3.5 ml-1" />
                                    معاينة PDF
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setVersionHistoryChapterId(chapter.id);
                                    }}
                                    data-testid={`button-version-history-${chapter.id}`}
                                  >
                                    <History className="w-3.5 h-3.5 ml-1" />
                                    سجل النسخ
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRewriteContent(chapter.content || "");
                                      setRewriteChapterId(chapter.id);
                                      setRewriteTone("formal");
                                      setCustomTone("");
                                      setRewrittenResult(null);
                                    }}
                                    data-testid={`button-rewrite-chapter-${chapter.id}`}
                                  >
                                    <RotateCcw className="w-3.5 h-3.5 ml-1" />
                                    أعد كتابة
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditContent(chapter.content || "");
                                      setEditingChapter(chapter.id);
                                    }}
                                    data-testid={`button-edit-chapter-${chapter.id}`}
                                  >
                                    <Pencil className="w-3.5 h-3.5 ml-1" />
                                    تحرير
                                  </Button>
                                </div>
                              )}
                            </>
                          )}
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

        <Dialog open={!!previewPdfUrl} onOpenChange={(open) => { if (!open) { if (previewPdfUrl) URL.revokeObjectURL(previewPdfUrl); setPreviewPdfUrl(null); } }}>
          <DialogContent className="max-w-4xl h-[85vh]">
            <DialogHeader>
              <DialogTitle>معاينة الفصل</DialogTitle>
            </DialogHeader>
            {previewPdfUrl && (
              <iframe
                src={previewPdfUrl}
                className="w-full h-full rounded-lg border"
                title="معاينة PDF"
                data-testid="iframe-pdf-preview"
              />
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={rewriteChapterId !== null} onOpenChange={(open) => { if (!open) { setRewriteChapterId(null); setRewrittenResult(null); } }}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>أعد كتابة {labels.chapterSingular}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label data-testid="label-rewrite-tone">النبرة المطلوبة</Label>
                <Select value={rewriteTone} onValueChange={(v) => { setRewriteTone(v); setRewrittenResult(null); }}>
                  <SelectTrigger data-testid="select-rewrite-tone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="formal" data-testid="option-tone-formal">أكثر رسمية</SelectItem>
                    <SelectItem value="simple" data-testid="option-tone-simple">أبسط</SelectItem>
                    <SelectItem value="suspense" data-testid="option-tone-suspense">أكثر تشويقاً</SelectItem>
                    <SelectItem value="custom" data-testid="option-tone-custom">مخصص</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {rewriteTone === "custom" && (
                <div className="space-y-2">
                  <Label data-testid="label-custom-tone">وصف النبرة المخصصة</Label>
                  <Textarea
                    value={customTone}
                    onChange={(e) => setCustomTone(e.target.value)}
                    placeholder="مثال: أكثر شاعرية مع لمسة حزن..."
                    className="min-h-[60px]"
                    dir="rtl"
                    data-testid="textarea-custom-tone"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label data-testid="label-rewrite-content">النص الأصلي</Label>
                <Textarea
                  value={rewriteContent}
                  onChange={(e) => setRewriteContent(e.target.value)}
                  className="min-h-[200px] font-serif text-sm leading-[2] resize-y"
                  dir="rtl"
                  data-testid="textarea-rewrite-content"
                />
              </div>
              {!rewrittenResult && (
                <Button
                  onClick={() => {
                    if (!rewriteChapterId) return;
                    const effectiveTone = rewriteTone === "custom" ? customTone : rewriteTone;
                    if (rewriteTone === "custom" && !customTone.trim()) {
                      toast({ title: "يرجى وصف النبرة المخصصة", variant: "destructive" });
                      return;
                    }
                    rewriteMutation.mutate({ chapterId: rewriteChapterId, content: rewriteContent, tone: effectiveTone });
                  }}
                  disabled={rewriteMutation.isPending || !rewriteContent.trim()}
                  data-testid="button-submit-rewrite"
                >
                  {rewriteMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جارٍ إعادة الكتابة...</>
                  ) : (
                    <><RotateCcw className="w-4 h-4 ml-2" /> أعد الكتابة</>
                  )}
                </Button>
              )}
              {rewrittenResult && (
                <div className="space-y-3">
                  <Label data-testid="label-rewritten-result">النص المعاد كتابته</Label>
                  <ScrollArea className="max-h-[300px] border rounded-md">
                    <div className="p-4 font-serif text-sm leading-[2] whitespace-pre-wrap" data-testid="text-rewritten-content">
                      {rewrittenResult}
                    </div>
                  </ScrollArea>
                  <div className="flex items-center gap-2 justify-end flex-wrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRewrittenResult(null)}
                      data-testid="button-reject-rewrite"
                    >
                      <X className="w-3.5 h-3.5 ml-1" />
                      رفض
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRewrittenResult(null);
                        const effectiveTone = rewriteTone === "custom" ? customTone : rewriteTone;
                        rewriteMutation.mutate({ chapterId: rewriteChapterId!, content: rewriteContent, tone: effectiveTone });
                      }}
                      disabled={rewriteMutation.isPending}
                      data-testid="button-retry-rewrite"
                    >
                      <RotateCcw className="w-3.5 h-3.5 ml-1" />
                      أعد المحاولة
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (rewriteChapterId && rewrittenResult) {
                          saveChapterMutation.mutate({ chapterId: rewriteChapterId, content: rewrittenResult });
                          setRewriteChapterId(null);
                          setRewrittenResult(null);
                        }
                      }}
                      disabled={saveChapterMutation.isPending}
                      data-testid="button-accept-rewrite"
                    >
                      {saveChapterMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" />
                      ) : (
                        <CheckCircle className="w-3.5 h-3.5 ml-1" />
                      )}
                      قبول واستبدال
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={versionHistoryChapterId !== null} onOpenChange={(open) => { if (!open) setVersionHistoryChapterId(null); }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle data-testid="text-version-history-title">سجل النسخ</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {isLoadingVersions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : chapterVersions && chapterVersions.length > 0 ? (
                chapterVersions.map((version) => (
                  <Card key={version.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground" data-testid={`badge-version-source-${version.id}`}>
                            {version.source === "ai_generated" ? "توليد ذكاء اصطناعي" : "تعديل يدوي"}
                          </span>
                          <span className="text-xs text-muted-foreground" data-testid={`text-version-date-${version.id}`}>
                            {new Date(version.savedAt).toLocaleString("ar-EG", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (versionHistoryChapterId) {
                              setConfirmRestoreVersion({ chapterId: versionHistoryChapterId, versionId: version.id });
                            }
                          }}
                          data-testid={`button-restore-version-${version.id}`}
                        >
                          <RotateCcw className="w-3 h-3 ml-1" />
                          استعادة
                        </Button>
                      </div>
                      <ScrollArea className="max-h-[150px]">
                        <p className="text-sm font-serif leading-[2] whitespace-pre-wrap text-muted-foreground" data-testid={`text-version-content-${version.id}`}>
                          {version.content.length > 500 ? version.content.slice(0, 500) + "..." : version.content}
                        </p>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p data-testid="text-no-versions">لا توجد نسخ محفوظة لهذا الفصل</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={confirmRestoreVersion !== null} onOpenChange={(open) => { if (!open) setConfirmRestoreVersion(null); }}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle data-testid="text-confirm-restore-title">تأكيد الاستعادة</AlertDialogTitle>
              <AlertDialogDescription data-testid="text-confirm-restore-desc">
                هل أنت متأكد من استعادة هذه النسخة؟ سيتم استبدال المحتوى الحالي بمحتوى النسخة المحددة.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row-reverse gap-2">
              <AlertDialogCancel data-testid="button-cancel-restore">إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (confirmRestoreVersion) {
                    restoreVersionMutation.mutate(confirmRestoreVersion);
                  }
                }}
                disabled={restoreVersionMutation.isPending}
                data-testid="button-confirm-restore"
              >
                {restoreVersionMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> جارٍ الاستعادة...</>
                ) : (
                  "نعم، استعد النسخة"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
