import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";

// Manual cache that only stores successful OIDC discoveries.
// memoizee was replaced because it caches rejected promises, which would
// permanently break auth for an hour after a transient network failure.
let _oidcCache: { config: Awaited<ReturnType<typeof client.discovery>>; expiry: number } | null = null;
const _oidcCacheMaxAge = 3600 * 1000;

// Module-level strategy registry so getOidcConfig can clear it on refresh.
const registeredStrategies = new Set<string>();

async function getOidcConfig() {
  const now = Date.now();
  if (_oidcCache && now < _oidcCache.expiry) {
    return _oidcCache.config;
  }
  const config = await client.discovery(
    new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
    process.env.REPL_ID!
  );
  // Clear registered strategies so they are re-registered with the fresh config
  if (_oidcCache) {
    registeredStrategies.clear();
  }
  _oidcCache = { config, expiry: now + _oidcCacheMaxAge };
  return config;
}

export function getSession() {
  const sessionTtl = 24 * 60 * 60 * 1000; // 24 hours
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  sessionStore.on("error", (err: any) => {
    console.error("[Session Store Error]", err);
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  await authStorage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  console.log("[Auth] REPL_ID:", process.env.REPL_ID ? "set" : "MISSING");

  getOidcConfig().catch((err) =>
    console.warn("[Auth] Background OIDC pre-discovery failed (will retry on login):", err)
  );

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      const user = {};
      updateUserSession(user, tokens);
      await upsertUser(tokens.claims());
      verified(null, user);
    } catch (verifyErr) {
      console.error("[Auth] verify callback error:", verifyErr);
      verified(verifyErr as Error);
    }
  };

  const ensureStrategy = async (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const config = await getOidcConfig();
      const callbackURL = `https://${domain}/api/callback`;
      console.log("[Auth] Registering OIDC strategy for domain:", domain, "callback:", callbackURL);
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL,
        },
        verify
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", async (req, res, next) => {
    try {
      const domain = req.hostname;
      console.log("[Auth] Login initiated, domain:", domain, "sessionID:", req.sessionID ? req.sessionID.substring(0, 8) + "..." : "NO SESSION");
      await ensureStrategy(domain);

      // Patch res.redirect to explicitly flush the session to the DB BEFORE the browser
      // is sent to Replit. Without this, express-session saves the session asynchronously
      // AFTER the 302 response is sent, causing a race: if the Replit round-trip completes
      // before the DB write finishes, the callback cannot find the OIDC state (nonce /
      // code_verifier / state) and the auth fails silently.
      const _origRedirect = res.redirect.bind(res);
      (res as any).redirect = function (url: string) {
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("[Auth] Session pre-redirect save failed:", saveErr);
          } else {
            console.log("[Auth] Session saved before OIDC redirect, sessionID:", req.sessionID ? req.sessionID.substring(0, 8) + "..." : "none");
          }
          _origRedirect(url);
        });
        return res;
      };

      passport.authenticate(`replitauth:${domain}`, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    } catch (err) {
      console.error("[Auth] OIDC login initiation error:", err);
      res.redirect("/login?error=oidc_unavailable");
    }
  });

  app.get("/api/callback", async (req, res, next) => {
    try {
      const domain = req.hostname;
      await ensureStrategy(domain);
      const sessionKeys = req.session ? Object.keys(req.session).filter(k => k !== "cookie") : [];
      console.log("[Auth] Callback hit, domain:", domain, "query:", JSON.stringify({ state: req.query.state ? "present" : "missing", code: req.query.code ? "present" : "missing", error: req.query.error || "none" }));
      console.log("[Auth] Session ID at callback:", req.sessionID ? req.sessionID.substring(0, 8) + "..." : "NO SESSION", "session keys:", sessionKeys);
      passport.authenticate(`replitauth:${domain}`, (err: Error | null, user: Express.User | false, info: object) => {
        if (err) {
          console.error("[Auth] Callback authentication error:", err.message, "full:", JSON.stringify({ message: err.message, name: err.name, cause: (err as any).cause }));
          return res.redirect("/login?error=auth_failed");
        }
        if (!user) {
          console.error("[Auth] Callback: no user returned. info:", JSON.stringify(info));
          return res.redirect("/login?error=auth_failed");
        }
        req.login(user, (loginErr) => {
          if (loginErr) {
            console.error("[Auth] Login after OIDC callback error:", loginErr);
            return res.redirect("/login?error=auth_failed");
          }
          const sub = (user as Record<string, any>)?.claims?.sub;
          console.log("[Auth] OIDC login successful for user:", sub, "sessionID:", req.sessionID ? req.sessionID.substring(0, 8) + "..." : "none");
          req.session.save((saveErr) => {
            if (saveErr) {
              console.error("[Auth] Session save error after login:", saveErr);
              return res.redirect("/login?error=auth_failed");
            }
            console.log("[Auth] Session saved after login, redirecting to /");
            res.redirect("/");
          });
        });
      })(req, res, next);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const cause = err instanceof Error && "cause" in err ? (err as any).cause : undefined;
      console.error("[Auth] OAuth callback error:", message, "cause:", cause || "none");
      res.redirect("/login?error=auth_failed");
    }
  });

  app.get("/api/logout", async (req, res) => {
    try {
      const config = await getOidcConfig();
      const domain = req.hostname;
      req.logout(() => {
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `https://${domain}`,
          }).href
        );
      });
    } catch (err) {
      req.logout(() => res.redirect("/"));
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user?.claims?.sub) {
    return res.status(401).json({ message: "غير مصرّح" });
  }

  if (!user.expires_at) {
    return next();
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "غير مصرّح" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "غير مصرّح" });
    return;
  }
};
