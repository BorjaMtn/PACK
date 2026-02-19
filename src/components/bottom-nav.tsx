"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const NAV_ITEMS = [
  { href: "/feed", labelKey: "feed", icon: "🐾" },
  { href: "/pack", labelKey: "pack", icon: "🏕️" },
  { href: "/packs", labelKey: "packs", icon: "🧭" },
  { href: "/meetups", labelKey: "meetups", icon: "📍" },
  { href: "/profile", labelKey: "profile", icon: "🌙" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations("Nav");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800/70 bg-zinc-950/95 shadow-[0_-14px_30px_rgba(0,0,0,0.45)] backdrop-blur">
      <ul className="mx-auto grid w-full max-w-md grid-cols-5 gap-1 px-2 pb-3 pt-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`block rounded-2xl px-2 py-2.5 text-center transition active:scale-[0.97] ${
                  isActive
                    ? "bg-zinc-100 text-zinc-950 shadow-[0_10px_24px_rgba(255,255,255,0.15)]"
                    : "text-zinc-400 hover:bg-zinc-900/80"
                }`}
              >
                <span className="block text-sm leading-none">{item.icon}</span>
                <span className="mt-1 block text-[11px] font-semibold">{t(item.labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
