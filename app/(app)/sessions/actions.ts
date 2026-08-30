"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import {
  generateInitialAllocation,
  regenerateAllocation,
  deleteAllocationHistory,
  AllocationError,
} from "@/lib/allocation";
import {
  addParticipant,
  removeParticipant,
  seedInitialParticipants,
} from "@/lib/session-roster";
import {
  deleteExamSession as deleteExamSessionDomain,
  SessionError,
} from "@/lib/sessions";
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
    return { error: parsed.error.issues[0]?.message ?? "Check the exam details." };
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

  // BR-06 default: every active student sharing the session's year. Editable
  // afterwards via the session detail page's roster panel.
  await seedInitialParticipants(session.id, year);

  redirect(`/sessions/${session.id}`);
}

const studentIdSchema = z.string().min(1);

// Admin-only: changing who a session's population includes is as
// significant as creating the session itself (FR-SES-01's rationale).
export async function addParticipantAction(
  examSessionId: string,
  studentId: string,
): Promise<ActionState> {
  await requireUser("ADMIN");
  const parsed = studentIdSchema.safeParse(studentId);
  if (!parsed.success) return { error: "Choose a student to add." };

  await addParticipant(examSessionId, parsed.data);
  revalidatePath(`/sessions/${examSessionId}`);
  return {};
}

export async function removeParticipantAction(
  examSessionId: string,
  studentId: string,
): Promise<ActionState> {
  await requireUser("ADMIN");
  const parsed = studentIdSchema.safeParse(studentId);
  if (!parsed.success) return { error: "Choose a student to remove." };

  await removeParticipant(examSessionId, parsed.data);
  revalidatePath(`/sessions/${examSessionId}`);
  return {};
}

function messageFor(err: unknown): string {
  if (err instanceof AllocationError) return err.message;
  if (err instanceof SessionError) return err.message;
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

// Admin-only, irreversible: wipes every allocation version/seat
// assignment/audit entry for the session (lib/allocation.ts). The session
// itself is untouched and can be generated again from scratch.
export async function deleteAllocationAction(
  examSessionId: string,
): Promise<ActionState> {
  await requireUser("ADMIN");
  try {
    await deleteAllocationHistory(examSessionId);
  } catch (err) {
    return { error: messageFor(err) };
  }
  revalidatePath(`/sessions/${examSessionId}`);
  return {};
}

// Admin-only, irreversible: removes the session entirely. Blocked (see
// lib/sessions.ts) if it has any allocation history — delete that first.
export async function deleteExamSessionAction(
  examSessionId: string,
): Promise<ActionState> {
  await requireUser("ADMIN");
  try {
    await deleteExamSessionDomain(examSessionId);
  } catch (err) {
    return { error: messageFor(err) };
  }
  redirect("/sessions");
}
