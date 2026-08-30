"use client";

import { useActionState, useState } from "react";
import {
  generateAllocationAction,
  regenerateAllocationAction,
  type ActionState,
} from "../actions";

const initialState: ActionState = {};

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
  if (!hasAllocation) {
    return <GenerateButton examSessionId={examSessionId} />;
  }

  const canRegenerate = userRole === "ADMIN" || invigilatorRegenerationAvailable;

  return (
    <div className="flex flex-col gap-2">
      {userRole === "INVIGILATOR" && (
        <p className="text-sm text-slate-500">
          {invigilatorRegenerationAvailable
            ? "You have 1 regeneration remaining for this session."
            : "You've used your one regeneration for this session. An admin can override with a reason."}
        </p>
      )}
      {canRegenerate && (
        <RegenerateButton
          examSessionId={examSessionId}
          currentVersion={currentVersion}
          requireReason={userRole === "ADMIN"}
        />
      )}
    </div>
  );
}

function GenerateButton({ examSessionId }: { examSessionId: string }) {
  const [confirming, setConfirming] = useState(false);
  const action = generateAllocationAction.bind(null, examSessionId);
  const [state, formAction, pending] = useActionState(action, initialState);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="w-full rounded-lg bg-slate-900 px-4 py-3 text-base font-semibold text-white active:scale-[0.99]"
      >
        Generate Allocation
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-700">
        This assigns a random, unique seat number to every registered student
        in this session. Continue?
      </p>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Generating…" : "Yes, generate"}
        </button>
      </div>
    </form>
  );
}

function RegenerateButton({
  examSessionId,
  currentVersion,
  requireReason,
}: {
  examSessionId: string;
  currentVersion: number;
  requireReason: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const action = regenerateAllocationAction.bind(null, examSessionId);
  const [state, formAction, pending] = useActionState(action, initialState);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="w-full rounded-lg border border-slate-900 px-4 py-3 text-base font-semibold text-slate-900 active:scale-[0.99]"
      >
        {requireReason ? "Regenerate (Admin Override)" : "Regenerate Allocation"}
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
      <p className="text-sm text-slate-700">
        This replaces the current version {currentVersion} allocation with a
        new version {currentVersion + 1}. Every student gets a new number.
        This cannot be undone.
      </p>
      {requireReason && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reason" className="text-sm font-medium text-slate-700">
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
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-lg bg-amber-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Regenerating…" : "Yes, regenerate"}
        </button>
      </div>
    </form>
  );
}
