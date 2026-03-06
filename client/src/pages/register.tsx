import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Feather, Loader2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { ttqTrack, ttqIdentify } from "@/lib/ttq";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { z } from "zod";

const registerSchema = z.object({
  firstName: z.string().min(1, "الاسم الأول مطلوب"),
  lastName: z.string().optional(),
  email: z
    .string()
    .min(1, "البريد الإلكتروني مطلوب")
    .email("يرجى إدخال بريد إلكتروني صالح"),
  password: z
    .string()
    .min(1, "كلمة المرور مطلوبة")
    .min(6, "كلمة المرور يجب أن تكون ٦ أحرف على الأقل"),
  confirmPassword: z.string().min(1, "تأكيد كلمة المرور مطلوب"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "كلمتا المرور غير متطابقتين",
  path: ["confirmPassword"],
});

function getPasswordStrength(pw: string): { level: "weak" | "medium" | "strong"; label: string; color: string; width: string } {
  if (!pw) return { level: "weak", label: "", color: "", width: "0%" };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;

  if (score <= 2) return { level: "weak", label: "ضعيفة", color: "bg-red-500", width: "33%" };
  if (score <= 3) return { level: "medium", label: "متوسطة", color: "bg-yellow-500", width: "66%" };
  return { level: "strong", label: "قوية", color: "bg-green-500", width: "100%" };
}

export default function Register() {
  useDocumentTitle("إنشاء حساب — قلم AI");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = registerSchema.safeParse({ firstName, lastName, email: email.trim(), password, confirmPassword });
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
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, firstName, lastName }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "خطأ", description: data.message, variant: "destructive" });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      ttqIdentify({ email, id: data.id || email });
      ttqTrack("CompleteRegistration", { contentType: "product", contentName: "registration" });
      ttqTrack("Signup", { contentType: "product", contentName: "registration" });
      navigate("/");
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
          <h1 className="font-serif text-3xl font-bold mb-2" data-testid="text-register-title">إنشاء حساب جديد</h1>
          <p className="text-muted-foreground">أنشئ حسابك وابدأ رحلتك في كتابة الرواية</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">الاسم الأول</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => { setFirstName(e.target.value); setFieldErrors((prev) => ({ ...prev, firstName: "" })); }}
                    placeholder="الاسم الأول"
                    maxLength={50}
                    data-testid="input-first-name"
                  />
                  {fieldErrors.firstName && <p className="text-xs text-red-500" data-testid="error-first-name">{fieldErrors.firstName}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">اسم العائلة</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="اسم العائلة"
                    maxLength={50}
                    data-testid="input-last-name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors((prev) => ({ ...prev, email: "" })); }}
                  placeholder="أدخل بريدك الإلكتروني"
                  data-testid="input-email"
                />
                {fieldErrors.email && <p className="text-xs text-red-500" data-testid="error-email">{fieldErrors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, password: "" })); }}
                    placeholder="٦ أحرف على الأقل"
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
                {password && (
                  <div className="space-y-1" data-testid="password-strength-indicator">
                    <div className="h-1.5 w-full rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: passwordStrength.width }}
                      />
                    </div>
                    <p className={`text-xs ${passwordStrength.level === "weak" ? "text-red-500" : passwordStrength.level === "medium" ? "text-yellow-600 dark:text-yellow-400" : "text-green-600 dark:text-green-400"}`}>
                      قوة كلمة المرور: {passwordStrength.label}
                    </p>
                  </div>
                )}
                {fieldErrors.password && <p className="text-xs text-red-500" data-testid="error-password">{fieldErrors.password}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, confirmPassword: "" })); }}
                    placeholder="أعد إدخال كلمة المرور"
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
                {fieldErrors.confirmPassword && <p className="text-xs text-red-500" data-testid="error-confirm-password">{fieldErrors.confirmPassword}</p>}
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting} data-testid="button-register">
                {isSubmitting ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : null}
                {isSubmitting ? "جاري إنشاء الحساب..." : "إنشاء الحساب"}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-3 text-muted-foreground">أو</span>
              </div>
            </div>

            <a href="/api/login">
              <Button variant="outline" className="w-full" size="lg" data-testid="button-replit-register">
                التسجيل عبر Replit
              </Button>
            </a>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          لديك حساب بالفعل؟{" "}
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
