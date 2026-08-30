"use client";

import { useMemo, useState, useTransition } from "react";
import { Spinner } from "@/app/Spinner";
import { deleteStudentAction } from "./actions";

type Row = {
  id: string;
  matricNumber: string;
  fullName: string;
  program: string;
  year: string;
};

type YearGroup = {
  year: string;
  rows: Row[];
};

function groupByYear(rows: Row[]): YearGroup[] {
  const groups = new Map<string, YearGroup>();
  for (const row of rows) {
    let group = groups.get(row.year);
    if (!group) {
      group = { year: row.year, rows: [] };
      groups.set(row.year, group);
    }
    group.rows.push(row);
  }
  return [...groups.values()];
}

export function StudentSearch({ rows }: { rows: Row[] }) {
  const [query, setQuery] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.matricNumber.toLowerCase().includes(q) ||
        r.fullName.toLowerCase().includes(q) ||
        r.program.toLowerCase().includes(q),
    );
  }, [rows, query]);

  const hasQuery = query.trim() !== "";
  const yearGroups = useMemo(() => groupByYear(filtered), [filtered]);

  function handleDelete(id: string) {
    setError(null);
    setDeletingId(id);
    startTransition(async () => {
      const res = await deleteStudentAction(id);
      setDeletingId(null);
      setConfirmingId(null);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        placeholder="Search by name, student ID, or course"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-2xl border-none bg-mist px-4 py-3.5 text-base text-ink focus:outline-none focus:ring-2 focus:ring-coral/40"
        aria-label="Search students"
      />

      <p className="text-sm text-muted">
        {filtered.length} of {rows.length} students
      </p>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {yearGroups.length === 0 && (
        <p className="py-6 text-center text-sm text-muted">No matches.</p>
      )}

      <ul className="flex flex-col gap-3">
        {yearGroups.map((group) => (
          <li key={group.year}>
            <details
              open={hasQuery}
              className="rounded-3xl border border-hairline bg-white shadow-sm"
            >
              <summary className="flex cursor-pointer items-center justify-between px-4 py-4 text-base font-medium text-ink">
                <span>{group.year}</span>
                <span className="text-sm font-normal text-muted">
                  {group.rows.length} student{group.rows.length === 1 ? "" : "s"}
                </span>
              </summary>

              <ul className="flex flex-col gap-2 px-4 pb-4">
                {group.rows.map((s) =>
                  confirmingId === s.id ? (
                    <li
                      key={s.id}
                      className="flex flex-col gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3"
                    >
                      <p className="text-sm text-ink/80">
                        Remove <span className="font-medium">{s.fullName}</span>{" "}
                        from the list? This can&rsquo;t be undone for a
                        student with no seat list history.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmingId(null)}
                          className="flex-1 rounded-full border border-hairline bg-white px-3 py-2 text-sm font-medium text-ink"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === s.id}
                          onClick={() => handleDelete(s.id)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          {deletingId === s.id && <Spinner />}
                          {deletingId === s.id ? "Removing…" : "Yes, remove"}
                        </button>
                      </div>
                    </li>
                  ) : (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-hairline bg-white px-4 py-3 shadow-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">
                          {s.fullName}
                        </p>
                        <p className="truncate text-sm text-muted">
                          {s.matricNumber} · {s.program}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(s.id)}
                        className="flex-none text-sm text-red-600 underline"
                      >
                        Remove
                      </button>
                    </li>
                  ),
                )}
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
