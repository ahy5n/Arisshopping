"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { TopLinks, Wordmark } from "./Nav";

export function Header({ children }: { children?: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const ref = useRef<HTMLElement>(null);

  // anything sticky below the header lines up with its real height
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty("--header-h", `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // On phones the header tucks away while she scrolls down through results and
  // comes straight back the moment she scrolls up (like Safari's own toolbar).
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const dy = y - lastY;
      setScrolled(y > 8);
      const phone = window.innerWidth < 768;
      const typing = ref.current?.contains(document.activeElement) && document.activeElement?.tagName === "INPUT";
      const h = ref.current?.offsetHeight ?? 120;
      if (!phone || typing || y < h + 40) setHidden(false);
      else if (dy > 6) setHidden(true);
      else if (dy < -6) setHidden(false);
      if (Math.abs(dy) > 6) lastY = y;
    };
    const on = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, []);

  // sticky bars below the header follow it up and down
  useEffect(() => {
    document.documentElement.dataset.header = hidden ? "hidden" : "shown";
  }, [hidden]);

  return (
    <header
      ref={ref}
      className={`sticky top-0 z-30 pt-[env(safe-area-inset-top)] transition-[transform,background-color,box-shadow] duration-300 ease-[var(--ease-soft)] ${
        scrolled ? "bg-bg/95 shadow-[0_1px_0_var(--color-line)] md:bg-bg/85 md:backdrop-blur-xl" : "bg-bg"
      } ${hidden ? "-translate-y-full" : "translate-y-0"}`}
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
