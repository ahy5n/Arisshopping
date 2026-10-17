"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWishlist } from "@/lib/storage";
import { Heart, Sparkle, Squiggle } from "./doodles";

const ITEMS = [
  { href: "/", label: "Search", icon: "search" },
  { href: "/wishlist", label: "Wishlist", icon: "heart" },
  { href: "/saved", label: "Saved", icon: "bookmark" },
  { href: "/settings", label: "Settings", icon: "settings" },
] as const;

function Icon({ name, on }: { name: (typeof ITEMS)[number]["icon"]; on: boolean }) {
  const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "heart") return <Heart filled={on} className="h-[23px] w-[23px]" />;
  return (
    <svg viewBox="0 0 24 24" className="h-[23px] w-[23px]" aria-hidden="true">
      {name === "search" && (
        <>
          <circle cx="10.5" cy="10.5" r="6.2" {...s} />
          <path d="M15.2 15.4l4.6 4.4" {...s} />
        </>
      )}
      {name === "bookmark" && <path d="M7 4.5h10c.6 0 1 .4 1 1v14l-6-3.8-6 3.8v-14c0-.6.4-1 1-1z" {...s} fill={on ? "currentColor" : "none"} />}
      {name === "settings" && (
        <>
          <path d="M4 7h9M17 7h3M4 17h3M11 17h9" {...s} />
          <circle cx="15" cy="7" r="2.2" {...s} />
          <circle cx="9" cy="17" r="2.2" {...s} />
        </>
      )}
    </svg>
  );
}

export function BottomNav() {
  const path = usePathname();
  const [wish] = useWishlist();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {ITEMS.map((it) => {
          const on = it.href === "/" ? path === "/" : path.startsWith(it.href);
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={`relative flex h-[62px] flex-col items-center justify-center gap-1 text-[11px] transition-colors ${on ? "text-accent" : "text-muted"}`}
              >
                <span className="relative">
                  <Icon name={it.icon} on={on} />
                  {it.icon === "heart" && wish.length > 0 && (
                    <span className="absolute -right-2.5 -top-1.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-accent px-1 text-[10px] font-medium text-on-accent">
                      {wish.length}
                    </span>
                  )}
                </span>
                <span className={on ? "font-medium" : ""}>{it.label}</span>
                {on && (
                  <motion.span layoutId="nav-mark" className="absolute bottom-1.5 h-[5px] w-7 text-accent" transition={{ type: "spring", stiffness: 400, damping: 30 }}>
                    <Squiggle className="h-full w-full" />
                  </motion.span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Wordmark({ small }: { small?: boolean }) {
  return (
    <Link href="/" className="group inline-flex items-start gap-0.5" aria-label="ari's shopping, home">
      <span className={`serif italic leading-none tracking-[-0.02em] text-ink ${small ? "text-[24px]" : "text-[28px]"}`}>
        ari&rsquo;s shopping
      </span>
      <Sparkle className="mt-[-2px] h-3 w-3 text-accent transition-transform duration-500 group-hover:rotate-90" />
    </Link>
  );
}

export function TopLinks() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
      {ITEMS.map((it) => {
        const on = it.href === "/" ? path === "/" : path.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`relative rounded-full px-4 py-2 text-[14px] transition-colors ${on ? "text-ink" : "text-muted hover:text-ink"}`}
          >
            {it.label}
            {on && (
              <motion.span layoutId="top-mark" className="absolute inset-x-3 bottom-0.5 h-[6px] text-accent">
                <Squiggle className="h-full w-full" />
              </motion.span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
