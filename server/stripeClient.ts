import Stripe from 'stripe';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error('X-Replit-Token not found for repl/depl');
  }

  const connectorName = 'stripe';
  const isProduction = process.env.REPLIT_DEPLOYMENT === '1';

  const environmentsToTry = isProduction
    ? ['production', 'development']
    : ['development'];

  for (const env of environmentsToTry) {
    const url = new URL(`https://${hostname}/api/v2/connection`);
    url.searchParams.set('include_secrets', 'true');
    url.searchParams.set('connector_names', connectorName);
    url.searchParams.set('environment', env);

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'X-Replit-Token': xReplitToken
      }
    });

    const data = await response.json();
    connectionSettings = data.items?.[0];

    if (connectionSettings?.settings?.publishable && connectionSettings?.settings?.secret) {
      if (isProduction && env === 'development') {
        console.warn('Using Stripe sandbox keys in production — add live keys for real payments');
      }
      return {
        publishableKey: connectionSettings.settings.publishable,
        secretKey: connectionSettings.settings.secret,
      };
    }
  }

  throw new Error('Stripe connection not found — configure Stripe keys in the integrations panel');
}

export async function getUncachableStripeClient() {
  const { secretKey } = await getCredentials();
  return new Stripe(secretKey, {
    apiVersion: '2025-08-27.basil' as any,
  });
}

export async function getStripePublishableKey() {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

export async function getStripeSecretKey() {
  const { secretKey } = await getCredentials();
  return secretKey;
}

let stripeSync: any = null;

export async function getStripeSync() {
  if (!stripeSync) {
    const { StripeSync } = await import('stripe-replit-sync');
    const secretKey = await getStripeSecretKey();

    const fmtMsg = (obj: any, msg?: string): string => {
      const text = msg ?? obj?.msg ?? obj?.message ?? (obj?.error instanceof Error ? obj.error.message : undefined) ?? (typeof obj === "string" ? obj : undefined) ?? "";
      const extra = [obj?.webhookId, obj?.url].filter(Boolean).join(" ");
      return extra ? `${text} ${extra}` : text;
    };

    const syncLogger = {
      info:  (obj: any, msg?: string) => console.log("[stripe-sync]", fmtMsg(obj, msg)),
      warn:  (obj: any, msg?: string) => console.warn("[stripe-sync]", fmtMsg(obj, msg)),
      error: (obj: any, msg?: string) => console.error("[stripe-sync]", fmtMsg(obj, msg)),
      debug: () => {},
      trace: () => {},
      child: () => syncLogger,
    };

    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL!,
        max: 2,
      },
      stripeSecretKey: secretKey,
      logger: syncLogger,
    });
  }
  return stripeSync;
}
