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
- Free Trial System: 24-hour free trial with Stripe Setup Intent and auto-charge.
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
- Abu Hashim Chat Component: Reusable `abu-hashim-chat.tsx` component used in both home and project-detail pages. In "general" mode (dashboard), the chat trigger is a prominent branded tab on the left edge with "أبو هاشم" label. In "project" mode, it's a floating button at bottom-left.
- Shared Project Navigation: Back button and QalamAI branding in a sticky nav bar at the top of shared-project.tsx.
- Essay Author Details: Essay cards on /essays show clickable author names (navigates to /author/:id) and star ratings matching the gallery style.
- Reading Time Estimates: Calculated at ~200 wpm for Arabic, shown on essay cards and shared project pages.
- Related Essays: "مقالات ذات صلة" section at bottom of shared essays showing up to 3 related essays by subject.
- Admin Social Media Links: Admin can manage platform social media profile links (LinkedIn, TikTok, X, Instagram, Facebook, YouTube, Snapchat, Telegram, WhatsApp) with enable/disable toggle and display order. Uses `socialMediaLinks` table. Reusable `SocialMediaIcons` component renders enabled links in all public page footers and the contact page.
- Navigation Structure: All marketing pages (landing, about, features, pricing, contact, abu-hashim, essays-news) define `navLinks` for header navbar + footer and `footerOnlyLinks` for footer-only links (currently: Reviews). Novel-theme.tsx uses hardcoded links but includes all standard links. The "المقالات" (Essays) and "المعرض" (Gallery) links appear in both header and footer. "آراء المستخدمين" (Reviews) appears only in footers.
- Unshare Cleanup: When a user unshares a project (DELETE /api/projects/:id/share), it also resets publishedToGallery and publishedToNews to false.
- Shared Project Z-Index: Progress bar (z-50, fixed top-0), nav bar (z-30, sticky top-0), chapter tracker (z-40, fixed top-[60px]).

## External Dependencies
- **OpenAI GPT-5.2**: Integrated via Replit AI for AI-powered content generation.
- **PostgreSQL**: Primary database.
- **Stripe**: Payment gateway.
- **DALL-E 3**: Used for AI-generated cover images.
- **Nodemailer/SMTP**: For email notifications.
- **pdfkit**: Server-side PDF generation.
- **jsPDF**: Client-side PDF preview/download.
- **archiver**: Used for EPUB generation.
- **docx (npm package)**: Used for DOCX export.