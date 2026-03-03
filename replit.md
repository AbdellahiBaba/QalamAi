# QalamAI — Arabic Writing Platform

## Overview
QalamAI is an AI-powered Arabic writing platform featuring the virtual literary agent "Abu Hashim." It aims to transform ideas into narratives by supporting six core content types: Novel Writing, Professional Essay/News Writing, Drama/Film Scenario Writing, Short Story, Khawater/Reflections, and Social Media Content. The platform seeks to become the premier tool for Arabic content creation, leveraging AI to assist authors, journalists, and screenwriters in bringing their visions to life.

## User Preferences
Not specified.

## System Architecture
QalamAI is built as a React Single Page Application (SPA) utilizing Tailwind CSS and Shadcn UI. The backend is powered by Express.js with a PostgreSQL database. AI capabilities are integrated through OpenAI GPT-5.2 via Replit AI Integrations, embodying the specialized "Abu Hashim" agent persona across three distinct modes. Authentication supports both traditional email/password and Replit Auth (OpenID Connect). Stripe is integrated for payment processing.

The platform's brand identity uses a palette of gold, deep blue, warm sand, and off-white, complemented by Arabic-rooted fonts like Cairo and Amiri, conveying an elegant and trustworthy voice. All pages are fully mobile-responsive.

**Core Features include:**
- Multi-type project creation with dedicated workflows for various content types.
- AI-driven outline generation and sequential content generation with streaming output.
- Specialized AI knowledge bases for each content type, drawing from renowned Arab literary figures.
- Advanced authoring tools such as inline editing, chapter version history, and "Rewrite This Section" with tone selection.
- AI-powered content enhancements: title/character suggestions, full project blueprints, cover image generation (DALL-E with Arabic title calligraphy), originality/plagiarism checks, and glossary auto-generation.
- Robust export capabilities: server-side PDF generation (with Amiri Arabic font support for RTL), EPUB, and DOCX export.
- User management includes profiles, public author profiles, and an onboarding wizard.
- Engagement features: in-app notification center, reading progress tracking, chapter bookmarks, and project favorites.
- Writing statistics dashboard: daily activity, per-project word breakdown, and completion rates.
- Community and sharing: project sharing via public read-only links and a public gallery with author rating.
- Administrative tools: comprehensive admin panel for user, content, revenue management, API usage tracking, and platform review moderation.
- Content Type Specifics: Each content type has tailored AI personas, generation parameters, and specific fields.
- Analysis Tools: Continuity Fix and Literary Style Analysis provide AI-driven improvements with actionable suggestions.
- Arabic Display Standards: Chapter/section numbers are displayed as Arabic ordinal words, and numeric values are wrapped with an LTR component for BiDi reordering.
- Free Trial System: 24-hour free trial with Stripe Setup Intent and auto-charge. Server-side background job (`server/trial-processor.ts`) runs every 5 minutes via `setInterval` in `server/index.ts` to process expired trials even if user never returns. `processTrialExpiry()` handles charge with retry (up to 3 attempts, 1-hour delay), `requires_action`/`requires_payment_method` statuses, and sends email notifications on success/failure. Race condition prevented via `trialChargeAttempted`/`trialChargeStatus` fields and sessionStorage throttle on client. Admin panel shows trial charge status badges. DB fields: `trialChargeAttempted`, `trialChargeStatus`, `trialChargeAttempts`, `trialLastChargeAttempt`. Storage has `getExpiredTrialUsers()` for efficient DB-level filtering.
- Writing Streaks & Daily Goals: Tracks user writing streaks and allows setting daily word goals.
- Abu Hashim Chat: General and project-contextual AI chat for literary advice and brainstorming.
- Keyboard Shortcuts: For efficient navigation and editing within the project workspace.
- Reading Time Estimates: Provided per-chapter and per-project for Arabic reading speed.
- Dark Mode: Global theme toggle for user preference.
- SEO & Performance: Dynamic page titles, JSON-LD structured data, sitemap, robots.txt, code splitting, error boundary, and lazy image loading.
- Word Count Goals: Users can set target word counts for projects with progress visualization.
- Focus/Zen Writing Mode: Full-screen, minimalist writing environment.
- Chapter Drag-and-Drop Reordering: Allows users to reorder chapters.
- Auto-Save Drafts: Automatic saving of chapter content with local storage backup.
- Project Templates: Pre-fills project details for common genres.
- AI-Powered Chapter Summaries: Generates concise summaries for chapters.
- Reading Progress for Shared Projects: Scroll-based progress bar and chapter completion tracking for public links.
- Admin Grant Analysis Uses: Allows administrators to grant additional analysis uses to users.
- Marketing Popup: Displays an animated popup for first-time visitors.
- Tracking Pixels (TikTok & Facebook): Admin-managed pixel tracking with client and server-side event tracking.
- Political Essays & News Page: Public page at `/essays` showing published essays sorted by popularity with view/click tracking. Authors must opt-in via `publishedToNews` toggle.
- Publish Destination Choice: Authors can independently choose to publish to the gallery (`publishedToGallery`) and/or the essays page (`publishedToNews` for essays only). Both toggles appear in the project-detail share section when shareToken exists. Gallery now filters by `publishedToGallery = true` instead of just `shareToken IS NOT NULL`.
- Publish to News Toggle: Essay authors can choose to publish their essays to the public news page via a switch in the project detail share section. Requires shareToken.
- Essays Marketing Popup: Animated popup on landing page promoting the political essays section.
- Admin Essay Analytics: "المقالات" tab in admin panel with views, clicks, CTR, and sorting.
- Password Reset Flow: Forgot-password email with reset token, reset-password page. Uses `passwordResetTokens` table.
- Welcome Popup: Warm welcome dialog for new signups and returning users with personalized stats.
- Social Sharing: Sticky bar on shared project pages with X/Twitter, Facebook, WhatsApp, Telegram, and copy link buttons.
- Reader Reactions: Essay readers can react with like/love/insightful/thoughtful. Counts shown on essay cards and shared view. Uses `essayReactions` table.
- Abu Hashim Chat Component: Reusable `abu-hashim-chat.tsx` component used in both home and project-detail pages. In "general" mode (dashboard), the chat trigger is a branded tab on the left edge. In "project" mode, it's a floating button at bottom-left. Both modes have a dismiss "×" button; dismissed state is persisted in localStorage (`abu-hashim-visible`). When dismissed, a small amber restore button appears at bottom-left.
- Shared Project Navigation: Back button and QalamAI branding in a sticky nav bar at the top of shared-project.tsx.
- Essay Author Details: Essay cards on /essays show clickable author names (navigates to /author/:id) and star ratings matching the gallery style.
- Reading Time Estimates: Calculated at ~200 wpm for Arabic, shown on essay cards and shared project pages.
- Related Essays: "مقالات ذات صلة" section at bottom of shared essays showing up to 3 related essays by subject.
- Admin Feature Toggle System: Admin can activate/deactivate platform features via "المميزات" tab. Uses `platformFeatures` table with `featureKey`, `name`, `description`, `enabled`, `betaOnly`, `betaUserIds` (array), `disabledMessage`. Three modes: "للجميع" (enabled for all), "بيتا فقط" (enabled=true, betaOnly=true — only beta users can access), "معطّلة" (disabled with optional beta exceptions). `useFeatures()` hook (`client/src/hooks/use-features.ts`) fetches `/api/features`. Disabled features show "قريباً" badge in dashboard dropdown. Server enforces feature toggles on `POST /api/projects`. Admin UI has user search for adding beta users with avatar chips and explicit save button. 12 default features seeded on startup.
- Dashboard Navigation: Gallery ("المعرض" → /gallery) and Essays ("المقالات" → /essays-news) links added to dashboard header alongside existing Reviews, Tickets, Admin, and Profile links.
- Project Deletion: Users can delete their own projects via trash icon in project-detail header. Cascading deletion removes chapters, chapter versions, characters, relationships, bookmarks, reading progress, favorites, essay views/clicks/reactions. Confirmation dialog required. Uses `DELETE /api/projects/:id` with ownership check.
- SharedFooter Component: Reusable `client/src/components/shared-footer.tsx` used across all public pages (landing, about, features, pricing, contact, abu-hashim, essays-news, gallery, reviews, tickets, ticket-detail, author-profile). Extracted from inline footer blocks.
- Author Profile Navigation: SharedNavbar and SharedFooter added to author-profile page. Back button ("العودة") with right-pointing arrow for RTL navigation.
- Abu Hashim Enhanced Proofreading: All content-type prompts include mandatory "مرحلة التدقيق اللغوي" section with النحو/الصرف/الإملاء checklists and "أخطاء شائعة يجب تجنبها" covering 8 common error categories (إنّ vs أنّ, لام الجحود, واو المعية, حيث, ض vs ظ, broken plurals, ألف الإطلاق, همزة الوصل والقطع).
- Admin Social Media Links: Admin can manage platform social media profile links (LinkedIn, TikTok, X, Instagram, Facebook, YouTube, Snapchat, Telegram, WhatsApp) with enable/disable toggle and display order. Uses `socialMediaLinks` table. Reusable `SocialMediaIcons` component renders enabled links in all public page footers and the contact page.
- Navigation Structure: All marketing/public pages (landing, about, features, pricing, contact, abu-hashim, essays-news) use a shared `SharedNavbar` component from `client/src/components/shared-navbar.tsx`. The navbar detects auth state via `useAuth()` — logged-in users see dashboard/profile/tickets/reviews/admin links; logged-out users see login/register buttons. `navLinks` and `footerOnlyLinks` are exported from shared-navbar.tsx and imported by pages for their footers. "آراء المستخدمين" (Reviews) appears only in footers.
- AI Profile Avatar: Users can generate an AI profile image via the profile page. Four style options (classic oil painting, modern digital art, Arabic calligraphy, watercolor). Uses `POST /api/profile/generate-avatar` with DALL-E gpt-image-1. Result saved as base64 to `profileImageUrl`.
- Author Name Display: All public endpoints (essays, gallery, related essays) use `displayName || firstName || email || "مؤلف"` fallback chain for author names.
- Unshare Cleanup: When a user unshares a project (DELETE /api/projects/:id/share), it also resets publishedToGallery and publishedToNews to false.
- Shared Project Z-Index: Progress bar (z-50, fixed top-0), nav bar (z-30, sticky top-0), chapter tracker (z-40, fixed top-[60px]).
- Arabic Classical Poetry (الشعر العمودي): Seventh content type "poetry" with full prosody engine. `server/arabic-prosody.ts` encodes all 15 بحور (meters) with تفعيلات, زحافات, علل, masterVerses (شواهد شعرية with poet attributions), 5 literary eras, 14 themes, 10 tones, 28 rhyme letters, and verse count options. `buildPoetryPrompt()` in `server/abu-hashim.ts` constructs prosody-aware prompts for GPT-5.2 with era-specific master poet emulation instructions (e.g., "انظم كأنك المتنبي — لا كأنك آلة"). POETRY_SYSTEM_PROMPT includes "مبدأ الإتقان" section with anti-AI-poetry rules (avoid repetitive structures, weak verbs, generic adjectives, forced rhymes). `buildProsodyPromptSection()` includes famous شواهد from the greatest poets. Flow is like khawater: single auto-chapter "القصيدة", no outline. Schema fields: `poetryMeter`, `poetryRhyme`, `poetryEra`, `poetryTone`, `poetryTheme`, `poetryVerseCount`, `poetryImageryLevel`, `poetryEmotionLevel`. Price: $49.99 (4999). Poetry creation UI in new-project.tsx with meter selector grid, rhyme letter picker, era/tone/theme dropdowns, imagery/emotion sliders. Project-detail.tsx displays verses with صدر/عجز split formatting. API endpoint `GET /api/poetry/prosody-data` provides metadata. بحر الوافر: basePattern/basePatternSadr both correctly end in فعولن (العروض مقطوفة دائماً).

## External Dependencies
- **OpenAI GPT-5.2**: Integrated via Replit AI for AI-powered content generation.
- **PostgreSQL**: Primary database.
- **Stripe**: Payment gateway.
- **DALL-E (gpt-image-1)**: Used for AI-generated cover images and AI profile avatar generation.
- **Nodemailer/SMTP**: For email notifications.
- **pdfkit**: Server-side PDF generation.
- **jsPDF**: Client-side PDF preview/download.
- **archiver**: Used for EPUB generation.
- **docx (npm package)**: Used for DOCX export. Professional formatting with Sakkal Majalla font, decorative title page, table of contents, page headers (title + author) with border, page footers with Arabic page numbers, markdown bold parsing, heading levels (H1-H3), decorative separator lines, glossary with term/definition styling.