import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateRows, type RawRow } from "../lib/import";

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
    const { validRows, errors } = validateRows([row({})], new Set(), programs);
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
    );
    assert.equal(validRows.length, 0);
    assert.match(errors[0].message, /already registered/i);
  });

  it("flags a matric number duplicated within the same file", () => {
    const rows = [
      row({ rowNumber: 2 }),
      row({ rowNumber: 3, fullName: "Someone Else" }),
    ];
    const { validRows, errors } = validateRows(rows, new Set(), programs);
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
    );
    assert.match(errors[0].message, /invalid year/i);
  });

  it("accepts several year formats", () => {
    for (const year of ["Year 3", "3", "YEAR_3", "year3"]) {
      const { validRows, errors } = validateRows(
        [row({ year, matricNumber: `SIU25SWE${year}` })],
        new Set(),
        programs,
      );
      assert.equal(errors.length, 0, `expected "${year}" to be valid`);
      assert.equal(validRows[0].year, "YEAR_3");
    }
  });

  it("flags an unknown program", () => {
    const { errors } = validateRows(
      [row({ program: "Underwater Basket Weaving" })],
      new Set(),
      programs,
    );
    assert.match(errors[0].message, /unknown program/i);
  });

  it("matches program names case-insensitively", () => {
    const { validRows, errors } = validateRows(
      [row({ program: "sOFTWARE eNGINEERING" })],
      new Set(),
      programs,
    );
    assert.equal(errors.length, 0);
    assert.equal(validRows[0].programName, "Software Engineering");
  });

  it("uppercases matric numbers for consistent matching", () => {
    const { validRows } = validateRows(
      [row({ matricNumber: "siu25swe001" })],
      new Set(),
      programs,
    );
    assert.equal(validRows[0].matricNumber, "SIU25SWE001");
  });
});
