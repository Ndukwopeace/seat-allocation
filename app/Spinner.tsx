// Decorative only — the button text itself already announces the pending
// state (e.g. "Generating…") and disabled attribute, so this stays
// aria-hidden rather than duplicating that with its own accessible name.
//
// Sizing lives entirely in `className` (default h-4 w-4) rather than a
// fixed base class — two same-specificity Tailwind utility classes (e.g.
// the base "h-4" and a caller's "h-8") don't reliably override each other
// by source order, so baking in a size and expecting callers to widen it
// via an appended className silently doesn't work.
export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`flex-none animate-spin ${className}`}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
