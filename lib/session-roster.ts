// No "server-only" marker: kept consistent with the other lib/ modules.

import { prisma } from "./prisma";
import type { YearGroup } from "@/app/generated/prisma/enums";

/**
 * Seeds a new session's roster from every active (non-archived) student
 * sharing the session's year — BR-06's default population. Called once at
 * session creation; the roster can be edited afterwards via
 * addParticipant/removeParticipant without touching the year-wide registry.
 */
export async function seedInitialParticipants(examSessionId: string, year: YearGroup) {
  const students = await prisma.student.findMany({
    where: { year, archivedAt: null },
    select: { id: true },
  });
  if (students.length === 0) return;
  await prisma.sessionParticipant.createMany({
    data: students.map((s) => ({ examSessionId, studentId: s.id })),
    skipDuplicates: true,
  });
}

/**
 * Adds newly-created students to every *existing* session sharing their
 * year — without this, a student imported or manually added after a
 * matching-year session was created would never appear on that session's
 * roster at all (rosters are only seeded from the year cohort once, at
 * session-creation time). Mirrors seedInitialParticipants's default, just
 * running in the other direction (new student -> existing sessions instead
 * of new session -> existing students). Safe to call for students whose
 * year has no sessions yet — it's just a no-op then.
 */
export async function syncStudentsIntoMatchingSessions(
  students: { id: string; year: YearGroup }[],
) {
  if (students.length === 0) return;

  const years = [...new Set(students.map((s) => s.year))];
  const sessions = await prisma.examSession.findMany({
    where: { year: { in: years } },
    select: { id: true, year: true },
  });
  if (sessions.length === 0) return;

  const data = students.flatMap((student) =>
    sessions
      .filter((session) => session.year === student.year)
      .map((session) => ({ examSessionId: session.id, studentId: student.id })),
  );
  if (data.length === 0) return;

  await prisma.sessionParticipant.createMany({ data, skipDuplicates: true });
}

export async function listParticipants(examSessionId: string) {
  const participants = await prisma.sessionParticipant.findMany({
    where: { examSessionId },
    include: { student: { include: { program: true } } },
    orderBy: { student: { fullName: "asc" } },
  });
  return participants.map((p) => p.student);
}

/**
 * Active students not currently on this session's roster — candidates an
 * admin can add regardless of year (e.g. a resit sitting with another
 * cohort's exam).
 */
export async function listCandidateStudents(examSessionId: string) {
  const participants = await prisma.sessionParticipant.findMany({
    where: { examSessionId },
    select: { studentId: true },
  });
  return prisma.student.findMany({
    where: {
      archivedAt: null,
      id: { notIn: participants.map((p) => p.studentId) },
    },
    include: { program: true },
    orderBy: [{ year: "asc" }, { fullName: "asc" }],
  });
}

/** Idempotent — adding someone already on the roster is a no-op, not an error. */
export async function addParticipant(examSessionId: string, studentId: string) {
  await prisma.sessionParticipant.upsert({
    where: { examSessionId_studentId: { examSessionId, studentId } },
    update: {},
    create: { examSessionId, studentId },
  });
}

/**
 * Only affects the roster read by the *next* generate/regenerate — it does
 * not retroactively touch any SeatAssignment already issued under the
 * session's current active allocation, same as every other population
 * change (e.g. importing more students for a year after a session's
 * allocation already exists).
 */
export async function removeParticipant(examSessionId: string, studentId: string) {
  await prisma.sessionParticipant.deleteMany({
    where: { examSessionId, studentId },
  });
}
