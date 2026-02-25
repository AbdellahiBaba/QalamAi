# Abu Hashim - Arabic Novel Writing Assistant

## Overview
An AI-powered Arabic novel writing assistant that helps users create original Arabic novels with literary quality inspired by renowned Arab novelists like Ahlam Mosteghanemi, Dr. Khawla Hamdi, and Ibrahim Nasrallah.

## Architecture
- **Frontend**: React SPA with RTL Arabic layout, Tailwind CSS, Shadcn UI
- **Backend**: Express.js with PostgreSQL database
- **AI**: OpenAI GPT-5.2 via Replit AI Integrations (Abu Hashim agent persona)
- **Auth**: Replit Auth (OpenID Connect)

## Key Features
- Multi-step project creation (novel details, characters, relationships)
- Configurable novel length (20-200 pages) with automatic chapter/structure calculation
- AI-generated novel outlines with chapter breakdown scaled to page count
- Chapter-by-chapter writing with streaming output and multi-part generation for long chapters
- RTL Arabic UI with Amiri/Cairo/Tajawal fonts
- User authentication and project management

## Database Schema
- `users` / `sessions` - Replit Auth tables
- `novel_projects` - Novel project metadata (title, idea, setting, POV, outline)
- `characters` - Character profiles (name, background, role)
- `character_relationships` - Relationships between characters
- `chapters` - Individual chapters with generated content

## File Structure
- `shared/schema.ts` - Drizzle ORM schema definitions
- `server/routes.ts` - API endpoints
- `server/storage.ts` - Database storage layer
- `server/abu-hashim.ts` - AI prompt engineering for novel writing
- `client/src/pages/` - React pages (landing, home, new-project, project-detail)

## API Routes
- `GET /api/projects` - List user's projects
- `GET /api/projects/:id` - Get project with details
- `POST /api/projects` - Create new project with characters
- `POST /api/projects/:id/outline` - Generate AI outline
- `POST /api/projects/:id/outline/approve` - Approve outline
- `POST /api/projects/:projectId/chapters/:chapterId/generate` - Stream chapter generation
