import { storage } from "./storage";
import type { TrackingPixel } from "@shared/schema";

let cachedPixels: TrackingPixel[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 60000;

async function getEnabledPixels(): Promise<TrackingPixel[]> {
  const now = Date.now();
  if (cachedPixels && now - cacheTime < CACHE_TTL) return cachedPixels;
  cachedPixels = (await storage.getTrackingPixels()).filter(p => p.enabled && p.pixelId);
  cacheTime = now;
  return cachedPixels;
}

export function invalidatePixelCache() {
  cachedPixels = null;
}

interface EventData {
  eventName: string;
  eventId?: string;
  userId?: string;
  value?: number;
  currency?: string;
  contentType?: string;
  contentId?: string;
  ip?: string;
  userAgent?: string;
}

export async function trackServerEvent(data: EventData) {
  try {
    const pixels = await getEnabledPixels();
    const promises: Promise<void>[] = [];
    for (const pixel of pixels) {
      if (!pixel.accessToken) continue;
      if (pixel.platform === "tiktok") {
        promises.push(trackTikTokServerEvent(pixel, data));
      } else if (pixel.platform === "facebook") {
        promises.push(trackFacebookServerEvent(pixel, data));
      }
    }
    await Promise.allSettled(promises);
  } catch (err) {
    console.error("[Tracking] Server event error:", err);
  }
}

async function trackTikTokServerEvent(pixel: TrackingPixel, data: EventData): Promise<void> {
  const eventId = data.eventId || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const body = {
    pixel_code: pixel.pixelId,
    event: data.eventName,
    event_id: eventId,
    timestamp: new Date().toISOString(),
    context: {
      user: {
        external_id: data.userId ? hashSHA256(data.userId) : undefined,
      },
      ip: data.ip,
      user_agent: data.userAgent,
    },
    properties: {
      value: data.value,
      currency: data.currency || "USD",
      content_type: data.contentType || "product",
      content_id: data.contentId,
    },
  };

  const res = await fetch("https://business-api.tiktok.com/open_api/v1.2/pixel/track/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Access-Token": pixel.accessToken!,
    },
    body: JSON.stringify([body]),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[TikTok Events API] Error:", res.status, text);
  }
}

async function trackFacebookServerEvent(pixel: TrackingPixel, data: EventData): Promise<void> {
  const eventId = data.eventId || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const eventData: any = {
    event_name: data.eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: "website",
    user_data: {
      external_id: data.userId ? [hashSHA256(data.userId)] : undefined,
      client_ip_address: data.ip,
      client_user_agent: data.userAgent,
    },
  };

  if (data.value) {
    eventData.custom_data = {
      value: data.value,
      currency: data.currency || "USD",
      content_type: data.contentType || "product",
      content_ids: data.contentId ? [data.contentId] : undefined,
    };
  }

  const res = await fetch(`https://graph.facebook.com/v18.0/${pixel.pixelId}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: [eventData],
      access_token: pixel.accessToken,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[Facebook Conversions API] Error:", res.status, text);
  }
}

function hashSHA256(value: string): string {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(value).digest("hex");
}
