import { getStripeSync } from './stripeClient';
import { getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';
import { userPlanCoversType, PLAN_PRICES } from '@shared/schema';

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

    try {
      const event = JSON.parse(payload.toString());
      if (event.type === 'checkout.session.completed' && event.data?.object) {
        const sessionId = event.data.object.id;
        if (sessionId) {
          const stripe = await getUncachableStripeClient();
          const verifiedSession = await stripe.checkout.sessions.retrieve(sessionId);
          await WebhookHandlers.handleCheckoutCompleted(verifiedSession);
        }
      }
    } catch (err) {
      console.error('Error processing custom webhook event:', err);
    }
  }

  static async handleCheckoutCompleted(session: any): Promise<void> {
    if (!session?.metadata) return;

    const { type, userId, planType, projectId } = session.metadata;

    if (session.payment_status !== 'paid') return;

    if (type === 'plan_purchase' && userId && planType) {
      await WebhookHandlers.activatePlan(userId, planType);
    } else if (type === 'project_payment' && userId && projectId) {
      await WebhookHandlers.activateProject(userId, parseInt(projectId));
    }
  }

  static async activatePlan(userId: string, planType: string): Promise<void> {
    try {
      if (!PLAN_PRICES[planType]) {
        console.error(`Webhook: Invalid plan type "${planType}"`);
        return;
      }

      const user = await storage.getUser(userId);
      if (!user) {
        console.error(`Webhook: User not found "${userId}"`);
        return;
      }

      if (user.plan === planType || user.plan === 'all_in_one') {
        console.log(`Webhook: Plan "${planType}" already active for user "${userId}"`);
        return;
      }

      await storage.updateUserPlan(userId, planType);
      console.log(`Webhook: Activated plan "${planType}" for user "${userId}"`);

      const projects = await storage.getProjectsByUser(userId);
      for (const p of projects) {
        if (!p.paid && userPlanCoversType(planType, p.projectType || 'novel')) {
          await storage.updateProjectPayment(p.id, true);
          console.log(`Webhook: Auto-unlocked project ${p.id} for user "${userId}"`);
        }
      }
    } catch (err) {
      console.error('Webhook: Error activating plan:', err);
    }
  }

  static async activateProject(userId: string, projectId: number): Promise<void> {
    try {
      const project = await storage.getProject(projectId);
      if (!project) {
        console.error(`Webhook: Project not found ${projectId}`);
        return;
      }

      if (project.userId !== userId) {
        console.error(`Webhook: Project ${projectId} does not belong to user "${userId}"`);
        return;
      }

      if (project.paid) {
        console.log(`Webhook: Project ${projectId} already paid`);
        return;
      }

      await storage.updateProjectPayment(projectId, true);
      console.log(`Webhook: Activated project ${projectId} for user "${userId}"`);
    } catch (err) {
      console.error('Webhook: Error activating project:', err);
    }
  }
}
