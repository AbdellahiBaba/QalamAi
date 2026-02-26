# QalamAI — Arabic Novel Writing Platform

## Overview
QalamAI is an AI-powered Arabic novel writing platform powered by the virtual literary agent "Abu Hashim" (أبو هاشم). It helps users create original Arabic novels with literary quality inspired by renowned Arab novelists like Ahlam Mosteghanemi, Dr. Khawla Hamdi, and Ibrahim Nasrallah.

**Brand**: QalamAI | **Tagline**: «حيث تتحوّل الفكرة إلى رواية، والقلم إلى صوت.»

## Architecture
- **Frontend**: React SPA with RTL Arabic layout, Tailwind CSS, Shadcn UI
- **Backend**: Express.js with PostgreSQL database
- **AI**: OpenAI GPT-5.2 via Replit AI Integrations (Abu Hashim agent persona)
- **Auth**: Email/password registration + Replit Auth (OpenID Connect) — dual auth system
- **Payments**: Stripe (via Replit Stripe connector + stripe-replit-sync)

## Brand Identity
- **Colors**: Primary Gold #D4AF37, Secondary Deep Blue #0A1A2F, Accent Warm Sand #C9B79C, Background Off-white #F8F5F0
- **Fonts**: Cairo (headings/body), Noto Naskh Arabic (fallback), Amiri (serif/literary), Inter (monospace)
- **Voice**: Elegant, literary, Arabic-rooted, modern, trustworthy

## Key Features
- Multi-step project creation (novel details, characters with 70+ roles, relationships)
- Configurable novel length (20-200 pages) with automatic chapter/structure calculation
- AI-generated novel outlines with chapter breakdown, thematic depth, symbolic motifs, emotional arc mapping, and cultural anchoring
- Auto-write: chapters generated sequentially after outline approval
- Chapter-by-chapter writing with streaming output and multi-part generation
- Abu Hashim literary knowledge: 12 Arab master novelists (Mahfouz, Mosteghanemi, Kanafani, Salih, al-Shaykh, Hamdi, Nasrallah, Munif, Ashour, Jabra, S. Ibrahim, Idris)
- Advanced narrative techniques: time refraction, polyphony, sensory immersion, interior monologue, Arabic symbolism, oral storytelling, layered dialogue, intertextuality
- AI title suggestions: Abu Hashim suggests 5 creative Arabic novel titles based on novel context (POST /api/projects/suggest-titles)
- Incremental save during generation (every 50 chunks)
- Chapter regeneration: completed chapters can be rewritten with confirmation step
- Chapter status tracking (pending, generating, incomplete, completed)
- Free access for admin users: bypasses payment for outline/chapter generation (FREE_ACCESS_USER_IDS)
- PDF download of completed novels
- EPUB export with RTL Arabic formatting (server-side via archiver)
- Chapter-by-chapter PDF preview in modal dialog
- Inline chapter editing with word count recalculation
- Outline regeneration before approval (deletes existing chapters)
- AI character profile suggestions (Abu Hashim generates contextual characters)
- AI novel cover image generation (DALL-E 3, 1024x1792, stored as coverImageUrl)
- Dark mode toggle (ThemeProvider with localStorage persistence)
- User profile page with spending stats and project history
- Dashboard statistics cards (total projects, words, completed novels, active projects)
- Email notifications (novel completion, admin ticket replies) via nodemailer/SMTP
- RTL Arabic UI with Cairo/Amiri/Noto Naskh Arabic fonts

## Pages
- **Landing** (`/`) - QalamAI home page with hero, features, testimonials, CTA
- **About** (`/about`) - Mission, vision, values, how AI works
- **Features** (`/features`) - Detailed feature explanations
- **Pricing** (`/pricing`) - Fixed-price novel tiers (150pg/$300, 200pg/$350, 250pg/$450, 300pg/$600)
- **Login** (`/login`) - Email/password login with Replit Auth option
- **Register** (`/register`) - Email/password registration with Replit Auth option
- **Contact** (`/contact`) - Contact form submitting real tickets to DB
- **Abu Hashim** (`/abu-hashim`) - Meet the AI literary agent
- **Novel Theme** (`/novel-theme`) - Sample novel concept
- **Profile** (`/profile`) - User profile with editable name, spending stats, project history
- **Home** (`/` authenticated) - User dashboard with stats cards, projects + ticket/admin nav links
- **New Project** (`/project/new`) - Multi-step project creation
- **Project Detail** (`/project/:id`) - Project workspace (overview, characters, chapters)
- **Tickets** (`/tickets`) - User's support ticket list
- **Ticket Detail** (`/tickets/:id`) - Individual ticket with conversation thread
- **Admin** (`/admin`) - Admin dashboard with ticket stats, filterable ticket list
- **Admin Ticket** (`/admin/tickets/:id`) - Admin ticket detail with reply, status/priority controls

