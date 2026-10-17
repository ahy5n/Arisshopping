"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useWishlist } from "@/lib/storage";
import type { Product } from "@/lib/types";
import { Heart } from "./doodles";

const BITS = [0, 60, 120, 180, 240, 300];

export function HeartButton({ product, className = "" }: { product: Product; className?: string }) {
  const [list, setList] = useWishlist();
  const on = list.some((p) => p.id === product.id);
  const [burst, setBurst] = useState(0);

  return (
    <button
      type="button"
      aria-label={on ? "Remove from wishlist" : "Save to wishlist"}
      aria-pressed={on}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setList((l) => (l.some((p) => p.id === product.id) ? l.filter((p) => p.id !== product.id) : [{ ...product, rank: undefined }, ...l]));
        if (!on) setBurst((b) => b + 1);
      }}
      className={`grid h-11 w-11 place-items-center rounded-full bg-bg/85 text-accent shadow-[0_2px_10px_color-mix(in_oklab,var(--ink)_10%,transparent)] backdrop-blur-sm transition active:scale-90 ${className || "relative"}`}
    >
      <motion.span
        key={on ? "on" : "off"}
        initial={on ? { scale: 0.4 } : false}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 520, damping: 12 }}
        className="block"
      >
        <Heart filled={on} className="h-[22px] w-[22px]" />
      </motion.span>
      <AnimatePresence>
        {burst > 0 && on && (
          <motion.span key={burst} className="pointer-events-none absolute inset-0" initial="a" animate="b" exit={{ opacity: 0 }}>
            {BITS.map((deg, i) => (
              <motion.span
                key={deg}
                className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-accent"
                variants={{
                  a: { x: "-50%", y: "-50%", opacity: 1, scale: 1 },
                  b: {
                    x: `calc(-50% + ${Math.cos((deg * Math.PI) / 180) * (20 + (i % 2) * 6)}px)`,
                    y: `calc(-50% + ${Math.sin((deg * Math.PI) / 180) * (20 + (i % 2) * 6)}px)`,
                    opacity: 0,
                    scale: 0.4,
                  },
                }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              />
            ))}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
