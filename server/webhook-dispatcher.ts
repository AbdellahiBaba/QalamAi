import { storage } from "./storage";

const RETRY_DELAYS = [5000, 30000, 120000];
const WEBHOOK_TIMEOUT = 10000;

export interface WebhookPayload {
  input: string;
  output: string;
  category: string;
  correction: string | null;
  timestamp: string;
  metadata: {
    session_id: string;
    language: string;
    word_count: number;
  };
}

async function isWebhookEnabled(): Promise<boolean> {
  try {
    return await storage.isFeatureEnabled("training_webhook");
  } catch {
    return false;
  }
}

export function dispatchWebhook(payload: WebhookPayload): void {
  sendWebhookAsync(payload).catch((err) => {
    console.error("[Webhook] Dispatch error:", err.message);
  });
}

async function sendWebhookAsync(payload: WebhookPayload): Promise<void> {
  const enabled = await isWebhookEnabled();
  if (!enabled) return;

  const webhookUrl = process.env.TRAINING_WEBHOOK_URL;
  const webhookSecret = process.env.WEBHOOK_SECRET;

  if (!webhookUrl) {
    console.warn("[Webhook] TRAINING_WEBHOOK_URL not configured, skipping");
    return;
  }

  const body = JSON.stringify(payload);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(webhookSecret ? { "X-Webhook-Secret": webhookSecret } : {}),
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      await storage.createWebhookDelivery({
        payload,
        status: "delivered",
        statusCode: response.status,
        retryCount: 0,
      });
    } else {
      const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
      const nextRetry = new Date(Date.now() + RETRY_DELAYS[0]);
      await storage.createWebhookDelivery({
        payload,
        status: "pending",
        statusCode: response.status,
        errorMessage: errorMsg,
        retryCount: 0,
        nextRetryAt: nextRetry,
      });
      console.warn(`[Webhook] Failed (${response.status}), queued for retry`);
    }
  } catch (err: any) {
    const errorMsg = err.name === "AbortError" ? "Request timeout" : err.message;
    const nextRetry = new Date(Date.now() + RETRY_DELAYS[0]);
    await storage.createWebhookDelivery({
      payload,
      status: "pending",
      errorMessage: errorMsg,
      retryCount: 0,
      nextRetryAt: nextRetry,
    });
    console.warn(`[Webhook] Failed (${errorMsg}), queued for retry`);
  }
}

export async function processRetryQueue(): Promise<void> {
  const pending = await storage.getPendingWebhookRetries();
  if (pending.length === 0) return;

  const webhookUrl = process.env.TRAINING_WEBHOOK_URL;
  const webhookSecret = process.env.WEBHOOK_SECRET;

  if (!webhookUrl) return;

  for (const delivery of pending) {
    const retryNum = delivery.retryCount + 1;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT);

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(webhookSecret ? { "X-Webhook-Secret": webhookSecret } : {}),
        },
        body: JSON.stringify(delivery.payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        await storage.updateWebhookDelivery(delivery.id, {
          status: "delivered",
          statusCode: response.status,
          retryCount: retryNum,
          deliveredAt: new Date(),
        });
      } else {
        if (retryNum >= 3) {
          await storage.updateWebhookDelivery(delivery.id, {
            status: "failed",
            statusCode: response.status,
            errorMessage: `HTTP ${response.status} after ${retryNum} retries`,
            retryCount: retryNum,
          });
        } else {
          const nextRetry = new Date(Date.now() + RETRY_DELAYS[retryNum]);
          await storage.updateWebhookDelivery(delivery.id, {
            status: "pending",
            statusCode: response.status,
            errorMessage: `HTTP ${response.status}`,
            retryCount: retryNum,
            nextRetryAt: nextRetry,
          });
        }
      }
    } catch (err: any) {
      const errorMsg = err.name === "AbortError" ? "Request timeout" : err.message;
      if (retryNum >= 3) {
        await storage.updateWebhookDelivery(delivery.id, {
          status: "failed",
          errorMessage: `${errorMsg} after ${retryNum} retries`,
          retryCount: retryNum,
        });
      } else {
        const nextRetry = new Date(Date.now() + RETRY_DELAYS[retryNum]);
        await storage.updateWebhookDelivery(delivery.id, {
          status: "pending",
          errorMessage: errorMsg,
          retryCount: retryNum,
          nextRetryAt: nextRetry,
        });
      }
    }
  }
}

export function mapProjectTypeToCategory(projectType: string | null): string {
  const categoryMap: Record<string, string> = {
    novel: "novel",
    essay: "essay",
    scenario: "script",
    short_story: "novel",
    khawater: "article",
    social_media: "article",
    poetry: "poetry",
    memoire: "academic",
  };
  return categoryMap[projectType || ""] || "general";
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}
