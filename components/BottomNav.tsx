"use client";

import Link from "next/link";
import { House, PuzzlePiece, Sparkle, UserCircle } from "@phosphor-icons/react";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Home", icon: House, activeWhen: (path: string) => path === "/" },
  { href: "/practice", label: "Play", icon: PuzzlePiece, activeWhen: (path: string) => path === "/practice" || path.startsWith("/practice/") },
  { href: "/words", label: "My words", icon: Sparkle, activeWhen: (path: string) => path === "/words" },
  { href: "/me", label: "Me", icon: UserCircle, activeWhen: (path: string) => path === "/me" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Buddy navigation">
      {items.map(({ href, label, icon: Icon, activeWhen }) => {
        const active = activeWhen(pathname);
        return (
          <Link key={href} href={href} className={`nav-item${active ? " active" : ""}`} aria-current={active ? "page" : undefined}>
            <Icon size={20} weight={active ? "fill" : "regular"} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
