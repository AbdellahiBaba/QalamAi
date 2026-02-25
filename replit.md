# QalamAI — Arabic Novel Writing Platform

## Overview
QalamAI is an AI-powered Arabic novel writing platform powered by the virtual literary agent "Abu Hashim" (أبو هاشم). It helps users create original Arabic novels with literary quality inspired by renowned Arab novelists like Ahlam Mosteghanemi, Dr. Khawla Hamdi, and Ibrahim Nasrallah.

**Brand**: QalamAI | **Tagline**: «حيث تتحوّل الفكرة إلى رواية، والقلم إلى صوت.»

## Architecture
- **Frontend**: React SPA with RTL Arabic layout, Tailwind CSS, Shadcn UI
- **Backend**: Express.js with PostgreSQL database
- **AI**: OpenAI GPT-5.2 via Replit AI Integrations (Abu Hashim agent persona)
- **Auth**: Replit Auth (OpenID Connect)
- **Payments**: Stripe (via Replit Stripe connector + stripe-replit-sync)

## Brand Identity
- **Colors**: Primary Gold #D4AF37, Secondary Deep Blue #0A1A2F, Accent Warm Sand #C9B79C, Background Off-white #F8F5F0
- **Fonts**: Cairo (headings/body), Noto Naskh Arabic (fallback), Amiri (serif/literary), Inter (monospace)
- **Voice**: Elegant, literary, Arabic-rooted, modern, trustworthy

## Key Features
- Multi-step project creation (novel details, characters with 70+ roles, relationships)
- Configurable novel length (20-200 pages) with automatic chapter/structure calculation
- AI-generated novel outlines with chapter breakdown scaled to page count
- Auto-write: chapters generated sequentially after outline approval
- Chapter-by-chapter writing with streaming output and multi-part generation
- Incremental save during generation (every 50 chunks)
- Chapter status tracking (pending, generating, incomplete, completed)
- PDF download of completed novels
- RTL Arabic UI with Cairo/Amiri/Noto Naskh Arabic fonts

## Pages
- **Landing** (`/`) - QalamAI home page with hero, features, testimonials, CTA
- **About** (`/about`) - Mission, vision, values, how AI works
- **Features** (`/features`) - Detailed feature explanations
- **Pricing** (`/pricing`) - Fixed-price novel tiers (150pg/$300, 200pg/$350, 250pg/$450, 300pg/$600)
- **Contact** (`/contact`) - Contact form and info
- **Abu Hashim** (`/abu-hashim`) - Meet the AI literary agent
- **Novel Theme** (`/novel-theme`) - Sample novel concept
- **Home** (`/` authenticated) - User dashboard with projects
- **New Project** (`/project/new`) - Multi-step project creation
- **Project Detail** (`/project/:id`) - Project workspace (overview, characters, chapters)

## Business Model
- Fixed per-project pricing: 150pg→$300, 200pg→$350, 250pg→$450, 300pg→$600 (stored in cents)
- 250 words per page; allowedWords = pageCount × 250
- Projects start "locked" (unpaid) → "draft" (paid) → "outline" → "writing" → "completed"/"finished"
- Payment required before outline/chapter generation (402 error if unpaid)
- Word limit enforced server-side (403 error when exceeded)
- Stripe Checkout for one-time payments with session verification on success callback

## Database Schema
- `users` / `sessions` - Replit Auth tables (users includes stripeCustomerId)
- `novel_projects` - Novel metadata + payment fields (paid, allowedWords, usedWords, price)
- `characters` - Character profiles (name, background, role)
- `character_relationships` - Relationships between characters
- `chapters` - Individual chapters with generated content and status
- `stripe.*` - Managed by stripe-replit-sync (DO NOT modify directly)

## File Structure
- `shared/schema.ts` - Drizzle ORM schema + pricing constants
- `server/routes.ts` - API endpoints (inc. Stripe checkout & payment verification)
- `server/storage.ts` - Database storage layer
- `server/abu-hashim.ts` - AI prompt engineering for novel writing
- `server/stripeClient.ts` - Stripe SDK client via Replit connector
- `server/webhookHandlers.ts` - Stripe webhook processing
- `client/src/pages/` - React pages (landing, home, about, features, pricing, contact, abu-hashim, novel-theme, new-project, project-detail)
- `client/src/lib/pdf-generator.ts` - Client-side PDF generation for novels

## API Routes
- `GET /api/projects` - List user's projects
- `GET /api/projects/:id` - Get project with details
- `POST /api/projects` - Create new project with characters
- `POST /api/projects/:id/outline` - Generate AI outline
- `POST /api/projects/:id/outline/approve` - Approve outline
- `POST /api/projects/:projectId/chapters/:chapterId/generate` - Stream chapter generation (SSE)
- `POST /api/projects/:id/create-checkout` - Create Stripe checkout session
- `POST /api/projects/:id/payment-success` - Verify payment & unlock project
- `POST /api/stripe/webhook` - Stripe webhook handler (registered before express.json())
