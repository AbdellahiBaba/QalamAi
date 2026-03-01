import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface PixelConfig {
  platform: string;
  pixelId: string;
}

declare global {
  interface Window {
    ttq: any;
    fbq: any;
    _fbq: any;
  }
}

function injectTikTokPixel(pixelId: string) {
  if (document.getElementById("tiktok-pixel-script")) return;

  const script = document.createElement("script");
  script.id = "tiktok-pixel-script";
  script.innerHTML = `
    !function (w, d, t) {
      w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var a=document.createElement("script");a.type="text/javascript",a.async=!0,a.src=r+"?sdkid="+e+"&lib="+t;var s=document.getElementsByTagName("script")[0];s.parentNode.insertBefore(a,s)};
      ttq.load('${pixelId}');
      ttq.page();
    }(window, document, 'ttq');
  `;
  document.head.appendChild(script);
}

function injectFacebookPixel(pixelId: string) {
  if (document.getElementById("facebook-pixel-script")) return;

  const script = document.createElement("script");
  script.id = "facebook-pixel-script";
  script.innerHTML = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${pixelId}');
    fbq('track', 'PageView');
  `;
  document.head.appendChild(script);

  const noscript = document.createElement("noscript");
  noscript.id = "facebook-pixel-noscript";
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
