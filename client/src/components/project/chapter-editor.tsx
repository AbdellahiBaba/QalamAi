import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  BookOpen, Feather, Loader2, CheckCircle, FileText, Sparkles,
  ChevronDown, ChevronUp, Download, RefreshCw,
  Pencil, Save, X, Eye, RotateCcw, History,
  Shield, Bookmark, Wand2, Info, Maximize2, Minimize2, Clock, GripVertical
} from "lucide-react";
import { generateChapterPreviewPDF } from "@/lib/pdf-generator";
import LtrNum from "@/components/ui/ltr-num";
import { toArabicOrdinal } from "@shared/utils";
import type { ProjectData, TypeLabels } from "./types";
import type { ChapterVersion, Bookmark as BookmarkType } from "@shared/schema";

interface ChapterEditorProps {
  project: ProjectData;
  projectId: string;
  labels: TypeLabels;
  hasAccess: boolean;
  expandedChapter: number | null;
  setExpandedChapter: (id: number | null) => void;
  autoWriteAll: boolean;
  setAutoWriteAll: (val: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function ChapterEditor({
  project, projectId, labels, hasAccess,
  expandedChapter, setExpandedChapter,
  autoWriteAll, setAutoWriteAll,
  activeTab, setActiveTab,
}: ChapterEditorProps) {
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);

  const [generatingChapter, setGeneratingChapter] = useState<number | null>(null);
  const [streamedContent, setStreamedContent] = useState("");
  const [generationProgress, setGenerationProgress] = useState<{ currentPart: number; totalParts: number } | null>(null);
  const [confirmRegenerate, setConfirmRegenerate] = useState<number | null>(null);
  const [editingChapter, setEditingChapter] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
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
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [draggedChapterId, setDraggedChapterId] = useState<number | null>(null);
  const [dragOverChapterId, setDragOverChapterId] = useState<number | null>(null);
  const [focusModeChapterId, setFocusModeChapterId] = useState<number | null>(null);
  const [focusContent, setFocusContent] = useState("");
  const [focusVisible, setFocusVisible] = useState(false);
  const focusTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const lastSavedContentRef = useRef<string>("");
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const editContentRef = useRef<string>("");
  const [summarizingChapterId, setSummarizingChapterId] = useState<number | null>(null);

  const getLocalStorageKey = useCallback((chapterId: number) => {
    return `qalam-draft-${projectId}-${chapterId}`;
  }, [projectId]);

  const saveToLocalStorage = useCallback((chapterId: number, content: string) => {
    try {
      localStorage.setItem(getLocalStorageKey(chapterId), JSON.stringify({ content, timestamp: Date.now() }));
    } catch {}
  }, [getLocalStorageKey]);

  const loadFromLocalStorage = useCallback((chapterId: number): string | null => {
    try {
      const raw = localStorage.getItem(getLocalStorageKey(chapterId));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.content && typeof parsed.content === "string") {
        return parsed.content;
      }
    } catch {}
    return null;
  }, [getLocalStorageKey]);

  const clearLocalStorageDraft = useCallback((chapterId: number) => {
    try {
      localStorage.removeItem(getLocalStorageKey(chapterId));
    } catch {}
  }, [getLocalStorageKey]);

  useEffect(() => {
    editContentRef.current = editContent;
  }, [editContent]);

  useEffect(() => {
    if (editingChapter === null) {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      setAutoSaveStatus("idle");
      return;
    }

    autoSaveTimerRef.current = setInterval(() => {
      const currentContent = editContentRef.current;
      if (currentContent && currentContent !== lastSavedContentRef.current && !autoSaveMutation.isPending) {
        saveToLocalStorage(editingChapter, currentContent);
        setAutoSaveStatus("saving");
        autoSaveMutation.mutate({ chapterId: editingChapter, content: currentContent });
      }
    }, 30000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [editingChapter, saveToLocalStorage]);

  useEffect(() => {
    if (editContent && editingChapter !== null) {
      saveToLocalStorage(editingChapter, editContent);
    }
  }, [editContent, editingChapter, saveToLocalStorage]);

  const saveChapterMutation = useMutation({
    mutationFn: async ({ chapterId, content }: { chapterId: number; content: string }) => {
      const res = await apiRequest("PATCH", `/api/projects/${projectId}/chapters/${chapterId}`, { content });
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: "تم حفظ التعديلات" });
      setEditingChapter(null);
      clearLocalStorageDraft(variables.chapterId);
      lastSavedContentRef.current = variables.content;
    },
    onError: () => {
      toast({ title: "فشل في حفظ التعديلات", variant: "destructive" });
    },
  });

