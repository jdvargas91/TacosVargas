import { Facebook, Instagram } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { useSiteContent } from "@/context/SiteContentContext";

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="currentColor">
      <path d="M14.5 3c.4 2.6 1.8 4.4 4.5 4.7v3.1c-1.5 0-2.9-.5-4.1-1.3v6.4c0 3.6-2.9 6.1-6.4 6.1S2 19.5 2 15.9c0-3.4 2.7-6 6.2-6.1v3.2c-1.6.1-2.9 1.4-2.9 3 0 1.7 1.3 3 3 3s3-1.4 3-3.1V3h3.2Z" />
    </svg>
  );
}

export function Footer() {
  const { business } = useSiteContent();
  const socials = [
    { href: business.socials.facebook, label: "Facebook", icon: Facebook },
    { href: business.socials.instagram, label: "Instagram", icon: Instagram },
    { href: business.socials.tiktok, label: "TikTok", icon: TikTokIcon },
  ];

  return (
    <footer className="border-t border-ink/10 bg-smoke px-4 py-12 md:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div>
          <BrandLogo />
          <p className="mt-3 max-w-sm text-sm text-clay">{business.slogan}</p>
        </div>
        <div className="text-sm text-clay">
          <p>
            WhatsApp{" "}
            <a className="font-medium text-ember" href={`https://wa.me/${business.whatsapp}`}>
              {business.phone}
            </a>
          </p>
          <p className="mt-1">
            {business.hours.days} · {business.hours.label}
          </p>
        </div>
        <div>
          <p className="font-display text-lg text-ink">Redes sociales</p>
          <ul className="mt-3 flex gap-2">
            {socials.map((social) => (
              <li key={social.label}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.label}
                  className="grid h-11 w-11 place-items-center rounded-full bg-terracotta text-ink transition hover:bg-[#dc5c38]"
                >
                  <social.icon />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
