"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { YearGroup } from "@/app/generated/prisma/enums";
import {
  parseAndValidate,
  commitImport,
  ImportError,
  type ValidStudentRow,
  type ValidationResult,
} from "@/lib/import";

const yearSchema = z.enum(YearGroup);

export type PreviewState = {
  error?: string;
  result?: ValidationResult;
};

export async function previewImport(
  _prevState: PreviewState,
  formData: FormData,
): Promise<PreviewState> {
  await requireUser("ADMIN");

  const yearParsed = yearSchema.safeParse(formData.get("year"));
  if (!yearParsed.success) {
    return { error: "Select which year this file is for." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a CSV or Excel file first." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const result = await parseAndValidate(buffer, file.name, yearParsed.data);
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
