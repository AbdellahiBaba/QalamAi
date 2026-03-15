import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import helmet from "helmet";
import cors from "cors";
import crypto from "crypto";
import cookieParser from "cookie-parser";
import path from "path";
import rateLimit from "express-rate-limit";
import { registerRoutes, publishSocialPostToAPIs } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync, getUncachableStripeClient } from "./stripeClient";
import { WebhookHandlers } from "./webhookHandlers";
import { checkSmtpStatus, sendWeeklyDigest, sendMonthlyAuthorReport, sendPersonalizedFollowDigest } from "./email";
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
      frameSrc: ["'self'", "blob:", "https://js.stripe.com", "https://hooks.stripe.com"],
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
    const webhookUrl = `${webhookBaseUrl}/api/stripe/webhook`;

    // Remove any older duplicate records for this URL — keep only the newest
    try {
      const { Pool } = await import("pg");
      const cleanupPool = new Pool({ connectionString: databaseUrl });
      try {
        await cleanupPool.query(`
          DELETE FROM "stripe"."_managed_webhooks"
          WHERE url = $1
            AND id NOT IN (
              SELECT id FROM "stripe"."_managed_webhooks"
              WHERE url = $1
              ORDER BY created DESC
              LIMIT 1
            )
        `, [webhookUrl]);
      } finally {
        await cleanupPool.end();
      }
    } catch (_) {}

    try {
      const result = await stripeSync.findOrCreateManagedWebhook(webhookUrl);
      if (result?.id) {
        console.log("[stripe] Webhook configured:", result.id, result.url ?? "");
      } else {
        console.warn("[stripe] Webhook setup returned no ID — will retry on next startup");
      }

      // Ensure subscription lifecycle events are included in the webhook
      if (result?.id) {
        const stripeClient = await getUncachableStripeClient();
        const existing = await stripeClient.webhookEndpoints.retrieve(result.id);
        const requiredEvents = [
          "invoice.payment_failed",
          "invoice.payment_succeeded",
          "invoice.paid",
          "customer.subscription.deleted",
          "customer.subscription.updated",
        ];
        const existingEvents: string[] = (existing.enabled_events as string[]) || [];
        const missingEvents = requiredEvents.filter((e) => !existingEvents.includes(e) && !existingEvents.includes("*"));
        if (missingEvents.length > 0) {
          await stripeClient.webhookEndpoints.update(result.id, {
            enabled_events: [...existingEvents, ...missingEvents] as any,
          });
          console.log("Webhook events updated with:", missingEvents.join(", "));
        }
      }
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
app.use("/api/authors/:id/rate", publicLimiter);
app.use("/api/public/essays/:id/react", publicLimiter);

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

async function runStartupMigrations() {
  // Ensure required columns and tables exist (safe, idempotent startup migrations)
  try {
    const { pool } = await import("./db");

    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(2)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_prompts (
        id SERIAL PRIMARY KEY,
        prompt_text TEXT NOT NULL,
        prompt_date VARCHAR(10) NOT NULL UNIQUE,
        active BOOLEAN NOT NULL DEFAULT true,
        winner_id VARCHAR,
        winner_entry_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_daily_prompts_date ON daily_prompts (prompt_date)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_prompt_entries (
        id SERIAL PRIMARY KEY,
        prompt_id INTEGER NOT NULL REFERENCES daily_prompts(id) ON DELETE CASCADE,
        user_id VARCHAR NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT uq_prompt_user UNIQUE (prompt_id, user_id)
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_prompt_entries_prompt ON daily_prompt_entries (prompt_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_prompt_entries_user ON daily_prompt_entries (user_id)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS author_tips (
        id SERIAL PRIMARY KEY,
        from_user_id VARCHAR,
        to_author_id VARCHAR NOT NULL,
        project_id INTEGER,
        amount_cents INTEGER NOT NULL,
        stripe_session_id VARCHAR,
        status VARCHAR NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_author_tips_to ON author_tips (to_author_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_author_tips_session ON author_tips (stripe_session_id)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS content_series (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_content_series_user ON content_series (user_id)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS series_items (
        id SERIAL PRIMARY KEY,
        series_id INTEGER NOT NULL REFERENCES content_series(id) ON DELETE CASCADE,
        project_id INTEGER NOT NULL,
        order_index INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT uq_series_project UNIQUE (series_id, project_id)
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_series_items_series ON series_items (series_id)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_subscriptions (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        author_id VARCHAR(255) NOT NULL,
        token VARCHAR(128) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT uq_email_author UNIQUE (email, author_id)
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_subs_author ON email_subscriptions (author_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_subs_token ON email_subscriptions (token)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS social_posts (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        platforms TEXT[] NOT NULL,
        scheduled_at TIMESTAMP,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        post_type VARCHAR(30) NOT NULL DEFAULT 'marketing',
        cover_image_url TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts (status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled ON social_posts (scheduled_at)`);
    await pool.query(`ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS social_post_insights (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
        likes INTEGER NOT NULL DEFAULT 0,
        shares INTEGER NOT NULL DEFAULT 0,
        reach INTEGER NOT NULL DEFAULT 0,
        clicks INTEGER NOT NULL DEFAULT 0,
        comments INTEGER NOT NULL DEFAULT 0,
        logged_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_social_insights_post ON social_post_insights (post_id)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS social_hub_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL DEFAULT '{}',
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`DROP INDEX IF EXISTS idx_projects_search_title`);
    await pool.query(`DROP INDEX IF EXISTS idx_projects_search_desc`);
    await pool.query(`DROP INDEX IF EXISTS idx_users_search_name`);

    await pool.query(`ALTER TABLE novel_projects ADD COLUMN IF NOT EXISTS search_tsv tsvector GENERATED ALWAYS AS (
      to_tsvector('simple', COALESCE(title, '') || ' ' || COALESCE(main_idea, ''))
    ) STORED`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_projects_search_tsv ON novel_projects USING gin (search_tsv)`);

    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS digest_opt_out BOOLEAN DEFAULT false`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_ai_uses INTEGER DEFAULT 0`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_ai_use_date VARCHAR`);

    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS search_tsv tsvector GENERATED ALWAYS AS (
      to_tsvector('simple', COALESCE(display_name, ''))
    ) STORED`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_search_tsv ON users USING gin (search_tsv)`);

    await pool.query(`ALTER TABLE content_series ADD COLUMN IF NOT EXISTS search_tsv tsvector GENERATED ALWAYS AS (
      to_tsvector('simple', COALESCE(title, '') || ' ' || COALESCE(description, ''))
    ) STORED`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_series_search_tsv ON content_series USING gin (search_tsv)`);

    await pool.query(`ALTER TABLE novel_projects ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'`);
    await pool.query(`ALTER TABLE novel_projects ADD COLUMN IF NOT EXISTS seeking_beta_readers BOOLEAN DEFAULT false`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS writing_challenges (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        start_date TIMESTAMP DEFAULT NOW(),
        end_date TIMESTAMP,
        created_by TEXT NOT NULL,
        winner_id TEXT,
        winner_entry_id INTEGER,
        project_type VARCHAR(50) DEFAULT 'essay',
        prize_description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE writing_challenges ADD COLUMN IF NOT EXISTS winner_id TEXT`);
    await pool.query(`ALTER TABLE writing_challenges ADD COLUMN IF NOT EXISTS project_type VARCHAR(50) DEFAULT 'essay'`);
    await pool.query(`ALTER TABLE writing_challenges ADD COLUMN IF NOT EXISTS prize_description TEXT`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS challenge_entries (
        id SERIAL PRIMARY KEY,
        challenge_id INTEGER NOT NULL REFERENCES writing_challenges(id),
        user_id TEXT NOT NULL,
        content TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE challenge_entries ADD COLUMN IF NOT EXISTS content TEXT`);
    await pool.query(`ALTER TABLE challenge_entries ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_challenge_entries_challenge ON challenge_entries (challenge_id)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS beta_reader_requests (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_beta_requests_project ON beta_reader_requests (project_id)`);

    await pool.query(`ALTER TABLE chapters ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT false`);
    await pool.query(`ALTER TABLE chapters ADD COLUMN IF NOT EXISTS price_cents INTEGER NOT NULL DEFAULT 0`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS chapter_unlocks (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        chapter_id INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
        stripe_session_id TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS unique_chapter_unlock_user ON chapter_unlocks (user_id, chapter_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_chapter_unlocks_user ON chapter_unlocks (user_id)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS gift_subscriptions (
        id SERIAL PRIMARY KEY,
        gifter_user_id VARCHAR NOT NULL,
        gifter_email VARCHAR NOT NULL,
        recipient_email VARCHAR NOT NULL,
        plan VARCHAR NOT NULL,
        token VARCHAR NOT NULL,
        redeemed BOOLEAN NOT NULL DEFAULT false,
        redeemed_by VARCHAR,
        stripe_session_id TEXT,
        paid BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        redeemed_at TIMESTAMP
      )
    `);
    await pool.query(`ALTER TABLE gift_subscriptions ADD COLUMN IF NOT EXISTS paid BOOLEAN NOT NULL DEFAULT false`).catch(() => {});
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS unique_gift_token ON gift_subscriptions (token)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_gifts_gifter ON gift_subscriptions (gifter_user_id)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_points (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        balance INTEGER NOT NULL DEFAULT 0
      )
    `);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS unique_user_points ON user_points (user_id)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS point_transactions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        points INTEGER NOT NULL,
        reason TEXT NOT NULL,
        metadata TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE point_transactions ADD COLUMN IF NOT EXISTS metadata TEXT`).catch(() => {});
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_point_tx_user ON point_transactions (user_id)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS newsletter_sends (
        id SERIAL PRIMARY KEY,
        author_id VARCHAR NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        recipient_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_newsletter_sends_author ON newsletter_sends (author_id)`);

    await pool.query(`ALTER TABLE essay_views ADD COLUMN IF NOT EXISTS country VARCHAR(2)`);

    await pool.query(`ALTER TABLE collection_items ADD COLUMN IF NOT EXISTS project_id INTEGER`);
    await pool.query(`ALTER TABLE collection_items ALTER COLUMN essay_id DROP NOT NULL`);
    await pool.query(`ALTER TABLE collection_items DROP CONSTRAINT IF EXISTS uq_collection_items`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_collection_items_essay ON collection_items (collection_id, essay_id) WHERE essay_id IS NOT NULL`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_collection_items_project ON collection_items (collection_id, project_id) WHERE project_id IS NOT NULL`);
    await pool.query(`DO $$ BEGIN ALTER TABLE collection_items ADD CONSTRAINT chk_collection_items_one_ref CHECK ((essay_id IS NOT NULL AND project_id IS NULL) OR (essay_id IS NULL AND project_id IS NOT NULL)); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS payout_settings (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL UNIQUE,
        method VARCHAR(30) NOT NULL,
        paypal_email TEXT,
        bank_account_name TEXT,
        bank_iban TEXT,
        bank_swift TEXT,
        bank_country TEXT,
        stripe_account_id VARCHAR(100),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS digest_opt_out BOOLEAN DEFAULT false`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_follow_publications BOOLEAN DEFAULT true`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_tips_comments BOOLEAN DEFAULT true`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_challenges BOOLEAN DEFAULT true`);
    await pool.query(`ALTER TABLE challenge_entries ADD COLUMN IF NOT EXISTS admin_rating INTEGER`);
    await pool.query(`ALTER TABLE challenge_entries ADD COLUMN IF NOT EXISTS admin_notes TEXT`);
    await pool.query(`ALTER TABLE payout_settings ADD COLUMN IF NOT EXISTS kast_wallet_id TEXT`);

    console.log("[startup] All tables and columns ensured");
  } catch (e) {
    console.warn("[startup] Migration warning:", e);
  }
}

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
      // Run DB migrations in background — server accepts connections immediately
      runStartupMigrations().catch((e: unknown) =>
        console.warn("[startup] Migration warning:", e instanceof Error ? e.message : e)
      );
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

      const SOCIAL_AUTOPUBLISH_INTERVAL = 60 * 1000;
      setInterval(async () => {
        try {
          const duePosts = await storage.getDueScheduledPosts();
          if (duePosts.length === 0) return;

          const { pool } = await import("./db");
          const credRows = await pool.query(`SELECT value FROM social_hub_settings WHERE key = 'platform_credentials'`);
          const rawVal = credRows.rows[0]?.value;
          const credentials = rawVal ? (typeof rawVal === "string" ? JSON.parse(rawVal) : rawVal) : {};

          for (const post of duePosts) {
            const { publishResults, anyPublished } = await publishSocialPostToAPIs(post, credentials);
            const allSucceeded = Object.values(publishResults).every((r) => r.success);

            if (allSucceeded) {
              await storage.updateSocialPost(post.id, { status: "posted" });
              log(`[AutoPublish] Post #${post.id} fully published`);
            } else if (anyPublished) {
              await storage.updateSocialPost(post.id, { status: "needs_manual" });
              log(`[AutoPublish] Post #${post.id} partially published — marked needs_manual for remaining platforms`);
            } else {
              await storage.updateSocialPost(post.id, { status: "needs_manual" });
              log(`[AutoPublish] Post #${post.id} marked needs_manual`);
            }
          }
        } catch (err: any) {
          console.error("[AutoPublish] Background job error:", err.message);
        }
      }, SOCIAL_AUTOPUBLISH_INTERVAL);
      log("Social auto-publish background job started (every 60 seconds)");

      const SOCIAL_AUTOGENERATE_CHECK_INTERVAL = 60 * 60 * 1000; // check every hour
      const SOCIAL_AUTOGENERATE_COOLDOWN = 23 * 60 * 60 * 1000; // at most once per 23h
      setInterval(async () => {
        try {
          const { pool } = await import("./db");
          const cfgRows = await pool.query(`SELECT value FROM social_hub_settings WHERE key = 'auto_generate_config'`);
          const rawCfg = cfgRows.rows[0]?.value;
          if (!rawCfg) return;
          const cfg = typeof rawCfg === "string" ? JSON.parse(rawCfg) : rawCfg;
          if (!cfg.enabled) return;

          const lastRunRows = await pool.query(`SELECT value FROM social_hub_settings WHERE key = 'auto_generate_last_run'`);
          const lastRunRaw = lastRunRows.rows[0]?.value;
          if (lastRunRaw) {
            const lastRunStr = typeof lastRunRaw === "string" ? lastRunRaw.replace(/^"|"$/g, "") : String(lastRunRaw);
            const lastRun = new Date(lastRunStr);
            if (Date.now() - lastRun.getTime() < SOCIAL_AUTOGENERATE_COOLDOWN) return;
          }

          log("[AutoGenerate] Starting daily content generation...");
          const activeRows = await pool.query(`SELECT value FROM social_hub_settings WHERE key = 'active_platforms'`);
          const rawActive = activeRows.rows[0]?.value;
          const activePlatforms: string[] = rawActive
            ? (typeof rawActive === "string" ? JSON.parse(rawActive) : rawActive)
            : ["facebook", "instagram", "x", "tiktok", "linkedin"];
          const cfgPlatforms: string[] = cfg.platforms || ["facebook", "instagram", "x", "tiktok", "linkedin"];
          const platforms: string[] = cfgPlatforms.filter((p: string) => activePlatforms.includes(p));
          if (platforms.length === 0) {
            log("[AutoGenerate] No active platforms — skipping generation");
            return;
          }
          const bestTimes = await storage.getBestPostingTimes();
          const scheduleHours = bestTimes.length >= 2
            ? [bestTimes[0].hour, bestTimes[0].hour + 1, bestTimes[1].hour, bestTimes[1].hour + 1, Math.min(bestTimes[0].hour, bestTimes[1].hour) + 2]
            : [9, 12, 15, 18, 21];

          const { default: OpenAI } = await import("openai");
          const aiClient = new OpenAI({
            apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
            baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
          });

          let createdCount = 0;
          for (let i = 0; i < 5; i++) {
            try {
              const isLiterary = i >= 2;
              const postType = isLiterary ? "literary" : "marketing";
              const topics = ["الحنين", "الأمل", "الحب", "الصمت", "الغياب"];
              const prompt = isLiterary
                ? `اكتب خاطرة أدبية عربية فصيحة قصيرة (3-5 أسطر) بأسلوب شاعري مؤثر عن ${topics[i - 2] || "الحياة"}. أضف CTA: "اكتشف عالم الكتابة العربية على QalamAI.net" ورابط qalamai.net و5 هاشتاقات عربية.`
                : `اكتب منشوراً تسويقياً لمنصة QalamAI (qalamai.net). ${i === 0 ? "ركز على سهولة البدء مجاناً." : "ركز على جودة المحتوى وتنوع الأنواع الأدبية."} أضف CTA قوي ورابط qalamai.net و5 هاشتاقات.`;

              const completion = await aiClient.chat.completions.create({
                model: "gpt-4o",
                max_completion_tokens: 600,
                messages: [
                  { role: "system", content: "أنت أبو هاشم، كاتب ومسوّق رقمي عربي محترف. تكتب محتوى سوشيال ميديا بالعربية الفصحى موحداً ومباشراً. لا تضف عناوين أو تسميات للمنصات مثل 'تغريدة على X:' أو 'منشور فيسبوك:' أو أي تصنيف مشابه. اكتب المحتوى مباشرةً بدون أي مقدمات. دائماً تضيف CTA ورابط qalamai.net." },
                  { role: "user", content: prompt },
                ],
              });
              const content = completion.choices[0]?.message?.content || "";

              let coverImageUrl: string | null = null;
              if (isLiterary) {
                try {
                  const imgRes = await aiClient.images.generate({
                    model: "dall-e-3",
                    prompt: "Artistic Arabic calligraphy poster with warm golden tones, minimalist elegant design, square composition. No text.",
                    n: 1,
                    size: "1024x1024",
                  });
                  coverImageUrl = imgRes.data?.[0]?.url || null;
                } catch { /* skip */ }
              }

              const scheduledAt = new Date();
              scheduledAt.setHours(scheduleHours[i] || 12, 0, 0, 0);
              if (scheduledAt <= new Date()) scheduledAt.setDate(scheduledAt.getDate() + 1);

              await storage.createSocialPost({ content, platforms, scheduledAt, status: "scheduled", postType, coverImageUrl });
              createdCount++;
            } catch (postErr: any) {
              console.error(`[AutoGenerate] Post ${i} failed:`, postErr.message);
            }
          }

          await pool.query(`INSERT INTO social_hub_settings (key, value) VALUES ('auto_generate_last_run', $1) ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`, [new Date().toISOString()]);
          log(`[AutoGenerate] Daily generation complete — ${createdCount} posts created`);
        } catch (err: any) {
          console.error("[AutoGenerate] Background job error:", err.message);
        }
      }, SOCIAL_AUTOGENERATE_CHECK_INTERVAL);
      log("Social auto-generate background job started (checks every hour)");

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

      // Weekly digest — checked every 6 hours, runs once per 7 days (persistent)
      const WEEKLY_CHECK_INTERVAL = 6 * 60 * 60 * 1000;
      const WEEKLY_THRESHOLD = 7 * 24 * 60 * 60 * 1000;
      async function runWeeklyDigestCheck() {
        try {
          const lastRun = await storage.getSystemSetting("last_weekly_digest");
          const lastRunMs = lastRun ? Number(lastRun) : 0;
          if (Date.now() - lastRunMs < WEEKLY_THRESHOLD) return;

          const [digestUsers, followUsers, topEssays] = await Promise.all([
            storage.getUsersWithEmailsForDigest(),
            storage.getUsersForFollowDigest(),
            storage.getTopEssaysForWeek(5),
          ]);
          if (topEssays.length > 0) {
            await sendWeeklyDigest(digestUsers, topEssays);
          }
          let followDigestSent = 0;
          for (const u of followUsers) {
            try {
              const pubs = await storage.getRecentPublicationsByFollowedAuthors(u.id, 7);
              if (pubs.length > 0) {
                await sendPersonalizedFollowDigest(u.id, u.email, u.displayName, pubs);
                followDigestSent++;
              }
            } catch {}
          }
          await storage.setSystemSetting("last_weekly_digest", String(Date.now()));
          log(`Weekly digest sent (general + ${followDigestSent} personalized follow digests)`, "email");
        } catch (err: any) {
          console.error("[WeeklyDigest] Error:", err.message);
        }
      }
      setTimeout(() => runWeeklyDigestCheck(), 30_000);
      setInterval(runWeeklyDigestCheck, WEEKLY_CHECK_INTERVAL);
      log("Weekly digest job registered (startup check + every 6h, runs once per 7 days)");

      // Monthly author performance report — checked every 24 hours, runs once per 30 days (persistent)
      const MONTHLY_CHECK_INTERVAL = 24 * 60 * 60 * 1000;
      const MONTHLY_THRESHOLD = 30 * 24 * 60 * 60 * 1000;
      async function runMonthlyReportCheck() {
        try {
          const lastRun = await storage.getSystemSetting("last_monthly_report");
          const lastRunMs = lastRun ? Number(lastRun) : 0;
          if (Date.now() - lastRunMs < MONTHLY_THRESHOLD) return;

          const allUsers = await storage.getUsersForMonthlyReport();
          let sent = 0;
          for (const u of allUsers) {
            try {
              const stats = await storage.getMonthlyAuthorStats(u.id);
              if (stats.totalEssays === 0) continue;
              await sendMonthlyAuthorReport(u.email, u.displayName || "الكاتب", stats);
              sent++;
            } catch {}
          }
          await storage.setSystemSetting("last_monthly_report", String(Date.now()));
          log(`Monthly author reports sent to ${sent} authors`, "email");
        } catch (err: any) {
          console.error("[MonthlyReport] Error:", err.message);
        }
      }
      setTimeout(() => runMonthlyReportCheck(), 60_000);
      setInterval(runMonthlyReportCheck, MONTHLY_CHECK_INTERVAL);
      log("Monthly author report job registered (startup check + every 24h, runs once per 30 days)");
    },
  );
})();
