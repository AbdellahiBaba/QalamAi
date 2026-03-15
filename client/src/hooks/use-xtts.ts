import { useState, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export function useXTTS() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const prevUrlRef = useRef<string | null>(null);

  const clearAudio = useCallback(() => {
    if (prevUrlRef.current) {
      URL.revokeObjectURL(prevUrlRef.current);
      prevUrlRef.current = null;
    }
    setAudioUrl(null);
  }, []);

  const generate = useCallback(async (text: string) => {
    if (!text.trim()) {
      toast({ title: "لا يوجد نص للقراءة", variant: "destructive" });
      return;
    }

    clearAudio();
    setLoading(true);
    try {
      const res = await fetch("/api/tts/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": getCsrfToken(),
        },
        credentials: "include",
        body: JSON.stringify({ text: text.substring(0, 5000) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "فشل في توليد الصوت" }));
        throw new Error((err as Record<string, string>)?.error || "فشل في توليد الصوت");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      prevUrlRef.current = url;
      setAudioUrl(url);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "خدمة الصوت غير متاحة حالياً";
      toast({ title: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [clearAudio, toast]);

  return { generate, clearAudio, loading, audioUrl };
}
