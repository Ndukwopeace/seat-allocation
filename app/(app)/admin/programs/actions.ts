"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createProgram as createProgramDomain, DuplicateProgramError } from "@/lib/programs";

export type ActionState = { error?: string; success?: boolean };

const createProgramSchema = z.object({
  name: z.string().trim().min(1, "Course name is required").max(200),
});

export async function createProgram(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser("ADMIN");

  const parsed = createProgramSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the course name." };
  }

  try {
    await createProgramDomain(parsed.data.name);
  } catch (err) {
    if (err instanceof DuplicateProgramError) {
      return { error: err.message };
    }
    throw err;
  }

  revalidatePath("/admin/programs");
  return { success: true };
}
