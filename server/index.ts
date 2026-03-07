import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import helmet from "helmet";
import cors from "cors";
import crypto from "crypto";
import cookieParser from "cookie-parser";
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

app.disable("x-powered-by");

const allowedOrigins = [
  "https://qalamai.net",
  "https://www.qalamai.net",
];

const replitDomains = process.env.REPLIT_DOMAINS?.split(",").map(d => `https://${d}`) || [];
allowedOrigins.push(...replitDomains);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(allowed => origin === allowed || origin.endsWith(".replit.dev"))) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "X-CSRF-Token", "Stripe-Signature"],
  maxAge: 86400,
}));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://analytics.tiktok.com", "https://connect.facebook.net", "https://js.stripe.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
      connectSrc: ["'self'", "https://api.stripe.com", "https://analytics.tiktok.com", "https://www.facebook.com", "wss:", "ws:"],
      frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xContentTypeOptions: true,
  xFrameOptions: { action: "deny" },
}));

app.use((_req, res, next) => {
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(self)");
  next();
});

const BLOCKED_PATHS = new Set([
  "/server-status", "/server-info",
  "/crossdomain.xml", "/elmah.axd", "/web.config",
  "/phpinfo.php", "/wp-login.php",
]);

const BLOCKED_PREFIXES = [
  "/.", // all dotfiles: /.env, /.git/*, /.htpasswd, /.htaccess, /.DS_Store, /.svn/*, etc.
  "/wp-admin", "/wp-config",
  "/phpmyadmin",
  "/administrator",
  "/backup", "/backups",
  "/debug",
  "/dump",
  "/database",
  "/api/swagger", "/api/docs",
];

app.use((req, res, next) => {
  let p: string;
  try {
    p = decodeURIComponent(req.path).toLowerCase();
  } catch {
    p = req.path.toLowerCase();
  }
  const normalized = p.replace(/\/+/g, "/").replace(/\/+$/, "") || "/";

  if (BLOCKED_PATHS.has(normalized)) {
    return res.status(404).type("text/plain").send("");
  }

  for (const prefix of BLOCKED_PREFIXES) {
    if (normalized.startsWith(prefix)) {
      if (prefix === "/." && normalized.startsWith("/.well-known")) continue;
      return res.status(404).type("text/plain").send("");
    }
  }

  if (/\.(php|asp|aspx|jsp|cgi)(\.bak|\.old|\.orig|\/.*)?$/i.test(normalized)) {
    return res.status(404).type("text/plain").send("");
  }

  next();
});

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
    limit: "1mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(cookieParser());

app.use((req, res, next) => {
  if (!req.cookies?.["csrf-token"] && !req.path.startsWith("/api/stripe/webhook")) {
    const csrfToken = crypto.randomBytes(32).toString("hex");
    res.cookie("csrf-token", csrfToken, {
      httpOnly: false,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    });
  }
  next();
});

app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return next();
  }
  if (req.path === "/api/stripe/webhook") {
    return next();
  }

  const cookieToken = req.cookies?.["csrf-token"];
  const headerToken = req.headers["x-csrf-token"];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: "رمز الحماية غير صالح" });
  }
  next();
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "طلبات كثيرة جداً — حاول مرة أخرى بعد دقيقة" },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "طلبات كثيرة جداً — حاول مرة أخرى بعد دقيقة" },
});
app.use("/api/auth/forgot-password", passwordResetLimiter);
app.use("/api/auth/reset-password", passwordResetLimiter);

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

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "طلبات كثيرة جداً — حاول مرة أخرى بعد دقيقة" },
});
app.use("/api/profile/avatar", uploadLimiter);
app.use("/api/profile/generate-avatar", uploadLimiter);

const projectCreateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "طلبات كثيرة جداً — حاول مرة أخرى بعد دقيقة" },
});
app.use("/api/projects", (req, res, next) => {
  if (req.method === "POST") {
    return projectCreateLimiter(req, res, next);
  }
  next();
});

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

const SENSITIVE_FIELDS = ["password", "token", "secret", "access_token", "refresh_token", "client_secret"];

function sanitizeLogData(data: any): string {
  if (!data) return "";
  const str = JSON.stringify(data);
  let sanitized = str;
  for (const field of SENSITIVE_FIELDS) {
    const regex = new RegExp(`"${field}"\\s*:\\s*"[^"]*"`, "gi");
    sanitized = sanitized.replace(regex, `"${field}":"[REDACTED]"`);
  }
  return sanitized;
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
        logLine += ` :: ${sanitizeLogData(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
  }
  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    const clientMessage = status >= 500 ? "حدث خطأ داخلي في الخادم" : (err.message || "حدث خطأ");

    return res.status(status).json({ message: clientMessage });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

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
