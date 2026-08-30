import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatYear } from "@/lib/format";
import { StudentSearch } from "./StudentSearch";

export default async function StudentsPage() {
  await requireUser("ADMIN");

  const students = await prisma.student.findMany({
    where: { archivedAt: null },
    orderBy: [{ year: "asc" }, { matricNumber: "asc" }],
    include: { program: true },
  });

  const rows = students.map((s) => ({
    id: s.id,
    matricNumber: s.matricNumber,
    fullName: s.fullName,
    program: s.program.name,
    year: formatYear(s.year),
  }));

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Students</h1>
        <p className="text-sm text-slate-500">
          {students.length} registered student{students.length === 1 ? "" : "s"}
        </p>
      </div>

      <Link
        href="/students/import"
        className="rounded-lg bg-slate-900 px-4 py-3 text-center text-base font-semibold text-white active:scale-[0.99]"
      >
        + Import Students
      </Link>

      <StudentSearch rows={rows} />
    </main>
  );
}
