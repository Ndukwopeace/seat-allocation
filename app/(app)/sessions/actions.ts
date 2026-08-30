"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import {
  generateInitialAllocation,
  regenerateAllocation,
  AllocationError,
} from "@/lib/allocation";
import { YearGroup } from "@/app/generated/prisma/enums";

export type ActionState = { error?: string };

const createSessionSchema = z.object({
  year: z.enum(YearGroup),
  label: z.string().trim().max(200).optional(),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
});

// FR-SES-01: only Admin creates exam sessions (see Actor table, section 4).
export async function createExamSession(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser("ADMIN");

  const parsed = createSessionSchema.safeParse({
    year: formData.get("year"),
    label: formData.get("label") || undefined,
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid session details." };
  }

  const { year, label, date, startTime, endTime } = parsed.data;

  const startDateTime = new Date(`${date}T${startTime}:00`);
  const endDateTime = new Date(`${date}T${endTime}:00`);
  if (Number.isNaN(startDateTime.getTime()) || Number.isNaN(endDateTime.getTime())) {
    return { error: "Enter a valid date and time." };
  }
  if (endDateTime <= startDateTime) {
    return { error: "End time must be after start time." };
  }

  const session = await prisma.examSession.create({
    data: {
      year,
      label: label || null,
      date: new Date(date),
      startTime: startDateTime,
      endTime: endDateTime,
    },
  });

  redirect(`/sessions/${session.id}`);
}

function messageFor(err: unknown): string {
  if (err instanceof AllocationError) return err.message;
  throw err;
}

// FR-ALL-01/02/04. Either role may generate the first version.
export async function generateAllocationAction(
  examSessionId: string,
): Promise<ActionState> {
  const user = await requireUser();
  try {
    await generateInitialAllocation(examSessionId, {
      id: user.sub,
      role: user.role,
    });
  } catch (err) {
    return { error: messageFor(err) };
  }
  revalidatePath(`/sessions/${examSessionId}`);
  return {};
}

// FR-ALL-05/06/07. Invigilator: one free regeneration. Admin: always allowed,
// always requires a reason (see lib/allocation.ts for the full rule).
export async function regenerateAllocationAction(
  examSessionId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const reason = formData.get("reason");
  try {
    await regenerateAllocation(
      examSessionId,
      { id: user.sub, role: user.role },
      typeof reason === "string" ? reason : undefined,
    );
  } catch (err) {
    return { error: messageFor(err) };
  }
  revalidatePath(`/sessions/${examSessionId}`);
  return {};
}
