import assert from "node:assert/strict";
import { beforeEach, after, describe, it } from "node:test";
import { prisma } from "../lib/prisma";
import { verifyPassword } from "../lib/password";
import { createUser, DuplicateEmailError } from "../lib/users";
import { resetDb } from "./helpers";

describe("user creation", () => {
  beforeEach(async () => {
    await resetDb();
  });

  after(async () => {
    await prisma.$disconnect();
  });

  it("creates a user with a hashed password", async () => {
    const user = await createUser({
      name: "Ada Admin",
      email: "ADA@Example.com",
      role: "ADMIN",
      password: "correct-horse-battery",
    });

    assert.equal(user.email, "ada@example.com"); // normalized to lowercase
    assert.ok(user.passwordHash);
    assert.ok(await verifyPassword("correct-horse-battery", user.passwordHash!));
  });

  it("creates a Google-only user when no password is given", async () => {
    const user = await createUser({
      name: "Ivy Invigilator",
      email: "ivy@example.com",
      role: "INVIGILATOR",
    });

    assert.equal(user.passwordHash, null);
  });

  it("rejects a duplicate email, case-insensitively", async () => {
    await createUser({
      name: "First",
      email: "dupe@example.com",
      role: "INVIGILATOR",
    });

    await assert.rejects(
      () =>
        createUser({
          name: "Second",
          email: "DUPE@example.com",
          role: "ADMIN",
          password: "irrelevant-but-8-chars",
        }),
      DuplicateEmailError,
    );

    const count = await prisma.user.count();
    assert.equal(count, 1);
  });
});
