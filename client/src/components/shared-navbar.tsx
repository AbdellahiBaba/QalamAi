import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
  Search,
  BookOpen,
  Users,
  BadgeCheck,
  Lightbulb,
  ListOrdered,
  Bell,
  CheckCheck,
  UserPlus,
  MessageCircle,
  Coffee,
  Star,
  Gift,
  Trophy,
  Mail,
} from "lucide-react";

export const navLinks = [
  { label: "الرئيسية", href: "/" },
  { label: "المعرض", href: "/gallery" },
  { label: "المقالات", href: "/essays" },
  { label: "تحدي الكتابة", href: "/daily-prompt" },
  { label: "تحديات", href: "/challenges" },
  { label: "مذكرات التخرج", href: "/memoires" },
  { label: "من نحن", href: "/about" },
  { label: "المميزات", href: "/features" },
  { label: "الأسعار", href: "/pricing" },
  { label: "تواصل معنا", href: "/contact" },
  { label: "أبو هاشم", href: "/abu-hashim" },
];

export const footerOnlyLinks = [
  { label: "آراء المستخدمين", href: "/reviews" },
];

function NavbarSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}&limit=5`, { credentials: "include", signal: controller.signal });
      if (res.ok && !controller.signal.aborted) {
        const data = await res.json();
        setResults(data);
        setOpen(true);
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && query.trim().length >= 2) {
      setOpen(false);
      setLocation(`/search?q=${encodeURIComponent(query.trim())}`);
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function navigateTo(path: string) {
    setOpen(false);
    setQuery("");
    setResults(null);
    setLocation(path);
  }

  const hasResults = results && (results.projects?.length > 0 || results.authors?.length > 0 || results.series?.length > 0 || results.prompts?.length > 0);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results && query.trim().length >= 2) setOpen(true); }}
          placeholder="بحث..."
          className="w-28 sm:w-36 h-8 text-xs pr-7 pl-2 rounded-md border bg-background/50 focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
          data-testid="input-navbar-search"
        />
        {loading && (
          <div className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute top-full mt-1 left-0 right-0 w-72 sm:w-80 bg-popover border rounded-lg shadow-lg z-[60] max-h-96 overflow-y-auto" data-testid="dropdown-search-results">
          {!hasResults && !loading && (
            <div className="p-4 text-center text-sm text-muted-foreground" data-testid="text-no-results">
              لم يتم العثور على نتائج
            </div>
          )}

          {results?.projects?.length > 0 && (
            <div className="p-2">
              <div className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1 px-2">
                <BookOpen className="w-3 h-3" /> الأعمال
              </div>
              {results.projects.slice(0, 4).map((p: any) => {
                const link = p.project_type === "essay" && p.share_token
                  ? `/essay/${p.share_token}`
                  : p.share_token ? `/shared/${p.share_token}` : `/project/${p.id}`;
                return (
                  <button
                    key={p.id}
                    className="w-full text-right px-2 py-1.5 rounded hover:bg-accent flex items-center gap-2 text-sm"
                    onClick={() => navigateTo(link)}
                    data-testid={`search-result-project-${p.id}`}
                  >
                    {p.cover_image_url ? (
                      <img src={p.cover_image_url} className="w-8 h-10 object-cover rounded flex-shrink-0" alt="" />
                    ) : (
                      <div className="w-8 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-3 h-3 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-xs">{p.title}</div>
                      <div className="truncate text-[10px] text-muted-foreground">{p.author_name}</div>
                      {p.main_idea && <div className="truncate text-[10px] text-muted-foreground/70">{p.main_idea?.slice(0, 60)}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {results?.authors?.length > 0 && (
            <div className="p-2 border-t">
              <div className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1 px-2">
                <Users className="w-3 h-3" /> الكتّاب
              </div>
              {results.authors.slice(0, 3).map((a: any) => (
                <button
                  key={a.id}
                  className="w-full text-right px-2 py-1.5 rounded hover:bg-accent flex items-center gap-2 text-sm"
                  onClick={() => navigateTo(`/author/${a.id}`)}
                  data-testid={`search-result-author-${a.id}`}
                >
                  <Avatar className="w-6 h-6 flex-shrink-0">
                    <AvatarImage src={a.profileImageUrl || undefined} />
                    <AvatarFallback className="text-[10px]">{(a.displayName || "?")[0]}</AvatarFallback>
                  </Avatar>
                  <span className="truncate text-xs">{a.displayName}</span>
                  {a.verified && <BadgeCheck className="w-3.5 h-3.5 text-[#1D9BF0] flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}

          {results?.series?.length > 0 && (
            <div className="p-2 border-t">
              <div className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1 px-2">
                <ListOrdered className="w-3 h-3" /> السلاسل
              </div>
              {results.series.slice(0, 2).map((s: any) => (
                <button
                  key={s.id}
                  className="w-full text-right px-2 py-1.5 rounded hover:bg-accent flex items-center gap-2 text-sm"
                  onClick={() => navigateTo(`/series/${s.id}`)}
                  data-testid={`search-result-series-${s.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-xs">{s.title}</div>
                    {s.author_name && <div className="truncate text-[10px] text-muted-foreground">{s.author_name}</div>}
                    {s.description && <div className="truncate text-[10px] text-muted-foreground">{s.description?.slice(0, 50)}</div>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {results?.prompts?.length > 0 && (
            <div className="p-2 border-t">
              <div className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1 px-2">
                <Lightbulb className="w-3 h-3" /> تحدي الكتابة
              </div>
              {results.prompts.slice(0, 2).map((p: any) => (
                <button
                  key={p.id}
                  className="w-full text-right px-2 py-1.5 rounded hover:bg-accent flex items-center gap-2 text-sm"
                  onClick={() => navigateTo("/daily-prompt")}
                  data-testid={`search-result-prompt-${p.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs">{p.content?.slice(0, 60)}...</div>
                    <div className="truncate text-[10px] text-muted-foreground">{p.author_name}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {(hasResults || loading) && (
            <div className="border-t p-2">
              <button
                className="w-full text-center text-xs text-primary hover:underline py-1"
                onClick={() => navigateTo(`/search?q=${encodeURIComponent(query.trim())}`)}
                data-testid="link-view-all-results"
              >
                عرض جميع النتائج
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const notifIcons: Record<string, typeof Bell> = {
  follow: UserPlus,
  comment: MessageCircle,
  tip: Coffee,
  rating: Star,
  gift_received: Gift,
  challenge_winner: Trophy,
  email_subscriber: Mail,
  project_completed: CheckCheck,
  ticket_reply: MessageCircle,
  beta_reader: BookOpen,
  verified_approved: BadgeCheck,
  verified_rejected: BadgeCheck,
};

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 30000,
  });

  const { data: notifications } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
    enabled: open,
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpen = () => {
    setOpen(!open);
    if (!open) {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    }
  };

  const markAllRead = async () => {
    try {
      await apiRequest("PATCH", "/api/notifications/read-all");
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    } catch {}
  };

  const handleNotifClick = (notif: any) => {
    if (!notif.read) {
      apiRequest("PATCH", `/api/notifications/${notif.id}/read`).then(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
        queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      }).catch(() => {});
    }
    if (notif.link) {
      setLocation(notif.link);
      setOpen(false);
    }
  };

  const unreadCount = countData?.count || 0;

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "الآن";
    if (mins < 60) return `${mins} د`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} س`;
    const days = Math.floor(hours / 24);
    return `${days} ي`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button variant="ghost" size="icon" onClick={handleOpen} className="relative" data-testid="button-notifications">
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1" data-testid="badge-unread-count">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute top-full mt-1 left-0 sm:left-auto sm:right-0 w-80 sm:w-96 bg-popover border rounded-lg shadow-lg z-[60] max-h-[400px] overflow-hidden flex flex-col" data-testid="dropdown-notifications">
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="font-semibold text-sm">الإشعارات</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline flex items-center gap-1" data-testid="button-mark-all-read">
                <CheckCheck className="w-3 h-3" />
                قراءة الكل
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {!notifications || notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground" data-testid="text-no-notifications">
                لا توجد إشعارات
              </div>
            ) : (
              notifications.slice(0, 30).map((notif: any) => {
                const Icon = notifIcons[notif.type] || Bell;
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`w-full text-right px-3 py-2.5 flex items-start gap-2.5 hover:bg-accent/50 transition-colors border-b last:border-b-0 ${!notif.read ? "bg-primary/5" : ""}`}
                    data-testid={`notification-item-${notif.id}`}
                  >
                    <div className={`mt-0.5 p-1.5 rounded-full flex-shrink-0 ${!notif.read ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-medium truncate ${!notif.read ? "text-foreground" : "text-muted-foreground"}`}>{notif.title}</span>
                        {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{notif.message}</p>
                      <span className="text-[10px] text-muted-foreground/60 mt-0.5 block">{timeAgo(notif.createdAt)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function SharedNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

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
                className={`text-sm font-medium transition-colors cursor-pointer ${
                  isActive(link.href)
                    ? "text-foreground font-semibold border-b-2 border-primary pb-0.5"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`link-nav-${link.href.replace("/", "") || "home"}`}
              >
                {link.label}
              </span>
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <NavbarSearch />
          <ThemeToggle />

          {isAuthenticated ? (
            <>
              <NotificationBell />
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
              <Button variant="ghost" size="icon" onClick={() => logout()} data-testid="button-logout" aria-label="تسجيل الخروج">
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="outline" size="sm" className="text-xs sm:text-sm" data-testid="button-login">تسجيل الدخول</Button>
              </Link>
              <Link href="/register">
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
            aria-label={mobileMenuOpen ? "إغلاق القائمة" : "فتح القائمة"}
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
                className={`block text-sm font-medium transition-colors cursor-pointer py-1 ${
                  isActive(link.href)
                    ? "text-foreground font-semibold border-r-2 border-primary pr-2"
                    : "text-muted-foreground hover:text-foreground"
                }`}
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
                <span className={`block text-sm font-medium py-1 ${isActive("/") ? "text-foreground font-semibold border-r-2 border-primary pr-2" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setMobileMenuOpen(false)} data-testid="link-mobile-dashboard">لوحة التحكم</span>
              </Link>
              <Link href="/reviews">
                <span className={`block text-sm font-medium py-1 ${isActive("/reviews") ? "text-foreground font-semibold border-r-2 border-primary pr-2" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setMobileMenuOpen(false)} data-testid="link-mobile-reviews">آراء المستخدمين</span>
              </Link>
              <Link href="/tickets">
                <span className={`block text-sm font-medium py-1 ${isActive("/tickets") ? "text-foreground font-semibold border-r-2 border-primary pr-2" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setMobileMenuOpen(false)} data-testid="link-mobile-tickets">تذاكر الدعم</span>
              </Link>
              <Link href="/analytics">
                <span className={`block text-sm font-medium py-1 ${isActive("/analytics") ? "text-foreground font-semibold border-r-2 border-primary pr-2" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setMobileMenuOpen(false)} data-testid="link-mobile-analytics">إحصائياتي</span>
              </Link>
              <Link href="/profile">
                <span className={`block text-sm font-medium py-1 ${isActive("/profile") ? "text-foreground font-semibold border-r-2 border-primary pr-2" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setMobileMenuOpen(false)} data-testid="link-mobile-profile">الملف الشخصي</span>
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
