import { useQuery } from "@tanstack/react-query";
import { SiLinkedin, SiTiktok, SiX, SiInstagram, SiFacebook, SiYoutube, SiSnapchat, SiTelegram, SiWhatsapp } from "react-icons/si";
import type { SocialMediaLink } from "@shared/schema";

const platformIcons: Record<string, typeof SiLinkedin> = {
  linkedin: SiLinkedin,
  tiktok: SiTiktok,
  x: SiX,
  instagram: SiInstagram,
  facebook: SiFacebook,
  youtube: SiYoutube,
  snapchat: SiSnapchat,
  telegram: SiTelegram,
  whatsapp: SiWhatsapp,
};

const platformLabels: Record<string, string> = {
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  x: "X / Twitter",
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  snapchat: "Snapchat",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
};

interface SocialMediaIconsProps {
  size?: "sm" | "md";
  className?: string;
}

export function SocialMediaIcons({ size = "md", className = "" }: SocialMediaIconsProps) {
  const { data: links } = useQuery<SocialMediaLink[]>({
    queryKey: ["/api/public/social-links"],
  });

  if (!links || links.length === 0) return null;

  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  return (
    <div className={`flex items-center gap-3 flex-wrap ${className}`} data-testid="social-media-icons">
      {links.map((link) => {
        const Icon = platformIcons[link.platform];
        if (!Icon) return null;
        return (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={platformLabels[link.platform] || link.platform}
            className="text-muted-foreground hover:text-foreground transition-colors"
            data-testid={`link-social-${link.platform}`}
          >
            <Icon className={iconSize} />
          </a>
        );
      })}
    </div>
  );
}
