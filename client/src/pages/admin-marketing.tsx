import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Feather, ArrowRight, Send, Loader2, Copy, Check, Sparkles, Megaphone, TrendingUp, Instagram, Video, Twitter, Linkedin, RefreshCw, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const SUPER_ADMIN_IDS = ["39706084", "e482facd-d157-4e97-ad91-af96b8ec8f49"];

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS: Array<{ label: string; icon: React.ComponentType<{ className?: string }>; prompt: string; color: string }> = [
  {
    label: "سكريبت TikTok فيروسي",
    icon: Video,
    color: "text-red-500",
    prompt: "اكتب لي سكريبت TikTok فيروسي مدته 30 ثانية عن منصة QalamAI. يجب أن يكون الـ Hook قوياً جداً في أول 3 ثوان ويشرح كيف يمكن لأي شخص كتابة رواية بالذكاء الاصطناعي.",
  },
  {
    label: "كابشن Instagram",
    icon: Instagram,
    color: "text-pink-500",
    prompt: "اكتب كابشن Instagram مؤثر ومع هاشتاقات لمنصة QalamAI يستهدف الكتّاب العرب الذين يحلمون بنشر رواية لكنهم لا يعرفون من أين يبدأون.",
  },
  {
    label: "ثريد X/Twitter",
    icon: Twitter,
    color: "text-sky-500",
    prompt: "اكتب ثريد X/Twitter فيروسي من 8 تغريدات عن QalamAI ولماذا هو أفضل أداة كتابة عربية بالذكاء الاصطناعي. ابدأ بـ Hook لا يقاوم.",
  },
  {
    label: "إعلان LinkedIn",
    icon: Linkedin,
    color: "text-blue-600",
    prompt: "اكتب منشور LinkedIn احترافي عن كيف يمكن لـ QalamAI مساعدة الكتّاب المحترفين والمؤلفين العرب في إنتاج محتوى عالي الجودة. استهدف الجمهور المهني.",
  },
  {
    label: "حملة محتوى شهرية",
    icon: TrendingUp,
    color: "text-green-500",
    prompt: "صمم لي Content Calendar كامل لشهر واحد لتسويق QalamAI على كل المنصات (TikTok، Instagram، X، LinkedIn). أعطني أفكار يومية متنوعة.",
  },
  {
    label: "أفكار محتوى ترندينج",
    icon: Sparkles,
    color: "text-violet-500",
    prompt: "أعطني 10 أفكار محتوى إبداعية وغير تقليدية لتسويق QalamAI يمكن أن تصبح ترند على السوشيال ميديا العربية. تحدث عن الجانب العاطفي والإنساني للكتابة.",
  },
  {
    label: "نص إعلان مدفوع",
    icon: Megaphone,
    color: "text-amber-500",
    prompt: "اكتب نص إعلان Facebook/Instagram Ads لـ QalamAI. اجعله يستهدف الطلاب والكتّاب الهواة العرب. احرص على وجود CTA قوي ونقطة ألم واضحة.",
  },
  {
    label: "تحليل الجمهور المستهدف",
    icon: RefreshCw,
    color: "text-teal-500",
    prompt: "حلل لي الجمهور المستهدف لـ QalamAI بالتفصيل: من هم؟ ما اهتماماتهم؟ أين يتواجدون؟ ما نقاط ألمهم؟ كيف نصل إليهم بأفضل طريقة؟",
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
        <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-primary flex items-center justify-center">
          <Megaphone className="w-4 h-4 text-white" />
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

export default function AdminMarketing() {
  useDocumentTitle("أبو هاشم — نموذج التسويق | QalamAI");
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isSuperAdmin = user && (SUPER_ADMIN_IDS.includes((user as any).id || "") || (user as any).role === "admin");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg = text.trim();
    setInput("");
    const newMessages: Message[] = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/admin/marketing-chat", {
        message: userMsg,
        history: messages.slice(-14),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err: any) {
      toast({ title: err.message || "فشل في الحصول على رد", variant: "destructive" });
      setMessages(prev => prev.slice(0, -1));
    }
    setLoading(false);
  }, [messages, loading, toast]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-4">
          <Megaphone className="w-12 h-12 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-serif font-bold">غير مصرّح</h1>
          <p className="text-muted-foreground">هذه الصفحة للمشرفين فقط.</p>
          <Link href="/"><Button variant="outline">العودة</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="gap-1.5" data-testid="button-back-admin">
                <ArrowRight className="w-4 h-4" />
                لوحة الإدارة
              </Button>
            </Link>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-primary flex items-center justify-center">
                <Megaphone className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <span className="font-serif font-semibold text-sm">أبو هاشم — نسخة التسويق</span>
                <Badge className="mr-2 text-xs px-1.5 py-0 bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800" variant="outline">
                  Super Admin
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
                onClick={() => setMessages([])}
                data-testid="button-clear-chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
                مسح المحادثة
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex flex-col max-w-5xl mx-auto w-full px-4">
        {messages.length === 0 ? (
          /* Welcome screen */
          <div className="flex-1 overflow-y-auto py-8 space-y-8">
            <div className="text-center space-y-4 pt-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-primary flex items-center justify-center mx-auto">
                <Megaphone className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="font-serif text-2xl font-bold">أبو هاشم — نسخة التسويق الرقمي</h1>
                <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto leading-relaxed">
                  نموذج ذكاء اصطناعي متخصص في تسويق QalamAI على السوشيال ميديا. يعرف كل تفاصيل المنصة ويولد محتوى تسويقياً احترافياً جاهزاً للنشر.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 flex-wrap text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Video className="w-3 h-3 text-red-500" />TikTok</span>
                <span>·</span>
                <span className="flex items-center gap-1"><Instagram className="w-3 h-3 text-pink-500" />Instagram</span>
                <span>·</span>
                <span className="flex items-center gap-1"><Twitter className="w-3 h-3 text-sky-500" />X/Twitter</span>
                <span>·</span>
                <span className="flex items-center gap-1"><Linkedin className="w-3 h-3 text-blue-600" />LinkedIn</span>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground font-medium mb-3 text-center">ابدأ بأحد هذه الطلبات</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {QUICK_PROMPTS.map((qp) => (
                  <Card
                    key={qp.label}
                    className="cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all group"
                    onClick={() => sendMessage(qp.prompt)}
                    data-testid={`quick-prompt-${qp.label}`}
                  >
                    <CardContent className="p-4 flex items-start gap-3">
                      <qp.icon className={`w-5 h-5 shrink-0 mt-0.5 ${qp.color}`} />
                      <div>
                        <p className="font-medium text-sm group-hover:text-primary transition-colors">{qp.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{qp.prompt.substring(0, 80)}...</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Chat messages */
          <ScrollArea className="flex-1 py-6">
            <div className="space-y-5 pb-4">
              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} />
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-primary flex items-center justify-center">
                    <Megaphone className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-muted/70 border border-border/50 rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">أبو هاشم يكتب...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        )}

        {/* Quick prompts strip when chatting */}
        {messages.length > 0 && (
          <div className="py-2 flex gap-2 overflow-x-auto scrollbar-hide">
            {QUICK_PROMPTS.slice(0, 4).map((qp) => (
              <button
                key={qp.label}
                onClick={() => sendMessage(qp.prompt)}
                disabled={loading}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border bg-muted/50 hover:bg-muted transition-colors disabled:opacity-50 whitespace-nowrap"
                data-testid={`quick-prompt-chip-${qp.label}`}
              >
                <qp.icon className={`w-3 h-3 ${qp.color}`} />
                {qp.label}
              </button>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="py-4 border-t">
          <div className="flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اطلب محتوى تسويقي... مثال: اكتب سكريبت TikTok يستهدف طلاب الجامعات"
              rows={2}
              className="resize-none flex-1 text-sm"
              disabled={loading}
              data-testid="textarea-marketing-input"
            />
            <Button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              size="icon"
              className="h-10 w-10 shrink-0 bg-violet-600 hover:bg-violet-700"
              data-testid="button-send-marketing"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Enter للإرسال · Shift+Enter لسطر جديد · المحتوى المولّد للاستخدام الداخلي فقط
          </p>
        </div>
      </div>
    </div>
  );
}
