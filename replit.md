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
- **Content Type Specialization:** Each content type is tailored with specific AI personas and input fields. This includes a Reels (short-form video scripts) generator that uses GPT-5.2 to parse scripts, DALL-E for scene images, TTS for Arabic voiceover, and FFmpeg to stitch them into MP4 videos. It also includes an advanced Arabic Classical Poetry module with a full prosody engine and an Academic Memoire module offering deep specialization per academic major and country-specific university rules, with dynamic faculty-aware filtering for methodologies and citation styles.
- **Export and Publishing:** Robust server-side export to PDF, EPUB, and DOCX, with specialized handling for Arabic text (RTL, BiDi processing, font support). Memoire projects include publisher-quality academic PDF export with formal university thesis covers and structured back matter. Users can publish projects to a public gallery or essays to a news page.
- **User Management & Engagement:** Features user profiles, public author profiles, onboarding, notifications, reading progress, writing statistics, and a free trial system with automated billing.
- **Literary Analysis and Enhancements:** AI-powered continuity checks, literary style analysis, and enhanced proofreading for Arabic grammar and morphology.
- **UI/UX and Accessibility:** Adheres to Arabic display standards (ordinal words, BiDi reordering), includes dark mode, keyboard shortcuts, focus mode, drag-and-drop chapter management, and SEO optimization.
- **Content Reporting System:** A multi-step reporting dialog for public users, categorizing issues by type and severity.
- **Free Plan:** Offers limited monthly project and chapter generations with upgrade calls to action.
- **Admin Tools:** A comprehensive admin panel for managing users, content moderation, reports, reviews, API usage, analytics, and promo codes.
- **Abu Hashim Self-Learning System:** A RAG-based intelligence engine that extracts knowledge from user interactions, validates entries, and injects curated knowledge into all AI prompts.
- **AI Profile Avatar & Chat:** Users can generate AI profile images using DALL-E. A contextual AI chat, "Abu Hashim," provides literary advice and brainstorming.
- **Performance Optimizations:** Dashboard optimized with single-query joins, server-side caching, lazy-loading of heavy components, and stable queries. Database performance improved with indexes and optimized SQL queries.
- **Security Hardening:** Implemented Helmet for comprehensive security headers (CSP, HSTS, X-Frame-Options, etc.), whitelist-based CORS, Double-submit cookie CSRF protection, server-side HTML sanitization, strong password policies, account lockout, reduced session TTL, secure Stripe webhook validation, request limits, and secure API response practices. Scanner probe blocking middleware prevents access to sensitive paths.
- **Input Validation Hardening:** `parseInt` NaN safety implemented, Zod schemas used for major API endpoints, and public API rate limiting.
- **Database Integrity:** Foreign key constraints and unique constraints ensure data consistency, along with optimized indexing for performance.
- **Public Tipping System:** `/api/tips/public-checkout` allows anonymous and logged-in users to tip authors via Stripe Checkout with selectable amounts ($1/$3/$5/$10). Tip buttons are prominently placed on essay reader, essays listing, leaderboard, and author profile pages.
- **Email Subscription System (non-platform followers):** `email_subscriptions` table stores email subscriptions from non-platform users. Routes: `POST /api/authors/:id/subscribe-email`, `GET /api/authors/:id/check-email-subscription`, `GET /api/unsubscribe/:token`. Author profile page includes an email subscription form visible to all visitors. When an author publishes a new essay, email subscribers receive a notification that includes the author's leaderboard rank.
- **RSS Feed Per Author:** `/rss/author/:id` serves an RSS 2.0 feed of an author's published essays.
- **Bug Fix — MonthlyReport flooding:** The 30-day `setInterval` (2,592,000,000ms) overflowed Node.js's 32-bit integer limit, causing it to run every 1ms and exhaust the DB connection pool. Fixed by using a 24-hour check interval with a last-run timestamp guard.
- **Bug Fix — Author profile "not found":** `getPublicAuthor()` was blocking profiles where `publicProfile=false`. Fixed to allow any registered user to have a visible profile.
- **Social Marketing AI:** Paid users can access the social marketing advisor (`/social-marketing`) for literary marketing advice. Admin marketing chat available to admin/superadmin roles.
- **Abu Hashim Social Media Manager Hub:** Super Admin-only page at `/admin/social-hub` with 5 tabs (Dashboard, Post Queue, Content Generator, Insights, Settings). Generates 5 daily posts (2 marketing + 3 literary خواطر) with DALL-E cover images for literary posts. Supports scheduling, status tracking, manual engagement logging, and best posting time analysis. DB tables: `social_posts` and `social_post_insights`.
- **Author Analytics Dashboard:** Dedicated `/analytics` page (authenticated only) with 6 sections: summary stats (views, followers, published works, reactions), 30-day daily views line chart, weekly follower growth bar chart, top works by views, reading completion rates with progress bars, tips received history, and geographic data placeholder. Routes: `GET /api/me/analytics/views`, `GET /api/me/analytics/followers`, `GET /api/me/analytics/tips-history`, `GET /api/me/analytics/completion`, `GET /api/me/analytics/countries`. Uses recharts for visualization. Accessible from profile page sidebar button and mobile nav.
- **Writing Editor Enhancements:** Five quality-of-life features in the chapter editor (project-detail.tsx): (1) Auto-save indicator — 30-second debounce with silent save, shows "جاري الحفظ..." / "محفوظ قبل X ثانية" status pill; (2) Distraction-free fullscreen mode — dark overlay with centered textarea, Escape or button to exit; (3) Focus mode — toggle in fullscreen that highlights the focus mode button; (4) Session word counter — floating badge shows +/- word delta since edit session start; (5) Ambient sounds — Web Audio API generated rain (filtered white noise), cafe (bandpass noise + subtle hum), keyboard clicks (exponential decay noise bursts at ~140ms intervals), cycle with a button.
- **Social Hub Platform Activation:** Super-admin can enable/disable individual social platforms (Facebook, Instagram, X, TikTok, LinkedIn) from the Social Hub Settings tab. Active platforms filter applies to: content generation (generate-single), auto-generate-now, and the daily background auto-generation job. Routes: `GET/PUT /api/admin/social/active-platforms`. Stored in `social_hub_settings` table key `active_platforms` as JSON array.

## External Dependencies
- **OpenAI GPT-5.2**: Powers all AI content generation, analysis, and assistance.
- **PostgreSQL**: Primary database for all application data.
- **Stripe**: Handles payment processing and subscriptions.
- **DALL-E**: Used for generating cover images and AI profile avatars.
- **Nodemailer/SMTP**: For sending email notifications.
- **pdfkit**: Server-side PDF generation.
- **archiver**: EPUB file generation.
- **docx (npm package)**: DOCX document generation.
- **FFmpeg**: Video composition for Reels.
- **Training Webhook System**: Automatically sends AI interaction data to an external training server via configurable webhook.