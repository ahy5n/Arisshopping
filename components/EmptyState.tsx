import Link from "next/link";
import type { ReactNode } from "react";

export function EmptyState({ title, body, art, cta }: { title: string; body: string; art: ReactNode; cta?: { href: string; label: string } }) {
  return (
    <div className="mx-auto flex max-w-xs flex-col items-center py-14 text-center">
      <div className="mb-6 text-accent">{art}</div>
      <h2 className="serif text-[28px] italic leading-tight">{title}</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-muted">{body}</p>
      {cta && (
        <Link href={cta.href} className="mt-7 inline-flex h-12 items-center rounded-full bg-accent px-6 text-[15px] font-medium text-on-accent transition active:scale-95">
          {cta.label}
        </Link>
      )}
    </div>
  );
}
