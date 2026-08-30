import { prisma } from "../lib/prisma";
import { createUser, DuplicateEmailError } from "../lib/users";

// Bootstraps the first admin account into a database that has none yet —
// the /admin/users page can't help here since it requires being logged in
// as an admin already. Creates a Google-only account (no password) by
// default; a password can be added later from /admin/users once you're in.
//
// Usage:
//   DATABASE_URL=<target-db-url> node --import tsx scripts/create-admin.ts <email> [name]

async function main() {
  const [, , email, name] = process.argv;

  if (!email) {
    console.error(
      "Usage: DATABASE_URL=<target-db-url> node --import tsx scripts/create-admin.ts <email> [name]",
    );
    process.exit(1);
  }

  try {
    const user = await createUser({
      name: name ?? email,
      email,
      role: "ADMIN",
    });
    console.log(`Created admin: ${user.email} (id ${user.id})`);
  } catch (err) {
    if (err instanceof DuplicateEmailError) {
      console.error(`A user with email ${email.toLowerCase()} already exists.`);
      process.exit(1);
    }
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

main();
