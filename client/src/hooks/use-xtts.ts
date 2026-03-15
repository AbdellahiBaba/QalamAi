import { useState, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export function useXTTS() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setPlaying(false);
  }, []);

  const speak = useCallback(async (text: string) => {
    if (playing) {
      stop();
      return;
    }
    if (!text.trim()) {
      toast({ title: "لا يوجد نص للقراءة", variant: "destructive" });
      return;
    }

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
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.error || "فشل في توليد الصوت");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setPlaying(false);
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }
      };
      audio.onerror = () => {
        setPlaying(false);
        toast({ title: "حدث خطأ أثناء التشغيل", variant: "destructive" });
      };
      await audio.play();
      setPlaying(true);
    } catch (err: any) {
      toast({ title: err.message || "خدمة الصوت غير متاحة حالياً", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [playing, stop, toast]);

  return { speak, stop, loading, playing };
}
