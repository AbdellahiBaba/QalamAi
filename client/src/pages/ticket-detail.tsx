import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useRoute } from "wouter";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Feather, LogOut, ArrowRight, Send, Loader2, Clock, ShieldCheck, User } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SupportTicket, TicketReply } from "@shared/schema";

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

const priorityLabels: Record<string, string> = {
  low: "منخفض",
  normal: "عادي",
  high: "مرتفع",
  urgent: "عاجل",
};

type TicketWithReplies = SupportTicket & { replies: TicketReply[] };

export default function TicketDetail() {
  useDocumentTitle("تفاصيل التذكرة — قلم AI");
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, params] = useRoute("/tickets/:id");
  const ticketId = params?.id ? parseInt(params.id) : 0;
  const [replyMessage, setReplyMessage] = useState("");

  const { data: ticket, isLoading } = useQuery<TicketWithReplies>({
    queryKey: ["/api/tickets", ticketId],
    enabled: ticketId > 0,
  });

  const replyMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", `/api/tickets/${ticketId}/reply`, { message });
      return res.json();
    },
    onSuccess: () => {
      setReplyMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticketId] });
      toast({ title: "تم إرسال الرد بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في إرسال الرد", variant: "destructive" });
    },
  });

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;
    replyMutation.mutate(replyMessage.trim());
  };

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
            <Link href="/tickets">
              <Button variant="ghost" size="sm" data-testid="link-back-tickets">
                <ArrowRight className="w-4 h-4 ml-1" />
                تذاكر الدعم
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback className="text-xs">
                  {user?.firstName?.[0] || user?.email?.[0] || "م"}
                </AvatarFallback>
              </Avatar>
            </div>
            <Button variant="ghost" size="icon" onClick={() => logout()} data-testid="button-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : !ticket ? (
          <div className="text-center py-20">
            <h2 className="font-serif text-2xl font-semibold mb-3">التذكرة غير موجودة</h2>
            <Link href="/tickets">
              <Button variant="outline">العودة إلى التذاكر</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm text-muted-foreground" data-testid="text-ticket-id">#تذكرة-{ticket.id}</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full ${statusColors[ticket.status]}`} data-testid="badge-status">
                  {statusLabels[ticket.status]}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground" data-testid="badge-priority">
                  {priorityLabels[ticket.priority]}
                </span>
              </div>
              <h1 className="font-serif text-2xl font-bold" data-testid="text-ticket-subject">{ticket.subject}</h1>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                {new Date(ticket.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-sm">{ticket.name}</span>
                      <span className="text-xs text-muted-foreground">{ticket.email}</span>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" data-testid="text-ticket-message">{ticket.message}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {ticket.replies && ticket.replies.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-serif text-lg font-semibold">المحادثة</h3>
                {ticket.replies.map((reply) => (
                  <Card key={reply.id} className={reply.isAdmin ? "border-primary/30 bg-primary/5" : ""} data-testid={`card-reply-${reply.id}`}>
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${reply.isAdmin ? "bg-primary/20" : "bg-muted"}`}>
                          {reply.isAdmin ? <ShieldCheck className="w-4 h-4 text-primary" /> : <User className="w-4 h-4 text-muted-foreground" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-sm">
                              {reply.isAdmin ? "فريق الدعم" : ticket.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(reply.createdAt).toLocaleDateString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{reply.message}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {ticket.status !== "closed" && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-serif text-lg font-semibold mb-4">إضافة رد</h3>
                  <form onSubmit={handleReply} className="space-y-4">
                    <Textarea
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="اكتب ردك هنا..."
                      rows={4}
                      className="resize-none"
                      required
                      data-testid="input-reply"
                    />
                    <Button type="submit" disabled={replyMutation.isPending || !replyMessage.trim()} data-testid="button-send-reply">
                      {replyMutation.isPending ? (
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 ml-2" />
                      )}
                      {replyMutation.isPending ? "جاري الإرسال..." : "إرسال الرد"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
