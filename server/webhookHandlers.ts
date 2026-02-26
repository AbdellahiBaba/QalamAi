import { getStripeSync } from './stripeClient';
import { getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';
import { userPlanCoversType, PLAN_PRICES } from '@shared/schema';
import { sendPlanActivationEmail, sendProjectPaymentEmail } from './email';

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

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    const event = JSON.parse(payload.toString());
    console.log(`[Webhook] Received event: ${event.type} (id: ${event.id})`);

    try {
      if (event.type === 'checkout.session.completed' && event.data?.object) {
        const sessionId = event.data.object.id;
        if (sessionId) {
          const stripe = await getUncachableStripeClient();
          const verifiedSession = await stripe.checkout.sessions.retrieve(sessionId);
          await WebhookHandlers.handleCheckoutCompleted(verifiedSession);
        }
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

      if (user.email) {
        sendPlanActivationEmail(user.email, planType).catch(() => {});
      }
    } catch (err) {
      console.error('[Webhook] Error activating plan:', err);
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
        sendProjectPaymentEmail(user.email, project.title, projectId, project.projectType || 'novel').catch(() => {});
      }
    } catch (err) {
      console.error('[Webhook] Error activating project:', err);
    }
  }
}
