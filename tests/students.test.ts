import assert from "node:assert/strict";
import { beforeEach, after, describe, it } from "node:test";
import { prisma } from "../lib/prisma";
import { deleteStudent } from "../lib/students";
import { generateInitialAllocation } from "../lib/allocation";
import {
  resetDb,
  makeUser,
  makeProgram,
  makeExamSession,
  makeStudents,
} from "./helpers";

describe("deleteStudent", () => {
  beforeEach(async () => {
    await resetDb();
  });

  after(async () => {
    await prisma.$disconnect();
  });

  it("hard-deletes a student with no allocation history", async () => {
    const program = await makeProgram("Business");
    const [student] = await makeStudents(1, program.id, "YEAR_1");

    const result = await deleteStudent(student.id);

    assert.equal(result.archived, false);
    const found = await prisma.student.findUnique({ where: { id: student.id } });
    assert.equal(found, null);
  });

  it("removes an un-allocated student's pending session-roster memberships", async () => {
    const program = await makeProgram("Business");
    const [student] = await makeStudents(1, program.id, "YEAR_1");
    const session = await makeExamSession("YEAR_1"); // seeds the roster

    await deleteStudent(student.id);

    const membership = await prisma.sessionParticipant.findFirst({
      where: { examSessionId: session.id, studentId: student.id },
    });
    assert.equal(membership, null);
  });

  it("archives (not hard-deletes) a student who already has a seat assignment", async () => {
    const admin = await makeUser("ADMIN");
    const program = await makeProgram("Business");
    const students = await makeStudents(3, program.id, "YEAR_1");
    const session = await makeExamSession("YEAR_1");
    await generateInitialAllocation(session.id, { id: admin.id, role: "ADMIN" });

    const target = students[0];
    const result = await deleteStudent(target.id);

    assert.equal(result.archived, true);
    const found = await prisma.student.findUnique({ where: { id: target.id } });
    assert.ok(found);
    assert.ok(found!.archivedAt);

    // Their historical seat assignment is untouched.
    const seatAssignment = await prisma.seatAssignment.findFirst({
      where: { studentId: target.id },
    });
    assert.ok(seatAssignment);
  });

  it("removes an archived student from any pending (not-yet-allocated) roster", async () => {
    const admin = await makeUser("ADMIN");
    const program = await makeProgram("Business");
    const students = await makeStudents(2, program.id, "YEAR_1");
    const sessionA = await makeExamSession("YEAR_1");
    await generateInitialAllocation(sessionA.id, { id: admin.id, role: "ADMIN" });
    const sessionB = await makeExamSession("YEAR_1"); // no allocation yet

    const target = students[0];
    await deleteStudent(target.id); // has history in sessionA -> archived

    const stillOnSessionB = await prisma.sessionParticipant.findFirst({
      where: { examSessionId: sessionB.id, studentId: target.id },
    });
    assert.equal(stillOnSessionB, null);
  });
});
