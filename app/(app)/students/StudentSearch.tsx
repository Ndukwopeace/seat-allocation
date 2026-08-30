"use client";

import { useMemo, useState } from "react";

type Row = {
  id: string;
  matricNumber: string;
  fullName: string;
  program: string;
  year: string;
};

export function StudentSearch({ rows }: { rows: Row[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.matricNumber.toLowerCase().includes(q) ||
        r.fullName.toLowerCase().includes(q),
    );
  }, [rows, query]);

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        placeholder="Search by name or matric number"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base"
        aria-label="Search students"
      />

      <p className="text-sm text-slate-500">
        {filtered.length} of {rows.length} students
      </p>

      <ul className="flex flex-col gap-2 sm:hidden">
        {filtered.map((s) => (
          <li
            key={s.id}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <p className="font-medium text-slate-900">{s.fullName}</p>
            <p className="text-sm text-slate-500">
              {s.matricNumber} · {s.program} · {s.year}
            </p>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 sm:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2">Matric No.</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Program</th>
              <th className="px-4 py-2">Year</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{s.matricNumber}</td>
                <td className="px-4 py-2">{s.fullName}</td>
                <td className="px-4 py-2">{s.program}</td>
                <td className="px-4 py-2">{s.year}</td>
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
