# QalamAI — Arabic Writing Platform

## Overview
QalamAI is an AI-powered Arabic writing platform featuring the virtual literary agent "Abu Hashim." It aims to transform ideas into narratives by supporting seven core content types: Novel Writing, Professional Essay/News Writing, Drama/Film Scenario Writing, Short Story, Khawater/Reflections, Social Media Content, and Arabic Classical Poetry. The platform seeks to become the premier tool for Arabic content creation, leveraging AI to assist authors, journalists, and screenwriters in bringing their visions to life, with a strong focus on preserving and enhancing Arabic literary traditions.

## User Preferences
Not specified.

## System Architecture
QalamAI is built as a React Single Page Application (SPA) using Tailwind CSS and Shadcn UI for a modern, responsive interface. The backend is an Express.js application interacting with a PostgreSQL database. AI capabilities are deeply integrated through OpenAI GPT-5.2, embodying the specialized "Abu Hashim" agent persona which operates across distinct modes tailored for different content types. Authentication supports traditional email/password and Replit Auth (OpenID Connect). Payment processing is handled via Stripe.

The platform's brand identity uses a palette of gold, deep blue, warm sand, and off-white, complemented by Arabic-rooted fonts like Cairo and Amiri, conveying an elegant and trustworthy voice. All pages are fully mobile-responsive.

**Key Architectural Decisions and Features:**
- **AI-Driven Content Generation:** Multi-type project creation with dedicated workflows, AI-driven outline generation, sequential content generation with streaming output, and specialized AI knowledge bases drawing from renowned Arab literary figures.
- **Advanced Authoring Tools:** Inline editing, chapter version history, "Rewrite This Section" with tone selection, title/character suggestions, full project blueprints, and originality/plagiarism checks.
- **Content Type Specialization:** Each content type (including the advanced Arabic Classical Poetry module with a full prosody engine for 15 meters, rhyme vowel selection (حركة الروي), ردف support, and معارضة/poetic emulation mode) has tailored AI personas, generation parameters, and specific input fields.
- **Export and Publishing:** Robust export capabilities include server-side PDF generation (with Amiri Arabic font support for RTL), EPUB, and DOCX. Authors can publish projects to a public gallery or essays to a dedicated news page, with options for social sharing and reader reactions.
- **User Management & Engagement:** User profiles, public author profiles, onboarding, in-app notifications, reading progress tracking, writing statistics dashboard, and a free trial system with automated Stripe billing.
- **Literary Analysis and Enhancements:** AI-powered Continuity Fix and Literary Style Analysis provide actionable suggestions. Enhanced proofreading prompts for all content types include detailed Arabic grammar, morphology, and spelling checklists.
- **UI/UX and Accessibility:** Arabic display standards (ordinal words for chapters, BiDi reordering for numbers), dark mode, keyboard shortcuts, focus/zen writing mode, chapter drag-and-drop, and SEO optimization.
- **Content Reporting System:** Public users can report published content (gallery, essays, shared projects) with categorized reasons (inappropriate, plagiarism, offensive, spam, other). Reports are rate-limited (3/IP/hour). Admin reports tab with status filters (pending/reviewed/dismissed/action_taken), per-report admin notes, and action buttons (dismiss, warn, unpublish, ban). Backend enforces actions (unpublish removes from gallery/news, ban suspends user).
- **Free Plan Monthly Taste:** Free-plan users get 1 project creation and 2 chapter generations per month. Auto-resets monthly. Dashboard shows usage progress bars with upgrade CTA. Upgrade dialog appears when limits are exceeded on project creation or chapter generation pages. Constants: `FREE_MONTHLY_PROJECTS=1`, `FREE_MONTHLY_GENERATIONS=2`.
- **Admin Tools:** Comprehensive admin panel for user, content, revenue management, API usage tracking, platform review moderation, content report management, and a robust feature toggle system for managing platform features.
- **AI Profile Avatar:** Users can generate an AI profile image in various styles using DALL-E.
- **Abu Hashim Chat:** Contextual AI chat available in general and project-specific modes for literary advice and brainstorming.

## External Dependencies
- **OpenAI GPT-5.2**: For all AI-powered content generation, analysis, and assistance.
- **PostgreSQL**: The primary relational database for all application data.
- **Stripe**: For processing payments and managing subscriptions.
- **DALL-E (gpt-image-1)**: Used for generating cover images and AI profile avatars.
- **Nodemailer/SMTP**: For sending email notifications (e.g., password resets, trial status).
- **pdfkit**: Server-side library for generating PDF documents.
- **jsPDF**: Client-side library for PDF preview and download functionalities.
- **archiver**: Used for generating EPUB files.
- **docx (npm package)**: For generating DOCX format documents with professional formatting.

## UX Polish Features
- **SharedNavbar Active Route**: Uses `useLocation()` from wouter to highlight the active navigation link in both desktop and mobile menus (text-foreground + font-semibold + border indicator).
- **Registration Form**: Password strength indicator (weak/medium/strong with colored bar), show/hide toggle on confirm password field, maxLength on name fields, email trimming before submission.
- **Profile Unsaved Changes Guard**: Tracks form dirty state via initialValuesRef, shows AlertDialog on navigation attempts with unsaved changes, beforeunload handler for tab close/refresh, bio character counter (500 max).
- **Ticket System**: Users can mark their own tickets as resolved via PATCH `/api/tickets/:id/resolve`. Status filter badges on tickets list page. Auto-scroll to latest reply in ticket detail. Resolved/closed tickets show a notice and disable reply form.
- **Password Reset**: Auto-redirect to login with 3-second countdown after successful reset. Real-time password match indicator. Improved error messages for expired/invalid tokens with inline guidance.
- **Skeleton Loading**: Essays and gallery pages use card-shaped skeleton loaders matching actual card layout (image area + text lines + metadata).