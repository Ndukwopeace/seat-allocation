"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Spinner } from "@/app/Spinner";
import {
  generateAllocationAction,
  regenerateAllocationAction,
  type ActionState,
} from "../actions";

const initialState: ActionState = {};

/**
 * Fires `onSuccess` exactly once per completed submission that didn't
 * error — tracked via the pending true->false transition, not by
 * comparing `state` (a fresh successful submit returns the same `{}`
 * shape as the pre-submit initial state, so `state` alone can't tell
 * "just succeeded" from "never submitted").
 */
function useSuccessFlash(
  state: ActionState,
  pending: boolean,
  onSuccess: () => void,
) {
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      onSuccess();
    }
    wasPending.current = pending;
  }, [pending, state, onSuccess]);
}

function SeatsField({
  studentCount,
  totalSeats,
}: {
  studentCount: number;
  totalSeats: number | null;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="totalSeats" className="text-sm font-medium text-ink">
        Seats in the room (optional)
      </label>
      <input
        id="totalSeats"
        name="totalSeats"
        type="number"
        inputMode="numeric"
        min={studentCount}
        placeholder={`${studentCount} (one seat per student)`}
        defaultValue={totalSeats ?? ""}
        className="w-full rounded-2xl border-none bg-white px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-coral/40"
      />
      <p className="text-xs text-muted">
        Leave blank to seat all {studentCount} students in seats 1–
        {studentCount} with no gaps. Set the room&rsquo;s real seat count to
        spread them out across the empty seats too.
      </p>
    </div>
  );
}

export function GenerateControls({
  examSessionId,
  hasAllocation,
  currentVersion,
  invigilatorRegenerationAvailable,
  userRole,
  studentCount,
  totalSeats,
}: {
  examSessionId: string;
  hasAllocation: boolean;
  currentVersion: number;
  invigilatorRegenerationAvailable: boolean;
  userRole: "ADMIN" | "INVIGILATOR";
  studentCount: number;
  totalSeats: number | null;
}) {
  // Both hooks are always called, whichever action is currently relevant —
  // that's what keeps the success signal alive across the moment
  // `hasAllocation` flips from false to true: nothing here unmounts, only
  // the JSX below branches on which button to show.
  const genAction = generateAllocationAction.bind(null, examSessionId);
  const [genState, genFormAction, genPending] = useActionState(
    genAction,
    initialState,
  );
  const regenAction = regenerateAllocationAction.bind(null, examSessionId);
  const [regenState, regenFormAction, regenPending] = useActionState(
    regenAction,
    initialState,
  );

  const [flash, setFlash] = useState<string | null>(null);
  const [confirmingGenerate, setConfirmingGenerate] = useState(false);
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false);

  // hasAllocation flipping true -> false only happens from outside this
  // component (Danger Zone's "Delete Allocation") — this component's own
  // generate/regenerate flows only ever move it false -> true or bump the
  // version while staying true. Clear a stale "just generated" banner
  // rather than leaving it sitting next to a "Generate Allocation" button.
  const wasAllocated = useRef(hasAllocation);
  useEffect(() => {
    if (wasAllocated.current && !hasAllocation) {
      setFlash(null);
    }
    wasAllocated.current = hasAllocation;
  }, [hasAllocation]);

  useSuccessFlash(genState, genPending, () => {
    setConfirmingGenerate(false);
    setFlash(
      `Seat list ready — v${currentVersion}. Every student now has a seat number.`,
    );
  });
  useSuccessFlash(regenState, regenPending, () => {
    setConfirmingRegenerate(false);
    setFlash(`New seat list ready — v${currentVersion}.`);
  });

  const banner = flash && (
    <div
      role="status"
      className="flex items-start justify-between gap-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
    >
      <span>{flash}</span>
      <button
        type="button"
        onClick={() => setFlash(null)}
        aria-label="Dismiss"
        className="flex-none font-bold leading-none"
      >
        ×
      </button>
    </div>
  );

  if (!hasAllocation) {
    return (
      <div className="flex flex-col gap-2">
        {banner}
        {!confirmingGenerate ? (
          <button
            type="button"
            onClick={() => {
              setFlash(null);
              setConfirmingGenerate(true);
            }}
            className="w-full rounded-full bg-coral px-4 py-3.5 text-base font-semibold text-white active:scale-[0.98]"
          >
            Make Seat List
          </button>
        ) : (
          <form
            action={genFormAction}
            className="flex flex-col gap-3 rounded-3xl border border-hairline bg-mist p-4"
          >
            <p className="text-sm text-ink/80">
              This gives a random seat number to every student in this exam.
              Continue?
            </p>
            <SeatsField studentCount={studentCount} totalSeats={totalSeats} />
            {genState.error && (
              <p role="alert" className="text-sm text-red-600">
                {genState.error}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmingGenerate(false)}
                className="flex-1 rounded-full border border-hairline bg-white px-4 py-3 text-sm font-medium text-ink"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={genPending}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-coral px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {genPending && <Spinner />}
                {genPending ? "Making…" : "Yes, make it"}
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  const canRegenerate = userRole === "ADMIN" || invigilatorRegenerationAvailable;
  const requireReason = userRole === "ADMIN";

  return (
    <div className="flex flex-col gap-2">
      {banner}
      {userRole === "INVIGILATOR" && (
        <p className="text-sm text-muted">
          {invigilatorRegenerationAvailable
            ? "You can make 1 new seat list for this exam."
            : "You've already made a new seat list for this exam. An admin can make another, with a reason."}
        </p>
      )}
      {canRegenerate &&
        (!confirmingRegenerate ? (
          <button
            type="button"
            onClick={() => {
              setFlash(null);
              setConfirmingRegenerate(true);
            }}
            className="w-full rounded-full border-2 border-mesh-black px-4 py-3 text-base font-semibold text-mesh-black active:scale-[0.98]"
          >
            {requireReason ? "Make New List (Admin)" : "Make New List"}
          </button>
        ) : (
          <form
            action={regenFormAction}
            className="flex flex-col gap-3 rounded-3xl border border-amber-300 bg-amber-50 p-4"
          >
            <p className="text-sm text-ink/80">
              This makes a new seat list (v{currentVersion + 1}) instead of
              the current one (v{currentVersion}). Every student gets a new
              seat number. You cannot undo this.
            </p>
            <SeatsField studentCount={studentCount} totalSeats={totalSeats} />
            {requireReason && (
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="reason"
                  className="text-sm font-medium text-ink"
                >
                  Reason (you must give one — it will be saved)
                </label>
                <textarea
                  id="reason"
                  name="reason"
                  required
                  rows={2}
                  className="w-full rounded-2xl border-none bg-white px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-coral/40"
                />
              </div>
            )}
            {regenState.error && (
              <p role="alert" className="text-sm text-red-600">
                {regenState.error}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmingRegenerate(false)}
                className="flex-1 rounded-full border border-hairline bg-white px-4 py-3 text-sm font-medium text-ink"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={regenPending}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-amber-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {regenPending && <Spinner />}
                {regenPending ? "Making…" : "Yes, make new list"}
              </button>
            </div>
          </form>
        ))}
    </div>
  );
}
