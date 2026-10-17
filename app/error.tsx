"use client";

import { useEffect } from "react";
import { Header } from "@/components/Header";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <>
      <Header />
      <main className="mx-auto max-w-sm px-4 py-24 text-center">
        <p className="serif text-[30px] italic leading-tight">oops, that went wonky</p>
        <p className="mt-3 text-[14.5px] leading-relaxed text-muted">Something on this page tripped over. It&rsquo;s not you. Have another go?</p>
        <button onClick={reset} className="mt-7 h-12 rounded-full bg-accent px-6 text-[15px] font-medium text-on-accent transition active:scale-95">
          try again
        </button>
      </main>
    </>
  );
}
