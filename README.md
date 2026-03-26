# QalamAI — Arabic Writing Platform

<div align="center">

<!-- Frontend -->
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Shadcn UI](https://img.shields.io/badge/shadcn%2Fui-000000?logo=radixui&logoColor=white)](https://ui.shadcn.com)
[![Radix UI](https://img.shields.io/badge/Radix_UI-161618?logo=radixui&logoColor=white)](https://www.radix-ui.com)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)

<!-- Backend -->
[![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Express.js](https://img.shields.io/badge/Express.js-000000?logo=express&logoColor=white)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-F7DF1E?logo=javascript&logoColor=black)](https://orm.drizzle.team)

<!-- AI & Media -->
[![OpenAI](https://img.shields.io/badge/OpenAI-412991?logo=openai&logoColor=white)](https://platform.openai.com)
[![DALL·E](https://img.shields.io/badge/DALL·E-000000?logo=openai&logoColor=white)](https://platform.openai.com/docs/guides/images)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-007808?logo=ffmpeg&logoColor=white)](https://ffmpeg.org)
[![Coqui TTS](https://img.shields.io/badge/XTTS_v2-FFB000?logo=python&logoColor=black)](https://coqui.ai)

<!-- Payments -->
[![Stripe](https://img.shields.io/badge/Stripe-635BFF?logo=stripe&logoColor=white)](https://stripe.com)

<!-- Auth -->
[![Replit Auth](https://img.shields.io/badge/Replit_Auth-F26207?logo=replit&logoColor=white)](https://docs.replit.com)

<!-- Emails -->
[![Nodemailer](https://img.shields.io/badge/Nodemailer-009688?logo=minutemailer&logoColor=white)](https://nodemailer.com)

<!-- Document Export -->
[![pdfkit](https://img.shields.io/badge/pdfkit-CC0000?logo=adobeacrobatreader&logoColor=white)](https://pdfkit.org)
[![archiver](https://img.shields.io/badge/archiver-000000?logo=zip&logoColor=white)](https://www.npmjs.com/package/archiver)
[![docx](https://img.shields.io/badge/docx-2B579A?logo=microsoftword&logoColor=white)](https://www.npmjs.com/package/docx)

<!-- Security -->
[![Helmet](https://img.shields.io/badge/Helmet-000000?logo=helmet&logoColor=white)](https://helmetjs.github.io)
[![Zod](https://img.shields.io/badge/Zod-3E67B1?logo=typescript&logoColor=white)](https://zod.dev)

<!-- PWA -->
[![PWA](https://img.shields.io/badge/PWA-5A0FC8?logo=pwa&logoColor=white)](https://developer.mozilla.org/docs/Web/API/Service_Worker_API)

</div>


## Overview
QalamAI is an AI-powered Arabic writing platform designed to assist authors, journalists, screenwriters, and students in creating diverse Arabic content. It features a virtual literary agent, "Abu Hashim," and supports eight core content types: Novel Writing, Professional Essay/News Writing, Drama/Film Scenario Writing, Short Story, Khawater/Reflections, Social Media Content, Arabic Classical Poetry, and Academic Graduation Memoire. The platform aims to be the leading tool for Arabic content creation, preserving and enhancing Arabic literary traditions through AI.

## User Preferences
Not specified.

## System Architecture
QalamAI is a React-based Single Page Application (SPA) utilizing Tailwind CSS and Shadcn UI for its frontend. The backend is an Express.js application connected to a PostgreSQL database. AI functionalities are integrated via OpenAI GPT-5.2, embodied by the "Abu Hashim" agent, which adapts its persona and knowledge base for different content types. Authentication supports email/password and Replit Auth, with Stripe handling payments. The platform's UI/UX emphasizes elegance and trustworthiness through a color palette of gold, deep blue, warm sand, and off-white, and uses Arabic-rooted fonts like Cairo and Amiri. All interfaces are mobile-responsive.

**Key Architectural Decisions and Features:**
-   **AI-Driven Content Generation:** Provides multi-type project creation with dedicated workflows, AI-driven outline and sequential content generation, and specialized AI knowledge bases. Includes advanced modules for Arabic Classical Poetry (prosody engine) and Academic Memoire (specialization by major/country, dynamic faculty-aware filtering). It also includes a Reels (short-form video scripts) generator that uses GPT-5.2 to parse scripts, DALL-E for scene images, TTS for Arabic voiceover, and FFmpeg to stitch them into MP4 videos.
-   **Advanced Authoring Tools:** Features inline editing, chapter version history, AI-powered rewriting with tone selection, title/character suggestions, project blueprints, and originality/plagiarism checks.
-   **Content Type Specialization:** Each content type is tailored with specific AI personas and input fields.
-   **Export and Publishing:** Robust server-side export to PDF, EPUB, and DOCX, with specialized handling for Arabic text (RTL, BiDi processing, font support). Memoire projects include publisher-quality academic PDF export with formal university thesis covers and structured back matter. Users can publish projects to a public gallery or essays to a news page.
-   **User Management & Engagement:** Features user profiles, public author profiles, onboarding, notifications, reading progress, writing statistics, and a free trial system with automated billing.
-   **Literary Analysis and Enhancements:** AI-powered continuity checks, literary style analysis, enhanced proofreading for Arabic grammar and morphology, and editorial review mode (in-project per-chapter streaming review + standalone page at `/editor`).
-   **Abu Hashim Editorial Review (أبو هاشم المحرر):** A dedicated AI editorial review mode accessible both as a standalone page (`/editor`) and inline within each chapter in `project-detail.tsx`. Uses streaming SSE via `POST /api/projects/:id/editorial-review` (in-project) and `POST /api/editorial-review` (standalone). Reviews cover: حكم عام, ملاحظات لغوية, أسلوب وإيقاع, بناء وتدفق, النص المنقّح. The in-project panel allows one-click loading of the revised text into the chapter editor.
-   **UI/UX and Accessibility:** Adheres to Arabic display standards (RTL, BiDi, ordinal words), includes dark mode, keyboard shortcuts, focus mode, drag-and-drop chapter management, and SEO optimization.
-   **Admin Tools:** A comprehensive admin panel for managing users, content moderation, reports, reviews, API usage, analytics, promo codes, revenue dashboard (MRR, churn rate, plan distribution), bulk content moderation (multi-select reports with dismiss/warn/remove), user impersonation (super-admin only view-as with sticky banner), and AI daily prompt auto-generation (GPT-4o powered).
-   **Abu Hashim Self-Learning System:** A RAG-based intelligence engine that extracts and injects curated knowledge into AI prompts, validating entries and learning from user interactions.
-   **AI Profile Avatar & Chat:** Users can generate AI profile images using DALL-E and interact with a contextual AI chat, "Abu Hashim," for literary advice and brainstorming. Chat history is persisted server-side in `conversations` and `messages` tables with userId/mode/projectId scoping. Users can browse, resume, and delete past conversations.
-   **Performance Optimizations:** Dashboard optimized with single-query joins, server-side caching, lazy-loading of heavy components, and stable queries. Database performance improved with indexes and optimized SQL queries.
-   **Progressive Web App (PWA):** Installable on mobile/desktop with caching for Google Fonts, API responses, and static assets.
-   **Security Hardening:** Implemented Helmet for comprehensive security headers (CSP, HSTS, X-Frame-Options, etc.), whitelist-based CORS, Double-submit cookie CSRF protection, server-side HTML sanitization, strong password policies, account lockout, reduced session TTL, secure Stripe webhook validation, request limits, and secure API response practices. Scanner probe blocking middleware prevents access to sensitive paths.
-   **Input Validation Hardening:** `parseInt` NaN safety implemented, Zod schemas used for major API endpoints, and public API rate limiting.
-   **Database Integrity:** Foreign key constraints and unique constraints ensure data consistency, along with optimized indexing for performance.
-   **Public Tipping System:** `/api/tips/public-checkout` allows anonymous and logged-in users to tip authors via Stripe Checkout with selectable amounts ($1/$3/$5/$10). Tip buttons are prominently placed on essay reader, essays listing, leaderboard, and author profile pages.
-   **Email Subscription System (non-platform followers):** `email_subscriptions` table stores email subscriptions from non-platform users. Author profile page includes an email subscription form. When an author publishes a new essay, email subscribers receive a notification that includes the author's leaderboard rank.
-   **RSS Feed Per Author:** `/rss/author/:id` serves an RSS 2.0 feed of an author's published essays.
-   **Writing Editor Enhancements:** Includes auto-save indicator, distraction-free fullscreen mode, focus mode, session word counter, and ambient sounds (rain, cafe, keyboard clicks).
-   **Reading Lists for All Content Types:** Support for saving any published gallery work (novel, short story, scenario, khawater, poetry, memoire). `collection_items` table supports both `essay_id` and `project_id`. Includes bookmark buttons and expandable collections with mixed content types.
-   **Monetization Expansions:**
    -   **Chapter Paywall:** Authors can set individual chapters as paid, requiring readers to unlock them via Stripe Checkout. Reader sees 200-word preview.
    -   **Gift Subscriptions:** Allows purchasing gift subscriptions for various plans (essay, scenario, all_in_one).
    -   **Reading Rewards (Points):** Users earn points for activities (reading, login, sharing), redeemable for discounts.
-   **Notifications & Author Newsletter:** Features an in-app notification system (NotificationBell UI) and allows authors to send newsletters to their email subscribers. Includes an enhanced weekly digest with personalized content.
    -   **Persistent Digest Scheduling:** Weekly digest and monthly author reports use `system_settings` table to persist last-run timestamps, surviving server restarts. Weekly checks every 6h, monthly checks every 24h.
    -   **Granular Email Preferences:** Users can control 5 email preference toggles: main notifications switch, weekly digest, follow publications, tips/comments, and writing challenges. Stored in `users` table columns. Master toggle disables all sub-preferences. Profile UI shows all toggles in a dedicated section.
-   **Community Features:**
    -   **Project Tags:** Supports tag-based filtering for projects with up to 5 tags per project.
    -   **Writing Challenges:** Admin-created challenges with user entry and winner selection.
    -   **Beta Readers:** Authors can indicate if they are seeking beta readers, with an opt-in request system.
    -   **Related Works:** Displays up to 6 related projects based on type, genre, and tags.
    -   **Project Comments:** Public commenting system for all published gallery works. `project_comments` table with IP-based rate limiting (3/hr), author notifications via `notifyUser`, comment count badge on gallery cards, full comment section on shared reader page (`/shared/:token`), and admin moderation tab in admin panel.
-   **Social Marketing AI:** Paid users can access a social marketing advisor. Includes a Super Admin-only Social Media Manager Hub (Abu Hashim Social Media Manager Hub) for generating, scheduling, and analyzing social media posts with DALL-E images across active platforms (Facebook, Instagram, X, TikTok, LinkedIn).
-   **Author Analytics Dashboard:** Dedicated `/analytics` page with summary stats, growth charts, top works, reading completion rates, tips history, and geographic data.
-   **Content Reporting System:** A multi-step reporting dialog for public users, categorizing issues by type and severity.
-   **Free Plan:** Offers limited monthly project and chapter generations with upgrade calls to action.
-   **Writing Sprint Mode:** Timed writing challenges with configurable duration (5–60 min), word-count targets, optional project linking, circular progress timer, pause/resume, completion celebration dialog with WPM stats, and personal-best tracking. Sprint history and aggregate stats (total sprints, best sprint, weekly words) shown on home dashboard. Data persisted in `writing_sprints` table.
-   **In-Reader Quote System (الاقتباسات):** Readers can select text passages in the reader (`/project/:id/read/:chapterId`) or shared project page (`/shared/:token`) and save them as quotes. Floating selection toolbar appears on text selection with "اقتبس", "نسخ", and "شارك" buttons. Quotes stored in `project_quotes` table with IP rate limiting for guests (5/hr). Shared project page displays "أبرز الاقتباسات" section with top quotes and share card generation. Author profile shows "أبرز اقتباساتي" section with top 3 most-quoted lines. Admin can view/flag/delete quotes via `/api/admin/quotes`. Quote share cards generated as 800×500 PNG with warm Arabic calligraphy styling.
-   **Visual Story Structure Map (خريطة الرواية):** Interactive horizontal bar chart visualization of project chapters in project-detail page. Each chapter is a colored bar (blue=draft, green=complete, gray=locked) with height proportional to word count. Hover/tap popover shows chapter title, word count, status, last edited date, and "افتح الفصل" link. Act structure overlay divides the timeline into 3 acts (for novels/scenarios/memoires). "تحليل البنية" button calls Abu Hashim via SSE (`POST /api/projects/:id/structure-analysis`) for 3-4 sentence structural analysis on pacing and balance. Available as "خريطة المشروع" tab alongside the chapter list when project has 2+ chapters.
-   **Reading Clubs (نوادي القراءة):** Readers can create and join reading clubs for any published project. Clubs have configurable reading pace (daily/weekly/biweekly), chapter-by-chapter unlocking managed by the admin, per-chapter threaded discussions, member list with author profile links, and notifications on new member joins and chapter advances. Private clubs restrict access to members only. Club creation form on shared project page, club detail page at `/clubs/:id`, and "My Reading Clubs" dashboard strip on home page. Data stored in `reading_clubs` and `reading_club_members` tables, with `project_comments` extended with `clubId`/`chapterIndex` columns.
-   **Author Writing Courses (مدرسة الكتابة):** Verified authors can create and sell writing courses with lessons, exercises, and progress tracking. Features: course gallery at `/courses`, course editor at `/courses/new` and `/courses/:id/edit`, course detail/reader at `/courses/:id`, Stripe checkout for paid courses (20% platform commission), free course enrollment, lesson completion tracking with exercise responses, per-course and per-lesson progress bars, author course analytics in `/analytics` dashboard ("دوراتي التعليمية" section showing total courses, enrollments, and revenue). Data stored in `writing_courses`, `course_lessons`, `course_enrollments`, and `lesson_completions` tables. Draft courses hidden from public. Lesson IDOR protection ensures lessons belong to their parent course.
-   **Bug Fixes:** Fixed MonthlyReport flooding by using a 24-hour check interval and fixed author profile visibility in `getPublicAuthor()`.

## External Dependencies
-   **OpenAI GPT-5.2**: AI content generation, analysis, and assistance.
-   **PostgreSQL**: Primary database.
-   **Stripe**: Payment processing and subscriptions.
-   **DALL-E**: Generating cover images and AI profile avatars.
-   **Nodemailer/SMTP**: Email notifications.
-   **pdfkit**: Server-side PDF generation.
-   **archiver**: EPUB file generation.
-   **docx (npm package)**: DOCX document generation.
-   **FFmpeg**: Video composition for Reels.
-   **Training Webhook System**: Sends AI interaction data to an external training server.
-   **XTTS v2 (Coqui TTS)**: Arabic voice cloning TTS via Python/FastAPI microservice on port 8000. Admin uploads WAV voice sample; authenticated users can listen to essays/chapters with cloned voice. Express proxy routes forward requests to the Python server.
