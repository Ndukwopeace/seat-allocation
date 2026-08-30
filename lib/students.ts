// No "server-only" marker: kept consistent with the other lib/ modules.

import { prisma } from "./prisma";
import { syncStudentsIntoMatchingSessions } from "./session-roster";
import type { YearGroup } from "@/app/generated/prisma/enums";

export class DuplicateMatricNumberError extends Error {
  constructor(matricNumber: string) {
    super(`Student ID ${matricNumber} is already used.`);
  }
}

export type CreateStudentInput = {
  matricNumber: string;
  fullName: string;
  programId: string;
  year: YearGroup;
};

/**
 * Single-student counterpart to the bulk CSV/XLSX import (lib/import.ts) —
 * for the occasional latecomer/transfer that doesn't warrant a whole
 * spreadsheet. Also added to any existing session that already matches
 * their year, same as a freshly-imported student.
 */
export async function createStudent(input: CreateStudentInput) {
  const matricNumber = input.matricNumber.trim().toUpperCase();
  const fullName = input.fullName.trim();

  const existing = await prisma.student.findUnique({ where: { matricNumber } });
  if (existing) throw new DuplicateMatricNumberError(matricNumber);

  const student = await prisma.student.create({
    data: { matricNumber, fullName, programId: input.programId, year: input.year },
  });

  await syncStudentsIntoMatchingSessions([{ id: student.id, year: student.year }]);
  return student;
}

export type DeleteStudentResult = { archived: boolean };

/**
 * A student with no allocation history (never assigned a seat) is removed
 * outright — nothing depends on them, so there's no downside. A student who
 * *has* history is archived instead: hidden from the active registry,
 * search, and every session roster (including future generate/regenerates
 * of sessions they're still queued for), but their past SeatAssignment rows
 * are left untouched so audit trails and exports stay accurate.
 */
export async function deleteStudent(studentId: string): Promise<DeleteStudentResult> {
  const seatAssignmentCount = await prisma.seatAssignment.count({
    where: { studentId },
  });

  if (seatAssignmentCount === 0) {
    await prisma.$transaction([
      prisma.sessionParticipant.deleteMany({ where: { studentId } }),
      prisma.student.delete({ where: { id: studentId } }),
    ]);
    return { archived: false };
  }

  await prisma.$transaction([
    prisma.sessionParticipant.deleteMany({ where: { studentId } }),
    prisma.student.update({
      where: { id: studentId },
      data: { archivedAt: new Date() },
    }),
  ]);
  return { archived: true };
}
