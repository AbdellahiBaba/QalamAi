import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, lazy, Suspense } from "react";
import TrackingPixels from "@/components/tracking-pixels";
import { ErrorBoundary } from "@/components/error-boundary";

const Landing = lazy(() => import("@/pages/landing"));
const Home = lazy(() => import("@/pages/home"));
const NewProject = lazy(() => import("@/pages/new-project"));
const NewEssay = lazy(() => import("@/pages/new-essay"));
const NewScenario = lazy(() => import("@/pages/new-scenario"));
const NewShortStory = lazy(() => import("@/pages/new-short-story"));
const NewKhawater = lazy(() => import("@/pages/new-khawater"));
const NewSocialMedia = lazy(() => import("@/pages/new-social-media"));
const NewReels = lazy(() => import("@/pages/new-reels"));
const NewMemoire = lazy(() => import("@/pages/new-memoire"));
const ProjectDetail = lazy(() => import("@/pages/project-detail"));
const Profile = lazy(() => import("@/pages/profile"));
const About = lazy(() => import("@/pages/about"));
const Features = lazy(() => import("@/pages/features"));
const Pricing = lazy(() => import("@/pages/pricing"));
const Contact = lazy(() => import("@/pages/contact"));
const AbuHashim = lazy(() => import("@/pages/abu-hashim"));
const NovelTheme = lazy(() => import("@/pages/novel-theme"));
const Tickets = lazy(() => import("@/pages/tickets"));
const TicketDetail = lazy(() => import("@/pages/ticket-detail"));
const Admin = lazy(() => import("@/pages/admin"));
const AdminTicket = lazy(() => import("@/pages/admin-ticket"));
const Login = lazy(() => import("@/pages/login"));
const Register = lazy(() => import("@/pages/register"));
const SharedProject = lazy(() => import("@/pages/shared-project"));
const AuthorProfile = lazy(() => import("@/pages/author-profile"));
const Gallery = lazy(() => import("@/pages/gallery"));
const Reader = lazy(() => import("@/pages/reader"));
const Reviews = lazy(() => import("@/pages/reviews"));
const Promo = lazy(() => import("@/pages/promo"));
const EssaysNews = lazy(() => import("@/pages/essays-news"));
const EssayPublic = lazy(() => import("@/pages/essay-public"));
const MemoireGallery = lazy(() => import("@/pages/memoire-gallery"));
const ForgotPassword = lazy(() => import("@/pages/forgot-password"));
const ResetPassword = lazy(() => import("@/pages/reset-password"));
const Privacy = lazy(() => import("@/pages/privacy"));
const Terms = lazy(() => import("@/pages/terms"));
const Refund = lazy(() => import("@/pages/refund"));
const NotFound = lazy(() => import("@/pages/not-found"));
const Leaderboard = lazy(() => import("@/pages/leaderboard"));
const MyLists = lazy(() => import("@/pages/my-lists"));
const CollectionPublic = lazy(() => import("@/pages/collection-public"));
const ApplyVerified = lazy(() => import("@/pages/apply-verified"));
const ContentSeries = lazy(() => import("@/pages/content-series"));
const SeriesDetail = lazy(() => import("@/pages/series-detail"));
const AdminMarketing = lazy(() => import("@/pages/admin-marketing"));
const SocialMarketing = lazy(() => import("@/pages/social-marketing"));

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center mx-auto animate-pulse">
          <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </div>
        <p className="text-muted-foreground font-serif">جاري التحميل...</p>
      </div>
    </div>
  );
}

