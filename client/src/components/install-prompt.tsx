import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem("a2hs_dismissed");
    if (isDismissed) {
      const dismissedAt = parseInt(isDismissed);
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
        return;
      }
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("a2hs_dismissed", String(Date.now()));
  };

  if (!deferredPrompt || dismissed) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 bg-card border rounded-xl shadow-lg p-4 flex items-center gap-3"
      dir="rtl"
      data-testid="install-prompt"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">أضف قلم AI للشاشة الرئيسية</p>
        <p className="text-xs text-muted-foreground mt-0.5">وصول سريع بدون متصفح</p>
      </div>
      <Button size="sm" onClick={handleInstall} data-testid="button-install-app" className="shrink-0 gap-1">
        <Download className="w-3.5 h-3.5" />
        تثبيت
      </Button>
      <button
        onClick={handleDismiss}
        className="text-muted-foreground hover:text-foreground shrink-0"
        data-testid="button-dismiss-install"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
