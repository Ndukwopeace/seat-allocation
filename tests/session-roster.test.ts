import assert from "node:assert/strict";
import { beforeEach, after, describe, it } from "node:test";
import { prisma } from "../lib/prisma";
import {
  seedInitialParticipants,
  addParticipant,
  removeParticipant,
  listParticipants,
  listCandidateStudents,
} from "../lib/session-roster";
import { resetDb, makeProgram, makeExamSession, makeStudents } from "./helpers";

describe("session roster", () => {
  beforeEach(async () => {
    await resetDb();
  });

  after(async () => {
    await prisma.$disconnect();
  });

  it("seeds a new session's roster from the year cohort (BR-06 default)", async () => {
    const program = await makeProgram("Business");
    const year1 = await makeStudents(3, program.id, "YEAR_1");
    await makeStudents(2, program.id, "YEAR_2");
    const session = await makeExamSession("YEAR_1"); // seeds via helper

    const participants = await listParticipants(session.id);
    assert.equal(participants.length, 3);
    const ids = new Set(participants.map((p) => p.id));
    for (const s of year1) assert.ok(ids.has(s.id));
  });

  it("excludes archived students from the initial seed", async () => {
    const program = await makeProgram("Business");
    const students = await makeStudents(3, program.id, "YEAR_1");
    await prisma.student.update({
      where: { id: students[0].id },
      data: { archivedAt: new Date() },
    });

    const session = await prisma.examSession.create({
      data: {
        year: "YEAR_1",
        date: new Date("2026-06-01"),
        startTime: new Date("2026-06-01T09:00:00Z"),
        endTime: new Date("2026-06-01T11:00:00Z"),
      },
    });
    await seedInitialParticipants(session.id, "YEAR_1");

    const participants = await listParticipants(session.id);
    assert.equal(participants.length, 2);
    assert.ok(!participants.some((p) => p.id === students[0].id));
  });

  it("adds a student regardless of year, idempotently", async () => {
    const program = await makeProgram("Business");
    const [outsider] = await makeStudents(1, program.id, "YEAR_2");
    const session = await makeExamSession("YEAR_1");

    await addParticipant(session.id, outsider.id);
    await addParticipant(session.id, outsider.id); // second add is a no-op

    const participants = await listParticipants(session.id);
    assert.equal(participants.filter((p) => p.id === outsider.id).length, 1);
  });

  it("removes a participant, and is a no-op if they aren't on the roster", async () => {
    const program = await makeProgram("Business");
    const [student] = await makeStudents(1, program.id, "YEAR_1");
    const session = await makeExamSession("YEAR_1");

    await removeParticipant(session.id, student.id);
    const participants = await listParticipants(session.id);
    assert.equal(participants.length, 0);

    await assert.doesNotReject(() => removeParticipant(session.id, student.id));
  });

  it("lists active, non-participant students as add candidates", async () => {
    const program = await makeProgram("Business");
    const students = await makeStudents(3, program.id, "YEAR_1");
    await prisma.student.update({
      where: { id: students[2].id },
      data: { archivedAt: new Date() },
    });
    const session = await makeExamSession("YEAR_1");
    await removeParticipant(session.id, students[0].id);

    const candidates = await listCandidateStudents(session.id);
    const candidateIds = candidates.map((c) => c.id);
    assert.ok(candidateIds.includes(students[0].id)); // removed -> candidate again
    assert.ok(!candidateIds.includes(students[1].id)); // still on roster
    assert.ok(!candidateIds.includes(students[2].id)); // archived
  });
});
