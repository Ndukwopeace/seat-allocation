import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AddUserForm } from "./AddUserForm";

export default async function AdminUsersPage() {
  await requireUser("ADMIN");

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Users</h1>
        <Link href="/" className="text-sm text-slate-500">
          Back
        </Link>
      </div>

      <AddUserForm />

      <ul className="flex flex-col gap-2">
        {users.map((u) => (
          <li
            key={u.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900">{u.name}</p>
              <p className="truncate text-sm text-slate-500">{u.email}</p>
            </div>
            <div className="flex flex-none flex-col items-end gap-1">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {u.role}
              </span>
              <span className="text-xs text-slate-500">
                {u.passwordHash ? "Password + Google" : "Google only"}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
