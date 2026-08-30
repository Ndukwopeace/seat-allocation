import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatYear } from "@/lib/format";

export default async function StudentsPage() {
  await requireUser("ADMIN");

  const students = await prisma.student.findMany({
    orderBy: [{ year: "asc" }, { matricNumber: "asc" }],
    include: { program: true },
  });

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">
          Student Registry
        </h1>
        <Link href="/" className="text-sm text-slate-500">
          Back
        </Link>
      </div>

      <p className="text-sm text-slate-500">
        {students.length} registered student{students.length === 1 ? "" : "s"}.
        CSV/Excel import is coming in a follow-up — students are seeded
        directly for this walking skeleton.
      </p>

      <ul className="flex flex-col gap-2 sm:hidden">
        {students.map((s) => (
          <li
            key={s.id}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <p className="font-medium text-slate-900">{s.fullName}</p>
            <p className="text-sm text-slate-500">
              {s.matricNumber} · {s.program.name} · {formatYear(s.year)}
            </p>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 sm:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2">Matric No.</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Program</th>
              <th className="px-4 py-2">Year</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{s.matricNumber}</td>
                <td className="px-4 py-2">{s.fullName}</td>
                <td className="px-4 py-2">{s.program.name}</td>
                <td className="px-4 py-2">{formatYear(s.year)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
