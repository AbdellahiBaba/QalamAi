import { storage } from "./storage";
import { getUncachableStripeClient } from "./stripeClient";
import { TRIAL_CHARGE_AMOUNT } from "@shared/schema";
import { sendTrialChargeSuccessEmail, sendTrialChargeFailedEmail, sendTrialRequiresActionEmail } from "./email";
import { trackServerEvent } from "./tracking";

const MAX_CHARGE_ATTEMPTS = 3;
const RETRY_DELAY_MS = 60 * 60 * 1000;

export interface TrialExpiryResult {
  charged: boolean;
  chargeFailed: boolean;
  plan: string;
  status: string;
}

export async function processTrialExpiry(userId: string, reqIp?: string, reqUserAgent?: string): Promise<TrialExpiryResult> {
  const user = await storage.getUser(userId);
  if (!user) return { charged: false, chargeFailed: false, plan: "free", status: "user_not_found" };

  if (user.plan !== "trial") {
    return { charged: false, chargeFailed: false, plan: user.plan || "free", status: "not_trial" };
  }

  if (!user.trialActive) {
    return { charged: false, chargeFailed: false, plan: user.plan || "free", status: "not_trial" };
  }

  if (user.trialEndsAt && new Date(user.trialEndsAt).getTime() > Date.now()) {
    return { charged: false, chargeFailed: false, plan: "trial", status: "trial_active" };
  }

  if (user.trialChargeStatus === "succeeded") {
    return { charged: true, chargeFailed: false, plan: user.plan || "all_in_one", status: "already_charged" };
  }

  if (user.trialChargeStatus === "pending") {
    return { charged: false, chargeFailed: false, plan: "trial", status: "charge_pending" };
  }

  const attempts = user.trialChargeAttempts || 0;

  if (attempts >= MAX_CHARGE_ATTEMPTS) {
    if (user.trialActive || user.plan !== "free") {
      await storage.updateUserTrial(userId, {
        plan: "free",
        trialActive: false,
        trialChargeStatus: "failed",
      });
      if (user.email) {
        sendTrialChargeFailedEmail(user.email).catch((e) => console.error("Failed to send trial charge failed email:", e));
      }
    }
    return { charged: false, chargeFailed: true, plan: "free", status: "max_attempts_reached" };
  }

  if (user.trialLastChargeAttempt && attempts > 0) {
    const timeSinceLast = Date.now() - new Date(user.trialLastChargeAttempt).getTime();
    if (timeSinceLast < RETRY_DELAY_MS) {
      return { charged: false, chargeFailed: false, plan: "trial", status: "retry_delay" };
    }
  }

  if (!user.stripeCustomerId || !user.trialStripePaymentMethodId) {
    console.error("[TrialProcessor] Missing stripe data for user", userId);
    await storage.updateUserTrial(userId, {
      plan: "free",
      trialActive: false,
      trialChargeAttempted: true,
      trialChargeStatus: "failed",
      trialChargeAttempts: attempts + 1,
      trialLastChargeAttempt: new Date(),
    });
    if (user.email) {
      sendTrialChargeFailedEmail(user.email).catch((e) => console.error("Failed to send trial charge failed email:", e));
    }
    return { charged: false, chargeFailed: true, plan: "free", status: "missing_stripe_data" };
  }

  const newAttempts = attempts + 1;
  await storage.updateUserTrial(userId, {
    trialChargeAttempted: true,
    trialChargeStatus: "pending",
    trialChargeAttempts: newAttempts,
    trialLastChargeAttempt: new Date(),
  });

  const stripe = await getUncachableStripeClient();
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: TRIAL_CHARGE_AMOUNT,
      currency: "usd",
      customer: user.stripeCustomerId,
      payment_method: user.trialStripePaymentMethodId,
      off_session: true,
      confirm: true,
      metadata: { userId, type: "trial_auto_charge" },
    });

    if (paymentIntent.status === "succeeded") {
      await storage.updateUserTrial(userId, {
        plan: "all_in_one",
        trialActive: false,
        planPurchasedAt: new Date(),
        trialChargeStatus: "succeeded",
      });

      trackServerEvent({
        eventName: "Purchase",
        userId,
        value: TRIAL_CHARGE_AMOUNT / 100,
        currency: "USD",
        contentType: "plan",
        contentId: "all_in_one",
        ip: reqIp,
        userAgent: reqUserAgent,
      });

      if (user.email) {
        sendTrialChargeSuccessEmail(user.email).catch((e) => console.error("Failed to send trial charge success email:", e));
      }

      return { charged: true, chargeFailed: false, plan: "all_in_one", status: "succeeded" };
    }

    if (paymentIntent.status === "requires_action" || paymentIntent.status === "requires_confirmation") {
      const isFinalAttempt = newAttempts >= MAX_CHARGE_ATTEMPTS;
      if (isFinalAttempt) {
        await storage.updateUserTrial(userId, {
          plan: "free",
          trialActive: false,
          trialChargeStatus: "failed",
        });
        if (user.email) {
          sendTrialChargeFailedEmail(user.email).catch((e) => console.error("Failed to send trial charge failed email:", e));
        }
        return { charged: false, chargeFailed: true, plan: "free", status: "requires_action_final" };
      }
      await storage.updateUserTrial(userId, {
        trialChargeStatus: "requires_action",
      });
      if (user.email && paymentIntent.client_secret) {
        sendTrialRequiresActionEmail(user.email, paymentIntent.client_secret).catch((e) => console.error("Failed to send 3DS email:", e));
      }
      console.warn(`[TrialProcessor] PaymentIntent requires_action for user ${userId}, sent 3DS email (attempt ${newAttempts}/${MAX_CHARGE_ATTEMPTS})`);
      return { charged: false, chargeFailed: false, plan: "trial", status: "requires_action" };
    }

    if (paymentIntent.status === "requires_payment_method") {
      const isFinalAttempt = newAttempts >= MAX_CHARGE_ATTEMPTS;
      await storage.updateUserTrial(userId, {
        trialChargeStatus: "failed",
        ...(isFinalAttempt ? { plan: "free", trialActive: false } : {}),
      });
      if (isFinalAttempt && user.email) {
        sendTrialChargeFailedEmail(user.email).catch((e) => console.error("Failed to send trial charge failed email:", e));
      }
      console.warn(`[TrialProcessor] Payment method failed for user ${userId} (attempt ${newAttempts}/${MAX_CHARGE_ATTEMPTS})`);
      return { charged: false, chargeFailed: true, plan: isFinalAttempt ? "free" : "trial", status: "payment_method_failed" };
    }

    console.warn(`[TrialProcessor] Unexpected PaymentIntent status: ${paymentIntent.status} for user ${userId}`);
    await storage.updateUserTrial(userId, {
      trialChargeStatus: "failed",
    });
    return { charged: false, chargeFailed: true, plan: "trial", status: paymentIntent.status };

  } catch (chargeError: any) {
    console.error(`[TrialProcessor] Charge failed for user ${userId}:`, chargeError.message);

    const isFinalAttempt = newAttempts >= MAX_CHARGE_ATTEMPTS;

    if (isFinalAttempt) {
      await storage.updateUserTrial(userId, {
        plan: "free",
        trialActive: false,
        trialChargeStatus: "failed",
      });
      if (user.email) {
        sendTrialChargeFailedEmail(user.email).catch((e) => console.error("Failed to send trial charge failed email:", e));
      }
      return { charged: false, chargeFailed: true, plan: "free", status: "charge_error_final" };
    }

    await storage.updateUserTrial(userId, {
      trialChargeStatus: "failed",
    });
    return { charged: false, chargeFailed: true, plan: "trial", status: "charge_error_retryable" };
  }
}

export async function processAllExpiredTrials(): Promise<void> {
  try {
    const expiredTrialUsers = await storage.getExpiredTrialUsers();

    if (expiredTrialUsers.length === 0) return;

    console.log(`[TrialProcessor] Processing ${expiredTrialUsers.length} expired trial(s)`);

    for (const user of expiredTrialUsers) {
      try {
        const result = await processTrialExpiry(user.id);
        console.log(`[TrialProcessor] User ${user.id}: ${result.status} → plan=${result.plan}`);
      } catch (err: any) {
        console.error(`[TrialProcessor] Error processing user ${user.id}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error("[TrialProcessor] Error in processAllExpiredTrials:", err.message);
  }
}
