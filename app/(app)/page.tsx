import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatTime, formatYear } from "@/lib/format";

function startOfTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export default async function DashboardPage() {
  const session = await requireUser();

  const todayStart = startOfTodayUTC();
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const [todaysSessions, allocationVersions, totalActiveStudents, participantCounts] =
    await Promise.all([
      prisma.examSession.findMany({
        where: { date: { gte: todayStart, lt: todayEnd } },
        orderBy: { startTime: "asc" },
      }),
      prisma.allocation.groupBy({
        by: ["examSessionId"],
        _max: { version: true },
      }),
      prisma.student.count({ where: { archivedAt: null } }),
      // Per-session roster counts, not year cohort size — a session's
      // participant list can be edited (lib/session-roster.ts) independently
      // of the year-wide registry.
      prisma.sessionParticipant.groupBy({
        by: ["examSessionId"],
        _count: { _all: true },
      }),
    ]);

  const versionBySession = new Map(
    allocationVersions.map((a) => [a.examSessionId, a._max.version ?? 0]),
  );
  const participantCountBySession = new Map(
    participantCounts.map((p) => [p.examSessionId, p._count._all]),
  );

  const todaysAllocatedCount = todaysSessions.filter(
    (s) => (versionBySession.get(s.id) ?? 0) > 0,
  ).length;
  const todaysPendingCount = todaysSessions.length - todaysAllocatedCount;

  const yearsToday = new Set(todaysSessions.map((s) => s.year));
  const studentsToday = todaysSessions.reduce(
    (sum, s) => sum + (participantCountBySession.get(s.id) ?? 0),
    0,
  );

  return (
    <main className="flex flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
      <div>
        <p className="text-sm text-slate-500">Hello, {session.name.split(" ")[0]} 👋</p>
        <h1 className="text-lg font-semibold text-slate-900">
          Here&rsquo;s what&rsquo;s happening today
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {session.role === "ADMIN" ? (
          <>
            <StatCard
              label="Total Students"
              value={totalActiveStudents}
              sublabel="All years"
            />
            <StatCard
              label="Today's Exams"
              value={todaysSessions.length}
              sublabel={todaysSessions.length === 1 ? "Session" : "Sessions"}
            />
            <StatCard
              label="Allocations Done"
              value={todaysAllocatedCount}
              sublabel={todaysAllocatedCount === 1 ? "Session" : "Sessions"}
            />
            <StatCard
              label="Pending Allocation"
              value={todaysPendingCount}
              sublabel={todaysPendingCount === 1 ? "Session" : "Sessions"}
            />
          </>
        ) : (
          <>
            <StatCard
              label="Today's Sessions"
              value={todaysSessions.length}
              sublabel={todaysSessions.length === 1 ? "Session" : "Sessions"}
            />
            <StatCard
              label="Students Today"
              value={studentsToday}
              sublabel={
                yearsToday.size === 1 ? formatYear([...yearsToday][0]) : "All years today"
              }
            />
          </>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            {session.role === "ADMIN" ? "Today's Sessions" : "My Sessions"}
          </h2>
          <Link href="/sessions" className="text-sm text-slate-500">
            View all
          </Link>
        </div>

        {todaysSessions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            No exam sessions today.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {todaysSessions.map((s) => {
              const version = versionBySession.get(s.id) ?? 0;
              return (
                <li key={s.id}>
                  <Link
                    href={`/sessions/${s.id}`}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm active:scale-[0.99]"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {formatYear(s.year)}
                        {s.label ? ` — ${s.label}` : ""}
                      </p>
                      <p className="text-sm text-slate-500">
                        {formatTime(s.startTime)}–{formatTime(s.endTime)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        version === 0
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {version === 0 ? "Pending" : "Allocated"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: number;
  sublabel: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <p className="text-2xl font-bold text-slate-900">{value.toLocaleString()}</p>
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <p className="text-xs text-slate-500">{sublabel}</p>
    </div>
  );
}
