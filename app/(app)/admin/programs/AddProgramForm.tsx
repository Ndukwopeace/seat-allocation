"use client";

import { useActionState, useEffect, useRef } from "react";
import { Spinner } from "@/app/Spinner";
import { createProgram, type ActionState } from "./actions";

const initialState: ActionState = {};

export function AddProgramForm() {
  const [state, formAction, pending] = useActionState(createProgram, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <details className="rounded-3xl border border-hairline bg-white shadow-sm">
      <summary className="cursor-pointer px-4 py-4 text-base font-medium text-ink">
        + Add program
      </summary>
      <form
        ref={formRef}
        action={formAction}
        className="flex flex-col gap-4 px-4 pb-4"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium text-ink">
            Program name
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
            Must match exactly what appears in the &ldquo;program&rdquo; column
            when importing students.
          </p>
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}
        {state.success && (
          <p className="text-sm text-emerald-600">Program added.</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-coral px-4 py-3.5 text-base font-semibold text-white disabled:opacity-60"
        >
          {pending && <Spinner />}
          {pending ? "Adding…" : "Add program"}
        </button>
      </form>
    </details>
  );
}
