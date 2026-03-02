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
- User management includes profiles, public author profiles, profile image upload (base64, max 2MB, PNG/JPEG/WebP), and an onboarding wizard.
- Engagement features: in-app notification center, reading progress tracking, chapter bookmarks, and project favorites.
- Writing statistics dashboard: showing daily writing activity, per-project word breakdown, and completion rates.
- Community and sharing: project sharing via public read-only links and a public gallery.
- Administrative tools: comprehensive admin panel for user, content, and revenue management. Includes an "API Usage" tab tracking per-user OpenAI API calls, token counts, and estimated costs in microdollars. Admins can suspend/unsuspend users from making AI calls.
- **API Usage Tracking**: All OpenAI API calls are instrumented via `server/api-usage.ts` logging to `apiUsageLogs` table. Cost is stored in microdollars (integer). Users can be suspended via `apiSuspended` boolean on users table — suspended users get 403 on all AI routes.
- **Author Rating System**: Public visitors can rate authors 1-5 stars (one rating per visitor IP per author, IP hashed for privacy). Ratings stored in `authorRatings` table with unique constraint on (authorId, visitorIp). Average rating displayed on author profiles and gallery cards. Gallery sorted by highest-rated authors first. Rating persisted in localStorage for return visitors.
- **Platform Reviews System**: Authenticated users can submit text reviews with star ratings about the platform. Reviews require admin approval before being published. Stored in `platformReviews` table. Public reviews page at `/reviews`. Admin moderation via "المراجعات" tab in admin panel with approve/delete controls.
- **Tracking Pixels (TikTok & Facebook)**: Admin-managed pixel tracking via "بكسل التتبع" tab in admin panel. Supports TikTok Pixel + Events API and Facebook Pixel + Conversions API. TikTok pixel base code is embedded directly in `client/index.html` for crawler detection. Browser-side custom events via `client/src/lib/ttq.ts` helper (`ttqTrack`, `ttqIdentify`): CompleteRegistration (login/register), ViewContent (project-detail, shared-project), AddToCart + InitiateCheckout + AddPaymentInfo (pricing checkout), Purchase + PlaceAnOrder (payment verified). User PII (email, id) hashed with SHA-256 client-side via `ttq.identify()`. Server-side tracking fires Purchase and InitiateCheckout events via `server/tracking.ts`. Access tokens never exposed to frontend — admin UI shows `hasAccessToken` indicator. Pixel config in `trackingPixels` table. Public API at `GET /api/tracking-pixels` returns only platform + pixelId. Pixel cache 60s TTL, invalidated on admin save.
- **Promotional Landing Page**: Cinematic marketing page at `/promo` with scroll animations, brand-aligned visuals (gold/navy palette), 6 sections (hero, interface showcase, capabilities grid, cinematic quotes, export tools, CTA), Intersection Observer-driven animations, responsive RTL layout. CSS animations scoped with `promo-` prefix in index.css.
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

## Free Trial System
- **24-hour free trial** with Stripe Setup Intent + auto-charge. Trial constants in `shared/schema.ts`.
- Users must provide a credit card via Stripe Elements before trial activates.
- Trial plan = `"trial"`, limits: 1 project, 3 chapters, 1 cover, 1 continuity check, 1 style analysis; no export.
- After 24h, auto-charges $500 for `all_in_one` plan via `stripe.paymentIntents.create` with `off_session`.
- Trial fields on users table: `trialActive`, `trialStartedAt`, `trialEndsAt`, `trialUsed`, `trialStripeSetupIntentId`, `trialStripePaymentMethodId`.
- Routes: `POST /api/trial/create-setup-intent`, `POST /api/trial/activate`, `POST /api/trial/check-expiry`, `GET /api/trial/status`.
- Dashboard shows countdown banner for active trial users. App.tsx auto-checks expiry on load.
- Pricing page shows trial card with card capture dialog for eligible users.
- **Dashboard trial prompt popup** (`client/src/components/trial-prompt-popup.tsx`): shows after 3s for authenticated free-plan users who haven't used trial. Includes inline Stripe card capture flow. Uses `sessionStorage` key `qalamai_trial_prompt_dismissed` (shows once per session, reappears next visit if user hasn't started trial). Rendered in `home.tsx`.

## Admin Grant Analysis Uses
- Admin can grant extra continuity check and style analysis uses to users via `POST /api/admin/users/:id/grant-analysis`.
- UI in admin panel: "منح تحليل" button on each user row, dialog with project selector + number inputs.
- Storage methods: `grantAnalysisUses()`, `grantAnalysisUsesForAllProjects()`.

## Marketing Popup
- `client/src/components/marketing-popup.tsx`: animated popup for first-time visitors on landing page.
- Checks `localStorage.getItem("qalamai_visited")`, shows after 3s delay, tracks with TikTok ViewContent event.
- CSS animations scoped with `marketing-` prefix in `client/src/index.css`.

## SEO & Performance
- **Dynamic Page Titles**: Each page uses `useDocumentTitle` hook (`client/src/hooks/use-document-title.ts`) to set unique Arabic `<title>` and OG meta tags.
- **Sitemap**: `GET /sitemap.xml` route in `server/routes.ts` generates XML sitemap with all public pages pointing to `qalamai.net`.
- **robots.txt**: Static file in `client/public/robots.txt` allows all crawlers, blocks admin/profile/project paths, points to sitemap.
- **Code Splitting**: All 25+ pages in `client/src/App.tsx` are lazily loaded via `React.lazy()` + `<Suspense>` with Arabic loading fallback.
- **Error Boundary**: `client/src/components/error-boundary.tsx` wraps the app router, showing Arabic recovery screen on runtime errors.
- **Lazy Images**: All `<img>` tags in gallery, author-profile, shared-project, and project-detail pages have `loading="lazy"` attribute.