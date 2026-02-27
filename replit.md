# QalamAI — Arabic Writing Platform

## Overview
QalamAI is an AI-powered Arabic writing platform featuring the virtual literary agent "Abu Hashim." It aims to transform ideas into narratives by supporting three core content types: Novel Writing, Professional Essay/News Writing, and Drama/Film Scenario Writing. The platform seeks to become the premier tool for Arabic content creation, leveraging AI to assist authors, journalists, and screenwriters in bringing their visions to life.

## User Preferences
Not specified.

## System Architecture
QalamAI is built as a React Single Page Application (SPA) with a strong emphasis on Arabic aesthetic and functionality, utilizing Tailwind CSS and Shadcn UI for a modern, responsive user experience. The backend is powered by Express.js with a PostgreSQL database. AI capabilities are integrated through OpenAI GPT-5.2 via Replit AI Integrations, embodying the specialized "Abu Hashim" agent persona across three distinct modes. Authentication supports both traditional email/password and Replit Auth (OpenID Connect). Stripe is integrated for payment processing, leveraging Replit's Stripe connector.

The platform's brand identity is defined by a palette of gold, deep blue, warm sand, and off-white, complemented by Arabic-rooted fonts like Cairo and Amiri, conveying an elegant and trustworthy voice.

**Core Features include:**
- Multi-type project creation (Novel, Essay, Scenario) with dedicated workflows.
- AI-driven outline generation and sequential content generation (chapters, sections, scenes) with streaming output.
- Specialized AI knowledge bases for each content type, drawing from renowned Arab literary figures.
- Advanced authoring tools such as inline editing, chapter version history, and a "Rewrite This Section" feature with tone selection.
- AI-powered content enhancements: title suggestions, character suggestions, cover image generation (DALL-E with Arabic title calligraphy, regeneratable), originality/plagiarism checks, and glossary auto-generation.
- Robust export capabilities: server-side PDF generation (with Amiri Arabic font support for RTL) and EPUB export.
- User management includes profiles, public author profiles, and an onboarding wizard.
- Engagement features: in-app notification center, reading progress tracking, and chapter bookmarks.
- Community and sharing: project sharing via public read-only links and a public gallery of shared works.
- Administrative tools: comprehensive admin panel for user, content, revenue, and promo code management.

**Content Type Specifications:**
- **Novel Writing**: Features multi-step creation (details, characters, relationships), auto-outlining, chapter-by-chapter generation with advanced narrative techniques, and specialized AI persona with memory of 12 Arab master novelists. Supports full novel regeneration after adding new characters (outline + all chapters recreated with confirmation dialog).
- **Essay/News Writing**: Offers multi-subject expertise, tone selection (11 styles: formal academic, analytical, investigative, editorial, conversational expert, narrative, persuasive, satirical, simplified scientific, literary, journalistic), structure generation, and SEO awareness. Project detail page shows essay-specific fields (subject, tone, target audience, section count) instead of novel fields.
- **Originality Check**: AI stylistic originality analysis (not plagiarism detection) evaluating uniqueness of expression, cliché avoidance, and stylistic fingerprint. Shows methodology explanation, flagged phrases with reasons, strengths, and improvement suggestions. Includes "Enhance" button to auto-rewrite chapter based on originality feedback (saves version for rollback).
- **Scenario/Screenplay Writing**: Supports various genres, film or series formats, 3-act dramatic structure, scene-by-scene writing, proper screenplay formatting, character voice differentiation, and dialect support. Project detail page shows scenario-specific fields (genre, format, episode count, scene count).

## External Dependencies
- **OpenAI GPT-5.2**: Integrated via Replit AI for AI-powered content generation and persona management.
- **PostgreSQL**: Primary database for all application data.
- **Stripe**: Payment gateway for plan purchases and per-project payments, integrated via Replit Stripe connector and `stripe-replit-sync`.
- **DALL-E 3**: Used for AI-generated cover images with type-aware prompts (novel/essay/scenario styles). Title overlay via node-canvas with Amiri font.
- **Nodemailer/SMTP**: For sending email notifications (project completion, plan activation, payment confirmation, ticket replies).
- **pdfkit**: Library used for server-side PDF generation with Amiri Arabic font. Type-aware chapter labels (الفصل/القسم/المشهد). Glossary section appended when available. Cover title not duplicated when image has baked-in overlay.
- **archiver**: Used for EPUB generation with type-aware labels and glossary support.

## Mobile Responsiveness
All pages are fully mobile-responsive using Tailwind CSS responsive breakpoints (sm:, md:, lg:):
- **Landing page**: Responsive hero text (text-2xl→4xl→5xl), stacked feature cards, full-width CTAs, hidden nav links on mobile with hamburger-style compact layout
- **Admin panel**: Scrollable tab bar with icon-only buttons on mobile, card-based ticket/user lists replacing tables on small screens, responsive search/filter controls
- **Pricing page**: Responsive title/section sizing, stacked plan cards, compact nav
- **Profile page**: Responsive header, stacked profile sections
- **Gallery page**: Single-column grid on mobile, full-width search
- **Project detail**: Responsive tabs and content layout
- **Author profile**: Already mobile-optimized
- **Home dashboard**: Responsive filters (full-width selects on mobile), stacked project cards