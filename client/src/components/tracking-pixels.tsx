import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

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

let tiktokInitialized = false;
let facebookInitialized = false;

function injectTikTokPixel(pixelId: string) {
  if (tiktokInitialized) return;
  tiktokInitialized = true;

  const w = window as any;
  const t = "ttq";
  w.TiktokAnalyticsObject = t;
  const ttq = w[t] = w[t] || [];
  ttq.methods = [
    "page", "track", "identify", "instances", "debug", "on", "off",
    "once", "ready", "alias", "group", "enableCookie", "disableCookie",
    "holdConsent", "revokeConsent", "grantConsent"
  ];
  ttq.setAndDefer = function (obj: any, method: string) {
    obj[method] = function () {
      obj.push([method].concat(Array.prototype.slice.call(arguments, 0)));
    };
  };
  for (let i = 0; i < ttq.methods.length; i++) {
    ttq.setAndDefer(ttq, ttq.methods[i]);
  }
  ttq.instance = function (id: string) {
    const e = ttq._i[id] || [];
    for (let n = 0; n < ttq.methods.length; n++) {
      ttq.setAndDefer(e, ttq.methods[n]);
    }
    return e;
  };
  ttq.load = function (id: string, opts?: any) {
    const sdkUrl = "https://analytics.tiktok.com/i18n/pixel/events.js";
    ttq._i = ttq._i || {};
    ttq._i[id] = [];
    ttq._i[id]._u = sdkUrl;
    ttq._t = ttq._t || {};
    ttq._t[id] = +new Date();
    ttq._o = ttq._o || {};
    ttq._o[id] = opts || {};
    const scriptEl = document.createElement("script");
    scriptEl.type = "text/javascript";
    scriptEl.async = true;
    scriptEl.src = sdkUrl + "?sdkid=" + id + "&lib=" + t;
    const firstScript = document.getElementsByTagName("script")[0];
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(scriptEl, firstScript);
    } else {
      document.head.appendChild(scriptEl);
    }
  };

  ttq.load(pixelId);
  ttq.page();
}

function injectFacebookPixel(pixelId: string) {
  if (facebookInitialized) return;
  facebookInitialized = true;

  const w = window as any;
  if (w.fbq) return;

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

  const [location] = useLocation();

  useEffect(() => {
    if (!pixels) return;
    for (const pixel of pixels) {
      if (pixel.platform === "tiktok") {
        injectTikTokPixel(pixel.pixelId);
      } else if (pixel.platform === "facebook") {
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
