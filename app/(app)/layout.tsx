import { requireUser } from "@/lib/auth";
import { logout } from "@/app/actions";
import { BottomNav } from "./BottomNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireUser();

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-hairline bg-white px-4 py-3 sm:px-6">
        <span className="font-display text-base font-medium tracking-tight text-ink">
          QuickSeat
        </span>
        <form action={logout}>
          <button
            type="submit"
            aria-label="Sign out"
            title="Sign out"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted active:scale-[0.92] active:bg-mist"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17 21 12 16 7" />
              <path d="M21 12H9" />
            </svg>
          </button>
        </form>
      </header>

      {/* pb-20 keeps content clear of the fixed bottom nav (56px tab bar +
          safe-area inset + breathing room) so nothing is ever hidden behind it. */}
      <div className="flex flex-1 flex-col pb-20">{children}</div>

      <BottomNav role={session.role} />
    </div>
  );
}
