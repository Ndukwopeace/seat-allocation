// No "server-only" marker: kept consistent with the other lib/ modules.

import { prisma } from "./prisma";

export class SessionError extends Error {}

export class SessionNotFoundError extends SessionError {
  constructor(examSessionId: string) {
    super(`Exam session ${examSessionId} was not found.`);
  }
}

// A session with real exam records (any allocation ever generated) is never
// silently erasable — same philosophy as student deletion: block rather
// than destroy audited history. Delete the allocation first (which is
// itself a deliberate, separately-confirmed action) to clear the way.
export class SessionHasAllocationError extends SessionError {
  constructor() {
    super(
      "This session already has allocation history and can't be deleted. Delete its allocation first, then delete the session.",
    );
  }
}

export async function deleteExamSession(examSessionId: string): Promise<void> {
  const session = await prisma.examSession.findUnique({
    where: { id: examSessionId },
  });
  if (!session) throw new SessionNotFoundError(examSessionId);

  const allocationCount = await prisma.allocation.count({
    where: { examSessionId },
  });
  if (allocationCount > 0) throw new SessionHasAllocationError();

  await prisma.$transaction([
    prisma.sessionParticipant.deleteMany({ where: { examSessionId } }),
    prisma.examSession.delete({ where: { id: examSessionId } }),
  ]);
}
