import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Feather, Loader2, Mail, ArrowRight, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function ForgotPassword() {
  useDocumentTitle("استعادة كلمة المرور — قلم AI");
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
      const csrfVal = csrfMatch ? decodeURIComponent(csrfMatch[1]) : "";
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfVal },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "خطأ", description: data.message, variant: "destructive" });
        return;
      }
      setIsSent(true);
    } catch {
      toast({ title: "خطأ", description: "فشل في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4" dir="rtl">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link href="/">
            <div className="inline-flex items-center gap-3 cursor-pointer mb-6">
              <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center">
                <Feather className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-serif text-2xl font-bold">QalamAI</span>
            </div>
          </Link>
          <h1 className="font-serif text-3xl font-bold mb-2" data-testid="text-forgot-password-title">استعادة كلمة المرور</h1>
          <p className="text-muted-foreground">أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور</p>
        </div>

        <Card>
          <CardContent className="p-6">
            {isSent ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="font-serif text-xl font-bold" data-testid="text-email-sent">تم إرسال الرابط</h2>
                <p className="text-muted-foreground text-sm">
                  تم إرسال رابط إعادة تعيين كلمة المرور إلى <strong>{email}</strong>. يرجى التحقق من بريدك الإلكتروني.
                </p>
                <p className="text-muted-foreground text-xs">
                  إذا لم تجد الرسالة، تحقق من مجلد الرسائل غير المرغوب فيها.
                </p>
                <Link href="/login">
                  <Button variant="outline" className="mt-4" data-testid="button-back-to-login">
                    <ArrowRight className="w-4 h-4 ml-2" />
                    العودة لتسجيل الدخول
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="أدخل بريدك الإلكتروني"
                      required
                      className="pl-10"
                      data-testid="input-email"
                    />
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting} data-testid="button-send-reset">
                  {isSubmitting ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : null}
                  {isSubmitting ? "جاري الإرسال..." : "إرسال رابط الاستعادة"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          تذكرت كلمة المرور؟{" "}
          <Link href="/login">
            <span className="text-primary font-medium cursor-pointer hover:underline" data-testid="link-login">
              تسجيل الدخول
            </span>
          </Link>
        </p>
      </div>
    </div>
  );
}
