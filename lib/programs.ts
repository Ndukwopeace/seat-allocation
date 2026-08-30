// No "server-only" marker: kept consistent with lib/users.ts.

import { prisma } from "./prisma";

export class ProgramError extends Error {}

export class DuplicateProgramError extends ProgramError {
  constructor() {
    super("A program with this name already exists.");
  }
}

/**
 * Creates a Program. Uniqueness is checked case-insensitively even though
 * the DB constraint isn't, because student import matches program names
 * case-insensitively (lib/import.ts) — two case-variant programs would
 * otherwise silently collide there.
 */
export async function createProgram(name: string) {
  const trimmed = name.trim();

  const existing = await prisma.program.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" } },
  });
  if (existing) throw new DuplicateProgramError();

  return prisma.program.create({ data: { name: trimmed } });
}
