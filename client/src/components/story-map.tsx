import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Layers, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import LtrNum from "@/components/ui/ltr-num";
import type { Chapter } from "@shared/schema";

interface StoryMapProps {
  projectId: string;
  chapters: Chapter[];
  projectType?: string;
}

const STATUS_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  draft: { bg: "bg-blue-500", border: "border-blue-400", label: "مسودة" },
  completed: { bg: "bg-green-500", border: "border-green-400", label: "مكتمل" },
  locked: { bg: "bg-gray-400", border: "border-gray-300", label: "مقفل" },
};

function getWordCount(content: string | null | undefined): number {
  if (!content) return 0;
  return content.split(/\s+/).filter((w: string) => w.length > 0).length;
}

export function StoryMap({ projectId, chapters, projectType }: StoryMapProps) {
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [hoveredChapter, setHoveredChapter] = useState<number | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showActs, setShowActs] = useState(false);
  const [analysisText, setAnalysisText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const wordCounts = useMemo(() => chapters.map(ch => getWordCount(ch.content)), [chapters]);
  const maxWords = useMemo(() => Math.max(...wordCounts, 1), [wordCounts]);

  const isNovel = projectType === "novel";

  const activeChapter = selectedChapter ?? hoveredChapter;

  useEffect(() => {
    if (selectedChapter === null) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest("[data-story-bar]")
      ) {
        setSelectedChapter(null);
        setPopoverPos(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedChapter]);

  const computePopoverPos = useCallback((el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const containerRect = scrollRef.current?.getBoundingClientRect();
    if (containerRect) {
      setPopoverPos({
        x: rect.left + rect.width / 2 - containerRect.left,
        y: rect.top - containerRect.top - 8,
      });
    }
  }, []);

  const handleBarClick = useCallback((chIdx: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (selectedChapter === chIdx) {
      setSelectedChapter(null);
      setPopoverPos(null);
      return;
    }
    computePopoverPos(e.currentTarget);
    setSelectedChapter(chIdx);
    setHoveredChapter(null);
  }, [selectedChapter, computePopoverPos]);

  const handleBarEnter = useCallback((chIdx: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (selectedChapter !== null) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    computePopoverPos(e.currentTarget);
    setHoveredChapter(chIdx);
  }, [selectedChapter, computePopoverPos]);

  const handleBarLeave = useCallback(() => {
    if (selectedChapter !== null) return;
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredChapter(null);
      setPopoverPos(null);
    }, 200);
  }, [selectedChapter]);

  const handlePopoverEnter = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  }, []);

  const handlePopoverLeave = useCallback(() => {
    if (selectedChapter !== null) return;
    setHoveredChapter(null);
    setPopoverPos(null);
  }, [selectedChapter]);

  const runAnalysis = async () => {
    if (isAnalyzing) {
      abortRef.current?.abort();
      setIsAnalyzing(false);
      return;
    }
    setIsAnalyzing(true);
    setAnalysisText("");
    try {
      const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
      const csrfVal = csrfMatch ? decodeURIComponent(csrfMatch[1]) : "";
      const controller = new AbortController();
      abortRef.current = controller;
      const res = await fetch(`/api/projects/${projectId}/structure-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfVal },
        signal: controller.signal,
        credentials: "include",
      });
      if (!res.ok) {
        const errBody: Record<string, string> = await res.json().catch(() => ({}));
        throw new Error(errBody.error || "فشل التحليل");
      }
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No stream");
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const payload = line.slice(6);
            if (payload === "[DONE]") break;
            try {
              const parsed = JSON.parse(payload);
              if (parsed.content) {
                setAnalysisText(prev => prev + parsed.content);
              }
            } catch {}
          }
        }
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error("فشل تحليل البنية");
      if (error.name !== "AbortError") {
        toast({ title: error.message || "فشل تحليل البنية", variant: "destructive" });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const act1End = Math.floor(chapters.length * 0.25);
  const act2End = Math.floor(chapters.length * 0.75);

  const activeCh = activeChapter !== null ? chapters[activeChapter] : null;
  const activeWc = activeChapter !== null ? wordCounts[activeChapter] : 0;

  return (
    <div className="space-y-4" data-testid="story-map-container">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {Object.entries(STATUS_COLORS).map(([key, val]) => (
              <span key={key} className="flex items-center gap-1">
                <span className={`w-2.5 h-2.5 rounded-sm ${val.bg}`} />
                {val.label}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isNovel && (
            <Button
              variant={showActs ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setShowActs(!showActs)}
              data-testid="button-toggle-acts"
            >
              <Layers className="w-3 h-3" />
              هيكل الفصول
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={runAnalysis}
            disabled={chapters.length === 0}
            data-testid="button-analyze-structure"
          >
            {isAnalyzing ? (
              <><Loader2 className="w-3 h-3 animate-spin" /> جارٍ التحليل...</>
            ) : (
              <><Sparkles className="w-3 h-3" /> تحليل البنية</>
            )}
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="relative overflow-x-auto rounded-lg border bg-muted/30 p-4"
        style={{ minHeight: 220 }}
        data-testid="story-map-chart"
      >
        {showActs && isNovel && chapters.length > 2 && (
          <div className="absolute inset-x-4 top-2 bottom-2 flex pointer-events-none z-0">
            {[
              { label: "الفصل الأول", start: 0, end: act1End },
              { label: "الفصل الثاني", start: act1End, end: act2End },
              { label: "الفصل الثالث", start: act2End, end: chapters.length },
            ].map((act, i) => {
              const w = ((act.end - act.start) / chapters.length) * 100;
              return (
                <div
                  key={i}
                  className={`relative border-l first:border-l-0 ${
                    i === 0 ? "border-blue-300/40 bg-blue-500/5" :
                    i === 1 ? "border-amber-300/40 bg-amber-500/5" :
                    "border-red-300/40 bg-red-500/5"
                  }`}
                  style={{ width: `${w}%` }}
                >
                  <span className="absolute top-1 right-2 text-[10px] font-medium text-muted-foreground/60">
                    {act.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div
          className="relative flex items-end gap-1.5 z-10"
          style={{ height: 160, minWidth: Math.max(chapters.length * 44, 200) }}
        >
          {chapters.map((ch, idx) => {
            const wc = wordCounts[idx];
            const barH = maxWords > 0 ? Math.max((wc / maxWords) * 140, 8) : 8;
            const status = ch.isPaid ? "locked" : (ch.status === "completed" ? "completed" : "draft");
            const colors = STATUS_COLORS[status] || STATUS_COLORS.draft;
            const isSelected = selectedChapter === idx;
            return (
              <div
                key={ch.id}
                className="flex flex-col items-center gap-1 cursor-pointer group"
                style={{ width: 36 }}
                data-story-bar
                onClick={(e) => handleBarClick(idx, e)}
                onMouseEnter={(e) => handleBarEnter(idx, e)}
                onMouseLeave={handleBarLeave}
                data-testid={`story-map-bar-${ch.id}`}
              >
                <div
                  className={`w-full rounded-t-sm transition-all duration-200 ${colors.bg} group-hover:opacity-80 border ${colors.border} ${isSelected ? "ring-2 ring-primary ring-offset-1" : ""}`}
                  style={{ height: barH }}
                />
                <span className="text-[9px] text-muted-foreground font-medium leading-none">
                  <LtrNum>{ch.chapterNumber}</LtrNum>
                </span>
              </div>
            );
          })}
        </div>

        {activeChapter !== null && activeCh && popoverPos && (
          <div
            ref={popoverRef}
            className="absolute z-50 bg-popover border rounded-lg shadow-lg p-3 min-w-[180px]"
            style={{
              left: popoverPos.x,
              top: popoverPos.y,
              transform: "translate(-50%, -100%)",
            }}
            onMouseEnter={handlePopoverEnter}
            onMouseLeave={handlePopoverLeave}
            data-testid="story-map-popover"
          >
            <p className="font-serif font-semibold text-sm mb-1 line-clamp-1" data-testid="popover-title">
              {activeCh.title || `فصل ${activeCh.chapterNumber}`}
            </p>
            <div className="space-y-0.5 text-[11px] text-muted-foreground">
              <p>عدد الكلمات: <span className="text-foreground font-medium"><LtrNum>{activeWc}</LtrNum></span></p>
              <p>الحالة: <Badge variant="outline" className="text-[10px] px-1 py-0">{(STATUS_COLORS[activeCh.isPaid ? "locked" : (activeCh.status === "completed" ? "completed" : "draft")] || STATUS_COLORS.draft).label}</Badge></p>
              {(activeCh.updatedAt || activeCh.createdAt) && (
                <p>آخر تعديل: {new Date((activeCh.updatedAt || activeCh.createdAt)!).toLocaleDateString("ar-EG", { month: "short", day: "numeric" })}</p>
              )}
            </div>
            <Link href={`/project/${projectId}/read/${activeCh.id}`}>
              <span className="inline-flex items-center gap-1 text-[11px] text-primary mt-1.5 cursor-pointer hover:underline" data-testid="popover-open-chapter">
                <ExternalLink className="w-3 h-3" /> افتح الفصل
              </span>
            </Link>
          </div>
        )}
      </div>

      {(analysisText || isAnalyzing) && (
        <Card data-testid="structure-analysis-panel">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h4 className="font-serif font-semibold text-sm">تحليل أبو هاشم للبنية</h4>
            </div>
            {isAnalyzing && !analysisText ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap font-serif" data-testid="text-structure-analysis">
                {analysisText}
                {isAnalyzing && <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5" />}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
