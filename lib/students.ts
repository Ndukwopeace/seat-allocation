// No "server-only" marker: kept consistent with the other lib/ modules.

import { prisma } from "./prisma";

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
