import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dayKeyFor, formatDayHeading, formatTime, formatYear } from "@/lib/format";
import { CreateSessionForm } from "./CreateSessionForm";
import { SessionTabs } from "./SessionTabs";

function startOfTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export default async function SessionsPage() {
  const user = await requireUser();

  const [sessions, participantCounts, allocationVersions] = await Promise.all([
    prisma.examSession.findMany({ orderBy: { date: "desc" } }),
    // Per-session roster counts, not year cohort size — see lib/session-roster.ts.
    prisma.sessionParticipant.groupBy({
      by: ["examSessionId"],
      _count: { _all: true },
    }),
    prisma.allocation.groupBy({
      by: ["examSessionId"],
      _max: { version: true },
    }),
  ]);

  const participantCountBySession = new Map(
    participantCounts.map((c) => [c.examSessionId, c._count._all]),
  );
  const versionBySession = new Map(
    allocationVersions.map((a) => [a.examSessionId, a._max.version ?? 0]),
  );

  const todayStart = startOfTodayUTC();
  const rows = sessions.map((session) => ({
    id: session.id,
    year: session.year,
    yearLabel: formatYear(session.year),
    label: session.label,
    dayKey: dayKeyFor(session.date),
    dayHeading: formatDayHeading(session.date),
    startTime: formatTime(session.startTime),
    endTime: formatTime(session.endTime),
    studentCount: participantCountBySession.get(session.id) ?? 0,
    version: versionBySession.get(session.id) ?? 0,
    isUpcoming: session.date >= todayStart,
  }));

  // Day ordering (soonest-first for upcoming, most-recent-first for past)
  // and the within-day year/time sort both happen in SessionTabs, so these
  // just need to be filtered, not pre-sorted.
  const upcoming = rows.filter((r) => r.isUpcoming);
  const past = rows.filter((r) => !r.isUpcoming);

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-medium text-ink">Exams</h1>
        <Link href="/" className="text-sm text-muted">
          Back
        </Link>
      </div>

      {user.role === "ADMIN" && (
        <Link
          href="/sessions/import"
          className="rounded-full bg-coral px-4 py-3.5 text-center text-base font-semibold text-white active:scale-[0.98]"
        >
          + Import Exams
        </Link>
      )}

      {user.role === "ADMIN" && <CreateSessionForm />}

      <SessionTabs upcoming={upcoming} past={past} />
    </main>
  );
}
