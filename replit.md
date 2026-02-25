# QalamAI — Arabic Novel Writing Platform

## Overview
QalamAI is an AI-powered Arabic novel writing platform powered by the virtual literary agent "Abu Hashim" (أبو هاشم). It helps users create original Arabic novels with literary quality inspired by renowned Arab novelists like Ahlam Mosteghanemi, Dr. Khawla Hamdi, and Ibrahim Nasrallah.

**Brand**: QalamAI | **Tagline**: «حيث تتحوّل الفكرة إلى رواية، والقلم إلى صوت.»

## Architecture
- **Frontend**: React SPA with RTL Arabic layout, Tailwind CSS, Shadcn UI
- **Backend**: Express.js with PostgreSQL database
- **AI**: OpenAI GPT-5.2 via Replit AI Integrations (Abu Hashim agent persona)
- **Auth**: Replit Auth (OpenID Connect)

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
- **Pricing** (`/pricing`) - 3 pricing tiers (free, pro, studio)
- **Contact** (`/contact`) - Contact form and info
- **Abu Hashim** (`/abu-hashim`) - Meet the AI literary agent
- **Novel Theme** (`/novel-theme`) - Sample novel concept
- **Home** (`/` authenticated) - User dashboard with projects
- **New Project** (`/project/new`) - Multi-step project creation
- **Project Detail** (`/project/:id`) - Project workspace (overview, characters, chapters)

## Database Schema
- `users` / `sessions` - Replit Auth tables
- `novel_projects` - Novel project metadata (title, idea, setting, POV, outline, pageCount)
- `characters` - Character profiles (name, background, role)
- `character_relationships` - Relationships between characters
- `chapters` - Individual chapters with generated content and status

## File Structure
- `shared/schema.ts` - Drizzle ORM schema definitions
- `server/routes.ts` - API endpoints
- `server/storage.ts` - Database storage layer
- `server/abu-hashim.ts` - AI prompt engineering for novel writing
- `client/src/pages/` - React pages (landing, home, about, features, pricing, contact, abu-hashim, novel-theme, new-project, project-detail)
- `client/src/lib/pdf-generator.ts` - Client-side PDF generation for novels

## API Routes
- `GET /api/projects` - List user's projects
- `GET /api/projects/:id` - Get project with details
- `POST /api/projects` - Create new project with characters
- `POST /api/projects/:id/outline` - Generate AI outline
- `POST /api/projects/:id/outline/approve` - Approve outline
- `POST /api/projects/:projectId/chapters/:chapterId/generate` - Stream chapter generation (SSE)
