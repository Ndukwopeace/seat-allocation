import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AddProgramForm } from "./AddProgramForm";

export default async function AdminProgramsPage() {
  await requireUser("ADMIN");

  const programs = await prisma.program.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { students: true } } },
  });

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Programs</h1>
        <Link href="/" className="text-sm text-slate-500">
          Back
        </Link>
      </div>

      <AddProgramForm />

      {programs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
          No programs yet. Add one above before importing students.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {programs.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
            >
              <p className="truncate font-medium text-slate-900">{p.name}</p>
              <span className="flex-none rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {p._count.students} student{p._count.students === 1 ? "" : "s"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
