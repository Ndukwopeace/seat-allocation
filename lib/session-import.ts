// No "server-only" marker: kept consistent with lib/import.ts — parsing and
// validation are pure enough to unit test without a live Prisma connection.

import { Readable } from "node:stream";
import ExcelJS from "exceljs";
import { prisma } from "./prisma";
import { formatYear, dayKeyFor } from "./format";
import { seedInitialParticipants } from "./session-roster";
import type { YearGroup } from "@/app/generated/prisma/enums";

export class ImportSessionError extends Error {}

const SUPPORTED_EXTENSIONS = [".csv", ".xlsx"];

const YEAR_BY_DIGIT: Record<string, YearGroup> = {
  "1": "YEAR_1",
  "2": "YEAR_2",
  "3": "YEAR_3",
  "4": "YEAR_4",
  "5": "YEAR_5",
};

function parseYearGroup(raw: string): YearGroup | null {
  const digit = raw.replace(/[^0-9]/g, "");
  return YEAR_BY_DIGIT[digit] ?? null;
}

// Matches the template columns (year, date, start_time, end_time, label)
// case/spacing/punctuation-insensitively, so "Start Time" or "start-time"
// both resolve to the same canonical key.
function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

type ColumnKey = "year" | "date" | "startTime" | "endTime" | "label";

const COLUMN_ALIASES: Record<string, ColumnKey> = {
  year: "year",
  date: "date",
  starttime: "startTime",
  start: "startTime",
  endtime: "endTime",
  end: "endTime",
  label: "label",
};

export type RawSessionRow = {
  rowNumber: number; // 1-based spreadsheet row, including the header row offset
  year: string;
  date: string | Date;
  startTime: string | Date;
  endTime: string | Date;
  label: string;
};

/** Parses an uploaded .csv or .xlsx file into raw (unvalidated) rows. */
export async function parseSessionSpreadsheet(
  buffer: Buffer,
  filename: string,
): Promise<RawSessionRow[]> {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new ImportSessionError(
      `Unsupported file type "${ext || "unknown"}". Please upload a .csv or .xlsx file.`,
    );
  }

  const workbook = new ExcelJS.Workbook();
  let worksheet: ExcelJS.Worksheet | undefined;

  if (ext === ".csv") {
    worksheet = await workbook.csv.read(Readable.from(buffer));
  } else {
    // See lib/import.ts for why this cast is needed (exceljs's own .d.ts
    // ships a minimal Buffer shim that doesn't structurally match
    // @types/node's real Buffer — a type-only mismatch, not a runtime one).
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    worksheet = workbook.worksheets[0];
  }

  if (!worksheet || worksheet.rowCount === 0) {
    throw new ImportSessionError("The file is empty.");
  }

  const headerRow = worksheet.getRow(1);
  const columnByIndex = new Map<number, ColumnKey>();
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const key = COLUMN_ALIASES[normalizeHeader(String(cell.value ?? ""))];
    if (key) columnByIndex.set(colNumber, key);
  });

  const missing = (["year", "date", "startTime", "endTime"] as const).filter(
    (k) => ![...columnByIndex.values()].includes(k),
  );
  if (missing.length > 0) {
    throw new ImportSessionError(
      `Missing required column(s): ${missing.join(", ")}. Expected year, date, start_time, end_time.`,
    );
  }

  const rows: RawSessionRow[] = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // header

    const values = {
      year: "",
      date: "" as string | Date,
      startTime: "" as string | Date,
      endTime: "" as string | Date,
      label: "",
    };
    for (const [colNumber, key] of columnByIndex) {
      const raw = row.getCell(colNumber).value;
      if (key === "date" || key === "startTime" || key === "endTime") {
        // A date/time-formatted Excel cell arrives as a real Date, not a
        // string — keep it as-is so normalizeDateValue/normalizeTimeValue
        // can read its components directly instead of parsing a stringified
        // (and often locale-mangled) representation of it.
        values[key] = raw instanceof Date ? raw : raw === null || raw === undefined ? "" : String(raw).trim();
      } else {
        values[key] = raw === null || raw === undefined ? "" : String(raw).trim();
      }
    }

    // A completely blank row (common trailing artifact in spreadsheets) is
    // silently skipped rather than reported as an error row.
    if (!values.year && !values.date && !values.startTime && !values.endTime && !values.label) {
      return;
    }

    rows.push({ rowNumber, ...values });
  });

  return rows;
}

function normalizeDateValue(raw: string | Date): string | null {
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return null;
    const y = raw.getUTCFullYear();
    const m = String(raw.getUTCMonth() + 1).padStart(2, "0");
    const d = String(raw.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const match = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, y, mo, d] = match;
  const parsed = new Date(`${y}-${mo}-${d}T00:00:00Z`);
  const valid =
    !Number.isNaN(parsed.getTime()) &&
    parsed.getUTCFullYear() === Number(y) &&
    parsed.getUTCMonth() + 1 === Number(mo) &&
    parsed.getUTCDate() === Number(d);
  return valid ? `${y}-${mo}-${d}` : null;
}

function normalizeTimeValue(raw: string | Date): string | null {
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return null;
    return `${String(raw.getUTCHours()).padStart(2, "0")}:${String(raw.getUTCMinutes()).padStart(2, "0")}`;
  }

  const trimmed = raw.trim();

  // 24-hour "HH:MM" or "H:MM"
  let match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const h = Number(match[1]);
    const min = Number(match[2]);
    if (h < 0 || h > 23 || min < 0 || min > 59) return null;
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }

  // 12-hour "H:MM AM/PM" — common when a timetable is typed in by hand.
  match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) {
    let h = Number(match[1]);
    const min = Number(match[2]);
    if (h < 1 || h > 12 || min < 0 || min > 59) return null;
    const isPM = match[3].toUpperCase() === "PM";
    h = h === 12 ? (isPM ? 12 : 0) : isPM ? h + 12 : h;
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }

  return null;
}

