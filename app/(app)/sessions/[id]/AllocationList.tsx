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
        placeholder="Search matric number, name or seat number"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base"
        aria-label="Search allocation list"
      />

      <div className="flex flex-wrap gap-2 text-sm">
        <span className="text-slate-500">Sort by:</span>
        {(
          [
            ["seatNumber", "Seat"],
            ["matricNumber", "Matric No."],
            ["fullName", "Name"],
            ["program", "Program"],
          ] as [SortKey, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSortKey(key)}
            className={`rounded-full px-3 py-1 ${
              sortKey === key
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="text-sm text-slate-500">
        {filtered.length} of {rows.length} students
      </p>

      {/* Mobile: cards. Seat number is the dominant element (FR-VIEW-06). */}
      <ul className="flex flex-col gap-2 sm:hidden">
        {filtered.map((r) => (
          <li key={r.matricNumber}>
            <Link
              href={`/sessions/${examSessionId}/students/${r.studentId}`}
              className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm active:scale-[0.99]"
            >
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-lg bg-slate-900 text-lg font-bold text-white">
                {r.seatNumber}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">{r.fullName}</p>
                <p className="truncate text-sm text-slate-500">
                  {r.matricNumber} · {r.program}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* Desktop/tablet: table. */}
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 sm:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2">Seat</th>
              <th className="px-4 py-2">Matric No.</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Program</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.matricNumber} className="border-t border-slate-100">
                <td className="px-4 py-2 font-semibold text-slate-900">
                  {r.seatNumber}
                </td>
                <td className="px-4 py-2">{r.matricNumber}</td>
                <td className="px-4 py-2">{r.fullName}</td>
                <td className="px-4 py-2">{r.program}</td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/sessions/${examSessionId}/students/${r.studentId}`}
                    className="text-slate-500 underline"
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
        <p className="py-6 text-center text-sm text-slate-500">No matches.</p>
      )}
    </div>
  );
}