  const autoSaveMutation = useMutation({
    mutationFn: async ({ chapterId, content }: { chapterId: number; content: string }) => {
      const res = await apiRequest("PATCH", `/api/projects/${projectId}/chapters/${chapterId}`, { content });
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      lastSavedContentRef.current = variables.content;
      setAutoSaveStatus("saved");
      setTimeout(() => setAutoSaveStatus("idle"), 3000);
    },
    onError: () => {
      setAutoSaveStatus("idle");
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

  const summarizeMutation = useMutation({
    mutationFn: async (chapterId: number) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/chapters/${chapterId}/summarize`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      setSummarizingChapterId(null);
      toast({ title: "تم إنشاء ملخص الفصل" });
    },
    onError: (err: any) => {
      setSummarizingChapterId(null);
      toast({ title: err?.message || "فشل في إنشاء الملخص", variant: "destructive" });
    },
  });

  const reorderChaptersMutation = useMutation({
    mutationFn: async (chapterIds: number[]) => {
      const res = await apiRequest("PATCH", `/api/projects/${projectId}/reorder-chapters`, { chapterIds });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: "تم إعادة ترتيب الفصول" });
    },
    onError: () => {
      toast({ title: "فشل في إعادة ترتيب الفصول", variant: "destructive" });
    },
  });

  const handleDragStart = (e: React.DragEvent, chapterId: number) => {
    setDraggedChapterId(chapterId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(chapterId));
  };

  const handleDragOver = (e: React.DragEvent, chapterId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (chapterId !== draggedChapterId) {
      setDragOverChapterId(chapterId);
    }
  };

  const handleDragLeave = () => {
    setDragOverChapterId(null);
  };

  const handleDrop = (e: React.DragEvent, targetChapterId: number) => {
    e.preventDefault();
    setDragOverChapterId(null);

    if (!draggedChapterId || draggedChapterId === targetChapterId || !project.chapters) {
      setDraggedChapterId(null);
      return;
    }

    const sortedChapters = [...project.chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);
    const chapterIds = sortedChapters.map(c => c.id);
    const fromIndex = chapterIds.indexOf(draggedChapterId);
    const toIndex = chapterIds.indexOf(targetChapterId);

    if (fromIndex === -1 || toIndex === -1) {
      setDraggedChapterId(null);
      return;
    }

    chapterIds.splice(fromIndex, 1);
    chapterIds.splice(toIndex, 0, draggedChapterId);

    reorderChaptersMutation.mutate(chapterIds);
    setDraggedChapterId(null);
  };

  const handleDragEnd = () => {
    setDraggedChapterId(null);
    setDragOverChapterId(null);
  };

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

  const enterFocusMode = (chapterId: number, content: string) => {
    setFocusModeChapterId(chapterId);
    setFocusContent(content);
    requestAnimationFrame(() => {
      setFocusVisible(true);
      setTimeout(() => focusTextareaRef.current?.focus(), 300);
    });
  };

  const exitFocusMode = () => {
    setFocusVisible(false);
    setTimeout(() => {
      setFocusModeChapterId(null);
      setFocusContent("");
    }, 300);
  };

  const saveFocusContent = () => {
    if (focusModeChapterId) {
      saveChapterMutation.mutate({ chapterId: focusModeChapterId, content: focusContent });
    }
  };

  useEffect(() => {
    if (focusModeChapterId === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        exitFocusMode();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [focusModeChapterId]);

  const focusWordCount = focusContent.trim() ? focusContent.trim().split(/\s+/).length : 0;

  if (!project.outlineApproved) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <h3 className="font-serif text-xl font-semibold mb-2 text-foreground">{labels.mustApprove}</h3>
        <p>{labels.mustApproveDesc}</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {project.chapters && project.chapters.length > 0 ? (
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
                <Card
                  key={chapter.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, chapter.id)}
                  onDragOver={(e) => handleDragOver(e, chapter.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, chapter.id)}
                  onDragEnd={handleDragEnd}
                  className={`transition-all ${draggedChapterId === chapter.id ? "opacity-50" : ""} ${dragOverChapterId === chapter.id ? "border-primary border-2" : ""}`}
                  data-testid={`card-chapter-${chapter.id}`}
                >
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
                        <GripVertical
                          className="w-4 h-4 text-muted-foreground/50 cursor-grab shrink-0"
                          data-testid={`drag-handle-chapter-${chapter.id}`}
                        />
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
                            <div className="flex items-center gap-2 justify-end flex-wrap">
                              {autoSaveStatus === "saving" && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1" data-testid="text-auto-save-saving">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  جارٍ الحفظ التلقائي...
                                </span>
                              )}
                              {autoSaveStatus === "saved" && (
                                <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1" data-testid="text-auto-save-saved">
                                  <Clock className="w-3 h-3" />
                                  تم الحفظ التلقائي
                                </span>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingChapter(null);
                                  setAutoSaveStatus("idle");
                                }}
                                data-testid={`button-cancel-edit-${chapter.id}`}
                              >
                                <X className="w-3.5 h-3.5 ml-1" />
                                إلغاء
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => saveChapterMutation.mutate({ chapterId: chapter.id, content: editContent })}
                                disabled={saveChapterMutation.isPending || autoSaveMutation.isPending}
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
                              <>
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
                                    const draft = loadFromLocalStorage(chapter.id);
                                    if (draft && draft !== chapter.content) {
                                      setEditContent(draft);
                                      toast({ title: "تم استعادة مسودة محفوظة محلياً" });
                                    } else {
                                      setEditContent(chapter.content || "");
                                    }
                                    lastSavedContentRef.current = chapter.content || "";
                                    setEditingChapter(chapter.id);
                                    setAutoSaveStatus("idle");
                                  }}
                                  data-testid={`button-edit-chapter-${chapter.id}`}
                                >
                                  <Pencil className="w-3.5 h-3.5 ml-1" />
                                  تحرير
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    enterFocusMode(chapter.id, chapter.content || "");
                                  }}
                                  data-testid={`button-focus-mode-${chapter.id}`}
                                >
                                  <Maximize2 className="w-3.5 h-3.5 ml-1" />
                                  وضع التركيز
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSummarizingChapterId(chapter.id);
                                    summarizeMutation.mutate(chapter.id);
                                  }}
                                  disabled={summarizeMutation.isPending && summarizingChapterId === chapter.id}
                                  data-testid={`button-summarize-chapter-${chapter.id}`}
                                >
                                  {summarizeMutation.isPending && summarizingChapterId === chapter.id ? (
                                    <Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" />
                                  ) : (
                                    <FileText className="w-3.5 h-3.5 ml-1" />
                                  )}
                                  ملخص الفصل
                                </Button>
                              </div>
                              {chapter.summary && (
                                <div className="border-t px-4 py-3 bg-muted/30" data-testid={`text-chapter-summary-${chapter.id}`}>
                                  <div className="flex items-start gap-2">
                                    <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                                    <div>
                                      <h5 className="text-xs font-medium text-muted-foreground mb-1">ملخص الفصل</h5>
                                      <p className="text-sm font-serif leading-relaxed">{chapter.summary}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                              </>
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
      </div>

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

      {focusModeChapterId !== null && (
        <div
          className={`focus-mode-overlay ${focusVisible ? "focus-mode-visible" : ""}`}
          data-testid="focus-mode-overlay"
        >
          <div className="focus-mode-toolbar">
            <div className="flex items-center gap-3">
              <span className="text-amber-200/70 text-sm font-serif" data-testid="text-focus-chapter-title">
                {project.chapters?.find(c => c.id === focusModeChapterId)?.title || labels.chapterSingular}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-amber-200/50 text-xs" data-testid="text-focus-word-count">
                {focusWordCount} كلمة
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="text-amber-200/70 hover:text-amber-100 no-default-hover-elevate"
                onClick={saveFocusContent}
                disabled={saveChapterMutation.isPending}
                data-testid="button-focus-save"
              >
                {saveChapterMutation.isPending ? (
                  <Loader2 className="w-4 h-4 ml-1 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 ml-1" />
                )}
                حفظ
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-amber-200/70 hover:text-amber-100 no-default-hover-elevate"
                onClick={exitFocusMode}
                data-testid="button-focus-exit"
              >
                <Minimize2 className="w-4 h-4 ml-1" />
                خروج
              </Button>
            </div>
          </div>
          <div className="focus-mode-editor">
            <textarea
              ref={focusTextareaRef}
              value={focusContent}
              onChange={(e) => setFocusContent(e.target.value)}
              className="focus-mode-textarea"
              dir="rtl"
              placeholder="ابدأ الكتابة..."
              data-testid="textarea-focus-mode"
            />
          </div>
          <div className="focus-mode-footer">
            <span className="text-amber-200/30 text-xs">
              اضغط Escape للخروج
            </span>
          </div>
        </div>
      )}
    </>
  );
}
