import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Feather, LogOut, TicketCheck, ArrowRight, Clock, MessageCircle, Plus } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import type { SupportTicket } from "@shared/schema";

const statusLabels: Record<string, string> = {
  open: "مفتوح",
  in_progress: "قيد المعالجة",
  resolved: "تم الحل",
  closed: "مغلق",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  in_progress: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  closed: "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400",
};

export default function Tickets() {
  useDocumentTitle("تذاكر الدعم — قلم AI");
  const { user, logout } = useAuth();
  const { data: tickets, isLoading } = useQuery<SupportTicket[]>({
    queryKey: ["/api/tickets"],
  });

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <div className="flex items-center gap-3 cursor-pointer">
                <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
                  <Feather className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-serif text-xl font-bold">QalamAI</span>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="link-dashboard">
                <ArrowRight className="w-4 h-4 ml-1" />
                المشاريع
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback className="text-xs">
                  {user?.firstName?.[0] || user?.email?.[0] || "م"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:inline" data-testid="text-username">
                {user?.firstName || user?.email || "مستخدم"}
              </span>
            </div>
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => logout()} data-testid="button-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="font-serif text-3xl font-bold mb-2" data-testid="text-tickets-title">
              تذاكر الدعم
            </h1>
            <p className="text-muted-foreground">تابع حالة طلبات الدعم الخاصة بك</p>
          </div>
          <Link href="/contact">
            <Button data-testid="button-new-ticket">
              <Plus className="w-4 h-4 ml-2" />
              تذكرة جديدة
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6 space-y-3">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : tickets && tickets.length > 0 ? (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <Link key={ticket.id} href={`/tickets/${ticket.id}`}>
                <Card className="cursor-pointer hover-elevate" data-testid={`card-ticket-${ticket.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground" data-testid={`text-ticket-id-${ticket.id}`}>
                            #تذكرة-{ticket.id}
                          </span>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full ${statusColors[ticket.status] || statusColors.open}`} data-testid={`badge-status-${ticket.id}`}>
                            {statusLabels[ticket.status] || ticket.status}
                          </span>
                        </div>
                        <h3 className="font-semibold text-lg" data-testid={`text-ticket-subject-${ticket.id}`}>
                          {ticket.subject}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {ticket.message}
                        </p>
                      </div>
                      <div className="text-left text-xs text-muted-foreground space-y-1 shrink-0">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(ticket.createdAt).toLocaleDateString("ar-EG")}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <TicketCheck className="w-10 h-10 text-primary" />
            </div>
            <h2 className="font-serif text-2xl font-semibold mb-3">لا توجد تذاكر دعم</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              لم تقم بإرسال أي تذكرة دعم بعد. إذا كنت بحاجة إلى مساعدة، تواصل معنا.
            </p>
            <Link href="/contact">
              <Button size="lg" data-testid="button-empty-new-ticket">
                <MessageCircle className="w-4 h-4 ml-2" />
                تواصل معنا
              </Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
