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

type YearGroup = {
  year: string;
  yearLabel: string;
  sessions: SessionRow[];
};

type DayGroup = {
  dayKey: string;
  dayHeading: string;
  examCount: number;
  yearGroups: YearGroup[];
};

// Three levels: day -> year -> that year's exams, sorted by start time.
// A flat day -> exams list read as scattered once a day had more than one
// year's exams on it (Year 1 and Year 2 interleaved by whatever order the
// DB happened to return) — grouping by year first, so a day expands into
// "Year 1 / Year 2" and each year expands into its own exam times, keeps
// same-day exams from different years from ever mixing in the same list.
function groupByDay(rows: SessionRow[]): DayGroup[] {
  const days = new Map<string, { dayHeading: string; years: Map<string, YearGroup> }>();

  for (const row of rows) {
    let day = days.get(row.dayKey);
    if (!day) {
      day = { dayHeading: row.dayHeading, years: new Map() };
      days.set(row.dayKey, day);
    }
    let yearGroup = day.years.get(row.year);
    if (!yearGroup) {
      yearGroup = { year: row.year, yearLabel: row.yearLabel, sessions: [] };
      day.years.set(row.year, yearGroup);
    }
    yearGroup.sessions.push(row);
  }

  return [...days.entries()].map(([dayKey, day]) => {
    const yearGroups = [...day.years.values()].sort((a, b) => a.year.localeCompare(b.year));
    for (const yearGroup of yearGroups) {
      yearGroup.sessions.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return {
      dayKey,
      dayHeading: day.dayHeading,
      examCount: yearGroups.reduce((sum, yg) => sum + yg.sessions.length, 0),
      yearGroups,
    };
  });
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

  // A search implies "jump to the result" — keep every matching day (and
  // the years inside it) expanded instead of making the user open each
  // level after already narrowing the list.
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
        {dayGroups.map((day) => (
          <li key={day.dayKey}>
            <details
              open={hasQuery}
              className="rounded-3xl border border-hairline bg-white shadow-sm"
            >
              <summary className="flex cursor-pointer items-center justify-between px-4 py-4 text-base font-medium text-ink">
                <span>{day.dayHeading}</span>
                <span className="text-sm font-normal text-muted">
                  {day.examCount} exam{day.examCount === 1 ? "" : "s"}
                </span>
              </summary>
              <ul className="flex flex-col gap-2 px-4 pb-4">
                {day.yearGroups.map((yearGroup) => (
                  <li key={yearGroup.year}>
                    <details
                      open={hasQuery}
                      className="rounded-2xl border border-hairline"
                    >
                      <summary className="flex cursor-pointer items-center justify-between px-3 py-2.5 text-sm font-medium text-ink">
                        <span>{yearGroup.yearLabel}</span>
                        <span className="text-xs font-normal text-muted">
                          {yearGroup.sessions.length} exam
                          {yearGroup.sessions.length === 1 ? "" : "s"}
                        </span>
                      </summary>
                      <ul className="flex flex-col gap-2 px-2 pb-2">
                        {yearGroup.sessions.map((session) => (
                          <li key={session.id}>
                            <Link
                              href={`/sessions/${session.id}`}
                              className="flex items-center justify-between rounded-xl border border-hairline px-3 py-2.5 active:scale-[0.98]"
                            >
                              <div>
                                <span className="text-sm font-medium text-ink">
                                  {session.startTime}–{session.endTime}
                                  {session.label ? ` — ${session.label}` : ""}
                                </span>
                                <p className="mt-0.5 text-xs text-muted">
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
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
