import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Feather, Loader2, Eye, EyeOff, AlertCircle, BookOpen, PenLine, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { ttqTrack, ttqIdentify } from "@/lib/ttq";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { SiReplit } from "react-icons/si";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().min(1, "البريد الإلكتروني مطلوب").email("يرجى إدخال بريد إلكتروني صالح"),
  password: z.string().min(1, "كلمة المرور مطلوبة").min(6, "كلمة المرور يجب أن تكون ٦ أحرف على الأقل"),
});

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  auth_failed: "فشل تسجيل الدخول عبر Replit. يرجى المحاولة مجدداً أو استخدام البريد الإلكتروني.",
  oidc_unavailable: "خدمة تسجيل الدخول عبر Replit غير متاحة حالياً. يرجى استخدام البريد الإلكتروني.",
};

export default function Login() {
  useDocumentTitle("تسجيل الدخول — قلم AI", "سجّل دخولك إلى منصة QalamAI للكتابة الأدبية بالذكاء الاصطناعي.");
  const [, navigate] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const errorParam = new URLSearchParams(search).get("error");
  const authError = errorParam ? AUTH_ERROR_MESSAGES[errorParam] || "حدث خطأ في المصادقة. يرجى المحاولة مجدداً." : null;

  useEffect(() => {
    if (authError) {
      toast({ title: "خطأ في تسجيل الدخول", description: authError, variant: "destructive" });
    }
  }, [authError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = loginSchema.safeParse({ email: email.trim(), password });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string;
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
      const csrfVal = csrfMatch ? decodeURIComponent(csrfMatch[1]) : "";
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfVal },
        body: JSON.stringify({ email: email.trim(), password }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "خطأ", description: data.message, variant: "destructive" });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      ttqIdentify({ email, id: data.id || email });
      ttqTrack("CompleteRegistration", { contentType: "product", contentName: "login" });
      navigate("/");
    } catch {
      toast({ title: "خطأ", description: "فشل في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex" dir="rtl">
      <div className="hidden lg:flex flex-col justify-between w-[42%] bg-gradient-to-br from-primary/90 via-primary to-primary/80 text-primary-foreground p-10 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-10 left-10 w-48 h-48 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute bottom-20 right-10 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
          {["✦", "✧", "❋", "✿", "✱"].map((sym, i) => (
            <div key={i} className="absolute text-white/10 font-serif select-none text-4xl" style={{ right: `${10 + i * 17}%`, top: `${20 + (i % 3) * 18}%` }}>{sym}</div>
          ))}
        </div>
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer relative z-10">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <Feather className="w-5 h-5 text-white" />
            </div>
            <span className="font-serif text-xl font-bold">QalamAI</span>
          </div>
        </Link>
        <div className="relative z-10 space-y-8">
          <div className="space-y-3">
            <h2 className="text-3xl font-serif font-bold leading-tight">
              مرحباً بك في<br />عالم الكتابة الأدبية
            </h2>
            <p className="text-primary-foreground/80 font-serif leading-loose">
              سجّل دخولك وعُد إلى رحلتك الإبداعية مع أبو هاشم وآلاف الكتّاب العرب.
            </p>
          </div>
          <div className="space-y-4">
            {[
              { icon: PenLine, text: "استمر من حيث توقفت في مشاريعك الأدبية" },
              { icon: BookOpen, text: "استكشف أعمال الكتّاب وتحديات الكتابة" },
              { icon: Star, text: "احصل على توجيه أبو هاشم الأدبي" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                  <item.icon className="w-3.5 h-3.5" />
                </div>
                <p className="text-sm text-primary-foreground/80 font-serif leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-primary-foreground/50 relative z-10 font-serif italic">
          «الكلمة أمانة، والكتابة رسالة» — QalamAI
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-12">
        <div className="w-full max-w-md space-y-7">
          <div className="lg:hidden text-center mb-4">
            <Link href="/">
              <div className="inline-flex items-center gap-2.5 cursor-pointer">
                <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                  <Feather className="w-4.5 h-4.5 text-primary-foreground" />
                </div>
                <span className="font-serif text-xl font-bold">QalamAI</span>
              </div>
            </Link>
          </div>

          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold" data-testid="text-login-title">تسجيل الدخول</h1>
            <p className="text-muted-foreground text-sm mt-1">أدخل بياناتك للوصول إلى حسابك</p>
          </div>

          {authError && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-sm" data-testid="alert-auth-error">
              <AlertCircle className="w-4.5 h-4.5 text-destructive shrink-0 mt-0.5" />
              <p className="text-destructive">{authError}</p>
            </div>
          )}

          <div className="space-y-3">
            <a href="/api/login" className="block" data-testid="link-replit-login">
              <Button
                variant="outline"
                className="w-full gap-3 h-11 border-2 hover:bg-[#F5A623]/5 hover:border-[#F5A623]/40 transition-all"
                size="lg"
                data-testid="button-replit-login"
              >
                <SiReplit className="w-5 h-5 text-[#F5A623]" />
                <span className="font-semibold">المتابعة عبر Replit</span>
              </Button>
            </a>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-3 text-muted-foreground">أو باستخدام البريد الإلكتروني</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setFieldErrors(prev => ({ ...prev, email: "" })); }}
                placeholder="example@email.com"
                className="h-11"
                data-testid="input-email"
              />
              {fieldErrors.email && <p className="text-xs text-destructive" data-testid="error-email">{fieldErrors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">كلمة المرور</Label>
                <Link href="/forgot-password">
                  <span className="text-xs text-primary hover:underline cursor-pointer" data-testid="link-forgot-password">نسيت كلمة المرور؟</span>
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors(prev => ({ ...prev, password: "" })); }}
                  placeholder="••••••••"
                  className="h-11 pl-10"
                  data-testid="input-password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" data-testid="button-toggle-password">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && <p className="text-xs text-destructive" data-testid="error-password">{fieldErrors.password}</p>}
            </div>

            <Button type="submit" className="w-full h-11" size="lg" disabled={isSubmitting} data-testid="button-login">
              {isSubmitting && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              {isSubmitting ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            ليس لديك حساب؟{" "}
            <Link href="/register">
              <span className="text-primary font-semibold cursor-pointer hover:underline" data-testid="link-register">إنشاء حساب مجاني</span>
            </Link>
          </p>

          <p className="text-center text-xs text-muted-foreground/60">
            بالمتابعة، أنت توافق على{" "}
            <Link href="/terms"><span className="hover:underline cursor-pointer">شروط الاستخدام</span></Link>
            {" "}و{" "}
            <Link href="/privacy"><span className="hover:underline cursor-pointer">سياسة الخصوصية</span></Link>
          </p>
        </div>
      </div>
    </div>
  );
}
