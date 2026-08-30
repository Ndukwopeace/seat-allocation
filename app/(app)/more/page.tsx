import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/actions";

export default async function MorePage() {
  const session = await requireUser();

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="rounded-3xl border border-hairline bg-white px-4 py-4 shadow-sm">
        <p className="text-sm text-muted">Signed in as</p>
        <p className="font-display font-medium text-ink">{session.name}</p>
        <p className="text-sm text-muted">{session.email}</p>
        <span className="mt-2 inline-block rounded-full bg-mist px-2 py-0.5 text-xs font-medium text-muted">
          {session.role}
        </span>
      </div>

      <nav className="flex flex-col gap-3">
        {session.role === "ADMIN" && (
          <Link
            href="/search"
            className="rounded-2xl border border-hairline bg-white px-4 py-4 text-base font-medium text-ink shadow-sm active:scale-[0.98]"
          >
            Seat Search
          </Link>
        )}
        {session.role === "ADMIN" && (
          <Link
            href="/admin/programs"
            className="rounded-2xl border border-hairline bg-white px-4 py-4 text-base font-medium text-ink shadow-sm active:scale-[0.98]"
          >
            Programs
          </Link>
        )}
        {session.role === "ADMIN" && (
          <Link
            href="/admin/users"
            className="rounded-2xl border border-hairline bg-white px-4 py-4 text-base font-medium text-ink shadow-sm active:scale-[0.98]"
          >
            Users
          </Link>
        )}
      </nav>

      <form action={logout}>
        <button
          type="submit"
          className="w-full rounded-full border border-hairline px-4 py-3 text-base font-medium text-ink active:scale-[0.98]"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
