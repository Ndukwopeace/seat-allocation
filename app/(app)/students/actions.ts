"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  createStudent as createStudentDomain,
  deleteStudent,
  DuplicateMatricNumberError,
} from "@/lib/students";
import { YearGroup } from "@/app/generated/prisma/enums";

export type DeleteStudentState = { error?: string; archived?: boolean };

export async function deleteStudentAction(studentId: string): Promise<DeleteStudentState> {
  await requireUser("ADMIN");

  const { archived } = await deleteStudent(studentId);

  revalidatePath("/students");
  revalidatePath("/");
  revalidatePath("/search");
  return { archived };
}

export type CreateStudentState = { error?: string; success?: boolean };

const createStudentSchema = z.object({
  matricNumber: z.string().trim().min(1, "Student ID is required").max(50),
  fullName: z.string().trim().min(1, "Full name is required").max(200),
  programId: z.string().min(1, "Choose a course"),
  year: z.enum(YearGroup),
});

export async function createStudentAction(
  _prevState: CreateStudentState,
  formData: FormData,
): Promise<CreateStudentState> {
  await requireUser("ADMIN");

  const parsed = createStudentSchema.safeParse({
    matricNumber: formData.get("matricNumber"),
    fullName: formData.get("fullName"),
    programId: formData.get("programId"),
    year: formData.get("year"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the student details." };
  }

  try {
    await createStudentDomain(parsed.data);
  } catch (err) {
    if (err instanceof DuplicateMatricNumberError) return { error: err.message };
    throw err;
  }

  revalidatePath("/students");
  revalidatePath("/");
  revalidatePath("/search");
  return { success: true };
}
