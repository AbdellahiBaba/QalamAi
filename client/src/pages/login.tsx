import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Feather, Loader2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function Login() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "خطأ", description: data.message, variant: "destructive" });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
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
          <h1 className="font-serif text-3xl font-bold mb-2" data-testid="text-login-title">تسجيل الدخول</h1>
          <p className="text-muted-foreground">أدخل بياناتك للوصول إلى حسابك</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  required
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور"
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
              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting} data-testid="button-login">
                {isSubmitting ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : null}
                {isSubmitting ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
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
              <Button variant="outline" className="w-full" size="lg" data-testid="button-replit-login">
                تسجيل الدخول عبر Replit
              </Button>
            </a>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          ليس لديك حساب؟{" "}
          <Link href="/register">
            <span className="text-primary font-medium cursor-pointer hover:underline" data-testid="link-register">
              إنشاء حساب جديد
            </span>
          </Link>
        </p>
      </div>
    </div>
  );
}
