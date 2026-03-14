import { getStripeSync } from './stripeClient';
import { getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';
import { userPlanCoversType, PLAN_PRICES } from '@shared/schema';
import { sendPlanActivationEmail, sendProjectPaymentEmail, sendSubscriptionPaymentFailedEmail, sendSubscriptionCancelledEmail, sendNotificationEmail } from './email';

const BASE_URL = process.env.APP_URL || process.env.REPLIT_DOMAINS?.split(',')[0]?.trim()
  ? `https://${process.env.REPLIT_DOMAINS?.split(',')[0]?.trim()}`
  : 'https://qalamai.net';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const stripe = await getUncachableStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: any;
    if (!webhookSecret) {
      console.error('[Webhook] STRIPE_WEBHOOK_SECRET not set — rejecting webhook for security');
      throw new Error('Webhook secret not configured — cannot verify signature');
    }

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      console.error('[Webhook] Signature verification failed:', err.message);
      throw new Error('Webhook signature verification failed');
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    console.log(`[Webhook] Received event: ${event.type} (id: ${event.id})`);

    try {
      if (event.type === 'checkout.session.completed' && event.data?.object) {
        const sessionId = event.data.object.id;
        if (sessionId) {
          const verifiedSession = await stripe.checkout.sessions.retrieve(sessionId);
          await WebhookHandlers.handleCheckoutCompleted(verifiedSession);
        }
      } else if (event.type === 'invoice.payment_failed') {
        await WebhookHandlers.handleInvoicePaymentFailed(event.data.object);
      } else if (event.type === 'customer.subscription.deleted') {
        await WebhookHandlers.handleSubscriptionDeleted(event.data.object);
      } else if (event.type === 'invoice.payment_succeeded' || event.type === 'invoice.paid') {
        await WebhookHandlers.handleInvoicePaid(event.data.object);
      } else {
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
      }
    } catch (err) {
      console.error('[Webhook] Error processing event:', err);
    }
  }

  static async handleCheckoutCompleted(session: any): Promise<void> {
    if (!session?.metadata) {
      console.log('[Webhook] checkout.session.completed — no metadata, skipping');
      return;
    }

    const { type, userId, planType, projectId } = session.metadata;

    if (session.payment_status !== 'paid') {
      console.log(`[Webhook] checkout.session.completed — payment_status=${session.payment_status}, skipping`);
      return;
    }

    console.log(`[Webhook] Processing checkout: type=${type}, userId=${userId}, planType=${planType || '-'}, projectId=${projectId || '-'}`);

    if (type === 'plan_purchase' && userId && planType) {
      await WebhookHandlers.activatePlan(userId, planType);
    } else if (type === 'project_payment' && userId && projectId) {
      await WebhookHandlers.activateProject(userId, parseInt(projectId));
    } else if (type === 'author_tip') {
      await WebhookHandlers.handleTipCompleted(session);
    } else {
      console.warn(`[Webhook] Unknown checkout type or missing fields: type=${type}`);
    }
  }

  static async activatePlan(userId: string, planType: string): Promise<void> {
    try {
      if (!PLAN_PRICES[planType]) {
        console.error(`[Webhook] Invalid plan type "${planType}"`);
        return;
      }

      const user = await storage.getUser(userId);
      if (!user) {
        console.error(`[Webhook] User not found "${userId}"`);
        return;
      }

      if (user.plan === planType || user.plan === 'all_in_one') {
        console.log(`[Webhook] Plan "${planType}" already active for user "${userId}" — skipping (idempotent)`);
        return;
      }

      await storage.updateUserPlan(userId, planType);
      console.log(`[Webhook] Activated plan "${planType}" for user "${userId}"`);

      const projects = await storage.getProjectsByUser(userId);
      let unlockedCount = 0;
      for (const p of projects) {
        if (!p.paid && userPlanCoversType(planType, p.projectType || 'novel')) {
          await storage.updateProjectPayment(p.id, true);
          unlockedCount++;
          console.log(`[Webhook] Auto-unlocked project ${p.id} for user "${userId}"`);
        }
      }
      if (unlockedCount > 0) {
        console.log(`[Webhook] Auto-unlocked ${unlockedCount} project(s) for user "${userId}"`);
      }

      // Restore verified badge if user had an approved application and badge was removed
      if (!user.verified) {
        const hasApprovedApp = await storage.getApprovedVerifiedApplication(userId);
        if (hasApprovedApp) {
          await storage.setUserVerified(userId, true);
          storage.createNotification({
            userId,
            type: "verified_restored",
            title: "عادت شارتك الزرقاء!",
            message: "تم استعادة شارة الكاتب الموثّق تلقائياً بعد تجديد اشتراكك.",
            link: "/profile",
          }).catch(() => {});
          console.log(`[Webhook] Restored verified badge for user "${userId}"`);
        }
      }

      if (user.email) {
        sendPlanActivationEmail(user.email, planType).catch((err) => console.error('[Webhook] Failed to send plan activation email:', err.message));
      }

      const planLabels: Record<string, string> = { essay: "خطة المقالات", scenario: "خطة السيناريو", all_in_one: "الخطة الشاملة" };
      storage.createNotification({
        userId,
        type: "plan_activated",
        title: "تم تفعيل خطتك!",
        message: `تم تفعيل ${planLabels[planType] || planType} بنجاح.`,
        link: "/pricing",
      }).catch((err) => console.error('[Webhook] Failed to create notification:', err.message));
    } catch (err) {
      console.error('[Webhook] Error activating plan:', err);
    }
  }

  static async handleTipCompleted(session: any): Promise<void> {
    try {
      const { fromUserId, toAuthorId, projectId } = session.metadata || {};
      if (!toAuthorId) return;

      await storage.completeAuthorTip(session.id);

      const tipper = fromUserId ? await storage.getUser(fromUserId) : null;
      const tipperName = tipper?.displayName || tipper?.firstName || "أحد القرّاء";
      const amountCents = session.amount_total || 0;
      const tipAmount = (amountCents / 100).toFixed(2);

      const tipTitle = "دعم مالي جديد";
      const tipMessage = `أرسل لك ${tipperName} دعماً بقيمة $${tipAmount}`;
      await storage.createNotification({
        userId: toAuthorId,
        type: "tip",
        title: tipTitle,
        message: tipMessage,
        link: "/profile",
      });

      const author = await storage.getUser(toAuthorId);
      if (author?.email) {
        sendNotificationEmail(author.email, tipTitle, tipMessage, "/profile").catch(() => {});
      }

      console.log(`[Webhook] Tip completed: $${tipAmount} to author ${toAuthorId}`);
    } catch (err) {
      console.error('[Webhook] Error handling tip completion:', err);
    }
  }

  static async handleInvoicePaymentFailed(invoice: any): Promise<void> {
    try {
      const customerId = invoice?.customer;
      if (!customerId) return;
      const user = await storage.getUserByStripeCustomerId(customerId);
      if (!user) {
        console.log(`[Webhook] invoice.payment_failed — no user found for customer ${customerId}`);
        return;
      }
      const attemptCount = invoice.attempt_count || 1;
      const firstName = user.firstName || user.displayName || 'عزيزي الكاتب';
      const pricingUrl = `${BASE_URL}/pricing`;

      console.log(`[Webhook] Invoice payment failed for user "${user.id}" (attempt ${attemptCount})`);

      await storage.createNotification({
        userId: user.id,
        type: "payment_failed",
        title: attemptCount >= 3 ? "تحذير: خطر إلغاء الاشتراك" : "تعذّر تجديد اشتراكك",
        message: attemptCount >= 3
          ? `لم نتمكن من تجديد اشتراكك بعد ${attemptCount} محاولات. يُرجى تحديث بيانات الدفع قبل إلغاء اشتراكك وإزالة شارة التوثيق.`
          : `تعذّر تحصيل رسوم التجديد (المحاولة ${attemptCount}). سنحاول مجدداً — تأكد من صحة بيانات بطاقتك.`,
        link: pricingUrl,
      });

      if (user.email) {
        sendSubscriptionPaymentFailedEmail(user.email, firstName, attemptCount, pricingUrl)
          .catch((e) => console.error('[Webhook] Failed to send payment failed email:', e));
      }
    } catch (err) {
      console.error('[Webhook] Error handling invoice.payment_failed:', err);
    }
  }

  static async handleSubscriptionDeleted(subscription: any): Promise<void> {
    try {
      const customerId = subscription?.customer;
      if (!customerId) return;
      const user = await storage.getUserByStripeCustomerId(customerId);
      if (!user) {
        console.log(`[Webhook] customer.subscription.deleted — no user found for customer ${customerId}`);
        return;
      }

      console.log(`[Webhook] Subscription deleted for user "${user.id}" — downgrading to free`);

      // Downgrade plan to free
      await storage.updateUserPlan(user.id, 'free');

      // Remove verified badge (will be auto-restored on re-subscription)
      if (user.verified) {
        await storage.setUserVerified(user.id, false);
        console.log(`[Webhook] Removed verified badge from user "${user.id}" due to subscription cancellation`);
      }

      await storage.createNotification({
        userId: user.id,
        type: "subscription_cancelled",
        title: "تم إلغاء اشتراكك",
        message: "تم تحويل حسابك إلى الخطة المجانية وإيقاف شارة التوثيق مؤقتاً. ستعود شارتك تلقائياً عند تجديد الاشتراك.",
        link: "/pricing",
      });

      if (user.email) {
        const firstName = user.firstName || user.displayName || 'عزيزي الكاتب';
        sendSubscriptionCancelledEmail(user.email, firstName)
          .catch((e) => console.error('[Webhook] Failed to send subscription cancelled email:', e));
      }
    } catch (err) {
      console.error('[Webhook] Error handling customer.subscription.deleted:', err);
    }
  }

  static async handleInvoicePaid(invoice: any): Promise<void> {
    try {
      // Only handle subscription renewals (not initial checkout — those are handled by checkout.session.completed)
      if (!invoice?.subscription || invoice?.billing_reason === 'subscription_create') return;
      const customerId = invoice?.customer;
      if (!customerId) return;
      const user = await storage.getUserByStripeCustomerId(customerId);
      if (!user) return;

      console.log(`[Webhook] Invoice paid (renewal) for user "${user.id}"`);

      // Restore verified badge if applicable
      if (!user.verified) {
        const hasApprovedApp = await storage.getApprovedVerifiedApplication(user.id);
        if (hasApprovedApp) {
          await storage.setUserVerified(user.id, true);
          await storage.createNotification({
            userId: user.id,
            type: "verified_restored",
            title: "عادت شارتك الزرقاء!",
            message: "تم استعادة شارة الكاتب الموثّق تلقائياً بعد تجديد اشتراكك.",
            link: "/profile",
          });
          console.log(`[Webhook] Restored verified badge for user "${user.id}" on renewal`);
        }
      }
    } catch (err) {
      console.error('[Webhook] Error handling invoice.paid:', err);
    }
  }

  static async activateProject(userId: string, projectId: number): Promise<void> {
    try {
      const project = await storage.getProject(projectId);
      if (!project) {
        console.error(`[Webhook] Project not found ${projectId}`);
        return;
      }

      if (project.userId !== userId) {
        console.error(`[Webhook] Project ${projectId} does not belong to user "${userId}"`);
        return;
      }

      if (project.paid) {
        console.log(`[Webhook] Project ${projectId} already paid — skipping (idempotent)`);
        return;
      }

      await storage.updateProjectPayment(projectId, true);
      console.log(`[Webhook] Activated project ${projectId} for user "${userId}"`);

      const user = await storage.getUser(userId);
      if (user?.email) {
        sendProjectPaymentEmail(user.email, project.title, projectId, project.projectType || 'novel').catch((err) => console.error('[Webhook] Failed to send project payment email:', err.message));
      }

      storage.createNotification({
        userId,
        type: "payment_confirmed",
        title: "تم تأكيد الدفع!",
        message: `تم تأكيد الدفع لمشروعك "${project.title}".`,
        link: `/project/${projectId}`,
      }).catch((err) => console.error('[Webhook] Failed to create notification:', err.message));
    } catch (err) {
      console.error('[Webhook] Error activating project:', err);
    }
  }
}
