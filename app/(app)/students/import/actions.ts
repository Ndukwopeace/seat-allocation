"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  parseAndValidate,
  commitImport,
  ImportError,
  type ValidStudentRow,
  type ValidationResult,
} from "@/lib/import";

export type PreviewState = {
  error?: string;
  result?: ValidationResult;
};

export async function previewImport(
  _prevState: PreviewState,
  formData: FormData,
): Promise<PreviewState> {
  await requireUser("ADMIN");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a CSV or Excel file first." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const result = await parseAndValidate(buffer, file.name);
    return { result };
  } catch (err) {
    if (err instanceof ImportError) return { error: err.message };
    throw err;
  }
}

export type ConfirmState = { error?: string; imported?: number };

export async function confirmImportAction(
  rows: ValidStudentRow[],
): Promise<ConfirmState> {
  await requireUser("ADMIN");

  try {
    const { imported } = await commitImport(rows);
    revalidatePath("/students");
    revalidatePath("/");
    return { imported };
  } catch (err) {
    if (err instanceof ImportError) return { error: err.message };
    throw err;
  }
}
