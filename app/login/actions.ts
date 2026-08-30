"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";
import { safeNextPath } from "@/lib/safe-redirect";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1, "Password is required"),
  next: z.string().optional(),
});

export type LoginState = { error?: string };

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }

  const { password, next } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  const user = await prisma.user.findUnique({ where: { email } });
  // A null passwordHash means this account is Google-only — deliberately
  // fails the same generic way as a wrong password, rather than revealing
  // that the account exists but has no password.
  if (
    !user ||
    !user.passwordHash ||
    !(await verifyPassword(password, user.passwordHash))
  ) {
    return { error: "Invalid email or password." };
  }

  await createSession({
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });

  redirect(safeNextPath(next));
}
