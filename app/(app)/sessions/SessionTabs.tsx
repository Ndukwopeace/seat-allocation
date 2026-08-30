"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type SessionRow = {
  id: string;
  yearLabel: string;
  label: string | null;
  date: string; // pre-formatted
  startTime: string;
  endTime: string;
  studentCount: number;
  version: number;
};

export function SessionTabs({
  upcoming,
  past,
}: {
  upcoming: SessionRow[];
  past: SessionRow[];
}) {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [query, setQuery] = useState("");

  const rows = tab === "upcoming" ? upcoming : past;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.yearLabel.toLowerCase().includes(q) || r.label?.toLowerCase().includes(q),
    );
  }, [rows, query]);

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        placeholder="Search sessions"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base"
        aria-label="Search sessions"
      />

      <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
        {(["upcoming", "past"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`flex-1 rounded-md py-2 text-sm font-medium capitalize ${
              tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            {t} ({t === "upcoming" ? upcoming.length : past.length})
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-3">
        {filtered.length === 0 && (
          <li className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            No {tab} sessions.
          </li>
        )}
        {filtered.map((session) => (
          <li key={session.id}>
            <Link
              href={`/sessions/${session.id}`}
              className="block rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-900">
                  {session.yearLabel}
                  {session.label ? ` — ${session.label}` : ""}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    session.version === 0
                      ? "bg-slate-100 text-slate-600"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {session.version === 0 ? "Not allocated" : `Version ${session.version}`}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {session.date} · {session.startTime}–{session.endTime}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {session.studentCount} registered student
                {session.studentCount === 1 ? "" : "s"}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
