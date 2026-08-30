import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/actions";

export default async function MorePage() {
  const session = await requireUser();

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <p className="text-sm text-slate-500">Signed in as</p>
        <p className="font-semibold text-slate-900">{session.name}</p>
        <p className="text-sm text-slate-500">{session.email}</p>
        <span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {session.role}
        </span>
      </div>

      <nav className="flex flex-col gap-3">
        {session.role === "ADMIN" && (
          <Link
            href="/search"
            className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-base font-medium text-slate-900 shadow-sm active:scale-[0.99]"
          >
            Seat Search
          </Link>
        )}
        {session.role === "ADMIN" && (
          <Link
            href="/admin/users"
            className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-base font-medium text-slate-900 shadow-sm active:scale-[0.99]"
          >
            Users
          </Link>
        )}
      </nav>

      <form action={logout}>
        <button
          type="submit"
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base font-medium text-slate-700 active:scale-[0.99]"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
