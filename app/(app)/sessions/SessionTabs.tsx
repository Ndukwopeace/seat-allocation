"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type SessionRow = {
  id: string;
  yearLabel: string;
  label: string | null;
  dayKey: string;
  dayHeading: string;
  startTime: string;
  endTime: string;
  studentCount: number;
  version: number;
};

type DayGroup = {
  dayKey: string;
  dayHeading: string;
  sessions: SessionRow[];
};

function groupByDay(rows: SessionRow[]): DayGroup[] {
  const groups = new Map<string, DayGroup>();
  for (const row of rows) {
    let group = groups.get(row.dayKey);
    if (!group) {
      group = { dayKey: row.dayKey, dayHeading: row.dayHeading, sessions: [] };
      groups.set(row.dayKey, group);
    }
    group.sessions.push(row);
  }
  return [...groups.values()];
}

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
      (r) =>
        r.yearLabel.toLowerCase().includes(q) ||
        r.label?.toLowerCase().includes(q) ||
        r.dayHeading.toLowerCase().includes(q),
    );
  }, [rows, query]);

  // A search implies "jump to the result" — keep every matching day expanded
  // instead of making the user open it after already narrowing the list.
  const hasQuery = query.trim() !== "";
  const dayGroups = useMemo(() => groupByDay(filtered), [filtered]);

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        placeholder="Search by day, year, or label"
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
        {dayGroups.length === 0 && (
          <li className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            No {tab} sessions.
          </li>
        )}
        {dayGroups.map((group) => (
          <li key={group.dayKey}>
            <details
              open={hasQuery}
              className="rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <summary className="flex cursor-pointer items-center justify-between px-4 py-4 text-base font-medium text-slate-900">
                <span>{group.dayHeading}</span>
                <span className="text-sm font-normal text-slate-500">
                  {group.sessions.length} session
                  {group.sessions.length === 1 ? "" : "s"}
                </span>
              </summary>
              <ul className="flex flex-col gap-2 px-4 pb-4">
                {group.sessions.map((session) => (
                  <li key={session.id}>
                    <Link
                      href={`/sessions/${session.id}`}
                      className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 active:scale-[0.99]"
                    >
                      <div>
                        <span className="font-medium text-slate-900">
                          {session.yearLabel}
                          {session.label ? ` — ${session.label}` : ""}
                        </span>
                        <p className="mt-1 text-sm text-slate-500">
                          {session.startTime}–{session.endTime} ·{" "}
                          {session.studentCount} registered student
                          {session.studentCount === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span
                        className={`flex-none rounded-full px-2 py-0.5 text-xs font-medium ${
                          session.version === 0
                            ? "bg-slate-100 text-slate-600"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {session.version === 0
                          ? "Not allocated"
                          : `Version ${session.version}`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
