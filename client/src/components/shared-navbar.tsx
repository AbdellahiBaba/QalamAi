import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import {
  Feather,
  Menu,
  X,
  LogOut,
  ShieldCheck,
  TicketCheck,
  MessageSquareQuote,
  LayoutDashboard,
} from "lucide-react";

export const navLinks = [
  { label: "الرئيسية", href: "/" },
  { label: "المعرض", href: "/gallery" },
  { label: "المقالات", href: "/essays" },
  { label: "من نحن", href: "/about" },
  { label: "المميزات", href: "/features" },
  { label: "الأسعار", href: "/pricing" },
  { label: "تواصل معنا", href: "/contact" },
  { label: "أبو هاشم", href: "/abu-hashim" },
];

export const footerOnlyLinks = [
  { label: "آراء المستخدمين", href: "/reviews" },
];

export function SharedNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-background/80 border-b">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href={isAuthenticated ? "/" : "/"}>
            <div className="flex items-center gap-2 sm:gap-3 cursor-pointer">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-md bg-primary flex items-center justify-center">
                <Feather className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
              </div>
              <span className="font-serif text-lg sm:text-xl font-bold" data-testid="text-logo">QalamAI</span>
            </div>
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <span
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                data-testid={`link-nav-${link.href.replace("/", "") || "home"}`}
              >
                {link.label}
              </span>
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />

          {isAuthenticated ? (
            <>
              <Link href="/">
                <Button variant="ghost" size="sm" data-testid="link-dashboard">
                  <LayoutDashboard className="w-4 h-4 ml-1" />
                  <span className="hidden sm:inline">لوحة التحكم</span>
                </Button>
              </Link>
              <Link href="/reviews">
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex" data-testid="link-reviews">
                  <MessageSquareQuote className="w-4 h-4 ml-1" />
                  <span className="hidden lg:inline">آراء المستخدمين</span>
                </Button>
              </Link>
              <Link href="/tickets">
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex" data-testid="link-tickets">
                  <TicketCheck className="w-4 h-4 ml-1" />
                  <span className="hidden lg:inline">تذاكر الدعم</span>
                </Button>
              </Link>
              {user?.role === "admin" && (
                <Link href="/admin">
                  <Button variant="ghost" size="sm" className="hidden sm:inline-flex" data-testid="link-admin">
                    <ShieldCheck className="w-4 h-4 ml-1" />
                    <span className="hidden lg:inline">الإدارة</span>
                  </Button>
                </Link>
              )}
              <Link href="/profile">
                <div className="flex items-center gap-2 cursor-pointer" data-testid="link-profile">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user?.profileImageUrl || undefined} />
                    <AvatarFallback className="text-xs">
                      {user?.firstName?.[0] || user?.email?.[0] || "م"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden lg:inline" data-testid="text-username">
                    {user?.firstName || user?.email || "مستخدم"}
                  </span>
                </div>
              </Link>
              <Button variant="ghost" size="icon" onClick={() => logout()} data-testid="button-logout">
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="outline" size="sm" className="text-xs sm:text-sm" data-testid="button-login">تسجيل الدخول</Button>
              </Link>
              <Link href="/login">
                <Button size="sm" className="hidden sm:inline-flex text-xs sm:text-sm" data-testid="button-signup">إنشاء حساب جديد</Button>
              </Link>
            </>
          )}

          <Button
            size="icon"
            variant="ghost"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="button-mobile-menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background px-4 sm:px-6 py-4 space-y-3">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <span
                className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer py-1"
                onClick={() => setMobileMenuOpen(false)}
                data-testid={`link-mobile-nav-${link.href.replace("/", "") || "home"}`}
              >
                {link.label}
              </span>
            </Link>
          ))}
          {isAuthenticated && (
            <div className="border-t pt-3 space-y-2">
              <Link href="/">
                <span className="block text-sm font-medium text-muted-foreground hover:text-foreground py-1" onClick={() => setMobileMenuOpen(false)} data-testid="link-mobile-dashboard">لوحة التحكم</span>
              </Link>
              <Link href="/reviews">
                <span className="block text-sm font-medium text-muted-foreground hover:text-foreground py-1" onClick={() => setMobileMenuOpen(false)} data-testid="link-mobile-reviews">آراء المستخدمين</span>
              </Link>
              <Link href="/tickets">
                <span className="block text-sm font-medium text-muted-foreground hover:text-foreground py-1" onClick={() => setMobileMenuOpen(false)} data-testid="link-mobile-tickets">تذاكر الدعم</span>
              </Link>
              <Link href="/profile">
                <span className="block text-sm font-medium text-muted-foreground hover:text-foreground py-1" onClick={() => setMobileMenuOpen(false)} data-testid="link-mobile-profile">الملف الشخصي</span>
              </Link>
            </div>
          )}
          {!isAuthenticated && (
            <Link href="/login">
              <Button className="w-full" onClick={() => setMobileMenuOpen(false)} data-testid="button-mobile-login">
                تسجيل الدخول
              </Button>
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
