"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Spinner } from "@/app/Spinner";
import { createUser, type ActionState } from "./actions";

const initialState: ActionState = {};

export function AddUserForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createUser, initialState);
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
        + Add user
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
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="w-full rounded-2xl border-none bg-mist px-4 py-3.5 text-base text-ink focus:outline-none focus:ring-2 focus:ring-coral/40"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-ink">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="name@example.com"
            className="w-full rounded-2xl border-none bg-mist px-4 py-3.5 text-base text-ink focus:outline-none focus:ring-2 focus:ring-coral/40"
          />
          <p className="text-xs text-muted">
            Must match their Google account exactly if they&rsquo;ll sign in
            with Google.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="role" className="text-sm font-medium text-ink">
            Role
          </label>
          <select
            id="role"
            name="role"
            required
            defaultValue="INVIGILATOR"
            className="w-full rounded-2xl border-none bg-mist px-4 py-3.5 text-base text-ink focus:outline-none focus:ring-2 focus:ring-coral/40"
          >
            <option value="INVIGILATOR">Exam helper</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="password"
            className="text-sm font-medium text-ink"
          >
            Password (optional)
          </label>
          <input
            id="password"
            name="password"
            type="password"
            minLength={8}
            className="w-full rounded-2xl border-none bg-mist px-4 py-3.5 text-base text-ink focus:outline-none focus:ring-2 focus:ring-coral/40"
          />
          <p className="text-xs text-muted">
            Leave blank for a Google-only account — they&rsquo;ll only be
            able to sign in with &ldquo;Continue with Google&rdquo;.
          </p>
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}
        {state.success && (
          <p className="text-sm text-emerald-600">User added.</p>
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
            {pending ? "Adding…" : "Add user"}
          </button>
        </div>
      </form>
    </div>
  );
}
