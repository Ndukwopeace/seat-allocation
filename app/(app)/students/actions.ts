"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { deleteStudent } from "@/lib/students";

export type DeleteStudentState = { error?: string; archived?: boolean };

export async function deleteStudentAction(studentId: string): Promise<DeleteStudentState> {
  await requireUser("ADMIN");

  const { archived } = await deleteStudent(studentId);

  revalidatePath("/students");
  revalidatePath("/");
  revalidatePath("/search");
  return { archived };
}
