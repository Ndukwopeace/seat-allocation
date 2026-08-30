import assert from "node:assert/strict";
import { beforeEach, after, describe, it } from "node:test";
import { validateRows, commitImport, type RawRow } from "../lib/import";
import { prisma } from "../lib/prisma";
import { resetDb, makeProgram, makeExamSession } from "./helpers";

const programs = new Map([
  ["software engineering", { id: "prog-swe", name: "Software Engineering" }],
  ["business", { id: "prog-bus", name: "Business" }],
]);

function row(overrides: Partial<RawRow>): RawRow {
  return {
    rowNumber: 2,
    matricNumber: "SIU25SWE001",
    fullName: "John Doe",
    program: "Software Engineering",
    year: "Year 1",
    ...overrides,
  };
}

describe("validateRows", () => {
  it("accepts a well-formed row", () => {
    const { validRows, errors } = validateRows(
      [row({})],
      new Set(),
      programs,
      "YEAR_1",
    );
    assert.equal(errors.length, 0);
    assert.equal(validRows.length, 1);
    assert.equal(validRows[0].matricNumber, "SIU25SWE001");
    assert.equal(validRows[0].year, "YEAR_1");
    assert.equal(validRows[0].programId, "prog-swe");
  });

  it("flags missing required fields", () => {
    const { validRows, errors } = validateRows(
      [row({ fullName: "" })],
      new Set(),
      programs,
      "YEAR_1",
    );
    assert.equal(validRows.length, 0);
    assert.equal(errors.length, 1);
    assert.match(errors[0].message, /missing required/i);
  });

  it("flags a matric number already registered", () => {
    const { validRows, errors } = validateRows(
      [row({})],
      new Set(["SIU25SWE001"]),
      programs,
      "YEAR_1",
    );
    assert.equal(validRows.length, 0);
    assert.match(errors[0].message, /already registered/i);
  });

  it("flags a matric number duplicated within the same file", () => {
    const rows = [
      row({ rowNumber: 2 }),
      row({ rowNumber: 3, fullName: "Someone Else" }),
    ];
    const { validRows, errors } = validateRows(rows, new Set(), programs, "YEAR_1");
    assert.equal(validRows.length, 1);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].rowNumber, 3);
    assert.match(errors[0].message, /duplicated in this file/i);
  });

  it("flags an invalid year", () => {
    const { errors } = validateRows(
      [row({ year: "Year 9" })],
      new Set(),
      programs,
      "YEAR_1",
    );
    assert.match(errors[0].message, /invalid year/i);
  });

  it("accepts several year formats, all matching the selected import year", () => {
    for (const year of ["Year 3", "3", "YEAR_3", "year3"]) {
      const { validRows, errors } = validateRows(
        [row({ year, matricNumber: `SIU25SWE${year}` })],
        new Set(),
        programs,
        "YEAR_3",
      );
      assert.equal(errors.length, 0, `expected "${year}" to be valid`);
      assert.equal(validRows[0].year, "YEAR_3");
    }
  });

  it("flags a row whose year doesn't match the selected import year", () => {
    const { validRows, errors } = validateRows(
      [row({ year: "Year 2" })],
      new Set(),
      programs,
      "YEAR_1",
    );
    assert.equal(validRows.length, 0);
    assert.equal(errors.length, 1);
    assert.match(errors[0].message, /Year 2.*Year 1/);
  });

  it("flags an unknown program", () => {
    const { errors } = validateRows(
      [row({ program: "Underwater Basket Weaving" })],
      new Set(),
      programs,
      "YEAR_1",
    );
    assert.match(errors[0].message, /unknown program/i);
  });

  it("matches program names case-insensitively", () => {
    const { validRows, errors } = validateRows(
      [row({ program: "sOFTWARE eNGINEERING" })],
      new Set(),
      programs,
      "YEAR_1",
    );
    assert.equal(errors.length, 0);
    assert.equal(validRows[0].programName, "Software Engineering");
  });

  it("uppercases matric numbers for consistent matching", () => {
    const { validRows } = validateRows(
      [row({ matricNumber: "siu25swe001" })],
      new Set(),
      programs,
      "YEAR_1",
    );
    assert.equal(validRows[0].matricNumber, "SIU25SWE001");
  });
});

describe("commitImport", () => {
  beforeEach(async () => {
    await resetDb();
  });

  after(async () => {
    await prisma.$disconnect();
  });

  it("adds newly-imported students to any existing session matching their year", async () => {
    const program = await makeProgram("Software Engineering");
    const sessionYear1 = await makeExamSession("YEAR_1");
    const sessionYear2 = await makeExamSession("YEAR_2");

    const { imported } = await commitImport([
      {
        rowNumber: 2,
        matricNumber: "SIU25SWE100",
        fullName: "New Student",
        programId: program.id,
        programName: program.name,
        year: "YEAR_1",
      },
    ]);
    assert.equal(imported, 1);

    const student = await prisma.student.findUniqueOrThrow({
      where: { matricNumber: "SIU25SWE100" },
    });
    const onYear1 = await prisma.sessionParticipant.findFirst({
      where: { examSessionId: sessionYear1.id, studentId: student.id },
    });
    const onYear2 = await prisma.sessionParticipant.findFirst({
      where: { examSessionId: sessionYear2.id, studentId: student.id },
    });
    assert.ok(onYear1, "added to the existing Year 1 session");
    assert.equal(onYear2, null, "not added to the Year 2 session");
  });
});
