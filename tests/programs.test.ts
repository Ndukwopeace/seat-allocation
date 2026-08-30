import assert from "node:assert/strict";
import { beforeEach, after, describe, it } from "node:test";
import { prisma } from "../lib/prisma";
import { createProgram, DuplicateProgramError } from "../lib/programs";
import { resetDb } from "./helpers";

describe("program creation", () => {
  beforeEach(async () => {
    await resetDb();
  });

  after(async () => {
    await prisma.$disconnect();
  });

  it("creates a program", async () => {
    const program = await createProgram("Software Engineering");
    assert.equal(program.name, "Software Engineering");
  });

  it("trims surrounding whitespace", async () => {
    const program = await createProgram("  Business  ");
    assert.equal(program.name, "Business");
  });

  it("rejects a duplicate name, case-insensitively", async () => {
    await createProgram("Cybersecurity");

    await assert.rejects(
      () => createProgram("CYBERSECURITY"),
      DuplicateProgramError,
    );

    const count = await prisma.program.count();
    assert.equal(count, 1);
  });
});
