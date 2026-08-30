import Link from "next/link";
import { requireUser } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await requireUser();

  return (
    <main className="flex flex-1 flex-col px-4 py-6 sm:px-6">
      <nav className="flex flex-col gap-3">
        <Link
          href="/sessions"
          className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-base font-medium text-slate-900 shadow-sm active:scale-[0.99]"
        >
          Exam Sessions
        </Link>
        {session.role === "ADMIN" && (
          <>
            <Link
              href="/students"
              className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-base font-medium text-slate-900 shadow-sm active:scale-[0.99]"
            >
              Students
            </Link>
            <Link
              href="/admin/users"
              className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-base font-medium text-slate-900 shadow-sm active:scale-[0.99]"
            >
              Users
            </Link>
          </>
        )}
      </nav>
    </main>
  );
}
