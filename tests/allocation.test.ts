import assert from "node:assert/strict";
import { beforeEach, after, describe, it } from "node:test";
import { prisma } from "../lib/prisma";
import {
  generateInitialAllocation,
  regenerateAllocation,
  getActiveAllocation,
  getRegenerationStatus,
  AlreadyGeneratedError,
  EmptyPopulationError,
  MissingOverrideReasonError,
  NotYetGeneratedError,
  RegenerationLimitReachedError,
  ConcurrentAllocationError,
  NotEnoughSeatsError,
} from "../lib/allocation";
import {
  resetDb,
  makeUser,
  makeProgram,
  makeExamSession,
  makeStudents,
} from "./helpers";

describe("allocation domain service", () => {
  beforeEach(async () => {
    await resetDb();
  });

  after(async () => {
    await prisma.$disconnect();
  });

  it("generates exactly one unique seat number per registered student (BR-01, BR-02, FR-ALL-02)", async () => {
    const invigilator = await makeUser("INVIGILATOR");
    const programA = await makeProgram("Software Engineering");
    const programB = await makeProgram("Cybersecurity");
    const studentsA = await makeStudents(10, programA.id);
    const studentsB = await makeStudents(10, programB.id);
    const session = await makeExamSession();

    const allocation = await generateInitialAllocation(session.id, {
      id: invigilator.id,
      role: "INVIGILATOR",
    });

    assert.equal(allocation.version, 1);
    assert.equal(allocation.method, "GENERATE");

    const active = await getActiveAllocation(session.id);
    assert.ok(active);
    assert.equal(active.seatAssignments.length, 20);

    const seatNumbers = active.seatAssignments.map((a) => a.seatNumber).sort(
      (a, b) => a - b,
    );
    assert.deepEqual(seatNumbers, Array.from({ length: 20 }, (_, i) => i + 1));

    const studentIds = new Set(active.seatAssignments.map((a) => a.studentId));
    assert.equal(studentIds.size, 20);
    for (const s of [...studentsA, ...studentsB]) {
      assert.ok(studentIds.has(s.id), `student ${s.matricNumber} got a seat`);
    }
  });

  it("mixes programs into one randomized pool rather than partitioning by program (BR-05, BR-06)", async () => {
    const admin = await makeUser("ADMIN");
    const programA = await makeProgram("Software Engineering");
    const programB = await makeProgram("Cybersecurity");
    // Import order: all of A first, then all of B — if allocation were not
    // shuffled, seat numbers would come out in this same block order.
    const studentsA = await makeStudents(15, programA.id);
    const studentsB = await makeStudents(15, programB.id);
    const session = await makeExamSession();

    await generateInitialAllocation(session.id, { id: admin.id, role: "ADMIN" });
    const active = await getActiveAllocation(session.id);
    assert.ok(active);

    const orderedStudentIds = [...studentsA, ...studentsB].map((s) => s.id);
    const seatByStudent = new Map(
      active.seatAssignments.map((a) => [a.studentId, a.seatNumber]),
    );
    const seatsInImportOrder = orderedStudentIds.map((id) => seatByStudent.get(id));

    // With 30 students, the odds a true shuffle reproduces the identity
    // permutation are effectively zero (1/30!) — this is a smoke check
    // against a broken "shuffle" that's actually a no-op, not a full
    // statistical randomness test.
    const isIdentity = seatsInImportOrder.every((seat, i) => seat === i + 1);
    assert.equal(isIdentity, false);
  });

  it("fails generation for a session with zero registered students (FR-ALL-03)", async () => {
    const admin = await makeUser("ADMIN");
    const session = await makeExamSession();

    await assert.rejects(
      () => generateInitialAllocation(session.id, { id: admin.id, role: "ADMIN" }),
      EmptyPopulationError,
    );
  });

  it("rejects generating twice for the same session (use regenerate instead)", async () => {
    const admin = await makeUser("ADMIN");
    const program = await makeProgram("Business");
    await makeStudents(5, program.id);
    const session = await makeExamSession();

    await generateInitialAllocation(session.id, { id: admin.id, role: "ADMIN" });
    await assert.rejects(
      () => generateInitialAllocation(session.id, { id: admin.id, role: "ADMIN" }),
      AlreadyGeneratedError,
    );
  });

  it("does not change the allocation on repeated reads (refresh-safety, FR-ALL-08)", async () => {
    const admin = await makeUser("ADMIN");
    const program = await makeProgram("Business");
    await makeStudents(8, program.id);
    const session = await makeExamSession();

    await generateInitialAllocation(session.id, { id: admin.id, role: "ADMIN" });
    const first = await getActiveAllocation(session.id);
    const second = await getActiveAllocation(session.id);

    assert.deepEqual(
      first!.seatAssignments.map((a) => [a.studentId, a.seatNumber]).sort(),
      second!.seatAssignments.map((a) => [a.studentId, a.seatNumber]).sort(),
    );
  });

  it("rejects regenerate before any allocation exists", async () => {
    const invigilator = await makeUser("INVIGILATOR");
    const session = await makeExamSession();

    await assert.rejects(
      () =>
        regenerateAllocation(session.id, {
          id: invigilator.id,
          role: "INVIGILATOR",
        }),
      NotYetGeneratedError,
    );
  });

  it("lets an invigilator regenerate exactly once, then blocks a second attempt (BR-08, BR-09)", async () => {
    const invigilator = await makeUser("INVIGILATOR");
    const program = await makeProgram("Business");
    await makeStudents(6, program.id);
    const session = await makeExamSession();

    await generateInitialAllocation(session.id, {
      id: invigilator.id,
      role: "INVIGILATOR",
    });

    const regenerated = await regenerateAllocation(session.id, {
      id: invigilator.id,
      role: "INVIGILATOR",
    });
    assert.equal(regenerated.version, 2);
    assert.equal(regenerated.method, "REGENERATE_INVIGILATOR");

    await assert.rejects(
      () =>
        regenerateAllocation(session.id, {
          id: invigilator.id,
          role: "INVIGILATOR",
        }),
      RegenerationLimitReachedError,
    );

    const status = await getRegenerationStatus(session.id);
    assert.equal(status.invigilatorRegenerationAvailable, false);
    assert.equal(status.currentVersion, 2);
  });

  it("requires a reason for every admin regeneration, even the first one (BR-10, BR-11)", async () => {
    const admin = await makeUser("ADMIN");
    const program = await makeProgram("Business");
    await makeStudents(6, program.id);
    const session = await makeExamSession();

    await generateInitialAllocation(session.id, { id: admin.id, role: "ADMIN" });

    await assert.rejects(
      () => regenerateAllocation(session.id, { id: admin.id, role: "ADMIN" }),
      MissingOverrideReasonError,
    );

    const overridden = await regenerateAllocation(
      session.id,
      { id: admin.id, role: "ADMIN" },
      "Printer jam invalidated the first sheet",
    );
    assert.equal(overridden.version, 2);
    assert.equal(overridden.method, "REGENERATE_ADMIN_OVERRIDE");
    assert.equal(overridden.overrideReason, "Printer jam invalidated the first sheet");

    const auditRows = await prisma.auditLog.findMany({
      where: { examSessionId: session.id },
      orderBy: { toVersion: "asc" },
    });
    assert.equal(auditRows.length, 2);
    assert.equal(auditRows[1].action, "ALLOCATION_ADMIN_OVERRIDE");
    assert.equal(auditRows[1].fromVersion, 1);
    assert.equal(auditRows[1].toVersion, 2);
    assert.equal(auditRows[1].reason, "Printer jam invalidated the first sheet");
  });

  it("lets admin override past the invigilator's exhausted limit (BR-10)", async () => {
    const invigilator = await makeUser("INVIGILATOR");
    const admin = await makeUser("ADMIN");
    const program = await makeProgram("Business");
    await makeStudents(6, program.id);
    const session = await makeExamSession();

    await generateInitialAllocation(session.id, {
      id: invigilator.id,
      role: "INVIGILATOR",
    });
    await regenerateAllocation(session.id, {
      id: invigilator.id,
      role: "INVIGILATOR",
    });

    const overridden = await regenerateAllocation(
      session.id,
      { id: admin.id, role: "ADMIN" },
      "Admin needs a third version for a room change",
    );
    assert.equal(overridden.version, 3);
    assert.equal(overridden.method, "REGENERATE_ADMIN_OVERRIDE");
  });

  it("keeps exactly one active allocation under concurrent regeneration (FR-ALL-09, FR-ALL-10)", async () => {
    const adminA = await makeUser("ADMIN");
    const adminB = await makeUser("ADMIN");
    const program = await makeProgram("Business");
    await makeStudents(6, program.id);
    const session = await makeExamSession();

    await generateInitialAllocation(session.id, {
      id: adminA.id,
      role: "ADMIN",
    });

    const results = await Promise.allSettled([
      regenerateAllocation(session.id, { id: adminA.id, role: "ADMIN" }, "race A"),
      regenerateAllocation(session.id, { id: adminB.id, role: "ADMIN" }, "race B"),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    assert.ok(
      (rejected[0] as PromiseRejectedResult).reason instanceof
        ConcurrentAllocationError,
    );

    const allVersions = await prisma.allocation.findMany({
      where: { examSessionId: session.id },
    });
    assert.equal(allVersions.length, 2); // v1 generate + exactly one v2 regen
  });

  it("spreads students across a bigger room instead of packing seats 1..N when a seat count is given", async () => {
    const admin = await makeUser("ADMIN");
    const program = await makeProgram("Business");
    await makeStudents(5, program.id);
    const session = await makeExamSession();

    await generateInitialAllocation(
      session.id,
      { id: admin.id, role: "ADMIN" },
      50,
    );

    const active = await getActiveAllocation(session.id);
    assert.ok(active);
    const seatNumbers = active.seatAssignments.map((a) => a.seatNumber);
    assert.equal(seatNumbers.length, 5);
    assert.equal(new Set(seatNumbers).size, 5, "no two students share a seat");
    for (const seat of seatNumbers) {
      assert.ok(seat >= 1 && seat <= 50, `seat ${seat} is within the room`);
    }
    // With 50 seats for 5 students, the odds every seat happens to land in
    // 1..5 are astronomically small — a real spread, not a coincidence.
    assert.ok(
      seatNumbers.some((seat) => seat > 5),
      "at least one student sits outside the front-packed 1..5 block",
    );

    const session2 = await prisma.examSession.findUniqueOrThrow({
      where: { id: session.id },
    });
    assert.equal(session2.totalSeats, 50, "the room size is remembered on the session");
  });

  it("rejects generation when there are more students than seats", async () => {
    const admin = await makeUser("ADMIN");
    const program = await makeProgram("Business");
    await makeStudents(10, program.id);
    const session = await makeExamSession();

    await assert.rejects(
      () =>
        generateInitialAllocation(session.id, { id: admin.id, role: "ADMIN" }, 5),
      NotEnoughSeatsError,
    );
  });

  it("reuses the previously-set seat count on regenerate when none is given again", async () => {
    const admin = await makeUser("ADMIN");
    const program = await makeProgram("Business");
    await makeStudents(4, program.id);
    const session = await makeExamSession();

    await generateInitialAllocation(
      session.id,
      { id: admin.id, role: "ADMIN" },
      40,
    );
    await regenerateAllocation(
      session.id,
      { id: admin.id, role: "ADMIN" },
      "Confirming the room size carries over",
    );

    const active = await getActiveAllocation(session.id);
    assert.ok(active);
    for (const a of active.seatAssignments) {
      assert.ok(a.seatNumber >= 1 && a.seatNumber <= 40);
    }
  });

  it("lets a regeneration replace the previously-set seat count with a new one", async () => {
    const admin = await makeUser("ADMIN");
    const program = await makeProgram("Business");
    await makeStudents(4, program.id);
    const session = await makeExamSession();

    await generateInitialAllocation(
      session.id,
      { id: admin.id, role: "ADMIN" },
      40,
    );
    await regenerateAllocation(
      session.id,
      { id: admin.id, role: "ADMIN" },
      "Room changed to a smaller one",
      4,
    );

    const active = await getActiveAllocation(session.id);
    assert.ok(active);
    const seatNumbers = active.seatAssignments.map((a) => a.seatNumber).sort(
      (a, b) => a - b,
    );
    assert.deepEqual(seatNumbers, [1, 2, 3, 4]);

    const session2 = await prisma.examSession.findUniqueOrThrow({
      where: { id: session.id },
    });
    assert.equal(session2.totalSeats, 4);
  });
});
