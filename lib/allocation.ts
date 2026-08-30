// No "server-only" marker here: this module only touches Prisma (which
// itself cannot bundle into a client component), and it needs to be
// importable from plain Node for prisma/seed.ts-style scripts and tests.

import { randomInt } from "node:crypto";
import { Prisma } from "@/app/generated/prisma/client";
import type { Role } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Errors
//
// One class per business-rule failure so callers (route handlers / server
// actions) can map each to the right HTTP status / user-facing message
// without string-matching messages.
// ---------------------------------------------------------------------------

export class AllocationError extends Error {}

export class ExamSessionNotFoundError extends AllocationError {
  constructor(examSessionId: string) {
    super(`Exam session ${examSessionId} was not found.`);
  }
}

// FR-ALL-03: generation must fail for an empty population.
export class EmptyPopulationError extends AllocationError {
  constructor() {
    super("This session has zero registered students; cannot allocate.");
  }
}

// Guards the initial-generate endpoint from being used as a regenerate.
export class AlreadyGeneratedError extends AllocationError {
  constructor() {
    super(
      "This session already has an allocation; use regenerate instead of generate.",
    );
  }
}

// Guards the regenerate endpoint from being used before any generation.
export class NotYetGeneratedError extends AllocationError {
  constructor() {
    super("This session has no allocation yet; generate one first.");
  }
}

// BR-08 / BR-09: an invigilator gets exactly one regeneration per session,
// ever — independent of how many admin overrides happen afterwards.
export class RegenerationLimitReachedError extends AllocationError {
  constructor() {
    super(
      "This invigilator has already used their one regeneration for this session.",
    );
  }
}

// BR-11: every admin regeneration is treated as an override and must carry
// a reason, even the first one for a session.
export class MissingOverrideReasonError extends AllocationError {
  constructor() {
    super("An admin regeneration requires a reason.");
  }
}