function AuthenticatedRouter() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/project/new" component={NewProject} />
        <Route path="/project/new/essay" component={NewEssay} />
        <Route path="/project/new/scenario" component={NewScenario} />
        <Route path="/project/new/short-story" component={NewShortStory} />
        <Route path="/project/new/khawater" component={NewKhawater} />
        <Route path="/project/new/social-media" component={NewSocialMedia} />
        <Route path="/project/new/reels" component={NewReels} />
        <Route path="/project/new/memoire" component={NewMemoire} />
        <Route path="/project/:id/read/:chapterId" component={Reader} />
        <Route path="/project/:id" component={ProjectDetail} />
        <Route path="/profile" component={Profile} />
        <Route path="/tickets" component={Tickets} />
        <Route path="/tickets/:id" component={TicketDetail} />
        <Route path="/admin" component={Admin} />
        <Route path="/admin/tickets/:id" component={AdminTicket} />
        <Route path="/about" component={About} />
        <Route path="/features" component={Features} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/contact" component={Contact} />
        <Route path="/abu-hashim" component={AbuHashim} />
        <Route path="/novel-theme" component={NovelTheme} />
        <Route path="/shared/:token" component={SharedProject} />
        <Route path="/author/:id" component={AuthorProfile} />
        <Route path="/gallery" component={Gallery} />
        <Route path="/reviews" component={Reviews} />
        <Route path="/promo" component={Promo} />
        <Route path="/essays" component={EssaysNews} />
        <Route path="/essay/:shareToken" component={EssayPublic} />
        <Route path="/memoires" component={MemoireGallery} />
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/my-lists" component={MyLists} />
        <Route path="/list/:slug" component={CollectionPublic} />
        <Route path="/apply-verified" component={ApplyVerified} />
        <Route path="/series" component={ContentSeries} />
        <Route path="/series/:id" component={SeriesDetail} />
        <Route path="/admin/marketing" component={AdminMarketing} />
        <Route path="/social-marketing" component={SocialMarketing} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/refund" component={Refund} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function PublicRouter() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password/:token" component={ResetPassword} />
        <Route path="/about" component={About} />
        <Route path="/features" component={Features} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/contact" component={Contact} />
        <Route path="/abu-hashim" component={AbuHashim} />
        <Route path="/novel-theme" component={NovelTheme} />
        <Route path="/shared/:token" component={SharedProject} />
        <Route path="/author/:id" component={AuthorProfile} />
        <Route path="/gallery" component={Gallery} />
        <Route path="/reviews" component={Reviews} />
        <Route path="/promo" component={Promo} />
        <Route path="/essays" component={EssaysNews} />
        <Route path="/essay/:shareToken" component={EssayPublic} />
        <Route path="/memoires" component={MemoireGallery} />
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/list/:slug" component={CollectionPublic} />
        <Route path="/apply-verified" component={ApplyVerified} />
        <Route path="/series" component={ContentSeries} />
        <Route path="/series/:id" component={SeriesDetail} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/refund" component={Refund} />
        <Route component={Landing} />
      </Switch>
    </Suspense>
  );
}

function AppRouter() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      const returnTo = localStorage.getItem("returnTo");
      if (returnTo) {
        localStorage.removeItem("returnTo");
        if (returnTo.startsWith("/") && !returnTo.includes("//")) {
          setLocation(returnTo);
        }
      }
    }
  }, [user, setLocation]);

  useEffect(() => {
    if (user && (user as any).plan === "trial" && (user as any).trialActive) {
      const checkKey = `trial_check_${(user as any).id}`;
      const lastCheck = sessionStorage.getItem(checkKey);
      if (lastCheck && Date.now() - parseInt(lastCheck) < 30000) return;
      sessionStorage.setItem(checkKey, String(Date.now()));
      
      const abortController = new AbortController();
      
      const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
      const csrfVal = csrfMatch ? decodeURIComponent(csrfMatch[1]) : "";
      fetch("/api/trial/check-expiry", { method: "POST", credentials: "include", signal: abortController.signal, headers: { "X-CSRF-Token": csrfVal } })
        .then(res => res.json())
        .then(data => {
          if (!data.trialActive) {
            queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
            queryClient.invalidateQueries({ queryKey: ["/api/user/plan"] });
            queryClient.invalidateQueries({ queryKey: ["/api/trial/status"] });
          }
        })
        .catch((e: unknown) => {
          if (e instanceof Error && e.name !== "AbortError") {
            console.warn("Failed to check trial expiry:", e);
          }
        });
      
      return () => abortController.abort();
    }
  }, [user]);

  if (isLoading) {
    return <LoadingFallback />;
  }

  if (!user) {
    return <PublicRouter />;
  }

  return <AuthenticatedRouter />;
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <TrackingPixels />
          <ErrorBoundary>
            <AppRouter />
          </ErrorBoundary>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
