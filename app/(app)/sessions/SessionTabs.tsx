"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type SessionRow = {
  id: string;
  year: string;
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

// Groups same-day exams together and orders them by year, then by start
// time within that year — otherwise same-day exams across different years
// come back in whatever order the DB happens to return them in, which reads
// as scattered rather than organized (e.g. Year 1 and Year 2 interleaved on
// the same Monday).
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
  for (const group of groups.values()) {
    group.sessions.sort(
      (a, b) => a.year.localeCompare(b.year) || a.startTime.localeCompare(b.startTime),
    );
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
  // Upcoming reads soonest-day-first; past reads most-recent-day-first —
  // sorted explicitly here rather than relying on the incoming rows' order,
  // since that order is unrelated to how days should be grouped and sorted.
  const dayGroups = useMemo(() => {
    const groups = groupByDay(filtered);
    groups.sort((a, b) =>
      tab === "upcoming" ? a.dayKey.localeCompare(b.dayKey) : b.dayKey.localeCompare(a.dayKey),
    );
    return groups;
  }, [filtered, tab]);

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        placeholder="Search by day, year, or label"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-2xl border-none bg-mist px-4 py-3.5 text-base text-ink focus:outline-none focus:ring-2 focus:ring-coral/40"
        aria-label="Search exams"
      />

      <div className="flex gap-1 rounded-full bg-mist p-1">
        {(["upcoming", "past"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`flex-1 rounded-full py-2 text-sm font-medium capitalize ${
              tab === t ? "bg-white text-ink shadow-sm" : "text-muted"
            }`}
          >
            {t} ({t === "upcoming" ? upcoming.length : past.length})
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-3">
        {dayGroups.length === 0 && (
          <li className="rounded-2xl border border-dashed border-hairline px-4 py-6 text-center text-sm text-muted">
            No {tab} exams.
          </li>
        )}
        {dayGroups.map((group) => (
          <li key={group.dayKey}>
            <details
              open={hasQuery}
              className="rounded-3xl border border-hairline bg-white shadow-sm"
            >
              <summary className="flex cursor-pointer items-center justify-between px-4 py-4 text-base font-medium text-ink">
                <span>{group.dayHeading}</span>
                <span className="text-sm font-normal text-muted">
                  {group.sessions.length} exam
                  {group.sessions.length === 1 ? "" : "s"}
                </span>
              </summary>
              <ul className="flex flex-col gap-2 px-4 pb-4">
                {group.sessions.map((session) => (
                  <li key={session.id}>
                    <Link
                      href={`/sessions/${session.id}`}
                      className="flex items-center justify-between rounded-2xl border border-hairline px-4 py-3 active:scale-[0.98]"
                    >
                      <div>
                        <span className="font-medium text-ink">
                          {session.yearLabel}
                          {session.label ? ` — ${session.label}` : ""}
                        </span>
                        <p className="mt-1 text-sm text-muted">
                          {session.startTime}–{session.endTime} ·{" "}
                          {session.studentCount} student
                          {session.studentCount === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span
                        className={`flex-none rounded-full px-2 py-0.5 text-xs font-medium ${
                          session.version === 0
                            ? "bg-mist text-muted"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {session.version === 0
                          ? "No seats yet"
                          : `Ready (v${session.version})`}
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
