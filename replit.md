# QalamAI — Arabic Writing Platform

## Overview
QalamAI is an AI-powered Arabic writing platform powered by the virtual literary agent "Abu Hashim" (أبو هاشم). It supports three content types: **Novel Writing**, **Professional Essay/News Writing**, and **Drama/Film Scenario Writing**.

**Brand**: QalamAI | **Tagline**: «حيث تتحوّل الفكرة إلى رواية، والقلم إلى صوت.»

## Architecture
- **Frontend**: React SPA with RTL Arabic layout, Tailwind CSS, Shadcn UI
- **Backend**: Express.js with PostgreSQL database
- **AI**: OpenAI GPT-5.2 via Replit AI Integrations (Abu Hashim agent persona — 3 specialized modes)
- **Auth**: Email/password registration + Replit Auth (OpenID Connect) — dual auth system
- **Payments**: Stripe (via Replit Stripe connector + stripe-replit-sync)

## Brand Identity
- **Colors**: Primary Gold #D4AF37, Secondary Deep Blue #0A1A2F, Accent Warm Sand #C9B79C, Background Off-white #F8F5F0
- **Fonts**: Cairo (headings/body), Noto Naskh Arabic (fallback), Amiri (serif/literary), Inter (monospace)
- **Voice**: Elegant, literary, Arabic-rooted, modern, trustworthy

## Content Types & AI Personas

### 1. Novel Writing (رواية)
- **AI Persona**: Abu Hashim the Literary Agent — 12 Arab master novelists in memory
- **Features**: Multi-step creation (details, characters with 70+ roles, relationships), auto outline, chapter-by-chapter generation with streaming, advanced narrative techniques
- **Pricing**: $300 (150pg), $350 (200pg), $450 (250pg), $600 (300pg)

### 2. Essay/News Writing (مقال)
- **AI Persona**: Abu Hashim the Professional Writer/Journalist
- **Subjects**: news, politics, science, technology, economics, sports, weather, culture, health, education, environment, opinion, travel, food, fashion, entertainment, history, philosophy
- **Tones**: formal academic, analytical, investigative, editorial, conversational expert
- **Features**: Structure generation, section-by-section writing, multi-subject expertise, SEO awareness
- **Pricing**: $50/project

### 3. Scenario/Screenplay Writing (سيناريو)
- **AI Persona**: Abu Hashim the Master Screenwriter
- **Genres**: drama, thriller, comedy, romance, historical, action, sci-fi, horror, family, social, crime, war
- **Formats**: Film (single script, ~40 scenes) or Series (1-30 episodes, ~15 scenes each)
- **Features**: Dramatic structure (3-act), scene-by-scene writing, proper screenplay format, character voice differentiation, dialect support
- **Pricing**: $200/project

## Key Features
- Multi-type project creation (Novel / Essay / Scenario) with dedicated forms
- AI-generated outlines with type-specific structure parsing
- Auto-write: chapters/sections/scenes generated sequentially after outline approval
- Streaming output with multi-part generation for long chapters
- Abu Hashim knowledge: 12 Arab novelists, Arab journalists (Heikal, Tueini), screenwriters (Wahid Hamed, Osama Anwar Okasha)
- AI title suggestions, character suggestions, cover image generation (DALL-E 3)
- PDF download (server-side via pdfkit with Amiri Arabic font), EPUB export (RTL Arabic), chapter preview
- Inline editing with word count recalculation
- Dark mode toggle (ThemeProvider with localStorage)
- User profile, dashboard statistics, project type badges
- Email notifications (nodemailer/SMTP) — project completion emails for all types
- Support ticket system with admin panel
- Dashboard search/filter by title, type, status, and sort options
- Auto-retry on AI generation failures (up to 3 attempts with 2s delay)
- Chapter version history (auto-saves last 5 versions, restore capability)
- "Rewrite This Section" feature with tone selection (formal, simple, suspense, custom)
- Project sharing via read-only public links (with token generation/revocation)
- Mobile-responsive UI across all pages
- Admin panel with user management, plan changes, and platform analytics

