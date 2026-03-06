import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
import { boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  password: text("password"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  plan: varchar("plan").default("free"),
  planPurchasedAt: timestamp("plan_purchased_at"),
  role: varchar("role").default("user"),
  stripeCustomerId: varchar("stripe_customer_id"),
  bio: text("bio"),
  displayName: varchar("display_name"),
  publicProfile: boolean("public_profile").default(false),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  apiSuspended: boolean("api_suspended").default(false),
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  trialActive: boolean("trial_active").default(false),
  trialStartedAt: timestamp("trial_started_at"),
  trialEndsAt: timestamp("trial_ends_at"),
  trialUsed: boolean("trial_used").default(false),
  trialStripeSetupIntentId: varchar("trial_stripe_setup_intent_id"),
  trialStripePaymentMethodId: varchar("trial_stripe_payment_method_id"),
  trialChargeAttempted: boolean("trial_charge_attempted").default(false),
  trialChargeStatus: varchar("trial_charge_status"),
  trialChargeAttempts: integer("trial_charge_attempts").default(0),
  trialLastChargeAttempt: timestamp("trial_last_charge_attempt"),
  writingStreak: integer("writing_streak").default(0),
  lastWritingDate: varchar("last_writing_date"),
  dailyWordGoal: integer("daily_word_goal").default(500),
  freeMonthlyProjectsUsed: integer("free_monthly_projects_used").default(0),
  freeMonthlyGenerationsUsed: integer("free_monthly_generations_used").default(0),
  freeMonthlyResetAt: timestamp("free_monthly_reset_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
