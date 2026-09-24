"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    href: "/practice",
    label: "Words",
    note: "Play with a few",
    active: (path: string) => path === "/practice",
  },
  {
    href: "/practice/coaster",
    label: "World",
    note: "Build + ride",
    active: (path: string) => path === "/practice/coaster",
  },
  {
    href: "/practice/add-spellings",
    label: "Add words",
    note: "Photo or type",
    active: (path: string) => path === "/practice/add-spellings",
  },
];

export function PlayNav() {
  const pathname = usePathname();

  return (
    <nav className="play-nav" aria-label="Play">
      <div className="play-nav-title">
        <span>Play</span>
        <strong>Words become things to make with.</strong>
      </div>
      <div className="play-nav-items">
        {items.map((item) => {
          const active = item.active(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? "active" : ""}
              aria-current={active ? "page" : undefined}
            >
              <span>{item.label}</span>
              <small>{item.note}</small>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