## Business Model
- Fixed per-project pricing: 150pg→$300, 200pg→$350, 250pg→$450, 300pg→$600 (stored in cents)
- Page count determines novel structure (chapters/parts) — no word count limits
- Word counts (`usedWords`) tracked for informational display only, never enforced
- Projects start "locked" (unpaid) → "draft" (paid) → "outline" → "writing" → "completed"/"finished"
- Payment required before outline/chapter generation (402 error if unpaid)
- Stripe Checkout for one-time payments with session verification on success callback

## Database Schema
- `users` / `sessions` - Replit Auth tables (users includes stripeCustomerId, role)
- `novel_projects` - Novel metadata + payment fields (paid, allowedWords, usedWords, price)
- `characters` - Character profiles (name, background, role)
- `character_relationships` - Relationships between characters
- `chapters` - Individual chapters with generated content and status
- `support_tickets` - Support tickets (userId nullable, name, email, subject, message, status, priority)
- `ticket_replies` - Replies to tickets (ticketId FK, userId, message, isAdmin)
- `stripe.*` - Managed by stripe-replit-sync (DO NOT modify directly)

## User Roles
- `user` (default) - Regular users
- `admin` - Can access admin panel at `/admin`, manage all support tickets

## File Structure
- `shared/schema.ts` - Drizzle ORM schema + pricing constants
- `server/routes.ts` - API endpoints (inc. Stripe checkout & payment verification)
- `server/storage.ts` - Database storage layer
- `server/abu-hashim.ts` - AI prompt engineering for novel writing
- `server/stripeClient.ts` - Stripe SDK client via Replit connector
- `server/webhookHandlers.ts` - Stripe webhook processing
- `server/email.ts` - Email notifications (nodemailer SMTP)
- `client/src/components/theme-provider.tsx` - Dark mode ThemeProvider
- `client/src/pages/` - React pages (landing, home, about, features, pricing, contact, abu-hashim, novel-theme, new-project, project-detail, profile, tickets, ticket-detail, admin, admin-ticket)
- `client/src/lib/pdf-generator.ts` - Client-side PDF/chapter preview generation

## API Routes
- `GET /api/projects` - List user's projects
- `GET /api/projects/:id` - Get project with details
- `POST /api/projects` - Create new project with characters
- `POST /api/projects/:id/outline` - Generate AI outline
- `POST /api/projects/:id/outline/approve` - Approve outline
- `POST /api/projects/:projectId/chapters/:chapterId/generate` - Stream chapter generation (SSE)
- `POST /api/projects/:id/create-checkout` - Create Stripe checkout session
- `POST /api/projects/:id/payment-success` - Verify payment & unlock project
- `POST /api/auth/register` - Register with email/password (public)
- `POST /api/auth/login` - Login with email/password (public)
- `POST /api/auth/logout` - Logout (destroys session)
- `GET /api/auth/user` - Get current authenticated user
- `POST /api/stripe/webhook` - Stripe webhook handler (registered before express.json())
- `POST /api/tickets` - Create support ticket (public, attaches userId if authenticated)
- `GET /api/tickets` - List user's tickets (authenticated)
- `GET /api/tickets/:id` - Get ticket with replies (authenticated, owner only)
- `POST /api/tickets/:id/reply` - User reply to own ticket
- `GET /api/admin/stats` - Ticket stats by status (admin only)
- `GET /api/admin/tickets` - List all tickets with optional status filter (admin only)
- `GET /api/admin/tickets/:id` - Get any ticket with replies (admin only)
- `PATCH /api/admin/tickets/:id` - Update ticket status/priority (admin only)
- `POST /api/admin/tickets/:id/reply` - Admin reply to any ticket (admin only)
- `PATCH /api/projects/:projectId/chapters/:chapterId` - Inline edit chapter content
- `POST /api/projects/:id/suggest-characters` - AI character suggestions
- `POST /api/projects/:id/characters` - Add individual character
- `POST /api/projects/:id/generate-cover` - Generate AI cover image (DALL-E 3)
- `GET /api/projects/:id/export/epub` - Download novel as EPUB
- `PATCH /api/auth/profile` - Update user profile (firstName, lastName)
