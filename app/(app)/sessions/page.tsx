import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatTime, formatYear } from "@/lib/format";
import { CreateSessionForm } from "./CreateSessionForm";
import { SessionTabs } from "./SessionTabs";

function startOfTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

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

  const todayStart = startOfTodayUTC();
  const rows = sessions.map((session) => ({
    id: session.id,
    yearLabel: formatYear(session.year),
    label: session.label,
    date: formatDate(session.date),
    startTime: formatTime(session.startTime),
    endTime: formatTime(session.endTime),
    studentCount: countByYear.get(session.year) ?? 0,
    version: versionBySession.get(session.id) ?? 0,
    isUpcoming: session.date >= todayStart,
  }));

  const upcoming = rows.filter((r) => r.isUpcoming).reverse(); // soonest first
  const past = rows.filter((r) => !r.isUpcoming);

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Exam Sessions</h1>
        <Link href="/" className="text-sm text-slate-500">
          Back
        </Link>
      </div>

      {user.role === "ADMIN" && <CreateSessionForm />}

      <SessionTabs upcoming={upcoming} past={past} />
    </main>
  );
}
