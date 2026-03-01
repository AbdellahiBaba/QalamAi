declare global {
  interface Window {
    ttq: any;
  }
}

async function sha256(value: string): Promise<string> {
  if (!crypto?.subtle?.digest) return value.trim().toLowerCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(value.trim().toLowerCase());
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function ttqIdentify(user: { email?: string; id?: string }) {
  if (!window.ttq) return;
  (async () => {
    try {
      const identifyData: Record<string, string> = {};
      if (user.email) {
        identifyData.email = await sha256(user.email);
      }
      if (user.id) {
        identifyData.external_id = await sha256(user.id);
      }
      if (Object.keys(identifyData).length > 0) {
        window.ttq.identify(identifyData);
      }
    } catch (_e) {}
  })();
}

export function ttqTrack(
  eventName: string,
  params?: {
    contentId?: string;
    contentType?: string;
    contentName?: string;
    value?: number;
    currency?: string;
    searchString?: string;
  }
) {
  if (!window.ttq) return;
  try {
    const eventData: Record<string, any> = {};
    if (params) {
      if (params.contentId || params.contentType || params.contentName) {
        eventData.contents = [
          {
            content_id: params.contentId || "",
            content_type: params.contentType || "product",
            content_name: params.contentName || "",
          },
        ];
      }
      if (params.value !== undefined) {
        eventData.value = params.value;
      }
      eventData.currency = params.currency || "USD";
      if (params.searchString) {
        eventData.search_string = params.searchString;
      }
    }
    window.ttq.track(eventName, eventData);
  } catch (_e) {}
}
