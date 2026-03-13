import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Feather, ArrowRight, Send, Loader2, Copy, Check, Sparkles, Instagram, Video, Twitter, Linkedin, RefreshCw, Trash2, BookOpen } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS: Array<{ label: string; icon: React.ComponentType<{ className?: string }>; prompt: string; color: string }> = [
  {
    label: "منشور تيك توك",
    icon: Video,
    color: "text-red-500",
    prompt: "اكتب لي سكريبت TikTok مدته 30 ثانية أقدّم فيه نفسي ككاتب عربي وأعرّف متابعيني بأحدث أعمالي.",
  },
  {
    label: "كابشن إنستغرام",
    icon: Instagram,
    color: "text-pink-500",
    prompt: "اكتب كابشن Instagram مؤثر مع هاشتاقات مناسبة لأعلن فيه عن مشروعي الأدبي الجديد وأجذب اهتمام قراء جدد.",
  },
  {
    label: "ثريد X/Twitter",
    icon: Twitter,
    color: "text-sky-500",
    prompt: "اكتب ثريد X/Twitter من 6 تغريدات أحكي فيه رحلتي في الكتابة الأدبية — من أين بدأت، وما الذي ألهمني.",
  },
  {
    label: "منشور LinkedIn",
    icon: Linkedin,
    color: "text-blue-600",
    prompt: "اكتب منشور LinkedIn احترافي أعرّف فيه بنفسي ككاتب وأشارك فيه تجربة نشر عملي الأدبي.",
  },
  {
    label: "سيرة ذاتية أدبية",
    icon: BookOpen,
    color: "text-violet-500",
    prompt: "ساعدني في كتابة Bio قصير وجذاب (بيو) يصف شخصيتي الأدبية ومجال كتابتي لأضعه في حساباتي على السوشيال ميديا.",
  },
  {
    label: "خطة محتوى أسبوعية",
    icon: RefreshCw,
    color: "text-teal-500",
    prompt: "ضع لي خطة محتوى أسبوعية لحساباتي على السوشيال ميديا تساعدني على بناء جمهور مهتم بكتاباتي الأدبية.",
  },
  {
    label: "هاشتاقات أدبية",
    icon: Sparkles,
    color: "text-amber-500",
    prompt: "أعطني قائمة هاشتاقات عربية وإنجليزية يستخدمها الكتّاب العرب للوصول إلى أكبر جمهور على إنستغرام وتيك توك.",
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
      title="نسخ"
      data-testid="button-copy-message"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 group ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {!isUser && (
        <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-primary flex items-center justify-center">
          <Feather className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={`max-w-[85%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-muted/70 border border-border/50 rounded-bl-sm"
          }`}
          data-testid={`message-${msg.role}`}
        >
          {msg.content}
        </div>
        {!isUser && (
          <div className="flex items-center gap-1">
            <CopyButton text={msg.content} />
          </div>
        )}
      </div>
    </div>
  );
}

const PAID_PLANS = ["essay", "scenario", "all_in_one"];

export default function SocialMarketing() {
  useDocumentTitle("مستشار التسويق الأدبي — قلم AI");
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasPaidPlan = user && (
    PAID_PLANS.includes((user as any).plan || "") ||
    (user as any).trialActive ||
    (user as any).role === "admin"
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const userMsg: Message = { role: "user", content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await apiRequest("POST", "/api/me/social-marketing-chat", { message: trimmed, history });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل في الحصول على رد");
      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
    } catch (err: any) {
      toast({ title: err.message || "حدث خطأ في الاتصال", variant: "destructive" });
      setMessages(messages);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, toast]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }, [input, sendMessage]);

  const clearChat = () => {
    setMessages([]);
    setInput("");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">يرجى تسجيل الدخول أولاً</p>
          <Link href="/login">
            <Button>تسجيل الدخول</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!hasPaidPlan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-6 max-w-md px-6">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
            <Feather className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-2xl font-serif font-bold">مستشار التسويق الأدبي</h2>
          <p className="text-muted-foreground">
            هذه الميزة متاحة للمشتركين في الخطط المدفوعة. اشترك الآن لتحصل على مستشار تسويق رقمي مخصص لك ككاتب.
          </p>
          <Link href="/pricing">
            <Button size="lg" className="w-full">عرض خطط الاشتراك</Button>
          </Link>
          <Link href="/">
            <Button variant="ghost" className="w-full">
              <ArrowRight className="w-4 h-4 ml-2" />
              العودة للرئيسية
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const authorName = (user as any).displayName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "الكاتب";

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="shrink-0" data-testid="button-back-home">
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-primary flex items-center justify-center shrink-0">
                <Feather className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="font-serif font-bold text-sm" data-testid="page-title">مستشار التسويق الأدبي</h1>
                <p className="text-xs text-muted-foreground">أبو هاشم — خبير تسويق الكاتب الرقمي</p>
              </div>
            </div>
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearChat} className="text-muted-foreground hover:text-foreground gap-1.5" data-testid="button-clear-chat">
              <Trash2 className="w-3.5 h-3.5" />
              مسح المحادثة
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1 max-w-4xl w-full mx-auto flex flex-col px-4 pb-4">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 space-y-8">
            <div className="text-center space-y-3 max-w-md">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-600/20 to-primary/20 flex items-center justify-center mx-auto">
                <Feather className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-xl font-serif font-bold">مرحباً، {authorName}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                أنا مستشارك الشخصي للتسويق الأدبي الرقمي. أساعدك في كتابة منشورات جاهزة للنشر، وبناء هويتك الأدبية على السوشيال ميديا، واستقطاب جمهور قراء مخلصين.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl" data-testid="quick-prompts-grid">
              {QUICK_PROMPTS.map((qp, i) => (
                <Card
                  key={i}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => sendMessage(qp.prompt)}
                  data-testid={`quick-prompt-${i}`}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    <qp.icon className={`w-5 h-5 mt-0.5 shrink-0 ${qp.color}`} />
                    <div>
                      <p className="text-sm font-semibold">{qp.label}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{qp.prompt}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 py-6">
            <div className="space-y-6 px-1">
              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} />
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-primary flex items-center justify-center">
                    <Feather className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-muted/70 border border-border/50 rounded-2xl rounded-bl-sm px-4 py-3" data-testid="loading-indicator">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        )}

        <div className="border-t border-border/50 pt-4 space-y-3">
          {messages.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {QUICK_PROMPTS.slice(0, 4).map((qp, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(qp.prompt)}
                  disabled={loading}
                  className="shrink-0 flex items-center gap-1.5 text-xs bg-muted/70 hover:bg-muted border border-border/50 rounded-full px-3 py-1.5 transition-colors disabled:opacity-50"
                  data-testid={`shortcut-prompt-${i}`}
                >
                  <qp.icon className={`w-3 h-3 ${qp.color}`} />
                  {qp.label}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اسألني عن السوشيال ميديا، اطلب مني كتابة منشور، أو بيّن لي عملك الأدبي..."
              className="flex-1 min-h-[52px] max-h-[200px] resize-none"
              disabled={loading}
              data-testid="input-chat-message"
            />
            <Button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              size="icon"
              className="h-[52px] w-[52px] shrink-0"
              data-testid="button-send-message"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
