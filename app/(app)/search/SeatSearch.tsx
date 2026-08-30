"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Row = {
  examSessionId: string;
  studentId: string;
  seatNumber: number;
  matricNumber: string;
  fullName: string;
  program: string;
  year: string;
  sessionLabel: string;
  sessionDate: string;
  sessionTime: string;
};

export function SeatSearch({ rows }: { rows: Row[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return rows.filter(
      (r) =>
        r.matricNumber.toLowerCase().includes(q) ||
        r.fullName.toLowerCase().includes(q) ||
        String(r.seatNumber) === q,
    );
  }, [rows, query]);

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        autoFocus
        placeholder="Search by name, matric number, or seat number"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-2xl border-none bg-mist px-4 py-3.5 text-base text-ink focus:outline-none focus:ring-2 focus:ring-coral/40"
        aria-label="Search allocated seats"
      />

      {query.trim() === "" ? (
        <p className="rounded-3xl border border-dashed border-hairline px-4 py-6 text-center text-sm text-muted">
          Start typing to find a student&rsquo;s seat.
        </p>
      ) : filtered.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-hairline px-4 py-6 text-center text-sm text-muted">
          No matches in any allocated session.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((r) => (
            <li key={`${r.examSessionId}-${r.studentId}`}>
              <Link
                href={`/sessions/${r.examSessionId}/students/${r.studentId}`}
                className="flex items-center justify-between rounded-2xl border border-hairline bg-white px-4 py-3 shadow-sm active:scale-[0.98]"
              >
                <div>
                  <p className="font-medium text-ink">{r.fullName}</p>
                  <p className="text-sm text-muted">
                    {r.matricNumber} · {r.program} · {r.year}
                  </p>
                  <p className="text-xs text-muted">
                    {r.sessionLabel} · {r.sessionDate}, {r.sessionTime}
                  </p>
                </div>
                <span className="rounded-full bg-coral px-3 py-1 font-mono text-sm font-semibold text-white">
                  {r.seatNumber}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
