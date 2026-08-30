import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listActiveAllocationEntries } from "@/lib/allocation";
import { formatDate, formatTime, formatYear } from "@/lib/format";
import { SeatSearch } from "./SeatSearch";

export default async function SeatSearchPage() {
  await requireUser();

  const entries = await listActiveAllocationEntries();
  const rows = entries.map((e) => ({
    examSessionId: e.examSessionId,
    studentId: e.studentId,
    seatNumber: e.seatNumber,
    matricNumber: e.matricNumber,
    fullName: e.fullName,
    program: e.program,
    year: formatYear(e.year),
    sessionLabel: `${formatYear(e.sessionYear)}${e.sessionLabel ? ` — ${e.sessionLabel}` : ""}`,
    sessionDate: formatDate(e.sessionDate),
    sessionTime: `${formatTime(e.sessionStartTime)}–${formatTime(e.sessionEndTime)}`,
  }));

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Seat Search</h1>
        <Link href="/" className="text-sm text-slate-500">
          Back
        </Link>
      </div>
      <p className="text-sm text-slate-500">
        Find a student&rsquo;s seat by name, matric number, or seat number —
        across every allocated session.
      </p>

      <SeatSearch rows={rows} />
    </main>
  );
}
