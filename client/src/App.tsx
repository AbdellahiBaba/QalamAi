import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import NewProject from "@/pages/new-project";
import NewEssay from "@/pages/new-essay";
import NewScenario from "@/pages/new-scenario";
import NewShortStory from "@/pages/new-short-story";
import ProjectDetail from "@/pages/project-detail";
import Profile from "@/pages/profile";
import About from "@/pages/about";
import Features from "@/pages/features";
import Pricing from "@/pages/pricing";
import Contact from "@/pages/contact";
import AbuHashim from "@/pages/abu-hashim";
import NovelTheme from "@/pages/novel-theme";
import Tickets from "@/pages/tickets";
import TicketDetail from "@/pages/ticket-detail";
import Admin from "@/pages/admin";
import AdminTicket from "@/pages/admin-ticket";
import Login from "@/pages/login";
import Register from "@/pages/register";
import SharedProject from "@/pages/shared-project";
import AuthorProfile from "@/pages/author-profile";
import Gallery from "@/pages/gallery";
import Reader from "@/pages/reader";
import NotFound from "@/pages/not-found";

function AuthenticatedRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/project/new" component={NewProject} />
      <Route path="/project/new/essay" component={NewEssay} />
      <Route path="/project/new/scenario" component={NewScenario} />
      <Route path="/project/new/short-story" component={NewShortStory} />
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
      <Route component={NotFound} />
    </Switch>
  );
}

function PublicRouter() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/about" component={About} />
      <Route path="/features" component={Features} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/contact" component={Contact} />
      <Route path="/abu-hashim" component={AbuHashim} />
      <Route path="/novel-theme" component={NovelTheme} />
      <Route path="/shared/:token" component={SharedProject} />
      <Route path="/author/:id" component={AuthorProfile} />
      <Route path="/gallery" component={Gallery} />
      <Route component={Landing} />
    </Switch>
  );
}

function AppRouter() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
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
          <AppRouter />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
