"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Spinner } from "@/app/Spinner";
import { createProgram, type ActionState } from "./actions";

const initialState: ActionState = {};

export function AddProgramForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createProgram, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-full bg-coral px-4 py-3.5 text-base font-semibold text-white active:scale-[0.98]"
      >
        + Add course
      </button>
    );
  }

  return (
    <div className="rounded-3xl border border-hairline bg-white p-4 shadow-sm">
      <form
        ref={formRef}
        action={formAction}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium text-ink">
            Course name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="e.g. Software Engineering"
            className="w-full rounded-2xl border-none bg-mist px-4 py-3.5 text-base text-ink focus:outline-none focus:ring-2 focus:ring-coral/40"
          />
          <p className="text-xs text-muted">
            Must be exactly the same as the &ldquo;program&rdquo; column when
            you import students.
          </p>
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}
        {state.success && (
          <p className="text-sm text-emerald-600">Course added.</p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex-1 rounded-full border border-hairline bg-white px-4 py-3 text-sm font-medium text-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-coral px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending && <Spinner />}
            {pending ? "Adding…" : "Add course"}
          </button>
        </div>
      </form>
    </div>
  );
}
