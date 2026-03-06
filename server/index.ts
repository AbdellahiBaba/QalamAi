import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient";
import { WebhookHandlers } from "./webhookHandlers";
import { checkSmtpStatus } from "./email";
import { processAllExpiredTrials } from "./trial-processor";
import { runLearningSession } from "./learning-engine";
import { processRetryQueue } from "./webhook-dispatcher";
import { storage } from "./storage";

const app = express();
app.set("trust proxy", 1);
app.use(compression());
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL required for Stripe integration");
    return;
  }

  try {
    console.log("Initializing Stripe schema...");
    await runMigrations({ databaseUrl, schema: "stripe" });
    console.log("Stripe schema ready");

    const stripeSync = await getStripeSync();

    console.log("Setting up managed webhook...");
    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
    try {
      const result = await stripeSync.findOrCreateManagedWebhook(
        `${webhookBaseUrl}/api/stripe/webhook`
      );
      console.log("Webhook configured:", JSON.stringify(result)?.substring(0, 200));
    } catch (webhookErr: any) {
      console.warn("Webhook setup failed (non-fatal):", webhookErr.message);
    }

    console.log("Syncing Stripe data...");
    stripeSync
      .syncBackfill()
      .then(() => console.log("Stripe data synced"))
      .catch((err: any) => console.error("Error syncing Stripe data:", err));
  } catch (error) {
    console.error("Failed to initialize Stripe:", error);
  }
}

initStripe().catch((err) => console.error("Stripe init error:", err));

app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      return res.status(400).json({ error: "توقيع Stripe مفقود" });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;

      if (!Buffer.isBuffer(req.body)) {
        console.error("STRIPE WEBHOOK ERROR: req.body is not a Buffer");
        return res.status(500).json({ error: "خطأ في معالجة الإشعار" });
      }

      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error("Webhook error:", error.message);
      res.status(400).json({ error: "خطأ في معالجة الإشعار" });
    }
  }
);

app.use(
  express.json({
    limit: "5mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "طلبات كثيرة جداً — حاول مرة أخرى بعد دقيقة" },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/reset-password", authLimiter);

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "طلبات كثيرة جداً — حاول مرة أخرى بعد دقيقة" },
});
app.use("/api/projects/:id/generate-outline", aiLimiter);
app.use("/api/projects/:projectId/chapters/:chapterId/generate", aiLimiter);
app.use("/api/projects/:id/chat", aiLimiter);
app.use("/api/projects/:id/generate-cover", aiLimiter);
app.use("/api/chat", aiLimiter);
app.use("/api/projects/suggest-titles", aiLimiter);
app.use("/api/projects/suggest-full", aiLimiter);

const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "طلبات كثيرة جداً — حاول مرة أخرى بعد دقيقة" },
});
app.use("/api/tickets", publicLimiter);
app.use("/api/reports", publicLimiter);

const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req.path.startsWith("/api/"),
  message: { error: "طلبات كثيرة جداً — حاول مرة أخرى بعد دقيقة" },
});
app.use(generalApiLimiter);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
      checkSmtpStatus();

      const TRIAL_CHECK_INTERVAL = 5 * 60 * 1000;
      setInterval(() => {
        processAllExpiredTrials().catch((err) =>
          console.error("[TrialProcessor] Background job error:", err)
        );
      }, TRIAL_CHECK_INTERVAL);
      log("Trial expiry background job started (every 5 minutes)");

      const WEBHOOK_RETRY_INTERVAL = 60 * 1000;
      setInterval(() => {
        processRetryQueue().catch((err) =>
          console.error("[Webhook] Retry queue error:", err)
        );
      }, WEBHOOK_RETRY_INTERVAL);
      log("Webhook retry queue processor started (every 60 seconds)");

      const LEARNING_INTERVAL = 24 * 60 * 60 * 1000;
      setInterval(async () => {
        try {
          const isEnabled = await storage.isFeatureEnabled("auto_learning");
          if (!isEnabled) return;
          log("Starting auto learning session...", "learning");
          await runLearningSession("auto_scheduled");
          log("Auto learning session completed", "learning");
        } catch (err: any) {
          console.error("[LearningEngine] Auto learning error:", err.message);
        }
      }, LEARNING_INTERVAL);
      log("Auto-learning background job registered (every 24 hours)");
    },
  );
})();
