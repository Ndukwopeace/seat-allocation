import type { Role, YearGroup } from "@/app/generated/prisma/enums";

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  INVIGILATOR: "Exam helper",
};

export function formatRole(role: Role): string {
  return ROLE_LABELS[role];
}

const YEAR_LABELS: Record<YearGroup, string> = {
  YEAR_1: "Year 1",
  YEAR_2: "Year 2",
  YEAR_3: "Year 3",
  YEAR_4: "Year 4",
  YEAR_5: "Year 5",
};

export function formatYear(year: YearGroup): string {
  return YEAR_LABELS[year];
}

export const YEAR_OPTIONS: { value: YearGroup; label: string }[] = (
  Object.keys(YEAR_LABELS) as YearGroup[]
).map((value) => ({ value, label: YEAR_LABELS[value] }));

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** Day-group heading for the sessions list, e.g. "Monday, 31 August 2026". */
export function formatDayHeading(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** Stable, timezone-safe grouping key for a session date, e.g. "2026-08-31". */
export function dayKeyFor(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
