"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Row = {
  studentId: string;
  seatNumber: number;
  matricNumber: string;
  fullName: string;
  program: string;
};

type SortKey = "seatNumber" | "matricNumber" | "fullName" | "program";

export function AllocationList({
  examSessionId,
  rows,
}: {
  examSessionId: string;
  rows: Row[];
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("seatNumber");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q
      ? rows.filter(
          (r) =>
            r.matricNumber.toLowerCase().includes(q) ||
            r.fullName.toLowerCase().includes(q) ||
            String(r.seatNumber).includes(q),
        )
      : rows;

    return [...matches].sort((a, b) => {
      if (sortKey === "seatNumber") return a.seatNumber - b.seatNumber;
      return String(a[sortKey]).localeCompare(String(b[sortKey]));
    });
  }, [rows, query, sortKey]);

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        placeholder="Search student ID, name or seat number"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-2xl border-none bg-mist px-4 py-3.5 text-base text-ink focus:outline-none focus:ring-2 focus:ring-coral/40"
        aria-label="Search seat list"
      />

      <div className="flex flex-wrap gap-2 text-sm">
        <span className="text-muted">Sort by:</span>
        {(
          [
            ["seatNumber", "Seat"],
            ["matricNumber", "Student ID"],
            ["fullName", "Name"],
            ["program", "Course"],
          ] as [SortKey, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSortKey(key)}
            aria-pressed={sortKey === key}
            className={`rounded-full px-3 py-1 ${
              sortKey === key
                ? "bg-coral text-white"
                : "bg-mist text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="text-sm text-muted">
        {filtered.length} of {rows.length} students
      </p>

      {/* Mobile: cards. Seat number is the dominant element (FR-VIEW-06). */}
      <ul className="flex flex-col gap-2 sm:hidden">
        {filtered.map((r) => (
          <li key={r.matricNumber}>
            <Link
              href={`/sessions/${examSessionId}/students/${r.studentId}`}
              className="flex items-center gap-4 rounded-2xl border border-hairline bg-white px-4 py-3 shadow-sm active:scale-[0.98]"
            >
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-coral font-mono text-lg font-medium text-white">
                {r.seatNumber}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{r.fullName}</p>
                <p className="truncate text-sm text-muted">
                  {r.matricNumber} · {r.program}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* Desktop/tablet: table. */}
      <div className="hidden overflow-x-auto rounded-2xl border border-hairline sm:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-mist text-ink/70">
            <tr>
              <th className="px-4 py-2">Seat</th>
              <th className="px-4 py-2">Student ID</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Course</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.matricNumber} className="border-t border-hairline">
                <td className="px-4 py-2 font-mono font-semibold text-ink">
                  {r.seatNumber}
                </td>
                <td className="px-4 py-2">{r.matricNumber}</td>
                <td className="px-4 py-2">{r.fullName}</td>
                <td className="px-4 py-2">{r.program}</td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/sessions/${examSessionId}/students/${r.studentId}`}
                    className="text-muted underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="py-6 text-center text-sm text-muted">No matches.</p>
      )}
    </div>
  );
}