/** Recovers the "HH:MM" local time an ExamSession's startTime was created
 * from — mirrors how createExamSession builds it (`new Date(`${date}T${time}:00`)`,
 * a timezone-less string, which the spec interprets as local time). */
function localTimeKey(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function sessionKey(year: YearGroup | string, date: string, startTime: string): string {
  return `${year}|${date}|${startTime}`;
}

export type ValidSessionRow = {
  rowNumber: number;
  year: YearGroup;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM, 24-hour
  endTime: string; // HH:MM, 24-hour
  label: string | null;
};

export type SessionRowError = { rowNumber: number; message: string };

export type SessionValidationResult = {
  totalRows: number;
  validRows: ValidSessionRow[];
  errors: SessionRowError[];
};

/**
 * Pure validation: given raw rows and the set of (year, date, start time)
 * keys already in use, decides which rows are importable. Unlike student
 * import there's no "one file per year" restriction — a single timetable
 * routinely covers every year at once, and each row already states its own
 * year unambiguously.
 */
export function validateSessionRows(
  rows: RawSessionRow[],
  existingKeys: ReadonlySet<string>,
): SessionValidationResult {
  const errors: SessionRowError[] = [];
  const validRows: ValidSessionRow[] = [];
  const seenInFile = new Set<string>();

  for (const row of rows) {
    if (!row.year || !row.date || !row.startTime || !row.endTime) {
      errors.push({ rowNumber: row.rowNumber, message: "Missing required field(s)." });
      continue;
    }

    const year = parseYearGroup(row.year);
    if (!year) {
      errors.push({
        rowNumber: row.rowNumber,
        message: `Invalid year "${row.year}" (expected Year 1–5).`,
      });
      continue;
    }

    const date = normalizeDateValue(row.date);
    if (!date) {
      errors.push({
        rowNumber: row.rowNumber,
        message: `Invalid date "${row.date}" (expected YYYY-MM-DD).`,
      });
      continue;
    }

    const startTime = normalizeTimeValue(row.startTime);
    if (!startTime) {
      errors.push({
        rowNumber: row.rowNumber,
        message: `Invalid start time "${row.startTime}" (expected 24-hour HH:MM).`,
      });
      continue;
    }

    const endTime = normalizeTimeValue(row.endTime);
    if (!endTime) {
      errors.push({
        rowNumber: row.rowNumber,
        message: `Invalid end time "${row.endTime}" (expected 24-hour HH:MM).`,
      });
      continue;
    }

    if (endTime <= startTime) {
      errors.push({ rowNumber: row.rowNumber, message: "End time must be after start time." });
      continue;
    }

    const key = sessionKey(year, date, startTime);

    if (existingKeys.has(key)) {
      errors.push({
        rowNumber: row.rowNumber,
        message: `An exam for ${formatYear(year)} on ${date} at ${startTime} already exists.`,
      });
      continue;
    }

    if (seenInFile.has(key)) {
      errors.push({
        rowNumber: row.rowNumber,
        message: "Duplicated in this file (same year, date, and start time).",
      });
      continue;
    }

    seenInFile.add(key);
    validRows.push({ rowNumber: row.rowNumber, year, date, startTime, endTime, label: row.label || null });
  }

  return { totalRows: rows.length, validRows, errors };
}

/** I/O wrapper: loads current DB state and runs validateSessionRows against it. */
export async function parseAndValidateSessions(
  buffer: Buffer,
  filename: string,
): Promise<SessionValidationResult> {
  const [rows, existing] = await Promise.all([
    parseSessionSpreadsheet(buffer, filename),
    prisma.examSession.findMany({ select: { year: true, date: true, startTime: true } }),
  ]);

  const existingKeys = new Set(
    existing.map((s) => sessionKey(s.year, dayKeyFor(s.date), localTimeKey(s.startTime))),
  );

  return validateSessionRows(rows, existingKeys);
}

/**
 * Commits previously-validated rows one at a time — mirroring how a single
 * exam is created via createExamSession (create, then seed its roster from
 * the matching year cohort), just repeated per row rather than wrapped in
 * one all-or-nothing transaction. Re-checks for a since-created clash
 * against each row before starting, since the preview may have gone stale.
 */
export async function commitSessionImport(
  rows: ValidSessionRow[],
): Promise<{ imported: number }> {
  if (rows.length === 0) throw new ImportSessionError("No valid rows to import.");

  const existing = await prisma.examSession.findMany({
    select: { year: true, date: true, startTime: true },
  });
  const existingKeys = new Set(
    existing.map((s) => sessionKey(s.year, dayKeyFor(s.date), localTimeKey(s.startTime))),
  );
  const stale = rows.filter((r) => existingKeys.has(sessionKey(r.year, r.date, r.startTime)));
  if (stale.length > 0) {
    throw new ImportSessionError(
      `${stale.length} row(s) are no longer importable — a matching exam was created since you previewed this file. Re-upload to refresh the preview.`,
    );
  }

  let imported = 0;
  for (const row of rows) {
    const session = await prisma.examSession.create({
      data: {
        year: row.year,
        label: row.label,
        date: new Date(row.date),
        startTime: new Date(`${row.date}T${row.startTime}:00`),
        endTime: new Date(`${row.date}T${row.endTime}:00`),
      },
    });
    await seedInitialParticipants(session.id, row.year);
    imported++;
  }

  return { imported };
}
