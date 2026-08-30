import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatTime, formatYear } from "@/lib/format";
import { CreateSessionForm } from "./CreateSessionForm";

export default async function SessionsPage() {
  const user = await requireUser();

  const [sessions, studentCounts, allocationVersions] = await Promise.all([
    prisma.examSession.findMany({ orderBy: { date: "desc" } }),
    prisma.student.groupBy({ by: ["year"], _count: { _all: true } }),
    prisma.allocation.groupBy({
      by: ["examSessionId"],
      _max: { version: true },
    }),
  ]);

  const countByYear = new Map(studentCounts.map((c) => [c.year, c._count._all]));
  const versionBySession = new Map(
    allocationVersions.map((a) => [a.examSessionId, a._max.version ?? 0]),
  );

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Exam Sessions</h1>
        <Link href="/" className="text-sm text-slate-500">
          Back
        </Link>
      </div>

      {user.role === "ADMIN" && <CreateSessionForm />}

      <ul className="flex flex-col gap-3">
        {sessions.length === 0 && (
          <li className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            No exam sessions yet.
          </li>
        )}
        {sessions.map((session) => {
          const studentCount = countByYear.get(session.year) ?? 0;
          const version = versionBySession.get(session.id) ?? 0;
          return (
            <li key={session.id}>
              <Link
                href={`/sessions/${session.id}`}
                className="block rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900">
                    {formatYear(session.year)}
                    {session.label ? ` — ${session.label}` : ""}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      version === 0
                        ? "bg-slate-100 text-slate-600"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {version === 0 ? "Not allocated" : `Version ${version}`}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {formatDate(session.date)} · {formatTime(session.startTime)}–
                  {formatTime(session.endTime)}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {studentCount} registered student{studentCount === 1 ? "" : "s"}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
