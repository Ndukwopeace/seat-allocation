"use client";

import { useActionState, useEffect, useRef } from "react";
import { Spinner } from "@/app/Spinner";
import { createUser, type ActionState } from "./actions";

const initialState: ActionState = {};

export function AddUserForm() {
  const [state, formAction, pending] = useActionState(createUser, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <details className="rounded-3xl border border-hairline bg-white shadow-sm">
      <summary className="cursor-pointer px-4 py-4 text-base font-medium text-ink">
        + Add user
      </summary>
      <form
        ref={formRef}
        action={formAction}
        className="flex flex-col gap-4 px-4 pb-4"
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

        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-coral px-4 py-3.5 text-base font-semibold text-white disabled:opacity-60"
        >
          {pending && <Spinner />}
          {pending ? "Adding…" : "Add user"}
        </button>
      </form>
    </details>
  );
}
