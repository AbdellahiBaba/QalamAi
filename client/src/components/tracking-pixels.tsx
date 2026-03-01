import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ttqIdentify } from "@/lib/ttq";

interface PixelConfig {
  platform: string;
  pixelId: string;
}

declare global {
  interface Window {
    TiktokAnalyticsObject: string;
    ttq: any;
    fbq: any;
    _fbq: any;
  }
}

let facebookInitialized = false;

function injectFacebookPixel(pixelId: string) {
  if (facebookInitialized) return;
  if (window.fbq) { facebookInitialized = true; return; }
  facebookInitialized = true;

  const w = window as any;
  const n: any = w.fbq = function () {
    if (n.callMethod) {
      n.callMethod.apply(n, arguments);
    } else {
      n.queue.push(arguments);
    }
  };
  if (!w._fbq) w._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  n.queue = [];

  const scriptEl = document.createElement("script");
  scriptEl.async = true;
  scriptEl.src = "https://connect.facebook.net/en_US/fbevents.js";
  const firstScript = document.getElementsByTagName("script")[0];
  if (firstScript && firstScript.parentNode) {
    firstScript.parentNode.insertBefore(scriptEl, firstScript);
  } else {
    document.head.appendChild(scriptEl);
  }

  w.fbq("init", pixelId);
  w.fbq("track", "PageView");

  const noscript = document.createElement("noscript");
  noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1" />`;
  document.body.appendChild(noscript);
}

export default function TrackingPixels() {
  const { data: pixels } = useQuery<PixelConfig[]>({
    queryKey: ["/api/tracking-pixels"],
    staleTime: 5 * 60 * 1000,
  });

  const { user } = useAuth();
  const [location] = useLocation();

  useEffect(() => {
    if (user && window.ttq) {
      ttqIdentify({ email: (user as any).email, id: String((user as any).id || (user as any).email) });
    }
  }, [user]);

  useEffect(() => {
    if (!pixels) return;
    for (const pixel of pixels) {
      if (pixel.platform === "facebook") {
        injectFacebookPixel(pixel.pixelId);
      }
    }
  }, [pixels]);

  useEffect(() => {
    if (!pixels) return;
    for (const pixel of pixels) {
      if (pixel.platform === "tiktok" && window.ttq) {
        window.ttq.page();
      }
      if (pixel.platform === "facebook" && window.fbq) {
        window.fbq("track", "PageView");
      }
    }
  }, [location, pixels]);

  return null;
}
