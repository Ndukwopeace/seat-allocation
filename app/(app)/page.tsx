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
        <p className="text-sm text-muted">Hello, {session.name.split(" ")[0]} 👋</p>
        <h1 className="font-display text-xl font-medium text-ink">
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
              sublabel={todaysSessions.length === 1 ? "Exam" : "Exams"}
            />
            <StatCard
              label="Seat Lists Ready"
              value={todaysAllocatedCount}
              sublabel={todaysAllocatedCount === 1 ? "Exam" : "Exams"}
            />
            <StatCard
              label="Seat Lists Waiting"
              value={todaysPendingCount}
              sublabel={todaysPendingCount === 1 ? "Exam" : "Exams"}
            />
          </>
        ) : (
          <>
            <StatCard
              label="Today's Exams"
              value={todaysSessions.length}
              sublabel={todaysSessions.length === 1 ? "Exam" : "Exams"}
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
          <h2 className="font-display text-base font-medium text-ink">
            {session.role === "ADMIN" ? "Today's Exams" : "My Exams"}
          </h2>
          <Link href="/sessions" className="text-sm text-muted">
            View all
          </Link>
        </div>

        {todaysSessions.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-hairline px-4 py-6 text-center text-sm text-muted">
            No exams today.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {todaysSessions.map((s) => {
              const version = versionBySession.get(s.id) ?? 0;
              return (
                <li key={s.id}>
                  <Link
                    href={`/sessions/${s.id}`}
                    className="flex items-center justify-between rounded-2xl border border-hairline bg-white px-4 py-3 shadow-sm active:scale-[0.98]"
                  >
                    <div>
                      <p className="font-medium text-ink">
                        {formatYear(s.year)}
                        {s.label ? ` — ${s.label}` : ""}
                      </p>
                      <p className="text-sm text-muted">
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
                      {version === 0 ? "Waiting" : "Seats ready"}
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
    <div className="rounded-2xl border border-hairline bg-white px-4 py-4 shadow-sm">
      <p className="font-mono text-2xl font-medium text-ink">{value.toLocaleString()}</p>
      <p className="text-sm font-medium text-ink">{label}</p>
      <p className="text-xs text-muted">{sublabel}</p>
    </div>
  );
}
