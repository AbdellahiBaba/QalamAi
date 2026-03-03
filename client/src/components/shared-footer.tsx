import { Link } from "wouter";
import { Feather } from "lucide-react";
import { navLinks, footerOnlyLinks } from "@/components/shared-navbar";
import { SocialMediaIcons } from "@/components/social-media-icons";

export function SharedFooter() {
  return (
    <footer className="border-t py-8 sm:py-12 px-4 sm:px-6 bg-secondary text-secondary-foreground">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
                <Feather className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-serif text-xl font-bold" data-testid="text-footer-logo">QalamAI</span>
            </div>
            <p className="text-sm opacity-80 leading-relaxed">
              منصّة الكتابة الأدبية العربية بالذكاء الاصطناعي. نسعى لتمكين الكتّاب العرب من تحويل أفكارهم إلى روايات بلغة عربية فصيحة.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold text-sm" data-testid="text-footer-links-heading">روابط سريعة</h4>
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <span className="text-sm opacity-80 hover:opacity-100 transition-opacity cursor-pointer" data-testid={`link-footer-${link.href.replace("/", "") || "home"}`}>
                    {link.label}
                  </span>
                </Link>
              ))}
              {footerOnlyLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <span className="text-sm opacity-80 hover:opacity-100 transition-opacity cursor-pointer" data-testid={`link-footer-${link.href.replace("/", "") || "home"}`}>
                    {link.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold text-sm" data-testid="text-footer-more-heading">المزيد</h4>
            <div className="flex flex-col gap-2">
              <Link href="/novel-theme">
                <span className="text-sm opacity-80 hover:opacity-100 transition-opacity cursor-pointer" data-testid="link-footer-novel-theme">فكرة الرواية</span>
              </Link>
              <Link href="/login">
                <span className="text-sm opacity-80 hover:opacity-100 transition-opacity cursor-pointer" data-testid="link-footer-login">تسجيل الدخول</span>
              </Link>
            </div>
          </div>
        </div>
        <SocialMediaIcons size="md" className="mb-4" />
        <div className="border-t border-secondary-foreground/20 pt-6 flex flex-wrap items-center justify-between gap-4 text-sm opacity-70">
          <span>QalamAI — منصّة الكتابة الأدبية بالذكاء الاصطناعي</span>
          <span>&copy; {new Date().getFullYear()} QalamAI. جميع الحقوق محفوظة.</span>
        </div>
      </div>
    </footer>
  );
}
