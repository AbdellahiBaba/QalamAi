# QalamAI — Arabic Writing Platform

## Overview
QalamAI is an AI-powered Arabic writing platform designed to assist authors, journalists, screenwriters, and students in creating diverse Arabic content. It features a virtual literary agent, "Abu Hashim," and supports eight core content types: Novel Writing, Professional Essay/News Writing, Drama/Film Scenario Writing, Short Story, Khawater/Reflections, Social Media Content, Arabic Classical Poetry, and Academic Graduation Memoire. The platform aims to be the leading tool for Arabic content creation, preserving and enhancing Arabic literary traditions through AI.

## User Preferences
Not specified.

## System Architecture
QalamAI is a React-based Single Page Application (SPA) utilizing Tailwind CSS and Shadcn UI for its frontend. The backend is an Express.js application connected to a PostgreSQL database. AI functionalities are integrated via OpenAI GPT-5.2, embodied by the "Abu Hashim" agent, which adapts its persona and knowledge base for different content types. Authentication supports email/password and Replit Auth, with Stripe handling payments.

The platform's UI/UX emphasizes elegance and trustworthiness through a color palette of gold, deep blue, warm sand, and off-white, and uses Arabic-rooted fonts like Cairo and Amiri. All interfaces are mobile-responsive.

**Key Architectural Decisions and Features:**
- **AI-Driven Content Generation:** Provides multi-type project creation with dedicated workflows, AI-driven outline and sequential content generation, and specialized AI knowledge bases.
- **Advanced Authoring Tools:** Includes inline editing, chapter version history, AI-powered rewriting with tone selection, title/character suggestions, project blueprints, and originality/plagiarism checks.
- **Content Type Specialization:** Each content type is tailored with specific AI personas and input fields. This includes an advanced Arabic Classical Poetry module with a full prosody engine and an Academic Memoire module offering deep specialization per academic major and country-specific university rules, featuring a comprehensive university database, faculty-aware methodology filtering, and faculty-aware citation style filtering. The `mapFacultyToField()` function maps Arabic faculty names to academic domain keys, and `getMethodologiesByFaculty()`/`getCitationStylesByFaculty()` use faculty context to filter dropdown options dynamically.
- **Export and Publishing:** Robust export to server-side PDF, EPUB, and DOCX, with specialized handling for Arabic text (RTL, BiDi processing, font support). Memoire projects include publisher-quality academic PDF export: formal university thesis cover with country-specific government headers (republic + ministry), decorative title box, navy (#1B365D) and gold (#C4A265) color scheme, front matter pages (Bismillah, Dedication, Acknowledgments, Abstract, Keywords, Hypotheses) with Roman numeral numbering, upgraded TOC with dotted leader lines, chapter opener pages with numbered decorative boxes, section headers with navy/gold accent bars, paragraph first-line indentation, General Introduction and General Conclusion separator pages, and structured References back matter. Users can publish projects to a public gallery or essays to a news page.
- **User Management & Engagement:** Features user profiles, public author profiles, onboarding, notifications, reading progress, writing statistics, and a free trial system with automated billing.
- **Literary Analysis and Enhancements:** AI-powered continuity checks, literary style analysis, and enhanced proofreading for Arabic grammar and morphology.
- **UI/UX and Accessibility:** Adheres to Arabic display standards (ordinal words, BiDi reordering), includes dark mode, keyboard shortcuts, focus mode, drag-and-drop chapter management, and SEO optimization.
- **Content Reporting System:** A multi-step reporting dialog for public users, categorizing issues by type and severity. Backend captures reporter metadata for administrative review.
- **Free Plan:** Offers limited monthly project and chapter generations with upgrade calls to action.
- **Admin Tools:** A comprehensive admin panel for managing users, content moderation, reports, reviews, API usage, analytics, and promo codes. Includes specific analytics for memoires and a feature toggle system.
- **Abu Hashim Self-Learning System:** A RAG-based intelligence engine that extracts knowledge from user interactions (style analyses, rewrites, published projects, terminology), validates entries via GPT-5.2 quality checks, and injects curated knowledge into all AI prompts. Admin dashboard provides manual learning triggers, session history, knowledge base management, auto-learning toggle (24h cycle), and quality filtering. Tables: `knowledge_entries`, `learning_sessions`. Files: `server/learning-engine.ts`, `server/knowledge-memory.ts`, `server/abu-hashim.ts` (enhanceWithKnowledge).
- **AI Profile Avatar & Chat:** Users can generate AI profile images using DALL-E. A contextual AI chat, "Abu Hashim," provides literary advice and brainstorming in general and project-specific modes.
- **Dashboard Performance:** The user dashboard is optimized for fast loading: stats endpoints use single-query joins (eliminating N+1 queries) with per-user server-side caching (30-60s TTL via `serveCached`); heavy components (TrialPromptPopup/Stripe, AbuHashimChat, WritingStatsPanel) are lazy-loaded with `React.lazy`; stable queries use `staleTime` (1-5 min) to avoid redundant re-fetches; notification polling reduced to 60s.
- **Duplicate Chapter Prevention:** Outline regeneration always clears all existing chapters before creating new ones (not conditionally). Memoire path includes an additional safety cleanup right before chapter creation. Individual chapters can be deleted via `DELETE /api/projects/:projectId/chapters/:chapterId` with confirmation UI in project detail.

## External Dependencies
- **OpenAI GPT-5.2**: Powers all AI content generation, analysis, and assistance.
- **PostgreSQL**: Primary database for all application data.
- **Stripe**: Handles payment processing and subscriptions.
- **DALL-E**: Used for generating cover images and AI profile avatars.
- **Nodemailer/SMTP**: For sending email notifications.
- **pdfkit**: Server-side PDF generation.
- **archiver**: EPUB file generation.
- **docx (npm package)**: DOCX document generation.
- **Training Webhook System**: Automatically sends AI interaction data (prompts, responses, metadata) to an external training server via configurable webhook. Includes retry queue with exponential backoff, admin delivery log, and test endpoint. Files: `server/webhook-dispatcher.ts`. DB table: `webhook_deliveries`. Feature flag: `training_webhook`. Env vars: `TRAINING_WEBHOOK_URL`, `WEBHOOK_SECRET`.

## Key Environment Variables
- `TRAINING_WEBHOOK_URL`: External webhook endpoint for sending AI interaction training data
- `WEBHOOK_SECRET`: Shared secret for authenticating webhook requests (sent as X-Webhook-Secret header)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: Email configuration
- `SESSION_SECRET`: Session encryption key