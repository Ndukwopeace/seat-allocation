// No "server-only" marker: needs to be importable from tests (same reasoning
// as lib/allocation.ts).

import { prisma } from "./prisma";
import { hashPassword } from "./password";
import type { Role } from "@/app/generated/prisma/enums";

export class UserError extends Error {}

export class DuplicateEmailError extends UserError {
  constructor() {
    super("A user with this email already exists.");
  }
}

export type CreateUserInput = {
  name: string;
  email: string;
  role: Role;
  /** Omit or leave empty for a Google-only account (no password set). */
  password?: string;
};

/**
 * Creates a User row. Email is normalized to lowercase so it matches
 * consistently regardless of whether the account later signs in with a
 * password or with Google (Google's `email` claim is already lowercase).
 */
export async function createUser(input: CreateUserInput) {
  const email = input.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new DuplicateEmailError();

  return prisma.user.create({
    data: {
      name: input.name,
      email,
      role: input.role,
      passwordHash: input.password ? await hashPassword(input.password) : null,
    },
  });
}
