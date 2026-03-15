import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, X, Loader2, ArrowRight, MessageCircle, Plus, Trash2, History } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: number;
  title: string;
  mode: string;
  projectId: number | null;
  createdAt: string;
  updatedAt: string;
}

interface AbuHashimChatProps {
  mode: "general" | "project";
  projectId?: number | string;
  quickQuestions: string[];
}

export function AbuHashimChat({ mode, projectId, quickQuestions }: AbuHashimChatProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [autoRestored, setAutoRestored] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const [visible, setVisible] = useState(() => {
    try {
      const saved = localStorage.getItem("abu-hashim-visible");
      return saved === null ? true : saved === "true";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("abu-hashim-visible", String(visible));
    } catch (e) {
      console.warn("Failed to save chat visibility to localStorage:", e);
    }
  }, [visible]);

  const isGeneral = mode === "general";

  const convQueryKey = isGeneral
    ? ["/api/conversations", { mode: "general" }]
    : null;

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: convQueryKey!,
    queryFn: async () => {
      const res = await fetch("/api/conversations?mode=general", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isGeneral && chatOpen,
    staleTime: 30000,
  });

  useEffect(() => {
    if (!isGeneral || !chatOpen || autoRestored || conversations.length === 0) return;
    const mostRecent = conversations[0];
    if (mostRecent) {
      loadConversation(mostRecent.id);
      setAutoRestored(true);
    }
  }, [isGeneral, chatOpen, conversations, autoRestored]);

  const loadConversation = useCallback(async (convId: number) => {
    try {
      const res = await fetch(`/api/conversations/${convId}/messages`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setChatMessages(data.messages.map((m: any) => ({ role: m.role, content: m.content })));
      setActiveConversationId(convId);
      setShowHistory(false);
    } catch {
      console.error("Failed to load conversation");
    }
  }, []);

  const startNewConversation = useCallback(() => {
    setChatMessages([]);
    setActiveConversationId(null);
    setShowHistory(false);
  }, []);

  const deleteConversation = useCallback(async (convId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiRequest("DELETE", `/api/conversations/${convId}`);
      if (convQueryKey) queryClient.invalidateQueries({ queryKey: convQueryKey });
      if (activeConversationId === convId) {
        startNewConversation();
      }
    } catch {
      console.error("Failed to delete conversation");
    }
  }, [activeConversationId, queryClient, convQueryKey, startNewConversation]);

  const handleSendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    const newMessages = [...chatMessages, { role: "user" as const, content: userMsg }];
    setChatMessages(newMessages);
    setChatLoading(true);
    try {
      let res: Response;
      if (mode === "project" && projectId) {
        res = await apiRequest("POST", `/api/projects/${projectId}/chat`, {
          message: userMsg,
          history: chatMessages,
        });
        const data = await res.json();
        setChatMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        res = await apiRequest("POST", "/api/chat", {
          message: userMsg,
          history: chatMessages,
          conversationId: activeConversationId,
        });
        const data = await res.json();
        setChatMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
        if (data.conversationId && !activeConversationId) {
          setActiveConversationId(data.conversationId);
          if (convQueryKey) queryClient.invalidateQueries({ queryKey: convQueryKey });
        }
      }
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "عذراً، حدث خطأ. حاول مرة أخرى." }]);
    }
    setChatLoading(false);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  const title = mode === "project" ? "اسأل أبو هاشم" : "أبو هاشم";
  const subtitle = mode === "project" ? "مستشارك الأدبي لهذا المشروع" : "مستشارك الأدبي — اسأله أي شيء عن الكتابة";
  const emptyText = mode === "project" ? "اسأل أبو هاشم أي سؤال عن مشروعك" : "اسأل أبو هاشم أي سؤال عن الكتابة والأدب";

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisible(false);
    setChatOpen(false);
  };

  const handleRestore = () => {
    setVisible(true);
  };

  return (
    <>
      {!visible ? (
        <button
          className="fixed bottom-4 left-4 z-[9999] w-8 h-8 rounded-full bg-amber-500/80 hover:bg-amber-500 text-white shadow-md flex items-center justify-center transition-all duration-200 opacity-60 hover:opacity-100"
          onClick={handleRestore}
          data-testid="button-restore-abu-hashim"
          aria-label="إظهار أبو هاشم"
        >
          <Sparkles className="w-3.5 h-3.5" />
        </button>
      ) : mode === "general" && !chatOpen ? (
        <div className="fixed top-20 left-0 z-[9999] flex items-center">
          <button
            className="flex items-center gap-2 bg-gradient-to-l from-amber-500 to-amber-600 text-white shadow-xl rounded-r-full pl-2 sm:pl-3 pr-3 sm:pr-5 py-2 sm:py-3 transition-all duration-300 group"
            onClick={() => setChatOpen(true)}
            data-testid="button-toggle-chat"
            aria-label="تحدث مع أبو هاشم — مستشارك الأدبي"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 dark:bg-white/30 flex items-center justify-center shrink-0">
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="text-right">
              <span className="block text-xs sm:text-sm font-bold leading-tight">أبو هاشم</span>
              <span className="block text-[9px] sm:text-[10px] opacity-80 leading-tight">مستشارك الأدبي</span>
            </div>
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 opacity-60 animate-pulse" />
          </button>
          <button
            className="w-5 h-5 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center text-[10px] leading-none -mr-1 transition-colors"
            onClick={handleDismiss}
            data-testid="button-dismiss-abu-hashim"
            aria-label="إخفاء أبو هاشم"
          >
            ×
          </button>
        </div>
      ) : mode === "project" && !chatOpen ? (
        <div className="fixed bottom-6 left-6 z-[9999] flex items-end gap-1">
          <Button
            className="rounded-full w-12 h-12 sm:w-16 sm:h-16 shadow-2xl bg-amber-500 hover:bg-amber-600 text-white animate-pulse hover:animate-none ring-4 ring-amber-300/30"
            onClick={() => setChatOpen(true)}
            data-testid="button-toggle-chat"
            title="تحدث مع أبو هاشم"
          >
            <Sparkles className="w-5 h-5 sm:w-7 sm:h-7" />
          </Button>
          <button
            className="w-5 h-5 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center text-[10px] leading-none mb-1 transition-colors"
            onClick={handleDismiss}
            data-testid="button-dismiss-abu-hashim"
            aria-label="إخفاء أبو هاشم"
          >
            ×
          </button>
        </div>
      ) : null}

      <div
        className={`fixed top-0 left-0 h-full w-[380px] max-w-[90vw] bg-background border-r shadow-2xl z-[10000] transition-transform duration-300 flex flex-col ${chatOpen ? "translate-x-0" : "-translate-x-full"}`}
        dir="rtl"
      >
        <div className="p-4 border-b bg-gradient-to-l from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm">{title}</h3>
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          </div>
          <div className="flex items-center gap-1">
            {isGeneral && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowHistory(!showHistory)}
                  data-testid="button-chat-history"
                  aria-label="سجل المحادثات"
                  title="سجل المحادثات"
                >
                  <History className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={startNewConversation}
                  data-testid="button-new-conversation"
                  aria-label="محادثة جديدة"
                  title="محادثة جديدة"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setChatOpen(false)} data-testid="button-close-chat" aria-label="إغلاق الدردشة">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {isGeneral && showHistory ? (
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-1">
              <div className="flex items-center justify-between px-2 pb-2">
                <span className="text-sm font-semibold text-foreground" data-testid="text-conversation-history-title">المحادثات السابقة</span>
                <span className="text-xs text-muted-foreground">{conversations.length}</span>
              </div>
              {conversations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-conversations">لا توجد محادثات سابقة</p>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    className={`w-full text-right flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors group ${
                      activeConversationId === conv.id
                        ? "bg-amber-100 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700"
                        : "hover:bg-muted/50 border border-transparent"
                    }`}
                    onClick={() => loadConversation(conv.id)}
                    data-testid={`button-conversation-${conv.id}`}
                  >
                    <MessageCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="block text-sm truncate">{conv.title}</span>
                      <span className="block text-[10px] text-muted-foreground">
                        {new Date(conv.updatedAt).toLocaleDateString("ar-EG", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <button
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                      onClick={(e) => deleteConversation(conv.id, e)}
                      data-testid={`button-delete-conversation-${conv.id}`}
                      aria-label="حذف المحادثة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        ) : (
          <ScrollArea className="flex-1 p-4">
            {chatMessages.length === 0 && !chatLoading && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center mb-4">{emptyText}</p>
                <div className="space-y-2">
                  {quickQuestions.map((q, i) => (
                    <button
                      key={i}
                      className="w-full text-right text-sm px-3 py-2 rounded-lg border border-border hover:border-amber-300 dark:hover:border-amber-600 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors"
                      onClick={() => { setChatInput(q); }}
                      data-testid={`button-quick-question-${i}`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`mb-3 flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-foreground rounded-tl-none"
                  }`}
                  dir="rtl"
                  data-testid={`chat-message-${msg.role}-${i}`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-end mb-3">
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl rounded-tl-none px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </ScrollArea>
        )}

        <div className="p-3 border-t bg-background">
          <div className="flex gap-2">
            <Textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="اكتب سؤالك هنا..."
              className="resize-none min-h-[44px] max-h-[120px] text-sm"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
              data-testid="input-chat-message"
            />
            <Button
              size="icon"
              className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white h-[44px] w-[44px]"
              onClick={handleSendChat}
              disabled={chatLoading || !chatInput.trim()}
              data-testid="button-send-chat"
              aria-label="إرسال الرسالة"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
