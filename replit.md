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
- PDF download, EPUB export (RTL Arabic), chapter preview
- Inline editing with word count recalculation
- Dark mode toggle (ThemeProvider with localStorage)
- User profile, dashboard statistics, project type badges
- Email notifications (nodemailer/SMTP)
- Support ticket system with admin panel

## Pages
- **Landing** (`/`) - Home page with hero, features, testimonials
- **About** (`/about`) - Mission, vision, values
- **Features** (`/features`) - Three content categories showcased
- **Pricing** (`/pricing`) - Essay ($50), Scenario ($200), All-in-One ($500), + Novel tiers
- **Login** (`/login`) / **Register** (`/register`) - Dual auth
- **Contact** (`/contact`) - Ticket submission
- **Abu Hashim** (`/abu-hashim`) - Meet the AI agent
- **Profile** (`/profile`) - User profile with stats
- **Home** (`/` authenticated) - Dashboard with project cards, type badges, dropdown new project
- **New Project** (`/project/new`) - Novel creation
- **New Essay** (`/project/new/essay`) - Essay creation
- **New Scenario** (`/project/new/scenario`) - Scenario creation
- **Project Detail** (`/project/:id`) - Type-aware workspace (adaptive labels for chapters/sections/scenes)
- **Tickets** (`/tickets`) / **Ticket Detail** (`/tickets/:id`)
- **Admin** (`/admin`) / **Admin Ticket** (`/admin/tickets/:id`)

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
- `characters` - Character profiles (used by novels and scenarios)
- `character_relationships` - Relationships between characters
- `chapters` - Stores chapters (novels), sections (essays), or scenes (scenarios)
- `support_tickets` / `ticket_replies` - Support system
- `stripe.*` - Managed by stripe-replit-sync

## File Structure
- `shared/schema.ts` - Drizzle schema + pricing constants (NOVEL_PRICING, ESSAY_PRICE, SCENARIO_PRICE, ALL_IN_ONE_PRICE)
- `server/routes.ts` - API endpoints with type-aware generation
- `server/storage.ts` - Database storage layer
- `server/abu-hashim.ts` - 3 AI personas: SYSTEM_PROMPT (novels), ESSAY_SYSTEM_PROMPT, SCENARIO_SYSTEM_PROMPT + builders
- `server/stripeClient.ts` - Stripe client
- `server/email.ts` - Email notifications
- `client/src/pages/` - All React pages including new-essay, new-scenario
- `client/src/lib/pdf-generator.ts` - PDF generation (includes cover image as first page when available)

## API Routes
- `GET /api/user/plan` - Get user's current plan and purchase date
- `POST /api/plans/purchase` - Create Stripe checkout for plan purchase (essay/scenario/all_in_one)
- `POST /api/plans/verify` - Verify plan payment and activate plan on user account
- `POST /api/projects` - Create project (auto-unlocks if plan covers type)
- `POST /api/projects/:id/outline` - Generate outline (checks plan coverage + paid status)
- `POST /api/projects/:projectId/chapters/:chapterId/generate` - Generate content (checks plan + paid)
- `POST /api/projects/:id/create-checkout` - Per-project Stripe checkout (for novels without All-in-One)
- `GET /api/projects/stats` - Real word count and page count computed from chapter content for all user projects
- `GET /api/projects/:id/export/epub` - EPUB export with cover image + RTL page progression
- All other routes unchanged from original

## Export Features
- **PDF**: Includes cover image as first page (full bleed), title page, then numbered chapter pages. RTL text rendering.
- **EPUB**: Includes cover image (as cover.xhtml + cover-image property), RTL page-progression-direction, dir="rtl" on all XHTML pages.
- **Dashboard Stats**: Real word count (from chapter content) and real page count (250 words/page) shown per project card.
