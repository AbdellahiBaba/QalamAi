# QalamAI — Arabic Writing Platform

## Overview
QalamAI is an AI-powered Arabic writing platform designed to assist authors, journalists, screenwriters, and students in creating diverse Arabic content. It features a virtual literary agent, "Abu Hashim," and supports eight core content types: Novel Writing, Professional Essay/News Writing, Drama/Film Scenario Writing, Short Story, Khawater/Reflections, Social Media Content, Arabic Classical Poetry, and Academic Graduation Memoire. The platform aims to be the leading tool for Arabic content creation, preserving and enhancing Arabic literary traditions through AI.

## User Preferences
Not specified.

## System Architecture
QalamAI is a React-based Single Page Application (SPA) utilizing Tailwind CSS and Shadcn UI for its frontend. The backend is an Express.js application connected to a PostgreSQL database. AI functionalities are integrated via OpenAI GPT-5.2, embodied by the "Abu Hashim" agent, which adapts its persona and knowledge base for different content types. Authentication supports email/password and Replit Auth, with Stripe handling payments. The platform's UI/UX emphasizes elegance and trustworthiness through a color palette of gold, deep blue, warm sand, and off-white, and uses Arabic-rooted fonts like Cairo and Amiri. All interfaces are mobile-responsive.

**Key Architectural Decisions and Features:**
-   **AI-Driven Content Generation:** Provides multi-type project creation with dedicated workflows, AI-driven outline and sequential content generation, and specialized AI knowledge bases. Includes advanced modules for Arabic Classical Poetry (prosody engine) and Academic Memoire (specialization by major/country, dynamic faculty-aware filtering).
-   **Advanced Authoring Tools:** Features inline editing, chapter version history, AI-powered rewriting with tone selection, title/character suggestions, project blueprints, and originality/plagiarism checks.
-   **Content Type Specialization:** Each content type is tailored with specific AI personas and input fields, including a Reels generator that creates MP4 videos from scripts.
-   **Export and Publishing:** Supports server-side export to PDF, EPUB, and DOCX with specialized handling for Arabic text. Memoire projects include publisher-quality academic PDF export. Users can publish projects to a public gallery or essays to a news page.
-   **User Management & Engagement:** Includes user profiles, public author profiles, onboarding, notifications, reading progress, writing statistics, and a free trial system.
-   **Literary Analysis and Enhancements:** AI-powered continuity checks, literary style analysis, and enhanced proofreading for Arabic grammar and morphology.
-   **UI/UX and Accessibility:** Adheres to Arabic display standards (RTL, BiDi), includes dark mode, keyboard shortcuts, focus mode, drag-and-drop chapter management, and SEO optimization.
-   **Admin Tools:** A comprehensive admin panel for managing users, content moderation, reports, API usage, analytics, and promo codes. Includes bulk content moderation, user impersonation, and AI daily prompt auto-generation.
-   **Abu Hashim Self-Learning System:** A RAG-based intelligence engine that extracts and injects curated knowledge into AI prompts.
-   **AI Profile Avatar & Chat:** Users can generate AI profile images and interact with a contextual AI chat, "Abu Hashim," for literary advice.
-   **Progressive Web App (PWA):** Installable on mobile/desktop with caching for Google Fonts, API responses, and static assets.
-   **Security Hardening:** Implemented Helmet for security headers, whitelist-based CORS, Double-submit cookie CSRF protection, server-side HTML sanitization, strong password policies, account lockout, and secure Stripe webhook validation.
-   **Monetization Expansions:**
    -   **Chapter Paywall:** Authors can set individual chapters as paid, requiring readers to unlock them via Stripe Checkout.
    -   **Gift Subscriptions:** Allows purchasing gift subscriptions for various plans.
    -   **Reading Rewards (Points):** Users earn points for activities, redeemable for discounts.
-   **Notifications & Author Newsletter:** Features an in-app notification system and allows authors to send newsletters to their email subscribers. Includes an enhanced weekly digest with personalized content.
-   **Community Features:**
    -   **Project Tags:** Supports tag-based filtering for projects.
    -   **Writing Challenges:** Admin-created challenges with user entry and winner selection.
    -   **Beta Readers:** Authors can indicate if they are seeking beta readers, with an opt-in request system.
    -   **Related Works:** Displays up to 6 related projects based on type, genre, and tags.
-   **Social Marketing AI:** Paid users can access a social marketing advisor. Includes a Super Admin-only Social Media Manager Hub for generating, scheduling, and analyzing social media posts with DALL-E images.

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