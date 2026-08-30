"use client";

import { useActionState, useEffect, useRef } from "react";
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
    <details className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <summary className="cursor-pointer px-4 py-4 text-base font-medium text-slate-900">
        + Add user
      </summary>
      <form
        ref={formRef}
        action={formAction}
        className="flex flex-col gap-4 px-4 pb-4"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium text-slate-700">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="name@example.com"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base"
          />
          <p className="text-xs text-slate-500">
            Must match their Google account exactly if they&rsquo;ll sign in
            with Google.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="role" className="text-sm font-medium text-slate-700">
            Role
          </label>
          <select
            id="role"
            name="role"
            required
            defaultValue="INVIGILATOR"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base"
          >
            <option value="INVIGILATOR">Invigilator</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="password"
            className="text-sm font-medium text-slate-700"
          >
            Password (optional)
          </label>
          <input
            id="password"
            name="password"
            type="password"
            minLength={8}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base"
          />
          <p className="text-xs text-slate-500">
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
          className="rounded-lg bg-slate-900 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add user"}
        </button>
      </form>
    </details>
  );
}
