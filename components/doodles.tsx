// Little hand-drawn marks. Deliberately a bit wobbly.

type P = { className?: string };

export function Heart({ className, filled }: P & { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12.1 20.3c-.4-.3-7.6-5-8.6-9.6C2.7 7.1 4.9 4.2 8 4.4c1.9.1 3.2 1.4 4 2.8.9-1.6 2.4-2.9 4.4-2.9 3.1.1 5 3.2 4 6.6-1.3 4.5-7.8 9-8.3 9.4z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Sparkle({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 2.5c.4 4.6 2.6 7.9 8.8 9.3-5.8 1.1-8.2 4.2-8.7 9.7-.7-5.6-3-8.6-9-9.6 6-1.2 8.3-4.6 8.9-9.4z" fill="currentColor" />
    </svg>
  );
}

export function Squiggle({ className }: P) {
  return (
    <svg viewBox="0 0 120 10" preserveAspectRatio="none" className={className} aria-hidden="true">
      <path d="M2 6.5C14 2.8 26 8.6 40 5.4s26-3.4 40-.2 24 3 38-1" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function Circled({ className }: P) {
  return (
    <svg viewBox="0 0 100 50" preserveAspectRatio="none" className={className} aria-hidden="true">
      <path d="M58 4C30 2 5 10 4 25c-1 14 26 21 50 20 24-1 43-8 42-21C95 11 74 4 46 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Arrow({ className }: P) {
  return (
    <svg viewBox="0 0 60 40" className={className} aria-hidden="true">
      <path d="M4 6c10 2 26 6 34 16 4 5 6 9 8 14M40 30l6 6 3-9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
