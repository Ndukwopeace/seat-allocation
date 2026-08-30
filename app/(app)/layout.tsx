import { requireUser } from "@/lib/auth";
import { BottomNav } from "./BottomNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireUser();

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center border-b border-hairline bg-white px-4 py-3 sm:px-6">
        <span className="font-display text-base font-medium tracking-tight text-ink">
          SIU Exam Seat Allocation
        </span>
      </header>

      {/* pb-20 keeps content clear of the fixed bottom nav (56px tab bar +
          safe-area inset + breathing room) so nothing is ever hidden behind it. */}
      <div className="flex flex-1 flex-col pb-20">{children}</div>

      <BottomNav role={session.role} />
    </div>
  );
}
