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
        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base"
        aria-label="Search allocated seats"
      />

      {query.trim() === "" ? (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
          Start typing to find a student&rsquo;s seat.
        </p>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
          No matches in any allocated session.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((r) => (
            <li key={`${r.examSessionId}-${r.studentId}`}>
              <Link
                href={`/sessions/${r.examSessionId}/students/${r.studentId}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm active:scale-[0.99]"
              >
                <div>
                  <p className="font-medium text-slate-900">{r.fullName}</p>
                  <p className="text-sm text-slate-500">
                    {r.matricNumber} · {r.program} · {r.year}
                  </p>
                  <p className="text-xs text-slate-500">
                    {r.sessionLabel} · {r.sessionDate}, {r.sessionTime}
                  </p>
                </div>
                <span className="rounded-full bg-slate-900 px-3 py-1 text-sm font-bold text-white">
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