## Pages
- **Landing** (`/`) - Home page with hero, features, testimonials
- **About** (`/about`) - Mission, vision, values
- **Features** (`/features`) - Three content categories showcased
- **Pricing** (`/pricing`) - Essay ($50), Scenario ($200), All-in-One ($500), + Novel tiers
- **Login** (`/login`) / **Register** (`/register`) - Dual auth
- **Contact** (`/contact`) - Ticket submission
- **Abu Hashim** (`/abu-hashim`) - Meet the AI agent
- **Profile** (`/profile`) - User profile with stats
- **Home** (`/` authenticated) - Dashboard with project cards, search/filters, type badges
- **New Project** (`/project/new`) - Novel creation
- **New Essay** (`/project/new/essay`) - Essay creation
- **New Scenario** (`/project/new/scenario`) - Scenario creation
- **Project Detail** (`/project/:id`) - Type-aware workspace (adaptive labels for chapters/sections/scenes)
- **Shared Project** (`/shared/:token`) - Public read-only view of shared projects
- **Tickets** (`/tickets`) / **Ticket Detail** (`/tickets/:id`)
- **Admin** (`/admin`) - Tabs: Support Tickets, Users, Analytics / **Admin Ticket** (`/admin/tickets/:id`)

## Business Model — Plan-Based Pricing
- **Plans** (one-time purchase, stored in `users.plan`):
  - `"free"` (default) — no plan, must pay per project
  - `"essay"` ($50) — unlimited essay projects, auto-unlocked on creation
  - `"scenario"` ($200) — unlimited scenario projects, auto-unlocked on creation
  - `"all_in_one"` ($500) — unlimited novels + essays + scenarios, all auto-unlocked
- **Novel per-project pricing** (for users without All-in-One): 150pg→$300, 200pg→$350, 250pg→$450, 300pg→$600
- `userPlanCoversType(plan, projectType)` — helper to check if user's plan grants access
- Projects created under a matching plan are auto-set to `paid: true, status: "draft"`
- Outline/chapter generation checks both `project.paid` and user plan coverage
- Free access for admin users (FREE_ACCESS_USER_IDS) bypasses all gates

## Database Schema
- `users` / `sessions` - Auth tables (includes stripeCustomerId, role, plan, planPurchasedAt)
- `novel_projects` - Project metadata with `projectType` ("novel"/"essay"/"scenario"), type-specific fields:
  - Novel: mainIdea, timeSetting, placeSetting, narrativePov, pageCount
  - Essay: subject, essayTone, targetAudience
  - Scenario: genre, episodeCount, formatType
  - Sharing: shareToken (unique, nullable) for public read-only links
- `characters` - Character profiles (used by novels and scenarios)
- `character_relationships` - Relationships between characters
- `chapters` - Stores chapters (novels), sections (essays), or scenes (scenarios)
- `chapter_versions` - Auto-saved chapter content history (max 5 per chapter, tracks source: ai_generated/manual_edit/before_restore)
- `support_tickets` / `ticket_replies` - Support system
- `stripe.*` - Managed by stripe-replit-sync

## File Structure
- `shared/schema.ts` - Drizzle schema + pricing constants (NOVEL_PRICING, ESSAY_PRICE, SCENARIO_PRICE, ALL_IN_ONE_PRICE)
- `server/routes.ts` - API endpoints with type-aware generation
- `server/storage.ts` - Database storage layer
- `server/abu-hashim.ts` - 3 AI personas: SYSTEM_PROMPT (novels), ESSAY_SYSTEM_PROMPT, SCENARIO_SYSTEM_PROMPT + builders + rewrite prompt
- `server/stripeClient.ts` - Stripe client
- `server/email.ts` - Email notifications (project completion for all types)
- `server/fonts/` - Amiri Arabic font files (Regular + Bold) for server-side PDF
- `client/src/pages/` - All React pages including new-essay, new-scenario, shared-project
- `client/src/lib/pdf-generator.ts` - Client-side PDF generation (chapter preview only)

