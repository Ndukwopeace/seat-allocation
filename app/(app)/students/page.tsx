import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatYear } from "@/lib/format";
import { StudentSearch } from "./StudentSearch";
import { AddStudentForm } from "./AddStudentForm";

export default async function StudentsPage() {
  await requireUser("ADMIN");

  const [students, programs] = await Promise.all([
    prisma.student.findMany({
      where: { archivedAt: null },
      orderBy: [{ year: "asc" }, { matricNumber: "asc" }],
      include: { program: true },
    }),
    prisma.program.findMany({ orderBy: { name: "asc" } }),
  ]);

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
        <h1 className="font-display text-xl font-medium text-ink">Students</h1>
        <p className="text-sm text-muted">
          {students.length} student{students.length === 1 ? "" : "s"}
        </p>
      </div>

      <Link
        href="/students/import"
        className="rounded-full bg-coral px-4 py-3.5 text-center text-base font-semibold text-white active:scale-[0.98]"
      >
        + Import Students
      </Link>

      <AddStudentForm programs={programs} />

      <StudentSearch rows={rows} />
    </main>
  );
}
