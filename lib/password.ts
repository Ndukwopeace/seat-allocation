import bcrypt from "bcryptjs";

// Deliberately does not import "server-only" or any next/* module: this
// needs to run from plain Node (prisma/seed.ts) and from unit tests, not
// just inside the Next.js server runtime.

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
