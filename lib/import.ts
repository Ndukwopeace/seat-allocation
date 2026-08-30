// No "server-only" marker: parsing/validation logic is pure enough to unit
// test outside a Next.js request (only the DB-touching functions need a
// live Prisma connection, same as lib/allocation.ts and lib/users.ts).

import { Readable } from "node:stream";
import ExcelJS from "exceljs";
import { prisma } from "./prisma";
import { formatYear } from "./format";
import { syncStudentsIntoMatchingSessions } from "./session-roster";
import type { YearGroup } from "@/app/generated/prisma/enums";

export class ImportError extends Error {}

const SUPPORTED_EXTENSIONS = [".csv", ".xlsx"];

const YEAR_BY_DIGIT: Record<string, YearGroup> = {
  "1": "YEAR_1",
  "2": "YEAR_2",
  "3": "YEAR_3",
  "4": "YEAR_4",
  "5": "YEAR_5",
};

// Matches the template columns (matric_number, full_name, program, year)
// case/spacing/punctuation-insensitively, so "Matric Number" or
// "matric-number" both resolve to the same canonical key.
function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const COLUMN_ALIASES: Record<string, "matricNumber" | "fullName" | "program" | "year"> = {
  matricnumber: "matricNumber",
  matric: "matricNumber",
  fullname: "fullName",
  name: "fullName",
  program: "program",
  year: "year",
};

export type RawRow = {
  rowNumber: number; // 1-based spreadsheet row, including the header row offset
  matricNumber: string;
  fullName: string;
  program: string;
  year: string;
};

/** Parses an uploaded .csv or .xlsx file into raw (unvalidated) rows. */
export async function parseSpreadsheet(
  buffer: Buffer,
  filename: string,
): Promise<RawRow[]> {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new ImportError(
      `Unsupported file type "${ext || "unknown"}". Please upload a .csv or .xlsx file.`,
    );
  }

  const workbook = new ExcelJS.Workbook();
  let worksheet: ExcelJS.Worksheet | undefined;

  if (ext === ".csv") {
    worksheet = await workbook.csv.read(Readable.from(buffer));
  } else {
    // exceljs's own .d.ts declares a minimal `Buffer extends ArrayBuffer`
    // shim that doesn't structurally match @types/node's real (generic)
    // Buffer — a type-only mismatch, not a runtime one.
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    worksheet = workbook.worksheets[0];
  }

  if (!worksheet || worksheet.rowCount === 0) {
    throw new ImportError("The file is empty.");
  }

  const headerRow = worksheet.getRow(1);
  const columnByIndex = new Map<number, "matricNumber" | "fullName" | "program" | "year">();
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const key = COLUMN_ALIASES[normalizeHeader(String(cell.value ?? ""))];
    if (key) columnByIndex.set(colNumber, key);
  });

  const missing = (["matricNumber", "fullName", "program", "year"] as const).filter(
    (k) => ![...columnByIndex.values()].includes(k),
  );
  if (missing.length > 0) {
    throw new ImportError(
      `Missing required column(s): ${missing.join(", ")}. Expected matric_number, full_name, program, year.`,
    );
  }

  const rows: RawRow[] = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // header

    const values: Record<string, string> = {
      matricNumber: "",
      fullName: "",
      program: "",
      year: "",
    };
    for (const [colNumber, key] of columnByIndex) {
      const cell = row.getCell(colNumber).value;
      values[key] = cell === null || cell === undefined ? "" : String(cell).trim();
    }

    // A completely blank row (common trailing artifact in spreadsheets) is
    // silently skipped rather than reported as an error row.
    if (!values.matricNumber && !values.fullName && !values.program && !values.year) {
      return;
    }

    rows.push({
      rowNumber,
      matricNumber: values.matricNumber,
      fullName: values.fullName,
      program: values.program,
      year: values.year,
    });
  });

  return rows;
}

export type ValidStudentRow = {
  rowNumber: number;
  matricNumber: string;
  fullName: string;
  programId: string;
  programName: string;
  year: YearGroup;
};

export type RowError = { rowNumber: number; message: string };

export type ValidationResult = {
  totalRows: number;
  validRows: ValidStudentRow[];
  errors: RowError[];
  expectedYear: YearGroup;
};

function parseYear(raw: string): YearGroup | null {
  const digit = raw.replace(/[^0-9]/g, "");
  return YEAR_BY_DIGIT[digit] ?? null;
}

