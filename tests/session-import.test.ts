import assert from "node:assert/strict";
import { beforeEach, after, describe, it } from "node:test";
import {
  validateSessionRows,
  commitSessionImport,
  type RawSessionRow,
} from "../lib/session-import";
import { prisma } from "../lib/prisma";
import { resetDb, makeStudents, makeProgram } from "./helpers";

function row(overrides: Partial<RawSessionRow>): RawSessionRow {
  return {
    rowNumber: 2,
    year: "Year 1",
    date: "2026-08-31",
    startTime: "08:00",
    endTime: "10:00",
    label: "",
    ...overrides,
  };
}

describe("validateSessionRows", () => {
  it("accepts a well-formed row", () => {
    const { validRows, errors } = validateSessionRows([row({})], new Set());
    assert.equal(errors.length, 0);
    assert.equal(validRows.length, 1);
    assert.equal(validRows[0].year, "YEAR_1");
    assert.equal(validRows[0].date, "2026-08-31");
    assert.equal(validRows[0].startTime, "08:00");
    assert.equal(validRows[0].endTime, "10:00");
    assert.equal(validRows[0].label, null);
  });

  it("flags missing required fields", () => {
    const { validRows, errors } = validateSessionRows([row({ date: "" })], new Set());
    assert.equal(validRows.length, 0);
    assert.match(errors[0].message, /missing required/i);
  });

  it("accepts several year formats", () => {
    for (const year of ["Year 3", "3", "YEAR_3", "year3"]) {
      const { validRows, errors } = validateSessionRows([row({ year })], new Set());
      assert.equal(errors.length, 0, `expected "${year}" to be valid`);
      assert.equal(validRows[0].year, "YEAR_3");
    }
  });

  it("flags an invalid year", () => {
    const { errors } = validateSessionRows([row({ year: "Year 9" })], new Set());
    assert.match(errors[0].message, /invalid year/i);
  });

  it("flags an invalid date", () => {
    const { errors } = validateSessionRows([row({ date: "31/08/2026" })], new Set());
    assert.match(errors[0].message, /invalid date/i);
  });

  it("accepts a real Date object for date and time cells (as Excel produces)", () => {
    const { validRows, errors } = validateSessionRows(
      [
        row({
          date: new Date("2026-08-31T00:00:00Z"),
          startTime: new Date("1899-12-30T08:00:00Z"),
          endTime: new Date("1899-12-30T10:00:00Z"),
        }),
      ],
      new Set(),
    );
    assert.equal(errors.length, 0);
    assert.equal(validRows[0].date, "2026-08-31");
    assert.equal(validRows[0].startTime, "08:00");
    assert.equal(validRows[0].endTime, "10:00");
  });

  it("accepts a 12-hour time with AM/PM", () => {
    const { validRows, errors } = validateSessionRows(
      [row({ startTime: "1:00 PM", endTime: "3:30 PM" })],
      new Set(),
    );
    assert.equal(errors.length, 0);
    assert.equal(validRows[0].startTime, "13:00");
    assert.equal(validRows[0].endTime, "15:30");
  });

  it("flags an invalid time", () => {
    const { errors } = validateSessionRows([row({ startTime: "25:00" })], new Set());
    assert.match(errors[0].message, /invalid start time/i);
  });

  it("flags an end time not after the start time", () => {
    const { errors } = validateSessionRows(
      [row({ startTime: "10:00", endTime: "09:00" })],
      new Set(),
    );
    assert.match(errors[0].message, /end time must be after/i);
  });

  it("flags a row clashing with an exam that already exists", () => {
    const { validRows, errors } = validateSessionRows(
      [row({})],
      new Set(["YEAR_1|2026-08-31|08:00"]),
    );
    assert.equal(validRows.length, 0);
    assert.match(errors[0].message, /already exists/i);
  });

  it("flags a row duplicated within the same file", () => {
    const rows = [row({ rowNumber: 2 }), row({ rowNumber: 3, label: "Retake slot" })];
    const { validRows, errors } = validateSessionRows(rows, new Set());
    assert.equal(validRows.length, 1);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].rowNumber, 3);
    assert.match(errors[0].message, /duplicated in this file/i);
  });

  it("does not flag the same date/time for a different year as a clash", () => {
    const { validRows, errors } = validateSessionRows(
      [row({ year: "Year 2" })],
      new Set(["YEAR_1|2026-08-31|08:00"]),
    );
    assert.equal(errors.length, 0);
    assert.equal(validRows.length, 1);
  });
});

describe("commitSessionImport", () => {
  beforeEach(async () => {
    await resetDb();
  });

  after(async () => {
    await prisma.$disconnect();
  });

  it("creates an exam session per row and seeds its roster from the matching year cohort", async () => {
    const program = await makeProgram("Software Engineering");
    const year1Students = await makeStudents(2, program.id, "YEAR_1");
    await makeStudents(1, program.id, "YEAR_2");

    const { imported } = await commitSessionImport([
      {
        rowNumber: 2,
        year: "YEAR_1",
        date: "2026-08-31",
        startTime: "08:00",
        endTime: "10:00",
        label: "Trimester 4 Finals",
      },
      {
        rowNumber: 3,
        year: "YEAR_2",
        date: "2026-08-31",
        startTime: "13:00",
        endTime: "15:30",
        label: null,
      },
    ]);
    assert.equal(imported, 2);

    const sessions = await prisma.examSession.findMany({ orderBy: { year: "asc" } });
    assert.equal(sessions.length, 2);

    const year1Session = sessions.find((s) => s.year === "YEAR_1")!;
    assert.equal(year1Session.label, "Trimester 4 Finals");
    const participants = await prisma.sessionParticipant.findMany({
      where: { examSessionId: year1Session.id },
    });
    assert.equal(participants.length, year1Students.length);
  });

  it("rejects a row that now clashes with an exam created since the preview", async () => {
    await commitSessionImport([
      {
        rowNumber: 2,
        year: "YEAR_1",
        date: "2026-08-31",
        startTime: "08:00",
        endTime: "10:00",
        label: null,
      },
    ]);

    await assert.rejects(
      () =>
        commitSessionImport([
          {
            rowNumber: 2,
            year: "YEAR_1",
            date: "2026-08-31",
            startTime: "08:00",
            endTime: "10:00",
            label: null,
          },
        ]),
      /no longer importable/i,
    );
  });
});
