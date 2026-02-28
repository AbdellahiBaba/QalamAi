# QalamAI — Arabic Writing Platform

## Overview
QalamAI is an AI-powered Arabic writing platform featuring the virtual literary agent "Abu Hashim." It aims to transform ideas into narratives by supporting six core content types: Novel Writing, Professional Essay/News Writing, Drama/Film Scenario Writing, Short Story (القصة القصيرة), Khawater/Reflections (خواطر وتأملات), and Social Media Content (محتوى السوشيال ميديا). The platform seeks to become the premier tool for Arabic content creation, leveraging AI to assist authors, journalists, and screenwriters in bringing their visions to life.

## User Preferences
Not specified.

## System Architecture
QalamAI is built as a React Single Page Application (SPA) utilizing Tailwind CSS and Shadcn UI for a modern, responsive user experience. The backend is powered by Express.js with a PostgreSQL database. AI capabilities are integrated through OpenAI GPT-5.2 via Replit AI Integrations, embodying the specialized "Abu Hashim" agent persona across three distinct modes. Authentication supports both traditional email/password and Replit Auth (OpenID Connect). Stripe is integrated for payment processing.

The platform's brand identity uses a palette of gold, deep blue, warm sand, and off-white, complemented by Arabic-rooted fonts like Cairo and Amiri, conveying an elegant and trustworthy voice. All pages are fully mobile-responsive.

**Core Features include:**
- Multi-type project creation with dedicated workflows for Novel, Essay, Scenario, Short Story, Khawater, and Social Media content.
- AI-driven outline generation and sequential content generation (chapters, sections, scenes) with streaming output.
- Specialized AI knowledge bases for each content type, drawing from renowned Arab literary figures.
- Advanced authoring tools such as inline editing, chapter version history, and a "Rewrite This Section" feature with tone selection.
- AI-powered content enhancements: title suggestions, character suggestions, cover image generation (DALL-E with Arabic title calligraphy), originality/plagiarism checks, and glossary auto-generation.
- Robust export capabilities: server-side PDF generation (with Amiri Arabic font support for RTL) and EPUB export.
- User management includes profiles, public author profiles, and an onboarding wizard.
- Engagement features: in-app notification center, reading progress tracking, chapter bookmarks, and project favorites.
- Writing statistics dashboard: showing daily writing activity, per-project word breakdown, and completion rates.
- Community and sharing: project sharing via public read-only links and a public gallery.
- Administrative tools: comprehensive admin panel for user, content, and revenue management. Includes an "API Usage" tab tracking per-user OpenAI API calls, token counts, and estimated costs in microdollars. Admins can suspend/unsuspend users from making AI calls.
- **API Usage Tracking**: All OpenAI API calls are instrumented via `server/api-usage.ts` logging to `apiUsageLogs` table. Cost is stored in microdollars (integer). Users can be suspended via `apiSuspended` boolean on users table — suspended users get 403 on all AI routes.
- Enhanced onboarding wizard: 4-step guided dialog with animated Abu Hashim avatar, project type descriptions, expanded feature tour, and actionable writing tips.
- **Content Type Specifics**: Each content type has tailored AI personas, generation parameters, and specific fields. For example, Novel Writing includes narrative technique selection and comprehensive cultural awareness. Essay/News Writing offers multi-subject expertise and tone selection. Scenario/Screenplay Writing supports various genres and proper screenplay formatting. Short Story and Khawater/Reflections have specific length, style, and mood options, with AI personas trained on relevant literary masters. Social Media Content generates platform-appropriate Arabic content with hashtags and CTAs.
- **Analysis Tools**: Continuity Fix and Literary Style Analysis provide AI-driven improvements. Continuity Fix detects and allows fixing issues section by section or all at once. Literary Style Analysis provides comprehensive feedback on 7 dimensions of writing style, offering actionable improvement suggestions with "Fix by Abu Hashim" options for individual or all suggestions. These features have paid usage limits per project after initial free uses.
- **Arabic Display Standards**: Chapter/section numbers are displayed as Arabic ordinal words. All numeric values displayed alongside Arabic text are wrapped with an LTR component to prevent BiDi reordering.

## External Dependencies
- **OpenAI GPT-5.2**: Integrated via Replit AI for AI-powered content generation and persona management.
- **PostgreSQL**: Primary database for all application data.
- **Stripe**: Payment gateway for plan purchases and per-project payments.
- **DALL-E 3**: Used for AI-generated cover images.
- **Nodemailer/SMTP**: For sending email notifications.
- **pdfkit**: Library used for server-side PDF generation with Amiri Arabic font.
- **jsPDF**: Client-side library for PDF preview/download.
- **archiver**: Used for EPUB generation.