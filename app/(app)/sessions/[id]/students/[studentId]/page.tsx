import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveAllocation } from "@/lib/allocation";
import { formatDate, formatTime, formatYear } from "@/lib/format";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default async function StudentAllocationDetailPage(
  props: PageProps<"/sessions/[id]/students/[studentId]">,
) {
  await requireUser();
  const { id, studentId } = await props.params;

  const [session, allocation] = await Promise.all([
    prisma.examSession.findUnique({ where: { id } }),
    getActiveAllocation(id),
  ]);
  if (!session) notFound();

  const entry = allocation?.seatAssignments.find((a) => a.studentId === studentId);
  if (!entry) notFound();

  const { student } = entry;

  return (
    <main className="flex flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Student Detail</h1>
        <Link href={`/sessions/${id}`} className="text-sm text-slate-500">
          Close
        </Link>
      </div>

      <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-6 text-center shadow-sm">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-xl font-bold text-white">
          {initials(student.fullName)}
        </span>
        <p className="text-lg font-semibold text-slate-900">{student.fullName}</p>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
          {student.program.name} — {formatYear(student.year)}
        </span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <DetailRow label="Matriculation Number" value={student.matricNumber} />
        <DetailRow
          label="Seat Number"
          value={entry.seatNumber}
          valueClassName="text-3xl font-bold text-slate-900"
        />
        <DetailRow
          label="Session"
          value={`${formatYear(session.year)}${session.label ? ` — ${session.label}` : ""}`}
        />
        <DetailRow
          label="Date & Time"
          value={`${formatDate(session.date)}, ${formatTime(session.startTime)}–${formatTime(session.endTime)}`}
          last
        />
      </div>

      <Link
        href={`/sessions/${id}`}
        className="rounded-lg bg-slate-900 px-4 py-3 text-center text-base font-semibold text-white active:scale-[0.99]"
      >
        Back to List
      </Link>
    </main>
  );
}

function DetailRow({
  label,
  value,
  valueClassName,
  last,
}: {
  label: string;
  value: string | number;
  valueClassName?: string;
  last?: boolean;
}) {
  return (
    <div className={`px-4 py-3 ${last ? "" : "border-b border-slate-100"}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={valueClassName ?? "text-sm font-medium text-slate-900"}>{value}</p>
    </div>
  );
}
