import assert from "node:assert/strict";
import { beforeEach, after, describe, it } from "node:test";
import { prisma } from "../lib/prisma";
import { deleteExamSession, SessionHasAllocationError, SessionNotFoundError } from "../lib/sessions";
import { deleteAllocationHistory, generateInitialAllocation, getRegenerationStatus } from "../lib/allocation";
import {
  resetDb,
  makeUser,
  makeProgram,
  makeExamSession,
  makeStudents,
} from "./helpers";

describe("deleteExamSession", () => {
  beforeEach(async () => {
    await resetDb();
  });

  after(async () => {
    await prisma.$disconnect();
  });

  it("deletes a session with no allocation history", async () => {
    const session = await makeExamSession("YEAR_1");

    await deleteExamSession(session.id);

    const found = await prisma.examSession.findUnique({ where: { id: session.id } });
    assert.equal(found, null);
  });

  it("removes the session's roster memberships along with it", async () => {
    const program = await makeProgram("Business");
    await makeStudents(3, program.id, "YEAR_1");
    const session = await makeExamSession("YEAR_1"); // seeds 3 participants

    await deleteExamSession(session.id);

    const remaining = await prisma.sessionParticipant.count({
      where: { examSessionId: session.id },
    });
    assert.equal(remaining, 0);
  });

  it("refuses to delete a session that already has allocation history", async () => {
    const admin = await makeUser("ADMIN");
    const program = await makeProgram("Business");
    await makeStudents(3, program.id, "YEAR_1");
    const session = await makeExamSession("YEAR_1");
    await generateInitialAllocation(session.id, { id: admin.id, role: "ADMIN" });

    await assert.rejects(() => deleteExamSession(session.id), SessionHasAllocationError);

    const found = await prisma.examSession.findUnique({ where: { id: session.id } });
    assert.ok(found, "session was not deleted");
  });

  it("rejects deleting a session that doesn't exist", async () => {
    await assert.rejects(() => deleteExamSession("nonexistent-id"), SessionNotFoundError);
  });
});

describe("deleteAllocationHistory", () => {
  beforeEach(async () => {
    await resetDb();
  });

  after(async () => {
    await prisma.$disconnect();
  });

  it("wipes every allocation version, seat assignment, and audit entry, keeping the session", async () => {
    const admin = await makeUser("ADMIN");
    const program = await makeProgram("Business");
    await makeStudents(5, program.id, "YEAR_1");
    const session = await makeExamSession("YEAR_1");
    await generateInitialAllocation(session.id, { id: admin.id, role: "ADMIN" });
    await deleteAllocationHistory(session.id);

    const [allocations, seatAssignments, auditLogs, sessionStillThere] = await Promise.all([
      prisma.allocation.count({ where: { examSessionId: session.id } }),
      prisma.seatAssignment.count({
        where: { allocation: { examSessionId: session.id } },
      }),
      prisma.auditLog.count({ where: { examSessionId: session.id } }),
      prisma.examSession.findUnique({ where: { id: session.id } }),
    ]);

    assert.equal(allocations, 0);
    assert.equal(seatAssignments, 0);
    assert.equal(auditLogs, 0);
    assert.ok(sessionStillThere, "session itself was not deleted");
  });

  it("resets the invigilator's regeneration allowance since the used-regen record is gone", async () => {
    const invigilator = await makeUser("INVIGILATOR");
    const program = await makeProgram("Business");
    await makeStudents(4, program.id, "YEAR_1");
    const session = await makeExamSession("YEAR_1");
    await generateInitialAllocation(session.id, {
      id: invigilator.id,
      role: "INVIGILATOR",
    });

    const beforeDelete = await getRegenerationStatus(session.id);
    assert.equal(beforeDelete.hasAllocation, true);

    await deleteAllocationHistory(session.id);

    const afterDelete = await getRegenerationStatus(session.id);
    assert.equal(afterDelete.hasAllocation, false);
    assert.equal(afterDelete.invigilatorRegenerationAvailable, true);
  });

  it("allows generating a fresh allocation after deletion", async () => {
    const admin = await makeUser("ADMIN");
    const program = await makeProgram("Business");
    await makeStudents(4, program.id, "YEAR_1");
    const session = await makeExamSession("YEAR_1");
    await generateInitialAllocation(session.id, { id: admin.id, role: "ADMIN" });
    await deleteAllocationHistory(session.id);

    const fresh = await generateInitialAllocation(session.id, {
      id: admin.id,
      role: "ADMIN",
    });
    assert.equal(fresh.version, 1); // starts over, not continuing from the old history
  });
});
