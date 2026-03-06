import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Send, MapPin, Clock, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { SocialMediaIcons } from "@/components/social-media-icons";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SharedNavbar } from "@/components/shared-navbar";
import { SharedFooter } from "@/components/shared-footer";

export default function Contact() {
  useDocumentTitle("تواصل معنا — قلم AI");
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(user?.firstName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/tickets", { name, email, subject, message });
      const ticket = await res.json();
      setTicketId(ticket.id);
      setSubmitted(true);
    } catch (error: any) {
      const msg = error.message?.includes(":") ? error.message.split(":").slice(1).join(":").trim() : "حدث خطأ أثناء إرسال التذكرة";
      toast({ title: "خطأ", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SharedNavbar />

      <section className="pt-32 pb-16 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-4" data-testid="text-contact-title">
            تواصل <span className="text-primary">معنا</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            نسعد بتواصلك معنا! سواء كان لديك استفسار أو اقتراح أو ملاحظة، فريقنا جاهز لمساعدتك.
          </p>
        </div>
      </section>

      <section className="pb-20 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10">
          <Card>
            <CardContent className="p-8">
              <h2 className="font-serif text-2xl font-bold mb-6" data-testid="text-form-title">نموذج التواصل</h2>
              {submitted ? (
                <div className="text-center py-12 space-y-4" data-testid="text-success-message">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Send className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-serif text-xl font-semibold">شكراً لتواصلك!</h3>
                  <p className="text-muted-foreground">تم استلام رسالتك بنجاح. رقم التذكرة الخاص بك:</p>
                  <p className="text-2xl font-bold text-primary" data-testid="text-ticket-id">#تذكرة-{ticketId}</p>
                  <p className="text-sm text-muted-foreground">سنعود إليك في أقرب وقت ممكن.</p>
                  {user && (
                    <Link href="/tickets">
                      <Button variant="outline" className="mt-2" data-testid="button-view-tickets">
                        متابعة تذاكري
                      </Button>
                    </Link>
                  )}
                  <div>
                    <Button variant="ghost" onClick={() => { setSubmitted(false); setSubject(""); setMessage(""); setTicketId(null); }} data-testid="button-send-another">
                      إرسال رسالة أخرى
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="name">الاسم الكامل</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="أدخل اسمك الكامل"
                      required
                      data-testid="input-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="أدخل بريدك الإلكتروني"
                      required
                      data-testid="input-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">الموضوع</Label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="موضوع رسالتك"
                      required
                      data-testid="input-subject"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">الرسالة</Label>
                    <Textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="اكتب رسالتك هنا..."
                      required
                      rows={5}
                      className="resize-none"
                      data-testid="input-message"
                    />
                  </div>
                  <Button type="submit" className="w-full" size="lg" disabled={isSubmitting} data-testid="button-submit">
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 ml-2" />
                    )}
                    {isSubmitting ? "جاري الإرسال..." : "إرسال الرسالة"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardContent className="p-8 space-y-6">
                <h2 className="font-serif text-2xl font-bold" data-testid="text-info-title">معلومات التواصل</h2>
                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">البريد الإلكتروني</h3>
                      <p className="text-muted-foreground text-sm" data-testid="text-email">support@qalamai.net</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">الموقع</h3>
                      <p className="text-muted-foreground text-sm" data-testid="text-location">العالم العربي — نعمل عن بُعد</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">ساعات الدعم</h3>
                      <p className="text-muted-foreground text-sm" data-testid="text-hours">الأحد إلى الخميس، ٩ صباحاً – ٥ مساءً (بتوقيت مكة المكرمة)</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8 space-y-4">
                <h2 className="font-serif text-2xl font-bold" data-testid="text-social-title">تابعنا على وسائل التواصل</h2>
                <p className="text-muted-foreground text-sm">
                  تابعنا على منصات التواصل الاجتماعي لآخر الأخبار والتحديثات حول QalamAI.
                </p>
                <SocialMediaIcons size="md" />
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-8 space-y-3">
                <h3 className="font-serif text-lg font-semibold" data-testid="text-support-heading">نحن هنا لمساعدتك</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  فريق QalamAI ملتزم بدعم الكتّاب العرب في رحلتهم الإبداعية. لا تتردد في التواصل معنا بأي وقت — سواء كنت بحاجة إلى مساعدة تقنية أو لديك أفكار لتطوير المنصة.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <SharedFooter />
    </div>
  );
}
