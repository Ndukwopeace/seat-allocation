"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createUser as createUserDomain, DuplicateEmailError } from "@/lib/users";
import { Role } from "@/app/generated/prisma/enums";

export type ActionState = { error?: string; success?: boolean };

const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Enter a valid email"),
  role: z.enum(Role),
  // Optional: leave blank to make this a Google-only account.
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(200)
    .optional()
    .or(z.literal("")),
});

export async function createUser(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser("ADMIN");

  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    password: formData.get("password") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid user details." };
  }

  try {
    await createUserDomain(parsed.data);
  } catch (err) {
    if (err instanceof DuplicateEmailError) {
      return { error: err.message };
    }
    throw err;
  }

  revalidatePath("/admin/users");
  return { success: true };
}
