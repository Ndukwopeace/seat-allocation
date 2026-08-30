"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  parseAndValidateSessions,
  commitSessionImport,
  ImportSessionError,
  type ValidSessionRow,
  type SessionValidationResult,
} from "@/lib/session-import";

export type PreviewState = {
  error?: string;
  result?: SessionValidationResult;
};

export async function previewSessionImport(
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
    const result = await parseAndValidateSessions(buffer, file.name);
    return { result };
  } catch (err) {
    if (err instanceof ImportSessionError) return { error: err.message };
    throw err;
  }
}

export type ConfirmState = { error?: string; imported?: number };

export async function confirmSessionImportAction(
  rows: ValidSessionRow[],
): Promise<ConfirmState> {
  await requireUser("ADMIN");

  try {
    const { imported } = await commitSessionImport(rows);
    revalidatePath("/sessions");
    revalidatePath("/");
    return { imported };
  } catch (err) {
    if (err instanceof ImportSessionError) return { error: err.message };
    throw err;
  }
}