// FR-ALL-10: two concurrent generate/regenerate requests for the same
// session race to insert the same next version; the loser lands here.
export class ConcurrentAllocationError extends AllocationError {
  constructor() {
    super(
      "Another generation or regeneration for this session is already in progress. Please retry.",
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ActingUser = { id: string; role: Role };

/**
 * Fisher-Yates shuffle using a CSPRNG (BR-05: allocation must be randomized
 * so program never predicts a student's seat number).
 */
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

async function loadExamSessionOrThrow(examSessionId: string) {
  const examSession = await prisma.examSession.findUnique({
    where: { id: examSessionId },
  });
  if (!examSession) throw new ExamSessionNotFoundError(examSessionId);
  return examSession;
}

/**
 * A session's registered population is its SessionParticipant roster —
 * seeded from the year cohort at session-creation time, but editable
 * afterwards (see lib/session-roster.ts), so this reads the roster rather
 * than re-deriving from Student.year on every generate/regenerate.
 */
async function loadPopulation(examSessionId: string) {
  const participants = await prisma.sessionParticipant.findMany({
    where: { examSessionId },
    select: { student: true },
  });
  return participants.map((p) => p.student);
}

async function loadAllocationHistory(examSessionId: string) {
  return prisma.allocation.findMany({
    where: { examSessionId },
    orderBy: { version: "asc" },
  });
}

function isUniqueConstraintViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * The *active* allocation for a session is simply the highest-version row —
 * there is no isActive flag to fall out of sync (see schema comment).
 */
export async function getActiveAllocation(examSessionId: string) {
  return prisma.allocation.findFirst({
    where: { examSessionId },
    orderBy: { version: "desc" },
    include: {
      generatedBy: { select: { id: true, name: true } },
      seatAssignments: {
        orderBy: { seatNumber: "asc" },
        include: {
          student: { include: { program: true } },
        },
      },
    },
  });
}

/**
 * Every seat assignment belonging to an *active* (highest-version)
 * allocation, across all sessions — backs the global seat search so an
 * invigilator can find a student's seat without knowing which session it's
 * under (FR-EXP-06-style lookup, not itself in the SRS export section).
 */
export async function listActiveAllocationEntries() {
  const activeVersions = await prisma.allocation.groupBy({
    by: ["examSessionId"],
    _max: { version: true },
  });
  if (activeVersions.length === 0) return [];

  const activeAllocations = await prisma.allocation.findMany({
    where: {
      OR: activeVersions.map((v) => ({
        examSessionId: v.examSessionId,
        version: v._max.version as number,
      })),
    },
    include: {
      examSession: true,
      seatAssignments: {
        orderBy: { seatNumber: "asc" },
        include: { student: { include: { program: true } } },
      },
    },
  });

  return activeAllocations.flatMap((allocation) =>
    allocation.seatAssignments.map((seat) => ({
      examSessionId: allocation.examSessionId,
      studentId: seat.studentId,
      seatNumber: seat.seatNumber,
      matricNumber: seat.student.matricNumber,
      fullName: seat.student.fullName,
      program: seat.student.program.name,
      year: seat.student.year,
      sessionLabel: allocation.examSession.label,
      sessionYear: allocation.examSession.year,
      sessionDate: allocation.examSession.date,
      sessionStartTime: allocation.examSession.startTime,
      sessionEndTime: allocation.examSession.endTime,
    })),
  );
}

export async function getRegenerationStatus(examSessionId: string) {
  const history = await loadAllocationHistory(examSessionId);
  const invigilatorRegenUsed = history.some(
    (a) => a.method === "REGENERATE_INVIGILATOR",
  );
  return {
    hasAllocation: history.length > 0,
    currentVersion: history.at(-1)?.version ?? 0,
    invigilatorRegenerationAvailable: !invigilatorRegenUsed,
  };
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

async function createAllocationVersion(params: {
  examSessionId: string;
  version: number;
  method: "GENERATE" | "REGENERATE_INVIGILATOR" | "REGENERATE_ADMIN_OVERRIDE";
  generatedById: string;
  overrideReason: string | null;
  studentIds: string[];
  auditAction:
    | "ALLOCATION_GENERATED"
    | "ALLOCATION_REGENERATED"
    | "ALLOCATION_ADMIN_OVERRIDE";
  fromVersion: number | null;
}) {
  const seatNumbers = shuffle(
    Array.from({ length: params.studentIds.length }, (_, i) => i + 1),
  );

  try {
    return await prisma.$transaction(async (tx) => {
      const allocation = await tx.allocation.create({
        data: {
          examSessionId: params.examSessionId,
          version: params.version,
          method: params.method,
          generatedById: params.generatedById,
          overrideReason: params.overrideReason,
        },
      });

      // FR-ALL-09: atomic — every seat assignment is written in the same
      // transaction as the Allocation row, or none are.
      await tx.seatAssignment.createMany({
        data: params.studentIds.map((studentId, i) => ({
          allocationId: allocation.id,
          studentId,
          seatNumber: seatNumbers[i],
        })),
      });

      await tx.auditLog.create({
        data: {
          userId: params.generatedById,
          examSessionId: params.examSessionId,
          allocationId: allocation.id,
          action: params.auditAction,
          fromVersion: params.fromVersion,
          toVersion: params.version,
          reason: params.overrideReason,
        },
      });

      return allocation;
    });
  } catch (err) {
    if (isUniqueConstraintViolation(err)) {
      throw new ConcurrentAllocationError();
    }
    throw err;
  }
}

/** FR-ALL-01/02/04: creates allocation version 1 for a session. */
export async function generateInitialAllocation(
  examSessionId: string,
  actingUser: ActingUser,
) {
  await loadExamSessionOrThrow(examSessionId);

  const existing = await prisma.allocation.findFirst({
    where: { examSessionId },
  });
  if (existing) throw new AlreadyGeneratedError();

  const population = await loadPopulation(examSessionId);
  if (population.length === 0) throw new EmptyPopulationError();

  return createAllocationVersion({
    examSessionId,
    version: 1,
    method: "GENERATE",
    generatedById: actingUser.id,
    overrideReason: null,
    studentIds: population.map((s) => s.id),
    auditAction: "ALLOCATION_GENERATED",
    fromVersion: null,
  });
}

/**
 * FR-ALL-05/06/07: creates the next allocation version for a session.
 * - Invigilators get exactly one regeneration per session, ever (BR-08/09).
 * - Admins may always regenerate, but every admin regeneration is an
 *   override and requires a non-empty `reason` (BR-10/BR-11).
 */
export async function regenerateAllocation(
  examSessionId: string,
  actingUser: ActingUser,
  reason?: string,
) {
  await loadExamSessionOrThrow(examSessionId);

  const history = await loadAllocationHistory(examSessionId);
  if (history.length === 0) throw new NotYetGeneratedError();

  const currentVersion = history.at(-1)!.version;
  const trimmedReason = reason?.trim();

  let method: "REGENERATE_INVIGILATOR" | "REGENERATE_ADMIN_OVERRIDE";
  let auditAction: "ALLOCATION_REGENERATED" | "ALLOCATION_ADMIN_OVERRIDE";
  let overrideReason: string | null = null;

  if (actingUser.role === "INVIGILATOR") {
    const invigilatorRegenUsed = history.some(
      (a) => a.method === "REGENERATE_INVIGILATOR",
    );
    if (invigilatorRegenUsed) throw new RegenerationLimitReachedError();
    method = "REGENERATE_INVIGILATOR";
    auditAction = "ALLOCATION_REGENERATED";
  } else {
    if (!trimmedReason) throw new MissingOverrideReasonError();
    method = "REGENERATE_ADMIN_OVERRIDE";
    auditAction = "ALLOCATION_ADMIN_OVERRIDE";
    overrideReason = trimmedReason;
  }

  const population = await loadPopulation(examSessionId);
  if (population.length === 0) throw new EmptyPopulationError();

  return createAllocationVersion({
    examSessionId,
    version: currentVersion + 1,
    method,
    generatedById: actingUser.id,
    overrideReason,
    studentIds: population.map((s) => s.id),
    auditAction,
    fromVersion: currentVersion,
  });
}

/**
 * Permanently erases every allocation version, seat assignment, and audit
 * log entry for a session, reverting it to "not allocated" so it can be
 * generated from scratch. Distinct from a regenerate (which supersedes the
 * old version but keeps it for history) — this is a genuine undo, admin-only
 * and irreversible. Also resets the invigilator's one-regeneration
 * allowance for the session, since there's no longer any record it was used.
 */
export async function deleteAllocationHistory(examSessionId: string): Promise<void> {
  await loadExamSessionOrThrow(examSessionId);

  const allocations = await prisma.allocation.findMany({
    where: { examSessionId },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.seatAssignment.deleteMany({
      where: { allocationId: { in: allocations.map((a) => a.id) } },
    }),
    prisma.auditLog.deleteMany({ where: { examSessionId } }),
    prisma.allocation.deleteMany({ where: { examSessionId } }),
  ]);
}