## API Routes
- `GET /api/user/plan` - Get user's current plan and purchase date
- `POST /api/plans/purchase` - Create Stripe checkout for plan purchase (essay/scenario/all_in_one)
- `POST /api/plans/verify` - Verify plan payment and activate plan on user account
- `POST /api/projects` - Create project (auto-unlocks if plan covers type)
- `POST /api/projects/:id/outline` - Generate outline (checks plan coverage + paid status)
- `POST /api/projects/:projectId/chapters/:chapterId/generate` - Generate content (checks plan + paid)
- `POST /api/projects/:id/create-checkout` - Per-project Stripe checkout (for novels without All-in-One)
- `GET /api/projects/stats` - Real word count and page count computed from chapter content for all user projects
- `GET /api/projects/:id/export/pdf` - Server-side PDF generation (pdfkit + Amiri font, RTL, cover image, borders)
- `GET /api/projects/:id/export/epub` - EPUB export with cover image + RTL page progression
- `POST /api/chapters/:id/rewrite` - AI rewrite with tone selection (formal/simple/suspense/custom)
- `GET /api/chapters/:id/versions` - Get chapter version history
- `POST /api/chapters/:id/versions/:versionId/restore` - Restore a previous chapter version
- `POST /api/projects/:id/share` - Generate share token for public read-only link
- `DELETE /api/projects/:id/share` - Revoke project sharing
- `GET /api/shared/:token` - Public endpoint for viewing shared projects (no auth)
- `GET /api/admin/users` - List all users with stats (admin only)
- `GET /api/admin/users/:id/projects` - Get user's projects (admin only)
- `PATCH /api/admin/users/:id/plan` - Change user's plan (admin only)
- `GET /api/admin/analytics` - Platform analytics (admin only)
- `POST /api/stripe/webhook` - Stripe webhook endpoint; handles `checkout.session.completed`
- All other routes unchanged from original

## Webhook-Based Payment Activation
- **Backup mechanism**: If a user completes Stripe checkout but doesn't return to the app (where client-side verification runs), the Stripe webhook at `/api/stripe/webhook` automatically activates the plan or unlocks the project.
- **Plan purchases** (`type: "plan_purchase"` in session metadata): Webhook calls `storage.updateUserPlan()` and auto-unlocks matching projects.
- **Per-project payments** (`type: "project_payment"` in session metadata): Webhook calls `storage.updateProjectPayment()` to mark the project as paid.
- Idempotent: skips if plan/project is already activated. Logs all actions for debugging.

## Export Features
- **PDF (Server-side)**: Generated via pdfkit with Amiri Arabic font. Includes cover image, title page with decorative borders, then numbered chapter pages with RTL text rendering and page numbers.
- **PDF (Client-side)**: Used only for individual chapter preview. Uses jsPDF with Arabic text handling.
- **EPUB**: Includes cover image (as cover.xhtml + cover-image property), RTL page-progression-direction, dir="rtl" on all XHTML pages.
- **Dashboard Stats**: Real word count (from chapter content) and real page count (250 words/page) shown per project card.

## Recent Enhancements (9-Feature Suite)
1. **Dashboard Search & Filters**: Search by title, filter by type/status, sort by date/title
2. **Auto-Retry AI Failures**: Up to 3 retry attempts with 2s delay, visible retry status
3. **Chapter Version History**: Auto-saves last 5 versions per chapter, tracks source, restore capability
4. **Rewrite Feature**: AI-powered content rewriting with 4 tone options
5. **Admin User Management**: View all users, manage plans, view user projects
6. **Admin Analytics**: Platform-wide stats with visual bar charts
7. **Mobile Experience**: Responsive layouts across all pages, touch-friendly
8. **Email Notifications**: Completion emails for all project types
9. **Project Sharing**: Public read-only links with token-based access
10. **Server-Side PDF**: Reliable PDF generation with Arabic fonts and decorative styling