/**
 * Pure validation: given raw rows, the set of matric numbers already
 * registered, the known programs, and the single year this import is for,
 * decides which rows are importable.
 * FR-STU-04: flags duplicate matric numbers (within the file and against
 * the existing registry), missing required fields, invalid year values, and
 * (BR: one file per year) rows whose year doesn't match the selected import
 * year — this keeps a file meant for one year group from silently mixing
 * students into another year if the wrong file gets uploaded.
 */
export function validateRows(
  rows: RawRow[],
  existingMatricNumbers: ReadonlySet<string>,
  programsByName: ReadonlyMap<string, { id: string; name: string }>,
  expectedYear: YearGroup,
): ValidationResult {
  const errors: RowError[] = [];
  const validRows: ValidStudentRow[] = [];
  const seenInFile = new Set<string>();

  for (const row of rows) {
    const matricNumber = row.matricNumber.toUpperCase();

    if (!matricNumber || !row.fullName || !row.program || !row.year) {
      errors.push({ rowNumber: row.rowNumber, message: "Missing required field(s)." });
      continue;
    }

    if (existingMatricNumbers.has(matricNumber)) {
      errors.push({
        rowNumber: row.rowNumber,
        message: `Matric number ${matricNumber} is already registered.`,
      });
      continue;
    }

    if (seenInFile.has(matricNumber)) {
      errors.push({
        rowNumber: row.rowNumber,
        message: `Matric number ${matricNumber} is duplicated in this file.`,
      });
      continue;
    }

    const year = parseYear(row.year);
    if (!year) {
      errors.push({
        rowNumber: row.rowNumber,
        message: `Invalid year "${row.year}" (expected Year 1–5).`,
      });
      continue;
    }

    if (year !== expectedYear) {
      errors.push({
        rowNumber: row.rowNumber,
        message: `This row is ${formatYear(year)}, but you selected ${formatYear(expectedYear)} for this import.`,
      });
      continue;
    }

    const program = programsByName.get(row.program.trim().toLowerCase());
    if (!program) {
      errors.push({
        rowNumber: row.rowNumber,
        message: `Unknown program "${row.program}". Ask an admin to add it first.`,
      });
      continue;
    }

    seenInFile.add(matricNumber);
    validRows.push({
      rowNumber: row.rowNumber,
      matricNumber,
      fullName: row.fullName,
      programId: program.id,
      programName: program.name,
      year,
    });
  }

  return { totalRows: rows.length, validRows, errors, expectedYear };
}

/** I/O wrapper: loads current DB state and runs validateRows against it. */
export async function parseAndValidate(
  buffer: Buffer,
  filename: string,
  expectedYear: YearGroup,
): Promise<ValidationResult> {
  const [rows, existing, programs] = await Promise.all([
    parseSpreadsheet(buffer, filename),
    prisma.student.findMany({ select: { matricNumber: true } }),
    prisma.program.findMany(),
  ]);

  const existingMatricNumbers = new Set(existing.map((s) => s.matricNumber));
  const programsByName = new Map(
    programs.map((p) => [p.name.toLowerCase(), { id: p.id, name: p.name }]),
  );

  return validateRows(rows, existingMatricNumbers, programsByName, expectedYear);
}

/**
 * Commits previously-validated rows. Re-checks matric-number uniqueness
 * against the DB's current state (it may have changed since the preview
 * was shown) and relies on the unique constraint as the final backstop —
 * all rows are inserted atomically, or none are (FR-STU-05).
 */
export async function commitImport(
  rows: ValidStudentRow[],
): Promise<{ imported: number }> {
  if (rows.length === 0) throw new ImportError("No valid rows to import.");

  const existing = await prisma.student.findMany({
    where: { matricNumber: { in: rows.map((r) => r.matricNumber) } },
    select: { matricNumber: true },
  });
  if (existing.length > 0) {
    throw new ImportError(
      `${existing.length} row(s) are no longer importable — their matric number was registered since you previewed this file. Re-upload to refresh the preview.`,
    );
  }

  await prisma.student.createMany({
    data: rows.map((r) => ({
      matricNumber: r.matricNumber,
      fullName: r.fullName,
      programId: r.programId,
      year: r.year,
    })),
  });

  // createMany doesn't return the created rows' generated ids, so fetch them
  // back to sync into any session that already exists for their year.
  const created = await prisma.student.findMany({
    where: { matricNumber: { in: rows.map((r) => r.matricNumber) } },
    select: { id: true, year: true },
  });
  await syncStudentsIntoMatchingSessions(created);

  return { imported: rows.length };
}
