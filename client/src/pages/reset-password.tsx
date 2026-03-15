import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Feather, Loader2, Eye, EyeOff, CheckCircle, ArrowRight, AlertTriangle, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function ResetPassword() {
  useDocumentTitle("إعادة تعيين كلمة المرور — قلم AI", "أعد تعيين كلمة مرورك لحسابك على منصة QalamAI.");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [, params] = useRoute("/reset-password/:token");
  const token = params?.token || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [tokenError, setTokenError] = useState("");
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isSuccess) {
      setCountdown(3);
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            navigate("/login");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isSuccess, navigate]);

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      toast({ title: "خطأ", description: "كلمة المرور يجب أن تكون ٨ أحرف على الأقل وتحتوي على حرف كبير وصغير ورقم", variant: "destructive" });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: "خطأ", description: "كلمتا المرور غير متطابقتين", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    setTokenError("");
    try {
      const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
      const csrfVal = csrfMatch ? decodeURIComponent(csrfMatch[1]) : "";
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfVal },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = (data.message || "").toLowerCase();
        if (msg.includes("expired") || msg.includes("invalid") || msg.includes("token") || msg.includes("منتهي") || msg.includes("غير صالح")) {
          setTokenError(data.message);
        } else {
          toast({ title: "خطأ", description: data.message, variant: "destructive" });
        }
        return;
      }
      setIsSuccess(true);
    } catch {
      toast({ title: "خطأ", description: "فشل في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4" dir="rtl">
        <div className="w-full max-w-md text-center space-y-4">
          <h1 className="font-serif text-2xl font-bold">رابط غير صالح</h1>
          <p className="text-muted-foreground">يبدو أن رابط إعادة تعيين كلمة المرور غير صالح أو منتهي الصلاحية.</p>
          <Link href="/forgot-password">
            <Button data-testid="button-request-new-reset">طلب رابط جديد</Button>
          </Link>
        </div>
      </div>
    );
  }

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
          <h1 className="font-serif text-3xl font-bold mb-2" data-testid="text-reset-password-title">إعادة تعيين كلمة المرور</h1>
          <p className="text-muted-foreground">أدخل كلمة المرور الجديدة</p>
        </div>

        <Card>
          <CardContent className="p-6">
            {isSuccess ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="font-serif text-xl font-bold" data-testid="text-password-reset-success">تم تغيير كلمة المرور</h2>
                <p className="text-muted-foreground text-sm">
                  تم إعادة تعيين كلمة المرور بنجاح. سيتم توجيهك لصفحة تسجيل الدخول خلال{" "}
                  <span className="font-bold text-foreground" data-testid="text-redirect-countdown">{countdown}</span>{" "}
                  {countdown === 1 ? "ثانية" : "ثوانٍ"}.
                </p>
                <Button onClick={() => navigate("/login")} className="mt-4" data-testid="button-go-to-login">
                  <ArrowRight className="w-4 h-4 ml-2" />
                  تسجيل الدخول الآن
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور الجديدة</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="أدخل كلمة المرور الجديدة"
                      required
                      className="pl-10"
                      data-testid="input-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="أعد إدخال كلمة المرور"
                      required
                      className="pl-10"
                      data-testid="input-confirm-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      data-testid="button-toggle-confirm-password"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordsMatch && (
                    <p className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400" data-testid="text-passwords-match">
                      <Check className="w-3 h-3" />
                      كلمتا المرور متطابقتان
                    </p>
                  )}
                  {passwordsMismatch && (
                    <p className="flex items-center gap-1 text-xs text-destructive" data-testid="text-passwords-mismatch">
                      <X className="w-3 h-3" />
                      كلمتا المرور غير متطابقتين
                    </p>
                  )}
                </div>
                {tokenError && (
                  <div className="flex flex-col items-center gap-3 rounded-md bg-destructive/10 p-4 text-center" data-testid="text-token-error">
                    <AlertTriangle className="w-6 h-6 text-destructive" />
                    <p className="text-sm font-medium text-destructive">{tokenError}</p>
                    <p className="text-xs text-muted-foreground">
                      قد يكون الرابط منتهي الصلاحية أو تم استخدامه مسبقاً. يمكنك طلب رابط جديد لإعادة تعيين كلمة المرور.
                    </p>
                    <Link href="/forgot-password">
                      <Button variant="outline" size="sm" data-testid="button-request-new-reset-inline">
                        طلب رابط جديد
                      </Button>
                    </Link>
                  </div>
                )}
                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting} data-testid="button-reset-password">
                  {isSubmitting ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : null}
                  {isSubmitting ? "جاري إعادة التعيين..." : "إعادة تعيين كلمة المرور"}
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
