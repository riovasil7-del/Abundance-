"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "./providers";

export function BottomNav() {
  const pathname = usePathname();
  const { messages } = useI18n();
  const items = [
    { href: "/", label: messages.nav.home, icon: HomeIcon },
    { href: "/circles", label: messages.nav.circles, icon: CircleIcon },
    { href: "/ideas", label: messages.nav.ideas, icon: IdeaIcon },
    { href: "/upload", label: messages.nav.upload, icon: PlusIcon },
    { href: "/wallet", label: messages.nav.wallet, icon: WalletIcon },
    { href: "/me", label: messages.nav.me, icon: PersonIcon },
  ];

  return (
    <nav className="bottom-nav">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href} className={active ? "nav-link active" : "nav-link"} aria-current={active ? "page" : undefined}>
            <Icon />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
    </svg>
  );
}
function CircleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2.2" />
    </svg>
  );
}
function IdeaIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3 11c.4.4.8 1 1 1.6V17h4v-1.4c.2-.6.6-1.2 1-1.6A6 6 0 0 0 12 3z" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <circle cx="16.5" cy="14.5" r="1" />
    </svg>
  );
}
function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3" />
      <path d="M5.5 19c1.4-3 3.6-4.5 6.5-4.5S17.1 16 18.5 19" />
    </svg>
  );
}
