import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, X, Loader2, ArrowRight, MessageCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface AbuHashimChatProps {
  mode: "general" | "project";
  projectId?: number | string;
  quickQuestions: string[];
}

export function AbuHashimChat({ mode, projectId, quickQuestions }: AbuHashimChatProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

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
        res = await apiRequest("POST", `/api/projects/${projectId}/chat`, { message: userMsg });
      } else {
        res = await apiRequest("POST", "/api/chat", { message: userMsg, history: chatMessages });
      }
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
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

  return (
    <>
      {mode === "general" ? (
        <button
          className="fixed top-20 left-0 z-[9999] flex items-center gap-2 bg-gradient-to-l from-amber-500 to-amber-600 text-white shadow-xl rounded-r-full pl-3 pr-5 py-3 transition-all duration-300 group"
          onClick={() => setChatOpen(!chatOpen)}
          data-testid="button-toggle-chat"
          aria-label="تحدث مع أبو هاشم — مستشارك الأدبي"
        >
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            {chatOpen ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
          </div>
          <div className="text-right">
            <span className="block text-sm font-bold leading-tight">أبو هاشم</span>
            <span className="block text-[10px] opacity-80 leading-tight">مستشارك الأدبي</span>
          </div>
          <Sparkles className="w-4 h-4 opacity-60 animate-pulse" />
        </button>
      ) : (
        <Button
          className="fixed bottom-6 left-6 z-[9999] rounded-full w-16 h-16 shadow-2xl bg-amber-500 hover:bg-amber-600 text-white animate-pulse hover:animate-none ring-4 ring-amber-300/30"
          onClick={() => setChatOpen(!chatOpen)}
          data-testid="button-toggle-chat"
          title="تحدث مع أبو هاشم"
        >
          {chatOpen ? <X className="w-7 h-7" /> : <Sparkles className="w-7 h-7" />}
        </Button>
      )}

      <div
        className={`fixed top-0 left-0 h-full w-[380px] max-w-[90vw] bg-background border-r shadow-2xl z-40 transition-transform duration-300 flex flex-col ${chatOpen ? "translate-x-0" : "-translate-x-full"}`}
        dir="rtl"
      >
        <div className="p-4 border-b bg-gradient-to-l from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-bold text-sm">{title}</h3>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <Button variant="ghost" size="icon" className="mr-auto" onClick={() => setChatOpen(false)} data-testid="button-close-chat">
            <X className="w-4 h-4" />
          </Button>
        </div>

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
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
