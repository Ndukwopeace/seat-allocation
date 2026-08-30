import { Spinner } from "@/app/Spinner";

// Next.js shows this automatically for every navigation into any page under
// the (app) layout (dashboard, sessions, students, search, admin, ...) while
// that page's server-side data fetch is still in flight — the header and
// bottom nav in app/(app)/layout.tsx stay mounted throughout, only this
// content area swaps in, so navigation never looks frozen or broken.
export default function Loading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-6">
      <Spinner className="h-8 w-8 text-muted" />
      <p className="text-sm text-muted">Loading…</p>
    </div>
  );
}
