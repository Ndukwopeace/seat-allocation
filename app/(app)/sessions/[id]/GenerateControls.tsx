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

export function GenerateControls({
  examSessionId,
  hasAllocation,
  currentVersion,
  invigilatorRegenerationAvailable,
  userRole,
}: {
  examSessionId: string;
  hasAllocation: boolean;
  currentVersion: number;
  invigilatorRegenerationAvailable: boolean;
  userRole: "ADMIN" | "INVIGILATOR";
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
      `Allocation generated — version ${currentVersion} is now active. Every registered student has a seat number.`,
    );
  });
  useSuccessFlash(regenState, regenPending, () => {
    setConfirmingRegenerate(false);
    setFlash(`Reallocated — version ${currentVersion} is now active.`);
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
            className="w-full rounded-lg bg-slate-900 px-4 py-3 text-base font-semibold text-white active:scale-[0.99]"
          >
            Generate Allocation
          </button>
        ) : (
          <form
            action={genFormAction}
            className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
          >
            <p className="text-sm text-slate-700">
              This assigns a random, unique seat number to every registered
              student in this session. Continue?
            </p>
            {genState.error && (
              <p role="alert" className="text-sm text-red-600">
                {genState.error}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmingGenerate(false)}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={genPending}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {genPending && <Spinner />}
                {genPending ? "Generating…" : "Yes, generate"}
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
        <p className="text-sm text-slate-500">
          {invigilatorRegenerationAvailable
            ? "You have 1 regeneration remaining for this session."
            : "You've used your one regeneration for this session. An admin can override with a reason."}
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
            className="w-full rounded-lg border border-slate-900 px-4 py-3 text-base font-semibold text-slate-900 active:scale-[0.99]"
          >
            {requireReason ? "Regenerate (Admin Override)" : "Regenerate Allocation"}
          </button>
        ) : (
          <form
            action={regenFormAction}
            className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4"
          >
            <p className="text-sm text-slate-700">
              This replaces the current version {currentVersion} allocation
              with a new version {currentVersion + 1}. Every student gets a
              new number. This cannot be undone.
            </p>
            {requireReason && (
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="reason"
                  className="text-sm font-medium text-slate-700"
                >
                  Reason (required, will be logged)
                </label>
                <textarea
                  id="reason"
                  name="reason"
                  required
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
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
                className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={regenPending}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {regenPending && <Spinner />}
                {regenPending ? "Regenerating…" : "Yes, regenerate"}
              </button>
            </div>
          </form>
        ))}
    </div>
  );
}
