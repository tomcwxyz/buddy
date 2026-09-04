"use client";

import Link from "next/link";
import { House, Sparkle, UserCircle } from "@phosphor-icons/react";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Home", icon: House },
  { href: "/words", label: "My words", icon: Sparkle },
  { href: "/me", label: "Me", icon: UserCircle },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Buddy navigation">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
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
