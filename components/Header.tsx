"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { TopLinks, Wordmark } from "./Nav";

export function Header({ children }: { children?: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const ref = useRef<HTMLElement>(null);

  // anything sticky below the header lines up with its real height
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty("--header-h", `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header
      ref={ref}
      className={`sticky top-0 z-30 pt-[env(safe-area-inset-top)] transition-[background-color,box-shadow,backdrop-filter] duration-300 ${
        scrolled ? "bg-bg/85 shadow-[0_1px_0_var(--color-line)] backdrop-blur-xl" : "bg-bg"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="flex h-14 items-center justify-between">
          <Wordmark small />
          <TopLinks />
        </div>
        {children && <div className="pb-3">{children}</div>}
      </div>
    </header>
  );
}
