"use client";

import { useActionState, useState } from "react";
import { Spinner } from "@/app/Spinner";
import {
  deleteAllocationAction,
  deleteExamSessionAction,
  type ActionState,
} from "../actions";

const initialState: ActionState = {};

export function DangerZone({
  examSessionId,
  hasAllocation,
}: {
  examSessionId: string;
  hasAllocation: boolean;
}) {
  return (
    <details className="rounded-xl border border-red-200 bg-white shadow-sm">
      <summary className="cursor-pointer px-4 py-4 text-base font-medium text-red-700">
        Danger Zone
      </summary>
      <div className="flex flex-col gap-3 px-4 pb-4">
        {hasAllocation && <DeleteAllocationButton examSessionId={examSessionId} />}
        <DeleteSessionButton
          examSessionId={examSessionId}
          hasAllocation={hasAllocation}
        />
      </div>
    </details>
  );
}

function DeleteAllocationButton({ examSessionId }: { examSessionId: string }) {
  const [confirming, setConfirming] = useState(false);
  const action = deleteAllocationAction.bind(null, examSessionId);
  const [state, formAction, pending] = useActionState(action, initialState);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="w-full rounded-lg border border-red-300 px-4 py-3 text-sm font-semibold text-red-700 active:scale-[0.99]"
      >
        Delete Allocation
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-red-300 bg-red-50 p-4"
    >
      <p className="text-sm text-slate-700">
        This permanently erases every generated version of this
        session&rsquo;s allocation — every seat assignment and its audit
        history. The session itself stays and can be allocated again from
        scratch. This cannot be undone.
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
          className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending && <Spinner />}
          {pending ? "Deleting…" : "Yes, delete allocation"}
        </button>
      </div>
    </form>
  );
}

function DeleteSessionButton({
  examSessionId,
  hasAllocation,
}: {
  examSessionId: string;
  hasAllocation: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const action = deleteExamSessionAction.bind(null, examSessionId);
  const [state, formAction, pending] = useActionState(action, initialState);

  if (hasAllocation) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 px-3 py-3 text-xs text-slate-500">
        This session has allocation history, so it can&rsquo;t be deleted.
        Delete its allocation first if you want to remove the session
        entirely.
      </p>
    );
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white active:scale-[0.99]"
      >
        Delete Session
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-red-300 bg-red-50 p-4"
    >
      <p className="text-sm text-slate-700">
        This permanently removes this exam session. This cannot be undone.
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
          className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending && <Spinner />}
          {pending ? "Deleting…" : "Yes, delete session"}
        </button>
      </div>
    </form>
  );
}
