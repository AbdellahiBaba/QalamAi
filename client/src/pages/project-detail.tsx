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
  Share2, Copy, LinkIcon, Bookmark, BookmarkCheck, Shield, List, Wand2, Info
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { generateChapterPreviewPDF } from "@/lib/pdf-generator";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { NovelProject, Character, Chapter, CharacterRelationship, ChapterVersion, Bookmark as BookmarkType } from "@shared/schema";
import { getProjectPriceUSD, userPlanCoversType } from "@shared/schema";
import LtrNum from "@/components/ui/ltr-num";

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
  if (projectType === "short_story") {
    return {
      chaptersLabel: "المقاطع",
      chapterSingular: "المقطع",
      outlineLabel: "المخطط القصصي",
      typeLabel: "قصة قصيرة",
      writeAll: "اكتب جميع المقاطع",
      writeOne: "اكتب هذا المقطع",
      createOutline: "إنشاء المخطط القصصي",
      outlineCreating: "جاري إنشاء المخطط القصصي...",
      approveOutline: "الموافقة على المخطط القصصي",
      noOutline: "لم يتم إنشاء المخطط القصصي بعد. اضغط على \"إنشاء المخطط القصصي\" للبدء",
      mustApprove: "يجب الموافقة على المخطط القصصي أولاً",
      mustApproveDesc: "قم بإنشاء المخطط القصصي والموافقة عليه من تبويب \"نظرة عامة\" قبل البدء بكتابة المقاطع",
      lockedMsg: "هذا المشروع مقفل. يجب إتمام الدفع قبل أن تتمكن من إنشاء المخطط وكتابة المقاطع.",
      paymentDesc: "إتمام الدفع للبدء بكتابة القصة القصيرة",
      allDone: "تم الانتهاء من كتابة جميع المقاطع!",
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
  const [showFullRegenDialog, setShowFullRegenDialog] = useState(false);
  const [suggestedChars, setSuggestedChars] = useState<Array<{ name: string; role: string; background: string; traits: string }>>([]);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [showRegenerateCoverConfirm, setShowRegenerateCoverConfirm] = useState(false);
  const [rewriteChapterId, setRewriteChapterId] = useState<number | null>(null);
  const [rewriteContent, setRewriteContent] = useState("");
  const [rewriteTone, setRewriteTone] = useState("formal");
  const [customTone, setCustomTone] = useState("");
  const [rewrittenResult, setRewrittenResult] = useState<string | null>(null);
  const [versionHistoryChapterId, setVersionHistoryChapterId] = useState<number | null>(null);
  const [confirmRestoreVersion, setConfirmRestoreVersion] = useState<{ chapterId: number; versionId: number } | null>(null);
  const [originalityChapterId, setOriginalityChapterId] = useState<number | null>(null);
  const [originalityResult, setOriginalityResult] = useState<any>(null);
  const [bookmarkNote, setBookmarkNote] = useState("");
  const [bookmarkChapterId, setBookmarkChapterId] = useState<number | null>(null);
  const [isGeneratingGlossary, setIsGeneratingGlossary] = useState(false);
  const [isCheckingContinuity, setIsCheckingContinuity] = useState(false);
  const [continuityResult, setContinuityResult] = useState<any>(null);
  const [fixingIssueIndex, setFixingIssueIndex] = useState<number | null>(null);
  const [continuityFixPreview, setContinuityFixPreview] = useState<{ content: string; changes: string; chapterId: number; issueIndex: number } | null>(null);
  const [isAnalyzingStyle, setIsAnalyzingStyle] = useState(false);
  const [styleResult, setStyleResult] = useState<any>(null);
  const [editingOutline, setEditingOutline] = useState(false);
  const [editOutlineText, setEditOutlineText] = useState("");
  const [refineInstruction, setRefineInstruction] = useState("");
  const [showRefineInput, setShowRefineInput] = useState(false);
  const [editingSettings, setEditingSettings] = useState(false);
  const [editTimeSetting, setEditTimeSetting] = useState("");
  const [editPlaceSetting, setEditPlaceSetting] = useState("");
  const [editNarrativeTechnique, setEditNarrativeTechnique] = useState("");
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

  const fullRegenerateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/outline`, { forceRegenerate: true });
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: `تم إعادة إنشاء ${labels.outlineLabel} — جارٍ اعتماده وبدء الكتابة...` });
      try {
        await apiRequest("POST", `/api/projects/${projectId}/outline/approve`);
        await queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
        setAutoWriteAll(true);
      } catch {
        toast({ title: `تم إنشاء ${labels.outlineLabel} الجديد — يمكنك مراجعته واعتماده يدوياً`, variant: "default" });
      }
    },
    onError: (err: any) => {
      toast({ title: "حدث خطأ في إعادة إنشاء المشروع", description: err?.message, variant: "destructive" });
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

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: { timeSetting?: string; placeSetting?: string; narrativeTechnique?: string }) => {
      const res = await apiRequest("PATCH", `/api/projects/${projectId}/settings`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: "تم حفظ التعديلات" });
      setEditingSettings(false);
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

  const { data: readingProgressData } = useQuery<{ lastChapterId: number | null; scrollPosition: number }>({
    queryKey: ["/api/projects", projectId, "progress"],
    enabled: !!projectId && !!authUser,
  });

  const { data: bookmarksData, isLoading: bookmarksLoading } = useQuery<BookmarkType[]>({
    queryKey: ["/api/projects", projectId, "bookmarks"],
    enabled: !!projectId && !!authUser,
  });

  const saveProgressMutation = useMutation({
    mutationFn: async (lastChapterId: number) => {
      const res = await apiRequest("PUT", `/api/projects/${projectId}/progress`, { lastChapterId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "progress"] });
    },
  });

  const addBookmarkMutation = useMutation({
    mutationFn: async ({ chapterId, note }: { chapterId: number; note?: string }) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/bookmarks`, { chapterId, note });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "bookmarks"] });
      setBookmarkChapterId(null);
      setBookmarkNote("");
      toast({ title: "تمت إضافة الإشارة المرجعية" });
    },
    onError: () => {
      toast({ title: "فشل في إضافة الإشارة المرجعية", variant: "destructive" });
    },
  });

  const originalityCheckMutation = useMutation({
    mutationFn: async (chapterId: number) => {
      const res = await apiRequest("POST", `/api/chapters/${chapterId}/originality-check`);
      return res.json();
    },
    onSuccess: (data: any) => {
      setOriginalityResult(data);
    },
    onError: (err: any) => {
      toast({ title: err?.message || "فشل في فحص الأصالة", variant: "destructive" });
    },
  });

  const enhanceFromOriginalityMutation = useMutation({
    mutationFn: async ({ chapterId, suggestions, flaggedPhrases }: { chapterId: number; suggestions: string[]; flaggedPhrases: string[] }) => {
      const res = await apiRequest("POST", `/api/chapters/${chapterId}/enhance-from-originality`, { suggestions, flaggedPhrases });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      setOriginalityChapterId(null);
      setOriginalityResult(null);
      toast({ title: "تم تحسين النص بنجاح بناءً على ملاحظات الأصالة" });
    },
    onError: (err: any) => {
      toast({ title: err?.message || "فشل في تحسين النص", variant: "destructive" });
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

  const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (projectId && projectId !== loadedProjectId) {
      setContinuityResult(null);
      setStyleResult(null);
      setLoadedProjectId(projectId!);
    }
  }, [projectId]);

  useEffect(() => {
    if (project && projectId === loadedProjectId) {
      if (project.continuityCheckResult && !continuityResult) {
        try { setContinuityResult(JSON.parse(project.continuityCheckResult)); } catch {}
      }
      if (project.styleAnalysisResult && !styleResult) {
        try { setStyleResult(JSON.parse(project.styleAnalysisResult)); } catch {}
      }
    }
  }, [project, loadedProjectId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("payment");
    const sessionId = params.get("session_id");

    if (paymentStatus === "success" && sessionId) {
      apiRequest("POST", `/api/projects/${projectId}/payment-success`, { sessionId })
        .then((res) => res.json())
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
          toast({ title: "تم الدفع بنجاح! يمكنك الآن بدء الكتابة." });
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

  const saveOutlineMutation = useMutation({
    mutationFn: async (outline: string) => {
      const res = await apiRequest("PATCH", `/api/projects/${projectId}/outline`, { outline });
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      setEditingOutline(false);
      toast({ title: "تم حفظ التعديلات على المخطط" });
    },
    onError: () => {
      toast({ title: "فشل في حفظ التعديلات", variant: "destructive" });
    },
  });

  const refineOutlineMutation = useMutation({
    mutationFn: async (instruction: string) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/outline/refine`, { instruction });
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      setShowRefineInput(false);
      setRefineInstruction("");
      toast({ title: "تم تحسين المخطط بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل في تحسين المخطط", variant: "destructive" });
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
            title: `إعادة المحاولة... (\u200e${attempt + 1}/${MAX_RETRIES})`,
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

  const TECHNIQUE_LABELS: Record<string, string> = {
    linear: "السرد الزمني التقليدي (الخطّي)",
    temporal_break: "الانكسار الزمني (كسر التسلسل)",
    polyphonic: "تعدّد الأصوات (البوليفونية)",
    omniscient_narrator: "الراوي العليم",
    limited: "الراوي المحدود أو الداخلي",
    first_person_narration: "السرد بضمير المتكلم",
    second_person: "السرد بضمير المخاطب",
    documentary: "السرد الوثائقي",
    fragmented: "السرد المتشظّي",
    stream_of_consciousness: "تيار الوعي",
    symbolic: "السرد الرمزي أو الأسطوري",
    circular: "السرد الدائري",
  };

  const startEditSettings = () => {
    if (!project) return;
    setEditTimeSetting(project.timeSetting || "");
    setEditPlaceSetting(project.placeSetting || "");
    setEditNarrativeTechnique(project.narrativeTechnique || "");
    setEditingSettings(true);
  };

  const handleSaveSettings = () => {
    saveSettingsMutation.mutate({
      timeSetting: editTimeSetting,
      placeSetting: editPlaceSetting,
      narrativeTechnique: editNarrativeTechnique,
    });
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
                          <LtrNum>{getProjectPriceUSD(project.pageCount)}</LtrNum> دولار
                        </div>
                        <span className="text-sm text-red-600 dark:text-red-400">
                          (<LtrNum>{project.pageCount}</LtrNum> صفحة)
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
                  عدد الكلمات المكتوبة: <LtrNum>{project.usedWords.toLocaleString()}</LtrNum> كلمة
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {readingProgressData?.lastChapterId && (
          <div className="mb-4">
            <Button
              variant="outline"
              onClick={() => {
                setActiveTab("chapters");
                setExpandedChapter(readingProgressData.lastChapterId!);
              }}
              data-testid="button-continue-reading"
            >
              <BookOpen className="w-4 h-4 ml-2" />
              متابعة القراءة
            </Button>
          </div>
        )}

        {bookmarksData && bookmarksData.length > 0 && (
          <Card className="mb-4">
            <CardContent className="p-4 space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <BookmarkCheck className="w-4 h-4 text-primary" />
                الإشارات المرجعية ({bookmarksData.length})
              </h4>
              <div className="flex flex-wrap items-center gap-2">
                {bookmarksData.map((bm) => {
                  const ch = project.chapters?.find(c => c.id === bm.chapterId);
                  return (
                    <Button
                      key={bm.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setActiveTab("chapters");
                        setExpandedChapter(bm.chapterId);
                      }}
                      data-testid={`button-bookmark-${bm.id}`}
                    >
                      <Bookmark className="w-3.5 h-3.5 ml-1 text-primary" />
                      {ch ? <>{labels.chapterSingular} <LtrNum>{ch.chapterNumber}</LtrNum></> : <>#<LtrNum>{bm.chapterId}</LtrNum></>}
                      {bm.note && <span className="text-xs text-muted-foreground mr-1">({bm.note})</span>}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto -mx-1 px-1 pb-1">
            <TabsList className="inline-flex w-auto min-w-full sm:w-full gap-1">
              <TabsTrigger value="overview" data-testid="tab-overview" className="flex-shrink-0">
                <BookOpen className="w-4 h-4 ml-1.5" />
                <span className="hidden sm:inline">نظرة عامة</span>
                <span className="sm:hidden">عام</span>
              </TabsTrigger>
              {project.projectType !== "essay" && (
                <TabsTrigger value="characters" data-testid="tab-characters" className="flex-shrink-0">
                  <Users className="w-4 h-4 ml-1.5" />
                  <span className="hidden sm:inline">الشخصيات</span>
                  <span className="sm:hidden">شخصيات</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="chapters" data-testid="tab-chapters" className="flex-shrink-0">
                <FileText className="w-4 h-4 ml-1.5" />
                {labels.chaptersLabel}
              </TabsTrigger>
              <TabsTrigger value="glossary" data-testid="tab-glossary" className="flex-shrink-0">
                <List className="w-4 h-4 ml-1.5" />
                الفهرس
              </TabsTrigger>
              <TabsTrigger value="continuity" data-testid="tab-continuity" className="flex-shrink-0">
                <Shield className="w-4 h-4 ml-1.5" />
                <span className="hidden sm:inline">الاستمرارية</span>
                <span className="sm:hidden">اتساق</span>
              </TabsTrigger>
              <TabsTrigger value="style" data-testid="tab-style" className="flex-shrink-0">
                <PenTool className="w-4 h-4 ml-1.5" />
                الأسلوب
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6">
            {project.coverImageUrl && (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-center">
                    <img
                      src={project.coverImageUrl}
                      alt={`غلاف ${project.title}`}
                      className="max-h-96 rounded-lg shadow-lg"
                      data-testid="img-cover"
                    />
                  </div>
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isGeneratingCover}
                      onClick={() => setShowRegenerateCoverConfirm(true)}
                      data-testid="button-regenerate-cover"
                    >
                      {isGeneratingCover ? (
                        <><Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" /> جارٍ إعادة إنشاء الغلاف...</>
                      ) : (
                        <><RefreshCw className="w-3.5 h-3.5 ml-1" /> إعادة إنشاء الغلاف</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-4 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-lg font-semibold" data-testid="text-details-title">
                      {project.projectType === "essay" ? "تفاصيل المقال" : project.projectType === "scenario" ? "تفاصيل السيناريو" : project.projectType === "short_story" ? "تفاصيل القصة القصيرة" : "تفاصيل الرواية"}
                    </h3>
                    {project.projectType === "novel" && !editingSettings && (
                      <Button variant="ghost" size="sm" onClick={startEditSettings} className="h-7 gap-1 text-xs" data-testid="button-edit-settings">
                        <Pencil className="w-3 h-3" /> تعديل
                      </Button>
                    )}
                    {project.projectType === "novel" && editingSettings && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={handleSaveSettings} disabled={saveSettingsMutation.isPending} className="h-7 gap-1 text-xs" data-testid="button-save-settings">
                          {saveSettingsMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} حفظ
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditingSettings(false)} className="h-7 text-xs" data-testid="button-cancel-settings">
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 text-sm">
                    {project.projectType === "essay" ? (
                      <>
                        {project.subject && (
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">الموضوع:</span>
                            <span className="font-medium">{project.subject}</span>
                          </div>
                        )}
                        {project.essayTone && (
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">أسلوب الكتابة:</span>
                            <span className="font-medium">{
                              ({ formal: "رسمي أكاديمي", analytical: "تحليلي", investigative: "استقصائي", editorial: "افتتاحي / رأي", conversational: "حواري خبير", narrative: "سردي قصصي", persuasive: "إقناعي", satirical: "ساخر", scientific: "علمي تبسيطي", literary: "أدبي", journalistic: "صحفي إخباري" } as Record<string, string>)[project.essayTone] || project.essayTone
                            }</span>
                          </div>
                        )}
                        {project.targetAudience && (
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">الجمهور المستهدف:</span>
                            <span className="font-medium">{project.targetAudience}</span>
                          </div>
                        )}
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">عدد الأقسام:</span>
                          <span className="font-medium">{project.chapters?.length || 0}</span>
                        </div>
                      </>
                    ) : project.projectType === "short_story" ? (
                      <>
                        {project.genre && (
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">النوع الأدبي:</span>
                            <span className="font-medium">{
                              ({ realistic: "واقعي", symbolic: "رمزي / أسطوري", psychological: "نفسي", social: "اجتماعي", fantasy: "فانتازيا", horror: "رعب", romantic: "رومانسي", historical: "تاريخي", satirical: "ساخر", philosophical: "فلسفي" } as Record<string, string>)[project.genre] || project.genre
                            }</span>
                          </div>
                        )}
                        {project.timeSetting && (
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">الزمان:</span>
                            <span className="font-medium">{project.timeSetting}</span>
                          </div>
                        )}
                        {project.placeSetting && (
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">المكان:</span>
                            <span className="font-medium">{project.placeSetting}</span>
                          </div>
                        )}
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">نوع السرد:</span>
                          <span className="font-medium">{povLabel(project.narrativePov)}</span>
                        </div>
                        {project.narrativeTechnique && (
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">التقنية السردية:</span>
                            <span className="font-medium">{TECHNIQUE_LABELS[project.narrativeTechnique] || project.narrativeTechnique}</span>
                          </div>
                        )}
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">الحجم:</span>
                          <span className="font-medium"><LtrNum>{project.pageCount}</LtrNum> صفحة</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">عدد الشخصيات:</span>
                          <span className="font-medium"><LtrNum>{project.characters?.length || 0}</LtrNum></span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">عدد المقاطع:</span>
                          <span className="font-medium"><LtrNum>{project.chapters?.length || 0}</LtrNum></span>
                        </div>
                      </>
                    ) : project.projectType === "scenario" ? (
                      <>
                        {project.genre && (
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">النوع الدرامي:</span>
                            <span className="font-medium">{
                              ({ drama: "دراما", comedy: "كوميديا", thriller: "إثارة", romance: "رومانسي", action: "أكشن", "sci-fi": "خيال علمي", horror: "رعب", family: "عائلي", social: "اجتماعي", crime: "جريمة", war: "حربي" } as Record<string, string>)[project.genre] || project.genre
                            }</span>
                          </div>
                        )}
                        {project.formatType && (
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">الشكل:</span>
                            <span className="font-medium">{project.formatType === "film" ? "فيلم سينمائي" : project.formatType === "series" ? "مسلسل تلفزيوني" : project.formatType}</span>
                          </div>
                        )}
                        {project.formatType === "series" && project.episodeCount && (
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">عدد الحلقات:</span>
                            <span className="font-medium"><LtrNum>{project.episodeCount}</LtrNum></span>
                          </div>
                        )}
                        {project.timeSetting && (
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">الزمان:</span>
                            <span className="font-medium">{project.timeSetting}</span>
                          </div>
                        )}
                        {project.placeSetting && (
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">المكان:</span>
                            <span className="font-medium">{project.placeSetting}</span>
                          </div>
                        )}
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">عدد الشخصيات:</span>
                          <span className="font-medium"><LtrNum>{project.characters?.length || 0}</LtrNum></span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">عدد المشاهد:</span>
                          <span className="font-medium"><LtrNum>{project.chapters?.length || 0}</LtrNum></span>
                        </div>
                      </>
                    ) : editingSettings ? (
                      <>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-xs">الزمان</Label>
                          <Input value={editTimeSetting} onChange={(e) => setEditTimeSetting(e.target.value)} data-testid="input-edit-time" className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-xs">المكان</Label>
                          <Input value={editPlaceSetting} onChange={(e) => setEditPlaceSetting(e.target.value)} data-testid="input-edit-place" className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-xs">التقنية السردية</Label>
                          <Select value={editNarrativeTechnique} onValueChange={setEditNarrativeTechnique}>
                            <SelectTrigger className="h-8 text-sm" data-testid="select-edit-technique">
                              <SelectValue placeholder="اختر التقنية السردية" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(TECHNIQUE_LABELS).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">نوع السرد:</span>
                          <span className="font-medium">{povLabel(project.narrativePov)}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">حجم الرواية:</span>
                          <span className="font-medium"><LtrNum>{project.pageCount}</LtrNum> صفحة (<LtrNum>~{(project.pageCount * 250).toLocaleString()}</LtrNum> كلمة)</span>
                        </div>
                      </>
                    ) : (
                      <>
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
                        {project.narrativeTechnique && (
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">التقنية السردية:</span>
                            <span className="font-medium">{TECHNIQUE_LABELS[project.narrativeTechnique] || project.narrativeTechnique}</span>
                          </div>
                        )}
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">حجم الرواية:</span>
                          <span className="font-medium"><LtrNum>{project.pageCount}</LtrNum> صفحة (<LtrNum>~{(project.pageCount * 250).toLocaleString()}</LtrNum> كلمة)</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">عدد الشخصيات:</span>
                          <span className="font-medium"><LtrNum>{project.characters?.length || 0}</LtrNum></span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">عدد الفصول:</span>
                          <span className="font-medium"><LtrNum>{project.chapters?.length || 0}</LtrNum></span>
                        </div>
                      </>
                    )}
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
                          toast({ title: `تم إنشاء غلاف ${labels.typeLabel}` });
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
                        <><ImagePlus className="w-3.5 h-3.5 ml-1" /> إنشاء غلاف {labels.typeLabel}</>
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
                      {!editingOutline && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setEditingOutline(true); setEditOutlineText(project.outline || ""); }}
                          data-testid="button-edit-outline"
                        >
                          <Pencil className="w-3.5 h-3.5 ml-1" />
                          تعديل
                        </Button>
                      )}
                      {!editingOutline && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowRefineInput(!showRefineInput)}
                          disabled={refineOutlineMutation.isPending}
                          data-testid="button-refine-outline"
                        >
                          {refineOutlineMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" />
                          ) : (
                            <Wand2 className="w-3.5 h-3.5 ml-1" />
                          )}
                          تحسين بالذكاء
                        </Button>
                      )}
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
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                        <CheckCircle className="w-4 h-4" />
                        تمت الموافقة
                      </span>
                      {project.projectType !== "essay" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowFullRegenDialog(true)}
                          disabled={fullRegenerateMutation.isPending}
                          data-testid="button-full-regenerate"
                        >
                          {fullRegenerateMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5 ml-1" />
                          )}
                          إعادة إنشاء {labels.typeLabel} بالكامل
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                {showRefineInput && !project.outlineApproved && (
                  <div className="flex gap-2 items-end border-t pt-4">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground mb-1 block">اكتب التعديل المطلوب وسيقوم أبو هاشم بتحسين المخطط</Label>
                      <Textarea
                        value={refineInstruction}
                        onChange={(e) => setRefineInstruction(e.target.value)}
                        placeholder="مثال: أضف فصلاً عن طفولة البطل... أو: اجعل الذروة في الفصل السابع..."
                        className="min-h-[60px]"
                        data-testid="input-refine-instruction"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        onClick={() => refineOutlineMutation.mutate(refineInstruction)}
                        disabled={!refineInstruction.trim() || refineOutlineMutation.isPending}
                        data-testid="button-submit-refine"
                      >
                        {refineOutlineMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setShowRefineInput(false); setRefineInstruction(""); }}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
                {project.outline ? (
                  editingOutline && !project.outlineApproved ? (
                    <div className="border-t pt-4 space-y-3">
                      <Textarea
                        value={editOutlineText}
                        onChange={(e) => setEditOutlineText(e.target.value)}
                        className="min-h-[400px] font-serif text-sm leading-loose"
                        dir="rtl"
                        data-testid="textarea-edit-outline"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => saveOutlineMutation.mutate(editOutlineText)}
                          disabled={saveOutlineMutation.isPending}
                          data-testid="button-save-outline"
                        >
                          {saveOutlineMutation.isPending ? <Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" /> : <Save className="w-3.5 h-3.5 ml-1" />}
                          حفظ التعديلات
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingOutline(false)} data-testid="button-cancel-edit-outline">
                          <X className="w-3.5 h-3.5 ml-1" />
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="font-serif text-sm leading-loose whitespace-pre-wrap border-t pt-4" dir="rtl">
                      {project.outline}
                    </div>
                  )
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
                      {completedCount > 0 && (
                        <Link href={`/project/${projectId}/read/${project.chapters.find(c => c.status === "completed")?.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            data-testid="button-reading-mode"
                          >
                            <BookOpen className="w-3.5 h-3.5 ml-1" />
                            وضع القراءة
                          </Button>
                        </Link>
                      )}
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
                        onClick={() => {
                          setExpandedChapter(isExpanded ? null : chapter.id);
                          if (!isExpanded && chapter.status === "completed") {
                            saveProgressMutation.mutate(chapter.id);
                          }
                        }}
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
                                <div className="p-4 sm:p-8 font-serif text-sm sm:text-base leading-[2] sm:leading-[2.2] whitespace-pre-wrap" dir="rtl">
                                  {displayContent}
                                </div>
                              </ScrollArea>
                              {chapter.status === "completed" && !isGenerating && (
                                <div className="border-t p-3 flex items-center justify-end gap-2 flex-wrap">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setBookmarkChapterId(chapter.id);
                                      setBookmarkNote("");
                                    }}
                                    data-testid={`button-bookmark-chapter-${chapter.id}`}
                                  >
                                    <Bookmark className="w-3.5 h-3.5 ml-1" />
                                    إشارة مرجعية
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOriginalityChapterId(chapter.id);
                                      setOriginalityResult(null);
                                      originalityCheckMutation.mutate(chapter.id);
                                    }}
                                    disabled={originalityCheckMutation.isPending && originalityChapterId === chapter.id}
                                    data-testid={`button-originality-check-${chapter.id}`}
                                  >
                                    {originalityCheckMutation.isPending && originalityChapterId === chapter.id ? (
                                      <Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" />
                                    ) : (
                                      <Shield className="w-3.5 h-3.5 ml-1" />
                                    )}
                                    فحص الأصالة
                                  </Button>
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

          <TabsContent value="glossary" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-serif text-lg font-semibold flex items-center gap-2">
                <List className="w-5 h-5 text-primary" />
                الفهرس
              </h3>
              <Button
                variant="outline"
                size="sm"
                disabled={isGeneratingGlossary}
                onClick={async () => {
                  setIsGeneratingGlossary(true);
                  try {
                    const res = await apiRequest("POST", `/api/projects/${projectId}/generate-glossary`);
                    await res.json();
                    queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
                    toast({ title: "تم إنشاء الفهرس بنجاح" });
                  } catch {
                    toast({ title: "فشل في إنشاء الفهرس", variant: "destructive" });
                  } finally {
                    setIsGeneratingGlossary(false);
                  }
                }}
                data-testid="button-generate-glossary"
              >
                {isGeneratingGlossary ? (
                  <><Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" /> جارٍ إنشاء الفهرس...</>
                ) : (
                  <><Sparkles className="w-3.5 h-3.5 ml-1" /> {project.glossary ? "إعادة إنشاء الفهرس" : "إنشاء فهرس"}</>
                )}
              </Button>
            </div>
            {project.glossary ? (
              <Card>
                <CardContent className="p-6">
                  <div className="font-serif text-sm leading-loose whitespace-pre-wrap" dir="rtl" data-testid="text-glossary-content">
                    {project.glossary}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <List className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p data-testid="text-no-glossary">لا يوجد فهرس بعد. اضغط على "إنشاء فهرس" لإنشائه تلقائياً.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="continuity" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-serif text-lg font-semibold flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                فحص الاستمرارية
              </h3>
              <Button
                variant="outline"
                size="sm"
                disabled={isCheckingContinuity}
                onClick={async () => {
                  setIsCheckingContinuity(true);
                  try {
                    const res = await apiRequest("POST", `/api/projects/${projectId}/continuity-check`);
                    const data = await res.json();
                    setContinuityResult(data);
                    toast({ title: "تم فحص الاستمرارية بنجاح" });
                  } catch (err: any) {
                    let errorMsg = "فشل في فحص الاستمرارية";
                    try {
                      const msgParts = err?.message?.split(": ");
                      if (msgParts && msgParts.length > 1) {
                        const jsonStr = msgParts.slice(1).join(": ");
                        const parsed = JSON.parse(jsonStr);
                        if (parsed.error) errorMsg = parsed.error;
                      }
                    } catch {}
                    toast({ title: errorMsg, variant: "destructive" });
                  } finally {
                    setIsCheckingContinuity(false);
                  }
                }}
                data-testid="button-continuity-check"
              >
                {isCheckingContinuity ? (
                  <><Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" /> جارٍ الفحص...</>
                ) : (
                  <><Sparkles className="w-3.5 h-3.5 ml-1" /> {continuityResult ? "إعادة الفحص" : "بدء الفحص"}</>
                )}
              </Button>
            </div>
            {continuityResult ? (
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-serif font-semibold text-lg">التقييم العام</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl font-bold ${(continuityResult.overallScore || 0) >= 7 ? "text-green-600 dark:text-green-400" : (continuityResult.overallScore || 0) >= 4 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`} data-testid="text-continuity-score">
                          <LtrNum>{continuityResult.overallScore}/10</LtrNum>
                        </span>
                      </div>
                    </div>
                    {continuityResult.summary && (
                      <p className="text-sm text-muted-foreground leading-relaxed" dir="rtl" data-testid="text-continuity-summary">{continuityResult.summary}</p>
                    )}
                  </CardContent>
                </Card>

                {continuityResult.strengths?.length > 0 && (
                  <Card>
                    <CardContent className="p-6">
                      <h4 className="font-serif font-semibold mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        نقاط القوة
                      </h4>
                      <ul className="space-y-2">
                        {continuityResult.strengths.map((s: string, i: number) => (
                          <li key={i} className="text-sm flex items-start gap-2" data-testid={`text-strength-${i}`}>
                            <span className="text-green-600 mt-0.5">●</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {continuityResult.issues?.length > 0 && (
                  <Card>
                    <CardContent className="p-6">
                      <h4 className="font-serif font-semibold mb-3 flex items-center gap-2">
                        <Info className="w-4 h-4 text-yellow-600" />
                        المشاكل المكتشفة (<LtrNum>{continuityResult.issues.filter((is: any) => !is.resolved).length}/{continuityResult.issues.length}</LtrNum>)
                      </h4>
                      <div className="space-y-4">
                        {continuityResult.issues.map((issue: any, i: number) => (
                          <div key={i} className={`border rounded-lg p-4 ${issue.resolved ? "border-green-300 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20" : issue.severity === "high" ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30" : issue.severity === "medium" ? "border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30" : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/30"}`} data-testid={`card-issue-${i}`}>
                            <div className="flex items-center gap-2 mb-2">
                              {issue.resolved ? (
                                <Badge variant="outline" className="border-green-500 text-green-600 dark:text-green-400" data-testid={`badge-resolved-${i}`}>
                                  <CheckCircle className="w-3 h-3 ml-1" />تم الإصلاح
                                </Badge>
                              ) : (
                                <Badge variant={issue.severity === "high" ? "destructive" : issue.severity === "medium" ? "secondary" : "outline"} data-testid={`badge-severity-${i}`}>
                                  {issue.severity === "high" ? "خطير" : issue.severity === "medium" ? "متوسط" : "طفيف"}
                                </Badge>
                              )}
                              <Badge variant="outline" data-testid={`badge-type-${i}`}>
                                {issue.type === "character" ? "شخصية" : issue.type === "timeline" ? "خط زمني" : issue.type === "setting" ? "مكان" : issue.type === "plot" ? "حبكة" : "نبرة"}
                              </Badge>
                              {issue.chapter && <span className="text-xs text-muted-foreground">الفصل <LtrNum>{issue.chapter}</LtrNum></span>}
                            </div>
                            <p className={`text-sm mb-2 ${issue.resolved ? "line-through opacity-60" : ""}`} dir="rtl" data-testid={`text-issue-desc-${i}`}>{issue.description}</p>
                            {issue.suggestion && (
                              <p className={`text-xs text-muted-foreground border-t pt-2 mt-2 ${issue.resolved ? "opacity-50" : ""}`} dir="rtl" data-testid={`text-issue-fix-${i}`}>
                                <span className="font-semibold">اقتراح: </span>{issue.suggestion}
                              </p>
                            )}
                            {!issue.resolved && issue.chapter && project?.chapters && (() => {
                              const targetChapter = project.chapters.find((ch: any) => ch.chapterNumber === issue.chapter && ch.content);
                              if (!targetChapter) return null;
                              return (
                                <div className="mt-3 border-t pt-3">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={fixingIssueIndex === i}
                                    onClick={async () => {
                                      setFixingIssueIndex(i);
                                      try {
                                        const res = await apiRequest("POST", `/api/chapters/${targetChapter.id}/fix-continuity`, {
                                          issue: { type: issue.type, severity: issue.severity, chapter: issue.chapter, description: issue.description, suggestion: issue.suggestion }
                                        });
                                        const data = await res.json();
                                        setContinuityFixPreview({ content: data.content, changes: data.changes, chapterId: targetChapter.id, issueIndex: i });
                                      } catch (err: any) {
                                        toast({ title: "فشل في إصلاح المشكلة", variant: "destructive" });
                                      } finally {
                                        setFixingIssueIndex(null);
                                      }
                                    }}
                                    data-testid={`button-fix-issue-${i}`}
                                  >
                                    {fixingIssueIndex === i ? (
                                      <><Loader2 className="w-3.5 h-3.5 animate-spin ml-1.5" />جارٍ الإصلاح...</>
                                    ) : (
                                      <><Wand2 className="w-3.5 h-3.5 ml-1.5" />إصلاح بواسطة أبو هاشم</>
                                    )}
                                  </Button>
                                </div>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {continuityFixPreview && (
                  <AlertDialog open={!!continuityFixPreview} onOpenChange={(open) => { if (!open) setContinuityFixPreview(null); }}>
                    <AlertDialogContent dir="rtl" className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="font-serif flex items-center gap-2">
                          <Wand2 className="w-5 h-5 text-primary" />
                          مراجعة الإصلاح
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                          <div className="text-right space-y-3">
                            <div>
                              <span className="block mb-2 text-sm font-medium text-foreground">ملخص التغييرات:</span>
                              <span className="block p-3 rounded-md bg-primary/5 border border-primary/10 text-sm text-foreground leading-relaxed" dir="rtl">{continuityFixPreview.changes}</span>
                            </div>
                            <div>
                              <span className="block mb-2 text-sm font-medium text-foreground">معاينة النص المعدّل:</span>
                              <div className="max-h-[300px] overflow-y-auto p-3 rounded-md bg-muted/50 border text-sm text-foreground leading-relaxed whitespace-pre-wrap font-serif" dir="rtl">
                                {continuityFixPreview.content.substring(0, 3000)}{continuityFixPreview.content.length > 3000 ? "..." : ""}
                              </div>
                            </div>
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-row-reverse gap-2 sm:gap-2">
                        <AlertDialogAction
                          onClick={async () => {
                            try {
                              await apiRequest("PATCH", `/api/chapters/${continuityFixPreview.chapterId}`, { content: continuityFixPreview.content });
                              await apiRequest("POST", `/api/projects/${projectId}/resolve-continuity-issue`, { issueIndex: continuityFixPreview.issueIndex });
                              setContinuityResult((prev: any) => {
                                if (!prev?.issues) return prev;
                                const updated = { ...prev, issues: [...prev.issues] };
                                updated.issues[continuityFixPreview.issueIndex] = { ...updated.issues[continuityFixPreview.issueIndex], resolved: true };
                                return updated;
                              });
                              queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
                              toast({ title: "تم تطبيق الإصلاح بنجاح" });
                            } catch {
                              toast({ title: "فشل في حفظ الإصلاح", variant: "destructive" });
                            }
                            setContinuityFixPreview(null);
                          }}
                          data-testid="button-apply-fix"
                        >
                          تطبيق التعديل
                        </AlertDialogAction>
                        <AlertDialogCancel data-testid="button-cancel-fix">إلغاء</AlertDialogCancel>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {continuityResult.issues?.length === 0 && (
                  <div className="text-center py-8 text-green-600 dark:text-green-400">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3" />
                    <p className="font-serif text-lg">لا توجد مشاكل في الاستمرارية — عمل متسق وممتاز!</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p data-testid="text-no-continuity">فحص الاستمرارية يراجع جميع الفصول المكتملة بحثاً عن تناقضات في الشخصيات والأحداث والأماكن والخط الزمني.</p>
                <p className="text-xs mt-2">يتطلب فصلين مكتملين على الأقل</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="style" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-serif text-lg font-semibold flex items-center gap-2">
                <PenTool className="w-5 h-5 text-primary" />
                تحليل الأسلوب الأدبي
              </h3>
              <Button
                variant="outline"
                size="sm"
                disabled={isAnalyzingStyle}
                onClick={async () => {
                  setIsAnalyzingStyle(true);
                  try {
                    const res = await apiRequest("POST", `/api/projects/${projectId}/style-analysis`);
                    const data = await res.json();
                    setStyleResult(data);
                    toast({ title: "تم تحليل الأسلوب بنجاح" });
                  } catch (err: any) {
                    let errorMsg = "فشل في تحليل الأسلوب";
                    try {
                      const msgParts = err?.message?.split(": ");
                      if (msgParts && msgParts.length > 1) {
                        const jsonStr = msgParts.slice(1).join(": ");
                        const parsed = JSON.parse(jsonStr);
                        if (parsed.error) errorMsg = parsed.error;
                      }
                    } catch {}
                    toast({ title: errorMsg, variant: "destructive" });
                  } finally {
                    setIsAnalyzingStyle(false);
                  }
                }}
                data-testid="button-style-analysis"
              >
                {isAnalyzingStyle ? (
                  <><Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" /> جارٍ التحليل...</>
                ) : (
                  <><Sparkles className="w-3.5 h-3.5 ml-1" /> {styleResult ? "إعادة التحليل" : "بدء التحليل"}</>
                )}
              </Button>
            </div>

            {styleResult ? (
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-serif font-semibold text-lg">التقييم العام</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl font-bold ${(styleResult.overallScore || 0) >= 75 ? "text-green-600 dark:text-green-400" : (styleResult.overallScore || 0) >= 50 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`} data-testid="text-style-score">
                          <LtrNum>{styleResult.overallScore}/100</LtrNum>
                        </span>
                      </div>
                    </div>
                    {styleResult.summary && (
                      <p className="text-sm text-muted-foreground leading-relaxed" dir="rtl" data-testid="text-style-summary">{styleResult.summary}</p>
                    )}
                    {styleResult.topPriority && (
                      <div className="mt-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3" data-testid="text-style-priority">
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          الأولوية القصوى للتحسين:
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-400 mt-1" dir="rtl">{styleResult.topPriority}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {styleResult.styleProfile && (
                  <Card>
                    <CardContent className="p-6">
                      <h4 className="font-serif font-semibold mb-4 flex items-center gap-2">
                        <Feather className="w-4 h-4 text-primary" />
                        البصمة الأسلوبية
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {styleResult.styleProfile.dominantTone && (
                          <div className="bg-muted/50 rounded-lg p-3 border" data-testid="text-style-tone">
                            <span className="text-xs font-medium text-muted-foreground">النبرة السائدة</span>
                            <p className="text-sm font-semibold mt-0.5">{styleResult.styleProfile.dominantTone}</p>
                          </div>
                        )}
                        {styleResult.styleProfile.sentenceVariety && (
                          <div className="bg-muted/50 rounded-lg p-3 border" data-testid="text-style-variety">
                            <span className="text-xs font-medium text-muted-foreground">تنوع الجمل</span>
                            <p className="text-sm font-semibold mt-0.5">
                              {styleResult.styleProfile.sentenceVariety === "high" ? "عالٍ" : styleResult.styleProfile.sentenceVariety === "medium" ? "متوسط" : "منخفض"}
                            </p>
                          </div>
                        )}
                        {styleResult.styleProfile.dialogueQuality && styleResult.styleProfile.dialogueQuality !== "not_applicable" && (
                          <div className="bg-muted/50 rounded-lg p-3 border" data-testid="text-style-dialogue">
                            <span className="text-xs font-medium text-muted-foreground">جودة الحوار</span>
                            <p className="text-sm font-semibold mt-0.5">
                              {styleResult.styleProfile.dialogueQuality === "excellent" ? "ممتاز" : styleResult.styleProfile.dialogueQuality === "strong" ? "قوي" : styleResult.styleProfile.dialogueQuality === "adequate" ? "مقبول" : "ضعيف"}
                            </p>
                          </div>
                        )}
                        {styleResult.styleProfile.imageryRichness && (
                          <div className="bg-muted/50 rounded-lg p-3 border" data-testid="text-style-imagery">
                            <span className="text-xs font-medium text-muted-foreground">ثراء الصور البلاغية</span>
                            <p className="text-sm font-semibold mt-0.5">
                              {styleResult.styleProfile.imageryRichness === "rich" ? "غني" : styleResult.styleProfile.imageryRichness === "moderate" ? "معتدل" : styleResult.styleProfile.imageryRichness === "excessive" ? "مفرط" : "شحيح"}
                            </p>
                          </div>
                        )}
                      </div>
                      {styleResult.styleProfile.closestAuthorStyle && (
                        <div className="mt-3 bg-primary/5 rounded-lg p-3 border border-primary/20" data-testid="text-style-closest-author">
                          <span className="text-xs font-medium text-muted-foreground">أقرب أسلوب أدبي</span>
                          <p className="text-sm mt-0.5 leading-relaxed">{styleResult.styleProfile.closestAuthorStyle}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {styleResult.dimensions?.length > 0 && (
                  <Card>
                    <CardContent className="p-6">
                      <h4 className="font-serif font-semibold mb-4 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-primary" />
                        الأبعاد الأسلوبية
                      </h4>
                      <div className="space-y-4">
                        {styleResult.dimensions.map((dim: any, i: number) => (
                          <div key={i} className="border rounded-lg p-4" data-testid={`card-dimension-${i}`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-sm">{dim.name}</span>
                              <span className={`text-lg font-bold ${(dim.score || 0) >= 7 ? "text-green-600 dark:text-green-400" : (dim.score || 0) >= 5 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`} data-testid={`text-dimension-score-${i}`}>
                                <LtrNum>{dim.score}/10</LtrNum>
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5 mb-2">
                              <div
                                className={`h-1.5 rounded-full ${(dim.score || 0) >= 7 ? "bg-green-500" : (dim.score || 0) >= 5 ? "bg-yellow-500" : "bg-red-500"}`}
                                style={{ width: `${(dim.score || 0) * 10}%` }}
                              />
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed" dir="rtl">{dim.analysis}</p>
                            {dim.example && (
                              <div className="mt-2 text-xs bg-muted/50 rounded p-2 border-r-2 border-primary/30" dir="rtl">
                                <span className="font-medium">مثال: </span>
                                <span className="text-muted-foreground">«{dim.example}»</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {styleResult.strengths?.length > 0 && (
                  <Card>
                    <CardContent className="p-6">
                      <h4 className="font-serif font-semibold mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        نقاط القوة
                      </h4>
                      <ul className="space-y-2">
                        {styleResult.strengths.map((s: string, i: number) => (
                          <li key={i} className="text-sm flex items-start gap-2" dir="rtl" data-testid={`text-style-strength-${i}`}>
                            <span className="text-green-600 mt-0.5">●</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {styleResult.improvements?.length > 0 && (
                  <Card>
                    <CardContent className="p-6">
                      <h4 className="font-serif font-semibold mb-3 flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-amber-600" />
                        اقتراحات التحسين ({styleResult.improvements.length})
                      </h4>
                      <div className="space-y-4">
                        {styleResult.improvements.map((imp: any, i: number) => (
                          <div key={i} className={`border rounded-lg p-4 ${imp.impact === "high" ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30" : imp.impact === "medium" ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30" : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/30"}`} data-testid={`card-improvement-${i}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={imp.impact === "high" ? "destructive" : imp.impact === "medium" ? "secondary" : "outline"} data-testid={`badge-impact-${i}`}>
                                {imp.impact === "high" ? "تأثير عالٍ" : imp.impact === "medium" ? "تأثير متوسط" : "تأثير طفيف"}
                              </Badge>
                              <span className="text-sm font-semibold">{imp.area}</span>
                            </div>
                            {imp.current && (
                              <div className="text-xs bg-muted/50 rounded p-2 mb-2 border-r-2 border-red-300 dark:border-red-700" dir="rtl">
                                <span className="font-medium text-red-700 dark:text-red-400">الوضع الحالي: </span>
                                <span className="text-muted-foreground">{imp.current}</span>
                              </div>
                            )}
                            <div className="text-xs bg-green-50 dark:bg-green-950/20 rounded p-2 border-r-2 border-green-300 dark:border-green-700" dir="rtl">
                              <span className="font-medium text-green-700 dark:text-green-400">الاقتراح: </span>
                              <span className="text-muted-foreground">{imp.suggestion}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <PenTool className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p data-testid="text-no-style">تحليل الأسلوب الأدبي يقيّم جودة الكتابة ويقدم اقتراحات تحسين عملية مع أمثلة.</p>
                <p className="text-xs mt-2">يتطلب فصلاً مكتملاً واحداً على الأقل</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={bookmarkChapterId !== null} onOpenChange={(open) => { if (!open) setBookmarkChapterId(null); }}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle data-testid="text-bookmark-dialog-title">إضافة إشارة مرجعية</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label data-testid="label-bookmark-note">ملاحظة (اختياري)</Label>
                <Input
                  value={bookmarkNote}
                  onChange={(e) => setBookmarkNote(e.target.value)}
                  placeholder="أضف ملاحظة..."
                  data-testid="input-bookmark-note"
                />
              </div>
              <Button
                onClick={() => {
                  if (bookmarkChapterId) {
                    addBookmarkMutation.mutate({ chapterId: bookmarkChapterId, note: bookmarkNote || undefined });
                  }
                }}
                disabled={addBookmarkMutation.isPending}
                data-testid="button-save-bookmark"
              >
                {addBookmarkMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جارٍ الحفظ...</>
                ) : (
                  <><Bookmark className="w-4 h-4 ml-2" /> حفظ الإشارة المرجعية</>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={originalityChapterId !== null && (!!originalityResult || originalityCheckMutation.isPending)} onOpenChange={(open) => { if (!open) { setOriginalityChapterId(null); setOriginalityResult(null); } }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle data-testid="text-originality-dialog-title">فحص الأصالة الأسلوبية</DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">تقييم تفرد الأسلوب اللغوي — وليس فحص انتحال أو سرقة أدبية</p>
            </DialogHeader>
            {originalityCheckMutation.isPending ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="mr-2 text-sm text-muted-foreground">جارٍ فحص الأصالة...</span>
              </div>
            ) : originalityResult ? (
              <div className="space-y-4">
                {originalityResult.methodology && (
                  <div className="bg-muted/50 rounded-lg p-3 border" data-testid="text-originality-methodology">
                    <h4 className="text-sm font-medium mb-1 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-blue-500" />
                      منهجية التقييم
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{originalityResult.methodology}</p>
                  </div>
                )}
                <div className="flex items-center gap-3" data-testid="text-originality-score">
                  <span className="text-sm font-medium">درجة الأصالة:</span>
                  <Badge
                    variant="default"
                    className={
                      originalityResult.score >= 80
                        ? "bg-green-600"
                        : originalityResult.score >= 50
                        ? "bg-yellow-500"
                        : "bg-red-600"
                    }
                    data-testid="badge-originality-score"
                  >
                    {originalityResult.score}%
                  </Badge>
                </div>
                {originalityResult.analysis && (
                  <div data-testid="text-originality-analysis">
                    <h4 className="text-sm font-medium mb-1">التحليل</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{originalityResult.analysis}</p>
                  </div>
                )}
                {originalityResult.flaggedPhrases && originalityResult.flaggedPhrases.length > 0 && (
                  <div data-testid="text-originality-flagged">
                    <h4 className="text-sm font-medium mb-1">عبارات قالبية</h4>
                    <ul className="space-y-2">
                      {originalityResult.flaggedPhrases.map((phrase: string, i: number) => (
                        <li key={i} className="text-sm">
                          <div className="flex items-start gap-1 text-red-600 dark:text-red-400">
                            <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
                            <span className="font-medium">«{phrase}»</span>
                          </div>
                          {originalityResult.flaggedReasons?.[i] && (
                            <p className="text-xs text-muted-foreground mr-3 mt-0.5">{originalityResult.flaggedReasons[i]}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {originalityResult.strengths && originalityResult.strengths.length > 0 && (
                  <div data-testid="text-originality-strengths">
                    <h4 className="text-sm font-medium mb-1">نقاط القوة</h4>
                    <ul className="space-y-1">
                      {originalityResult.strengths.map((s: string, i: number) => (
                        <li key={i} className="text-sm text-green-600 dark:text-green-400 flex items-start gap-1">
                          <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {originalityResult.suggestions && originalityResult.suggestions.length > 0 && (
                  <div data-testid="text-originality-suggestions">
                    <h4 className="text-sm font-medium mb-1">اقتراحات التحسين</h4>
                    <ul className="space-y-1">
                      {originalityResult.suggestions.map((s: string, i: number) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-1">
                          <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(originalityResult.suggestions?.length > 0 || originalityResult.flaggedPhrases?.length > 0) && (
                  <div className="pt-3 border-t">
                    <Button
                      data-testid="button-enhance-from-originality"
                      className="w-full"
                      disabled={enhanceFromOriginalityMutation.isPending}
                      onClick={() => {
                        if (originalityChapterId) {
                          enhanceFromOriginalityMutation.mutate({
                            chapterId: originalityChapterId,
                            suggestions: originalityResult.suggestions || [],
                            flaggedPhrases: originalityResult.flaggedPhrases || [],
                          });
                        }
                      }}
                    >
                      {enhanceFromOriginalityMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جارٍ تحسين النص...</>
                      ) : (
                        <><Wand2 className="w-4 h-4 ml-2" /> تحسين النص تلقائياً بناءً على الملاحظات</>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center mt-2">سيتم حفظ نسخة من النص الحالي قبل التحسين يمكنك استعادتها من سجل النسخ</p>
                  </div>
                )}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

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

        <AlertDialog open={showFullRegenDialog} onOpenChange={setShowFullRegenDialog}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle data-testid="text-full-regen-title">إعادة إنشاء {labels.typeLabel} بالكامل</AlertDialogTitle>
              <AlertDialogDescription data-testid="text-full-regen-desc" className="space-y-2">
                <span className="block">سيتم حذف جميع {labels.chaptersLabel} الحالية وإعادة إنشاء {labels.outlineLabel} من الصفر مع قائمة الشخصيات المحدّثة، ثم كتابة جميع {labels.chaptersLabel} تلقائياً.</span>
                <span className="block text-destructive font-medium">تحذير: هذا الإجراء لا يمكن التراجع عنه. جميع المحتوى الحالي سيُستبدل بالكامل.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row-reverse gap-2">
              <AlertDialogCancel data-testid="button-cancel-full-regen">إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setShowFullRegenDialog(false);
                  fullRegenerateMutation.mutate();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-full-regen"
              >
                نعم، أعد إنشاء {labels.typeLabel} بالكامل
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showRegenerateCoverConfirm} onOpenChange={setShowRegenerateCoverConfirm}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle data-testid="text-confirm-regenerate-cover-title">إعادة إنشاء الغلاف</AlertDialogTitle>
              <AlertDialogDescription data-testid="text-confirm-regenerate-cover-desc">
                هل أنت متأكد من إعادة إنشاء غلاف الرواية؟ سيتم استبدال الغلاف الحالي بغلاف جديد.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row-reverse gap-2">
              <AlertDialogCancel data-testid="button-cancel-regenerate-cover">إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  setShowRegenerateCoverConfirm(false);
                  setIsGeneratingCover(true);
                  try {
                    const res = await apiRequest("POST", `/api/projects/${projectId}/generate-cover`);
                    await res.json();
                    queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
                    toast({ title: `تم إعادة إنشاء غلاف ${labels.typeLabel} بنجاح` });
                  } catch {
                    toast({ title: "فشل في إعادة إنشاء الغلاف", variant: "destructive" });
                  } finally {
                    setIsGeneratingCover(false);
                  }
                }}
                data-testid="button-confirm-regenerate-cover"
              >
                نعم، أعد إنشاء الغلاف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
